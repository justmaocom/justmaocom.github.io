---
title: "mattpocock/skills 系列（5）：代码写完之后，谁来看结构、审修改、解冲突"
description: "测试通过不代表一切都好。本文用白话介绍 codebase-design、improve-codebase-architecture、code-review 与 resolving-merge-conflicts 四个 skill，并用按席位计费的例子实际做出一次合并冲突。"
date: 2026-10-14 10:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, code-review, software-architecture, git]
media_subpath: /assets/img/posts/mattpocock-skills-design-review-integration/
image:
  path: cover.png
  alt: "mattpocock/skills 系列第 5 篇封面：左边是一个按钮少、里面藏很多事的模块方块，右边是一份分成“照规矩写了吗”与“照需求做了吗”两栏的审查报告；底部列出四个 skill 的名称"
---

上一篇用 `implement` 做完了“停用成员并释放席位”，测试从红灯转成绿灯，AI 最后也照指令跑了一次 `code-review`。现在你手上有三张做完的工作单，和一条准备合并回主线的分支。

测试通过，只代表代码的行为和测试写的一样。但还有三件事是测试看不出来的：

- 代码的结构，会不会越改越乱？
- 这次的修改，有没有多做或漏做需求里的东西？
- 两个人同时改到同一段代码时，该留谁的版本？

`mattpocock/skills` 用四个 skill 处理这三件事。`codebase-design` 和 `improve-codebase-architecture` 管结构，`code-review` 管这次的修改，`resolving-merge-conflicts` 管合并时的冲突。

> mattpocock/skills 系列｜第 5 篇
>
> - 上一篇（第 4 篇）：[AI 开工写代码前，先决定要看哪一种信号](/posts/mattpocock-skills-implementation-feedback-loops/)
>
> 本文内容以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)为准。按席位计费的 skill 调用流程按原始指令推演；文中的合并冲突与合并后的测试失败则是实际运行结果。
{: .prompt-info }

