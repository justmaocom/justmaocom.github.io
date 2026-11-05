---
title: "pstack 系列（4）：用原则指挥 AI、做出自己的 mode，再放心让它自己跑"
description: "怎么用原则名称调整 AI 的做法？怎么把工作习惯整理成自己的 mode？让 AI 无人值守运行前，要设好哪些边界？这篇介绍在 Claude Code 使用 pstack 原则、/automate-me、/reflect、/correct 和 /show-me-your-work 的方法。"
date: 2026-11-05 10:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, cursor, claude-code]
media_subpath: /assets/img/posts/pstack-principles-customization/
image:
  path: cover.zh-CN.png
  alt: "用原则名称中途指挥 AI，把习惯做成自己的 mode，写好完成条件和界线后让它自己跑，早上看决策记录。"
---

AI 编程助手做得不对时，我以前会打一大段话解释我要什么。pstack 提供了一个更简短的办法：用原则名称指出你要它调整的方向，再检查它是否确实照做。

这篇是系列的最后一篇，教你三件事：怎么在对话中途用原则名称指挥 AI；怎么把你自己的习惯变成一个 mode，让 AI 照你的方式工作；以及想让它在你睡觉时自己跑，提示要怎么写、权限和费用要怎么设，早上又要怎么检查它做了什么。

> pstack 系列｜第 4 篇（最后一篇）
>
> - 系列导读：这套 skill 是什么、四篇该怎么读（尚未发布）
> - 上一篇（第 3 篇）：[写完代码之后，先证明它能用再合并](/posts/pstack-build-verify-merge/)
> - 下一篇：这是系列的最后一篇
{: .prompt-info }

> **版本**：本文以 pstack [`0.15.36` 版](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json)为准，对应 `cursor/plugins` 的 commit `c742dd6`（2026-10-28 07:12，台北时间），和第 3 篇相同，搭配 Claude Code 2.1.318。我在 2026-11-05 查过：`cursor/plugins` 的 main 最新是 `bb68f23`（2026-11-04 15:20，台北时间），pstack 文件夹在 `c742dd6` 之后没有任何改动；Claude Code 最新版就是 2.1.318。
{: .prompt-info }

## 开始之前

pstack 是 Cursor 官方插件库里的一整组 skill。skill 是一份告诉 AI 怎么完成某类工作的操作说明。安装方法在[第 1 篇](/posts/pstack-install-routing/)。想装到和本文一样的版本，可以先把 repo 下载到自己电脑、切到本文的 commit，再把这个文件夹加入插件市场（marketplace，Claude Code 安装插件的来源目录）：

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout c742dd61706fbacc1b95f1a20b7b988cf096ce6c
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

直接用 `/plugin marketplace add cursor/plugins` 安装的话，拿到的是安装当下的最新版，没有固定在你看过的版本。这样做的风险，可以参考[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

**命令要加前缀。** 在 Claude Code（在终端里使用的 AI 编程助手）里，插件的命令前面要加上插件名称，例如 `/pstack:correct`。下面的范例都用 Claude Code 的写法；在 Cursor 里，把 `pstack:` 拿掉就好。

**这些 skill 都要由你主动调用。** pstack 的 58 个 skill 里，除了 `/setup-pstack`，其他都设置成不让 AI 自行启动（`disable-model-invocation: true`），原则也一样。这表示 AI 不能自行调用这些 skill；但 `/poteto-mode` 仍可按照自己的流程读取并应用相关原则，下面会再说明。

**官方指南是照 Cursor 写的。** 指南里的部分工具与命令是基于 Cursor 环境介绍的，例如 `/loop` 和 `create-skill`；Claude Code 虽然也有 `/loop`，用法却不同。pstack 附了一份 [Claude Code 对照说明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md)，`/poteto-mode` 在 Claude Code 里会先读它，把 Cursor 的名称换成 Claude Code 的对应做法。下面遇到差异的地方，我会直接写 Claude Code 的做法。

## 用原则名称指挥 AI

### 原则是什么

pstack 有 24 条原则，每一条都是一个独立的 skill，名称是 `principle-<名称>`。每条原则是一段很短、很具体的规则，例如“先删掉没用的东西，再往上盖”。它们分成五组（[README](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257)、[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L29-L70)）：

| 组别 | 条数 | 管什么 |
| --- | --- | --- |
| core | 10 | 要做多少、什么时候该重新审视设计 |
| architecture | 6 | 状态、检查和兼容性放在哪里 |
| verification | 5 | 什么才算证据 |
| delegation | 2 | 并行分工时怎么明确职责 |
| meta | 1 | 把重复的提醒变成结构 |

你用 `/pstack:poteto-mode` 交代多步骤的工作时，它会在开始时读原则的索引，应用这个任务会触发的那几条，并在回复里写出每条原则**改变了哪个决定**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L15)）。

