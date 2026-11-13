---
title: "把 AI 执行的命令关进沙箱：Claude Code /sandbox 一步步设置，挡住 SSH 密钥与 token"
description: "Claude Code 的沙箱默认关闭，开了之后默认仍读得到 ~/.ssh。这篇一步步开启 /sandbox、确认真的挡得住、把密钥和 token 挡在外面，并列出沙箱管不到的地方。"
date: 2026-11-13 09:00:00 +0800
categories: [信息安全, AI Agent]
tags: [claude-code, coding-agent, ai-security, sandbox]
media_subpath: /assets/img/posts/claude-code-sandbox-setup/
image:
  path: cover.zh-CN.webp
  alt: "用 /sandbox 把 Claude 跑的命令关进沙箱，再把 SSH 密钥和 token 挡在外面。"
---

Claude Code（在终端里使用的 AI 编程助手）会自己执行命令：跑测试、装依赖、调用 `git`。这些命令用的是你的账号，所以默认能读你读得到的文件，包括 SSH 密钥和云服务凭证。Claude Code 内置沙箱（sandbox），可以把这些命令关在操作系统强制执行的范围里，限制它们能写哪里、能连哪些网站。

但沙箱**默认是关闭的**。就算打开了，官方文档也写明：默认仍读得到 `~/.ssh` 和 `~/.aws/credentials`。很多人以为“开了就安全”，其实还差几步。

这篇一步步带你做完这几件事：开启 `/sandbox`、确认它真的挡得住、把密钥和 token 挡在外面、关掉“沙箱外重试”，最后列出沙箱管不到的地方，以及怎么补。文末附一份可以直接复制的 `settings.json`。

