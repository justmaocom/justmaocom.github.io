---
title: "自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护"
description: "想自己写 Agent Skill？从 SKILL.md 的字段规则、能被正确触发的 description，到拆分参考文件与脚本、触发测试、跨 agent 检查和版本维护，用写 commit 信息和整理会议待办两个日常示例走一遍。"
date: 2026-10-17 23:10:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, skill-authoring, testing, claude-code, codex, cursor]
media_subpath: /assets/img/posts/agent-skill-authoring-guide/
image:
  path: cover.zh-CN.png
  alt: "skill 好不好用，先看 description 能否在对的时候被选中，再用脚本和测试确认输出，每次改版都重跑。"
---

每次让 AI 帮忙写 commit 信息，我都得再交代一遍同一串规则：开头要标 `fix:` 或 `feat:` 这种类型、第一行别太长、结尾不加句号、只写已经加进暂存区的改动……交代到第五次，就会开始想：能不能让它自己记住？

Agent Skill 就是干这个的。这篇从“写 skill 的人”的角度出发：什么时候值得写、文件怎么放、description 怎么写才会在对的时候被调出来、怎么测、换一个 agent 还能不能用，以及之后怎么维护。过程中我会实际做两个 skill：

- **A：`writing-commit-messages`**。读 git 暂存区的改动，写出符合 Conventional Commits 格式的 commit 信息，再用一个小脚本检查格式。这是主线示例，用来演示怎么创建、怎么写脚本、怎么分三层测试。
- **B：`meeting-notes-to-todos`**。把会议纪要整理成有负责人和截止日期的待办清单。它只有说明文件和一份输出模板，没有任何代码，用来对照“不写代码的 skill”长什么样，以及 description 怎么写才不会被误调出来。

这篇不讲怎么安装别人写好的 skill。想先用现成的，可以从 [mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)开始。

> 规范和各家工具的说法，以 2026 年 10 月 17 日查阅的官方文档为准；Conventional Commits、commitlint 和 git 的说明，以 2026 年 10 月 18 日查阅的版本为准。这些文档的网址没有版本号，内容会更新，用之前请再核对一次。
>
> 示例的检查在 2026 年 10 月 18 日实际运行，使用 skills-ref 0.1.0（agentskills/agentskills commit `69ef37e`）、git 2.47.3 和 Python 3.13.5，文中的命令和输出都是当时跑出来的。**触发率测试和输出质量评测没有实际运行**，两个 skill 也都没有在任何 agent 里跑过，原因写在“分三层测试”一节。
{: .prompt-info }

## 先认识几个词

| 词 | 一句话解释 |
| --- | --- |
| Skill | 一个文件夹，核心是给 AI 看的说明文件 `SKILL.md`，也可以附带脚本和参考资料。 |
| Front matter | 文件最上面两条 `---` 之间的配置区，`SKILL.md` 用它写名称和说明。 |
| YAML | 一种用“名称: 值”一行一行写配置的格式，front matter 就是用它写的。 |
| 暂存区 | 用 `git add` 挑出“下一次 commit 要放进去”的改动的地方，git 文档也叫它 index。 |
| Conventional Commits | 一种 commit 信息的写法约定，第一行写成“类型(范围): 摘要”，比如 `fix(login): reject empty passwords`。 |
| Context window | AI 一次能看到的文字量上限。常驻的内容越多，留给干活的空间就越少。 |
| Token | AI 计算文字长度的单位。字越多，token 就越多。 |

## 什么时候值得写成 Skill

