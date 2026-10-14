---
title: "mattpocock/skills 系列（5）：先讲好模块的词汇，再分两条轴审查修改"
description: "代码写完之后，谁来判断结构好不好、修改有没有照规格？本文拆解 codebase-design、improve-codebase-architecture、code-review 与 resolving-merge-conflicts，并用按席位计费的例子实际做出一次合并冲突。"
date: 2026-10-14 10:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, code-review, software-architecture, git]
media_subpath: /assets/img/posts/mattpocock-skills-design-review-integration/
image:
  path: cover.png
  alt: "mattpocock/skills 系列第 5 篇封面：左边是一个接口小、实现深的模块方块，右边是一份分成 Standards 与 Spec 两栏的审查报告；底部列出 codebase-design、improve-codebase-architecture、code-review 与 resolving-merge-conflicts"
---

上一篇用 `implement` 做完了“停用成员并释放席位”，测试从红灯转成绿灯，AI 也照指令在最后调用了 `code-review`。现在你手上有三张做完的工作单、一条准备合并的分支，以及一份 AI 写的审查报告。

测试通过只能说明行为符合测试。代码结构会不会越改越乱、这次修改有没有多做或漏做规格里的东西、两条分支同时改到 `deactivateMember()` 时该留哪一边，这些都不是测试能回答的问题。

`mattpocock/skills` 把这一段交给四个 skill：`codebase-design`、`improve-codebase-architecture`、`code-review` 与 `resolving-merge-conflicts`。前两个处理代码的结构，后两个处理这次的修改怎么进到主线。

> mattpocock/skills 系列｜第 5 篇
>
> - 上一篇（第 4 篇）：[AI 开工写代码前，先决定要看哪一种信号](/posts/mattpocock-skills-implementation-feedback-loops/)
>
> 本文内容以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)为准。按席位计费的 skill 调用流程按原始指令推演；文中的合并冲突与合并后的测试失败则是实际运行结果。
{: .prompt-info }

