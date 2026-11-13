---
title: "npm 12 默认挡掉安装脚本：allowScripts 怎么批准、怎么加 7 天冷静期"
description: "npm 12 默认不再执行依赖包的安装脚本。这篇教你用 npm install-scripts 批准真正需要的包、用 min-release-age 加上 7 天冷静期，以及装到恶意包时，为什么不能第一步就撤销 token。"
date: 2026-11-13 20:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, npm, application-security, incident-response]
media_subpath: /assets/img/posts/npm-12-install-scripts-allowscripts/
image:
  path: cover.zh-CN.webp
  alt: "npm 12 在安装时先挡下依赖包的安装脚本，只放行列在 allowScripts 里、你批准过的包。"
---

先说结论：升级到 npm 12 之后，依赖包的安装脚本默认不会再执行。你要做的事只有三件：看哪些包被挡、批准真正需要的、把名单 commit 进 repo。再花一分钟在 `.npmrc` 加上 7 天冷静期，刚发布的版本就不会马上装进来。

先认识几个词：

- **依赖包**（dependency）：你的项目要用到的别人的包，以及它们再用到的包。
- **安装脚本**（install script）：包在被安装时自动执行的命令，写在它的 `package.json` 里，名称是 `preinstall`、`install`、`postinstall`。它用你的账号执行，你读得到的文件，它都读得到。
- **`package.json`**：项目的配置文件，记录名称、版本和依赖包。npm 12 批准过的名单也写在这里。
- **lockfile**（`package-lock.json`）：记录每个依赖包“实际装了哪一版”的文件。
- **`.npmrc`**：npm 的配置文件，放在项目根目录就只影响这个项目。
- **token**（令牌）：一串代替账号密码的通行码，谁拿到，就能用你的身份做它允许的事。

