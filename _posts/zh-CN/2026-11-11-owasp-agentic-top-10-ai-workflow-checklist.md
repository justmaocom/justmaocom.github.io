---
title: "用 OWASP Agentic Top 10 检查你的 AI 工作流：十项风险逐条对照与修复方法"
description: "把 OWASP Agentic Top 10 整理成十道是／否检查，用来对照你的 coding agent、MCP 与 CI，并附上可着手的修复方法。"
date: 2026-11-11 16:00:00 +0800
categories: [信息安全, AI Agent]
tags: [ai-security, coding-agent, prompt-injection, mcp, claude-code]
media_subpath: /assets/img/posts/owasp-agentic-top-10-ai-workflow-checklist/
image:
  path: cover.zh-CN.webp
  alt: "按 OWASP Agentic Top 10 的十项风险，逐题检查并修好自己的 AI 开发工作流。"
---

用 coding agent 久了，工具会越接越多：多一个 MCP、多一条自动放行、再把 CI 接上去，却很少回头把整个工作流检查一遍。OWASP（一个非营利的开放安全社区，最出名的是网站风险清单“OWASP Top 10”）在 2025 年 12 月发布了《[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)》，也可简称 OWASP Agentic Top 10。发布页的原文是：a globally peer-reviewed framework，由 100 多位专家、研究者与实务工作者共同写成，用来指出自主与 agent 系统最关键的安全风险。

这份清单原本是写给要建 agent 系统的组织。我把它翻译成个人开发工作流可以回答的十道是／否问题，每题附上修复方法。分组、场景、检查题和修复顺序都是本站整理，**不是** OWASP 官方的“个人开发者检查表”；ASI 编号只是编号，不代表严重程度。

范围是个人开发者的 coding agent 工作流，例如 Claude Code、Codex、Cursor 的 agent，以及接上的 MCP 和 GitHub Actions。和[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/zh-CN/posts/coding-agent-supply-chain-permission-risks/) 的分工是：那篇从“装了什么”讲攻击面；这篇用 OWASP 的十项把整个工作流扫一遍。供应链篇已经详细写过的案例，这里不再重讲。

> **版本说明**：本文依 OWASP《OWASP Top 10 for Agentic Applications 2026》（2025 年 12 月发布，2026-11-11 重新核对仍是最新版）与各工具 2026-11-11 的官方文档撰写。Claude Code、Codex、Cursor 的默认权限近期都有调整，设置名称与默认值以官方文档为准。
{: .prompt-info }

## 先说几个词

- **AI agent／agentic**：不只回答问题，还会自己规划步骤、调用工具、改文件、跑命令的 AI。
- **工具（tool）**：agent 能调用的功能，例如读文件、跑终端命令、上网、调用 MCP server。
- **MCP（Model Context Protocol）**：让 agent 接上外部工具和数据的标准；MCP server 就是提供这些工具的程序。
- **提示注入（prompt injection）**：把指令藏在 agent 会读到的内容里，让它照着做。
- **权限模式／核准（approval）**：agent 做某些事之前要不要先问你。
- **沙箱（sandbox）**：把 agent 跑的命令关在限制范围内，例如能写哪些文件夹、能连哪些网站。
- **token／凭证**：代替账号密码的通行码，谁拿到就能用你的身份做事。
- **长期记忆／上下文（memory／context）**：agent 每次开工都会读的东西，例如 `CLAUDE.md`、`AGENTS.md`、规则文件、自动记录的摘要。
- **最小权限（least privilege）**：只给完成这件事真正需要的权限。
- **最小自主（Least-Agency）**：OWASP 的用语，不需要的自主权就不要给。
- **kill switch**：出事时能立刻停掉的开关。

## 怎么用这份清单：四步一轮

OWASP 在文档第 7 页提出 Least-Agency：“avoid unnecessary autonomy; deploying agentic behavior where it is not needed expands the attack surface without adding value。”翻译：避免不必要的自主；在用不到的地方部署 agent 行为，只会扩大攻击面、不会增加价值。同一段也强调要看得见它在做什么（observability）。

