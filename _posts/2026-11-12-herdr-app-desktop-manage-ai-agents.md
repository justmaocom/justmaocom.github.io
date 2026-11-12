---
title: "用 Herdr 桌面 App 管好一群 AI：space、分頁和 agent 狀態列入門"
description: "用 Herdr 桌面 App 把每個 repo 放進 space、每件工作放進分頁，從 agents 側邊欄一眼看出哪個 AI 在等你；本文依 v0.1.15 官方文件，說明安裝、四種狀態、關窗後的行為與遙測設定。"
date: 2026-11-12 17:00:00 +0800
categories: [AI, 軟體開發]
tags: [coding-agent, workflow, claude-code, codex]
media_subpath: /assets/img/posts/herdr-app-desktop-manage-ai-agents/
image:
  path: cover.webp
  alt: "在 Herdr 桌面 App 用 space 和分頁整理多個 repo 的 AI，從側邊欄看出哪個在等你。"
---

同時讓好幾個 AI 在不同的專案裡寫程式，最常卡住的地方是：不知道哪一個停下來在等你回答，只好一個視窗一個視窗切過去看。

Herdr 桌面 App（程式名稱 herdr-app）就是處理這件事的工具。依官方 README 的介紹，它是給終端機和 coding agent 用的桌面 App：把工作分進一個個 space，讓你看出哪些 agent 需要你，而且關掉視窗後，終端機裡的程式還會繼續跑。依官方首頁，它是免費的，App、herdr-core 和 Herdr TUI 都以 Apache 2.0 授權開源。

這篇是照著做的入門：裝好 App、從分頁列開一個 agent、用 space 和分頁整理工作、從 agents 側邊欄找出在等你的那個，再說明關掉視窗之後會怎樣，以及遙測、自動更新和 mod 的安全注意事項。快捷鍵記不住也沒關係，command palette 可以用名字找到每個動作，還會列出它的按鍵。

本文依官方文件整理，沒有附 App 的畫面截圖；文中三張圖都是本站畫的概念圖。

> **版本說明**：本文依 herdr-app v0.1.15（2026-11-11 台北時間發布；2026-11-12 確認 releases.herdr.dev 和 Homebrew 上都還是這一版）的官方文件撰寫。Herdr App 還沒到 1.0，更新很快，操作方式與快捷鍵請以[官方 README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)為準。
{: .prompt-info }

## 先說幾個詞

- **終端機（terminal）**：輸入指令的文字視窗。macOS 的「終端機」App、Windows 的 PowerShell 都是。
- **repo**：用 git 管理的專案資料夾。本文說「一個 repo」，可以想成「一個專案」。
- **agent（coding agent）**：在終端機裡跑、會自己讀檔、改程式、執行指令的 AI，例如 Anthropic 的 Claude Code、OpenAI 的 Codex。官方說，任何能在終端機執行的程式都能放進 Herdr。
- **桌面 App（herdr-app）**：你看到的那個視窗，負責把終端機排在畫面上。
- **herdr-core（指令是 `hc`）**：在背景真正執行每個終端機和 agent 的程式。視窗關掉或 App 更新時，它和裡面的程式都會繼續跑。README 用一句話講完兩者的分工：「The window arranges terminals. The core runs them.」（視窗負責排版，core 負責執行。）
- **space／分頁（tab）／pane**：Herdr App 由大到小的三層。space 是一台電腦上的一份工作，通常對應一個 repo；分頁是 space 裡的一件工作；pane 是分頁裡的一格畫面，放一個終端機，也可以放 mod 的面板。步驟 3 有圖。
- **OSC 7501**：agent 和 Herdr 之間約好的回報方式，讓 agent 告訴 Herdr 自己在忙、做完了，還是在等你。會這樣回報的 agent，Herdr 才顯示得出它的狀態；不會的照樣能跑，只是沒有狀態。
- **SSH**：從一台電腦連到另一台電腦、在那台電腦上操作的方式。Herdr 用 SSH 連到你的其他電腦或伺服器，手機 App 也是透過 SSH 連線。
- **遙測（telemetry）**：App 送回給開發者的使用統計。依官方文件，Herdr App 預設開啟，每天送一份小報告。
- **mod 和 layout**：mod 是在 Herdr 裡執行的 JavaScript 小程式，例如放在 pane 裡的面板；layout 是整個視窗的版面，內建的有 Herdr、Terminals 和 Herdr 98。依官方文件，mod 擁有完整權限，沒有放在沙箱（sandbox，把程式隔離起來、限制它能碰哪些東西的機制）裡，後面會再說明。

