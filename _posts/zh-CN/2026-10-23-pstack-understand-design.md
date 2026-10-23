---
title: "pstack 系列（2）：改代码之前，先看懂再设计"
description: "用 pstack 改代码前，怎么让 AI 先看懂现有代码、再比较几种设计？本文用 Claude Code 实测 /how、/why、/architect、/interrogate 与 /arena，逐项核对结果，并列出耗时与 API 等价成本。"
date: 2026-10-23 21:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.zh-CN.png
  alt: "先用 /how、/why 看懂，再让 /architect、/arena 比方案、/interrogate 挑错。"
---

你要替一个小项目加功能，直接叫 AI 编程助手动手，它通常会从第一个看起来合理的地方开始改，用的也是它第一个想到的做法。可是它真的懂这段代码现在怎么运作、为什么长这样吗？第一个做法又是不是最好的？用 pstack 改代码之前，怎么让 AI 先看懂、再比较设计？

先说明几个名词。pstack 是 Cursor 官方插件库里的一整组 skill，skill 则是一份告诉 AI 怎么完成某类工作的操作说明。subagent 是主对话另外派出去、专门做一小段工作的 AI。本篇用到五个 skill：

- `/how`：说明代码现在怎么运作。
- `/why`：从 git 历史和其他记录里，找出代码为什么长这样。
- `/architect`：实现前先把类型和接口定下来。
- `/arena`：让几个 subagent 各做一次同一份任务，再挑一份当底，从其他份补进好的部分。
- `/interrogate`：让不同模型的审查者各自挑出设计或修改的问题。

在 Claude Code 里，命令前面要加插件名称，例如 `/pstack:how`。这次我在同一个练习项目上，把这五个 skill 各跑了一次。`/how` 的说明逐点核对都正确；`/why` 大致正确，只有一处行号差 1；设计三步各自抓到了真问题，但越往后越贵，`/architect` 一次就用掉 4.29 美元的 API 等价金额。

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
> `0.15.29` 到 `0.15.30` 只新增了 `statechart` 这个 skill。本篇用到的 how、why、teach、architect、interrogate、arena、swarm、setup-pstack、poteto-mode，以及 Claude Code 对照说明都没有改。我在 2026-10-23 21:28（台北时间）查证时，`cursor/plugins` 的 main 在 `eb4db2b` 之后又有两个 pstack commit（`7698375`、`4ec7ffa`），都只改 `statechart`，版本仍是 `0.15.30`。
{: .prompt-warning }

> **这次怎么测的**：所有实测都是我在 2026-10-23 15:41–21:20（台北时间），在自己的 Mac（macOS 27.0、Claude Code 2.1.309）上用 Claude Code 的非交互模式 `claude -p`（输出格式 stream-json）运行的，不是在交互界面操作。权限白名单和第 1 篇相同，只多允许只读的 `git blame`：禁止写入 `~/.claude/` 底下的全局配置，禁止 `git push`、`gh`、`curl` 和上网，也没有用 `--dangerously-skip-permissions`。每次提示都要求不要 commit，练习项目的 HEAD 从头到尾都是 `579a745`，草稿只写在没有纳入版本控制的 `.pstack-scratch/` 文件夹。**Cursor 上的任何操作都没有实测**。
{: .prompt-tip }

## 先把模型配置改好

[第 1 篇](/posts/pstack-install-routing/)发现，这个账号不能用配置文件里的 fable 模型，subagent 一派出去就收到 HTTP 429 错误。所以这次先重跑 `/setup-pstack`：

```text
/pstack:setup-pstack 背景：这个账号不能用 fable。之前派给 fable 的 subagent 立刻收到 HTTP 429“Fable 5.1 requires usage credits. Switch to another model to continue.”所以请重新配置，所有角色都不要用 fable，预算维持 medium。fable 的替代模型由你决定，并说明理由。这次只能写 ~/.claude/rules/pstack-models.md，不要改其他任何文件。
```

它提议这样改：

- 原本用 fable 的四个单一角色（修 bug、性能问题、hillclimb、最难的任务）改成 `opus high`。
- 要多个模型一起工作的 panel，也就是 arena 的 runner 和评审名单、architect 的 runner、interrogate 的审查者，直接拿掉 fable，不补别的模型，从 4 个变成 3 个（opus、sonnet、haiku）。它的理由是 panel 的价值在于不同模型互相比较，多放一个 opus 只会多花钱；想维持 4 个的话，可以各加一个 `opus high`。

