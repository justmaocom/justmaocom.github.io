---
title: "pstack 系列（2）：改程式之前，先看懂再設計"
description: "用 pstack 改程式前，怎麼讓 AI 先看懂現有程式、再比較幾種設計？本文用 Claude Code 實測 /how、/why、/architect、/interrogate 與 /arena，逐項核對結果，並列出耗時與 API 等價成本。"
date: 2026-10-23 21:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.png
  alt: "先用 /how、/why 看懂，再讓 /architect、/arena 比方案、/interrogate 挑錯。"
---

你要替一個小專案加功能，直接叫 AI 程式助理動手，它通常會從第一個看起來合理的地方開始改，用的也是它第一個想到的做法。可是它真的懂這段程式現在怎麼運作、為什麼長這樣嗎？第一個做法又是不是最好的？用 pstack 改程式之前，怎麼讓 AI 先看懂、再比較設計？

先說明幾個名詞。pstack 是 Cursor 官方外掛庫裡的一整組 skill，skill 則是一份告訴 AI 怎麼完成某類工作的操作說明。subagent 是主對話另外派出去、專門做一小段工作的 AI。本篇用到五個 skill：

- `/how`：說明程式現在怎麼運作。
- `/why`：從 git 歷史和其他紀錄裡，找出程式為什麼長這樣。
- `/architect`：實作前先把型別和介面定下來。
- `/arena`：讓幾個 subagent 各做一次同一份任務，再挑一份當底，從其他份補進好的部分。
- `/interrogate`：讓不同模型的審查者各自挑出設計或修改的問題。

在 Claude Code 裡，指令前面要加外掛名稱，例如 `/pstack:how`。這次我在同一個練習專案上，把這五個 skill 各跑了一次。`/how` 的說明逐點核對都正確；`/why` 大致正確，只有一處行號差 1；設計三步各自抓到了真問題，但越往後越貴，`/architect` 一次就用掉 4.29 美元的 API 等價金額。

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
> `0.15.29` 到 `0.15.30` 只新增了 `statechart` 這個 skill。本篇用到的 how、why、teach、architect、interrogate、arena、swarm、setup-pstack、poteto-mode，以及 Claude Code 對照說明都沒有改。我在 2026-10-23 21:28（台北時間）查證時，`cursor/plugins` 的 main 在 `eb4db2b` 之後又有兩個 pstack commit（`7698375`、`4ec7ffa`），都只改 `statechart`，版本仍是 `0.15.30`。
{: .prompt-warning }

> **這次怎麼測的**：所有實測都是我在 2026-10-23 15:41–21:20（台北時間），在自己的 Mac（macOS 27.0、Claude Code 2.1.309）上用 Claude Code 的非互動模式 `claude -p`（輸出格式 stream-json）執行的，不是在互動介面操作。權限白名單和第 1 篇相同，只多允許唯讀的 `git blame`：禁止寫入 `~/.claude/` 底下的全域設定，禁止 `git push`、`gh`、`curl` 和上網，也沒有用 `--dangerously-skip-permissions`。每次提示都要求不要 commit，練習專案的 HEAD 從頭到尾都是 `579a745`，草稿只寫在沒有納入版本控制的 `.pstack-scratch/` 資料夾。**Cursor 上的任何操作都沒有實測**。
{: .prompt-tip }

## 先把模型設定改好

[第 1 篇](/posts/pstack-install-routing/)發現，這個帳號不能用設定檔裡的 fable 模型，subagent 一派出去就收到 HTTP 429 錯誤。所以這次先重跑 `/setup-pstack`：

```text
/pstack:setup-pstack 背景：這個帳號不能用 fable。之前派給 fable 的 subagent 立刻收到 HTTP 429「Fable 5.1 requires usage credits. Switch to another model to continue.」所以請重新設定，所有角色都不要用 fable，預算維持 medium。fable 的替代模型由你決定，並說明理由。這次只能寫 ~/.claude/rules/pstack-models.md，不要改其他任何檔案。
```

它提議這樣改：

- 原本用 fable 的四個單一角色（修 bug、效能問題、hillclimb、最難的任務）改成 `opus high`。
- 要多個模型一起工作的 panel，也就是 arena 的 runner 和評審名單、architect 的 runner、interrogate 的審查者，直接拿掉 fable，不補別的模型，從 4 個變成 3 個（opus、sonnet、haiku）。它的理由是 panel 的價值在於不同模型互相比較，多放一個 opus 只會多花錢；想維持 4 個的話，可以各加一個 `opus high`。

