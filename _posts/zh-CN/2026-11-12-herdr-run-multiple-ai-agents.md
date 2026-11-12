---
title: "同时跑好几个 AI，不再找不到卡住的那个：herdr 入门"
description: "用 brew 或 mise 安装 herdr，为每个 AI 开独立的 worktree 与 pane，从侧栏找出卡住的那个，离开后再接回来。"
date: 2026-11-12 08:00:00 +0800
categories: [AI, 软件开发]
tags: [coding-agent, workflow, git, claude-code, codex]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.zh-CN.webp
  alt: "用 herdr 让每个 AI 各有一个 pane，一眼看出哪个在等你回答，离开后再接回来。"
---

读过[让两个 AI 分开工作：用 git worktree 开独立工作目录](/zh-CN/posts/git-worktree-parallel-ai-agents/)，开始让两三个 coding agent 同时做事之后，下一个麻烦常常是：哪个在等你点“允许”、哪个还在跑，要一个窗口一个窗口切过去才知道；终端关掉，或 SSH 断线，做到一半的工作也可能一起停。

herdr 是在终端里管理多个工作区和分屏的工具。它会把每个 agent 放在自己的 pane，侧栏标出它现在是 working、blocked、done 还是 idle；关掉你看到的窗口，后台的工作仍可继续。官方的说法是“the runtime your coding agents live on”。

这篇以 macOS 和 Linux 为主，用 Claude Code 与 Codex 当例子（官方还支持其他 agent，见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)）。Windows 已有原生支持，但有已知限制，细节见[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)，本文不教 Windows 安装。

