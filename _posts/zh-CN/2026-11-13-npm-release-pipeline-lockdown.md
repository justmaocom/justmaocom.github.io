---
title: "开了 Trusted Publishing 还不够：npm 发布流程也要上锁"
description: "tensorlake 的恶意版本带着合法的 provenance。本文用 GitHub environment、ruleset 和 npm staged publishing 给发布流程上锁，让攻击者推得进 repo 也发不出新版本。"
date: 2026-11-13 20:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.zh-CN.webp
  alt: "在 npm 发布流程的四个环节各加一道锁：改代码、推 tag、发布 job、npm 公开。"
---

先说结论：Trusted Publishing 解决的是“CI 里放着一把长期 token”，但它不检查你要发布的内容。攻击者只要推得进你的 repo，就能让你自己的 workflow 替他发布，发出去的版本照样带着合法的来源证明。要挡住这种情况，得给发布流程本身加上关卡：发布前要有人批准、限制谁能推发布用的 tag 和改 workflow，最后在 npm 改成“先暂存，再由人用 2FA 批准”。

本文是[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)的续篇。OIDC、`id-token: write` 这些设置不再重讲；还没设好 Trusted Publishing，请先看那篇。

先认识几个词：

- **provenance（来源证明）**：npm 公开记录某个版本是从哪个 repo、哪个 workflow 构建出来的。
- **tag（标签）**：给某个 commit（提交）起的名字，常用来标记版本，例如 `v1.2.3`。上一篇的示例 workflow 就是推上 `v*` tag 才发布。
- **GitHub environment**：GitHub Actions 的部署关卡。job 指定了某个 environment，就要先通过它的规则（例如等人批准）才会开始运行。
- **ruleset（规则集）**：GitHub repo 的规则，可以限制谁能推送、创建或删除特定的分支或 tag。
- **staged publishing（暂存发布）**：npm 的发布方式。新版本先进暂存区，维护者用 2FA 批准后才公开。
- **2FA（两步验证）**：除了密码，还要再输入一组验证码。

