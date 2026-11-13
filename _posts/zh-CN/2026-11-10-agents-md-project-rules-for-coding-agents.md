---
title: "AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则"
description: "同时使用 Codex 和 Claude Code 时，不必维护两份互相脱节的规则。这篇文章教你怎么写 AGENTS.md、两个工具各自怎么读，以及怎么让一份文件两边共用。"
date: 2026-11-10 18:00:00 +0800
categories: [AI, 软件开发]
tags: [coding-agent, codex, claude-code, workflow, documentation]
media_subpath: /assets/img/posts/agents-md-project-rules-for-coding-agents/
image:
  path: cover.webp
  alt: "把项目规则写进一份 AGENTS.md，让 Codex 和 Claude Code 都读得到，也知道该放在哪里。"
---

我同时打开 Codex 和 Claude Code 两个工具时，最怕同一套项目规则写了两份，改了一边、另一边却还是旧的。

先说 coding agent 是什么：它是一种 AI 编程助手，你用平常的句子交代工作，它会自己打开项目里的文件、修改内容、运行命令。本文谈的 Codex（OpenAI 的工具）和 Claude Code（Anthropic 的工具）都属于这一类。它们要靠项目里的说明，才知道测试怎么跑、哪些文件不能碰、提交变更前要做什么。

AGENTS.md 就是写给这些助手看的 README。README 是很多项目最上层都会放的说明文件，告诉第一次来的人“这是什么、怎么开始”；AGENTS.md 则是把类似的事写给 AI 助手看。它用 Markdown 来写（一种纯文本格式，用 `#` 标出标题、用 `-` 列出清单，扩展名是 `.md`），没有必填字段，标题也可以自己取。这个格式由 Linux Foundation 旗下的 [Agentic AI Foundation](https://agents.md/) 维护。

这篇文章只谈怎么写这份文件，以及 [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 和 [Claude Code](https://code.claude.com/docs/en/memory#agents-md) 的官方文档分别怎么说它们会读哪些文件。我不会写成“所有工具都一样”，也不会列出其他还没查证的产品。

如果你想用一套 skill（打包好的做事流程，助手用到时才加载）帮项目生成规则，请看 [mattpocock/skills 系列（1）：先设置项目规则，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)。那一篇讲的是那套 skill 的流程；本文讲的是文件格式本身，以及这两个工具实际怎么读。

> **版本说明**：本文依据 2026-11-10（台北时间）读取的 [Codex AGENTS.md 说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 记忆与 CLAUDE.md 说明](https://code.claude.com/docs/en/memory)（含 [AGENTS.md 段落](https://code.claude.com/docs/en/memory#agents-md)），以及 [AGENTS.md 格式官网](https://agents.md/)。当天 npm 上最新的 Codex CLI 是 0.167.0，Claude Code 是 2.1.322。之后的版本或文档可能会改变读取规则。
{: .prompt-info }

## 开始之前：先认识几个词

如果你不是工程师，下面这几个词会反复出现。先花一分钟看一遍，后面会好读很多：

- **repo（代码仓库）**：存放一个项目所有文件的文件夹，通常用 Git（记录每一次修改的版本管理工具）来管理。
- **根目录**：repo 最上层的那个文件夹。用 Git 管理的项目，根目录通常就是里面有隐藏文件夹 `.git` 的那一层。
- **子目录**：文件夹里的文件夹。例如 `services/payments/`，就是 `services` 文件夹里的 `payments` 文件夹。
- **终端**：通过输入文字来执行命令的窗口。本文标为 `bash` 的代码块，都是在这里运行的命令。
- **当前工作目录**：你启动 Codex 或 Claude Code 时，终端所在的那个文件夹，不一定是根目录。例如先输入 `cd services/payments`（`cd` 是切换文件夹的命令）再启动，当前工作目录就是 `services/payments`。
- **`~`（主目录）**：代表你自己的用户文件夹。`~/.codex/AGENTS.md` 的意思是“用户文件夹里、`.codex` 文件夹中的 AGENTS.md”。名称以点开头的文件夹常被文件管理器隐藏，找不到时请打开“显示隐藏文件”。
- **import（导入）**：在 CLAUDE.md 里写一行 `@AGENTS.md`，Claude 读取 CLAUDE.md 时就会把 AGENTS.md 的内容一并读进来，不必再复制一份。后面“一份文件两边共用”一节会一步步操作。

## 什么时候该写 AGENTS.md

这些情况，就适合把规则写进 AGENTS.md：

- 同一件事，你已经对助手提醒第二次了。
- 它一直跑错测试命令，例如该用 `pnpm test`，却一再执行 `npm test`。
- 这件事新同事也需要知道，或下次再打开这个 repo 的人也用得上。

不适合塞进这份文件的，主要有两种。一种是只跟某一小块区域有关、而且很长的流程：那种内容比较适合放到该子目录较短的规则里，或写成用到才加载的 skill。另一种是“一定得做到”的事。[Claude Code 的文档](https://code.claude.com/docs/en/memory)写得很清楚：这些说明是 context（塞进对话里给模型看的上下文），不是强制配置；模型会参考它，但最后怎么做仍由模型判断。要在固定时机拦住某个动作，请使用 hook（在固定时机由工具自动运行的命令），参见[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。

**什么时候用：** 项目规则会反复讲，也会给之后进来的人看。

**你会得到：** 一份放在 repo 里、两个工具都能对齐的说明文件。

**下一步：** 先决定要写哪些具体、可检查的句子，再放到根目录。

## 该写哪些段落

写法要具体、可以核对。官方举的对比很清楚：“使用 2 个空格缩进”比“排版好一点”有用；“提交 PR 前运行 `npm test`”也比“记得测试”清楚。判断方法很简单：别人看完这句话，如果没办法检查有没有做到，就再写具体一点。

建议至少写这几类：

- 安装与测试命令
- 代码风格
- 提交 pull request（PR：把你这次的修改交给别人审查、再合并进主要版本的请求）前要做的事
- 注意事项，例如安全相关、不要碰的文件

保持精简。Claude Code 建议[每份文件控制在 200 行以内](https://code.claude.com/docs/en/memory#write-effective-instructions)，太长会占用更多上下文，也比较不容易被遵守。Codex 则把各层规则加总，[默认上限是 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md)（配置项是 `project_doc_max_bytes`），超出的部分不会读进去。32 KiB 是 32,768 个字节（byte）：英文字母一个约占 1 byte，汉字在常见的 UTF-8 编码下一个约占 3 bytes，所以全中文大约是一万字出头。重要的句子放在前面。

下面是一份可直接放到根目录的模板，大约二十多行，请按你的项目改命令和路径：

```markdown
# AGENTS.md

## 项目概况

这是一个 Node.js 网页服务。包管理用 pnpm，Node 版本见 `.nvmrc`。

## 安装与测试

- 安装依赖：`pnpm install`
- 跑全部测试：`pnpm test`
- 跑单个文件：`pnpm test -- path/to/file.test.ts`
- 提交 PR 前，先跑 `pnpm lint` 和 `pnpm test`

## 代码风格

- 使用 2 个空格缩进，不要用 tab
- 公开函数补上 TypeScript 类型，不要用 `any`

## 注意事项

- 不要修改 `.env`、`.env.*` 或任何含密钥的文件
- 不要在代码里写入真实的 API 密钥或密码

## 提交 PR 前

- 标题用一句话说这次改了什么
- 说明里写测试怎么跑、跑过哪些
```

模板里的 `pnpm install`、`pnpm test`、`pnpm lint` 只是示范用的命令。如果你不确定自己的项目用什么，可以先看项目原有的 README，或问负责的工程师；没把握的段落宁可先不写，也不要写错。

### 动手做：创建第一份 AGENTS.md

1. 找到项目的根目录（见上面“开始之前”一节的说明）。
2. 在根目录新建一个纯文本文件，文件名取 `AGENTS.md`。任何纯文本编辑器都可以；保存时确认文件名结尾是 `.md`，不是 `AGENTS.md.txt`，也不是 Word 或 RTF 这类格式。
3. 粘贴上面的模板，改成你项目真正的命令、路径和注意事项，然后保存。
4. 跟项目的其他文件一样提交（commit）进 repo，团队成员和之后进来的人才能拿到同一份。不熟悉 Git 的话，可以请工程师帮忙。
5. 按后面“怎么确认有读到”一节的方法，检查工具有没有读到。

如果你会在 GitHub 上使用 Codex 的代码审查（code review：合并前检查修改内容），可在最接近相关代码的 AGENTS.md 加上 `## Code Review Rules` 段落。这是 [Codex 文档对 GitHub 审查](https://learn.chatgpt.com/docs/agent-configuration/agents-md#add-code-review-rules)的说明，只适用于这项功能，不是两个工具读取规则文件的通则。段落标题按官方的写法，下面再列出你希望审查时特别注意的事，例如放在支付服务的 `services/payments/AGENTS.md`：

```markdown
## Code Review Rules

- 支付流程有改动时，确认补上了对应的测试
- 代码里如果直接写入密码或 API 密钥，请标出来
```

如果想进一步了解怎么让 AI agent 在 GitHub 上审查 PR，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)。

## 放在哪里：Codex 怎么读

[Codex 的说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)写道：它会在开始做事之前读取 AGENTS.md，而且每次启动只建立一次指令链（把找到的规则文件按顺序拼成的一整份说明）；你改了文件，要重新启动才会生效。

Codex 的规则分两种位置：

- **全局规则**：只属于你自己、应用到你所有项目的偏好，放在 `~/.codex/AGENTS.md`（若你设置了 `CODEX_HOME`，就改到那个目录）。
- **项目规则**：放在 repo 里、跟着项目走的规则，也就是本文主要在写的那一份。

同一层如果有 `AGENTS.override.md`，Codex 会读这份，而不是原来的 `AGENTS.md`。override（覆盖文件）是暂时换成另一套规则用的；用完请删掉它，不要只是清空后留着。官方的说法是：移除 override，才会回到原来的文件。

项目规则则从项目根目录（通常是 Git 根目录）往下，一路走到你的当前工作目录。每一层依次查找 `AGENTS.override.md`、`AGENTS.md`，再查找你配置的 fallback 文件名（备用文件名，后面会说明），而且每层最多收一份。找到的内容由上往下拼在一起，离当前目录越近的越晚出现，效果上会覆盖前面较一般的规则。

举例来说，如果你在 `services/payments` 启动 Codex，它会依次查看根目录、`services/`、`services/payments/` 这三层，每层最多取一份规则文件，最后接上的是 `services/payments/` 那一份。

![从项目根目录往下走到当前文件夹，每层取一份规则按顺序拼成一整份，离当前目录最近的排在最后；更深的文件夹不读](folder-layers.webp){: w="1280" h="720" }
_概念图，不是实际界面。左边从上往下是文件夹的层级，青绿色框起来的是你启动 Codex 的当前文件夹。Codex 沿着青绿色箭头从根目录往下走，把每层的规则按顺序拼成右边那一整份，离你最近的那份排在最后；灰色的更深文件夹不会被读到。_

搜索会停在当前目录：比它更深的文件，启动时不会读到。若你要用某个子目录的规则，请从那个目录启动，或加上 `codex --cd 子目录`（`--cd` 的作用是让 Codex 把那个文件夹当成当前目录）。若 Codex 找不到项目根目录，就只看当前目录。

同一层若同时有覆盖文件和普通文件，只会取一份，而且覆盖文件优先：

![每个文件夹只取一份规则文件；同一层同时有 override 和 AGENTS.md 时，override 优先](override-pick.webp){: w="1280" h="720" }
_概念图，不是实际界面。每个文件夹都只有一份规则被灯照到、被 Codex 取出来。中间的文件夹同时有 AGENTS.override.md（贴着星星的珊瑚色那张）和 AGENTS.md（蓝色那张），Codex 取 override；两旁的文件夹只有 AGENTS.md，就取 AGENTS.md。_

项目里如果已经有别的文件名，例如 `TEAM_GUIDE.md`，可以把它加进 `~/.codex/config.toml`（Codex 的配置文件）的 `project_doc_fallback_filenames`。这就是前面说的 fallback 文件名：某一层既没有 `AGENTS.override.md`，也没有 `AGENTS.md` 时，Codex 才会按这份清单查找；不在清单上的文件名，不会被当成规则文件。用纯文本编辑器打开这个配置文件（没有就新建），在文件开头、任何以 `[` 开头的段落标题之前，加上一行：

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
```

合计长度可用 `project_doc_max_bytes` 调整，默认是 32 KiB（也就是 `32768`）。细节见 [Codex 的配置示例](https://learn.chatgpt.com/docs/config-file/config-sample.md)。

**什么时候用：** 你希望 Codex 一打开项目就带着正确的测试命令和注意事项。

**下一步：** 先在根目录放一份 AGENTS.md；某个子项目规则不同，再在该目录加文件，并从那里启动。

## Claude Code 怎么读

Claude Code 自己的项目说明文件叫 CLAUDE.md，作用跟 AGENTS.md 类似。它也可以读取 repo 里的 AGENTS.md，当作项目说明，不必另外再写一份 CLAUDE.md。不过[默认条件](https://code.claude.com/docs/en/memory#agents-md)比较严。

默认是：当前工作目录和它的上层（也就是一路往外、包住它的那些文件夹），都没有 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md` 时，才会读取 AGENTS.md（包含 `.claude/AGENTS.md`）。只要其中任一份存在，就只读 CLAUDE 系列文件。简单记：**默认情况下，当前目录或上层只要有 CLAUDE 系列文件，就不读 AGENTS.md。** 个人的 `~/.claude/CLAUDE.md`、组织统一发布的 managed CLAUDE.md，以及 `.claude/rules/` 里的规则，不列入这项判断，不会因此让 AGENTS.md 被跳过。

这里有一个常见陷阱：你只是想在项目里放自己不会提交的笔记，于是加了 `CLAUDE.local.md`，Claude 就不再读取 AGENTS.md。若要两边都保留，到对话里输入 `/config`（在 Claude Code 对话框输入、以斜杠开头的命令，用来调整设置），把 Project instructions 设成 `claude-md-and-agents-md`。

另外，Claude Code 不读取 `AGENTS.override.md`、`AGENTS.local.md`，也不读取 `.agents/` 下面的文件。也就是说，你为 Codex 准备的 override，对 Claude 没有效果。

子目录的 AGENTS.md 不是一启动就全部加载。[官方文档](https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md)把这段写在“上层都没有会占用判断的 CLAUDE 系列文件”这个前提下：Claude 用 Read 工具（Claude Code 内置、用来打开文件内容的功能）打开那个子目录里的文件，而且该子目录自己也没有上述三种 CLAUDE 文件时，才会读取那里的 AGENTS.md。若根目录已经有 CLAUDE.md，默认就不会走这条路径；需要子目录规则时，请看下一节的做法。

直接读取 AGENTS.md 需要 Claude Code v2.1.277 或更新的版本。较旧的版本、停用了负责读取的内置 plugin（插件），或刚从更旧版本升级后的第一个 session（会话：从打开工具到关闭的这一段对话），有可能读不到；这时改用下一节的 import。交互 session 若成功加载，通常会看到类似 `no CLAUDE.md found; AGENTS.md loaded: …` 的提示。

若要改默认行为，在 `/config` 调整 Project instructions，或在用户级别的配置文件 `~/.claude/settings.json` 中写入对应值（放在项目里的配置文件，这一项会被忽略）。不熟悉配置文件的话，用 `/config` 比较不容易出错。四个值的含义如下：

| 值 | Claude 会读什么 |
| --- | --- |
| `claude-md-or-agents-md` | 默认。有 CLAUDE 系列文件就读它们；没有才读 AGENTS.md |
| `claude-md-and-agents-md` | 两种都读。每一层先读 CLAUDE 系列，再读 AGENTS.md |
| `claude-md` | 只读 CLAUDE 系列 |
| `managed-only` | 启动时只读组织统一发布的说明和自动记忆；项目里的 CLAUDE.md 与 AGENTS.md 都不会在启动时加载 |

**什么时候用：** 这个 repo 已经有 AGENTS.md，而你主要使用 Claude Code。

**下一步：** 先确认根目录有没有 CLAUDE 系列文件，再决定要直接读，还是用 import 引进来。

## 一份文件两边共用

若你同时使用两个工具，目标是只维护一份共用规则。关键是 import。

import 在这里的意思是“引用另一份文件”：CLAUDE.md 不必把 AGENTS.md 的内容抄一遍，只要写一行 `@AGENTS.md`，Claude 读取 CLAUDE.md 时，就会把 AGENTS.md 的内容展开，当成 CLAUDE.md 的一部分一并读取。它不是复制一份贴过去，所以你只需要维护 AGENTS.md 这一份。

**步骤 1：** 把团队都该遵守的规则写在根目录的 `AGENTS.md`。Codex 会直接读取它。

**步骤 2：** 若项目还需要 Claude 专用的补充，在同一个文件夹（也就是根目录）创建 `CLAUDE.md`，第一行写 `@AGENTS.md`，下面再写只给 Claude 的内容。这是[官方示例](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)的做法：

```markdown
@AGENTS.md

## Claude Code

变更 `src/billing/` 下面的文件时，先使用 plan mode。
```

示例里的 plan mode 是 Claude Code 的一种工作模式；这里只是示范“Claude 专用规则”可以怎么写，请换成你自己需要的内容。

`@` 后面的路径是相对的，基准是这份 CLAUDE.md 所在的位置，不是你启动时的工作目录；CLAUDE.md 和 AGENTS.md 放在同一个文件夹时，写 `@AGENTS.md` 就对了。若把路径放在反引号里，例如 `` `@AGENTS.md` ``，就只是提到这个文件名，不会展开。

![CLAUDE.md 用一行 import 把共用的 AGENTS.md 带进来，两个工具读到同一份规则](import-bridge.webp){: w="1280" h="720" }
_概念图，不是实际界面。左边的助手代表 Codex，直接读取蓝色的 AGENTS.md；右边的助手代表 Claude Code，读取紫色的 CLAUDE.md。CLAUDE.md 第一行的 `@AGENTS.md` 把共用规则接进来（蓝色虚线框），下面才是 Claude 专用的补充，不必再复制一份。_

若不需要任何 Claude 专用内容，也可以做符号链接（symlink：一个指向另一个文件的文件名，有点像快捷方式）。在终端切换到根目录后运行：

```bash
ln -s AGENTS.md CLAUDE.md
```

成功时这条命令不会打印内容。不过，只要团队里有人使用 Windows，就改用上面的 import。官方说明：在 Windows 创建 symlink 需要管理员权限或开发人员模式；Git 若未启用 `core.symlinks`，checkout 时可能把它变成只有一行文字的普通文件，规则就读不到了。

不要只用一句“请去读 AGENTS.md”代替 import。官方说，那样写的话，Claude 只有自己决定打开那份文件时才看得到内容。

也不建议把 `/import`（Claude Code 对话里的另一个命令，名称相近，作用不同）当成长期做法。官方的用词是：它会把 AGENTS.md 这类说明“一次性复制”（appends a one-time copy）到对应的 CLAUDE.md。之后你改 AGENTS.md，复制过去的那份不会自动跟着改。

**你会得到：** 共用规则只维护一份；Claude 专用的句子单独放在 CLAUDE.md 下半部分。

**下一步：** 用下一节的方式确认两边都有读到。

## 怎么确认有读到

改完文件之后，不要假设工具已经看到新内容。

Codex 请重新启动，再按[官方建议](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup)，在终端切换到项目根目录后执行：

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

引号里是交给 Codex 的一句话，意思是“总结当前的指令”；`--ask-for-approval never` 是官方示例里的参数，照抄即可。

若要确认子目录的规则，把目录换成你的路径：

```bash
codex --cd services/payments --ask-for-approval never "Show which instruction files are active."
```

这一行的意思是：从 `services/payments` 启动，并请 Codex“列出当前生效的指令文件”。

你应该会看到它按顺序列出当前生效的说明来源，例如全局文件、根目录的 AGENTS.md，以及（从子目录启动时）更接近的那一份。这是官方文档描述的检查方式，不是某一条实际输出。

Claude Code 可在对话里输入 `/memory`，看列表里有没有你的文件；也可输入 `/context all`，在 Memory files 下面确认（v2.1.280 之前的版本，这里不会列出直接读入的 AGENTS.md）。若是直接读取 AGENTS.md 的交互 session，也会出现前面提过的 `AGENTS.md loaded` 提示。

如果没读到，先回头检查三件事：文件名和位置对不对、Codex 有没有重新启动、Claude Code 的当前目录或上层是不是已经有 CLAUDE 系列文件（有的话，改用 import 或调整设置）。

## 实际场景：前端加支付服务

假设这个 repo 里有前端 `web/`（用户看到的网页界面），也有支付服务 `services/payments/`。这是一种 monorepo（同一个仓库里放了多个子项目）。我会这样放文件：

```text
my-project/              ← 根目录
├── AGENTS.md            ← 全项目共用的规则
├── CLAUDE.md            ← 第一行 @AGENTS.md，下面是 Claude 专用补充
├── web/
└── services/
    └── payments/
        └── AGENTS.md    ← 只写支付服务自己的规则
```

- 根目录 `AGENTS.md`：共用的安装命令、代码风格和 PR 规则
- `services/payments/AGENTS.md`：只写支付服务自己的测试命令，例如改跑 `make test-payments`
- 根目录 `CLAUDE.md`：第一行 `@AGENTS.md`，下面再加一条 Claude 专用规则，例如变更支付相关代码前先使用 plan mode

`services/payments/AGENTS.md` 可以很短，只写跟根目录不同的部分：

```markdown
# AGENTS.md（支付服务）

## 测试

- 这个文件夹的测试请跑 `make test-payments`，不是 `pnpm test`
```

从根目录启动 Codex 时，它会读到全局文件（若你有）以及根目录的 AGENTS.md，但不会在启动时读到 `services/payments/` 里的那一份，因为搜索只走到当前目录。改用 `codex --cd services/payments` 之后，支付服务那一份会接在后面，其中较具体的测试命令就会覆盖根目录较一般的写法。

从根目录启动 Claude Code 时，因为已经有 CLAUDE.md，[默认只读 CLAUDE 系列文件](https://code.claude.com/docs/en/memory#agents-md)；根目录的 AGENTS.md 是靠 `@AGENTS.md` 这行 import 带进来的。接着，若它用 Read 打开 `services/payments/` 里的某个文件：官方把“读取子目录 AGENTS.md”写在“当前目录和上层都没有会占用判断的 CLAUDE 系列文件”这个前提下，而且该子目录自己也不能有那三种 CLAUDE 文件。根目录已经有 CLAUDE.md，所以默认不会直接读取 `services/payments/AGENTS.md`。

若支付服务的规则也要让 Claude 看到，可在 `services/payments/` 再放一份以 `@AGENTS.md` 开头的 `CLAUDE.md`。因为 import 的路径以 CLAUDE.md 所在位置为准，这一行指的是同一个文件夹里的 `services/payments/AGENTS.md`，不是根目录那份。[子目录的 CLAUDE.md](https://code.claude.com/docs/en/memory#how-claude-md-files-load) 会在 Claude 读取、写入或编辑该目录中的文件时加载。另一个做法是把 Project instructions 设成 `claude-md-and-agents-md`，让两种文件一起读。

## 什么情况用哪个文件

| 情况 | 用哪个文件 |
| --- | --- |
| 全团队共用的规则 | 根目录 `AGENTS.md` |
| 只有某个子项目才适用的规则 | 该子目录的 `AGENTS.md`（Codex 请从该目录启动；Claude 若根目录已有 CLAUDE.md，需另加 import 或改设置） |
| 你个人、应用到所有项目的偏好 | `~/.codex/AGENTS.md`，或 `~/.claude/CLAUDE.md` |
| Codex 暂时要换一套规则 | 同一层的 `AGENTS.override.md`（用完删掉；Claude 不读这份） |
| 只要补充 Claude 专用规则 | `CLAUDE.md` 第一行 `@AGENTS.md`，下面再写补充 |
| 只有自己看、不要提交的 Claude 笔记 | `CLAUDE.local.md`（默认会让 Claude 不再读取 AGENTS.md，需要的话改设置） |
| 必须强制做到的事 | hook 或权限设置，不是说明文件 |

## 常见错误

- 规则写成抽象口号，例如“代码要写得干净”，助手没有可以核对的标准。
- 文件名或位置不对，例如保存成 `AGENTS.md.txt`。Codex 只认 `AGENTS.override.md`、`AGENTS.md` 和你配置的备用文件名，其他文件名不会被当成规则文件。
- 文件越写越长，重要的句子被埋在后面，或超过工具会读取的长度。
- 两份文件的内容互相矛盾。[Claude 的文档](https://code.claude.com/docs/en/memory#write-effective-instructions)写道：遇到矛盾时，它可能任意选择一条。
- 改了 AGENTS.md 却忘了重新启动 Codex，它仍沿用启动时建立的那一串规则。
- 在已经依赖 AGENTS.md 的 Claude 项目里加了 `CLAUDE.local.md`，结果 AGENTS.md 不再被读取。
- 把 AGENTS.md 当成安全机制。它只是说明，拦不住一定要禁止的动作。

## 结论与下一步

今天就可以按“动手做”的步骤，在根目录放一份 30 行以内的 AGENTS.md，写上真正会用到的安装、测试和注意事项。若还需要 Claude 专用补充，再加一份以 `@AGENTS.md` 开头的 CLAUDE.md。改完后用上面的命令或 `/memory` 确认有读到。

若要进一步了解“写给助手看的每一行都有成本”，请看 [mattpocock/skills 系列（6）：查资料、做交接、学新东西，都有固定做法](/posts/mattpocock-skills-research-handoff/)。官方说明则见 [Codex 的 AGENTS.md 文档](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 的记忆说明](https://code.claude.com/docs/en/memory#agents-md)，以及 [AGENTS.md 格式官网](https://agents.md/)。要把规则变成固定时机执行的检查，参见[hooks 篇](/posts/claude-code-hooks-automate-checks/)。完整的架构说明这类长篇内容不适合放进 AGENTS.md；把它整理成 repo 内的 wiki、再由 AGENTS.md 指过去的做法，见 [OpenWiki 追得到代码变更，却证明不了文档正确](/posts/openwiki-agent-docs-maintenance/)。