> 系列开始之后，`mattpocock/skills` 已经更新到 `1.3.x`。[`v1.3.0` 移除了 `resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)，官方说明没有其他 skill 取代它；同一版也把词汇表 `CONTEXT.md` 改名为 `GLOSSARY.md`。本文为了与前四篇一致仍以 `1.2.3` 为准，用新版的读者请留意这两处差异。
{: .prompt-warning }

## 先认识几个词

下面几个词会反复出现。`codebase-design` [要求这些词照原文使用](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L12)，不要换成“组件”、“服务”、“API”或“边界”，所以本文也尽量固定译法：

| 本文用词 | 原文 | 意思 |
| --- | --- | --- |
| 模块 | module | 任何有接口、有实现的东西。可以是一个函数、一个类，也可以是一整个包 |
| 接口 | interface | 调用者要正确使用模块所需知道的一切。不只类型签名，还包括不变条件、调用顺序、错误情况与必要设置 |
| 深度 | depth | 调用者每学一单位接口，能用到多少行为。接口小、背后行为多叫“深”；接口几乎和实现一样复杂叫“浅” |
| 接缝 | seam | 接口所在的位置。上一篇的“测试接缝”就是它 |
| 适配器 | adapter | 在接缝上实际满足接口的东西，例如正式环境的数据库实现，或测试用的内存版本 |
| 杠杆、局部性 | leverage、locality | 深度带来的两个好处：调用者用得少却得到很多；维护者要改的东西集中在一处 |

这些定义见 [`codebase-design` 的词汇表](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L14-L28)。

## 四个 skill 管的是不同时间点

这四个 skill 都放在 `skills/engineering/` 底下，在 `ask-matt` 的路线图里分属三个区块：

| skill | 在 `ask-matt` 的位置 | 什么时候出场 | 会不会自己启动 |
| --- | --- | --- | --- |
| `codebase-design` | [底层词汇](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L59) | 讨论模块形状时，或被 `tdd`、`improve-codebase-architecture` 引用 | 会 |
| `improve-codebase-architecture` | [代码健康](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52) | 有空时定期扫一次，或 `diagnosing-bugs` 找不到测试接缝时 | 不会，要手动调用 |
| `code-review` | [主流程收尾](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26) | `implement` 做完后，或任何时候想审查一条分支 | 会 |
| `resolving-merge-conflicts` | [不在任何流程里](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L79) | 已经卡在合并或 rebase 冲突中 | 会 |

`improve-codebase-architecture` 是四个里唯一设了 [`disable-model-invocation: true`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L4) 的，`agents/openai.yaml` 也写了 [`allow_implicit_invocation: false`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/agents/openai.yaml#L4-L5)。它会扫整个项目、写报告，所以要由你决定什么时候跑。

## `codebase-design` 是一份词汇表，不是一套流程

`codebase-design` 没有步骤，它提供的是讨论模块时的共用语言。[`ask-matt` 把它和 `domain-modeling` 并列](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L55-L59)为两份“底层词汇”：`domain-modeling` 管业务用语，例如第 2 篇整理的“计费席位”；`codebase-design` 管代码结构的用语。上一篇也提过，[`tdd` 遇到接口该长什么样的疑问时](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26)，就是来查这一份。

它的目标写在开头：[设计深模块](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L8)，让调用者得到杠杆、维护者得到局部性，所有人都容易测试。设计接口时，它要 AI [问自己三个问题](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L54-L58)：方法能不能更少、参数能不能更简单、能不能把更多复杂度藏在里面。

### 四条原则

[原则一共四条](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L60-L65)：

- **深度是接口的性质，不是实现的性质。** 深模块内部可以由很多可替换的小零件组成，只要它们不出现在接口上。
- **删除测试。** 想象把这个模块删掉。如果复杂度跟着消失，它只是传话的中间层；如果复杂度散回 N 个调用者身上，它就有存在的价值。
- **接口就是测试面。** 调用者和测试走同一个接缝。如果你想绕过接口去测，代表模块的形状可能不对。
- **一个适配器只是假想的接缝，两个才是真的。** 没有东西会在接缝两侧变动时，就不要设接缝。

第四条很容易被忽略。很多人为了“以后可能要换”先拉出一层接口，结果整个项目只有一个实现。按这条原则，这种接缝只增加了一层间接调用。

![左侧浅模块列出 assignSeat、releaseSeat、countAssigned、notifyBilling、checkMember 五个方法，实现只是一层层往下传；右侧深模块只露出 assign、deactivate、available，检查成员、释放席位与通知计费都藏在虚线接缝后面；底部写着“接口就是测试面：调用者和测试走同一个接缝”](deep-vs-shallow-module.png){: width="800" height="450" }
_同样的席位行为，浅模块要调用者记住五个方法，深模块只露出三个。_

它也明白[拒绝了 Ousterhout 的深度定义](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L105-L109)。《A Philosophy of Software Design》用实现行数与接口行数的比例来衡量深度，原文认为这会鼓励把实现灌水，所以改用“杠杆”来定义。

### 两份延伸文档

`codebase-design` 附了两份文档，处理“决定要加深某个模块之后”的事：

| 文档 | 处理什么 | 重点 |
| --- | --- | --- |
| [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L5-L37) | 按依赖的种类决定怎么测 | 依赖分成四类：纯内存运算、有本地替身（例如用 PGLite 代替 Postgres）、自家的远程服务、第三方服务。加深后，旧的浅模块单元测试要删掉，改在新接口上写测试 |
| [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L19-L44) | 同一个模块设计几种不同的接口再比较 | 并行派出 3 个以上的子代理，各自带不同限制：接口最小化、灵活性最大化、让最常见的调用最简单，必要时再加一个以 ports & adapters 为主的版本。比较后 AI 要给出明确推荐，不是只列菜单 |

`DEEPENING.md` 的“替换而非叠加”值得特别记下来：[旧测试在新接口的测试写好后就成了浪费，应该删掉](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L32-L37)。如果某个测试在只改实现时也得跟着改，代表它测到了接口后面的东西。这和上一篇 `tdd` 的“绑死实现细节”反模式是同一件事。

## `improve-codebase-architecture` 找出值得加深的候选

`codebase-design` 是工作台，`improve-codebase-architecture` 则是[先去现场摸底，找出候选的那一个](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)。它的目标是[把浅模块变成深模块，让代码更好测，也更容易让 AI 读懂](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L9)。流程分三步。

**第一步是先决定看哪里。** 原文写着 [“Scope before you scan: YAGNI”](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L20-L23)：加深模块的好处是让之后的修改变容易，所以优先看最近常改的地方。你有指定方向就照你的；没有的话，AI 会翻 `git log` 找出反复被修改的文件。接着它会先读 `CONTEXT.md` 和该区域的 ADR，再派一个子代理去走一遍代码，记下[让人卡住的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L27-L35)，例如理解一个概念得在好几个小模块之间跳来跳去，或者某段代码从现在的接口很难测。

ADR 是 Architecture Decision Record，记录一个架构决定和它的理由。第 2 篇的 `domain-modeling` 只替少数难以回头的决定写 ADR，这里就用得上：[跟既有 ADR 冲突的候选](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L56)，只有在问题真的严重到值得重新讨论那个决定时才提出来，而且要在报告上标明。

**第二步是产出一份 HTML 报告。** 报告[写在系统的临时目录](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L39)，不会进到 repo 里。每个候选是一张卡片，[包含涉及的文件、问题、解法、好处、前后对照图，以及 `Strong`、`Worth exploring`、`Speculative` 三级推荐强度](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L43-L52)，最后再给一个最推荐先做的项目。[`HTML-REPORT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/HTML-REPORT.md#L40-L55) 对卡片的要求是以图为主，问题和解法各只写一句；图要靠一段文字才看得懂，就重画。

这一步有一条限制：[还不能提出接口设计](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L60)。报告写完后，AI 只问你一句“想深入哪一个”。

**第三步是针对你选的候选进入访谈。** AI 用第 2 篇介绍过的 `grilling` [逐一确认限制、依赖、加深后的模块形状、接缝后面放什么，以及哪些测试能留下来](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L62-L71)。过程中出现新词就写进 `CONTEXT.md`；你若用一个重要的理由否决了候选，AI 会问要不要写成 ADR，免得下次扫描又提出同一个建议。想比较不同的接口时，就转去用 `codebase-design` 的 Design It Twice。

这一步的产出是一个想法，不是代码。[`ask-matt` 说明](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，选定的候选要带回主流程，从 `grill-with-docs` 开始，接着照第 3、4 篇的路线写规格、拆工作单、实现。作者在 README 里[建议每隔几天跑一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L178)，但也说得很清楚：它是摸底，不是救援。老旧的代码能找到真的候选，却不会替你把一团乱理清楚。

## `code-review` 把审查拆成两条轴

`code-review` 审查的是[从某个固定点到 `HEAD` 的差异](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L6-L11)。固定点可以是 commit、分支、tag，甚至 `HEAD~5`。审查分成两条轴：

- **Standards**：代码有没有遵守这个 repo 写下来的编码规范？
- **Spec**：代码有没有忠实做到原始工作单或规格要求的内容？

两条轴各交给一个并行的子代理，原文的理由是让它们不互相污染对方的上下文。

### 五个步骤

1. **[固定比较点](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L17-L23)。** 你没指定，它就问。差异用三点的 `git diff <固定点>...HEAD`，也就是从两条分支的分岔点开始比。动手前先确认这个引用存在、差异不是空的，免得两个子代理都白跑。
2. **[找规格](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L25-L32)。** 依次找 commit 消息里的 issue 编号、你传入的路径、`docs/`、`specs/` 或 `.scratch/` 底下符合分支名称的文件。都找不到就问你；你说没有，Spec 轴就跳过并注明“no spec available”。
3. **[找规范](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L34-L56)。** 找出 `CODING_STANDARDS.md`、`CONTRIBUTING.md` 这类文档，另外一律带上一份基准清单（下面说明）。
4. **[同时派出两个子代理](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L58-L72)。** 两份报告都限制在 400 字以内。Standards 要引用违反的是哪份文档的哪条规则；Spec 要报告缺漏或只做一半的需求、规格没要求却多做的行为，以及看起来做了但做错的地方，每一项都要引用规格原文。
5. **[汇总](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L74-L78)。** 两份报告分别放在 `## Standards` 与 `## Spec` 底下，不合并、不重新排序。最后一行只列出各轴的发现数量和各自最严重的问题，不挑一个跨轴的“第一名”。

第 2 步会读 `docs/agents/issue-tracker.md`，这是第 1 篇 `setup-matt-pocock-skills` 留下的设置。[文件不存在时，AI 会请你先跑 setup](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L13)。

### 没有规范文档也有一份基准

很多项目根本没有写好的编码规范。`code-review` 的 Standards 轴因此[固定带一份基准清单](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L38-L56)，取自 Martin Fowler《Refactoring》第 3 章的 12 种代码异味，例如：

| 异味 | 长什么样子 | 建议怎么改 |
| --- | --- | --- |
| Mysterious Name | 名称看不出它做什么 | 改名；想不出诚实的名字，代表设计本身不清楚 |
| Feature Envy | 一个方法用别的对象的数据比用自己的还多 | 把方法搬到那份数据旁边 |
| Primitive Obsession | 用字符串或数字代表一个值得有自己类型的业务概念 | 替它定义一个小类型 |
| Shotgun Surgery | 一个逻辑上的修改，得在很多文件里零散地改 | 把会一起变动的东西收进同一个模块 |
| Speculative Generality | 为规格里不存在的需求预先加的抽象、参数或钩子 | 删掉，等真的需要再加 |

这份清单有两条约束：**repo 的规范优先**，项目明文允许的写法就不算异味；**每一项都只是判断**，报告要写成“可能有 Feature Envy”，不能当成硬性违规。工具已经自动检查的项目，例如格式化，就不必再报。

Speculative Generality 和 `codebase-design` 的“一个适配器只是假想的接缝”讲的是同一件事，只是一个在设计时提醒，一个在审查时抓出来。

### 为什么要分成两条轴

原文的理由很直接：[一次修改可能只通过其中一条](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L80-L87)。完全符合规范却做错了需求，是 Standards 通过、Spec 失败；完全照工作单做，却破坏了项目惯例，则反过来。分开报告，才不会让其中一条的好结果盖掉另一条的问题。

![左侧 Standards 报告依据规范文档与 Fowler 12 种异味，列出可能有 Shotgun Surgery、Primitive Obsession，标明都是判断；右侧 Spec 报告引用规格原文，列出计费系统已收到新席位数量，以及停用未指派席位的成员可能做错；底部写着“符合规范却做错需求，一条轴就盖不住另一条”](code-review-two-axes.png){: width="800" height="450" }
_两份报告分开放，不合并成一份排序。_

上一篇提到 [`tdd` 把重构留到审查阶段](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L38)。`code-review` 的 Standards 轴，就是红绿循环之后回头整理写法的那个时间点。

## `resolving-merge-conflicts` 依意图解冲突，不靠挑行

`resolving-merge-conflicts` 是四个里最短的，扣掉 front matter 只有[五个步骤](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L6-L14)：

1. 看清楚目前合并或 rebase 的状态，包括 git 历史与冲突的文件。
2. 替每一处冲突找出原始来源：读 commit 消息、PR 与原本的 issue 或工作单，搞清楚两边各自为什么这样改。
3. 逐处解决。能保留两边的意图就都保留；真的互斥时，选符合这次合并目标的一边，并写下取舍。不准发明新的行为，也[一律不准 `--abort`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L10)。
4. 找出项目的自动检查并运行，通常依次是类型检查、测试、格式化，修好合并弄坏的地方。
5. 完成合并或 rebase：stage 所有文件并 commit；rebase 时继续到所有 commit 都应用完。

重点在第 2 步。冲突标记只告诉你两边的文字不同，不会告诉你两边各自想做到什么。直接选 `--ours` 或 `--theirs`，或把看起来比较不重要的那段删掉，代码也许能编译，却可能默默丢掉别人刻意加的修改。

![左侧用 git checkout --ours 解冲突，只留下通知计费的版本，“停用不存在的成员返回 false”被默默丢掉；右侧先读两边的 commit，保留存在检查、通知计费与 return true；底部写着“冲突标记只说文字不同，没说两边想做什么”](merge-conflict-intent.png){: width="800" height="450" }
_直接挑一边能编译，却可能少掉一半的意图。_

前面提过，这个 skill 在 `1.3.0` 被移除了。[归档的说明页](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)写明没有其他 skill 取代它，移除的 commit 消息只写了“No longer needed”。不过它那五个步骤本身不依赖任何工具，就算不装这个 skill，也可以直接照着做。

## 哪些地方要花你的时间

| 环节 | 由谁付出 | 付出什么 |
| --- | --- | --- |
| `improve-codebase-architecture` 的范围 | 你 | 指定要看的模块或痛点；不指定就由 AI 从 `git log` 推断 |
| 看 HTML 报告 | 你 | 从候选中挑一个，并判断推荐强度是否合理 |
| 架构访谈 | 你 | 回答限制与取舍；否决候选时决定要不要写 ADR |
| Design It Twice | AI 与你 | AI 并行跑 3 个以上子代理；你读完几份设计与推荐后拍板 |
| `code-review` 的固定点与规格 | 你 | 告诉它从哪里开始比、规格在哪里 |
| 读审查报告 | 你 | 两条轴分开看；异味只是提示，要不要改由你决定 |
| 解合并冲突 | AI，必要时是你 | 追查两边的 commit 与工作单；两边意图互斥时，确认 AI 选的那一边与它写下的取舍 |

成本最高的是 `improve-codebase-architecture` 和 Design It Twice，因为两者都会派出子代理读大量代码。它们也是最不急的：代码能跑，只是结构不够好，什么时候处理都可以。

## 什么情况用哪一个

| 你手上的状况 | 使用的 skill | 不适用的时候 |
| --- | --- | --- |
| 想讨论某个模块的接口该长什么样、接缝放哪里 | `codebase-design` | 卡住的是业务用语而不是代码结构时，用 `domain-modeling` |
| 有空，想找出项目里值得重构的地方 | `improve-codebase-architecture` | 正在赶一个功能时；它的产出是想法，还要再走一次主流程 |
| `diagnosing-bugs` 修完 bug，却找不到能挡住它再发生的测试接缝 | `improve-codebase-architecture` | 找得到接缝时，直接补回归测试就好 |
| 一条分支或 PR 做完，要在合并前审查 | `code-review` | 还没有规格时，Spec 轴会跳过，只剩 Standards |
| `git merge` 或 `git rebase` 停在冲突上 | `resolving-merge-conflicts`（`1.2.x`） | 合并完成后才出现奇怪的行为，改用 `diagnosing-bugs` |

## 模拟情境：替按席位计费做一次审查与合并

以下的 skill 调用没有实际运行，流程按 `1.2.3` 版的原始指令推演。其中的合并冲突用 git 2.47.3 实际做过，合并后的测试用 Node.js v20.19.2 跑过；代码是为本文写的最小示例，并非取自 `mattpocock/skills`。

### 审查“停用成员并释放席位”

第三张工作单做完后，`implement` 自动调用了 `code-review`。你也可以自己在新对话里跑一次：

```text
$code-review main
```
{: .nolineno }

AI 先确认 `git rev-parse main` 解析得到、`git diff main...HEAD` 不是空的，再从 commit 消息里的 issue 编号抓到工作单。项目没有 `CODING_STANDARDS.md`，Standards 轴只带 12 种异味的基准清单。

两份报告可能会是这样（推演）：

- **Standards**：`deactivateMember(workspace, memberId, billing)` 把 `memberId` 当成普通字符串传来传去，“可能有 Primitive Obsession”；计费通知的代码散在 `assignSeat` 与 `deactivateMember` 两处，“可能有 Shotgun Surgery”。两项都是判断，不是违规。
- **Spec**：工作单的验收条件“计费系统收到新的席位数量”已经实现；但停用一个没有被指派席位的成员时会发生什么，工作单没写，代码也没处理，列为“看起来做了，但可能做错”。

这两份报告不会被合成一份排序。你可以先处理 Spec 那一项，回头问清楚规则；Standards 的两项则留到下一次 `improve-codebase-architecture`。

### 让 `improve-codebase-architecture` 接手结构问题

几天后你跑了 `$improve-codebase-architecture`，并指定方向“席位计费”。AI 读过 `CONTEXT.md` 里的“计费席位”定义后，报告里可能出现这样一张卡片（推演）：

- **标题**：加深计费席位模块
- **涉及文件**：`seats.js`、`billing-sync.js`
- **问题**：指派、停用与通知计费三件事分散在两个浅模块，每个调用者都得记得在改完席位后通知计费。
- **解法**：让计费席位模块对外只提供“指派”、“停用”与“查找可用席位”，通知计费藏在接缝后面。
- **依赖类别**：计费系统是第三方服务，属于 `DEEPENING.md` 的第 4 类，测试时用 mock 适配器。
- **推荐强度**：`Worth exploring`

用删除测试检验一下：把 `billing-sync.js` 删掉，“改完席位要通知计费”这件事会散回每一个调用者身上，所以这段复杂度是真的，只是放错了地方。你选了这张卡片，AI 就进入访谈，谈完后把想法带回 `grill-with-docs`，再照第 3、4 篇的路线走一次。

### 两条分支同时改到 `deactivateMember()`

同一时间，另一条分支 `guard-unknown` 让停用不存在的成员时返回 `false`，而你的分支 `notify-billing` 让停用后通知计费。两条都从同一份 `seats.js` 分出来：

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```
{: file="seats.js（共同祖先）" }

在 `notify-billing` 上合并 `guard-unknown`：

```bash
git merge guard-unknown
```
{: .nolineno }

git 停在冲突上：

```plaintext
Auto-merging seats.js
CONFLICT (content): Merge conflict in seats.js
Automatic merge failed; fix conflicts and then commit the result.
```

`seats.js` 变成这样：

```javascript
<<<<<<< HEAD
export function deactivateMember(workspace, memberId, billing) {
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
=======
export function deactivateMember(workspace, memberId) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  return true;
>>>>>>> guard-unknown
}
```
{: file="seats.js（冲突中）" }

这时调用 `$resolving-merge-conflicts`。照第 2 步，AI 先读两边的 commit 消息：一边是“停用后通知计费系统新的席位数量”，另一边是“停用不存在的成员时返回 false”。两个意图并不互斥，所以两边都保留，而不是挑一边：

```javascript
export function deactivateMember(workspace, memberId, billing) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
  return true;
}
```
{: file="seats.js（解决后）" }

顺序也有意义：先检查成员是否存在，不存在就直接返回，计费系统就不会收到一次没有变动的席位数量。这一点两边的 commit 都没写，是 AI 合并时做的判断，所以应该写进合并的 commit 消息，让你审查时看得到。

接着照第 4 步跑类型检查与测试。上一篇那条 `node --test seats.test.js` 调用 `deactivateMember()` 时没有传 `billing`。我把解决后的代码放回上一篇的测试，用 Node.js v20.19.2 实际跑过，结果是 `fail 1`，错误类型为 `TypeError`。这正是“修好合并弄坏的地方”要处理的情况：测试得补上一个计费替身，而不是把通知那一行删掉。全部通过后，AI 才 stage 并 commit。

## 我认为两条轴要分开读，异味不必当场修

这一节是我自己的看法，原始资料没有直接这样说。

`code-review` 刻意不替两条轴排序，所以读报告的顺序得由你决定。我会先读 Spec。Spec 轴的问题代表功能可能做错了，合并前就要处理；Standards 轴的异味原文自己就标成判断，大多可以等到下一次重构再一起看。

我也不会让 `code-review` 当场把每个异味都修掉。上面模拟的 Shotgun Surgery 不是改一个名字就能解决的事，它需要的是 `improve-codebase-architecture` 那种先摸底、再访谈、再带回主流程的完整处理。在审查阶段硬修，等于在没有规格的情况下改结构，正好跳过了第 3、4 篇建立起来的检查点。

不过，这个做法建立在项目愿意定期跑 `improve-codebase-architecture` 的前提上。如果团队从来不排时间整理结构，留下来的异味只会越积越多；这时还不如在审查阶段就先处理掉最明显的几个。

## 先决定这次修改要对照哪一份文档

代码写完之后要判断的事，大多不是测试能回答的。`code-review` 把它拆成两个问题：有没有照规范写、有没有照规格做，两份报告分开读。结构上的问题交给 `improve-codebase-architecture` 定期摸底，再用 `codebase-design` 的词汇讨论怎么改。分支撞在一起时，先读两边的 commit 与工作单，再决定怎么合。

回到按席位计费，下一步是在第三张工作单的分支上跑一次 `$code-review main`，先处理 Spec 轴的那一项，再决定 Standards 轴的异味要不要排进下一次架构摸底。

## 延伸阅读

- [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L1-L114)：完整的深模块词汇、四条原则，以及它刻意不采用的几种说法。
- [`codebase-design/DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L1-L37)：四种依赖类别各自怎么测，以及“替换而非叠加”的测试策略。
- [`codebase-design/DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L1-L44)：并行子代理各带什么限制，以及比较设计时看哪三个面向。
- [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L16-L71)：从决定范围、产出报告到访谈的三个步骤。
- [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L1-L87)：两条轴的子代理提示内容，以及完整的 12 种异味清单。
- [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L1-L14)：`1.2.3` 版的五个步骤；移除后的[归档说明页](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md)另外解释了为什么不该靠 `--ours` 或 `--theirs` 解冲突。
