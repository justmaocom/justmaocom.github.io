---
title: "发布 npm 包不再放长期 token：Trusted Publishing 设置教程"
description: "在 GitHub Actions 用 Trusted Publishing 发布 npm 包，不必放长期 token。这篇文章教你怎么设置，以及设好后怎么收回旧权杖。"
date: 2026-11-11 13:00:00 +0800
categories: [信息安全]
tags: [supply-chain-security, github-actions, ci, application-security]
media_subpath: /assets/img/posts/npm-trusted-publishing-github-actions/
image:
  path: cover.zh-CN.webp
  alt: "用 Trusted Publishing 在 GitHub Actions 发 npm 包，不必再放长期 token。"
---

如果我在 GitHub Actions 的 secrets（存放密码类配置的地方）放了一个 `NPM_TOKEN` 来自动发布，那是一把撤销前一直有效的钥匙。token（权杖）是一串代替账号密码的通行码，谁拿到就能用你的身份做它允许的事；长期 token（long-lived token）则是在撤销或到期前一直有效。泄露之后，别人就能冒名发新版本。

这件事从使用者那边看过：[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/zh-CN/posts/coding-agent-supply-chain-permission-risks/) 里的 Nx 案例，攻击者就是通过 GitHub Actions 的注入漏洞取得 npm 发布权杖。本文改从**发布者**这端减少“长期 token 放在 CI”这个风险。它不能挡住那类事件本身：若 workflow 已被注入，Trusted Publishing 仍然可以发布。也因此，后面会提到用 environment 批准，或改用 stage publish，让每个版本多一道人工把关。

CI／CD 是代码一推上去就自动跑测试、打包、发布的流程。GitHub Actions 是 GitHub 内置的自动化，workflow 则是放在 `.github/workflows/` 里的一份 YAML 配置文件；实际执行它的机器叫 runner。本文只展开 GitHub 托管的 runner，搭配 npmjs.com 的设置。若你想看怎么给 workflow 加上自动化审查，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)。

> **版本说明**：本文依据 2026-11-11 读取的 npm 官方文档《[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)》撰写；npm 这半年持续调整这项功能（例如允许的动作、staged publishing），设置界面与默认值以官方文档为准。
{: .prompt-info }

## Trusted Publishing 是什么、怎么运作

[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) 让你在 CI 里发布 npm 包时，不必再存放长期 npm token。每次发布，GitHub Actions 用 OIDC（OpenID Connect，一套“出示身份证明”的标准）开出一张短期身份证明（JWT），写明这是哪个 repo、哪个 workflow；npm 核对你事先填好的设置相符后，才换发一张只在这次 job 有效、用完就失效的短期凭证。文档的原句是：each publish uses short-lived, cryptographically-signed tokens that are specific to your workflow and cannot be extracted or reused。翻译：每次发布都使用针对这个 workflow、经过加密签署的短期凭证，无法取出，也不能重复使用。

流程可以想成四步：

1. GitHub Actions 开始运行，且这个 job 有 `id-token: write`，跑在 GitHub 托管的 runner 上。
2. GitHub 发出 OIDC 身份证明，写明 repo 与 workflow。
3. npm 核对组织或用户名、repo、workflow 文件名都相符，才换发短期凭证。
4. 执行 `npm publish`。若是公开 repo 加上公开包，还会自动附上 provenance（来源证明，公开记录这个版本是从哪个 repo、哪个 workflow 构建出来的）。

npm CLI 会先自动检测 OIDC 环境并用它来验证，再退回使用传统 token。也就是说，设好之后，旧的 token 暂时还能发布，后面要另外收回。

![GitHub Actions 用 OIDC 向 npm 换一次性的短期凭证来发布，不必存放 npm token](flow.zh-CN.webp){: w="1600" h="900" }
_概念图：GitHub Actions 先出示身份证明，npm 核对设置后才换发这次发布用的短期凭证。公开 repo 加上公开包时，会自动附上 provenance。发布这一步不需要 npm token；安装私有依赖包仍要 read-only token。_

