---
title: "pstack 系列（2）：改代码之前，先看懂再设计"
description: "用 pstack 改代码前，怎么让 AI 先看懂现有代码、再比较几种设计？本文用 Claude Code 实测 /how、/why、/architect、/interrogate 与 /arena，逐项核对结果，并列出耗时与 API 等价成本。"
date: 2026-10-23 21:45:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.zh-CN.png
  alt: "先用 /how、/why 看懂，再让 /architect、/arena 比方案、/interrogate 挑错。"
---

AI 编程助手接到“加一个功能”，常常直接从第一个看起来合理的地方开始改，用的也是它第一个想到的做法。这篇要解决的问题是：改代码之前，怎么让 AI 先看懂现有的代码，再比较几种设计。我用的练习程序和[第 1 篇](/posts/pstack-install-routing/)相同，叫 `ledger`，是一个用 Python 写的小型记账 CLI（在终端输入命令来使用的程序），会把银行导出的 CSV 文件汇总成收入、支出、净额和各分类的支出。我在它上面把 pstack 的五个 skill 各跑了一次，下面逐一贴出它们实际交出的东西，再用白话说明对我有什么用。

结论先讲：`/how` 的说明逐点核对都正确；`/why` 大致正确，只有一处行号差 1。设计三步里，`/architect` 最贵，跑一次就用掉 4.29 美元的 API 等价金额。API 等价金额是照 API 牌价换算出来的金额；我用的是订阅方案的额度，实际没有另外付钱。

