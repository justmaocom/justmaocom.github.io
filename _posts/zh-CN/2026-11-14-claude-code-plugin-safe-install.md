---
title: "装 Claude Code plugin 之前先看什么：从官方目录学会安全安装"
description: "一个 Claude Code plugin 可能同时带进 skill、hook 和 MCP server，有些会在你没下命令时自己运行程序。这篇从在官方目录找 plugin 开始，教你安装前要打开哪些文件、怎么选安装范围，以及装了之后怎么禁用和卸载。"
date: 2026-11-14 21:00:00 +0800
categories: [信息安全, 供应链]
tags: [claude-code, claude-code-plugins, coding-agent, supply-chain-security, mcp]
media_subpath: /assets/img/posts/claude-code-plugin-safe-install/
image:
  path: cover.zh-CN.webp
  alt: "装 Claude Code plugin 之前，先打开 hooks.json 和 .mcp.json 这些会自动运行程序的文件。"
---

Claude Code（在终端里使用的 AI 编程助手）可以安装 plugin。一个 plugin 是一整套扩展功能，装一次就会把好几样东西一起放进 Claude Code：教 Claude 做事的 skill、自定义的斜线命令、在固定时机自动运行的 hook，以及连接外部服务的 MCP server。

方便在这里，要小心的地方也在这里。其中有几样东西会在你没下任何命令的时候自己运行程序，用的还是你的账号权限。官方在安装前会显示这段提醒（中文翻译）：

> Plugin 可以在你的电脑上运行程序，并访问你的文件和 shell。安装、更新或使用 plugin 之前，请确认你信任它。Anthropic 无法控制 plugin 包含哪些 MCP server、文件或其他软件，也无法验证它们会按预期运行，或者日后不会改变。详情请查看各 plugin 的主页。

问题是，“确认你信任它”要怎么确认？这篇不推荐任何 plugin，只整理一套安装前后的检查方法：在官方目录里怎么找、装之前要打开哪几个文件、选哪个安装范围，以及装了之后怎么禁用和卸载。