> **版本说明**：本文依 herdr v0.9.5（2026-10-15 发布，2026-11-12 确认仍是最新稳定版）的官方文档撰写。herdr 仍是 0.x 版，更新很快，命令与快捷键以[官方文档](https://herdr.dev/tui/docs/0.9.5/)为准。
{: .prompt-info }

## 先说几个词

- **终端（terminal）**：输入命令的文字窗口。
- **herdr**：在终端里管理多个工作区和分屏的工具，会认出每个窗口里跑的是哪个 coding agent，并显示它现在的状态。官方也称它为 terminal workspace manager。
- **workspace／tab／pane**：herdr 的三层。workspace 是一个项目或任务（官方建议 one workspace per repo, task, or investigation）；tab 是 workspace 里的一个版面；pane 是真正的终端分屏（官方：“A pane is a real terminal.”）。
- **后台 server／client**：herdr 把终端放在后台的 server 里跑；你看到的界面是接上去的 client。关掉窗口，server 和里面的 agent 继续跑。
- **detach（离开）／reattach（接回）**：暂时离开界面，之后再接回同一个 session。
- **prefix 键**：先按 `ctrl+b` 放开，再按下一个键。用过 tmux 的人会觉得眼熟。
- **包管理器**：像 Homebrew（`brew`）和 mise 这类帮你安装、升级、移除工具的程序。
- **coding agent、worktree、分支**：沿用 worktree 篇的说法——agent 会自己改文件、跑命令；worktree 是同一个 repo 里另一份独立工作目录；分支是那份工作目录对应的 git 线。

命令、快捷键、状态定义和断线行为以下以官方文档为准，并附上链接。“我建议用 brew 或 mise 安装”“一个 worktree 一个 workspace”“先处理 blocked”则是本站的做法，会另外标明。

## 什么时候用、什么时候不用

- 同时跑两个以上的 agent，或常常要离开座位、用 SSH 连远程机器：值得用。
- 只跑一个 agent，或已经有顺手的安排：不一定要换。
- herdr 不会取代或包住你的 agent。官方 README 写：“herdr doesn't wrap or replace them; it owns their terminals。”它管的是终端，agent 还是你原来用的那个。

下面先看一轮怎么走，接着逐步说明。

![herdr 五步：开 herdr、开 worktree、每 pane 跑一个 agent、找 blocked、离开再接回](workflow.zh-CN.webp){: w="1600" h="900" }
_概念图：一轮的五个步骤是开 herdr、开工作目录、跑 agent、找卡住的、离开再接回。prefix 是先按 ctrl+b 放开，再按下一个键。_

## 步骤 1：安装

![安装 herdr 建议用 brew 或 mise；官方的 curl | sh 一行安装要先下载、看过脚本再执行](install.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是本站建议的做法，用 brew 或 mise 安装与升级；右边是官方首页的一行安装，若要用，先下载脚本、看过再执行。_

我建议已经在用 [Homebrew](https://formulae.brew.sh/formula/herdr) 的人用 `brew install herdr`，已经在用 [mise](https://mise.jdx.dev/) 的人用 `mise use -g herdr`。这两种都列在官方[Install](https://herdr.dev/tui/docs/0.9.5/install/)页。

官方首页另外提供 `curl -fsSL https://herdr.dev/install.sh | sh`。我建议不要直接贴上执行：贴上就跑的是服务器当下返回、你没看过的内容，下次执行也可能不同；而且它会装到 `~/.local/bin`，之后靠 `herdr update` 自己更新，不在你的包管理器清单里，比较不好盘点和移除。用 brew 或 mise，版本查得到，升级和移除也是同一套命令。这不是说安装脚本有问题，而是“先看再跑”的习惯，说明见[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

若一定要用官方脚本，先下载再看过：

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

打开文件看完，再执行 `sh herdr-install.sh`。

用 mise 时若出现 `herdr not found in mise tool registry`，按官方说法，先更新 mise 再试一次。

装好后执行 `herdr --version`，按官方文档，应该会显示版本号（例如 0.9.5）。若你使用中文、日文或韩文输入法，且 prefix 快捷键没反应，请确认是 0.9.5 或更新的版本；官方在这一版修过这个问题。

更新时，用 brew 装的请用 `brew upgrade herdr`，用 mise 装的请用 `mise upgrade herdr`。官方原文是：“Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead.”包管理器更新之后，原本在跑的 server 还会继续；若要套用 server 端的新功能，需先 `herdr server stop` 再重开，见 Install 页的 Update 节。

## 步骤 2：在项目文件夹开 herdr

先 `cd` 到你的项目文件夹，再输入 `herdr`。按[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)，它会启动或接上默认的后台 session；这个 session 还没有 workspace 时，会自动开一个。我建议一个项目对应一个 workspace。

鼠标可以直接点、拖边界，也可以右键分割；官方强调鼠标和键盘都是一等公民，键盘是选用而不是必备。

## 步骤 3：每个工作目录一个 workspace

本站的做法是：每个 worktree 配一个 workspace，让每个 agent 改自己的工作目录，和 worktree 篇的原则相同。有两种开法，选一种即可，底层都是 `git worktree`。合并、删分支，以及有 submodule 时不要用 worktree，都照 worktree 篇。

**做法 A：用 herdr 开。** 在 workspace 列选 `New worktree`，或按 `prefix+shift+g`，再输入分支名称。herdr 会建好 git worktree，并开成一个新 workspace，排在原项目底下。等同在项目文件夹内执行：

```bash
herdr worktree create --branch login-page
```

默认位置是 `~/.herdr/worktrees/<repo>/<分支>`，可在 `~/.config/herdr/config.toml` 的 `[worktrees] directory` 更改，见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)。

**做法 B：沿用 worktree 篇。** 先用 `git worktree add -b …` 开好文件夹，再在 herdr 用 `prefix+shift+n` 开新 workspace，并 `cd` 到那个文件夹。

关掉 herdr 的 workspace，按官方说明，不会删文件夹，也不会删分支。要删 checkout，用 `Delete worktree checkout...`（底层是 `git worktree remove`）或自己跑 `git worktree remove`；分支要另外删。

同一个 workspace 里若还要多开一个终端，例如跑测试，就分割 pane：`prefix+v` 向右，`prefix+minus` 向下。

## 步骤 4：在 pane 里启动 agent

在各 pane 输入 `claude` 或 `codex`。按 Quick start，herdr 会自动认出来。官方还支持 Cursor Agent CLI、GitHub Copilot CLI、OpenCode 等，完整清单见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)，这里不一一列出。

整合（integration）是选用的。不装也能看状态；装了之后，后台 server 重开时，才能接回同一段对话。安装命令是 `herdr integration install claude` 或 `herdr integration install codex`，见[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)。它会改 agent 的设置：Claude Code 会加一个 SessionStart hook；Codex 会改 `hooks.json`，并在 `config.toml` 开 `[features] hooks = true`。可用 `herdr integration uninstall …` 移除，但 Codex 的 `config.toml` 不会被改回去。hook 是什么，可参考[把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒](/zh-CN/posts/claude-code-hooks-automate-checks/)。

## 步骤 5：看状态，找出卡住的那个

![herdr 的五种状态：blocked、working、done、idle、unknown，各代表什么、你该做什么](states.zh-CN.webp){: w="1600" h="900" }
_概念图：五种状态的意思，以及本站建议你该做的事。blocked 要先处理；新的提示界面可能先显示成 idle，idle 不代表可以替它点“允许”。图上的颜色是本站配图用的，不是 herdr 界面的配色。_

侧栏会显示每个 agent 的状态，并往上汇总到 tab 和 workspace：一个 agent 是 blocked，整个 workspace 看起来就会是 blocked。官方定义有五种；“你该做什么”是本站的建议。

| 状态 | 官方定义（白话） | 本站建议你该做什么 |
| --- | --- | --- |
| blocked | 在等你回答、核准或做决定 | 先处理：打开看清楚再回答 |
| working | 正在跑 | 不用管，让它做 |
| done | 做完了，你还没看 | 去看结果、检查改了什么 |
| idle | 做完或在等，你已经看过 | 可以交代下一件事 |
| unknown | herdr 认不出状态 | 自己点进去看一眼 |

要快速找人，按 `prefix+g` 开 Goto 清单，再按 `b` 只看 blocked（`w` 看 working、`i` 看 idle、`d` 看 done、`a` 看全部），Enter 跳过去。

通知默认会在 herdr 里跳提示（`[ui.toast]`），也可以改成系统通知。若要在 macOS 用系统通知，官方建议先 `brew install terminal-notifier`，细节见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)。

按官方[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)页的原文，blocked 的判断故意保守，新的提示界面一开始可能显示成 idle；而且“idle status is not authorization to approve an action”。跳过去之后，要看清楚再点允许。这一点和[用 OWASP Agentic Top 10 检查你的 AI 工作流：十项风险逐条对照与修复方法](/zh-CN/posts/owasp-agentic-top-10-ai-workflow-checklist/)里谈的过度信任、审批疲劳是同一件事。

## 步骤 6：离开，再接回来

要离开时，按 `prefix+q`（先 `ctrl+b` 再 `q`），或直接关终端窗口。按 Quick start，server 和里面的 agent 会继续跑；之后再输入 `herdr`，就会接回同一个 session。

什么会留下、什么不会，官方[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)有表。白话来说：只是离开，全部继续跑。但 herdr 的后台 server 重开、电脑重开或关机时，原来的进程不会继续（README 原文：“the original processes do not survive”）；版面会恢复，对话则只有装了整合才能接回来。

全部收工用 `herdr server stop`。官方说明是结束这个 session，并停止里面的 pane。请注意：这会停掉所有 pane 里正在跑的 agent。

## 整理一下：一轮的用法，加上快捷键速查

一轮就是图上的五步：在项目文件夹开 herdr，为每个任务开工作目录，在各 pane 启动 agent，用侧栏或 Goto 找出 blocked 的，离开后再打 `herdr` 接回。

`ctrl+b` 是 prefix：先按它并放开，再按下一个键。官方[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)把这句写成：“`prefix+c` means: press `ctrl+b`, release, then press `c`。”忘记时按 `prefix+?` 可看全部快捷键。

| 按键 | 作用 |
| --- | --- |
| `prefix+v`／`prefix+minus` | 向右／向下分割 pane |
| `prefix+h`／`j`／`k`／`l` | 在 pane 之间移动 |
| `prefix+c` | 新 tab |
| `prefix+w` | workspace 导览 |
| `prefix+shift+n` | 新 workspace |
| `prefix+shift+g` | 新 worktree |
| `prefix+g` | 开 Goto（再按 `b` 只看 blocked） |
| `prefix+z` | 放大当前 pane |
| `prefix+x` | 关掉当前 pane |
| `prefix+q` | 离开（detach） |
| `prefix+?` | 看全部快捷键 |

## 什么情况怎么做

| 情况 | 建议 |
| --- | --- |
| 只跑一个 agent | 不一定要用 herdr；觉得窗口已经够用，可以先不装 |
| 两三个 agent 各改不同功能 | 本站建议一个 worktree 配一个 workspace |
| 想让 agent 跑着、人先离开 | `prefix+q` 离开；之后再打 `herdr` 接回 |
| 用 SSH 连远程机器做事 | 直接在远程执行 `herdr`，断线后工作仍可继续；或用 `herdr --remote <主机>`，见[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| 状态看起来不对 | 用 `herdr agent explain <目标>` 查看判断依据，见[Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| 要全部停掉 | `herdr server stop`（会停掉所有 pane 里的 agent） |
| 用 brew／mise 装的要更新 | `brew upgrade herdr` 或 `mise upgrade herdr`，不要用 `herdr update` |
| 不想让 herdr 在后台连 herdr.dev | 在设置文件把 `[update] version_check = false` 和 `manifest_check = false`，见[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## 常见误解

- “关掉窗口，工作就停了。”只是离开的话，server 和 agent 会继续跑。
- “有 herdr，就算重开机也不会中断。”原来的进程不会活下来，只会恢复版面；对话要装了整合才接得回来。
- “显示 idle 就代表没事，可以直接点允许。”新的提示界面可能先被判成 idle；idle 不是授权。
- “herdr 会取代 Claude Code 或 Codex。”不会，它只管理终端。
- “关掉 worktree 的 workspace，就会删掉文件夹。”不会，也不删分支。
- “用 brew 装的也可以 `herdr update`。”官方说要用包管理器更新。

## 结论与下一步

每个 AI 一个 pane，看侧栏找 blocked，离开后再接回来。若要在远程机器上这样做，见[How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/)。官方也提供让 agent 自己操作 herdr 的 skill：`herdr --skill` 会打印出与当前版本相符的内容；装任何第三方 skill 之前，先读过内容，见供应链篇。

延伸阅读： [herdr README](https://github.com/herdrdev/herdr)、[v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)、[文档首页](https://herdr.dev/tui/docs/0.9.5/)、[Install](https://herdr.dev/tui/docs/0.9.5/install/)、[Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/)、[Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/)、[Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/)、[Agents](https://herdr.dev/tui/docs/0.9.5/agents/)、[Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/)、[Session state](https://herdr.dev/tui/docs/0.9.5/session-state/)、[Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/)、[Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/)、[Homebrew formula](https://formulae.brew.sh/formula/herdr)。
