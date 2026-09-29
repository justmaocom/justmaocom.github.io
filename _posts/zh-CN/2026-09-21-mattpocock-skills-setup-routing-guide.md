---
title: "mattpocock/skills 系列（1）：先设置项目规则，再用 ask-matt 找下一步"
description: "第一次使用 mattpocock/skills，不必先记住 25 个 skill。本文说明安装方式、setup-matt-pocock-skills 会替项目留下哪些设置，以及如何用 ask-matt 找出下一步。"
date: 2026-09-21 11:16:29 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, mattpocock, workflow]
media_subpath: /assets/img/posts/mattpocock-skills-setup-routing-guide/
image:
  path: cover.png
---

你准备替现有的订阅服务加入按席位计费，却不确定该先厘清需求、写规格、补测试，还是直接动手写代码。你听说 mattpocock/skills 能让 AI 编程助手把这类工作做得更有条理，打开清单却看到 25 个 skill 名称。难道要先把每一个都搞懂才能开始？

先说明几个名词。AI 编程助手指的是 Claude Code、Codex 这类能读写项目文件、替你写代码的 AI 工具。skill 则可以理解成一份“告诉 AI 编程助手如何完成特定工作”的操作说明，例如怎么访谈需求，或怎么把规格拆成一项项工作。`mattpocock/skills` 是 Matt Pocock 公开的一整组 skill。

答案是不必全部看懂。第一次使用只需要两步：先用 `setup-matt-pocock-skills` 把项目的工作规则记下来，再用 `ask-matt` 依你遇到的问题，建议下一个该用的 skill。

不过，`ask-matt` 比较像服务台，不是会自动跑完整套流程的总管。它只会告诉你下一步该用哪个 skill，实际启动仍要由你来做。

