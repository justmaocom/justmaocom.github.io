---
title: "herdr 入门：在终端同时跑多个 AI，找出卡住的那个"
description: "用 brew 或 mise 安装 herdr，为每个 AI 开独立的 worktree 与 pane，从侧栏找出卡住的那个，离开后再接回来。"
date: 2026-11-12 08:00:00 +0800
categories: [AI, 软件开发]
tags: [coding-agent, workflow, git, claude-code, codex]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.zh-CN.webp
  alt: "用 herdr 让每个 AI 各有一个 pane，一眼看出哪个在等你回答，离开后再接回来。"
---

如果你读过[git worktree 教程：让两个 AI 在同一个 repo 分开工作](/posts/git-worktree-parallel-ai-agents/)，已经让两三个 coding agent 同时干活，下一个麻烦通常是：哪个在等你点“允许”、哪个还在跑，得一个窗口一个窗口切过去才知道；而且终端一关，或 SSH 连接一断，做到一半的工作也可能跟着停掉。

herdr 是在终端里管理多个工作区和分屏的工具。它把每个 agent 放进自己的分屏（pane），并在侧栏用不同颜色的圆点标出每个 agent 是在跑、在等你，还是已经做完。就算关掉你看到的界面，后台的工作也能继续。官方的说法是“the runtime your coding agents live on”。

这篇讲的是终端里的 Herdr TUI（[herdr.dev/tui](https://herdr.dev/tui)），不是 herdr.dev 首页现在主要推广的另一个程序 Herdr desktop App（[herdr-app](https://github.com/herdrdev/herdr-app)）。两者是分开的程序，在其中一个里启动的 agent，不会出现在另一个里。桌面 App 的用法另见[Herdr 桌面 App 入门：用 space 与标签页管理多个 AI](/posts/herdr-app-desktop-manage-ai-agents/)。

这篇以 macOS 和 Linux 为主，用 Claude Code 与 Codex 当例子（官方还支持其他 agent，见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)）。Windows 已有原生支持，但有已知限制，细节见[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)，本文不讲 Windows 安装。