## 什么时候该用、什么时候还不行

现在换还有时间上的理由。[npm 文档写明](https://docs.npmjs.com/about-access-tokens)：旧式（legacy）token 已于 2025 年 11 月移除；用 granular token 直接发布新版本的能力，将于 2027 年 1 月移除。

适合用在：以 GitHub Actions（GitHub 托管的 runner）自动发布的包。官方同样支持 GitLab.com 的 shared runner 与 CircleCI cloud，设置方式见[同一份文档](https://docs.npmjs.com/trusted-publishers)；本文不展开这两种平台。

目前还不行的情况：self-hosted runner（自己搭建的执行机器）。[文档写明](https://docs.npmjs.com/trusted-publishers)：目前不支持，未来计划会支持。其他未列出的 CI 平台也还不能用这个方法。

它也不解决这些事：安装私有依赖包（仍要 read-only token，也就是只能读、不能发布的细粒度权杖）；`npm install`、`view`、`access` 等其他命令，仍需传统验证方式。

## 步骤 0：先准备这些

开始之前，请确认：

- npm CLI 11.5.1 或更新，Node.js 22.14.0 或更新。[官方文档的版本要求](https://docs.npmjs.com/trusted-publishers)就是这两行。官方示例用 Node 24；Node 22 内附的 npm 是 10.x，不到 11.5.1。若你一定要用 Node 22，请在发布前先升级 npm，例如加一步 `npm install -g npm@latest`。
- `package.json` 的 `repository.url` 必须和 GitHub repo **完全一致**。从 fork 来的项目若没改这个字段，发布会失败。
- 你要有这个包的发布权限，而且账号已开启 2FA（两步验证）。更改包设置需要 2FA。
- 包已经存在于 npm。官方文档的设置入口在已有包的 Settings 页；文档没有另写“全新包”的流程。

**你会得到：** 一份对得上 GitHub repo、版本也够新的项目，可以开始填表。

## 步骤 1：在 npmjs.com 新增 Trusted Publisher

到 [npmjs.com](https://www.npmjs.com) 打开你的包，进入 **Settings**，找到 **Trusted Publisher**，在 **Select your publisher** 选择 **GitHub Actions**。路径也可以记成：Packages → 你的包 → Settings → Trusted publishing。

要填的字段是：

- **Organization or user**（必填）：GitHub 用户名或组织名
- **Repository**（必填）：repo 名称
- **Workflow filename**（必填）：只填文件名，例如 `publish.yml`，要包含 `.yml` 或 `.yaml`，而且这个文件必须位于 `.github/workflows/`
- **Environment name**（选填）：若你用 GitHub environment 做部署保护，才填
- **Allowed actions**：允许这个 publisher 做哪些事

Allowed actions 要特别看一眼。按文档，2026-09-03 之后新建的设置，在可配置多个 publisher 的界面上，**默认只允许 `npm stage publish`**。若你要让稍后示例里的 `npm publish` 成功，**请勾选允许 `npm publish`**。若账号看到的是一次只能设置一个 publisher 的界面，则至少要勾一项。另一种更严的做法是只允许 `npm stage publish`，留给后面的进阶节。

另外，依你账号看到的界面，可能可以设置多个 trusted publisher（最多 10 个），也可能一次只能设置一个。“最多 10 个”只出现在 Multiple trusted publishers 的文档说明里。

所有字段大小写都要完全一致。npm 在你保存时**不会验证**这些设置，填错要到真正发布时才会报错。若你看到的是可配置多个 publisher 的界面，[新设置必须在 2 天内完成第一次成功发布](https://docs.npmjs.com/trusted-publishers)，否则会过期，不能再使用或编辑，只能删掉重建。填完表，就去跑一次发布。

**你会得到：** npm 上的一条 Trusted Publisher 设置，等 workflow 来对。

## 步骤 2：编写 workflow

下面这份是 [npm 官方示例](https://docs.npmjs.com/trusted-publishers)，可直接复制到 `.github/workflows/publish.yml`（文件名请和你在 npmjs.com 填写的一致）：

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

- `on: push: tags: v*`：只有推上 `v1.2.3` 这种 tag 才会发布，避免每次 commit 都上架。
- `permissions: id-token: write`：最关键。这是让 GitHub 的 OIDC 提供者开出那张身份证明。[GitHub 文档](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token)写明：它只允许请求 OIDC token，不会因此给其他资源写入权限。
- `contents: read`：让这个 job 能读取 repo 内容。
- `runs-on: ubuntu-latest`：使用 GitHub 托管的 runner。
- `setup-node` 的 `registry-url` 指向 npm 官方注册表；`package-manager-cache: false` 是官方注释里的做法：release 构建不要用缓存。
- 接着安装依赖、构建、测试，最后 `npm publish`。

这份流程**不需要** `NODE_AUTH_TOKEN`，也**不需要**加 `--provenance`。公开 repo、公开包、而且是用 Trusted Publishing 发布时，npm 会自动生成 provenance。`actions/checkout`、`actions/setup-node` 若有更新的主版本，以各自 README 为准；本文示例照 npm 官方文档，使用 `@v6`。

若包有私有依赖，在 `npm ci` 那一步加上：

{% raw %}
```yaml
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}
```
{% endraw %}

这里要用 **read-only** 的 granular access token（细粒度 token，可限制包、权限和到期日）。第一次把 scoped 包（名称类似 `@组织/包`）以公开方式发布时，还需要 `--access public`，否则可能以受限权限上架。

**你会得到：** 一份不必存放 `NPM_TOKEN` 的发布 workflow。

## 步骤 3：跑一次、确认成功

在 repo 推一个符合 `v*` 的 tag，触发上面的 workflow。成功之后，若符合“Trusted Publishing、公开 repo、公开包”这三个条件，包的页面会显示 provenance 信息。这是文档描述你应该看到的结果，用来确认设置已生效。

**下一步：** 确认成功后，再收回旧 token，不要颠倒顺序。

## 使用 workflow_call 时

有些项目会把发布拆成两个 workflow：一个负责调用，一个真正执行 `npm publish`。被调用的那份要在 `on` 里写 `workflow_call`（让别的 workflow 可以调用它），这种写法叫 reusable workflow。

这时有两件容易填错的事：

- **两层都要**给 `id-token: write`，调用方和被调用方缺一不可。
- npm 验证的是**调用方** workflow 的文件名，不是真正写着 `npm publish` 的那一份。所以 npmjs.com 的 Workflow filename 要填调用方的文件名。文档提到，用 `workflow_dispatch` 手动触发时，也会有类似情况。

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

## 步骤 4：收回旧 token

Trusted Publishing 是“额外”接受的验证方式，传统 token 和手动发布都还在。所以要按文档的 Migration tip，按这个顺序收尾：

1. 先设置好 Trusted Publishing，并确认一次发布成功。
2. 到包的 **Settings → Publishing access**，选择 **Require two-factor authentication and disallow tokens**，再点击 **Update Package Settings**。这个选项只挡住传统 token，不会影响已设置的 trusted publisher。
3. 最后撤销不再需要的 token：点击头像 → **Access Tokens** → 删除；或在终端里用 `npm token list`，再 `npm token delete <id>`。文档写明，撤销最多可能延迟一小时才完全生效。说明见 [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens)。

**你会得到：** 发布改走 OIDC，旧的长期权杖不再能发新版本。

## 进阶：更严格的做法

若还想多加关卡，文档建议这几种，不必一次全做：

- 在 GitHub 为发布 job 指定 environment，并加上人工批准；npmjs.com 的 **Environment name** 也要填同一个名称。
- 使用 tag protection rules，限制谁能推送发布用的 tag。
- 在 Allowed actions 只允许 `npm stage publish`，让每个版本先进入暂存区，再由维护者用 2FA 批准才上架。文档把“trusted publisher 只允许 stage publish”称为较强的组合。这需要 npm CLI 11.15.0 或更新，细节见 [Staged publishing](https://docs.npmjs.com/staged-publishing)。

## 限制

![设置 Trusted Publishing 的六个步骤，以及四个要先了解的限制](checklist.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是设置的六个步骤，右边是四个要先了解的限制，包括 self-hosted runner、provenance 的条件、私有依赖，以及 publisher 数量依界面而不同。_

> 使用前请先看这些限制：
>
> - 目前不支持 self-hosted runner。
> - [文档原文](https://docs.npmjs.com/generating-provenance-statements)：Provenance generation is not supported for private repositories, even when publishing public packages. 翻译：私有 repo 不会生成 provenance，即使发布的是公开包也一样。CircleCI 目前也不生成 provenance。
> - provenance 让人查证“这个版本从哪里构建出来”，[“并不保证包里没有恶意程序”](https://docs.npmjs.com/generating-provenance-statements)。
> - 安装私有依赖仍需要 read-only token。
> - 可设置的 publisher 数量依界面而定：有的最多 10 个，有的一次只能一个。
> - 在可配置多个 publisher 的界面，已有设置不能修改，只能删掉重建。
{: .prompt-warning }

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 第一次设置 | 先核对版本与 `repository.url`，在 npmjs.com 新增 GitHub Actions publisher，勾选 `npm publish`，写好带 `id-token: write` 的 workflow，然后在 2 天内完成第一次发布 |
| 发布出现 ENEEDAUTH | 核对 workflow 文件名（含扩展名）、大小写、GitHub 托管 runner，以及 `id-token: write` |
| 使用 Node 22 | 发布前先把 npm 升级到 11.5.1 以上，或改用 Node 24 |
| 有私有依赖 | `npm ci` 加上 read-only 的 `NODE_AUTH_TOKEN` |
| workflow 拆成两层 | 两层都给 `id-token: write`；npmjs.com 填调用方文件名 |
| 使用 self-hosted runner | 目前不要使用 Trusted Publishing |
| 想让每个版本都要人批准 | environment 加批准，或 Allowed actions 只留 `npm stage publish` |
| 设好之后还有旧 token | 先确认发布成功，再改 Publishing access，最后撤销 token |

## 常见错误

- 出现 `ENEEDAUTH`、“Unable to authenticate”：先核对 workflow 文件名（要含 `.yml` 或 `.yaml`）、所有字段大小写、是否使用 GitHub 托管 runner，以及有没有 `id-token: write`。
- `package.json` 的 `repository.url` 和实际 GitHub repo 不一致。
- Allowed actions 没有勾选 `npm publish`，尤其是 2026-09-03 之后新建、默认只允许 stage publish 的设置。
- 可配置多个 publisher 的界面上，超过 2 天没有完成第一次成功发布，设置已过期。
- 使用 `workflow_call` 时，把 npmjs.com 的文件名填成被调用方。
- 只升级 Node 22，却沿用内置的 npm 10.x。
- 以为执行 `npm whoami` 可以确认 Trusted Publishing 有没有生效。文档写明：这条命令不是用来检查 trusted publishing 权限的。
- 设好就以为旧 token 立刻失效。其实要改 Publishing access，并撤销不再使用的 token。

## 结论与下一步

把 GitHub Actions 的发布从“放一把长期钥匙”改成“每次当场换短期凭证”之后，记得收回旧 token，必要时再加上批准或 stage publish。使用者那一端还能怎么降低风险，请看[装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/zh-CN/posts/coding-agent-supply-chain-permission-risks/)；若要给这些 workflow 加自动化审查，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)。

官方说明以 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 为准，并可参阅 [provenance](https://docs.npmjs.com/generating-provenance-statements)、[about access tokens](https://docs.npmjs.com/about-access-tokens)、[staged publishing](https://docs.npmjs.com/staged-publishing)，以及 [GitHub 的 OIDC 说明](https://docs.github.com/en/actions/concepts/security/openid-connect)。本站其他安全设置，也可看 [OpenSSH 密码验证绕过漏洞：哪些主机受影响，Alpine 用户怎么修补？](/zh-CN/posts/openssh-musl-password-bypass-alpine/)。