> mattpocock/skills 系列｜第 1 篇
>
> - 下一篇（第 2 篇）：[把模糊需求问清楚，留下共用词汇](/posts/mattpocock-skills-requirements-shared-language/)
>
> 本文以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)为准。官方插件的 [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json#L21-L47)收录 25 个 skill；代码库里另有 9 个仍在试验中、4 个目前不主动推广的项目，分别列在 [`in-progress/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/README.md#L1-L18)和 [`misc/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/misc/README.md#L1-L8)。本系列只讨论官方插件收录的 25 个。
{: .prompt-info }

## 先分清楚安装与启动

![六格图解说明 mattpocock/skills：选择 Claude Code 插件或 skills.sh，运行 setup 创建项目设置，再由 ask-matt 建议下一个 skill。功能需求依次经过需求厘清、撰写规格、拆分工作与实现](ask-matt-router-tutorial.png){: width="800" height="450" }
_第一次使用的完整路径：选择安装方式、运行 setup，再由 ask-matt 建议下一个 skill。_

安装与启动是两个不同的问题。安装方式决定 skill 文件放在哪里、由谁负责更新；启动方式则决定谁能叫某个 skill 开始工作。

### 选一种安装方式

`mattpocock/skills` 以 [`.agents/install-block.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/install-block.md#L5-L57)作为安装说明的唯一依据。依你使用的工具选择：

| 使用情况                           | 安装方式  | 之后怎么维护                       |
| ---------------------------------- | --------- | ---------------------------------- |
| 使用 Claude Code，不打算修改内容   | 官方插件  | 自动更新，内容不能修改             |
| 使用 Claude Code，想自行修改内容   | skills.sh | 文件复制进项目，由你自行修改与更新 |
| 使用 Codex 或其他支持 skill 的工具 | skills.sh | 文件复制进项目，由你自行修改与更新 |

Claude Code 是 Anthropic 推出的 AI 编程助手，Codex 则来自 OpenAI。Claude Code 的官方插件安装命令是：

```bash
claude plugins install mattpocock-skills
```
{: .nolineno }

也可以在 Claude Code 里直接输入 `/plugin install mattpocock-skills`。

Codex 或其他工具则使用 skills.sh 这个安装工具：

```bash
npx skills@latest add mattpocock/skills
```
{: .nolineno }

skills.sh 会让你勾选要安装哪些 skill，以及要装给哪些 AI 编程助手使用。一定要选入 `setup-matt-pocock-skills`；若想照本文使用 `ask-matt`，也要选入它。之后 `ask-matt` 建议的其他 skill，同样要先安装才能使用。

两种方式任选其一即可，同时使用会让每个 skill 各出现两份。使用 skills.sh 时，更新单一 skill 的命令是：

```bash
npx skills@latest update <name>
```
{: .nolineno }

### 看懂谁能启动 skill

`mattpocock/skills` 依“谁能启动”把 skill 分成两类：

| 原文名称      | 谁能启动                              |
| ------------- | ------------------------------------- |
| user-invoked  | 只能由人输入名称启动                  |
| model-invoked | 人可以启动，AI 也能依工作内容自行采用 |

只能由人启动的 skill，可以再调用 AI 能自行采用的 skill，但不能调用另一个只能由人启动的 skill。完整限制记在[启动方式规范](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)。

`setup-matt-pocock-skills` 与 `ask-matt` 都只能由人启动，你必须主动输入名称。Claude Code 和 Codex 的输入方式不同：

| 工具        | 输入示例                    |
| ----------- | --------------------------- |
| Claude Code | `/setup-matt-pocock-skills` |
| Codex       | `$setup-matt-pocock-skills` |

在 Codex 中，可以先输入 `$` 再从清单选择 skill，也可以直接输入 `$skill-name`。这项语法可在 [OpenAI 的 Codex skills 文档](https://developers.openai.com/codex/skills/)核对。其他 AI 编程助手请依各自的 skill 菜单或输入方式操作。

这项限制也说明了为什么 `ask-matt` 只能提出建议：它推荐的 `grill-with-docs` 同样只能由人启动，所以你得自己输入。它也不会自动一路往下执行 `to-spec`、`to-tickets` 和 `implement`。

## setup 会替项目留下哪些设置

`mattpocock/skills` 里偏重软件开发的 skill（原文归在 engineering 类）需要知道项目的一些基本信息。因此，每个项目在第一次使用它们之前，要先运行一次 `setup-matt-pocock-skills`。它不是固定不变的安装程序，而是先检查、再询问，最后才写入文件的流程。

它会先查看项目现状：代码放在哪个平台（例如 GitHub）、项目里是否已有给 AI 看的说明文件（`AGENTS.md` 或 `CLAUDE.md`）、词汇表与决策记录、先前留下的配置文件，以及项目是否由多个子项目组成（原文称 monorepo）。其中，词汇表（`CONTEXT.md`）记录项目专用名词的定义，决策记录（ADR）则记录重要技术选择的理由，下一篇会详细介绍。

查看完毕后，它会依次确认三件事：

- **工作记录在哪里。** 原文称为 issue tracker，本系列称为“工作跟踪工具”，也就是团队记录待办事项的地方。代码放在 GitHub 时，默认建议 GitHub Issues；放在 GitLab 时，则建议 GitLab。你也可以直接用项目文件夹里的 Markdown 文件记录。若使用 Jira、Linear 等其他工具，则由你用一段文字说明操作方式。
- **是否沿用默认的分类标签。** 这些标签是给整理外部反馈的 `triage` 使用的，所以只有安装了 `triage` 才会询问。
- **词汇表与决策记录放在哪里。** 一般项目集中放一份即可；只有发现项目由多个子项目组成时，才会询问是否每个子项目各放一份。

确认后，它会修改或创建以下文件：

| 位置                           | 写入内容                                   | 条件                                     |
| ------------------------------ | ------------------------------------------ | ---------------------------------------- |
| `CLAUDE.md` 或 `AGENTS.md`     | `## Agent skills` 段落，指向下列各份配置文件 | 有 `CLAUDE.md` 就改它，否则改 `AGENTS.md` |
| `docs/agents/issue-tracker.md` | 工作跟踪工具的位置与操作方式               | 一定会创建或更新                         |
| `docs/agents/domain.md`        | 词汇表与决策记录的存放方式                 | 一定会创建或更新                         |
| `docs/agents/triage-labels.md` | 分类标签的名称                             | 只在安装了 `triage` 时创建或更新         |

如果项目里两份说明文件都没有，它会先问你要创建哪一份，不会自行决定。如果文件里已经有 `## Agent skills` 段落，它会直接更新该段落，不会重复添加。

setup 只把标签名称写进 `docs/agents/triage-labels.md`，原始流程里没有到 GitHub 或 GitLab 创建标签的步骤。开始分类之前，最好先确认工作跟踪工具里的标签名称与配置文件一致。

写入前，它必须先展示 `## Agent skills` 段落与各份配置文件的草稿，让你修改和确认。完成后，这些文件就是一般的项目文档，之后可以直接编辑。只有想更换工作跟踪工具或从头设置时，才需要再运行一次。

## ask-matt 如何选下一步

`ask-matt` 不要求你先记住所有 skill。你只要描述目前的状况，它就会建议从哪个 skill 开始。常见的起点如下：

| 目前状况                                     | 建议起点          |
| -------------------------------------------- | ----------------- |
| 在项目里，想把一个还不完整的想法谈清楚       | `grill-with-docs` |
| 没有项目文件夹，只想把想法谈清楚             | `grill-me`        |
| 要整理别人送进来的问题反馈与需求             | `triage`          |
| 遇到难以复现、时有时无，或最近才出现的错误   | `diagnosing-bugs` |
| 工作范围模糊，而且一次对话谈不完             | `wayfinder`       |

一般功能开发的主线，是先用 `grill-with-docs` 通过访谈厘清需求。如果某个问题得先做出能实际操作的东西才答得出来，例如界面该长什么样子，流程会暂时岔出去：先用 `handoff` 把目前的进度写成交接文档，在新的对话里用 `prototype` 做一个用完即丢的原型，得到答案后再用 `handoff` 把结果带回原本的讨论。

如果确定这项工作要分成好几次对话才做得完，接着用 `to-spec` 整理规格、用 `to-tickets` 把规格切成一张张工作单，最后每张工作单各开一次新的对话，用 `implement` 实现。`implement` 会在内部用 `tdd`（先写测试、再写代码的开发方式）完成功能，并在提交修改前用 `code-review` 检查一遍。

从需求访谈到 `to-tickets`，都应该留在同一段对话里，让后面的步骤接续前面的讨论。工作单创建好之后，每张工作单才各自开新的对话；工作单已写明所需信息，不必依赖先前的对话内容。完整规则位于 [`ask-matt/SKILL.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)。

![左侧进度条显示正在背 25 个 skills，右侧 ask-matt 询问目前卡在哪一步](ask-matt-router-meme.png){: width="800" height="450" }
_记忆测试取消，工作开始。_

## 模拟场景：替现有服务加入按席位计费

这一节依 `1.2.3` 版的原始规则推演，不是实测记录。假设项目由几个子项目组成，代码放在 GitHub，工作也用 GitHub Issues 跟踪。

以 Codex 为例，先用 skills.sh 安装需要的 skill，这里假设后文提到的 skill 都已选入。接着输入：

```text
$setup-matt-pocock-skills
```

setup 发现代码放在 GitHub，会建议沿用 GitHub Issues。它也会从文件夹结构看出项目由多个子项目组成，因此询问词汇表要共用一份，还是每个子项目各放一份。

如果也安装了 `triage`，setup 还会询问是否沿用五个默认标签：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

这五个标签依次代表“等待评估”、“等待补充信息”、“可以交给 AI 处理”、“需要由人处理”与“决定不处理”。如果团队的工作跟踪工具早已使用别的标签名称，也可以改成对应的名称，避免出现重复的标签。

你确认这些选择后，AI 编程助手会先展示要写入的内容。你同意后，它才修改 `CLAUDE.md` 或 `AGENTS.md`，并在 `docs/agents/` 创建配置文件。

设置完成后，再描述目前卡住的工作：

```text
$ask-matt 需要替现有订阅系统加入按席位计费。目前只有一段需求描述；需求应该能在一次对话中谈清楚，但实现会分好几次进行。
```

依照 `ask-matt` 的规则，它会建议先用 `grill-with-docs`，把价格怎么算、席位何时开始与停止使用、账单周期，以及旧客户如何迁移等问题谈清楚。流程不会自动往下跑，你要自己输入：

```text
$grill-with-docs
```

需求谈清楚后，继续在同一段对话里依次输入：

```text
$to-spec
$to-tickets
```

`to-tickets` 会把规格切成较小的工作单，并标明哪些工作单要先完成、哪些要等前面的做完才能开始。

工作单创建好之后，每张工作单各开一次新的对话，再输入：

```text
$implement <工作单链接或编号>
```

这套流程只负责安排工作顺序，不会替团队决定价格规则、席位怎么计算，或旧数据怎么迁移。这些产品与技术上的选择，仍要在厘清需求时由团队确认。

## 第一次使用时怎么选

如果打算采用这套流程，先选一种安装方式，再替项目运行一次 setup。之后若不确定某项工作该怎么进行，再问 `ask-matt`。

如果你已经知道下一个 skill 是什么，可以跳过 `ask-matt`，直接启动它。不过，需要读取工作跟踪工具或词汇表设置的 skill，仍要先完成 setup。若只是一次性、不在项目文件夹里的工作，就不必为了使用单一 skill 而创建整套项目设置。

这篇文章核对的是 `1.2.3` 版的设计与操作方式，不代表这套流程一定能缩短开发时间。它直接带来的好处，是把项目惯例写成文档，并在你不确定下一步时建议合适的 skill。下一篇会接着讨论如何把需求问清楚，并建立团队共用的词汇。

## 延伸阅读

- [`README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L25-L80)：核对官方安装方式与第一次设置的说明。
- [启动方式规范](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)：了解哪些 skill 只能由人启动。
- [`setup-matt-pocock-skills`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md#L9-L116)：查看它读取与写入哪些文件。
- [`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)：查看不同状况各自适合哪个下一步。
- [OpenAI Codex skills](https://developers.openai.com/codex/skills/)：核对 Codex 的 skill 选择与启动方式。
