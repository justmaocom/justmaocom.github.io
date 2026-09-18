---
title: OpenWiki 追得到程式碼變更，卻證明不了文件正確
description: OpenWiki 用 Git 變更與 Grounded Claims 找出該更新的 repo wiki 頁面，但來源檢查全綠只代表引用沒過期。從 0.5.2 原始碼拆解它做到哪裡，以及導入要付的成本。
date: 2026-09-19 08:20:00 +0800
categories: [觀點筆記, 開發工具]
tags: [openwiki, coding-agent, documentation]
media_subpath: /assets/img/posts/openwiki-agent-docs-maintenance/
---

`AGENTS.md` 適合放建置指令與工作規則，不適合塞進完整的架構說明。coding agent 接手陌生 repo 時，仍得從原始碼和測試找出模組關係、資料流與失敗處理。OpenWiki 的做法是把這些資訊整理到 repo 內的 wiki，讓 agent 需要時再讀。本文要查的是，程式碼改變後，它如何找出需要重寫的頁面，以及更新結果可以信到什麼程度。

[LangChain 發表 OpenWiki 時](https://www.langchain.com/blog/introducing-openwiki-an-open-source-agent-for-repo-documentation)，主張 agent 指引檔只要指向 repo wiki，coding agent 就能按需求取用文件，不必把大量說明塞進單一指引檔。這種分工讓指引檔維持簡短，卻增加了一份會隨程式碼過期的 wiki。以下分別從更新流程與來源檢查，看 OpenWiki 如何處理這個問題。

## OpenWiki 把 repo 文件做成可更新的 wiki

OpenWiki 是產生與維護 repo wiki 的命令列工具。本文查證的是原始碼 commit [`715109a`](https://github.com/langchain-ai/openwiki/tree/715109a8ab1cda6d47680fcc8170e203c751bf61)。該版本的 [`package.json`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/package.json) 標示為 `0.5.2`，要求 Node.js `22.22.0` 以上，並採用 [`MIT License`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/LICENSE#L1)。

本文關注的是 code mode，也就是把生成的文件放回原 repo，一起納入版本控制。執行初始化後，OpenWiki 會建立 `openwiki/` 目錄，並在 `AGENTS.md` 與 `CLAUDE.md` 寫入由它管理的指引區塊。若 repo 還沒有更新 workflow，它也會建立 `.github/workflows/openwiki-update.yml`。因此 `--init` 會讀取程式碼，也會修改 agent 指引與 GitHub Actions 設定。這些行為可在 [`ensureCodeModeRepoSetup`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L47) 與 [`writeCodeModeAgentSnippets`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L192) 查到。

OpenWiki 寫入的 agent 指引會把 `openwiki/` 定位成按需求查閱的 evidence index。也就是說，agent 先用 wiki 找到相關系統與檔案，再回到原始碼和測試確認；wiki 本身不是最終依據。這項限制寫在 [`createCodeModeAgentsSnippet`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L423) 產生的指引中。

![短指引指向 repo wiki，wiki 再連回原始碼與測試](agents-md-points-to-wiki.png){: width="800" height="430" }
_AGENTS.md 只負責指路；wiki 是按需查閱的 evidence index，仍要回到程式碼確認。_

## 一次更新如何決定要改哪些頁面

OpenWiki 會產生 wiki 頁面，也會為頁面中的重要敘述建立 Claim，記錄支持該敘述的原始碼位置。每一頁及其 Claims 是一個依序處理的 page job。這些 Claims 不寫在 wiki 正文裡，而是另外存成 sidecar 中繼資料檔。執行一次 repo 更新時，OpenWiki 依序完成下列工作。

1. `getRepositoryChangedPaths` 先找出程式碼改了什麼。它比較上次記錄的 Git commit 與目前 checkout 的 `HEAD`。尚未提交的變更也會納入，包括已加入 Git index 的 staged 檔案、尚未加入 index 的 unstaged 檔案，以及 Git 尚未追蹤的新檔案。它會排除 OpenWiki 自己產生的 `openwiki/`，以及 `.openwikiignore` 指定的路徑，避免把文件產物當成程式碼變更。[`src/agent/utils.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/utils.ts#L909) 列出了實際使用的 Git 指令。
2. 負責規劃的 planner 再決定 wiki 應該有哪些頁面。它會讀取 `package.json` 這類 manifest、程式進入點、主要目錄與代表性測試，並按系統邊界、執行環境與跨系統流程安排頁面。給 planner 的 prompt 明確禁止照原始碼目錄逐檔列清單，因為目標是解釋系統如何運作，不是複製檔案樹。這段要求可在 [`createRepositoryPlannerPrompt`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/repository-prompts.ts#L43) 查到。
3. 負責寫頁面的 worker 一次只處理目前排到的 page job。它完成頁面後，還要列出哪些 Claims 是新增、修訂、確認或撤回。這些動作讓 OpenWiki 知道一條既有敘述是仍然成立、內容需要修改，還是應該從文件移除。[`submitRepositoryPage`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L1184) 會拒絕不按佇列順序提交的頁面，並在接受前確認頁面檔案可讀。
4. 寫入頁面和 Claims 時，OpenWiki 會檢查 worker 讀取的頁面版本是否仍是最新版，避免覆蓋其他更新。接著它確認 sidecar 內的 Claim 能找到所引用的程式碼，通過後才把這個 page job 標成完成。所有頁面處理完後，它還會檢查 Mermaid 圖、wiki 索引、內部連結、Claim 來源與本次生成紀錄。這組收尾檢查實作在 [`finalizeWikiArtifacts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/wiki-finalizer.ts#L248)。

![OpenWiki 更新流程：Git 變更、planner、page job 與收尾檢查](openwiki-update-pipeline.png){: width="800" height="430" }
_一次更新先看程式碼改了什麼，再決定頁面、寫入 Claims，最後才做整批檢查。_

OpenWiki 每完成一頁就把結果寫進本次更新的 checkpoint。若程序中途失敗，已完成頁面的紀錄不會跟著消失。只有全部頁面通過驗證並寫入本次生成紀錄後，[`finishRepositoryRun`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L1487) 才會移除這份執行狀態。這代表中斷時能保留部分進度，不代表未完成的 wiki 已經可以合併。

## Claims 能檢查到哪裡

Grounded Claims 的用途是讓重要文件敘述可以回查原始碼。每條 Claim 都連到一個 `repo://` URI，位置可以是整個檔案，也可以縮小到一段行號。除了行號，repository resolver 還會計算引用內容的 SHA-256，並保存首尾行與相鄰內容的 hash。若有人在檔案上方插入程式碼，導致原本的行號整段往後移，resolver 會用原內容與前後文尋找新的位置。這段邏輯見 [`resolveLineRangeEvidence`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts#L294) 與 [`locateUnchangedLineRange`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts#L404)。

每次更新前，`runClaimsPreflight` 會解析各條 Claim 引用的程式碼。檔案或引用範圍已經找不到時，狀態是 `unresolved`。找到位置但內容版本不同時，狀態是 `stale`。OpenWiki 只有在 Git 檢查沒有發現必須處理的變更、所有 Claims 都沒有問題，而且每頁都已有 Claims 可作為覆蓋基準時，才會把這次執行判定為 `no-op`，也就是不重新生成文件。[`preflight.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/brains/code/preflight.ts#L40) 與 [`repository-run.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L410) 實作了這兩層判定。

這項檢查只回答兩個問題：引用的位置是否仍然存在，以及該位置的內容是否改變。它不會重新判斷文件中的自然語言是否正確。假設文件聲稱「重試三次後會寫入失敗訊息佇列」，但被引用的程式碼其實只重試兩次。只要那段程式碼沒有修改，保存的 hash 仍會相同，`stale` 與 `unresolved` 都不會出現。

所以，來源檢查全綠只代表 Claim 仍能連到當初引用的內容。審查者仍要讀該段程式碼與相關測試，確認文件沒有誤解條件、數量或執行順序。

![CI 面板顯示來源檢查全綠，開發者詢問文件是否正確，審查者拿出紅筆](claims-green-review-red-pen.png){: width="800" height="430" }
_Claims 全綠後，仍需人工核對文件敘述。_

## 放進日常工作，差別在哪裡

### 個人專案隔幾個月後再維護

維護個人專案時，你同時是開發者和文件審查者。幾個月沒碰專案，再回來修登入錯誤時，你可能還記得功能位於哪個目錄，卻忘了 session 在哪裡續期、逾時由哪些測試覆蓋，以及部署時讀取哪個環境變數。若 wiki 有一頁說明登入流程，並用 Claims 連到 session 程式碼、測試與部署設定，coding agent 就能先讀這幾個位置，不必從整個 repo 搜尋相關關鍵字。

個人使用也容易省略審查，因為沒有人會退回錯誤的文件 PR。若專案已分成多個模組，或每次維護相隔數月，可以把抽查 Claims 納入每次更新的例行工作。若專案只有少量檔案，而且你每週都在修改，直接讀原始碼與測試通常更省時間。

### 企業值班與跨團隊修改

假設值班工程師收到訂單重複建立的告警，但原作者正在休假。這時要先找出接收訂單的 API、重試發生的位置，以及服務在哪裡產生和檢查冪等鍵。若 wiki 的訂單流程頁面已連到這些程式碼和測試，工程師與 coding agent 可以直接從引用位置開始查。wiki 不會判斷這次事故的根因，但能協助工程師確認請求經過哪些服務，不用先等原作者上線。

跨團隊修改會讓文件落後的代價更明顯。假設付款團隊替事件格式加入必填的版本欄位，訂單與通知服務都要更新解析程式。OpenWiki 可以依 Git 變更與既有 Claims 找出可能需要改寫的頁面，並提出文件 PR。審查者仍要確認文件是否寫清楚舊版事件能否繼續使用，以及測試是否涵蓋新舊格式。團隊也得先指定文件 PR 的審查人、處理期限，以及生成中斷時是否接受部分結果。沒有這些安排，自動產生的 PR 只會留在佇列裡。

專案是個人的還是企業的，並不直接決定它需不需要 repo wiki。若每次接手都要重新找一遍入口、流程與測試，而且有人負責核對文件，wiki 才有機會省下重複查找的時間。

## 什麼樣的 repo 值得承擔維護成本

OpenWiki 會增加模型呼叫、CI 設定與人工審查。導入前至少要確認下列成本由誰承擔。

- 每次生成與更新都會呼叫模型。[README 的 quick start](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md#quick-start) 要求設定模型服務商、API 金鑰與模型名稱。帳單、執行時間和輸出品質會隨模型與 repo 內容改變。本文沒有執行完整生成，因此沒有這些項目的實測數字。
- 官方 [`openwiki-update.yml`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/examples/openwiki-update.yml#L1) 會取回完整 Git history，讓 OpenWiki 能比較前後 commit。它也需要模型金鑰，以及 `contents: write` 和 `pull-requests: write` 權限，用來提交文件變更與建立 PR。這些權限應和其他能寫入 repo 的自動化一樣接受審查。
- `--init` 會建立 `openwiki/`、修改 agent 指引，還可能新增 GitHub Actions workflow。第一次執行後，審查範圍應包含所有 diff，而非只有生成的 wiki 頁面。
- Claims 會把文件敘述帶到確切的原始碼位置，但點開連結不等於完成審查。審查者仍要比較敘述、引用範圍與相關測試。

若 repo 包含多個子系統，coding agent 經常需要修改陌生區域，而且團隊願意審查自動文件 PR，wiki 可以集中記錄各系統的入口與互動方式。若小型 repo 只有幾個進入點，原始碼和測試已能直接說明行為，就不必再維護一份內容相近的 wiki。沒有審查人力時，也不應開啟排程更新，因為每次執行只會再增加一個等待處理的 PR。

企業 repo 還要先排除不應交給模型處理的路徑。`.openwikiignore` 會阻止 OpenWiki 的檔案工具讀取指定內容。啟用忽略規則後，OpenWiki 的本機執行後端也會拒絕任意 shell command，因為 shell 可能繞過檔案工具直接讀取被忽略的檔案。這項限制實作在 [`OpenWikiLocalShellBackend.execute`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/docs-only-backend.ts#L481)。`.openwikiignore` 只限制 OpenWiki 的工具，不能取代 repo 存取權限，也不能補救已提交到 Git 的機密。

## 先用一個 repo 驗證更新流程

先確認 CLI 能在本機啟動。以下指令把 OpenWiki 安裝到 `/tmp` 下的新目錄，不會改動測試 repo 的相依套件，也不會寫進 npm 平常使用的全域安裝位置。這組指令已在 macOS arm64、Node.js `25.2.1`、npm `11.6.2` 實際執行。OpenWiki 使用 Ink 的互動式終端介面，因此要在 Terminal 這類有 PTY 的環境執行。若 stdin 不支援 raw mode，Ink 會直接印出錯誤。

```bash
check_prefix="$(mktemp -d /tmp/openwiki-check.XXXXXX)"
npm install --global --prefix "$check_prefix" openwiki@0.5.2 --no-audit --no-fund
PATH="$check_prefix/bin:$PATH" openwiki --help
```
{: .nolineno }

若 CLI 安裝成功，輸出會顯示版本 `0.5.2` 和 `Usage` 區塊。以下省略號代表中間內容已截短。

```console
>_ OpenWiki v0.5.2 agent docs for codebases
...
# Usage
   openwiki [--init|--update] [message]
```

本文只驗證 CLI 能啟動，沒有提供模型憑證，也沒有執行完整生成。下列 `--init` 與 `--update` 是專案 [`README`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md#quick-start) 列出的原始指令。由於 `--init` 會修改 agent 指引並可能新增 workflow，第一次測試應放在可丟棄的 repo 或沒有其他變更的測試分支。

```bash
openwiki --init

# 修改並提交一個有測試覆蓋的行為後
openwiki --update
```
{: .nolineno }

指令回傳成功只代表程序跑完。是否值得採用，還要檢查以下結果。

1. 查看 `openwiki/`、`AGENTS.md`、`CLAUDE.md` 和新增 workflow 的完整 diff，確認 OpenWiki 修改了哪些檔案，以及 workflow 取得哪些權限。
2. 從 wiki 挑一頁熟悉的功能，檢查它有沒有漏掉主要入口、例外處理或代表性測試。
3. 從該頁抽查幾條 Claims，逐條確認文件敘述是否精確、`repo://` 範圍是否真的支持它，以及相關測試是否符合敘述。
4. 記錄生成耗時、模型用量、錯誤敘述數量與人工修改時間。這些數字才能拿來和手動維護文件的時間比較。

## 文件維護該自動化到哪一步

前面引用的原始碼可以查證 OpenWiki 如何追蹤來源，但不能證明它替每個團隊省錢或省時間。我的導入順序是：先在一個真實 repo 手動執行 `--init` 與 `--update`，保留 wiki 和 Claims 供團隊審查，但暫時不啟用排程 workflow。確認文件品質和審查時間能接受後，再讓 GitHub Actions 定期建立更新 PR。

OpenWiki 會保存每條 Claim 引用的程式碼位置與內容版本，因此審查者能查出來源是否仍存在。單看文件最後生成時間，無法做這項檢查。不過，團隊還是要記錄抽查時發現多少錯誤敘述、哪些主要流程沒有寫進 wiki，以及每次文件 PR 需要多少人工修改。若這些審查工作花的時間比原本手動更新文件還多，自動化只是把時間移到 PR review。

## 從一次有來源可查的更新開始

OpenWiki 先比較 Git 變更，再由 planner 讀取 repo 結構與測試，決定要處理哪些頁面。每頁完成時，它檢查頁面、Claims sidecar 和引用來源，整批完成前再檢查索引與內部連結。這些機制可以確認中斷時留下了哪些進度，也能確認 Claim 引用的內容版本是否改變。它們不能判斷文件是否正確解讀了程式碼。

最小的測試是在可丟棄的 repo 跑一次 `--init`，提交一項有測試的程式碼變更，再跑 `--update`。接著抽查變更相關頁面的 Claims，記錄模型用量、錯誤數量與人工審查時間。只有文件能正確描述這項變更，而且更新成本可以接受，才把排程 workflow 加進正式 repo。

## 延伸閱讀

- [Introducing OpenWiki](https://www.langchain.com/blog/introducing-openwiki-an-open-source-agent-for-repo-documentation)：理解首發時為何用短 agent 指引連到大型 repo wiki。
- [OpenWiki README](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md)：查 CLI、code mode、Grounded Claims 與排程更新的使用方式。
- [Claims preflight 實作](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/brains/code/preflight.ts)：核對 `stale` 與 `unresolved` 的實際判定。
- [Repository evidence resolver](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts)：追查行號移動後如何用內容 hash 與上下文重新定位 evidence。
