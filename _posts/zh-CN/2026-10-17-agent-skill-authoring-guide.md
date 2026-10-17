---
title: "自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护"
description: "想自己写 Agent Skill？从 SKILL.md 的字段规则、能被正确触发的 description，到拆分参考文件与脚本、触发测试、跨 agent 检查和版本维护，用一个实际跑过的示例走一遍。"
date: 2026-10-17 23:10:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, skill-authoring, testing, claude-code, codex, cursor]
media_subpath: /assets/img/posts/agent-skill-authoring-guide/
image:
  path: cover.zh-CN.png
  alt: "skill 好不好用，先看 description 能否在对的时候被选中，再用脚本和测试确认输出，每次改版都重跑。"
---

每次让 AI 帮忙改博客文章，我都得再贴一遍同一串规则：英文标题不能超过 70 个字符、日期要带 `+0800`、封面图注要写成一句话的摘要……贴到第五次，就会开始想：能不能让它自己记住？

Agent Skill 就是干这个的。这篇从“写 skill 的人”的角度出发：什么时候值得写、文件怎么放、description 怎么写才会在对的时候被调出来、怎么测、换一个 agent 还能不能用，以及之后怎么维护。过程中我会实际做一个检查本站文章 front matter 的 skill。

这篇不讲怎么安装别人写好的 skill。想先用现成的，可以从 [mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)开始。

> 规范和各家工具的说法，都以 2026 年 10 月 17 日查阅的官方文档为准。这些文档的网址没有版本号，内容会更新，用之前请再核对一次。
>
> 示例 skill 的检查在 2026 年 10 月 17 日实际运行，使用 skills-ref 0.1.0（agentskills/agentskills commit `69ef37e`）和 Python 3.13.5，文中的命令和输出都是当时跑出来的。**触发率测试和输出质量评测没有实际运行**，原因写在“分三层测试”一节。
{: .prompt-info }

## 先认识几个词

| 词 | 一句话解释 |
| --- | --- |
| Skill | 一个文件夹，核心是给 AI 看的说明文件 `SKILL.md`，也可以附带脚本和参考资料。 |
| Front matter | 文件最上面两条 `---` 之间的配置区。`SKILL.md` 和本站的文章都有。 |
| YAML | 一种用“名称: 值”一行一行写配置的格式，front matter 就是用它写的。 |
| Context window | AI 一次能看到的文字量上限。常驻的内容越多，留给干活的空间就越少。 |
| Token | AI 计算文字长度的单位。字越多，token 就越多。 |

## 什么时候值得写成 Skill

