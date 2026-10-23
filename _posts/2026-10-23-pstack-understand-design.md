---
title: "pstack 系列（2）：改程式之前，先看懂再設計"
description: "用 pstack 改程式前，怎麼讓 AI 先看懂現有程式、再比較幾種設計？本文用 Claude Code 實測 /how、/why、/architect、/interrogate 與 /arena，逐項核對結果，並列出耗時與 API 等價成本。"
date: 2026-10-23 21:45:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.png
  alt: "先用 /how、/why 看懂，再讓 /architect、/arena 比方案、/interrogate 挑錯。"
---

AI 程式助理接到「加一個功能」，常常直接從第一個看起來合理的地方開始改，用的也是它第一個想到的做法。這篇要解決的問題是：改程式之前，怎麼讓 AI 先看懂現有的程式，再比較幾種設計。我用的練習程式和[第 1 篇](/posts/pstack-install-routing/)相同，叫 `ledger`，是一個用 Python 寫的小型記帳 CLI（在終端機輸入指令來用的程式），會把銀行匯出的 CSV 檔彙總成收入、支出、淨額和各分類的支出。我在它上面把 pstack 的五個 skill 各跑了一次，下面逐一貼出它們實際交出的東西，再用白話說明對我有什麼用。

結論先講：`/how` 的說明逐點核對都正確；`/why` 大致正確，只有一處行號差 1。設計三步裡，`/architect` 最貴，跑一次就用掉 4.29 美元的 API 等價金額。API 等價金額是照 API 牌價換算出來的金額；我用的是訂閱方案的額度，實際沒有另外付錢。

