---
title: "AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則"
description: "同時用 Codex 和 Claude Code 時，不必維護兩份互相漂移的規則。這篇教你怎麼寫 AGENTS.md、兩個工具各自怎麼讀，以及怎麼讓一份檔案兩邊共用。"
date: 2026-11-10 18:00:00 +0800
categories: [AI, 軟體開發]
tags: [coding-agent, codex, claude-code, workflow, documentation]
media_subpath: /assets/img/posts/agents-md-project-rules-for-coding-agents/
image:
  path: cover.webp
  alt: "把專案規則寫進一份 AGENTS.md，讓 Codex 和 Claude Code 都讀得到、也知道該放哪裡。"
---

我同時開 Codex 和 Claude Code 兩個工具時，最怕同一套專案規則寫了兩份，改了一邊、另一邊卻還是舊的。coding agent（會自己讀檔、改檔、跑指令的 AI 程式助理）要靠專案裡的說明，才知道測試怎麼跑、哪些檔不能碰、送出變更前要做什麼。

AGENTS.md 就是寫給這些助理看的 README：用 Markdown（一種用純文字標記標題和清單的格式）寫，沒有必填欄位。這個格式由 Linux Foundation 底下的 [Agentic AI Foundation](https://agents.md/) 維護。

這篇只談怎麼寫這份檔，以及 [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 和 [Claude Code](https://code.claude.com/docs/en/memory#agents-md) 的官方文件分別怎麼說它們會讀哪些檔。我不會寫成「所有工具都一樣」，也不會列出其他還沒查證的產品。

若你想用一套 skill 幫專案產生規則，見 [mattpocock/skills 系列（1）：先設定專案規則，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)。那篇講的是那套 skill 的流程；本篇講的是檔案格式本身，以及這兩個工具實際怎麼讀。

> **版本說明**：本文依 2026-11-10（台北時間）讀取的 [Codex AGENTS.md 說明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 記憶與 CLAUDE.md 說明](https://code.claude.com/docs/en/memory)（含 [AGENTS.md 段落](https://code.claude.com/docs/en/memory#agents-md)），以及 [AGENTS.md 格式官網](https://agents.md/)。當天 npm 上最新的 Codex CLI 是 0.167.0，Claude Code 是 2.1.322。之後的版本或文件可能改變讀取規則。
{: .prompt-info }

## 什麼時候該寫 AGENTS.md

這些情況，就適合把規則寫進 AGENTS.md：

- 同一件事，你已經對助理提醒第二次了。
- 它一直跑錯測試指令，例如該用 `pnpm test`，卻一再執行 `npm test`。
- 這件事新同事也需要知道，或下次再開這個 repo（程式碼儲存庫）的人也用得上。

repo 的根目錄是專案最上層，通常也是 Git 倉庫開頭的那一層。目前工作目錄則是你啟動工具時所在的資料夾，不一定等於根目錄。

不適合塞進這份檔的，主要有兩種。一種是只跟某一小區塊有關、而且很長的流程：那種內容比較適合放到該子目錄較短的規則，或寫成用到才載入的 skill。另一種是「一定得做到」的事。[Claude Code 的文件](https://code.claude.com/docs/en/memory)寫得很清楚：這些說明是 context（塞進對話裡給模型看的脈絡），不是強制設定。要在固定時機擋下某個動作，請用 hook，見[把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

**什麼時候用：** 專案規則會重複講、也會給之後進來的人看。

**你會得到：** 一份放在 repo 裡、兩個工具都能對準的說明檔。

**下一步：** 先決定要寫哪些具體、可檢查的句子，再放到根目錄。

## 該寫哪些段落

寫法要具體、可以核對。官方舉的對比很清楚：「用 2 個空白縮排」比「排版好一點」有用；「送 PR 前跑 `npm test`」也比「記得測試」清楚。

建議至少寫這幾類：

- 安裝與測試指令
- 程式風格
- 送出 pull request（PR，請求把分支合併進主幹）前要做的事
- 注意事項，例如安全相關、不要碰的檔案

保持精簡。Claude Code 建議[每份檔案控制在 200 行內](https://code.claude.com/docs/en/memory#write-effective-instructions)，太長會佔用更多脈絡，也較不容易被遵守。Codex 則把各層規則加總，[預設上限是 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md)（設定項是 `project_doc_max_bytes`），超過的部分不會讀進去。重要的句子放前面。

下面是一份可直接放到根目錄的範本，大約二十多行，請依你的專案改指令和路徑：

```markdown
# AGENTS.md

## 專案概況

這是一個 Node.js 網頁服務。套件管理用 pnpm，Node 版本見 `.nvmrc`。

## 安裝與測試

- 安裝依賴：`pnpm install`
- 跑全部測試：`pnpm test`
- 跑單一檔案：`pnpm test -- path/to/file.test.ts`
- 送出 PR 前，先跑 `pnpm lint` 和 `pnpm test`

## 程式風格

- 使用 2 個空白縮排，不要用 tab
- 公開函式補上 TypeScript 型別，不要用 `any`

## 注意事項

- 不要修改 `.env`、`.env.*` 或任何含密鑰的檔案
- 不要在程式碼裡寫入真實的 API 金鑰或密碼

## 送 PR 前

- 標題用一句話說這次改了什麼
- 說明裡寫測試怎麼跑、跑過哪些
```

若你會在 GitHub 上使用 Codex 的程式碼審查，可在最接近相關程式碼的 AGENTS.md 加上 `## Code Review Rules` 段落。這是 [Codex 文件對 GitHub 審查](https://learn.chatgpt.com/docs/agent-configuration/agents-md#add-code-review-rules)的說明，只適用於這項功能，不是兩個工具讀取規則檔的通則。

## 放在哪裡：Codex 怎麼讀

[Codex 的說明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)寫：它會在開始做事之前讀取 AGENTS.md，而且每次啟動只建立一次指令鏈；你改了檔，要重新啟動才會生效。

個人的全域規則放在 `~/.codex/AGENTS.md`（若你設了 `CODEX_HOME`，就改到那個目錄）。同一層如果有 `AGENTS.override.md`，Codex 會讀這份，而不是原本的 `AGENTS.md`。override（覆寫檔）是暫時換成另一套規則用的；用完請刪掉它，不要只是清空後留著。官方的說法是：移除 override，才會回到原本的檔。

專案規則則從專案根目錄（通常是 Git 根目錄）往下，一路走到你的目前工作目錄。每一層依序找 `AGENTS.override.md`、`AGENTS.md`，再找你設定的 fallback 檔名，而且每層最多收一份。找到的內容由上往下串在一起，離目前目錄越近的越晚出現，效果上會蓋過前面較一般的規則。

![從專案根目錄往下，每層的規則依序疊起來，離目前目錄越近的越後面](folder-layers.webp){: w="1280" h="720" }
_概念圖，不是實際介面。Codex 從專案根目錄往下，把每一層找到的規則依序串在一起，離你目前目錄越近的越晚出現。_

搜尋會停在目前目錄：比它更深的檔案，啟動時不會讀到。若你要用某個子目錄的規則，請從那個目錄啟動，或加上 `codex --cd 子目錄`。若 Codex 找不到專案根目錄，就只看目前目錄。

同一層若同時有覆寫檔和一般檔，只會取一份，而且覆寫檔優先：

![同一層有兩份規則檔時，Codex 只取一份，override 優先](override-pick.webp){: w="1280" h="720" }
_概念圖，不是實際介面。同一層若同時有 AGENTS.override.md 和 AGENTS.md，Codex 只取一份，而且會先看 override。_

專案裡如果已經有別的檔名，例如 `TEAM_GUIDE.md`，可把它加進 `~/.codex/config.toml` 的 `project_doc_fallback_filenames`。合計長度可用 `project_doc_max_bytes` 調整，預設是 32 KiB。細節見 [Codex 的設定範例](https://learn.chatgpt.com/docs/config-file/config-sample.md)。

**什麼時候用：** 你希望 Codex 一打開專案就帶著正確的測試指令和注意事項。

**下一步：** 先在根目錄放一份 AGENTS.md；某個子專案規則不同，再在該目錄加檔，並從那裡啟動。

## Claude Code 怎麼讀

Claude Code 也可以讀 repo 裡的 AGENTS.md，當作專案說明，不必另外再寫一份 CLAUDE.md。不過[預設條件](https://code.claude.com/docs/en/memory#agents-md)比較嚴。

預設是：目前工作目錄和它的上層，都沒有 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md` 時，才會讀 AGENTS.md（包含 `.claude/AGENTS.md`）。只要其中任一份存在，就只讀 CLAUDE 系列檔。個人的 `~/.claude/CLAUDE.md`、組織統一發佈的 managed CLAUDE.md，以及 `.claude/rules/` 裡的規則，不列入這項判斷，不會因此讓 AGENTS.md 被跳過。

這裡有一個常見陷阱：你只是想在專案裡放自己不會提交的筆記，於是加了 `CLAUDE.local.md`，Claude 就不再讀 AGENTS.md。若要兩邊都保留，到對話裡輸入 `/config`，把 Project instructions 設成 `claude-md-and-agents-md`。

另外，Claude Code 不讀 `AGENTS.override.md`、`AGENTS.local.md`，也不讀 `.agents/` 底下的檔。也就是說，你為 Codex 準備的 override，對 Claude 沒有效。

子目錄的 AGENTS.md 不是一啟動就全部載入。[官方文件](https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md)把這段寫在「上層都沒有會佔掉判斷的 CLAUDE 系列檔」這個前提下：Claude 用 Read 工具打開那個子目錄裡的檔案，而且該子目錄自己也沒有上述三種 CLAUDE 檔時，才會讀那裡的 AGENTS.md。若根目錄已經有 CLAUDE.md，預設就不會走這條路；需要子目錄規則時，請看下一節的做法。

直接讀 AGENTS.md 需要 Claude Code v2.1.277 或更新的版本。較舊的版本、停用了負責讀取的內建 plugin，或剛從更舊版本升級後的第一個 session，有可能讀不到；這時改用下一節的 import。互動 session 若有成功載入，通常會看到類似 `no CLAUDE.md found; AGENTS.md loaded: …` 的提示。

若要改預設行為，在 `/config` 調整 Project instructions，或在使用者層級的設定檔寫入對應值。四個值的意思如下：

| 值 | Claude 會讀什麼 |
| --- | --- |
| `claude-md-or-agents-md` | 預設。有 CLAUDE 系列檔就讀它們；沒有才讀 AGENTS.md |
| `claude-md-and-agents-md` | 兩種都讀。每一層先讀 CLAUDE 系列，再讀 AGENTS.md |
| `claude-md` | 只讀 CLAUDE 系列 |
| `managed-only` | 啟動時只讀組織統一發佈的說明和自動記憶；專案裡的 CLAUDE.md 與 AGENTS.md 都不會在啟動時載入 |

**什麼時候用：** 這個 repo 已經有 AGENTS.md，而你主要用 Claude Code。

**下一步：** 先確認根目錄有沒有 CLAUDE 系列檔，再決定要直接讀、還是用 import 帶進來。

## 一份檔案兩邊共用

若你同時用兩個工具，目標是只維護一份共用規則。

**步驟 1：** 把團隊都該遵守的規則寫在根目錄的 `AGENTS.md`。Codex 會直接讀它。

**步驟 2：** 若專案還需要 Claude 專屬的補充，在旁邊建立 `CLAUDE.md`，第一行寫 `@AGENTS.md`，下面再寫只給 Claude 的內容。這是[官方範例](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)的做法。`@` 開頭的 import（把另一份檔的內容展開、一併讀進來）路徑是相對的，基準是這份 CLAUDE.md 所在的位置，不是你啟動時的工作目錄。若把路徑放在反引號裡，例如 `` `@AGENTS.md` ``，就只是提到這個檔名，不會展開。

```markdown
@AGENTS.md

## Claude Code

變更 `src/billing/` 底下的檔案時，先使用 plan mode。
```

![CLAUDE.md 用一行 import 把共用的 AGENTS.md 帶進來](import-bridge.webp){: w="1280" h="720" }
_概念圖，不是實際介面。CLAUDE.md 第一行寫 `@AGENTS.md`，就能把共用的規則帶進來，不必再複製一份。_

若不需要任何 Claude 專屬內容，也可以做符號連結（symlink，一個指向另一個檔的檔名）：

```bash
ln -s AGENTS.md CLAUDE.md
```

成功時這個指令不會印出內容。不過，只要團隊裡有人使用 Windows，就改用上面的 import。官方說明：在 Windows 建立 symlink 需要系統管理員權限或開發人員模式；Git 若沒啟用 `core.symlinks`，checkout 時可能把它變成只有一行文字的普通檔，規則就讀不到了。

不要只用一句「請去讀 AGENTS.md」代替 import。官方說，那樣寫的話，Claude 只有自己決定打開那份檔時才看得到內容。

也不建議把 `/import` 當成長期做法。官方的用詞是：它會把 AGENTS.md 這類說明「一次性複製」（appends a one-time copy）到對應的 CLAUDE.md。之後你改 AGENTS.md，複製過去的那份不會自動跟著改。

**你會得到：** 共用規則只維護一份；Claude 專屬的句子單獨放在 CLAUDE.md 下半部。

**下一步：** 用下一節的方式確認兩邊都有讀到。

## 怎麼確認有讀到

改完檔之後，不要假設工具已經看到新內容。

Codex 請重新啟動，再依[官方建議](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup)執行：

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

若要確認子目錄的規則，把目錄換成你的路徑：

```bash
codex --cd services/payments --ask-for-approval never "Show which instruction files are active."
```

你應該會看到它依順序列出目前生效的說明來源，例如全域檔、根目錄的 AGENTS.md，以及（從子目錄啟動時）更接近的那一份。這是官方文件描述的檢查方式，不是某一筆實際輸出。

Claude Code 可在對話裡執行 `/memory`，看清單裡有沒有你的檔；也可執行 `/context all`，在 Memory files 底下確認。若是直接讀 AGENTS.md 的互動 session，也會出現前面提過的 `AGENTS.md loaded` 提示。

## 實際情境：前端加付款服務

假設這個 repo 裡有前端 `web/`，也有付款服務 `services/payments/`。這是一種 monorepo（同一個儲存庫裡放了多個子專案）。我會這樣放檔：

- 根目錄 `AGENTS.md`：共用的安裝指令、程式風格和 PR 規則
- `services/payments/AGENTS.md`：只寫付款服務自己的測試指令，例如改跑 `make test-payments`
- 根目錄 `CLAUDE.md`：第一行 `@AGENTS.md`，下面再加一條 Claude 專屬規則，例如變更付款相關程式前先用 plan mode

從根目錄啟動 Codex 時，它會讀到全域檔（若你有）以及根目錄的 AGENTS.md，但不會在啟動時讀到 `services/payments/` 裡那一份，因為搜尋只走到目前目錄。改用 `codex --cd services/payments` 之後，付款服務那份會接在後面，其中較具體的測試指令就會蓋過根目錄較一般的寫法。

從根目錄啟動 Claude Code 時，因為已經有 CLAUDE.md，[預設只讀 CLAUDE 系列檔](https://code.claude.com/docs/en/memory#agents-md)；根目錄的 AGENTS.md 是靠 `@AGENTS.md` 這行 import 帶進來的。接著，若它用 Read 打開 `services/payments/` 裡的某個檔案：官方把「讀子目錄 AGENTS.md」寫在「目前目錄和上層都沒有會佔掉判斷的 CLAUDE 系列檔」這個前提下，而且該子目錄自己也不能有那三種 CLAUDE 檔。根目錄已經有 CLAUDE.md，所以預設不會直接讀 `services/payments/AGENTS.md`。

若付款服務的規則也要讓 Claude 看到，可在 `services/payments/` 再放一份以 `@AGENTS.md` 開頭的 `CLAUDE.md`。[子目錄的 CLAUDE.md](https://code.claude.com/docs/en/memory#how-claude-md-files-load) 會在 Claude 讀取、寫入或編輯該目錄中的檔案時載入。另一個做法是把 Project instructions 設成 `claude-md-and-agents-md`，讓兩種檔一起讀。

## 什麼情況用哪個檔

| 情況 | 用哪個檔 |
| --- | --- |
| 全團隊共用的規則 | 根目錄 `AGENTS.md` |
| 只有某個子專案才適用的規則 | 該子目錄的 `AGENTS.md`（Codex 請從該目錄啟動；Claude 若根目錄已有 CLAUDE.md，需另加 import 或改設定） |
| 你個人、套用到所有專案的偏好 | `~/.codex/AGENTS.md`，或 `~/.claude/CLAUDE.md` |
| Codex 暫時要換一套規則 | 同層的 `AGENTS.override.md`（用完刪掉；Claude 不讀這份） |
| 只要補充 Claude 專屬規則 | `CLAUDE.md` 第一行 `@AGENTS.md`，下面再寫補充 |
| 只有自己看、不要提交的 Claude 筆記 | `CLAUDE.local.md`（預設會讓 Claude 不再讀 AGENTS.md，需要的話改設定） |
| 必須強制做到的事 | hook 或權限設定，不是說明檔 |

## 常見錯誤

- 規則寫成抽象口號，例如「程式要寫得乾淨」，助理沒有可以核對的標準。
- 檔案越寫越長，重要的句子被埋在後面，或超過工具會讀的長度。
- 兩份檔的內容互相矛盾。[Claude 的文件](https://code.claude.com/docs/en/memory#write-effective-instructions)寫：遇到矛盾時，它可能任選一條。
- 改了 AGENTS.md 卻忘了重開 Codex，它仍沿用啟動時建立的那一串規則。
- 在已經依賴 AGENTS.md 的 Claude 專案裡加了 `CLAUDE.local.md`，結果 AGENTS.md 不再被讀。
- 把 AGENTS.md 當成安全機制。它只是說明，擋不下一定要禁止的動作。

## 結論與下一步

今天就可以在根目錄放一份 30 行以內的 AGENTS.md，寫上真正會用到的安裝、測試和注意事項。若還需要 Claude 專屬補充，再加一份以 `@AGENTS.md` 開頭的 CLAUDE.md。改完後用上面的指令或 `/memory` 確認有讀到。

若要進一步了解「寫給助理看的每一行都有成本」，見 [mattpocock/skills 系列（6）：查資料、做交接、學新東西，都有固定做法](/posts/mattpocock-skills-research-handoff/)。官方說明則見 [Codex 的 AGENTS.md 文件](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 的記憶說明](https://code.claude.com/docs/en/memory#agents-md)，以及 [AGENTS.md 格式官網](https://agents.md/)。要把規則變成固定時機會執行的檢查，見[hooks 篇](/posts/claude-code-hooks-automate-checks/)。