## 先分清楚：Herdr App 和 Herdr TUI 是兩個程式

herdr.dev 上有兩個名字很像的程式。依官方 FAQ：

- **Herdr TUI** 是最早的 Herdr：整個介面都在終端機裡，由它自己的背景程式（server）執行 agent。官方說它照常可用，相關資料都在 [herdr.dev/tui](https://herdr.dev/tui/)。
- **Herdr App** 是另一個新的、獨立的程式，有自己的桌面視窗，建在 herdr-core 上，也就是這篇要講的。

兩者**不共用 agent**：依官方 FAQ，在其中一個啟動的 agent，不會出現在另一個裡。手機 App 只支援 herdr-core（隨 Herdr App 附帶），不支援 Herdr TUI。依手機 App 頁面，Herdr TUI 和 herdr-core 可以同時裝在同一台電腦上。

怎麼選：本站建議挑一個當主力。因為 agent 不共用，兩邊各開幾個，又會回到「不知道誰在等你」的老問題。想留在終端機裡用的，看[同時跑好幾個 AI，不再找不到卡住的那個：herdr 入門](/posts/herdr-run-multiple-ai-agents/)；想要一個桌面視窗、或想用手機查看 agent 的，繼續往下讀。

## 什麼時候適合用

- 同時讓兩個以上的 agent 在不同 repo 或不同工作上跑，想在一個視窗裡看出哪個在等你：適合。
- 想關掉視窗、讓 agent 繼續做事：適合。依官方文件，關掉視窗不會停掉終端機（見步驟 5）；放在 SSH 機器上的工作，筆電睡眠時也會繼續（見步驟 6）。
- 只跑一個 agent，而且目前的做法已經順手：不一定要換（本站看法）。

## 開始前要準備

- 一台支援的電腦。依官方 FAQ：macOS（Apple Silicon，也就是 M1 之後的 Mac）、Linux（x86_64 和 arm64）、Windows（x86_64）。Linux 要在有圖形桌面的環境裡執行（desktop session，只有文字畫面的伺服器不行），也要有可用的 Vulkan 驅動（顯示卡驅動程式提供的繪圖功能）。Windows 需要 Windows 10 1803 以上，以及 curl 和 tar 這兩個下載、解壓縮工具；1803 之後的 Windows 已經內建。
- 你要用的 agent 已經裝好，例如 Claude Code 或 Codex：在一般終端機輸入 `claude` 或 `codex`，能正常啟動。依 CHANGELOG 0.1.14，從 + 選單開的每個 Codex 會各自獨立，關掉其中一個不會連帶結束其他的；這需要 Codex 0.156 或更新的版本。

## 步驟 1：安裝

### macOS（Apple Silicon）：dmg 或 Homebrew

兩種選一種即可。沒用過 Homebrew 的話，選 dmg 就好。

**用 dmg**：下載 [Herdr.dmg](https://releases.herdr.dev/app/Herdr.dmg)，雙擊打開，把 Herdr 拖到「應用程式」（Applications）資料夾。

**用 Homebrew**（Mac 上用一行指令安裝軟體的工具）：在終端機執行

```bash
brew install --cask herdr-app
```

依 Homebrew 的 cask 資料，App 會裝到 `/Applications/Herdr.app`，同時多一個 `herdr-app` 指令；資料也標示 App 會自己更新（`auto_updates: true`），更新方式見後面「自動更新怎麼運作」一節。

> **Intel Mac 沒有安裝檔**：README 寫明 macOS 版只提供 Apple Silicon，Intel Mac 要自己從原始碼建置；官方安裝腳本遇到 Intel Mac 也會直接停下。本文不教從原始碼建置。不確定自己的 Mac 是哪一種：點左上角蘋果選單 >「關於這台 Mac」，「晶片」寫 Apple M 開頭的就是 Apple Silicon，寫「處理器」和 Intel 的就是 Intel Mac。
{: .prompt-warning }

### Linux 與 Windows：先下載腳本、讀過再執行

Linux 和 Windows 官方只提供安裝腳本（另一條路是從原始碼建置）。安裝腳本是一份寫好的指令清單，執行後會自動下載並安裝 App。README 自己就提醒，這兩個安裝腳本會下載並執行程式碼，想先讀過可以先讀。

官方 README 給的 Linux 寫法是 `curl -fsSL https://releases.herdr.dev/app/install.sh | sh`。中間的 `|` 會把下載到的內容直接交給 `sh` 執行，等於下載完立刻執行，你沒有機會先看。本站建議拆成兩步。先下載成檔案：

```bash
curl -fsSL https://releases.herdr.dev/app/install.sh -o herdr-app-install.sh
```

用文字編輯器打開讀過，確認看得懂、沒問題，再執行：

```bash
sh herdr-app-install.sh
```

看不懂腳本在做什麼，就先別執行。依腳本開頭的註解和內容，它在 Linux 上會：

- 把 App 裝到 `~/.local/share/herdr-app`，把 `herdr-app` 指令放到 `~/.local/bin`，並加上啟動器和圖示。
- 只有在機器上還沒有 herdr-core 時，才把它裝到 `~/.local/bin/herdr-core`（連同 `hc`）；之後由 App 讓它保持最新。
- 下載發布清單（`latest.json`），比對下載檔的 SHA-256（由檔案內容算出的一串指紋，檔案只要差一點，指紋就不同），不一致就停下來。

`~` 代表你的使用者資料夾（家目錄）。PATH 是終端機找指令時會去看的資料夾清單；安裝程式要求的話，把 `~/.local/bin` 加進去，之後在終端機輸入 `herdr-app` 才找得到。之後再執行一次腳本，就是更新 App。這支腳本也支援 macOS（App 會放在 `~/Applications/Herdr.app`），不過 Mac 使用者本站建議用上面的 dmg 或 Homebrew。

**Windows**（x64、Windows 10 1803 以上）：官方寫法是在 PowerShell 執行 `irm https://releases.herdr.dev/app/install.ps1 | iex`（下載頁寫成 `powershell -c "irm https://releases.herdr.dev/app/install.ps1 | iex"`），一樣是下載完直接執行。本站建議同樣拆成兩步。先在 PowerShell 把腳本下載成檔案：

```powershell
irm https://releases.herdr.dev/app/install.ps1 -OutFile herdr-app-install.ps1
```

用記事本打開讀過，確認沒問題，再執行你剛讀過的這份：

```powershell
Get-Content .\herdr-app-install.ps1 -Raw | iex
```

這一行和官方寫法一樣交給 `iex` 執行，差別在執行的是你讀過的那份檔案，不是重新下載的另一份。不要讀完再跑官方那一行，那會重新下載，跑的不一定是你讀過的內容。看不懂就先別裝。

依腳本開頭的說明，安裝不需要系統管理員權限。裝好後 Herdr 會出現在開始功能表，安裝程式會把 `%LOCALAPPDATA%\Programs\herdr-app` 加進使用者的 PATH，要開一個新的終端機視窗才會生效。之後再執行一次腳本，就是更新 App。

### 裝好之後：herdr-core 從哪裡來

Herdr App 只負責排版，真正執行終端機的是 herdr-core。大多數人不用另外處理它。依官方文件：

- 用腳本安裝：機器上還沒有 herdr-core 的話，腳本會一起裝；已經有就不重裝。
- 用 dmg 或 Homebrew 安裝：依官方說法，App 會在你還沒有 herdr-core 時幫你設定好；找到的 core 不能用時，也會協助你安裝或更新。
- App 會在 PATH、`~/.local/bin`、Homebrew、mise、Nix、cargo 這些地方找 core。後面四個都是安裝開發工具的管道，沒用過可以略過。
- 連不到正在執行的 core 時，App 會說明原因和修法（CHANGELOG 0.1.14）。

## 步驟 2：打開 App，從分頁列的 + 開一個 agent

依下載頁，打開 Herdr 之後，從分頁列（tab bar）的 **+** 開一個 agent，例如 Claude Code 或 Codex；+ 選單也能開一般的終端機。你也可以在 pane 裡輸入 `claude` 這類指令直接啟動 agent，就跟在一般終端機裡一樣。習慣用 tmux 的人要注意，官方 FAQ 提醒要直接在 Herdr 的 pane 裡跑 agent，不要包在 tmux 裡（理由見步驟 4）。

幾件要知道的事：

- macOS 第一次使用時，系統可能會問 herdr-core（或 Herdr Core）能不能存取「文件」這類資料夾、區域網路或麥克風。依 CHANGELOG 0.1.12 和 0.1.13，那就是 Herdr 的一部分，按「允許」即可。
- agent 結束後，它所在的終端機不會跟著關掉，會留下來等你輸入下一個指令。如果 agent 一啟動就失敗，依內建指南，Herdr 會跳出錯誤通知，附上錯誤代碼和最後幾行輸出，方便你查原因。
- 依 README，新分頁會從目前選取的終端機（游標所在的那個）正在用的資料夾開始。所以要讓 agent 在某個 repo 裡工作，先在目前的終端機用 `cd` 切到那個 repo 的資料夾（例如 `cd ~/projects/web-app`），再開新分頁。
- 沒有命名的 space 會跟著它第一個終端機的資料夾走；想要一個固定不變的標籤，就替 space 或分頁命名（預設按鍵：分頁 `f2`、space `shift-f2`）。
- 如果你在 macOS 上用的是比 0.1.15 舊的版本，剛登入或重開機後，+ 選單可能把每個 agent 都標成「not installed」；0.1.15 已修正。

## 步驟 3：認識 space、分頁、pane

![一台機器裡有多個 space，每個 space 有多個分頁，每個分頁分成幾個 pane，各跑一個 agent](structure.webp){: w="1600" h="900" }
_概念圖：一台機器 → space（通常是一個 repo）→ 分頁（一件工作）→ pane（一個終端機，可以各跑 Claude Code 或 Codex）。_

依官方 README，三層的分工是：

- **space**：一台電腦上的一份工作，通常是一個 repo。
- **分頁（tab）**：space 裡的一件工作，包含它的終端機，以及這些終端機怎麼左右、上下分割。關掉 space 裡最後一個分頁，space 也會跟著關掉；依內建指南，這時 Herdr 會先問你確定不確定。
- **pane**：分頁裡的一格畫面，放一個終端機，或放在終端機旁邊的 mod 面板。

官方首頁建議每個 repo 一個 space、每件工作一個分頁。例如同一個 repo 裡，一個分頁讓 Claude Code 做登入頁，另一個分頁讓 Codex 修測試；需要一邊看 agent、一邊自己跑測試時，再把分頁分割成兩個 pane。

分割 pane：macOS 按 `cmd-d` 往右、`cmd-shift-d` 往下；Linux／Windows 按 `ctrl-shift-o` 往右、`ctrl-shift-e` 往下。

### 預設快捷鍵

依官方預設按鍵檔（[macOS](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json)、[Linux／Windows](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json)）整理。`cmd-shift-p` 的意思是同時按 Command、Shift 和 P。Mac 上的 `cmd` 是 ⌘ Command 鍵，`ctrl` 是 control 鍵，兩個不一樣。其他動作和它們的按鍵，可以按 `cmd-shift-p`（Linux／Windows 是 `ctrl-shift-p`）打開 command palette 查看。

| 動作 | macOS | Linux／Windows |
| --- | --- | --- |
| 新 space | `cmd-n` | `ctrl-shift-n` |
| 新分頁 | `cmd-t` | `ctrl-shift-t` |
| 關掉分頁 | `cmd-w` | `ctrl-shift-w` |
| 往右分割 pane | `cmd-d` | `ctrl-shift-o` |
| 往下分割 pane | `cmd-shift-d` | `ctrl-shift-e` |
| 關掉 pane | `cmd-shift-w` | `ctrl-shift-x` |
| 放大目前 pane | `cmd-shift-enter` | `ctrl-shift-z` |
| 下一個／上一個 agent | `cmd-]`／`cmd-[` | `alt-down`／`alt-up` |
| 顯示／隱藏側邊欄 | `cmd-b` | `ctrl-shift-b` |
| 切到第 1–9 個分頁 | `cmd-1`…`cmd-9` | `ctrl-1`…`ctrl-9` |
| 切到第 1–9 個 space | `ctrl-1`…`ctrl-9` | `alt-1`…`alt-9` |
| 重新命名分頁／space | `f2`／`shift-f2` | `f2`／`shift-f2` |
| command palette | `cmd-shift-p` | `ctrl-shift-p` |
| 設定（Settings） | `cmd-,` | `ctrl-,` |
| 說明 | `cmd-/` | `ctrl-shift-/` |

### 搭配 git worktree

如果你照[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)，替每個 agent 開了一份獨立的工作目錄（worktree），本站建議每個 worktree 開一個 space，或至少給它一個自己的 pane，讓每個 agent 只在自己的那份目錄裡改檔。App 本身也能管理 worktree。依內建指南，space 選單和 + 選單裡有 New worktree（新增）、Open worktree（打開已有的）和 Remove worktree（移除）；新增的 worktree 會放在那台機器的 `~/.herdr/worktrees/<repo 名稱>/<分支名稱>`，Spaces 側邊欄會把這些 worktree 的 space 收在原本 repo 的 space 底下。

## 步驟 4：看 agents 側邊欄，找出在等你的那個

![agents 側邊欄的四種狀態 Working、Blocked、Done、Idle，各代表什麼、你該做什麼](agents.webp){: w="1600" h="900" }
_概念圖：四種狀態的意思，以及本站建議的處理方式；沒有 pane 的 worker，點一下會以 peek 開在目前的分頁上。圖上的顏色是本站配圖用的，不是 App 介面的配色。_

依 README，agents 側邊欄會把各個 space 裡的 agent 集中成一張清單，也包括由另一個 agent 啟動的程式（官方稱為 worker）。會回報狀態的 agent，狀態有下面四種。最右欄是本站的建議。

| 狀態 | 官方定義（白話） | 本站建議你該做什麼 |
| --- | --- | --- |
| Working | 還在忙 | 不用管，讓它做 |
| Blocked | 在等你 | 先處理：點進去看清楚它要什麼，再回答 |
| Done | 在你看別的地方時做完了 | 去看結果，檢查它改了什麼 |
| Idle | 沒在工作，或已經做完而且你看過了 | 可以交代下一件事 |

- space 和分頁本身也會顯示狀態，取它裡面最急的那個 agent，順序是 blocked > done > working > idle。所以看到某個 space 是 blocked，就代表裡面至少有一個 agent 在等你。
- Done 在你看過之後，會變成 Idle。
- 點一下 agent 就能跳過去看它。沒有 pane 的 worker 會以 **peek** 的方式打開，像一個暫時的預覽視窗，蓋在你目前的分頁上面；想讓它一直放在其他工作旁邊，可以把它留成一個分頁。
- 也可以用按鍵跳到下一個／上一個 agent：macOS 是 `cmd-]`／`cmd-[`，Linux／Windows 是 `alt-down`／`alt-up`。
- Herdr 會給每個終端機一個位址（代號）。終端機的文字裡如果出現正在執行的終端機位址，例如 `t7`（同一台電腦上的終端機）或 `vps/t7`（名為 vps 的另一台電腦上的），按住 Ctrl 點一下（macOS 是 Cmd）就能 peek。

聲音和通知：依內建指南，agent 需要你、或在你沒看的時候做完，Herdr 會播放聲音；你沒在看時，還會跳出可以點的通知（toast）。聲音在 `settings.json` 的 `sounds` 設定，也可以在 Settings > Alerts 試聽。

### 狀態沒出現時

依官方 FAQ 逐項檢查：

1. **agent 不會回報狀態。** 只有會用 OSC 7501 回報的 agent 才有狀態，其他的照樣能跑，只是沒有狀態。依 herdr-core 頁面，herdr-core 不讀畫面上的文字，也沒有內建的 agent 清單，不會用猜的。舊版的 agent 可能還不會回報，先把 agent 更新到新版。
2. **agent 跑在 Herdr 裡再開的 tmux 裡。** 這樣狀態回報不到 Herdr，請直接在 Herdr 的 pane 裡跑 agent。沒用過 tmux 的話，這項可以跳過。
3. **agent 是在 Herdr TUI 裡啟動的。** 它活在 TUI 自己的 server 裡，不會出現在 App。

## 步驟 5：關掉視窗之後會怎樣

依 README 與官方 FAQ：

| 你做了什麼 | 終端機和 agent 會怎樣 |
| --- | --- |
| 關掉 App 視窗 | 繼續在 herdr-core 裡跑 |
| 結束 App（macOS 按 `cmd-q`）或更新 App | 繼續跑，什麼都不變 |
| 關掉 pane 或分頁 | 裡面的終端機結束 |
| 重開機、登出，或 herdr-core 停止、當掉 | 裡面的程式也會停 |

重開機或 core 停掉之後，保留下來的 pane 會回來，在原本的資料夾開一個新的 shell（終端機裡等你輸入指令的程式），終端機位址也不變；但原本執行的指令不會再跑，Herdr 也不會幫你重新啟動 agent 或接續做到一半的工作。官方 FAQ 的說法是，自己把 agent 再開起來，接著做就好。

另外，自己結束或被強制結束的終端機會被關掉，不會自動重開。

> **剛從舊版升上來的 Mac 使用者**：依 CHANGELOG 0.1.15，在 herdr-core 0.1.20 之前開的終端機，仍可能在 Herdr 結束時跟著結束。core 更新到 0.1.20 以上之後（Settings > Updates 看得到版本），把那些終端機關掉重開，或重開機一次。
{: .prompt-tip }

## 步驟 6（選用）：加入 SSH 機器、用手機查看

### 加入另一台機器

這一步適合有另一台電腦或雲端伺服器、而且已經能用 SSH 連上去的人；沒有的話可以跳過。

依 README，從 Settings → Machines，或側邊欄的 Add machine 加入 SSH 機器：從你的 SSH 設定檔挑一台主機，或直接輸入 SSH 要怎麼連到它。之後，那台機器上的 space，終端機都在那台機器上跑，不是在你的電腦上。

- 那台機器也要有 herdr-core。依 CHANGELOG 0.1.14，如果連線需要密碼、要接受新的 host key（SSH 用來確認主機身分的金鑰），或那台機器還沒裝 herdr-core，Settings > Add machine 會告訴你要執行什麼。
- 只要遠端機器和它的 core 還在跑，本機視窗關掉、筆電睡眠，遠端的工作都會繼續。
- 依官方首頁，Herdr 透過 SSH 連線，也可以搭配 Tailscale（把自己的幾台裝置連成一個私人網路的服務）；你的手機和電腦直接連到你的機器，不需要 Herdr 帳號，終端機內容也不經過官方。

### 用手機查看

官方有手機 App，支援 iPhone、iPad 和 Android，可從 [App Store](https://apps.apple.com/app/id6828898364) 和 [Google Play](https://play.google.com/store/apps/details?id=dev.herdr.app) 下載。依[手機 App 頁](https://herdr.dev/mobile/)：

- 手機透過 SSH 直接連到每台機器上的 herdr-core，不需要 Herdr 帳號，中間也沒有官方的伺服器。
- Inbox 依急迫程度排序：需要你、做完、在忙、閒置。
- 打開一個 agent，就是真正的終端機，可以直接打字；也可以用 compose（輸入訊息的區塊）貼上文字、截圖、照片，或用語音輸入。
- 只支援 herdr-core（Herdr App 附帶的那個），不支援 Herdr TUI。
- 不在家時，可以透過 Tailscale 或任何 VPN 連回你的機器；官方說用 Tailscale SSH 不必另外設定金鑰。
- 只裝 herdr-core 的機器，手機上也看得到終端機和 agent；那台機器也跑著 Herdr App 時，才看得到 space。
- 想先看看長什麼樣子，打開手機 App 時點 Try the demo。
- 官方說手機 App 沒有登入、沒有廣告、沒有追蹤，也沒有分析。

## 步驟 7（選用）：自訂

**command palette**：按 `cmd-shift-p`（Linux／Windows 是 `ctrl-shift-p`），用名字找任何動作，還會列出每個指令的按鍵。

**Settings**：按 `cmd-,`（Linux／Windows 是 `ctrl-,`），可以改字型、顏色、聲音等偏好設定。

**設定資料夾 `~/.config/herdr-app`**：App 的設定都放在你使用者資料夾底下的這個資料夾，macOS 和 Windows 也一樣。設定、按鍵、layout、mod 和自動產生的 agent 指南都在這裡。資料夾名稱以 `.` 開頭的 `.config` 預設是隱藏的，macOS 的 Finder 可以按 `cmd-shift-.` 顯示隱藏檔案。依安全文件，space、分頁和分割方式存在每台機器的 core 裡，不在這個資料夾；刪掉這個資料夾，也不會停掉 core 或清掉它的資料。反過來說，用 Homebrew 移除 App 時如果加上 `--zap`（`brew uninstall --zap herdr-app`），依 cask 資料會連這個資料夾一起丟進垃圾桶，你的設定和 mod 也會跟著不見。（進階：設定了 `XDG_CONFIG_HOME` 或 `HERDR_APP_HOME` 環境變數的話，位置會跟著改。）

**改快捷鍵：`keys.json`**：任何按鍵都能在 `keys.json` 改，格式例如：

```json
{"global": {"ctrl-shift-t": "tab.new"}}
```

這一行的意思是：在任何地方按 `ctrl-shift-t`，都執行「開新分頁」（`tab.new`）。存檔後視窗會重新載入；改壞了會保留上一個能用的版本，並把錯誤寫到 `keys.error`。要注意兩件事。第一，沒動過的按鍵檔，升級時會自動換成新版的預設；只要你改過（就算只改了空白），整個檔案就算你的，之後新增的預設快捷鍵要自己手動加。第二，單純的 ctrl 加字母（例如 ctrl+c、ctrl+d）預設會交給終端機裡的程式，不要拿來綁 Herdr 的動作。

**內建的 layout 和 mod**：要改結構或程式碼前，先複製一份再改。你的複本不會被動到；內建的那份，Herdr 每次啟動都會更新成最新版。

**讓 agent 幫你改：`AGENTS.md`**：依官方首頁，Herdr 把 layout、側邊欄、分頁、按鍵和主題都存成 `~/.config/herdr-app` 裡的一般檔案，裡面的 `AGENTS.md` 會向你的 agent 解釋這些檔案。下載頁的建議是：叫 agent 先讀這份指南，然後用平常說話的方式說出你想要什麼，例如一個看板、每個分頁一個計時器，或換一種外觀。**不要自己改 `AGENTS.md`**：它每次啟動都會由 App 重新寫入，你的修改會被蓋掉。

**`herdr-app --skill`**：印出給 agent 看的視窗操作指南，一般使用者用不到。官方的分工是：執行和協調程式用 herdr-core，改變你看到的畫面用 App。herdr-core 自己的手冊則是 `hc --skill`。

**救急鍵 `ctrl-alt-shift-escape`**：layout 或按鍵改壞、畫面亂掉時，同時按 Ctrl、Alt（Mac 鍵盤上是 Option）、Shift 和 Esc。依內建指南，這組鍵永遠有效、不能被改掉：它會把目前的 layout 和 `keys.json` 移到一旁（改名成 `*.reset-<時間>`），回到預設的 `main` layout。

## 隱私、更新與 mod 安全

![隱私與更新：在 Settings → Privacy 或 settings.json 關掉遙測，在 Settings → Updates 看更新，mod 有完整權限](privacy.webp){: w="1600" h="900" }
_概念圖：在 Settings → Privacy，或在 settings.json 加上 `"telemetry": false` 關掉遙測；在 Settings → Updates 查看更新；mod 擁有完整權限，裝之前先讀過。_

### 遙測預設開啟，三種關法

依官方 [Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md) 文件，使用遙測**預設開啟**：正式版每天送一份小報告到 `https://telemetry.herdr.dev/v1/report`，附一個隨機的安裝 ID。

- 會送的：App 和 core 的版本、作業系統與架構、使用時間和次數落在哪個區間（不是精確數字）、已知 agent 的名稱、內建 layout 的名稱、mod 數量、App 指令名稱、固定事件的計數。自訂 layout 的名稱一律送成 `custom`，自訂 mod 的名稱不送。
- 不送的：終端機文字、prompt、檔案內容、資料夾路徑，以及你自己輸入的名稱。
- 依[隱私頁](https://herdr.dev/privacy/)，使用報告保留 3 個月，不存 IP，不販售也不分享。

三種關法：

1. **Settings → Privacy** 關掉。同一頁也能檢視報告的內容。
2. 在 `~/.config/herdr-app` 裡**現有的** `settings.json` 加上 `"telemetry": false` 這個欄位。官方示範寫成 `{"telemetry": false}`；檔案裡已經有其他設定的話，把這個欄位加進最外層的大括號裡，用逗號和其他欄位隔開，不要把整個檔案換掉。
3. **只關這一次**：從終端機啟動 App 時，設定環境變數 `DO_NOT_TRACK=1` 或 `HERDR_TELEMETRY=0`，例如 `DO_NOT_TRACK=1 herdr-app`。在 CI（自動建置、測試程式的伺服器環境）裡也會自動停止收集。

要知道的兩件事：

- 關掉遙測會刪掉本機的安裝 ID 和還沒送出的報告，但**已經送出的收不回來**。
- 關掉遙測**不會**停止更新檢查、mod 發出的網路請求，以及你自己選擇送出的回饋。回饋會先擬好給你看，由你決定送出，不會偷偷送。

### 自動更新怎麼運作

依 README 和內建指南：

- 安裝版會在背景檢查更新，把新版下載到正在執行的 App 旁邊。等你結束再打開 App，或選擇更新動作時，新版才會接手。終端機繼續在 core 裡跑。
- **Settings → Updates** 顯示有哪些更新，App 和 core 的更新動作都放在這裡。
- 依內建指南，只有少數重點版本會在更新後自動打開 What's New（更新說明）；其他版本只在這次啟動時顯示一個小小的 Updated 標記。想看更新內容，可以從 Settings → Updates 的 What's new 按鈕或 command palette 打開。
- App 更新後第一次啟動，也會把 herdr-core 更新到同一代的最新版，終端機照樣跑。
- 如果 App 當掉或被強制結束時，已經有一個驗證過的新版在等，下次啟動會先裝好它，再打開視窗。
- 從原始碼自己建置的版本不會自動更新。

### 更新的驗證：只比對 SHA-256

> 依官方安全文件，App 在解開更新檔之前，會比對它的 SHA-256 指紋和發布清單上寫的是否一致。但指紋和清單來自同一個服務，這個比對只抓得出下載過程中檔案損壞，不是發布清單上的獨立簽章；App 也不會另外驗證更新清單的數位簽章。換句話說，如果有人能同時換掉更新檔和清單，這道檢查擋不住。安全文件也寫明，發布流程沒有設定簽章憑證時，安裝檔可能沒有簽章，或只有 ad hoc 簽章（沒有綁定開發者身分的簽章）；Apple 公證（notarization，Apple 替 App 做的安全檢查）是另外測試的，不是發布的必要條件。官方的原話是：「Do not assume every download is notarized or signed.」也就是不要假設每個下載都經過公證或簽章。
{: .prompt-warning }

### mod 和別人做的 layout：先讀再裝

> 依官方安全文件，mod 是在 Herdr 裡執行、被信任的 JavaScript，沒有沙箱，權限完整：它能以你的身分執行程式、連上任何網址、讀你的檔案，也能在你連線的其他機器上執行程式。官方明說 mod 不是安全邊界（is not a security boundary），也就是 Herdr 不會替你擋下 mod 做的事，也不會為每個程式或網路請求跳出權限提示。安裝別人的 mod 前先讀過，把它當成你要親手執行的 shell 腳本。layout 也能載入 mod，所以裝別人的 layout 時，它引用的 mod 也要檢查。
{: .prompt-warning }

想從 [gallery](https://herdr.dev/gallery) 找別人做的 layout 或 mod 時，內建指南要求 agent 先讀過 recipe（每個作品附的 `RECIPE.md`，說明它怎麼做出來）和每個檔案，並在加入前告訴你：這個 mod 會不會連網、執行程式（`exec`、`hc`），或讀取它自己資料夾以外的檔案。

還有兩點和設定資料夾有關：

- mod 可能把敏感資料存在 `~/.config/herdr-app`，Herdr 不會加密這個資料夾。
- App 在這個資料夾裡開了一個本機控制 socket（本機程式之間溝通用的連接點），讓 agent 能查看和操作視窗。官方提醒：能存取這個資料夾，就等於能操作視窗和它的指令。

## 整理一下

做完這幾步，你會有一個桌面視窗：每個 repo 一個 space、每件工作一個分頁，從 agents 側邊欄就看得出哪個 agent 在等你。

- 安裝：Apple Silicon Mac 用 dmg 或 `brew install --cask herdr-app`；Linux、Windows 先下載腳本、讀過再執行；Intel Mac 沒有安裝檔。
- 開 agent：從分頁列的 + 開，或直接在 pane 裡啟動；macOS 第一次跳出權限詢問時，按「允許」。
- 整理：一個 repo 一個 space、一件工作一個分頁；要並排就分割 pane。
- 看狀態：先處理 Blocked，再看 Done；沒有狀態，就照「狀態沒出現時」逐項檢查。
- 關掉視窗沒關係；關掉 pane 或分頁會結束裡面的終端機；重開機後，agent 要自己重新啟動。
- 遙測預設開啟，要關就到 Settings → Privacy；關掉不會停掉更新檢查。
- 更新只比對同一服務提供的 SHA-256，不另外驗證簽章。
- 裝別人的 mod 或 layout 前，先讀過每個檔案。

## 下一步

- 想在終端機裡管理 agent：[同時跑好幾個 AI，不再找不到卡住的那個：herdr 入門](/posts/herdr-run-multiple-ai-agents/)（Herdr TUI，和 App 是不同的程式）。
- 讓每個 agent 在自己的工作目錄裡做事：[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)。
- 操作細節以官方 [herdr-app README（v0.1.15）](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)為準。

延伸閱讀：[README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)、[Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md)、[內建指南 AGENTS.md](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/AGENTS.md)、[macOS 預設按鍵](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json)、[Linux／Windows 預設按鍵](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json)、[CHANGELOG](https://github.com/herdrdev/herdr-app/blob/v0.1.15/CHANGELOG.md)、[安裝腳本](https://github.com/herdrdev/herdr-app/blob/v0.1.15/distribution/install.sh)、[herdr.dev](https://herdr.dev/)、[下載頁](https://herdr.dev/download/)、[手機 App](https://herdr.dev/mobile/)、[herdr-core](https://herdr.dev/core/)、[隱私](https://herdr.dev/privacy/)、[Herdr TUI](https://herdr.dev/tui/)、[Homebrew cask](https://formulae.brew.sh/cask/herdr-app)。