但它寫不進去。Claude Code 把 `~/.claude/rules/pstack-models.md` 當成敏感檔案，回覆「Claude requested permissions to edit … which is a sensitive file.」即使白名單明確允許這個檔案，也要在畫面上確認一次，而 `-p` 模式沒有確認畫面，寫入就被擋下了。第 1 篇的寫入是被我刻意設的規則擋下，這次則是 Claude Code 自己擋的。

它建議兩種做法：在權限提示出現時按允許，或自己覆蓋檔案。我在 15:54 把它提議的內容逐字手動寫入。所以這份設定是 setup-pstack 提議、我手動寫入的，不是它自己寫的。之後每一次執行派出的模型和 effort，都和這份設定一致。這一步花了 25 秒，API 等價 0.208 美元。

## 看懂現有程式：/how 和 /why

練習專案和第 1 篇相同：`pstack-lab` 是一個 Python 記帳 CLI，叫 `ledger`。第 1 篇修完 bug、加完 `--json` 之後，現在有 13 個測試。

![說明圖：左邊是 /how，只派 1 個 explainer，交出 8 步路徑、流程圖、職責表和 10 點注意事項，我逐點核對全對；右邊是 /why，派 3 個調查員和 1 個綜合者，查 git 歷史、MCP 和本機 session 紀錄，結果大致正確，有 1 處行號差 1；下方標示 /teach 和 /recall 未實測](understand-how-why.png){: width="800" height="450" }
_/how 問「現在怎麼運作」，/why 問「為什麼長這樣」。_

### /how：現在怎麼運作

```text
/pstack:how 這個專案的 parser 和 summary 是怎麼接在一起的？請說明從 CLI 讀進 CSV、解析成 Transaction，到 summarize 算出數字、再由文字或 --json 輸出的整條路徑，以及各模組的分工。這是唯讀問題：不要修改、新增或刪除任何檔案，也不要 commit。
```