指南的说法是：你不必一开始就逐条调用原则，而是可以在需要调整方向时，用名称指出该应用哪一条（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L5)）。一个名称背后是一整条规则，因此不必每次都重新解释整条规则。

### 在 Claude Code 里怎么说

在同一个对话里，下一条消息用原则的命令开头，后面接你要它做的事：

```text
/pstack:principle-<名称> <你要它照这条原则做的事>
```

用命令的写法，Claude Code 会把那条原则的完整说明读进来，而不只是看到一个名称。下面示范四条我最常用的。完整的 24 条，请看 [README 的原则表](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257)。

![四条原则各自适合的时机：计划太大、说做完却没证据、修了症状、连续修不好](principles-steer.zh-CN.png){: w="800" h="450" }
_四条常用原则，以及什么时候该说出它们的名称。_

### laziness-protocol：计划太大的时候

**什么时候用**：AI 提出的计划要添加好几个辅助函数、好几层包装，或把同一个判断写在好几个地方。

**命令怎么写**：

```text
/pstack:principle-laziness-protocol 用这条原则重看你的计划，再实现。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-laziness-protocol/SKILL.md#L9-L10)）：

1. **把重复的判断集中到一处。** 同一个判断不在好几个地方各写一次，改成一个来源，其他地方只拿结果。
2. **把 diff 缩到最小。** 用能解决问题的最小改动，少写几行，胜过“漂亮”的样板程序。

**你会拿到**：一份缩小过的计划或改动，回复里会写出这条原则拿掉了什么。

**下一步**：检查改动，确认它删掉的确实是多余的部分，必要行为仍然保留。

### prove-it-works：说做完了，却没有证据

**什么时候用**：AI 说“改好了”，但给你看的只是“编译通过”或它自己的总结。

**命令怎么写**：

```text
/pstack:principle-prove-it-works 实际跑一次真正的命令，把输出给我看，不要只给我构建记录。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-prove-it-works/SKILL.md#L9-L22)）：

1. **直接看真正的东西。** 读实际的值、实际运行程序，不从文件修改时间、缓存或子代理的自我报告推论。
2. **检查失败时，先怀疑检查方式。** 先确认是不是看错地方，再怀疑代码。
3. **能写成脚本就写。** 最有力的证明，是一段可以重跑的脚本，而不是看一次就算了。

**你会拿到**：实际运行的命令和输出。

**下一步**：自己看一次输出，确认它验证的是你在意的那件事。

### fix-root-causes：修了症状，没修到原因

**什么时候用**：AI 只在出错的那一行加上判断，避开错误，却没有查明原因。

**命令怎么写**：

```text
/pstack:principle-fix-root-causes <症状>。找出第一个出错的地方，在那里修。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-fix-root-causes/SKILL.md#L9-L21)）：

1. **先重现。**
2. **一直问“为什么”**，直到答案是代码里的一个错误决定，而不是前一个错误造成的结果。
3. **卡住就加记录**，看实际的错误消息和状态，不用猜的。
4. **判断触发的状态合不合理。** 合理的话，处理不了它的代码就是原因；不该存在的话，就去找是谁产生了这个状态。
5. **找同一种错误的其他地方**，一起修。

**你会拿到**：根本原因的说明、修正，以及其他位置是否也有同类问题的检查结果。

**下一步**：看它说的原因，是不是第一个出错的地方。

### attack-the-premise：连续修不好的时候

**什么时候用**：已经试了两次以上的修法，都卡在同一个检查。

**命令怎么写**：

```text
/pstack:principle-attack-the-premise 前两次修法都没过。先写下它们共同的前提，测试这个前提，再决定下一步。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-attack-the-premise/SKILL.md#L9-L19)）：

1. **写下前提**：每次失败的修法共同依赖的假设。
2. **先测试前提**：设计一项能区分前提真假的检查，实际运行并观察结果。
3. **跟着证据走**：证据推翻前提，就去别处找原因；证据支持前提，就照 fix-root-causes 再问下一个“为什么”。
4. **前提写下来、测过之前，不开始下一个修法。**

**你会拿到**：被写下来的前提、测试它的方法和结果，以及根据结果选的方向。

**下一步**：前提被推翻时，让它从新的方向重新规划。

### 怎么判断它确实应用了原则

原则被点名，不代表它真的照做。指南说，回复里要写出这条规则**改变了哪个决定**；只有名称、没有对应决定的引用，就是只说了名称却没有应用（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L27)）。指南也建议不要背清单：先浏览一次，下次看到 AI 做了某条原则可以避免的事，再回来找那个名称（[指南第 8 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L70)）。

## 做出自己的工作方式

`/poteto-mode` 反映的是 pstack 作者的个人工作风格。指南第 9 章教你换成自己的：`/automate-me` 产生你的 mode，`/reflect` 从一次对话里学到教训，`/correct` 改项目本身，让同样的错不再发生（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L1-L5)）。