> pstack 系列｜第 2 篇
>
> - 系列导读：这套 skill 是什么、四篇该怎么读（尚未发布）
> - 上一篇（第 1 篇）：[安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
> - 下一篇（第 3 篇）：写完代码之后，怎么证明它真的能用再合并（尚未发布）
{: .prompt-info }

> **版本提醒**：本文以 pstack [`0.15.30` 版](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/.cursor-plugin/plugin.json)为准，对应 `cursor/plugins` 的 commit `eb4db2b`（2026-10-22 14:08，台北时间），搭配 Claude Code 2.1.309。第 1 篇写完后，Claude Code 自动更新了自己和插件，所以两篇的版本不同：
>
> | | 第 1 篇 | 本篇 |
> | --- | --- | --- |
> | pstack | `0.15.29`（`88d4751`） | `0.15.30`（`eb4db2b`） |
> | skill 数量 | 56 | 57 |
> | Claude Code | 2.1.306 | 2.1.309 |
>
> `0.15.29` 到 `0.15.30` 只新增了 `statechart` 这个 skill。本篇用到的 how、why、teach、architect、interrogate、arena、swarm、poteto-mode，以及 Claude Code 对照说明都没有改。我在 2026-10-23 21:28（台北时间）查证时，`cursor/plugins` 的 main 在 `eb4db2b` 之后又有两个 pstack commit（`7698375`、`4ec7ffa`），都只改 `statechart`，版本仍是 `0.15.30`。
{: .prompt-warning }

> **这次怎么测的**：所有实测都是我在 2026-10-23 15:42–21:20（台北时间），在自己的 Mac（macOS 27.0、Claude Code 2.1.309）上运行的。我用的是 Claude Code 的非交互模式 `claude -p`：把命令一次交给它，不在对话界面里操作。权限白名单（事先允许 AI 做哪些事的清单）和第 1 篇相同，只多允许只读的 `git blame`：不能写入 `~/.claude/` 底下的全局配置，不能 `git push`、`gh`、`curl` 或上网，也没有用 `--dangerously-skip-permissions`。每次都要求不要 commit（commit 是 git 里的一次修改记录），练习项目从头到尾都停在 `579a745` 这个版本，草稿只写在没有纳入版本控制的 `.pstack-scratch/` 文件夹。每次的完整提示放在文末附录。**Cursor 上的任何操作都没有实测**。
{: .prompt-tip }

## 先认识五个 skill

pstack 是 Cursor 官方插件库里的一整组 skill。skill 是一份告诉 AI 怎么完成某类工作的操作说明。Claude Code 是在终端里使用的 AI 编程助手；在 Claude Code 里，命令前面要加插件名称，例如 `/pstack:how`。本篇用到五个 skill：

- `/how`：说明代码现在怎么运作。
- `/why`：从修改记录里，找出代码为什么长这样。
- `/architect`：实现前先把设计草稿画出来。
- `/interrogate`：找几个不同的 AI 模型，各自挑设计的毛病。
- `/arena`：让几个 AI 各做一次同一件事，再挑最好的一份，从其他份补进优点。

下面每个 skill 都照同样的顺序写：我请它做什么、它实际交出什么（从实测记录原文照录）、这代表什么，以及花了多少。摘录的原文是繁体中文，这里只把字转成简体，没有改写。

pstack 有一份模型配置（Claude Code 上是 `~/.claude/rules/pstack-models.md`），写明每个角色用哪个模型、effort（要 AI 花多少力气思考）多高；[第 1 篇](/posts/pstack-install-routing/)介绍的 `/setup-pstack` 就是用来生成这份配置的。这次实测时，需要几个模型一起做的角色（architect 和 arena 的 runner、interrogate 的审查者），配置里都是 opus、sonnet、haiku 各一个，effort 都是 high。

## 看懂现有代码：/how 和 /why

![说明图：左边是 /how，回答现在怎么运作，交出整条路径、流程图和 10 点注意事项，我逐点核对全部正确；右边是 /why，回答为什么长这样，查 git 历史和过去的对话记录，把直接证据和推论分开，大致正确，有 1 处行号差 1；下方标示 /teach 和 /recall 未实测](understand-how-why.zh-CN.png){: width="800" height="450" }
_/how 问“现在怎么运作”，/why 问“为什么长这样”。_

### /how：这段代码现在怎么运作

**我请它做什么**：说明一份 CSV 从读进来、算出数字，到打印结果，中间经过哪些代码。

**它实际交出什么**：一份说明，包括总览、整条路径、流程图和 10 点注意事项。下面是其中 4 点注意事项，原文照录：

```text
4. **括号的边界情况**：`(-12)` 会变成 **+12**；`1e3` 会被接受成 1000；`$12` 会失败。这些都没有测试。
5. **档案开头有 BOM 时，每一列都会失败**：Excel 汇出的 CSV 常带 BOM，但这里用的是 `utf-8` 而不是 `utf-8-sig`，header 会读成 `\ufeffdate`，错误讯息是 `error: line 2: 'date'`。
6. **行号可能不准**：行号是以资料列计数，遇到空行或引号内换行就会偏掉。改用 `reader.line_num` 才准确。
7. **`--month` 不检查格式**：传 `2026-1` 会静静地回传全部是 0 的结果。而且因为过滤在解析之后，9 月的一个坏列也会让查询 10 月的指令失败。
```

**这代表什么**：这几点都是光看代码不容易发现、但真的会出错的细节。例如括号里又带负号的 `(-12)` 会被当成正 12；Excel 导出的 CSV 常在文件开头带一个看不见的 BOM 标记，会让每一行都读取失败；`--month 2026-1` 打错格式也不会报错，只会返回一堆 0。我把 10 点逐一对照代码，也实际运行确认，全部正确。对我的用处是：动手改之前，就知道哪些地方容易出错，也知道测试还缺什么。

它的做法也值得一提。它判断这是范围小的问题，只派了 1 个 subagent 去读代码。subagent 是主对话另外派出去、专门做一小段工作的 AI。subagent 汇报之后，主对话又自己核对了一次它引用的行号，才把答案交给我。

**花费**：约 0.73 美元，不到 3 分钟。

### /why：为什么长这样

**我请它做什么**：查出为什么“把括号金额转成负数”这件事放在 parser（负责读文件和解析的模块），而不是放在负责计算或输出的模块。

**它实际交出什么**：一份分层的报告。下面是开头的结论，以及“合理推论”那一节的第一条，原文照录：

```text
转换放在 `parse_amount`，是修正 commit `3c1ea12` 的 AI agent（run c2）决定的，而且它写下了理由。你只规定了行为，没有指定要改哪个档案。
```

```text
## 合理推论
- **[Inferred]** 原作者看来一开始就把「解读 CSV 金额格式」当成 parser 的责任，依据是 docstring 和 README 都在第一个 commit。但没有人写下这样分工的理由。
```

**这代表什么**：它把答案分成两层。第一层有直接证据：转换放在 parser，是[第 1 篇](/posts/pstack-install-routing/)修 bug 的那个 AI agent（会自己读文件、运行命令的 AI）依“修根因”的原则决定的，而且它当时就写下了理由。第二层是推论：原作者为什么一开始就让 parser 处理括号，没有人写下来，它只能从代码里的说明文字和 README 推测，并且明白标成“推论”。对我的用处是：我知道哪些话可以直接相信，哪些只是猜测。

它查了 git 历史（每一次修改的记录），也自己决定去读我本机过去的 Claude Code 对话记录，把它当成团队聊天记录的替代。我核对了它引用的原文，都查得到，只有一处行号差 1。

**花费**：约 1.98 美元，不到 4 分钟。

> `/why` 会读你过去的 Claude Code 对话记录。这次的白名单只禁止写入 `~/.claude/`，没有挡读取，所以它读得到。如果那些记录里有你不想再交给模型的内容，请先调整权限。agent 读得到哪些东西，可以参考[装了第三方 skill 和 MCP 之后的破口](/posts/coding-agent-supply-chain-permission-risks/)那篇。
{: .prompt-warning }

## 比较设计：/architect、/interrogate 和 /arena

看懂之后是设计。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5)点出两种最常见的错：直接采用 AI 的第一个设计，以及花时间修饰一份没有代码验证过的计划。pstack [刻意没有写计划的 skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103)，作者在 [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268) 里说，最好的规格就是代码。所以下面三步交出的都是代码：草稿、可以运行的示例，或是跑过测试的代码。

