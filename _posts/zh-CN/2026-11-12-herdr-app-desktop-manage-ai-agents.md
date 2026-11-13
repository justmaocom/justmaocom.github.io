---
title: "Herdr 桌面 App 入门：用 space 与标签页管理多个 AI"
description: "用 Herdr 桌面 App 把每个 repo 放进 space、每件工作放进标签页，从 agents 侧边栏一眼看出哪个 AI 在等你；本文依 v0.1.15 官方文档，说明安装、四种状态、关窗后的行为与遥测设置。"
date: 2026-11-12 17:00:00 +0800
categories: [AI, 软件开发]
tags: [coding-agent, workflow, claude-code, codex, herdr]
media_subpath: /assets/img/posts/herdr-app-desktop-manage-ai-agents/
image:
  path: cover.zh-CN.webp
  alt: "在 Herdr 桌面 App 用 space 和标签页整理多个 repo 的 AI，从侧边栏看出哪个在等你。"
---

同时让好几个 AI 在不同的项目里写代码，最常卡住的地方是：不知道哪一个停下来在等你回答，只好一个窗口一个窗口切过去看。

Herdr 桌面 App（程序名 herdr-app）就是处理这件事的工具。按官方 README 的介绍，它是给终端和 coding agent 用的桌面 App：把工作分进一个个 space，让你看出哪些 agent 需要你，而且关掉窗口后，终端里的程序还会继续跑。依官方首页，它是免费的，App、herdr-core 和 Herdr TUI 都以 Apache 2.0 许可证开源。

这篇是照着做的入门：装好 App、从标签栏开一个 agent、用 space 和标签页整理工作、从 agents 侧边栏找出在等你的那个，再说明关掉窗口之后会怎样，以及遥测、自动更新和 mod 的安全注意事项。快捷键记不住也没关系，命令面板（command palette）可以按名字找到每个操作，还会列出它的快捷键。

本文依官方文档整理，没有附 App 的界面截图；文中三张图都是本站画的概念图。

> **版本说明**：本文依 herdr-app v0.1.15（2026-11-11 台北时间发布；2026-11-12 确认 releases.herdr.dev 和 Homebrew 上都还是这一版）的官方文档撰写。Herdr App 还没到 1.0，更新很快，操作方式与快捷键请以[官方 README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)为准。
{: .prompt-info }

## 先说几个词

- **终端（terminal）**：输入命令的文字窗口。macOS 的“终端”App、Windows 的 PowerShell 都是。
- **repo**：用 git 管理的项目文件夹。本文说“一个 repo”，可以理解成“一个项目”。
- **agent（coding agent）**：在终端里跑、会自己读文件、改代码、运行命令的 AI，例如 Anthropic 的 Claude Code、OpenAI 的 Codex。官方说，任何能在终端里运行的程序都能放进 Herdr。
- **桌面 App（herdr-app）**：你看到的那个窗口，负责把终端排在屏幕上。
- **herdr-core（命令是 `hc`）**：在后台真正运行每个终端和 agent 的程序。窗口关掉或 App 更新时，它和里面的程序都会继续跑。README 用一句话讲完两者的分工：“The window arranges terminals. The core runs them.”（窗口负责布局，core 负责运行。）
- **space／标签页（tab）／pane**：Herdr App 从大到小的三层。space 是一台电脑上的一份工作，通常对应一个 repo；标签页是 space 里的一件工作；pane 是标签页里的一格画面，放一个终端，也可以放 mod 的面板。步骤 3 有图。
- **OSC 7501**：agent 和 Herdr 之间约定好的报告方式，让 agent 告诉 Herdr 自己在忙、做完了，还是在等你。会这样报告的 agent，Herdr 才显示得出它的状态；不会的照样能跑，只是没有状态。
- **SSH**：从一台电脑连到另一台电脑、在那台电脑上操作的方式。Herdr 用 SSH 连到你的其他电脑或服务器，手机 App 也是通过 SSH 连接。
- **遥测（telemetry）**：App 发回给开发者的使用统计。依官方文档，Herdr App 默认开启，每天发送一份小报告。
- **mod 和 layout**：mod 是在 Herdr 里运行的 JavaScript 小程序，例如放在 pane 里的面板；layout 是整个窗口的布局，内置的有 Herdr、Terminals 和 Herdr 98。依官方文档，mod 拥有完整权限，没有放在沙箱（sandbox，把程序隔离起来、限制它能碰哪些东西的机制）里，后面会再说明。