### /automate-me：把你的习惯做成一个 mode

**什么时候用**：你常常对 AI 做同样的纠正，例如“回答短一点”“先跑测试再说做完”，想让它一开始就照你的方式做。mode 是一个 skill，写的是你的工作习惯，名称像 `<你的名字>-mode`。

**命令怎么写**：指南的写法只有 `/automate-me`，因为在 Cursor 里，它知道对话记录（transcript，AI 对话的完整日志）在哪里。Claude Code 的记录放在 `~/.claude/projects/<项目路径>/`，文件夹名称是把项目路径里的 `/` 和 `.` 换成 `-`（[Claude Code 对照说明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L56)）。我建议在提示里写明只能读这个项目的记录：

```text
/pstack:automate-me 只读这个项目的对话记录（~/.claude/projects/<项目路径转成的文件夹名称>/），不要读其他项目。草稿先写到 .claude/skills/<我的名字>-mode/SKILL.md，写好给我看，不要 commit。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L13-L83)）：

1. **找既有的 mode。** 已经有你的 mode，就问你要更新还是重做；默认是更新。
2. **分析你的对话记录。** 只读这个项目的记录，把最近几周的记录按时间分成三段，派子代理（skill 运行时另外派出、分头做事的 AI）并行阅读，找回复风格、分工、验证、代码和文字、流程等方面的重复偏好。至少在两个时间段的记录里都出现过的偏好才算数。
3. **直接问你。** 用一两题选择题确认哪些是你真正的习惯，再用一题开放问题补漏。在 `claude -p`（不开对话窗口、一次运行完的模式）里没有提问工具，它会改成用文字提问（[Claude Code 对照说明](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L10)）。
4. **分组、起草。** 把结果整理成几节，例如回复风格、自主程度、验证、流程。只写你有特别规则的部分。默认加上 `disable-model-invocation: true`，所以你要输入命令它才会加载。
5. **润色文字。** 用 `/unslop` 把每一行改得直接、好懂。
6. **按你的要求交付。** 指南的完整流程是在 worktree（同一个 repo 的另一份独立工作目录）里 commit 并开 PR，不直接推到 main；上面的提示则明确要求先交草稿、不 commit，因此这次应停在草稿，等你看过再决定是否送审。

**你会拿到**：一份 `<你的名字>-mode/SKILL.md` 草稿。Claude Code 会保护项目的 `.claude/` 文件夹，AI 要写进去时会先问你，或直接被挡下（[权限模式说明](https://code.claude.com/docs/en/permission-modes#protected-paths)）。被挡下的话，让它先写到别的文件夹，你看过再自己搬进去。

**下一步**：读一遍，问自己“这像我吗？少了什么？”（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L94-L96)）。注意它分析的是**你在这个项目的对话**；如果这些对话大多是特殊用途（例如一次性的测试），写出来的就不会是你平常的样子。习惯变了，再跑一次更新：

```text
/pstack:automate-me update my mode skill with everything since its last edit
```

### /reflect：一次对话学到的事，写回 skill

**什么时候用**：一个任务刚做完，过程绕了远路，你不想下次再绕一次。

**命令怎么写**（取自[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L23-L31)）：

```text
/pstack:reflect 这次花太久了。把学到的事整理出来，让下次不要重蹈覆辙。
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md#L13-L60)）：

1. **找到这次对话的记录。** 只读这个项目的记录。
2. **派三个审查者并行审查。** 分别从判断、工具、不同观点三个角度找可以学的事。
3. **整理。** 再派一个代理汇总提议，分成 Accepted（建议采用）、Rejected（不采用）、Backlog（待办）。
4. **把适合用代码强制执行的项目移到待办。** 如果用 lint 规则、脚本或运行时检查能更可靠地防止错误，就移到 Backlog，留待后续修改项目时处理。
5. **等你批准。** 它列出全部结果，**你明确同意之前不改任何 skill**。它不会改插件缓存里的 skill，而是先复制到项目或个人的 skill 文件夹再改，也不会开 PR 或推送。

**你会拿到**：Accepted、Rejected、Backlog 三份清单，以及各项建议要修改的 skill 或项目检查。Accepted 仍是待你批准的建议，不代表已经修改。

**下一步**：只批准会改变未来决定的项目。指南说得很直接：一次奇怪的对话只是个案，不是规则（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L31)）。

### /correct：让同一种错不可能再发生

**什么时候用**：你一再为同一种错误纠正 AI。这时该改的是项目，不是你的下一个提示。

**命令怎么写**：知道是哪种错时，直接写出来（取自[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L45)）：

```text
/pstack:correct agents keep calling the database client directly instead of going through the repository layer
```