但它写不进去。Claude Code 把 `~/.claude/rules/pstack-models.md` 当成敏感文件，回复“Claude requested permissions to edit … which is a sensitive file.”即使白名单明确允许这个文件，也要在界面上确认一次，而 `-p` 模式没有确认界面，写入就被挡下了。第 1 篇的写入是被我刻意设的规则挡下，这次则是 Claude Code 自己挡的。

它建议两种做法：在权限提示出现时点允许，或自己覆盖文件。我在 15:54 把它提议的内容逐字手动写入。所以这份配置是 setup-pstack 提议、我手动写入的，不是它自己写的。之后每一次运行派出的模型和 effort，都和这份配置一致。这一步花了 25 秒，API 等价 0.208 美元。

## 看懂现有代码：/how 和 /why

练习项目和第 1 篇相同：`pstack-lab` 是一个 Python 记账 CLI，叫 `ledger`。第 1 篇修完 bug、加完 `--json` 之后，现在有 13 个测试。

![说明图：左边是 /how，只派 1 个 explainer，交出 8 步路径、流程图、职责表和 10 点注意事项，我逐点核对全对；右边是 /why，派 3 个调查员和 1 个综合者，查 git 历史、MCP 和本地 session 记录，结果大致正确，有 1 处行号差 1；下方标示 /teach 和 /recall 未实测](understand-how-why.zh-CN.png){: width="800" height="450" }
_/how 问“现在怎么运作”，/why 问“为什么长这样”。_

### /how：现在怎么运作

```text
/pstack:how 这个项目的 parser 和 summary 是怎么接在一起的？请说明从 CLI 读入 CSV、解析成 Transaction，到 summarize 算出数字、再由文字或 --json 输出的整条路径，以及各模块的分工。这是只读问题：不要修改、新增或删除任何文件，也不要 commit。
```

