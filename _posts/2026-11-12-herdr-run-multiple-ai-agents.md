---
title: "同時跑好幾個 AI，不再找不到卡住的那個：herdr 入門"
description: "用 brew 或 mise 安裝 herdr，為每個 AI 開獨立的 worktree 與 pane，從側欄找出卡住的那個，離開後再接回來。"
date: 2026-11-12 08:00:00 +0800
categories: [AI, 軟體開發]
tags: [coding-agent, workflow, git, claude-code, codex]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.webp
  alt: "用 herdr 讓每個 AI 各有一個 pane，一眼看出哪個在等你回答，離開後再接回來。"
---

讀過[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)，開始讓兩三個 coding agent 同時做事之後，下一個麻煩常常是：哪個在等你按「允許」、哪個還在跑，要一個視窗一個視窗切過去才知道；終端機關掉，或 SSH 斷線，做到一半的工作也可能一起停。

herdr 是在終端機裡管理多個工作區和分割畫面的工具。它會把每個 agent 放在自己的 pane，側欄用不同顏色的圓點標出狀態；按 prefix+g 開出的清單才會直接寫出 working、blocked、done 或 idle。關掉你看到的畫面，背景的工作仍可繼續。官方的說法是「the runtime your coding agents live on」。

這篇講的是終端機裡的 Herdr TUI（[herdr.dev/tui](https://herdr.dev/tui)），不是 herdr.dev 首頁現在主要推廣的另一個程式 Herdr desktop App（[herdr-app](https://github.com/herdrdev/herdr-app)），兩者也不會共用 agent。

這篇以 macOS 和 Linux 為主，用 Claude Code 與 Codex 當例子（官方還支援其他 agent，見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)）。Windows 已有原生支援，但有已知限制，細節見[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)，本文不教 Windows 安裝。