> pstack 系列｜第 2 篇
>
> - 系列導讀：這套 skill 是什麼、四篇該怎麼讀（尚未發布）
> - 上一篇（第 1 篇）：[安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
> - 下一篇（第 3 篇）：寫完程式之後，怎麼證明它真的能用再合併（尚未發布）
{: .prompt-info }

> **版本提醒**：本文以 pstack [`0.15.30` 版](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/.cursor-plugin/plugin.json)為準，對應 `cursor/plugins` 的 commit `eb4db2b`（2026-10-22 14:08，台北時間），搭配 Claude Code 2.1.309。第 1 篇寫完後，Claude Code 自動更新了自己和外掛，所以兩篇的版本不同：
>
> | | 第 1 篇 | 本篇 |
> | --- | --- | --- |
> | pstack | `0.15.29`（`88d4751`） | `0.15.30`（`eb4db2b`） |
> | skill 數量 | 56 | 57 |
> | Claude Code | 2.1.306 | 2.1.309 |
>
> `0.15.29` 到 `0.15.30` 只新增了 `statechart` 這個 skill。本篇用到的 how、why、teach、architect、interrogate、arena、swarm、poteto-mode，以及 Claude Code 對照說明都沒有改。我在 2026-10-23 21:28（台北時間）查證時，`cursor/plugins` 的 main 在 `eb4db2b` 之後又有兩個 pstack commit（`7698375`、`4ec7ffa`），都只改 `statechart`，版本仍是 `0.15.30`。
{: .prompt-warning }

> **這次怎麼測的**：所有實測都是我在 2026-10-23 15:42–21:20（台北時間），在自己的 Mac（macOS 27.0、Claude Code 2.1.309）上執行的。我用的是 Claude Code 的非互動模式 `claude -p`：把指令一次交給它，不在對話畫面裡操作。權限白名單（事先允許 AI 做哪些事的清單）和第 1 篇相同，只多允許唯讀的 `git blame`：不能寫入 `~/.claude/` 底下的全域設定，不能 `git push`、`gh`、`curl` 或上網，也沒有用 `--dangerously-skip-permissions`。每次都要求不要 commit（commit 是 git 裡的一次修改紀錄），練習專案從頭到尾都停在 `579a745` 這個版本，草稿只寫在沒有納入版本控制的 `.pstack-scratch/` 資料夾。每次的完整提示放在文末附錄。**Cursor 上的任何操作都沒有實測**。
{: .prompt-tip }

## 先認識五個 skill

pstack 是 Cursor 官方外掛庫裡的一整組 skill。skill 是一份告訴 AI 怎麼完成某類工作的操作說明。Claude Code 是在終端機裡使用的 AI 程式助理；在 Claude Code 裡，指令前面要加外掛名稱，例如 `/pstack:how`。本篇用到五個 skill：

- `/how`：說明程式現在怎麼運作。
- `/why`：從修改紀錄裡，找出程式為什麼長這樣。
- `/architect`：實作前先把設計草稿畫出來。
- `/interrogate`：找幾個不同的 AI 模型，各自挑設計的毛病。
- `/arena`：讓幾個 AI 各做一次同一件事，再挑最好的一份，從其他份補進優點。

下面每個 skill 都照同樣的順序寫：我請它做什麼、它實際交出什麼（從實測紀錄原文照錄）、這代表什麼，以及花了多少。

pstack 有一份模型設定（Claude Code 上是 `~/.claude/rules/pstack-models.md`），寫明每個角色用哪個模型、effort（要 AI 花多少力氣思考）多高；[第 1 篇](/posts/pstack-install-routing/)介紹的 `/setup-pstack` 就是用來產生這份設定的。這次實測時，需要幾個模型一起做的角色（architect 和 arena 的 runner、interrogate 的審查者），設定裡都是 opus、sonnet、haiku 各一個，effort 都是 high。

## 看懂現有程式：/how 和 /why

![說明圖：左邊是 /how，回答現在怎麼運作，交出整條路徑、流程圖和 10 點注意事項，我逐點核對全部正確；右邊是 /why，回答為什麼長這樣，查 git 歷史和過去的對話紀錄，把直接證據和推論分開，大致正確，有 1 處行號差 1；下方標示 /teach 和 /recall 未實測](understand-how-why.png){: width="800" height="450" }
_/how 問「現在怎麼運作」，/why 問「為什麼長這樣」。_

### /how：這段程式現在怎麼運作

**我請它做什麼**：說明一份 CSV 從讀進來、算出數字，到印出結果，中間經過哪些程式。

**它實際交出什麼**：一份說明，包括總覽、整條路徑、流程圖和 10 點注意事項。下面是其中 4 點注意事項，原文照錄：

```text
4. **括號的邊界情況**：`(-12)` 會變成 **+12**；`1e3` 會被接受成 1000；`$12` 會失敗。這些都沒有測試。
5. **檔案開頭有 BOM 時，每一列都會失敗**：Excel 匯出的 CSV 常帶 BOM，但這裡用的是 `utf-8` 而不是 `utf-8-sig`，header 會讀成 `\ufeffdate`，錯誤訊息是 `error: line 2: 'date'`。
6. **行號可能不準**：行號是以資料列計數，遇到空行或引號內換行就會偏掉。改用 `reader.line_num` 才準確。
7. **`--month` 不檢查格式**：傳 `2026-1` 會靜靜地回傳全部是 0 的結果。而且因為過濾在解析之後，9 月的一個壞列也會讓查詢 10 月的指令失敗。
```

**這代表什麼**：這幾點都是光看程式不容易發現、但真的會出錯的細節。例如括號裡又帶負號的 `(-12)` 會被當成正 12；Excel 匯出的 CSV 常在檔案開頭帶一個看不見的 BOM 標記，會讓每一列都讀取失敗；`--month 2026-1` 打錯格式也不會報錯，只會回傳一堆 0。我把 10 點逐一對照程式，也實際執行確認，全部正確。對我的用處是：動手改之前，就知道哪些地方容易出錯，也知道測試還缺什麼。

它的做法也值得一提。它判斷這是範圍小的問題，只派了 1 個 subagent 去讀程式。subagent 是主對話另外派出去、專門做一小段工作的 AI。subagent 回報之後，主對話又自己核對了一次它引用的行號，才把答案交給我。

**花費**：約 0.73 美元，不到 3 分鐘。

### /why：為什麼長這樣

**我請它做什麼**：查出為什麼「把括號金額轉成負數」這件事放在 parser（負責讀檔和解析的模組），而不是放在負責計算或輸出的模組。

**它實際交出什麼**：一份分層的報告。下面是開頭的結論，以及「合理推論」那一節的第一條，原文照錄：

```text
轉換放在 `parse_amount`，是修正 commit `3c1ea12` 的 AI agent（run c2）決定的，而且它寫下了理由。你只規定了行為，沒有指定要改哪個檔案。
```

```text
## 合理推論
- **[Inferred]** 原作者看來一開始就把「解讀 CSV 金額格式」當成 parser 的責任，依據是 docstring 和 README 都在第一個 commit。但沒有人寫下這樣分工的理由。
```

**這代表什麼**：它把答案分成兩層。第一層有直接證據：轉換放在 parser，是[第 1 篇](/posts/pstack-install-routing/)修 bug 的那個 AI agent（會自己讀檔、執行指令的 AI）依「修根因」的原則決定的，而且它當時就寫下了理由。第二層是推論：原作者為什麼一開始就讓 parser 處理括號，沒有人寫下來，它只能從程式裡的說明文字和 README 推測，並且明白標成「推論」。對我的用處是：我知道哪些話可以直接相信，哪些只是猜測。

它查了 git 歷史（每一次修改的紀錄），也自己決定去讀我本機過去的 Claude Code 對話紀錄，把它當成團隊聊天紀錄的替代。我核對了它引用的原文，都查得到，只有一處行號差 1。

**花費**：約 1.98 美元，不到 4 分鐘。

> `/why` 會讀你過去的 Claude Code 對話紀錄。這次的白名單只禁止寫入 `~/.claude/`，沒有擋讀取，所以它讀得到。如果那些紀錄裡有你不想再交給模型的內容，請先調整權限。agent 讀得到哪些東西，可以參考[裝了第三方 skill 和 MCP 之後的破口](/posts/coding-agent-supply-chain-permission-risks/)那篇。
{: .prompt-warning }

## 比較設計：/architect、/interrogate 和 /arena

看懂之後是設計。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5)點出兩種最常見的錯：直接採用 AI 的第一個設計，以及花時間修飾一份沒有程式驗證過的計畫。pstack [刻意沒有寫計畫的 skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103)，作者在 [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268) 裡說，最好的規格就是程式。所以下面三步交出的都是程式：草稿、可以執行的範例，或是跑過測試的程式碼。