## 先分清楚：Herdr App 和 Herdr TUI 是两个程序

herdr.dev 上有两个名字很像的程序。依官方 FAQ：

- **Herdr TUI** 是最早的 Herdr：整个界面都在终端里，由它自己的后台程序（server）运行 agent。官方说它照常可用，相关资料都在 [herdr.dev/tui](https://herdr.dev/tui/)。
- **Herdr App** 是另一个新的、独立的程序，有自己的桌面窗口，构建在 herdr-core 上，也就是这篇要讲的。

两者**不共享 agent**：依官方 FAQ，在其中一个里启动的 agent，不会出现在另一个里。手机 App 只支持 herdr-core（随 Herdr App 附带），不支持 Herdr TUI。依手机 App 页面，Herdr TUI 和 herdr-core 可以同时装在同一台电脑上。

怎么选：本站建议挑一个当主力。因为 agent 不共享，两边各开几个，又会回到“不知道谁在等你”的老问题。想留在终端里用的，看[herdr 入门：在终端同时跑多个 AI，找出卡住的那个](/posts/herdr-run-multiple-ai-agents/)；想要一个桌面窗口、或想用手机查看 agent 的，继续往下读。

## 什么时候适合用

- 同时让两个以上的 agent 在不同 repo 或不同工作上跑，想在一个窗口里看出哪个在等你：适合。
- 想关掉窗口、让 agent 继续干活：适合。依官方文档，关掉窗口不会停掉终端（见步骤 5）；放在 SSH 机器上的工作，笔记本电脑睡眠时也会继续（见步骤 6）。
- 只跑一个 agent，而且目前的做法已经顺手：不一定要换（本站看法）。

## 开始前要准备

- 一台受支持的电脑。依官方 FAQ：macOS（Apple Silicon，也就是 M1 之后的 Mac）、Linux（x86_64 和 arm64）、Windows（x86_64）。Linux 要在有图形桌面的环境里运行（desktop session，只有命令行界面的服务器不行），也要有可用的 Vulkan 驱动（显卡驱动程序提供的绘图功能）。Windows 需要 Windows 10 1803 以上，以及 curl 和 tar 这两个下载、解压工具；1803 之后的 Windows 已经内置。
- 你要用的 agent 已经装好，例如 Claude Code 或 Codex：在普通终端里输入 `claude` 或 `codex`，能正常启动。依 CHANGELOG 0.1.14，从 + 菜单打开的每个 Codex 会各自独立，关掉其中一个不会连带结束其他的；这需要 Codex 0.156 或更新的版本。

## 步骤 1：安装

### macOS（Apple Silicon）：dmg 或 Homebrew

两种选一种即可。没用过 Homebrew 的话，选 dmg 就好。

**用 dmg**：下载 [Herdr.dmg](https://releases.herdr.dev/app/Herdr.dmg)，双击打开，把 Herdr 拖到“应用程序”（Applications）文件夹。

**用 Homebrew**（Mac 上用一行命令安装软件的工具）：在终端运行

```bash
brew install --cask herdr-app
```

依 Homebrew 的 cask 信息，App 会装到 `/Applications/Herdr.app`，同时多一个 `herdr-app` 命令；信息里也标明 App 会自己更新（`auto_updates: true`），更新方式见后面“自动更新怎么运作”一节。

> **Intel Mac 没有安装包**：README 写明 macOS 版只提供 Apple Silicon，Intel Mac 要自己从源代码构建；官方安装脚本遇到 Intel Mac 也会直接停下。本文不讲从源代码构建。不确定自己的 Mac 是哪一种：点左上角苹果菜单 >“关于本机”，“芯片”写 Apple M 开头的就是 Apple Silicon，写“处理器”和 Intel 的就是 Intel Mac。
{: .prompt-warning }

### Linux 与 Windows：先下载脚本、读过再运行

Linux 和 Windows 官方只提供安装脚本（另一条路是从源代码构建）。安装脚本是一份写好的命令清单，运行后会自动下载并安装 App。README 自己就提醒，这两个安装脚本会下载并运行代码，想先读过可以先读。

官方 README 给的 Linux 写法是 `curl -fsSL https://releases.herdr.dev/app/install.sh | sh`。中间的 `|` 会把下载到的内容直接交给 `sh` 运行，等于下载完立刻运行，你没有机会先看。本站建议拆成两步。先下载成文件：

```bash
curl -fsSL https://releases.herdr.dev/app/install.sh -o herdr-app-install.sh
```

用文本编辑器打开读过，确认看得懂、没问题，再运行：

```bash
sh herdr-app-install.sh
```

看不懂脚本在做什么，就先别运行。依脚本开头的注释和内容，它在 Linux 上会：

- 把 App 装到 `~/.local/share/herdr-app`，把 `herdr-app` 命令放到 `~/.local/bin`，并加上启动器和图标。
- 只有在机器上还没有 herdr-core 时，才把它装到 `~/.local/bin/herdr-core`（连同 `hc`）；之后由 App 让它保持最新。
- 下载发布清单（`latest.json`），比对下载文件的 SHA-256（由文件内容算出的一串指纹，文件只要差一点，指纹就不同），不一致就停下来。

`~` 代表你的用户文件夹（主目录）。PATH 是终端找命令时会去查看的文件夹列表；安装程序要求的话，把 `~/.local/bin` 加进去，之后在终端输入 `herdr-app` 才找得到。之后再运行一次脚本，就是更新 App。这个脚本也支持 macOS（App 会放在 `~/Applications/Herdr.app`），不过 Mac 用户本站建议用上面的 dmg 或 Homebrew。

**Windows**（x64、Windows 10 1803 以上）：官方写法是在 PowerShell 运行 `irm https://releases.herdr.dev/app/install.ps1 | iex`（下载页写成 `powershell -c "irm https://releases.herdr.dev/app/install.ps1 | iex"`），同样是下载完直接运行。本站建议同样拆成两步。先在 PowerShell 把脚本下载成文件：

```powershell
irm https://releases.herdr.dev/app/install.ps1 -OutFile herdr-app-install.ps1
```

用记事本打开读过，确认没问题，再运行你刚读过的这一份：

```powershell
Get-Content .\herdr-app-install.ps1 -Raw | iex
```

这一行和官方写法一样交给 `iex` 运行，区别在于运行的是你读过的那份文件，不是重新下载的另一份。不要读完再跑官方那一行，那会重新下载，跑的不一定是你读过的内容。看不懂就先别装。

依脚本开头的说明，安装不需要管理员权限。装好后 Herdr 会出现在开始菜单，安装程序会把 `%LOCALAPPDATA%\Programs\herdr-app` 加进用户的 PATH，要打开一个新的终端窗口才会生效。之后再运行一次脚本，就是更新 App。

### 装好之后：herdr-core 从哪里来

Herdr App 只负责布局，真正运行终端的是 herdr-core。大多数人不用另外处理它。依官方文档：

- 用脚本安装：机器上还没有 herdr-core 的话，脚本会一起装；已经有就不重装。
- 用 dmg 或 Homebrew 安装：依官方说法，App 会在你还没有 herdr-core 时帮你设置好；找到的 core 用不了时，也会协助你安装或更新。
- App 会在 PATH、`~/.local/bin`、Homebrew、mise、Nix、cargo 这些地方找 core。后面四个都是安装开发工具的渠道，没用过可以略过。
- 连不上正在运行的 core 时，App 会说明原因和修复方法（CHANGELOG 0.1.14）。

## 步骤 2：打开 App，从标签栏的 + 开一个 agent

依下载页，打开 Herdr 之后，从标签栏（tab bar）的 **+** 开一个 agent，例如 Claude Code 或 Codex；+ 菜单也能开普通的终端。你也可以在 pane 里输入 `claude` 这类命令直接启动 agent，就跟在普通终端里一样。习惯用 tmux 的人要注意，官方 FAQ 提醒要直接在 Herdr 的 pane 里跑 agent，不要包在 tmux 里（理由见步骤 4）。

几件要知道的事：

- macOS 第一次使用时，系统可能会问 herdr-core（或 Herdr Core）能不能访问“文稿”这类文件夹、局域网或麦克风。依 CHANGELOG 0.1.12 和 0.1.13，那就是 Herdr 的一部分，点“允许”即可。
- agent 退出后，它所在的终端不会跟着关掉，会留下来等你输入下一个命令。如果 agent 一启动就失败，依内置指南，Herdr 会弹出错误通知，附上错误代码和最后几行输出，方便你查原因。
- 依 README，新标签页会从当前选中的终端（光标所在的那个）正在用的文件夹开始。所以要让 agent 在某个 repo 里工作，先在当前的终端用 `cd` 切到那个 repo 的文件夹（例如 `cd ~/projects/web-app`），再开新标签页。
- 没有命名的 space 会跟着它第一个终端的文件夹走；想要一个固定不变的标签，就给 space 或标签页命名（默认快捷键：标签页 `f2`、space `shift-f2`）。
- 如果你在 macOS 上用的是比 0.1.15 旧的版本，刚登录或重启后，+ 菜单可能把每个 agent 都标成“not installed”；0.1.15 已修复。

## 步骤 3：认识 space、标签页、pane

![一台机器里有多个 space，每个 space 有多个标签页，每个标签页分成几个 pane，各跑一个 agent](structure.zh-CN.webp){: w="1600" h="900" }
_概念图：一台机器 → space（通常是一个 repo）→ 标签页（一件工作）→ pane（一个终端，可以各跑 Claude Code 或 Codex）。_

依官方 README，三层的分工是：

- **space**：一台电脑上的一份工作，通常是一个 repo。
- **标签页（tab）**：space 里的一件工作，包含它的终端，以及这些终端怎么左右、上下分割。关掉 space 里最后一个标签页，space 也会跟着关掉；依内置指南，这时 Herdr 会先问你是否确定。
- **pane**：标签页里的一格画面，放一个终端，或放在终端旁边的 mod 面板。

官方首页建议每个 repo 一个 space、每件工作一个标签页。例如同一个 repo 里，一个标签页让 Claude Code 做登录页，另一个标签页让 Codex 修测试；需要一边看 agent、一边自己跑测试时，再把标签页分割成两个 pane。

分割 pane：macOS 按 `cmd-d` 向右、`cmd-shift-d` 向下；Linux／Windows 按 `ctrl-shift-o` 向右、`ctrl-shift-e` 向下。

### 默认快捷键

依官方默认按键文件（[macOS](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json)、[Linux／Windows](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json)）整理。`cmd-shift-p` 的意思是同时按 Command、Shift 和 P。Mac 上的 `cmd` 是 ⌘ Command 键，`ctrl` 是 control 键，两个不一样。其他操作和它们的快捷键，可以按 `cmd-shift-p`（Linux／Windows 是 `ctrl-shift-p`）打开命令面板查看。

| 操作 | macOS | Linux／Windows |
| --- | --- | --- |
| 新建 space | `cmd-n` | `ctrl-shift-n` |
| 新建标签页 | `cmd-t` | `ctrl-shift-t` |
| 关闭标签页 | `cmd-w` | `ctrl-shift-w` |
| 向右分割 pane | `cmd-d` | `ctrl-shift-o` |
| 向下分割 pane | `cmd-shift-d` | `ctrl-shift-e` |
| 关闭 pane | `cmd-shift-w` | `ctrl-shift-x` |
| 放大当前 pane | `cmd-shift-enter` | `ctrl-shift-z` |
| 下一个／上一个 agent | `cmd-]`／`cmd-[` | `alt-down`／`alt-up` |
| 显示／隐藏侧边栏 | `cmd-b` | `ctrl-shift-b` |
| 切到第 1–9 个标签页 | `cmd-1`…`cmd-9` | `ctrl-1`…`ctrl-9` |
| 切到第 1–9 个 space | `ctrl-1`…`ctrl-9` | `alt-1`…`alt-9` |
| 重命名标签页／space | `f2`／`shift-f2` | `f2`／`shift-f2` |
| 命令面板 | `cmd-shift-p` | `ctrl-shift-p` |
| 设置（Settings） | `cmd-,` | `ctrl-,` |
| 帮助 | `cmd-/` | `ctrl-shift-/` |

### 搭配 git worktree

如果你照[git worktree 教程：让两个 AI 在同一个 repo 分开工作](/posts/git-worktree-parallel-ai-agents/)，给每个 agent 开了一份独立的工作目录（worktree），本站建议每个 worktree 开一个 space，或至少给它一个自己的 pane，让每个 agent 只在自己的那份目录里改文件。App 本身也能管理 worktree。依内置指南，space 菜单和 + 菜单里有 New worktree（新建）、Open worktree（打开已有的）和 Remove worktree（删除）；新建的 worktree 会放在那台机器的 `~/.herdr/worktrees/<repo 名称>/<分支名称>`，Spaces 侧边栏会把这些 worktree 的 space 收在原来 repo 的 space 下面。

## 步骤 4：看 agents 侧边栏，找出在等你的那个

![agents 侧边栏的四种状态 Working、Blocked、Done、Idle，各代表什么、你该做什么](agents.zh-CN.webp){: w="1600" h="900" }
_概念图：四种状态的意思，以及本站建议的处理方式；没有 pane 的 worker，点一下会以 peek 打开在当前的标签页上。图上的颜色是本站配图用的，不是 App 界面的配色。_

依 README，agents 侧边栏会把各个 space 里的 agent 集中成一张列表，也包括由另一个 agent 启动的程序（官方称为 worker）。会报告状态的 agent，状态有下面四种。最右列是本站的建议。

| 状态 | 官方定义（通俗版） | 本站建议你该做什么 |
| --- | --- | --- |
| Working | 还在忙 | 不用管，让它做 |
| Blocked | 在等你 | 先处理：点进去看清楚它要什么，再回答 |
| Done | 在你看别处时做完了 | 去看结果，检查它改了什么 |
| Idle | 没在工作，或已经做完而且你看过了 | 可以交代下一件事 |

- space 和标签页本身也会显示状态，取它里面最急的那个 agent，顺序是 blocked > done > working > idle。所以看到某个 space 是 blocked，就说明里面至少有一个 agent 在等你。
- Done 在你看过之后，会变成 Idle。
- 点一下 agent 就能跳过去看它。没有 pane 的 worker 会以 **peek** 的方式打开，像一个临时的预览窗口，盖在你当前的标签页上面；想让它一直放在其他工作旁边，可以把它留成一个标签页。
- 也可以用快捷键跳到下一个／上一个 agent：macOS 是 `cmd-]`／`cmd-[`，Linux／Windows 是 `alt-down`／`alt-up`。
- Herdr 会给每个终端一个地址（代号）。终端的文字里如果出现正在运行的终端地址，例如 `t7`（同一台电脑上的终端）或 `vps/t7`（名为 vps 的另一台电脑上的），按住 Ctrl 点一下（macOS 是 Cmd）就能 peek。

声音和通知：依内置指南，agent 需要你、或在你没看的时候做完，Herdr 会播放声音；你没在看时，还会弹出可以点击的通知（toast）。声音在 `settings.json` 的 `sounds` 里设置，也可以在 Settings > Alerts 试听。

### 状态没出现时

依官方 FAQ 逐项检查：

1. **agent 不会报告状态。** 只有会用 OSC 7501 报告的 agent 才有状态，其他的照样能跑，只是没有状态。依 herdr-core 页面，herdr-core 不读屏幕上的文字，也没有内置的 agent 列表，不会靠猜。旧版的 agent 可能还不会报告，先把 agent 更新到新版。
2. **agent 跑在 Herdr 里再开的 tmux 里。** 这样状态报告不到 Herdr，请直接在 Herdr 的 pane 里跑 agent。没用过 tmux 的话，这项可以跳过。
3. **agent 是在 Herdr TUI 里启动的。** 它活在 TUI 自己的 server 里，不会出现在 App 里。

## 步骤 5：关掉窗口之后会怎样

依 README 与官方 FAQ：

| 你做了什么 | 终端和 agent 会怎样 |
| --- | --- |
| 关掉 App 窗口 | 继续在 herdr-core 里跑 |
| 退出 App（macOS 按 `cmd-q`）或更新 App | 继续跑，什么都不变 |
| 关掉 pane 或标签页 | 里面的终端结束 |
| 重启、注销，或 herdr-core 停止、崩溃 | 里面的程序也会停 |

重启或 core 停掉之后，保留下来的 pane 会回来，在原来的文件夹开一个新的 shell（终端里等你输入命令的程序），终端地址也不变；但原来运行的命令不会再跑，Herdr 也不会帮你重新启动 agent 或接着做到一半的工作。官方 FAQ 的说法是，自己把 agent 再开起来，接着做就好。

另外，自己退出或被强制结束的终端会被关闭，不会自动重开。

> **刚从旧版升级上来的 Mac 用户**：依 CHANGELOG 0.1.15，在 herdr-core 0.1.20 之前打开的终端，仍可能在 Herdr 退出时跟着结束。core 更新到 0.1.20 以上之后（Settings > Updates 里看得到版本），把那些终端关掉重开，或重启一次。
{: .prompt-tip }

## 步骤 6（可选）：加入 SSH 机器、用手机查看

### 加入另一台机器

这一步适合有另一台电脑或云服务器、而且已经能用 SSH 连上去的人；没有的话可以跳过。

依 README，从 Settings → Machines，或侧边栏的 Add machine 加入 SSH 机器：从你的 SSH 配置里挑一台主机，或直接输入 SSH 要怎么连到它。之后，那台机器上的 space，终端都在那台机器上跑，不是在你的电脑上。

- 那台机器也要有 herdr-core。依 CHANGELOG 0.1.14，如果连接需要密码、要接受新的 host key（SSH 用来确认主机身份的密钥），或那台机器还没装 herdr-core，Settings > Add machine 会告诉你要运行什么。
- 只要远程机器和它的 core 还在跑，本机窗口关掉、笔记本电脑睡眠，远程的工作都会继续。
- 依官方首页，Herdr 通过 SSH 连接，也可以搭配 Tailscale（把自己的几台设备连成一个私有网络的服务）；你的手机和电脑直接连到你的机器，不需要 Herdr 账号，终端内容也不经过官方。

### 用手机查看

官方有手机 App，支持 iPhone、iPad 和 Android，可从 [App Store](https://apps.apple.com/app/id6828898364) 和 [Google Play](https://play.google.com/store/apps/details?id=dev.herdr.app) 下载。依[手机 App 页](https://herdr.dev/mobile/)：

- 手机通过 SSH 直接连到每台机器上的 herdr-core，不需要 Herdr 账号，中间也没有官方的服务器。
- Inbox 按紧急程度排序：需要你、做完、在忙、空闲。
- 打开一个 agent，就是真正的终端，可以直接打字；也可以用 compose（输入消息的区域）粘贴文字、截图、照片，或用语音输入。
- 只支持 herdr-core（Herdr App 附带的那个），不支持 Herdr TUI。
- 不在家时，可以通过 Tailscale 或任何 VPN 连回你的机器；官方说用 Tailscale SSH 不用另外设置密钥。
- 只装了 herdr-core 的机器，手机上也看得到终端和 agent；那台机器也运行着 Herdr App 时，才看得到 space。
- 想先看看长什么样，打开手机 App 时点 Try the demo。
- 官方说手机 App 没有登录、没有广告、没有追踪，也没有分析。

## 步骤 7（可选）：自定义

**命令面板**：按 `cmd-shift-p`（Linux／Windows 是 `ctrl-shift-p`），按名字找任何操作，还会列出每个命令的快捷键。

**Settings**：按 `cmd-,`（Linux／Windows 是 `ctrl-,`），可以改字体、颜色、声音等偏好设置。

**配置文件夹 `~/.config/herdr-app`**：App 的设置都放在你用户文件夹下的这个文件夹，macOS 和 Windows 也一样。设置、快捷键、layout、mod 和自动生成的 agent 指南都在这里。文件夹名以 `.` 开头的 `.config` 默认是隐藏的，macOS 的访达（Finder）可以按 `cmd-shift-.` 显示隐藏文件。依安全文档，space、标签页和分割方式存在每台机器的 core 里，不在这个文件夹；删掉这个文件夹，也不会停掉 core 或清掉它的数据。反过来说，用 Homebrew 卸载 App 时如果加上 `--zap`（`brew uninstall --zap herdr-app`），依 cask 信息会把这个文件夹一起移到废纸篓，你的设置和 mod 也会跟着不见。（进阶：设置了 `XDG_CONFIG_HOME` 或 `HERDR_APP_HOME` 环境变量的话，位置会跟着改。）

**改快捷键：`keys.json`**：任何快捷键都能在 `keys.json` 里改，格式例如：

```json
{"global": {"ctrl-shift-t": "tab.new"}}
```

这一行的意思是：在任何地方按 `ctrl-shift-t`，都执行“新建标签页”（`tab.new`）。保存后窗口会重新加载；改坏了会保留上一个能用的版本，并把错误写到 `keys.error`。要注意两件事。第一，没动过的按键文件，升级时会自动换成新版的默认设置；只要你改过（哪怕只改了空白），整个文件就算你的，之后新增的默认快捷键要自己手动加。第二，单纯的 ctrl 加字母（例如 ctrl+c、ctrl+d）默认会交给终端里的程序，不要拿来绑定 Herdr 的操作。

**内置的 layout 和 mod**：要改结构或代码前，先复制一份再改。你的副本不会被动到；内置的那份，Herdr 每次启动都会更新成最新版。

**让 agent 帮你改：`AGENTS.md`**：依官方首页，Herdr 把 layout、侧边栏、标签页、快捷键和主题都存成 `~/.config/herdr-app` 里的普通文件，里面的 `AGENTS.md` 会向你的 agent 解释这些文件。下载页的建议是：让 agent 先读这份指南，然后用平常说话的方式说出你想要什么，例如一个看板、每个标签页一个计时器，或换一种外观。**不要自己改 `AGENTS.md`**：它每次启动都会由 App 重新写入，你的修改会被覆盖。

**`herdr-app --skill`**：打印给 agent 看的窗口操作指南，普通用户用不到。官方的分工是：运行和协调程序用 herdr-core，改变你看到的界面用 App。herdr-core 自己的手册则是 `hc --skill`。

**救急键 `ctrl-alt-shift-escape`**：layout 或快捷键改坏、界面乱掉时，同时按 Ctrl、Alt（Mac 键盘上是 Option）、Shift 和 Esc。依内置指南，这组键始终有效、不能被改掉：它会把当前的 layout 和 `keys.json` 移到一边（改名成 `*.reset-<时间>`），回到默认的 `main` layout。

## 隐私、更新与 mod 安全

![隐私与更新：在 Settings → Privacy 或 settings.json 关掉遥测，在 Settings → Updates 看更新，mod 拥有完整权限](privacy.zh-CN.webp){: w="1600" h="900" }
_概念图：在 Settings → Privacy，或在 settings.json 加上 `"telemetry": false` 关掉遥测；在 Settings → Updates 查看更新；mod 拥有完整权限，装之前先读过。_

### 遥测默认开启，三种关法

依官方 [Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md) 文档，使用遥测**默认开启**：正式版每天发送一份小报告到 `https://telemetry.herdr.dev/v1/report`，附带一个随机的安装 ID。

- 会发送的：App 和 core 的版本、操作系统与架构、使用时长和次数落在哪个区间（不是精确数字）、已知 agent 的名称、内置 layout 的名称、mod 数量、App 命令名称、固定事件的计数。自定义 layout 的名称一律发送成 `custom`，自定义 mod 的名称不发送。
- 不发送的：终端文字、prompt、文件内容、文件夹路径，以及你自己输入的名称。
- 依[隐私页](https://herdr.dev/privacy/)，使用报告保留 3 个月，不存 IP，不出售也不分享。

三种关法：

1. 在 **Settings → Privacy** 关掉。同一页也能查看报告的内容。
2. 在 `~/.config/herdr-app` 里**现有的** `settings.json` 加上 `"telemetry": false` 这个字段。官方示例写成 `{"telemetry": false}`；文件里已经有其他设置的话，把这个字段加进最外层的大括号里，用逗号和其他字段隔开，不要把整个文件换掉。
3. **只关这一次**：从终端启动 App 时，设置环境变量 `DO_NOT_TRACK=1` 或 `HERDR_TELEMETRY=0`，例如 `DO_NOT_TRACK=1 herdr-app`。在 CI（自动构建、测试代码的服务器环境）里也会自动停止收集。

要知道的两件事：

- 关掉遥测会删掉本机的安装 ID 和还没发出的报告，但**已经发出的收不回来**。
- 关掉遥测**不会**停止更新检查、mod 发出的网络请求，以及你自己选择发送的反馈。反馈会先拟好给你看，由你决定发送，不会悄悄发出。

### 自动更新怎么运作

依 README 和内置指南：

- 安装版会在后台检查更新，把新版下载到正在运行的 App 旁边。等你退出再打开 App，或选择更新操作时，新版才会接手。终端继续在 core 里跑。
- **Settings → Updates** 显示有哪些更新，App 和 core 的更新操作都放在这里。
- 依内置指南，只有少数重点版本会在更新后自动打开 What's New（更新说明）；其他版本只在这次启动时显示一个小小的 Updated 标记。想看更新内容，可以从 Settings → Updates 的 What's new 按钮或命令面板打开。
- App 更新后第一次启动，也会把 herdr-core 更新到同一代的最新版，终端照样跑。
- 如果 App 崩溃或被强制结束时，已经有一个验证过的新版在等，下次启动会先装好它，再打开窗口。
- 从源代码自己构建的版本不会自动更新。

### 更新的验证：只比对 SHA-256

> 依官方安全文档，App 在解压更新文件之前，会比对它的 SHA-256 指纹和发布清单上写的是否一致。但指纹和清单来自同一个服务，这个比对只能发现下载过程中文件损坏，不是发布清单上的独立签名；App 也不会另外验证更新清单的数字签名。换句话说，如果有人能同时换掉更新文件和清单，这道检查拦不住。安全文档也写明，发布流程没有配置签名证书时，安装包可能没有签名，或只有 ad hoc 签名（没有绑定开发者身份的签名）；Apple 公证（notarization，Apple 替 App 做的安全检查）是另外测试的，不是发布的必要条件。官方的原话是：“Do not assume every download is notarized or signed.”也就是不要假设每个下载都经过公证或签名。
{: .prompt-warning }

### mod 和别人做的 layout：先读再装

> 依官方安全文档，mod 是在 Herdr 里运行、被信任的 JavaScript，没有沙箱，权限完整：它能以你的身份运行程序、访问任何网址、读你的文件，也能在你连接的其他机器上运行程序。官方明说 mod 不是安全边界（is not a security boundary），也就是 Herdr 不会替你拦下 mod 做的事，也不会为每个程序或网络请求弹出权限提示。安装别人的 mod 前先读过，把它当成你要亲手运行的 shell 脚本。layout 也能加载 mod，所以装别人的 layout 时，它引用的 mod 也要检查。
{: .prompt-warning }

想从 [gallery](https://herdr.dev/gallery) 找别人做的 layout 或 mod 时，内置指南要求 agent 先读过 recipe（每个作品附带的 `RECIPE.md`，说明它是怎么做出来的）和每个文件，并在加入前告诉你：这个 mod 会不会联网、运行程序（`exec`、`hc`），或读取它自己文件夹以外的文件。

还有两点和配置文件夹有关：

- mod 可能把敏感数据存在 `~/.config/herdr-app`，Herdr 不会加密这个文件夹。
- App 在这个文件夹里开了一个本机控制 socket（本机程序之间通信用的连接点），让 agent 能查看和操作窗口。官方提醒：能访问这个文件夹，就等于能操作窗口和它的命令。

## 整理一下

做完这几步，你会有一个桌面窗口：每个 repo 一个 space、每件工作一个标签页，从 agents 侧边栏就看得出哪个 agent 在等你。

- 安装：Apple Silicon Mac 用 dmg 或 `brew install --cask herdr-app`；Linux、Windows 先下载脚本、读过再运行；Intel Mac 没有安装包。
- 开 agent：从标签栏的 + 开，或直接在 pane 里启动；macOS 第一次弹出权限询问时，点“允许”。
- 整理：一个 repo 一个 space、一件工作一个标签页；要并排就分割 pane。
- 看状态：先处理 Blocked，再看 Done；没有状态，就照“状态没出现时”逐项检查。
- 关掉窗口没关系；关掉 pane 或标签页会结束里面的终端；重启后，agent 要自己重新启动。
- 遥测默认开启，要关就到 Settings → Privacy；关掉不会停掉更新检查。
- 更新只比对同一服务提供的 SHA-256，不另外验证签名。
- 装别人的 mod 或 layout 前，先读过每个文件。

## 下一步

- 想在终端里管理 agent：[herdr 入门：在终端同时跑多个 AI，找出卡住的那个](/posts/herdr-run-multiple-ai-agents/)（Herdr TUI，和 App 是不同的程序）。
- 让每个 agent 在自己的工作目录里干活：[git worktree 教程：让两个 AI 在同一个 repo 分开工作](/posts/git-worktree-parallel-ai-agents/)。
- 操作细节以官方 [herdr-app README（v0.1.15）](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)为准。

延伸阅读：[README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md)、[Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md)、[内置指南 AGENTS.md](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/AGENTS.md)、[macOS 默认快捷键](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json)、[Linux／Windows 默认快捷键](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json)、[CHANGELOG](https://github.com/herdrdev/herdr-app/blob/v0.1.15/CHANGELOG.md)、[安装脚本](https://github.com/herdrdev/herdr-app/blob/v0.1.15/distribution/install.sh)、[herdr.dev](https://herdr.dev/)、[下载页](https://herdr.dev/download/)、[手机 App](https://herdr.dev/mobile/)、[herdr-core](https://herdr.dev/core/)、[隐私](https://herdr.dev/privacy/)、[Herdr TUI](https://herdr.dev/tui/)、[Homebrew cask](https://formulae.brew.sh/cask/herdr-app)。