`/how` 有兩條路。[它的 SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/how/SKILL.md#L13-L20) 寫明，碰到大型子系統時先派 2 到 4 個 explorer 分頭探索，再交給一個 explainer 整理；範圍小的問題就不派 explorer，只派一個 explainer 邊讀邊解釋，拿不定時走小的那條。explorer 是負責讀程式、回報發現的 subagent，explainer 則負責把發現寫成說明。

這次它走小的那條，只派 1 個 explainer（opus、effort high）。explainer 回報後，主對話又用 `cat -n` 和 grep 核對它引用的行號，才把答案交給我。答案包括總覽、關鍵概念、從 `__main__.py` 到輸出的 8 步路徑、mermaid 流程圖、各模組職責表，以及 10 點注意事項。

我把這 10 點逐一對照程式碼，並實際執行確認，全部正確。例如：

- `(-12)` 會被解析成 +12，`1e3` 會被接受，`$12` 則會失敗。
- CSV 開頭有 BOM 時，錯誤訊息會變成 `line 2: 'date'`。
- `--month 2026-1` 不會報錯，只會靜靜回傳全部是 0 的結果。
- 輸出 JSON 時沒有設 `ensure_ascii=False`，中文分類會變成 `\uXXXX`。

這次花了 2 分 37 秒，API 等價 0.732 美元。

### /why：為什麼長這樣

```text
/pstack:why 為什麼會計格式的括號金額（例如 `(12.00)` 代表 -12.00）是在 ledger/parser.py 的 parse_amount 裡轉成負數，而不是在 report.py 或 cli.py 處理？這是唯讀問題：不要修改、新增或刪除任何檔案，也不要 commit。
```

[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L33)說，`/why` 先查版本控制，再依你接了哪些 MCP（讓 AI 連到外部工具的介面），平行查工單、文件、團隊聊天、監控、錯誤追蹤和分析資料。報告會把直接證據和推論分開；什麼都沒查到也要寫出來，因為「沒人寫下原因」本身就是一個答案。

這個練習專案沒有工單，也沒有聊天紀錄。它先用 `git log -p` 和 `git blame` 找出相關的程式碼，再平行派出 3 個調查員，最後由 1 個綜合者整理，4 個都是 opus、effort high：

- **版本控制**：查 3 個 commit 的內容、blame 和 reflog。
- **session 紀錄**：這是它自己加的類別。它把我本機 `~/.claude/projects/` 裡的 Claude Code 對話紀錄，以及專案 `.runs/` 裡的實測紀錄，當成「團隊聊天」的替代來源。
- **Claude Docs**：它把一個連著的 MCP 當成「長篇文件」來查，但工具被權限擋下。綜合結果把這一項記成「未能搜尋」，沒有算成「查過但沒有」。

版本控制的調查員先回報，提到 `.runs/` 裡有第 1 篇修 bug 那次的紀錄。主對話用 `SendMessage` 把這條線索轉給還在跑的 session 紀錄調查員，沒有另外重派一個。

結論分成三級：直接證據（Direct）、有佐證（Supported）和推論（Inferred）。直接證據是：轉換放在 `parse_amount`，是第 1 篇修 bug 的那個 agent 依「修根因」原則決定的，它也寫下了理由：

> `report.summarize` 依正負號區分收支，這部分本身沒錯，只是收到了錯的正負號。

至於原作者為什麼一開始就讓 parser 處理括號格式，它查不到紀錄，只能從 docstring 和 README 推論。它也點出，在 report 或 cli 處理的替代方案，紀錄裡從來沒有被真正比較過。

我核對了它的引用，原文都查得到。唯一的小錯是行號：它說 README「第 13-15 行」在第一個 commit 就有。內容確實是那時就有，但當時在第 12-14 行；第 13-15 行是現在的位置。

這次花了 3 分 35 秒，API 等價 1.979 美元，是 `/how` 的 2.7 倍，cache read（重複讀進已快取的內容）約 160 萬個 token，訂閱的 5 小時用量一次漲了 11%。

> `/why` 會讀你過去的 Claude Code 對話紀錄。這次的白名單只禁止寫入 `~/.claude/`，沒有擋讀取，所以它讀得到。如果那些紀錄裡有你不想再交給模型的內容，請先調整權限。agent 讀得到哪些東西，可以參考[裝了第三方 skill 和 MCP 之後的破口](/posts/coding-agent-supply-chain-permission-risks/)那篇。
{: .prompt-warning }

### 沒有實測的 /teach、/recall 和調查 playbook

[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5)說，看懂程式共有四個入口。除了 `/how` 和 `/why`，`/teach` 會再跑一次 `/how` 和 `/why`，把結果整理成一份白話說明；`/recall` 則從你最近的對話和共用紀錄，整理出某個主題目前的狀況。這兩個這次都**未實測**。

如果原因還不清楚，指南建議先做[唯讀調查](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17)：在 `/poteto-mode` 的描述裡寫「don't change any code yet」，它就會走 Investigation playbook。這次沒有重跑；[第 1 篇](/posts/pstack-install-routing/)的唯讀調查花了 5 分 05 秒，列出 8 個風險點，第 1 點就是埋好的 bug。

## 比較設計：/architect、/interrogate 和 /arena

看懂之後，接下來是設計。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5)點出兩種最常見的錯：直接採用 AI 的第一個設計，以及花時間修飾一份沒有程式驗證過的計畫。它的做法是用程式來規劃。這次三個指令各跑了一次：

![說明圖：三張卡片依序是 /architect with checkpoint，3 個模型各畫一份草稿、評審打分後以 C1 為底並停在 checkpoint；/interrogate，3 個模型挑毛病，結論是修正後可以實作，5 項必須處理；/arena，2 個 runner，派工前先抓到我的規格自相矛盾，最後 17 個測試通過；下方標示照草稿實作、/swarm 和套用回 ledger/ 未實測](design-three-steps.png){: width="800" height="450" }
_三步都只在 .pstack-scratch/ 裡產出，沒有動到專案本身。_

### /architect：先畫型別和介面

`/architect` 分成五段：先看懂相關程式（Phase A），再用 arena 畫出幾份設計草稿（Phase B），經人確認（Phase C），照草稿實作（Phase D），發現架構錯了就整個重來（Phase E）。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) 寫明，預設會直接從設計進入實作，中間沒有人確認；要先看設計，得明講「with checkpoint」。