我把检查整理成四步一轮：

1. **盘点**：写下你用的 agent、它能读的文件夹、能跑的命令、接了哪些 MCP、手上有哪些 token、有哪些自动化（CI、定时任务）。
2. **对照**：十题逐一回答是或否；答“是”就代表要修。
3. **修复**：先修“没人把关、做了就收不回”的项目。
4. **复查**：加了新工具、MCP，或改了设置，就再跑一轮。

![体检 AI 工作流的四个步骤：盘点、对照、修复、复查，原则是用不到的自主权就别给](audit-loop.zh-CN.webp){: w="1600" h="900" }
_概念图：盘点、对照、修复、复查围成一轮；中心原则是最小自主（Least-Agency），用不到的自主权就别给。这四步是本站整理的用法，不是 OWASP 官方流程。_

## 十项总览

官方清单按 ASI01 到 ASI10 编号。为了好读，我把十项分成五组：它读到什么、它能动什么、身份与来源、串起来的自动化，以及你自己。这不是 OWASP 的官方分类，编号也不代表哪一项更严重。

![OWASP Agentic Top 10 的十项风险，按“读到什么、能动什么、身份与来源、串起来的自动化、你自己”分五组](map.zh-CN.webp){: w="1600" h="900" }
_概念图：十项按本站整理分成五组。底部已注明分组不是 OWASP 官方分类，来源是 OWASP Top 10 for Agentic Applications 2026。_

| ID | 英文正式名称 | 白话名称 | 一句话 |
| --- | --- | --- | --- |
| ASI01 | Agent Goal Hijack | 目标被劫持 | 读到的内容改掉它要做的事 |
| ASI02 | Tool Misuse and Exploitation | 工具被误用 | 合法工具被用在错的地方 |
| ASI03 | Identity and Privilege Abuse | 身份与权限滥用 | 拿你的身份和钥匙做事 |
| ASI04 | Agentic Supply Chain Vulnerabilities | 供应链 | 装进来的 MCP、skill 有问题 |
| ASI05 | Unexpected Code Execution (RCE) | 意外执行代码 | 它写的、跑的代码被利用 |
| ASI06 | Memory & Context Poisoning | 记忆与上下文污染 | 错的内容写进长期记忆 |
| ASI07 | Insecure Inter-Agent Communication | agent 间通信 | agent 互传的消息被冒充或篡改 |
| ASI08 | Cascading Failures | 连锁失效 | 一个小错被自动化一路放大 |
| ASI09 | Human-Agent Trust Exploitation | 过度信任 agent | 说得很有把握，你就点了同意 |
| ASI10 | Rogue Agents | 失控的 agent | 偏离任务还持续自己行动 |

## 逐项检查

每一项都用同一组结构：先白话说明，再对到 coding agent 上常见的样子，接着一道是／否（“是”就要修），最后写怎么修。检查题和清单图是同一套意思。官方原文会加引号和链接；场景与修复方法里的工具做法，是本站对照，不是 OWASP 替各家工具写的步骤。