![说明图：三张卡片依序是 /architect，3 个模型各画一份草稿，挑最好的一份当底再补进优点，停下来列出 5 个要我决定的问题；/interrogate，3 个模型各自挑毛病，结论是修正后可以实现，5 项必须处理；/arena，两个 AI 各写一份，派工前先抓到我的规格自相矛盾，最后测试全部通过；下方标示照草稿实现、/swarm 和应用回项目未实测](design-three-steps.zh-CN.png){: width="800" height="450" }
_三步的产出都只放在 .pstack-scratch/ 文件夹，没有动到项目本身。_

### /architect：先画设计草稿

**我请它做什么**：替 `ledger` 设计“每个分类的月预算与超支警告”，只交出草稿，设计完先停下来给我看，不要实现。

我在命令后面加了 `with checkpoint`。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) 写明，不加的话，它设计完会直接进入实现，中间不会停下来让人确认。

**它实际交出什么**：函数的名称和输入输出（函数本体还没写）、一份示例输出，以及 5 个要我决定的问题。下面是示例输出和第一个问题，原文照录：

```text
...原本的 8 行...
budget 2026-09:      spent      limit  remaining
  housing          1200.00    1200.00       0.00
  ...
budget 2026-10:      spent      limit  remaining
  food              153.45     150.00      -3.45  <-- OVER BUDGET by 3.45
  ...
WARNING: over budget: food (2026-10)
```

```text
1. **没带 `--month` 时要怎么处理？** 我的设计是逐月列出；另外两个选项是只看最新月份，或要求必须带 `--month`。这个影响最大，三个模型的意见也不一致。
```

**这代表什么**：示例输出是它套上现有数据实际跑出来的，不是手算。10 月 food 花了 153.45，预算 150，所以标出超支 3.45。我对照示例数据核对过，数字正确。

它是这样做出来的：先让三种 Claude 模型（opus、sonnet、haiku）各画一份结构不同的草稿，再由其中的 sonnet 当评审打分，最后以 opus 那份为底，从另外两份补进好的部分。然后它停下来，列出 5 个要我决定的问题。第一题“没指定月份时怎么办”影响最大，三个模型的意见也不一致。对我的用处是：还没写任何正式代码，我就先看到结果长什么样，也知道哪些需求我还没讲清楚。