`/how` 有两条路。[它的 SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/how/SKILL.md#L13-L20) 写明，碰到大型子系统时先派 2 到 4 个 explorer 分头探查，再交给一个 explainer 整理；范围小的问题就不派 explorer，只派一个 explainer 边读边解释，拿不定时走小的那条。explorer 是负责读代码、回报发现的 subagent，explainer 则负责把发现写成说明。

这次它走小的那条，只派 1 个 explainer（opus、effort high）。explainer 回报后，主对话又用 `cat -n` 和 grep 核对它引用的行号，才把答案交给我。答案包括概览、关键概念、从 `__main__.py` 到输出的 8 步路径、mermaid 流程图、各模块职责表，以及 10 点注意事项。

我把这 10 点逐一对照代码，并实际运行确认，全部正确。例如：

- `(-12)` 会被解析成 +12，`1e3` 会被接受，`$12` 则会失败。
- CSV 开头有 BOM 时，错误信息会变成 `line 2: 'date'`。
- `--month 2026-1` 不会报错，只会静静返回全部是 0 的结果。
- 输出 JSON 时没有设 `ensure_ascii=False`，中文分类会变成 `\uXXXX`。

这次花了 2 分 37 秒，API 等价 0.732 美元。

### /why：为什么长这样

```text
/pstack:why 为什么会计格式的括号金额（例如 `(12.00)` 代表 -12.00）是在 ledger/parser.py 的 parse_amount 里转成负数，而不是在 report.py 或 cli.py 处理？这是只读问题：不要修改、新增或删除任何文件，也不要 commit。
```

[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L33)说，`/why` 先查版本控制，再根据你接了哪些 MCP（让 AI 连到外部工具的接口），并行查工单、文件、团队聊天、监控、错误追踪和分析数据。报告会把直接证据和推论分开；什么都没查到也要写出来，因为“没人写下原因”本身就是一个答案。

这个练习项目没有工单，也没有聊天记录。它先用 `git log -p` 和 `git blame` 找出相关的代码，再并行派出 3 个调查员，最后由 1 个综合者整理，4 个都是 opus、effort high：

- **版本控制**：查 3 个 commit 的内容、blame 和 reflog。
- **session 记录**：这是它自己加的类别。它把我本地 `~/.claude/projects/` 里的 Claude Code 对话记录，以及项目 `.runs/` 里的实测记录，当成“团队聊天”的替代来源。
- **Claude Docs**：它把一个连着的 MCP 当成“长篇文档”来查，但工具被权限挡下。综合结果把这一项记成“未能搜索”，没有算成“查过但没有”。

版本控制的调查员先回报，提到 `.runs/` 里有第 1 篇修 bug 那次的记录。主对话用 `SendMessage` 把这条线索转给还在跑的 session 记录调查员，没有另外重派一个。

结论分成三级：直接证据（Direct）、有佐证（Supported）和推论（Inferred）。直接证据是：转换放在 `parse_amount`，是第 1 篇修 bug 的那个 agent 按“修根因”原则决定的，它也写下了理由：

> `report.summarize` 按正负号区分收支，这部分本身没错，只是收到了错的正负号。

至于原作者为什么一开始就让 parser 处理括号格式，它查不到记录，只能从 docstring 和 README 推论。它也点出，在 report 或 cli 处理的替代方案，记录里从来没有被真正比较过。

我核对了它的引用，原文都查得到。唯一的小错是行号：它说 README“第 13-15 行”在第一个 commit 就有。内容确实是那时就有，但当时在第 12-14 行；第 13-15 行是现在的位置。

这次花了 3 分 35 秒，API 等价 1.979 美元，是 `/how` 的 2.7 倍，cache read（重复读入已缓存的内容）约 160 万个 token，订阅的 5 小时用量一次涨了 11%。

> `/why` 会读你过去的 Claude Code 对话记录。这次的白名单只禁止写入 `~/.claude/`，没有挡读取，所以它读得到。如果那些记录里有你不想再交给模型的内容，请先调整权限。agent 读得到哪些东西，可以参考[装了第三方 skill 和 MCP 之后的破口](/posts/coding-agent-supply-chain-permission-risks/)那篇。
{: .prompt-warning }

### 没有实测的 /teach、/recall 和调查 playbook

[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5)说，看懂代码共有四个入口。除了 `/how` 和 `/why`，`/teach` 会再跑一次 `/how` 和 `/why`，把结果整理成一份白话说明；`/recall` 则从你最近的对话和共用记录，整理出某个主题目前的状况。这两个这次都**未实测**。

如果原因还不清楚，指南建议先做[只读调查](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17)：在 `/poteto-mode` 的描述里写“don't change any code yet”，它就会走 Investigation playbook。这次没有重跑；[第 1 篇](/posts/pstack-install-routing/)的只读调查花了 5 分 05 秒，列出 8 个风险点，第 1 点就是埋好的 bug。

## 比较设计：/architect、/interrogate 和 /arena

看懂之后，接下来是设计。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5)点出两种最常见的错：直接采用 AI 的第一个设计，以及花时间修饰一份没有代码验证过的计划。它的做法是用代码来规划。这次三个命令各跑了一次：

![说明图：三张卡片依次是 /architect with checkpoint，3 个模型各画一份草稿、评审打分后以 C1 为底并停在 checkpoint；/interrogate，3 个模型挑毛病，结论是修正后可以实现，5 项必须处理；/arena，2 个 runner，派活前先抓到我的规格自相矛盾，最后 17 个测试通过；下方标示照草稿实现、/swarm 和套用回 ledger/ 未实测](design-three-steps.zh-CN.png){: width="800" height="450" }
_三步都只在 .pstack-scratch/ 里产出，没有动到项目本身。_

### /architect：先画类型和接口

`/architect` 分成五段：先看懂相关代码（Phase A），再用 arena 画出几份设计草稿（Phase B），经人确认（Phase C），照草稿实现（Phase D），发现架构错了就整个重来（Phase E）。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) 写明，默认会直接从设计进入实现，中间没有人确认；要先看设计，得明讲“with checkpoint”。