工具的默认权限最近有调整，下面只教你去哪里看、确认什么，不以某一天的默认值当作永远正确。Claude Code 可从 `/permissions`、[permissions](https://code.claude.com/docs/en/permissions)、[security](https://code.claude.com/docs/en/security) 与 [sandboxing](https://code.claude.com/docs/en/sandboxing) 文档确认；Codex 看 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)；Cursor 看 [Agent Security](https://cursor.com/docs/agent/security)。

### ASI01 Agent Goal Hijack：读到的内容改掉它要做的事

**白话说：** Agent 分不清“你的指令”和“它读到的内容”，所以网页、issue、文档里藏的一段话，就能改掉它要做的事。这就是提示注入。

**在你的 AI 开发环境长这样：** 放到 coding agent 上，常见的样子是：你请它读一篇文档、一个 GitHub issue，或上网查资料，它读完就直接改文件或跑命令。

**检查题：** 读完网页、issue 或文档后，它能不问你就动手吗？

**怎么修：** OWASP 的对策是把所有自然语言输入都当不可信，并且“requiring human approval for high-impact or goal-changing actions”。读外部内容时，改用只读或 plan 模式；像 `git push`、删文件这类高影响动作，设成要先问你。细节与案例见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

### ASI02 Tool Misuse and Exploitation：合法工具被用在错的地方

**白话说：** 工具本身是合法的、权限也是你给的，但 agent 用错地方：删数据、狂打付费 API，或把数据送出去。

**在你的 AI 开发环境长这样：** OWASP 有一个直接讲 coding agent 的例子：一套被允许自动执行、看起来无害的工具里包含 ping，攻击者让 agent 反复调用，借 DNS 查询把数据送出去。

**检查题：** 有没有自动放行的工具能删文件、发送或联网？

**怎么修：** 自动放行清单只放真正无害、而且不能联网的工具；删除、发送、发布这类动作要先确认。Claude Code 的规则是按 `deny`、`ask`、`allow` 的顺序比对，且 allow 不能覆盖 deny，可用 `/permissions` 检查当前规则。Cursor 的文档写：MCP 连接要先核准，每个工具默认仍要再核准，allowlist 只放真正需要的。OWASP 也建议设用量上限（费用、次数或 token 预算）。更完整的权限与自动执行说明，见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

### ASI03 Identity and Privilege Abuse：身份与权限滥用

**白话说：** Agent 用的是谁的身份、拿着哪些钥匙？如果它直接继承你整个账号的权限，被骗时就是用“你”的全部权限去做事。

**在你的 AI 开发环境长这样：** 放到 coding agent 上，常见的样子是：它能读到你的 SSH key、云凭证、`.env` 里的长期 token，或直接用你登录 Git 与云的身份跑命令。

**检查题：** 它用的是你的完整账号、长期 token 或 SSH key 吗？

**怎么修：**

- 按 OWASP 对策 1：给任务专用、范围小、短效的 token，而不是整把长期钥匙。
- 不要把长期 token 放在 agent 读得到的地方。Claude Code 可用 deny 规则挡文件工具读取，例如官方文档举的 `Read(./.env)`、`Read(./secrets/**)`，以及 `Read(~/.ssh/**)`。规则写好后，用 `/permissions` 确认已生效。
- CI 发布若还在放长期 npm token，可改用 OIDC 短期凭证。这是本站的对照例子，不是 OWASP 原文提到的做法，说明见[发布 npm 包不再放长期 token：Trusted Publishing 设置教程](/zh-CN/posts/npm-trusted-publishing-github-actions/)。
- GitHub Actions 可把 workflow 默认权限设成只读，例如顶层写 `permissions: contents: read`，个别 job 真正需要时再打开。做法见 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。

### ASI04 Agentic Supply Chain Vulnerabilities：供应链

**白话说：** 你装的 MCP server、skill、插件或提示模板，任何一个是假的或被改过，agent 就会照着做。和传统软件包供应链不同的是，agent 常在执行当下才加载这些东西。

**在你的 AI 开发环境长这样：** 清单里多了一个没锁定版本、来源也没看过的 MCP 或 skill。

**检查题：** 有没有 MCP、skill 或插件没锁版本、来源没看过？

**怎么修：** 先列出你装了什么，来源要看过，版本要锁定。MCP 官方 [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) 提醒：本地 MCP server 和你的账号权限一样大，装之前要看完整、未被截断的启动命令，并明确核准。Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 也写：只看 `.mcp.json` 看不到这个 session 能加载的全部 server，而且 Anthropic 不审计 MCP server。锁定版本的细节见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

### ASI05 Unexpected Code Execution (RCE)：意外执行代码

**白话说：** Agent 会自己写程序、自己跑命令。如果被骗或写错，它跑的就是攻击者想要的东西，而且是用你电脑上的权限在跑。

**在你的 AI 开发环境长这样：** OWASP 举过 vibe coding 工具在工作区执行未经审查的安装或 shell 命令、把正式数据删掉或覆盖；也举过在“修 build”时让 agent 重建 lockfile，结果拉进被动过手脚的小版本。

**检查题：** 它跑的命令直接在你的主机上，没有沙箱吗？

**怎么修：**

- 按 OWASP 对策：不要让 agent 直接连到正式环境；能隔离就隔离，文件系统尽量只开专用工作目录。若你想把两个任务彻底分开，也可以参考[让两个 AI 分开工作：用 git worktree 开独立工作目录](/zh-CN/posts/git-worktree-parallel-ai-agents/)。
- Claude Code 请先看 [sandboxing 文档](https://code.claude.com/docs/en/sandboxing) 与 `/sandbox`，确认沙箱是不是开着。按 2026-11-11 的文档，沙箱默认是关的；开了之后，默认仍读得到用户主目录里的凭证文件，例如 `~/.ssh`、`~/.aws/credentials`，要另外用 `filesystem.denyRead` 或 `permissions.blockReadsOutsideWorkingDirectories` 收紧。官方项目设置示例是：

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "denyRead": ["~/"],
      "allowRead": ["."]
    }
  }
}
```

文档提醒：若把同一份设置放在 `~/.claude/settings.json`，`.` 会解析成 `~/.claude`，项目文件反而会被挡住。`bypassPermissions` 只应在容器或虚拟机这类隔离环境使用。

- Codex 请直接核对 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)。官方原文写：默认关闭网络；本地以操作系统强制的沙箱限制能碰的范围，通常是当前的 workspace。只读可执行 `codex --sandbox read-only --ask-for-approval on-request`。
- lockfile 不要让 agent 随意重建；需要更新时自己看过再改。

### ASI06 Memory & Context Poisoning：记忆与上下文污染

**白话说：** 这不是一次性的骗，而是把错的东西写进它的记忆，之后每次开新对话都会照着错的走。

**在你的 AI 开发环境长这样：** Coding agent 的长期上下文包括 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules`、自动写下的 memory 文件，以及跨 session 的摘要。若它能自己改这些文件，而你看不到 diff，污染就会留下。

