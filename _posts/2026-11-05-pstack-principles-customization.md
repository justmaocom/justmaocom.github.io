---
title: "pstack 系列（4）：用原則指揮 AI、做出自己的 mode，再放心讓它自己跑"
description: "怎麼用一句原則名稱改變 AI 的做法？怎麼把你的習慣做成自己的 mode？讓它無人值守跑之前要設好什麼？這篇教你在 Claude Code 用 pstack 的原則、/automate-me、/correct、/reflect 和 /show-me-your-work。"
date: 2026-11-05 10:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, cursor, claude-code]
media_subpath: /assets/img/posts/pstack-principles-customization/
image:
  path: cover.png
  alt: "用原則名稱中途指揮 AI，把習慣做成自己的 mode，寫好完成條件和界線後讓它自己跑，早上看決策紀錄。"
---

AI 程式助理做得不對時，我以前會打一大段話解釋我要什麼。pstack 給了一個更短的辦法：說出一條原則的名稱，AI 就會照那條規則重新做。這篇是系列的最後一篇，教你三件事：怎麼在對話中途用原則名稱指揮 AI；怎麼把你自己的習慣變成一個 mode，讓 AI 照你的方式工作；以及想讓它在你睡覺時自己跑，提示要怎麼寫、權限和費用要怎麼設，早上又要怎麼檢查它做了什麼。

> pstack 系列｜第 4 篇（最後一篇）
>
> - 系列導讀：這套 skill 是什麼、四篇該怎麼讀（尚未發布）
> - 上一篇（第 3 篇）：[寫完程式之後，先證明它能用再合併](/posts/pstack-build-verify-merge/)
> - 下一篇：這是系列的最後一篇
{: .prompt-info }

> **版本**：本文以 pstack [`0.15.36` 版](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json)為準，對應 `cursor/plugins` 的 commit `c742dd6`（2026-10-28 07:12，台北時間），和第 3 篇相同，搭配 Claude Code 2.1.318。我在 2026-11-05 查過：`cursor/plugins` 的 main 最新是 `bb68f23`（2026-11-04 15:20，台北時間），pstack 資料夾在 `c742dd6` 之後沒有任何改動；Claude Code 最新版就是 2.1.318。
{: .prompt-info }

## 開始之前

pstack 是 Cursor 官方外掛庫裡的一整組 skill。skill 是一份告訴 AI 怎麼完成某類工作的操作說明。安裝方法在[第 1 篇](/posts/pstack-install-routing/)。想裝到和本文一樣的版本，可以先把 repo 下載到自己電腦、切到本文的 commit，再把這個資料夾加成外掛市集（marketplace，Claude Code 安裝外掛的來源目錄）：

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout c742dd61706fbacc1b95f1a20b7b988cf096ce6c
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

直接用 `/plugin marketplace add cursor/plugins` 安裝的話，拿到的是安裝當下的最新版，沒有固定在你看過的版本。這樣做的風險，可以參考[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

**指令要加前綴。** 在 Claude Code（在終端機裡使用的 AI 程式助理）裡，外掛的指令前面要加上外掛名稱，例如 `/pstack:correct`。下面的範例都用 Claude Code 的寫法；在 Cursor 裡，把 `pstack:` 拿掉就好。

**這些 skill 都要你親自叫。** pstack 的 58 個 skill 裡，除了 `/setup-pstack`，其他都設定成不讓 AI 自行啟動（`disable-model-invocation: true`），原則也一樣。你輸入指令，它才會讀那份說明。

**官方指南是照 Cursor 寫的。** 指南裡有些東西是 Cursor 才有的，例如 `/loop`（Claude Code 也有同名指令，但用法不同）和 `create-skill`。pstack 附了一份 [Claude Code 對照說明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md)，`/poteto-mode` 在 Claude Code 裡會先讀它，把 Cursor 的名稱換成 Claude Code 的對應做法。下面遇到差異的地方，我會直接寫 Claude Code 的做法。

## 用原則名稱指揮 AI

### 原則是什麼

pstack 有 24 條原則，每一條都是一個獨立的 skill，名稱是 `principle-<名稱>`。每條原則是一段很短、很具體的規則，例如「先刪掉沒用的東西，再往上蓋」。它們分成五組（[README](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257)、[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L29-L70)）：

| 組別 | 條數 | 管什麼 |
| --- | --- | --- |
| core | 10 | 要做多少、什麼時候該重想設計 |
| architecture | 6 | 狀態、檢查和相容性放在哪裡 |
| verification | 5 | 什麼才算證據 |
| delegation | 2 | 平行分工時怎麼保持清楚 |
| meta | 1 | 把重複的提醒變成結構 |

你用 `/pstack:poteto-mode` 交代多步驟的工作時，它會在開始時讀原則的索引，套用這個任務會觸發的那幾條，並在回覆裡寫出每條原則**改變了哪個決定**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L15)）。