```text
/pstack:architect with checkpoint：设计完先停下来给我看，不要实现。功能：每个分类的月预算与超支警告。用户提供一个预算文件（例如 budgets.csv，字段 category,monthly_limit），`ledger summary` 加上 `--budget <文件>` 时，在原本的输出之后，列出每个有预算的分类在该月的支出、预算和剩余，超过预算的分类要明显标示警告；`--json` 也要包含这些信息。没给 `--budget` 时，文字和 JSON 输出都必须和现在逐字节相同。请产出类型与接口草稿（函数 body 先写 not implemented）和设计理由。草稿和所有中间产物只能放在 ~/pstack-lab/.pstack-scratch/ 底下；不要修改 ledger/、tests/ 里的现有文件，也不要 commit。
```

**Phase A：自己读，没有派 `/how`。** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) 要求这一段跑 `/how`。这次主对话读了 `/how` 的 SKILL.md，但没有派 explainer，而是自己读完全部代码、运行 CLI，写成一份 `grounding.md` 给后面的 runner 共用。

**Phase B：其实就是一场 arena。** 它派出 3 个 runner（opus、sonnet、haiku，effort 都是 high），各画一份草稿，再派一个只读的 sonnet 评审打分。runner 是 arena 里各自完成同一份任务的 subagent。三份草稿的结构真的不同：

| 草稿 | 模型 | 结构 | 没带 `--month` 时 |
| --- | --- | --- | --- |
| C1 | opus | 预算并进 `report.summarize` | 逐月列出 |
| C2 | sonnet | 独立的 `budget.py` 模块 | 取数据中最新的月份 |
| C3 | haiku | `parser`、`report`、`cli` 三层分工 | 取数据中最新的月份 |

评审给 C1 26 分、C3 25 分、C2 24 分。主对话自己也评了一次，同样选 C1。理由是只有 C1 不用猜“该月”是哪个月：取最新月份的话，上方摘要写 housing 1200.00，下面的预算部分却写 0.00，会误导人。

选好底之后，它从其他草稿补进几处：

- 把预算计算从 `summarize` 拆出来，变成独立的 `evaluate_budget`，避免出现两种过滤月份的方式。
- 有 `--budget` 时严格检查 `--month` 的格式（取自 C3），否则 `--month 2026-1` 会让所有分类显示 0.00，也不会警告。
- 加强预算文件的验证（取自 C3）。
- 超支时标出超出多少（取自 C2）。

最后交出的接口草稿长这样，函数内容都还是 `NotImplementedError`：

```python
parser.parse_budget_rows(lines) -> dict[str, Decimal]
parser.load_budget(path) -> dict[str, Decimal]
report.BudgetLine          # TypedDict：spent、limit、remaining、over
report.BudgetReport = dict[str, dict[str, BudgetLine]]
report.evaluate_budget(txns, limits, month=None) -> BudgetReport
cli.format_budget(budget) -> str   # cli.main 另外加上 --budget
```

示例输出不是手算的，是它用 `verify_sample.py` 套上现有数据跑出来的。我对照示例 CSV 核对过：10 月 food 是 4.50＋86.20＋62.75＝153.45，预算 150 时剩余 −3.45，标成“<-- OVER BUDGET by 3.45”；9 月 housing 1200.00 刚好用完，不算超支。

**Phase C：停在 checkpoint。** 它没有进入实现，而是列出 5 个要我决定的问题：没带 `--month` 时怎么处理、超支时的 exit code、退款要不要抵销支出、预算文件里从没出现在交易中的分类要不要提示，以及空的预算文件算不算错误。第一题影响最大，三个模型的意见也不一致。

这次花了 12 分 42 秒，API 等价 4.293 美元（opus 3.484、sonnet 0.728、haiku 0.080），是 `/how` 的 5.9 倍；5 小时用量从 42% 涨到 87%。haiku 的 runner 写得最多，输出约 69,500 个 token，只花 0.08 美元，分数也只比 opus 少 1 分。

Phase D 实现和 Phase E 重来都**未实测**，因为我刻意让它停在 checkpoint。所以“实现时有没有照草稿走”这个问题，这次没有答案。

### /interrogate：让三个模型挑草稿的毛病

先说一个和指南不同的地方。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89)写明，`/interrogate` 应该用在 diff（代码的实际修改）上；拿它审一份没有代码的计划，审查者会想出一堆根本不会发生的理论风险。这次我拿它审的是 architect 的草稿，不是 diff。不过这份草稿有函数签名、TODO 伪代码、测试清单，还有一支能运行的 `verify_sample.py`，不是纯文字计划。

