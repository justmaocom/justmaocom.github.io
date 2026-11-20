---
title: "Claude Code plugin 安全安装：装之前先看哪些文件"
description: "一个 Claude Code plugin 可能同时带进 skill、hook 和 MCP server，有些会在你没下命令时自己运行程序。这篇从在官方目录找 plugin 开始，教你安装前要打开哪些文件、怎么选安装范围，以及装了之后怎么禁用和卸载。"
date: 2026-11-14 21:00:00 +0800
categories: [信息安全, 供应链]
tags: [claude-code, claude-code-plugins, coding-agent, supply-chain-security, mcp]
media_subpath: /assets/img/posts/claude-code-plugin-safe-install/
image:
  path: cover.zh-CN.webp
  alt: "装 Claude Code plugin 前，先读 hooks.json 与 .mcp.json 这些会自动运行的文件。"
---

Claude Code（在终端里使用的 AI 编程助手）可以安装 plugin。我把 plugin 理解成一整套扩展功能：装一次，就会把教 Claude 做事的 skill、自定义的斜线命令、在固定时机自动运行的 hook，以及连接外部服务的 MCP server 一起放进来。

它方便的地方，正好也是我觉得要小心的地方。里面有几样东西会在你没下任何命令的时候自己运行程序，用的还是你的账号权限。官方在安装前会显示这段提醒（我的中文翻译）：

> Plugin 可以在你的电脑上运行程序，并访问你的文件和 shell。安装、更新或使用 plugin 之前，请确认你信任它。Anthropic 无法控制 plugin 包含哪些 MCP server、文件或其他软件，也无法验证它们会按预期运行，或者日后不会改变。详情请查看各 plugin 的主页。

读到“确认你信任它”，我的第一个疑问是：到底要怎么确认？我把官方的几份文档读了一遍，整理成我在装 plugin 前后会照着做的检查方法：在官方目录里怎么找、装之前打开哪几个文件、选哪个安装范围，以及装了之后怎么禁用和卸载。这篇不推荐任何 plugin。我也没有实际安装 plugin 来测试，文中“我会怎么做”的部分，都是根据官方文档列出来的步骤。

