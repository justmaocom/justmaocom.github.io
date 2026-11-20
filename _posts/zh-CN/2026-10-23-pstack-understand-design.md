---
title: "pstack 系列（2）：改代码之前，先看懂再设计"
description: "改代码之前，怎么让 AI 先看懂现有代码、再比较几种设计？这篇教你在 Claude Code 用 pstack 的 /how、/why、/architect、/interrogate、/arena，以及视情况加用的 /teach、/recall、/swarm、原型和写计划。"
date: 2026-10-23 21:45:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor, pstack]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.zh-CN.webp
  alt: "用 /how、/why 看懂代码，用 /architect、/arena 设计，改完以 /interrogate 审查。"
---

AI 编程助手接到“改一下这个功能”，常常直接从第一个看起来合理的地方动手，用的也是它第一个想到的做法。这篇教你用 pstack 的五个 skill 把顺序倒过来：先让 AI 说清楚代码现在怎么运行、为什么长这样，再让它比较几种设计，改完之后再找别的模型挑毛病。每个 skill 我都会说明什么时候用、命令怎么写（附可以直接复制再改写的示例）、它会一步一步做什么、你会拿到什么，以及下一步怎么接。接着介绍视情况加用的三个 skill 和两个 playbook：`/teach`、`/recall`、`/swarm`、原型和写计划。最后我用一个虚构的例子把主线的五个串起来，再附一张“什么时候用哪一个”的对照表。