**花费**：约 4.29 美元，约 13 分钟，是这次五个 skill 里最贵的一个。

### /interrogate：让三个模型挑草稿的毛病

先说一个和指南不同的地方。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89)写明，`/interrogate` 应该用在 diff 上。diff 是代码修改前后的差异。拿它审一份没有代码的计划，审查者会想出一堆根本不会发生的理论风险。这次我拿它审的是 architect 的草稿，不是 diff。不过这份草稿有函数的名称和输入输出、用文字写的步骤、测试清单，还有一个能运行的示例程序，不是纯文字计划。

**我请它做什么**：挑出 architect 那份草稿的毛病，只审查，不要改任何文件。

**它实际交出什么**：一份审查结论。下面是它最后的总结，原文照录：

```text
结论是**修正后可以实作**，先改这 5 件事再动手：
1. 大金额（例如 `1E+30`）会通过预算档验证，之后直接 traceback。
2. 非 UTF-8 的预算档会 traceback。
3. `test_json_sample_exact` 对照的是被压缩过的 JSON 范例，照写一定会失败。
4. `--month` 的验证会接受全形数字和 `0000`，而且多开了第二个错误出口。
5. 测试清单漏掉设计自己新增的行为，包括 0 位元组档案、`-0`、跨月的 JSON 等。
```

**这代表什么**：它找了三个不同的模型当审查者，各自挑毛病。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69)说，每个模型的盲点不一样，两个模型各自提出同一个问题时，可信度很高。主对话再把所有意见分成“必须处理”“值得考虑”“记下即可”“不采纳”四类，上面就是必须处理的 5 项。白话说：预算写成天文数字、或预算文件不是 UTF-8 编码时，程序会直接崩溃，打印出 traceback（Python 崩溃时的错误追踪）；草稿里有一个测试照写一定会失败。我自己在 Python 上抽查了其中 3 个关键说法，都属实。

它也挑出 architect 自己的理由有漏洞。architect 说逐月列出“绝不静默漏掉任何一个月”，三位审查者都指出，没有交易的月份其实会被跳过。上一个 skill 写下的理由，被下一个 skill 挑出了问题。对我的用处是：动手实现之前，就先修掉几个会让用户看到报错的问题。

光看这一次，无法判断指南的提醒对不对。这份草稿已经写到函数的输入输出和步骤，审出来的问题我抽查的都是真的；但也有 4 项被判定不采纳，[指南提醒不采纳的部分也要读](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71)。如果你手上只有一份文字计划，照指南先做出代码再审，会比较稳。

**花费**：约 2.03 美元。整段跑了约 23 分钟，但实际运算只有约 3 分钟，原因见后面的观察。

### /arena：让两个 AI 各写一份

**我请它做什么**：让两个 AI 各自改写一次解析金额的函数，只接受一般的金额格式，拒绝 `1e3`、`NaN`、`$12` 这类输入，而且现有的测试都不能坏。

arena 里各自完成同一份任务的 AI 叫 runner。runner 的数量默认来自 `/setup-pstack` 生成的模型配置，[也可以每次调整](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51)。模型配置里是 3 个，这次我刻意在提示里只要 2 个（opus 和 haiku）。

**它实际交出什么**：一份综合报告。报告是英文的，下面是其中两节，原文照录：

```text
## Contract change during framing

The original ask also rejected `'1.234'` (3 decimals), but `tests/test_cli.py` parses `-5.555` through `load -> parse_amount`, so that conflicts with "all existing tests unchanged". The user chose option 1: no limit on decimal places, and the other rejections stay.
```

```text
## Convergence

The two candidates independently wrote the **same grammar**: `[0-9]` only, comma groups of exactly 3, a decimal point that needs digits on both sides, sign XOR parentheses, `fullmatch` on `text.strip()`. Their edge-case decisions were the same too: reject `12,34`, `.5`, `5.`, `( 12 )`, non-ASCII digits and empty input; accept a trailing newline. That is strong agreement, so the consensus shape ships.
```