指南的說法是：你不必一條一條叫原則，你用它們的名稱來指揮（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L5)）。一個名稱背後是一整條規則，所以一句話就比一段說明更精準。

### 在 Claude Code 裡怎麼說

在同一個對話裡，下一則訊息用原則的指令開頭，後面接你要它做的事：

```text
/pstack:principle-<名稱> <你要它照這條原則做的事>
```

用指令的寫法，Claude Code 會把那條原則的完整說明讀進來，而不只是看到一個名稱。下面示範四條我最常用的。完整的 24 條，請看 [README 的原則表](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257)。

![四條原則各自適合的時機：計畫太大、說做完卻沒證據、修了症狀、連續修不好](principles-steer.png){: w="800" h="450" }
_四條常用原則，以及什麼時候該說出它們的名稱。_

### laziness-protocol：計畫太大的時候

**什麼時候用**：AI 提出的計畫要新增好幾個輔助函式、好幾層包裝，或把同一個判斷寫在好幾個地方。

**指令怎麼寫**：

```text
/pstack:principle-laziness-protocol 用這條原則重看你的計畫，再實作。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-laziness-protocol/SKILL.md#L9-L10)）：

1. **把重複的決定收成一處。** 同一個判斷不在好幾個地方各寫一次，改成一個來源，其他地方只拿結果。
2. **把 diff 縮到最小。** 用能解決問題的最小改動，少寫幾行，勝過「漂亮」的樣板程式。

**你會拿到**：一份縮小過的計畫或改動，回覆裡會寫出這條原則拿掉了什麼。

**下一步**：確認拿掉的東西真的用不到，再讓它繼續。

### prove-it-works：說做完了，卻沒有證據

**什麼時候用**：AI 說「改好了」，但給你看的只是「編譯通過」或它自己的總結。

**指令怎麼寫**：

```text
/pstack:principle-prove-it-works 實際跑一次真正的指令，把輸出給我看，不要只給我建置紀錄。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-prove-it-works/SKILL.md#L9-L22)）：

1. **直接看真正的東西。** 讀實際的值、實際執行程式，不從檔案修改時間、快取或子代理的自我報告推論。
2. **檢查失敗時，先懷疑檢查方式。** 先確認是不是看錯地方，再懷疑程式。
3. **能寫成腳本就寫。** 最有力的證明，是一段可以重跑的腳本，而不是看一次就算了。

**你會拿到**：實際執行的指令和輸出。

**下一步**：自己看一次輸出，確認它驗證的是你在意的那件事。

### fix-root-causes：修了症狀，沒修到原因

**什麼時候用**：有個 bug，而 AI 的修法是在出錯的那一行加一個判斷擋掉。

**指令怎麼寫**：

```text
/pstack:principle-fix-root-causes <症狀>。找出第一個出錯的地方，在那裡修。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-fix-root-causes/SKILL.md#L9-L21)）：

1. **先重現。**
2. **一直問「為什麼」**，直到答案是程式裡的一個錯誤決定，而不是前一個錯誤造成的結果。
3. **卡住就加記錄**，看實際的錯誤訊息和狀態，不用猜的。
4. **判斷觸發的狀態合不合理。** 合理的話，處理不了它的程式就是原因；不該存在的話，就去找是誰產生了這個狀態。
5. **找同一種錯誤的其他地方**，一起修。

**你會拿到**：根本原因的說明、修正，以及同類問題有沒有其他地方。

**下一步**：看它說的原因，是不是第一個出錯的地方。

### attack-the-premise：連續修不好的時候

**什麼時候用**：已經試了兩次以上的修法，都卡在同一個檢查。

**指令怎麼寫**：

```text
/pstack:principle-attack-the-premise 前兩次修法都沒過。先寫下它們共同的前提，測試這個前提，再決定下一步。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-attack-the-premise/SKILL.md#L9-L19)）：

1. **寫下前提**：每一次失敗的修法都假設了的那一句話。
2. **先測試前提**：找一個「前提錯了，結果就會不一樣」的觀察，實際做一次。
3. **跟著證據走**：證據推翻前提，就去別處找原因；證據支持前提，就照 fix-root-causes 再問下一個「為什麼」。
4. **前提寫下來、測過之前，不開始下一個修法。**

**你會拿到**：被寫下來的前提、測試它的方法和結果，以及根據結果選的方向。

**下一步**：前提被推翻時，讓它從新的方向重新規劃。

### 怎麼判斷它真的套用了

