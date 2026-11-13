---
title: "gh actions-lock 教程：锁定 GitHub Actions 用到的每个 action"
description: "workflow 写 @v3，跑的是标签当下指向的代码，标签被换掉也不会提醒你。本文说明 GitHub 的 workflow lockfile 怎么运作，并一步步用 gh actions-lock 上锁、看懂 diff、日常维护。"
date: 2026-11-13 20:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, github-actions, ci, dependabot, gh-actions-lock]
media_subpath: /assets/img/posts/gh-actions-lock-workflow-lockfile/
image:
  path: cover.zh-CN.webp
  alt: "用 gh actions-lock 生成 actions.lock，workflow 照跑锁住的 commit，标签被移走也不跟着换。"
---

先说结论：在 workflow 里写 `uses: actions/checkout@v7`，意思是“跑 `v7` 这个标签现在指向的那一版”。标签可以被移到别的代码上，你的 workflow 下次就会跟着跑新的那一版，没有人会提醒你。GitHub 在 2026-10-28 正式推出 workflow lockfile：用 `gh actions-lock` 生成一份 `actions.lock`，记下每个 action 实际跑的是哪一个 commit，之后运行就以它为准。你可以继续写好读的版本号，跑的却始终是你审过的那一版。

先认识几个词：

- **GitHub Actions**：GitHub 内置的自动化服务，代码一推上去，就能自动跑测试、构建、部署。
- **repo**（repository，仓库）：GitHub 上存放项目代码的地方。
- **workflow**：放在 repo 的 `.github/workflows/` 里的 YAML 配置文件，写明要自动做哪些事。
- **action**：workflow 里可以重复使用的现成步骤，例如负责“检出代码”的 `actions/checkout`。workflow 用 `uses:` 这一行指定要用哪个 action、哪一版。
- **commit 与 SHA**：commit 是某一次提交时的代码快照；SHA 是每个 commit 独一无二的编号，是一长串字母和数字，内容只要改一个字，编号就不同。
- **tag（标签）**：给某个 commit 取的好记名字，例如 `v3.1.0`。标签像一张贴纸，可以撕下来贴到别的 commit 上。
- **lockfile（锁定文件）**：记录每个依赖“确切是哪一版”的文件。写过 JavaScript 的人可能见过 `package-lock.json`，概念一样。
- **Dependabot**：GitHub 内置的机器人，发现依赖有新版本时，会自动开 PR（请求合并变更的申请）帮你更新。
- **gh**：GitHub 官方的命令行工具（GitHub CLI）。`gh actions-lock` 是给它加上的扩展（extension）。

本文处理的是“别人写的 action 被换掉”这类供应链风险。[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)在 ASI04（供应链）提过一句“用 lockfile 锁定第三方 action”，本文把做法完整写出来。

