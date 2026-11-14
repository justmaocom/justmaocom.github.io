---
title: "开了 Trusted Publishing 还不够：npm 发布流程也要上锁"
description: "tensorlake 的恶意版本带着合法的 provenance。这篇用 GitHub environment、ruleset 和 npm staged publishing 把发布流程上锁，为代码、发布触发与包公开各加一道审查关卡。"
date: 2026-11-13 20:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.zh-CN.webp
  alt: "在 npm 发布流程的四个环节各加一道锁：改代码、推 tag、发布 job、npm 公开。"
---

Trusted Publishing 让 CI 不必再保存长期发布 token，但它不会替你检查代码。如果攻击者能修改发布会用到的内容，又能触发已授权的 workflow，就可能借用你的发布流程送出恶意版本，连来源证明都是真的。

要降低这种风险，不能只换掉验证方式，还得检查谁能合并代码、谁能创建发布 tag、哪个 job 可以获取发布权限，以及版本公开前有没有人确认内容。这篇会把这些关卡串起来，最后让 CI 只能送出暂存版本，由维护者在 npm 批准后才公开。

这是[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)的续篇。OIDC、`id-token: write` 的基本配置不再重讲；还没设好 Trusted Publishing，请先看那篇。

先了解几个术语：

- **provenance（来源证明）**：让人查证包版本的来源 repo、构建 workflow 与相关 commit 的记录，不是代码安全认证。
- **tag（标签）**：指向某个 commit 的版本标记，例如 `v1.2.3`。上一篇的 workflow 用 `v*` tag 触发发布。
- **GitHub environment**：可为 job 加上必要审核者、允许的分支与 tag 等部署规则；job 必须先通过规则才开始执行。
- **ruleset（规则集）**：限制分支与 tag 如何创建、更新或删除的 repo 规则。
- **staged publishing（暂存发布）**：先把包送进暂存区，维护者审查并通过 2FA 批准后，该版本才公开。
- **2FA（双因素验证）**：登录或敏感操作时，除了原本的验证方式，再提供第二种验证因素，不限于输入验证码。