**这代表什么**：第一节说的是派工前发生的事。我原本要求拒绝三位小数的 `'1.234'`，可是现有测试里有一条 `-5.555` 必须能读进来，两个要求不可能同时成立。它没有硬做，先跑了现有测试、发现矛盾，停下来列出 3 个选项问我。它建议选项 2：维持严格的两位小数，只在验证用的副本里把那条 `-5.555` 改成像 `-5.56` 这样的两位小数；它也提醒，这等于改了我原本禁止改的现有测试。我选了选项 1：不限制小数位数，其他要拒绝的照旧。

第二节是结果：两个 runner 各自写出一模一样的规则，只接受 0–9 的数字、千分位逗号三位一组、小数点两边都要有数字、正负号和括号只能择一。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) 说，两份收敛到同一个形状就是强共识。接着由 sonnet 当评审打分，它不是任何一个 runner 用的模型。评审和主对话都选 opus 那份当底，主对话再从 haiku 那份补进一处写法和几个测试。合并后的版本在临时文件夹里跑测试，全部通过；我在自己的 Mac 上重跑，结果一样。

要注意的是，新版会拒绝一些旧版接受的写法，例如 `.5`、`5.`、`( 12 )`、`12,34`，应用前要先确认数据格式。对我的用处是：它在派 AI 动手之前，先抓出我自己规格里的矛盾。

**花费**：两段合计约 2.29 美元，约 6 分钟。

## 这次没有实测的部分

- Cursor 上的任何操作。
- `/teach` 和 `/recall`。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5)说，`/teach` 会再跑一次 `/how` 和 `/why`，整理成白话说明；`/recall` 会从最近的对话和共用记录，整理某个主题目前的状况。
- 原因不清楚时的[只读调查](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17)（在交给 `/poteto-mode` 的指令里写上“don't change any code yet”）。这次没有重跑，[第 1 篇](/posts/pstack-install-routing/)跑过一次。
- architect 照草稿实现，以及发现架构错了就整个重来的那两段。我刻意让它停在 checkpoint，所以“实现时有没有照草稿走”这次没有答案。
- 把 arena 的结果应用回项目。结果刻意只放在 `.pstack-scratch/`。
- 照模型配置用 3 个 runner 的单独 arena。3 个 runner 只在 architect 内部那一场出现过。
- `/swarm`：把工作切给多个 AI 并行处理。
- 指南建议用来回答设计问题的 [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81)，也就是做几个用完就丢的原型。

## 这次环境观察到的几件事

以下几点都是在这次的环境（账号、版本、`-p` 模式、权限白名单）观察到的，不代表在其他账号或交互界面也一定会发生。

**1. subagent 运行命令常被挡，主对话会自己补跑。** architect、interrogate、arena 三次都有 subagent 运行终端命令（Bash）被拒，主对话都会自己补做验证。第 1 篇看到的是在后台运行的 subagent 一律不能跑命令；这次 `/why` 的后台 subagent 能跑 git 命令，但仍有几个命令被拒。被挡之后，它们改用读文件、搜索或比较简单的命令，并在报告里注明哪些没有实际运行。

**2. effort 这次照模型配置。** effort 是要 AI 花多少力气思考。这次派出的 subagent 都是 high，和模型配置一致；第 1 篇修 bug 和加功能两次都用了 low。

**3. `/interrogate` 在 `-p` 模式下空等。** 主对话派完审查者后，设了一个 20 分钟后叫醒自己的备用计时器。每一段回复的运算时间加起来约 200 秒，整个运行却跑了 22 分 35 秒。看起来审查者早就汇报了，它还是等到 20 分钟的计时到了才结束。这是从时间推论的，没有逐条时间戳证实。

**4. architect 没有派 `/how`。** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) 要求设计前先跑 `/how`。这次主对话自己读完代码，写成一份 `grounding.md` 给后面的 runner 共用，没有派 `/how` 的 subagent。

**5. 插件在两篇之间自动更新了。** 见文章开头的版本提醒。

## 什么时候用哪一个