**检查题：** 它能自己改 CLAUDE.md、AGENTS.md 或记忆文件，你却看不到 diff 吗？

**怎么修：**

- 按 OWASP 对策 7：把这些文件放进版本控制，改动看 diff 再合并。怎么写规则文件，见[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)。
- 按对策 6：不要让 agent 自动把自己的输出写回“可信记忆”。
- Claude Code 可用 `ConfigChange` hook 审计或挡住工作会话中的设置变更，细节见[把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒](/zh-CN/posts/claude-code-hooks-automate-checks/)。

### ASI07 Insecure Inter-Agent Communication：agent 间通信

**白话说：** 好几个 agent 互相传话时，如果消息没有验证身份、也没有防篡改，别人就能冒充或改掉其中一句。

**在你的 AI 开发环境长这样：** 这项主要针对多个 agent 互相沟通的系统。只用一个 agent 的人，大多可以先跳过。会碰到的情况包括：subagent 互传结果、远程 MCP、或 CI 里一个 agent 的输出直接当另一个 agent 的输入。

**检查题：** 一个 agent 的输出，会被另一个 agent 直接照着做吗？

**怎么修：** 远程 MCP 只用 HTTPS，而且连接要验证。另一个 agent 的输出，要当成还没审过的输入，不要直接照做。

### ASI08 Cascading Failures：连锁失效

**白话说：** 一个小错没被挡下来，被下一步自动接手、放大，最后变成大事故。重点是错误怎么一路传下去，不一定是错从哪里来。

**在你的 AI 开发环境长这样：** 常见的样子是 AI 写、AI 审、自动合并、自动部署，中间没有人或不能跳过的检查点。OWASP 也提到“Governance drift cascade”：连续成功之后放宽审查，错误的设置就会一路扩散。

**检查题：** 从写代码到合并、部署，有一段完全没有人或检查挡着吗？