```text
/pstack:interrogate 请对抗式审查 ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ 里的设计草稿（parser.py.sketch.py、report.py.sketch.py、cli.py.sketch.py、test_sketch.py、rationale.md、verify_sample.py），对照现有的 ledger/ 和 tests/。意图：为 `ledger summary` 加上 `--budget <文件>`（budgets.csv，字段 category,monthly_limit），在原本输出后列出每个有预算的分类在该月的支出、预算、剩余，超支要明显警告，--json 也要包含；没给 --budget 时文字与 JSON 输出必须逐字节不变。这是尚未实现的 not-implemented 草稿，请审查设计本身（接口、边界、正确性、测试是否足够）。只审查、给出 verdict，不要修改或新增任何文件，不要套用修改，不要 commit。
```

它派出 3 个审查者，分别是 opus、sonnet、haiku，effort 都是 high。按 SKILL.md，三位拿到的是同一份意图和内容。[指南](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69)说，重点就在模型不同：每个模型的盲点不一样，两个模型各自提出的同一个问题最可信。SKILL.md 写的是派 `generalPurpose` 加 `readonly: true`；在 Claude Code 上，它改用只读的 `Explore` subagent。

三位审查者分别回报 10 项、9 项和 17 项，haiku 最多。主对话没有直接汇总，而是自己用 python3 重现边界情况，再把每一项分成四类：必须处理（Act on）、值得考虑（Consider）、记下即可（Noted）和不采纳（Dismissed）。结论是“修正后可以实现”，必须处理 5 项、值得考虑 6 项、记下即可 6 项、不采纳 4 项。必须处理的 5 项是：

1. 很大的预算金额（例如 `1E+30`）能通过验证，之后在四舍五入时抛出 `InvalidOperation`。这个异常不是 `ValueError`，cli 接不到，用户会看到 traceback。
2. 预算文件不是 UTF-8 时会 traceback，而繁体中文 Windows 的 Excel 常导出 CP950 编码。
3. 测试草稿里的 `test_json_sample_exact` 照写一定会失败。
4. `--month` 的检查会接受全角数字和 `0000`。
5. 测试清单漏掉 0 字节的文件、`-0`、跨月的 JSON 等情况。

我自己在 Python 上抽查了其中 3 点，都属实：`Decimal('1E+30').quantize(Decimal('0.01'))` 会抛出 `InvalidOperation`，它属于 `ArithmeticError`；`'２０２６-10'` 和 `'0000-10'` 都能通过草稿里的月份 regex；`Decimal('150.000')` 明明等于 150.00，却会被草稿的“小数超过两位”规则误拒。

architect 的设计理由说，逐月列出“绝不漏掉任何一个月”。三位审查者都指出，没有交易的月份其实会被跳过；示例里也同时出现 housing 1200.00 和“2026-10 housing 0.00”的上下对照，而这正是 architect 拿来否决“取最新月份”的理由。主对话的建议是结论不一定要改，但第一个待决问题应该拿这些反例重新论证，再交给我决定。上一个 skill 写下的设计理由，被下一个 skill 挑出了漏洞。

不采纳的 4 项里，有一项是 haiku 提出的“ANSI 转义字符注入”。主对话的理由是预算文件是用户自己的本地文件，现有代码打印交易分类时也是同样做法。指南提醒[不采纳的部分也要读](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71)，因为主对话不一定对，你可以推翻它。另一方面，haiku 也有两项只有它提出、而且确认属实的发现：`(-50)` 会被当成 +50，以及设计理由里的 jq 示例没有用。它只花了 0.026 美元。

这次 API 等价 2.030 美元，5 小时用量从 26% 涨到 71%。整个运行过程花了 22 分 35 秒，但实际计算大约只有 200 秒，原因写在后面的“这次环境观察到”。

光看这一次，无法判断指南的提醒对不对。这份草稿已经写到函数签名和伪代码，审出来的问题我抽查的都是真的；但也有 4 项被判定不采纳。如果你手上只有一份文字计划，照指南先做出代码再审，会比较稳。

### /arena：让两个 runner 做同一件事

[arena 的 SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L11-L18) 分成六段：写好给每份候选的同一份任务、定出评分表（rubric，3 到 6 条可以打分的标准）并选好 runner（Frame）；并行派出 runner（Fan out）；由另一个模型的只读评审打分（Cross-judge）；挑一份当底（Pick a base）；从其他候选补进好的部分（Graft）；最后验证（Verify）。

