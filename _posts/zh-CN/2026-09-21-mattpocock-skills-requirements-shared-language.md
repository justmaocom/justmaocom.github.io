---
title: "mattpocock/skills 系列（2）：把模糊需求问清楚，留下共用词汇"
description: "拆解 grill-me 与 grill-with-docs 的访谈流程，说明如何按照问题的先后关系厘清需求，并把确认过的词汇与少数重要决策写回项目。"
date: 2026-09-21 15:04:43 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, requirements, domain-modeling]
media_subpath: /assets/img/posts/mattpocock-skills-requirements-shared-language/
image:
  path: cover.png
  alt: "成员、用户与席位三张便条指向 CONTEXT.md，呈现从访谈厘清需求到建立共用词汇的流程"
---

你准备替订阅服务加入按席位计费功能。会议记录里同时出现“成员”、“用户”和“席位”，却没有人确认三个词是否代表同一件事。在讨论禁用成员是否仍要收费前，团队得先说清楚计费对象到底是人、账号，还是一份可以分配的资格。

本文提到的 skill，可以先理解成一份“告诉 AI 编程助手如何完成特定工作”的操作说明。`mattpocock/skills` 把这类工作拆成访谈、词汇整理与重新说明。本文会厘清五个相关 skill 的分工，并说明访谈结束后哪些内容会留在项目里。

> mattpocock/skills 系列｜第 2 篇
>
> - 上一篇（第 1 篇）：[先设置项目规则，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)
> - 下一篇（第 3 篇）：[先找出缺口，再决定要写规格还是拆工作单](/posts/mattpocock-skills-specs-work-breakdown/)
>
> 本文内容以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)为准。
{: .prompt-info }

## 先看懂五个 skill 的关系

![grill-me、grill-with-docs 与 wait-what 是由用户启动的入口，其中 grill-me 和 grill-with-docs 会把访谈交给 grilling，grill-with-docs 也会把词汇整理交给 domain-modeling](mattpocock-skills-requirements-1.png){: width="800" height="450" }
_选任选其一个符合目前状况的入口，其余工作由内部流程接手。_

这五个 skill 不是一套必须依次跑完的步骤。`grill-me` 与 `grill-with-docs` 是两个可供选择的起点。`grilling` 与 `domain-modeling` 会在背后接手访谈与词汇整理。`wait-what` 则要求 AI 重讲上一条没说清楚的消息。

| 角色 | skill | 直接用途 |
| --- | --- | --- |
| 由你启动 | `grill-me` | 还没有项目文件夹时，通过访谈厘清想法 |
| 由你启动 | `grill-with-docs` | 已有项目时，一边访谈，一边整理文档 |
| 内部流程 | `grilling` | 按照问题的先后关系安排每一轮提问 |
| 内部流程 | `domain-modeling` | 统一项目用语，必要时留下重要决策 |
| 由你启动 | `wait-what` | 请 AI 补上背景并改用较直接的说法 |

`grill-me`、`grill-with-docs` 与 `wait-what` 都要由你点名启动，AI 不会自行使用。`grilling` 与 `domain-modeling` 则可以由 AI 自行采用，也能被其他 skill 调用。[启动规则](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)记录了这项差异。一般使用时，你只要选择起点，其余工作会由内部流程接手。

## 两个起点区别在于是否留下文档

两个起点使用同一套访谈方式。差别在于访谈期间是否同时整理项目文档。