**怎么修：** 合并或部署前，至少留一个不能跳过的检查点，可以是人，也可以是必须通过的 CI。GitHub 文档说明可以设置，不让 GitHub Actions 创建或核准 pull request，见 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。若你本来就在用 AI 帮 PR 做审查，可一并看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)，重点是审查结果不要自动变成不可撤销的合并。第三方 actions 请锁定依赖：GitHub 目前最推荐用 workflow 依赖 lockfile（`.github/workflows/actions.lock`），否则把 action pin 到完整的 commit SHA，说明见 [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)。

### ASI09 Human-Agent Trust Exploitation：过度信任 agent

**白话说：** Agent 讲得很有把握、理由很完整，你就按了“同意”。最后动手的是你，记录上也是你。

**在你的 AI 开发环境长这样：** OWASP 的“Helpful Assistant Trojan”例子是：被动过手脚的 coding assistant 建议一行漂亮的修正，你贴上后却跑了恶意命令。另一种日常风险是审批疲劳：提示一直跳，看久了就直接按允许。

**检查题：** 你常常没细看就点“允许”吗？

**怎么修：** 高风险动作要先看 diff 或完整命令再按。Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 写：You're responsible for reviewing proposed code and commands for safety before approval。不要让 agent 自己的说明取代你的判断；OWASP 对策 4 要求“plain-language risk summary (not model-generated rationales)”，也就是用白话风险摘要，而不是模型自己编的理由。把你确实认为可自动跑的少数命令写进 allow，其他保留 ask，减少没有意义的提示。设置前先看各工具怎么说明“核准疲劳”或 allowlist，不要只靠分类器当已经有人审过。

### ASI10 Rogue Agents：失控的 agent

**白话说：** Agent 开始做不是你交代的事，而且持续做下去。可能是被入侵后，也可能是为了达成目标去钻漏洞。

**在你的 AI 开发环境长这样：** 例如它为了“降低成本”而删掉备份，或在被注入之后，即使恶意来源已经拿掉，仍继续把数据送出去。对个人开发者来说，重点是：出事时你知不知道怎么立刻停下来。

**检查题：** 它出错时，你说不出怎么马上停掉它、撤销它的 token 吗？

**怎么修：** 先准备个人版的 kill switch：知道怎么中断当前的 session、撤销它在用的 token、关掉定时任务或后台任务。长时间无人看管的任务，要限定范围和时间。OWASP 对策 4 写要有“kill-switches and credential revocation”；对策 6 写“Keys must never be directly available to agents”，钥匙不该直接交给 agent。

## 可复制的检查清单

下面这份清单可以复制到自己的笔记。题目和图上的十题是同一套意思；答“是”就是要修的地方。

![OWASP Agentic Top 10 的 10 道是／否自我检查，答“是”的项目就是要修的地方](checklist.zh-CN.webp){: w="1600" h="900" }
_概念图：十道是／否自我检查。这十题是本站按官方十项整理的，不是 OWASP 发布的官方考卷。_

**盘点**

- [ ] 我用哪些 coding agent？
- [ ] 它能读哪些文件夹、能跑哪些命令？
- [ ] 接了哪些 MCP、skill 或插件？来源和版本我看过吗？
- [ ] 它拿得到哪些 token、SSH key 或云凭证？
- [ ] 有哪些自动化会接着跑，例如 CI、定时任务、后台任务？

**十题（答“是”就要修）**

- [ ] ASI01　读完网页、issue 或文档后，它能不问你就动手吗？
- [ ] ASI02　有没有自动放行的工具能删文件、发送或联网？
- [ ] ASI03　它用的是你的完整账号、长期 token 或 SSH key 吗？
- [ ] ASI04　有没有 MCP、skill 或插件没锁版本、来源没看过？
- [ ] ASI05　它跑的命令直接在你的主机上，没有沙箱吗？
- [ ] ASI06　它能自己改 CLAUDE.md、AGENTS.md 或记忆文件，你却看不到 diff 吗？
- [ ] ASI07　一个 agent 的输出，会被另一个 agent 直接照着做吗？
- [ ] ASI08　从写代码到合并、部署，有一段完全没有人或检查挡着吗？
- [ ] ASI09　你常常没细看就点“允许”吗？
- [ ] ASI10　它出错时，你说不出怎么马上停掉它、撤销它的 token 吗？