> **版本说明**：本文依 herdr v0.9.5（2026-10-15 发布，2026-11-12 确认仍是最新稳定版）的官方文档撰写。herdr 仍是 0.x 版，更新很快，命令与快捷键以[官方文档](https://herdr.dev/tui/docs/0.9.5/)为准。
{: .prompt-info }

## 先说几个词

- **终端（terminal）**：输入命令的文本窗口。
- **herdr**：在终端里管理多个工作区和分屏的工具，会认出每个分屏里跑的是哪个 coding agent，并显示它现在的状态。官方也称它为 terminal workspace manager。
- **workspace／tab／pane**：herdr 的三层。workspace 是一个项目或任务（官方建议 one workspace per repo, task, or investigation）；tab 是 workspace 里的一个布局；pane 是真正的终端分屏（官方：“A pane is a real terminal.”）。
- **后台 server／client**：herdr 把终端放在后台的 server 里跑；你看到的界面是接上去的 client。关掉界面，server 和里面的 agent 继续跑。
- **detach（离开）／reattach（接回）**：暂时离开界面，之后再接回同一个 session。
- **prefix 键**：先按下 `ctrl+b` 再松开，接着按下一个键。Mac 上是 control 键，不是 command 键。例如 `prefix+shift+g`，就是按一下 `ctrl+b` 松开，再按 `shift+g`。用过 tmux 的人会觉得眼熟。
- **包管理器**：像 Homebrew（`brew`）和 mise 这类帮你安装、升级、卸载工具的程序。
- **coding agent、worktree、分支**：沿用 worktree 篇的说法——agent 会自己改文件、跑命令；worktree 是同一个 repo 里另一份独立的工作目录；分支是 git 里一条独立的修改记录，每份工作目录各自停在一条分支上。

以下的命令、快捷键、状态定义和断线后的行为，都以官方文档为准并附上链接；“建议用 brew 或 mise 安装”“一个 worktree 配一个 workspace”“先处理 blocked”则是本站的做法，文中会注明。

## 什么时候用、什么时候不用

- 同时跑两个以上的 agent，或经常要离开座位、用 SSH 连远程机器：值得用。
- 只跑一个 agent，或已经有顺手的安排：不一定要换。
- herdr 不会取代或包住你的 agent。官方 README 写：“herdr doesn't wrap or replace them; it owns their terminals.”它管的是终端，agent 还是你原来用的那个。

## 开始前要准备

- 一台 macOS 或 Linux 电脑，以及终端。macOS 用自带的“终端”App 就可以。
- Homebrew 或 mise 其中一个。两个都没用过的话，macOS 可以先按 [Homebrew 官网](https://brew.sh/)的说明装好 Homebrew。
- 一个用 git 管理、至少有过一次 commit 的项目文件夹。步骤 3 创建 worktree 时会用到。
- 已经装好并登录 Claude Code 或 Codex：在普通终端输入 `claude` 或 `codex`，能正常启动。

装好 herdr 之后，每一轮的用法就是下图的五步，分别对应下面的步骤 2 到 6。

![herdr 五步：开 herdr、开 worktree、每 pane 跑一个 agent、找 blocked、离开再接回](workflow.zh-CN.webp){: w="1600" h="900" }
_概念图：一轮的五个步骤是开 herdr、开工作目录、跑 agent、找卡住的、离开再接回。prefix 是先按 ctrl+b 松开，再按下一个键。_

## 步骤 1：安装

![安装 herdr 建议用 brew 或 mise；官方的 curl | sh 一行安装要先下载、看过脚本再执行](install.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是本站建议的做法，用 brew 或 mise 安装与升级；右边是官方 Install／TUI 页的一行安装，若要用，先下载脚本、看过再执行。_

我建议已经在用 [Homebrew](https://formulae.brew.sh/formula/herdr) 的人用 `brew install herdr`，已经在用 [mise](https://mise.jdx.dev/) 的人用 `mise use -g herdr`。这两种都列在官方[Install](https://herdr.dev/tui/docs/0.9.5/install/)页。

官方 Install／TUI 页另外提供一行安装命令 `curl -fsSL https://herdr.dev/install.sh | sh`。我建议不要直接粘贴执行，原因有两个。第一，这样跑的是服务器当下返回、你没看过的内容，下次执行也可能不一样。第二，它会装到 `~/.local/bin`，之后靠 `herdr update` 自己更新，不会出现在包管理器的列表里，日后比较难查到装了什么，也比较难卸载；用 brew 或 mise 装，版本查得到，升级和卸载也都用同一套命令。这不是说安装脚本有问题，而是出于“先看过再执行”的习惯，原因见[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

若一定要用官方脚本，先把它下载成文件：

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

用文本编辑器打开看过（也可以在终端执行 `less herdr-install.sh`，看完按 `q` 退出），确认没问题再执行 `sh herdr-install.sh`。看不懂脚本在做什么的话，就改用 brew 或 mise。

用 mise 时若出现 `herdr not found in mise tool registry`，按官方说法，先更新 mise 再试一次（用 brew 装的 mise 执行 `brew upgrade mise`，其他方式装的可执行 `mise self-update`）。

装好后执行 `herdr --version`，按官方文档，应该会显示版本号（例如 0.9.5）。若你使用中文、日文或韩文输入法，且 prefix 快捷键没反应，请确认是 0.9.5 或更新的版本；官方在这一版修复了这个问题。

更新时，用 brew 装的请用 `brew upgrade herdr`，用 mise 装的请用 `mise upgrade herdr`。官方原文是：“Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead.”包管理器更新之后，再输入一次 `herdr` 就会用新版界面接上，原本在跑的后台 server 和 agent 不受影响。若要连 server 端也换成新版，先执行 `herdr server stop`（会停掉所有正在跑的 agent，见步骤 6），再输入 `herdr` 重新启动，见 Install 页的 Update 节。

## 步骤 2：在项目文件夹打开 herdr

在终端用 `cd` 进入项目文件夹（例如 `cd ~/projects/demo-app`），再输入 `herdr`。按[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)，它会启动或接上默认的后台 session；这个 session 还没有 workspace 时，会自动开一个，也就是下图侧栏的 demo-app。之后每创建一个 worktree，会再多一个 workspace（步骤 3）。

![herdr 实际画面：侧栏是 demo-app workspace，两个 pane 分别运行 git 和 build](screen-main.zh-CN.webp){: w="1600" h="900" }
_实际画面：在 demo-app 文件夹打开 herdr，再用 prefix+v 分出第二个 pane。这两个 pane 运行的是普通 shell，不是 agent，所以 agents 区是空的。_

herdr 可以全程用鼠标操作：点一下就能切换 pane、tab、workspace 和 agent，也可以拖动边框调整大小、右键拆分。官方的说法是鼠标能完成所有操作，键盘快捷键是可选的；下文列出的快捷键，记不住也没关系。

## 步骤 3：每个工作目录一个 workspace

本站的做法是：每个 worktree 配一个 workspace，让每个 agent 只改自己的那份工作目录，两个 agent 不会同时改到同一个文件，这和 worktree 篇的原则相同。创建方式有两种，选一种即可，底层都是 `git worktree`。做完之后怎么合并、怎么删分支，以及为什么有 submodule 的 repo 不建议用 worktree，请看[git worktree 教程：让两个 AI 在同一个 repo 分开工作](/posts/git-worktree-parallel-ai-agents/)。

**做法 A：用 herdr 创建。** 在项目的 workspace 里按 `prefix+shift+g`（侧栏的 workspace 那一行也有 `New worktree` 可选），会弹出 new worktree 窗口。分支栏一开始会填好随机名称，先按 ctrl+c 清空，输入你要的分支名称（例如 `login-page`），再按 Enter。herdr 会建好 git worktree，并把它打开成一个新的 workspace，排在原项目下面；点侧栏的名称就能切换。这个操作等同在项目文件夹内执行：

```bash
herdr worktree create --branch login-page
```

![按 prefix+shift+g 弹出 new worktree 窗口，分支填 login-page，下方是文件夹位置](screen-worktree.zh-CN.webp){: w="1600" h="900" }
_实际画面：按 prefix+shift+g 创建 worktree。分支栏一开始会填好随机名称，先按 ctrl+c 清空再输入；按 Enter 会创建并打开成新的 workspace。_

默认位置是 `~/.herdr/worktrees/<repo>/<分支>`，可在 `~/.config/herdr/config.toml` 的 `[worktrees] directory` 修改，见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)。

**做法 B：沿用 worktree 篇。** 先在项目文件夹内用 git 建好文件夹，例如：

```bash
git worktree add -b login-page ../demo-app-login-page
```

再在 herdr 按 `prefix+shift+n` 新建 workspace，然后在里面执行 `cd ../demo-app-login-page`，进入刚才建好的文件夹。

关闭 workspace（`prefix+shift+d`）不会删掉文件夹，也不会删掉分支；按官方说明，关闭项目那一行时，排在它下面的 worktree workspace 也会一起关闭。要删掉 worktree 的文件夹，在侧栏选中那个 worktree 的 workspace（排在项目下面的那一行），用 `Delete worktree checkout...`（底层是 `git worktree remove`），或自己执行 `git worktree remove`；分支要另外删。

同一个 workspace 里若还要多开一个终端，例如跑测试，就拆分 pane：`prefix+v` 向右，`prefix+minus` 向下。

## 步骤 4：在 pane 里启动 agent

切到要工作的 workspace，在 pane 里输入 `claude` 或 `codex`，跟在普通终端启动一样。按 Quick start，herdr 会自动认出这是哪个 agent，侧栏的 agents 区会多出一行。官方还支持 Cursor Agent CLI、GitHub Copilot CLI、OpenCode 等，完整列表见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)，这里不一一列出。

集成（integration）是可选的。不装也能看状态；装了之后，herdr 的后台 server 重启时，才能接回同一段对话。安装命令是 `herdr integration install claude` 或 `herdr integration install codex`，见[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)。它会改 agent 的配置：Claude Code 会多一个 hook 脚本，并在 `settings.json` 加上对应的 hook 配置；Codex 会多一个 hook 脚本、修改 `hooks.json`，并在 `config.toml` 开启 `[features] hooks = true`。可用 `herdr integration uninstall claude`（或 `codex`）移除，但 Codex 的 `config.toml` 不会被改回去。hook 是什么，可参考[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。

## 步骤 5：看状态，找出卡住的那个

![herdr 的五种状态：blocked、working、done、idle、unknown，各代表什么、你该做什么](states.zh-CN.webp){: w="1600" h="900" }
_概念图：五种状态的意思，以及本站建议你该做的事。blocked 要先处理；新的提示界面可能先显示成 idle，看到 idle 也不代表可以不看内容就点“允许”。图上的颜色是本站配图用的，不是 herdr 界面的配色。_

侧栏用不同颜色的圆点标出每个 agent 的状态；同一个 workspace 里若有 agent 是 blocked，该 workspace 自己的那一行也会换成 blocked 的颜色。侧栏只有圆点，要看到写成文字的状态名称（working、blocked、done、idle），得按 `prefix+g` 打开 Go to 列表。官方定义了五种状态；表格最右栏“你该做什么”是本站的建议。

| 状态 | 官方定义（白话） | 本站建议你该做什么 |
| --- | --- | --- |
| blocked | 在等你回答、批准或做决定 | 先处理：打开看清楚再回答 |
| working | 正在跑 | 不用管，让它做 |
| done | 做完了，你还没看 | 去看结果、检查改了什么 |
| idle | 做完了或在等下一个指示，而且你已经看过 | 可以交代下一件事 |
| unknown | herdr 认不出状态 | 自己点进去看一眼 |

![herdr 侧栏：worktree workspace 排在 demo-app 下面，agents 区用圆点颜色标状态](screen-states.zh-CN.webp){: w="1600" h="900" }
_实际画面（herdr 默认主题）：黄点 working、红点 blocked、青绿点 done、空心绿圈 idle。演示用的“agent”是用 herdr pane report-agent 上报状态的 shell 脚本，不是 Claude Code 或 Codex。_

要快速找到卡住的 agent，按 `prefix+g` 打开 Go to 列表，再按 `b` 只看 blocked（`w` 看 working、`i` 看 idle、`d` 看 done、`a` 看全部），用方向键选好后按 Enter 跳过去。

![Go to 列表按 workspace 分组，每行写出 idle、working、blocked 或 done](screen-goto.zh-CN.webp){: w="1600" h="900" }
_实际画面：按 prefix+g 打开 Go to，状态直接写成文字；再按 b 只留下 blocked 的那一行，按 Enter 跳过去。列表里演示的“agent”是用 herdr pane report-agent 上报状态的 shell 脚本，不是 Claude Code 或 Codex。_

herdr 默认不会弹出通知（配置文件里 `[ui.toast]` 的 `delivery` 默认是 `off`）。要开启通知，打开配置文件 `~/.config/herdr/config.toml`（没有就自己新建），加上：

```toml
[ui.toast]
delivery = "herdr"
```

保存后执行 `herdr server reload-config`（或按 `prefix+shift+r`），配置就会生效。设成 `herdr`，提示会出现在 herdr 界面里；设成 `system`，则改用操作系统的通知。macOS 用 `system` 时会优先通过 terminal-notifier 发通知，官方建议先 `brew install terminal-notifier`，其他选项见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)或[Config reference](https://herdr.dev/tui/docs/0.9.5/config-reference/)。

按官方[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)页的原文，blocked 的判断故意从严：herdr 没见过的新提示界面，一开始可能显示成 idle，而不是 blocked；而且“idle status is not authorization to approve an action”，也就是看到 idle，不代表可以直接批准。跳过去之后，要看清楚再点允许。这一点和[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)里谈的过度信任、审批疲劳是同一件事。

## 步骤 6：离开，再接回来

要离开时，按 `prefix+q`（先 `ctrl+b` 再 `q`），或直接关掉终端窗口。按 Quick start，server 和里面的 agent 会继续跑；之后再输入 `herdr`，就会接回同一个 session。

什么会留下、什么不会，官方[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)有表。白话来说：只是离开，全部继续跑。但 herdr 的后台 server 重启、电脑重启或关机时，原来在跑的进程（包括 agent）都会结束（README 原文：“the original processes do not survive”）。重新输入 `herdr` 后，workspace、tab、pane 的布局会恢复；agent 的对话则只有装了集成（步骤 4）才能接回来。

全部收工用 `herdr server stop`。官方说明是结束这个 session，并停止里面的 pane。请注意：这会停掉所有 pane 里正在跑的 agent。

## 整理一下：一轮的用法，加上快捷键速查

一轮就是图上的五步：在项目文件夹打开 herdr，为每个任务创建一个 worktree，在各 pane 启动 agent，用侧栏或 Go to 找出 blocked 的，离开后再输入 `herdr` 接回。

`ctrl+b` 是 prefix：先按它并松开，再按下一个键。官方[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)把这句写成：“`prefix+c` means: press `ctrl+b`, release, then press `c`.”忘记时按 `prefix+?` 可查看全部快捷键。

| 按键 | 作用 |
| --- | --- |
| `prefix+v`／`prefix+minus` | 向右／向下拆分 pane |
| `prefix+h`／`j`／`k`／`l` | 移到左／下／上／右边的 pane |
| `prefix+c` | 新建 tab（会先弹出命名窗口，按 Enter 创建） |
| `prefix+w` | 打开 workspace 导航，切换 workspace |
| `prefix+shift+n` | 新建 workspace |
| `prefix+shift+g` | 新建 worktree |
| `prefix+shift+d` | 关闭选中的 workspace |
| `prefix+g` | 打开 Go to（再按 `b` 只看 blocked） |
| `prefix+z` | 放大当前 pane |
| `prefix+x` | 关闭当前 pane |
| `prefix+q` | 离开（detach） |
| `prefix+?` | 查看全部快捷键 |

## 什么情况怎么做

| 情况 | 建议 |
| --- | --- |
| 只跑一个 agent | 不一定要用 herdr；觉得窗口已经够用，可以先不装 |
| 两三个 agent 各改不同功能 | 本站建议一个 worktree 配一个 workspace |
| 想让 agent 跑着、人先离开 | `prefix+q` 离开；之后再输入 `herdr` 接回 |
| 用 SSH 连远程机器干活 | 直接在远程执行 `herdr`，断线后工作仍可继续；或用 `herdr --remote <主机>`，见[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| 状态看起来不对 | 用 `herdr agent explain <目标>` 查看判断依据，见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| 要全部停掉 | `herdr server stop`（会停掉所有 pane 里的 agent） |
| 用 brew／mise 装的要更新 | `brew upgrade herdr` 或 `mise upgrade herdr`，不要用 `herdr update` |
| 不想让 herdr 在后台连 herdr.dev | 在配置文件的 `[update]` 下面加上 `version_check = false` 和 `manifest_check = false`，见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## 常见误解

- “关掉窗口，工作就停了。”只是离开的话，server 和 agent 会继续跑。
- “有 herdr，就算重启电脑也不会中断。”原来的进程不会活下来，只会恢复布局；对话要装了集成才接得回来。
- “显示 idle 就代表没事，可以直接点允许。”新的提示界面可能先被判成 idle；idle 不是授权。
- “herdr 会取代 Claude Code 或 Codex。”不会，它只管理终端。
- “关掉 worktree 的 workspace，就会删掉文件夹。”不会，也不删分支。
- “用 brew 装的也可以 `herdr update`。”官方说要用包管理器更新。

## 结论与下一步

每个 AI 一个 pane，看侧栏找 blocked，离开后再接回来。若要在远程机器上这样做，见[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/)。官方也提供让 agent 自己操作 herdr 的 skill：`herdr --skill` 会打印出与当前版本相符的内容。装任何第三方 skill 之前，都先读过内容，原因见[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

延伸阅读： [herdr README](https://github.com/herdrdev/herdr)、[v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)、[文档首页](https://herdr.dev/tui/docs/0.9.5/)、[Install](https://herdr.dev/tui/docs/0.9.5/install/)、[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)、[Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/)、[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)、[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)、[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)、[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)、[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)、[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)、[Homebrew formula](https://formulae.brew.sh/formula/herdr)。
