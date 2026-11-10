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

我同时打开 Codex 和 Claude Code 两个工具时，最怕同一套项目规则写了两份，改了一边、另一边却还是旧的。coding agent（会自己读文件、改文件、跑命令的 AI 编程助手）要靠项目里的说明，才知道测试怎么跑、哪些文件不能碰、提交变更前要做什么。

AGENTS.md 就是写给这些助手看的 README：用 Markdown（一种用纯文本标记标题和列表的格式）来写，没有必填字段。这个格式由 Linux Foundation 旗下的 [Agentic AI Foundation](https://agents.md/) 维护。

这篇文章只谈怎么写这份文件，以及 [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 和 [Claude Code](https://code.claude.com/docs/en/memory#agents-md) 的官方文档分别怎么说它们会读哪些文件。我不会写成“所有工具都一样”，也不会列出其他还没查证的产品。

如果你想用一套 skill 帮项目生成规则，请看 [mattpocock/skills 系列（1）：先设置项目规则，再用 ask-matt 找下一步](/zh-CN/posts/mattpocock-skills-setup-routing-guide/)。那一篇讲的是那套 skill 的流程；本文讲的是文件格式本身，以及这两个工具实际怎么读。

> **版本说明**：本文依据 2026-11-10（台北时间）读取的 [Codex AGENTS.md 说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 记忆与 CLAUDE.md 说明](https://code.claude.com/docs/en/memory)（含 [AGENTS.md 段落](https://code.claude.com/docs/en/memory#agents-md)），以及 [AGENTS.md 格式官网](https://agents.md/)。当天 npm 上最新的 Codex CLI 是 0.167.0，Claude Code 是 2.1.322。之后的版本或文档可能会改变读取规则。
{: .prompt-info }

## 什么时候该写 AGENTS.md

这些情况，就适合把规则写进 AGENTS.md：

- 同一件事，你已经对助手提醒第二次了。
- 它一直跑错测试命令，例如该用 `pnpm test`，却一再执行 `npm test`。
- 这件事新同事也需要知道，或下次再打开这个 repo（代码仓库）的人也用得上。

repo 的根目录是项目最上层，通常也是 Git 仓库开头的那一层。当前工作目录则是你启动工具时所在的文件夹，不一定等于根目录。

不适合塞进这份文件的，主要有两种。一种是只跟某一小块区域有关、而且很长的流程：那种内容比较适合放到该子目录较短的规则里，或写成用到才加载的 skill。另一种是“一定得做到”的事。[Claude Code 的文档](https://code.claude.com/docs/en/memory)写得很清楚：这些说明是 context（塞进对话里给模型看的上下文），不是强制配置。要在固定时机拦住某个动作，请使用 hook，参见[把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒](/zh-CN/posts/claude-code-hooks-automate-checks/)。

**什么时候用：** 项目规则会反复讲，也会给之后进来的人看。

**你会得到：** 一份放在 repo 里、两个工具都能对齐的说明文件。

**下一步：** 先决定要写哪些具体、可检查的句子，再放到根目录。

## 该写哪些段落

写法要具体、可以核对。官方举的对比很清楚：“使用 2 个空格缩进”比“排版好一点”有用；“提交 PR 前运行 `npm test`”也比“记得测试”清楚。

建议至少写这几类：

- 安装与测试命令
- 代码风格
- 提交 pull request（PR，请求把分支合并进主分支）前要做的事
- 注意事项，例如安全相关、不要碰的文件

保持精简。Claude Code 建议[每份文件控制在 200 行以内](https://code.claude.com/docs/en/memory#write-effective-instructions)，太长会占用更多上下文，也比较不容易被遵守。Codex 则把各层规则加总，[默认上限是 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md)（配置项是 `project_doc_max_bytes`），超出的部分不会读进去。重要的句子放在前面。

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

如果你会在 GitHub 上使用 Codex 的代码审查，可在最接近相关代码的 AGENTS.md 加上 `## Code Review Rules` 段落。这是 [Codex 文档对 GitHub 审查](https://learn.chatgpt.com/docs/agent-configuration/agents-md#add-code-review-rules)的说明，只适用于这项功能，不是两个工具读取规则文件的通则。

## 放在哪里：Codex 怎么读

[Codex 的说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)写道：它会在开始做事之前读取 AGENTS.md，而且每次启动只建立一次指令链；你改了文件，要重新启动才会生效。

个人的全局规则放在 `~/.codex/AGENTS.md`（若你设置了 `CODEX_HOME`，就改到那个目录）。同一层如果有 `AGENTS.override.md`，Codex 会读这份，而不是原来的 `AGENTS.md`。override（覆盖文件）是暂时换成另一套规则用的；用完请删掉它，不要只是清空后留着。官方的说法是：移除 override，才会回到原来的文件。

项目规则则从项目根目录（通常是 Git 根目录）往下，一路走到你的当前工作目录。每一层依次查找 `AGENTS.override.md`、`AGENTS.md`，再查找你配置的 fallback 文件名，而且每层最多收一份。找到的内容由上往下拼在一起，离当前目录越近的越晚出现，效果上会覆盖前面较一般的规则。

![从项目根目录往下，每层的规则依次叠起来，离当前目录越近的越靠后](folder-layers.webp){: w="1280" h="720" }
_概念图，不是实际界面。Codex 从项目根目录往下，把每一层找到的规则按顺序拼在一起，离你当前目录越近的越晚出现。_

搜索会停在当前目录：比它更深的文件，启动时不会读到。若你要用某个子目录的规则，请从那个目录启动，或加上 `codex --cd 子目录`。若 Codex 找不到项目根目录，就只看当前目录。

同一层若同时有覆盖文件和普通文件，只会取一份，而且覆盖文件优先：

![同一层有两份规则文件时，Codex 只取一份，override 优先](override-pick.webp){: w="1280" h="720" }
_概念图，不是实际界面。同一层若同时有 AGENTS.override.md 和 AGENTS.md，Codex 只取一份，而且会先看 override。_

项目里如果已经有别的文件名，例如 `TEAM_GUIDE.md`，可以把它加进 `~/.codex/config.toml` 的 `project_doc_fallback_filenames`。合计长度可用 `project_doc_max_bytes` 调整，默认是 32 KiB。细节见 [Codex 的配置示例](https://learn.chatgpt.com/docs/config-file/config-sample.md)。

**什么时候用：** 你希望 Codex 一打开项目就带着正确的测试命令和注意事项。

**下一步：** 先在根目录放一份 AGENTS.md；某个子项目规则不同，再在该目录加文件，并从那里启动。

## Claude Code 怎么读

Claude Code 也可以读取 repo 里的 AGENTS.md，当作项目说明，不必另外再写一份 CLAUDE.md。不过[默认条件](https://code.claude.com/docs/en/memory#agents-md)比较严。

默认是：当前工作目录和它的上层，都没有 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md` 时，才会读取 AGENTS.md（包含 `.claude/AGENTS.md`）。只要其中任一份存在，就只读 CLAUDE 系列文件。个人的 `~/.claude/CLAUDE.md`、组织统一发布的 managed CLAUDE.md，以及 `.claude/rules/` 里的规则，不列入这项判断，不会因此让 AGENTS.md 被跳过。

这里有一个常见陷阱：你只是想在项目里放自己不会提交的笔记，于是加了 `CLAUDE.local.md`，Claude 就不再读取 AGENTS.md。若要两边都保留，到对话里输入 `/config`，把 Project instructions 设成 `claude-md-and-agents-md`。

另外，Claude Code 不读取 `AGENTS.override.md`、`AGENTS.local.md`，也不读取 `.agents/` 下面的文件。也就是说，你为 Codex 准备的 override，对 Claude 没有效果。

子目录的 AGENTS.md 不是一启动就全部加载。[官方文档](https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md)把这段写在“上层都没有会占用判断的 CLAUDE 系列文件”这个前提下：Claude 用 Read 工具打开那个子目录里的文件，而且该子目录自己也没有上述三种 CLAUDE 文件时，才会读取那里的 AGENTS.md。若根目录已经有 CLAUDE.md，默认就不会走这条路径；需要子目录规则时，请看下一节的做法。

直接读取 AGENTS.md 需要 Claude Code v2.1.277 或更新的版本。较旧的版本、停用了负责读取的内置 plugin，或刚从更旧版本升级后的第一个 session，有可能读不到；这时改用下一节的 import。交互 session 若成功加载，通常会看到类似 `no CLAUDE.md found; AGENTS.md loaded: …` 的提示。

若要改默认行为，在 `/config` 调整 Project instructions，或在用户级别的配置文件中写入对应值。四个值的含义如下：

| 值 | Claude 会读什么 |
| --- | --- |
| `claude-md-or-agents-md` | 默认。有 CLAUDE 系列文件就读它们；没有才读 AGENTS.md |
| `claude-md-and-agents-md` | 两种都读。每一层先读 CLAUDE 系列，再读 AGENTS.md |
| `claude-md` | 只读 CLAUDE 系列 |
| `managed-only` | 启动时只读组织统一发布的说明和自动记忆；项目里的 CLAUDE.md 与 AGENTS.md 都不会在启动时加载 |

**什么时候用：** 这个 repo 已经有 AGENTS.md，而你主要使用 Claude Code。

**下一步：** 先确认根目录有没有 CLAUDE 系列文件，再决定要直接读，还是用 import 引进来。

## 一份文件两边共用

若你同时使用两个工具，目标是只维护一份共用规则。

**步骤 1：** 把团队都该遵守的规则写在根目录的 `AGENTS.md`。Codex 会直接读取它。

**步骤 2：** 若项目还需要 Claude 专用的补充，在旁边创建 `CLAUDE.md`，第一行写 `@AGENTS.md`，下面再写只给 Claude 的内容。这是[官方示例](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)的做法。以 `@` 开头的 import（把另一份文件的内容展开、一并读进来）路径是相对的，基准是这份 CLAUDE.md 所在的位置，不是你启动时的工作目录。若把路径放在反引号里，例如 `` `@AGENTS.md` ``，就只是提到这个文件名，不会展开。

```markdown
@AGENTS.md

## Claude Code

变更 `src/billing/` 下面的文件时，先使用 plan mode。
```

![CLAUDE.md 用一行 import 把共用的 AGENTS.md 带进来](import-bridge.webp){: w="1280" h="720" }
_概念图，不是实际界面。CLAUDE.md 第一行写 `@AGENTS.md`，就能把共用的规则带进来，不必再复制一份。_

若不需要任何 Claude 专用内容，也可以做符号链接（symlink，一个指向另一个文件的文件名）：

```bash
ln -s AGENTS.md CLAUDE.md
```

成功时这条命令不会打印内容。不过，只要团队里有人使用 Windows，就改用上面的 import。官方说明：在 Windows 创建 symlink 需要管理员权限或开发人员模式；Git 若未启用 `core.symlinks`，checkout 时可能把它变成只有一行文字的普通文件，规则就读不到了。

不要只用一句“请去读 AGENTS.md”代替 import。官方说，那样写的话，Claude 只有自己决定打开那份文件时才看得到内容。

也不建议把 `/import` 当成长期做法。官方的用词是：它会把 AGENTS.md 这类说明“一次性复制”（appends a one-time copy）到对应的 CLAUDE.md。之后你改 AGENTS.md，复制过去的那份不会自动跟着改。

**你会得到：** 共用规则只维护一份；Claude 专用的句子单独放在 CLAUDE.md 下半部分。

**下一步：** 用下一节的方式确认两边都有读到。

## 怎么确认有读到

改完文件之后，不要假设工具已经看到新内容。

Codex 请重新启动，再按[官方建议](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup)执行：

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

若要确认子目录的规则，把目录换成你的路径：

```bash
codex --cd services/payments --ask-for-approval never "Show which instruction files are active."
```

你应该会看到它按顺序列出当前生效的说明来源，例如全局文件、根目录的 AGENTS.md，以及（从子目录启动时）更接近的那一份。这是官方文档描述的检查方式，不是某一条实际输出。

Claude Code 可在对话里执行 `/memory`，看列表里有没有你的文件；也可执行 `/context all`，在 Memory files 下面确认。若是直接读取 AGENTS.md 的交互 session，也会出现前面提过的 `AGENTS.md loaded` 提示。

## 实际场景：前端加支付服务

假设这个 repo 里有前端 `web/`，也有支付服务 `services/payments/`。这是一种 monorepo（同一个仓库里放了多个子项目）。我会这样放文件：

- 根目录 `AGENTS.md`：共用的安装命令、代码风格和 PR 规则
- `services/payments/AGENTS.md`：只写支付服务自己的测试命令，例如改跑 `make test-payments`
- 根目录 `CLAUDE.md`：第一行 `@AGENTS.md`，下面再加一条 Claude 专用规则，例如变更支付相关代码前先使用 plan mode

从根目录启动 Codex 时，它会读到全局文件（若你有）以及根目录的 AGENTS.md，但不会在启动时读到 `services/payments/` 里的那一份，因为搜索只走到当前目录。改用 `codex --cd services/payments` 之后，支付服务那一份会接在后面，其中较具体的测试命令就会覆盖根目录较一般的写法。

从根目录启动 Claude Code 时，因为已经有 CLAUDE.md，[默认只读 CLAUDE 系列文件](https://code.claude.com/docs/en/memory#agents-md)；根目录的 AGENTS.md 是靠 `@AGENTS.md` 这行 import 带进来的。接着，若它用 Read 打开 `services/payments/` 里的某个文件：官方把“读取子目录 AGENTS.md”写在“当前目录和上层都没有会占用判断的 CLAUDE 系列文件”这个前提下，而且该子目录自己也不能有那三种 CLAUDE 文件。根目录已经有 CLAUDE.md，所以默认不会直接读取 `services/payments/AGENTS.md`。

若支付服务的规则也要让 Claude 看到，可在 `services/payments/` 再放一份以 `@AGENTS.md` 开头的 `CLAUDE.md`。[子目录的 CLAUDE.md](https://code.claude.com/docs/en/memory#how-claude-md-files-load) 会在 Claude 读取、写入或编辑该目录中的文件时加载。另一个做法是把 Project instructions 设成 `claude-md-and-agents-md`，让两种文件一起读。

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
- 文件越写越长，重要的句子被埋在后面，或超过工具会读取的长度。
- 两份文件的内容互相矛盾。[Claude 的文档](https://code.claude.com/docs/en/memory#write-effective-instructions)写道：遇到矛盾时，它可能任意选择一条。
- 改了 AGENTS.md 却忘了重新启动 Codex，它仍沿用启动时建立的那一串规则。
- 在已经依赖 AGENTS.md 的 Claude 项目里加了 `CLAUDE.local.md`，结果 AGENTS.md 不再被读取。
- 把 AGENTS.md 当成安全机制。它只是说明，拦不住一定要禁止的动作。

## 结论与下一步

今天就可以在根目录放一份 30 行以内的 AGENTS.md，写上真正会用到的安装、测试和注意事项。若还需要 Claude 专用补充，再加一份以 `@AGENTS.md` 开头的 CLAUDE.md。改完后用上面的命令或 `/memory` 确认有读到。

若要进一步了解“写给助手看的每一行都有成本”，请看 [mattpocock/skills 系列（6）：查资料、做交接、学新东西，都有固定做法](/zh-CN/posts/mattpocock-skills-research-handoff/)。官方说明则见 [Codex 的 AGENTS.md 文档](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Code 的记忆说明](https://code.claude.com/docs/en/memory#agents-md)，以及 [AGENTS.md 格式官网](https://agents.md/)。要把规则变成固定时机执行的检查，参见[hooks 篇](/zh-CN/posts/claude-code-hooks-automate-checks/)。