runner 的数量默认来自 `/setup-pstack` 的配置，[也可以每次调整](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51)。配置文件里是 3 个，这次我刻意在提示里只要 2 个（opus high、haiku high），把 N 降到最小：

```text
/pstack:arena 只用 2 个 runner：opus high 与 haiku high。这是刻意覆写 pstack-models 配置里 arena runners 的 3 个 runner（opus、sonnet、haiku），目的是把 N 降到最小；cross-judge 照配置的 pool 选一个。任务（小而具体）：强化 ~/pstack-lab/ledger/parser.py 的 parse_amount，只接受一般金额：可选的正负号或会计括号、数字可含千分位逗号、最多两位小数。要拒绝并丢 ParseError 的例子：'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'、'1.234'（三位小数）。'1,234.50'、'-3.20'、'(12.00)' 等现有行为与所有现有测试都必须保持不变。每个 candidate 只能在 ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/ 底下产出：修改后的完整 parser.py 副本、新增的测试、简短 rationale。综合结果放在 ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/，并在 .pstack-scratch 里验证（例如把 ledger/ 与 tests/ 复制到 .pstack-scratch/arena-amount/verify/ 再用 python3 -m unittest 跑）。不要修改 ~/pstack-lab/ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。
```

**Frame 阶段先挡下我的规格。** 它没有马上派 runner，而是先跑了现有的 13 个测试，发现 `tests/test_cli.py:14` 的测试数据里有 `-5.555`，这笔数据会经过 parser。也就是说，“拒绝三位小数”和“现有测试不变”不可能同时成立。它提出 3 个选项，建议选 2，然后停下来问我。这一段花了 42 秒，API 等价 0.242 美元。

我选了选项 1：维持“现有测试不动”，把 `'1.234'` 从拒绝名单拿掉。这一步用 `claude -p --resume` 接着同一段对话，我回复：

```text
选项 1：不限制小数字数，'1.234' 从拒绝名单拿掉；其他要拒绝的例子不变（'(-50)'、'(+50)'、'1e3'、'NaN'、'Infinity'、'$12'），所有现有测试不动且必须通过。其余条件照旧：只用 2 个 runner（opus high、haiku high，刻意覆写配置的 3 个），产出只放在 ~/pstack-lab/.pstack-scratch/arena-amount/，不要修改 ledger/ 或 tests/，不要用 git worktree 或 /tmp，不要建分支，不要 commit。请继续跑完 arena 全部阶段。
```

**两份候选写出相同的规则。** opus 和 haiku 各自写出的格式规则一模一样：只接受 ASCII 数字 0–9；千分位逗号必须三位一组；小数点两边都要有数字；正负号和括号只能择一；去掉前后空白后要整串符合。[SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) 说，候选收敛到同一个形状就是强共识，直接采用即可。

**挑底和补强。** 评审选的是 sonnet，理由是它不是任何一个 runner 用的模型。评审和主对话都选 opus 的 C1 当底。haiku 的 C2 被扣分，关键在它把 `(0.00)` 解析成 `-0.00`，原版是 `0.00`。不过 C1 也从 C2 补进了一处：括号金额改用 `value.copy_negate() if value else value` 转负数。直接写负号会照默认精度四舍五入到 28 位有效数字，`copy_negate` 不会；零也维持原本的 `0.00`。另外补进了几个 C2 的测试。

**验证。** 主对话把代码复制到 `.pstack-scratch/` 里的 `verify/` 文件夹跑测试，17 个全部通过：13 个原有测试没改，加上 4 个新测试，里面共有 19 个接受、59 个拒绝的子测试。它也拿新测试去跑原版 parser 当对照，出现 30 项失败，证明新测试真的测得出差别。我在 Mac 上重跑一次，同样 17 个通过；`(-50)`、`(+50)`、`1e3`、`NaN`、`Infinity`、`$12` 都会抛出 `ParseError`，`1,234.50`、`-3.20`、`(12.00)`、`1.234` 照常接受。

它的报告也列出几项要注意的地方：