![說明圖：三張卡片依序是 /architect，3 個模型各畫一份草稿，挑最好的一份當底再補進優點，停下來列出 5 個要我決定的問題；/interrogate，3 個模型各自挑毛病，結論是修正後可以實作，5 項必須處理；/arena，兩個 AI 各寫一份，派工前先抓到我的規格自相矛盾，最後測試全部通過；下方標示照草稿實作、/swarm 和套用回專案未實測](design-three-steps.png){: width="800" height="450" }
_三步的產出都只放在 .pstack-scratch/ 資料夾，沒有動到專案本身。_

### /architect：先畫設計草稿

**我請它做什麼**：替 `ledger` 設計「每個分類的月預算與超支警告」，只交出草稿，設計完先停下來給我看，不要實作。

我在指令後面加了 `with checkpoint`。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) 寫明，不加的話，它設計完會直接進入實作，中間不會停下來讓人確認。

**它實際交出什麼**：函式的名稱和輸入輸出（函式本體還沒寫）、一份範例輸出，以及 5 個要我決定的問題。下面是範例輸出和第一個問題，原文照錄：

```text
...原本的 8 行...
budget 2026-09:      spent      limit  remaining
  housing          1200.00    1200.00       0.00
  ...
budget 2026-10:      spent      limit  remaining
  food              153.45     150.00      -3.45  <-- OVER BUDGET by 3.45
  ...
WARNING: over budget: food (2026-10)
```

```text
1. **沒帶 `--month` 時要怎麼處理？** 我的設計是逐月列出；另外兩個選項是只看最新月份，或要求必須帶 `--month`。這個影響最大，三個模型的意見也不一致。
```

**這代表什麼**：範例輸出是它套上現有資料實際跑出來的，不是手算。10 月 food 花了 153.45，預算 150，所以標出超支 3.45。我對照範例資料核對過，數字正確。

它是這樣做出來的：先讓三種 Claude 模型（opus、sonnet、haiku）各畫一份結構不同的草稿，再由其中的 sonnet 當評審打分，最後以 opus 那份為底，從另外兩份補進好的部分。然後它停下來，列出 5 個要我決定的問題。第一題「沒指定月份時怎麼辦」影響最大，三個模型的意見也不一致。對我的用處是：還沒寫任何正式程式，我就先看到結果長什麼樣，也知道哪些需求我還沒講清楚。