**每次加新工具后**

- [ ] 又接了 MCP、skill，或改了权限、CI、定时任务之后，再从头跑一轮盘点和十题。

## 先修哪几项

这是本站建议的顺序，不是 OWASP 官方的优先级：先处理没有人把关、而且做了就收不回的（ASI08，以及 ASI05 里直接碰到正式环境的部分），再处理长期凭证（ASI03），然后是自动放行与 MCP（ASI02、ASI04），最后才是其余项目。ASI07 若你只用一个 agent，可以先跳过。

## 什么情况怎么做

| 情况 | 建议 |
| --- | --- |
| 只用一个 agent、没接 MCP | 仍要做盘点与十题；ASI07 大多可先跳过，其他项仍然适用 |
| 接了好几个 MCP | 先清 ASI04 与 ASI02：来源、锁定版本、每个工具默认要核准 |
| 让 agent 长时间自己跑 | 收紧 ASI05、ASI08、ASI10：隔离执行、设时间与范围、先写下停机与撤销步骤 |
| agent 会读网页或 issue | 重看 ASI01 与 ASI09：外部内容当不可信，高影响动作要人看过 |
| CI 里有 agent 自动审查或合并 | 重看 ASI08：合并前要有不能跳过的检查点 |
| 团队共用设置 | 规则文件与权限设置放 git，改动看 diff（ASI06）；不要把长期凭证写进共用文件 |
| 怀疑 agent 已经做了怪事 | 先用 ASI10 的方式停掉并撤销凭证，再回头查记录与 diff |

## 常见误解

- “开了沙箱就读不到 SSH key。”按 Claude Code 2026-11-11 的 sandboxing 文档，沙箱开了之后，默认仍读得到 `~/.ssh`、`~/.aws/credentials`，要另外设 `denyRead` 或挡住工作目录以外的读取。请以你现在打开的官方文档为准。
- “Auto mode 或 Auto-review 分类器等于有人审过。”Cursor 的 [Agent Security](https://cursor.com/docs/agent/security) 写：Run Modes 是 best-effort guardrails，不是硬性安全边界。Claude Code 的起始权限模式也请用 `/permissions` 与官方文档确认，不要假定分类器已经替你负责。
- “ASI01 是最危险的。”编号不是严重程度排名，OWASP 没有为这十项打分数。
- “我只用一个 agent，Top 10 和我无关。”大多数项目仍然适用；比较常能先跳过的是 ASI07。
- “勾完就安全。”没有这回事。OWASP 给的是可着手的对策；Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 也写“no system is completely immune to all attacks”。这份十题是检查起点，不是做完就结束的保证。

## 结论与下一步

今天先做盘点、把十题答完，再按“做了就收不回”的项目开始修；把规则和权限设置放进 git，之后每加一个工具就再跑一轮。自动化检查可看[hooks 篇](/zh-CN/posts/claude-code-hooks-automate-checks/)，规则文件可看[AGENTS.md 篇](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)，CI 上的短期凭证可看[npm Trusted Publishing 篇](/zh-CN/posts/npm-trusted-publishing-github-actions/)。

官方来源是 OWASP GenAI Security Project 的《[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)》（[PDF](https://genai.owasp.org/download/52117/)，CC BY-SA 4.0）。工具文档可看 [Claude Code permissions](https://code.claude.com/docs/en/permissions)、[sandboxing](https://code.claude.com/docs/en/sandboxing)、[security](https://code.claude.com/docs/en/security)、[Codex Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)、[Cursor Agent Security](https://cursor.com/docs/agent/security)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)，以及 [GitHub Actions Secure use](https://docs.github.com/en/actions/reference/security/secure-use)。