> 系列开始之后，`mattpocock/skills` 已经更新到 `1.3.x`。[`v1.3.0` 移除了 `resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)，官方说没有其他 skill 取代它；同一版也把词汇表 `CONTEXT.md` 改名为 `GLOSSARY.md`。本文为了和前四篇一致，仍以 `1.2.3` 为准。
{: .prompt-warning }

## 先认识三个词

这篇只需要先记住三个词：

| 本文用词 | 一句话解释 |
| --- | --- |
| 模块 | 一块有名字、可以单独拿来用的代码，小到一个函数，大到一整个包都算 |
| 接口 | 别人使用这个模块时要知道的东西，就像家电上的按钮和说明书 |
| 接缝 | 代码里可以把零件换掉的位置，就像插座。上一篇的“测试接缝”就是它 |

其他词会在第一次出现时再解释。

## 四个 skill 各管什么

| skill | 用白话说 | 什么时候用 | AI 会不会自己启动 |
| --- | --- | --- | --- |
| `codebase-design` | 一份讨论代码结构用的词汇表 | 想讨论某段代码该怎么切、怎么包 | 会 |
| `improve-codebase-architecture` | 定期帮项目做体检，找出值得整理的地方 | 有空时；或修 bug 时发现代码很难测 | 不会，要你手动叫它 |
| `code-review` | 合并前的审查 | 一条分支做完，准备合并前 | 会 |
| `resolving-merge-conflicts` | 帮你解合并冲突 | 已经卡在冲突里的时候 | 会 |

这四个在 `ask-matt` 的路线图里位置都不同：[`codebase-design` 是底层词汇](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L59)，[`improve-codebase-architecture` 是平时保养](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，[`code-review` 是主流程的最后一步](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26)，[`resolving-merge-conflicts` 不在任何流程里](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L79)，卡住了才用。

`improve-codebase-architecture` 是唯一[设置成 AI 不能自己启动](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L4)的一个，Codex 那边的配置文件[也关掉了](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/agents/openai.yaml#L4-L5)。它会把整个项目扫一遍，花的时间不少，所以由你决定什么时候跑。

## `codebase-design`：先统一大家讲话的用词

`codebase-design` 没有步骤，它只是一份词汇表。目的是让你和 AI 讨论代码结构时，同一个词指的是同一件事。原文甚至[要求不要换成其他说法](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L12)，例如不要把“模块”讲成“组件”或“服务”。

这和第 2 篇的 `domain-modeling` 很像。[`ask-matt` 把两者并列](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L55-L59)：`domain-modeling` 统一业务上的用词，例如“计费席位”；`codebase-design` 统一代码结构的用词。上一篇的 `tdd` [遇到“这个接口该长什么样”的问题时](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26)，也是回来查这一份。

### 好的模块：按钮少，里面做很多事

整份词汇表的内核是一个想法：[好的模块要“深”](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L8)。

用咖啡机来比喻。一台好的咖啡机只有一颗按钮，磨豆、加热、萃取都在机器里面完成，这就是“深”。如果每一个步骤都要你自己按一颗按钮，按钮多到和里面做的事差不多，就是“浅”。

[原文对“深”的定义](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L20)就是：用户每多学一颗按钮，能换到多少功能。换到越多，这个模块越深。

深模块有两个好处：用的人省事，只要记住少数几个按钮；改的人好找，要改的东西都集中在同一个地方。

设计接口时，它要 AI [问自己三个问题](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L54-L58)：

- 按钮能不能再少一点？
- 每个按钮要填的东西能不能再简单一点？
- 能不能把更多麻烦事藏进里面？

![左侧浅模块有五颗按钮：指派席位、释放席位、计算人数、通知计费、检查成员，里面只是照顺序往下传；右侧深模块只有指派、停用、查可用席位三颗按钮，其余的事都藏在里面；底部写着“用的人只要记三颗按钮，测试也从这三颗按下去”](deep-vs-shallow-module.png){: width="800" height="450" }
_同样的席位功能，左边要记五颗按钮，右边只要三颗。_

### 四条判断原则

[原文一共列了四条](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L60-L65)，我用白话改写：

1. **深不深，看的是按钮，不是里面。** 里面可以拆成很多小零件，只要不让用户看到就好。
2. **删掉看看。** 想象把这个模块删掉。如果麻烦跟着消失，它只是个传话的中间人；如果麻烦散回每个使用它的地方，它就有存在的价值。
3. **测试和用户按同一组按钮。** 如果你想绕过按钮直接去测里面，代表这个模块切得不对。
4. **只有一种零件可以插的插座，不算插座。** “以后可能要换”不是理由，至少要真的有两种东西会插进来（例如正式版和测试用的假版本），才值得在这里留一个接缝。

第 4 条很常见。很多人为了“以后可能要换数据库”先多包一层，结果项目从头到尾只用过一种。按这条原则，那一层只是让代码多绕了一圈。

### 两份附录

`codebase-design` 另外附了两份文档，处理“决定要整理某个模块之后”的事：

- [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L5-L37) 说明怎么按照模块依赖的东西来决定怎么测，例如依赖的是外部付款服务，测试时就换成假的。它也提醒：模块整理好、在新的按钮上补好测试之后，[旧的测试要删掉](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L32-L37)，不要新旧两套一起留着。
- [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L19-L44) 说明怎么“多画几种设计再挑”。AI 会同时分派 3 个以上的小助手，各自用不同的方向设计，例如“按钮越少越好”或“最常用的情况最简单”，最后比较并给出明确的推荐，而不是丢一份菜单给你自己挑。

## `improve-codebase-architecture`：定期帮项目做体检

如果 `codebase-design` 是工作台，`improve-codebase-architecture` 就是[先到现场转一圈，找出值得整理的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)。它的目标是[把浅模块整理成深模块](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L9)，让代码更好测，AI 也更容易看懂。

它分三步。

**第一步：先决定看哪里。** 整理的好处是让以后的修改变容易，所以[优先看最近常被改的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L20-L23)。你指定了范围就照你的；没指定的话，AI 会翻修改记录，找出反复被改的文件。

接着它会先读项目的词汇表 `CONTEXT.md`，再派一个小助手去读代码，记下[读起来别扭的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L27-L35)。例如：为了搞懂一件事，得在好几个小文件之间跳来跳去；或者某段代码很难测。

如果项目里有“决策记录”，也就是记下某个设计为什么这样决定的文档，它也会先读。[和既有决定相冲突的建议](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L56)，只有在问题真的严重到值得重新讨论时才会提出。

**第二步：产出一份网页报告。** 报告[存在电脑的临时目录](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L39)，不会混进项目里。每个建议是一张卡片，[写着涉及哪些文件、哪里有问题、打算怎么改、改了有什么好处，附一张改前改后的对照图](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L43-L52)，并标上“强烈建议”、“值得研究”或“仅供参考”三种推荐程度。

这一步[还不会提出具体的设计](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L60)。报告写完，AI 只会问你一句：想先研究哪一个？

**第三步：针对你挑的那一个，一起把细节问清楚。** AI 用第 2 篇介绍过的 `grilling` 一个一个问你，[厘清限制、要依赖什么、整理后长什么样、哪些测试能留下](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L62-L71)。谈话中出现新词，就顺手补进 `CONTEXT.md`。如果你因为一个重要的理由否决了这个建议，AI 会问要不要写成决策记录，免得下次体检又提出一样的东西。

这一步产出的是一个想法，不是代码。这个想法要[回到主流程](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，从 `grill-with-docs` 开始，照第 3、4 篇的路线走一遍。

作者在 README 里[建议每隔几天跑一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L178)，但也说得很直白：它是体检，不是急救。很乱的老项目，它能指出问题在哪，却不会帮你一次理干净。

## `code-review`：合并前分两边检查

`code-review` 检查的是[某个时间点之后的所有修改](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L6-L11)。这个时间点可以是某个分支，例如 `main`，也可以是某一次 commit。

它把检查拆成两边，各问一个问题：

- **照规矩写了吗？**（原文叫 Standards）代码有没有遵守项目自己订的编码规范。
- **照需求做了吗？**（原文叫 Spec）代码有没有做到工作单或规格要求的内容。

两边各交给一个小助手同时检查，互不干扰，最后再把两份报告放在一起给你看。

### 它怎么做

1. **[先确认从哪里开始比](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L17-L23)。** 你没说，它就问。动手前先确认这个起点存在、而且真的有修改，免得两个小助手白跑一趟。
2. **[找需求文档](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L25-L32)。** 先看 commit 消息有没有提到工作单编号，再找你给的路径和 `docs/` 这类文件夹。都找不到就问你；你说没有，“照需求做了吗”这一边就跳过。
3. **[找项目规范](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L34-L56)。** 例如 `CONTRIBUTING.md` 这类写着“我们的代码要怎么写”的文档。
4. **[两个小助手同时开工](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L58-L72)。** 报告各限 400 字。每一项发现都要指出依据，是违反哪份规范的哪一条，或是规格里的哪一句。
5. **[两份报告分开呈现](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L74-L78)。** 不合并、也不排出“最严重的第一名”。

第 2 步要知道工作单放在哪，这是第 1 篇运行 setup 时留下的配置。[配置文件不在时，AI 会请你先跑 setup](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L13)。

### 没有写规范，也有一份基本检查表

很多项目根本没写规范。所以“照规矩写了吗”这一边[固定会带一份基本检查表](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L38-L56)，内容取自 Martin Fowler《重构》一书第 3 章列的 12 种“代码的坏味道”。坏味道指的是不一定有错、但看了会让人皱眉的写法。举三个例子：

| 坏味道 | 长什么样子 | 建议怎么改 |
| --- | --- | --- |
| 名字看不懂 | 看名称猜不出它在做什么 | 改名；想不出好名字，通常代表设计本身就不清楚 |
| 改一件事要动很多地方 | 一个小需求，得在好几个文件里这里改一点、那里改一点 | 把会一起改的东西收到同一个地方 |
| 替不存在的需求预留灵活性 | 为了“以后可能用到”多加的参数或设置 | 删掉，等真的需要再加 |

这份表有两个前提：项目自己的规范优先，项目明文允许的写法就不算坏味道；每一项都只是提醒，报告要写成“可能有这个问题”，不能当成硬性违规。

第三个例子和 `codebase-design` 的“只有一种零件可以插的插座，不算插座”是同一件事，一个在设计时提醒，一个在审查时抓出来。

### 为什么要分两边

原文的理由很简单：[一次修改可能只过了其中一关](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L80-L87)。

- 写得很漂亮，却做错了需求：规矩过关，需求没过。
- 需求完全照做，却破坏了项目的惯例：需求过关，规矩没过。

分开报告，才不会让一边的好成绩盖过另一边的问题。

![左侧“照规矩写了吗”报告列出两个可能的坏味道，标明只是提醒；右侧“照需求做了吗”报告引用规格原文，列出计费已收到新席位数，以及停用没有席位的成员可能做错；底部写着“写得漂亮却做错需求，一边的好成绩盖不掉另一边的问题”](code-review-two-axes.png){: width="800" height="450" }
_两份报告分开放，不合成一份排名。_

上一篇提过，[`tdd` 把整理写法的工作留到审查阶段](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L38)。“照规矩写了吗”这一边，就是测试通过之后，回头整理写法的那个时间点。

## `resolving-merge-conflicts`：先搞懂两边想做什么，再合并

先说明什么是合并冲突。两个人从同一份代码各自修改，改到了同一段，git 不知道该留哪一边，就会停下来，把两边的版本都标出来，让人决定。

这个 skill 只有[五个步骤](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L6-L14)：

1. 先看清楚现在卡在哪里、哪些文件有冲突。
2. 替每一处冲突找出源头：读 commit 消息、PR 和原本的工作单，搞懂两边各自为什么这样改。
3. 一处一处解决。能两边都保留就都保留；真的只能选一边时，选符合这次合并目的的那边，并写下为什么。不准自己发明新功能，也[不准直接放弃合并](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L10)。
4. 跑一次项目的自动检查，通常是类型检查、测试、格式化，把合并弄坏的地方修好。
5. 完成合并并 commit。

重点在第 2 步。冲突标记只告诉你“两边的文本不一样”，不会告诉你两边各自想做到什么。如果直接选“只留我这边”或“只留对方那边”，代码也许能跑，却可能默默丢掉别人刻意加的修改。

![左侧直接选“只留我这边”，结果“停用不存在的成员时返回 false”被默默丢掉；右侧先读两边的 commit，把检查成员、通知计费和返回结果都保留下来；底部写着“冲突只告诉你文本不同，不会告诉你两边想做什么”](merge-conflict-intent.png){: width="800" height="450" }
_直接挑一边虽然能跑，却可能少掉一半的修改目的。_

前面提过，这个 skill 在 `1.3.0` 被移除了，[封存的说明页](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)写明没有替代品。不过这五个步骤不需要任何工具，就算没装这个 skill，也可以照着做。

## 哪些地方要花你的时间

| 环节 | 由谁负责 | 要做什么 |
| --- | --- | --- |
| 体检的范围 | 你 | 指定要看哪一块；不指定就由 AI 从修改记录推断 |
| 看体检报告 | 你 | 从建议中挑一个，判断推荐程度合不合理 |
| 细节讨论 | 你 | 回答限制与取舍；否决建议时决定要不要留下决策记录 |
| 多画几种设计 | AI 和你 | AI 同时派出几个小助手；你读完几份设计和推荐后决定 |
| 审查的起点与需求文档 | 你 | 告诉它从哪里开始比、需求文档在哪 |
| 读审查报告 | 你 | 两边分开看；坏味道只是提醒，要不要改由你决定 |
| 解合并冲突 | AI，必要时是你 | 追查两边的修改目的；真的只能选一边时，确认 AI 的选择和理由 |

最花时间的是体检和“多画几种设计”，因为两者都要读很多代码。好在它们也最不急：代码能跑，只是结构不够好，挑有空时做就行。

## 什么情况用哪一个

| 你遇到的状况 | 用哪个 | 什么时候不适合 |
| --- | --- | --- |
| 想讨论某段代码该怎么切、按钮该留哪些 | `codebase-design` | 卡住的是业务用词而不是代码结构时，改用 `domain-modeling` |
| 有空，想找出项目里值得整理的地方 | `improve-codebase-architecture` | 正在赶功能时。它的产出是想法，之后还要再走一次主流程 |
| 修完 bug，却找不到地方写测试来防止它再发生 | `improve-codebase-architecture` | 找得到地方时，直接补测试就好 |
| 一条分支做完，准备合并 | `code-review` | 没有需求文档时，只会检查“照规矩写了吗” |
| 合并时卡在冲突上 | `resolving-merge-conflicts`（`1.2.x`） | 合并完成后才出现怪问题，改用上一篇的 `diagnosing-bugs` |

## 模拟情境：替按席位计费做一次审查与合并

以下的 skill 调用没有实际运行，流程按 `1.2.3` 版的原始指令推演。其中的合并冲突用 git 2.47.3 实际做过，合并后的测试用 Node.js v20.19.2 跑过；代码是为本文写的最小示例，并非取自 `mattpocock/skills`。

### 审查“停用成员并释放席位”

第三张工作单做完后，`implement` 会自动调用 `code-review`。你也可以自己开一个新对话来跑：

```text
$code-review main
```
{: .nolineno }

意思是“检查从 `main` 分出来之后的所有修改”。AI 从 commit 消息里找到工作单编号，项目也没有写规范，所以“照规矩写了吗”这一边只用基本检查表。

两份报告可能长这样（推演）：

- **照规矩写了吗**：通知计费的代码散在“指派席位”和“停用成员”两个地方，“可能有『改一件事要动很多地方』的问题”。这只是提醒，不是错误。
- **照需求做了吗**：工作单要求的“计费系统收到新的席位数量”已经做到。但停用一个本来就没有席位的成员时会怎样，工作单没写，代码也没处理，列为“看起来做了，但可能有漏洞”。

你可以先处理需求那一项，回头把规则问清楚；规矩那一项，留到下次体检再说。

### 让体检接手结构问题

几天后你跑了 `$improve-codebase-architecture`，并指定范围“席位计费”。报告里可能出现这样一张卡片（推演）：

- **标题**：把席位计费整理成一个模块
- **涉及文件**：`seats.js`、`billing-sync.js`
- **问题**：指派、停用、通知计费散在两个文件，每个用到它的地方，都得记得改完席位后要通知计费。
- **做法**：席位计费只对外留三颗按钮：“指派”、“停用”、“查可用席位”，通知计费藏在里面自动完成。
- **推荐程度**：值得研究

用“删掉看看”检查一下：把 `billing-sync.js` 删掉，“改完席位要通知计费”这件事会散回每一个用到它的地方。所以这份麻烦是真的存在，只是放错了位置。

你选了这张卡片，AI 就开始一个一个问细节，谈完后把想法带回 `grill-with-docs`，再照第 3、4 篇的路线走一次。

### 两条分支同时改到 `deactivateMember()`

同一时间，同事在另一条分支 `guard-unknown` 改了停用功能：停用一个不存在的成员时，返回 `false`。而你的分支 `notify-billing` 让停用后通知计费。两边都从同一份 `seats.js` 开始改：

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```
{: file="seats.js（两边共同的起点）" }

在你的分支上合并同事的分支：

```bash
git merge guard-unknown
```
{: .nolineno }

git 停下来，说有冲突：

```plaintext
Auto-merging seats.js
CONFLICT (content): Merge conflict in seats.js
Automatic merge failed; fix conflicts and then commit the result.
```

打开 `seats.js`，git 把两边的版本都标了出来。`<<<<<<< HEAD` 到 `=======` 是你这边，`=======` 到 `>>>>>>>` 是同事那边：

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

这时调用 `$resolving-merge-conflicts`。照第 2 步，AI 先读两边的 commit 消息：你这边是“停用后通知计费系统新的席位数量”，同事那边是“停用不存在的成员时返回 false”。两个目的并不冲突，所以两边都保留：

```javascript
export function deactivateMember(workspace, memberId, billing) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
  return true;
}
```
{: file="seats.js（解决后）" }

顺序也有讲究：先检查成员在不在，不在就直接结束，计费系统就不会收到一次没有变化的通知。这一点两边的 commit 都没写，是 AI 合并时自己做的判断，所以要写进合并的 commit 消息，让你审查时看得到。

接着照第 4 步跑测试。上一篇写的 `node --test seats.test.js`，调用 `deactivateMember()` 时没有传入计费系统。我把合并后的代码放回上一篇的测试，用 Node.js v20.19.2 实际跑过，结果是 `fail 1`，错误类型为 `TypeError`。

这正是“把合并弄坏的地方修好”要处理的情况：要在测试里补一个假的计费系统，而不是把通知计费那一行删掉。全部通过之后，AI 才会 commit。

## 我认为两份报告要分开读，坏味道不必当场修

这一节是我自己的看法，原始资料没有直接这样说。

`code-review` 刻意不替两份报告排先后，所以先读哪一份由你决定。我会先读“照需求做了吗”。这一边有问题，代表功能可能做错了，合并前就要处理。“照规矩写了吗”的坏味道，原文自己就说只是提醒，大多可以等下次整理时一起看。

我也不会让 `code-review` 当场把每个坏味道都修掉。上面模拟的“改一件事要动很多地方”，不是改个名字就能解决的。它需要的是体检那一套：先转一圈、再讨论、再回到主流程。在审查时硬改，等于没有需求文档就动结构，刚好跳过了第 3、4 篇创建的检查点。

不过这个做法有个前提：项目真的会定期做体检。如果团队从来不排时间整理，留下来的坏味道只会越积越多。这种情况下，还不如在审查时先把最明显的几个修掉。

## 小结

代码写完之后要判断的事，大多不是测试能回答的。

- 这次的修改，交给 `code-review` 分两边看：照规矩写了吗、照需求做了吗。
- 结构的问题，交给 `improve-codebase-architecture` 定期体检，再用 `codebase-design` 的词汇讨论怎么改。
- 两条分支撞在一起时，先读两边的 commit 和工作单，搞懂各自想做什么，再决定怎么合。

回到按席位计费，下一步是在第三张工作单的分支上跑一次 `$code-review main`。先处理“照需求做了吗”那一项，再决定规矩那一项要不要排进下次体检。

## 延伸阅读

- [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L1-L114)：完整的词汇表和四条原则，以及它刻意不采用的几种说法。
- [`codebase-design/DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L1-L37)：按照模块依赖的东西，决定怎么测。
- [`codebase-design/DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L1-L44)：“多画几种设计再挑”的完整做法。
- [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L16-L71)：体检的三个步骤。
- [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L1-L87)：两边检查的完整指令，以及 12 种坏味道的完整清单。
- [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L1-L14)：`1.2.3` 版的五个步骤；移除后的[封存说明页](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md)另外解释了为什么不该直接挑一边。