> **版本说明**：本文根据 2026-11-13 读取的 GitHub [environment 文档](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[ruleset 文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)，以及 npm 的 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 与 [Staged publishing](https://docs.npmjs.com/staged-publishing) 文档整理，未实际变更 GitHub 或 npm 的发布设置。方案、界面与版本要求请以对应的官方文档为准。
{: .prompt-info }

## 真实案例：来源证明是真的，内容却是恶意的

2026 年 10 月 8 日，npm 包 `tensorlake` 出现恶意版本 `0.5.144`。根据 [tensorlake 官方安全公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 攻击者利用被盗的维护者账号，把恶意代码推进 repo。
- 版本经过项目自己的 release workflow 发布，因此带有有效的 npm provenance。
- 恶意程序在安装时窃取 GitHub、npm 与云服务等凭据，再利用这些权限向其他包与 repo 散播。
- 该版本在 npm 上存在约 1 小时 40 分钟（当天 UTC 01:12 到 02:54）。

这个案例证明的是：**合法的构建来源，也可能产出恶意内容。** 公告没有交代当时所有的发布验证与保护设置，所以不能只凭 provenance 就推断他们用了 Trusted Publishing，也无从判断是哪一道保护遭到绕过。不过，它清楚说明了为什么不能只验证“从哪个 workflow 发出来”。

## provenance 证明什么、不证明什么

可以把 provenance 想成包裹上的发货单：能回头查到这批货出自哪家工厂、哪条生产线，但不会告诉你每个零件有没有被动过手脚。

npm 的 [provenance 文档](https://docs.npmjs.com/generating-provenance-statements)也提醒，来源证明不保证包没有恶意程序。它让来源更容易查证，内容仍需要审查。

![provenance 能提供构建来源线索，不能保证包内容安全](provenance.zh-CN.webp){: w="1600" h="900" }
_发货单是真的，不代表内容一定安全。tensorlake 的公告确认恶意版本经过项目自己的发布流程，并带有有效 provenance。_

## 把发布流程分成四个关卡

以本文的 tag 发布流程为例，要让一个版本公开，通常会经过以下四个环节：

| 环节 | 要确认的事 | 对应配置 |
| --- | --- | --- |
| 代码与 workflow 进入发布来源 | 变更是否经过审查 | 分支 ruleset、CODEOWNERS |
| 创建发布 tag | 谁能创建，指向哪个 commit | tag ruleset、来源 commit 检查 |
| 发布 job 执行 | 是否经批准，权限是否适当 | environment、job permissions |
| npm 版本公开 | 暂存内容是否符合预期 | stage-only publisher、人工 2FA 批准 |

配置时不按表格顺序，先从发布 job 的人工批准做起。表格之外，第三方 action 的版本也要固定（步骤 3），避免 workflow 没改，执行的内容却变了。

![代码、发布 tag、发布 job 与 npm 公开前各有一道关卡](locks.zh-CN.webp){: w="1600" h="900" }
_这几个关卡要一起看。GitHub 与 npm 是两个独立的授权边界，两边的账号、登录会话与验证设备都要各自保护。_

## 步骤 1：发布 job 先经过 environment 批准

先为发布 job 设一道人工关卡。根据 [GitHub 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)，Free、Pro、Team 的 required reviewers 只适用于公开 repo；私有 repo 要先确认方案支持。

需要 repo 管理权限才能配置：

1. 到 repo 的 **Settings → Environments → New environment**，创建 `npm-publish`。
2. 在 **Required reviewers** 加入能审核发布的人或团队，最多六个。注意：其中**任一位**批准就能放行，不是所有人都要同意。
3. 有第二位审核者时，开启 **Prevent self-review**，让触发发布的人不能自行批准。只有一位维护者时，开启它会卡住发布。
4. 取消 **Allow administrators to bypass configured protection rules**，避免管理员跳过批准、直接放行等待中的部署。
5. **Deployment branches and tags** 选 **Selected branches and tags**，新增 **Tag** 类型的 `v*` 规则。
6. 保存保护设置。

在发布 job 指定同名 environment：

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    # 其余配置见后面的完整示例
```

npmjs.com 的 Trusted Publisher 配置也要在 **Environment name** 填同一个 `npm-publish`。npm 文档为使用 environment 保护的项目提供这个字段，GitHub 的 [OIDC 文档](https://docs.github.com/en/actions/reference/security/oidc)也说明 token 可以带有 environment 信息。只在 workflow 加一行、npm 端却留空，就少了 npm 这一侧的限制。填了这个字段也不代表 workflow 可以任人修改，下一步仍要保护 workflow 本身。

根据 npm 的 Multiple trusted publishers 文档，现有连接不能直接修改，需要删掉重建，新连接须在两天内完成第一次成功发布。请先准备好 workflow 与批准者，再安排切换；界面若仍是 Single，请对照该版本文档。

触发发布后，job 会等待批准。审核者到 workflow 执行页面按 **Review deployments**，确认 tag、commit 与这次变更，再选 **Approve and deploy**。这时包还没构建出来，内容要留到步骤 4 再检查。

> 关闭管理员 bypass，不代表管理员不能修改或删除 environment 配置。若攻击者获取 repo 管理权限，仍可能改掉规则。只有一位维护者时，自行批准也只能防误触，无法区分本人与盗用同一账号的人。
{: .prompt-tip }

## 步骤 2：保护发布来源与 tag

### 2-1：分开限制 tag 创建与改写

到 **Settings → Rules → Rulesets → New tag ruleset**，把目标设成 `v*`，并确认 **Enforcement status: Active**。

建议分成两份规则：

- **`release-tags-create`**：勾选 **Restrict creations**，Bypass list 只留负责发版的最小范围。
- **`release-tags-immutable`**：勾选 **Restrict updates**、**Restrict deletions**，Bypass list 留空，让发版者也不能任意移动或删除现有 tag。

为什么要分开？[GitHub 文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)说明，这些限制只让有 bypass 权限者通过。如果三项放在同一份 ruleset，又把发版者加入 bypass，他们就同时能创建、改写与删除 tag，发布用的 tag 也就谈不上不可变。

**Bypass list 也不是任意填用户名。** [创建规则集的文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)列出的选项包括角色、团队与 GitHub App。组织 repo 可用专门的发版团队；个人 repo 要看界面提供的角色选项。选整个 Write 或 Maintain 角色，就会放行该角色的所有人。

这些规则仍可能被有管理权限的人修改，因此管理权限与规则变更本身也要受到监督。

### 2-2：代码与 workflow 都要审查

只保护 `.github/` 还不够。攻击者也可能修改包源代码、`package.json` 的发布脚本，或构建时加载的文件。以下 CODEOWNERS 示例先涵盖所有文件，再让发布团队负责 `.github/`：

```text
* @your-org/package-reviewers
/.github/ @your-org/release-reviewers
```

把示意团队换成实际账号或团队。后面的规则会覆盖前面对相同路径的指定；这里 `.github/` 由 release-reviewers 负责，不是两个团队都必须批准。根据 [CODEOWNERS 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)，负责者必须有 repo 写入权限；使用团队时，团队也须具备适当的可见性与权限。

为发布来源分支（本文用 `main`）创建 **Active** 的 branch ruleset，配置：

- **Require a pull request before merging**，并要求至少一位审核者批准。
- **Require review from Code Owners**，让变更必须经过对应路径的负责人批准。
- **Dismiss stale pull request approvals when new commits are pushed**，避免审过的内容又被换掉；也可加上 **Require approval of the most recent reviewable push**，要求最后推送者以外的人批准最新可审查的变更。
- **Block force pushes**，Bypass list 尽量留空；把项目必要的测试列为 required status checks。

**CODEOWNERS 本身不会阻挡合并。** 必须搭配要求 code owner 审查的规则才会生效。只有一位维护者时，把自己列成 owner 也不等于有了独立的第二人审查。

### 2-3：确认 tag 指向已审查的 commit

`v*` 只比对 tag 名称，**不会证明该 commit 已合并到 `main`**。同样地，environment 的 tag 规则比对的是执行时的 ref，不会替你确认来源分支。

发版者与 environment 审核者要确认 tag 指向的 commit 来自已审查的发布分支。后面的 workflow 示例也会检查当前 commit 是否在 `origin/main` 的历史里，挡住误指向其他分支的 tag。

这项检查的前提是 `main` 的审查规则确实生效，而且 workflow 没被篡改。它不能代替 tag 权限、workflow 审查或 npm 最后一关。

## 步骤 3：固定 action 版本，并保护 lockfile

`uses: actions/checkout@v6` 里的 `v6` 是可以移动的 tag。若要固定直接引用的 action，可改成经核对与审查的完整 commit SHA；后面的示例采用这种写法。

GitHub 在 2026-10-28 的 [GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)宣布 workflow lockfile 正式推出，适用方案列了 Free、Team 与 Enterprise Cloud 等；不过本文查阅时，[操作文档](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)的适用方案栏仍标示 Enterprise Cloud。请先确认 repo 的实际支持情况，不能只靠方案名称判断已启用。

支持的 repo 可根据文档执行：

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

检查 workflow 与 `.github/workflows/actions.lock` 的变更，确认无误后一起提交。**只锁这一份 workflow，不代表整个 repo 都已纳入。** 跨 repo 的 reusable workflow 要由来源 repo 维护自己的 lockfile；npm 依赖包、脚本临时下载的程序，也不会因此全部固定。

Dependabot 会为已纳入管理的 workflow 更新对应 lockfile，但更新仍要审查。若 repo 提供 **Require lockfile** 策略，可用来强制采用；lockfile 和策略本身也要保护，否则有人把它们删掉，锁定就悄悄失效了。锁定版本只确保执行内容一致，不保证该内容安全。

## 步骤 4：CI 只送暂存版本，由 npm 批准公开

这一关把“CI 可以提交包”和“版本可以公开”分开。根据 [npm 文档](https://docs.npmjs.com/trusted-publishers)，`npm stage approve` 等管理暂存内容的操作不能使用 CI 的 OIDC token；[staged publishing 文档](https://docs.npmjs.com/staged-publishing)也要求公开前由维护者通过 2FA 批准。

OIDC token 不能批准，但这道隔离只在 CI 拿不到其他 npm 凭据时才成立。**不要把能批准的 npm 账号凭据、登录会话或验证手段交给同一个发布流程**；GitHub 与 npm 分开授权，一边失守时，另一道关卡才还在。

先安排切换顺序：

1. 确认 npm CLI 至少为 **11.15.0**、Node.js 至少为 **22.14.0**，并有具发布权限、已启用 2FA 的 npm 账号负责批准。
2. 在 npmjs.com 检查这个包的**所有 Trusted Publisher**。目标连接只允许 `npm stage publish`，取消 `npm publish`；不需要的 `npm dist-tag` 权限也不要开。保留的其他连接若还能直接发布，就等于留着另一条入口。
3. 把 workflow 最后一步改成 `npm stage publish`。若需删掉重建 publisher，先把 workflow 准备好，留意新连接的验证期限。
4. 确认新流程可用后，按前篇收尾：**Settings → Publishing access → Require two-factor authentication and disallow tokens**，再撤销不再使用的发布 token。这项配置限制传统 token，不会停用 OIDC publisher，也不会把每个 publisher 自动改成 stage-only。

2026-07-08 的 [npm 变更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)预告约从 2027 年 1 月起，进一步限制用 2FA-bypass granular token 直接发布。这只是预告的时间表，不必等到那时才收紧权限。

![CI 用 OIDC 提交暂存版本，维护者在 npm 审查与批准后才公开](stage-approve.zh-CN.webp){: w="1600" h="900" }
_图中的权限分工以 stage-only publisher 为前提；若还有直接发布的 publisher 或其他发布凭据，就不能保证每条路径都会经过暂存。_

### workflow 示例

这份示例假设从 `main` 发版、有 `npm-publish` environment，且 npm 端已设为 stage-only。两个 action 的 SHA 是本文查阅时官方 `v6` tag 对应的 commit；采用前仍应核对上游并根据项目需求审查，之后通过 PR 更新：

```yaml
name: Stage Package

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Check release commit
        run: |
          git merge-base --is-ancestor HEAD refs/remotes/origin/main
      - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm --version
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm stage publish
```

根据 [checkout 文档](https://github.com/actions/checkout/tree/d23441a48e516b6c34aea4fa41551a30e30af803#usage)，`fetch-depth: 0` 会获取完整历史与分支，供 `origin/main` 的祖先检查使用；分支名称若不是 `main`，请一起修改。`id-token: write` 只给需要发布的 job，但同一个 job 里的每个步骤都拿得到这份权限：`npm ci`、构建与测试也会执行代码，所以发布脚本与依赖包同样要审查。若使用 npm 12，也要准备必要的安装脚本批准名单；不要为了让发布成功就一律放行。

### 批准前要看什么

workflow 完成后，到 npmjs.com **账号设置的 Staged Packages** 查看；也可在自己的可信电脑上操作 CLI。以下名称都是占位文字，执行前要换成实际包名与 stage ID，并保留引号：

```bash
npm stage list '@your-org/your-package'
npm stage view 'YOUR_STAGE_ID'
npm stage download 'YOUR_STAGE_ID'
# 确认内容后才批准；批准会公开该版本
npm stage approve 'YOUR_STAGE_ID'
```

至少确认：

- 包名、版本、dist-tag 与提交者，是否对应这次预定发布。
- workflow 执行与来源 commit，是否对应已审查的变更。
- **实际下载的 tarball 内容**，尤其编译产物、安装脚本与新增文件。源代码 PR 通过，不代表产出的文件一定相同；SHASUM 也只是识别内容，不能代替审查。

有疑虑就先不要批准，必要时用 `npm stage reject 'YOUR_STAGE_ID'` 拒绝。不要在带有正式凭据的电脑上直接执行可疑包来“验证”。

第一次暂存全新包时，npm 会创建公开的 `0.0.0-stage` 占位版本，实际暂存内容仍待批准才公开。批量批准功能还在逐步开放；就算一批只需通过一次 2FA，每个包仍要逐一审查。

## 按维护方式安排优先级

| 情况 | 建议 |
| --- | --- |
| 只有一位维护者 | 先做好 stage-only、清查其他发布入口与 npm 账号保护；不要把自行批准当成第二人审查 |
| 有两位以上维护者 | 加上独立 PR 审查与 Prevent self-review，确认有人能接手批准 |
| 私有 repo 无法配置 required reviewers | 按方案采用可用的分支与 tag 规则，并保留 npm 端的内容审查 |
| 发版频繁 | 用自动测试、差异报告与包清单协助审查；不要把批准简化成直接按按钮 |
| 已有多个 publisher | 逐个检查是否仍需直接发布或 dist-tag 权限，删除不用的连接 |
| 还在用 `NPM_TOKEN` 发布 | 先照[前篇](/posts/npm-trusted-publishing-github-actions/)完成迁移，再收掉旧入口 |

## 常见问题与限制

- **job 一直等待**：先看是不是在等 environment 批准。只有一人却开启 Prevent self-review，可能没人能放行。
- **environment 名称写错**：GitHub 可能自动创建没有保护的新 environment。核对 GitHub 与 npm 两边配置；不能把 job 开始执行当成配置成功。
- **tag 符合 `v*`，却没经过 `main` 审查**：名称检查不等于 commit 来源检查，两者都要确认。
- **改成 `npm stage publish`，仍可直接发布**：检查所有 publisher 的 Allowed actions，以及其他 token、账号与手动发布权限。改一行 workflow 不会收回其他入口。
- **规则都设了，管理员仍能改掉**：执行时的 bypass、修改保护设置的权限，是两件事。repo 管理员与 npm 管理者都属于需要保护的高权限身份。
- **有 2FA 就代表内容安全？** 2FA 只确认操作者是谁，不会替你审查包。npm 账号、会话与验证设备若也失守，最后一关仍可能被通过。
- **runner 限制**：本文只谈 GitHub 托管 runner；npm 文档目前不支持 self-hosted runner 的 Trusted Publishing。

先把发布权限的入口列清楚，再为来源审查、tag、job 与公开各加上合适的限制。最重要的一点是：批准 commit 和批准最后产出的包，是两次不同的确认，哪一次都不能省。

还没设好 OIDC，先看[npm Trusted Publishing 设置教程](/posts/npm-trusted-publishing-github-actions/)；workflow 的自动化审查可参考[用 GitHub Actions 加 AI Agent 自动化审查](/posts/github-actions-ai-agent-pr-review/)；更完整的工作流风险整理，见[OWASP Agentic Top 10 检查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
