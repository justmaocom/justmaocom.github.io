---
title: "装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？"
description: 从 MCP 工具描述下毒、GitHub issue 诱导泄露、Cursor 与 mcp-remote 的 CVE，到 Nx 恶意包让本地 AI 工具帮忙翻文件，拆解 Coding Agent 的供应链与权限风险，整理一份装之前、用的时候、出事之后都能照着做的检查清单。
date: 2026-10-16 16:30:00 +0800
categories: [信息安全, AI Agent]
tags: [ai-security, coding-agent, mcp, agent-skills, prompt-injection, supply-chain-security]
media_subpath: /assets/img/posts/coding-agent-supply-chain-permission-risks/
image:
  path: cover.png
  alt: 封面：一个 Coding Agent 接上插件、工具和网络，旁边列出四个风险入口和一份检查清单。
---

星期一早上，你在 Claude Code 里装了一个同事推荐的 skill，又在 Cursor 加了一个能查 GitHub issue 的 MCP server。配置文件只多了十几行，看起来很无害。

但从这一刻起，你的 Coding Agent 会读一些你没写过的指示，会跑一些你没看过的程序，手上还拿着你的 GitHub 令牌。这篇想回答两件事：这样多出了哪些破口？哪些值得花力气补，哪些只是听起来可怕？

> 本文把三种内容分开标示：**事实**是公开来源写明的事，每条都附链接；**推论**是我根据事实往下推的；**观点**是我的判断，可以不同意。来源都在 2026 年 10 月 16 日重新打开确认过。
{: .prompt-info }

先讲结论：这件事不需要恐慌，但需要把 skill 和 MCP 当成“会在你电脑上运行的软件”来对待，而不是“一段配置”。

## 三个先讲清楚的词

| 词 | 一句话解释 |
| --- | --- |
| Skill | 一个文件夹，里面有给 AI 看的说明文件 `SKILL.md`，也可以附脚本；AI 判断用得上时会读它、照着做。 |
| MCP server | 一个帮 AI 接上外部工具的小程序，例如读 GitHub、查数据库；它会告诉 AI“我有哪些工具、怎么用”。 |
| Prompt injection（提示注入） | 把指令藏在 AI 会读到的内容里（网页、issue、文档、工具返回结果），让 AI 误以为那是该听的命令。 |

想多了解 skill 怎么装、怎么被 AI 调用，可以先看 [mattpocock/skills 系列（1）](/posts/mattpocock-skills-setup-routing-guide/)。

## 问题情境：你其实多请了两种外包

把 Coding Agent 想成一位很能干、但什么都照单全收的助理。装 skill，等于给他一本别人写的工作手册；接 MCP，等于帮他介绍一家外包厂商，厂商会自己报上“我能做哪些事”。

助理会照手册做事，也会相信厂商的自我介绍。麻烦在于，手册和介绍都不是你写的，而助理手上拿着你的钥匙。