> **版本说明**：我写这篇时，参考的是 2026-11-14（台北时间）当天的官方资料：[安装与管理 plugin](https://code.claude.com/docs/en/discover-plugins)、[plugin 概览](https://code.claude.com/docs/en/plugins)、[plugin 参考手册](https://code.claude.com/docs/en/plugins-reference)、[plugin 安全说明](https://code.claude.com/docs/en/plugins/security)、[组织管理](https://code.claude.com/docs/en/plugins/org)、[市场参考手册](https://code.claude.com/docs/en/plugins/marketplace-reference)，以及 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) 的 README 和市场清单。2026-11-17 我又对照上述页面修正了部分说法，并根据当天的 [mod 概览](https://code.claude.com/docs/en/plugins/mods/overview) 和 [mod 管理说明](https://code.claude.com/docs/en/plugins/mods/admin) 补充了 mod 的部分。文中的终端命令，我对照过 Claude Code 2.1.325 的 `--help`（`plugin validate` 对照 2.1.326），没有实际安装任何 plugin。命令和界面会随版本变化，请以你安装的版本为准。
{: .prompt-info }

第三方扩展为什么会带来风险，我在[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)里讲过，这里不再重讲。这篇只处理 plugin 的具体检查步骤。

## 先认识几个名词

- **plugin**：一套 Claude Code 扩展功能，可能同时包含下面几种东西。完整名称写成“plugin 名称@市场名称”。
- **市场（marketplace）**：plugin 的目录。Claude Code 要先认识一个市场，才能从里面安装 plugin。Anthropic 的官方市场叫 `claude-plugins-official`，你第一次打开 Claude Code 的交互界面时，它会自动加入。
- **skill**：一份写给 Claude 看的操作说明（`SKILL.md`），Claude 遇到相关工作时会照着做。
- **斜线命令**：在 Claude Code 输入框里以 `/` 开头的命令，例如 `/plugin`。
- **hook**：在固定时机自动执行的 shell 命令，例如 Claude 每次改完文件就自动排版。用法见[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。
- **MCP server**：让 Claude 连接外部工具或服务的小程序，例如数据库、GitHub 或文档搜索。它可能是一个在你电脑上启动的程序，也可能只是一个网址。
- **shell**：终端里负责执行命令的程序。能执行 shell 命令，就几乎能做你在终端里做得到的任何事。

## 一个 plugin 会带进哪些东西

plugin 是一个文件夹，里面的文件按用途放在固定位置。读完官方的参考手册和安全说明，我把这些文件分成两类：只给 Claude 读的文字，以及会运行程序的部分。

| 位置 | 是什么 | 会自己运行程序吗 |
| --- | --- | --- |
| `.claude-plugin/plugin.json` | plugin 的名片：名称、版本、作者、主页、许可证。也可以直接写入 hook、MCP server 等组件，或指向其他位置的配置文件 | 本身不会，但它声明的 hook 和 server 会 |
| `skills/`、`commands/`、`agents/` | 写给 Claude 的说明（Markdown 文件） | 不会，但会影响 Claude 接下来怎么做 |
| `hooks/hooks.json` | 在固定时机执行的 shell 命令 | **会**，时机一到就执行 |
| `hooks/hooks.json` 里的 `modules`（mod） | 指向一个 JavaScript 文件（例如 `register.js`），在 Claude Code 里面运行 | **会**，还能改写 Claude 的工具调用 |
| `monitors/monitors.json` | 在后台持续运行的命令 | **会** |
| `.mcp.json` | MCP server 配置：要启动哪个程序，或要连接哪个网址 | **会**，本地的 server 由 Claude Code 启动 |
| `.lsp.json` | 语言服务器（提供代码跳转、错误提示的后台程序） | **会** |
| `bin/` | 可执行文件，plugin 启用期间 Claude 可以直接调用 | Claude 调用时才运行，会经过权限规则 |

整份官方安全说明里，我认为最该记住的是这句：Claude Code 的权限规则和沙箱，管的是 Claude 自己发出的工具调用，不管 plugin 自己运行的程序。hook、monitor、MCP server、LSP server 和 mod 都在沙箱外、以你完整的用户权限运行。我在[Claude Code 沙箱设置教程：挡住 SSH 密钥与 token](/posts/claude-code-sandbox-setup/)里介绍过怎么开 `/sandbox`，但就算开了，plugin 的 hook 和 mod 还是在沙箱外面跑。

还有一点容易误解：`plugin.json` 不是必需的文件。官方说它可以省略，就算有，也只有 `name` 必须填写。所以作者、主页、许可证这些字段都可能是空的。我不会因为字段空着就认定它有问题，也不会因为字段填得很完整就放心。

![一个 plugin 里的文件分两类：skills、commands、agents 只给 Claude 读；hooks、mod、monitors、.mcp.json、.lsp.json 会在沙箱外运行程序，bin/ 要等 Claude 调用才运行](plugin-anatomy.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是给 Claude 读的文字，右边是会运行程序的部分。安装前要逐一打开右边的文件，标成黄色的 `plugin.json` 也要看，它可能直接声明 hook 与 MCP server。_

## 官方目录里的“官方”指的是什么

看到“官方”两个字，很容易以为里面的 plugin 都经过 Anthropic 审查。我读了官方 plugin 目录的 README 和清单文件，才确定范围没有这么大。这个目录是 GitHub 上的 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)。这个 repo 同时是两样东西：一个存放 plugin 的地方，以及 `claude-plugins-official` 市场的清单文件 `.claude-plugin/marketplace.json`。

repo 里有两个放 plugin 的文件夹，README 是这样说明的：

- **`/plugins`**：Anthropic 自己开发和维护的 plugin。每次有人提出修改，这里的每个文件夹都会被检查。
- **`/external_plugins`**：在投稿渠道改到 claude.ai/directory/manage 之前加入的第三方 plugin，以及 Anthropic 的频道类 plugin（Discord、fakechat、iMessage 和 Telegram）。

不过，市场清单里的 plugin 大多不在这两个文件夹里。我在 2026-11-14 打开 `marketplace.json` 时，它列了 317 个 plugin，放在这个 repo 里的只有 55 个（`/plugins` 41 个、`/external_plugins` 14 个）。其余 262 个里，261 个指向其他公司或开发者自己的 repo，1 个要在你的电脑上执行命令来获取。README 写得很直接：这个 repo 的检查覆盖放在这里的 plugin 文件夹，不覆盖放在其他 repo 的 plugin。

官方文档也提醒，市场的名称告诉你这份目录是谁发布的，不代表里面每个 plugin 做了什么，所以不管来自哪个市场，安装前都要检查。安装前的那段提醒也不分市场，内容都一样。

所以我对官方目录的看法是：它能让你少装到冒名的假货，因为 `claude-plugins-official` 这类官方名称，Claude Code 只接受来自 `github.com/anthropics/` 的来源，其他人无法用同样的名称发布市场。但它不等于“每个 plugin 都通过了安全审查”。从官方目录装的 plugin，我一样会按后面的步骤检查。

### 查出 plugin 实际放在哪里

既然多数 plugin 放在别的 repo，我装之前一定会先查这件事。在 `marketplace.json` 里找到 plugin 的条目，看它的 `source` 字段：

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

`sha` 是一个 commit 的编号，代表代码在某一次提交时的样子。根据市场参考手册，条目同时写了 `ref` 和 `sha` 时，Claude Code 会检出 `sha` 这一版。所以我要检查的是那个 commit 的文件，不是对方 repo 现在的最新版。在 GitHub 上，我会用 `https://github.com/<账号>/<repo>/tree/<sha>/<path>` 这种网址打开那一版的文件夹。

条目也不只是一张索引卡。根据市场参考手册，条目本身也可以写组件字段。plugin 有 `plugin.json` 时，条目的 `commands`、`agents`、`skills`、`hooks`、`outputStyles`、`themes` 默认会合并进 `plugin.json`，其中 `hooks` 会按事件替换 `plugin.json` 里同一个事件的配置；条目写的 `mcpServers`、`lspServers` 不会生效。plugin 没有 `plugin.json` 时，条目就直接当作它的配置文件，这时 `mcpServers`、`lspServers` 也会加载。条目里如果有这些字段，我也会一起看。

## 步骤 1：在 `/plugin` 找到 plugin，先看详细信息

找 plugin 时，我会先打开 plugin 管理界面。在 Claude Code 的输入框里输入：

```text
/plugin
```
{: .nolineno }

官方文档说，界面会打开在 **Discover** 标签页，列出你已加入的市场里的 plugin。直接打字可以搜索，按 Enter 打开详细信息。其他标签页是 **Installed**（已安装）、**Marketplaces**（已加入的市场）和 **Errors**（加载错误）。

已经知道名称的话，也可以直接输入：

```text
/plugin install <plugin 名称>@claude-plugins-official
```
{: .nolineno }

在对话里执行这行不会马上安装，而是先打开同一个详细信息面板，让你选好安装范围再确认。

详细信息面板有一个 **Will install** 区域，列出这个 plugin 会装进哪些命令、agent、skill、hook，以及 MCP 和 LSP server。我会先看这里有没有 hook、MCP server 或 LSP server。有的话，就说明装了之后会有程序自动运行，后面的检查要更仔细。

放在其他 repo 的 plugin（官方市场里大多数是这种），如果 Anthropic 没有它的组件信息，这个区域可能只显示 `Component summary not available for remote plugin`，什么组件都看不到。遇到这种情况，我就直接按步骤 2 去看源文件。

就算这个区域列出了组件，官方也说明它只告诉你“有 hook”，不告诉你 hook 会执行什么。所以不管这里列了什么，我下一步都会去读源文件。

## 步骤 2：装之前，打开这几个文件

我会在详细信息面板选 **Open homepage** 或 **View on GitHub** 打开源代码。两个选项都没有的话，就回到市场的 repo，用上一节的方法找到 plugin 的文件夹。市场当初是从哪里加入的，可以在终端里用这行确认：

```bash
claude plugin marketplace list
```
{: .nolineno }

接着我会依次打开下面这些文件，第一个一定是 `plugin.json`。默认位置找不到某个文件，不代表 plugin 没有那项功能，因为 `plugin.json` 可以把 hook、MCP server、LSP server 和 monitor 直接写在里面，或指向其他路径的配置文件。先看 `plugin.json` 声明了什么，我才知道还要打开哪些文件。

### `.claude-plugin/plugin.json`：谁做的、还声明了什么

我先看 `author`、`homepage`、`repository` 和 `license`，确认主页和 repo 字段指向的地方，跟我正在看的 repo 是同一个。名称很像、账号却不一样的，我会先停下来查清楚是谁。

再来看它有没有声明组件或依赖。下面这份是我写的示例：

```json
{
  "name": "example-plugin",
  "author": { "name": "Example Inc." },
  "homepage": "https://example.com",
  "hooks": "./config/hooks.json",
  "mcpServers": {
    "example-api": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"] }
  },
  "dependencies": ["example-helper"]
}
```
{: file=".claude-plugin/plugin.json" }

这份文件我会这样读：

- `hooks` 指向 `config/hooks.json`，不在默认的 `hooks/hooks.json`。两个位置的 hook 会合并加载，所以两个文件我都会看。
- `mcpServers` 直接写在 `plugin.json` 里，安装后会启动 `server.js`。`lspServers` 和 `experimental.monitors` 也能这样写。这些内容我都用后面读 `hooks/hooks.json` 和 `.mcp.json` 的方式去读。
- `dependencies` 列出这个 plugin 依赖的其他 plugin。官方文档说明，安装时 Claude Code 会以同样的范围，把这些依赖一起安装并启用。所以 `example-helper` 我也会按这篇的步骤检查一次。只写名称的依赖从同一个市场获取；写成 `名称@市场` 的来自另一个市场，这种跨市场的依赖默认不会自动安装，除非市场明确允许。

### `hooks/hooks.json`：什么时候、自动执行什么

如果只能挑一个文件细看，我会挑这个。每个 hook 我都看两件事：事件名称（什么时候执行）和它执行什么。`type` 是 `command` 时看 `command` 字段；`type` 是 `http` 时看 `url`，事件内容会发送到那个网址。`type` 也可能是 `mcp_tool`、`prompt` 或 `agent`。结构大致如下（内容仅为示意）：

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

这份配置，我会逐项这样看：

- `SessionStart`：每次打开 Claude Code 就执行 `setup.sh`，恢复之前的对话、执行 `/clear` 或对话被压缩时也会再执行，不需要你做任何事。
- `PostToolUse` 加上 `"matcher": "Edit|Write"`：Claude 每次用 Edit 或 Write 工具改完文件，就执行 `format.sh`。
- `${CLAUDE_PLUGIN_ROOT}` 代表 plugin 安装后所在的文件夹。命令只写“去执行某个脚本”时，我会把那个脚本也打开来看，真正做事的是它。

hook 有下面这些行为时，我会先停下来弄清楚原因：用 `curl`、`wget` 下载东西后直接执行；把文件内容或环境变量发送到外部网址；删除或修改项目以外的文件；读取 `~/.ssh`、`.env` 这类存放密钥的位置。这些不一定是恶意的，有些 hook 本来就会把代码片段发送到外部服务分析，通常会写在 README 里。我在意的是自己知不知道它会这么做，以及能不能接受。

### `hooks.json` 里的 `modules`：在 Claude Code 里面运行的 mod

`hooks.json` 如果有 `"modules": ["./register.js"]` 这样的字段，说明这个 plugin 带了 mod。mod 是一个在 Claude Code 里面运行的 JavaScript 程序，不在沙箱里。根据官方的 mod 说明，它能用你的权限读写文件、启动程序、连接网络，读得到环境变量和配置文件里的 API key，也看得到你发送的每一条消息和 Claude 的每一次工具调用，并且可以改写它们。内置的防护没有拦住时，它还能批准原本会被你的 deny、ask 规则或 `PreToolUse` hook 拦下的工具调用。所以 plugin 带了 mod，我会看得比 hook 更仔细。

后面介绍的 `plugin details` 组件清单不会列出 mod。官方提供的检查方法是先获取 plugin 的文件（例如 clone 下来），再对 plugin 文件夹执行：

```bash
claude plugin validate <plugin 文件夹>
```
{: .nolineno }

输出里的 `hooks:` 列出 mod 会接收哪些事件，`calls:` 列出它会调用哪些功能，例如 `$.fs.read`（读文件）、`$.process.run`（启动程序）、`$.http.fetch`（联网）、`$.env.get`（读环境变量）。看完这两行，我会再把那个 JavaScript 文件读一遍。官方也提醒，这个命令报错的 mod 不要装，因为有些错误不会阻止它加载。

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

这份配置，我会按字段分开看：

- 有 `url` 的 server 是连接外部网址。我会确认域名是不是那个服务本身。你在 Claude 里通过它查询或发送的内容，会传到那个网址。
- 有 `command` 的 server 是在你的电脑上启动程序。`npx -y 包名` 会从 npm 下载并运行那个包。我希望看到写死的版本号（例如 `@1.4.2`）；没写版本或写 `@latest`，每次启动都可能跑到不同的程序。
- `env` 列出它需要哪些环境变量，通常就是 token 或密码。我给它的权限，只限于它真正需要的范围。

### `bin/`、`monitors/` 和 `.lsp.json`

- `bin/` 里的每个文件我都会看。plugin 启用期间，这些文件会被放进 Claude 执行命令时的搜索路径（`PATH`），Claude 可以像普通命令一样直接调用它们。
- `monitors/monitors.json` 是在后台运行的命令，读法跟 hook 一样，看每一个 `command`。
- `.lsp.json` 会启动语言服务器，看它启动的是哪个程序。

### `skills/`、`commands/`、`agents/`：快速扫一遍

这些是给 Claude 读的说明，本身不会执行，但说明可以让 Claude 去执行命令。我会快速扫一遍，留意这几种段落：要 Claude 下载并执行东西、把数据传到外部、或者要它跳过你的规则。这类藏在内容里的指令，[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)的“入口一”有详细说明。

### 用一行命令核对组件清单

我自己翻文件夹，难免有漏看的时候。官方安全说明提供了一个核对方法：把 plugin 所在的 repo clone 下来，切到市场条目里写的 commit，再用 `plugin details` 列出 Claude Code 在这个文件夹里找到的组件：

```bash
git clone https://github.com/example-org/claude-plugins.git
cd claude-plugins
git checkout <市场条目里的 sha>
claude --plugin-dir ./plugins/example-plugin plugin details example-plugin
```
{: .nolineno }

它会打印出一份 `Component inventory`（组件清单），列出 skill 和命令、agent、hook（含触发事件）、MCP server 和 LSP server。我会拿它对照刚才看过的文件，有漏看的就回去补上。monitor、`bin/` 里的文件和 mod 不在这份清单里，要自己打开来看。这份清单列的是这个文件夹里的组件；市场条目另外加上的组件，以及 `dependencies` 里的其他 plugin，要各自回去看。装好之后，也可以用这行检查实际安装的那一份：

```bash
claude plugin details <plugin 名称>
```
{: .nolineno }

### 可复制的检查清单

我把上面的检查整理成一份清单，可以直接贴进笔记或团队文档：

```markdown
## Claude Code plugin 安装前检查

- [ ] 从市场条目的 source 和 sha，确认 plugin 实际放在哪个 repo、哪个 commit
- [ ] plugin.json 的作者、主页、repo，和我正在看的来源一致
- [ ] plugin.json 有没有直接声明 hooks、mcpServers、lspServers、monitors，或指向其他路径的配置文件；市场条目有没有另外写组件字段
- [ ] dependencies 列出的每个 plugin，都按这份清单检查过
- [ ] 详细信息面板的 Will install：有没有 hook、MCP server、LSP server
- [ ] hooks/hooks.json：每个 hook 的触发时机和 command（http hook 看 url），以及它调用的脚本
- [ ] hooks.json 有没有 modules（mod）；有的话用 claude plugin validate 列出 hooks 和 calls，并读过那个 JS 文件
- [ ] .mcp.json：每个 server 启动的程序（版本有没有写死）或连接网址，需要哪些环境变量
- [ ] bin/、monitors/、.lsp.json：每个会运行的文件
- [ ] skills/、commands/、agents/：没有要 Claude 下载执行、外传数据或跳过规则的内容
- [ ] 用 claude --plugin-dir <文件夹> plugin details <名称> 核对过 hook、MCP server 和 LSP server
- [ ] 决定安装范围（local、user 或 project）和要不要自动更新
```

![安装前的四项检查：确认来源、看详细信息、读会运行程序的文件、用 plugin details 核对 hook、MCP 和 LSP，最后从最小范围安装](review-steps.zh-CN.webp){: w="1600" h="900" }
_概念图：四项检查都在安装之前完成。第三项只看得到你打开的文件，第四项用组件清单核对 hook、MCP 和 LSP server；monitor、`bin/` 和 mod 仍要自己看。_

## 步骤 3：选安装范围，再确认安装

在详细信息面板按下安装时，要选择安装范围（scope）：

| 范围 | 谁会用到 | 写进哪个配置文件 |
| --- | --- | --- |
| Local | 只有你，而且只在这个 repo | `.claude/settings.local.json` |
| User | 你自己，这台电脑上的所有项目 | `~/.claude/settings.json` |
| Project | 这个 repo 的所有协作者 | `.claude/settings.json`（会提交进 repo） |

第一次用的 plugin，我会先装在 Local，只在一个项目里试用。确定其他项目也要用，再装到 User。要让整个团队一起用，我才选 Project，并且走正常的代码审查流程，做法见后面的“下一步：把检查清单放进团队规则”。

在终端里安装的写法如下，不加 `--scope` 时默认是 user：

```bash
claude plugin install <plugin 名称>@claude-plugins-official --scope local
```
{: .nolineno }

安装前，我会先记住三件事：

- **安装就等于启用。** 除非 plugin 自己设置了 `defaultEnabled: false`，装好它就开始工作。
- **依赖会一起装。** plugin 声明了依赖的话，Claude Code 会以同样的范围一起安装并启用，完成信息会列出它们。
- **Project 范围不会自动装到同事的电脑上。** 配置提交进 repo 之后，每位协作者仍要自己执行一次安装。

## 其他市场：加入之前先确认来源

除了官方市场，任何人都可以创建市场。加入市场这件事，我会比装单个 plugin 更谨慎，因为加入之后，里面的每个 plugin 都能用一行命令装进来。加入市场的命令是：

```text
/plugin marketplace add <来源>
```
{: .nolineno }

来源可以是这几种：

- GitHub repo，写成 `owner/repo`。可以用 `#` 指定标签或分支，例如 `your-org/plugins#v1.2.0`。
- 其他 Git 托管平台的完整网址，例如 `https://gitlab.example.com/your-group/your-marketplace.git#v1.0.0`。
- 本地文件夹的路径。
- 指向 `marketplace.json` 的 `https://` 网址。

加入之前，我会先确认这几件事：

- **这个 repo 是谁的。** 我只从信任的地方获取链接，例如工具的官方网站或官方文档，不只看搜索结果。名称相似的账号并不少见。
- **有没有指定版本。** 我会加上 `#v1.2.0` 这类标签，市场内容就不会随对方每次提交而改变。不过标签本身可以被移动，原理见[gh actions-lock 教程：用 lockfile 锁定 GitHub Actions 依赖](/posts/gh-actions-lock-workflow-lockfile/)，它只能让变动少一点。
- **一行安装命令也可能顺便加入市场。** 在对话里输入 `/plugin install <名称> --marketplace owner/repo`，市场还没加入时，Claude Code 会先显示来源让你确认；在终端里执行 `claude plugin install <名称> --marketplace owner/repo` 则不会询问，直接加入市场。看到别人贴这种命令，我一样会先确认 `owner/repo` 是谁。

### 自动更新：你看过的文件可能会变

根据官方文档，Anthropic 的官方市场（例如 `claude-plugins-official`）默认会自动更新。其他市场，包括第三方市场和本地市场，默认不会。开启自动更新时，Claude Code 会在后台更新从这个市场安装的 plugin，所以你审查过的文件，可能在你不知道的时候被换掉。

要关闭某个市场的自动更新，在 `/plugin` 切到 **Marketplaces** 标签页，选择市场，再选 **Disable auto-update**。

关掉的代价是不会自动拿到修复，所以我不会全部关掉。我的做法是只对第三方或不熟悉的市场关闭自动更新，改成定期手动更新。更新前，我会先用 `https://github.com/<账号>/<repo>/compare/<旧 sha>...<新 sha>` 比对这次改了什么，特别是 `plugin.json`、`hooks/hooks.json`、`.mcp.json` 和新增的依赖。手动更新的命令是：

```bash
claude plugin update <plugin 名称>@<市场名称>
```
{: .nolineno }

更新后要重启 Claude Code，或在对话里执行 `/reload-plugins` 才会生效。

## 装了之后：禁用、卸载、清理干净

我会先确认自己到底装了什么。`claude plugin list` 会列出每个 plugin 的版本、安装范围和状态。

**禁用**：暂时不用，或者怀疑它有问题时，我会先走这一步。在 `/plugin` 的 Installed 标签页选中 plugin 后按空格键，或输入下面这行打开面板操作：

```text
/plugin disable
```
{: .nolineno }

在终端里则是：

```bash
claude plugin disable <plugin 名称>@<市场名称>
```
{: .nolineno }

禁用后文件还在，之后可以用 `claude plugin enable` 重新启用。如果还有其他启用中的 plugin 依赖它，禁用会失败，并列出要先禁用哪些。遇到不明状况、想先全部停下来，可以用这行禁用所有 plugin：

```bash
claude plugin disable --all
```
{: .nolineno }

**卸载**：在输入框里输入：

```text
/plugin uninstall
```
{: .nolineno }

或在终端里执行：

```bash
claude plugin uninstall <plugin 名称>@<市场名称> --scope <当初的范围>
```
{: .nolineno }

`--scope` 要和安装时一样，不写的话默认是 user。卸载时有几件事我会特别留意：

- 从最后一个安装范围卸载时，plugin 的数据文件夹 `~/.claude/plugins/data/<id>/` 会一起删除，plugin 保存的选项和密钥也会删掉。加上 `--keep-data` 才会保留文件夹。
- 程序文件本身会在 `~/.claude/plugins/cache/` 多留 14 天，才由后台清理删除。确定不再信任它，我会自己删掉 `~/.claude/plugins/cache/<市场名称>/<plugin 名称>/`。
- 当初跟着安装的依赖不会一起卸载。加上 `--prune` 会一并卸载没有其他 plugin 需要的依赖，之后也可以用这行清理：

  ```bash
  claude plugin prune
  ```
  {: .nolineno }

- Project 范围的 plugin 在界面上卸载时，会问你要选 **Disable for me**（只对自己禁用，写进你的 `.claude/settings.local.json`）还是 **Uninstall for everyone**（从共享的 `.claude/settings.json` 里去掉，影响所有协作者）。

**移除市场**：在输入框里输入：

```text
/plugin marketplace remove <市场名称>
```
{: .nolineno }

从这个市场安装的所有 plugin 会一起被卸载。

如果是因为怀疑 plugin 有问题才卸载它，我会把曾经交给它的 token 也换掉。后续处理可以参考[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)的“出事之后”清单。

![装了之后的三种处理：禁用会保留文件；卸载时依赖会留着、cache 留 14 天；移除市场会连同装过的 plugin 一起卸载；另外提醒自动更新会换掉看过的文件](after-install.zh-CN.webp){: w="1600" h="900" }
_概念图：由轻到重的三种处理方式。怀疑出事时先禁用，确定不用了再卸载。_

## 下一步：把检查清单放进团队规则

我一个人小心还不够，团队里每个人都可能装 plugin，所以要有共同的做法。我会从三个层面着手。

**1. 写进项目规则。** 我会把上面的检查清单放进 `CLAUDE.md`、`AGENTS.md` 或 PR 模板，约定“新增 plugin 或市场时，要附上这份清单”。规则文件怎么写，我在[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/posts/agents-md-project-rules-for-coding-agents/)里整理过。

**2. 把配置文件当成代码来审查。** 项目要推荐 plugin 时，我会在 `.claude/settings.json` 写 `extraKnownMarketplaces`（要认识哪些市场）和 `enabledPlugins`（要启用哪些 plugin）：

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

这个文件会提交进 repo，所以我把改它当成改代码，一样要经过 PR 审查。也可以把它加进 CODEOWNERS（指定哪些文件由谁审核的配置文件），让熟悉这份检查清单的人负责批准。官方文档另外说明了两点。在 repo 里写了 `enabledPlugins` 不会自动安装，协作者要自己执行：

```bash
claude plugin install <名称>@<市场> --scope project
```
{: .nolineno }

`extraKnownMarketplaces` 也只在协作者已经信任的文件夹里生效。

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

前两行只允许官方市场和公司自己账号下的市场。第三行的 `skills-dir` 让 `~/.claude/skills/` 和项目 `.claude/skills/` 里带有 `.claude-plugin/plugin.json` 的文件夹继续以 plugin 的形式加载；只有 `SKILL.md` 的普通 skill 不受这份清单影响。管理员也可以设置 `pluginTrustMessage`，在安装前的提醒后面加上公司内部的说明，例如审查流程的链接。

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 找 plugin | `/plugin` 的 Discover 标签页；或用 `/plugin install <名称>@claude-plugins-official` 先打开详细信息 |
| 知道 plugin 实际放在哪 | 看 `marketplace.json` 条目的 `source` 和 `sha` |
| 知道装了会自动执行什么 | 先看 `plugin.json` 声明的组件，再读 `hooks/hooks.json`、`.mcp.json`、`bin/`、`monitors/`、`.lsp.json` |
| 知道 mod 会做什么 | `claude plugin validate <文件夹>`，看 `hooks:` 和 `calls:`，再读那个 JavaScript 文件 |
| 知道还会一起装哪些 plugin | 看 `plugin.json` 的 `dependencies`，每个都按清单检查 |
| 核对 hook、MCP、LSP 有没有漏看 | clone 后执行 `claude --plugin-dir <文件夹> plugin details <名称>`；monitor、`bin/`、mod 另外看 |
| 先小范围试用 | 安装时选 Local |
| 加入别的市场 | 从官方链接确认 `owner/repo`，用 `#标签` 指定版本 |
| 不让看过的文件在后台被换掉 | `/plugin` → Marketplaces → Disable auto-update，改成手动更新并先看差异 |
| 暂时不用 | `claude plugin disable <名称>@<市场>` |
| 怀疑出事，先全部停下 | `claude plugin disable --all` |
| 完全卸载 | `claude plugin uninstall <名称>@<市场> --scope <范围> --prune`，需要时删掉 cache 文件夹 |
| 让团队做法一致 | 检查清单写进项目规则，`.claude/settings.json` 走 PR 审查 |

## 常见误解

- **“在官方目录里就代表安全。”** 官方市场里大多数 plugin 放在其他 repo，官方 repo 的检查不覆盖它们。安装前的提醒也不分市场。
- **“开了沙箱就不用担心。”** hook、monitor、MCP server、LSP server 和 mod 都在沙箱外运行。
- **“Will install 看过就好。”** 它只告诉你有 hook，不告诉你 hook 执行什么。
- **“没有 hooks/hooks.json 就没有 hook。”** hook 和 MCP server 也可以写在 `plugin.json` 里，hook 还能写在市场条目里。
- **“skill 只是文字，不用看。”** 文字可以让 Claude 去执行命令。
- **“看过一次就没事了。”** 开了自动更新，文件会在后台被换掉。
- **“卸载就清理干净了。”** cache 会多留 14 天，跟着装的依赖也还在，交给它的 token 也还有效。

## 结论

整理完这篇，我给自己定的规则只有一条：装 plugin 之前，先弄清楚它会在什么时候、用我的权限做什么事。官方目录和 Will install 只是起点。我会从市场条目查出 plugin 实际放在哪里，看 `plugin.json` 声明了哪些组件和依赖，再读 `hooks/hooks.json`、`.mcp.json` 这些会运行程序的文件；带了 mod，就用 `plugin validate` 看它做什么，最后用 `plugin details` 核对有没有漏看。确定要装，我会从最小的范围开始。装了之后，我也会记得自动更新会换掉文件，不用了就禁用或卸载。

如果你想看懂 plugin 带来的 hook 在做什么，可以读我写的[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)。想知道 plugin 里的 skill 是怎么写成的，见[自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护](/posts/agent-skill-authoring-guide/)。想用同一套思路检查整个 AI 工作流的供应链风险，我在[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)里整理过。