**花費**：約 4.29 美元，約 13 分鐘，是這次五個 skill 裡最貴的一個。

### /interrogate：讓三個模型挑草稿的毛病

先說一個和指南不同的地方。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89)寫明，`/interrogate` 應該用在 diff 上。diff 是程式修改前後的差異。拿它審一份沒有程式的計畫，審查者會想出一堆根本不會發生的理論風險。這次我拿它審的是 architect 的草稿，不是 diff。不過這份草稿有函式的名稱和輸入輸出、用文字寫的步驟、測試清單，還有一支能執行的範例程式，不是純文字計畫。

**我請它做什麼**：挑出 architect 那份草稿的毛病，只審查，不要改任何檔案。

**它實際交出什麼**：一份審查結論。下面是它最後的總結，原文照錄：

```text
結論是**修正後可以實作**，先改這 5 件事再動手：
1. 大金額（例如 `1E+30`）會通過預算檔驗證，之後直接 traceback。
2. 非 UTF-8 的預算檔會 traceback。
3. `test_json_sample_exact` 對照的是被壓縮過的 JSON 範例，照寫一定會失敗。
4. `--month` 的驗證會接受全形數字和 `0000`，而且多開了第二個錯誤出口。
5. 測試清單漏掉設計自己新增的行為，包括 0 位元組檔案、`-0`、跨月的 JSON 等。
```

**這代表什麼**：它找了三個不同的模型當審查者，各自挑毛病。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69)說，每個模型的盲點不一樣，兩個模型各自提出同一個問題時，可信度很高。主對話再把所有意見分成「必須處理」「值得考慮」「記下即可」「不採納」四類，上面就是必須處理的 5 項。白話說：預算寫成天文數字、或預算檔不是 UTF-8 編碼時，程式會直接當掉，印出 traceback（Python 當掉時的錯誤追蹤）；草稿裡有一個測試照寫一定會失敗。我自己在 Python 上抽查了其中 3 個關鍵說法，都屬實。

它也挑出 architect 自己的理由有漏洞。architect 說逐月列出「絕不靜默漏掉任何一個月」，三位審查者都指出，沒有交易的月份其實會被跳過。上一個 skill 寫下的理由，被下一個 skill 挑出了問題。對我的用處是：動手實作之前，就先修掉幾個會讓使用者看到錯誤畫面的問題。

光看這一次，無法判斷指南的提醒對不對。這份草稿已經寫到函式的輸入輸出和步驟，審出來的問題我抽查的都是真的；但也有 4 項被判定不採納，[指南提醒不採納的部分也要讀](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71)。如果你手上只有一份文字計畫，照指南先做出程式再審，會比較穩。

**花費**：約 2.03 美元。整段跑了約 23 分鐘，但實際運算只有約 3 分鐘，原因見後面的觀察。

### /arena：讓兩個 AI 各寫一份

**我請它做什麼**：讓兩個 AI 各自改寫一次解析金額的函式，只接受一般的金額格式，拒絕 `1e3`、`NaN`、`$12` 這類輸入，而且現有的測試都不能壞。

arena 裡各自完成同一份任務的 AI 叫 runner。runner 的數量預設來自 `/setup-pstack` 產生的模型設定，[也可以每次調整](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51)。模型設定裡是 3 個，這次我刻意在提示裡只要 2 個（opus 和 haiku）。

**它實際交出什麼**：一份綜合報告。報告是英文的，下面是其中兩節，原文照錄：

```text
## Contract change during framing

The original ask also rejected `'1.234'` (3 decimals), but `tests/test_cli.py` parses `-5.555` through `load -> parse_amount`, so that conflicts with "all existing tests unchanged". The user chose option 1: no limit on decimal places, and the other rejections stay.
```

```text
## Convergence

The two candidates independently wrote the **same grammar**: `[0-9]` only, comma groups of exactly 3, a decimal point that needs digits on both sides, sign XOR parentheses, `fullmatch` on `text.strip()`. Their edge-case decisions were the same too: reject `12,34`, `.5`, `5.`, `( 12 )`, non-ASCII digits and empty input; accept a trailing newline. That is strong agreement, so the consensus shape ships.
```