> **版本**：本文依据 2026-11-13（台北时间）读取的 [Sandboxing](https://code.claude.com/docs/en/sandboxing)、[Permissions](https://code.claude.com/docs/en/permissions)、[Settings reference](https://code.claude.com/docs/en/settings-reference) 与 [changelog](https://code.claude.com/docs/en/changelog) 整理。当天最新的 Claude Code 是 2.1.323（11 月 12 日发布）。11 月的几个版本接连修复了沙箱与权限规则的问题，例如 2.1.321 修复了只读命令未经提示就在沙箱外执行，以及 `cp`／`mv` 写入文件夹时拒绝规则失效；2.1.323 修复了沙箱可能在对话中途关闭、`excludedCommands` 让没列出的命令跑出沙箱。请先把 Claude Code 更新到最新版再照着做。
{: .prompt-info }

这篇是[用 OWASP Agentic Top 10 检查你的 AI 工作流：十项风险逐条对照与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)的实操续篇。那篇只要你“确认 `/sandbox` 有没有开”，这篇示范开了之后怎么设置。为什么要限制 agent 的权限，见[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)，这里不再重讲。

## 沙箱挡什么、默认放行什么

沙箱只包住“命令”：Claude 通过 Bash、PowerShell 和 Monitor 工具跑的命令，以及这些命令再启动的程序。限制由操作系统执行，macOS 用内置的 Seatbelt，Linux 和 WSL2 用 bubblewrap。原生 Windows 不支持，Claude Code 会直接在沙箱外跑命令；要在 Windows 上用沙箱，得把 Claude Code 装在 WSL2 里。

官方文档列出开启后的默认值：

| 项目 | 默认 | 用哪个设置调整 |
| --- | --- | --- |
| 写入 | 只能写工作目录、一个每位用户专用的临时文件夹，以及你另外加入的文件夹。其中 Claude Code 的配置文件、`.mcp.json`、`.git/hooks` 这类受保护的路径仍然不能写 | `filesystem.allowWrite`、`filesystem.denyWrite` |
| 读取 | 几乎整台电脑都读得到，**包括 `~/.ssh`、`~/.aws/credentials`** | `filesystem.denyRead`、`credentials` |
| 网络 | 不能直接连外网。连接都要经过本地的代理，代理会比对你允许的域名，而允许列表一开始是空的。不在列表上的域名怎么处理，**看你的权限模式**：Manual 模式会问你，`bypassPermissions` 模式直接放行 | `network.allowedDomains`、`network.deniedDomains`、`network.strictAllowlist` |
| 环境变量 | 沿用 Claude Code 的环境，**包括里面的 token** | `credentials` |

![沙箱包住 Claude 跑的命令；文件工具、hooks、MCP server 和你自己用 ! 输入的命令在沙箱外](inside-outside.zh-CN.webp){: w="1600" h="900" }
_概念图，不是实际界面。沙箱只管命令，其他组件按权限规则或以你的完整权限执行。_

写入和网络默认就收得很紧，读取和环境变量则几乎没挡。这就是第三步要补的地方。

## 什么时候该开

符合下面任一种情况，就值得开：

- 你常点“允许”让 Claude 跑命令，或想让它不必每次问你就能跑。开了沙箱，可以改由沙箱挡住越界的操作，而不是靠你逐条看命令。
- 你会让 Claude 读不是你写的东西，例如别人的 repo、issue、网页或依赖包的源代码。这些内容可能藏着要 AI 执行命令的文字。
- 你的电脑上有密钥、云服务凭证或 token，而且不想让 AI 跑的命令读到它们。

## 步骤一：用 /sandbox 开启

**macOS** 不用另外安装。**Linux 和 WSL2** 要先装 bubblewrap 和 socat：

```bash
# Ubuntu / Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

装好后重新启动 Claude Code，因为依赖只在启动时检查。WSL1 不支持，请先升级到 WSL2。较新的 Ubuntu 默认限制用户命名空间（AppArmor），会导致 bubblewrap 无法启动；`/sandbox` 会指出这个问题，解决方法见官方的 [Add an AppArmor profile for bubblewrap](https://code.claude.com/docs/en/sandboxing#add-an-apparmor-profile-for-bubblewrap)。

接着在 Claude Code 里输入：

```text
/sandbox
```

会打开沙箱面板，有三个标签页：

- **Mode**：选择沙箱里的命令要怎么批准。
- **Overrides**：在沙箱里失败的命令，能不能改到沙箱外重跑。第四步会关掉它。
- **Config**：查看当前生效的沙箱设置。

在 Linux 上，如果面板**只有** Dependencies 标签页，说明沙箱还无法启动，按标签页列出的缺失项（或 AppArmor 限制）处理后重启。如果 Dependencies 出现在其他标签页旁边，缺的只是可选组件（seccomp filter），沙箱照样能运行。

在 Mode 标签页二选一：

- **auto-allow**：在沙箱里跑的命令不再逐条询问你。拒绝规则仍然有效，`Bash(git push *)` 这类指定内容的询问规则也照样会弹出确认。
- **regular permissions**：沙箱照样限制，但每条命令仍按一般权限流程问你。

两种模式的文件与网络限制完全相同，差别只在要不要问你。想少点几次“允许”就选 auto-allow，想每条命令都自己看过就选 regular permissions。注意，选了 auto-allow 之后，就算你的权限模式是会逐个询问改文件的 Manual 模式，Claude 用命令改工作目录里的文件也不会再问你。

在面板选的模式只会存进**这个项目**的 `.claude/settings.local.json`。要让所有项目都开沙箱，在 `~/.claude/settings.json` 设置 `"sandbox": { "enabled": true }`。只写 `enabled` 时，默认就是 auto-allow；要改成 regular permissions，再加上 `"autoAllowBashIfSandboxed": false`。

**你会得到什么：** Claude 跑的命令开始受沙箱限制。第一次有命令要连新域名时，Manual 模式（默认的权限模式）会先问你；auto 模式交给分类模型判断，`bypassPermissions` 模式则直接放行。不想让任何模式放行列表外的域名，在用户设置的 `sandbox` 里加上 `"network": { "strictAllowlist": true }`（2.1.219 起；写在 repo 的配置文件里无效），列表外的域名一律拒绝，需要的域名改写进 `allowedDomains`。

## 步骤二：确认真的挡得住

官方给了两行检查命令。请**让 Claude 执行**，不要自己在 `!` 提示符后面输入：你自己用 `!` 输入的命令，在大多数情况下本来就在沙箱外跑，测不出沙箱有没有起作用。

| 命令 | 沙箱起作用时的结果 |
| --- | --- |
| `touch ~/sandbox-probe` | macOS 显示 `Operation not permitted`；Linux 和 WSL2 显示 `Read-only file system` |
| `curl --noproxy '*' https://example.com` | 显示 `Could not resolve host`，因为这条命令绕不过沙箱的代理 |

第一行测试“写不到主目录”，第二行测试“没办法自己连外网”。

请在 Manual 模式下做这个检查。如果 Claude 问你要不要改到沙箱外重试，**拒绝**；在 `bypassPermissions` 模式，或有允许规则刚好匹配这条命令时，重试会不问就在沙箱外跑，检查就不准了（第四步会关掉这个重试）。另外，如果你是在主目录启动 Claude Code，或把主目录加成了工作目录，`touch` 本来就写得进去，换一个项目文件夹再测。排除这两种情况后 `touch` 仍然成功，先删掉 `~/sandbox-probe`，再执行 `/sandbox` 确认沙箱已经开启、依赖都装好了。

**你会得到什么：** 两行都失败，说明写入和网络限制在起作用。

## 步骤三：把密钥和 token 挡在外面

沙箱**没有内置的凭证列表**，只有你列出来的文件和变量才会被挡。用 `sandbox.credentials` 列出要保护的项目。下面是官方示例，挡住 AWS 凭证文件和整个 SSH 文件夹，并把 `GITHUB_TOKEN`、`NPM_TOKEN` 从沙箱命令的环境里移除：

```json
{
  "sandbox": {
    "enabled": true,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

`"mode": "deny"` 对文件的意思是沙箱里的命令不能读，对环境变量的意思是每条沙箱命令执行前先把它移除。把列表换成你电脑上真的有的凭证，例如其他云服务的配置文件，或其他存放 token 的环境变量。

建议放在用户设置 `~/.claude/settings.json`，所有项目都会生效。各层设置的 `deny` 会合并，任何一层都可以再加，但没有一层能去掉别层加的 `deny`。不过这不代表 repo 动不了你的保护：repo 的设置优先于用户设置，还有别的办法放宽沙箱，步骤五会说明怎么防。

**怎么确认：** 先自己在 `!` 后面输入 `wc -c ~/.ssh/known_hosts`（换成你电脑上确实存在的文件），这是在沙箱外跑，会输出文件大小。再请 Claude 跑同一行；设置生效后，它应该读不到原本的文件。`wc -c` 只输出文件大小，不会把内容输出到对话里。环境变量也一样，先自己用 `!` 跑 `test -n "$GITHUB_TOKEN" && echo set || echo unset`，确认输出 `set`（说明你的 shell 本来就有这个变量），再请 Claude 跑；生效后应该输出 `unset`。这行同样不会把 token 本身输出来。如果 Claude 要求改到沙箱外重试，拒绝。

**会挡到什么：** 挡掉 `~/.ssh` 之后，沙箱里的 `git push`、`git pull` 如果走 SSH 就会失败。macOS 上就算没挡 `~/.ssh`，沙箱里的 SSH remote 本来也连不上。最简单的做法是推送时自己在 `!` 后面输入 `git push`，它在沙箱外跑。另一种是把 remote 换成 HTTPS，但这需要 personal access token 之类的 HTTPS 凭证，而上面的设置已经把 `GITHUB_TOKEN` 从沙箱里拿掉了。官方也提供 `excludedCommands` 把 `git push` 等命令移出沙箱，但被移出的命令会用你的完整权限执行、能连任何主机，用之前请想清楚。

> 想让工具在沙箱里照常登录、又不让它看到真正的 token，官方另有 `"mode": "mask"`：命令只看到一个替代值，代理在发出请求时才换成真的。它要搭配实验性的 `network.tlsTerminate`，而且 macOS 上对文件使用 `mask` 的效果等于 `deny`。设置较复杂，入门先用 `deny`，细节见 [Mask credentials](https://code.claude.com/docs/en/sandboxing#mask-credentials)。
{: .prompt-tip }

## 步骤四：关掉“沙箱外重试”

命令在沙箱里失败时，Claude 可以带上 `dangerouslyDisableSandbox` 参数，要求在沙箱外重跑一次。这是给不兼容沙箱的工具用的逃生口。谁来批准这次重跑，取决于你的权限模式：

- Manual 模式和 `acceptEdits` 模式：会弹出标题为“Bash command (unsandboxed)”的确认。
- auto 模式：交给另一个分类模型判断。
- `bypassPermissions` 模式：**不问就直接跑**。
- 另外，如果有允许规则刚好匹配这条命令，例如 `Bash(curl *)`，重跑也会直接通过，不会问你。

想让 Claude 跑的命令都留在沙箱里，就关掉这个逃生口：

```json
{
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "failIfUnavailable": true
  }
}
```

- `allowUnsandboxedCommands: false`：Claude Code 会忽略 `dangerouslyDisableSandbox`。之后 Claude 跑的命令，除了匹配 `excludedCommands` 的以外，都在沙箱里执行。`/sandbox` 的 Overrides 标签页把这个状态叫做 **Strict sandbox mode**。
- `failIfUnavailable: true`：沙箱启动不了时（平台不支持或缺依赖），Claude Code 直接在启动时报错退出。没有这一项，Claude Code 只会在启动时显示警告，**照样在沙箱外跑命令**。代价是在原生 Windows 这类不支持的平台上，或 Ubuntu 的 AppArmor 限制还没处理时，Claude Code 会无法启动。

用户设置里的 `allowUnsandboxedCommands: false`，就算项目设置写 `true` 也不会被覆盖（2.1.285 起）。

**你会得到什么：** 命令在沙箱里失败就是失败，Claude 会报告错误，由你决定要不要调整设置，而不是自己跑到沙箱外。

**会挡到什么：** 和沙箱不兼容的工具会直接失败，Claude 也不能再改到沙箱外重试。官方故障排查列出的例子有 `docker`、`jest`，以及 macOS 上的 `gh`、`gcloud`、`terraform` 这类用 Go 写的工具、需要打开浏览器的登录流程。遇到时自己用 `!` 执行。如果觉得完全关掉太严，另一个做法是保留重试，但加一条询问规则 `Bash(dangerouslyDisableSandbox:true)`（写在 `permissions.ask`），每次要到沙箱外重试都会问你，连 auto 模式和 `bypassPermissions` 模式也一样。

## 步骤五：沙箱管不到什么

沙箱只包住命令。下面这些不在范围内，要用别的方法补。

**Claude 的文件工具和网络工具。** Read、Edit、Write、WebFetch、WebSearch 按权限规则决定，不受沙箱限制。官方特别写明：`denyRead` 挡不住 Read 工具，`allowedDomains` 也限制不了 WebFetch。换句话说，就算沙箱挡住了 `cat ~/.ssh/id_ed25519`，Claude 还是可以用 Read 工具去读。要补上这一块，在权限设置里加拒绝规则：

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  }
}
```