> **版本说明**：本文依据 2026-11-13 读取的 GitHub 官方资料撰写：[GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)、[Locking action dependencies in a repository's workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)、[Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，以及 [gh-actions-lock](https://github.com/github/gh-actions-lock) 的 README（当时最新版是 v0.4.1）。这个扩展仍在快速更新，命令与选项以 `gh actions-lock --help` 为准。
{: .prompt-info }

## 为什么 `@v3` 不一定是你审过的那一版

`uses: octo-org/deploy-action@v3` 看起来像是“用第 3 版”，其实是“用 `v3` 这张贴纸现在贴着的那个 commit”。谁有那个 action repo 的写入权限，谁就能把贴纸移走。平时这是作者发布新版的方式：`v3` 跟着最新的 3.x 走。但作者的账号一旦被盗，攻击者也能用同一招，把贴纸贴到藏了恶意代码的 commit 上。你的 workflow 一行都没改，下次运行却跑了别人的代码。

这种事真的发生过。2025 年 3 月，很多 repo 都在用的 `tj-actions/changed-files` 就出过事。根据 [GitHub 安全公告](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)，攻击者事后修改了多个版本标签，让它们指向同一个恶意 commit；这段代码会把 CI 里的机密数据（例如 token、密钥）打印进 workflow 的运行日志（log）。公告写的受影响期间是 2025 年 3 月 14 日到 15 日，使用这个 action 的 repo 超过 23,000 个。美国 CISA 也为这起事件（CVE-2025-30066）发布了[警报](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)。

以往常见的防范方法，是把 action 直接固定到完整的 commit SHA。本站的部署 workflow 就是这样写的：

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```
{: .nolineno }

这样做很安全，但很难读：一长串编号看不出是哪一版，只能靠行尾的注释。注释也可能和 SHA 对不上，每次更新都要两个一起改。workflow lockfile 换了一种做法：workflow 里继续写 `@v7.0.1` 这种好读的版本号，SHA 另外记在 lockfile 里。[官方文档](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)写得很直接：repo 采用 lockfile 之后，就不必再在 workflow 文件里固定 SHA。

## workflow lockfile 是什么、怎么运作

一句话：lockfile 就是 `.github/workflows/actions.lock` 这个文件，记下每个 workflow 用到的 action 解析到哪一个 commit，运行时 GitHub 以它为准。

它由 `gh actions-lock` 自动生成，不要手动修改。每个 action 会记录这几个字段：

- `ref`：这个 commit 是从哪个标签或分支解析出来的，例如 `v3.1.0`。
- `commit`：解析到的 commit，也就是**真正会运行的代码**。
- `owner_id`、`repo_id`：来源 repo 的数字编号。运行时用它确认，名字背后还是当初锁定的那个 repo。

它不只记录你直接写在 `uses:` 里的 action。根据 [GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)，action 自己再用到的其他 action（传递依赖）也会一起锁定。

一个 workflow 被纳入 lockfile 之后（官方称为 onboard，本文叫“上锁”），根据[概念说明](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，运行时有三条规则：

1. 这个 workflow 用到的每个 action，都必须出现在 lockfile 里。
2. 运行的是 lockfile 里记录的那个 commit，不是标签现在指向的 commit。
3. 那个 commit 必须在 action 自己的 repo 里、从记录的标签或分支能追溯到。只存在于 fork（别人复制出去的 repo）的 commit，或已经不在那个标签历史里的 commit，运行时会被拒绝。

所以标签被移走时，workflow 要么照跑锁住的那一版，要么直接被拦下，不会悄悄改跑新的代码。

![没有 lockfile 时，标签被移走就跑到被换上的代码；有 lockfile 时，照跑锁住的那一版](tag-vs-lock.zh-CN.webp){: w="1600" h="900" }
_概念图：同一行 `uses: octo-org/deploy-action@v3`。左边没有 lockfile，运行时跟着标签走；右边有 lockfile，照跑锁住的 commit，那个 commit 若已不在标签的历史里，这次运行会被拦下。_

**谁可以用：** GA 公告写，GitHub Enterprise Cloud（含数据驻留版本）、Team、Free 方案都能用。[README](https://github.com/github/gh-actions-lock) 写，扩展支持 github.com 与 GHE.com，不支持 GitHub Enterprise Server。

**要先说清楚：** lockfile 只决定“跑哪一版”，不判断那一版安不安全。官方提醒，上锁前要先审查依赖。你锁住的那一版若本来就有问题，lockfile 会很忠实地一直跑它。

## 步骤 0：先准备这些

- **装好 GitHub CLI 并登录：** 按 [GitHub CLI 官网](https://cli.github.com/)安装，再用 `gh auth login` 登录。扩展需要已登录的 `gh`。
- **对 repo 有写入权限：** 官方文档写，有写入权限就能创建 lockfile，不需要管理员权限。
- **先开启 Dependabot：** 官方建议在生成 lockfile 之前，先让 Dependabot 管理 GitHub Actions 的版本。最基本的配置，是在 `.github/dependabot.yml` 写：

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- **检查每一行 `uses:`：** 确认指向的都是仍在维护的当前版本。lockfile 会把你写的版本原样锁住，旧版本锁起来还是旧版本。
- **确认有没有 action 允许列表：** 有些组织只允许使用特定的 action（allowlist）。上锁之后比对方式会改变，步骤 3 会说明。

**你会得到：** 一个能用 `gh` 操作、由 Dependabot 管着版本的 repo。

## 步骤 1：安装 gh-actions-lock

```bash
gh extension install github/gh-actions-lock
```
{: .nolineno }

之后要更新到新版：

```bash
gh extension upgrade gh-actions-lock
```
{: .nolineno }

装好后先看一次 `gh actions-lock --help`。README 写，所有选项以这份说明为准。

## 步骤 2：生成 lockfile

在 repo 的根目录运行：

```bash
gh actions-lock
```
{: .nolineno }

它会扫描 `.github/workflows/` 下的每一个 workflow，把每个能解析的 action 固定到一个 commit，再写出 `.github/workflows/actions.lock`。

不想一次全部上锁，也可以只锁一个 workflow：

```bash
gh actions-lock .github/workflows/ci.yml
```
{: .nolineno }

官方的建议就是一个一个 workflow 逐步纳入。要注意，只有对整个目录运行时，才会清掉已删除 workflow 的旧记录。

**你会得到：** 一份新的 `actions.lock`，以及被改写过的 workflow 文件。先别急着提交，下一步先看懂改了什么。

## 步骤 3：看懂 diff 再提交

运行完后用 `git diff` 查看变更，会看到两处：

**第一处：workflow 文件里的 `uses:` 写得更精确。** 例如 `octo-org/deploy-action@v3` 会被改写成 `octo-org/deploy-action@v3.1.0`。官方文档说明，这只是把版本写得更精确，指向的 commit 不变。想保留 `@v3` 的写法，运行时加上 `--no-narrow`。

**第二处：新增 `actions.lock`。** 文件开头有几行注释，提醒这是自动生成、不要手动修改的文件；接下来的内容结构大致如下（数值是示意）：

```yaml
version: 'v0.0.3'
workflows:
    '.github/workflows/ci.yml':
        - 'octo-org/deploy-action@v3.1.0'
dependencies:
    'octo-org/deploy-action@v3.1.0':
        ref: 'v3.1.0'
        commit: '<commit SHA>'
        owner_id: 1234567
        repo_id: 7654321
```

`workflows` 列出每个 workflow 用到哪些 action；`dependencies` 记下每个 action 解析到的 commit。审查时看两件事：

- **`commit` 变了：** 代表 workflow 之后会跑不同的代码。官方的说法是，变了的 `commit` 就是你的 workflow 会运行的代码，所以要去看上游改了什么。
- **`owner_id` 或 `repo_id` 变了：** 这应该很少发生。官方建议先查清楚原因，再合并。

![提交前要看懂的两处变更：uses: 改写成完整版本号，以及新增的 actions.lock 各字段的含义](review-diff.zh-CN.webp){: w="1600" h="900" }
_概念图：上方是 workflow 文件的改写，`@v3` 变成 `@v3.1.0`，指向同一个 commit；下方是新增的 `actions.lock`，以及 `ref`、`commit`、`owner_id`／`repo_id` 各代表什么。_

**有 action 允许列表的话，列表要跟着改。** [官方文档](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)特别提醒：workflow 上锁之后，允许列表比对的是锁定的 commit SHA，不再是标签。像 `actions/checkout@v6` 这种写死标签的条目会对不上，要改成通配符或完整的 commit SHA。列表可能设在 repo、组织或企业层级，不确定的话先问管理员。

确认没问题，就把 `actions.lock` 和改写过的 workflow 一起提交。官方另外建议把 `.github/workflows/actions.lock` 加进 CODEOWNERS（指定哪些文件要由谁审核的配置文件），并要求 code owner 批准，让每次 lockfile 的变更都有人看过。

**你会得到：** 上锁的 workflow。之后运行时，跑的是 lockfile 里记录的 commit。

## 步骤 4：日常维护

上锁不是做一次就结束。下面几件事，决定它能不能长期有效。

**改了 `uses:` 就重新运行。** 新增 workflow，或在已有 workflow 里增删 action 时，再跑一次 `gh actions-lock`。不要手动改 lockfile。

**Dependabot 会一起更新。** 已上锁的 workflow，Dependabot 开版本更新的 PR 时，会在同一个 PR 里重新生成对应的 lockfile 记录，不需要额外配置。但它只处理已上锁的 workflow：还没上锁的，它照旧只改 workflow 文件，也不会替你把新的 workflow 纳入 lockfile。

**让 CI 检查 lockfile 有没有过期。** `gh actions-lock --verify` 只检查、不改文件；lockfile 过期或有问题时会以错误退出，适合设成 PR 必须通过的检查。gh-actions-lock 的 repo 提供了一份示例 [`verify-lockfile.yml`](https://github.com/github/gh-actions-lock/blob/main/.github/workflows/verify-lockfile.yml)：

{% raw %}
```yaml
# Fails when .github/workflows/actions.lock is out of sync with the
# workflows or a locked pin no longer verifies upstream.
name: verify-lockfile

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - run: gh extension install github/gh-actions-lock --pin v0.4.1
      - run: gh actions-lock --verify
```
{: file=".github/workflows/verify-lockfile.yml" }
{% endraw %}

几个重点：

- `on`：每个 PR，以及推送到 `main` 时都会检查。
- `permissions: contents: read`：只给读取权限，这个检查不需要改任何东西。
- `persist-credentials: false`：检出代码后，不把访问令牌留在运行机器上。
- `--pin v0.4.1`：连扩展本身也固定版本，避免它自己被换掉。
- `gh actions-lock --verify`：没有问题时返回 0；有需要拦下的问题时返回 1；工具本身出错（例如选项写错、lockfile 读不了）时返回 2。

README 提醒，把这份文件复制进 repo 之后，要再跑一次 `gh actions-lock`，让这个负责检查的 workflow 自己也上锁。

另外还有 `--verify-local`：不联网，只检查每一行 `uses:` 在 lockfile 里有没有记录，适合提交前快速检查。它不验证来源，不能取代 `--verify`。

**标签或分支移动了，按种类处理。** 上游的标签或分支变了，`gh actions-lock` 会按你写的引用种类，给出不同的结果：

| 你写的引用 | 发生什么 | 怎么做 |
| --- | --- | --- |
| 分支或部分版本，例如 `main`、`v4` | 照跑锁住的 commit，报告 `ref-moved` 警告 | 看过上游改了什么，要跟上就运行 `gh actions-lock --relock` |
| 完整版本标签，例如 `v3.1.0` | 标签必须指向锁住的 commit，移动了就报错 | 先弄清楚标签为什么被移动，再运行 `gh actions-lock --relock`，或改写 `uses:` 那一行 |
| 历史被改写，例如上游 force push 之后，锁住的 commit 不在历史里了 | 报错，`--relock` 也修不好 | 人工看过上游的历史后，才运行 `gh actions-lock --accept-moved` |

![标签或分支移动时的三种情况：分支或部分版本、完整版本标签、历史被改写，各自的结果与处理命令](moved-refs.zh-CN.webp){: w="1600" h="900" }
_概念图：三种引用移动的情况与对应命令。第三种的 `--accept-moved` 只能在人工确认后使用，不要放进自动化。_

**为什么不要在自动化里用 `--accept-moved`？** 这个选项的意思是“我接受锁住的 commit 已经不在上游的历史里”。版本标签被改指、历史被改写，正是供应链攻击会留下的痕迹；lockfile 在这里拦下来，就是要你停下来看一眼。如果 CI 或机器人每次都自动加上 `--accept-moved`，等于把这道关卡拆掉。官方文档和 README 都写明，不要在自动化里使用。

**不要删掉 lockfile。** README 提醒，锁住的引用会一直沿用；删掉重新生成，所有引用都会重新解析成“现在指向的 commit”，等于重新相信一次上游。文件坏了，从 git 恢复再重新运行：

```bash
git fetch origin
git checkout origin/main -- .github/workflows/actions.lock
gh actions-lock
```

默认分支不叫 `main` 的话，把第二行换成你的分支名称。

## 步骤 5：处理本地 action（`./`）

有些 workflow 会用 repo 自己里面的 action，写成 `uses: ./.github/actions/setup` 这样。这种 `./` 路径跑的是运行机器上当时检出的文件，所以扩展没办法锁住它，也看不到它里面又用了哪些 action。

如果这个本地 action 还用了别的 action，`gh actions-lock` 会报告 `local-action` 错误，而且什么都不写。有两种处理方式：

- **改成 `$/`（推荐）：** 运行 `gh actions-lock --migrate-local-actions`，它会把 workflow 和 repo 内 `action.yml` 里的 `uses: ./…` 改写成 `uses: $/…`。`$/` 的意思是“在这个 workflow 所在的 commit，运行 repo 自己的 action”，因此可以锁住，它用到的 action 也能一起记进 lockfile。改写后每一行都要看过。
- **保留 `./`：** 改加 `--ignore-local-actions`，只报告警告。代价是：本地 action 用到 lockfile 里没有记录的 action 时，job 会在那一步失败，错误信息类似 `lockfile missing pin for octo-org/setup-tool@v2.0.0`，而且前面的步骤已经跑过了。

## 进阶：要求每个 workflow 都要上锁

前面的步骤让“已上锁的 workflow”跑锁住的版本，但拦不住有人新增一个没上锁的 workflow。想强制所有 workflow 都上锁，可以用 **Require lockfile** 策略（[说明](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)）：

- 企业、组织或 repo 的管理员可以在 Actions 策略里设置，把它加为 workflow 的运行保护。
- 它有两种状态：**Evaluate** 只记录、不拦截（仅限 GitHub Enterprise Cloud）；**Active** 会拦下范围内所有还没上锁的 workflow，即使同一个 repo 的其他 workflow 已经上锁。
- 改成 Active 之前，先在每个目标 repo 跑过 `gh actions-lock --verify`，或在 Evaluate 状态下查看 Policy insights。
- 开启策略之后，`--verify` 的检查仍然要保留：策略是在运行时拦下没有有效 lockfile 的 workflow；`--verify` 则是在 PR 阶段就提醒作者 lockfile 过期了。
- 组织若已开启“action 必须固定到完整 SHA”的策略，它和 Require lockfile 是各自独立的检查，两个都要通过。已上锁的 workflow，即使文件里没写 SHA，也能同时通过两者。

## lockfile 管不到的地方

> 上锁之前，先了解这些限制：
>
> - **reusable workflow 不会被锁定：** 在 job 层级用 `jobs.<job_id>.uses` 调用的 reusable workflow（可被其他 workflow 调用的 workflow）不在 lockfile 里，要另外固定到完整的 commit SHA；它自己用的 action，由它所在 repo 的 lockfile 负责。开启 Require lockfile 策略时，被调用的 workflow 若没有在自己的 repo 上锁，这次运行会被拦下。
> - **容器镜像不会被锁定：** README 写，`docker://` 步骤、job 的 `container:` 与 `services:`，以及 Docker action 用的镜像都不锁定；没写 `@sha256:` digest 的镜像会被列为警告。
> - **只管 action 的代码：** 传给 action 的输入、secrets、运行机器的系统镜像，都不在它的范围内。
> - **不判断安全：** lockfile 确保跑的是你锁住的那一版，但不判断那一版有没有问题。上锁前要先审查。
> - **回退检测不到：** README 提醒，如果有人在 lockfile 里，把 `v4`、`main` 这类会移动的引用改回它历史上较旧的 commit，工具检测不到。lockfile 的 diff 要有人看，或改用完整版本标签。
> - **扩展不支持 GitHub Enterprise Server。**
{: .prompt-warning }

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 第一次上锁 | 先开启 Dependabot、检查 `uses:`；装好扩展，在 repo 根目录运行 `gh actions-lock`；看懂 diff 再提交 |
| 先只锁一个 workflow | `gh actions-lock .github/workflows/<文件名>.yml` |
| 保留 `@v3` 的写法 | 运行时加 `--no-narrow` |
| 新增或修改了 `uses:` | 再运行一次 `gh actions-lock` |
| 在 PR 检查 lockfile 有没有过期 | 加入 `verify-lockfile.yml` 跑 `gh actions-lock --verify`，并设成必须通过的检查 |
| 收到 `ref-moved` 警告 | 看过上游变更，要跟上就运行 `gh actions-lock --relock` |
| 完整版本标签被移动 | 先弄清楚原因，再 `gh actions-lock --relock` 或改写 `uses:` |
| 锁住的 commit 不在上游历史里 | 人工确认后才 `--accept-moved`，不要放进自动化 |
| 有本地 action（`./`） | `--migrate-local-actions` 改成 `$/` |
| 组织有 action 允许列表 | 写死标签的条目改成通配符或完整 SHA |
| 要求每个 workflow 都上锁 | 管理员设置 Require lockfile 策略；Enterprise Cloud 可以先用 Evaluate 观察，再改成 Active |
| lockfile 坏了 | 从 git 恢复后再运行 `gh actions-lock`，不要删掉重新生成 |

## 常见错误与处理

- **手动改 lockfile：** 扩展会拒绝 `ref` 和 workflow 引用对不上的记录。要改就改 workflow，再重新运行 `gh actions-lock`。
- **上锁后，workflow 被允许列表拦下：** 列表里写死标签的条目（例如 `actions/checkout@v6`）改成通配符或完整 SHA。
- **出现 `local-action` 错误：** 本地 action 里用了其他 action。用 `--migrate-local-actions` 改成 `$/`，或加 `--ignore-local-actions`，但要承担运行到一半失败的风险。
- **job 跑到一半出现 `lockfile missing pin for …`：** 保留 `./` 的本地 action 用了 lockfile 没记录的 action。改成 `$/` 最省事。
- **新的 workflow 没被 Dependabot 纳入：** Dependabot 不会替你给新 workflow 上锁，自己运行一次 `gh actions-lock`。
- **Dependabot 更新后 lockfile 没变：** 那个 workflow 还没上锁。
- **在 CI 里自动加 `--accept-moved`：** 去掉。这正是 lockfile 要拦下的情况。
- **以为 reusable workflow 也锁住了：** 没有，`jobs.<job_id>.uses` 要另外固定到完整 SHA。
- **删掉 lockfile 重新生成：** 所有引用会重新解析成现在指向的 commit。改从 git 恢复。

## 结论与下一步

`@v3` 是一张可以被移走的贴纸。workflow lockfile 让你保留好读的版本号，同时把“实际跑哪个 commit”记下来交给 GitHub 把关：先开启 Dependabot，运行 `gh actions-lock`，看懂 diff 再提交，然后用 `--verify` 让 CI 帮你盯着。标签被移动时，停下来看一眼，不要让自动化替你按下 `--accept-moved`。

负责发布的 workflow 特别值得先锁。[npm Trusted Publishing 设置教程：发布包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)去掉了长期 token，但 workflow 跑的 action 若被换掉，一样能发布有问题的版本。想给同一条 CI 流程加上自动化审查，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)；更完整的 AI 工作流风险检查，请看 [OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
