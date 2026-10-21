---
title: "pstack 系列（1）：安裝、選模型，再用 /poteto-mode 挑 playbook"
description: "pstack 有 56 個指令，第一次用只要記住 /poteto-mode。本文用 Claude Code 實測，說明怎麼安裝、/setup-pstack 怎麼選模型，以及三種任務各被分到哪個 playbook。"
date: 2026-10-21 21:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-install-routing/
image:
  path: cover.png
  alt: "裝一次、設定一次模型，之後每個新任務都從 /poteto-mode 開始；它說用了哪個模型，要自己再核對。"
---

你聽說 pstack 能讓 AI 程式助理做事更嚴謹，打開一看，光是指令就有 56 個，另外還有兩個專用的 subagent 和二十多個 playbook。難道要先把這些名字全部記住才能開始用？

先說明幾個名詞。AI 程式助理指的是 Cursor、Claude Code 這類能讀寫專案檔案、替你寫程式的工具。skill 是一份「告訴 AI 怎麼完成某類工作」的操作說明。pstack 是 Lauren Tan 在 Cursor 官方外掛庫 [`cursor/plugins`](https://github.com/cursor/plugins/tree/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack) 裡維護的一整組 skill。playbook 是針對一種任務寫好的固定步驟，例如「修 bug」要先重現、再找原因、修完再驗證。subagent 則是主對話另外派出去、專門做一小段工作的 AI。

答案是不必全部記住。裝好外掛、用 `/setup-pstack` 選好模型之後，每個新任務都用 `/poteto-mode` 開頭，描述症狀和「怎樣算完成」，它會自己挑 playbook。不知道從哪裡開始時，再問 `/poteto-help`。

不過，在這次的實測環境裡也看到，它「說自己用了什麼模型」和「實際用了什麼模型」不一定一樣。這一點後面會詳細說明。

> pstack 系列｜第 1 篇
>
> - 系列導讀：這套 skill 是什麼、四篇該怎麼讀（尚未發布）
> - 下一篇（第 2 篇）：改程式之前，先看懂再設計（尚未發布）
>
> 本文以 pstack [`0.15.29` 版](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json)為準，對應 `cursor/plugins` 的 commit `88d4751`（2026-10-20）。2026-10-21 21:31（台北時間）查證時，`cursor/plugins` 的 main 已經往前走，但 pstack 資料夾最後一次變動仍是這個 commit，版本也還是 `0.15.29`。
{: .prompt-info }

> **這次怎麼測的**：所有實測都在 2026-10-21 21:09–21:23（台北時間）進行，由操作者在我的 Mac（macOS 27.0、Claude Code 2.1.306）上用 Claude Code 的非互動模式 `claude -p` 執行，不是在互動介面手動操作。pstack 用的是我先前自己在 Claude Code 裝好的版本（user scope，對這台電腦上的所有專案生效），這次**沒有重裝**。為了安全，這次刻意設了權限白名單：禁止寫入 `~/.claude/` 底下的全域設定、禁止 `git push`、`gh`、`curl` 和上網。**Cursor 上的任何操作都沒有實測**。
{: .prompt-tip }

## 先看 pstack 裝了什麼

`0.15.29` 版裝好後，Claude Code 裡會多出 56 個 `/pstack:<skill>` 指令，以及 `pstack:poteto-agent`、`pstack:comment-sicko` 兩個 subagent。`poteto-mode` 底下的 `playbooks/` 資料夾有 23 個檔案。pstack 沒有獨立的指令資料夾，所有指令都來自 skill。

Claude Code 會在外掛的指令前面加上外掛名稱，所以 Cursor 裡的 `/poteto-mode`，在 Claude Code 裡要寫成 `/pstack:poteto-mode`。官方的 [Claude Code 對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)列出了兩邊其他的差異，下文會引用幾項。

![三步驟說明圖：先用 Cursor 或 Claude Code 安裝 pstack，再用 /setup-pstack 選預算與模型並寫入全域設定檔，之後每個新任務都用 /poteto-mode 開頭；各步驟標出這次有沒有實測](install-setup-flow.png){: width="800" height="450" }
_第一次使用的三步：安裝、選模型、從 /poteto-mode 開始。_

## 安裝：從哪裡裝，就是信任誰

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L15-L26) 和[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L5-L15)列出兩種裝法。在 Cursor 的對話裡輸入：