想知道一段代码现在怎么运作，用 `/how`：它最便宜，交出的注意事项也最实用。想知道代码为什么长这样，而且有 git 历史或过去的记录可查，用 `/why`，并分清楚它标的“直接证据”和“推论”。要加的功能会碰到好几个模块，先用 `/architect with checkpoint` 看草稿和待决问题，再决定要不要实现；它最贵，小改动不必用。手上已经有代码修改，或是写到函数输入输出的草稿，再用 `/interrogate` 让不同模型挑毛病。一件小而具体的修改，想比两种写法，用 `/arena`。不管用哪一个，最后都要自己抽查几项结论。下一篇会接着谈，写完代码之后，怎么证明它真的能用再合并。

## 实测记录

![说明图：横条图列出每一步的 API 等价美元，/how 0.732、/why 1.979、/architect 4.293、/interrogate 2.030、/arena 两段合计 2.288，底部写 7 次调用合计约 11.40 美元](cost-per-step.zh-CN.png){: width="800" height="450" }
_architect 最贵，arena 和 interrogate 次之。_

| 运行 | 命令 | 时间（台北） | 耗时 | 模型与各自的 API 等价（美元） | 5 小时额度 | 细节 | API 等价（美元） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a1 | `/pstack:how` | 15:42–15:45 | 2 分 37 秒 | opus（主对话＋1 个 subagent） | 21% → 24% | 8 步路径、流程图、职责表、10 点注意事项，逐点核对全对 | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | 3 分 35 秒 | opus（3 个调查员＋1 个综合者） | 25% → 35% | 引用都查得到；它说 README 第 13–15 行在第一个 commit 就有，当时其实在第 12–14 行 | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 12 分 42 秒 | opus 3.484、sonnet 0.728、haiku 0.080 | 42% → 87% | 3 份草稿，评审给 C1（opus）26 分、C3（haiku）25 分、C2（sonnet）24 分；以 C1 为底；5 个待决问题 | 4.293 |
| q0 | 额度检查 | 20:39 | 2 秒 | opus | 26% → 26% | 只回复 ok，用来读取额度 | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | 22 分 35 秒（实际运算约 200 秒） | opus 1.790、sonnet 0.213、haiku 0.026 | 26% → 71% | 三位审查者汇报 10、9、17 项；必须处理 5、值得考虑 6、记下即可 6、不采纳 4；我抽查 3 项属实 | 2.030 |
| b3 | `/pstack:arena` | 21:13 | 42 秒 | opus | 74% → 75% | 先跑现有的 13 个测试，发现 `tests/test_cli.py:14` 的 `-5.555` 和规格矛盾，停下来问 | 0.242 |
| b3b | arena 接续（`--resume`） | 21:14–21:19 | 5 分 38 秒 | opus 1.889、sonnet 0.134、haiku 0.023 | 75% → 84% | 17 个测试通过（13 个原有＋4 个新，含 19 个接受、59 个拒绝的子测试）；新测试拿去跑原版会有 30 项失败 | 2.046 |

7 次调用合计约 11.40 美元。这是 Claude Code 报告的 `total_cost_usd`，也就是**照 API 价格换算的等价金额**；这次用的是订阅方案的额度，实际没有另外扣款。

“5 小时额度”是订阅方案在一段 5 小时窗口内的用量上限，表中是每次运行开始和结束时读到的百分比。19:50 额度重置过一次，所以 b1 之后的数字从 26% 重新算起。整段实测一直没有被拒绝。7 天额度从 67% 升到 91%，其中 16:08 到 20:39 从 76% 升到 83% 那段，是我自己平常使用 Claude Code，不是这些实测造成的。

## 附录：完整提示

以下是每次运行时我交给 Claude Code 的完整提示。提示原本是用繁体中文写的，这里转成了简体并做了本地化。

**`/how`**

```text
/pstack:how 这个项目的 parser 和 summary 是怎么接在一起的？请说明从 CLI 读入 CSV、解析成 Transaction，到 summarize 算出数字、再由文字或 --json 输出的整条路径，以及各模块的分工。这是只读问题：不要修改、新增或删除任何文件，也不要 commit。
```

**`/why`**

```text
/pstack:why 为什么会计格式的括号金额（例如 `(12.00)` 代表 -12.00）是在 ledger/parser.py 的 parse_amount 里转成负数，而不是在 report.py 或 cli.py 处理？这是只读问题：不要修改、新增或删除任何文件，也不要 commit。
```

