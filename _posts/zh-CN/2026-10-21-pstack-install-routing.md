---
title: "pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook"
description: "pstack 有 56 个命令，第一次用只要记住 /poteto-mode。本文用 Claude Code 实测，说明怎么安装、/setup-pstack 怎么选模型，以及三种任务各被分到哪个 playbook。"
date: 2026-10-21 21:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-install-routing/
image:
  path: cover.zh-CN.png
  alt: "装一次、设置一次模型，之后每个新任务都从 /poteto-mode 开始；它说用了哪个模型，要自己再核对。"
---

你听说 pstack 能让 AI 编程助手做事更严谨，打开一看，光是命令就有 56 个，另外还有两个专用的 subagent 和二十多个 playbook。难道要先把这些名字全部记住才能开始用？

先说明几个名词。AI 编程助手指的是 Cursor、Claude Code 这类能读写项目文件、替你写代码的工具。skill 是一份“告诉 AI 怎么完成某类工作”的操作说明。pstack 是 Lauren Tan 在 Cursor 官方插件库 [`cursor/plugins`](https://github.com/cursor/plugins/tree/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack) 里维护的一整套 skill。playbook 是针对一种任务写好的固定步骤，例如“修 bug”要先复现、再找原因、修完再验证。subagent 则是主对话另外派出去、专门做一小段工作的 AI。

答案是不必全部记住。装好插件、用 `/setup-pstack` 选好模型之后，每个新任务都用 `/poteto-mode` 开头，描述症状和“怎样算完成”，它会自己挑 playbook。不知道从哪里开始时，再问 `/poteto-help`。

不过，在这次的实测环境里也看到，它“说自己用了什么模型”和“实际用了什么模型”不一定一样。这一点后面会详细说明。

> pstack 系列｜第 1 篇
>
> - 系列导读：这套 skill 是什么、四篇该怎么读（尚未发布）
> - 下一篇（第 2 篇）：改代码之前，先看懂再设计（尚未发布）
>
> 本文以 pstack [`0.15.29` 版](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json)为准，对应 `cursor/plugins` 的 commit `88d4751`（2026-10-20）。2026-10-21 21:31（台北时间）核实时，`cursor/plugins` 的 main 已经往前走，但 pstack 文件夹最后一次变动仍是这个 commit，版本也还是 `0.15.29`。
{: .prompt-info }

> **这次怎么测的**：所有实测都在 2026-10-21 21:09–21:23（台北时间）进行，由操作者在我的 Mac（macOS 27.0、Claude Code 2.1.306）上用 Claude Code 的非交互模式 `claude -p` 执行，不是在交互界面手动操作。pstack 用的是我之前自己在 Claude Code 装好的版本（user scope，对这台电脑上的所有项目生效），这次**没有重装**。为了安全，这次特意设了权限白名单：禁止写入 `~/.claude/` 下的全局配置，禁止 `git push`、`gh`、`curl` 和联网。**Cursor 上的任何操作都没有实测**。
{: .prompt-tip }

## 先看 pstack 装了什么

`0.15.29` 版装好后，Claude Code 里会多出 56 个 `/pstack:<skill>` 命令，以及 `pstack:poteto-agent`、`pstack:comment-sicko` 两个 subagent。`poteto-mode` 下的 `playbooks/` 文件夹有 23 个文件。pstack 没有单独的命令文件夹，所有命令都来自 skill。

Claude Code 会在插件的命令前面加上插件名称，所以 Cursor 里的 `/poteto-mode`，在 Claude Code 里要写成 `/pstack:poteto-mode`。官方的 [Claude Code 对照说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)列出了两边其他的差异，下文会引用几项。

![三步骤示意图：先用 Cursor 或 Claude Code 安装 pstack，再用 /setup-pstack 选预算和模型并写入全局配置文件，之后每个新任务都用 /poteto-mode 开头；各步骤标出这次有没有实测](install-setup-flow.zh-CN.png){: width="800" height="450" }
_第一次使用的三步：安装、选模型、从 /poteto-mode 开始。_

## 安装：从哪里装，就是信任谁

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L15-L26) 和[设置指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L5-L15)列出两种装法。在 Cursor 的对话里输入：