Claude Code 的文档给了一个很实际的判断标准：你一直把[同一段指示、检查清单或多步骤流程贴进对话](https://code.claude.com/docs/en/skills)，或者 `CLAUDE.md` 里某一段已经从“事实”长成了“流程”，就该写成 skill。

区别在于加载的时机。`CLAUDE.md` 每次对话都会读进去；skill 的正文只在用到时才加载。同一份文档也写明，长篇参考资料在用到之前几乎不占成本。`AGENTS.md` 也是常驻的，每一行都有成本，[系列第 6 篇](/posts/mattpocock-skills-research-handoff/)讲过这一点。

反过来，也有不必写的时候。agentskills.io 的[最佳实践](https://agentskills.io/skill-creation/best-practices)说得很直接：如果 agent 没有这个 skill 也能把整件事做好，这个 skill 可能就没有价值。Anthropic 的[编写指南](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)建议先做评测：让 AI 在没有 skill 的情况下做几次有代表性的任务，记下它具体错在哪里，再写刚好能补上这些缺口的指示。

拿我的例子来说，AI 本来就懂 YAML，也知道 Jekyll 是什么，但它不知道“本站英文标题上限 70 个字符”“封面图注不能以「封面：」开头”这种只属于这个项目的规则。这正是 skill 该补上的东西。

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

这两种写法其实是冲突的：agentskills.io 明确要写“Use this skill when...”，而不是“This skill does...”；Anthropic 的例子却正是“Processes Excel files...”这种第三人称的句子。我的示例用的是折中写法，这是我自己的选择，不是哪份文档的建议：第一句用第三人称说它做什么，第二句用“Use this skill when...”列出场景，最后一句写明什么时候不用：

```yaml
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
```

最后那句“Do not use it for...”也有出处：优化指南建议，如果不该触发的查询总是误触发，就补上 skill **不**做什么，把它和相邻的能力区分开。

### 长度要算预算

description 的上限是 1024 个字符，但实际能用的空间通常更小，因为所有 skill 的列表要一起挤进 context window：

| 工具 | 列表预算 | 超出时 |
| --- | --- | --- |
| Claude Code | 整个列表占 context window 的 1%；每个 skill 的 `description` 加 `when_to_use` 在列表里截断在 1,536 个字符（[文档](https://code.claude.com/docs/en/skills)） | 从最少用到的 skill 开始去掉 description |
| Codex | 初始列表最多占 context window 的 2%，不知道 context window 大小时是 8,000 个字符（[文档](https://learn.chatgpt.com/docs/build-skills)） | 先缩短 description；skill 很多时可能整个略过，并显示警告 |

两家都建议**把关键用途放在最前面**，被截断时还能保住最重要的那几个词。我的 description 是 484 个字符，三段的顺序就是按这个原则排的。

## 一个 Skill 只做一件事

[agentskills.io](https://agentskills.io/skill-creation/best-practices#design-coherent-units) 用函数来打比方：一个 skill 应该是一个完整的工作单元。切得太细，一个任务要同时加载好几个 skill，指示可能互相打架；切得太粗，就很难在对的时候被精准调出来。Codex 的文档也只写了一句：[Keep each skill focused on one job](https://learn.chatgpt.com/docs/build-skills#best-practices)。

我的示例只管一件事：检查文章的 front matter，有问题就改到通过。翻译、生成封面、改正文错别字，都不在它的范围里。

命名方面，Anthropic [建议用动名词](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#naming-conventions)，比如 `processing-pdfs`，名词短语（`pdf-processing`）也可以接受；要避开 `helper`、`utils` 这种看不出在干什么的名字。所以示例叫 `checking-post-front-matter`。

### 谁能启动它

有些 skill 不该让 AI 自己决定什么时候运行。各家的开关不一样：

| 工具 | 配置 | 效果 |
| --- | --- | --- |
| Claude Code | `disable-model-invocation: true` | Claude 不会自己启动，只能你输入 `/名称` 来调用（[文档](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)） |
| Claude Code | `user-invocable: false` | 你不能用 `/名称` 调用它，只有 Claude 能启动 |
| Cursor | `disable-model-invocation: true` | 只有明确输入 `/skill-name` 时才加载（[文档](https://cursor.com/docs/skills#disabling-automatic-invocation)） |
| Codex | `agents/openai.yaml` 里的 `policy.allow_implicit_invocation: false` | 不会根据提示自动启动，仍然可以用 `$skill` 显式调用（[文档](https://learn.chatgpt.com/docs/build-skills#optional-metadata)） |

Claude Code 的文档建议，有副作用或者你想自己控制时机的流程，比如 `/commit`、`/deploy`，就设成只能手动，因为你不会想让 Claude 觉得“代码看起来没问题了”就自己去部署。实际例子可以看[系列第 4 篇的 `implement`](/posts/mattpocock-skills-implementation-feedback-loops/)，它同时设了 Claude Code 和 Codex 两种开关。

这里有个需要注意的取舍：`disable-model-invocation` 和 `user-invocable` 都不在规范的六个字段里。写进 `SKILL.md`，在 Claude Code 和 Cursor 里有效，但 claude.ai 上传和 Skills API 会拒收，后面的 `skills-ref` 检查也会报错。Codex 把同样的配置放在另一个文件 `agents/openai.yaml` 里，`SKILL.md` 本身就能保持只有规范字段。我的示例只读文件、不改任何东西，让 AI 自己决定要不要用没有风险，所以两种开关都没设。

## 把细节拆到参考文件和脚本

![渐进式披露三层：name 和 description 在启动时就加载，SKILL.md 正文在触发时才读，参考文件和脚本只在需要时才用](progressive-disclosure.zh-CN.png){: width="800" height="450" }
_同一个 skill 分三层加载：越往下越大，但越晚才进入 context window。_

[规范](https://agentskills.io/specification#progressive-disclosure)把一个 skill 分成三层：

1. **Metadata**（约 100 tokens）：`name` 和 `description`，启动时就加载所有 skill 的这一层。
2. **正文**（建议少于 5000 tokens）：整份 `SKILL.md`，skill 被启动时才读。
3. **资源**：`scripts/`、`references/`、`assets/` 里的文件，需要时才加载。

规范还建议 `SKILL.md` 主文件控制在 500 行以内，文件引用只往下一层。Anthropic 的编写指南解释了原因：Claude 读到“被引用的文件里又引用了别的文件”时，[可能只用 `head -100` 这类命令看前几行](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-deeply-nested-references)，结果拿到的信息不完整。所以参考文件都要直接从 `SKILL.md` 链接过去；超过 100 行的参考文件，开头要放一份目录。

光把文件拆开还不够，还要写明**什么时候**读哪个文件。agentskills.io 的例子是“[API 返回非 200 时，读 `references/api-errors.md`](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)”，这比“详见 references/”有用得多。我的示例是这样写的：

```markdown
Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.
```

### 脚本是拿来运行的

脚本和参考文件最大的区别：按照 [Anthropic 的说明](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#level-3-resources-and-code-loaded-as-needed)，脚本是通过 bash 运行的，代码本身不会进入 context，只有输出会占 token。编写指南也提醒，要在指示里[写清楚是“运行它”还是“当参考来读”](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#provide-utility-scripts)。

能用程序检查的规则，就别用文字让 AI 自己判断。我的示例把八条规则全写进脚本，`SKILL.md` 只告诉 AI 怎么运行、怎么读结果。脚本按照 [agentskills.io 的脚本指南](https://agentskills.io/skill-creation/using-scripts#designing-scripts-for-agentic-use)设计：

| 指南的要求 | 示例怎么做 |
| --- | --- |
| 不能有交互式提问（agent 跑的是非交互式 shell，等输入会一直卡住） | 所有输入都通过参数传入，没给路径就直接报错退出 |
| 提供 `--help` | `--help` 列出参数、输出格式、exit code 和示例 |
| 错误信息要说清楚哪里错、该怎么改 | 比如 `--now needs a UTC offset, e.g. +08:00` |
| 数据输出到 stdout，诊断信息输出到 stderr | 结果是一个 JSON 对象；“正在检查哪个文件”写到 stderr |
| exit code 有意义，并写在 `--help` 里 | 0 通过、1 有问题、2 用法错误 |
| 输出长度可预期 | 默认只列出有问题的文件，加 `--all` 才列出全部 |

实际的 `--help` 输出：

```console
$ python3 scripts/check_front_matter.py --help
Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language comes from the folder right after _posts/: en -> en,
zh-CN -> zh-CN, anything else -> zh-TW. Outside _posts/, only the file's
parent folder counts. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
```

### 依赖要写明

脚本指南也建议[在 `SKILL.md` 里写明前置要求](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，不要假设 agent 的环境已经装好；运行时层面的要求可以写在 `compatibility` 字段里。用 `npx` 这类一次性命令时要锁定版本，比如写 `npx eslint@9.0.0`。Anthropic 的编写指南也有一节就叫“[不要假设工具已经安装](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-assuming-tools-are-installed)”。

我跑示例的机器上，`python3` 没有装 PyYAML，所以脚本只用标准库，只解析需要的那几个字段。这个限制写进了 `compatibility` 和 Gotchas。如果改用 PyYAML，就要用 [PEP 723](https://peps.python.org/pep-0723/) 在脚本里声明依赖，并在 `SKILL.md` 里写明怎么运行。

## 动手：写一个检查文章 Front Matter 的 Skill

示例的完整结构：

```console
$ find checking-post-front-matter -type f | sort
checking-post-front-matter/SKILL.md
checking-post-front-matter/evals/evals.json
checking-post-front-matter/evals/files/2026-10-01-bad-zh.md
checking-post-front-matter/evals/files/en/2026-10-01-bad-en.md
checking-post-front-matter/evals/files/en/2026-10-01-good-en.md
checking-post-front-matter/evals/files/en/2026-10-01-no-image-en.md
checking-post-front-matter/evals/trigger-queries.json
checking-post-front-matter/references/site-rules.md
checking-post-front-matter/scripts/check_front_matter.py
```

`evals/` 是测试用的文件，后面“分三层测试”会用到。下面是每个文件的完整内容。

### SKILL.md

````markdown
---
name: checking-post-front-matter
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
compatibility: Requires python3 (tested with 3.13). Standard library only, no PyYAML.
metadata:
  version: "1.0"
---

# Checking Post Front Matter

## Steps

1. Run the checker on the files you changed, from the skill directory:
   `python3 scripts/check_front_matter.py <post file or directory> ...`
   For a new post, pass all three language files (`_posts/`, `_posts/zh-CN/`, `_posts/en/`).
2. Read the JSON on stdout. Exit code 0 means every file passed, 1 means
   at least one problem, 2 means the command itself was wrong (see stderr).
3. Fix each problem in the post, then run the checker again. Stop only when
   it exits 0.
4. Tell the user which files you checked and what you changed. If you
   shortened a title or description, show the old and new text.

Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.

## Gotchas

- The script uses only the Python standard library, so it parses a small
  subset of YAML: one-line `key: value` pairs, `image:` with indented
  `path` / `alt`, and `categories` as `[a, b]` or a `- item` list. A block
  scalar (`|` or `>`) is reported as a `yaml` problem. Rewrite that value
  on one line instead of installing PyYAML.
- Language comes from the folder right after `_posts/`: `en/` is English,
  `zh-CN/` is Simplified Chinese, anything else is Traditional Chinese.
  Outside `_posts/` only the parent folder counts; use `--lang` if unsure.
- `date-future` compares with the machine clock. Jekyll skips future posts
  at build time, so do not "fix" it by building with `--future`; move the
  date to a time that has already passed.
- Lengths count Unicode characters (Python `len`), so one Chinese character
  counts as 1.
- The checker never edits files. Make the fixes yourself.
````

步骤只有四步，第 3 步就是 agentskills.io 说的[验证循环](https://agentskills.io/skill-creation/best-practices#validation-loops)：做完就跑检查，有错就改，改完再跑，直到通过为止。

Gotchas 是 agentskills.io 认为很多 skill 里[最有价值的部分](https://agentskills.io/skill-creation/best-practices#gotchas-sections)：不是泛泛的建议，而是“不说 AI 就一定会做错”的具体事实。像“日期在未来就别用 `--future` 硬 build”这一条，来自本站上一篇系列导读的实际经历：日期设得比 build 时间晚，Jekyll 就直接跳过了那篇文章。

### references/site-rules.md

```markdown
# Site Rules Behind Each Check

Each `rule` in the checker's output maps to one rule below.

| rule | What it enforces | Why |
| --- | --- | --- |
| `required` | `title`, `description` and `date` exist and are not empty | Chirpy uses them for the post page, home cards and SEO metadata |
| `length` | English `title` ≤ 70 characters, `description` ≤ 160 | Longer text gets cut off in search results and cards |
| `date-format` | `YYYY-MM-DD HH:MM:SS +0800` (any `+/-HHMM` offset) | Writing the offset keeps the publish day the same on every machine and in CI |
| `date-future` | `date` is not later than now | Jekyll does not build posts dated in the future |
| `categories` | At most 2 entries | Chirpy's category hierarchy has two levels |
| `alt` | Checked only when the post has a cover (`image`): `image.alt` exists; Chinese ≤ 60 characters, English ≤ 140; does not start with 「封面：」 or 「本文」; differs from `description` | Chirpy uses the alt as the cover's alt text, the caption under the cover and the home card's alt text, so it should be a one-sentence summary of the post |
| `yaml` | The value could be read by the checker's YAML subset | See the Gotchas in SKILL.md |
| `front-matter` | The file starts with a `---` block and closes it | Without it, Jekyll treats the file as having no front matter |

Source: the repo's `docs/chirpy-post-authoring.md`.
```

### scripts/check_front_matter.py

```python
#!/usr/bin/env python3
"""Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language comes from the folder right after _posts/: en -> en,
zh-CN -> zh-CN, anything else -> zh-TW. Outside _posts/, only the file's
parent folder counts. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

LIMITS = {"en": {"title": 70, "description": 160, "alt": 140},
          "zh-TW": {"alt": 60}, "zh-CN": {"alt": 60}}
BAD_ALT_PREFIXES = ("封面：", "封面:", "本文")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$")


class UsageError(Exception):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise UsageError(f"{message}; run with --help to see the options")


def unquote(raw):
    """Return the scalar value of a one-line YAML value (subset only)."""
    v = raw.strip()
    if not v:
        return ""
    if v[0] == '"':
        end = v.rfind('"')
        if end == 0:
            raise ValueError("unclosed double quote")
        return json.loads(v[: end + 1])  # YAML double quotes ~ JSON escapes
    if v[0] == "'":
        end = v.rfind("'")
        if end == 0:
            raise ValueError("unclosed single quote")
        return v[1:end].replace("''", "'")
    if v[0] in "|>":
        raise ValueError("block scalars (| or >) are not supported")
    return re.sub(r"\s+#.*$", "", v)


def parse_list(raw):
    v = raw.strip()
    if not (v.startswith("[") and v.endswith("]")):
        return None
    inner = v[1:-1].strip()
    return [unquote(x) for x in inner.split(",")] if inner else []


def read_front_matter(text):
    """Parse the keys this checker needs. Returns (fields, problems)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, [("front-matter", "", "file does not start with a --- line")]
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return None, [("front-matter", "", "no closing --- line")]
    fields, problems, parent = {}, [], None
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"^(\s*)([A-Za-z_][\w-]*):(.*)$", line)
        if not m:
            if parent == "categories" and line.strip().startswith("- "):
                fields["categories"].append(unquote(line.strip()[2:]))
            continue
        indent, key, value = m.groups()
        key = key if not indent else f"{parent}.{key}"
        if not indent:
            parent = key
        try:
            if key == "categories":
                lst = parse_list(value)
                fields[key] = lst if lst is not None else []
            elif value.strip():
                fields[key] = unquote(value)
        except ValueError as e:
            problems.append(("yaml", key, f"line {n}: {e}"))
    return fields, problems


def lang_of(path, forced):
    if forced:
        return forced
    parts = path.resolve().parts
    if "_posts" in parts:
        last = len(parts) - 1 - parts[::-1].index("_posts")
        folder = parts[last + 1] if last + 2 < len(parts) else ""
    else:
        folder = path.resolve().parent.name
    return folder if folder in ("en", "zh-CN") else "zh-TW"


def check(path, lang, now):
    probs = []
    fields, parse_probs = read_front_matter(path.read_text(encoding="utf-8"))
    probs += parse_probs
    if fields is None:
        return probs
    for key in ("title", "description", "date"):
        if not fields.get(key):
            probs.append(("required", key, f"'{key}' is missing or empty"))
    lim = LIMITS[lang]
    for key in ("title", "description"):
        if key in lim and fields.get(key) and len(fields[key]) > lim[key]:
            probs.append(("length", key,
                          f"{len(fields[key])} characters, limit is {lim[key]} for {lang}"))
    date = fields.get("date")
    if date:
        m = DATE_RE.match(date)
        if not m:
            probs.append(("date-format", "date",
                          f"'{date}' must look like YYYY-MM-DD HH:MM:SS +0800"))
        else:
            when = datetime.strptime(date, "%Y-%m-%d %H:%M:%S %z")
            if when > now:
                probs.append(("date-future", "date",
                              f"{date} is later than {now.isoformat(timespec='seconds')}; "
                              "Jekyll skips future posts at build time"))
    cats = fields.get("categories")
    if cats is not None and len(cats) > 2:
        probs.append(("categories", "categories",
                      f"{len(cats)} levels, Chirpy supports at most 2"))
    has_image = any(k == "image" or k.startswith("image.") for k in fields)
    alt = fields.get("image.alt")
    if has_image and not alt:
        probs.append(("alt", "image.alt",
                      "'image.alt' is missing or empty; posts with an image need one"))
    elif alt:
        if len(alt) > lim["alt"]:
            probs.append(("alt", "image.alt",
                          f"{len(alt)} characters, limit is {lim['alt']} for {lang}"))
        if alt.startswith(BAD_ALT_PREFIXES):
            probs.append(("alt", "image.alt",
                          "must not start with 「封面：」 or 「本文」; write a one-sentence summary"))
        if alt == fields.get("description"):
            probs.append(("alt", "image.alt", "is identical to 'description'"))
    return probs


def main(argv):
    ap = Parser(add_help=False)
    ap.add_argument("-h", "--help", action="store_true")
    ap.add_argument("--lang", choices=sorted(LIMITS))
    ap.add_argument("--now")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("paths", nargs="*")
    args = ap.parse_args(argv)
    if args.help:
        print(__doc__.strip())
        return 0
    if not args.paths:
        raise UsageError("give at least one post file or directory, "
                         "e.g. python3 scripts/check_front_matter.py _posts/en")
    try:
        now = (datetime.fromisoformat(args.now) if args.now
               else datetime.now().astimezone())
    except ValueError:
        raise UsageError(f"--now must be an ISO time such as "
                         f"2026-10-17T23:00:00+08:00, got '{args.now}'")
    if now.tzinfo is None:
        raise UsageError("--now needs a UTC offset, e.g. +08:00")
    files = []
    for p in map(Path, args.paths):
        if p.is_dir():
            files += sorted(p.rglob("*.md"))
        elif p.is_file():
            files.append(p)
        else:
            raise UsageError(f"path not found: {p}")
    if not files:
        raise UsageError("no .md files found in the given paths")
    results, failed = [], 0
    for f in files:
        lang = lang_of(f, args.lang)
        print(f"checking {f} as {lang}", file=sys.stderr)
        probs = check(f, lang, now)
        failed += bool(probs)
        if probs or args.all:
            results.append({"file": str(f), "lang": lang, "ok": not probs,
                            "problems": [{"rule": r, "field": k, "message": m}
                                         for r, k, m in probs]})
    print(json.dumps({"checked": len(files), "failed": failed, "results": results},
                     ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except UsageError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
```

### 跑一次

对 `evals/files/` 里的四个测试文件跑一次。其中两个是故意写错的；另外两个是正确的，一个有封面、一个没有封面：

```console
$ python3 scripts/check_front_matter.py evals/files
checking evals/files/2026-10-01-bad-zh.md as zh-TW
checking evals/files/en/2026-10-01-bad-en.md as en
checking evals/files/en/2026-10-01-good-en.md as en
checking evals/files/en/2026-10-01-no-image-en.md as en
{
  "checked": 4,
  "failed": 2,
  "results": [
    {
      "file": "evals/files/2026-10-01-bad-zh.md",
      "lang": "zh-TW",
      "ok": false,
      "problems": [
        {
          "rule": "date-future",
          "field": "date",
          "message": "2030-01-01 09:00:00 +0800 is later than 2026-10-17T23:33:41+08:00; Jekyll skips future posts at build time"
        },
        {
          "rule": "categories",
          "field": "categories",
          "message": "3 levels, Chirpy supports at most 2"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "must not start with 「封面：」 or 「本文」; write a one-sentence summary"
        }
      ]
    },
    {
      "file": "evals/files/en/2026-10-01-bad-en.md",
      "lang": "en",
      "ok": false,
      "problems": [
        {
          "rule": "length",
          "field": "title",
          "message": "83 characters, limit is 70 for en"
        },
        {
          "rule": "length",
          "field": "description",
          "message": "169 characters, limit is 160 for en"
        },
        {
          "rule": "date-format",
          "field": "date",
          "message": "'2026-10-01 09:00:00' must look like YYYY-MM-DD HH:MM:SS +0800"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "'image.alt' is missing or empty; posts with an image need one"
        }
      ]
    }
  ]
}
```

exit code 是 1。前四行是写到 stderr 的进度信息，后面的 JSON 是 stdout。两个正确的文件都没有出现在 `results` 里，因为默认只列出有问题的文件。用法错误时 exit code 是 2：

```console
$ python3 scripts/check_front_matter.py evals/files/nope.md
Error: path not found: evals/files/nope.md
```

接着对本站 main 分支（commit `636e148`）上的 36 个文章文件全部跑一次。结果是 36 个文件里有 2 个不合规，都是英文标题超过 70 个字符：OpenWiki 那篇 72 个字符，供应链安全那篇 79 个字符。另外有 3 篇文章的三语版本没有封面图，所以不检查 alt，也不算问题。

这些我只记录了下来，没有在这次一起改。

还有一个意外收获：我用它检查这篇文章自己的三个语言文件，第一次就被拦了下来。我把日期设成 23:20，跑检查时才 23:18，三个文件都报了 `date-future`。如果直接 build，这篇文章就不会出现在网站上。

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

验证示例 skill，通过时只有一行，exit code 是 0：

```console
$ skills-ref validate checking-post-front-matter
Valid skill: checking-post-front-matter
```

接着故意做三个错误版本，各跑一次，exit code 都是 1。

名称里有连续的 `--`：

```console
$ skills-ref validate bad--name
Validation failed for bad--name:
  - Skill name cannot contain consecutive hyphens
```

文件夹名称和 `name` 对不上：

```console
$ skills-ref validate check-front-matter
Validation failed for check-front-matter:
  - Directory name 'check-front-matter' must match skill name 'checking-post-front-matter'
```

加了一个 Claude Code 专属的字段 `when_to_use`：

```console
$ skills-ref validate checking-post-front-matter
Validation failed for checking-post-front-matter:
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

我给示例写了 20 条查询，10 条该触发、10 条不该触发，训练集 12 条、验证集 8 条，两组里该触发和不该触发的各占一半。`split` 是我自己加的字段，用来把分组固定下来，指南的示例格式只有 `query` 和 `should_trigger`：

```json
[
  { "query": "我剛寫完 _posts/en/2026-10-20-new-post.md，開 PR 前幫我確認 front matter 都沒問題", "should_trigger": true, "split": "train" },
  { "query": "is my english title too long? its the one in _posts/en/2026-10-18-agent-skills.md", "should_trigger": true, "split": "train" },
  { "query": "我把三語的 description 都改短了，幫我看看還有沒有超過限制", "should_trigger": true, "split": "train" },
  { "query": "Build passed locally but my new post doesn't show up on the site. The date is 2026-10-17 23:40:00 +0800, what's wrong?", "should_trigger": true, "split": "train" },
  { "query": "封面下面那行字要怎麼寫才對？幫我檢查 _posts/zh-CN/ 這篇的 alt", "should_trigger": true, "split": "train" },
  { "query": "Before I open the PR for the agent-skill post, run whatever checks the site needs on the three post files", "should_trigger": true, "split": "train" },
  { "query": "幫我把這篇文章的分類改成 [AI, skills, 教學]，改完確認一下格式", "should_trigger": true, "split": "validation" },
  { "query": "I edited the title and image alt on yesterday's post, can you make sure I didn't break any of our rules", "should_trigger": true, "split": "validation" },
  { "query": "review the metadata block at the top of _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md", "should_trigger": true, "split": "validation" },
  { "query": "新文章三個語言版本都寫好了，PR 前最後檢查一下標題長度跟日期", "should_trigger": true, "split": "validation" },
  { "query": "幫我修正 _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md 第 40 行的錯字", "should_trigger": false, "split": "train" },
  { "query": "what's the difference between a YAML block scalar with | and >?", "should_trigger": false, "split": "train" },
  { "query": "我的 _config.yml 縮排好像錯了，jekyll build 報 YAML 錯誤", "should_trigger": false, "split": "train" },
  { "query": "Can you translate this zh-TW post into English and put it under _posts/en/?", "should_trigger": false, "split": "train" },
  { "query": "幫我寫一個 GitHub Actions workflow，每次 push 都跑 jekyll build 和 htmlproofer", "should_trigger": false, "split": "train" },
  { "query": "the cover image looks blurry on the home page, can you regenerate it at 2x?", "should_trigger": false, "split": "train" },
  { "query": "Check the front matter of this Hugo post: content/posts/hello.md uses TOML between +++ lines", "should_trigger": false, "split": "validation" },
  { "query": "幫我想三個比較吸引人的英文標題，主題是自己寫 Agent Skill", "should_trigger": false, "split": "validation" },
  { "query": "Our SKILL.md frontmatter fails skills-ref validate, can you see why?", "should_trigger": false, "split": "validation" },
  { "query": "Chirpy 的 tags 和 categories 差在哪？解釋就好，不用動任何檔案", "should_trigger": false, "split": "validation" }
]
```

几条值得说明的相近题：“修正第 40 行的错字”改的是同一篇文章，但只动正文；“Hugo 文章的 front matter”说的是同一个词，但格式是 TOML，不在示例的范围内；“SKILL.md 的 frontmatter 验证失败”连 frontmatter 这个词都一样，要的却是 skills-ref。

> **本文没有实际运行触发率测试。** 触发测试要在真正的 agent 里跑，看它有没有去读 `SKILL.md`。我跑示例的机器上没有 `claude`、`codex`、`cursor-agent`、`gemini`、`copilot` 这些 CLI（实际用 `command -v` 检查过），所以这里只有题目和方法，没有任何触发率数字。你可以把这份 JSON 拿到自己的 agent 里，按指南的方法跑。
{: .prompt-warning }

### 输出检查

被调出来之后，还得做对。agentskills.io 的[输出评测指南](https://agentskills.io/skill-creation/evaluating-skills)建议把测试题放在 `evals/evals.json`，每道题包括用户会怎么问（`prompt`）、成功是什么样子（`expected_output`）、需要的文件（`files`），看过第一轮结果后再补上能客观检查的 `assertions`。指南建议先从 2–3 道题开始：

```json
{
  "skill_name": "checking-post-front-matter",
  "evals": [
    {
      "id": 1,
      "prompt": "I just wrote evals/files/en/2026-10-01-bad-en.md. Can you check whether its front matter is OK before I open a PR, and tell me what to fix?",
      "expected_output": "A list of every front matter problem in the file (title and description too long, date without a UTC offset, missing image.alt), each with a concrete fix.",
      "files": ["evals/files/en/2026-10-01-bad-en.md"],
      "assertions": [
        "The response says the title is longer than 70 characters",
        "The response says the description is longer than 160 characters",
        "The response says the date has no +0800-style offset",
        "The response says image.alt is missing",
        "The response does not claim the file passes"
      ]
    },
    {
      "id": 2,
      "prompt": "幫我看一下 evals/files/2026-10-01-bad-zh.md 的封面圖說和日期有沒有問題，我覺得怪怪的",
      "expected_output": "指出 alt 以「封面：」開頭、日期在未來會被 Jekyll 跳過、categories 超過兩層，並建議怎麼改。",
      "files": ["evals/files/2026-10-01-bad-zh.md"],
      "assertions": [
        "The response says image.alt must not start with 「封面：」",
        "The response says the 2030 date is in the future and the post would be skipped at build time",
        "The response says categories has 3 levels and the limit is 2",
        "The response does not suggest building with --future as the fix"
      ]
    },
    {
      "id": 3,
      "prompt": "Quick sanity check on evals/files/en/2026-10-01-good-en.md before I push, nothing fancy",
      "expected_output": "A short confirmation that the file has no front matter problems, without inventing issues.",
      "files": ["evals/files/en/2026-10-01-good-en.md"],
      "assertions": [
        "The response says the file passes",
        "The response does not list any front matter problem",
        "No file was modified"
      ]
    }
  ]
}
```

每道题要跑两次：一次有 skill，一次没有（改版时则用旧版做对照），每次都要从干净的 context 开始。assertion 要能客观判断，像“输出是合法的 JSON”就比“输出很好”有用。指南也提到，机械性的检查用脚本做，比让 LLM 判断更可靠。拿这个示例来说，第 3 题的“没有改动任何文件”，用 `git status` 就能判断，不必让 AI 打分。

Anthropic 的编写指南还多提醒了一点：skill 的效果和搭配的模型有关，[要用你打算搭配的所有模型都测一遍](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#test-with-all-models-you-plan-to-use)。

> **本文没有实际运行输出评测。** 原因和触发测试一样：没有可用的 agent，所以没有“有 skill”和“没有 skill”的对照结果。上面的 `evals.json` 只是写好的题目。
{: .prompt-warning }

这三道题倒是先帮我抓到一个错误，不过错的是测试文件，不是脚本。我第一次跑的时候，故意写错的英文测试文件，description 其实只有 156 个字符，脚本也正确地没有报错，但 `evals.json` 预期它要超过 160。结果和预期对不上时，要回头检查的不只是 skill，还有测试本身。输出评测指南也特别提醒，[要审查 assertion 本身](https://agentskills.io/skill-creation/evaluating-skills#grading-principles)，不能只看结果。

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

我没有在任何一个 agent 里实际运行过这个 skill，所以不能说“已在 X 上测过”。能做的是静态可移植性检查，也就是不运行 agent，只看文件本身：

| 检查 | 结果 |
| --- | --- |
| frontmatter 只用规范的六个字段 | 是：`name`、`description`、`compatibility`、`metadata`，`skills-ref validate` 通过 |
| 写了 `name`，而且和文件夹同名 | 是。Codex 文档写明 `SKILL.md` 必须包含 `name` 和 `description`；Cursor 也要求 `name` 和文件夹同名 |
| 没用任何工具专属的正文语法 | 是。没有用 Claude Code 的 `` !`命令` `` 动态注入，也没用 `${CLAUDE_SKILL_DIR}`；脚本路径都相对于 skill 根目录，这是[脚本指南](https://agentskills.io/skill-creation/using-scripts#referencing-scripts-from-skill-md)的建议 |

最后一点要特别说明。Claude Code 的 `` !`命令` `` 会在 Claude 看到 skill 之前先运行命令，把输出塞进正文；`${CLAUDE_SKILL_DIR}` 则会被替换成 skill 所在的文件夹。Claude Code 的文档以动态注入为例写明，这类只属于 Claude Code 的正文功能，[在 claude.ai 和 API 上不会生效](https://code.claude.com/docs/en/skills)。其他工具我没找到文档说明，所以只能说：**不能假设它们会生效**。

## 版本与维护

规范里和版本有关的，只有 `metadata` 可以放一个 `version: "1.0"`，但它没有定义版本号代表什么。用 git tag 或 CHANGELOG 管理版本是惯例，不是规范；我的建议是每次改 description 或脚本的行为，都打一个 tag，写一行变更说明。

改版的流程，输出评测指南给了一个很实用的做法：[改之前先把旧版复制一份](https://agentskills.io/skill-creation/evaluating-skills#spawning-runs)，用旧版做对照组（放在 `old_skill/`），对同一组题目重跑。这样才知道新版是真的变好了，还是只是换了一种错法。

另外三个维护习惯：

- **不要写会过时的信息。** Anthropic 的编写指南建议，已经不用的做法[收进一个“old patterns”区块](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-time-sensitive-information)，别混在主要步骤里。
- **每纠正一次 AI，就补一条 Gotcha。** agentskills.io 说，这是[改进 skill 最直接的方法之一](https://agentskills.io/skill-creation/best-practices#gotchas-sections)。
- **定期清理没在用的 skill。** 每个 skill 都会占用前面说的列表预算，不管有没有用到。Claude Code 的 `/skill-doctor` 可以列出每个 skill 的成本和使用次数，[需要 v2.1.252 及以上](https://code.claude.com/docs/en/skills#find-unused-skills)。

## 作者该替用户做的安全准备

装别人的 skill 有哪些风险、用户该怎么检查，[这篇供应链安全的文章](/posts/coding-agent-supply-chain-permission-risks/)已经整理过了。这里只讲写 skill 的人能提前做好的事：

- **不要让 skill 抓取外部网址的内容当指示。** Anthropic 的文档写明，[会抓取外部数据的 skill 风险特别高](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#security-considerations)，抓回来的内容可能藏着恶意指令；即使是可信的 skill，外部依赖一变也可能被污染。
- **`allowed-tools` 给到最小。** 这个字段在 Claude Code 里，会让 skill 在被调用的那一轮不经询问就使用列出的工具。文档特别写明，[workspace trust 管不住这个字段](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)：仓库里的 skill 可以给自己开权限，即使在从没信任过的文件夹里用 `-p` 运行也会生效。示例没有用这个字段。
- **脚本里不放任何机密信息。** 这是我的做法，不是哪份文档的规定：密钥、令牌一律从环境变量读取，不写进 skill 的任何文件，因为整个文件夹都会被分享、被提交到仓库。
- **依赖要锁定版本。** 脚本指南要求[一次性命令写明版本](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，这样同一条命令隔一段时间再跑，结果也一样。
- **会改东西的操作要提供 `--dry-run`。** 脚本指南建议，破坏性或会改变状态的操作，[让 agent 能先预览会发生什么](https://agentskills.io/skill-creation/using-scripts#further-considerations)。示例的脚本只读文件、从不写文件，所以不需要这个参数。

用户会把你的 skill 当成软件来审查，那你能做的，就是让它容易审：文件少、每个脚本干什么一看就懂、不连到外面的东西。

## 我的判断

以下是我的观点，不是哪份文档的结论。

**最值得花时间的是 description 和 Gotchas。** 文件夹结构、字段规则这些，按规范做一次就好，`skills-ref` 也会帮你查错。真正决定 skill 好不好用的，是它会不会在对的时候被调出来，以及调出来之后会不会踩到你早就知道的坑。

**能写成脚本的规则，就写成脚本。** 示例的八条规则，如果写成文字让 AI 自己数字符，每次都可能数错；写成脚本，结果每次都一样，AI 只负责读结果、改文章。

**为了跨 agent，宁可放弃一些方便的字段。** `when_to_use`、`disable-model-invocation` 在 Claude Code 里都很好用，但一写进 `SKILL.md`，就过不了 skills-ref 和 claude.ai 上传。如果这个 skill 只给自己在 Claude Code 里用，那没关系；要给团队、跨工具用，我会只用六个字段。

**没跑过触发测试的 description，只是一个猜测。** 这篇的示例也一样。我写了 20 条题目，但在真正跑过之前，我并不知道它会不会在“帮我看看标题长度”的时候被调出来。

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

本站相关文章：

- [mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)：想先用现成的 skill
- [系列第 6 篇](/posts/mattpocock-skills-research-handoff/)：`writing-for-agents` 的写作原则
- [系列第 4 篇](/posts/mattpocock-skills-implementation-feedback-loops/)：只能手动启动的 skill 实例
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：用户端的风险与检查清单