```text
/pstack:architect with checkpoint：設計完先停下來給我看，不要實作。功能：每個分類的月預算與超支警告。使用者提供一個預算檔（例如 budgets.csv，欄位 category,monthly_limit），`ledger summary` 加上 `--budget <檔案>` 時，在原本的輸出之後，列出每個有預算的分類在該月的支出、預算和剩餘，超過預算的分類要明顯標示警告；`--json` 也要包含這些資訊。沒給 `--budget` 時，文字和 JSON 輸出都必須和現在逐位元組相同。請產出型別與介面草稿（函式 body 先寫 not implemented）和設計理由。草稿和所有中間產物只能放在 ~/pstack-lab/.pstack-scratch/ 底下；不要修改 ledger/、tests/ 裡的現有檔案，也不要 commit。
```

**Phase A：自己讀，沒有派 `/how`。** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) 要求這一段跑 `/how`。這次主對話讀了 `/how` 的 SKILL.md，但沒有派 explainer，而是自己讀完全部程式、執行 CLI，寫成一份 `grounding.md` 給後面的 runner 共用。

**Phase B：其實就是一場 arena。** 它派出 3 個 runner（opus、sonnet、haiku，effort 都是 high），各畫一份草稿，再派一個唯讀的 sonnet 評審打分。runner 是 arena 裡各自完成同一份任務的 subagent。三份草稿的結構真的不同：

| 草稿 | 模型 | 結構 | 沒帶 `--month` 時 |
| --- | --- | --- | --- |
| C1 | opus | 預算併進 `report.summarize` | 逐月列出 |
| C2 | sonnet | 獨立的 `budget.py` 模組 | 取資料中最新的月份 |
| C3 | haiku | `parser`、`report`、`cli` 三層分工 | 取資料中最新的月份 |

評審給 C1 26 分、C3 25 分、C2 24 分。主對話自己也評了一次，同樣選 C1。理由是只有 C1 不用猜「該月」是哪個月：取最新月份的話，上方摘要寫 housing 1200.00，下面的預算區塊卻寫 0.00，會誤導人。

選好底之後，它從其他草稿補進幾處：

- 把預算計算從 `summarize` 拆出來，變成獨立的 `evaluate_budget`，避免出現兩種過濾月份的方式。
- 有 `--budget` 時嚴格檢查 `--month` 的格式（取自 C3），否則 `--month 2026-1` 會讓所有分類顯示 0.00，也不會警告。
- 加強預算檔的驗證（取自 C3）。
- 超支時標出超出多少（取自 C2）。

最後交出的介面草稿長這樣，函式內容都還是 `NotImplementedError`：

```python
parser.parse_budget_rows(lines) -> dict[str, Decimal]
parser.load_budget(path) -> dict[str, Decimal]
report.BudgetLine          # TypedDict：spent、limit、remaining、over
report.BudgetReport = dict[str, dict[str, BudgetLine]]
report.evaluate_budget(txns, limits, month=None) -> BudgetReport
cli.format_budget(budget) -> str   # cli.main 另外加上 --budget
```

範例輸出不是手算的，是它用 `verify_sample.py` 套上現有資料跑出來的。我對照範例 CSV 核對過：10 月 food 是 4.50＋86.20＋62.75＝153.45，預算 150 時剩餘 −3.45，標成「<-- OVER BUDGET by 3.45」；9 月 housing 1200.00 剛好用完，不算超支。

**Phase C：停在 checkpoint。** 它沒有進入實作，而是列出 5 個要我決定的問題：沒帶 `--month` 時怎麼處理、超支時的 exit code、退款要不要抵銷支出、預算檔裡從沒出現在交易中的分類要不要提示，以及空的預算檔算不算錯誤。第一題影響最大，三個模型的意見也不一致。

這次花了 12 分 42 秒，API 等價 4.293 美元（opus 3.484、sonnet 0.728、haiku 0.080），是 `/how` 的 5.9 倍；5 小時用量從 42% 漲到 87%。haiku 的 runner 寫得最多，輸出約 69,500 個 token，只花 0.08 美元，分數也只比 opus 少 1 分。

Phase D 實作和 Phase E 重來都**未實測**，因為我刻意讓它停在 checkpoint。所以「實作時有沒有照草稿走」這個問題，這次沒有答案。

### /interrogate：讓三個模型挑草稿的毛病

先說一個和指南不同的地方。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89)寫明，`/interrogate` 應該用在 diff（程式的實際修改）上；拿它審一份沒有程式的計畫，審查者會想出一堆根本不會發生的理論風險。這次我拿它審的是 architect 的草稿，不是 diff。不過這份草稿有函式簽名、TODO 偽碼、測試清單，還有一支能執行的 `verify_sample.py`，不是純文字計畫。

