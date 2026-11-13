---
title: "herdr 入門：在終端機同時跑多個 AI，找出卡住的那個"
description: "用 brew 或 mise 安裝 herdr，為每個 AI 開獨立的 worktree 與 pane，從側欄找出卡住的那個，離開後再接回來。"
date: 2026-11-12 08:00:00 +0800
categories: [AI, 軟體開發]
tags: [coding-agent, workflow, git, claude-code, codex]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.webp
  alt: "用 herdr 讓每個 AI 各有一個 pane，一眼看出哪個在等你回答，離開後再接回來。"
---

如果你讀過[git worktree 教學：讓兩個 AI 在同一個 repo 分開工作](/posts/git-worktree-parallel-ai-agents/)，已經讓兩三個 coding agent 同時做事，下一個麻煩通常是：哪個在等你按「允許」、哪個還在跑，得一個視窗一個視窗切過去才知道；而且終端機一關，或 SSH 連線一斷，做到一半的工作也可能跟著停掉。

herdr 是在終端機裡管理多個工作區和分割畫面的工具。它把每個 agent 放進自己的分割畫面（pane），並在側欄用不同顏色的圓點標出每個 agent 是在跑、在等你，還是已經做完。就算關掉你看到的畫面，背景的工作也能繼續。官方的說法是「the runtime your coding agents live on」。

這篇講的是終端機裡的 Herdr TUI（[herdr.dev/tui](https://herdr.dev/tui)），不是 herdr.dev 首頁現在主要推廣的另一個程式 Herdr desktop App（[herdr-app](https://github.com/herdrdev/herdr-app)）。兩者是分開的程式，在其中一個啟動的 agent，不會出現在另一個裡。桌面 App 的用法另見[Herdr 桌面 App 入門：用 space 與分頁管理多個 AI](/posts/herdr-app-desktop-manage-ai-agents/)。

這篇以 macOS 和 Linux 為主，用 Claude Code 與 Codex 當例子（官方還支援其他 agent，見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)）。Windows 已有原生支援，但有已知限制，細節見[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)，本文不教 Windows 安裝。