原則被點名，不代表它真的照做。指南說，回覆裡要寫出這條規則**改變了哪個決定**；只有名稱、沒有對應決定的引用，就是只說了名稱卻沒有套用（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L27)）。指南也建議不要背清單：先瀏覽一次，下次看到 AI 做了某條原則可以避免的事，再回來找那個名稱（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L70)）。

## 做出自己的工作方式

`/poteto-mode` 是 pstack 作者一個人的工作風格。指南第 9 章教你換成自己的：`/automate-me` 產生你的 mode，`/reflect` 從一次對話裡學到教訓，`/correct` 改專案本身，讓同樣的錯不再發生（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L1-L5)）。

### /automate-me：把你的習慣做成一個 mode

**什麼時候用**：你常常對 AI 做同樣的糾正，例如「回答短一點」「先跑測試再說做完」，想讓它一開始就照你的方式做。mode 是一個 skill，寫的是你的工作習慣，名稱像 `<你的名字>-mode`。

**指令怎麼寫**：指南的寫法只有 `/automate-me`，因為在 Cursor 裡，它知道對話紀錄（transcript，AI 對話的完整紀錄檔）在哪裡。Claude Code 的紀錄放在 `~/.claude/projects/<專案路徑>/`，資料夾名稱是把專案路徑裡的 `/` 和 `.` 換成 `-`（[Claude Code 對照說明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L56)）。我建議在提示裡寫明只能讀這個專案的紀錄：

```text
/pstack:automate-me 只讀這個專案的對話紀錄（~/.claude/projects/<專案路徑轉成的資料夾名稱>/），不要讀其他專案。草稿先寫到 .claude/skills/<我的名字>-mode/SKILL.md，寫好給我看，不要 commit。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L13-L83)）：

1. **找既有的 mode。** 已經有你的 mode，就問你要更新還是重做；預設是更新。
2. **挖你的對話紀錄。** 只讀這個專案的紀錄，把最近幾週切成三段，派子代理（skill 執行時另外派出、分頭做事的 AI）平行讀，找回覆風格、分工、驗證、程式和文字、流程等方面的重複偏好。至少在兩段裡都出現過的才算數。
3. **直接問你。** 用一兩題選擇題確認哪些是你真正的習慣，再用一題開放問題補漏。在 `claude -p`（不開對話視窗、一次執行完的模式）裡沒有提問工具，它會改成用文字問（[Claude Code 對照說明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L10)）。
4. **分組、起草。** 把結果整理成幾節，例如回覆風格、自主程度、驗證、流程。只寫你有特別規則的部分。預設加上 `disable-model-invocation: true`，所以你要輸入指令它才會載入。
5. **修文字。** 用 `/unslop` 把每一行改得直接、好懂。
6. **送審。** 指南的做法是在 worktree（同一個 repo 的另一份獨立工作資料夾）裡 commit 並開 PR，不直接推到 main。

**你會拿到**：一份 `<你的名字>-mode/SKILL.md` 草稿。Claude Code 會保護專案的 `.claude/` 資料夾，AI 要寫進去時會先問你，或直接被擋下（[權限模式說明](https://code.claude.com/docs/en/permission-modes#protected-paths)）。被擋下的話，讓它先寫到別的資料夾，你看過再自己搬進去。

**下一步**：讀一遍，問自己「這像我嗎？少了什麼？」（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L94-L96)）。注意它挖到的是**你在這個專案的對話**；如果這些對話大多是特殊用途（例如一次性的測試），寫出來的就不會是你平常的樣子。習慣變了，再跑一次更新：

```text
/pstack:automate-me update my mode skill with everything since its last edit
```

### /reflect：一次對話學到的事，寫回 skill

**什麼時候用**：一個任務剛做完，過程繞了遠路，你不想下次再繞一次。

**指令怎麼寫**（取自[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L23-L31)）：

```text
/pstack:reflect 這次花太久了。把學到的事整理出來，讓下次不要重蹈覆轍。
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md#L13-L60)）：

1. **找到這次對話的紀錄。** 只讀這個專案的紀錄。
2. **派三個審查者平行看。** 分別從判斷、工具、不同觀點三個角度找可以學的事。
3. **整理。** 再派一個整合者，把提議分成 Accepted（採用）、Rejected（不採用）、Backlog（待辦）。
4. **能用結構解決的移到待辦。** 可以用 lint 規則、腳本或執行時檢查來擋的，比寫進 skill 更可靠，就移到 Backlog。
5. **等你核准。** 它列出全部結果，**你明確同意之前不改任何 skill**。它不會改外掛快取裡的 skill，而是先複製到專案或個人的 skill 資料夾再改，也不會開 PR 或推送。