不知道时，不加说明，它会自己从历史里找：

```text
/pstack:correct
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md#L13-L32)）：

1. **找出错误的类别。** 读最近的 commit、还原记录、审查留言、AI 的说明文件，以及解释暂时做法的注解。同一类错误发生过两次才算数。
2. **用能挡住它的最高层级来修**，顺序是：
   1. 用架构让错误不可能发生，例如每个状态只有一个拥有者、只留一种正确做法；
   2. 用类型挡住，或加一个 lint 规则（自动检查代码写法的规则）或 CI（每次推上去就自动跑的检查），错误消息直接写出该用什么；
   3. 用测试抓；
   4. 最后才写成文档或 AI 规则，因为 AI 跳过规则时，什么都不会失败。
3. **一类一个 commit，并证明检查有效。** 每个新检查都要在一个真实发生过的错误上失败一次。本机和 CI 跑同一个命令。
4. **维护规则表。** 在 AI 的说明文件（Claude Code 是 `CLAUDE.md`）里放一张表，写明每条规则由哪个机制强制执行。没有检查机制的规则，仍有再次被忽略的风险。

**你会拿到**：每一类错误的证据、选的层级，以及为什么更高的层级做不到；每一类一个 commit。

**下一步**：逐个看 commit。它可能会改到 CI 设置或既有测试，这些改动都要你看过才推出去。所以 `/correct` 要在你看得到的对话里跑，不要放进无人值守的提示。

`/reflect` 和 `/correct` 的分工是：`/reflect` 从一次对话改进 skill，`/correct` 改项目，让一类错误回不来（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L50)）。还有一件事：**不要在任务做到一半时改 skill**，先记下要改进的地方，等任务结束后另外处理；如果需要提交，就另开 PR（[指南第 9 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L98)）。

## 让它自己跑：无人值守的提示怎么写

### 先确认它值得被信任

指南第 7 章列了四个条件，全部成立才让它自己跑；还没成立之前，就在旁边看着它跑（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L7-L16)）：

- 这件事你自己做过一次，或看 AI 做过一次，知道做得好是什么样子。
- AI 有你自己会用的工具和信号，例如验证 skill、性能剖析、日志。
- 每个阶段都会证明自己的成果，做不到标准时可以喊停。
- 你读过几次对话记录，已经把重复的失败变成工具、skill 或检查。

### 提示的六个部分

指南的交接模板有四个要素：目标、完成条件、权限，以及卡住时的出口（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L18-L36)）。我会再把“决策记录”和“不可以做的事”分开写，变成六个部分：

![无人值守提示的六个部分：目标、怎样算完成、决策记录、不用问的事、不可以做的事、卡住时怎么停](overnight-prompt.zh-CN.png){: w="800" h="450" }
_一份无人值守提示的六个部分。时间长度不是完成条件。_

**什么时候用**：任务已经符合上面四个条件，而且你不在电脑前。

**命令怎么写**：

```text
/pstack:poteto-mode 我要去睡了，自己跑到完成为止。
目标：<要完成的事>，在已准备好的工作分支 <分支名称> 上做。
怎样算完成：<可以检查的条件 1>；<条件 2>；<条件 3>。
决策记录：用 show-me-your-work 的格式记在 decisions.tsv。
不用问我：只 commit 这次任务的变更，不要把 decisions.tsv 纳入 commit；<其他可以还原的小决定>自己决定，写进记录。
不可以做：push、开 PR、合并、安装软件包、联网、改这个文件夹以外的文件。
如果真的卡住：停下来，写清楚卡在哪里、试过什么、需要我决定什么。
```

每一行的作用：

- **“我要去睡了”** 会要求 `/poteto-mode` 在这次对话中持续推进已授权的工作，减少中途确认；它仍须遵守你列出的禁止事项，遇到必须确认的动作或真正卡住时也要停下（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L88)）。
- **“怎样算完成”** 要写成每一轮都能实际检查的条件，例如“所有测试通过”“旧的函数没有人调用”。指南特别提醒：**时间长度不是完成条件**。“做四个小时”没有东西可以检查，你醒来只会看到四个小时的忙碌，而不是结果（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L120)）。
- **“工作分支”** 用来分开提交记录，但不会隔离同一工作目录里尚未提交的变更。要避免干扰手上的工作，应按指南建议使用新的 worktree；Claude Code 的 `-w`（`--worktree`）选项可以在独立的 worktree 里启动（[CLI 说明](https://code.claude.com/docs/en/cli-reference)）。
- **“不用问我”** 先回答它原本会停下来问的事。这里只放行在本地新分支上 commit；push、开 PR、合并和其他不可逆的动作，仍然要由人确认。
- **“不可以做”** 是界线。光写在提示里还不够，要用权限设置挡住，见下一段。
- **“如果真的卡住”** 是出口。让它在真的死路时停下来写清楚，比一整晚自己重新解读目标好。

指南的模板最后一行用 `/loop`，那是 Cursor 内置、用来定时或在事件发生时叫醒 AI 的命令，不是 pstack 的 skill（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L35)）。Claude Code 也有自己的 `/loop`，但用法不同，本篇不介绍；上面的模板不用它，直接在一个对话里做到完成。

**它会怎么做**：

1. **先设计流程。** 这类你离开后才要回来审的工作，`/poteto-mode` 会交给 [`/figure-it-out`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/figure-it-out/SKILL.md) 先把阶段设计好，并接上决策记录（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L38)）。
2. **把完成条件写成可以检查的判断式**，在第一轮之前就定好（[autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L5)）。
3. **每一轮做最小的改动**，拿完成条件检查；有进展就 commit，没帮助就丢掉，不留“也许有帮助”的东西。
4. **自行处理途中发现、且有助于目标的问题**，不停下来问你；只有不可逆的动作、无法用实验回答的产品或偏好决定，以及真正的死路，才会留给你。
5. **每一轮在决策记录记一行。**
6. **达到完成条件才算成功。** 卡在原地就换方法；如果遇到必须由你决定的事、权限限制、费用上限，或确实无法继续，就留下未完成状态与原因，不放宽完成条件来宣布成功（[autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L6-L13)）。

**你会拿到**：一条回复，写出完成条件、跑了几轮、留下了什么、丢掉了什么、完成条件最后的状态，以及一份决策记录。

**下一步**：早上用 `/show-me-your-work` 检查（见后面的“早上”一节）。

### 在 Claude Code 里无人值守地跑

你不在电脑前时，AI 每次要运行命令都停下来等你同意，就会卡一整晚。所以要事先设好它能做什么、不能做什么。我会先准备好独立的 worktree、工作分支、项目依赖和 `overnight-prompt.txt`，再从该 worktree 启动 `claude -p`，搭配权限模式、允许清单和费用上限。下面沿用后面完整示例的分支名称 `feat/export-csv`。先在终端里自行创建 worktree 和分支，并复制提示文件；使用前请将名称换成自己的任务名称：

```bash
cd ~/my-project
git worktree add ../my-project-overnight -b feat/export-csv
cp overnight-prompt.txt ../my-project-overnight/
```

接着在新 worktree 准备好项目依赖，确认提示中的分支名称和实际分支一致，再启动：

```bash
cd ~/my-project-overnight
claude -p "$(cat overnight-prompt.txt)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Grep" "Glob" "Bash(python3 -m unittest *)" "Bash(git add *)" "Bash(git commit *)" "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" \
  --disallowedTools "Bash(git push *)" "Bash(rm *)" "Bash(curl *)" "WebFetch" "WebSearch" \
  --max-budget-usd 10