```text
/pstack:interrogate 請對抗式審查 ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ 裡的設計草稿（parser.py.sketch.py、report.py.sketch.py、cli.py.sketch.py、test_sketch.py、rationale.md、verify_sample.py），對照現有的 ledger/ 和 tests/。意圖：為 `ledger summary` 加上 `--budget <檔案>`（budgets.csv，欄位 category,monthly_limit），在原本輸出後列出每個有預算的分類在該月的支出、預算、剩餘，超支要明顯警告，--json 也要包含；沒給 --budget 時文字與 JSON 輸出必須逐位元組不變。這是尚未實作的 not-implemented 草稿，請審查設計本身（介面、邊界、正確性、測試是否足夠）。只審查、給出 verdict，不要修改或新增任何檔案，不要套用修改，不要 commit。
```

它派出 3 個審查者，分別是 opus、sonnet、haiku，effort 都是 high。依 SKILL.md，三位拿到的是同一份意圖和內容。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69)說，重點就在模型不同：每個模型的盲點不一樣，兩個模型各自提出的同一個問題最可信。SKILL.md 寫的是派 `generalPurpose` 加 `readonly: true`；在 Claude Code 上，它改用唯讀的 `Explore` subagent。

三位審查者分別回報 10 項、9 項和 17 項，haiku 最多。主對話沒有直接彙整，而是自己用 python3 重現邊界情況，再把每一項分成四類：必須處理（Act on）、值得考慮（Consider）、記下即可（Noted）和不採納（Dismissed）。結論是「修正後可以實作」，必須處理 5 項、值得考慮 6 項、記下即可 6 項、不採納 4 項。必須處理的 5 項是：

1. 很大的預算金額（例如 `1E+30`）能通過驗證，之後在四捨五入時丟出 `InvalidOperation`。這個例外不是 `ValueError`，cli 接不到，使用者會看到 traceback。
2. 預算檔不是 UTF-8 時會 traceback，而繁中 Windows 的 Excel 常匯出 CP950 編碼。
3. 測試草稿裡的 `test_json_sample_exact` 照寫一定會失敗。
4. `--month` 的檢查會接受全形數字和 `0000`。
5. 測試清單漏掉 0 位元組的檔案、`-0`、跨月的 JSON 等情況。

我自己在 Python 上抽查了其中 3 點，都屬實：`Decimal('1E+30').quantize(Decimal('0.01'))` 會丟出 `InvalidOperation`，它屬於 `ArithmeticError`；`'２０２６-10'` 和 `'0000-10'` 都能通過草稿裡的月份 regex；`Decimal('150.000')` 明明等於 150.00，卻會被草稿的「小數超過兩位」規則誤拒。

architect 的設計理由說，逐月列出「絕不漏掉任何一個月」。三位審查者都指出，沒有交易的月份其實會被跳過；範例裡也同時出現 housing 1200.00 和「2026-10 housing 0.00」的上下對照，而這正是 architect 拿來否決「取最新月份」的理由。主對話的建議是結論不一定要改，但第一個待決問題應該拿這些反例重新論證，再交給我決定。上一個 skill 寫下的設計理由，被下一個 skill 挑出了漏洞。

不採納的 4 項裡，有一項是 haiku 提出的「ANSI 跳脫字元注入」。主對話的理由是預算檔是使用者自己的本機檔案，現有程式印交易分類時也是同樣做法。指南提醒[不採納的部分也要讀](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71)，因為主對話不一定對，你可以推翻它。另一方面，haiku 也有兩項只有它提出、而且確認屬實的發現：`(-50)` 會被當成 +50，以及設計理由裡的 jq 範例沒有用。它只花了 0.026 美元。

這次 API 等價 2.030 美元，5 小時用量從 26% 漲到 71%。整個執行過程花了 22 分 35 秒，但實際運算大約只有 200 秒，原因寫在後面的「這次環境觀察到」。

光看這一次，無法判斷指南的提醒對不對。這份草稿已經寫到函式簽名和偽碼，審出來的問題我抽查的都是真的；但也有 4 項被判定不採納。如果你手上只有一份文字計畫，照指南先做出程式再審，會比較穩。

### /arena：讓兩個 runner 做同一件事