- 旧版接受、新版会拒绝的值有 `.5`、`5.`、`( 12 )`、`12,34` 和非 ASCII 数字，套用前要先确认数据格式。
- 它自己承认一处疏失：评分表 `rubric.md` 放在两份候选都读得到的共用文件夹，opus 的 runner 读到了。SKILL.md 写的是评分表只给挑选的人用。评审检查后，没有发现迎合评分表的迹象。
- 在项目根目录直接跑 `python3 -m unittest` 会找到 0 个测试，因为 `tests/` 没有 `__init__.py`，要改用：

```bash
python3 -m unittest discover -s tests
```

这一段花了 5 分 38 秒，API 等价 2.046 美元（opus 1.889、sonnet 0.134、haiku 0.023）。两段合计约 6 分钟、2.288 美元。

这次**未实测**的部分：把结果套用回 `ledger/`（刻意只放在 `.pstack-scratch/`）、照配置 3 个 runner 的单独 arena（N=3 只在 architect 内部那一场出现过），以及把工作切给多个 worker 并行处理的 `/swarm`。

## 什么时候用哪一个

pstack [刻意没有写计划的 skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103)。作者在 [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268) 里写，自己不相信先写计划，最好的规格就是代码。这次的设计三步也是这样：architect 交出的是类型和函数签名，interrogate 审的是这些签名和伪代码，arena 则直接写出代码并跑测试。

根据这次的结果，可以这样挑：

| 你的情况 | 用哪一个 | 这次的花费（API 等价） |
| --- | --- | --- |
| 想知道一段代码现在怎么运作 | `/how` | 2 分 37 秒、0.732 美元 |
| 想知道代码为什么长这样，而且有 git 历史或其他记录可查 | `/why` | 3 分 35 秒、1.979 美元 |
| 原因不明，要先查清楚再决定修不修 | `/poteto-mode` 加“don't change any code yet” | 见第 1 篇 |
| 要新增的功能会碰到好几个模块，想先定类型和接口 | `/architect with checkpoint` | 12 分 42 秒、4.293 美元 |
| 已经有 diff，或写到函数签名的草稿，想让不同模型找问题 | `/interrogate` | 22 分 35 秒（实际计算约 200 秒）、2.030 美元 |
| 一件小而具体的修改，想比两三种写法 | `/arena` | 约 6 分钟、2.288 美元 |

[指南的提醒](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L77)是：别因为“AI 反正会读代码”就跳过 `/how`，先跑 `/how` 比修第二个 bug 便宜。不过第 1 篇加 `--json` 那次，它自己跳过了 `/how`、`/architect` 和 `/interrogate`，理由是改动只有两个小文件。改动很小时，不一定要把整套都跑一遍。

指南也建议，谈不定的设计问题用 [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81) 做几个一次性的原型来回答，而不是一直问你。这个 playbook 这次**未实测**。这次有两处是 AI 停下来问我的：architect 的 5 个待决问题，以及 arena 发现规格自相矛盾时。这两处都是要我决定需求，不是代码能回答的问题。

## 这次环境观察到的几件事

以下几点都是在这次的环境（账号、版本、`-p` 模式、权限白名单）观察到的，不代表在其他账号或交互界面也一定会发生。

**1. setup-pstack 写不进自己的配置文件。** Claude Code 把 `~/.claude/rules/pstack-models.md` 当成敏感文件，白名单允许了也要交互确认，`-p` 模式没有确认界面，所以直接拒绝。

**2. subagent 的 Bash 常被挡，主对话会自己补跑。** architect、interrogate、arena 三次都有 subagent 的 Bash 被拒，主对话都会自己补做验证，并在报告里写明哪些没实际运行。第 1 篇看到的是背景 subagent 一律不能跑 Bash；这次 `/why` 在后台运行的调查员能跑 git 命令，但仍有几个命令被拒。被挡之后，它们改用 Read、Grep 或比较单纯的命令，并在报告里注明哪些没有实际运行。

**3. effort 这次照配置。** 这次派出的 subagent 都是 effort high，和配置文件一致；第 1 篇修 bug 和加功能两次都用了 low。

**4. `/interrogate` 在 `-p` 模式下空等。** 主对话派完审查者后，用 `ScheduleWakeup` 设了一个 1200 秒的唤醒当作后备。每一段回复的计算时间加起来约 200 秒，整个运行却跑了 22 分 35 秒。看起来审查者早就回报了，它还是等到 20 分钟的唤醒才结束。这是从时间推论的，没有逐笔时间戳证实。