**這代表什麼**：第一節說的是派工前發生的事。我原本要求拒絕三位小數的 `'1.234'`，可是現有測試裡有一筆 `-5.555` 必須能讀進來，兩個要求不可能同時成立。它沒有硬做，先跑了現有測試、發現矛盾，停下來列出 3 個選項問我。它建議選項 2：維持嚴格的兩位小數，只在驗證用的複本裡把那筆 `-5.555` 改成像 `-5.56` 這樣的兩位小數；它也提醒，這等於改了我原本禁止改的現有測試。我選了選項 1：不限制小數位數，其他要拒絕的照舊。

第二節是結果：兩個 runner 各自寫出一模一樣的規則，只接受 0–9 的數字、千分位逗號三位一組、小數點兩邊都要有數字、正負號和括號只能擇一。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) 說，兩份收斂到同一個形狀就是強共識。接著由 sonnet 當評審打分，它不是任何一個 runner 用的模型。評審和主對話都選 opus 那份當底，主對話再從 haiku 那份補進一處寫法和幾個測試。合併後的版本在暫存資料夾裡跑測試，全部通過；我在自己的 Mac 上重跑，結果一樣。

要注意的是，新版會拒絕一些舊版接受的寫法，例如 `.5`、`5.`、`( 12 )`、`12,34`，套用前要先確認資料格式。對我的用處是：它在派 AI 動手之前，先抓出我自己規格裡的矛盾。

**花費**：兩段合計約 2.29 美元，約 6 分鐘。

## 這次沒有實測的部分

- Cursor 上的任何操作。
- `/teach` 和 `/recall`。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5)說，`/teach` 會再跑一次 `/how` 和 `/why`，整理成白話說明；`/recall` 會從最近的對話和共用紀錄，整理某個主題目前的狀況。
- 原因不清楚時的[唯讀調查](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17)（在交給 `/poteto-mode` 的指令裡寫上「don't change any code yet」）。這次沒有重跑，[第 1 篇](/posts/pstack-install-routing/)跑過一次。
- architect 照草稿實作，以及發現架構錯了就整個重來的那兩段。我刻意讓它停在 checkpoint，所以「實作時有沒有照草稿走」這次沒有答案。
- 把 arena 的結果套用回專案。結果刻意只放在 `.pstack-scratch/`。
- 照模型設定用 3 個 runner 的單獨 arena。3 個 runner 只在 architect 內部那一場出現過。
- `/swarm`：把工作切給多個 AI 平行處理。
- 指南建議用來回答設計問題的 [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81)，也就是做幾個用完就丟的試作。

## 這次環境觀察到的幾件事

以下幾點都是在這次的環境（帳號、版本、`-p` 模式、權限白名單）觀察到的，不代表在其他帳號或互動介面也一定會發生。

**1. subagent 執行指令常被擋，主對話會自己補跑。** architect、interrogate、arena 三次都有 subagent 執行終端機指令（Bash）被拒，主對話都會自己補做驗證。第 1 篇看到的是在背景執行的 subagent 一律不能跑指令；這次 `/why` 的背景 subagent 能跑 git 指令，但仍有幾個指令被拒。被擋之後，它們改用讀檔、搜尋或比較單純的指令，並在報告裡註明哪些沒有實際執行。

**2. effort 這次照模型設定。** effort 是要 AI 花多少力氣思考。這次派出的 subagent 都是 high，和模型設定一致；第 1 篇修 bug 和加功能兩次都用了 low。

**3. `/interrogate` 在 `-p` 模式下空等。** 主對話派完審查者後，設了一個 20 分鐘後叫醒自己的備援計時。每一段回覆的運算時間加起來約 200 秒，整個執行卻跑了 22 分 35 秒。看起來審查者早就回報了，它還是等到 20 分鐘的計時到了才結束。這是從時間推論的，沒有逐筆時間戳證實。

**4. architect 沒有派 `/how`。** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) 要求設計前先跑 `/how`。這次主對話自己讀完程式，寫成一份 `grounding.md` 給後面的 runner 共用，沒有派 `/how` 的 subagent。

**5. 外掛在兩篇之間自動更新了。** 見文章開頭的版本提醒。

## 什麼時候用哪一個