[arena 的 SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L11-L18) 分成六段：寫好給每份候選的同一份任務、定出評分表（rubric，3 到 6 條可以打分的標準）並選好 runner（Frame）；平行派出 runner（Fan out）；由另一個模型的唯讀評審打分（Cross-judge）；挑一份當底（Pick a base）；從其他候選補進好的部分（Graft）；最後驗證（Verify）。

runner 的數量預設來自 `/setup-pstack` 的設定，[也可以每次調整](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51)。設定檔裡是 3 個，這次我刻意在提示裡只要 2 個（opus high、haiku high），把 N 降到最小：

```text
/pstack:arena 只用 2 個 runner：opus high 與 haiku high。這是刻意覆寫 pstack-models 設定裡 arena runners 的 3 個 runner（opus、sonnet、haiku），目的是把 N 降到最小；cross-judge 照設定的 pool 選一個。任務（小而具體）：強化 ~/pstack-lab/ledger/parser.py 的 parse_amount，只接受一般金額：可選的正負號或會計括號、數字可含千分位逗號、最多兩位小數。要拒絕並丟 ParseError 的例子：'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'、'1.234'（三位小數）。'1,234.50'、'-3.20'、'(12.00)' 等現有行為與所有現有測試都必須保持不變。每個 candidate 只能在 ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/ 底下產出：修改後的完整 parser.py 複本、新增的測試、簡短 rationale。綜合結果放在 ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/，並在 .pstack-scratch 裡驗證（例如把 ledger/ 與 tests/ 複製到 .pstack-scratch/arena-amount/verify/ 再用 python3 -m unittest 跑）。不要修改 ~/pstack-lab/ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。
```

**Frame 階段先擋下我的規格。** 它沒有馬上派 runner，而是先跑了現有的 13 個測試，發現 `tests/test_cli.py:14` 的測試資料裡有 `-5.555`，這筆資料會經過 parser。也就是說，「拒絕三位小數」和「現有測試不變」不可能同時成立。它提出 3 個選項，建議選 2，然後停下來問我。這一段花了 42 秒，API 等價 0.242 美元。

我選了選項 1：維持「現有測試不動」，把 `'1.234'` 從拒絕名單拿掉。這一步用 `claude -p --resume` 接著同一段對話，我回覆：

```text
選項 1：不限制小數位數，'1.234' 從拒絕名單拿掉；其他要拒絕的例子不變（'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'），所有現有測試不動且必須通過。其餘條件照舊：只用 2 個 runner（opus high、haiku high，刻意覆寫設定的 3 個），產出只放在 ~/pstack-lab/.pstack-scratch/arena-amount/，不要修改 ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。請繼續跑完 arena 全部階段。
```

**兩份候選寫出相同的規則。** opus 和 haiku 各自寫出的格式規則一模一樣：只接受 ASCII 數字 0–9；千分位逗號必須三位一組；小數點兩邊都要有數字；正負號和括號只能擇一；去掉前後空白後要整串符合。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) 說，候選收斂到同一個形狀就是強共識，直接採用即可。

**挑底和補強。** 評審選的是 sonnet，理由是它不是任何一個 runner 用的模型。評審和主對話都選 opus 的 C1 當底。haiku 的 C2 被扣分，關鍵在它把 `(0.00)` 解析成 `-0.00`，原版是 `0.00`。不過 C1 也從 C2 補進了一處：括號金額改用 `value.copy_negate() if value else value` 轉負數。直接寫負號會照預設精度四捨五入到 28 位有效數字，`copy_negate` 不會；零也維持原本的 `0.00`。另外補進了幾個 C2 的測試。

**驗證。** 主對話把程式複製到 `.pstack-scratch/` 裡的 `verify/` 資料夾跑測試，17 個全部通過：13 個原有測試沒改，加上 4 個新測試，裡面共有 19 個接受、59 個拒絕的子測試。它也拿新測試去跑原版 parser 當對照，出現 30 項失敗，證明新測試真的測得出差別。我在 Mac 上重跑一次，同樣 17 個通過；`(-50)`、`(+50)`、`1e3`、`NaN`、`Infinity`、`$12` 都會丟出 `ParseError`，`1,234.50`、`-3.20`、`(12.00)`、`1.234` 照常接受。

它的報告也列出幾項要注意的地方：