`Read(...)` 拒绝规则挡 Claude 的文件工具，也挡 Claude Code 认得的 `cat`、`head` 这类读文件命令，并会一并挡住 Edit 和 Write 改同一个路径（NotebookEdit 例外）。开了沙箱时，Claude Code 也会把它加进沙箱的读取拒绝列表。路径写法和沙箱不同：`~/` 代表主目录，绝对路径要写成 `//` 开头。

`blockWritesOutsideWorkingDirectories`（2.1.314 起）让 Write、Edit、NotebookEdit 在任何权限模式下都拒绝写到工作目录以外；它不限制命令，命令的写入范围由沙箱负责，两者刚好互补。开了它要知道两个副作用：Claude 不能再改 Claude Code 的配置文件，连项目里的也不行，要自己改；Claude 的 `EnterWorktree`、`ExitWorktree` 工具也会被移除。要关掉它，得从每个配置文件删掉这个键再重启。想连读取也限制在工作目录内，还有 `blockReadsOutsideWorkingDirectories`（2.1.257 起）可用。

**Claude Code 自己启动的程序。** [Hooks](/posts/claude-code-hooks-automate-checks/)、本地的 MCP server、插件的 monitor、LSP server、状态栏命令、`apiKeyHelper`，都以你的完整权限执行。Mod（在 Claude Code 里执行自己代码的插件）也一样。装之前先看清楚它会做什么，沙箱帮不上忙。想让这些程序也拿不到凭证类的环境变量，官方提供 `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 环境变量，不管有没有沙箱，都会把凭证从所有子进程的环境里移除。

**你自己用 `!` 输入的命令。** 大多数情况下在沙箱外执行，即使开了 Strict sandbox mode 也一样。步骤三自己输入 `git push` 推送，靠的就是这一点；反过来说，在这里输入的命令没有沙箱帮你挡。

**`excludedCommands` 列出的命令。** 被列进去的命令完全不受沙箱限制。条目写得越宽（例如 `docker *`），沙箱外能做的事就越多。官方建议：工具只是需要多写一个文件夹或多连一个域名时，改用 `allowWrite` 或 `allowedDomains`，让它留在沙箱里。

**别人 repo 里的配置文件。** repo 的 `.claude/settings.json` 和 `.claude/settings.local.json` 优先于你的用户设置。一般情况下，它们可以写 `"enabled": false` 把沙箱关掉，可以加 `excludedCommands` 把命令移出沙箱（被移出的命令读得到 `~/.ssh` 和 token），可以用更窄的 `allowRead` 重新打开你挡掉的路径，也可以加 `allowWrite`、`allowedDomains` 放宽写入和网络。只写在 `~/.claude/settings.json` 的设置挡不住这些。

打开不熟悉的 repo 前，先看一下这两个文件。更稳妥的做法是把沙箱设置另存一份，例如 `~/.claude/sandbox-strict.json`，内容是下一节完整设置里的 `sandbox` 那一段（最外层是 `{ "sandbox": { ... } }`），再用 `--settings` 带入启动：

```bash
claude --settings ~/.claude/sandbox-strict.json
```

用 `--settings` 关掉沙箱外重试时，沙箱会进入官方说的“admin-required”状态（2.1.285 起）。这时 Claude Code 会忽略 repo 设置里的 `excludedCommands`、`allowedDomains`、写入权限，以及把 `enabled` 改成 `false` 的设置；`--settings` 里的 `credentials` 挡掉的路径，repo 也不能再用 `allowRead` 打开。代价是 `/sandbox` 不再打开面板，而是显示 `Sandbox settings are overridden by a higher-priority configuration`；要确认设置来源，改用 `/status` 看 `Setting sources`。

**域名允许列表只看主机名。** 代理按连接请求的主机名放行，默认不解密、也不检查加密流量的内容。官方警告，允许 `github.com` 这类范围很大的域名，可能成为把数据送出去的通道。允许列表只放真正需要的域名。另外，在网络确认对话框选“Yes, and don't ask again”时，Claude Code 会保存一条 `WebFetch(domain:...)` 允许规则，这条规则也让 WebFetch 工具可以连到那个域名。

**git worktree。** 如果你按照[让两个 AI 分开工作：用 git worktree 开独立工作目录](/posts/git-worktree-parallel-ai-agents/)的方式，在 worktree 里开 Claude Code，沙箱会允许写入主 repo 共用的 `.git` 文件夹，所以 `git commit` 照常工作；但其中的 `hooks/` 和 `config` 仍不能写。从 2.1.323 起，沙箱里的 `git worktree add`、`move`、`remove` 会因为只读而失败，在不是这次对话开启或加入的 worktree 里 commit 也一样。创建和移除 worktree 请自己在终端里做。

想把上面这些也一起关起来，就要把整个 Claude Code 放进容器、虚拟机或官方的 sandbox runtime 里运行。各种方式的比较见官方的 [Sandbox environments](https://code.claude.com/docs/en/sandbox-environments)。

## 完整的 settings.json

把前面几步合起来，放在 `~/.claude/settings.json`。如果文件里已经有 `permissions` 或 `sandbox`，把内容合并进去，不要整份覆盖：

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

这份设置做了这些事：

- 所有项目默认都开沙箱，沙箱开不了就不启动。
- Claude 跑的命令不能改到沙箱外重试。
- 沙箱里的命令读不到 SSH 密钥和 AWS 凭证，也拿不到 `GITHUB_TOKEN`、`NPM_TOKEN`。
- Claude 的文件工具读不到同样的文件，也不能写到工作目录以外。

这些都是“repo 没有另外放宽”时的效果。步骤五说过，repo 的设置可以把沙箱关掉或放宽；要挡住这一点，把 `sandbox` 那一段另存成 `~/.claude/sandbox-strict.json`（文件本身仍是一个 JSON 对象，最外层是 `{ "sandbox": { ... } }`），用 `claude --settings ~/.claude/sandbox-strict.json` 启动。

保存后重启 Claude Code，执行 `/sandbox`，到 Config 标签页确认设置已经生效（用 `--settings` 启动时改看 `/status` 的 `Setting sources`），再按步骤二和步骤三的方法检查一次。

## 结论

沙箱默认关闭，开了也只挡写入和网络，读取和环境变量要自己补。按这篇的顺序做：用 `/sandbox` 开启，让 Claude 跑两行命令确认挡得住，用 `sandbox.credentials` 列出要保护的密钥和 token，再用 `allowUnsandboxedCommands: false` 关掉沙箱外重试。最后记得，沙箱只包住命令；Claude 的文件工具要靠权限规则，hooks 和 MCP server 以你的完整权限执行，repo 的设置也能把沙箱放宽，打开不熟悉的 repo 时用 `--settings` 启动。

## 延伸阅读

- [Sandboxing](https://code.claude.com/docs/en/sandboxing)：官方的完整说明，包括故障排查与组织级的强制设置。
- [Permissions](https://code.claude.com/docs/en/permissions)：权限规则的写法，以及怎么限制文件工具。
- [用 OWASP Agentic Top 10 检查你的 AI 工作流：十项风险逐条对照与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)：这篇的起点，十道自我检查题。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：MCP server 和插件在沙箱外执行，这篇说明它们带来的风险。
- [把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)：hooks 以你的完整权限执行，不受沙箱限制。