Claude Code 的文档给了一个很实际的判断标准：你一直把[同一段指示、检查清单或多步骤流程贴进对话](https://code.claude.com/docs/en/skills)，或者 `CLAUDE.md` 里某一段已经从“事实”长成了“流程”，就该写成 skill。

区别在于加载的时机。`CLAUDE.md` 每次对话都会读进去；skill 的正文只在用到时才加载。同一份文档也写明，长篇参考资料在用到之前几乎不占成本。`AGENTS.md` 也是常驻的，每一行都有成本，[系列第 6 篇](/posts/mattpocock-skills-research-handoff/)讲过这一点。

反过来，也有不必写的时候。agentskills.io 的[最佳实践](https://agentskills.io/skill-creation/best-practices)说得很直接：如果 agent 没有这个 skill 也能把整件事做好，这个 skill 可能就没有价值。Anthropic 的[编写指南](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)建议先做评测：让 AI 在没有 skill 的情况下做几次有代表性的任务，记下它具体错在哪里，再写刚好能补上这些缺口的指示。

拿 A 来说，AI 本来就会写 commit 信息，也懂 git，但它不知道你的团队用哪几种类型、第一行最多几个字符，也不知道“没加进暂存区的东西，不要自己 `git add`”这种你在意的规矩。B 也一样：AI 读得懂会议纪要，但每次整理出来的格式都不一样，有时还会给没人认领的事情猜一个负责人。这些正是 skill 该补上的东西。

至于“写给 AI 看的文档”通用的写作原则，比如指引句怎么写、常用的放前面、删掉多余的句子，系列第 6 篇的 [`writing-for-agents` 一节](/posts/mattpocock-skills-research-handoff/)已经整理过，这里不再重复，只讲 skill 特有的机制。

## 一个 Skill 的最小结构

按照 [Agent Skills 规范](https://agentskills.io/specification)，一个 skill 最少只要一个文件夹，里面放一个 `SKILL.md`。其他都是可选的：`scripts/` 放可以运行的程序，`references/` 放需要时才读的文档，`assets/` 放模板、图片这类资源。

`SKILL.md` 的开头是 YAML front matter，后面接 Markdown 正文。最小的写法是这样：

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

规范里的字段只有六个：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `name` | 是 | 1–64 个字符；只能用小写英文字母、数字和 `-`；不能以 `-` 开头或结尾；不能有连续的 `--`；**必须和上层文件夹同名** |
| `description` | 是 | 1–1024 个字符；要写这个 skill 做什么，以及什么时候用 |
| `license` | 否 | 许可证名称，或者 skill 里附带的许可证文件名 |
| `compatibility` | 否 | 1–500 个字符；写环境要求，比如需要哪些系统软件包。规范说多数 skill 不需要 |
| `metadata` | 否 | 字符串到字符串的映射，放规范没有定义的额外信息 |
| `allowed-tools` | 否 | 以空格分隔的预先批准工具列表；**实验性**，各家支持程度不同 |

各家工具在此之上还有自己的规定：

- **Anthropic 平台**：[`name` 不能包含 XML 标签，也不能包含保留字 `anthropic`、`claude`；`description` 不能包含 XML 标签](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure)。
- **Claude Code**：[所有字段都是可选的](https://code.claude.com/docs/en/skills)，没写 `name` 就用文件夹名称；字段名写错或者不认识，会直接忽略，不报错；YAML 解析失败时 skill 照样加载，只是所有字段都是空的。
- **claude.ai 上传和 Skills API**：同一份文档写明，这两条路只接受规范的六个字段，多一个就直接报错：

```text
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name
```

把这三条放在一起看就知道麻烦在哪：在 Claude Code 里写错，没人会提醒你；等你想把同一个 skill 上传到别处，才会报错。所以最稳妥的做法是**只用规范的六个字段**，这也是后面“换一个 agent 还能用吗”的基础。

## Description 决定它会不会被调出来

agent 启动时，不会把每个 skill 都读完。按照[规范的渐进式披露](https://agentskills.io/specification#progressive-disclosure)，它只先加载每个 skill 的 `name` 和 `description`，等任务看起来对得上，才去读整份 `SKILL.md`。agentskills.io 的 [description 优化指南](https://agentskills.io/skill-creation/optimizing-descriptions)说得更直白：触发与否，全落在 description 身上。

同一份指南还提到一个容易忽略的地方：agent 通常只在自己做不到的任务上才会去找 skill。像“读一下这个 PDF”这种一步就能做完的请求，即使 description 完全吻合，也可能不触发，因为 agent 用基本工具就能做到。

### 两份文档，两种写法

关于 description 该怎么写，两份官方文档的说法不一样，我如实列出来：

- **agentskills.io**（[优化指南](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)）：用祈使语气，写成对 agent 的指示，比如“Use this skill when...”，而不是“This skill does...”；写用户想达成什么，而不是 skill 内部怎么实现；主动列出适用场景，包括用户没说出领域名称的时候；保持精简。
- **Anthropic**（[编写指南](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#writing-effective-descriptions)）：一律用第三人称，比如“Processes Excel files and generates reports”，避免“I can help you...”或“You can use this to...”。理由是 description 会被放进系统提示词，视角不一致可能影响 skill 被发现。

这两种写法其实是冲突的：agentskills.io 明确要写“Use this skill when...”，而不是“This skill does...”；Anthropic 的例子却正是“Processes Excel files...”这种第三人称的句子。我的两个示例都用折中写法，这是我自己的选择，不是哪份文档的建议：第一句用第三人称说它做什么，第二句用“Use this skill when...”列出场景，最后一句写明什么时候不用。A 的写法：

```yaml
description: "Writes a git commit message for the currently staged changes, in Conventional Commits format (type(scope): summary, optional body and footers). Use this skill when the user asks for a commit message, asks you to commit what they staged, or asks how to describe their changes, even if they don't say 'Conventional Commits'. Do not use it to explain git commands, to edit commits that were already pushed, or to write changelogs or release notes."
```

整段用双引号包起来不是习惯问题，原因在后面的“格式检查”里会看到。最后那句“Do not use it to...”也有出处：优化指南建议，如果不该触发的查询总是误触发，就补上 skill **不**做什么，把它和相邻的能力区分开。

### 用 B 看怎么避免误触发

会议纪要很容易和别的请求混在一起：“帮我总结一下这场会”“把待办排个优先级”“帮我约下次开会”听起来都和会议有关，但要的东西不一样。B 的 description 是这样写的：

```yaml
description: Turns meeting notes or a meeting transcript into a to-do list of tasks with owners and due dates, in a fixed Markdown format. Use this skill when the user shares notes, minutes or a transcript of a meeting or call and asks what needs to be done, who is doing what, or for the follow-ups, even if they don't say "action items". Do not use it for a plain meeting summary with no tasks, for editing or prioritizing an existing to-do list, or for scheduling a meeting.
```

它做了三件事：第一句说清楚产出是“有负责人和截止日期的待办”，不是会议总结；第二句列出用户实际会怎么说（笔记、纪要、逐字稿、谁负责什么、后续跟进），包括没说“action items”这个词的时候；最后一句把三个最像的请求排除掉。拿几条查询来对照：

| 查询 | 该触发吗 | 为什么 |
| --- | --- | --- |
| “这是昨天周会的笔记，谁要做什么？” | 该 | 没说“待办”，但问的就是谁负责什么 |
| “帮我把这场会议总结成三点” | 不该 | 要的是总结，不是待办 |
| “把我的待办清单按优先级排好” | 不该 | 已经是待办清单，不是从会议纪要里抽出来 |
| “帮我约下周三下午开会” | 不该 | 是安排会议，不是整理会议 |

这张表是我写的测试题起点，没有在任何 agent 里跑过。怎么把它变成真正的测试，见后面的“触发测试”。

### 长度要算预算

description 的上限是 1024 个字符，但实际能用的空间通常更小，因为所有 skill 的列表要一起挤进 context window：

| 工具 | 列表预算 | 超出时 |
| --- | --- | --- |
| Claude Code | 整个列表占 context window 的 1%；每个 skill 的 `description` 加 `when_to_use` 在列表里截断在 1,536 个字符（[文档](https://code.claude.com/docs/en/skills)） | 从最少用到的 skill 开始去掉 description |
| Codex | 初始列表最多占 context window 的 2%，不知道 context window 大小时是 8,000 个字符（[文档](https://learn.chatgpt.com/docs/build-skills)） | 先缩短 description；skill 很多时可能整个略过，并显示警告 |

两家都建议**把关键用途放在最前面**，被截断时还能保住最重要的那几个词。A 的 description 是 444 个字符，B 是 464 个字符，三段的顺序都是按这个原则排的。

## 一个 Skill 只做一件事

[agentskills.io](https://agentskills.io/skill-creation/best-practices#design-coherent-units) 用函数来打比方：一个 skill 应该是一个完整的工作单元。切得太细，一个任务要同时加载好几个 skill，指示可能互相打架；切得太粗，就很难在对的时候被精准调出来。Codex 的文档也只写了一句：[Keep each skill focused on one job](https://learn.chatgpt.com/docs/build-skills#best-practices)。

A 只管写 commit 信息：看暂存区、选类型、写摘要、检查格式。写 PR 描述、整理 release notes、修改已经推上去的 commit，都不在它的范围里。B 只把会议纪要变成待办，不做会议总结，也不管待办之后怎么排。

命名方面，Anthropic [建议用动名词](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#naming-conventions)，比如 `processing-pdfs`；名词短语（`pdf-processing`）和动作导向（`process-pdfs`）也可以接受；要避开 `helper`、`utils` 这种看不出在干什么的名字。A 叫 `writing-commit-messages`，是动名词。B 的 `meeting-notes-to-todos` 是“输入 → 输出”的写法，不在上面三种里。同一份指南也提醒，同一组 skill 的命名方式要一致；如果你要把这两个放在同一个项目里，最好统一成一种，比如都改成动名词。

### 谁能启动它

有些 skill 不该让 AI 自己决定什么时候运行。各家的开关不一样：

| 工具 | 配置 | 效果 |
| --- | --- | --- |
| Claude Code | `disable-model-invocation: true` | Claude 不会自己启动，只能你输入 `/名称` 来调用（[文档](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)） |
| Claude Code | `user-invocable: false` | 你不能用 `/名称` 调用它，只有 Claude 能启动 |
| Cursor | `disable-model-invocation: true` | 只有明确输入 `/skill-name` 时才加载（[文档](https://cursor.com/docs/skills#disabling-automatic-invocation)） |
| Codex | `agents/openai.yaml` 里的 `policy.allow_implicit_invocation: false` | 不会根据提示自动启动，仍然可以用 `$skill` 显式调用（[文档](https://learn.chatgpt.com/docs/build-skills#optional-metadata)） |

Claude Code 的文档建议，有副作用或者你想自己控制时机的流程，比如 `/commit`、`/deploy`，就设成只能手动，因为你不会想让 Claude 觉得“代码看起来没问题了”就自己去部署。实际例子可以看[系列第 4 篇的 `implement`](/posts/mattpocock-skills-implementation-feedback-loops/)，它同时设了 Claude Code 和 Codex 两种开关。

A 正好站在这条线上，因为 commit 就是有副作用的操作。我的处理是让 A 只写信息、检查格式，**只有用户在对话里要求 commit 时才运行 `git commit`**（写在第 5 步）。要注意，这是写在指示里的约定，不是技术上拦得住的限制。如果你想要的是“一调用就直接 commit”，那就该设成只能手动。

这里还有一个取舍：`disable-model-invocation` 和 `user-invocable` 都不在规范的六个字段里。写进 `SKILL.md`，在 Claude Code 和 Cursor 里有效，但 claude.ai 上传和 Skills API 会拒收，后面的 `skills-ref` 检查也会报错。Codex 把同样的配置放在另一个文件 `agents/openai.yaml` 里，`SKILL.md` 本身就能保持只有规范字段。两个示例都没有设这两种开关。

## 把细节拆到参考文件和脚本

![渐进式披露三层：name 和 description 在启动时就加载，SKILL.md 正文在触发时才读，参考文件和脚本只在需要时才用](progressive-disclosure.zh-CN.png){: width="800" height="450" }
_同一个 skill 分三层加载：越往下越大，但越晚才进入 context window。_

[规范](https://agentskills.io/specification#progressive-disclosure)把一个 skill 分成三层：

1. **Metadata**（约 100 tokens）：`name` 和 `description`，启动时就加载所有 skill 的这一层。
2. **正文**（建议少于 5000 tokens）：整份 `SKILL.md`，skill 被启动时才读。
3. **资源**：`scripts/`、`references/`、`assets/` 里的文件，需要时才加载。

规范还建议 `SKILL.md` 主文件控制在 500 行以内，文件引用只往下一层。Anthropic 的编写指南解释了原因：Claude 读到“被引用的文件里又引用了别的文件”时，[可能只用 `head -100` 这类命令看前几行](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-deeply-nested-references)，结果拿到的信息不完整。所以参考文件都要直接从 `SKILL.md` 链接过去；超过 100 行的参考文件，开头要放一份目录。

光把文件拆开还不够，还要写明**什么时候**读哪个文件。agentskills.io 的例子是“[API 返回非 200 时，读 `references/api-errors.md`](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)”，这比“详见 references/”有用得多。A 是这样写的，类型列表和规则都放在参考文件里，平时不用读：

```markdown
Read `references/conventional-commits.md` when you are not sure which type
fits, or when the change removes or renames something other code depends on.
```

### 脚本是拿来运行的

脚本和参考文件最大的区别：按照 [Anthropic 的说明](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#level-3-resources-and-code-loaded-as-needed)，脚本是通过 bash 运行的，代码本身不会进入 context，只有输出会占 token。编写指南也提醒，要在指示里[写清楚是“运行它”还是“当参考来读”](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#provide-utility-scripts)。

能用程序检查的规则，就别用文字让 AI 自己判断。A 把格式规则（类型、长度、句号、空行、`BREAKING CHANGE` 要大写）都写进 `scripts/check_commit_msg.py`；但“这次改动算 `fix` 还是 `feat`”脚本判断不了，还是要 AI 读过 diff（改动前后的差异）自己决定，这一点写在 Gotchas 里。脚本按照 [agentskills.io 的脚本指南](https://agentskills.io/skill-creation/using-scripts#designing-scripts-for-agentic-use)设计：

| 指南的要求 | A 的脚本怎么做 |
| --- | --- |
| 不能有交互式提问（agent 跑的是非交互式 shell，等输入会一直卡住） | 信息从文件读，或用 `-` 从标准输入读，不会停下来提问 |
| 提供 `--help` | `--help` 列出两种用法、参数、输出格式、exit code 和示例 |
| 错误信息要说清楚哪里错、该怎么改 | 比如 `write the type in lowercase: 'fix'` |
| 数据输出到 stdout，诊断信息输出到 stderr | 结果一律是一个 JSON 对象；“暂存区是空的”这类提醒和错误写到 stderr |
| exit code 有意义，并写在 `--help` 里 | 0 通过（或暂存区有内容）、1 有问题（或暂存区是空的）、2 用法错误 |
| 输出长度可预期 | 只返回第一行和问题列表，不把整份 diff 打印出来 |

完整的 `--help` 说明，就是附录里脚本开头那段文字。

`--repo` 这个参数是有原因的。脚本指南说，`SKILL.md` 里的命令路径要写成[相对于 skill 根目录](https://agentskills.io/skill-creation/using-scripts#referencing-scripts-from-skill-md)，因为 agent 是在那里运行命令的。但 git 要在用户的仓库里跑，所以脚本用 `--repo` 指定仓库，`SKILL.md` 开头也写明“命令从 skill 目录运行，`<repo>` 是用户的仓库”。

### 依赖要写明

脚本指南也建议[在 `SKILL.md` 里写明前置要求](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，不要假设 agent 的环境已经装好；运行时层面的要求可以写在 `compatibility` 字段里。用 `npx` 这类一次性命令时要锁定版本，比如写 `npx eslint@9.0.0`。Anthropic 的编写指南也有一节就叫“[不要假设工具已经安装](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-assuming-tools-are-installed)”。

A 的脚本只用 Python 标准库，另外需要 git，这两项都写进了 `compatibility`。B 没有脚本，什么都不用装，所以没写 `compatibility`，这也符合规范说的“多数 skill 不需要”。如果脚本要用第三方库，就用 [PEP 723](https://peps.python.org/pep-0723/) 在脚本里声明依赖，并在 `SKILL.md` 里写明怎么运行。

### 不一定要有脚本

B 的规则像是“纪要没写负责人，就不要猜”“只有知道会议日期，才把‘下周五’换成具体日期”，这些都要读懂句子才能判断，写成程序反而不可靠。Anthropic 的编写指南把这叫做[自由度](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#set-appropriate-degrees-of-freedom)：要看上下文做决定的事，用文字指示（自由度高）；容易出错、结果必须一致的事，用固定的脚本（自由度低）。A 的格式检查属于后者，B 的整理工作属于前者。

B 唯一的资源是 `assets/todo-template.md`，一份固定的输出模板。模板让每次的结果长得一样，你或下一个工具才好接着用；编写指南的[模板模式](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#template-pattern)讲的就是这个做法，也提醒要按需要决定模板有多严格。

## 动手做 A：写 Commit 信息的 Skill

A 的完整结构：

```console
$ find writing-commit-messages -type f | sort
writing-commit-messages/SKILL.md
writing-commit-messages/evals/evals.json
writing-commit-messages/evals/files/empty-password.diff
writing-commit-messages/evals/files/mixed-changes.diff
writing-commit-messages/evals/trigger-queries.json
writing-commit-messages/references/conventional-commits.md
writing-commit-messages/scripts/check_commit_msg.py
```

`evals/` 是测试用的文件，后面“分三层测试”会用到。参考文件、脚本和两份测试题的完整内容放在文末附录，这里只看 `SKILL.md`。

### SKILL.md

````markdown
---
name: writing-commit-messages
description: "Writes a git commit message for the currently staged changes, in Conventional Commits format (type(scope): summary, optional body and footers). Use this skill when the user asks for a commit message, asks you to commit what they staged, or asks how to describe their changes, even if they don't say 'Conventional Commits'. Do not use it to explain git commands, to edit commits that were already pushed, or to write changelogs or release notes."
compatibility: Requires git and python3 (tested with git 2.47 and Python 3.13). Standard library only.
metadata:
  version: "1.0"
---

# Writing Commit Messages

## Steps

Run the commands below from this skill's directory. `<repo>` is the path
of the user's git repository.

1. See what is staged: `python3 scripts/check_commit_msg.py --staged --repo <repo>`.
   Exit code 1 means nothing is staged: stop and tell the user. Do not run
   `git add` yourself.
2. Read the staged changes with `git -C <repo> diff --cached`. For a long
   diff, read one file at a time: `git -C <repo> diff --cached -- <path>`.
3. Write the message to a temporary file: a header `type(scope): summary`,
   then a blank line and a short body that says why, if the header alone
   does not make the reason clear.
4. Check it: `python3 scripts/check_commit_msg.py <file>`. Fix every
   problem and check again until it exits 0.
5. Show the message to the user. Run `git -C <repo> commit -F <file>` only
   if the user asked you to commit in this conversation.

Read `references/conventional-commits.md` when you are not sure which type
fits, or when the change removes or renames something other code depends on.

## Gotchas

- The checker only looks at the message. It cannot tell whether `fix` or
  `feat` matches the diff; that call is yours.
- If the staged changes do two unrelated things, suggest splitting them
  into two commits instead of writing one vague message.
- Do not invent issue numbers, `Closes #...` or `Co-authored-by` lines.
  Add footers only when the user gave you the information.
- Never use `git commit -a` or `git add .`: they would include changes the
  user did not stage.
- `BREAKING CHANGE:` must be uppercase. `!` before the colon also marks a
  breaking change.
````

步骤只有五步，第 4 步是 agentskills.io 说的[验证循环](https://agentskills.io/skill-creation/best-practices#validation-loops)：写完就跑检查，有错就改，改完再跑，直到通过为止。

Gotchas 是 agentskills.io 认为很多 skill 里[最有价值的部分](https://agentskills.io/skill-creation/best-practices#gotchas-sections)：不是泛泛的建议，而是“不说 AI 就容易做错”的具体事实。比如 `git commit -a`：[git 文档](https://git-scm.com/docs/git-commit)写明它会自动把已修改和已删除的文件加进暂存区，等于把用户没挑的改动也一起提交。

参考文件 `references/conventional-commits.md` 列了 11 种类型和 7 条检查规则。规范本身只定义了 `feat` 和 `fix`，其他 9 种来自 [commitlint 的 config-conventional](https://github.com/conventional-changelog/commitlint/blob/master/%40commitlint/config-conventional/src/index.ts)。第一行最多 72 个字符是我自己定的：[git 文档](https://git-scm.com/docs/git-commit#_discussion)建议标题不超过 50 个字符，commitlint 默认允许 100，我取中间。参考文件里每条规则都标了出处，哪些是规范、哪些是我自己的选择，一看就知道。

### 跑一次

我建了一个临时的 git 仓库来试。`app/login.py` 加了“密码为空就直接返回 False”两行，并加进暂存区；`README.md` 也改了，但没加：

```console
$ git status --short
 M README.md
M  app/login.py
```

这两列分别对应暂存区和工作目录：`M ` 是改了而且加进了暂存区，` M` 是改了但还没加。按第 1 步，先看暂存区里有什么：

```console
$ python3 scripts/check_commit_msg.py --staged --repo /tmp/cc-demo
{
  "staged": 1,
  "files": [
    {
      "status": "M",
      "path": "app/login.py",
      "added": 2,
      "deleted": 0
    }
  ]
}
```

只列出 `app/login.py`，没加进暂存区的 `README.md` 不会出现，exit code 是 0。接着拿一条合格的信息来检查，exit code 是 0：

```console
$ cat good.txt
fix(login): reject empty passwords

Return False before hashing when the password is empty,
instead of passing an empty string to hash_password().
$ python3 scripts/check_commit_msg.py /tmp/cc-msgs/good.txt
{
  "ok": true,
  "header": "fix(login): reject empty passwords",
  "problems": []
}
```

再拿一条常见的写法，类型大写、结尾有句号、第二行没空出来，exit code 是 1：

```console
$ cat bad.txt
Fix(login): Handle empty password.
Users saw an error page when the password field was empty.
$ python3 scripts/check_commit_msg.py /tmp/cc-msgs/bad.txt
{
  "ok": false,
  "header": "Fix(login): Handle empty password.",
  "problems": [
    {
      "rule": "type",
      "message": "write the type in lowercase: 'fix'"
    },
    {
      "rule": "full-stop",
      "message": "do not end the summary with '.'"
    },
    {
      "rule": "blank-line",
      "message": "line 2 must be empty; put the body after a blank line"
    }
  ]
}
```

三个问题各附一句“该怎么改”，agent 照着改完再跑一次就行。最后用合格的信息真的 commit 一次。没加进暂存区的 `README.md` 还留在原处；再看暂存区，就变成空的了，exit code 是 1，提醒写到 stderr：

```console
$ git commit -q -F /tmp/cc-msgs/good.txt && git log --format="%h %s" -2 && git status --short
891c9d5 fix(login): reject empty passwords
5c0fd3d chore: initial commit
 M README.md
$ python3 scripts/check_commit_msg.py --staged --repo /tmp/cc-demo
nothing is staged; ask the user what to stage
{
  "staged": 0,
  "files": []
}
```

## 动手做 B：整理会议待办的 Skill

B 只有两个文件：

```console
$ find meeting-notes-to-todos -type f | sort
meeting-notes-to-todos/SKILL.md
meeting-notes-to-todos/assets/todo-template.md
```

### SKILL.md

````markdown
---
name: meeting-notes-to-todos
description: Turns meeting notes or a meeting transcript into a to-do list of tasks with owners and due dates, in a fixed Markdown format. Use this skill when the user shares notes, minutes or a transcript of a meeting or call and asks what needs to be done, who is doing what, or for the follow-ups, even if they don't say "action items". Do not use it for a plain meeting summary with no tasks, for editing or prioritizing an existing to-do list, or for scheduling a meeting.
metadata:
  version: "1.0"
---

# Meeting Notes to To-dos

## Steps

1. Find every action item in the notes: something a person agreed to do,
   was asked to do, or said they would do. Decisions and opinions are not
   action items unless someone has to act on them.
2. For each item, take the owner and the due date only from the notes.
3. Fill in `assets/todo-template.md` and output only the filled template.
   Write it in the language the notes are written in.

## Rules

- Never guess an owner or a date. If the notes don't say, write
  `(not stated)` in the notes' language and list the item under
  "Needs an owner or date".
- Turn a relative date ("next Friday") into a calendar date only when the
  meeting date is in the notes and the words point to one day. Otherwise
  keep the words as written and list the item under "Needs an owner or date".
- Quote a few words from the notes in the Source column, so the user can
  check where each item came from.
- One task per row. If one sentence holds two tasks, split it.
- If there are no action items, say so in one sentence instead of
  filling the template.
````

整份都是文字规则，重点在“不要猜”：没写负责人就标“未说明”，日期说得不清楚就保留原文，再把这些条目集中列在最后，让用户一眼看到要补什么。

### assets/todo-template.md

```markdown
## To-dos: {meeting title} ({meeting date, or "date not stated"})

| # | Task | Owner | Due | Source |
| --- | --- | --- | --- | --- |
| 1 | {start with a verb} | {name from the notes} | {YYYY-MM-DD} | "{a few words quoted from the notes}" |

### Needs an owner or date

- #{row number}: {what is missing, e.g. "no owner named", "due date only says 'soon'"}

{Leave out this section when every row has an owner and a due date.}
```

### 用一份示例纪要对照

> 下面的会议纪要是我编的**示例数据**，不是真实会议。后面的表格是我按模板**手写**的预期结果，用来说明模板怎么用，**不是 agent 生成的**，B 没有在任何 agent 里跑过。
{: .prompt-warning }

```text
周会 2026-10-12（周一）
- 小林：官网改版的设计稿，周五前给大家看
- 登录页的报错提示要改，阿哲说他来
- 下个月要交预算表，还没定谁做
- 决定：测试环境这周先不升级
```

按 B 的规则，预期的结果应该是这样：

```markdown
## 待办：周会（2026-10-12）

| # | 待办 | 负责人 | 截止日期 | 出处 |
| --- | --- | --- | --- | --- |
| 1 | 把官网改版的设计稿给大家看 | 小林 | 2026-10-16 | “设计稿，周五前给大家看” |
| 2 | 修改登录页的报错提示 | 阿哲 | （未说明） | “阿哲说他来” |
| 3 | 交预算表 | （未说明） | 下个月 | “还没定谁做” |

### 需要补负责人或截止日期

- #2：没有截止日期
- #3：没有负责人；截止日期只写了“下个月”
```

几个地方对应到规则：会议日期是周一，所以“周五前”可以换成 2026-10-16；“下个月”指的不是某一天，就保留原文；“测试环境先不升级”是决定，没有人要因此做什么，所以不算待办。

## 分三层测试

![三层测试：格式检查用 skills-ref 验证字段，触发测试用约 20 条查询看会不会被调出来，输出检查对比有无 skill 的结果](three-layer-tests.zh-CN.png){: width="800" height="450" }
_三层各测一件事：格式对不对、会不会被调出来、调出来之后做得对不对。_

### 格式检查

规范推荐用 [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref) 验证 frontmatter。要先说清楚：它的 README 写明 **intended for demonstration purposes only, not meant to be used in production**，只是演示用的参考实现，不是正式产品。

我用固定的 commit 安装：

```console
$ git clone -q https://github.com/agentskills/agentskills.git && cd agentskills && git checkout -q 69ef37e9424c0a7ea9dd2293b559e43ec8176379 && git log -1 --format='%h %cs'
69ef37e 2026-08-09
$ python3 -m venv .venv && .venv/bin/pip install -q -e skills-ref && .venv/bin/skills-ref --version
skills-ref, version 0.1.0
```

第一次验证 A 就失败了。当时 description 还没加引号：

```console
$ skills-ref validate writing-commit-messages
Validation failed for writing-commit-messages:
  - Invalid YAML in frontmatter: mapping values are not allowed here
  in "<unicode string>", line 3, column 119:
     ... onal Commits format (type(scope): summary, optional body and foo ... 
                                         ^ (line: 3)
```

问题出在 description 里的 `type(scope): summary`。YAML 把“冒号加空格”当成“名称: 值”的分隔符，同一行出现第二个，整份 front matter 就解析失败。解决办法是把整段值用双引号包起来，原来句子里的双引号改成单引号。B 的 description 里没有“冒号加空格”，所以不加引号也能通过。

这个错在 Claude Code 里没人会提醒你：前面说过，它在 YAML 解析失败时照样加载 skill，只是所有字段都是空的。我的推断是，description 变成空的，skill 就很难被自动调出来；这一点我没有实测。

加上引号后，两个都通过，各只有一行，exit code 都是 0：

```console
$ skills-ref validate writing-commit-messages
Valid skill: writing-commit-messages
$ skills-ref validate meeting-notes-to-todos
Valid skill: meeting-notes-to-todos
```

接着拿 A 故意做三个错误版本：名称里有连续的 `--`、文件夹名称和 `name` 对不上、多加一个 Claude Code 专属的字段 `when_to_use`。三个各跑一次，exit code 都是 1：

```console
$ skills-ref validate bad--name
Validation failed for bad--name:
  - Skill name cannot contain consecutive hyphens
$ skills-ref validate commit-messages
Validation failed for commit-messages:
  - Directory name 'commit-messages' must match skill name 'writing-commit-messages'
$ skills-ref validate writing-commit-messages
Validation failed for writing-commit-messages:
  - Unexpected fields in frontmatter: when_to_use. Only ['allowed-tools', 'compatibility', 'description', 'license', 'metadata', 'name'] are allowed.
```

最后这个最值得注意：同一个字段，在 Claude Code 里完全合法，到了 skills-ref 就是错误。这就是前面说“只用六个字段”的原因。

Claude Code 另外提供 `claude plugin validate <skills 目录>`，可以找出 frontmatter 解析失败的 `SKILL.md`，[需要 v2.1.233 及以上](https://code.claude.com/docs/en/skills)。我的机器上没有 Claude Code，所以没有运行。

### 触发测试

格式对了，不代表它会在对的时候被调出来。agentskills.io 的[优化指南](https://agentskills.io/skill-creation/optimizing-descriptions#designing-trigger-eval-queries)建议这样测：

- 准备约 20 条查询，8–10 条**应该**触发，8–10 条**不应该**触发。
- 不该触发的，要用“看起来相近但其实不同”的查询。像“写一个斐波那契函数”这种完全无关的题目，什么也测不出来。
- 每条跑 3 次，算触发率，阈值默认 0.5。
- 把题目分成训练集（约 60%）和验证集（约 40%）。只看训练集的失败来改 description，验证集只用来确认改进有没有推广到新题目，避免 description 过度贴合这几道题。
- 大约 5 轮就够了；如果一直没有进步，问题可能出在题目本身。

Claude Code 的文档用的是[同一个思路](https://code.claude.com/docs/en/skills#evaluate-and-iterate-on-a-skill)：同一组查询，在开着 skill 和关掉 skill 的新 session 里各跑一次，互相对比。一定要开新 session，因为写 skill 时留下的对话内容，会掩盖文字里没写清楚的地方。

我给 A 写了 20 条查询，10 条该触发、10 条不该触发，训练集 12 条、验证集 8 条，两组里该触发和不该触发的各占一半。`split` 是我自己加的字段，用来把分组固定下来，指南的示例格式只有 `query` 和 `should_trigger`。完整的 JSON 在附录里（查询原文是繁体中文和英文），这里挑几条：

| 查询 | 该触发吗 | 为什么挑它 |
| --- | --- | --- |
| “这次改动要怎么描述比较好？我要提交了” | 该 | 没提到 commit 信息这几个字 |
| “fix the typo in the last commit message, it's already pushed to main” | 不该 | 同样是 commit 信息，但要改的是已经推上去的 commit |
| “帮我把这个月的 commit 整理成 release notes” | 不该 | 同样在说 commit，要的却是 release notes |
| “帮我写一个 commit-msg hook，用 Node 检查信息格式” | 不该 | 连“检查信息格式”都一样，但要的是写程序 |

> **本文没有实际运行触发率测试。** 触发测试要在真正的 agent 里跑，看它有没有去读 `SKILL.md`。我跑示例的机器上没有 `claude`、`codex`、`cursor-agent`、`gemini`、`copilot` 这些 CLI（实际用 `command -v` 检查过），所以这里只有题目和方法，没有任何触发率数字。A 的 JSON 和 B 的那张对照表，都可以拿到自己的 agent 里按指南的方法跑。
{: .prompt-warning }

### 输出检查

被调出来之后，还得做对。agentskills.io 的[输出评测指南](https://agentskills.io/skill-creation/evaluating-skills)建议把测试题放在 `evals/evals.json`，每道题包括用户会怎么问（`prompt`）、成功是什么样子（`expected_output`）、需要的文件（`files`），看过第一轮结果后再补上能客观检查的 `assertions`。指南建议先从 2–3 道题开始。A 的三道题（完整内容在附录）：

| 题目 | 想确认的事 |
| --- | --- |
| 1. 暂存区是 `empty-password.diff`，让它写信息但先别 commit | 类型是 `fix`、信息通过脚本检查、没有编造 issue 编号、没有运行 `git commit` |
| 2. 暂存区是 `mixed-changes.diff`，里面混了 README 文字和新的登出功能 | 建议拆成两个 commit，两条信息都通过检查 |
| 3. 用户说“我应该都加进暂存区了”，其实暂存区是空的 | 说明暂存区是空的，不自己运行 `git add` |

两个 `.diff` 文件都是从前面那个临时仓库实际用 `git show` 和 `git diff --cached` 导出的，不是手写的。

每道题要跑两次：一次有 skill，一次没有（改版时则用旧版做对照），每次都要从干净的 context 开始。assertion 要能客观判断，像“输出是合法的 JSON”就比“输出很好”有用。指南也提到，机械性的检查用脚本做，比让 LLM 判断更可靠。拿 A 来说，“信息通过检查”直接用 A 自己的脚本判断；“没有运行 `git commit`”对比前后的 `git log -1` 就知道，不必让 AI 打分。

Anthropic 的编写指南还多提醒了一点：skill 的效果和搭配的模型有关，[要用你打算搭配的所有模型都测一遍](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#test-with-all-models-you-plan-to-use)。

> **本文没有实际运行输出评测。** 原因和触发测试一样：没有可用的 agent，所以没有“有 skill”和“没有 skill”的对照结果。附录的 `evals.json` 只是写好的题目。B 没有写 `evals.json`，前面那份手写的预期结果可以当作它第一道题的 `expected_output`。
{: .prompt-warning }

## 换一个 Agent 还能用吗

Agent Skills 是一个开放标准。有官方文档说明支持的，包括 Claude Code、Codex、Cursor 和 GitHub Copilot；agentskills.io 的 [Client Showcase](https://agentskills.io/clients) 还列了更多产品。这四家分别会到这些地方找 skill：

| 工具 | 项目内 | 个人 |
| --- | --- | --- |
| Claude Code（[文档](https://code.claude.com/docs/en/skills#where-skills-live)） | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| Codex（[文档](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)） | 从当前工作目录往上，到仓库根目录为止，每一层的 `.agents/skills` | `$HOME/.agents/skills`；另有管理员层级（ADMIN）的 `/etc/codex/skills` |
| Cursor（[文档](https://cursor.com/docs/skills#skill-directories)） | `.agents/skills/`、`.cursor/skills/`；为了兼容，也读 `.claude/skills/`、`.codex/skills/` | `~/.agents/skills/`、`~/.cursor/skills/`；为了兼容，也读 `~/.claude/skills/`、`~/.codex/skills/` |
| GitHub Copilot（[文档](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)） | `.github/skills`、`.claude/skills`、`.agents/skills` | `~/.copilot/skills`、`~/.agents/skills` |

从这张表可以推断出一件事（这是推断，不是哪份文档写的）：按 2026 年 10 月 17 日的文档，`.agents/skills/` 同时出现在 Codex、Cursor、Copilot 的列表里，但 Claude Code 的文档没有列这个路径；反过来，`.claude/skills/` 有 Claude Code、Cursor、Copilot，却没有 Codex。也就是说，**没有哪一个路径能同时被四家读到**。

### 示例做了哪些静态检查

两个 skill 我都没有在任何一个 agent 里实际运行过，所以不能说“已在 X 上测过”。能做的是静态可移植性检查，也就是不运行 agent，只看文件本身：

| 检查 | 结果 |
| --- | --- |
| frontmatter 只用规范的六个字段 | 是。A：`name`、`description`、`compatibility`、`metadata`；B：`name`、`description`、`metadata`。两个都通过 `skills-ref validate` |
| 写了 `name`，而且和文件夹同名 | 是。Codex 文档写明 `SKILL.md` 必须包含 `name` 和 `description`；Cursor 也要求 `name` 和文件夹同名 |
| 没用任何工具专属的正文语法 | 是。没有用 Claude Code 的 `` !`命令` `` 动态注入，也没用 `${CLAUDE_SKILL_DIR}`；A 的脚本路径都相对于 skill 根目录，这是[脚本指南](https://agentskills.io/skill-creation/using-scripts#referencing-scripts-from-skill-md)的建议 |

最后一点要特别说明。Claude Code 的 `` !`命令` `` 会在 Claude 看到 skill 之前先运行命令，把输出塞进正文；`${CLAUDE_SKILL_DIR}` 则会被替换成 skill 所在的文件夹。Claude Code 的文档以动态注入为例写明，这类只属于 Claude Code 的正文功能，[在 claude.ai 和 API 上不会生效](https://code.claude.com/docs/en/skills)。其他工具我没找到文档说明，所以只能说：**不能假设它们会生效**。

## 版本与维护

规范里和版本有关的，只有 `metadata` 可以放一个 `version: "1.0"`，但它没有定义版本号代表什么。用 git tag 或 CHANGELOG 管理版本是惯例，不是规范；我的建议是每次改 description 或脚本的行为，都打一个 tag，写一行变更说明。比如团队决定多加一种类型，就要同时改参考文件里的表格和脚本里的 `TYPES`，这就是一次该记下来的改版。

改版的流程，输出评测指南给了一个很实用的做法：[改之前先把旧版复制一份](https://agentskills.io/skill-creation/evaluating-skills#spawning-runs)，用旧版做对照组（放在 `old_skill/`），对同一组题目重跑。这样才知道新版是真的变好了，还是只是换了一种错法。

另外三个维护习惯：

- **不要写会过时的信息。** Anthropic 的编写指南建议，已经不用的做法[收进一个“old patterns”区块](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-time-sensitive-information)，别混在主要步骤里。
- **每纠正一次 AI，就补一条 Gotcha。** agentskills.io 说，这是[改进 skill 最直接的方法之一](https://agentskills.io/skill-creation/best-practices#gotchas-sections)。
- **定期清理没在用的 skill。** 每个 skill 都会占用前面说的列表预算，不管有没有用到。Claude Code 的 `/skill-doctor` 可以列出每个 skill 的成本和使用次数，[需要 v2.1.252 及以上](https://code.claude.com/docs/en/skills#find-unused-skills)。

## 作者该替用户做的安全准备

装别人的 skill 有哪些风险、用户该怎么检查，[这篇供应链安全的文章](/posts/coding-agent-supply-chain-permission-risks/)已经整理过了。这里只讲写 skill 的人能提前做好的事：

- **不要让 skill 抓取外部网址的内容当指示。** Anthropic 的文档写明，[会抓取外部数据的 skill 风险特别高](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#security-considerations)，抓回来的内容可能藏着恶意指令；即使是可信的 skill，外部依赖一变也可能被污染。
- **`allowed-tools` 给到最小。** 这个字段在 Claude Code 里，会让 skill 在被调用的那一轮不经询问就使用列出的工具。文档特别写明，[workspace trust 管不住这个字段](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)：仓库里的 skill 可以给自己开权限，即使在从没信任过的文件夹里用 `-p` 运行也会生效。两个示例都没有用这个字段。
- **脚本里不放任何机密信息。** 这是我的做法，不是哪份文档的规定：密钥、令牌一律从环境变量读取，不写进 skill 的任何文件，因为整个文件夹都会被分享、被提交到仓库。
- **依赖要锁定版本。** 脚本指南要求[一次性命令写明版本](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，这样同一条命令隔一段时间再跑，结果也一样。
- **会改东西的操作要提供 `--dry-run`。** 脚本指南建议，破坏性或会改变状态的操作，[让 agent 能先预览会发生什么](https://agentskills.io/skill-creation/using-scripts#further-considerations)。A 的脚本只读 git 的状态、从不写文件；真正会改东西的 `git commit` 不在脚本里，而是留到用户要求时才运行，所以脚本不需要这个参数。

用户会把你的 skill 当成软件来审查，那你能做的，就是让它容易审：文件少、每个脚本干什么一看就懂、不连到外面的东西。

## 我的判断

以下是我的观点，不是哪份文档的结论。

**最值得花时间的是 description 和 Gotchas。** 文件夹结构、字段规则这些，按规范做一次就好，`skills-ref` 也会帮你查错，A 那个少了引号的 description 就是它查出来的。真正决定 skill 好不好用的，是它会不会在对的时候被调出来，以及调出来之后会不会踩到你早就知道的坑。

**能写成脚本的规则就写成脚本，要判断的事就留给文字。** A 的格式规则交给脚本，每次结果都一样；“这次算 fix 还是 feat”交给 AI 读 diff。B 整件事都要读懂句子，硬写脚本只会更不可靠，给它一份模板就够了。

**为了跨 agent，宁可放弃一些方便的字段。** `when_to_use`、`disable-model-invocation` 在 Claude Code 里都很好用，但一写进 `SKILL.md`，就过不了 skills-ref 和 claude.ai 上传。如果这个 skill 只给自己在 Claude Code 里用，那没关系；要给团队、跨工具用，我会只用六个字段。

**没跑过触发测试的 description，只是一个猜测。** 这篇的两个示例也一样。我写了题目，但在真正跑过之前，我并不知道有人问“这次改动要怎么描述”的时候，A 会不会被调出来。

## 延伸阅读

规范与方法（agentskills.io）：

- [Specification](https://agentskills.io/specification)：目录结构、六个字段、渐进式披露
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)：范围、Gotchas、验证循环
- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)：description 写法和触发测试
- [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)：`evals.json` 和有无 skill 的对照
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)：脚本接口设计
- [Client Showcase](https://agentskills.io/clients)：支持 Agent Skills 的产品
- [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref)：验证工具（演示用）

各家文档：

- Anthropic：[Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)、[Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Claude Code：[Extend Claude with skills](https://code.claude.com/docs/en/skills)
- Codex：[Build skills](https://learn.chatgpt.com/docs/build-skills)
- Cursor：[Agent Skills](https://cursor.com/docs/skills)
- GitHub Copilot：[About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

示例 A 用到的 commit 信息规则：

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)：信息结构、`feat`／`fix`、`BREAKING CHANGE`
- [commitlint config-conventional](https://github.com/conventional-changelog/commitlint/blob/master/%40commitlint/config-conventional/src/index.ts)：常用的 11 种类型
- [git commit 文档](https://git-scm.com/docs/git-commit)：`-a` 的行为、标题长度建议

本站相关文章：

- [mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)：想先用现成的 skill
- [系列第 6 篇](/posts/mattpocock-skills-research-handoff/)：`writing-for-agents` 的写作原则
- [系列第 4 篇](/posts/mattpocock-skills-implementation-feedback-loops/)：只能手动启动的 skill 实例
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：用户端的风险与检查清单

## 附录：示例 A 的完整文件

### references/conventional-commits.md

````markdown
# Conventional Commits: Rules Used by This Skill

Based on Conventional Commits 1.0.0 (https://www.conventionalcommits.org/en/v1.0.0/).
Rows marked "skill choice" are this skill's own rules, not the spec's.

## Message shape

```
type(scope)!: summary

body (optional, after one blank line)

footers (optional, after one blank line), e.g. Refs: #123
```

## Types

| Type | Use it for |
| --- | --- |
| `feat` | A new feature for users (spec: MUST be used for new features) |
| `fix` | A bug fix (spec: MUST be used for bug fixes) |
| `docs` | Documentation only |
| `style` | Formatting, white space; no change in behavior |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration and scripts |
| `chore` | Other changes that don't touch source or test files |
| `revert` | Reverts an earlier commit |

The spec only defines `feat` and `fix`; the other nine are the list used by
@commitlint/config-conventional.

## Rules the checker enforces

| rule | Requirement | Source |
| --- | --- | --- |
| `header` | First line is `type(scope)!: summary`; scope and `!` are optional; a colon and one space before the summary | spec |
| `type` | One of the types above, in lowercase | list: commitlint; lowercase: skill choice |
| `length` | Header is at most 72 characters | skill choice (git docs suggest 50 or fewer for the title; commitlint allows 100) |
| `full-stop` | Summary does not end with `.` | commitlint |
| `blank-line` | Line 2 is empty when there is a body | spec |
| `breaking` | A breaking-change footer is written `BREAKING CHANGE:` or `BREAKING-CHANGE:` in uppercase | spec |
| `empty` | The message is not empty | — |

## Breaking changes

Mark a change that breaks existing users with `!` before the colon
(`feat(api)!: drop the v1 endpoint`), or with a footer
`BREAKING CHANGE: <what breaks>`, or both.
````

### scripts/check_commit_msg.py

```python
#!/usr/bin/env python3
"""Check a commit message against Conventional Commits, or list staged files.

Usage:
  python3 scripts/check_commit_msg.py [--max-header N] FILE
  python3 scripts/check_commit_msg.py --staged [--repo PATH]

FILE is a text file holding the commit message; use - to read stdin.

Options:
  --staged          List the files staged in git instead of checking a message
  --repo PATH       Repository for --staged (default: current directory)
  --max-header N    Longest allowed header line (default: 72)
  -h, --help        Show this help and exit

Output: one JSON object on stdout; errors go to stderr.
Exit codes:
  0  message is valid / at least one file is staged
  1  message has problems / nothing is staged
  2  usage error (bad option, file not found, not a git repository)

Examples:
  python3 scripts/check_commit_msg.py /tmp/msg.txt
  python3 scripts/check_commit_msg.py --staged --repo ~/code/my-app
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

TYPES = ("build", "chore", "ci", "docs", "feat", "fix", "perf",
         "refactor", "revert", "style", "test")
HEADER_RE = re.compile(r"^(?P<type>[A-Za-z]+)(?:\((?P<scope>[^()\s]+)\))?"
                       r"(?P<bang>!)?: (?P<summary>\S.*)$")
BREAKING_RE = re.compile(r"^breaking[ -]change:", re.IGNORECASE)


class UsageError(Exception):
    pass


def check_message(text, max_header):
    lines = text.rstrip().splitlines()
    if not lines or not lines[0].strip():
        return "", [("empty", "the message is empty or starts with a blank line")]
    header, probs = lines[0], []
    m = HEADER_RE.match(header)
    if not m:
        probs.append(("header", "first line must look like 'type(scope): summary', "
                      "e.g. 'fix(login): handle empty password'"))
    else:
        t = m["type"]
        if t.lower() not in TYPES:
            probs.append(("type", f"'{t}' is not an allowed type; use one of: "
                          + ", ".join(TYPES)))
        elif t != t.lower():
            probs.append(("type", f"write the type in lowercase: '{t.lower()}'"))
        if m["summary"].rstrip().endswith("."):
            probs.append(("full-stop", "do not end the summary with '.'"))
    if len(header) > max_header:
        probs.append(("length", f"header is {len(header)} characters, "
                      f"limit is {max_header}"))
    if len(lines) > 1 and lines[1].strip():
        probs.append(("blank-line", "line 2 must be empty; put the body after a blank line"))
    for n, line in enumerate(lines[1:], start=2):
        if BREAKING_RE.match(line) and not line.startswith(
                ("BREAKING CHANGE:", "BREAKING-CHANGE:")):
            probs.append(("breaking", f"line {n}: write 'BREAKING CHANGE:' in uppercase"))
    return header, probs


def git(repo, *args):
    try:
        out = subprocess.run(["git", "-C", repo, *args], capture_output=True,
                             text=True, check=True)
    except FileNotFoundError:
        raise UsageError("git is not installed or not on PATH")
    except subprocess.CalledProcessError as e:
        raise UsageError(f"git failed in {repo}: {e.stderr.strip()}")
    return out.stdout


def staged(repo):
    """Return the staged files with their status and line counts."""
    git(repo, "rev-parse", "--git-dir")  # fails with exit 2 outside a repo
    counts = {}
    for line in git(repo, "diff", "--cached", "--numstat", "--no-renames").splitlines():
        added, deleted, path = line.split("\t", 2)
        counts[path] = (added, deleted)
    files = []
    for line in git(repo, "diff", "--cached", "--name-status", "--no-renames").splitlines():
        status, path = line.split("\t", 1)
        added, deleted = counts.get(path, ("-", "-"))
        files.append({"status": status, "path": path,  # "-" = binary file
                      "added": int(added) if added.isdigit() else None,
                      "deleted": int(deleted) if deleted.isdigit() else None})
    return files


def main(argv):
    ap = argparse.ArgumentParser(add_help=False)  # bad options exit with 2
    ap.add_argument("-h", "--help", action="store_true")
    ap.add_argument("--staged", action="store_true")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--max-header", type=int, default=72)
    ap.add_argument("file", nargs="?")
    args = ap.parse_args(argv)
    if args.help:
        print(__doc__.strip())
        return 0
    if args.staged:
        files = staged(args.repo)
        if not files:
            print("nothing is staged; ask the user what to stage", file=sys.stderr)
        print(json.dumps({"staged": len(files), "files": files}, ensure_ascii=False, indent=2))
        return 0 if files else 1
    if not args.file:
        raise UsageError("give a message file (or - for stdin), or use --staged")
    if args.file == "-":
        text = sys.stdin.read()
    elif Path(args.file).is_file():
        text = Path(args.file).read_text(encoding="utf-8")
    else:
        raise UsageError(f"file not found: {args.file}")
    header, probs = check_message(text, args.max_header)
    print(json.dumps({"ok": not probs, "header": header,
                      "problems": [{"rule": r, "message": m} for r, m in probs]},
                     ensure_ascii=False, indent=2))
    return 1 if probs else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except UsageError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
```

### evals/evals.json

```json
{
  "skill_name": "writing-commit-messages",
  "evals": [
    {
      "id": 1,
      "prompt": "This is what I have staged right now (see evals/files/empty-password.diff). Write me a commit message for it, but don't commit yet.",
      "expected_output": "One Conventional Commits message, e.g. a fix(login) header about rejecting empty passwords, that the checker accepts, and no commit is made.",
      "files": ["evals/files/empty-password.diff"],
      "assertions": [
        "scripts/check_commit_msg.py exits 0 on the proposed message",
        "The type is fix",
        "The message does not mention issue numbers or Closes/Refs footers",
        "No git commit was run"
      ]
    },
    {
      "id": 2,
      "prompt": "幫我把暫存區的東西寫成 commit 訊息，內容在 evals/files/mixed-changes.diff",
      "expected_output": "指出暫存區混了兩件無關的事（README 文字、新增 logout），建議拆成兩個 commit，並各給一則符合格式的訊息。",
      "files": ["evals/files/mixed-changes.diff"],
      "assertions": [
        "The response suggests splitting the changes into two commits",
        "Each proposed message passes scripts/check_commit_msg.py",
        "No git add or git commit was run"
      ]
    },
    {
      "id": 3,
      "prompt": "commit message please, I think I staged everything",
      "expected_output": "The skill finds that nothing is staged, says so, and does not stage files itself.",
      "files": [],
      "assertions": [
        "The response says nothing is staged",
        "git add was not run",
        "No commit message is presented as ready to use"
      ]
    }
  ]
}
```

### evals/trigger-queries.json

```json
[
  { "query": "幫我寫這次的 commit 訊息，改動我已經 git add 了", "should_trigger": true, "split": "train" },
  { "query": "write a commit message for what I staged", "should_trigger": true, "split": "train" },
  { "query": "I fixed the login crash and staged it, commit it for me", "should_trigger": true, "split": "train" },
  { "query": "這次改動要怎麼描述比較好？我要提交了", "should_trigger": true, "split": "train" },
  { "query": "is 'Fixed stuff' an ok commit message for my staged changes? suggest a better one", "should_trigger": true, "split": "train" },
  { "query": "幫我看暫存區改了什麼，然後給我一行 commit 標題", "should_trigger": true, "split": "train" },
  { "query": "staged the README update, need a message in our feat/fix format", "should_trigger": true, "split": "validation" },
  { "query": "我加了登出功能也加進暫存區了，幫我提交", "should_trigger": true, "split": "validation" },
  { "query": "what should the commit say for these staged changes? keep it short", "should_trigger": true, "split": "validation" },
  { "query": "幫我寫 commit，這次是把 API 的 v1 拿掉，會影響舊的呼叫端", "should_trigger": true, "split": "validation" },
  { "query": "git rebase 和 git merge 差在哪？", "should_trigger": false, "split": "train" },
  { "query": "fix the typo in the last commit message, it's already pushed to main", "should_trigger": false, "split": "train" },
  { "query": "幫我把這個月的 commit 整理成 release notes", "should_trigger": false, "split": "train" },
  { "query": "how do I unstage a file I added by mistake?", "should_trigger": false, "split": "train" },
  { "query": "幫我寫一個 commit-msg hook，用 Node 檢查訊息格式", "should_trigger": false, "split": "train" },
  { "query": "write the PR description for this branch", "should_trigger": false, "split": "train" },
  { "query": "Conventional Commits 的 feat 跟 fix 會怎麼影響版本號？解釋就好", "should_trigger": false, "split": "validation" },
  { "query": "squash my last three commits into one", "should_trigger": false, "split": "validation" },
  { "query": "幫我回覆同事在 PR 上的 review 留言", "should_trigger": false, "split": "validation" },
  { "query": "generate a CHANGELOG.md from the git history", "should_trigger": false, "split": "validation" }
]
```