- 舊版接受、新版會拒絕的值有 `.5`、`5.`、`( 12 )`、`12,34` 和非 ASCII 數字，套用前要先確認資料格式。
- 它自己承認一處疏失：評分表 `rubric.md` 放在兩份候選都讀得到的共用資料夾，opus 的 runner 讀到了。SKILL.md 寫的是評分表只給挑選的人用。評審檢查後，沒有發現迎合評分表的跡象。
- 在專案根目錄直接跑 `python3 -m unittest` 會找到 0 個測試，因為 `tests/` 沒有 `__init__.py`，要改用：

```bash
python3 -m unittest discover -s tests
```

這一段花了 5 分 38 秒，API 等價 2.046 美元（opus 1.889、sonnet 0.134、haiku 0.023）。兩段合計約 6 分鐘、2.288 美元。

這次**未實測**的部分：把結果套用回 `ledger/`（刻意只放在 `.pstack-scratch/`）、照設定 3 個 runner 的單獨 arena（N=3 只在 architect 內部那一場出現過），以及把工作切給多個 worker 平行處理的 `/swarm`。

## 什麼時候用哪一個

pstack [刻意沒有寫計畫的 skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103)。作者在 [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268) 裡寫，自己不相信先寫計畫，最好的規格就是程式。這次的設計三步也是這樣：architect 交出的是型別和函式簽名，interrogate 審的是這些簽名和偽碼，arena 則直接寫出程式並跑測試。

依這次的結果，可以這樣挑：

| 你的情況 | 用哪一個 | 這次的花費（API 等價） |
| --- | --- | --- |
| 想知道一段程式現在怎麼運作 | `/how` | 2 分 37 秒、0.732 美元 |
| 想知道程式為什麼長這樣，而且有 git 歷史或其他紀錄可查 | `/why` | 3 分 35 秒、1.979 美元 |
| 原因不明，要先查清楚再決定修不修 | `/poteto-mode` 加「don't change any code yet」 | 見第 1 篇 |
| 要新增的功能會碰到好幾個模組，想先定型別和介面 | `/architect with checkpoint` | 12 分 42 秒、4.293 美元 |
| 已經有 diff，或寫到函式簽名的草稿，想讓不同模型找問題 | `/interrogate` | 22 分 35 秒（實際運算約 200 秒）、2.030 美元 |
| 一件小而具體的修改，想比兩三種寫法 | `/arena` | 約 6 分鐘、2.288 美元 |

[指南的提醒](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L77)是：別因為「AI 反正會讀程式」就跳過 `/how`，先跑 `/how` 比修第二個 bug 便宜。不過第 1 篇加 `--json` 那次，它自己跳過了 `/how`、`/architect` 和 `/interrogate`，理由是改動只有兩個小檔案。改動很小時，不一定要把整套都跑一遍。

指南也建議，談不定的設計問題用 [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81) 做幾個拋棄式的試作來回答，而不是一直問你。這個 playbook 這次**未實測**。這次有兩處是 AI 停下來問我的：architect 的 5 個待決問題，以及 arena 發現規格自相矛盾時。這兩處都是要我決定需求，不是程式能回答的問題。

## 這次環境觀察到的幾件事

以下幾點都是在這次的環境（帳號、版本、`-p` 模式、權限白名單）觀察到的，不代表在其他帳號或互動介面也一定會發生。

**1. setup-pstack 寫不進自己的設定檔。** Claude Code 把 `~/.claude/rules/pstack-models.md` 當成敏感檔案，白名單允許了也要互動確認，`-p` 模式沒有確認畫面，所以直接拒絕。

**2. subagent 的 Bash 常被擋，主對話會自己補跑。** architect、interrogate、arena 三次都有 subagent 的 Bash 被拒，主對話都會自己補做驗證，並在報告裡寫明哪些沒實際執行。第 1 篇看到的是背景 subagent 一律不能跑 Bash；這次 `/why` 在背景執行的調查員能跑 git 指令，但仍有幾個指令被拒。被擋之後，它們改用 Read、Grep 或比較單純的指令，並在報告裡註明哪些沒有實際執行。

**3. effort 這次照設定。** 這次派出的 subagent 都是 effort high，和設定檔一致；第 1 篇修 bug 和加功能兩次都用了 low。

**4. `/interrogate` 在 `-p` 模式下空等。** 主對話派完審查者後，用 `ScheduleWakeup` 設了一個 1200 秒的喚醒當作備援。每一段回覆的運算時間加起來約 200 秒，整個執行卻跑了 22 分 35 秒。看起來審查者早就回報了，它還是等到 20 分鐘的喚醒才結束。這是從時間推論的，沒有逐筆時間戳證實。