想知道一段程式現在怎麼運作，用 `/how`：它最便宜，交出的注意事項也最實用。想知道程式為什麼長這樣，而且有 git 歷史或過去的紀錄可查，用 `/why`，並分清楚它標的「直接證據」和「推論」。要加的功能會碰到好幾個模組，先用 `/architect with checkpoint` 看草稿和待決問題，再決定要不要實作；它最貴，小改動不必用。手上已經有程式修改，或是寫到函式輸入輸出的草稿，再用 `/interrogate` 讓不同模型挑毛病。一件小而具體的修改，想比兩種寫法，用 `/arena`。不管用哪一個，最後都要自己抽查幾項結論。下一篇會接著談，寫完程式之後，怎麼證明它真的能用再合併。

## 實測紀錄

![說明圖：橫條圖列出每一步的 API 等價美元，/how 0.732、/why 1.979、/architect 4.293、/interrogate 2.030、/arena 兩段合計 2.288，底部寫 7 次呼叫合計約 11.40 美元](cost-per-step.png){: width="800" height="450" }
_architect 最貴，arena 和 interrogate 次之。_

| 執行 | 指令 | 時間（台北） | 耗時 | 模型與各自的 API 等價（美元） | 5 小時額度 | 細節 | API 等價（美元） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a1 | `/pstack:how` | 15:42–15:45 | 2 分 37 秒 | opus（主對話＋1 個 subagent） | 21% → 24% | 8 步路徑、流程圖、職責表、10 點注意事項，逐點核對全對 | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | 3 分 35 秒 | opus（3 個調查員＋1 個綜合者） | 25% → 35% | 引用都查得到；它說 README 第 13–15 行在第一個 commit 就有，當時其實在第 12–14 行 | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 12 分 42 秒 | opus 3.484、sonnet 0.728、haiku 0.080 | 42% → 87% | 3 份草稿，評審給 C1（opus）26 分、C3（haiku）25 分、C2（sonnet）24 分；以 C1 為底；5 個待決問題 | 4.293 |
| q0 | 額度檢查 | 20:39 | 2 秒 | opus | 26% → 26% | 只回覆 ok，用來讀取額度 | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | 22 分 35 秒（實際運算約 200 秒） | opus 1.790、sonnet 0.213、haiku 0.026 | 26% → 71% | 三位審查者回報 10、9、17 項；必須處理 5、值得考慮 6、記下即可 6、不採納 4；我抽查 3 項屬實 | 2.030 |
| b3 | `/pstack:arena` | 21:13 | 42 秒 | opus | 74% → 75% | 先跑現有的 13 個測試，發現 `tests/test_cli.py:14` 的 `-5.555` 和規格矛盾，停下來問 | 0.242 |
| b3b | arena 接續（`--resume`） | 21:14–21:19 | 5 分 38 秒 | opus 1.889、sonnet 0.134、haiku 0.023 | 75% → 84% | 17 個測試通過（13 個原有＋4 個新，含 19 個接受、59 個拒絕的子測試）；新測試拿去跑原版會有 30 項失敗 | 2.046 |

7 次呼叫合計約 11.40 美元。這是 Claude Code 回報的 `total_cost_usd`，也就是**照 API 價格換算的等價金額**；這次用的是訂閱方案的額度，實際沒有另外扣款。

「5 小時額度」是訂閱方案在一段 5 小時視窗內的用量上限，表中是每次執行開始和結束時讀到的百分比。19:50 額度重置過一次，所以 b1 之後的數字從 26% 重新算起。整段實測一直沒有被拒絕。7 天額度從 67% 升到 91%，其中 16:08 到 20:39 從 76% 升到 83% 那段，是我自己平常使用 Claude Code，不是這些實測造成的。

## 附錄：完整提示

以下是每次執行時我交給 Claude Code 的完整提示，原文照錄。

**`/how`**

```text
/pstack:how 這個專案的 parser 和 summary 是怎麼接在一起的？請說明從 CLI 讀進 CSV、解析成 Transaction，到 summarize 算出數字、再由文字或 --json 輸出的整條路徑，以及各模組的分工。這是唯讀問題：不要修改、新增或刪除任何檔案，也不要 commit。
```

**`/why`**

```text
/pstack:why 為什麼會計格式的括號金額（例如 `(12.00)` 代表 -12.00）是在 ledger/parser.py 的 parse_amount 裡轉成負數，而不是在 report.py 或 cli.py 處理？這是唯讀問題：不要修改、新增或刪除任何檔案，也不要 commit。
```