> **版本說明**：本文依 herdr v0.9.5（2026-10-15 發布，2026-11-12 確認仍是最新穩定版）的官方文件撰寫。herdr 仍是 0.x 版，更新很快，指令與快捷鍵以[官方文件](https://herdr.dev/tui/docs/0.9.5/)為準。
{: .prompt-info }

## 先說幾個詞

- **終端機（terminal）**：輸入指令的文字視窗。
- **herdr**：在終端機裡管理多個工作區和分割畫面的工具，會認出每個畫面裡跑的是哪個 coding agent，並顯示它現在的狀態。官方也稱它為 terminal workspace manager。
- **workspace／tab／pane**：herdr 的三層。workspace 是一個專案或任務（官方建議 one workspace per repo, task, or investigation）；tab 是 workspace 裡的一個版面；pane 是真正的終端機分割畫面（官方：「A pane is a real terminal.」）。
- **背景 server／client**：herdr 把終端機放在背景的 server 裡跑；你看到的畫面是接上去的 client。關掉畫面，server 和裡面的 agent 繼續跑。
- **detach（離開）／reattach（接回）**：暫時離開畫面，之後再接回同一個 session。
- **prefix 鍵**：先按下 `ctrl+b` 再放開，接著按下一個鍵。Mac 上是 control 鍵，不是 command 鍵。例如 `prefix+shift+g`，就是按一下 `ctrl+b` 放開，再按 `shift+g`。用過 tmux 的人會覺得眼熟。
- **套件管理器**：像 Homebrew（`brew`）和 mise 這類幫你安裝、升級、移除工具的程式。
- **coding agent、worktree、分支**：沿用 worktree 篇的說法——agent 會自己改檔、跑指令；worktree 是同一個 repo 裡另一份獨立的工作目錄；分支是 git 裡一條獨立的修改紀錄，每份工作目錄各自停在一條分支上。

以下的指令、快捷鍵、狀態定義和斷線後的行為，都以官方文件為準並附上連結；「建議用 brew 或 mise 安裝」「一個 worktree 配一個 workspace」「先處理 blocked」則是本站的做法，文中會標明。

## 什麼時候用、什麼時候不用

- 同時跑兩個以上的 agent，或常常要離開座位、用 SSH 連遠端機器：值得用。
- 只跑一個 agent，或已經有順手的安排：不一定要換。
- herdr 不會取代或包住你的 agent。官方 README 寫：「herdr doesn't wrap or replace them; it owns their terminals.」它管的是終端機，agent 還是你原來用的那個。

## 開始前要準備

- 一台 macOS 或 Linux 電腦，以及終端機。macOS 用內建的「終端機」App 就可以。
- Homebrew 或 mise 其中一個。兩個都沒用過的話，macOS 可以先照 [Homebrew 官網](https://brew.sh/)的說明裝好 Homebrew。
- 一個用 git 管理、至少有過一次 commit 的專案資料夾。步驟 3 開 worktree 時會用到。
- 已經裝好並登入 Claude Code 或 Codex：在一般終端機輸入 `claude` 或 `codex`，能正常啟動。

裝好 herdr 之後，每一輪的用法就是下圖的五步，分別對應下面的步驟 2 到 6。

![herdr 五步：開 herdr、開 worktree、每 pane 跑一個 agent、找 blocked、離開再接回](workflow.webp){: w="1600" h="900" }
_概念圖：一輪的五個步驟是開 herdr、開工作目錄、跑 agent、找卡住的、離開再接回。prefix 是先按 ctrl+b 放開，再按下一個鍵。_

## 步驟 1：安裝

![安裝 herdr 建議用 brew 或 mise；官方的 curl | sh 一行安裝要先下載、看過腳本再執行](install.webp){: w="1600" h="900" }
_概念圖：左邊是本站建議的做法，用 brew 或 mise 安裝與升級；右邊是官方 Install／TUI 頁的一行安裝，若要用，先下載腳本、看過再執行。_

我建議已經在用 [Homebrew](https://formulae.brew.sh/formula/herdr) 的人用 `brew install herdr`，已經在用 [mise](https://mise.jdx.dev/) 的人用 `mise use -g herdr`。這兩種都列在官方[Install](https://herdr.dev/tui/docs/0.9.5/install/)頁。

官方 Install／TUI 頁另外提供一行安裝指令 `curl -fsSL https://herdr.dev/install.sh | sh`。我建議不要直接貼上執行，原因有兩個。第一，這樣跑的是伺服器當下回傳、你沒看過的內容，下次執行也可能不一樣。第二，它會裝到 `~/.local/bin`，之後靠 `herdr update` 自己更新，不會出現在套件管理器的清單裡，日後比較難查到裝了什麼、也比較難移除；用 brew 或 mise 裝，版本查得到，升級和移除也都用同一套指令。這不是說安裝腳本有問題，而是出於「先看過再執行」的習慣，原因見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

若一定要用官方腳本，先把它下載成檔案：

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

用文字編輯器打開看過（也可以在終端機執行 `less herdr-install.sh`，看完按 `q` 離開），確認沒問題再執行 `sh herdr-install.sh`。看不懂腳本在做什麼的話，就改用 brew 或 mise。

用 mise 時若出現 `herdr not found in mise tool registry`，依官方說法，先更新 mise 再試一次（用 brew 裝的 mise 執行 `brew upgrade mise`，其他方式裝的可執行 `mise self-update`）。

裝好後執行 `herdr --version`，依官方文件，應該會顯示版本號（例如 0.9.5）。若你使用中文、日文或韓文輸入法，且 prefix 快捷鍵沒反應，請確認是 0.9.5 或更新的版本；官方在這一版修過這個問題。

更新時，用 brew 裝的請用 `brew upgrade herdr`，用 mise 裝的請用 `mise upgrade herdr`。官方原文是：「Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead.」套件管理器更新之後，再輸入一次 `herdr` 就會用新版畫面接上，原本在跑的背景 server 和 agent 不受影響。若要連 server 端也換成新版，先執行 `herdr server stop`（會停掉所有正在跑的 agent，見步驟 6），再輸入 `herdr` 重新啟動，見 Install 頁的 Update 節。

## 步驟 2：在專案資料夾開 herdr

在終端機用 `cd` 進入專案資料夾（例如 `cd ~/projects/demo-app`），再輸入 `herdr`。依[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)，它會啟動或接上預設的背景 session；這個 session 還沒有 workspace 時，會自動開一個，也就是下圖側欄的 demo-app。之後每開一個 worktree，會再多一個 workspace（步驟 3）。

![herdr 實際畫面：側欄是 demo-app workspace，兩個 pane 分別跑 git 和 build](screen-main.webp){: w="1600" h="900" }
_實際畫面：在 demo-app 資料夾開 herdr，再用 prefix+v 分出第二個 pane。這兩個 pane 跑的是一般 shell，不是 agent，所以 agents 區是空的。_

herdr 可以全程用滑鼠操作：點一下就能切換 pane、tab、workspace 和 agent，也可以拖邊界調整大小、按右鍵分割。官方的說法是滑鼠能完成所有操作，鍵盤快捷鍵是選用的；下文列出的快捷鍵，記不住也沒關係。

## 步驟 3：每個工作目錄一個 workspace

本站的做法是：每個 worktree 配一個 workspace，讓每個 agent 只改自己的那份工作目錄，兩個 agent 不會同時改到同一個檔案，這和 worktree 篇的原則相同。開法有兩種，選一種即可，底層都是 `git worktree`。做完之後怎麼合併、怎麼刪分支，以及為什麼有 submodule 的 repo 不建議用 worktree，請看[git worktree 教學：讓兩個 AI 在同一個 repo 分開工作](/posts/git-worktree-parallel-ai-agents/)。

**做法 A：用 herdr 開。** 在專案的 workspace 裡按 `prefix+shift+g`（側欄的 workspace 那一列也有 `New worktree` 可選），會跳出 new worktree 視窗。分支欄一開始會填好隨機名稱，先按 ctrl+c 清掉，輸入你要的分支名稱（例如 `login-page`），再按 Enter。herdr 會建好 git worktree，並把它開成一個新的 workspace，排在原專案底下；點側欄的名稱就能切換。這個操作等同在專案資料夾內執行：

```bash
herdr worktree create --branch login-page
```

![按 prefix+shift+g 跳出 new worktree 視窗，分支填 login-page，下方是資料夾位置](screen-worktree.webp){: w="1600" h="900" }
_實際畫面：按 prefix+shift+g 開 worktree。分支欄一開始會填好隨機名稱，先按 ctrl+c 清掉再輸入；按 Enter 會建好並開成新的 workspace。_

預設位置是 `~/.herdr/worktrees/<repo>/<分支>`，可在 `~/.config/herdr/config.toml` 的 `[worktrees] directory` 更改，見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)。

**做法 B：沿用 worktree 篇。** 先在專案資料夾內用 git 開好資料夾，例如：

```bash
git worktree add -b login-page ../demo-app-login-page
```

再在 herdr 按 `prefix+shift+n` 開新的 workspace，然後在裡面執行 `cd ../demo-app-login-page`，進入剛才開好的資料夾。

關掉 workspace（`prefix+shift+d`）不會刪掉資料夾，也不會刪掉分支；依官方說明，關掉專案那一列時，排在它底下的 worktree workspace 也會一起關掉。要刪掉 worktree 的資料夾，在側欄選那個 worktree 的 workspace（排在專案底下的那一列），用 `Delete worktree checkout...`（底層是 `git worktree remove`），或自己執行 `git worktree remove`；分支要另外刪。

同一個 workspace 裡若還要多開一個終端機，例如跑測試，就分割 pane：`prefix+v` 向右，`prefix+minus` 向下。

## 步驟 4：在 pane 裡啟動 agent

切到要工作的 workspace，在 pane 裡輸入 `claude` 或 `codex`，就跟在一般終端機啟動一樣。依 Quick start，herdr 會自動認出這是哪個 agent，側欄的 agents 區會多出一列。官方還支援 Cursor Agent CLI、GitHub Copilot CLI、OpenCode 等，完整清單見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)，這裡不一一列出。

整合（integration）是選用的。不裝也能看狀態；裝了之後，herdr 的背景 server 重開時，才能接回同一段對話。安裝指令是 `herdr integration install claude` 或 `herdr integration install codex`，見[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)。它會改 agent 的設定：Claude Code 會多一支 hook 腳本，並在 `settings.json` 加上對應的 hook 設定；Codex 會多一支 hook 腳本、改 `hooks.json`，並在 `config.toml` 開啟 `[features] hooks = true`。可用 `herdr integration uninstall claude`（或 `codex`）移除，但 Codex 的 `config.toml` 不會被改回去。hook 是什麼，可參考[Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

## 步驟 5：看狀態，找出卡住的那個

![herdr 的五種狀態：blocked、working、done、idle、unknown，各代表什麼、你該做什麼](states.webp){: w="1600" h="900" }
_概念圖：五種狀態的意思，以及本站建議你該做的事。blocked 要先處理；新的提示畫面可能先顯示成 idle，看到 idle 也不代表可以不看內容就按「允許」。圖上的顏色是本站配圖用的，不是 herdr 介面的配色。_

側欄用不同顏色的圓點標出每個 agent 的狀態；同一個 workspace 裡若有 agent 是 blocked，該 workspace 自己的那一列也會換成 blocked 的顏色。側欄只有圓點，要看到寫成文字的狀態名稱（working、blocked、done、idle），得按 `prefix+g` 打開 Go to 清單。官方定義了五種狀態；表格最右欄「你該做什麼」是本站的建議。

| 狀態 | 官方定義（白話） | 本站建議你該做什麼 |
| --- | --- | --- |
| blocked | 在等你回答、核准或做決定 | 先處理：打開看清楚再回答 |
| working | 正在跑 | 不用管，讓它做 |
| done | 做完了，你還沒看 | 去看結果、檢查改了什麼 |
| idle | 做完了或在等下一個指示，而且你已經看過 | 可以交代下一件事 |
| unknown | herdr 認不出狀態 | 自己點進去看一眼 |

![herdr 側欄：worktree workspace 排在 demo-app 底下，agents 區用圓點顏色標狀態](screen-states.webp){: w="1600" h="900" }
_實際畫面（herdr 預設主題）：黃點 working、紅點 blocked、青綠點 done、空心綠圈 idle。示範用的「agent」是用 herdr pane report-agent 回報狀態的 shell 腳本，不是 Claude Code 或 Codex。_

要快速找到卡住的 agent，按 `prefix+g` 打開 Go to 清單，再按 `b` 只看 blocked（`w` 看 working、`i` 看 idle、`d` 看 done、`a` 看全部），用方向鍵選好後按 Enter 跳過去。

![Go to 清單依 workspace 分組，每列寫出 idle、working、blocked 或 done](screen-goto.webp){: w="1600" h="900" }
_實際畫面：按 prefix+g 開 Go to，狀態直接寫成文字；再按 b 只留下 blocked 的那一列，按 Enter 跳過去。清單裡示範的「agent」是用 herdr pane report-agent 回報狀態的 shell 腳本，不是 Claude Code 或 Codex。_

herdr 預設不會跳出通知（設定檔裡 `[ui.toast]` 的 `delivery` 預設是 `off`）。要開啟通知，打開設定檔 `~/.config/herdr/config.toml`（沒有就自己建立），加上：

```toml
[ui.toast]
delivery = "herdr"
```

存檔後執行 `herdr server reload-config`（或按 `prefix+shift+r`），設定就會生效。設成 `herdr`，提示會出現在 herdr 畫面裡；設成 `system`，則改用作業系統的通知。macOS 用 `system` 時會優先透過 terminal-notifier 發通知，官方建議先 `brew install terminal-notifier`，其他選項見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)或[Config reference](https://herdr.dev/tui/docs/0.9.5/config-reference/)。

依官方[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)頁的原文，blocked 的判斷刻意從嚴：herdr 沒見過的新提示畫面，一開始可能顯示成 idle，而不是 blocked；而且「idle status is not authorization to approve an action」，也就是看到 idle，不代表可以直接核准。跳過去之後，要看清楚再按允許。這一點和[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)裡談的過度信任、審批疲勞是同一件事。

## 步驟 6：離開，再接回來

要離開時，按 `prefix+q`（先 `ctrl+b` 再 `q`），或直接關終端機視窗。依 Quick start，server 和裡面的 agent 會繼續跑；之後再輸入 `herdr`，就會接回同一個 session。

什麼會留下、什麼不會，官方[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)有表。白話來說：只是離開，全部繼續跑。但 herdr 的背景 server 重開、電腦重開或關機時，原本在跑的程式（包括 agent）都會結束（README 原文：「the original processes do not survive」）。重新輸入 `herdr` 後，workspace、tab、pane 的版面會恢復；agent 的對話則只有裝了整合（步驟 4）才能接回來。

全部收工用 `herdr server stop`。官方說明是結束這個 session，並停止裡面的 pane。請注意：這會停掉所有 pane 裡正在跑的 agent。

## 整理一下：一輪的用法，加上快捷鍵速查

一輪就是圖上的五步：在專案資料夾開 herdr，為每個任務開一個 worktree，在各 pane 啟動 agent，用側欄或 Go to 找出 blocked 的，離開後再輸入 `herdr` 接回。

`ctrl+b` 是 prefix：先按它並放開，再按下一個鍵。官方[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)把這句寫成：「`prefix+c` means: press `ctrl+b`, release, then press `c`.」忘記時按 `prefix+?` 可看全部快捷鍵。

| 按鍵 | 作用 |
| --- | --- |
| `prefix+v`／`prefix+minus` | 向右／向下分割 pane |
| `prefix+h`／`j`／`k`／`l` | 移到左／下／上／右邊的 pane |
| `prefix+c` | 新 tab（會先跳出命名視窗，按 Enter 建立） |
| `prefix+w` | 打開 workspace 導覽，切換 workspace |
| `prefix+shift+n` | 新 workspace |
| `prefix+shift+g` | 新 worktree |
| `prefix+shift+d` | 關掉選取的 workspace |
| `prefix+g` | 打開 Go to（再按 `b` 只看 blocked） |
| `prefix+z` | 放大目前 pane |
| `prefix+x` | 關掉目前 pane |
| `prefix+q` | 離開（detach） |
| `prefix+?` | 看全部快捷鍵 |

## 什麼情況怎麼做

| 情況 | 建議 |
| --- | --- |
| 只跑一個 agent | 不一定要用 herdr；覺得視窗已經夠用，可以先不裝 |
| 兩三個 agent 各改不同功能 | 本站建議一個 worktree 配一個 workspace |
| 想讓 agent 跑著、人先離開 | `prefix+q` 離開；之後再輸入 `herdr` 接回 |
| 用 SSH 連遠端機器做事 | 直接在遠端執行 `herdr`，斷線後工作仍可繼續；或用 `herdr --remote <主機>`，見[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| 狀態看起來不對 | 用 `herdr agent explain <目標>` 查看判斷依據，見[Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| 要全部停掉 | `herdr server stop`（會停掉所有 pane 裡的 agent） |
| 用 brew／mise 裝的要更新 | `brew upgrade herdr` 或 `mise upgrade herdr`，不要用 `herdr update` |
| 不想讓 herdr 在背景連 herdr.dev | 在設定檔的 `[update]` 底下加上 `version_check = false` 和 `manifest_check = false`，見[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## 常見誤解

- 「關掉視窗，工作就停了。」只是離開的話，server 和 agent 會繼續跑。
- 「有 herdr，就算重開機也不會中斷。」原本在跑的程式不會活下來，只會恢復版面；對話要裝了整合才接得回來。
- 「顯示 idle 就代表沒事，可以直接按允許。」新的提示畫面可能先被判成 idle；idle 不是授權。
- 「herdr 會取代 Claude Code 或 Codex。」不會，它只管理終端機。
- 「關掉 worktree 的 workspace，就會刪掉資料夾。」不會，也不刪分支。
- 「用 brew 裝的也可以 `herdr update`。」官方說要用套件管理器更新。

## 結論與下一步

每個 AI 一個 pane，看側欄找 blocked，離開後再接回來。若要在遠端機器上這樣做，見[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/)。官方也提供讓 agent 自己操作 herdr 的 skill：`herdr --skill` 會印出與目前版本相符的內容。裝任何第三方 skill 之前，都先讀過內容，原因見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

延伸閱讀： [herdr README](https://github.com/herdrdev/herdr)、[v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)、[文件首頁](https://herdr.dev/tui/docs/0.9.5/)、[Install](https://herdr.dev/tui/docs/0.9.5/install/)、[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)、[Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/)、[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)、[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)、[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)、[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)、[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)、[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)、[Homebrew formula](https://formulae.brew.sh/formula/herdr)。