**5. architect 沒有派 `/how`。** SKILL.md 要求 Phase A 跑 `/how`，這次主對話自己讀程式、寫 `grounding.md`，沒有派 explainer。

**6. 外掛在兩篇之間自動更新了。** 見文章開頭的版本提醒。

## 用量與費用

![說明圖：橫條圖列出每一步的 API 等價美元，/setup-pstack 0.208、/how 0.732、/why 1.979、/architect 4.293、/interrogate 2.030、/arena 兩段合計 2.288，右側標出 5 小時額度的變化，底部寫 8 次呼叫合計約 11.61 美元](cost-per-step.png){: width="800" height="450" }
_architect 最貴；interrogate 和 architect 各吃掉 45% 的 5 小時額度。_

| 執行 | 指令 | 時間（台北） | 結果 | API 等價（美元） |
| --- | --- | --- | --- | --- |
| s1 | `/pstack:setup-pstack` | 15:41 | 寫入被擋，我在 15:54 手動寫入 | 0.208 |
| a1 | `/pstack:how` | 15:42–15:45 | 全部正確 | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | 大致正確，一處行號差 1 | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 3 個 runner 加 sonnet 評審，選 C1，停在 checkpoint | 4.293 |
| q0 | 額度檢查 | 20:39 | 只回覆 ok，用來讀取額度 | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | 修正後可以實作，必須處理 5 項，我抽查 3 項都屬實 | 2.030 |
| b3 | `/pstack:arena` | 21:13 | Frame 階段發現規格自相矛盾，停下來問 | 0.242 |
| b3b | arena 接續（`--resume`） | 21:14–21:19 | 我選了選項 1；兩份候選收斂，17 個測試通過 | 2.046 |

8 次呼叫合計約 11.61 美元。這是 Claude Code 回報的 `total_cost_usd`，也就是**照 API 價格換算的等價金額**；這次用的是訂閱方案的額度，實際沒有另外扣款。

額度方面，5 小時用量在第一段（s1 到 b1）從 20% 升到 87%，19:50 重置；之後 interrogate 讓它從 26% 升到 71%，arena 兩段從 74% 升到 84%，一直沒有被拒絕。7 天用量全天從 67% 升到 91%，但其中 16:08 到 20:39 從 76% 升到 83% 那段，是我自己平常使用 Claude Code，不是這些實測造成的。

## 改程式之前，先要一份看得到的證據

這次的答案很具體：先讓 AI 交出可以核對的東西，再讓它比較設計。`/how` 交出帶行號的路徑和注意事項，我能逐點對照程式；`/why` 把直接證據和推論分開，也老實寫出哪些查不到。設計階段，`/architect` 讓三個模型畫出結構不同的草稿，再停下來把該由我決定的事列出來；`/interrogate` 讓另外三個審查者挑出草稿裡的漏洞，連 architect 自己的理由也被挑出問題；`/arena` 在派工前先跑測試，抓出我寫的規格自相矛盾。

代價是時間和額度。這次從 `/how` 到 `/arena`，API 等價合計約 11.61 美元，architect 一次就吃掉將近一半的 5 小時額度。小改動可以只跑 `/how`；會碰到好幾個模組的功能，再用 `/architect with checkpoint`。不管跑哪一個，最後都要自己抽查幾項結論。下一篇會接著談，寫完程式之後，怎麼證明它真的能用再合併。

## 延伸閱讀

- [指南：Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md)：`/how`、`/why`、`/teach`、`/recall` 各自適合的情況。
- [指南：Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md)：`/architect`、`/arena`、`/swarm`、`/interrogate` 和試作。
- [pstack 系列（1）：安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：本篇用到的練習專案和唯讀調查。
- [自己寫 Agent Skill](/posts/agent-skill-authoring-guide/)：從寫 skill 的角度看 SKILL.md 的結構和測試。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：agent 讀得到哪些檔案、權限怎麼收。
- 另一套 skill 的做法：[mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)、[把模糊需求問清楚](/posts/mattpocock-skills-requirements-shared-language/)、[先找出缺口，再決定要寫規格還是拆工作單](/posts/mattpocock-skills-specs-work-breakdown/)、[查資料、做交接、學新東西](/posts/mattpocock-skills-research-handoff/)。