> **版本說明**：本文依 herdr v0.9.5（2026-10-15 發布，2026-11-12 確認仍是最新穩定版）的官方文件撰寫。herdr 仍是 0.x 版，更新很快，指令與快捷鍵以[官方文件](https://herdr.dev/tui/docs/0.9.5/)為準。
{: .prompt-info }

## 先說幾個詞

- **終端機（terminal）**：輸入指令的文字視窗。
- **herdr**：在終端機裡管理多個工作區和分割畫面的工具，會認出每個畫面裡跑的是哪個 coding agent，並顯示它現在的狀態。官方也稱它為 terminal workspace manager。
- **workspace／tab／pane**：herdr 的三層。workspace 是一個專案或任務（官方建議 one workspace per repo, task, or investigation）；tab 是 workspace 裡的一個版面；pane 是真正的終端機分割畫面（官方：「A pane is a real terminal.」）。
- **背景 server／client**：herdr 把終端機放在背景的 server 裡跑；你看到的畫面是接上去的 client。關掉畫面，server 和裡面的 agent 繼續跑。
- **detach（離開）／reattach（接回）**：暫時離開畫面，之後再接回同一個 session。
- **prefix 鍵**：先按 `ctrl+b` 放開，再按下一個鍵。用過 tmux 的人會覺得眼熟。
- **套件管理器**：像 Homebrew（`brew`）和 mise 這類幫你安裝、升級、移除工具的程式。
- **coding agent、worktree、分支**：沿用 worktree 篇的說法——agent 會自己改檔、跑指令；worktree 是同一個 repo 裡另一份獨立工作目錄；分支是那份工作目錄對應的 git 線。

指令、快捷鍵、狀態定義和斷線行為以下以官方文件為準，並附上連結。「我建議用 brew 或 mise 安裝」「一個 worktree 一個 workspace」「先處理 blocked」則是本站的做法，會另外標明。

## 什麼時候用、什麼時候不用

- 同時跑兩個以上的 agent，或常常要離開座位、用 SSH 連遠端機器：值得用。
- 只跑一個 agent，或已經有順手的安排：不一定要換。
- herdr 不會取代或包住你的 agent。官方 README 寫：「herdr doesn't wrap or replace them; it owns their terminals。」它管的是終端機，agent 還是你原來用的那個。

下面先看一輪怎麼走，接著逐步說明。

![herdr 五步：開 herdr、開 worktree、每 pane 跑一個 agent、找 blocked、離開再接回](workflow.webp){: w="1600" h="900" }
_概念圖：一輪的五個步驟是開 herdr、開工作目錄、跑 agent、找卡住的、離開再接回。prefix 是先按 ctrl+b 放開，再按下一個鍵。_

## 步驟 1：安裝

![安裝 herdr 建議用 brew 或 mise；官方的 curl | sh 一行安裝要先下載、看過腳本再執行](install.webp){: w="1600" h="900" }
_概念圖：左邊是本站建議的做法，用 brew 或 mise 安裝與升級；右邊是官方 Install／TUI 頁的一行安裝，若要用，先下載腳本、看過再執行。_

我建議已經在用 [Homebrew](https://formulae.brew.sh/formula/herdr) 的人用 `brew install herdr`，已經在用 [mise](https://mise.jdx.dev/) 的人用 `mise use -g herdr`。這兩種都列在官方[Install](https://herdr.dev/tui/docs/0.9.5/install/)頁。

官方 Install／TUI 頁另外提供 `curl -fsSL https://herdr.dev/install.sh | sh`。我建議不要直接貼上執行：貼上就跑的是伺服器當下回傳、你沒看過的內容，下次執行也可能不同；而且它會裝到 `~/.local/bin`，之後靠 `herdr update` 自己更新，不在你的套件管理器清單裡，比較不好盤點和移除。用 brew 或 mise，版本查得到，升級和移除也是同一套指令。這不是說安裝腳本有問題，而是「先看再跑」的習慣，說明見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

若一定要用官方腳本，先下載再看過：

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

打開檔案看完，再執行 `sh herdr-install.sh`。

用 mise 時若出現 `herdr not found in mise tool registry`，依官方說法，先更新 mise 再試一次。

裝好後執行 `herdr --version`，依官方文件，應該會顯示版本號（例如 0.9.5）。若你使用中文、日文或韓文輸入法，且 prefix 快捷鍵沒反應，請確認是 0.9.5 或更新的版本；官方在這一版修過這個問題。

更新時，用 brew 裝的請用 `brew upgrade herdr`，用 mise 裝的請用 `mise upgrade herdr`。官方原文是：「Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead.」套件管理器更新之後，原本在跑的 server 還會繼續；若要套用 server 端的新功能，需先 `herdr server stop` 再重開，見 Install 頁的 Update 節。

## 步驟 2：在專案資料夾開 herdr

先 `cd` 到你的專案資料夾，再輸入 `herdr`。依[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)，它會啟動或接上預設的背景 session；這個 session 還沒有 workspace 時，會自動開一個。我建議一個專案對應一個 workspace。

![herdr 實際畫面：側欄是 demo-app workspace，兩個 pane 分別跑 git 和 build](screen-main.webp){: w="1600" h="900" }
_實際畫面：在 demo-app 資料夾開 herdr，再用 prefix+v 分出第二個 pane。這兩個 pane 跑的是一般 shell，不是 agent，所以 agents 區是空的。_

滑鼠可以直接點、拖邊界，也可以右鍵分割；官方強調滑鼠和鍵盤都是一等公民，鍵盤是選用而不是必備。

## 步驟 3：每個工作目錄一個 workspace

本站的做法是：每個 worktree 配一個 workspace，讓每個 agent 改自己的工作目錄，和 worktree 篇的原則相同。有兩種開法，選一種即可，底層都是 `git worktree`。合併、刪分支，以及有 submodule 時不要用 worktree，都照[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)。

**做法 A：用 herdr 開。** 在 workspace 列選 `New worktree`，或按 `prefix+shift+g`；分支欄一開始會填好隨機名稱，先按 ctrl+c 清掉再輸入。herdr 會建好 git worktree，並開成一個新 workspace，排在原專案底下。等同在專案資料夾內執行：

```bash
herdr worktree create --branch login-page
```

![按 prefix+shift+g 跳出 new worktree 視窗，分支填 login-page，下方是資料夾位置](screen-worktree.webp){: w="1600" h="900" }
_實際畫面：按 prefix+shift+g 開 worktree。分支欄一開始會填好隨機名稱，先按 ctrl+c 清掉再輸入；按 Enter 會建好並開成新的 workspace。_

預設位置是 `~/.herdr/worktrees/<repo>/<分支>`，可在 `~/.config/herdr/config.toml` 的 `[worktrees] directory` 更改，見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)。

**做法 B：沿用 worktree 篇。** 先用 `git worktree add -b …` 開好資料夾，再在 herdr 用 `prefix+shift+n` 開新 workspace，並 `cd` 到那個資料夾。

關掉 herdr 的 workspace，依官方說明，不會刪資料夾，也不會刪分支。要刪 checkout，用 `Delete worktree checkout...`（底層是 `git worktree remove`）或自己跑 `git worktree remove`；分支要另外刪。

同一個 workspace 裡若還要多開一個終端機，例如跑測試，就分割 pane：`prefix+v` 向右，`prefix+minus` 向下。

## 步驟 4：在 pane 裡啟動 agent

在各 pane 輸入 `claude` 或 `codex`。依 Quick start，herdr 會自動認出來。官方還支援 Cursor Agent CLI、GitHub Copilot CLI、OpenCode 等，完整清單見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)，這裡不一一列出。