```text
/add-plugin pstack
```

在 Claude Code 裡，先把 `cursor/plugins` 這個 GitHub repo 加成 marketplace（外掛目錄），再從這個目錄安裝 pstack：

```text
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

第二行的 `pstack@cursor-plugins` 意思是「從 cursor-plugins 這個目錄安裝 pstack」。

> 以上指令照 `0.15.29` 版的 README 引用，**本次未從零安裝實測**。我的電腦上已經有 2026-10-18 裝好的 pstack，2026-10-20 更新到 `88d4751`，這次直接沿用。
{: .prompt-warning }

> 上面兩行 Claude Code 指令都沒有指定版本，裝到的是當下 `cursor/plugins` 預設分支上的內容；Cursor 的 `/add-plugin pstack` 同樣沒有指定版本。裝別人的外掛之前該檢查什麼，見[這篇供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

選哪一種裝法，等於決定你信任誰、內容什麼時候會變：

| 裝法 | 內容從哪來 | 之後會不會變 |
| --- | --- | --- |
| Cursor 的 `/add-plugin pstack` | Cursor 的外掛機制 | 未實測，本文不下結論 |
| Claude Code 的 marketplace | 加入當下 `cursor/plugins` 的內容 | 依 [Claude Code 文件](https://code.claude.com/docs/en/plugins/install#keep-plugins-updated)，第三方 marketplace 預設不自動更新；你按「更新」時才會抓最新內容 |
| 第三方整理的鏡像 | 不是 `cursor/plugins` 官方維護 | 由鏡像作者決定 |

網路上也有第三方整理的 pstack 鏡像（例如 `backnotprop/pstack`），它不是 `cursor/plugins` 官方維護的版本，要用的話請先看完內容、鎖定版本，理由見[這篇供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。

同樣的道理也適用於官方 marketplace。依 Claude Code 官方的[指令參考](https://code.claude.com/docs/en/plugins/cli-reference#plugin-install)，`/plugin install` 沒有指定版本或 commit 的選項。`/plugin marketplace add` 可以在 repo 後面加 `#ref`，把整個目錄[固定在某個分支或 tag](https://code.claude.com/docs/en/plugins/cli-reference#plugin-marketplace-add)；但 2026-10-21 查證時，`cursor/plugins` 沒有任何 tag。能固定到 commit 的 `sha` 欄位，是寫在目錄的 `marketplace.json` 裡、由目錄維護者設定的（見 [marketplace 參考文件](https://code.claude.com/docs/en/plugins/marketplace-reference#plugin-sources)），`cursor/plugins` 的 pstack 條目沒有設定。