**你會拿到**：Accepted、Rejected、Backlog 三份清單，以及每一項要改哪個 skill。

**下一步**：只核准會改變未來決定的項目。指南說得很直接：一次奇怪的對話只是個案，不是規則（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L31)）。

### /correct：讓同一種錯不可能再發生

**什麼時候用**：你一再為同一種錯誤糾正 AI。這時該改的是專案，不是你的下一個提示。

**指令怎麼寫**：知道是哪種錯時，直接寫出來（取自[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L45)）：

```text
/pstack:correct agents keep calling the database client directly instead of going through the repository layer
```

不知道時，不加說明，它會自己從歷史裡找：

```text
/pstack:correct
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md#L13-L32)）：

1. **找出錯誤的類別。** 讀最近的 commit、還原紀錄、審查留言、AI 的說明檔，以及解釋暫時做法的註解。同一類錯誤發生過兩次才算數。
2. **用能擋住它的最高層級來修**，順序是：
   1. 用架構讓錯誤不可能發生，例如每個狀態只有一個擁有者、只留一種正確做法；
   2. 用型別擋住，或加一個 lint 規則（自動檢查程式寫法的規則）或 CI（每次推上去就自動跑的檢查），錯誤訊息直接寫出該用什麼；
   3. 用測試抓；
   4. 最後才寫成文件或 AI 規則，因為 AI 跳過規則時，什麼都不會失敗。
3. **一類一個 commit，並證明檢查有效。** 每個新檢查都要在一個真實發生過的錯誤上失敗一次。本機和 CI 跑同一個指令。
4. **維護規則表。** 在 AI 的說明檔（Claude Code 是 `CLAUDE.md`）裡放一張表，寫每條規則由什麼來強制。沒有任何東西強制的規則，就是下次會再犯的地方。

**你會拿到**：每一類錯誤的證據、選的層級，以及為什麼更高的層級做不到；每一類一個 commit。

**下一步**：逐個看 commit。它可能會改到 CI 設定或既有測試，這些改動都要你看過才推出去。所以 `/correct` 要在你看得到的對話裡跑，不要放進無人值守的提示。

`/reflect` 和 `/correct` 的分工是：`/reflect` 從一次對話改進 skill，`/correct` 改專案，讓一類錯誤回不來（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L50)）。還有一件事：**不要在任務做到一半時改 skill**，另開一個 PR 改，任務照常進行（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L98)）。

## 讓它自己跑：無人值守的提示怎麼寫

### 先確認它值得被信任

指南第 7 章列了四個條件，全部成立才讓它自己跑；還沒成立之前，就在旁邊看著它跑（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L7-L16)）：

- 這件事你自己做過一次，或看 AI 做過一次，知道做得好是什麼樣子。
- AI 有你自己會用的工具和訊號，例如驗證 skill、效能剖析、記錄檔。
- 每個階段都會證明自己的成果，做不到標準時可以喊停。
- 你讀過幾次對話紀錄，已經把重複的失敗變成工具、skill 或檢查。

### 提示的六個部分

指南的交接範本有四個要素：目標、完成條件、權限，以及卡住時的出口（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L18-L36)）。我會再把「決策紀錄」和「不可以做的事」分開寫，變成六個部分：

![無人值守提示的六個部分：目標、怎樣算完成、決策紀錄、不用問的事、不可以做的事、卡住時怎麼停](overnight-prompt.png){: w="800" h="450" }
_一份無人值守提示的六個部分。時間長度不是完成條件。_

**什麼時候用**：任務已經符合上面四個條件，而且你不在電腦前。

**指令怎麼寫**：

```text
/pstack:poteto-mode 我要去睡了，自己跑到完成為止。
目標：<要完成的事>，在新的分支 <分支名稱> 上做。
怎樣算完成：<可以檢查的條件 1>；<條件 2>；<條件 3>。
決策紀錄：用 show-me-your-work 的格式記在 decisions.tsv。
不用問我：commit 之前不用問；<其他可以還原的小決定>自己決定，寫進紀錄。
不可以做：push、開 PR、合併、安裝套件、連網、改這個資料夾以外的檔案。
如果真的卡住：停下來，寫清楚卡在哪裡、試過什麼、需要我決定什麼。
```

每一行的作用：

- **「我要去睡了」** 是一個對話層級的覆寫，`/poteto-mode` 看到它，就不再停下來問，直接做下去（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L88)）。
- **「怎樣算完成」** 要寫成每一輪都能實際檢查的條件，例如「所有測試通過」「舊的函式沒有人呼叫」。指南特別提醒：**時間長度不是完成條件**。「做四個小時」沒有東西可以檢查，你醒來只會看到四個小時的忙碌，而不是結果（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L120)）。
- **「新的分支」** 讓它不會碰到你手上其他的工作。指南建議用新的 worktree；Claude Code 的 `-w`（`--worktree`）選項可以在獨立的 worktree 裡啟動（[CLI 說明](https://code.claude.com/docs/en/cli-reference)）。
- **「不用問我」** 先回答它原本會停下來問的事。這裡只放行在本機新分支上 commit；push、開 PR、合併和其他不可逆的動作，仍然要由人確認。
- **「不可以做」** 是界線。光寫在提示裡還不夠，要用權限設定擋住，見下一段。
- **「如果真的卡住」** 是出口。讓它在真的死路時停下來寫清楚，比一整晚自己重新解讀目標好。

指南的範本最後一行用 `/loop`，那是 Cursor 內建、用來定時或在事件發生時叫醒 AI 的指令，不是 pstack 的 skill（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L35)）。Claude Code 也有自己的 `/loop`，但用法不同，本篇不介紹；上面的範本不用它，直接在一個對話裡做到完成。

**它會怎麼做**：

1. **先設計流程。** 這類你離開後才要回來審的工作，`/poteto-mode` 會交給 [`/figure-it-out`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/figure-it-out/SKILL.md) 先把階段設計好，並接上決策紀錄（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L38)）。
2. **把完成條件寫成可以檢查的判斷式**，在第一輪之前就定好（[autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L5)）。
3. **每一輪做最小的改動**，拿完成條件檢查；有進展就 commit，沒幫助就丟掉，不留「也許有幫助」的東西。
4. **支援目標的中途發現自己處理**，不停下來問你；只有不可逆的動作、無法用實驗回答的產品或偏好決定，以及真正的死路，才會留給你。
5. **每一輪在決策紀錄記一列。**
6. **完成條件達成才停。** 卡在原地就換方法，不會放寬完成條件來宣布成功（[autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L6-L13)）。

**你會拿到**：一則回覆，寫出完成條件、跑了幾輪、留下了什麼、丟掉了什麼、完成條件最後的狀態，以及一份決策紀錄。

**下一步**：早上用 `/show-me-your-work` 檢查（見下一節）。

### 在 Claude Code 裡無人值守地跑

你不在電腦前時，AI 每次要執行指令都停下來等你同意，就會卡一整晚。所以要事先設好它能做什麼、不能做什麼。我會用 `claude -p` 搭配權限模式、允許清單和費用上限：

```bash
cd ~/my-project
claude -p "$(cat overnight-prompt.txt)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Grep" "Glob" "Bash(python3 -m unittest *)" "Bash(git add *)" "Bash(git commit *)" "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" \
  --disallowedTools "Bash(git push *)" "Bash(rm *)" "Bash(curl *)" "WebFetch" "WebSearch" \
  --max-budget-usd 10