> **版本说明**：本文依据 2026-11-13 读取的官方文档撰写，包括 GitHub 的《[Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)》《[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)》《[Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)》，以及 npm 的《[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)》《[Staged publishing](https://docs.npmjs.com/staged-publishing)》。两边的设置界面、套餐限制和默认值都还在调整，以官方文档为准。
{: .prompt-info }

## 真实案例：来源证明是真的，内容却是恶意的

2026 年 10 月 8 日，npm 包 `tensorlake` 被发布了一个恶意版本 0.5.144。根据 [tensorlake 官方安全公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 攻击者用一个被盗的维护者账号，把恶意代码直接推进 repo。
- 接着通过项目**自己的 release workflow** 发布，所以这个版本带着合法的 npm provenance。
- 恶意程序在安装时执行，收集电脑里的 GitHub、npm、云服务等各种凭证，再用偷来的 token 把自己发布到受害者有权限的其他包和 repo。
- 这个版本在 npm 上停留了约 1 小时 40 分钟（UTC 01:12 到 02:54）。

第二点最值得注意。从 npm 的角度看，这次发布和平时没有区别：来自正确的 repo、正确的 workflow。就算用的是 Trusted Publishing 也一样会通过，因为它核对的正是这两件事。上一篇提过，Trusted Publishing 挡不住“workflow 本身被利用”的情况，tensorlake 就是实际的例子。

## provenance 证明什么、不证明什么

打个比方：provenance 像包裹上的发货单，证明“这箱货是从这家工厂、这条产线出来的”。它不会告诉你，产线上有没有人偷偷换了零件。

npm 的 [provenance 文档](https://docs.npmjs.com/generating-provenance-statements)写得很直接：有 provenance，“并不保证包里没有恶意代码”。它提供的是一条可以查证的链接，让人回头找到源代码和构建指令，再自己判断要不要信任。

![provenance 像发货单：能证明从哪个 repo、哪个 workflow 构建出来，不能证明内容安全](provenance.zh-CN.webp){: w="1600" h="900" }
_概念图：左边是 provenance 能回答的问题，右边是它回答不了的问题。tensorlake 0.5.144 的发货单完全正确，问题出在产线上被放进了恶意代码。_

所以，要挡住 tensorlake 这类事件，得在两个地方加上人工把关：代码进入发布流程之前，以及版本公开之前。

## 攻击者要过四道门

想一想，攻击者要通过你的 workflow 发出恶意版本，得一路做到这四件事：

1. 把恶意代码（或改过的 workflow）放进 repo。
2. 触发发布，例如推一个 `v*` tag。
3. 让发布 job 运行完。
4. 让 npm 把版本公开。

每一道门都可以加一把锁：

| 攻击者要做的事 | 对应的锁 | 在哪里设置 | 本文步骤 |
| --- | --- | --- | --- |
| 把代码或 workflow 放进 repo | 分支规则：必须开 PR、由 code owner 审查 | GitHub | 步骤 2 |
| 推发布用的 tag | tag 规则：只有指定的人能创建 `v*` tag | GitHub | 步骤 2 |
| 让发布 job 运行完 | environment：要有人批准才开始运行 | GitHub | 步骤 1 |
| 让版本公开 | 只允许 stage publish：维护者用 2FA 批准 | npmjs.com | 步骤 4 |

另外，发布 job 用到的第三方 action（别人写好、在 workflow 里用 `uses:` 引用的步骤）也可以锁定版本，见步骤 3。

![发布流程的四道门，以及各自对应的锁](locks.zh-CN.webp){: w="1600" h="900" }
_概念图：从改代码、推 tag、运行发布 job 到 npm 公开，每一道门各有一把锁。前三把设在 GitHub，最后一把设在 npm，用的是另一个账号的 2FA。_

不必一次全做。文末的“什么情况怎么做”会根据你的情况建议从哪一步开始。

## 步骤 1：把发布 job 放进 environment，设置必要审核者

目的：发布 job 开始运行之前，一定要有人按下批准。

**先确认套餐。** 根据 [GitHub 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)，Free、Pro、Team 套餐的必要审核者（required reviewers）只能用在**公开 repo**。npm 上的开源包大多放在公开 repo，通常没有问题；私有 repo 请先确认你的套餐能不能用。

**创建 environment**（需要 repo 的管理权限）：

1. 打开 repo，点 **Settings**。
2. 左侧选 **Environments**，点 **New environment**。
3. 名称填 `npm-publish`（本文示例都用这个名字），点 **Configure environment**。
4. 勾选 **Required reviewers**，加入可以批准的人或团队。最多 6 个，其中任何一人批准就会放行。
5. 视情况勾选 **Prevent self-review**：开启后，触发这次发布的人不能自己批准，一定要第二个人看过。**只有一位维护者时不要开**，否则没有人能批准。
6. 取消勾选 **Allow administrators to bypass configured protection rules**。根据文档，这个选项默认开启，意味着管理员可以跳过批准直接部署。
7. **Deployment branches and tags** 选 **Selected branches and tags**，Ref type 选 **Tag**，填 `v*`，点 **Add rule**。这样只有 `v*` tag 触发的运行能进入这个 environment。
8. 点 **Save protection rules** 保存。

**改 workflow。** 以上一篇的 `publish.yml` 为例，在发布 job 加上一行 `environment`：

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish  # 新增：要先通过这个 environment 的规则
    steps:
      # ……其余步骤不变
```

**npm 那边也要填。** 回到 npmjs.com 包的 Trusted Publisher 设置，**Environment name** 填同一个名称 `npm-publish`。[npm 文档](https://docs.npmjs.com/trusted-publishers)把这一栏写给“用 GitHub environments 做部署保护”的情况。Multiple 界面的已有设置不能修改，要删掉重建，细节见上一篇的步骤 1。

**运行起来会怎样。** 推上 `v*` tag 后，发布 job 会停下来等待批准。批准的人打开这次 workflow 的运行页面，点 **Review deployments**，勾选 environment，再点 **Approve and deploy**，job 才会开始运行；点 **Reject** 则这次运行失败。

**你会得到：** 每次发布前都要有人按下批准的发布 job。攻击者就算推得进 repo，workflow 也不会自动把版本发出去。

> 只有一位维护者时要知道：如果被盗的正是你的 GitHub 账号，批准按钮也是攻击者在按。这种情况要靠步骤 4：npm 那一关用的是 npm 账号的 2FA，和 GitHub 账号是两把不同的钥匙。
{: .prompt-tip }

## 步骤 2：限制谁能推 tag、谁能改 workflow

步骤 1 有一个漏洞：能改 workflow 的人，可以把 `environment` 那一行删掉，或改成别的名字。[GitHub 文档](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)写，workflow 引用一个不存在的 environment 时，GitHub 会自动创建同名的 environment，而新建的 environment 没有任何保护规则。所以 workflow 本身也要锁住。

### 2-1：只让负责发版的人创建 `v*` tag

npm 文档建议用 tag 保护规则，控制谁能创建发布用的 tag。在 GitHub，用以 tag 为目标的 ruleset 来做：

1. repo 的 **Settings** → 左侧 **Rules** 下面的 **Rulesets** → **New ruleset** → **New tag ruleset**。
2. **Ruleset name** 填 `release-tags`，Enforcement status 选 **Active**。
3. **Bypass list** 点 **Add bypass**，只加入真正负责发版的人或团队。
4. **Target tags** 点 **Add a target**，加入 `v*` 这个模式。
5. 勾选 **Restrict creations**、**Restrict updates**、**Restrict deletions**（最后一项默认已勾选）。
6. 点 **Create**。

根据[规则说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)，这三条规则开启后，只有 Bypass list 里的人能创建、移动或删除 `v*` tag。

### 2-2：改 workflow 要经过审查

先在 repo 加一个 `.github/CODEOWNERS` 文件，指定谁负责 `.github/` 文件夹（workflow 和 CODEOWNERS 本身都在里面）：

```text
/.github/ @your-github-name
```

`@your-github-name` 换成你的 GitHub 账号或团队。[GitHub 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)要求 code owner 对 repo 有写入权限，并建议把 CODEOWNERS 文件本身也纳入保护。

接着给默认分支（通常是 `main`）建一个 branch ruleset：**New ruleset** → **New branch ruleset**，Target branches 选默认分支，然后勾选：

- **Require a pull request before merging**：所有改动都要开 PR，不能直接推进分支。tensorlake 的攻击者就是把代码直接推进 repo。
  - 下面勾选 **Require review from Code Owners**：改到 `.github/` 的 PR，要 code owner 批准才能合并。
  - 下面勾选 **Require approval of the most recent reviewable push**：批准之后如果又有人推了新的 commit，要由“最后推送者以外的人”再批准一次。
- **Block force pushes**：禁止强制推送改写历史（默认已勾选）。

Bypass list 同样只放必要的人，最好留空。

**你会得到：** 推得进 repo 的人，不一定能推发布用的 tag；想改 workflow 删掉 environment，也要先经过 code owner 审查。

> 只有一位维护者时，没有第二个人能审 PR，branch ruleset 的效果有限。这时重点放在 2-1 的 tag 规则，以及步骤 4。
{: .prompt-tip }

## 步骤 3：锁定 workflow 用到的 action

发布 job 里的 `actions/checkout@v6`，`v6` 也是一个 tag。action 的作者（或盗用作者账号的人）可以把同一个 tag 指向别的代码，你的 workflow 下次运行就会跑到新的内容。

GitHub 在 2026-10-28 正式推出 workflow lockfile（[changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)），Free、Team、Enterprise Cloud 套餐都能使用。它会把每个 action 当下对应的 commit 记在 `.github/workflows/actions.lock`。之后就算 tag 被移动，workflow 也照样运行你锁定的那一版：

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

执行后先看一下 diff 再提交。Dependabot 给这个 workflow 开版本更新的 PR 时，会在同一个 PR 里一起更新 lockfile。完整操作见 [GitHub 文档](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)，本文不展开。

**你会得到：** 发布 job 用到的每个 action，都固定在你审过的那一版。

## 步骤 4：npm 只允许 stage publish，最后一关用 2FA 批准

这是最后、也最重要的一道锁：就算前面三道都被突破，版本也只会进暂存区，要维护者在 npm 用 2FA 批准才会公开。

这也是 npm 自己指的方向。根据 [GitHub changelog](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)，能“绕过 2FA”的 granular token，预计约 2027 年 1 月起不能再直接发布，只能读取私有包和提交暂存发布；npm 建议把自动发布改成 Trusted Publishing，或“需要人工批准的 staged publishing”。

**为什么这一关特别有用：**

- [npm 文档](https://docs.npmjs.com/trusted-publishers)写，`npm stage list`、`view`、`approve`、`reject` 这些命令需要交互式验证，**不能用 OIDC token**。也就是说，CI 能把版本送进暂存区，却没办法自己批准。
- [Staged publishing 文档](https://docs.npmjs.com/staged-publishing)写，不论在 CLI 还是 npmjs.com 批准，都会要求 2FA 验证。
- 批准用的是 npm 账号，不是 GitHub 账号。GitHub 账号被盗，攻击者还是缺 npm 这把钥匙。

![CI 只能把版本送进暂存区，公开前要维护者用 npm 的 2FA 批准](stage-approve.zh-CN.webp){: w="1600" h="900" }
_概念图：CI 用 OIDC 执行 npm stage publish，版本进入暂存区；批准要由维护者登录 npm、通过 2FA，CI 的 OIDC token 做不到这一步。_

**设置：**

1. **npmjs.com**：包的 **Settings** → Trusted Publisher，**Allowed actions** 只留 `npm stage publish`，**不要勾** `npm publish`。根据文档，2026-09-03 之后新建的设置，默认就是只允许 `npm stage publish`。Multiple 界面的已有设置不能改，要删掉重建。
2. **workflow**：最后一行从 `npm publish` 改成 `npm stage publish`。这需要 npm CLI 11.15.0 以上、Node.js 22.14.0 以上。
3. **收回 token**：包的 **Settings** → **Publishing access**，选 **Require two-factor authentication and disallow tokens**，让旧 token 也发不了。上一篇的步骤 4 做过的话可以跳过。

三个步骤都做完后，`publish.yml` 会是这样：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish      # 步骤 1：要有人批准才开始运行
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm stage publish    # 步骤 4：只送进暂存区
```

**批准：** workflow 运行完后，版本会停在暂存区。到 npmjs.com 的账号设置打开 **Staged Packages** 标签页，确认内容后点 **Approve**，输入 2FA 验证码。也可以在自己的电脑上用 CLI：

```bash
npm stage list <包名>           # 列出等待批准的版本
npm stage view <stage-id>       # 查看这个版本的信息
npm stage download <stage-id>   # 下载回来检查内容
npm stage approve <stage-id>    # 批准，会要求 2FA
```

根据文档，第一次用暂存方式发布的新包，npm 会先放一个公开的占位版本 `0.0.0-stage`；一次批准多个版本的批量功能还在逐步开放，你的账号不一定能看到。

**你会得到：** CI 只能把版本送进暂存区。要公开，一定要有人登录 npm、通过 2FA 按下批准。

## 什么情况怎么做

| 我的情况 | 建议 |
| --- | --- |
| 只有我一个维护者 | 先做步骤 4，再做 2-1；步骤 1 可以做，但不要开 Prevent self-review |
| 有两位以上维护者 | 步骤 1 开 Prevent self-review，加上步骤 2 和步骤 4 |
| 包放在私有 repo | Free、Pro、Team 套餐不能用 required reviewers；先做步骤 4，其他功能按套餐确认 |
| 发版很频繁，嫌每次都要批准 | 至少保留步骤 4；批准前用 `npm stage view` 看一眼就好 |
| 只想先做一件 | 步骤 4：它不依赖 GitHub 账号，CI 也绕不过 |
| 还在用 `NPM_TOKEN` 发布 | 先按[上一篇](/posts/npm-trusted-publishing-github-actions/)改成 Trusted Publishing，再回来看本文 |

## 常见错误与处理

- **发布 job 一直停着不动：** 它在等 environment 批准。到 workflow 的运行页面点 **Review deployments**。
- **workflow 改成 `npm stage publish`，却还勾着 `npm publish`：** 攻击者把最后一行改回 `npm publish` 就能直接发布。Allowed actions 要取消勾选 `npm publish`。
- **忘了取消 Allow administrators to bypass：** 管理员账号（包括被盗的管理员账号）可以跳过批准直接部署。
- **environment 名称写错：** GitHub 会自动建一个同名、但没有任何保护规则的新 environment，job 会直接开始运行。到 Settings → Environments 看看有没有多出陌生的 environment。
- **没限制 Deployment branches and tags：** 任何分支触发的运行都能进入这个 environment。改成只允许 `v*` tag。
- **只有一位维护者却开了 Prevent self-review：** 没有人能批准。只有一人时不要开。
- **`npm stage publish` 失败：** 确认 npm CLI 是 11.15.0 以上。
- **Bypass list 加得太宽：** 在 Bypass list 里的人可以绕过规则。只放真正需要的人。
- **以为有 provenance 就代表安全：** provenance 只说明版本从哪里构建出来，不说明内容安全。

## 限制

> 使用前请先了解这些限制：
>
> - 这些关卡挡的是“推得进 repo，就能自动发版”。批准的人如果不看就按，关卡等于没有；批准前至少看一下这次包含哪些 commit。
> - 只有一位维护者时，GitHub 账号一旦被盗，步骤 1、2 都可能被攻击者自己通过，只剩步骤 4 能挡。
> - npm 账号和它的 2FA 如果也一起失守，这些关卡都挡不住。
> - Free、Pro、Team 套餐的 required reviewers 只能用在公开 repo。
> - 本文只讲 GitHub 托管的 runner；npm 的 Trusted Publishing 目前也不支持 self-hosted runner。
{: .prompt-warning }

## 结论与下一步

Trusted Publishing 让你不必在 CI 放长期 token；本文的四道锁，则让“推得进 repo”不再等于“发得出新版本”。最少也要做步骤 4：让 CI 只能送暂存，公开前一定要有人用 npm 的 2FA 批准。

还没设好 Trusted Publishing，请先看[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)。想给 workflow 的 PR 加上自动化审查，可以看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)；想从 AI 工作流的角度检查供应链风险，见[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。

官方说明以 GitHub 的 [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)，以及 npm 的 [Trusted publishing](https://docs.npmjs.com/trusted-publishers)、[Staged publishing](https://docs.npmjs.com/staged-publishing) 为准。
