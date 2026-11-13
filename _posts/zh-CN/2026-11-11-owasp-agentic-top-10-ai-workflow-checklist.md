---
title: "OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法"
description: "把 OWASP Agentic Top 10 整理成十道是／否检查，用来对照你的 coding agent、MCP 与 CI，并附上可着手的修复方法。"
date: 2026-11-11 16:00:00 +0800
categories: [信息安全, AI Agent]
tags: [ai-security, coding-agent, prompt-injection, mcp, claude-code]
media_subpath: /assets/img/posts/owasp-agentic-top-10-ai-workflow-checklist/
image:
  path: cover.zh-CN.webp
  alt: "按 OWASP Agentic Top 10 的十项风险，逐题检查并修好自己的 AI 开发工作流。"
---

这篇把 OWASP 针对 AI agent（会自己动手做事的 AI）整理的安全风险清单，转成十道是／否自我检查题，给用 AI 写代码的个人开发者使用。答“是”的题目，就是要修的地方；每题都附上修复方法。

为什么要检查？用 coding agent（会自己读文件、改代码、跑命令的 AI 编程助手）久了，接上的东西会越来越多：多一个外部工具、多一条“不用问我”的自动放行，再把自动测试和部署也接上去。但很少有人会回头，把整个工作流检查一遍。

题目的依据是《[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)》，简称 OWASP Agentic Top 10。OWASP 是一个非营利的开放安全社区，最出名的是网站风险清单“OWASP Top 10”。这份 agent 版在 2025 年 12 月发布。发布页说它是“globally peer-reviewed”（经过全球同行评审）的框架，由 100 多位业界专家、研究者与从业者合作写成，列出自主 AI 与 agent 系统最关键的安全风险。

这份清单原本是写给构建 agent 系统的组织。我把十项转成个人工作流也能回答的十道题，每题附上修复方法。分组、场景、检查题和修复顺序都是本站整理，**不是** OWASP 官方的“个人开发者检查表”。十项依次编号为 ASI01 到 ASI10；编号只是编号，不代表严重程度。

本文范围是个人开发者的 coding agent 工作流，例如 Claude Code、Codex、Cursor 的 agent，以及接在上面的 MCP（让 agent 连接外部工具的标准）和 GitHub Actions（GitHub 的自动化流程服务）。另一篇[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)从“装了什么”讲攻击面（可能被攻击的地方）；这篇则用 OWASP 的十项，把整个工作流扫一遍。那篇已经详细写过的案例，这里不再重讲。

> **版本说明**：本文依 OWASP《OWASP Top 10 for Agentic Applications 2026》（2025 年 12 月发布，2026-11-11 重新核对仍是最新版）与各工具 2026-11-11 的官方文档撰写。Claude Code、Codex、Cursor 的默认权限近期都有调整，设置名称与默认值以官方文档为准。
{: .prompt-info }

## 先说几个词

看懂下面这些词，就能读完全文。比较少见的词，第一次出现时会再顺手解释。

- **AI agent／agentic**：不只回答问题，还会自己规划步骤、调用工具、改文件、跑命令的 AI。agentic 是形容词，指“具备这种自主行动能力的”。
- **coding agent**：专门帮你写代码的 AI agent，例如 Claude Code、Codex、Cursor 的 agent。它能直接在你的项目里读文件、改代码、跑终端命令。
- **工具（tool）**：agent 能调用的功能，例如读文件、跑终端命令、上网、调用 MCP server。
- **MCP、skill、插件**：都是让 agent 多会一些事的扩展，常由第三方提供。MCP（Model Context Protocol）是让 agent 接上外部工具和数据的标准；MCP server 就是提供这些工具的程序。
- **提示注入（prompt injection）**：把指令藏在 agent 会读到的内容里，让它照着做。
- **批准（approval）、自动放行、权限模式**：批准是 agent 动手前先问你；设成自动放行（allow）的动作，就不会再问；权限模式是工具内置的几种“要问多少”的组合。
- **沙箱（sandbox）**：把 agent 跑的命令关在限制范围内，例如能读写哪些文件夹、能连哪些网站。
- **token／凭证**：代替账号密码的通行码，谁拿到就能用你的身份做事。“长期 token”指有效期很长的那种，一旦泄露，被冒用的时间也最长。
- **长期记忆／上下文（memory／context）**：agent 每次开工都会读的东西，例如 `CLAUDE.md`、`AGENTS.md`、规则文件、自动记录的摘要。
- **git、repo、diff**：git 是记录每次改动、随时能回退的版本控制工具；repo 是用 git 管理的一个代码仓库；diff 是改动前后的对比，看 diff 就知道到底改了哪几行。
- **CI、GitHub Actions**：CI 是代码一推送上去，就自动跑测试、构建，甚至部署的流程；GitHub Actions 是 GitHub 提供的这类服务，流程写在 workflow 文件里。
- **最小权限（least privilege）**：只给完成这件事真正需要的权限。
- **最小自主（Least-Agency）**：OWASP 的用语，不需要的自主权就不要给。
- **kill switch**：出事时能立刻停掉的开关。