> **版本说明**：本文依据 2026-11-14（台北时间）读取的官方资料撰写：[安装与管理 plugin](https://code.claude.com/docs/en/discover-plugins)、[plugin 概览](https://code.claude.com/docs/en/plugins)、[plugin 参考手册](https://code.claude.com/docs/en/plugins-reference)、[plugin 安全说明](https://code.claude.com/docs/en/plugins/security)、[组织管理](https://code.claude.com/docs/en/plugins/org)、[市场参考手册](https://code.claude.com/docs/en/plugins/marketplace-reference)，以及 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) 的 README 和市场清单。文中的终端命令对照过 Claude Code 2.1.325 的 `--help`，本文没有实际安装任何 plugin。命令和界面会随版本变化，请以你安装的版本为准。
{: .prompt-info }

为什么第三方扩展会带来风险，在[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)里讲过，这里不再重讲。这篇只处理 plugin 的具体检查步骤。

## 先认识几个名词

- **plugin**：一套 Claude Code 扩展功能，可能同时包含下面几种东西。完整名称写成“plugin 名称@市场名称”。
- **市场（marketplace）**：plugin 的目录。Claude Code 要先认识一个市场，才能从里面安装 plugin。Anthropic 的官方市场叫 `claude-plugins-official`，你第一次打开 Claude Code 的交互界面时，它会自动加入。
- **skill**：一份写给 Claude 看的操作说明（`SKILL.md`），Claude 遇到相关工作时会照着做。
- **斜线命令**：在 Claude Code 输入框里以 `/` 开头的命令，例如 `/plugin`。
- **hook**：在固定时机自动执行的 shell 命令，例如 Claude 每次改完文件就自动排版。用法见[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。
- **MCP server**：让 Claude 连接外部工具或服务的小程序，例如数据库、GitHub 或文档搜索。它可能是一个在你电脑上启动的程序，也可能只是一个网址。
- **shell**：终端里负责执行命令的程序。能执行 shell 命令，就几乎能做你在终端里做得到的任何事。

## 一个 plugin 会带进哪些东西

plugin 是一个文件夹，里面的文件按用途放在固定位置。根据官方的参考手册和安全说明，这些文件可以分成两类：只给 Claude 读的文字，以及会运行程序的部分。

| 位置 | 是什么 | 会自己运行程序吗 |
| --- | --- | --- |
| `.claude-plugin/plugin.json` | plugin 的名片：名称、版本、作者、主页、许可证 | 不会 |
| `skills/`、`commands/`、`agents/` | 写给 Claude 的说明（Markdown 文件） | 不会，但会影响 Claude 接下来怎么做 |
| `hooks/hooks.json` | 在固定时机执行的 shell 命令 | **会**，时机一到就执行 |
| `monitors/monitors.json` | 在后台持续运行的命令 | **会** |
| `.mcp.json` | MCP server 配置：要启动哪个程序，或要连接哪个网址 | **会**，本地的 server 由 Claude Code 启动 |
| `.lsp.json` | 语言服务器（提供代码跳转、错误提示的后台程序） | **会** |
| `bin/` | 可执行文件，plugin 启用期间 Claude 可以直接调用 | Claude 调用时才运行，会经过权限规则 |

最需要记住的一句话出自官方安全说明：Claude Code 的权限规则和沙箱，管的是 Claude 自己发出的工具调用，不管 plugin 自己运行的程序。hook、monitor、MCP server 和 LSP server 都在沙箱外、以你完整的用户权限运行。就算你按照[Claude Code 沙箱设置教程：挡住 SSH 密钥与 token](/posts/claude-code-sandbox-setup/)开了 `/sandbox`，plugin 的 hook 还是在沙箱外面跑。

另外，`plugin.json` 不是必需的文件。官方说它可以省略，就算有，也只有 `name` 必须填写。作者、主页、许可证这些字段都可能是空的。

![一个 plugin 里的文件分两类：skills、commands、agents 只给 Claude 读；hooks、monitors、.mcp.json、.lsp.json 会在沙箱外运行程序](plugin-anatomy.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是给 Claude 读的文字，右边是会运行程序的部分。安装前要逐一打开右边的文件。_

## 官方目录里的“官方”指的是什么

官方 plugin 目录是 GitHub 上的 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)。这个 repo 同时是两样东西：一个存放 plugin 的地方，以及 `claude-plugins-official` 市场的清单文件 `.claude-plugin/marketplace.json`。

repo 里有两个放 plugin 的文件夹，README 是这样说明的：

- **`/plugins`**：Anthropic 自己开发和维护的 plugin。每次有人提出修改，这里的每个文件夹都会被检查。
- **`/external_plugins`**：在投稿渠道改到 claude.ai/directory/manage 之前加入的第三方 plugin，以及 Anthropic 的频道类 plugin（Discord、fakechat、iMessage 和 Telegram）。

不过，市场清单里的 plugin 大多不在这两个文件夹里。我在 2026-11-14 读取 `marketplace.json` 时，它列了 317 个 plugin，放在这个 repo 里的只有 55 个（`/plugins` 41 个、`/external_plugins` 14 个）。其余 262 个里，261 个指向其他公司或开发者自己的 repo，1 个要在你的电脑上执行命令来获取。README 写得很直接：这个 repo 的检查覆盖放在这里的 plugin 文件夹，不覆盖放在其他 repo 的 plugin。

官方文档也提醒，市场的名称告诉你这份目录是谁发布的，不代表里面每个 plugin 做了什么，所以不管来自哪个市场，安装前都要检查。安装前的那段提醒也不分市场，内容都一样。

所以，官方目录能让你少装到冒名的假货，因为清单由 Anthropic 管理；但它不等于“每个 plugin 都通过了安全审查”。

### 查出 plugin 实际放在哪里

在 `marketplace.json` 里找到 plugin 的条目，看它的 `source` 字段：

- 写成 `./plugins/…` 或 `./external_plugins/…`：plugin 就在官方 repo 的这个文件夹里。
- 写成一个对象，`source` 是 `url` 或 `git-subdir`：plugin 在 `url` 指向的另一个 repo。`git-subdir` 另外用 `path` 指出是 repo 里的哪个文件夹。

条目的结构大致如下（数值仅为示意）：

```json
{
  "name": "example-plugin",
  "author": { "name": "Example Inc." },
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/claude-plugins.git",
    "path": "plugins/example-plugin",
    "ref": "v1.2.0",
    "sha": "<40 个字符的 commit SHA>"
  },
  "homepage": "https://example.com"
}
```

`sha` 是一个 commit 的编号，代表代码在某一次提交时的样子。根据市场参考手册，条目同时写了 `ref` 和 `sha` 时，Claude Code 会检出 `sha` 这一版。所以要检查的是那个 commit 的文件，不是对方 repo 现在的最新版。在 GitHub 上，可以用 `https://github.com/<账号>/<repo>/tree/<sha>/<path>` 这种网址打开那一版的文件夹。

## 步骤 1：在 `/plugin` 找到 plugin，先看详细信息

在 Claude Code 的输入框里输入：

```text
/plugin
```
{: .nolineno }

界面会打开在 **Discover** 标签页，列出你已加入的市场里的 plugin。直接打字可以搜索，按 Enter 打开详细信息。其他标签页是 **Installed**（已安装）、**Marketplaces**（已加入的市场）和 **Errors**（加载错误）。

已经知道名称的话，也可以直接输入：

```text
/plugin install <plugin 名称>@claude-plugins-official
```
{: .nolineno }

在对话里执行这行不会马上安装，而是先打开同一个详细信息面板，让你选好安装范围再确认。

详细信息面板有一个 **Will install** 区域，列出这个 plugin 会装进哪些命令、agent、skill、hook，以及 MCP 和 LSP server。先看这里有没有 hook、MCP server 或 LSP server。有的话，说明装了之后会有程序自动运行。

但官方也说明，Will install 只告诉你“有 hook”，不告诉你 hook 会执行什么。所以下一步要去看源文件。

## 步骤 2：装之前，打开这几个文件

在详细信息面板选 **Open homepage** 或 **View on GitHub** 打开源代码。两个选项都没有的话，回到市场的 repo，用上一节的方法找到 plugin 的文件夹。市场当初是从哪里加入的，可以在终端里用这行确认：

```bash
claude plugin marketplace list
```
{: .nolineno }

接着依次打开下面这些文件。文件不存在，说明这个 plugin 没有那项功能，跳过即可。

### `.claude-plugin/plugin.json`：谁做的、从哪里来

看 `author`、`homepage`、`repository` 和 `license`。主页和 repo 字段指向的地方，跟你正在看的 repo 是不是同一个？如果名称很像、账号却不一样，要特别小心。

### `hooks/hooks.json`：什么时候、自动执行什么

这是最重要的文件。每个 hook 要看两件事：事件名称（什么时候执行）和 `command`（执行什么）。结构大致如下（内容仅为示意）：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/setup.sh\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/format.sh\"" }
        ]
      }
    ]
  }
}
```
{: file="hooks/hooks.json" }

这样读：

- `SessionStart`：每次打开 Claude Code 就执行 `setup.sh`，不需要你做任何事。
- `PostToolUse` 加上 `"matcher": "Edit|Write"`：Claude 每次用 Edit 或 Write 工具改完文件，就执行 `format.sh`。
- `${CLAUDE_PLUGIN_ROOT}` 代表 plugin 安装后所在的文件夹。命令只写“去执行某个脚本”时，那个脚本也要打开来看，真正做事的是它。

看到下面这些内容，先停下来弄清楚原因：用 `curl`、`wget` 下载东西后直接执行；把文件内容或环境变量发送到外部网址；删除或修改项目以外的文件；读取 `~/.ssh`、`.env` 这类存放密钥的位置。这些不一定是恶意的，有些 hook 本来就会把代码片段发送到外部服务分析，通常会写在 README 里。重点是你知道它会这么做，而且能接受。

### `.mcp.json`：会启动哪些程序、连到哪里

```json
{
  "mcpServers": {
    "example-docs": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    },
    "example-db": {
      "command": "npx",
      "args": ["-y", "@example/db-mcp@1.4.2"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```
{: file=".mcp.json" }

这样读：

- 有 `url` 的 server 是连接外部网址。看域名是不是那个服务本身。你在 Claude 里通过它查询或发送的内容，会传到那个网址。
- 有 `command` 的 server 是在你的电脑上启动程序。`npx -y 包名` 会从 npm 下载并运行那个包。写死版本号（例如 `@1.4.2`）比较好；没写版本或写 `@latest`，每次启动都可能跑到不同的程序。
- `env` 列出它需要哪些环境变量，通常就是 token 或密码。给它的权限，最好只限于它真正需要的范围。

### `bin/`、`monitors/` 和 `.lsp.json`

- `bin/` 里的每个文件都要看。plugin 启用期间，这些文件会被放进 Claude 执行命令时的搜索路径（`PATH`），Claude 可以像普通命令一样直接调用它们。
- `monitors/monitors.json` 是在后台运行的命令，读法跟 hook 一样，看每一个 `command`。
- `.lsp.json` 会启动语言服务器，看它启动的是哪个程序。

### `skills/`、`commands/`、`agents/`：快速扫一遍

这些是给 Claude 读的说明，本身不会执行。但说明可以让 Claude 去执行命令。快速扫一遍，留意这几种段落：要 Claude 下载并执行东西、把数据传到外部、或者要它跳过你的规则。这类藏在内容里的指令，[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)的“入口一”有详细说明。

### 用一行命令列出完整内容

自己翻文件夹难免漏看。官方安全说明提供了一个方法：把 plugin 所在的 repo clone 下来，切到市场条目里写的 commit，再用 `plugin details` 列出 Claude Code 在这个文件夹里找到的组件：

```bash
git clone https://github.com/example-org/claude-plugins.git
cd claude-plugins
git checkout <市场条目里的 sha>
claude --plugin-dir ./plugins/example-plugin plugin details example-plugin
```
{: .nolineno }

它会打印出一份 `Component inventory`（组件清单）。拿它对照你刚才看过的文件，有漏看的就回去补上。装好之后，也可以用 `claude plugin details <plugin 名称>` 检查实际安装的那一份。

### 可复制的检查清单

下面这份可以直接贴进笔记或团队文档：

```markdown
## Claude Code plugin 安装前检查

- [ ] 从市场条目的 source 和 sha，确认 plugin 实际放在哪个 repo、哪个 commit
- [ ] plugin.json 的作者、主页、repo，和我正在看的来源一致
- [ ] 详细信息面板的 Will install：有没有 hook、MCP server、LSP server
- [ ] hooks/hooks.json：每个 hook 的触发时机和 command，以及它调用的脚本
- [ ] .mcp.json：每个 server 启动的程序（版本有没有写死）或连接网址，需要哪些环境变量
- [ ] bin/、monitors/、.lsp.json：每个会运行的文件
- [ ] skills/、commands/、agents/：没有要 Claude 下载执行、外传数据或跳过规则的内容
- [ ] claude --plugin-dir <文件夹> plugin details <名称> 列出的组件都看过
- [ ] 决定安装范围（local、user 或 project）和要不要自动更新
```

![安装前的四个步骤：确认来源、看详细信息、读会运行程序的文件、用 plugin details 列出完整清单，最后从最小范围安装](review-steps.zh-CN.webp){: w="1600" h="900" }
_概念图：四个步骤都在安装之前完成。第三步只看得到你打开的文件，第四步用组件清单补上漏看的部分。_

## 步骤 3：选安装范围，再确认安装

在详细信息面板按下安装时，要选择安装范围（scope）：

| 范围 | 谁会用到 | 写进哪个配置文件 |
| --- | --- | --- |
| Local | 只有你，而且只在这个 repo | `.claude/settings.local.json` |
| User | 你自己，这台电脑上的所有项目 | `~/.claude/settings.json` |
| Project | 这个 repo 的所有协作者 | `.claude/settings.json`（会提交进 repo） |

第一次用的 plugin，建议先装在 Local，只在一个项目里试用。确定其他项目也要用，再装到 User。要让整个团队一起用，才选 Project，并且走正常的代码审查流程，做法见后面的“下一步：把检查清单放进团队规则”。

在终端里安装的写法如下，不加 `--scope` 时默认是 user：

```bash
claude plugin install <plugin 名称>@claude-plugins-official --scope local
```
{: .nolineno }

有两件事要知道：

- **安装就等于启用。** 除非 plugin 自己设置了 `defaultEnabled: false`，装好它就开始工作。
- **Project 范围不会自动装到同事的电脑上。** 配置提交进 repo 之后，每位协作者仍要自己执行一次安装。

## 其他市场：加入之前先确认来源

除了官方市场，任何人都可以创建市场。加入市场的命令是：

```text
/plugin marketplace add <来源>
```
{: .nolineno }

来源可以是这几种：

- GitHub repo，写成 `owner/repo`。可以用 `#` 指定标签或分支，例如 `your-org/plugins#v1.2.0`。
- 其他 Git 托管平台的完整网址，例如 `https://gitlab.example.com/your-group/your-marketplace.git#v1.0.0`。
- 本地文件夹的路径。
- 指向 `marketplace.json` 的 `https://` 网址。

加入之前，先确认这几件事：

- **这个 repo 是谁的。** 从你信任的地方获取链接，例如工具的官方网站或官方文档，不要只看搜索结果。名称相似的账号并不少见。
- **有没有指定版本。** 加上 `#v1.2.0` 这类标签，市场内容就不会随对方每次提交而改变。不过标签本身可以被移动，原理见[gh actions-lock 教程：用 lockfile 锁定 GitHub Actions 依赖](/posts/gh-actions-lock-workflow-lockfile/)，它只能让变动少一点。
- **一行安装命令也可能顺便加入市场。** 像 `/plugin install <名称> --marketplace owner/repo` 这种写法，市场还没加入时会先自动加入。看到别人贴这种命令，一样先确认 `owner/repo` 是谁。

### 自动更新：你看过的文件可能会变

根据官方文档，Anthropic 的官方市场（例如 `claude-plugins-official`）默认会自动更新。其他市场，包括第三方市场和本地市场，默认不会。开启自动更新时，Claude Code 会在后台更新从这个市场安装的 plugin，所以你审查过的文件，可能在你不知道的时候被换掉。

要关闭某个市场的自动更新，在 `/plugin` 切到 **Marketplaces** 标签页，选择市场，再选 **Disable auto-update**。

关掉的代价是不会自动拿到修复。比较实际的做法是：重要的项目关闭自动更新，改成定期手动更新，更新前先看这次改了什么，特别是 `hooks/hooks.json` 和 `.mcp.json`。手动更新的命令是 `claude plugin update <plugin 名称>@<市场名称>`，更新后要重启 Claude Code 才会生效。

## 装了之后：禁用、卸载、清理干净

先确认自己装了什么。`claude plugin list` 会列出每个 plugin 的版本、安装范围和状态。

**禁用**：暂时不用，或者怀疑它有问题时使用。在 `/plugin` 的 Installed 标签页选中 plugin 后按空格键，或输入 `/plugin disable` 打开面板操作。在终端里则是：

```bash
claude plugin disable <plugin 名称>@<市场名称>
```
{: .nolineno }

禁用后文件还在，之后可以用 `claude plugin enable` 重新启用。遇到不明状况、想先全部停下来，可以用 `claude plugin disable --all` 禁用所有 plugin。

**卸载**：输入 `/plugin uninstall`，或在终端里执行：

```bash
claude plugin uninstall <plugin 名称>@<市场名称> --scope <当初的范围>
```
{: .nolineno }

`--scope` 要和安装时一样，不写的话默认是 user。卸载时要注意：

- plugin 的数据文件夹 `~/.claude/plugins/data/<id>/` 会一起删除，加上 `--keep-data` 才会保留。
- 程序文件本身会在 `~/.claude/plugins/cache/` 多留 14 天，才由后台清理删除。确定不再信任它，可以自己删掉 `~/.claude/plugins/cache/<市场名称>/<plugin 名称>/`。
- Project 范围的 plugin 在界面上卸载时，会问你要选 **Disable for me**（只对自己禁用，写进你的 `.claude/settings.local.json`）还是 **Uninstall for everyone**（从共享的 `.claude/settings.json` 里去掉，影响所有协作者）。

**移除市场**：输入 `/plugin marketplace remove <市场名称>`。从这个市场安装的所有 plugin 会一起被卸载。

如果你是因为怀疑 plugin 有问题才卸载它，曾经交给它的 token 也要更换。后续处理可以参考[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)的“出事之后”清单。

![装了之后的三种处理：禁用会保留文件、卸载会删数据但 cache 留 14 天、移除市场会连同装过的 plugin 一起卸载；另外提醒自动更新会换掉看过的文件](after-install.zh-CN.webp){: w="1600" h="900" }
_概念图：由轻到重的三种处理方式。怀疑出事时先禁用，确定不用了再卸载。_

## 下一步：把检查清单放进团队规则

一个人小心还不够，团队要有共同的做法。可以从三个层面着手。

**1. 写进项目规则。** 把上面的检查清单放进 `CLAUDE.md`、`AGENTS.md` 或 PR 模板，约定“新增 plugin 或市场时，要附上这份清单”。规则文件怎么写，见[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/posts/agents-md-project-rules-for-coding-agents/)。

**2. 把配置文件当成代码来审查。** 项目要推荐 plugin 时，在 `.claude/settings.json` 写 `extraKnownMarketplaces`（要认识哪些市场）和 `enabledPlugins`（要启用哪些 plugin）：

```json
{
  "extraKnownMarketplaces": {
    "your-marketplace": {
      "source": { "source": "github", "repo": "your-org/your-marketplace" }
    }
  },
  "enabledPlugins": {
    "code-formatter@your-marketplace": true
  }
}
```
{: file=".claude/settings.json" }

这个文件会提交进 repo，改它就跟改代码一样，要经过 PR 审查。可以把它加进 CODEOWNERS（指定哪些文件由谁审核的配置文件），让熟悉这份检查清单的人负责批准。官方文档另外说明了两点：在 repo 里写了 `enabledPlugins` 不会自动安装，协作者要自己执行 `claude plugin install <名称>@<市场> --scope project`；`extraKnownMarketplaces` 也只在协作者已经信任的文件夹里生效。

**3. 在组织层面限制市场来源。** 公司如果统一管理 Claude Code 的配置（managed settings），管理员可以用 `strictKnownMarketplaces` 只允许特定来源，或用 `blockedMarketplaces` 屏蔽特定来源。官方的允许列表示例如下：

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "anthropics/claude-plugins-official" },
    { "source": "github", "repo": "your-org/*" },
    { "source": "skills-dir" }
  ]
}
```

前两行只允许官方市场和公司自己账号下的市场。第三行的 `skills-dir` 对应本地的 `~/.claude/skills/` 文件夹，让放在那里的内容继续加载。管理员也可以设置 `pluginTrustMessage`，在安装前的提醒后面加上公司内部的说明，例如审查流程的链接。

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 找 plugin | `/plugin` 的 Discover 标签页；或用 `/plugin install <名称>@claude-plugins-official` 先打开详细信息 |
| 知道 plugin 实际放在哪 | 看 `marketplace.json` 条目的 `source` 和 `sha` |
| 知道装了会自动执行什么 | 读 `hooks/hooks.json`、`.mcp.json`、`bin/`、`monitors/`、`.lsp.json` |
| 确定没有漏看的组件 | clone 后执行 `claude --plugin-dir <文件夹> plugin details <名称>` |
| 先小范围试用 | 安装时选 Local |
| 加入别的市场 | 从官方链接确认 `owner/repo`，用 `#标签` 指定版本 |
| 不让看过的文件在后台被换掉 | `/plugin` → Marketplaces → Disable auto-update，改成手动更新并先看差异 |
| 暂时不用 | `claude plugin disable <名称>@<市场>` |
| 怀疑出事，先全部停下 | `claude plugin disable --all` |
| 完全卸载 | `claude plugin uninstall <名称>@<市场> --scope <范围>`，需要时删掉 cache 文件夹 |
| 让团队做法一致 | 检查清单写进项目规则，`.claude/settings.json` 走 PR 审查 |