```text
/add-plugin pstack
```

在 Claude Code 里，先把 `cursor/plugins` 这个 GitHub 仓库加为 marketplace（插件目录）：

```text
/plugin marketplace add cursor/plugins
```

接着输入 `/plugin install`，后面接插件名称 `pstack`，再紧接着写 `@cursor-plugins`，中间不留空格，意思是“从 cursor-plugins 这个目录安装 pstack”。

> 以上命令照 `0.15.29` 版的 README 引用，**本次未从零安装实测**。我的电脑上已经有 2026-10-18 装好的 pstack，2026-10-20 更新到 `88d4751`，这次直接沿用。
{: .prompt-warning }

选哪一种装法，等于决定你信任谁、内容什么时候会变：

| 装法 | 内容从哪来 | 之后会不会变 |
| --- | --- | --- |
| Cursor 的 `/add-plugin pstack` | Cursor 的插件机制 | 未实测，本文不下结论 |
| Claude Code 的 marketplace | 加入当时 `cursor/plugins` 的内容 | 按 [Claude Code 文档](https://code.claude.com/docs/en/discover-plugins#keep-plugins-updated)，第三方 marketplace 默认不自动更新；你点“更新”时才会拉取最新内容 |
| 第三方整理的镜像 | 不是 `cursor/plugins` 官方维护 | 由镜像作者决定 |

网上也有第三方整理的 pstack 镜像（例如 `backnotprop/pstack`），它不是 `cursor/plugins` 官方维护的版本，要用的话请先看完内容、锁定版本，理由见[这篇供应链与权限风险的文章](/posts/coding-agent-supply-chain-permission-risks/)。

同样的道理也适用于官方 marketplace。加入 marketplace 时，拿到的是当时默认分支的内容，不是某个固定版本。[Claude Code 文档](https://code.claude.com/docs/en/discover-plugins#add-a-marketplace)写明，加入时可以在仓库后面加 `#ref` 指定分支或 tag；点更新之前，最好先看一下 pstack 改了什么。

## /setup-pstack：给每个角色选模型

pstack 会把工作分给不同角色，例如修 bug 的、写功能的、做设计评审的，每个角色可以用不同模型。[`/setup-pstack`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L17-L31) 负责给这些角色选模型，流程是：检测你能用哪些模型、请你选推理预算、列出每个角色的设置，最后写进一个配置文件。

推理预算决定模型“想多久”，也就是 effort。等级越高越仔细，但用的 token 越多：

| 预算 | 推理强度 |
| --- | --- |
| unlimited | 每个模型拉到最高，最高到 `max` |
| large（默认值） | `xhigh` |
| medium | `high` |
| small | `medium` |

配置文件的位置要特别注意。Cursor 写在 `~/.cursor/rules/pstack-models.mdc`，Claude Code 写在 `~/.claude/rules/pstack-models.md`。两个都在主目录下，是**全局**配置，也就是对你电脑上每个项目都生效，不只是当前项目。按[对照说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L37)，Claude Code 会在每个新对话开始时自动加载这份文件。

### 实测：在 -p 模式下改用文字问答

Cursor 版会用菜单问你问题。按[对照说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L10)，Claude Code 的 `-p` 模式没有菜单，所以改用纯文字问答。这次分三次执行，后两次用 `--resume` 接着同一段对话。

第一次只输入 `/pstack:setup-pstack`。它检测到 `opus`、`fable`、`sonnet`、`haiku` 四个模型，读到现有配置的预算是 medium，然后用文字列出选项（节选，原文为繁体中文，此处转为简体）：

```text
1. unlimited — max reasoning
2. large — xhigh reasoning（等同 skill 预设值）
3. medium — high reasoning（目前）
4. small — medium reasoning
```

第二次回复“3”，它列出 17 个角色的完整表格，例如 `feature, refactoring` 用 `opus high`、`bug-fix` 用 `fable high`。有 4 个评审类角色会同时列出 opus、fable、sonnet、haiku 四个模型，表示每次各跑一个 subagent，共 4 个。

第三次回复“照这张表写入”。写入被权限挡下，因为这次特意禁止写入全局配置。它回报说没有改用其他方式绕过，而且它想写的内容和现有文件一模一样，配置文件的 sha256 前后也没变。接着它主动提议创建两种用于验证的 skill，这部分留到第 3 篇再谈。

三次合计耗时约 52 秒（20、9、23 秒），API 等价金额 0.321 美元。

> **未实测**：交互界面的菜单画面、`/setup-pstack` 实际写入配置文件的过程。
{: .prompt-warning }

## /poteto-help：不确定时先问它

`/poteto-help` 是 pstack 的服务台。这次在练习项目里问它（原文为繁体中文，此处转为简体）：

```text
/pstack:poteto-help 我有一个小型 Python CLI 专案（就是目前这个 repo），想开始用 pstack。第一步该做什么？之后要修 bug、加小功能时，该用哪个 skill？
```

它花了 51 秒（API 等价 0.387 美元），回答的要点是：

- 模型配置已经存在，不用重跑 `/pstack:setup-pstack`。
- 建议先跑 `/pstack:create-verification-skill`，给项目建一个让 AI 能自己实际运行 CLI 来检查结果的 skill。
- 修 bug 和加小功能都用 `/pstack:poteto-mode`。项目有便宜的单元测试时，可以加上 `/pstack:tdd`，也就是先写一个会失败的测试再修。
- 很小、很明显的修改不需要 pstack，直接说就行，可以省 token。
- Claude Code 没有 Cursor 的 Custom Mode（让某个 skill 在整段对话持续生效的模式），所以每个新任务都要用 `/pstack:poteto-mode` 开头；同一段对话里要换话题，先说“new task”。

最后两点在 [`poteto-help` 的说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L57-L60)里也写得很清楚。在 Cursor 里，从 `/` 菜单用 Option+Enter（Mac）或 Alt+Enter（Windows）选 `/poteto-mode`，就能把它变成 Custom Mode；这部分没有实测。

## /poteto-mode：同一个命令，三种任务

`/poteto-mode` 会先判断任务属于哪一种，再打开对应的 playbook，把步骤原样抄进待办清单。决定不做的步骤不会消失，而是留在清单上并注明 `skip: <理由>`。

[`poteto-mode` 的 playbook 清单](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L121-L150)涵盖调查（Investigation）、修 bug（Bug fix）、性能问题、新功能（Feature）、重构、原型、编写 skill 等。规模大、涉及很多地方的工作，或者找不到对应 playbook 的任务，会交给 `figure-it-out` 这个 skill 另外设计一套流程。

![示意图：三种任务描述都从 /poteto-mode 进入，只读调查对应 Investigation、修 bug 对应 Bug fix、加 --json 对应 Feature，并列出每次的结果、耗时和 API 等价金额](poteto-mode-routing.zh-CN.png){: width="800" height="450" }
_三次任务都用同一个命令开头，分到的 playbook 都符合预期。_

### 练习项目

练习项目 `pstack-lab` 是一个用 Python 3.13.7 写的记账 CLI，叫 `ledger`，有 3 个模块、8 个单元测试。里面特意埋了一个 bug：用括号表示的支出，例如 `(12.00)`，应该当成 -12.00，程序却当成正数。

三次任务都用 `/pstack:poteto-mode` 开头，只写症状和完成条件，不写猜测的原因，也不指定步骤：

| 任务 | 分到的 playbook | 结果 | 耗时 | API 等价（美元） |
| --- | --- | --- | --- | --- |
| 只读调查：金额从读进来到打印出来经过哪些函数、哪里四舍五入、哪里可能算错 | Investigation | 列出完整调用路径和 8 个风险点，第 1 点就是埋的 bug；没有改任何文件 | 5 分 05 秒 | 1.683 |
| 修 bug：括号支出被算成收入 | Bug fix | `parser.py` 改 2 行、新增 2 个测试，10 个测试全部通过 | 1 分 58 秒 | 0.740 |
| 加功能：`ledger summary --json` | Feature | `cli.py` 改 3 行、README 加 1 行、新增 3 个测试，13 个测试全部通过 | 2 分 40 秒 | 1.033 |

三次都是先读 Claude Code 对照说明，再读对应的 playbook。

### 修 bug：先复现，再修

修 bug 的提示要求“附上修正前后的实际 CLI 输出”，也要求“不要 commit”。下面两段输出节选自它的回报。修正前，10 月的支出只算到 4.50：

```text
$ python3 -m ledger summary samples/october.csv --month 2026-10
transactions: 6
income:          3205.95
spending:           4.50
net:             3201.45
spending by category:
  food                4.50
```

修正后：

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

它在回报里说明，预期值是从 CSV 手算的，不是拿程序输出当答案。改动只有一处：`parse_amount` 先记下输入有没有括号，有的话就把数字取负。Bug fix playbook 的最后两步是整理 commit 和开 PR，它都标成 skip，理由是“你说不要 commit”。

### 加功能：小改动，自己跳过设计步骤

加 `--json` 的任务走 Feature playbook。它自己跳过了三个步骤：先摸清相关代码（`how`）、并行比较几种设计（`architect`）、事后找人质疑设计（`interrogate`）。理由是相关代码只有两个小文件，而开 4 个设计 subagent 的花费会比这个改动本身还高。

它用 HEAD 的版本和改过的版本跑同样四组参数，比对结果完全相同，证明不加 `--json` 时的文字输出没变。加上 `--json` 的输出（节选）：

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

练习项目里的两个 commit（`3c1ea12`、`579a745`）是操作者在每次执行后自己提交的，不是 pstack 做的。两次提示都明确要求 pstack 不要 commit，它也照做了。

## 这次环境观察到的五件事

以下五点都是在这次的环境（账号、版本、`-p` 模式）观察到的，不代表在其他账号或交互界面也一定会发生。

![示意图：五张卡片列出这次环境观察到的现象，包括配置选了不能用的模型而收到 429、回报的模型与实际不符、effort 比配置低、-p 模式的权限限制，以及没装 cursor-team-kit 时没有任何提示](observed-caveats.zh-CN.png){: width="800" height="450" }
_五件事都只在这次的环境观察到，不是普遍结论。_

**1. 配置里选了 fable，但这个账号不能用。** 配置文件里修 bug 的角色是 `fable high`。修 bug 任务派出 subagent 时，立刻收到 HTTP 429 错误，信息是“Fable 5.1 requires usage credits”。按[对照说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L44)，`/setup-pstack` 检测模型时只看 Claude Code 工具定义里列出哪些模型，不会确认你的账号实际能不能用。所以配置表上列得出来的模型，不保证真的跑得动。

**2. 它说用了 Opus，实际跑的是 Sonnet。** 收到 429 之后，它改派一个不指定模型的 subagent 继续。最后的回报写“我依规则改用 session 模型 Opus 跑 subagent”，但运行记录显示，这个 subagent 实际跑在 `claude-sonnet-5-5`。

**3. effort 比配置低。** 配置文件里每个角色都是 `high`。调查任务派出的 subagent 用了 `high`，但修 bug 和加功能这两次都用了 `low`，加功能那次的理由是“规格已经写死”。

**4. `-p` 模式的权限限制。** 除了前面说的没有菜单、要用 `--resume` 分次回答之外，在后台运行的 subagent 一律不能跑 Bash 命令，错误信息是“Permission prompts are not available in this context”。调查任务的 subagent 因此只能读代码，运行命令收集证据的工作改由主对话补做。用分号串起来的命令、写到 `/tmp` 这类操作也常被挡，调查任务被挡了 12 次，加功能任务 7 次。这些限制有一部分来自这次特意设的权限白名单，不全是 `-p` 模式本身造成的。每次被挡，它都改用比较简单的命令完成，没有试图绕过。

**5. 没装 cursor-team-kit，也没有任何提示。** 这点下一节说明。

## cursor-team-kit 要不要一起装

[README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L255-L263) 写明，`/poteto-mode` 会用到的三样东西不在 pstack 里，而在另一个插件 `cursor-team-kit`：清理代码的 `/deslop`，以及操作 CLI 和浏览器界面的 `control-cli`、`control-ui`。README 的建议是：想要完整功能，就把 `cursor-team-kit` 一起装。[指南第 5 章](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/05-build-and-clean.md#L59)另外说明，开 PR 前的流程会跑 `/deslop`；没有它的话，就用大白话要求同样的清理，例如删掉旁白式注释和用不到的防御代码。

这次我的电脑上没有装 `cursor-team-kit`。三次任务都没有出现错误，也没有提醒你缺了什么。修 bug 那次，它甚至直接去读 marketplace 里那份还没安装的 `control-cli` 说明文件。

但三次任务都没有走到 commit 和开 PR，`/deslop` 本来就不会被调用。所以这次的结果只能说明“没走到那一步时没有提示”，不能推论成缺了也没关系。如果你打算让 pstack 一路做到开 PR，照 README 的建议一起装更稳妥。

> **未实测**：缺少 `/deslop` 时的实际行为。另外，Claude Code 遇到 Cursor 专属功能时，对照说明规定要打印一行“Skipped in Claude Code: …”后继续，这三次任务都没有用到 Cursor 专属功能，所以这行提示也没有实测到。
{: .prompt-warning }

## 用量与费用

这次 7 次执行（5 段对话）合计约 11 分钟。Claude Code 回报的 `total_cost_usd` 加起来约 4.16 美元，这是**按 API 价格换算的等价金额**。这次用的是订阅方案的额度，没有另外付费；订阅的 5 小时用量从 79% 升到 98%。

三次任务里，调查任务最贵。它的 cache read（重复读入已经缓存过的内容）超过 126 万个 token，输出也有 4 万多个 token。[设置指南](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L45-L52)给了几个省 token 的方法：重跑 `/setup-pstack` 选小一点的预算或便宜一点的模型、把角色设成 `auto` 或 `inherit-parent` 让它直接用主对话的模型、缩短评审角色的模型清单，以及只在需要严谨的工作才用 `/poteto-mode`。

如果你想看另一套“先设置、再由服务台建议下一步”的 skill 怎么用，可以读 [mattpocock/skills 系列第 1 篇](/posts/mattpocock-skills-setup-routing-guide/)和[系列导读](/posts/mattpocock-skills-series-guide/)。

## 第一次使用，照这三步走

pstack 不需要先把 56 个命令记熟。照官方说明装一次，点更新前先看看改了什么；用 `/setup-pstack` 选一次模型，而且只选你的账号实际能用的；之后每个新任务都从 `/poteto-mode` 开始，在 Claude Code 里写成 `/pstack:poteto-mode`，描述症状和完成条件，剩下的交给它挑 playbook。这次三种任务都被分到对的 playbook，也都按提示交出了实际输出。

要多留意的是最后的回报。它说自己用了哪个模型、多高的 effort，不一定和实际运行的一致；需要确认时，看运行记录比看它的说法可靠。下一篇会接着谈，改代码之前怎么用 pstack 先看懂代码、再做设计。

## 延伸阅读

- [pstack README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md)：安装方式，以及不在 pstack 里的组件。
- [设置指南：Set up pstack](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md)：预算、角色和省钱的方法。
- [Claude Code 对照说明](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md)：Cursor 和 Claude Code 的差异。
- [`poteto-mode` 的 SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md)：完整的 playbook 清单和挑选规则。
- [Claude Code：Install and manage plugins](https://code.claude.com/docs/en/discover-plugins)：marketplace 的添加、固定版本和更新方式。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：安装插件前该检查什么。
- [自己写 Agent Skill](/posts/agent-skill-authoring-guide/)：从写 skill 的角度看 description、测试与维护。