**事实**：Anthropic 的 [Agent Skills 文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview#security-considerations)写明，只该用自己写的或 Anthropic 提供的 skill；恶意 skill 可以让 Claude 以不符合用途的方式调用工具或运行程序。同一份文档也写明，在 Claude Code 里，skill 的[网络权限和电脑上其他程序一样](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview#runtime-environment-constraints)。

**事实**：[Claude Code 安全文档](https://docs.claude.com/en/docs/claude-code/security#mcp-security)写明，Anthropic 不会替任何 MCP server 做安全审计或托管。

也就是说，供应商自己都把责任交回给你了。

## 攻击面拆解：四个入口

![一个 Coding Agent 在中间，四个方向各有一个入口：工具返回结果与文档里藏的指令、恶意或被篡改的 skill 与 MCP、过大的权限与凭证、自动运行的指令；底部写着“四个入口，常常串在一起用”](attack-surface-map.png){: width="800" height="450" }
_四个入口很少单独出现，真正的攻击通常是把两三个串起来。_

### 入口一：藏在内容里的指令

AI 不太会分“谁说的”。你下的指令、网页内容、issue 内文、MCP 工具的说明，最后都被拼成同一串文本喂给模型。

**观点（引用）**：Simon Willison 在 [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) 里说得很直接：模型无法可靠地依来源分辨指令的轻重。他提出一个好用的判断法：只要同时具备三个条件，就很容易被偷数据：

1. 能读到你的私人数据
2. 会接触到别人能控制的内容
3. 能往外传东西（发请求、开 PR、甚至只是产生一个链接）

这不是正式标准，但拿来检查自己的设置非常好用。后面的防护也会一直回到这三条。

### 入口二：恶意或被篡改的 skill / MCP

Skill 和 MCP server 的本质都是第三方代码加第三方文本。风险分两种：

- **一开始就不怀好意**：说明里夹带指令，或脚本会偷偷做别的事。
- **原本没问题，后来变了**：作者账号被盗、包被换版本，或服务器端悄悄改了工具说明。

第二种比较阴险，因为你当初审过、也批准过。

### 入口三：权限太大、凭证太好拿

Agent 能做的事，等于它拿到的权限总和。本地的 `~/.ssh`、环境变量里的 API key、`gh` 登录后的令牌、MCP 配置文件里的连接密码，只要 agent 跑起来的那个用户读得到，它就读得到。

**事实**：[MCP 官方的安全最佳实务](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#local-mcp-server-compromise)写明，本地 MCP server 会以和 MCP 客户端相同的权限运行；它也把“一次要一大包权限范围”列为常见错误，因为令牌一旦泄露，影响范围随之变大。

### 入口四：自动运行的指令

很多人为了不被一直问“可以运行吗”，会打开自动批准，甚至直接关掉沙箱。这省了很多时间，也拿掉了最后一道人工关卡。

**事实**：Codex 文档把 `--dangerously-bypass-approvals-and-sandbox`（别名 `--yolo`）标为[没有沙箱、也不需批准，不建议使用](https://developers.openai.com/codex/agent-approvals-security#common-sandbox-and-approval-combinations)。Claude Code 文档则提醒，在手动模式下[你批准过的 Bash 指令仍然可以写入你账号能写的任何地方](https://docs.claude.com/en/docs/claude-code/security#built-in-protections)，文件夹边界只是一个提示，不是墙。

## 案例：五件有第一手来源的事

以下每一件都附原始公告或研究报告。我把它们依“是研究示范还是真实事件”分开，因为这两者的意义不一样。

### 案例 1：MCP 工具说明被下毒（研究示范，2025 年 4 月）

**事实**：Invariant Labs 在 [MCP Security Notification: Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) 示范：一个看起来只会“把两个数字相加”的 MCP 工具，在工具说明里藏了指令，要 AI 先读 `~/.cursor/mcp.json` 和 `~/.ssh/id_rsa`，再把内容塞进一个不起眼的参数传出去，而且不要跟用户提。他们在 Cursor 上实验成功，并指出确认窗口没有显示完整的参数内容。

同一篇还提了两个延伸：

- **翻脸（rug pull）**：服务器可以在你批准之后才改工具说明。
- **屏蔽（shadowing）**：恶意服务器的说明可以改写 AI 使用“另一个可信服务器”工具的方式，例如让寄信工具把所有信都寄给攻击者。

**推论**：这说明“我只会用那个可信的工具”不足以保护你。只要恶意服务器跟可信工具装在同一个 agent 里，它的说明就已经在 AI 的眼前了。

### 案例 2：一条 GitHub issue 让私有仓库泄露（研究示范，2025 年 5 月）

**事实**：Invariant Labs 在 [GitHub MCP Exploited](https://invariantlabs.ai/blog/mcp-github-vulnerability) 里，于公开仓库 放了一条藏有指令的 issue。用户只请 agent“看一下公开仓库 的 open issues”，agent 读到那则 issue 后，就把私有仓库的信息拉进来，再用一个 PR 发到公开仓库。他们用的是 Claude Desktop 加官方 GitHub MCP server，并提到很多用户会选“永远允许”而不再逐一确认。

**事实**：报告本身强调，这不是 GitHub MCP server 代码的漏洞，而是系统层级的设计问题，工具全都是可信的也会发生。

**推论**：这是 lethal trifecta 三个条件刚好凑齐的教科书式例子：同一个令牌能读私有仓库（私人数据）、读公开 issue（外部内容）、开 PR（往外传）。

### 案例 3：Cursor 的 CVE-2025-54135（已修补的漏洞）

**事实**：根据 [Cursor 的安全公告 GHSA-4cxx-hrm3-49rm](https://github.com/cursor/cursor/security/advisories/GHSA-4cxx-hrm3-49rm) 与 [CVE 记录](https://www.cve.org/CVERecord?id=CVE-2025-54135)：1.3.9 以前的 Cursor 允许 agent 不经批准就在工作区创建新文件；编辑既有的以点开头的文件要批准，但“新建”不用。所以若工作区还没有 `.cursor/mcp.json`，攻击者可以搭配一个间接的提示注入，让 agent 写出这个文件、加进一个新的 MCP server，进而运行任意程序。公告的 CVSS 3.1 分数是 8.5，修补版本是 1.3.9。

**推论**：这把入口一（藏在内容里的指令）和入口四（自动运行）串在一起。配置文件本身就是“可以运行程序”的地方，agent 能不能写它，应该跟能不能跑 shell 一样严格。

### 案例 4：mcp-remote 的 CVE-2025-6514（已修补的漏洞）

**事实**：[CVE-2025-6514](https://www.cve.org/CVERecord?id=CVE-2025-6514) 记载，`mcp-remote`（一个让本地客户端连到远程 MCP server 的 npm 包）在连到不可信的 MCP server 时，会因为对方在 `authorization_endpoint` 返回的网址经过特制，而被注入操作系统指令。受影响版本是 0.0.5 到 0.1.15。CVE 记录附上了 [JFrog 的研究报告](https://jfrog.com/blog/2025-6514-critical-mcp-remote-rce-vulnerability)与[修补 commit](https://github.com/geelen/mcp-remote/commit/607b226a356cb61a239ffaba2fb3db1c9dea4bac)。

**事实**：MCP 安全最佳实务里也有对应条目：客户端[不得用 shell 指令打开授权网址](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#oauth-authorization-url-validation)，并且要挡掉危险的网址格式。

**推论**：“只是连上一个 MCP server”本身就是运行面的风险，不只是数据面。选择要连哪台服务器，跟选择要装哪个包是同一等级的决定。

### 案例 5：Nx 恶意版本让本地 AI 工具帮忙翻文件（真实事件，2025 年 8 月）

**事实**：根据 Nx 官方的 [安全公告 GHSA-cxm3-wv7p-598c](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c)，攻击者通过 GitHub Actions 的注入漏洞取得 npm 发布令牌，在 2025 年 8 月 26 日发布了多个恶意版本的 `nx` 与相关包。这些版本的安装后脚本会扫描文件系统、收集凭证，再以 `s1ngularity-repository` 为名在用户自己的 GitHub 账号下建仓库 上传。公告附录收录的脚本里，有一段写给“文件搜索 agent”的提示词，要它列出各种配置文件和环境文件的路径。

**事实**：Nx 的[事后检讨](https://nx.dev/blog/s1ngularity-postmortem)写明，恶意包会尝试使用本地的 AI 工具（例如 Claude 和 Gemini）。公告也特别提到，安装 npm 包的管道不只你自己打的 `npm install`，还包括依赖包、编辑器扩展、以及 AI agent；他们自家的 Nx Console 扩展就会自动安装最新版 `nx`，因此有人只是打开编辑器就中招。

**推论**：这件事把方向反过来了：不是有人攻击你的 agent，而是恶意程序把你已经登录、权限很大的 agent 当成工具来用。你给 agent 的权限越大、越不需要确认，这种“借刀”就越好用。

> 公告和事后检讨都没有公开说明，到底有多少人的本地 AI 工具真的被成功调用、做了哪些事。这部分我无法确认，请不要把它读成“AI 工具被大规模利用”。
{: .prompt-warning }

## 防护：四个方向，各自挡什么

![左边是三个条件：能读私人数据、会碰外部内容、能往外传，三个圆圈互相重叠；右边示范用最小权限、沙箱与断网、审查与锁版本，分别剪断其中一条；底部写着“三条凑齐就危险，至少剪断一条”](trifecta-cut.png){: width="800" height="450" }
_防护的目标不是让 AI 变聪明，而是让它就算被骗了也做不了大事。_

**观点**：没有任何一招能单独解决提示注入。目前比较实际的思路，是假设 agent 有一天一定会读到恶意内容，然后确保那一天它能造成的伤害很小。

### 1. 最小权限：给它刚好够用的钥匙

- GitHub 令牌用细粒度的、只开需要的 repo 和权限；不要直接把 `gh` 的完整登录状态给 agent。
- 一个工作阶段只碰一个项目。Invariant 在案例 2 的建议之一，就是[限制 agent 每个工作阶段只能操作一个 repo](https://invariantlabs.ai/blog/mcp-github-vulnerability)。
- MCP 授权范围从最小开始，需要时再加。这是 [MCP 安全最佳实务的“范围最小化”](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#scope-minimization)。
- 把凭证移出明文文件。Nx 的事后检讨也建议避免把令牌和 API key 明文放在配置文件里。

### 2. 沙箱：让它在围栏里跑

**事实**：

- Codex CLI 缺省用操作系统层级的沙箱，[缺省不开网络、只能写目前的工作区](https://developers.openai.com/codex/agent-approvals-security#sandbox-and-approvals)；在可写范围内，`.git`、`.codex`、`.agents` 这些文件夹仍是唯读。
- Claude Code 提供可配置文件系统与网络隔离的[沙箱 Bash](https://docs.claude.com/en/docs/claude-code/security#built-in-protections)，也建议处理不可信内容时用虚拟机或 dev container。

**事实**：沙箱有边界。Codex 文档写明，它的指令网络代理[不会过滤 MCP server 的连接、网页搜索或连接器调用](https://developers.openai.com/codex/agent-approvals-security#traffic-outside-the-command-network-proxy)；在 dev container 里用完全访问模式，恶意项目仍然能偷走容器内的一切，包括 Codex 的凭证。

**推论**：沙箱挡的是“agent 跑的指令”，不一定挡得到“MCP server 自己做的事”。本地 MCP server 是另一个程序，要另外隔离。

### 3. 审查：装之前看一遍，装之后看变化

- Skill 要看整个文件夹，不只 `SKILL.md`。Anthropic 文档列出的重点包括：[脚本、图片和其他资源都要看](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview#security-considerations)，留意意料之外的网络请求、文件访问，以及会去抓外部网址的 skill。
- MCP server 要看它会被怎么启动：完整的指令和参数。MCP 规范要求一键设置时[必须显示完整、未截断的运行指令](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#local-mcp-server-compromise)。
- 项目里的 `.mcp.json`、`.cursor/mcp.json`、`.claude/` 和 skill 文件夹，都当成代码审 PR。Claude Code 文档也提醒，[只看 `.mcp.json` 看不到所有会被加载的服务器](https://docs.claude.com/en/docs/claude-code/security#mcp-security)，插件和其他层级的设置也会加服务器。

### 4. 锁版本：不让它在你背后换掉

- Skill 从固定的 commit 安装，而不是追最新的 main。
- MCP server 用 `npx` 或 `uvx` 启动时写死版本号，不要用 `@latest`。Nx 事件里，正是“自动装最新版”让没用 Nx 的人也中招。
- Invariant 也建议[把 MCP server 和工具说明锁住，用哈希值检查有没有被改](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)，防的就是案例 1 的“翻脸”。

**观点**：锁版本在 agent 世界里比在一般项目更重要。一般包被换掉，你的测试可能会坏；skill 的说明被换掉，什么都不会坏，AI 只是开始做别的事。

## 检查清单

![三栏检查清单：装之前（看完整文件夹与启动指令、确认来源和维护者、锁定版本）、用的时候（细粒度令牌、开沙箱与限制网络、不开永远允许）、出事之后（撤销令牌、查审计日志、检查配置文件与 shell 设置）；底部写着“把 skill 和 MCP 当成会运行的软件来管”](checklist-three-stages.png){: width="800" height="450" }
_清单分三段，各自对应不同的时间点。_

### 装之前

- [ ] 来源是谁？是自己、公司内部，还是有在维护、有公开问题反馈管道的项目？
- [ ] Skill：整个文件夹都看过了吗？有没有脚本、会不会连外、会不会读家目录？
- [ ] MCP：完整的启动指令和参数是什么？它会拿到哪些环境变量？
- [ ] 它要求的权限，跟它宣称的用途对得上吗？
- [ ] 版本有没有锁在特定 commit 或版本号？
- [ ] 这个新工具装上去后，lethal trifecta 三条会不会因此凑齐？

### 用的时候

- [ ] Agent 用的令牌是不是细粒度、短期、只开需要的范围？
- [ ] 沙箱有开吗？网络是缺省关闭，还是只放行特定域名？
- [ ] 本地 MCP server 有没有另外隔离（容器、独立用户）？
- [ ] 有没有对“写配置文件”“发 PR”“推送”这类动作保留人工确认？
- [ ] 读不可信内容（陌生 repo 的 issue、外部网页）的工作，是不是跟持有私人数据的工作分开跑？
- [ ] 项目的 agent 配置文件改动，是不是有经过 code review？

### 出事之后（或怀疑出事时）

- [ ] 吊销并重新签发 agent 能碰到的所有令牌：GitHub、npm、云服务、MCP 连接密码。
- [ ] 查 GitHub 审计日志，看有没有不认得的 repo、PR、推送。Nx 公告就是请用户[到安全日志查有没有新建仓库](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c)。
- [ ] 检查 `.mcp.json`、`.cursor/mcp.json`、skill 文件夹、`~/.bashrc`、`~/.zshrc` 有没有被篡改。
- [ ] 移除可疑的 skill 和 MCP server，清掉 `npx` 等包缓存。

## 结论

装第三方 skill 和 MCP，本质上就是在 agent 身边多放了别人的程序和别人的文本。前者带来一般的供应链风险，后者带来 AI 特有的提示注入风险，而 agent 手上的权限决定了两者能造成多大的伤害。

**观点**：我认为最值得先做的，不是找一个号称能挡下 95% 攻击的防护产品（Willison 对这类宣称也很怀疑），而是两件很无聊的事：把 agent 的令牌缩到最小，以及锁住你装的每一个 skill 和 MCP 的版本。前者限制“被骗之后能做什么”，后者减少“在你不知情时被换掉”。

这和我之前写的 [HEIF 图片与 SSO 攻击链](/posts/openai-libheif-sso-attack-chain/)其实是同一个教训：一个看起来很小的入口，真正的损害取决于它背后连着多少信任。

## 来源

**官方文档**

- Anthropic，[Agent Skills overview：Security considerations](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview#security-considerations)
- Anthropic，[Claude Code Security](https://docs.claude.com/en/docs/claude-code/security)
- OpenAI，[Codex：Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security)
- Model Context Protocol，[Security Best Practices（2025-06-18 版规范）](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)

**公告与 CVE**

- Cursor，[GHSA-4cxx-hrm3-49rm](https://github.com/cursor/cursor/security/advisories/GHSA-4cxx-hrm3-49rm)；[CVE-2025-54135](https://www.cve.org/CVERecord?id=CVE-2025-54135)
- [CVE-2025-6514](https://www.cve.org/CVERecord?id=CVE-2025-6514)（mcp-remote）；JFrog，[研究报告](https://jfrog.com/blog/2025-6514-critical-mcp-remote-rce-vulnerability)；[修补 commit](https://github.com/geelen/mcp-remote/commit/607b226a356cb61a239ffaba2fb3db1c9dea4bac)
- Nx，[GHSA-cxm3-wv7p-598c](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c)；[S1ngularity 事后检讨](https://nx.dev/blog/s1ngularity-postmortem)

**研究报告与观点**

- Invariant Labs，[MCP Security Notification: Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)（2025-04-01）
- Invariant Labs，[GitHub MCP Exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability)（2025-05-26）
- Simon Willison，[The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)（2025-06-16）
