---
title: "npm Trusted Publishing 设置教程：发布包不再放长期 token"
description: "在 GitHub Actions 用 Trusted Publishing 发布 npm 包，不必放长期 token。这篇文章教你怎么设置，以及设好后怎么收回旧令牌。"
date: 2026-11-11 13:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-trusted-publishing-github-actions/
image:
  path: cover.zh-CN.webp
  alt: "用 Trusted Publishing 在 GitHub Actions 发 npm 包，不必再放长期 token。"
---

先说结论：用 GitHub Actions 自动发布 npm 包时，可以改用 npm 的 Trusted Publishing，不必再把长期 token 存在 CI 里。设好之后，还要另外收回旧 token，风险才算真正降下来。

先认识几个词：

- **npm 包**：上传到 npm 注册表（registry）、别人可以用 `npm install` 安装的代码。**发布**（publish）就是把新版本传上去。
- **CI／CD**：代码一推上去，就自动跑测试、打包、发布的流程。
- **GitHub Actions**：GitHub 内置的 CI／CD 工具。
- **repo**（repository，仓库）：GitHub 上存放项目代码的地方。
- **workflow**：放在 repo 的 `.github/workflows/` 里的 YAML 配置文件，写明要自动做哪些事。
- **runner**：实际执行 workflow 的机器。

为什么要换？token（令牌）是一串代替账号密码的通行码，谁拿到，就能用你的身份做它允许的事。如果你的自动发布，是把一个 `NPM_TOKEN` 放进 GitHub Actions 的 secrets（GitHub 存放密码等机密数据的地方），这就是长期 token：在撤销或到期前一直有效。一旦泄露，别人就能冒用你的名义发布新版本。

另一篇[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)是从用户那边看这个风险：文中的 Nx 案例，根据 [Nx 官方安全公告](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c)，攻击者是通过 GitHub Actions 的注入漏洞取得 npm 发布令牌。本文改从**发布者**这端，去掉“长期 token 放在 CI”这个风险。但要先说清楚：Trusted Publishing 挡不住那类事件本身。workflow 若已被注入恶意命令，它照样可以发布。想让每个版本多一道人工把关，请看后面的“进阶：更严格的做法”。

本文只讲 GitHub 托管的 runner（由 GitHub 提供的机器），搭配 npmjs.com 上的设置。若想给 workflow 加上自动化审查，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)。

> **版本说明**：本文依据 2026-11-11 读取的 npm 官方文档《[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)》撰写；npm 近几个月仍在调整这项功能（例如 2026-09-03 之后新建的设置，默认只允许 stage publish），设置界面与默认值以官方文档为准。
{: .prompt-info }

## Trusted Publishing 是什么、怎么运作

一句话：[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) 让 npm 改看“这次发布来自哪个 repo、哪个 workflow”来确认身份，所以 CI 里不必再存长期 npm token。

它依靠的是 OIDC（OpenID Connect），一套让系统之间出示身份证明的标准。每次发布时，GitHub 会签发一张短期身份证明（技术上叫 JWT），写明这是哪个 repo、哪个 workflow。npm 核对它和你事先在 npmjs.com 填好的设置相符后，才换发这次发布用的短期凭证。按文档的说法，这种凭证经过加密签名，只给你的 workflow 使用，无法提取，也不能重复使用。

流程可以想成四步：

1. workflow 在 GitHub 托管的 runner 上开始运行。执行发布的 job（workflow 里的一组步骤）要有 `id-token: write` 权限，才能申请身份证明。
2. GitHub 签发 OIDC 身份证明，写明 repo 与 workflow。
3. npm 核对组织或用户名、repo、workflow 文件名都相符，才换发短期凭证。
4. 执行 `npm publish`。若是公开 repo 加上公开包，npm 还会自动附上 provenance（来源证明：公开记录这个版本是从哪个 repo、哪个 workflow 构建出来的）。