**`/architect`**

```text
/pstack:architect with checkpoint：设计完先停下来给我看，不要实现。功能：每个分类的月预算与超支警告。用户提供一个预算文件（例如 budgets.csv，字段 category,monthly_limit），`ledger summary` 加上 `--budget <文件>` 时，在原本的输出之后，列出每个有预算的分类在该月的支出、预算和剩余，超过预算的分类要明显标示警告；`--json` 也要包含这些信息。没给 `--budget` 时，文字和 JSON 输出都必须和现在逐字节相同。请产出类型与接口草稿（函数 body 先写 not implemented）和设计理由。草稿和所有中间产物只能放在 ~/pstack-lab/.pstack-scratch/ 底下；不要修改 ledger/、tests/ 里的现有文件，也不要 commit。
```

**`/interrogate`**

```text
/pstack:interrogate 请对抗式审查 ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ 里的设计草稿（parser.py.sketch.py、report.py.sketch.py、cli.py.sketch.py、test_sketch.py、rationale.md、verify_sample.py），对照现有的 ledger/ 和 tests/。意图：为 `ledger summary` 加上 `--budget <文件>`（budgets.csv，字段 category,monthly_limit），在原本输出后列出每个有预算的分类在该月的支出、预算、剩余，超支要明显警告，--json 也要包含；没给 --budget 时文字与 JSON 输出必须逐字节不变。这是尚未实现的 not-implemented 草稿，请审查设计本身（接口、边界、正确性、测试是否足够）。只审查、给出 verdict，不要修改或新增任何文件，不要应用修改，不要 commit。
```

**`/arena`**

```text
/pstack:arena 只用 2 个 runner：opus high 与 haiku high。这是刻意覆写 pstack-models 配置里 arena runners 的 3 个 runner（opus、sonnet、haiku），目的是把 N 降到最小；cross-judge 照配置的 pool 选一个。任务（小而具体）：强化 ~/pstack-lab/ledger/parser.py 的 parse_amount，只接受一般金额：可选的正负号或会计括号、数字可含千分位逗号、最多两位小数。要拒绝并丢 ParseError 的例子：'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'、'1.234'（三位小数）。'1,234.50'、'-3.20'、'(12.00)' 等现有行为与所有现有测试都必须保持不变。每个 candidate 只能在 ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/ 底下产出：修改后的完整 parser.py 副本、新增的测试、简短 rationale。综合结果放在 ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/，并在 .pstack-scratch 里验证（例如把 ledger/ 与 tests/ 复制到 .pstack-scratch/arena-amount/verify/ 再用 python3 -m unittest 跑）。不要修改 ~/pstack-lab/ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。
```

`/arena` 停下来问我之后，我用 `--resume` 接着回复：

```text
选项 1：不限制小数位数，'1.234' 从拒绝名单拿掉；其他要拒绝的例子不变（'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'），所有现有测试不动且必须通过。其余条件照旧：只用 2 个 runner（opus high、haiku high，刻意覆写配置的 3 个），产出只放在 ~/pstack-lab/.pstack-scratch/arena-amount/，不要修改 ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。请继续跑完 arena 全部阶段。
```

我在自己的 Mac 上重跑测试用的命令：

```bash
python3 -m unittest discover -s tests
```

## 延伸阅读

- [指南：Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md)：`/how`、`/why`、`/teach`、`/recall` 各自适合的情况。
- [指南：Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md)：`/architect`、`/arena`、`/swarm`、`/interrogate` 和原型。
- [pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：本篇用到的练习项目和只读调查。
- [自己写 Agent Skill](/posts/agent-skill-authoring-guide/)：从写 skill 的角度看 SKILL.md 的结构和测试。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：agent 读得到哪些文件、权限怎么收。
- 另一套 skill 的做法：[mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)、[把模糊需求问清楚](/posts/mattpocock-skills-requirements-shared-language/)、[先找出缺口，再决定要写规格还是拆工作单](/posts/mattpocock-skills-specs-work-breakdown/)、[查资料、做交接、学新东西](/posts/mattpocock-skills-research-handoff/)。
