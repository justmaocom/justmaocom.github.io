---
title: "pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook"
description: "一步一步教你在 Claude Code 或 Cursor 安装 pstack、检查和固定版本、用 /setup-pstack 选模型，以及怎么写 /poteto-mode 的任务描述，让它替你挑 playbook。"
date: 2026-10-22 15:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-install-routing/
image:
  path: cover.zh-CN.png
  alt: "教你安装 pstack、核对版本、用 /setup-pstack 选模型，再把每个任务交给 /poteto-mode。"
---

pstack 能让 AI 编程助手做事更有条理，但打开一看，光是 skill 就有 58 个。这篇教你第一次怎么开始：装好 pstack、确认装到哪个版本、选好模型，之后每个任务都交给 `/poteto-mode`。不用先背下所有名字。

先说明几个名词。AI 编程助手指的是 Cursor、Claude Code 这类能读写项目文件、替你写代码的工具。skill 是一份“告诉 AI 怎么完成某类工作”的操作说明，用斜线命令调用，例如 `/poteto-mode`。pstack 是 Lauren Tan 在 Cursor 官方插件库 [`cursor/plugins`](https://github.com/cursor/plugins/tree/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack) 里维护的一整组 skill。playbook 是针对一种任务写好的固定步骤，例如“修 bug”要先重现、再找原因、修完再验证。subagent 是主对话另外派出去、专门做一小段工作的 AI。token 是 AI 计算用量的单位，读和写的内容越多，用掉的 token 越多。

整个流程只有三步：安装一次、用 `/setup-pstack` 选一次模型，之后每个新任务都用 `/poteto-mode` 开头，写清楚目标和“怎样算完成”，它会自己挑 playbook。不知道该用哪个时，先问 `/poteto-help`。

文中的示例提示都是通用写法，你可以直接拷贝，再换成自己项目的内容。

> pstack 系列｜第 1 篇
>
> - 系列导读：这套 skill 是什么、四篇该怎么读（尚未发布）
> - 下一篇（第 2 篇）：改代码之前，先看懂再设计（尚未发布）
>
> **版本提醒**：本文以 pstack [`0.15.32` 版](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/.cursor-plugin/plugin.json)为准，对应 `cursor/plugins` main 的 commit `e853501`（2026-10-24 10:32，台北时间）；pstack 文件夹最后一次变动是 `e73df47`（2026-10-24 06:56）。Claude Code 的命令和菜单，依 2026-10-24 查阅的[官方文档](https://code.claude.com/docs/en/plugins/install)。之后的版本，命令和行为可能会改变。
>
> 本文 2026-10-22 首次发布时以 `0.15.29`（`88d4751`）为准，2026-10-24 改写成教学文并更新版本。
{: .prompt-info }

## pstack 装了什么

`0.15.32` 版有 58 个 skill，每个 skill 就是一个斜线命令。另外还有 `poteto-agent`、`comment-sicko` 两个专用的 subagent，以及 `poteto-mode` 底下的 23 个 playbook。

在 Claude Code 里，插件的命令前面要加插件名称，所以 Cursor 的 `/poteto-mode`，在 Claude Code 里写成 `/pstack:poteto-mode`（见 [README](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/README.md#L30)）。下文的示例都用 Claude Code 的写法；在 Cursor 里，把 `pstack:` 拿掉就好。两边的其他差异，列在官方的 [Claude Code 对照说明](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/harness/claude-code.md)。

![四步：安装 pstack、核对版本、用 /setup-pstack 选模型、每个任务用 /poteto-mode 开头](install-setup-flow.zh-CN.png){: width="800" height="450" }
_第一次使用的流程：安装、核对版本、选模型，再从 /poteto-mode 开始。_

## 第 1 步：安装

[README](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/README.md#L15-L26) 和[设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L5-L15)列出两种装法。在 Cursor 的对话里输入：

```text
/add-plugin pstack
```

在 Claude Code 里，先把 `cursor/plugins` 这个 GitHub repo（放代码的项目库）加成 marketplace（插件目录），再从这个目录安装 pstack：

```text
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

第二行的 `pstack@cursor-plugins` 意思是“从 cursor-plugins 这个目录安装 pstack”。依 [Claude Code 文档](https://code.claude.com/docs/en/plugins/install#install-a-plugin)，在对话里输入 `/plugin install` 不会马上安装，而是先打开插件的说明页，让你看它会装哪些东西，再选安装范围：选“Install for you”（user scope）就是这台电脑上的所有项目都能用。

> 上面的命令都没有指定版本，装到的是当下 `cursor/plugins` 缺省分支上的内容。装别人的插件之前该检查什么，见[这篇供应链与权限风险的文章](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

网络上也有第三方整理的 pstack 镜像（例如 `backnotprop/pstack`），它不是 `cursor/plugins` 官方维护的版本。要用的话，请先看完内容、锁定版本，理由同样见[供应链与权限风险的文章](/posts/coding-agent-supply-chain-permission-risks/)。

## 第 2 步：检查版本、更新，或固定版本

### 看装到哪个版本

装好之后，先确认装到的是哪个版本。依 [Claude Code 文档](https://code.claude.com/docs/en/plugins/install#install-a-plugin)，在终端（输入命令的窗口）运行下面这行，会列出每个插件的 `Version`、`Scope` 和 `Status`；在对话里打 `/plugin`，切到 Installed 分页也看得到。

```bash
claude plugin list
```

把看到的版本号和 [`plugin.json`](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/.cursor-plugin/plugin.json) 对一下，就知道自己是不是和文章用的同一版。

### 更新：缺省不会自动更新

依 [README](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/README.md#L28) 和 [Claude Code 文档](https://code.claude.com/docs/en/plugins/install#keep-plugins-updated)，Claude Code 对第三方 marketplace 缺省**不自动更新**，所以 pstack 会停在你安装时的版本。

- **想手动更新一次**：在终端运行下面这行。
- **想开自动更新**：在对话里打 `/plugin`，切到 Marketplaces 分页，选 `cursor-plugins`，再选 Enable auto-update。

```bash
claude plugin update pstack@cursor-plugins
```

> 更新前，建议先到 `cursor/plugins` 看看 pstack 这次改了什么，再决定要不要更新。开了自动更新，就等于每次都直接接受新内容。理由见[供应链与权限风险的文章](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

Cursor 这边的更新方式，本文不讨论。

### 固定在某个 commit

commit 是 git 里的一个版本纪录，每个 commit 都有一串编号（SHA）。想让 pstack 一直停在你看过的那个 commit，可以用本地文件夹当 marketplace。

先说明为什么要这样做。Claude Code 官方的[命令参考](https://code.claude.com/docs/en/plugins/cli-reference#plugin-install)里，`/plugin install` 没有指定版本或 commit 的选项。`/plugin marketplace add` 可以在 repo 后面加 `#ref`，[固定在某个分支或 tag](https://code.claude.com/docs/en/plugins/install#add-a-marketplace)；但 2026-10-24 查证时，`cursor/plugins` 没有任何 tag。能固定到 commit 的 `sha` 字段，是写在目录的 `marketplace.json` 里、由目录维护者设置的（见 [marketplace 参考文档](https://code.claude.com/docs/en/plugins/marketplace-reference#plugin-sources)），`cursor/plugins` 的 pstack 条目没有设置。

官方文档支持把本地文件夹加成 marketplace，所以可以先把 repo 下载（clone）到自己电脑，切到你审过的 commit，再把这个文件夹加成 marketplace。以下以本文的 commit 为例，在终端运行：

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout e853501d1a466d9cfcda381a677b09b0d17f758f
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

如果你之前已经用 GitHub 来源加过 `cursor/plugins`，两个来源的目录名称都是 `cursor-plugins`。可以先用 `claude plugin marketplace remove cursor-plugins` 移除旧的，再运行上面的命令。注意，依 [Claude Code 文档](https://code.claude.com/docs/en/plugins/install#manage-marketplaces)，移除 marketplace 会一并卸载从它装的插件，所以移除后要重新安装。

这和[供应链与权限风险的文章](/posts/coding-agent-supply-chain-permission-risks/)建议的“先 clone，再切到审过的 commit”是同一个做法。之后想升级，就在这个文件夹里切到新的 commit，再更新插件。

## 第 3 步：用 /setup-pstack 选模型

pstack 会把工作分给不同角色，例如写代码的、做判断的、组成评审小组的，每个角色可以用不同模型。[`/setup-pstack`](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/setup-pstack/SKILL.md) 负责替这些角色选模型。

**什么时候用**：装好之后跑一次。之后换了账号、换了方案，或想改用别的模型时，再跑一次。依[设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L29)，重跑会保留你改过的角色。

**命令怎么写**：

```text
/pstack:setup-pstack
```

**它会一步一步做什么**（[SKILL.md](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/setup-pstack/SKILL.md#L10-L78)）：

1. **侦测你能用的模型。**
2. **请你选推理预算。** 推理预算决定模型“想多久”，也就是 effort。等级越高越仔细，但用的 token 越多。
3. **列出每个角色配哪个模型**，问你要照单全收，还是改掉某几个角色。
4. **检查**你选的模型都在侦测到的清单里；不在的话，会停下来再问一次。
5. **写进设置文件。**
6. **询问要不要替项目产生验证用的 skill。** 一个是让 AI 能像用户一样实际操作你的程序、自己检查结果（`/create-verification-skill`）；另一个是形式验证的 skill（`/create-formal-verification-skill`）。两个都只会问一次，可以拒绝。

预算有四种：

| 预算 | 推理强度 |
| --- | --- |
| unlimited | 每个模型拉到最高，最高到 `max` |
| large（默认值） | `xhigh` |
| medium | `high` |
| small | `medium` |

**你会拿到**：一份全局的模型设置文件。Cursor 写在 `~/.cursor/rules/pstack-models.mdc`，Claude Code 写在 `~/.claude/rules/pstack-models.md`。两个都在家目录底下，“全局”的意思是对你电脑上每个项目都生效，不是只对目前的项目。依[对照说明](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/harness/claude-code.md#L37)，Claude Code 会在每个新对话开始时自动加载这份文件。

**下一步**：开一个新对话。依[设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L43)，模型设置只对新的对话生效。

> **只选你的账号实际能用的模型。** 依[对照说明](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/harness/claude-code.md#L44)，在 Claude Code 里，“侦测到的模型”是 subagent 工具允许填的模型名称，不代表你的账号或方案每一个都能用。不确定时，把角色设成 `inherit-parent` 或 `auto`，它就直接用主对话的模型（见[设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L31)）。
{: .prompt-tip }

## 不确定时：问 /poteto-help

[`/poteto-help`](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-help/SKILL.md) 是 pstack 的说明台。

**什么时候用**：不知道该用哪个 skill、不知道第一步做什么，或想知道怎么省 token。

**命令怎么写**：直接用一般的话问。

```text
/pstack:poteto-help 我刚装好 pstack，第一步该做什么？
```

```text
/pstack:poteto-help 我想请 AI 在合并前审一次我的修改，该用哪个 skill？
```

```text
/pstack:poteto-help 用 pstack 很耗 token，有什么方法可以少用一点？
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-help/SKILL.md#L9-L34)）：

- 回答你的问题，给你一段可以直接送出的提示，并附上答案出自哪个文件。
- 如果是“怎么做”的问题，它**不会**自己开始做，而是让你决定要不要送出那段提示，因为真的运行会用掉 token。
- 如果看不出你要什么，会先问一个选择题：设置、开始任务、挑 skill、处理出错的运行，或客制化 pstack。
- 如果你还没跑过 `/setup-pstack`，而这会影响答案，它会问你要不要现在设置。

如果你送出的是“用 pstack 修这个 bug”这种要它做事的消息，就不算问问题，它会改用 `/poteto-mode` 的方式直接开始做。

## 每个任务：用 /poteto-mode 开头

[`/poteto-mode`](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-mode/SKILL.md) 是 pstack 的入口。你只要说清楚要什么，它会挑 playbook、照步骤做，需要时再叫用其他 skill。

### 任务怎么写

依[指南第 2 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md#L40-L59)，一段好的任务描述最多包含五个部分，每个部分一句话就够：

- **目标**：哪里坏了，或你想要什么。也就是“症状”。
- **怎样算完成**：要能判断“过”或“不过”。“让它更好”“做一小时”都不算。
- **你想看到的证据**：例如实际的命令输出、修改前后的数字。
- **你已经知道的事**：错误消息、重现步骤、相关链接，可以省下它找数据的时间。
- **真正的限制**：例如“先重现再修”“先不要改任何代码”“行为完全不能变”“动手前先给我看”。

有两件事先不要写：**怎么做**（让它有机会找到更好的做法），以及**你对原因的猜测**（说出猜测会让它只往那个方向找）。也不要在提示里逐一列出要用哪些 skill，playbook 已经排好顺序，自己排反而容易漏掉或打乱步骤（[指南第 2 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md#L135)）。

### 三个可以直接改的示例

**调查问题**（只读不改）：

```text
/pstack:poteto-mode 用户退出登录之后，购物车的内容还留着。先查清楚是哪里把数据留下来的，先不要改任何代码。完成条件：说明数据存在哪里、什么时候该被清掉，并附上相关文件的位置。
```

**修 bug**：

```text
/pstack:poteto-mode 导出 CSV 时最后一行会不见，昨天上线后才开始。先重现，再修。完成条件：用现有的测试数据导出，行数和数据库一致。给我看修改前后的行数。
```

**加功能**：

```text
/pstack:poteto-mode 帮这个命令加一个 --json 选项。原本的文本输出要完全不变。两种输出都要验证。
```

依[指南第 2 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md#L103)，“先不要改任何代码”这句话会把任务固定在“调查”的 playbook。

### 它会怎么做

![任务描述写出目标和完成条件，/poteto-mode 挑出对应的 playbook，步骤抄进待办清单，跳过的标 skip](poteto-mode-routing.zh-CN.png){: width="800" height="450" }
_/poteto-mode 先判断任务类型，再照 playbook 的步骤走。_

1. **判断任务类型，挑一个 playbook。** [playbook 清单](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-mode/SKILL.md#L121-L149)涵盖调查（Investigation）、修 bug（Bug fix）、性能问题、新功能（Feature）、重构、试作、撰写 skill 等。规模大、跨很多地方的工作，或是你要离开、之后才回来看结果的工作，会交给 `figure-it-out` 这个 skill 另外设计一套流程。
2. **把 playbook 的步骤原样抄进待办清单**，排在其他待办前面。
3. **决定不做的步骤不会消失**，而是留在清单上，注明 `skip: <理由>`。你可以从这里看出它选择不做什么。
4. **照步骤做**，步骤里用到的其他 skill 会由它自己叫用。
5. **验证并回报。** 其他 playbook 结束时，会接到“开 PR”的 playbook。PR（pull request）是请别人审查、合并修改的请求。

### 你会拿到

- 一份看得到的待办清单，包括被跳过的步骤和理由。
- 最后的回复：做了什么、取舍、你需要决定的事。依 [SKILL.md](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-mode/SKILL.md#L110-L115)，回复要短，但 playbook 要求的段落都要在；有开 PR 的话，会附上 PR 链接。

### 下一步

- **接着做**：对话里已经有前后文时，短短一句就够，例如“do it”“continue”“keep going until done”（[指南第 2 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md#L77-L93)）。
- **换主题**：在同一段对话里换任务，先说“new task”，它才会重新挑 playbook，不会把新问题当成上一个任务的下一步（[指南第 2 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md#L95-L103)）。

```text
/pstack:poteto-mode new task. 查清楚为什么退出登录后缓存还在。先不要改任何代码。
```

- **每个新任务都重新叫一次**：Cursor 可以从 `/` 菜单用 Option+Enter（Mac）或 Alt+Enter（Windows）选 `/poteto-mode`，把它变成 Custom Mode，也就是在整段对话持续生效的模式。依 [`poteto-help` 的说明](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-help/SKILL.md#L54-L58)，Cursor 的文档只在 Agents 窗口和 CLI 列出 Custom Mode；其他环境，包括 Claude Code，每个新任务都用 `/pstack:poteto-mode` 开头。

## cursor-team-kit 要不要一起装

[README](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/README.md#L259-L267) 写明，`/poteto-mode` 会用到的三样东西不在 pstack 里，而是在另一个插件 `cursor-team-kit`：清理代码的 `/deslop`，以及操作 CLI（在终端里用命令操作的程序）和浏览器画面的 `control-cli`、`control-ui`。README 的建议是：想要完整功能，就把 `cursor-team-kit` 一起装。[指南第 5 章](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/05-build-and-clean.md#L59)另外说明，开 PR 前的流程会跑 `/deslop`；没有它的话，就用白话要求同样的清理，例如删掉旁白式注释、没有根据的防御性代码，以及和这次无关的修改。

## 什么时候用哪个

| 情况 | 用哪个 |
| --- | --- |
| 刚装好 pstack | `/pstack:setup-pstack`，跑一次就好 |
| 换了账号、方案，或想换模型 | 再跑一次 `/pstack:setup-pstack` |
| 不知道该用哪个 skill、第一步做什么 | `/pstack:poteto-help` |
| 任何需要严谨的任务：调查、修 bug、加功能 | `/pstack:poteto-mode`，写清楚目标和完成条件 |
| 同一段对话换主题 | `/pstack:poteto-mode new task. …` |
| 很小、很明显的修改 | 不用 pstack，直接跟 AI 说 |

## 一个完整的例子（虚构）

以下是虚构的情境，用来示范流程，不是实际运行的纪录。

假设你刚加入一个网站项目，想用 pstack 处理一个用户回报：“忘记密码的信，链接点下去就说已过期。”

**1. 安装并核对版本。** 照第 1 步装好 pstack，再运行 `claude plugin list`，确认版本和你预期的一样。

**2. 选模型。** 运行 `/pstack:setup-pstack`，选 `large` 预算，只保留账号能用的模型；它问要不要产生验证用的 skill 时，如果这个项目还没有，可以先答应。设置完，开一个新对话。

**3. 不确定时先问。** 你不确定这算调查还是修 bug，可以先问：

```text
/pstack:poteto-help 用户说重设密码的链接一点就过期，我该怎么开始？
```

它会回你一段建议的提示，你看过、改好之后再送出。

**4. 交给 /poteto-mode。**

```text
/pstack:poteto-mode 用户回报：忘记密码信里的链接一点开就显示“已过期”。先重现，再修。完成条件：新寄出的链接在有效期限内可以正常重设密码，过期后才显示已过期。给我看修改前后的重现结果。
```

这段描述写了症状、完成条件和想看的证据，没有写你猜的原因，也没有列 skill。这时待办清单应该会是修 bug 的 playbook 步骤；如果有步骤被跳过，旁边会写 `skip:` 和理由，值得看一眼。

**5. 接着做，或换主题。** 它停下来问你时，回答之后说“continue”。修完想接着加“重新寄送”按钮，就用 `new task` 开头，再描述新功能和完成条件。

## 注意事项

- **小改动不需要 pstack。** [设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L52)写得很清楚：很小、很明显的修改，直接说就好。
- **pstack 会多用 token。** 它会派 subagent、组评审小组，这是严谨的代价。[设置指南](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md#L45-L52)列了几个省 token 的方法：重跑 `/setup-pstack` 选小一点的预算或便宜一点的模型、把角色设成 `auto` 或 `inherit-parent` 让它用主对话的模型、缩短评审小组的模型清单（清单上每多一个模型，就多派一个 subagent），以及只在需要严谨的工作才用 `/poteto-mode`。
- **模型设置是全局的。** 改了会影响这台电脑上的每个项目。
- **更新前先看改了什么。** Claude Code 对第三方 marketplace 缺省不自动更新，这反而让你有机会先检查。
- **不要在提示里排 skill 的顺序。** 交给 playbook 排。

如果你想看另一套“先设置、再由说明台建议下一步”的 skill 怎么用，可以读 [mattpocock/skills 系列第 1 篇](/posts/mattpocock-skills-setup-routing-guide/)和[系列导读](/posts/mattpocock-skills-series-guide/)。

## 结论

第一次用 pstack，不需要先把 58 个 skill 记熟。照官方说明装一次，用 `claude plugin list` 核对版本，按更新前先看看改了什么；用 `/setup-pstack` 选一次模型，而且只选账号能用的；之后每个新任务都从 `/poteto-mode` 开始，在 Claude Code 里写成 `/pstack:poteto-mode`，写清楚目标和完成条件，剩下的交给它挑 playbook。不确定时，问 `/poteto-help`。下一篇会接着谈，改代码之前怎么用 pstack 先看懂代码、再做设计。

## 延伸阅读

- [pstack README](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/README.md)：安装、更新方式，以及不在 pstack 里的组件。
- [设置指南：Set up pstack](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/01-setup.md)：预算、角色和省 token 的方法。
- [指南第 2 章：Route work through /poteto-mode](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/guide/02-poteto-mode.md)：任务描述的写法和更多示例。
- [Claude Code 对照说明](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/docs/harness/claude-code.md)：Cursor 和 Claude Code 的差异。
- [`poteto-mode` 的 SKILL.md](https://github.com/cursor/plugins/blob/e853501d1a466d9cfcda381a677b09b0d17f758f/pstack/skills/poteto-mode/SKILL.md)：完整的 playbook 清单和挑选规则。
- [Claude Code：Install and manage plugins](https://code.claude.com/docs/en/plugins/install)：marketplace 的加入、版本、更新和移除方式。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：安装插件前该检查什么。
- [自己写 Agent Skill](/posts/agent-skill-authoring-guide/)：从写 skill 的角度看 description、测试与维护。