[`grill-me`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grill-me/SKILL.md#L1-L7)只负责开始访谈。它适合还没有项目文件夹的情况，例如讨论一个尚未成形的想法。它不会创建词汇表，对话结束后也不会在电脑里留下文档。

[`grill-with-docs`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/grill-with-docs/SKILL.md#L1-L7)会同时启动两个内部流程。`grilling` 负责访谈，`domain-modeling` 负责整理词汇与决策。项目文件夹已经存在时，`ask-matt` 会优先建议这个起点，详细条件可查看它的[选择规则](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L13-L18)。

## grilling 先问不能跳过的问题

`grilling` 会先找出问题的先后关系。原始规则称这种结构为“决策树”。如果某个问题必须根据前面问题的答案才能回答，AI 就会把它留到下一轮。

“禁用的成员要不要计费”必须等计费席位的定义确认后才能回答。定义尚未确定时，AI 不应先猜禁用规则。AI 会在每一轮列出当下所有可以决定的问题，逐一编号并附上建议答案。等你回复后，它再决定下一轮要问什么。

[`grilling` 的规则](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grilling/SKILL.md#L6-L28)也说明谁负责回答。能从文档、代码或工具查到的事实由 AI 调查；需要在不同做法之间取舍时，则由你决定。AI 查资料时也不会让整轮提问停下来，只有需要那项资料的问题要等结果，其他问题照常先问。等所有问题都处理完，你也确认双方理解一致后，访谈才结束。

## domain-modeling 会创建项目词汇表

`domain-modeling` 里的 domain 指项目所处理的事物与规则。以本文的例子来说，就是工作区、成员、席位与计费方式。这个 skill 会把确认过的名称写进 `CONTEXT.md`。你可以把这个文件理解成项目专用的词汇表。

如果只是读取词汇表并沿用现有名称，不必特别启动 `domain-modeling`。只有在旧定义可能有问题、名称不够清楚或需要记录重要决定时，才需要它介入。

如果你使用的词和现有定义冲突，AI 应该立即指出差异；遇到一词多义的名称，则提出较精确的正式用词。讨论名词之间的关系时，AI 也会自己设想一些边界情况来测试定义，例如“成员被禁用后又重新激活，原本的席位还在吗？”，让双方把概念之间的界线说清楚。当你描述现有行为时，它也要查阅代码。若代码与说法不同，决定要沿用现状或改变行为的人仍是你。

确认词汇后，`domain-modeling` 会立即更新 `CONTEXT.md`，而不是等访谈结束再整理。这个文件只保存名称与定义，不放代码怎么写等细节。由多个子项目组成的大型项目，可能每个子项目各有一份词汇表。此时放在项目根目录的 `CONTEXT-MAP.md` 就像索引，指出每份词汇表的位置。[`domain-modeling` 的文档规则](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/SKILL.md#L8-L64)定义了这些界线。

重要的技术选择则可能写成 ADR。这是 Architecture Decision Record 的缩写，中文常译为“架构决策记录”。它是一份短文档，交代做了什么选择以及原因。只有当某项决定日后很难修改、没有背景就不容易理解，而且当初确实比较过不同做法时，AI 才会提议创建 ADR。你同意后，它才会写入。原始格式允许 ADR 只写一段话，不要求为了填满模板增加内容。三项条件与格式可在 [`ADR-FORMAT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/ADR-FORMAT.md#L1-L37)核对。

![产品、财务与工程都同意按席位计费，三方对席位的定义却不同，右侧词汇文档写下计费席位的共同定义](mattpocock-skills-requirements-2.png){: width="800" height="450" }
_同意使用同一个词，还不等于同意同一件事。_

## wait-what 只处理刚才没听懂的内容

`wait-what` 是中途使用的修正入口。当 AI 的上一段说明跳得太快或缺少背景时，由你明确启动它。

它要求 AI 重新说明刚才的内容，并补上理解所需的背景。消息中的英文措辞要符合 ASD-STE100，这是一套限制技术英文用词与句型的规范。读者不需要先学会这套规范；它在这里的作用，是让 AI 使用较短的句子与固定用词。内容也要沿用 `CONTEXT.md` 里已确认的词汇。

若项目使用多份词汇文档，它会先从 `CONTEXT-MAP.md` 找到正确位置。完整指令只有一段，可在 [`wait-what/SKILL.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/wait-what/SKILL.md#L1-L7)核对。

它的指令只要求重讲上一条消息，不会重新进行整场访谈。如果问题不只是一段话没听懂，而是整体需求仍然模糊，就该回到 `grill-with-docs` 继续访谈。

## 访谈结果不会全部写进同一份文档

![访谈中确认的内容分流到三个去处：正式名词与定义写入 CONTEXT.md，重要且经过取舍的决定写成 ADR，其他功能行为、例外、默认值与完成标准交给 to-spec 整理](mattpocock-skills-requirements-3.png){: width="800" height="450" }
_访谈结果依内容性质分别写入词汇表、ADR 或后续规格。_

`grill-with-docs` 会写文档，不代表它会把所有答案都塞进 `CONTEXT.md`。访谈内容有三个去处：

| 内容 | 去处 | 例子 |
| --- | --- | --- |
| 项目特有的正式名词与短定义 | `CONTEXT.md` | “计费席位”和“成员”各自代表什么 |
| 变更成本高、容易让后人困惑，且经过取舍的决定 | 经你同意后创建 ADR | 为何由负责计费的程序保存席位分配记录 |
| 其他功能行为、例外、默认值与完成标准 | 先留在对话，之后交给 `to-spec` | 禁用成员何时停止计费 |

`CONTEXT.md` 是词汇表，不是需求文档；ADR 也不是每项答案的流水账。大部分答案会先留在对话中。等你另外启动 [`to-spec`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-spec/SKILL.md#L7-L19)后，这个 skill 才会把已确认的需求整理成一份供后续开发使用的功能规格。

## 访谈没有固定题数

两个起点没有各自的题库，它们都把访谈交给 `grilling`。`grilling` 也没有固定轮数或题数。如果某一题需要前面的答案，AI 就会把它留到后面。所有问题都处理完，并由你确认双方理解一致，访谈才结束。

访谈时间取决于有多少事情尚未决定，而不是你用了哪个 skill。与其计算 AI 问了几题，不如检查三件事：哪些问题已经有答案、哪些问题还在等前面的答案，以及词汇和 ADR 有没有写到正确的位置。

`grill-with-docs` 会修改项目文档，团队仍要审查添加的词汇是否适合团队沿用，以及 ADR 是否符合三项条件。尚未谈妥的定义不该提早写入，否则下次接手的人或 AI 读到的只会是另一个含糊定义。

## 先看手上有没有项目，再选起点

先判断手上是否已有存放代码与文档的项目文件夹，再看卡住的是需求、词汇还是上一段说明。

| 目前状况 | 选择 | 不该期待它做什么 |
| --- | --- | --- |
| 还没有项目文件夹，只想检查一个想法 | `grill-me` | 不会把结果写进项目文档 |
| 已在项目内，需要同时留下词汇或决策 | `grill-with-docs` | 不会直接产生供后续开发使用的完整需求文档 |
| 只想使用分轮提问的方法 | `grilling` | 不会自行维护词汇文档 |
| 只需要整理项目用语或重要决策 | `domain-modeling` | 不会收录所有需求答案 |
| 上一段说明没有听懂 | `wait-what` | 不会重新进行整场访谈 |

这张表用来选择起点，不是执行顺序。一般情况下，你只需启动一个起点，其余流程会自行接手。

`grill-with-docs` 适合用一次对话就能厘清全貌的需求。如果需求大到无法在一次对话中厘清，[`ask-matt` 的选择规则](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L38-L46)会改用 `wayfinder`。`wayfinder` 是另一个 skill，用来先探索大型工作，找出可以从哪里开始。

## 模拟场景：把席位问到能写规格

这次没有实际启动这组流程。以下内容只依原始规则推演，不是实测结果。场景是你已完成上一篇的项目设置，现在要在订阅服务的项目文件夹内处理按席位计费。

以 Codex 这套 AI 编程助手为例，先输入需求并明确启动 `grill-with-docs`：

```text
$grill-with-docs

我们要替现有订阅服务加入按席位计费。请帮我把需求问清楚。
```

AI 会先读取现有词汇、相关 ADR 与代码。像“目前系统是不是依活跃成员人数向支付平台收费”这种能从项目里查到的事实，应由 AI 调查，不该丢回给你。

第一轮先处理不需要参考其他答案的问题。例如，收费依据究竟是已购买席位、已分配席位，还是活跃成员数？订阅又属于工作区，还是单一付款人？假设团队最后确认，工作区拥有一批已购买的席位，成员获得席位后才可使用付费功能。`domain-modeling` 可以立即把词汇写成：

```markdown
**工作区**:
由多位成员组成，并共用一份订阅的空间。
_Avoid_: 账号、组织

**计费席位**:
工作区已购买、可分配给一位成员的付费资格。
_Avoid_: 用户、人数

**席位分配**:
在一段时间内，把一个计费席位分配给一位成员的记录。
_Avoid_: 成员资格、订阅项目

**成员**:
已加入工作区的人。成为成员与取得计费席位是两件事。
_Avoid_: 用户、席位
```

这段是依 [`CONTEXT-FORMAT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/CONTEXT-FORMAT.md#L1-L30)整理的示意内容，不是工具的实测输出。每个 `_Avoid_` 都列出容易混用、往后应避免的名称。

有了这些定义，第二轮才能追问邀请尚未接受时是否先保留席位、成员禁用后如何处理分配，以及增减席位何时影响价格。若现有代码直接以活跃成员数量计费，AI 也要指出新定义与现状不同，请你确认是否要改变行为。

假设团队进一步决定，由负责计费的程序保存每次席位分配的开始与结束时间，而不是拿现在的成员清单倒推过去的数量。这个做法方便日后查询历史记录，代价是每次成员变动时都要同步更新计费数据。这项选择可能符合 ADR 的三项条件，`domain-modeling` 应先提议创建 ADR，取得同意后才写入。

假设 AI 接着用一大段文字解释席位变动，但你没有弄懂“席位变动”和“席位分配”的关系。这时才启动 `wait-what`，要求它沿用刚写下的词汇重讲。

完成这段流程后，需求还没整理成完整规格。成果包括对话中已确认的答案、`CONTEXT.md` 里的词汇，以及少数经你同意创建的 ADR。若这项功能要分好几次对话才做得完，下一步是在同一段对话中启动 `to-spec`，让它把需求整理成规格。

## 我更在意留下什么

到这里，启动方式与文档保存规则都有原始资料可查。但这些规则本身无法证明共用词汇一定会改善团队合作。

我仍认为，厘清需求后最值得留下的是下一个人能直接沿用的词汇，以及少数不容易从代码看懂的决策。问答会留在对话里，确认过的定义则能进入项目。

这项判断只适用于多人维护，或要分好几次对话才做得完的项目。一次性的想法讨论不需要为每个名词创建文档，使用 `grill-me` 完成访谈即可。

## 先让同一个词代表同一件事

如果要试这套流程，可以先找出需求中最容易产生歧义的一个词，例如“席位”。在项目内启动 `grill-with-docs`，先确认它和“成员”的关系，再讨论邀请成员时是否占用席位，以及禁用后何时停止收费。

访谈的目标不是累积问题，而是让后续规格里的同一个词始终代表同一件事。下一篇会说明如何用 `to-spec` 整理规格，再用 `to-tickets` 把规格拆成一张张可以直接开工的工作单。

## 延伸阅读

- [`grill-me`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grill-me/SKILL.md#L1-L7)：确认它只负责启动访谈流程。
- [`grill-with-docs`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/grill-with-docs/SKILL.md#L1-L7)：查看它同时启动哪两个内部流程。
- [`grilling`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grilling/SKILL.md#L6-L28)：理解决策树、分轮提问与停止条件。
- [`domain-modeling`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/SKILL.md#L8-L74)：核对词汇文档与 ADR 的使用边界。
- [`wait-what`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/wait-what/SKILL.md#L1-L7)：查看它要求 AI 如何重讲上一段内容。
- [`to-spec`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-spec/SKILL.md#L7-L19)：确认访谈内容如何进入正式规格。
