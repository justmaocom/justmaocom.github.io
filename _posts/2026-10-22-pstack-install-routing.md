---
title: "pstack 系列（1）：安裝、選模型，再用 /poteto-mode 挑 playbook"
description: "一步一步教你在 Claude Code 或 Cursor 安裝 pstack、檢查和固定版本、用 /setup-pstack 選模型，以及怎麼寫 /poteto-mode 的任務描述，讓它替你挑 playbook。"
date: 2026-10-22 15:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-install-routing/
image:
  path: cover.png
  alt: "教你安裝 pstack、核對版本、用 /setup-pstack 選模型，再把每個任務交給 /poteto-mode。"
---

pstack 能讓 AI 程式助理做事更有條理，但打開一看，光是 skill 就有好幾十個。這篇教你第一次怎麼開始：裝好 pstack、確認裝到哪個版本、選好模型，之後每個任務都交給 `/poteto-mode`。不用先背下所有名字。

先說明幾個名詞。AI 程式助理指的是 Cursor、Claude Code 這類能讀寫專案檔案、替你寫程式的工具。skill 是一份「告訴 AI 怎麼完成某類工作」的操作說明，用斜線指令呼叫，例如 `/poteto-mode`。pstack 是 Lauren Tan 在 Cursor 官方外掛庫 [`cursor/plugins`](https://github.com/cursor/plugins/tree/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack) 裡維護的一整組 skill。playbook 是針對一種任務寫好的固定步驟，例如「修 bug」要先重現、再找原因、修完再驗證。subagent 是主對話另外派出去、專門做一小段工作的 AI。token 是 AI 計算用量的單位，讀和寫的內容越多，用掉的 token 越多。

整個流程只有三步：安裝一次、用 `/setup-pstack` 選一次模型，之後每個新任務都用 `/poteto-mode` 開頭，寫清楚目標和「怎樣算完成」，它會自己挑 playbook。不知道該用哪個時，先問 `/poteto-help`。

文中的範例提示都是通用寫法，你可以直接複製，再換成自己專案的內容。

> pstack 系列｜第 1 篇
>
> - 系列導讀：這套 skill 是什麼、四篇該怎麼讀（尚未發布）
> - 下一篇（第 2 篇）：[改程式之前，先看懂再設計](/posts/pstack-understand-design/)
>
> **版本提醒**：本文以 pstack [`0.15.29` 版](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json)為準，對應 `cursor/plugins` 的 commit `88d4751`，也就是本文 2026-10-22 首次發布時的版本；2026-10-24 改寫成教學文時，內容仍以這一版為準。Claude Code 的指令和選單，依 2026-10-24 查閱的[官方文件](https://code.claude.com/docs/en/plugins/install)。之後的版本，指令和行為可能會改變。
>
> 2026-10-24 10:51（台北時間）查證時，`cursor/plugins` main 的最新版本是 `0.15.32`（commit `e853501`），skill 增加到 58 個，新增的是 `statechart` 和 `ketchup-video`。和 `0.15.29` 相比，`setup-pstack`、安裝指南和 Claude Code 對照說明都沒有改；`poteto-mode` 的說明檔和 playbook 沒有改，只更新了內部腳本；`poteto-help` 只在對照表裡加了這兩個新 skill 的兩行。
{: .prompt-info }

## pstack 裝了什麼

`0.15.29` 版有 56 個 skill，每個 skill 就是一個斜線指令。另外還有 `poteto-agent`、`comment-sicko` 兩個專用的 subagent，以及 `poteto-mode` 底下的 23 個 playbook。

在 Claude Code 裡，外掛的指令前面要加外掛名稱，所以 Cursor 的 `/poteto-mode`，在 Claude Code 裡寫成 `/pstack:poteto-mode`（見 [README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L28)）。下文的範例都用 Claude Code 的寫法；在 Cursor 裡，把 `pstack:` 拿掉就好。兩邊的其他差異，列在官方的 [Claude Code 對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)。

![四步：安裝 pstack、核對版本、用 /setup-pstack 選模型、每個任務用 /poteto-mode 開頭](install-setup-flow.png){: width="800" height="450" }
_第一次使用的流程：安裝、核對版本、選模型，再從 /poteto-mode 開始。_

## 第 1 步：安裝

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L15-L26) 和[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L5-L15)列出兩種裝法。在 Cursor 的對話裡輸入：

```text
/add-plugin pstack
```

在 Claude Code 裡，先把 `cursor/plugins` 這個 GitHub repo（放程式碼的專案庫）加成 marketplace（外掛目錄），再從這個目錄安裝 pstack：

```text
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

第二行的 `pstack@cursor-plugins` 意思是「從 cursor-plugins 這個目錄安裝 pstack」。依 [Claude Code 文件](https://code.claude.com/docs/en/plugins/install#install-a-plugin)，在對話裡輸入 `/plugin install` 不會馬上安裝，而是先打開外掛的說明頁，讓你看它會裝哪些東西，再選安裝範圍：選「Install for you」（user scope）就是這台電腦上的所有專案都能用。

> 上面的指令都沒有指定版本，裝到的是當下 `cursor/plugins` 預設分支上的內容。裝別人的外掛之前該檢查什麼，見[這篇供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

網路上也有第三方整理的 pstack 鏡像（例如 `backnotprop/pstack`），它不是 `cursor/plugins` 官方維護的版本。要用的話，請先看完內容、鎖定版本，理由同樣見[供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。

## 第 2 步：檢查版本、更新，或固定版本

### 看裝到哪個版本

裝好之後，先確認裝到的是哪個版本。依 [Claude Code 文件](https://code.claude.com/docs/en/plugins/install#install-a-plugin)，在終端機（輸入指令的視窗）執行下面這行，會列出每個外掛的 `Version`、`Scope` 和 `Status`；在對話裡打 `/plugin`，切到 Installed 分頁也看得到。

```bash
claude plugin list
```

把看到的版本號和 [`plugin.json`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json) 對一下，就知道自己是不是和文章用的同一版。

### 更新：預設不會自動更新

依 [Claude Code 文件](https://code.claude.com/docs/en/plugins/install#keep-plugins-updated)，Claude Code 對第三方 marketplace 預設**不自動更新**，所以 pstack 會停在你安裝時的版本。

- **想手動更新一次**：在終端機執行下面這行。
- **想開自動更新**：在對話裡打 `/plugin`，切到 Marketplaces 分頁，選 `cursor-plugins`，再選 Enable auto-update。

```bash
claude plugin update pstack@cursor-plugins
```

> 更新前，建議先到 `cursor/plugins` 看看 pstack 這次改了什麼，再決定要不要更新。開了自動更新，就等於每次都直接接受新內容。理由見[供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

Cursor 這邊的更新方式，本文不討論。

### 固定在某個 commit

commit 是 git 裡的一個版本紀錄，每個 commit 都有一串編號（SHA）。想讓 pstack 一直停在你看過的那個 commit，可以用本機資料夾當 marketplace。

先說明為什麼要這樣做。Claude Code 官方的[指令參考](https://code.claude.com/docs/en/plugins/cli-reference#plugin-install)裡，`/plugin install` 沒有指定版本或 commit 的選項。`/plugin marketplace add` 可以在 repo 後面加 `#ref`，[固定在某個分支或 tag](https://code.claude.com/docs/en/plugins/install#add-a-marketplace)；但 2026-10-24 查證時，`cursor/plugins` 沒有任何 tag。能固定到 commit 的 `sha` 欄位，是寫在目錄的 `marketplace.json` 裡、由目錄維護者設定的（見 [marketplace 參考文件](https://code.claude.com/docs/en/plugins/marketplace-reference#plugin-sources)），`cursor/plugins` 的 pstack 條目沒有設定。

官方文件支援把本機資料夾加成 marketplace，所以可以先把 repo 下載（clone）到自己電腦，切到你審過的 commit，再把這個資料夾加成 marketplace。以下以本文的 commit 為例，在終端機執行：

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout 88d47514b82e7c44f00f2b2a72ff6dd12158038c
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

如果你之前已經用 GitHub 來源加過 `cursor/plugins`，兩個來源的目錄名稱都是 `cursor-plugins`。可以先用 `claude plugin marketplace remove cursor-plugins` 移除舊的，再執行上面的指令。注意，依 [Claude Code 文件](https://code.claude.com/docs/en/plugins/install#manage-marketplaces)，移除 marketplace 會一併解除安裝從它裝的外掛，所以移除後要重新安裝。

這和[供應鏈與權限風險的文章](/posts/coding-agent-supply-chain-permission-risks/)建議的「先 clone，再切到審過的 commit」是同一個做法。之後想升級，就在這個資料夾裡切到新的 commit，再更新外掛。

## 第 3 步：用 /setup-pstack 選模型

pstack 會把工作分給不同角色，例如寫程式的、做判斷的、組成評審小組的，每個角色可以用不同模型。[`/setup-pstack`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/setup-pstack/SKILL.md) 負責替這些角色選模型。

**什麼時候用**：裝好之後跑一次。之後換了帳號、換了方案，或想改用別的模型時，再跑一次。依[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L29)，重跑會保留你改過的角色。

**指令怎麼寫**：

```text
/pstack:setup-pstack
```

**它會一步一步做什麼**（[SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/setup-pstack/SKILL.md#L10-L78)）：

1. **偵測你能用的模型。**
2. **請你選推理預算。** 推理預算決定模型「想多久」，也就是 effort。等級越高越仔細，但用的 token 越多。
3. **列出每個角色配哪個模型**，問你要照單全收，還是改掉某幾個角色。
4. **檢查**你選的模型都在偵測到的清單裡；不在的話，會停下來再問一次。
5. **寫進設定檔。**
6. **詢問要不要替專案產生驗證用的 skill。** 一個是讓 AI 能像使用者一樣實際操作你的程式、自己檢查結果（`/create-verification-skill`）；另一個是形式驗證的 skill（`/create-formal-verification-skill`）。兩個都只會問一次，可以拒絕。

預算有四種：

| 預算 | 推理強度 |
| --- | --- |
| unlimited | 每個模型拉到最高，最高到 `max` |
| large（預設值） | `xhigh` |
| medium | `high` |
| small | `medium` |

**你會拿到**：一份全域的模型設定檔。Cursor 寫在 `~/.cursor/rules/pstack-models.mdc`，Claude Code 寫在 `~/.claude/rules/pstack-models.md`。兩個都在家目錄底下，「全域」的意思是對你電腦上每個專案都生效，不是只對目前的專案。依[對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L37)，Claude Code 會在每個新對話開始時自動載入這份檔案。

**下一步**：開一個新對話。依[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L43)，模型設定只對新的對話生效。

> **只選你的帳號實際能用的模型。** 依[對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L44)，在 Claude Code 裡，「偵測到的模型」是 subagent 工具允許填的模型名稱，不代表你的帳號或方案每一個都能用。不確定時，把角色設成 `inherit-parent` 或 `auto`，它就直接用主對話的模型（見[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L31)）。
{: .prompt-tip }

## 不確定時：問 /poteto-help

[`/poteto-help`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md) 是 pstack 的說明台。

**什麼時候用**：不知道該用哪個 skill、不知道第一步做什麼，或想知道怎麼省 token。

**指令怎麼寫**：直接用一般的話問。

```text
/pstack:poteto-help 我剛裝好 pstack，第一步該做什麼？
```

```text
/pstack:poteto-help 我想請 AI 在合併前審一次我的修改，該用哪個 skill？
```

```text
/pstack:poteto-help 用 pstack 很耗 token，有什麼方法可以少用一點？
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L9-L34)）：

- 回答你的問題，給你一段可以直接送出的提示，並附上答案出自哪個檔案。
- 如果是「怎麼做」的問題，它**不會**自己開始做，而是讓你決定要不要送出那段提示，因為真的執行會用掉 token。
- 如果看不出你要什麼，會先問一個選擇題：設定、開始任務、挑 skill、處理出錯的執行，或客製化 pstack。
- 如果你還沒跑過 `/setup-pstack`，而這會影響答案，它會問你要不要現在設定。

如果你送出的是「用 pstack 修這個 bug」這種要它做事的訊息，就不算問問題，它會改用 `/poteto-mode` 的方式直接開始做。

## 每個任務：用 /poteto-mode 開頭

[`/poteto-mode`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md) 是 pstack 的入口。你只要說清楚要什麼，它會挑 playbook、照步驟做，需要時再叫用其他 skill。

### 任務怎麼寫

依[指南第 2 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L40-L59)，一段好的任務描述最多包含五個部分，每個部分一句話就夠：

- **目標**：哪裡壞了，或你想要什麼。也就是「症狀」。
- **怎樣算完成**：要能判斷「過」或「不過」。「讓它更好」「做一小時」都不算。
- **你想看到的證據**：例如實際的指令輸出、修改前後的數字。
- **你已經知道的事**：錯誤訊息、重現步驟、相關連結，可以省下它找資料的時間。
- **真正的限制**：例如「先重現再修」「先不要改任何程式」「行為完全不能變」「動手前先給我看」。

有兩件事先不要寫：**怎麼做**（讓它有機會找到更好的做法），以及**你對原因的猜測**（說出猜測會讓它只往那個方向找）。也不要在提示裡逐一列出要用哪些 skill，playbook 已經排好順序，自己排反而容易漏掉或打亂步驟（[指南第 2 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L135)）。

### 三個可以直接改的範例

**調查問題**（只讀不改）：

```text
/pstack:poteto-mode 使用者登出之後，購物車的內容還留著。先查清楚是哪裡把資料留下來的，先不要改任何程式。完成條件：說明資料存在哪裡、什麼時候該被清掉，並附上相關檔案的位置。
```

**修 bug**：

```text
/pstack:poteto-mode 匯出 CSV 時最後一列會不見，昨天上線後才開始。先重現，再修。完成條件：用現有的測試資料匯出，列數和資料庫一致。給我看修改前後的列數。
```

**加功能**：

```text
/pstack:poteto-mode 幫這個指令加一個 --json 選項。原本的文字輸出要完全不變。兩種輸出都要驗證。
```

依[指南第 2 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L103)，「先不要改任何程式」這句話會把任務固定在「調查」的 playbook。

### 它會怎麼做

![任務描述寫出目標和完成條件，/poteto-mode 挑出對應的 playbook，步驟抄進待辦清單，跳過的標 skip](poteto-mode-routing.png){: width="800" height="450" }
_/poteto-mode 先判斷任務類型，再照 playbook 的步驟走。_

1. **判斷任務類型，挑一個 playbook。** [playbook 清單](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L121-L149)涵蓋調查（Investigation）、修 bug（Bug fix）、效能問題、新功能（Feature）、重構、試作、撰寫 skill 等。規模大、跨很多地方的工作，或是你要離開、之後才回來看結果的工作，會交給 `figure-it-out` 這個 skill 另外設計一套流程。
2. **把 playbook 的步驟原樣抄進待辦清單**，排在其他待辦前面。
3. **決定不做的步驟不會消失**，而是留在清單上，註明 `skip: <理由>`。你可以從這裡看出它選擇不做什麼。
4. **照步驟做**，步驟裡用到的其他 skill 會由它自己叫用。
5. **驗證並回報。** 其他 playbook 結束時，會接到「開 PR」的 playbook。PR（pull request）是請別人審查、合併修改的請求。

### 你會拿到

- 一份看得到的待辦清單，包括被跳過的步驟和理由。
- 最後的回覆：做了什麼、取捨、你需要決定的事。依 [SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L110-L115)，回覆要短，但 playbook 要求的段落都要在；有開 PR 的話，會附上 PR 連結。

### 下一步

- **接著做**：對話裡已經有前後文時，短短一句就夠，例如「do it」「continue」「keep going until done」（[指南第 2 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L77-L93)）。
- **換主題**：在同一段對話裡換任務，先說「new task」，它才會重新挑 playbook，不會把新問題當成上一個任務的下一步（[指南第 2 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L95-L103)）。

```text
/pstack:poteto-mode new task. 查清楚為什麼登出後快取還在。先不要改任何程式。
```

- **每個新任務都重新叫一次**：Cursor 可以從 `/` 選單用 Option+Enter（Mac）或 Alt+Enter（Windows）選 `/poteto-mode`，把它變成 Custom Mode，也就是在整段對話持續生效的模式。依 [`poteto-help` 的說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L54-L58)，Cursor 的文件只在 Agents 視窗和 CLI 列出 Custom Mode；其他環境，包括 Claude Code，每個新任務都用 `/pstack:poteto-mode` 開頭。

## cursor-team-kit 要不要一起裝

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L255-L263) 寫明，`/poteto-mode` 會用到的三樣東西不在 pstack 裡，而是在另一個外掛 `cursor-team-kit`：清理程式碼的 `/deslop`，以及操作 CLI（在終端機裡用指令操作的程式）和瀏覽器畫面的 `control-cli`、`control-ui`。README 的建議是：想要完整功能，就把 `cursor-team-kit` 一起裝。[指南第 5 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/05-build-and-clean.md#L59)另外說明，開 PR 前的流程會跑 `/deslop`；沒有它的話，就用白話要求同樣的清理，例如刪掉旁白式註解、沒有根據的防禦程式碼，以及和這次無關的修改。

## 什麼時候用哪個

| 情況 | 用哪個 |
| --- | --- |
| 剛裝好 pstack | `/pstack:setup-pstack`，跑一次就好 |
| 換了帳號、方案，或想換模型 | 再跑一次 `/pstack:setup-pstack` |
| 不知道該用哪個 skill、第一步做什麼 | `/pstack:poteto-help` |
| 任何需要嚴謹的任務：調查、修 bug、加功能 | `/pstack:poteto-mode`，寫清楚目標和完成條件 |
| 同一段對話換主題 | `/pstack:poteto-mode new task. …` |
| 很小、很明顯的修改 | 不用 pstack，直接跟 AI 說 |

## 一個完整的例子（虛構）

以下是虛構的情境，用來示範流程，不是實際執行的紀錄。

假設你剛加入一個網站專案，想用 pstack 處理一個使用者回報：「忘記密碼的信，連結點下去就說已過期。」

**1. 安裝並核對版本。** 照第 1 步裝好 pstack，再執行 `claude plugin list`，確認版本和你預期的一樣。

**2. 選模型。** 執行 `/pstack:setup-pstack`，選 `large` 預算，只保留帳號能用的模型；它問要不要產生驗證用的 skill 時，如果這個專案還沒有，可以先答應。設定完，開一個新對話。

**3. 不確定時先問。** 你不確定這算調查還是修 bug，可以先問：

```text
/pstack:poteto-help 使用者說重設密碼的連結一點就過期，我該怎麼開始？
```

它會回你一段建議的提示，你看過、改好之後再送出。

**4. 交給 /poteto-mode。**

```text
/pstack:poteto-mode 使用者回報：忘記密碼信裡的連結一點開就顯示「已過期」。先重現，再修。完成條件：新寄出的連結在有效期限內可以正常重設密碼，過期後才顯示已過期。給我看修改前後的重現結果。
```

這段描述寫了症狀、完成條件和想看的證據，沒有寫你猜的原因，也沒有列 skill。這時待辦清單應該會是修 bug 的 playbook 步驟；如果有步驟被跳過，旁邊會寫 `skip:` 和理由，值得看一眼。

**5. 接著做，或換主題。** 它停下來問你時，回答之後說「continue」。修完想接著加「重新寄送」按鈕，就用 `new task` 開頭，再描述新功能和完成條件。

## 注意事項

- **小改動不需要 pstack。** [設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L52)寫得很清楚：很小、很明顯的修改，直接說就好。
- **pstack 會多用 token。** 它會派 subagent、組評審小組，這是嚴謹的代價。[設定指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L45-L52)列了幾個省 token 的方法：重跑 `/setup-pstack` 選小一點的預算或便宜一點的模型、把角色設成 `auto` 或 `inherit-parent` 讓它用主對話的模型、縮短評審小組的模型清單（清單上每多一個模型，就多派一個 subagent），以及只在需要嚴謹的工作才用 `/poteto-mode`。
- **模型設定是全域的。** 改了會影響這台電腦上的每個專案。
- **更新前先看改了什麼。** Claude Code 對第三方 marketplace 預設不自動更新，這反而讓你有機會先檢查。
- **不要在提示裡排 skill 的順序。** 交給 playbook 排。

如果你想看另一套「先設定、再由說明台建議下一步」的 skill 怎麼用，可以讀 [mattpocock/skills 系列第 1 篇](/posts/mattpocock-skills-setup-routing-guide/)和[系列導讀](/posts/mattpocock-skills-series-guide/)。

## 結論

第一次用 pstack，不需要先把所有 skill 記熟。照官方說明裝一次，用 `claude plugin list` 核對版本，按更新前先看看改了什麼；用 `/setup-pstack` 選一次模型，而且只選帳號能用的；之後每個新任務都從 `/poteto-mode` 開始，在 Claude Code 裡寫成 `/pstack:poteto-mode`，寫清楚目標和完成條件，剩下的交給它挑 playbook。不確定時，問 `/poteto-help`。下一篇會接著談，改程式之前怎麼用 pstack 先看懂程式、再做設計。

## 延伸閱讀

- [pstack README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md)：安裝方式，以及不在 pstack 裡的元件。
- [設定指南：Set up pstack](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md)：預算、角色和省 token 的方法。
- [指南第 2 章：Route work through /poteto-mode](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md)：任務描述的寫法和更多範例。
- [Claude Code 對照說明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)：Cursor 和 Claude Code 的差異。
- [`poteto-mode` 的 SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md)：完整的 playbook 清單和挑選規則。
- [Claude Code：Install and manage plugins](https://code.claude.com/docs/en/plugins/install)：marketplace 的加入、版本、更新和移除方式。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：安裝外掛前該檢查什麼。
- [自己寫 Agent Skill](/posts/agent-skill-authoring-guide/)：從寫 skill 的角度看 description、測試與維護。