這次的安裝紀錄顯示，裝到的是 commit `88d4751`、版本 `0.15.29`。建議你裝好之後，也自己確認裝到的是哪個版本，並在按下更新之前先看一下 pstack 改了什麼，理由見[供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。

## /setup-pstack：替每個角色選模型

pstack 會把工作分給不同角色，例如修 bug 的、寫功能的、做設計評審的，每個角色可以用不同模型。[`/setup-pstack`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L17-L31) 負責替這些角色選模型，流程是：偵測你能用哪些模型、請你選推理預算、列出每個角色的設定，最後寫進一個設定檔。

推理預算決定模型「想多久」，也就是 effort。等級越高越仔細，但用的 token 越多：

| 預算 | 推理強度 |
| --- | --- |
| unlimited | 每個模型拉到最高，最高到 `max` |
| large（預設值） | `xhigh` |
| medium | `high` |
| small | `medium` |

設定檔的位置要特別注意。Cursor 寫在 `~/.cursor/rules/pstack-models.mdc`，Claude Code 寫在 `~/.claude/rules/pstack-models.md`。兩個都在家目錄底下，是**全域**設定，也就是對你電腦上每個專案都生效，不是只對目前的專案。依[對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L37)，Claude Code 會在每個新對話開始時自動載入這份檔案。

### 實測：在 -p 模式下改用文字問答

Cursor 版會用選單問你問題。依[對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L10)，Claude Code 的 `-p` 模式沒有選單，所以改用純文字問答。這次分三次執行，後兩次用 `--resume` 接續同一段對話。

第一次只輸入 `/pstack:setup-pstack`。它偵測到 `opus`、`fable`、`sonnet`、`haiku` 四個模型，讀到現有設定的預算是 medium，然後用文字列出選項（節錄）：

```text
1. unlimited — max reasoning
2. large — xhigh reasoning（等同 skill 預設值）
3. medium — high reasoning（目前）
4. small — medium reasoning
```

第二次回覆「3」，它列出 17 個角色的完整表格，例如 `feature, refactoring` 用 `opus high`、`bug-fix` 用 `fable high`。有 4 個評審類角色會同時列出 opus、fable、sonnet、haiku 四個模型，表示每次各跑一個 subagent，共 4 個。

第三次回覆「照這張表寫入」。寫入被權限擋下，因為這次刻意禁止寫入全域設定。它回報「我沒有改用其他方式繞過」，而且它想寫的內容和現有檔案一模一樣，設定檔的 sha256 前後也沒變。接著它主動提議建立兩種驗證用的 skill，這部分留到第 3 篇再談。

三次合計耗時約 52 秒（20、9、23 秒），API 等價金額 0.321 美元。

> **未實測**：互動介面的選單畫面、`/setup-pstack` 實際寫入設定檔的過程。
{: .prompt-warning }

## /poteto-help：不確定時先問它

`/poteto-help` 是 pstack 的說明台。這次在練習專案裡問它（原文）：

```text
/pstack:poteto-help 我有一個小型 Python CLI 專案（就是目前這個 repo），想開始用 pstack。第一步該做什麼？之後要修 bug、加小功能時，該用哪個 skill？
```

它花了 51 秒（API 等價 0.387 美元），回答的重點是：

- 模型設定已經存在，不用重跑 `/pstack:setup-pstack`。
- 建議先跑 `/pstack:create-verification-skill`，替專案建一個讓 AI 能自己實際執行 CLI 來檢查結果的 skill。
- 修 bug 和加小功能都用 `/pstack:poteto-mode`。專案有便宜的單元測試時，可以加上 `/pstack:tdd`，也就是先寫一個會失敗的測試再修。
- 很小、很明顯的修改不需要 pstack，直接講就好，可以省 token。
- Claude Code 沒有 Cursor 的 Custom Mode（讓某個 skill 在整段對話持續生效的模式），所以每個新任務都要用 `/pstack:poteto-mode` 開頭；同一段對話裡要換主題，先說「new task」。

最後兩點在 [`poteto-help` 的說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L57-L60)裡也寫得很清楚。在 Cursor 裡，從 `/` 選單用 Option+Enter（Mac）或 Alt+Enter（Windows）選 `/poteto-mode`，就能把它變成 Custom Mode；這部分沒有實測。

## /poteto-mode：同一個指令，三種任務

`/poteto-mode` 會先判斷任務屬於哪一種，再打開對應的 playbook，把步驟原樣抄進待辦清單。決定不做的步驟不會消失，而是留在清單上並註明 `skip: <理由>`。

[`poteto-mode` 的 playbook 清單](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L121-L150)涵蓋調查（Investigation）、修 bug（Bug fix）、效能問題、新功能（Feature）、重構、試作、撰寫 skill 等。規模大、跨很多地方的工作，或是找不到對應 playbook 的任務，會交給 `figure-it-out` 這個 skill 另外設計一套流程。

![說明圖：三種任務描述都從 /poteto-mode 進入，唯讀調查對應 Investigation、修 bug 對應 Bug fix、加 --json 對應 Feature，並列出每次的結果、耗時與 API 等價金額](poteto-mode-routing.png){: width="800" height="450" }
_三次任務都用同一個指令開頭，分到的 playbook 都符合預期。_

### 練習專案

練習專案 `pstack-lab` 是一個用 Python 3.13.7 寫的記帳 CLI，叫 `ledger`，有 3 個模組、8 個單元測試。裡面刻意埋了一個 bug：用括號表示的支出，例如 `(12.00)`，應該當成 -12.00，程式卻當成正數。

三次任務都用 `/pstack:poteto-mode` 開頭，只寫症狀和完成條件，不寫猜測的原因，也不指定步驟：

| 任務 | 分到的 playbook | 結果 | 耗時 | API 等價（美元） |
| --- | --- | --- | --- | --- |
| 唯讀調查：金額從讀進來到印出來經過哪些函式、哪裡四捨五入、哪裡可能算錯 | Investigation | 列出完整呼叫路徑和 8 個風險點，第 1 點就是埋的 bug；沒有改任何檔案 | 5 分 05 秒 | 1.683 |
| 修 bug：括號支出被算成收入 | Bug fix | `parser.py` 改 2 行、新增 2 個測試，10 個測試全部通過 | 1 分 58 秒 | 0.740 |
| 加功能：`ledger summary --json` | Feature | `cli.py` 改 3 行、README 加 1 行、新增 3 個測試，13 個測試全部通過 | 2 分 40 秒 | 1.033 |

三次都是先讀 Claude Code 對照說明，再讀對應的 playbook。

### 修 bug：先重現，再修

修 bug 的提示要求「附上修正前後的實際 CLI 輸出」，也要求「不要 commit」。下面兩段輸出節錄自它的回報。修正前，10 月的支出只算到 4.50：

```text
$ python3 -m ledger summary samples/october.csv --month 2026-10
transactions: 6
income:          3205.95
spending:           4.50
net:             3201.45
spending by category:
  food                4.50
```

修正後：

```text
$ python3 -m ledger summary samples/october.csv --month 2026-10
transactions: 6
income:          3012.00
spending:         198.45
net:             2813.55
spending by category:
  food              153.45
  transport          45.00
```

它在回報裡說明，預期值是從 CSV 手算的，不是拿程式輸出當答案。改動只有一處：`parse_amount` 先記下輸入有沒有括號，有的話就把數字取負。Bug fix playbook 的最後兩步是整理 commit 和開 PR，它都標成 skip，理由是「你說不要 commit」。

### 加功能：小改動，自己略過設計步驟

加 `--json` 的任務走 Feature playbook。它自己略過了三個步驟：先摸清楚相關程式（`how`）、平行比較幾種設計（`architect`）、事後找人質疑設計（`interrogate`）。理由是相關程式只有兩個小檔案，而開 4 個設計 subagent 的花費會比這個改動本身還高。

它用 HEAD 的版本和改過的版本跑同樣四組參數，比對結果完全相同，證明沒加 `--json` 時的文字輸出沒變。加上 `--json` 的輸出（節錄）：

```text
$ python3 -m ledger summary samples/october.csv --month 2026-10 --json
{
  "count": 6,
  "income": "3012.00",
  "spending": "198.45",
  "net": "2813.55",
  ...
}
```

練習專案裡的兩個 commit（`3c1ea12`、`579a745`）是操作者在每次執行後自己提交的，不是 pstack 做的。兩次提示都明確要求 pstack 不要 commit，它也照做了。

## 這次環境觀察到的五件事

以下五點都是在這次的環境（帳號、版本、`-p` 模式）觀察到的，不代表在其他帳號或互動介面也一定會發生。

![說明圖：五張卡片列出這次環境觀察到的現象，包括設定選了不能用的模型而收到 429、回報的模型與實際不符、effort 比設定低、-p 模式的權限限制，以及沒裝 cursor-team-kit 時沒有任何提示](observed-caveats.png){: width="800" height="450" }
_五件事都只在這次的環境觀察到，不是普遍結論。_

**1. 設定裡選了 fable，但這個帳號不能用。** 設定檔裡修 bug 的角色是 `fable high`。修 bug 任務派出 subagent 時，立刻收到 HTTP 429 錯誤，訊息是「Fable 5.1 requires usage credits」。依[對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L44)，`/setup-pstack` 偵測模型時只看 Claude Code 工具定義裡列出哪些模型，不會確認你的帳號實際能不能用。所以設定表上列得出來的模型，不保證真的跑得動。

**2. 它說用了 Opus，實際跑的是 Sonnet。** 收到 429 之後，它改派一個不指定模型的 subagent 繼續。最後的回報寫「我依規則改用 session 模型 Opus 跑 subagent」，但執行紀錄顯示，這個 subagent 實際跑在 `claude-sonnet-5-5`。

**3. effort 比設定低。** 設定檔裡每個角色都是 `high`。調查任務派出的 subagent 有用 `high`，但修 bug 和加功能這兩次都用了 `low`，加功能那次的理由是「規格已經寫死」。

**4. `-p` 模式的權限限制。** 除了前面說的沒有選單、要用 `--resume` 分次回答之外，在背景執行的 subagent 一律不能跑 Bash 指令，錯誤訊息是「Permission prompts are not available in this context」。調查任務的 subagent 因此只能讀程式碼，執行指令收集證據的工作改由主對話補做。用分號串起來的指令、寫到 `/tmp` 這類操作也常被擋，調查任務被擋了 12 次，加功能任務 7 次。這些限制有一部分來自這次刻意設的權限白名單，不全是 `-p` 模式本身造成的。每次被擋，它都改用比較單純的指令完成，沒有試圖繞過。

**5. 沒裝 cursor-team-kit，也沒有任何提示。** 這點下一節說明。

## cursor-team-kit 要不要一起裝

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L255-L263) 寫明，`/poteto-mode` 會用到的三樣東西不在 pstack 裡，而是在另一個外掛 `cursor-team-kit`：清理程式碼的 `/deslop`，以及操作 CLI 和瀏覽器畫面的 `control-cli`、`control-ui`。README 的建議是：想要完整功能，就把 `cursor-team-kit` 一起裝。[指南第 5 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/05-build-and-clean.md#L59)另外說明，開 PR 前的流程會跑 `/deslop`；沒有它的話，就用白話要求同樣的清理，例如刪掉旁白式註解和用不到的防禦程式碼。

這次我的電腦上沒有裝 `cursor-team-kit`。三次任務都沒有出現錯誤，也沒有提醒你缺了什麼。修 bug 那次，它甚至直接去讀 marketplace 裡那份還沒安裝的 `control-cli` 說明檔。

但三次任務都沒有走到 commit 和開 PR，`/deslop` 本來就不會被叫到。所以這次的結果只能說明「沒走到那一步時沒有提示」，不能推論成缺了也沒關係。如果你打算讓 pstack 一路做到開 PR，照 README 的建議一起裝比較保險。

> **未實測**：缺少 `/deslop` 時的實際行為。另外，Claude Code 遇到 Cursor 專屬功能時，對照說明規定要印一行「Skipped in Claude Code: …」後繼續，這三次任務都沒有用到 Cursor 專屬功能，所以這行提示也沒有實測到。
{: .prompt-warning }

## 用量與費用

這次 7 次執行（5 段對話）合計約 11 分鐘。Claude Code 回報的 `total_cost_usd` 加起來約 4.16 美元，這是**照 API 價格換算的等價金額**。這次用的是訂閱方案的額度，沒有另外付費；訂閱的 5 小時用量從 79% 升到 98%。

三次任務裡，調查任務最貴。它的 cache read（重複讀進已經快取過的內容）超過 126 萬個 token，輸出也有 4 萬多個 token。[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L45-L52)給了幾個省 token 的方法：重跑 `/setup-pstack` 選小一點的預算或便宜一點的模型、把角色設成 `auto` 或 `inherit-parent` 讓它直接用主對話的模型、縮短評審角色的模型清單，以及只在需要嚴謹的工作才用 `/poteto-mode`。

如果你想看另一套「先設定、再由說明台建議下一步」的 skill 怎麼用，可以讀 [mattpocock/skills 系列第 1 篇](/posts/mattpocock-skills-setup-routing-guide/)和[系列導讀](/posts/mattpocock-skills-series-guide/)。

## 第一次使用，照這三步走

pstack 不需要先把 56 個指令記熟。照官方說明裝一次，按更新前先看看改了什麼；用 `/setup-pstack` 選一次模型，而且只選你的帳號實際能用的；之後每個新任務都從 `/poteto-mode` 開始，在 Claude Code 裡寫成 `/pstack:poteto-mode`，描述症狀和完成條件，剩下的交給它挑 playbook。這次三種任務都被分到對的 playbook，也都照提示交出了實際輸出。

要多留意的是最後的回報。它說自己用了哪個模型、多高的 effort，不一定和實際執行的一致；需要確定時，看執行紀錄比看它的說法可靠。下一篇會接著談，改程式之前怎麼用 pstack 先看懂程式、再做設計。

## 延伸閱讀

- [pstack README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md)：安裝方式，以及不在 pstack 裡的元件。
- [設定指南：Set up pstack](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md)：預算、角色和省錢的方法。
- [Claude Code 對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)：Cursor 和 Claude Code 的差異。
- [`poteto-mode` 的 SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md)：完整的 playbook 清單和挑選規則。
- [Claude Code：Install and manage plugins](https://code.claude.com/docs/en/plugins/install)：marketplace 的加入、固定版本和更新方式。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：安裝外掛前該檢查什麼。
- [自己寫 Agent Skill](/posts/agent-skill-authoring-guide/)：從寫 skill 的角度看 description、測試與維護。