## 常见误解

- **“在官方目录里就代表安全。”** 官方市场里大多数 plugin 放在其他 repo，官方 repo 的检查不覆盖它们。安装前的提醒也不分市场。
- **“开了沙箱就不用担心。”** hook、monitor、MCP server 和 LSP server 都在沙箱外运行。
- **“Will install 看过就好。”** 它只告诉你有 hook，不告诉你 hook 执行什么。
- **“skill 只是文字，不用看。”** 文字可以让 Claude 去执行命令。
- **“看过一次就没事了。”** 开了自动更新，文件会在后台被换掉。
- **“卸载就清理干净了。”** cache 会多留 14 天，交给它的 token 也还有效。

## 结论

plugin 把好几种扩展一次装进来，所以安装前要先弄清楚，它会在什么时候、用你的权限做什么事。顺序是：从市场条目确认 plugin 实际放在哪里，读详细信息面板的 Will install，打开 `hooks/hooks.json`、`.mcp.json` 这些会运行程序的文件，用 `plugin details` 对照组件清单，再从最小的范围安装。装了之后，记得自动更新会换掉文件；不用了就禁用或卸载。

想看懂 plugin 带来的 hook 在做什么，可以读[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。想知道 plugin 里的 skill 是怎么写成的，见[自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护](/posts/agent-skill-authoring-guide/)。要用同一套思路检查整个 AI 工作流的供应链风险，见[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