整合（integration）是選用的。不裝也能看狀態；裝了之後，背景 server 重開時，才能接回同一段對話。安裝指令是 `herdr integration install claude` 或 `herdr integration install codex`，見[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)。它會改 agent 的設定：Claude Code 會加一個 SessionStart hook；Codex 會改 `hooks.json`，並在 `config.toml` 開 `[features] hooks = true`。可用 `herdr integration uninstall …` 移除，但 Codex 的 `config.toml` 不會被改回去。hook 是什麼，可參考[把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

## 步驟 5：看狀態，找出卡住的那個

![herdr 的五種狀態：blocked、working、done、idle、unknown，各代表什麼、你該做什麼](states.webp){: w="1600" h="900" }
_概念圖：五種狀態的意思，以及本站建議你該做的事。blocked 要先處理；新的提示畫面可能先顯示成 idle，idle 不代表可以替它按「允許」。圖上的顏色是本站配圖用的，不是 herdr 介面的配色。_

側欄用不同顏色的圓點標出每個 agent 的狀態；同一個 workspace 裡若有 agent 是 blocked，該 workspace 自己的那一列也會換成 blocked 的顏色。狀態名稱（working、blocked、done、idle）只寫在按 prefix+g 打開的 Go to 清單裡。官方定義有五種；「你該做什麼」是本站的建議。

| 狀態 | 官方定義（白話） | 本站建議你該做什麼 |
| --- | --- | --- |
| blocked | 在等你回答、核准或做決定 | 先處理：打開看清楚再回答 |
| working | 正在跑 | 不用管，讓它做 |
| done | 做完了，你還沒看 | 去看結果、檢查改了什麼 |
| idle | 做完或在等，你已經看過 | 可以交代下一件事 |
| unknown | herdr 認不出狀態 | 自己點進去看一眼 |

![herdr 側欄：worktree workspace 排在 demo-app 底下，agents 區用圓點顏色標狀態](screen-states.webp){: w="1600" h="900" }
_實際畫面（herdr 預設主題）：黃點 working、紅點 blocked、青綠點 done、空心綠圈 idle。示範用的「agent」是用 herdr pane report-agent 回報狀態的 shell 腳本，不是 Claude Code 或 Codex。_

要快速找人，按 `prefix+g` 開 Goto 清單，再按 `b` 只看 blocked（`w` 看 working、`i` 看 idle、`d` 看 done、`a` 看全部），Enter 跳過去。

![Go to 清單依 workspace 分組，每列寫出 idle、working、blocked 或 done](screen-goto.webp){: w="1600" h="900" }
_實際畫面：按 prefix+g 開 Go to，狀態直接寫成文字；再按 b 只留下 blocked 的那一列，按 Enter 跳過去。清單裡示範的「agent」是用 herdr pane report-agent 回報狀態的 shell 腳本，不是 Claude Code 或 Codex。_

通知預設不會跳出提示（`[ui.toast] delivery` 預設為 `off`）；若要在 herdr 裡看到提示，把 delivery 設成 `herdr`，也可以改成系統通知。若要在 macOS 用系統通知，官方建議先 `brew install terminal-notifier`，細節見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)或[Config reference](https://herdr.dev/tui/docs/0.9.5/config-reference/)。

依官方[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)頁的原文，blocked 的判斷刻意保守，新的提示畫面一開始可能顯示成 idle；而且「idle status is not authorization to approve an action」。跳過去之後，要看清楚再按允許。這一點和[拿 OWASP Agentic Top 10 檢查你的 AI 工作流：十項風險逐條對照與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)裡談的過度信任、審批疲勞是同一件事。

## 步驟 6：離開，再接回來

要離開時，按 `prefix+q`（先 `ctrl+b` 再 `q`），或直接關終端機視窗。依 Quick start，server 和裡面的 agent 會繼續跑；之後再輸入 `herdr`，就會接回同一個 session。

什麼會留下、什麼不會，官方[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)有表。白話來說：只是離開，全部繼續跑。但 herdr 的背景 server 重開、電腦重開或關機時，原本的行程不會繼續（README 原文：「the original processes do not survive」）；版面會恢復，對話則只有裝了整合才能接回來。

全部收工用 `herdr server stop`。官方說明是結束這個 session，並停止裡面的 pane。請注意：這會停掉所有 pane 裡正在跑的 agent。

## 整理一下：一輪的用法，加上快捷鍵速查

一輪就是圖上的五步：在專案資料夾開 herdr，為每個任務開工作目錄，在各 pane 啟動 agent，用側欄或 Goto 找出 blocked 的，離開後再打 `herdr` 接回。

`ctrl+b` 是 prefix：先按它並放開，再按下一個鍵。官方[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)把這句寫成：「`prefix+c` means: press `ctrl+b`, release, then press `c`.」忘記時按 `prefix+?` 可看全部快捷鍵。

| 按鍵 | 作用 |
| --- | --- |
| `prefix+v`／`prefix+minus` | 向右／向下分割 pane |
| `prefix+h`／`j`／`k`／`l` | 在 pane 之間移動 |
| `prefix+c` | 先開命名視窗，按 Enter 才建立新 tab |
| `prefix+w` | workspace 導覽 |
| `prefix+shift+n` | 新 workspace |
| `prefix+shift+g` | 新 worktree |
| `prefix+g` | 開 Goto（再按 `b` 只看 blocked） |
| `prefix+z` | 放大目前 pane |
| `prefix+x` | 關掉目前 pane |
| `prefix+q` | 離開（detach） |
| `prefix+?` | 看全部快捷鍵 |

## 什麼情況怎麼做

| 情況 | 建議 |
| --- | --- |
| 只跑一個 agent | 不一定要用 herdr；覺得視窗已經夠用，可以先不裝 |
| 兩三個 agent 各改不同功能 | 本站建議一個 worktree 配一個 workspace |
| 想讓 agent 跑著、人先離開 | `prefix+q` 離開；之後再打 `herdr` 接回 |
| 用 SSH 連遠端機器做事 | 直接在遠端執行 `herdr`，斷線後工作仍可繼續；或用 `herdr --remote <主機>`，見[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| 狀態看起來不對 | 用 `herdr agent explain <目標>` 查看判斷依據，見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| 要全部停掉 | `herdr server stop`（會停掉所有 pane 裡的 agent） |
| 用 brew／mise 裝的要更新 | `brew upgrade herdr` 或 `mise upgrade herdr`，不要用 `herdr update` |
| 不想讓 herdr 在背景連 herdr.dev | 在設定檔把 `[update] version_check = false` 和 `manifest_check = false`，見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## 常見誤解

- 「關掉視窗，工作就停了。」只是離開的話，server 和 agent 會繼續跑。
- 「有 herdr，就算重開機也不會中斷。」原本的行程不會活下來，只會恢復版面；對話要裝了整合才接得回來。
- 「顯示 idle 就代表沒事，可以直接按允許。」新的提示畫面可能先被判成 idle；idle 不是授權。
- 「herdr 會取代 Claude Code 或 Codex。」不會，它只管理終端機。
- 「關掉 worktree 的 workspace，就會刪掉資料夾。」不會，也不刪分支。
- 「用 brew 裝的也可以 `herdr update`。」官方說要用套件管理器更新。

## 結論與下一步

每個 AI 一個 pane，看側欄找 blocked，離開後再接回來。若要在遠端機器上這樣做，見[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/)。官方也提供讓 agent 自己操作 herdr 的 skill：`herdr --skill` 會印出與目前版本相符的內容；裝任何第三方 skill 之前，先讀過內容，見供應鏈篇。

延伸閱讀： [herdr README](https://github.com/herdrdev/herdr)、[v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)、[文件首頁](https://herdr.dev/tui/docs/0.9.5/)、[Install](https://herdr.dev/tui/docs/0.9.5/install/)、[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)、[Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/)、[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)、[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)、[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)、[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)、[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)、[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)、[Homebrew formula](https://formulae.brew.sh/formula/herdr)。