为什么要挡？因为攻击者最常把恶意程序放在安装脚本里：你一敲 `npm install`，还没用到那个包，程序就已经跑完了。2026 年 10 月 8 日的 `tensorlake@0.5.144` 就是这样，根据[官方公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)，它通过 `preinstall` 偷走 GitHub 与 npm token、云服务密钥，以及 AI 工具和 MCP 的配置。这种事也不罕见：GitHub Advisory Database 几乎每天都在公告新的恶意 npm 包，仅 2026 年 10 月 26 日到 28 日这三天，就有 103 条（2026-11-13 以 `type=malware`、`ecosystem=npm` 查询 [GitHub Advisory Database](https://github.com/advisories?query=type%3Amalware+ecosystem%3Anpm) 的结果）。

另一篇[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)是站在**发布者**这端；这篇站在**安装包的人**这端：怎么批准真正需要的安装脚本、怎么避开刚发布的版本，以及万一装到恶意包，第一步该做什么、不该做什么。

> **版本说明**：本文依据 2026-11-13 读取的 npm CLI 12.2.2 官方文档《[npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)》、《[npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)》、《[config](https://docs.npmjs.com/cli/v12/using-npm/config/)》，以及 GitHub 的 [npm v12 变更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)整理，没有附实测结果。命令与默认值以官方文档为准。
{: .prompt-info }

## npm 12 改了什么

GitHub 在 2026-07-08 的[变更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)写明，npm v12 已正式发布，并标为 `latest`（也就是 `npm install -g npm` 默认会装的版本）。和安装脚本有关的改变是：

- **依赖包的安装脚本默认不跑。** `preinstall`、`install`、`postinstall` 都算在内，没有写脚本、但带有 `binding.gyp` 而会自动用 node-gyp 编译的包也一样。从 git、本地文件或链接装进来的依赖包，它们的 `prepare` 脚本也一并挡下。
- **安装时不会中断。** [文档](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)写，`npm install` 会默默跳过没被批准的脚本，最后列出被跳过的包，让你回头审查。
- **放行名单写在 `package.json` 的 `allowScripts`。** 列在里面、标为允许的包，脚本照常执行；标为拒绝的，一律跳过，也不再出现在待审清单里。

同一次改版也把两种来源默认关掉：git 依赖包（`allow-git`）和网址依赖包（`allow-remote`，例如直接指向某个 `.tgz` 网址）。如果你的项目用到这两种，升级后会装不上，要另外放行；本篇不展开。

![npm 12 安装时，每个带安装脚本的包都要先对照 allowScripts：批准的才执行，拒绝的直接跳过，还没审查的跳过后列在清单上](gate.zh-CN.webp){: w="1600" h="900" }
_概念图：安装时，每个带安装脚本的包都要先对照 `allowScripts`。批准过、而且版本相符的才会执行；明确拒绝的直接跳过；还没审查的也跳过，并在安装结束时列出来。批准默认会固定版本，包升级后要重新批准。_

**哪些人会受影响？** 用到“要在安装时编译或下载原生程序”的包的人最常遇到，例如官方文档示例里的 `canvas`、`sharp` 这类图像处理包。升级后若一切正常，说明你的项目可能根本不需要安装脚本；若某个功能坏了，或安装结束时列出一串被跳过的包，就按下面的步骤处理。

## 步骤 1：确认 npm 版本

在终端执行：

```bash
npm -v
```

- **显示 12.x**：默认已经在挡，直接做步骤 2。
- **显示 11.16.0 以上的 11.x**：根据 GitHub [6 月的预告](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/)，这些版本已经有同样的机制，只是先以警告提醒。可以先用 `npm approve-scripts --allow-scripts-pending` 看看升级后会被挡的有哪些，把名单准备好再升级。
- **更旧的版本**：先升级 npm，例如执行 `npm install -g npm@latest`。

团队里每个人、还有 CI（代码推上去后自动跑测试与构建的流程）用的 npm 版本最好一致。否则同一份 `package.json`，在 npm 12 上会挡，在旧版上会照跑。

**你会得到：** 确认自己的 npm 已经会挡安装脚本。

## 步骤 2：看哪些包被挡

在项目目录里执行：

```bash
npm install-scripts ls
```

这个命令只会列出“有安装脚本、但还没写进 `allowScripts`”的包，不会改任何文件，可以放心多跑几次。

接着逐个判断要不要放行。先看它的脚本到底做什么：

```bash
# 看某个版本的 package.json 里写了哪些脚本；包与版本换成清单上列出的那一个
npm view <包>@<版本> scripts
```

也可以直接打开 `node_modules/<包>/package.json` 看同样的内容，再看脚本调用的那个文件。

判断时可以参考这几条（本站整理的经验法则，不是官方规则）：

- **要编译或下载原生程序**，例如图像处理、数据库驱动：通常真的需要，批准。
- **只是发送使用统计、打印广告或感谢信息**：不需要，拒绝。
- **脚本会从不明网址下载东西，或代码被刻意弄得看不懂**：先不要批准，查清楚再说。
- **看不懂、也不确定**：先不批准，跑一次测试或把程序启动看看。功能正常，就把它明确拒绝，免得它一直出现在清单上；坏了，再回头批准。

**你会得到：** 一份“要批准”和“要拒绝”的名单。

## 步骤 3：批准或拒绝，然后 commit

批准需要的包，可以一次列好几个：

```bash
npm install-scripts approve canvas sharp
```

拒绝不需要的包：

```bash
npm install-scripts deny telemetry-pkg
```

`npm approve-scripts` 和 `npm deny-scripts` 是这两个命令的简写，效果相同。

**批准默认会固定版本。** [文档](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)写，`approve` 默认写入的是 `包@版本`，只放行你审查过的那一版。之后包升级，新版本不在名单上，安装脚本会再被挡下，重新出现在待审清单里。这正是想要的效果：攻击者若偷偷发了一个动过手脚的新版本，不会因为你批准过旧版就自动跑起来。

写进 `package.json` 之后，大致长这样（npm 文档没有附完整示例，这是根据文档描述整理的写法，版本号仅为示意）：

```json
{
  "allowScripts": {
    "canvas@3.2.0": true,
    "sharp@0.34.5": true,
    "telemetry-pkg": false
  }
}
```

- `true` 是允许，`false` 是拒绝。拒绝一律只写包名，不分版本。
- [文档](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)写明，已经写成 `false` 的包永远以拒绝为准，之后再 `approve` 也不会悄悄改回允许。
- 加上 `--no-allow-scripts-pin`，会改写成只有名称、不分版本的允许。这等于连未来的每一个新版本都先放行了，除非你有很好的理由，否则不建议。
- `npm install-scripts approve --all` 会一次批准清单上的所有包。文档的示例注释写的是“审查之后”再用；没看过就全部放行，等于把这道关卡拆掉。

批准是写进 `package.json` 的名单。要让刚才被跳过的脚本补跑，再执行 `npm rebuild <包>`，例如 `npm rebuild canvas sharp`。[文档](https://docs.npmjs.com/cli/v12/commands/npm-rebuild/)说明，这个命令会执行包的 `preinstall`、`install`、`postinstall` 和 `prepare`。

最后把名单 commit 进 repo，让团队和 CI 用同一份：

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 批准需要的安装脚本"
```

**包升级之后：** 固定的版本对不上了，包会重新出现在 `npm install-scripts ls`。看过新版本的脚本没问题，再 `approve` 一次，npm 会把旧的版本号改成新的。名单里已经用不到的旧条目，用 `npm install-scripts prune --dry-run` 先预览，再用 `npm install-scripts prune` 清掉。

**CI 要不要直接失败？** 默认只是跳过并提醒。如果你希望“没审查过的安装脚本”让 CI 直接失败，在项目的 `.npmrc` 加上：

```ini
strict-allow-scripts=true
```

根据[文档](https://docs.npmjs.com/cli/v12/using-npm/config/#strict-allow-scripts)，开启之后，有安装脚本却不在名单上的包会让安装失败；明确拒绝的包照样直接跳过，不会报错。

**你会得到：** 一份放在 repo 里、每个人和 CI 都照着用的 `allowScripts` 名单。

## 步骤 4：在 .npmrc 加上 7 天冷静期

恶意版本通常很快就会被发现、下架。只要不马上装刚发布的版本，就能躲过很大一部分。npm 的 `min-release-age` 就是做这件事：在项目根目录的 `.npmrc` 加上：

```ini
min-release-age=7
min-release-age-exclude[]=@你的组织/*
```

- `min-release-age=7`：根据[文档](https://docs.npmjs.com/cli/v12/using-npm/config/#min-release-age)，npm 只会装“发布超过 7 天”的版本：在 `package.json` 允许的版本范围内，挑已经满 7 天的。范围内一个都没有，安装就会失败。
- `min-release-age-exclude[]`：列出不受限制的包，可以写包名，也可以用 `@你的组织/*` 这种通配符。通常拿来排除自家维护的包，让它们一发布就能用。可以写好几行。

排除有两个细节：

- **只有被点名的包不受限。** 它自己用到的其他包，照样要等满 7 天，除非也符合排除规则。
- **排除不会改变它从哪里下载。** 文档提醒，你应该在公开的 npm 上也拥有自己组织的 scope（也就是 `@你的组织` 这个名称），免得别人抢先用同样的名称发布包。

![以 tensorlake 事件为例：恶意版本只在 npm 上存在约 1 小时 40 分钟，设了 7 天冷静期的项目根本不会选到它](cooldown.zh-CN.webp){: w="1600" h="900" }
_概念图：以 tensorlake 事件为例。恶意的 0.5.144 在 2026-10-08 只上线约 1 小时 40 分钟就被移除；设了 7 天冷静期的项目，要到 10 月 15 日之后才会考虑这个版本，那时它早就不在了。_

以这次事件为例：根据公告，`tensorlake@0.5.144` 只在 npm 上待了约 1 小时 40 分钟（2026-10-08 01:12 到 02:54 UTC，台北时间 09:12 到 10:54）。设了 7 天冷静期的项目，在那段时间不会选到它，等满 7 天时，它也已经被移除了。

**代价是：紧急修复也要等。** 文档写明，如果冷静期挡住了 `npm audit fix` 要装的修复版本，npm 会停留在有漏洞的版本、发出警告，并以失败结束。这时有两种做法：

- 把那个包暂时加进 `min-release-age-exclude[]`，装好修复版本再去掉。
- 暂时把天数调小。

npm 还有一个 `before` 配置，指定“只装某个日期之前发布的版本”。同一个配置文件里两个都写时，以 `before` 为准。

**你会得到：** 刚发布的版本至少要等 7 天才会进到你的项目。

## 步骤 5：全局安装与 npx 怎么放行

`npm install -g`（全局安装，装成整台电脑都能用的命令）和 `npx`、`npm exec`（下载包后直接执行一次）没有项目的 `package.json` 可以写，所以 `npm install-scripts` 在这些情况下不能用，加上 `-g` 执行会出现 `EGLOBAL` 错误。

这时改用 `allow-scripts` 配置，值是用逗号分隔的包名。[文档](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)的两种写法：

```bash
# 只在这次全局安装放行
npm install -g --allow-scripts=canvas,sharp

# 写进你个人的 npm 配置，之后一直有效
npm config set allow-scripts=canvas,sharp --location=user
```

- 根据[文档](https://docs.npmjs.com/cli/v12/using-npm/config/#allow-scripts)，这个配置就是给 `npm exec`、`npx` 和 `npm install -g` 用的。在项目里执行 `npm install`、`npm ci`、`npm update` 或 `npm rebuild` 时，在命令后面加 `--allow-scripts` 会直接报错，项目请用 `allowScripts`。
- 名称匹配的是包实际解析出来的身份，不是包自己在 `package.json` 里声称的名称。
- 写进个人配置的名单会一直有效，所以越短越好，不再需要的就去掉。

**你会得到：** 全局工具和一次性执行，也只放行你点名的包。

## 万一装到恶意包：以 tensorlake 事件为例，为什么不能第一步就撤销 token

一般的建议是：怀疑中招，就先撤销 token、换新的。但 tensorlake 这次不能这样做。下面是这次事件官方公告的步骤，**只适用于这次事件**，不是通用流程；遇到其他事件，请以各自的官方公告为准。

**发生了什么。** 根据[官方公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 2026-10-08，攻击者用被盗的维护者账号，把 `tensorlake@0.5.144` 发布到 npm。同版本号的 `tensorlake-native-*` 系列包也受影响。
- 恶意程序藏在 `preinstall`，安装时就执行。它会收集 GitHub 与 npm token、AWS 与 GCP 的云服务凭证、Kubernetes 与 Vault token、SSH 与 GPG 密钥、`.env` 文件、浏览器保存的密码、加密货币钱包，以及 AI 工具和 MCP 的配置，再用偷到的 token 把自己发布到受害者有权限的其他包和 repo。
- 它还会装一个叫 `gh-token-monitor` 的常驻服务：**偷来的 GitHub token 一被撤销，它就会删除用户的主目录。**
- 这个版本是通过 tensorlake 自己的发布流程发出的，所以带着有效的 npm provenance（来源证明）。这也是[Trusted Publishing 那篇](/posts/npm-trusted-publishing-github-actions/)提醒过的：provenance 只证明“从哪里构建出来”，不保证包里没有恶意程序。

**先确认有没有装到。** 公告提供的方法：

- 在项目里执行 `npm list tensorlake`，显示 0.5.144 就是受影响。
- 在 `package-lock.json`、`yarn.lock`、`pnpm-lock.yaml` 里找 `tensorlake@0.5.144` 或 `tensorlake-native-*@0.5.144`。
- 翻看 CI 的构建记录，看 2026-10-08 01:12 到 02:54 UTC 之间，有没有哪次安装解析到 0.5.144。

公告写明，只要在“启用了安装脚本”的电脑或 CI 上装过 0.5.144，就要把那台机器，以及它碰得到的所有凭证，都当成已经泄露。

**处理顺序（按公告）：**

1. **先断网**：把那台电脑从网络上断开。
2. **移除 `gh-token-monitor`，而且要在撤销任何 GitHub token 之前做**：
   - Linux：执行 `systemctl --user disable --now gh-token-monitor.service`，再删除 `~/.config/gh-token-monitor/` 和 `~/.local/bin/gh-token-monitor.sh`。
   - macOS：执行 `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.user.gh-token-monitor.plist`，再删除这个 plist 文件。
   - Windows：删除名为 `gh-token-monitor` 的计划任务，以及 `%LOCALAPPDATA%\gh-token-monitor\` 文件夹。
3. **换一台干净的电脑轮换凭证**：那台电脑碰得到的所有凭证都要换新，而且要从另一台没中招的电脑操作。
4. **检查你的包和 repo**：你的 token 能发布或写入的 npm 包和 repo，看有没有不明的新版本、作者显示为 `claude` 的 commit，或叫 `dependabot/github_actions/format/setup-formatter` 的分支。
5. **重装系统**：用可信的镜像（干净的系统安装来源）重建那台电脑。

![以 tensorlake 事件为例的处理顺序：先断网、再移除 gh-token-monitor，接着换一台干净的电脑轮换凭证、检查包与 repo，最后重装系统](incident-order.zh-CN.webp){: w="1600" h="900" }
_概念图：以 tensorlake 事件为例。先断网、先移除常驻服务，再从另一台干净的电脑换凭证；如果第一步就撤销 GitHub token，常驻服务会删掉主目录。这是这次事件的官方步骤，不是通用流程。_

为什么顺序这么重要？撤销 token 本来是对的，但这次的恶意程序把“token 被撤销”当成引爆条件。先撤销 token，就是自己按下删除键。断网和移除服务放在前面，是先把它拆掉，再去换钥匙。

更一般的“怎么判断自己是不是已经中招”，可以看[OWASP Agentic Top 10 检查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)的同名段落。

## 限制

> 使用前请先了解这些限制：
>
> - **它只挡“安装时”执行的脚本。** 包本身的代码，在你的程序 `require` 或 `import` 它的时候照样会执行；挡下安装脚本，不代表这个包就安全。
> - **批准等于信任。** 批准过的脚本照样用你的账号执行，读得到你读得到的文件。
> - **固定版本只防“新版本”。** 如果你批准的那一版本身就有问题，固定版本帮不上忙。
> - **`npm install-scripts` 不识别 workspaces**（同一个 repo 里管理多个包的功能），文档写明它“unaware of workspaces”。
> - **冷静期会推迟紧急修复。** 需要马上更新时，要暂时排除那个包。
> - **lockfile 里已经锁定的版本会不会重新检查冷静期，文档没有写明。**
> - **`--dangerously-allow-all-scripts` 会完全绕过名单。** 文档写它只是迁移时的应急手段，强烈不建议使用。
{: .prompt-warning }

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 知道哪些包被挡 | `npm install-scripts ls`，只读不改 |
| 放行需要的包 | `npm install-scripts approve <包>`，默认固定版本；再 `npm rebuild <包>` 补跑脚本 |
| 挡掉不需要的包 | `npm install-scripts deny <包>`，之后也不会被 `approve --all` 改回来 |
| 让 CI 遇到没审查的脚本就失败 | 项目 `.npmrc` 加 `strict-allow-scripts=true` |
| 包升级后又被挡 | 看过新版本脚本，再 `approve` 一次；用 `prune` 清掉旧条目 |
| 不装刚发布的版本 | `.npmrc` 加 `min-release-age=7` |
| 自家包要马上能用 | `min-release-age-exclude[]=@你的组织/*` |
| 紧急修复被冷静期挡住 | 暂时把该包加进 `min-release-age-exclude[]`，或暂时调小天数 |
| 全局安装或 npx 要跑脚本 | `npm install -g --allow-scripts=<包>`，或 `npm config set allow-scripts=<包> --location=user` |
| 怀疑装到 tensorlake 0.5.144 | 按公告：断网、先移除 `gh-token-monitor`、换台干净电脑轮换凭证 |

## 常见错误与处理

- **升级后某个功能坏了，却没有错误信息：** 安装脚本被跳过时不会中断安装。看一下 `npm install` 最后列出的包，或执行 `npm install-scripts ls`。
- **在项目里加 `--allow-scripts` 结果报错：** 这个参数只给全局安装和 `npx` 用。项目请用 `npm install-scripts approve`。
- **加 `-g` 执行 `npm install-scripts` 出现 `EGLOBAL`：** 全局安装没有 `package.json` 可写，改用 `--allow-scripts` 或 `npm config set allow-scripts=...`。
- **批准了却一直出现在待审清单：** [文档](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)写，lockfile 里缺少下载地址（例如较旧的 lockfile）时，npm 没办法固定版本，会改成只写名称并发出警告。执行一次 `npm install` 更新 lockfile，就能恢复固定版本。
- **Dependabot 等工具开的升级 PR，CI 开始失败：** 开了 `strict-allow-scripts` 时，升级后的版本不在名单上，这是预期中的提醒。看过新版本脚本后重新批准，把 `package.json` 一起 commit 到那个 PR。
- **加了冷静期后装不上：** 你指定的版本可能还不到 7 天。等几天、改用较旧的版本，或确认它是不是该被排除的自家包。
- **以为拒绝过的包会被 `approve --all` 放行：** 不会，`false` 永远优先。真的要放行，先把那一项从 `allowScripts` 去掉。

## 结论与下一步

升级到 npm 12 之后，先跑 `npm install-scripts ls`，批准真正需要的、拒绝其他的，把 `allowScripts` commit 进 repo；再在 `.npmrc` 加上 `min-release-age=7`。万一真的装到恶意包，先读那次事件的官方公告再动手，tensorlake 这次就是“先撤销 token 反而出事”的例子。

发布者那端怎么去掉长期 token，见[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)；AI 工具和 MCP 带来的供应链风险，见[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)；想把整条 AI 工作流的风险一次盘点，见[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。

官方说明以 [npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)、[npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)、[config](https://docs.npmjs.com/cli/v12/using-npm/config/) 与 GitHub 的 [npm v12 变更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)为准；tensorlake 事件以[官方安全公告 GHSA-8g63-53c9-65j2](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2) 为准。