```

- `--permission-mode acceptEdits`：读文件、改文件和常见的文件命令不用问；其他命令则需要额外授权。在无人值守运行前，要先检查已有权限设置。
- `--allowedTools`：允许清单，列出不用问就能运行的工具和命令。测试命令要换成你项目用的。这里没有放行创建或切换分支的命令，所以前面的 worktree 和分支准备步骤要先由你完成。
- `--disallowedTools`：禁止清单。禁止规则在每一种权限模式下都有效（[权限模式说明](https://code.claude.com/docs/en/permission-modes#available-modes)）。
- `--max-budget-usd`：估计花费到这个金额就停止，只能用在 `claude -p`（[CLI 说明](https://code.claude.com/docs/en/cli-reference)）。

`claude -p` 没有设置权限模式时，需要批准的动作会直接被拒绝（[权限模式说明](https://code.claude.com/docs/en/permission-modes#tool-calls-denied-in-claude--p-and-agent-sdk-runs)）。允许清单漏列必要命令，可能让任务无法完成；早上要根据记录判断是否需要调整。这份示例只封锁了部分工具与命令，不等于完全禁止联网、删文件或修改工作目录外的文件；允许运行的程序本身也可能做这些事。如果要强制限制网络和文件范围，还需要沙箱或容器等隔离设置。

### 想让它停下来，或明天接着做

想让 AI 停下来时，要明确说“暂停”，不要只说你要离线；后者也可能被理解成请它继续无人值守工作。Pause safely playbook 会把目前这一步做完或退回去，用一个 `wip:` commit 存下进度，再写一份接手说明（resume note）。暂停流程只在本地保存进度，不会自动开 PR 或推送。单纯要求“继续”不会触发暂停（[pause-safely playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/pause-safely.md#L1-L10)）。

```text
/pstack:poteto-mode 先暂停，我要离线了。
```

新的对话可以从那份说明接手，走的是 Session pickup playbook：读前一次的记录、重建状态，并在真实的程序上重新验证前一次说“做完了”的事（[session-pickup playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/session-pickup.md)）。

### 一整晚不只一件事

一晚有好几个互不相干的改动时，指南有两个 playbook（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L72-L86)）：Autopilot-full 会把每个 PR 一路做到合并；Autopilot-stack 一样会验证，但**不合并**，早上由你自己看、自己合并。如果你希望 AI 先准备 PR、早上再由你审查并决定是否合并，可以选 Autopilot-stack。这和前面只做本地工作的模板不同，必须另外明确授权 push 与开 PR：

```text
/pstack:poteto-mode autopilot these five changes, but don't merge. i'll land them in the morning.
```

## 早上：用 /show-me-your-work 检查决策记录

**什么时候用**：AI 自己跑了一段长时间的工作，你回来要知道它做了什么、为什么这样做。

决策记录是一个 TSV 文件（用 Tab 分隔字段的纯文本表格），一个决定一行，字段是时间、阶段、决定、原因、证据、结果。证据字段要指向可查验的来源，例如 commit 编号或 `文件:行号`，不能只有文字说明（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L11-L22)）。它默认放在工作文件夹的 `decisions.tsv`，有好几个工作同时进行时放 `.audit/<任务名称>.tsv`，默认**不 commit**；只有工作大到审查者需要这份记录才能相信结果时，才 commit（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L44-L48)）。记录只能往后加：判断错了，就新增一行注明更正，不改也不删旧行。

**命令怎么写**（取自[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L62-L66)），在跑工作的同一个对话里：

```text
/pstack:show-me-your-work catch me up on what you did last night
```

**它会怎么做**（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L55-L74)）：

1. **对照对话记录检查决策记录。** 每一行都要对应到真的决定或动作，证据要能打开，而且真的证明那一行说的事。漏记的转折要补上。写错的行不改不删，新增一行更正。
2. **找不同家族的模型来审。** 派一个和做事的模型不同家族的子代理，读记录和对话，找出证据薄弱的决定、没有证明就说做过的验证、事后看来有风险的选择。
3. **把它做了什么整理成摘要**，结尾加一个 Attention（注意事项）区。

**你会拿到**：一份摘要，以及 Attention 区。Attention 的第一行写 `reviewed by <模型>`，接着是每一个要你注意的地方，指向记录的哪一行。

**下一步**：先读 Attention，再顺着它指的那几行，打开证据抽查（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L68)）。你在审查决定，不是重看一整晚。也看一下 `reviewed by` 那一行：如果你的环境只有一个模型家族，这个审查就不是真正的跨家族审查。在终端里可以这样把 TSV 排成表格：

```bash
column -s$'\t' -t decisions.tsv
```

只想快速知道状态、不需要完整检查时，在同一个对话跑 `/pstack:ketchup`，它只读不改（[指南第 7 章](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L70)）。

## 风险：什么可以放手，什么一定要先问

### never-block-on-the-human 的界线

让 AI 自己跑的核心原则是 [never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md#L9-L15)：人可以稍后查看成果并介入，AI 不必为每个可恢复的小决定停下来等待。可以还原的事，例如写代码、改笔记、拆任务，先做再报告；不要问“要不要做 X”，做了再说明为什么。但**不可逆的动作仍然要先确认**，例如 force push（强制覆盖远端分支的历史）、删除正式环境的数据、对外发消息。产品方向由人决定。

`/poteto-mode` 也写明，就算你说了“我要去睡了”，下面这些仍然**一定会停下来**：force push 到共享分支、部署、删除数据、发消息给客户（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L86-L88)）。

但要注意，同一份 SKILL.md 也写：可以恢复的事，以及团队聊天、更新 ticket、启动 eval 这类对外动作，都会直接做、不先问，而且可以用任何 MCP 工具（[SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L84)）。因此，不能把“不可逆的动作要确认”理解成所有对外消息都会先问你；这份文件对团队内部消息和客户消息的处理就不同。不想让它对外发消息，就在“不可以做”写清楚，并用 `--disallowedTools` 把那些 MCP 工具挡掉。

![可逆的动作放手让它做，不可逆的动作一定先问；权限设置和费用上限是第二道防线](ask-line.zh-CN.png){: w="800" h="450" }
_界线画在“能不能还原”。写在提示里是第一道防线，权限设置是第二道。_

我自己会把界线再画得保守一点：

| 放手让它做 | 一定要先问，或直接禁止 |
| --- | --- |
| 在新分支上改代码、commit | push、开 PR、合并 |
| 跑测试、跑项目自己的命令 | 安装软件包、联网下载 |
| 写决策记录、接手说明 | 删除文件或数据、改 git 历史 |
| 在 scratch 文件夹放草稿 | 改 CI 设置、AI 的配置文件（`.claude/`、`CLAUDE.md`） |

### 权限：写在提示里还不够

提示用来表达意图，权限规则用来限制工具调用；网络与文件的隔离范围则要另外设置。Claude Code 的权限模式各有不同的放手程度（[权限模式说明](https://code.claude.com/docs/en/permission-modes#available-modes)）：

| 模式 | 不用问就能做的事 | 适合 |
| --- | --- | --- |
| `default`（Manual） | 只有读取 | 每个动作都自己看 |
| `acceptEdits` | 读取、改文件、常见的文件命令 | 改代码，其他命令用允许清单放行 |
| `plan` | 读取；可用 auto 时，也可运行通过其检查的命令 | 动手之前先探索 |
| `auto` | 全部，背景有安全检查 | 长时间的工作 |
| `dontAsk` | 读取和事先允许的工具，其他一律拒绝 | 锁死的 CI 和脚本 |
| `bypassPermissions` | 全部 | 只能在隔离的容器或虚拟机里用 |

几个要知道的事：

- **禁止规则永远有效**，连 `bypassPermissions` 也挡得住；但在 `bypassPermissions` 下，允许清单没有作用。
- **有些文件夹受保护。** 写入 `.git`、`.claude` 这类文件夹时，`default` 和 `acceptEdits` 会先问你，`dontAsk` 会直接拒绝（[受保护的路径](https://code.claude.com/docs/en/permission-modes#protected-paths)）。这是好事：AI 不能悄悄改掉自己的设置。所以让 `/automate-me` 或 `/reflect` 写 skill 时，要预期它会在这里停下。
- **不要为了不被打扰就关掉所有检查。** `bypassPermissions` 只适合放在隔离的容器或虚拟机里（[常见设置](https://code.claude.com/docs/en/permission-modes#common-setups)）。

### 费用：先设上限

无人值守的工作可能派出多个子代理，花费也可能比预期高。

- `claude -p` 加上 `--max-budget-usd`。这是 Claude Code 自己的估计，可能和账单不同，也可能稍微超过，所以要留一点空间；子代理的花费也算在内；用 `--resume` 接续对话时，之前的花费不算进这次的上限（[CLI 说明](https://code.claude.com/docs/en/cli-reference)）。
- 用 Pro、Max 这类订阅方案，又开了额外用量（usage credits）时，在 claude.ai 的 Settings → Usage 设每月花费上限（[费用说明](https://code.claude.com/docs/en/costs)）。
- 用 Cursor 时，也先看你的方案用量和上限设置，再让它自己跑。

更多权限和供应链的风险，以及权限怎么收，请看[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)。

## 完整范例：一天的流程

延续第 3 篇的虚构例子：一个导出数据的命令行工具。

**白天：用原则名称指挥。** 我请它加一个新选项：

```text
/pstack:poteto-mode 帮 export 命令加一个 --since 日期选项。先告诉我你的计划，不要动手。
```

计划用两个辅助函数重复判断同一个日期，三个测试也在检查相同场景。我请它先消除重复，保留必要的测试：

```text
/pstack:principle-laziness-protocol 用这条原则重看你的计划，再实现并 commit。
```

它说做完了，但只给我测试结果：

```text
/pstack:principle-prove-it-works 用真正的数据跑一次 export --since，把输出给我看，也试试看奇怪的日期。
```

**傍晚：把重复的错误变成结构。** 这周已经是第二次纠正它“用户输入的值没有先整理就拿去比对”：

```text
/pstack:correct 用户输入的过滤值，常常没有经过和数据相同的整理就拿去比对
```

我逐个看它的 commit，确认新的检查会在旧的错误上失败，再自己推上去。

**睡前：交代无人值守的工作。** 把六个部分写进 `overnight-prompt.txt`：

```text
/pstack:poteto-mode 我要去睡了，自己跑到完成为止。
目标：帮 export 加一个 --format csv 选项，在已准备好的工作分支 feat/export-csv 上做。
怎样算完成：所有测试通过；用范例数据跑出的 CSV 能被重新读回、记录数一致；原本的 JSON 输出一个字节都不变。
决策记录：用 show-me-your-work 的格式记在 decisions.tsv。
不用问我：只 commit 这次任务的变更，不要把 decisions.tsv 纳入 commit；字段顺序、空值怎么写这类小决定自己决定，写进记录。
不可以做：push、开 PR、合并、安装软件包、联网、改这个文件夹以外的文件。
如果真的卡住：停下来，写清楚卡在哪里、试过什么、需要我决定什么。
```

按前面的步骤先创建 `feat/export-csv` 分支和独立 worktree，复制提示文件并准备好依赖，再用 `claude -p` 命令启动，搭配允许清单、禁止清单和费用上限。

**早上：检查。** 用 `claude --resume <对话 ID>` 以交互模式继续昨晚的对话，再输入：

```text
/pstack:show-me-your-work catch me up on what you did last night
```

我先读 Attention，再打开它指的那几行的 commit 和输出，回答它留给我的决定，最后自己决定要不要推上去、开 PR。

**最后：留下教训。** 这次有一步绕了远路：

```text
/pstack:reflect 这次在解析日期上花太久了。把学到的事整理出来，让下次不要重蹈覆辙。
```

我只批准会改变下次决定的那几项。用了一阵子之后，再用 `/pstack:automate-me` 把这些习惯整理成我自己的 mode。

## 什么时候用哪一个

| 你遇到的情况 | 用这个 |
| --- | --- |
| 计划太大、包装太多 | `/pstack:principle-laziness-protocol` |
| 说做完了，却没有实际输出 | `/pstack:principle-prove-it-works` |
| 修法只是挡掉症状 | `/pstack:principle-fix-root-causes` |
| 同一个方向修了两次都失败 | `/pstack:principle-attack-the-premise` |
| 想看全部 24 条原则 | [README 的原则表](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257) |
| 想让 AI 照你的习惯工作 | `/pstack:automate-me` |
| 一次对话学到的事，想写回 skill | `/pstack:reflect` |
| 同一种错误纠正了两次以上 | `/pstack:correct` |
| 让它自己跑到完成 | `/pstack:poteto-mode` ＋六个部分的提示 |
| 一晚有好几个独立的改动 | `/pstack:poteto-mode` ＋ Autopilot-stack |
| 想刻意停下来、明天接着做 | 告诉 `/pstack:poteto-mode` 暂停 |
| 早上检查它做了什么 | `/pstack:show-me-your-work` |
| 只想知道目前的状态 | `/pstack:ketchup` |

## 常见陷阱

- **时间长度不是完成条件**：写“做四个小时”，它没有东西可以检查。
- **只写在提示里的界线**：“不要 push”要用禁止清单挡住。
- **原则只被点名**：回复里要看到它改变了哪个决定。
- **在任务中途改 skill**：另开一个 PR。
- **一次对话就定规则**：`/reflect` 的结果只批准会改变未来决定的。
- **让 AI 读所有项目的记录**：`/automate-me` 和 `/reflect` 只读这个项目的对话。
- **跨家族审查不是真的跨家族**：看 Attention 的 `reviewed by`。
- **没设费用上限**：`claude -p` 加 `--max-budget-usd`，也设好方案的花费上限。
- **版本**：以上依 pstack `0.15.36` 的说明文件整理，之后的版本可能会改变做法。

## 结论

想用一句话改变 AI 的做法，就在对话中途输入 `/pstack:principle-<名称>`，再看它的回复有没有写出这条原则改了哪个决定。

想让 AI 照你的方式工作，`/automate-me` 从你的对话里整理出你自己的 mode，`/reflect` 把一次对话的教训写回 skill，`/correct` 则直接改项目，让同一种错不再发生。

想让它在你不在时自己跑，先确认这类工作已经符合前述四个条件，再写好目标、可以检查的完成条件、决策记录、不用问的事、不可以做的事，以及卡住时怎么停；用权限规则与隔离设置落实操作边界，设好费用上限，早上用 `/show-me-your-work` 从 Attention 开始检查。在已授权的范围内，让它完成可以恢复的工作；不能恢复的决定，仍由你掌握。

## 延伸阅读

- [指南：Run work while you sleep](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md)：交接模板、早上的检查，以及一晚做好几件事的 playbook。
- [指南：Steer with principle names](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md)：24 条原则的简介。
- [指南：Make it yours](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md)：`/automate-me`、`/reflect`、`/correct`，以及怎么写和测试 skill。
- skill 的说明文件：[automate-me](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md)、[reflect](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md)、[correct](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md)、[show-me-your-work](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md)、[never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md)。
- [Claude Code 权限模式](https://code.claude.com/docs/en/permission-modes)：每种模式能做什么、受保护的路径。
- [pstack 系列（1）：安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)：怎么安装、更新，以及固定版本的做法。
- [pstack 系列（2）：改代码之前，先看懂再设计](/posts/pstack-understand-design/)：`/how`、`/why`、`/architect`、`/interrogate`、`/arena`。
- [pstack 系列（3）：写完代码之后，先证明它能用再合并](/posts/pstack-build-verify-merge/)：实现、清理、验证、送审四个阶段，包括 playbook、`/tdd`、验证 skill 和 babysit。
- [自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护](/posts/agent-skill-authoring-guide/)：skill 放在哪里、`SKILL.md` 怎么写。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：权限、沙箱和锁版本。
- [mattpocock/skills 系列导读：这套 skill 是什么、六篇该怎么读](/posts/mattpocock-skills-series-guide/)和[mattpocock/skills 系列（1）：先设置项目规则，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)：另一套 skill 的系列文章。