> pstack 系列｜第 2 篇
>
> - 系列导读：[这套 skill 是什么、四篇该怎么读](/posts/pstack-series-guide/)
> - 上一篇（第 1 篇）：[安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
> - 下一篇（第 3 篇）：[写完代码之后，先证明它能用再合并](/posts/pstack-build-verify-merge/)
{: .prompt-info }

> **版本提醒**：这篇我以 pstack [`0.15.43` 版](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/.cursor-plugin/plugin.json)为准，对应 `cursor/plugins` 的 commit `2f87c85`（2026-11-17 05:47，台北时间），搭配 Claude Code 2.1.326。系列五篇在 2026-11-17 一起改以这一版查证；我查证时，`cursor/plugins` 的 main 在 `2f87c85` 之后没有改动 pstack。之后的版本，行为可能会改变。
{: .prompt-warning }

## 开始之前

pstack 是 Cursor 官方插件库里的一整组 skill。skill 是一份告诉 AI 怎么完成某类工作的操作说明。安装和选模型的方法，我写在[第 1 篇](/posts/pstack-install-routing/)，这篇假设你已经装好了。

**命令要加前缀。** pstack 的文档用 Cursor 的写法，例如 `/how`。在 Claude Code（在终端里使用的 AI 编程助手）里，插件的命令前面要加上插件名称，写成 `/pstack:how`。下面的示例我都用 Claude Code 的写法；在 Cursor 里，把 `pstack:` 拿掉就好。

**这些 skill 不会自己启动。** 它们都设置成不让 AI 自行调用，所以你要亲自输入命令。另一个做法是把任务交给 `/pstack:poteto-mode`，让它依任务自己排顺序：例如在提示里写“先不要改任何代码”，它就会走只读调查，先追查相关的代码，遇到“为什么”的问题再加上 `/why`。

下面我会常用到“子代理”这个词：skill 运行时，会另外派出几个 AI 分头做事，每一个就是一个子代理。派出去的子代理越多，用掉的额度通常也越多。

![五个 skill 的流程：先用 /how、/why 看懂，再用 /architect 设计，最后用 /interrogate 审查；/arena 可以单独用](five-skills-flow.zh-CN.webp){: w="800" h="450" }
_先看懂，再设计，改完再审查。`/arena` 可以单独用；设计很大或有争议时，`/architect` 也会改用它。_

## /how：先弄懂代码现在怎么运行

**什么时候用**：要改一块不熟的代码之前；或是想问“这段代码该放在哪里、该由哪个模块负责、放在这一层对不对”。它只回答“现在怎么运行”，不回答“为什么这样写”，那是 `/why` 的工作。

**命令怎么写**：直接问你真正想知道的事。可以加上入口点和你最在意的部分：

```text
/pstack:how <功能或模块> 是怎么运行的？请从 <入口，例如某个 API 或命令> 开始，说明数据怎么一路流动、每个文件负责什么。我最想知道 <你在意的部分>。
```

例如：

```text
/pstack:how 用户登录之后，session 是在哪里创建、怎么过期的？过期之后前端会发生什么事？
```

**它会怎么做**：

1. 问题范围不清楚时，它会先说出自己的理解，直接开始找；理解错了，你再纠正。
2. 不管问题大小，都只派一个只读不写的子代理，一次读完代码、写好说明。交给这个子代理的任务是：写一份架构说明，让不熟这一块的资深工程师读完，就能建立正确的理解，放心开始动手。
3. 把这份说明交给你，最多做些小幅润饰，或补上对话里的上下文，不会大幅改写。

**你会拿到**：一份给资深工程师看的架构说明。说明文件没有规定固定的段落；pstack 指南说，它会讲到运行时的流程、关键的类型（数据的种类和形状，例如一笔订单有哪些字段），以及不明显、容易踩到的地方。想要固定的段落，例如“开始动手时要看哪些文件”，就在提示里写出来。通过 `/pstack:poteto-mode` 走只读调查时，结果会整理成 Overview、Key Concepts、How It Works、Where Things Live、Gotchas 这几段；如果问的是几个选项怎么选，则会改成一份附比较表的建议。

**下一步**：如果你接着想知道“为什么会长这样”，就跑 `/why`。pstack 指南的建议顺序是先 how 再 why：先弄懂机制，再查历史。如果已经懂了、准备动手，就跳到 `/architect`。

## /why：查出代码为什么长这样

**什么时候用**：想知道某段代码为什么这样写、当初为什么选这个做法、某个阈值从哪里来，或是追查一次退化（原本正常、后来坏掉）的来龙去脉。我觉得它特别适合在你**动手改之前**用，先知道哪些地方有它的道理、不能随便动。

**命令怎么写**：指出目标，说明你的问题。如果你是为了改它才问，把打算怎么改也写进去，再问它当初的理由现在还成立吗：

```text
/pstack:why 为什么 <某段代码或某个决定> 要这样做？这个理由现在还成立吗？我打算 <你想做的修改>。
```

例如：

```text
/pstack:why 为什么 API 的重试上限设成 5 次？这个理由现在还成立吗？我打算把它改成可配置。
```

如果你怀疑是历史包袱造成现在的混乱，也可以一次要两个：“先用 why 查历史，再用 how 说明现在怎么运行”。

**它会怎么做**：说明文件只有一段话，没有规定要派几个子代理、要查哪几类来源，也没有固定的报告段落。照我的读法，它要做的是三件事：

1. **从记录找答案，不从代码猜。** 先读当初加入这段代码的 commit（commit 是 git 里的一次修改记录）和 PR（合并请求）的讨论，再读之后每一次修改它的 commit 和 PR。
2. **线索不够时，才看其他来源。** 说明文件没有列出是哪些来源。如果你接了 MCP（让 AI 连到外部工具的接口，例如 issue 系统、Slack、Notion），它可能会用上。
3. **分清楚哪些是有人写下的。** 引用作者当初写下的话；自己的推论，标明是推论；记录里回答不了的，直接说出来。

**你会拿到**：一份附来源的回答，分得出哪些是作者写下的、哪些是它的推论、哪些在记录里找不到。“没有人写下原因”本身也是一种答案。

如果你是为了改代码才问，我建议在提示最后加一句，请它列出哪些要**保留**、哪些可以**改**、哪些要**避免**，以及有什么**风险**。说明文件没有要它列这份清单，所以要你开口要。

**下一步**：把它查到、不能随便动的地方（或你请它列的清单）带到 `/architect`，当作设计的限制条件。

> `/why` 会读 commit 和 PR 的讨论；线索不够时，也可能用你接上的 MCP 去读 issue、文档和聊天记录。开始之前，先确认你愿意让 AI 读到哪些数据。权限怎么收，可以参考我写的[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。
{: .prompt-tip }

## /architect：写代码之前，先画设计草稿

**什么时候用**：不是小修小改、一动手就可能把结构定错的工作。pstack 指南的分法是：改动会跨过函数的边界，或会改变某段代码归谁负责，就值得用 `/architect`。

**命令怎么写**：说明要做什么，加上你最在意的地方。**如果想在它动手实现之前先看设计，一定要在提示里写明“设计完先停下来给我看”**；没写的话，它画完设计就会接着写代码：

```text
/pstack:architect 帮我设计 <要做的功能>。设计完先停下来给我看，不要实现，并说明你比较了哪两种设计、为什么选这一种。我最在意 <调用端怎么用／性能／之后好不好扩展>。限制：<上一步 /why 查到、不能动的地方>。
```

例如：

```text
/pstack:architect 帮我设计导入数据的流程，设计完先停下来给我看。我最在意调用端怎么用。
```

**它会怎么做**：说明文件只有短短两段，我把重点整理成下面几件事。

1. **先追查**：写代码之前，先把这次改动会碰到的每一个系统都追一遍。
2. **画两种设计**：画出两种不同的设计，每一种都只有类型、函数签名（函数的名称、参数和返回值）和模块的分工。
3. **挑一种**：选出最符合这三点的那一种：每一份数据状态只由一个地方负责修改、同一件事只有一种做法、调用端需要知道的东西最少。
4. **大的设计交给 `/arena`**：设计很大或有争议时，它不自己画，改跑 `/arena`，让几个子代理各画一份再比较。
5. **一直绕路就重新设计**：实现时同一种绕路写法一再出现，它会重新设计，而不是继续打补丁。

**你会拿到**：一份类型、函数签名和模块分工的设计；没有要它先停的话，接着就是照这份设计写出来的代码。说明文件没有规定设计要用什么格式交给你。想看两种设计怎么比、它为什么选这一种、还有哪些问题要你决定，就像上面的示例一样，在提示里写出来。

**下一步**：它停下来给你看设计时，有疑问先问清楚，同意后再让它往下实现。如果这个设计很重要、改错代价很高，可以在实现之前，先对设计跑一次 `/interrogate`，让它派出的模型写个原型，或直接在现有代码上试，找出这个设计会在哪里出错；不然就等实现完，再对改动跑 `/interrogate`。

## /interrogate：找几个模型一起挑毛病

**什么时候用**：代码改完、合并之前，想找出自己和 AI 都没看到的问题。它最适合审**实际的代码改动**：每个问题都要实际跑过才算数，拿一份没有代码的计划去审，能打破的东西很少。

**命令怎么写**：指出要审什么。范围可以是几个文件、一份 diff（两个版本之间改了哪些行），或整个 branch（git 里的一条开发分支）。加上“先不要改任何东西”和“不要挑小毛病”，结果会更好用：

```text
/pstack:interrogate 审查这个 branch 的全部改动，要严格。先不要改任何东西。除非是真正的 bug 或行为退化，不要挑小毛病。
```

只审几个文件时：

```text
/pstack:interrogate 审查 <文件或文件夹>。这次改动的目的是 <你想达成的事>。
```

**它会怎么做**：

1. **确定范围。** 你指定了文件或 diff 就用那些；没指定时，它会取出当前 branch 从分出来的地方（merge base）一路到工作目录的所有改动，还没 commit 的也算在内。
2. **用自己的话写下这次改动想达成什么。** 依据是你的消息、commit 说明和 PR 说明。意图不清楚时，它会先问你。
3. **派出对手。** 你在 `interrogate reviewers` 配置的每个模型各派一位对手（skill 里叫 adversary），每位都有自己的 worktree（同一个项目的另一份工作副本），还没 commit 的改动也会复制过去。每位拿到同样的范围、意图和同一段指示：想办法把这个改动弄坏，每个问题都要对真实的代码跑一次来证明，例如一个会失败的测试、一段复现问题的脚本，或打印出错误行为的命令输出。审的是设计或计划时，就写个原型或直接在现有代码上试。没跑过的不要报，包括风格、命名、结构，以及要等之后再改什么才会出事的风险。什么都没找到，也是合理的结果。
4. **重跑验证。** 它把每个发现附的命令重跑一次。输出真的显示失败、而且这个失败违反了改动的意图，才留下；其余丢掉。根本原因相同的发现合并成一个。
5. **全部保留，不挑一份。** 它借用 `/arena` 的派工方式，但不评审、不选底稿，也不嫁接：每位对手找到的失败不一样，所以结论保留每一个验证过的发现。

**你会拿到**：一份分成三段的结论。

- **Intent**：它对这次改动意图的重述。
- **Findings**：每一个验证过的发现，附上命令、命令的输出、它怎么违反意图，以及是哪几位对手找到的。一个都没留下时，会写明没有验证过的发现。
- **Dropped**：每位对手被丢掉几项、为什么。

**它不会自动改你的代码。** 要不要改、改哪些，由你决定。

**下一步**：先处理 Findings 里的问题，每一项都附了命令，你可以自己重跑一次确认。Dropped 也要读，你可以推翻它的判断。

![/interrogate 的流程：几位对手各自试着弄坏同一份改动，重跑验证后，结论分成 Intent、Findings、Dropped 三段](interrogate-buckets.zh-CN.webp){: w="800" h="450" }
_几个模型各自试着弄坏同一份改动，只留下重跑后仍失败的发现。它不会自动改代码。_

## /arena：让几个 AI 各做一份，再挑最好的

**什么时候用**：只做一次，很可能就把做法定错的事。pstack 指南举的例子是命名、数据格式和算法这类单独的决定。你也可以拿它要第二意见：把你现在的设计当成其中一份，看看其他做法有没有更好的。设计很大或有争议时，`/architect` 也会改用它来画草稿。

**命令怎么写**：说清楚任务、为什么重要，以及你要几份。决定越重要，可以要越多份；不重要就少一点：

```text
/pstack:arena <任务>。这件事很重要，因为 <之后很难改／会影响很多地方>。要 <N> 份候选，每份用自己的 worktree。
```

例如：

```text
/pstack:arena 帮我决定缓存 key 的格式，要 3 份候选。这个格式之后很难改。
```

```text
/pstack:arena 针对我们现在的做法给第二意见。
```

**它会怎么做**：它会先开一份待办清单，分成六个阶段。

1. **Frame（定规则）**：每份候选拿到的提示完全相同，所以提示就是约定。它会先写清楚每份候选要交出什么，再订 3 到 6 条可以打分的评分标准。评分标准是评审打分、以及它自己在第 4 步选底稿时用的，候选只看到任务。每份候选各有自己的工作位置（尽量用 git worktree，也就是同一个项目的另一份工作副本），避免互相覆盖。
2. **Fan out（分头做）**：同时派出 N 个子代理，各自完成任务，并附一段说明：考虑过哪些做法、为什么不选。有一份没交出东西时，就用剩下的 N-1 份继续，并记下来。
3. **Cross-judge（评审）**：所有候选都完成后，派一位只读不写的评审。评审一定要用和主对话不同厂商的模型（Fable 也算 Claude），依评分标准逐条打分，推荐一份当底。找不到别家的模型时，就跳过评审，并在说明里写出来。在 Claude Code 里，子代理只能用 Claude 的模型（Opus、Sonnet、Haiku、Fable），评审名单里别家的模型（默认是 Gemini）会[改用主对话的模型](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/harness/claude-code.md#L36)来跑；名单里全是 Claude 的模型时，就跳过评审。不论哪一种，结果里都会写明。
4. **Pick（选底稿）**：它自己也把每份候选从头读到尾，逐条依评分标准打分；有评审时，再和评审的结果比较。两边选的一样，就确定；不一样，就代表有一边有偏见，或评分标准写得不清楚，要再读两边的理由才决定。它会选一份之后最好扩展、又不容易破坏既有规则的版本。
5. **Graft（嫁接）**：再看一次落选的候选，每份通常挑一两个值得搬过来的优点，亲手融进底稿，而不是直接粘贴。如果几份候选做法一致，就直接用这个共同的做法，不必嫁接；如果彼此差太多，代表第 1 步的任务没讲清楚，要重新定规则再跑一次，而不是取平均。
6. **Verify（验证）**：像验证其他产出一样，验证合并后的结果。发现问题时，判断是第 1 步定错了（重来），还是某份候选其实抓到了、只是漏了嫁接（回到第 5 步）。

**你会拿到**：一份合并后的结果，加上一段简短的说明：选了哪份当底和原因、评审的结论（或这次跳过了评审）、每一项嫁接来自哪份候选、哪些被舍弃和原因、有没有候选收敛或缺席，以及验证的结果。

**下一步**：如果产出是代码，合并前可以再跑 `/interrogate`。如果你要的是“每个包都检查一遍”这种**覆盖**，而不是比较做法，那是另一个 skill `/swarm` 的工作（下一节会介绍），不要用 `/arena`。

![/arena 的六个阶段：定规则、分头做、评审、选底稿、嫁接、验证](arena-phases.zh-CN.webp){: w="800" h="450" }
_候选越多，派出的子代理就越多：N 份候选，再加最多一位评审。_

## 视情况加用：三个 skill 和两个 playbook

上面五个是主线，下面这几个只在特定情况下才用。`/teach` 和 `/recall` 帮你看懂代码和自己做过的事；`/swarm` 让几个 worker 并行检查；原型和写计划是 `/poteto-mode` 下面的 playbook，要通过它来跑，没有单独的命令。

### /teach：摘要不够，要真的弄懂

**什么时候用**：`/how` 给的说明不够，你想真的弄懂一个改动或一块代码。例如要审一个 PR、接手不熟的模块，或想确认一个修法处理的是原因，而不是症状。它也能拿来问 AI 自己的做法（[指南第 3 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/03-understand.md#L37-L51)）。

**命令怎么写**：说出你想弄懂什么。指南建议加一句“说服我”，让说明变成一段你能检验的论证，而不只是导览：

```text
/pstack:teach 这个 PR 怎么改了重试的流程？说服我它修的是原因，不是症状。
```

问 AI 自己的做法：

```text
/pstack:teach 你为什么这样实现，而不是用队列？你取舍了什么、为什么？
```

指南提到，要 AI 解释自己的做法，对它也有帮助：它得回去读代码、给每个说法找证据，不能很有把握地带过就算了。

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/teach/SKILL.md#L11-L17)）：

1. **先决定你该带走哪几件事。** 从对话判断你为什么问（要改、要审、要调试，还是刚接手）和你已经懂什么，再挑出几个重点。你显然已经懂的就跳过。它不会出题考你。
2. **让 `/how` 和 `/why` 去查。** 它自己先读代码找方向，再并行跑 `/how` 和 `/why`，把结果合在一起。一整个子系统就两个都跑；小改动可能只跑其中一个。
3. **先给最短的完整答案。** 先用一两句说它是什么，再接到你眼前的案例，之后才往机制、理由和边界情况深入。你问了才加深，不会一次倒出一大段。
4. **图一张一张叠上去。** 有三个以上的部分时，它不画一张全部挤在一起的大图，而是画一系列，每张重画前一张、再多加一个部分。
5. **保留 `/why` 的不确定用语。** 为了教学它可以改写，但 `/why` 标成推论或“记录里找不到”的地方会原样保留，因为那是核实的结果，不是语气。

**你会拿到**：一段大白话的解释，而不是“我做了什么”的报告。开头先讲重点，接着说它是什么、怎么运行、为什么这样，最后列出值得再用 `/how` 或 `/why` 追下去的线索（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/teach/SKILL.md#L21)）。它的目标是让你懂，不会改任何代码（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/teach/SKILL.md#L9)）。

**下一步**：弄懂了、准备动手，就接 `/architect`。它列出的线索里还有你在意的，再单独跑 `/how` 或 `/why`。

### /recall：接回旧题目之前，先找回自己的上下文

**什么时候用**：要开始或接回一个做过的题目，想先找回自己最近在这个题目上做到了哪里。旧对话里有新开的 AI 不知道的上下文，所以指南建议先加载，再交代新的任务（[指南第 3 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/03-understand.md#L53-L65)）。如果你只是要接回**某一个**对话，那是 Session pickup playbook 的工作，不是 `/recall`，我写在[第 4 篇](/posts/pstack-principles-customization/)。

**命令怎么写**：说清楚题目和时间范围；有新的资料要它处理，就接在后面：

```text
/pstack:recall 帮我整理上周做导出功能的进度
```

```text
/pstack:recall 我昨天在虚拟列表上做的事，然后读这份 bug 报告。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/recall/SKILL.md#L17-L22)）：

1. **先分类。** 要接回某一个对话，就改走 Session pickup。如果你已经给了完整的状态（路径、分支、改了什么），它直接拿来用，不再翻记录。
2. **先锁定范围。** 包括时间（“最近”默认是最近 7 天）、题目和项目（默认是当前这个；没有你的要求，不读其他项目的记录）。它会先把范围说给你听。
3. **分头翻你的对话记录。** 并行派出几个用快速、便宜模型的子代理，每个负责一部分，只读和题目有关的对话与段落。每个都用同样的格式汇报：题目、你的目标、做过的决定、还没完成的事、卡住或被纠正的地方，以及产出（PR、ticket、分支）。只有一两个对话时，就不派子代理，直接搜。在 Claude Code 里，它读的是 `~/.claude/projects/` 下面这个项目的对话记录（`.jsonl` 文件），只读这个项目的文件夹（[Claude Code 对照文档](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/harness/claude-code.md#L57)）。
4. **扫共享记录。** 题目指名了某个功能、文件、子系统或 bug 时，这一步一定会做。版本控制、issue 系统、聊天频道、文档和错误追踪，每个来源各派一位子代理，去问“现在的状态是什么、试过哪些没成功、用户还在反馈什么”。没有接上的 MCP 就跳过，并且说明。
5. **对照实际状态。** 用 `git` 和 `gh` 确认前面找到的 PR、分支和 ticket 现在的状态。

**你会拿到**：一份按固定格式写的简报（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/recall/SKILL.md#L24-L33)）。

- **Capsule**：最多 5 点，说明这件工作是什么、整体进行到哪里。
- **Threads**：每条工作一行，前面标一个状态，例如 `[merged #N]`、`[open PR #N]`、`[in flight <branch>]`、`[reverted #N]`。
- **Problems**：最多 5 个反复出现的问题，包括用户一直反馈的症状，以及上线后又被 revert 的修法，让下一次从上次失败的地方开始。
- **Next move**：最有用的下一步。

从对话记录找到的内容会附上对话 ID，从共享记录找到的会附上来源，例如 PR 编号或 ticket ID。

**下一步**：按 Next move 开一个新任务，交给 `/pstack:poteto-mode`。

> `/recall` 会读你过去的对话记录；题目指名了功能或 bug 时，还会通过你接上的 MCP 去读 issue、聊天频道和错误追踪。和 `/why` 一样，开始之前先确认你愿意让 AI 读到哪些资料。
{: .prompt-tip }

### /swarm：要的是覆盖，不是比较做法

**什么时候用**：并行做能换来覆盖，或能让几个独立的尝试比赛的时候。例如每个包各检查一次，或让几个 worker 同时试着复现一个偶发的失败。它和 `/arena` 的区别在于：`/arena` 把同一份任务做 N 次，再选底稿、嫁接优点；`/swarm` 把工作切成几块各做各的，或让几个 worker 拿同一份任务比赛，选法事先讲好，不选底稿也不嫁接（[指南第 4 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/04-design.md#L47-L55)）。

**命令怎么写**：说清楚怎么切、每一块怎么检查，以及最后要一份报告：

```text
/pstack:swarm 用每个包自己的 check.sh 检查 packages/ 下面的每个包。一个包一个 worker，最后给我一份报告。
```

要比赛时，事先讲好怎么选：

```text
/pstack:swarm 派 3 个 worker，各自试着复现这个偶发失败的测试。先复现的就算数。
```

**它会怎么做**：它会先开一份待办清单，分成四个阶段（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/swarm/SKILL.md#L11-L41)）。

1. **Frame（定范围）**：先写下怎样算完成，以及最后要交回什么。再决定形状：切成几块、让 N 个 worker 拿同一份任务比赛，或两者混用。比赛的话，派出去之前先宣告选法：`first pass`（第一个通过的）、`rank all`（全部排名）或 `best-of`（挑最好的）。worker 的模型读 `/setup-pstack` 设置里的 `swarm workers` 那一行，没有这一行时用 Opus 5.5（high）。worker 要写文件时，各给一个自己的输出位置；要验证或测量某些 commit 时，任务说明会写明确切的 SHA 和测量方法。
2. **Fan out（分头做）**：一次派出全部 N 个 worker。每份任务说明都能单独读懂，写明目标、范围、负责哪一块、怎么验证、汇报什么。汇报用 `PASS`、`ISSUES` 或 `BLOCKED`，并附上证据；能证明有问题的 worker，要列出每一个能证明的问题，不能只报第一个。在 Cursor 里 worker 默认跑在云端，在 Claude Code 里则改成每个 worker 各用一个 worktree（[Claude Code 对照文档](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/harness/claude-code.md#L24)）。有 worker 没交东西，就用剩下的 N-1 个继续，并记下来。
3. **Aggregate（汇总）**：结果没记下任务说明要求的 SHA 和测量方法，就丢掉、重派一次；第二次还是没有，就记成缺口。缺口不算通过。覆盖型的工作，每一块都要有结果；比赛则按事先宣告的选法挑。
4. **Report（报告）**：在对话里交回一份汇总报告，不贴 worker 的原始输出。

**你会拿到**：一份报告，包括结果表、每个问题一行的摘要，以及缺口或缺席的 worker；用了比赛时，也会写出选法。

**下一步**：`ISSUES` 列出的问题一项一项修。`BLOCKED` 和缺口要另外处理，不要当成通过。

### 原型：用跑得起来的东西做决定

做原型走的是 `/poteto-mode` 下面的 Prototype playbook，没有单独的命令。

**什么时候用**：一个跑一下就能回答的开放问题，例如布局、交互、时序或某种做法。指南的建议是不要采用第一个设计，而是要几个方案，再从看得到的证据里挑；不只界面，行为和算法也适用（[指南第 4 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/04-design.md#L67-L83)）。另外，`/poteto-mode` 遇到跑一下就能解决的分歧时，本来就会先做原型，而不是停下来问你（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/SKILL.md#L21)）。

**命令怎么写**：说出要比较什么，以及你想看到的证据：

```text
/pstack:poteto-mode 给新的下拉菜单做几个原型方案，放在同一个切换器后面，每个都截图给我比较。
```

设计比较大时，可以和 `/architect` 一起用，并留一个由你审查的关卡：

```text
/pstack:poteto-mode 我们要给外部 webhook 加上限流。先用 /architect 设计，开放的问题用原型回答。继续之前先让我看过。
```

**它会怎么做**（[Prototype playbook](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/prototype.md#L5-L12)）：这是唯一一个把“最小改动”和验证标准倒过来的 playbook。速度优先，代码质量不重要，也不做计划；严谨的地方在于用最低的成本选对设计。它也会提出你没要求的变化。

1. **先讲清楚要做哪个决定。** 例如哪种布局、哪种交互、哪种密度，或是哪种行为、时序、做法。没有要做的决定就不做原型，改走一般的 Feature playbook。
2. **方向还很开放时，先找参考。** 搜索前例，整理主题、配色和布局的参考，让你先挑方向再动手。方向已经定了就跳过。
3. **在临时文件夹里做一次性的版本。** 和正式代码分开。视觉的决定，用能呈现想法的最轻技术，例如纯 HTML、CSS、JavaScript；行为或时序的决定，写一个最小的脚本。不用正式框架，不写测试，也不做抽象。
4. **方案放在同一个切换器后面。** 用按钮或快捷键切换，每个方案都标上名称。
5. **在对应的界面验证。** 视觉的决定，给每个方案截图并实际操作；行为或时序的决定，记录时间、打印输出或看画面。这时观察本身就是测试。截图要靠操作界面的 skill，例如 `cursor-team-kit` 的 `control-ui`（见[第 1 篇](/posts/pstack-install-routing/)）。
6. **列出方案、取舍和建议。**

**你会拿到**：试过哪些方案、证据（视觉的决定是截图，行为的决定是观察到的输出或时间）、取舍、它的建议，以及临时文件夹的路径。它会明确说明原型是一次性的（[Prototype playbook](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/prototype.md#L14)）。

**下一步**：选定方向之后，交给 Feature playbook 正式实现，或先用 `/architect` 定出形状。原型的代码不要直接合并进项目。

### 写计划：设计定了，再拆成 PR

写计划走的是 `/poteto-mode` 下面的 Multi-phase plan playbook。pstack 刻意没有做规划用的 skill；作者在 README 里写明自己不相信先做计划，认为最好的规格就是代码（[README](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/README.md#L268-L270)）。

**什么时候用**：工作会跨好几个 PR，而且设计已经定了（[指南第 4 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/04-design.md#L95-L111)）。只动一两个文件、做法很明显的改动，它会说不需要计划，然后停下来。

**命令怎么写**：设计定了之后再要，并写出每个 PR 要怎么证明能用：

```text
/pstack:poteto-mode 把这个设计写成计划。拆成小的、可以验证的 PR，每个都有自己的验证步骤。
```

做迁移时，把标准写进提示：

```text
/pstack:poteto-mode 规划把 UI 组件库迁移到新的样式系统。拆成小的、可以验证的 PR，每个都要做视觉回归检查。结果要和原来完全一样，连 bug 也一样。
```

“连 bug 也一样”是为了不让迁移顺手修掉东西；不然新旧两边的结果就没法比对了。

**它会怎么做**（[Multi-phase plan playbook](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md#L5-L9)）：

1. **改动小就跳过。** 一两个文件、做法很明显时，说明不需要计划，然后停下。
2. **先用原型解决还没定的问题。** 只有跑什么都决定不了的产品或偏好问题，才问你。
3. **写计划文件。** 开头写这次改了什么、PR 的合并顺序，以及依赖关系：哪些 PR 互相独立、可以直接从主干分出来，哪些要等谁，每个 PR 可以碰哪些文件。接着每个 PR 一节，一个 PR 只做一件事、有自己的证据。每一节用复选框列出它依赖什么、要改哪些文件、要做的那个改动、你会看到的结果，以及怎么验证。
4. **只有测试不算验证。** 每个 PR 要勾满单元测试、实际操作和性能三格，才算验证过。实际操作要在真实的界面上跑一个具体场景，并写出怎样算通过；性能要写出指标、测量方法、先测好的主干基准，以及超过多少算失败。改到交互的 PR，合并前要等你审过。
5. **交回计划文件的路径就停下。** 你明确说开始，它才会执行。

**你会拿到**：计划文件的路径、各个 PR 的编号和依赖、哪些 PR 要你审过才能合并，以及还没证明的部分（[Multi-phase plan playbook](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md#L11)）。计划里也会写明之后由哪个 playbook 执行（[指南第 10 章](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/10-recipes-and-pitfalls.md#L45)）。

**下一步**：读过计划，同意之后再叫它开始。工作会跨好几天时，指南建议可以暂时把计划 commit 进 repo，让其他 agent 看到进度，做完再删掉。

## 一个完整的例子（虚构）

> **以下是我虚构的情境**，只用来示范五个 skill 怎么接在一起。
{: .prompt-info }

假设你维护一个网站，现在每来一条通知（有人留言、有人点赞），系统就发一封邮件。你想加一个选项：用户可以改成每天只收一封摘要邮件。

**1. 先看懂现在的通知怎么发。**

```text
/pstack:how 通知是从哪里触发、怎么排进队列、最后由谁发出邮件的？我最想知道发邮件这一步跟用户偏好设置是怎么接起来的。
```

读它的说明，确认你知道发邮件的代码在哪里、有哪些容易踩到的地方。

**2. 查清楚为什么现在是一条一封。**

```text
/pstack:why 为什么通知是每来一条就马上发，而不是整批发？这个理由现在还成立吗？我打算加一个“每日摘要”的选项，最后请列出哪些要保留、哪些可以改、哪些要避免，以及有什么风险。
```

你在提示最后要了这份清单，报告就会附上。例如它可能提醒你，某类通知当初就是为了实时才这样设计，要保留。

**3. 先画设计，停下来给你看。**

```text
/pstack:architect 帮我设计“每日摘要邮件”这个选项。设计完先停下来给我看，不要实现，并说明你比较了哪两种设计、为什么选这一种。我最在意现有的实时通知不要受影响。限制：<粘贴第 2 步清单里要保留和要避免的部分>。
```

`/architect` 的第一步本来就会自己追查改动会碰到的代码，但说明文件没有要它查历史；想把当初的理由当成限制，就要像第 2 步这样自己先跑 `/why`。这个例子前两步我安排成手动跑，也是为了让你先看懂代码、检查 AI 的理解有没有偏；如果你不需要这些，可以直接从这一步开始。它停下来时，看它比较了哪两种设计、为什么选这一种，有疑问先问清楚，同意之后再让它实现。

**4. 遇到一个单独的决定，交给 `/arena`。**

假设设计里还有一个没定的问题：摘要邮件的内容要依时间排，还是依通知类型分组？这种单独的决定，可以另外交给 `/arena`：

```text
/pstack:arena 帮我设计每日摘要邮件的内容格式，要 3 份候选。重点是让用户一眼看到最重要的通知。
```

**5. 改完之后，合并之前审查。**

```text
/pstack:interrogate 审查这个 branch 的全部改动，要严格。先不要改任何东西。除非是真正的 bug 或行为退化，不要挑小毛病。
```

先处理 Findings 列出的问题；Dropped 也读一遍，不同意就推翻它。

> 这个例子我写成**逐一手动**调用每个 skill，好让你掌握每一步。平常你可以直接把目标和限制交给 `/pstack:poteto-mode`，它会自己决定要用哪些 skill、照什么顺序。这时候不要在提示里逐一列出 skill，那会打乱它原本排好的顺序；只有想改变默认做法时，才点名某个 skill。
{: .prompt-tip }

## 什么时候用哪一个

pstack 指南先讲了一句我认为很重要的话：**大部分的改动，这些都不需要。**下面是它建议的分法，我再加上 `/how`、`/why`、`/teach` 和 `/recall`：

| 情况 | 用哪个 |
| --- | --- |
| 要改一块不熟的代码，先弄懂它现在怎么运行 | `/how` |
| 想知道为什么这样写、改之前哪些不能动 | `/why`（要它最后列出哪些要保留、哪些要避免） |
| 摘要不够，想真的弄懂一个改动或一块代码 | `/teach` |
| 接回做过的题目，先找回自己做到哪里 | `/recall`（只接回某一个对话时，用 Session pickup） |
| 一个已经改完的小改动，但你不放心 | 只用 `/interrogate` |
| 改动会跨过函数的边界，或改变某段代码归谁负责 | `/architect`（设计大或有争议时，它会带上 `/arena`） |
| 一个单独的决定，例如命名、数据格式、算法 | 直接用 `/arena` |
| 有争议、改错代价很高的设计 | 先 `/architect`，合并前再 `/interrogate` |
| 要做覆盖，例如每个包都检查一遍，或让几个 worker 比赛 | `/swarm` |
| 跑一下就能回答的问题，例如布局、时序或做法 | 用 `/poteto-mode` 做原型，不要靠讨论 |
| 会跨好几个 PR 的工作 | 设计定了之后，用 `/poteto-mode` 写计划 |
| 想交给 AI 自己判断 | `/poteto-mode`，它已经内置这套分法 |

## 注意事项

- **额度**：派出的子代理越多，通常越耗额度。`/how` 只派一个子代理；`/why` 的说明文件没有规定要派几个；`/interrogate` 每个模型派一位对手，每位都要在自己的 worktree 里实际跑代码；`/arena` 是 N 份候选，再加最多一位评审；`/architect` 遇到大型或有争议的设计时，会跑一整场 `/arena`，这时派出的子代理最多。`/teach` 会实际跑 `/how` 和 `/why`（小改动可能只跑一个）；`/recall` 会并行派子代理翻你的对话记录，题目指名功能或 bug 时，每个共享记录的来源再各派一位；`/swarm` 切成几块就派几个 worker。小改动不值得动用 `/architect` 或 `/arena`。
- **`/architect` 默认不会停**：想在实现前看设计，要在提示里写明“设计完先停下来给我看”。
- **不要只采用第一个设计**：第一次做出来的设计，往往只是模型第一个想到的形状。重要的设计，用 `/architect` 或 `/arena` 多看几种。
- **不要审抽象的计划**：`/interrogate` 只留下跑得出来的问题，一份没有代码的计划，能打破的东西很少。开放的问题先用原型解决，再把 `/interrogate` 用在实际的代码改动上。
- **原型是一次性的**：原型的代码不写测试、不做抽象。选定方向后，要按 Feature playbook 重新实现，不要直接合并。
- **不要全盘接受审查意见**：`/interrogate` 只留下重跑证明得了的问题，也会列出丢掉了哪些、为什么；但最后由你决定，两个方向都可以推翻。
- **平行的 AI 不要共用一个工作目录**：它们会互相覆盖，也分不出谁改了什么。用 `/arena` 时，可以要求每份候选用自己的 worktree；`/swarm` 在 Claude Code 里默认就让每个 worker 用自己的 worktree。
- **版本**：以上是我依 pstack `0.15.43` 的说明文件整理的，之后的版本可能会改变做法。

## 结论

用 pstack 改代码之前，我建议的顺序是：先用 `/how` 弄懂代码现在怎么跑，需要时用 `/why` 找出不能动的理由；再用 `/architect` 比较两种设计、画好类型草稿，想先看过就在提示里要它停下来；遇到单独的决定，用 `/arena` 让几份候选比一比；代码改完，用 `/interrogate` 让几个模型实际跑代码、想办法把它弄坏，只留下证明得了的问题，再自己决定改哪些。摘要不够时用 `/teach`，接回旧题目先跑 `/recall`，要覆盖或比赛就用 `/swarm`。跑一下就能回答的问题，交给 `/poteto-mode` 做原型；跨好几个 PR 的工作，等设计定了再请它写计划。不是每次都要全部跑一遍：小改动直接改，改完不放心再审查就好。

## 延伸阅读

- [指南：Understand the code](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/03-understand.md)：`/how`、`/why`、`/teach`、`/recall` 各自适合的情况。
- [指南：Design](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/04-design.md)：`/architect`、`/arena`、`/swarm`、`/interrogate` 和原型。
- [指南：Recipes and pitfalls](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/10-recipes-and-pitfalls.md)：可以直接复制的提示和常见陷阱。
- skill 的说明文件：[how](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/how/SKILL.md)、[why](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/why/SKILL.md)、[architect](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/architect/SKILL.md)、[interrogate](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/interrogate/SKILL.md)、[arena](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/arena/SKILL.md)、[teach](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/teach/SKILL.md)、[recall](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/recall/SKILL.md)、[swarm](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/swarm/SKILL.md)。
- playbook 的说明文件：[Prototype](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/prototype.md)、[Multi-phase plan](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)。
- [pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：怎么安装，以及 `/poteto-mode` 怎么替任务排顺序。
- [自己写 Agent Skill](/posts/agent-skill-authoring-guide/)：从写 skill 的角度看 SKILL.md 的结构和测试。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：agent 读得到哪些文件、权限怎么收。
- 另一套 skill 的做法：[mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)、[把模糊需求问清楚](/posts/mattpocock-skills-requirements-shared-language/)、[先找出缺口，再决定要写规格还是拆工作单](/posts/mattpocock-skills-specs-work-breakdown/)、[代码写完之后，谁来看结构、审修改、解冲突](/posts/mattpocock-skills-design-review-integration/)、[查资料、做交接、学新东西](/posts/mattpocock-skills-research-handoff/)。