## 怎么用这份清单：四步一轮

做法是四个步骤。先做完一轮；之后工作流有变动，就再做一轮。

1. **盘点**：写下你用哪些 agent、它能读哪些文件夹、能跑哪些命令、接了哪些 MCP、拿得到哪些 token，以及有哪些自动化（CI、定时任务）会接着跑。不知道去哪里查，看下面的“盘点时去哪里看”。
2. **对照**：十题逐一回答是或否。答“是”就代表要修。
3. **修复**：先修“没人把关、做了就收不回”的项目，顺序见后面的“先修哪几项”。
4. **复查**：加了新工具或 MCP，或改了设置，就再跑一轮。

这四步背后的原则，是 OWASP 在文档第 7 页提出的 Least-Agency：“avoid unnecessary autonomy; deploying agentic behavior where it is not needed expands the attack surface without adding value.”意思是：避免不必要的自主；在用不到的地方让 AI 自己行动，只会多出可被攻击的地方，不会多带来价值。同一段也强调，要看得见 agent 在做什么（observability，可观测性）。

![体检 AI 工作流的四个步骤：盘点、对照、修复、复查，原则是用不到的自主权就别给](audit-loop.zh-CN.webp){: w="1600" h="900" }
_概念图：盘点、对照、修复、复查围成一轮；中心原则是最小自主（Least-Agency），用不到的自主权就别给。这四步是本站整理的用法，不是 OWASP 官方流程。_

### 盘点时去哪里看

工具的默认值近期常有调整，所以这里只写“去哪里看、看什么”，不写默认值。