**5. architect 没有派 `/how`。** SKILL.md 要求 Phase A 跑 `/how`，这次主对话自己读代码、写 `grounding.md`，没有派 explainer。

**6. 插件在两篇之间自动更新了。** 见文章开头的版本提醒。

## 用量与费用

![说明图：横条图列出每一步的 API 等价美元，/setup-pstack 0.208、/how 0.732、/why 1.979、/architect 4.293、/interrogate 2.030、/arena 两段合计 2.288，右侧标出 5 小时额度的变化，底部写 8 次调用合计约 11.61 美元](cost-per-step.zh-CN.png){: width="800" height="450" }
_architect 最贵；interrogate 和 architect 各吃掉 45% 的 5 小时额度。_

| 运行 | 命令 | 时间（台北） | 结果 | API 等价（美元） |
| --- | --- | --- | --- | --- |
| s1 | `/pstack:setup-pstack` | 15:41 | 写入被挡，我在 15:54 手动写入 | 0.208 |
| a1 | `/pstack:how` | 15:42–15:45 | 全部正确 | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | 大致正确，一处行号差 1 | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 3 个 runner 加 sonnet 评审，选 C1，停在 checkpoint | 4.293 |
| q0 | 额度检查 | 20:39 | 只回复 ok，用来读取额度 | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | 修正后可以实现，必须处理 5 项，我抽查 3 项都属实 | 2.030 |
| b3 | `/pstack:arena` | 21:13 | Frame 阶段发现规格自相矛盾，停下来问 | 0.242 |
| b3b | arena 接续（`--resume`） | 21:14–21:19 | 我选了选项 1；两份候选收敛，17 个测试通过 | 2.046 |

8 次调用合计约 11.61 美元。这是 Claude Code 回报的 `total_cost_usd`，也就是**照 API 价格换算的等价金额**；这次用的是订阅方案的额度，实际没有另外扣费。

额度方面，5 小时用量在第一段（s1 到 b1）从 20% 升到 87%，19:50 重置；之后 interrogate 让它从 26% 升到 71%，arena 两段从 74% 升到 84%，一直没有被拒绝。7 天用量全天从 67% 升到 91%，但其中 16:08 到 20:39 从 76% 升到 83% 那段，是我自己平常使用 Claude Code，不是这些实测造成的。

## 改代码之前，先要一份看得到的证据

这次的答案很具体：先让 AI 交出可以核对的东西，再让它比较设计。`/how` 交出带行号的路径和注意事项，我能逐点对照代码；`/why` 把直接证据和推论分开，也老实写出哪些查不到。设计阶段，`/architect` 让三个模型画出结构不同的草稿，再停下来把该由我决定的事列出来；`/interrogate` 让另外三个审查者挑出草稿里的漏洞，连 architect 自己的理由也被挑出问题；`/arena` 在派活前先跑测试，抓出我写的规格自相矛盾。

代价是时间和额度。这次从 `/how` 到 `/arena`，API 等价合计约 11.61 美元，architect 一次就吃掉将近一半的 5 小时额度。小改动可以只跑 `/how`；会碰到好几个模块的功能，再用 `/architect with checkpoint`。不管跑哪一个，最后都要自己抽查几项结论。下一篇会接着谈，写完代码之后，怎么证明它真的能用再合并。

## 延伸阅读

- [指南：Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md)：`/how`、`/why`、`/teach`、`/recall` 各自适合的情况。
- [指南：Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md)：`/architect`、`/arena`、`/swarm`、`/interrogate` 和原型。
- [pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：本篇用到的练习项目和只读调查。
- [自己写 Agent Skill](/posts/agent-skill-authoring-guide/)：从写 skill 的角度看 SKILL.md 的结构和测试。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：agent 读得到哪些文件、权限怎么收。
- 另一套 skill 的做法：[mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)、[把模糊需求问清楚](/posts/mattpocock-skills-requirements-shared-language/)、[先找出缺口，再决定要写规格还是拆工作单](/posts/mattpocock-skills-specs-work-breakdown/)、[查资料、做交接、学新东西](/posts/mattpocock-skills-research-handoff/)。