要注意：npm 是**额外**接受 trusted publisher，原有的 token 和手动发布照样有效。npm CLI 会自动检测 OIDC 环境，有就优先使用，没有才回退到传统 token。所以设好之后，旧 token 仍然能发布，要到步骤 4 另外收回。

![GitHub Actions 用 OIDC 向 npm 换一次性的短期凭证来发布，不必存放 npm token](flow.zh-CN.webp){: w="1600" h="900" }
_概念图：GitHub Actions 先出示身份证明，npm 核对设置后才换发这次发布用的短期凭证。公开 repo 加上公开包时，会自动附上 provenance。发布这一步不需要 npm token；安装私有依赖包仍要 read-only token。_

## 什么时候该用、什么时候还不行

**先说结论：** 用 GitHub Actions（GitHub 托管的 runner）自动发布的包，适合现在就换；自己搭建的 runner 目前还不行。

**为什么是现在。** [npm 文档写明](https://docs.npmjs.com/about-access-tokens)，旧式（legacy）token 已于 2025 年 11 月移除，现在只剩 granular access token（细粒度令牌：可以限定它能访问哪些包、有哪些权限、何时到期）。而用 granular token 直接发布新版本的能力，文档写明将于 2027 年 1 月移除。也就是说，CI 若靠 token 直接发布，到时候就得换方法。npm 在 [CI/CD 说明](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow)里也建议：从 CI 发布包，用 trusted publishing，不要用 access token。

**适合用在：** 用 GitHub Actions、GitHub 托管 runner 自动发布的包。官方也支持 GitLab.com 的 shared runner 和 CircleCI cloud，设置方式见[同一份文档](https://docs.npmjs.com/trusted-publishers)；本文不展开这两种平台。

**目前还不行：** self-hosted runner（自己搭建的执行机器）。[文档写明](https://docs.npmjs.com/trusted-publishers)目前不支持，未来计划会支持。文档目前列出的支持平台只有上面这三种。

**它不处理这些事：**

- 安装私有依赖包。依赖包是你的项目要用到的其他包；其中若有私有的，安装时仍要一个 read-only（只能读、不能发布）的 granular token。
- 其他 npm 命令。Trusted Publishing 只管发布；`npm install`、`npm view`、`npm access` 等命令如果需要验证，仍要用传统方式。

## 步骤 0：先准备这些

开始之前，确认这四件事：

- **版本够新：** npm CLI 11.5.1 及以上、Node.js 22.14.0 及以上，这是[官方文档](https://docs.npmjs.com/trusted-publishers)的版本要求。官方示例用 Node 24，目前内置的 npm（11.19.x）已经满足。**Node 22 内置的 npm 是 10.x，不到 11.5.1**；一定要用 Node 22 的话，请在发布前先升级 npm，例如在 workflow 里加一步 `npm install -g npm@latest`。
- **`repository.url` 完全一致：** `package.json`（包的配置文件，记录名称、版本等信息）里的 `repository.url`，必须和你的 GitHub repo **完全一致**，大小写也要相同。从 fork（复制别人的 repo 而来）的项目若没改这个字段，发布会失败。
- **账号与 2FA：** 你的 npm 账号要能管理这个包，并已开启 2FA（两步验证：除了密码，还要再输入一组验证码）。步骤 4 会把包改成“发布必须 2FA”，进阶的 stage publish 批准也要用 2FA。
- **包已经在 npm 上：** 设置入口在已有包的 Settings 页。官方文档没有另外写“全新包”该怎么设置。

**你会得到：** 版本够新、`repository.url` 对得上 GitHub repo 的项目，可以开始填表。

## 步骤 1：在 npmjs.com 新增 Trusted Publisher

这一步是告诉 npm：要信任哪个 repo 的哪个 workflow。

到 [npmjs.com](https://www.npmjs.com) 打开你的包，进入 **Settings**，找到 **Trusted Publisher** 区块，在 **Select your publisher** 选择 **GitHub Actions**。文档写的管理路径是：Packages → 你的包 → Settings → Trusted publishing。

**先分清两种界面。** npm 文档把设置分成两个版本，可以在文档页面顶部切换：

- **Multiple trusted publishers**：一个包最多可设置 10 个 trusted publisher。
- **Single trusted publisher**：一个包一次只能设置 1 个。

两种界面的默认值、期限以及能否修改都不一样，下面分开说明。请对照你在 npmjs.com 看到的界面，阅读文档对应的那一版。

要填的字段：

- **Organization or user**（必填）：GitHub 用户名或组织名。
- **Repository**（必填）：repo 名称。例如 repo `my-lib` 放在 `octo-org` 下面，这两栏就分别填 `octo-org` 和 `my-lib`。
- **Workflow filename**（必填）：只填文件名，例如 `publish.yml`，不要填完整路径；要包含 `.yml` 或 `.yaml`，而且这个文件必须位于 `.github/workflows/`。若发布拆成两个 workflow，要填“调用方”的文件名，见后面的“特殊情况：发布拆成两个 workflow”。
- **Environment name**（选填）：GitHub 的 environment 是可以加上人工批准等保护规则的部署关卡。用到才填，没用就留空。
- **Allowed actions**：允许这个 publisher 做哪些操作。

**Allowed actions 一定要看。** 它有两个选项：`npm publish` 是直接发布、立即公开；`npm stage publish` 是先把版本送进暂存区，等维护者用 2FA 批准后才公开。

- Multiple 界面：`npm stage publish` 始终允许，`npm publish` 要另外勾选。按文档，2026-09-03 之后新建的设置，**默认只允许 `npm stage publish`**。
- Single 界面：这一栏必填，两项至少勾选一项。

无论哪一种界面，要让步骤 2 示例里的 `npm publish` 成功，**都要勾选 `npm publish`**。只允许 `npm stage publish` 是更严格的做法，留到后面的“进阶”再讲。

**保存前要知道：**

1. 所有字段都区分大小写，必须完全一致。
2. npm 保存时**不会验证**设置。填错不会当场报错，要到真正发布时才会失败。
3. Multiple 界面的已有设置不能修改，填错只能删掉重建；Single 界面则可以随时修改或移除。
4. Multiple 界面的新设置[必须在 2 天内完成第一次成功发布](https://docs.npmjs.com/trusted-publishers)，否则会过期，之后不能再使用或编辑，只能删掉重建。所以建议先看完步骤 2、把 workflow 准备好，再回来保存这张表。

**你会得到：** npm 上的一条 Trusted Publisher 设置，等 workflow 来对。

## 步骤 2：编写 workflow

在 repo 里新建 `.github/workflows/publish.yml`，粘贴下面这份 [npm 官方示例](https://docs.npmjs.com/trusted-publishers)。文件名要和你在 npmjs.com 填写的一致：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false  # never use caching in release builds

      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm publish  # Or: npm stage publish
```

逐行对照：

- `on: push: tags: v*`：只有推送 `v1.2.3` 这类 tag 才会发布。tag（标签）是给某次 commit（提交）标上的名称，常用来标记版本；普通的 commit 不会触发发布。
- `permissions: id-token: write`：最关键的一行，让 GitHub 能为这个 job 签发 OIDC 身份证明。[GitHub 文档](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token)写明，它只允许获取 OIDC token，不会因此给其他资源写入权限。
- `contents: read`：让 job 能读取 repo 内容。[GitHub 文档](https://docs.github.com/en/actions/reference/security/oidc)的示例注明，`actions/checkout` 拉取代码需要这个权限。
- `runs-on: ubuntu-latest`：使用 GitHub 托管的 runner。
- `setup-node` 的 `registry-url` 指向 npm 官方注册表；`package-manager-cache: false` 按官方注释的做法：release 构建不要用缓存。
- 最后依次安装依赖（`npm ci`）、构建、测试，再 `npm publish`。如果你在 Allowed actions 只允许 stage publish，这一行要改用注释里的 `npm stage publish`。

发布这一步**不需要** `NODE_AUTH_TOKEN`，也**不需要**加 `--provenance`：只要是公开 repo、公开包，又是用 Trusted Publishing 发布，npm 会自动生成 provenance。`actions/checkout`、`actions/setup-node` 若出了更新的主版本，以各自 README 为准；本文示例照 npm 官方文档，使用 `@v6`。

**有私有依赖包时**，在 `npm ci` 那一步加上：

{% raw %}
```yaml
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}
```
{% endraw %}

这里的 `NPM_READ_TOKEN` 必须是 **read-only** 的 granular token，只用来安装，不能发布。创建方式：在 npmjs.com 点击头像 → **Access Tokens** → **Generate New Token**，Permissions 选择 **Read-only**（目前不能用 CLI 创建 granular token）。创建后存进 repo 的 secrets，名称和示例一样叫 `NPM_READ_TOKEN`。

**scoped 包第一次公开发布时：** scoped 包是名称以 `@` 开头、类似 `@组织/包` 的包。npm 的《[Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)》写明，scoped 包默认以私有可见性发布，要公开就用 `npm publish --access public`；[provenance 文档](https://docs.npmjs.com/generating-provenance-statements)也提醒，第一次发布时要明确设为公开。

**你会得到：** 一份不必存放发布用 token 的 workflow。

## 步骤 3：跑一次、确认成功

在 repo 推送一个符合 `v*` 的 tag（例如 `v1.2.3`），触发上面的 workflow。

怎么判断成功：

- **看发布结果：** workflow 的 `npm publish` 这一步没有报错，npm 上出现了这个新版本。npm 保存时不验证设置，所以设置对不对，要真的发布一次才知道。
- **看 provenance：** 若同时符合“Trusted Publishing、公开 repo、公开包”三个条件，这个版本会自动附上 provenance。根据《[Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance)》，npmjs.com 包页面 README 右侧的 Version 栏会出现绿色对勾，点开可以看到构建环境、源 commit 等细节。私有 repo 本来就不会生成 provenance，没看到不代表设置失败。
- **不要用 `npm whoami` 确认：** 文档写明，这条命令不是用来检查 trusted publishing 权限的。

发布失败的话，对照后面的“常见错误与处理”。使用 Multiple 界面时记得 2 天期限：过期就只能删掉重建。

**下一步：** 确认成功后，再收回旧 token，顺序不要颠倒。

## 步骤 4：收回旧 token

设好 Trusted Publishing，旧 token 不会自动失效。npm 是在原有的 token 和手动发布之外，**额外**接受 trusted publisher。所以要按文档的 Migration tip（迁移建议）依次收尾：

1. 先设置好 Trusted Publishing，并确认发布成功。
2. 到包的 **Settings → Publishing access**，选择 **Require two-factor authentication and disallow tokens**，再点击 **Update Package Settings**。之后 granular token 一律不能发布这个包；trusted publisher 用的是 OIDC，不受影响。
3. 撤销不再需要的 token：在 npmjs.com 点击头像 → **Access Tokens**，点击该 token 的 **×**，或勾选后点击 **Delete Selected Tokens**；也可以在终端里用 `npm token list` 找出 ID，再执行 `npm token delete <id>`。文档写明，撤销最多可能要一小时才生效。说明见 [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens)。

撤销后，GitHub secrets 里原来用于发布的 `NPM_TOKEN` 也就用不上了，可以一并删除。

**你会得到：** 发布改走 OIDC，旧的长期令牌不再能发布新版本。

## 特殊情况：发布拆成两个 workflow

有些项目会把发布拆成两个 workflow：一个负责调用（调用方），一个真正执行 `npm publish`（被调用方）。被调用的那份要在 `on` 里写 `workflow_call`，别的 workflow 才能调用它；这种写法叫 reusable workflow。

这时有两件事容易填错：

- **两层都要给 `id-token: write`。** npm 文档要求调用方和被调用方都要有。[GitHub 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)也写明，被调用的 workflow 只能降低、不能提高调用方传来的权限；调用方没给，被调用方也拿不到。
- **npmjs.com 要填调用方的文件名。** npm 验证的是调用方 workflow 的文件名，不是真正写着 `npm publish` 的那一份。文档也提到，用 `workflow_dispatch`（从 GitHub 网页手动触发）发布时，也可能出现类似的不匹配。

例如调用方叫 `release.yml`、被调用方叫 `publish.yml`：

```yaml
# .github/workflows/release.yml（调用方）
name: Release
on:
  release:
    types: [published]
permissions:
  contents: read
jobs:
  call-publish:
    permissions:
      contents: read
      id-token: write
    uses: ./.github/workflows/publish.yml
```

```yaml
# .github/workflows/publish.yml（被调用方）
name: Publish Package
on:
  workflow_call:
permissions:
  contents: read
  id-token: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm ci
      - run: npm test
      - run: npm publish
```

这时 npmjs.com 要填 `release.yml`，不是 `publish.yml`。

![拆成两个 workflow 时，两边都要给 id-token: write，npmjs.com 要填调用方的文件名](reusable-workflow.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是调用方 release.yml，右边是被调用方 publish.yml；两边都要给 id-token: write，npmjs.com 要填的是调用方文件名。_

## 进阶：更严格的做法

Trusted Publishing 去掉了长期 token，但 workflow 本身若被攻破，仍然可以发布。想多加关卡，文档建议以下几种，不必一次全做：

- **environment 加人工批准：** 在 GitHub 为发布 job 指定 environment，并设置需要人工批准；npmjs.com 的 **Environment name** 要填同一个名称。
- **tag protection rules：** 限制谁能推送发布用的 tag。
- **只允许 stage publish：** Allowed actions 只保留 `npm stage publish`，workflow 的最后一行也改成 `npm stage publish`。每个版本会先进入暂存区，维护者用 2FA 批准后才公开；批准可以在 npmjs.com 包的 **Staged Packages** 标签页点击 **Approve**，或使用 `npm stage approve <stage-id>`。文档把“trusted publisher 只允许 stage publish”视为更强的组合。这需要 npm CLI 11.15.0 及以上，细节见 [Staged publishing](https://docs.npmjs.com/staged-publishing)。
- **定期检查：** 定期审计包的 trusted publisher 设置，删除不再使用的发布 token。

这几道关卡怎么一步步设置，以及为什么带着 provenance 的版本仍可能是恶意的，见续篇[开了 Trusted Publishing 还不够：npm 发布流程也要上锁](/posts/npm-release-pipeline-lockdown/)。

## 限制

![设置 Trusted Publishing 的六项清单，以及四个要先了解的限制](checklist.zh-CN.webp){: w="1600" h="900" }
_概念图：左边把本文步骤 0 到步骤 4 整理成六项清单，右边是四个最常遇到的限制：self-hosted runner、私有 repo 没有 provenance、私有依赖仍要 token，以及 publisher 数量取决于界面。清单里的 2 天期限只适用于 Multiple 界面；完整的限制见下方。_

> 使用前请先看这些限制：
>
> - 目前不支持 self-hosted runner。
> - Trusted Publishing 挡不住 workflow 注入：workflow 若已被注入恶意命令，它照样可以发布。
> - provenance 只在“Trusted Publishing、公开 repo、公开包”同时成立时自动生成。[文档写明](https://docs.npmjs.com/trusted-publishers)，私有 repo 不会生成 provenance，即使发布的是公开包也一样；CircleCI 目前也不生成。
> - provenance 让人查证“这个版本从哪里构建出来”，[“并不保证包里没有恶意代码”](https://docs.npmjs.com/generating-provenance-statements)。
> - 安装私有依赖包仍需要 read-only token。
> - 可设置的 publisher 数量取决于界面：Multiple 界面最多 10 个，Single 界面一次只能 1 个。
> - Multiple 界面的已有设置不能修改，只能删掉重建。
{: .prompt-warning }

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 第一次设置 | 先核对版本与 `repository.url`；在 npmjs.com 新增 GitHub Actions publisher 并勾选 `npm publish`；写好带 `id-token: write` 的 workflow；Multiple 界面要在 2 天内完成第一次发布 |
| 确认设置成功 | 实际发布一次；npm 保存时不验证，`npm whoami` 也不能用来确认 |
| 发布出现 ENEEDAUTH | 核对 workflow 文件名（含扩展名）、大小写、GitHub 托管 runner，以及 `id-token: write` |
| 设置填错要改 | Multiple 界面：删掉重建；Single 界面：直接修改 |
| 设置过期了 | 删掉重建，再于 2 天内完成发布 |
| 使用 Node 22 | 发布前先把 npm 升级到 11.5.1 以上，或改用 Node 24 |
| 有私有依赖 | `npm ci` 加上 read-only 的 `NODE_AUTH_TOKEN` |
| workflow 拆成两层 | 两层都给 `id-token: write`；npmjs.com 填调用方文件名 |
| 使用 self-hosted runner | 目前不支持，还不能改用 Trusted Publishing |
| 想让每个版本都要人批准 | environment 加批准，或 Allowed actions 只留 `npm stage publish` |
| 设好之后还有旧 token | 先确认发布成功，再改 Publishing access，最后撤销 token |

## 常见错误与处理

照做时最容易卡住的地方，以及怎么处理：

- **出现 `ENEEDAUTH` 或“Unable to authenticate”：** 核对 npmjs.com 上的 workflow 文件名（要含 `.yml` 或 `.yaml`）和所有字段的大小写；确认用的是 GitHub 托管 runner；确认 workflow 有 `id-token: write`。
- **`repository.url` 对不上：** `package.json` 的 `repository.url` 要和 GitHub repo 完全一致。从 fork 来的项目要特别检查。
- **Allowed actions 没有勾选 `npm publish`：** 2026-09-03 之后在 Multiple 界面新建的设置，默认只允许 stage publish。这种界面的已有设置不能改，要删掉重建、勾选 `npm publish`，再于 2 天内发布。
- **设置过期：** Multiple 界面的新设置若 2 天内没有成功发布，就会过期。删掉重建，再于 2 天内发布。
- **用了 `workflow_call`，却填了被调用方的文件名：** 改填调用方的文件名，并确认两层都有 `id-token: write`。
- **用 Node 22，却没升级 npm：** Node 22 内置 npm 10.x，不到 11.5.1。发布前先升级 npm，或改用 Node 24。
- **私有依赖安装失败：** `npm ci` 需要 read-only token；Trusted Publishing 不负责安装。
- **以为没有 provenance 就是失败：** 私有 repo 本来就不会生成 provenance。
- **用 `npm whoami` 检查：** 文档写明，这条命令不是用来检查 trusted publishing 权限的。
- **以为设好就让旧 token 失效：** 还要改 Publishing access，并撤销不再使用的 token。

## 结论与下一步

把 GitHub Actions 的发布从“放一把长期钥匙”改成“每次当场换短期凭证”之后，记得收回旧 token，必要时再加上批准或 stage publish。用户那一端还能怎么降低风险，请看[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)；若要给这些 workflow 加自动化审查，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)。

官方说明以 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 为准，并可参阅 [provenance](https://docs.npmjs.com/generating-provenance-statements)、[about access tokens](https://docs.npmjs.com/about-access-tokens)、[staged publishing](https://docs.npmjs.com/staged-publishing)，以及 [GitHub 的 OIDC 说明](https://docs.github.com/en/actions/concepts/security/openid-connect)。本站其他安全文章，也可看 [OpenSSH 密码验证绕过漏洞 CVE-2026-123158：Alpine 怎么修补](/posts/openssh-musl-password-bypass-alpine/)。