**`/architect`**

```text
/pstack:architect with checkpoint：設計完先停下來給我看，不要實作。功能：每個分類的月預算與超支警告。使用者提供一個預算檔（例如 budgets.csv，欄位 category,monthly_limit），`ledger summary` 加上 `--budget <檔案>` 時，在原本的輸出之後，列出每個有預算的分類在該月的支出、預算和剩餘，超過預算的分類要明顯標示警告；`--json` 也要包含這些資訊。沒給 `--budget` 時，文字和 JSON 輸出都必須和現在逐位元組相同。請產出型別與介面草稿（函式 body 先寫 not implemented）和設計理由。草稿和所有中間產物只能放在 ~/pstack-lab/.pstack-scratch/ 底下；不要修改 ledger/、tests/ 裡的現有檔案，也不要 commit。
```

**`/interrogate`**

```text
/pstack:interrogate 請對抗式審查 ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ 裡的設計草稿（parser.py.sketch.py、report.py.sketch.py、cli.py.sketch.py、test_sketch.py、rationale.md、verify_sample.py），對照現有的 ledger/ 和 tests/。意圖：為 `ledger summary` 加上 `--budget <檔案>`（budgets.csv，欄位 category,monthly_limit），在原本輸出後列出每個有預算的分類在該月的支出、預算、剩餘，超支要明顯警告，--json 也要包含；沒給 --budget 時文字與 JSON 輸出必須逐位元組不變。這是尚未實作的 not-implemented 草稿，請審查設計本身（介面、邊界、正確性、測試是否足夠）。只審查、給出 verdict，不要修改或新增任何檔案，不要套用修改，不要 commit。
```

**`/arena`**

```text
/pstack:arena 只用 2 個 runner：opus high 與 haiku high。這是刻意覆寫 pstack-models 設定裡 arena runners 的 3 個 runner（opus、sonnet、haiku），目的是把 N 降到最小；cross-judge 照設定的 pool 選一個。任務（小而具體）：強化 ~/pstack-lab/ledger/parser.py 的 parse_amount，只接受一般金額：可選的正負號或會計括號、數字可含千分位逗號、最多兩位小數。要拒絕並丟 ParseError 的例子：'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'、'1.234'（三位小數）。'1,234.50'、'-3.20'、'(12.00)' 等現有行為與所有現有測試都必須保持不變。每個 candidate 只能在 ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/ 底下產出：修改後的完整 parser.py 複本、新增的測試、簡短 rationale。綜合結果放在 ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/，並在 .pstack-scratch 裡驗證（例如把 ledger/ 與 tests/ 複製到 .pstack-scratch/arena-amount/verify/ 再用 python3 -m unittest 跑）。不要修改 ~/pstack-lab/ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。
```

`/arena` 停下來問我之後，我用 `--resume` 接著回覆：

```text
選項 1：不限制小數位數，'1.234' 從拒絕名單拿掉；其他要拒絕的例子不變（'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'），所有現有測試不動且必須通過。其餘條件照舊：只用 2 個 runner（opus high、haiku high，刻意覆寫設定的 3 個），產出只放在 ~/pstack-lab/.pstack-scratch/arena-amount/，不要修改 ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。請繼續跑完 arena 全部階段。
```

我在自己的 Mac 上重跑測試用的指令：

```bash
python3 -m unittest discover -s tests
```

## 延伸閱讀

- [指南：Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md)：`/how`、`/why`、`/teach`、`/recall` 各自適合的情況。
- [指南：Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md)：`/architect`、`/arena`、`/swarm`、`/interrogate` 和試作。
- [pstack 系列（1）：安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：本篇用到的練習專案和唯讀調查。
- [自己寫 Agent Skill](/posts/agent-skill-authoring-guide/)：從寫 skill 的角度看 SKILL.md 的結構和測試。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：agent 讀得到哪些檔案、權限怎麼收。
- 另一套 skill 的做法：[mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)、[把模糊需求問清楚](/posts/mattpocock-skills-requirements-shared-language/)、[先找出缺口，再決定要寫規格還是拆工作單](/posts/mattpocock-skills-specs-work-breakdown/)、[查資料、做交接、學新東西](/posts/mattpocock-skills-research-handoff/)。