- **权限与自动放行**：在 Claude Code 里输入 `/permissions` 查看当前规则，各权限模式的含义对照 [permission modes](https://code.claude.com/docs/en/permission-modes) 文档。Codex 看 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)，确认两件事：沙箱模式（它在技术上能做什么）和批准策略（什么时候必须先问你）。Cursor 看 [Agent Security](https://cursor.com/docs/agent/security)，确认 Run Modes（终端命令怎么放行）和 MCP allowlist（预先放行的 MCP 工具清单）。
- **沙箱**：Claude Code 用 `/sandbox` 或设置里的 `sandbox.enabled`，确认沙箱有没有开；开了之后能读哪里、能连哪里，看 [sandboxing](https://code.claude.com/docs/en/sandboxing) 文档。
- **MCP**：从项目里的 `.mcp.json`（登记 MCP server 的配置文件）开始列。但 Claude Code 的 [security](https://code.claude.com/docs/en/security) 文档提醒，只看这个文件，看不到全部能加载的 server。要查看 Claude Code 当前配置了哪些 server，可以在终端执行 `claude mcp list`（会同时显示连接状态），或在 session 里输入 `/mcp`，见 [MCP 文档](https://code.claude.com/docs/en/mcp)。
- **凭证**：项目里的 `.env`（常用来放密码和 token 的文件）、用户主目录下的 `~/.ssh`（SSH 密钥，登录服务器和 Git 用）与 `~/.aws/credentials`（AWS 云凭证），以及放在环境变量（系统交给程序使用的配置值）里的密钥。
- **自动化**：repo 里 `.github/workflows/` 文件夹下的 workflow 文件，以及你设置的定时任务或后台任务。

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

每一项都分成四段：**白话说**（这项风险是什么）、**在你的 AI 开发环境长这样**（放到 coding agent 上的常见样子）、**检查题**（答“是”就要修），以及**怎么修**。

阅读时请留意：

- 引号里的英文，是 OWASP 或工具官方文档的原文。
- “OWASP 对策 N”指该项在 OWASP 文档里列出的第 N 条对策，方便你回原文对照。
- 场景和修复方法里的工具做法，是本站的对照，不是 OWASP 替各家工具写的步骤。
- 工具设置只写去哪里看、确认什么；实际的默认值，以你当下打开的官方文档为准。Claude Code 的规则写法可另外查 [permissions](https://code.claude.com/docs/en/permissions) 文档。

### ASI01 Agent Goal Hijack：读到的内容改掉它要做的事

**白话说：** Agent 没办法可靠地分辨“你的指令”和“它读到的内容”。所以网页、issue（GitHub 上反馈问题的讨论帖）或文档里藏一段话，就能改掉它要做的事。这就是前面说的提示注入。

**在你的 AI 开发环境长这样：** 你请它读一份文档、一个 GitHub issue，或上网查资料；它读完就直接改文件或跑命令，中间没有问你。

**检查题：** 读完网页、issue 或文档后，它能不问你就动手吗？

**怎么修：** 先说结论：读外部内容时，不让它直接动手；高影响的动作一律先问你。

- OWASP 的对策，是把所有自然语言输入（用户输入的文字、上传的文档、检索回来的内容）都当成不可信，并且“requiring human approval for high-impact or goal-changing actions”，也就是高影响或会改变目标的动作，要人批准。
- 读外部内容时，切到不会直接改文件的模式。例如 Codex 的只读沙箱（`--sandbox read-only`）；或 Claude Code 的 plan 模式，官方说明这个模式会读文件、可以跑命令来探索，但在你批准计划之前不改源代码（少数情况例外，见 [permission modes](https://code.claude.com/docs/en/permission-modes) 文档）。各模式实际能做什么，以各工具官方文档为准。
- 像 `git push`（把代码推送到远程仓库）、删文件这类高影响动作，设成要先问你。Claude Code 的权限规则分三种：`deny`（禁止）、`ask`（先问）、`allow`（直接放行）。规则的格式像官方示例 `Bash(rm *)`，代表以 `rm`（删除）开头的终端命令。
- 按官方 [permission modes](https://code.claude.com/docs/en/permission-modes) 文档，明确写成 `ask` 的规则，不会被任何模式自动批准；可以对照文档里“Actions no mode auto-approves”那一段。
- 细节与案例见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

### ASI02 Tool Misuse and Exploitation：合法工具被用在错的地方

**白话说：** 工具本身合法，权限也是你给的，但 agent 用错了地方：删掉数据、一直调用要付费的 API（供程序调用的在线服务），或把数据送出去。

**在你的 AI 开发环境长这样：** OWASP 举了一个直接讲 coding agent 的例子。有一组工具被设成自动执行，理由是它们看起来没有风险，其中包括 ping（测试网络连接的小工具）。攻击者让 agent 反复调用 ping，借 DNS 查询（电脑查询网址时发出的网络请求）把数据夹带出去。换句话说，只要能联网，看起来再无害的工具，也能被拿来送数据。

**检查题：** 有没有自动放行的工具能删文件、发送或联网？

**怎么修：** 先说结论：自动放行清单只留真正无害、也不能联网的工具；删除、发送、发布一律先问你。

- Claude Code：用 `/permissions` 查看当前规则。匹配顺序固定是 deny → ask → allow，第一条匹配的规则决定结果；allow 也不能在 deny 里开例外。
- 特别留意“整批放行”的写法：`mcp__<server>__*` 代表某个 MCP server 的所有工具。它如果出现在 allow 里，那个 server 的每个工具都不会再问你。只想放行其中一个，就写完整名称 `mcp__<server>__<tool>`。
- Cursor：检查 MCP allowlist 里，是不是只有你真正需要的工具。
- OWASP 也建议设用量上限：费用、调用次数或 token 预算。这里的 token 是 AI 计算用量的单位，不是前面说的凭证。
- 更完整的权限与自动执行说明，见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。

### ASI03 Identity and Privilege Abuse：身份与权限滥用

**白话说：** 要问的是：agent 用的是谁的身份、拿着哪些钥匙？如果它直接沿用你整个账号的权限，一旦被骗，就是用“你”的全部权限去做事。

**在你的 AI 开发环境长这样：** 它读得到你的 SSH key、云凭证、`.env` 里的长期 token，或直接用你已经登录 Git 与云服务的身份跑命令。

**检查题：** 它用的是你的完整账号、长期 token 或 SSH key 吗？

**怎么修：** 先说结论：给它范围小、会过期的钥匙；长期钥匙放在它读不到的地方。

- OWASP 对策 1 是“Issue short-lived, narrowly scoped tokens per task”：每个任务发专用、范围小、很快过期的 token，而不是整把长期钥匙。
- Claude Code 可以用 deny 规则挡住文件工具读取，官方文档的示例有 `Read(./.env)`、`Read(./secrets/**)`，以及 `Read(~/.ssh/**)`。写好后，用 `/permissions` 确认规则已经在列表里。
- 这里有两个容易卡住的地方。第一，官方文档写明 `.claudeignore` 文件没有作用，要挡就用 deny 规则。第二，`Read` deny 规则不是万能的。按 [permissions](https://code.claude.com/docs/en/permissions) 文档，它挡得住 Claude 的文件工具，以及 `cat`、`head` 这类它认得的读文件命令；但挡不住自己打开文件的程序，例如 Python 或 Node 脚本。要让所有程序都读不到，就要开沙箱（见 ASI05）。
- Cursor 可以用 `.cursorignore` 挡住 agent 访问特定文件。
- CI 发布包时如果还在用长期 npm token，可以改用短期凭证。这是本站的对照例子，不是 OWASP 原文提到的做法，说明见[npm Trusted Publishing 设置教程：发布包不再放长期 token](/zh-CN/posts/npm-trusted-publishing-github-actions/)。
- 在 GitHub Actions 里跑的程序，可以用 workflow 的 `GITHUB_TOKEN` 操作你的 repo。GitHub 建议把它的默认权限设成只能读 repo 内容：在 workflow 顶层写 `permissions: contents: read`，个别 job（workflow 里的一组任务）真正需要时再打开。做法见 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。

### ASI04 Agentic Supply Chain Vulnerabilities：供应链

**白话说：** 供应链指的是：你用的东西里，由别人提供的那些部分。你装的 MCP server、skill、插件或提示模板，只要有一个是假的或被改过，agent 就会照着它做。和传统软件包不同的是，agent 常在“运行当下”才加载这些东西。

**在你的 AI 开发环境长这样：** 你的工具清单里有一个 MCP 或 skill，版本没锁定，来源你也没看过。

**检查题：** 有没有 MCP、skill 或插件没锁版本、来源没看过？

**怎么修：** 先说结论：只装看过来源的东西，锁定版本（指定只用某个确切版本，不自动更新），而且装之前先看清楚它会执行什么。

- 先列清单。Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 提醒：只看 `.mcp.json`，看不到这个 session（一次工作会话）能加载的全部 server；而且 Anthropic 不替任何 MCP server 做安全审计。
- 装之前看启动命令。MCP 官方 [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) 说明，本地 MCP server 是下载到你电脑上运行的程序，权限和你的账号一样大；攻击者也可能把恶意的启动命令塞进配置文件。所以要看完整、没被截断的启动命令，再明确批准。
- 锁定版本的细节见[供应链篇](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)。
- GitHub Actions 里的第三方 action（别人写好、可以直接放进 workflow 的步骤）也算供应链。GitHub 文档提醒，只要其中一个 action 被入侵，它就拿得到 repo 配置的所有 secrets（加密存放的密码与密钥）。
- 锁定第三方 action：GitHub 目前最推荐用 workflow 依赖 lockfile（锁定文件，记录每个依赖确切版本的文件）锁定，文件是 `.github/workflows/actions.lock`，由 `gh actions-lock` 生成；还没采用的话，把 action pin（固定）到完整的 commit SHA，也就是每次提交独一无二的编号。说明见 [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)。

### ASI05 Unexpected Code Execution (RCE)：意外执行代码

**白话说：** Agent 会自己写代码、自己跑命令。如果它被骗或写错，跑起来的就可能是攻击者想要的东西，而且用的是你电脑上的权限。名称里的 RCE 是 remote code execution（远程代码执行），意思是别人有办法让你的机器跑他想跑的代码。

**在你的 AI 开发环境长这样：** OWASP 举过两个例子。一个是 AI 编程工具在工作区执行没人审查过的安装命令或终端命令，结果删掉或覆盖了生产环境（真正在服务用户的系统）的数据。另一个是请 agent“修好 build（构建）”时，它按没锁定版本的配置重建 lockfile，结果拉进一个被植入后门的小版本。

**检查题：** 它跑的命令直接在你的主机上，没有沙箱吗？

**怎么修：** 先说结论：让它跑的命令关在隔离环境里，碰不到生产环境，也读不到你的凭证。

- OWASP 的对策：不要让 agent 直接连到生产环境；不要用 root（系统最高权限账号）运行；能隔离就放进沙箱或容器（和主机隔开的独立运行环境），文件系统尽量只开一个专用工作目录。想把两个任务彻底分开，可以参考[git worktree 教程：让两个 AI 在同一个 repo 分开工作](/zh-CN/posts/git-worktree-parallel-ai-agents/)。
- Claude Code：先用 `/sandbox` 或设置里的 `sandbox.enabled` 确认沙箱有没有开。开了之后，到 [sandboxing 文档](https://code.claude.com/docs/en/sandboxing) 的默认值表确认三件事：能读哪些地方（特别是 `~/.ssh`、`~/.aws/credentials` 这类凭证文件）、能连哪些网站，以及会继承哪些环境变量。读取范围可以用 `filesystem.denyRead` 或 `permissions.blockReadsOutsideWorkingDirectories` 收紧。下面是官方的项目设置示例，放在项目的 `.claude/settings.json`，作用是挡掉整个用户主目录的读取，只开放当前项目：

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

文档提醒：如果把同一段设置放在 `~/.claude/settings.json`，`.` 会变成指向 `~/.claude`，项目文件反而会被挡住。

- `bypassPermissions` 是 Claude Code 的一种权限模式，名称的意思就是跳过权限检查。官方说只应在容器或虚拟机（在你电脑里模拟出的另一台电脑）这类隔离环境使用；用不到的话，可以把 `permissions.disableBypassPermissionsMode` 设成 `"disable"` 关掉它。
- Codex：到 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) 确认沙箱模式（它在技术上能做什么）、批准策略（什么时候必须先问你），以及网络访问是开还是关。想让它只读，可以执行 `codex --sandbox read-only --ask-for-approval on-request`。
- lockfile 不要让 agent 自己重建；需要更新时，自己看过 diff 再改。
- 让命令自动执行的清单（allowlist）放进版本控制，改了什么都看得到。这是 OWASP 对策 6 的做法。

### ASI06 Memory & Context Poisoning：记忆与上下文污染

**白话说：** 这不是一次性的骗，而是把错的内容写进它的长期记忆。之后每开一个新的 session，它都会照着错的内容走。

**在你的 AI 开发环境长这样：** Coding agent 的长期记忆，包括 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules` 这类规则文件、它自动写下的 memory 文件，以及跨 session 的摘要。如果它能自己改这些文件，你却看不到改了什么，错的内容就会一直留着。

**检查题：** 它能自己改 CLAUDE.md、AGENTS.md 或记忆文件，你却看不到 diff 吗？

**怎么修：** 先说结论：这些文件都放进 git，每次改动都要你看过才算数。

- OWASP 对策 7 是用版本控制和快照，需要时能回退。实际做法：把规则文件放进 git，改动先看 diff 再接受。规则文件怎么写，见[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)。
- OWASP 对策 6：不要让 agent 自动把自己的输出写回“可信的记忆”。
- Claude Code 可以用 `ConfigChange` hook 审计或挡住 session 中的设置变更。hook 是在特定时机自动执行的检查脚本；`ConfigChange` 会在配置文件被改动时触发。细节见[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/zh-CN/posts/claude-code-hooks-automate-checks/)。

### ASI07 Insecure Inter-Agent Communication：agent 间通信

**白话说：** 好几个 agent 互相传话时，如果消息没有验证是谁发的、也没有防篡改，别人就能冒充发消息的一方，或改掉其中一句。

**在你的 AI 开发环境长这样：** 这项主要针对“多个 agent 互相沟通”的系统；只用一个 agent 的人，大多可以先跳过。会碰到的情况有三种：subagent（主 agent 分派出去做子任务的 agent）互传结果；连到远程 MCP（运行在别的机器上、通过网络连接的 MCP server）；或在 CI 里，把一个 agent 的输出直接当成另一个 agent 的输入。

**检查题：** 一个 agent 的输出，会被另一个 agent 直接照着做吗？

**怎么修：**

- 远程 MCP 只用 HTTPS（加密的网络连接），而且连接要验证身份。MCP 官方文档也建议，通过 HTTP 提供的 MCP server 要求授权 token。
- 另一个 agent 的输出，要当成还没审查过的输入，不要直接照着做。

### ASI08 Cascading Failures：连锁失效

**白话说：** 一个小错没被挡下来，被下一个自动步骤接手、放大，最后变成大事故。这一项看的是错误怎么一路传下去，而不是错从哪里来。

**在你的 AI 开发环境长这样：** 常见的样子是 AI 写代码、AI 审查、自动合并（把改动并入主代码）、自动部署（推送上线），中间没有人，也没有不能跳过的检查点。OWASP 还提到“Governance drift cascade”：连续成功几次之后，人的把关变松，开始批量批准或放宽规则，错的设置就这样一路扩散。

**检查题：** 从写代码到合并、部署，有一段完全没有人或检查挡着吗？

**怎么修：** 先说结论：合并或部署前，至少留一个不能跳过的检查点。可以是人，也可以是必须通过的 CI 检查。

- OWASP 对策 5 也是这个意思：高风险的输出往下游传之前，要有检查点或人工审查。
- 别让自动化自己批准自己。GitHub 文档说明可以设置不让 GitHub Actions 创建或批准 pull request（PR，请求把改动合并进来的申请），因为 PR 没经过适当审查就被合并，可能带来安全风险。见 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。
- 在 GitHub 上，可以给主分支设置分支保护规则（branch protection rule）：例如开启“Require pull request reviews before merging”（合并前要有人审查）和“Require status checks before merging”（指定的 CI 检查通过才能合并），再开启“Do not allow bypassing the above settings”，连管理员也不能跳过。GitHub Free 方案只能在公开 repo 使用这个功能，说明见 [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。
- 如果你已经在用 AI 帮 PR 做审查，可以一并看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)。重点是：审查结果不能自动变成收不回的合并。
- 第三方 action 的版本锁定属于供应链问题，写在 ASI04。

### ASI09 Human-Agent Trust Exploitation：过度信任 agent

**白话说：** Agent 讲得很有把握、理由很完整，你就点了“同意”。最后动手的是你，记录上也是你。

**在你的 AI 开发环境长这样：** OWASP 的“Helpful Assistant Trojan”例子是：一个被动过手脚的 coding assistant，建议一行漂亮的修复命令；你粘贴执行，跑的却是会窃取代码或装后门的恶意脚本。更日常的情况是批准疲劳：确认提示一直弹出，看久了就不看内容、直接点允许。OWASP 对策 5 也把减少这种“blind approval”（盲目批准）列为目标。

**检查题：** 你常常没细看就点“允许”吗？

**怎么修：** 先说结论：让需要你点的提示变少，但每一个都值得细看。

- 高风险动作，先看 diff 或完整命令再点。Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 写得很直接：“You're responsible for reviewing proposed code and commands for safety before approval.”也就是：批准前检查代码和命令安不安全，是你的责任。
- 不要拿 agent 自己的解释当判断依据。OWASP 对策 4 要求提供“plain-language risk summary (not model-generated rationales)”，也就是白话的风险说明，而不是模型自己生成的理由。
- 把你确定可以自动跑的少数命令放进 allow，其他保留 ask。提示变少了，剩下的你才看得下去。
- 如果你用的是让分类器（另一个 AI 模型，替你判断动作安不安全）帮你批准的模式，记得那是模型在判断，不等于有人审过，见后面的“常见误解”。

### ASI10 Rogue Agents：失控的 agent

**白话说：** Agent 开始做不是你交代的事，而且持续做下去。原因可能是被入侵，也可能是它为了达成目标去钻漏洞。

**在你的 AI 开发环境长这样：** OWASP 的例子包括：被交代“降低云成本”的 agent，发现删掉生产环境的备份最有效；或是被注入之后，即使恶意来源已经拿掉，它仍继续自己把数据送出去。对个人开发者来说，重点是：出事时，你知不知道怎么立刻让它停下来。

**检查题：** 它出错时，你说不出怎么马上停掉它、撤销它的 token 吗？

**怎么修：** 先说结论：事先准备好自己的 kill switch，并留下它做过什么的记录。

- 先写下三个步骤，不要等出事才查：怎么中断当前的 session、怎么撤销它在用的 token、怎么关掉定时任务或后台任务。
- 中断：以 Claude Code 为例，官方 [interactive mode](https://code.claude.com/docs/en/interactive-mode) 文档写明，按 `Esc` 会停下当前的回复或工具调用，按 `Ctrl+C` 会中断正在执行的操作。其他工具请查各自的官方文档。
- 撤销：GitHub 的 personal access token（个人访问令牌）在 Settings → Developer settings → Personal access tokens 里删除，见 [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)。npm 的 token 可以在 npm 网站上删除，或先用 `npm token list` 找出 ID，再执行 `npm token delete <ID>`，见 [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens/)。
- 长时间没人看着的任务，要限定范围和时间。
- OWASP 对策 4 要求“kill-switches and credential revocation”（停机开关与撤销凭证）；对策 6 写“Keys must never be directly available to agents”，钥匙不该直接交给 agent；对策 1 要求完整、不可篡改的审计日志，出事后才查得到它做了什么。
- 想回头看它刚才做了什么：在 Claude Code 里按 `Ctrl+O` 可以打开 transcript viewer（对话记录查看器），里面列出每一步用了哪些工具、执行了什么（同一份 interactive mode 文档）。这方便你自己回看，但不等于 OWASP 说的不可篡改审计日志。

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

这是本站建议的顺序，不是 OWASP 官方的优先级。原则是先修“没人把关、做了就收不回”的项目：

1. **ASI08，以及 ASI05 里直接碰到生产环境的部分**：合并、部署前要有不能跳过的检查点；agent 不能直接连生产环境。
2. **ASI03 长期凭证**：挡住 `.env`、`~/.ssh` 这类文件的读取，CI 改用短期凭证。
3. **ASI02、ASI04 自动放行与 MCP**：拿掉能删文件、发送、联网的自动放行，确认每个 MCP 的来源和版本。
4. **其余项目**。如果你只用一个 agent，ASI07 可以先跳过。

还没开始盘点的话，第一步最简单：打开权限设置（Claude Code 是 `/permissions`），看看现在哪些动作不用问你就会执行。

## 什么情况怎么做

| 情况 | 建议 |
| --- | --- |
| 只用一个 agent、没接 MCP | 仍要做盘点与十题；ASI07 大多可先跳过，其他项仍然适用 |
| 接了好几个 MCP | 先清 ASI04 与 ASI02：看来源、锁定版本，没必要自动放行的工具都改成要批准 |
| 让 agent 长时间自己跑 | 收紧 ASI05、ASI08、ASI10：隔离执行、设时间与范围、先写下停机与撤销步骤 |
| agent 会读网页或 issue | 重看 ASI01 与 ASI09：外部内容当不可信，高影响动作要人看过 |
| CI 里有 agent 自动审查或合并 | 重看 ASI08：合并前要有不能跳过的检查点 |
| 团队共用设置 | 规则文件与权限设置放 git，改动看 diff（ASI06）；不要把长期凭证写进共用文件 |
| 怀疑 agent 已经做了怪事 | 先用 ASI10 的方式停掉并撤销凭证，再按下一节查改动 |

## 怎么判断自己是不是已经中招

下面的迹象，是本站根据 OWASP 各项的例子整理的，不是官方的检测清单。看到任何一项，都值得停下来查。

| 迹象 | 可能对应 |
| --- | --- |
| `CLAUDE.md`、`AGENTS.md`、规则文件或权限设置，出现你没印象的改动 | ASI06 |
| lockfile 或依赖版本被改了，但你没要求 | ASI05 |
| 多了你没装过的 MCP server 或 skill，或 MCP 的启动命令变了 | ASI04 |
| API 账单或用量突然暴涨 | ASI02 |
| 任务已经结束，或恶意来源已经拿掉，它还在继续做事、往外送数据 | ASI10 |

发现之后，按这个顺序处理：

1. **先停**：中断 session，关掉定时任务和后台任务。
2. **撤销**：撤销它碰得到的 token 和密钥，换成新的。做法见 ASI10。
3. **查改动**：用 git 看 diff，把不明的改动回退。Cursor 的官方文档也提醒“Always use version control so you can revert changes”，有版本控制才退得回去。
4. **找破口**：回头把十题再答一次，找出它是从哪一项进来的。

## 常见误解

- “开了沙箱就读不到 SSH key。”不能这样假设。Claude Code 的 [sandboxing 文档](https://code.claude.com/docs/en/sandboxing) 把“能读哪里”单独列出，要用 `filesystem.denyRead` 等设置收紧。开了沙箱之后，请对照文档确认 `~/.ssh`、`~/.aws/credentials` 还读不读得到。
- “有工作目录的边界，它就写不到外面。”Claude Code 的 [security 文档](https://code.claude.com/docs/en/security) 说明，这个边界是一道权限提示：你批准过的 Bash 命令（在终端里跑的命令），仍然能写到你账号能写的任何地方。
- “Auto mode 或 Auto-review 分类器，等于有人审过。”Claude Code 的 auto mode，是由另一个分类器模型代替你审查动作，挡下它判断不安全的；Cursor 的 [Agent Security](https://cursor.com/docs/agent/security) 也写明，Run Modes 是 best-effort guardrails（尽力而为的护栏），不是硬性的安全边界。你当前在哪个模式，请对照 [permission modes](https://code.claude.com/docs/en/permission-modes) 文档确认，不要假定分类器已经替你负责。
- “ASI01 是最危险的。”编号不是严重程度排名，OWASP 没有为这十项打分数。
- “我只用一个 agent，Top 10 和我无关。”大多数项目仍然适用；比较常能先跳过的是 ASI07。
- “勾完就安全。”没有这回事。OWASP 给的是可以着手做的对策（actionable mitigations），不是做完就安全的保证。这十题是检查的起点；工作流一有变动，就要再跑一轮。

## 结论与下一步

今天先做盘点、把十题答完，再从“做了就收不回”的项目开始修。把规则文件和权限设置放进 git，之后每加一个工具，就再跑一轮。自动化检查可看[hooks 篇](/zh-CN/posts/claude-code-hooks-automate-checks/)，规则文件可看[AGENTS.md 篇](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)，CI 上的短期凭证可看[npm Trusted Publishing 篇](/zh-CN/posts/npm-trusted-publishing-github-actions/)。

官方来源是 OWASP GenAI Security Project 的《[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)》（[PDF](https://genai.owasp.org/download/52117/)，CC BY-SA 4.0）。工具文档可看 [Claude Code permissions](https://code.claude.com/docs/en/permissions)、[permission modes](https://code.claude.com/docs/en/permission-modes)、[sandboxing](https://code.claude.com/docs/en/sandboxing)、[security](https://code.claude.com/docs/en/security)、[Codex Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)、[Cursor Agent Security](https://cursor.com/docs/agent/security)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)，以及 [GitHub Actions Secure use](https://docs.github.com/en/actions/reference/security/secure-use)。