```

- `--permission-mode acceptEdits`：讀檔、改檔和常見的檔案指令不用問；其他指令要在允許清單裡才會執行。
- `--allowedTools`：允許清單，列出不用問就能執行的工具和指令。測試指令要換成你專案用的。
- `--disallowedTools`：禁止清單。禁止規則在每一種權限模式下都有效（[權限模式說明](https://code.claude.com/docs/en/permission-modes#available-modes)）。
- `--max-budget-usd`：估計花費到這個金額就停止，只能用在 `claude -p`（[CLI 說明](https://code.claude.com/docs/en/cli-reference)）。

`claude -p` 沒有設定權限模式時，需要核准的動作會直接被拒絕（[權限模式說明](https://code.claude.com/docs/en/permission-modes#tool-calls-denied-in-claude--p-and-agent-sdk-runs)）。所以清單列得太少，它不會闖禍，只會做不完；早上看紀錄，再決定下次要多放行什麼。

### 想讓它停下來，或明天接著做

想刻意停下來時，就直接告訴它要暫停，或說你要離線了。Pause safely playbook 會把目前這一步做完或退回去，用一個 `wip:` commit 存下進度，再寫一份接手說明（resume note）。它不會為了暫停做不可逆的動作，例如開 PR 或推送。注意：說「繼續」永遠不會觸發暫停（[pause-safely playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/pause-safely.md#L1-L10)）。

```text
/pstack:poteto-mode 先暫停，我要離線了。
```

新的對話可以從那份說明接手，走的是 Session pickup playbook：讀前一次的紀錄、重建狀態，並在真實的程式上重新驗證前一次說「做完了」的事（[session-pickup playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/session-pickup.md)）。

### 一整晚不只一件事

一晚有好幾個互不相干的改動時，指南有兩個 playbook（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L72-L86)）：Autopilot-full 會把每個 PR 一路做到合併；Autopilot-stack 一樣會驗證，但**不合併**，早上由你自己看、自己合併。我建議用 Autopilot-stack，因為合併是你該親自做的決定：

```text
/pstack:poteto-mode autopilot these five changes, but don't merge. i'll land them in the morning.
```

## 早上：用 /show-me-your-work 檢查決策紀錄

**什麼時候用**：AI 自己跑了一段長時間的工作，你回來要知道它做了什麼、為什麼這樣做。

決策紀錄是一個 TSV 檔（用 Tab 分隔欄位的純文字表格），一個決定一列，欄位是時間、階段、決定、原因、證據、結果。證據是一個指標，例如 commit 編號或 `檔案:行號`，不是一段文字（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L11-L22)）。它預設放在工作資料夾的 `decisions.tsv`，有好幾個工作同時進行時放 `.audit/<任務名稱>.tsv`，預設**不 commit**；只有工作大到審查者需要這份紀錄才能相信結果時，才 commit（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L44-L48)）。紀錄只能往後加：判斷錯了，就新增一列取代它，不改也不刪舊的。

**指令怎麼寫**（取自[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L62-L66)），在跑工作的同一個對話裡：

```text
/pstack:show-me-your-work catch me up on what you did last night
```

**它會怎麼做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L55-L74)）：

1. **對照對話紀錄檢查決策紀錄。** 每一列都要對應到真的決定或動作，證據要能打開，而且真的證明那一列說的事。漏記的轉折要補上。寫錯的列不改不刪，新增一列更正。
2. **找不同家族的模型來審。** 派一個和做事的模型不同家族的子代理，讀紀錄和對話，找出證據薄弱的決定、沒有證明就說做過的驗證、事後看來有風險的選擇。
3. **把它做了什麼整理成摘要**，結尾加一個 Attention（注意事項）區。

**你會拿到**：一份摘要，以及 Attention 區。Attention 的第一行寫 `reviewed by <模型>`，接著是每一個要你注意的地方，指向紀錄的哪一列。

**下一步**：先讀 Attention，再順著它指的那幾列，打開證據抽查（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L68)）。你在審查決定，不是重看一整晚。也看一下 `reviewed by` 那一行：如果你的環境只有一個模型家族，這個審查就不是真正的跨家族審查。在終端機裡可以這樣把 TSV 排成表格：

```bash
column -s$'\t' -t decisions.tsv
```

只想快速知道狀態、不需要完整檢查時，在同一個對話跑 `/pstack:ketchup`，它只讀不改（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L70)）。

## 風險：什麼可以放手，什麼一定要先問

### never-block-on-the-human 的界線

讓 AI 自己跑的核心原則是 [never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md#L9-L15)：人是非同步監督的，AI 不該卡著等人。可以還原的事，例如寫程式、改筆記、拆任務，先做再報告；不要問「要不要做 X」，做了再說明為什麼。但**不可逆的動作仍然要先確認**，例如 force push（強制覆蓋遠端分支的歷史）、刪除正式環境的資料、對外發訊息。產品方向由人決定。

`/poteto-mode` 也寫明，就算你說了「我要去睡了」，下面這些仍然**一定會停下來**：force push 到共用分支、部署、刪除資料、發訊息給客戶（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L86-L88)）。

但要注意，同一份 SKILL.md 也寫：可以還原的事，以及團隊聊天、更新 ticket、啟動 eval 這類對外動作，都會直接做、不先問，而且可以用任何 MCP 工具（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L84)）。也就是說，它自己會停下來的只有上面那幾件：force push 到共用分支、部署、刪除資料、發訊息給客戶，不是所有對外訊息都會先問你。不想讓它對外發訊息，就在「不可以做」寫清楚，並用 `--disallowedTools` 把那些 MCP 工具擋掉。

![可逆的動作放手讓它做，不可逆的動作一定先問；權限設定和費用上限是第二道防線](ask-line.png){: w="800" h="450" }
_界線畫在「能不能還原」。寫在提示裡是第一道防線，權限設定是第二道。_

我自己會把界線再畫得保守一點：

| 放手讓它做 | 一定要先問，或直接禁止 |
| --- | --- |
| 在新分支上改程式、commit | push、開 PR、合併 |
| 跑測試、跑專案自己的指令 | 安裝套件、連網下載 |
| 寫決策紀錄、接手說明 | 刪除檔案或資料、改 git 歷史 |
| 在 scratch 資料夾放草稿 | 改 CI 設定、AI 的設定檔（`.claude/`、`CLAUDE.md`） |

### 權限：寫在提示裡還不夠

提示裡的「不可以」是請求，權限設定才是牆。Claude Code 的權限模式各有不同的放手程度（[權限模式說明](https://code.claude.com/docs/en/permission-modes#available-modes)）：

| 模式 | 不用問就能做的事 | 適合 |
| --- | --- | --- |
| `default`（Manual） | 只有讀取 | 每個動作都自己看 |
| `acceptEdits` | 讀取、改檔、常見的檔案指令 | 改程式，其他指令用允許清單放行 |
| `plan` | 讀取 | 動手之前先探索 |
| `auto` | 全部，背景有安全檢查 | 長時間的工作 |
| `dontAsk` | 讀取和事先允許的工具，其他一律拒絕 | 鎖死的 CI 和腳本 |
| `bypassPermissions` | 全部 | 只能在隔離的容器或虛擬機裡用 |

幾個要知道的事：

- **禁止規則永遠有效**，連 `bypassPermissions` 也擋得住；但在 `bypassPermissions` 下，允許清單沒有作用。
- **有些資料夾受保護。** 寫入 `.git`、`.claude` 這類資料夾時，`default` 和 `acceptEdits` 會先問你，`dontAsk` 會直接拒絕（[受保護的路徑](https://code.claude.com/docs/en/permission-modes#protected-paths)）。這是好事：AI 不能悄悄改掉自己的設定。所以讓 `/automate-me` 或 `/reflect` 寫 skill 時，要預期它會在這裡停下。
- **不要為了不被打擾就關掉所有檢查。** `bypassPermissions` 只適合放在隔離的容器或虛擬機裡（[常見設定](https://code.claude.com/docs/en/permission-modes#common-setups)）。

### 費用：先設上限

無人值守的工作會派很多子代理，花費可能比你想的多。

- `claude -p` 加上 `--max-budget-usd`。這是 Claude Code 自己的估計，可能和帳單不同，也可能稍微超過，所以要留一點空間；子代理的花費也算在內；用 `--resume` 接續對話時，之前的花費不算進這次的上限（[CLI 說明](https://code.claude.com/docs/en/cli-reference)）。
- 用 Pro、Max 這類訂閱方案，又開了額外用量（usage credits）時，在 claude.ai 的 Settings → Usage 設每月花費上限（[費用說明](https://code.claude.com/docs/en/costs)）。
- 用 Cursor 時，也先看你的方案用量和上限設定，再讓它自己跑。

更多權限和供應鏈的風險，以及權限怎麼收，請看[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

## 完整範例：一天的流程

延續第 3 篇的虛構例子：一個匯出資料的命令列工具。

**白天：用原則名稱指揮。** 我請它加一個新選項：

```text
/pstack:poteto-mode 幫 export 指令加一個 --since 日期選項。先告訴我你的計畫，不要動手。
```

計畫裡多了兩個輔助函式和三個測試，我覺得太多：

```text
/pstack:principle-laziness-protocol 用這條原則重看你的計畫，再實作並 commit。
```

它說做完了，但只給我測試結果：

```text
/pstack:principle-prove-it-works 用真正的資料跑一次 export --since，把輸出給我看，也試試看奇怪的日期。
```

**傍晚：把重複的錯誤變成結構。** 這週已經是第二次糾正它「使用者輸入的值沒有先整理就拿去比對」：

```text
/pstack:correct 使用者輸入的過濾值，常常沒有經過和資料相同的整理就拿去比對
```

我逐個看它的 commit，確認新的檢查會在舊的錯誤上失敗，再自己推上去。

**睡前：交代無人值守的工作。** 把六個部分寫進 `overnight-prompt.txt`：

```text
/pstack:poteto-mode 我要去睡了，自己跑到完成為止。
目標：幫 export 加一個 --format csv 選項，在新的分支 feat/export-csv 上做。
怎樣算完成：所有測試通過；用範例資料跑出的 CSV 能被重新讀回、筆數一致；原本的 JSON 輸出一個位元組都不變。
決策紀錄：用 show-me-your-work 的格式記在 decisions.tsv。
不用問我：commit 之前不用問；欄位順序、空值怎麼寫這類小決定自己決定，寫進紀錄。
不可以做：push、開 PR、合併、安裝套件、連網、改這個資料夾以外的檔案。
如果真的卡住：停下來，寫清楚卡在哪裡、試過什麼、需要我決定什麼。
```

用上一節的 `claude -p` 指令啟動，加上允許清單、禁止清單和費用上限。

**早上：檢查。** 在同一個對話接續（`claude -p --resume <對話 ID>`，或在對話視窗裡接著打）：

```text
/pstack:show-me-your-work catch me up on what you did last night
```

我先讀 Attention，再打開它指的那幾列的 commit 和輸出，回答它留給我的決定，最後自己決定要不要推上去、開 PR。

**最後：留下教訓。** 這次有一步繞了遠路：

```text
/pstack:reflect 這次在解析日期上花太久了。把學到的事整理出來，讓下次不要重蹈覆轍。
```

我只核准會改變下次決定的那幾項。用了一陣子之後，再用 `/pstack:automate-me` 把這些習慣整理成我自己的 mode。

## 什麼時候用哪一個

| 你遇到的情況 | 用這個 |
| --- | --- |
| 計畫太大、包裝太多 | `/pstack:principle-laziness-protocol` |
| 說做完了，卻沒有實際輸出 | `/pstack:principle-prove-it-works` |
| 修法只是擋掉症狀 | `/pstack:principle-fix-root-causes` |
| 同一個方向修了兩次都失敗 | `/pstack:principle-attack-the-premise` |
| 想看全部 24 條原則 | [README 的原則表](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257) |
| 想讓 AI 照你的習慣工作 | `/pstack:automate-me` |
| 一次對話學到的事，想寫回 skill | `/pstack:reflect` |
| 同一種錯誤糾正了兩次以上 | `/pstack:correct` |
| 讓它自己跑到完成 | `/pstack:poteto-mode` ＋六個部分的提示 |
| 一晚有好幾個獨立的改動 | `/pstack:poteto-mode` ＋ Autopilot-stack |
| 想刻意停下來、明天接著做 | 告訴 `/pstack:poteto-mode` 暫停 |
| 早上檢查它做了什麼 | `/pstack:show-me-your-work` |
| 只想知道目前的狀態 | `/pstack:ketchup` |

## 常見陷阱

- **時間長度不是完成條件**：寫「做四個小時」，它沒有東西可以檢查。
- **只寫在提示裡的界線**：「不要 push」要用禁止清單擋住。
- **原則只被點名**：回覆裡要看到它改變了哪個決定。
- **在任務中途改 skill**：另開一個 PR。
- **一次對話就定規則**：`/reflect` 的結果只核准會改變未來決定的。
- **讓 AI 讀所有專案的紀錄**：`/automate-me` 和 `/reflect` 只讀這個專案的對話。
- **跨家族審查不是真的跨家族**：看 Attention 的 `reviewed by`。
- **沒設費用上限**：`claude -p` 加 `--max-budget-usd`，也設好方案的花費上限。
- **版本**：以上依 pstack `0.15.36` 的說明檔整理，之後的版本可能會改變做法。

## 結論

想用一句話改變 AI 的做法，就在對話中途輸入 `/pstack:principle-<名稱>`，再看它的回覆有沒有寫出這條原則改了哪個決定。想讓 AI 照你的方式工作，`/automate-me` 從你的對話裡整理出你自己的 mode，`/reflect` 把一次對話的教訓寫回 skill，`/correct` 則直接改專案，讓同一種錯不再發生。想讓它在你不在時自己跑，先確認這件事值得信任，再寫好目標、可以檢查的完成條件、決策紀錄、不用問的事、不可以做的事，以及卡住時怎麼停；用權限設定把不可逆的動作擋住，設好費用上限，早上用 `/show-me-your-work` 從 Attention 開始檢查。可以還原的事讓它放手做，不能還原的事，永遠由你決定。

## 延伸閱讀

- [指南：Run work while you sleep](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md)：交接範本、早上的檢查，以及一晚做好幾件事的 playbook。
- [指南：Steer with principle names](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md)：24 條原則的簡介。
- [指南：Make it yours](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md)：`/automate-me`、`/reflect`、`/correct`，以及怎麼寫和測試 skill。
- skill 的說明檔：[automate-me](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md)、[reflect](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md)、[correct](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md)、[show-me-your-work](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md)、[never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md)。
- [Claude Code 權限模式](https://code.claude.com/docs/en/permission-modes)：每種模式能做什麼、受保護的路徑。
- [pstack 系列（1）：安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：怎麼安裝、更新，以及固定版本的做法。
- [pstack 系列（2）：改程式之前，先看懂再設計](/posts/pstack-understand-design/)：`/how`、`/why`、`/architect`、`/interrogate`、`/arena`。
- [pstack 系列（3）：寫完程式之後，先證明它能用再合併](/posts/pstack-build-verify-merge/)：實作、清理、驗證、送審四個階段，包括 playbook、`/tdd`、驗證 skill 和 babysit。
- [自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護](/posts/agent-skill-authoring-guide/)：skill 放在哪裡、`SKILL.md` 怎麼寫。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：權限、沙箱和鎖版本。
- [mattpocock/skills 系列導讀：這套 skill 是什麼、六篇該怎麼讀](/posts/mattpocock-skills-series-guide/)和[mattpocock/skills 系列（1）：先設定專案規則，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)：另一套 skill 的系列文章。
