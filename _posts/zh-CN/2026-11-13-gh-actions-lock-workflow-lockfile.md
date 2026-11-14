---
title: "gh actions-lock 教程：用 lockfile 锁定 GitHub Actions 依赖"
description: "workflow 写 @v3，执行的代码可能随标签移动而改变。这篇说明 GitHub 的 workflow lockfile 怎么运作，并一步步用 gh actions-lock 上锁、看懂 diff、日常维护。"
date: 2026-11-13 20:00:00 +0800
categories: [信息安全, 供应链]
tags: [supply-chain-security, github-actions, ci, dependabot, gh-actions-lock]
media_subpath: /assets/img/posts/gh-actions-lock-workflow-lockfile/
image:
  path: cover.zh-CN.webp
  alt: "用 actions.lock 记录预定执行的 action commit，避免标签移动时悄悄换版。"
---

workflow 里的 `uses: actions/checkout@v7` 看起来只是选了第 7 版，实际上跑的是 `v7` 标签当下指向的 commit。上游移动标签后，你的 workflow 没改，执行的代码却可能跟着变。

GitHub 在 2026-10-28 推出 workflow lockfile。用 `gh actions-lock` 把支持的 action 解析成确切 commit，记在 `.github/workflows/actions.lock`，纳入管理的 workflow 就会依这份记录执行。你可以保留好读的版本号，同时把真正要跑的代码放进审查流程；不过，生成 lockfile 本身不代表已完成安全审查。

先认识几个词：

- **GitHub Actions**：GitHub 内建的自动化服务，代码一推上去，就能自动跑测试、构建、部署。
- **repo**（repository）：GitHub 上存放项目代码的地方。
- **workflow**：放在 repo 的 `.github/workflows/` 里的 YAML 配置文件，写明要自动做哪些事。
- **action**：workflow 里可以重复使用的现成步骤，例如负责“检出代码”的 `actions/checkout`。workflow 用 `uses:` 这一行指定要用哪个 action、哪一版。
- **commit 与 SHA**：commit 是某一次提交时的代码快照；SHA 是每个 commit 独一无二的编号，是一长串字母和数字，内容只要改一个字，编号就不同。
- **tag（标签）**：替某个 commit 取的好记名字，例如 `v3.1.0`。标签像一张贴纸，可以撕下来贴到别的 commit 上。
- **lockfile（锁定文件）**：记录每个依赖“确切是哪一版”的文件。写过 JavaScript 的人可能看过 `package-lock.json`，概念一样。
- **Dependabot**：GitHub 内建的机器人，发现依赖有新版本时，会自动开 PR（请求合并变更的申请）帮你更新。
- **gh**：GitHub 官方的命令行工具（GitHub CLI）。`gh actions-lock` 是替它加上的扩展（extension）。

这篇处理的是“别人写的 action 被换掉”这种供应链风险。[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)在 ASI04（供应链）提过一句“用 lockfile 锁住第三方 action”，这篇把做法完整写出来。

> **版本说明**：本文依 2026-11-13 读取的 GitHub 官方资料撰写：[GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)、[Locking action dependencies in a repository's workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)、[Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，以及 [gh-actions-lock v0.4.1 的 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md)与[故障排除文档](https://github.com/github/gh-actions-lock/blob/v0.4.1/docs/troubleshooting.md)。本文未实际执行上锁操作；工具持续更新，命令与选项请对照已安装版本的 `gh actions-lock --help`。
{: .prompt-info }

## 为什么 `@v3` 不一定是你审过的那一版

`uses: octo-org/deploy-action@v3` 看起来像是“用第 3 版”，其实是“用 `v3` 这张贴纸现在贴着的那个 commit”。有权更新那个 tag 的人，就能移动这张贴纸；实际权限也会受到上游的 tag 保护规则限制。平常这是作者发新版的方式：`v3` 跟着最新的 3.x 走。但作者的账号一旦被盗，攻击者也能用同一招，把贴纸贴到藏了恶意程序的 commit 上。你的 workflow 一行都没改，下次执行却跑了别人的程序。

这种事真的发生过。2025 年 3 月，很多 repo 都在用的 `tj-actions/changed-files` 就出过事。依 [GitHub 安全公告](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)，攻击者事后修改了多个版本标签，让它们指向同一个恶意 commit；这段程序会把 CI 里的敏感信息（例如 token、密钥）输出到 workflow 的执行记录（log）。公告写的受影响期间是 2025 年 3 月 14 日到 15 日，使用这个 action 的 repo 超过 23,000 个。美国 CISA 也为这起事件（CVE-2025-30066）发了[警示](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)。

以往常见的防法，是把 action 直接固定到完整的 commit SHA。本站的部署 workflow 就是这样写：

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```
{: .nolineno }

完整 SHA 可以避免跟着移动的 tag 换版，但不保证该 commit 的内容安全。阅读时也有一个不便：一长串编号看不出是哪一版，只能靠行尾的注释。注释也可能和 SHA 对不上，每次更新都要两个一起改。workflow lockfile 换了一种做法：workflow 里继续写 `@v7.0.1` 这种好读的版本号，SHA 另外记在 lockfile 里。[官方文档](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)写得很直接：已纳入 lockfile 的 action，可以由 lockfile 固定 SHA，不必每一行都直接写 SHA。这不表示可以先移除所有既有 SHA，再慢慢补 lockfile；应先完成纳入、审查与验证。

## workflow lockfile 是什么、怎么运作

一句话：lockfile 就是 `.github/workflows/actions.lock` 这个文件，记下每个 workflow 用到的 action 解析到哪一个 commit，执行时 GitHub 以它为准。

它由 `gh actions-lock` 自动生成，不要手动修改。每个 action 会记这几个字段：

- `ref`：这个 commit 是从哪个标签或分支解析出来的，例如 `v3.1.0`。
- `commit`：解析到的 commit，也就是**真正会执行的代码**。
- `owner_id`、`repo_id`：来源 repo 的数字编号。执行时用它确认，名字背后还是当初锁住的那个 repo。

它不只记你直接写在 `uses:` 的 action。依 [GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)，action 自己再用到的其他 action（传递依赖）也会一起锁住。

一个 workflow 被纳入 lockfile 之后（官方称为 onboard，本文叫“上锁”），依[概念说明](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，执行时有三条规则：

1. 这个 workflow 用到的每个 action，都必须出现在 lockfile 里。
2. 执行的是 lockfile 里记的那个 commit，不是标签现在指到的 commit。
3. 那个 commit 必须在 action 自己的 repo 里、从记录的标签或分支追得到。只存在于 fork（别人复制出去的 repo）的 commit，或已经不在那个标签历史里的 commit，执行时会被拒绝。

所以标签被移动时，workflow 要么照跑锁定的那个版本，要么直接被挡下，不会悄悄改跑新的程序。

![没有 lockfile 时，标签被移动就跑到被换上的程序；有 lockfile 时，照跑锁定的那个版本](tag-vs-lock.zh-CN.webp){: w="1600" h="900" }
_概念图：同一行 `uses: octo-org/deploy-action@v3`。左边没有 lockfile，执行时跟着标签走；右边有 lockfile，照跑锁住的 commit，那个 commit 若已不在标签的历史里，这次执行会被挡下。_

**谁可以用：** GA 公告列出 GitHub Enterprise Cloud（含数据落地版本）、Team、Free；不过本文查阅时，操作与策略文档的适用方案栏仍标示 Enterprise Cloud。请确认 repo 实际提供的功能与策略入口，尤其不要把“可以生成文件”当成“执行端已套用保护”。[v0.4.1 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md)列出 github.com 与 GHE.com 支持，不支持 GitHub Enterprise Server。

**要先说清楚：** lockfile 只决定“跑哪一版”，不判断那一版安不安全。官方提醒，上锁前要先审过依赖。你锁定的那个版本若本来就有问题，lockfile 会很忠实地一直跑它。

## 步骤 0：先准备这些

- **装好 GitHub CLI 并登录：** 照 [GitHub CLI 官网](https://cli.github.com/)安装，再用 `gh auth login` 登录。扩展需要已登录的 `gh`。
- **对 repo 有写权限：** 官方文档写，有写权限就能建立 lockfile，不需要管理员权限。
- **先保存当前变更，另开工作分支：** 工具会修改 workflow 和 lockfile，先用 `git status --short` 确认当前状态。安装工具后若想先看报告，可用只读、不写文件的 `gh actions-lock --no-fix`。
- **先开 Dependabot：** 官方建议在生成 lockfile 之前，先让 Dependabot 管理 GitHub Actions 的版本。最基本的配置如下；若已有 `.github/dependabot.yml`，把这个更新项目合并进现有配置，不要整份覆盖：

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- **检查每一行 `uses:`：** 确认指向的都是仍在维护的当前版本。lockfile 会把你写的版本原样锁住，旧版本锁起来还是旧版本。
- **确认有没有 action 允许清单：** 有些组织只允许使用特定的 action（allowlist）。上锁之后匹配方式会改变，步骤 3 会说明。

## 步骤 1：安装 gh-actions-lock

```bash
gh extension install github/gh-actions-lock
```
{: .nolineno }

这会安装当时最新的 release；本文依 v0.4.1 文档说明。若要明确选用该版，可在安装时加上 `--pin v0.4.1`，但这指定的是 release tag，不是完整 commit SHA 或安全认证。仍需确认工具来源。未锁定版本的一般安装，之后可这样更新：

```bash
gh extension upgrade gh-actions-lock
```
{: .nolineno }

装好后先看一次 `gh actions-lock --help`。README 写，所有选项以这份说明为准。

## 步骤 2：生成 lockfile

在 repo 的根目录执行：

```bash
gh actions-lock
```
{: .nolineno }

它会扫过 `.github/workflows/` 底下每一个 workflow，把每个能解析的 action 固定到一个 commit，再写出 `.github/workflows/actions.lock`。

不想一次全部上锁，也可以只锁一个 workflow：

```bash
gh actions-lock .github/workflows/ci.yml
```
{: .nolineno }

官方的建议就是一个一个 workflow 慢慢纳入。要注意，只有对整个目录执行时，才会清掉已删除 workflow 的旧记录。

## 步骤 3：看懂 diff 再提交

执行完后先用 `git status --short` 确认修改与新增的文件，再用 `git diff -- .github/workflows/` 看已追踪文件的变更。**新建、尚未追踪的 `actions.lock` 不会直接出现在一般 `git diff` 里**，要打开文件检查，或加入暂存区后用 `git diff --cached` 查看。主要看两处：

**第一处：workflow 文件里的 `uses:` 写得更精确。** 例如 `octo-org/deploy-action@v3` 可能被改写成 `octo-org/deploy-action@v3.1.0`。若能找到对应的完整版本标签，这种改写会保留相同 commit，让版本名称更精确；不是自行升到另一个新版本。想保留 `@v3` 的写法，执行时加上 `--no-narrow`。

**第二处：新增 `actions.lock`。** 文件开头有几行注释，提醒这是自动生成、不要手动修改的文件；接着的内容结构大致如下（数值是示意）：

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

`version` 是 lockfile 的格式版本，不是扩展版本。上面的 commit 与数字仅用来说明字段，不能直接复制成有效 lockfile。`workflows` 列出每个 workflow 用到哪些 action；`dependencies` 记下每个 action 解析到的 commit。审查时看两件事：

- **`commit` 变了：** 代表 workflow 之后会跑不同的代码。官方的说法是，变了的 `commit` 就是你的 workflow 会执行的代码，所以要去看上游改了什么。
- **`owner_id` 或 `repo_id` 变了：** 这应该很少发生。官方建议先查清楚原因，再合并。

![提交前要看懂的两处变更：uses: 改写成完整版本号，以及新增的 actions.lock 各字段的意思](review-diff.zh-CN.webp){: w="1600" h="900" }
_概念图：上方是 workflow 文件的改写，`@v3` 变成 `@v3.1.0`，指向同一个 commit；下方是新增的 `actions.lock`，以及 `ref`、`commit`、`owner_id`／`repo_id` 各代表什么。_

**有 action 允许清单的话，清单要跟着改。** [官方文档](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)特别提醒：workflow 上锁之后，允许清单匹配的是锁住的 commit SHA，不再是标签。像 `actions/checkout@v6` 这种写死标签的项目会对不上，可以改成对应的完整 commit SHA；若管理员选择使用通配符，应限制在可信的 owner／repo 范围，不要为了解决错误就全面放宽。清单可能设在 repo、组织或企业层级，不确定的话先问管理员。

确认没问题，就把 `actions.lock` 和改写过的 workflow 一起提交。官方另外建议把 `.github/workflows/actions.lock` 加进 CODEOWNERS（指定哪些文件要由谁审核的配置文件），并搭配分支保护或 ruleset 要求 code owner 批准。只新增 CODEOWNERS 不会阻挡合并；workflow 与 CODEOWNERS 本身也要保护，否则仍可能移除检查或改用其他 action。

## 步骤 4：日常维护

上锁不是做一次就结束。下面几件事，决定它能不能长期有效。

**改了 `uses:` 就重新执行。** 新增 workflow，或在既有 workflow 增删 action 时，再跑一次 `gh actions-lock`。不要手动改 lockfile。

**Dependabot 会一起更新。** 已上锁的 workflow，Dependabot 开版本更新的 PR 时，会在同一个 PR 里重新生成对应的 lockfile 记录，不需要额外配置。但它只处理已上锁的 workflow：还没上锁的，它照旧只改 workflow 文件，也不会替你把新的 workflow 纳入 lockfile。

**让 CI 检查 lockfile 有没有过期。** `gh actions-lock --verify` 只检查、不改文件；缺少必要锁定记录或验证失败等阻挡性问题，会让检查以错误结束，适合设成 PR 必须通过的检查。gh-actions-lock 的 repo 提供了 [`verify-lockfile.yml` 示例](https://github.com/github/gh-actions-lock/blob/v0.4.1/.github/workflows/verify-lockfile.yml)。下面依它调整，将安装版本指定为本文对照的 v0.4.1，适用于 github.com 的一般 PR 检查：

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

- `on`：每个 PR，以及推到 `main` 时都会检查。
- `permissions: contents: read`：只给读取权限，这个检查不需要改任何东西。
- `persist-credentials: false`：不把 checkout 的 Git 凭据留在后续 Git 配置中。job 仍有 `GH_TOKEN` 供工具查询 GitHub，这不等于整个 job 都没有 token。
- `--pin v0.4.1`：指定扩展的 release tag，方便重现本文使用的版本选择；它不会由 workflow lockfile 替这个下载的二进制工具锁住内容。
- `gh actions-lock --verify`：没有阻挡性错误时回传 0，**仍可能有警告**；有阻挡性问题时回传 1；工具本身出错，例如选项错误、lockfile 读不了或 token 被拒绝，则回传 2。检查通过不等于所有依赖都已审查或没有风险。

README 提醒，把这份文件复制进 repo 之后，要再跑一次 `gh actions-lock`，让这个负责检查的 workflow 自己也上锁。

另外还有 `--verify-local`：不连网，只检查每一行 `uses:` 在 lockfile 里有没有记录，适合提交前快速检查。它不验证来源，不能取代 `--verify`。工具也不会替你修正权限不足、网络错误或 API 限流；遇到这些问题，先修复查询条件，不要把无法验证当成通过。

**GHE.com 的 token 要另外看。** 依 v0.4.1 README，tenant 的 `GITHUB_TOKEN` 不能拿去查公开 github.com action；本地可另外登录 github.com，CI 则根据文档提供仅供公开 repo 查询的 `GH_ACTIONS_LOCK_GITHUB_COM_TOKEN`。不要为了解决限流就授予不必要的写权限。

**标签或分支移动了，看种类处理。** 以下分开说明扩展的检查与维护行为；实际执行 workflow 时，runner 仍会验证锁定记录。依 v0.4.1 故障排除文档，`main`、`v4` 这类参照的 `ref-moved` 警告只出现在 JSON 输出，也不会让结束码变成失败。需要查看这类信息，可执行 `gh actions-lock --verify --json`。

| 你写的参照 | 发生什么 | 怎么做 |
| --- | --- | --- |
| 分支或部分版本，例如 `main`、`v4` | 旧 commit 仍可由上游历史验证时，保留旧锁定；JSON 回报 `ref-moved` 警告 | 看过上游改了什么，要跟上就执行 `gh actions-lock --relock` |
| 完整版本标签，例如 `v3.1.0` | 标签必须指向锁住的 commit，移动了就报错 | 先弄清楚标签为什么被移动，再执行 `gh actions-lock --relock`，或改写 `uses:` 那一行 |
| 历史被改写，例如上游 force push 之后，锁住的 commit 不在历史里了 | 报错，`--relock` 也修不好 | 先排除 lockfile 被误改，再审查上游历史与新 commit；确认要采用后，才执行 `gh actions-lock --accept-moved` |

![标签或分支移动时的三种情况：分支或部分版本、完整版本标签、历史被改写，各自的结果与处理命令](moved-refs.zh-CN.webp){: w="1600" h="900" }
_概念图：三种参照移动的情况与对应命令。第三种的 `--accept-moved` 只能在人工确认后使用，不要放进自动化。_

**`--accept-moved` 接受的是什么？** 它表示你已检查上游历史，愿意信任新的 commit，不是让已无法验证的旧 commit 继续过关。历史被改写可能是正常维护，也可能是供应链攻击或 lockfile 被误改；工具无法替你判断原因，所以先停下来。这个选项只处理 workflow 自己直接引用的依赖；若问题藏在第三方 composite action 里，要升级、替换或停止使用该 action，不能靠同一个旗标全部放行。

`--relock` 也会改变要执行的 commit，仍要审查差异。两个选项都不应被当成“CI 出错就自动补上”的解法；官方尤其明确要求不要在自动化里使用 `--accept-moved`。

**不要删掉 lockfile。** README 提醒，锁住的参照会一直沿用；删掉重新生成，所有参照都会重新解析成“现在指到的 commit”，等于重新相信一次上游。文件坏了，先比较当前、暂存区与可信版本的差异，保存要保留的变更，再从版本控制还原。下面的 `restore` 会覆盖工作目录中的 lockfile，但不会更新暂存区；执行前请确认没有需要保留的未提交内容：

```bash
git fetch origin
git restore --source=origin/main --worktree -- .github/workflows/actions.lock
gh actions-lock
```

默认分支不叫 `main`，请替换第二行的来源分支；重新生成后检查差异，再重新暂存确认过的内容。若可信分支的 lockfile 也已损坏，才考虑备份后重建，并逐项审查所有重新解析的依赖，不能把重建当成一般的排错方式。

## 步骤 5：处理本地 action（`./`）

有些 workflow 会用 repo 自己里面的 action，写成 `uses: ./.github/actions/setup` 这样。这种 `./` 路径跑的是执行机器上当下取出的文件，所以扩展没办法锁住它，也看不到它里面又用了哪些 action。

如果这个本地 action 还用了别的 action，`gh actions-lock` 会回报 `local-action` 错误，而且什么都不写。有两种处理方式：

- **改成 `$/`（建议）：** 执行 `gh actions-lock --migrate-local-actions`，它会把 workflow 和 repo 内 `action.yml` 里的 `uses: ./…` 改写成 `uses: $/…`。`$/` 的意思是“在这个 workflow 所在的 commit，执行 repo 自己的 action”，因此它本身跟着 workflow 的 commit 固定，不需要另外一笔 lockfile entry；它引用的远端 action 则可以记进 lockfile。如果原流程会 checkout 别的 ref，改写就可能改变实际执行内容，不能只当成路径换字。改写后每一行都要看过。
- **保留 `./`：** 改加 `--ignore-local-actions`，只回报警告。代价是：本地 action 若只含 `run:`，或用到的 action 已记在**同一个 workflow** 的锁定清单，就可能正常执行；缺少同一个 workflow 的对应记录时，job 会在那一步失败，错误信息类似 `lockfile missing pin for octo-org/setup-tool@v2.0.0`，而且前面的步骤已经跑过了。

## 进阶：要求每个 workflow 都要上锁

前面的步骤让“已上锁的 workflow”跑锁住的版本，但挡不住有人新增一个没上锁的 workflow。想强制所有 workflow 都上锁，可以用 **Require lockfile** 策略（[说明](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)）：

- 企业、组织或 repo 的管理员可以在 Actions 策略里配置，把它加成 workflow 的执行保护。
- 它有两种状态：**Evaluate** 只记录、不挡（仅限 GitHub Enterprise Cloud）；**Active** 会挡下范围内所有还没上锁的 workflow，包括只有 `run:`、没有 `uses:` 的 workflow，即使同一个 repo 的其他 workflow 已经上锁。
- 改成 Active 之前，先在每个目标 repo 跑过 `gh actions-lock --verify`，或在 Evaluate 状态下查看 Policy insights。
- 开了策略之后，`--verify` 的检查仍然要留著：策略是在执行时挡下没有有效 lockfile 的 workflow；`--verify` 则是在 PR 阶段就提醒作者 lockfile 过期了。
- 组织若已开“action 必须固定到完整 SHA”的策略，它和 Require lockfile 是各自独立的检查，两个都要通过。已上锁的 workflow，就算文件里没写 SHA，也能同时通过两者。

## lockfile 管不到的地方

> 上锁之前，先知道这些限制：
>
> - **reusable workflow 不会被锁：** 在 job 层级用 `jobs.<job_id>.uses` 调用的 reusable workflow（可被其他 workflow 调用的 workflow）不在 lockfile 里，要另外钉完整的 commit SHA；它自己用的 action，由它所在 repo 的 lockfile 负责。开了 Require lockfile 策略时，被调用的 workflow 若没有在自己的 repo 上锁，这次执行会被挡下。
> - **container image 不会被锁：** README 写，`docker://` 步骤、job 的 `container:` 与 `services:`，以及 Docker action 的 image／Dockerfile 基底映像都不锁；没写 `@sha256:` digest 的 image 会被列为警告。
> - **只管 action 的代码：** 传给 action 的输入、secrets、执行机器的系统镜像，以及 `run:`、安装脚本另外下载的内容，都不在它的范围内。锁住 action 不会限制它的文件、网络或 token 权限。
> - **不判断安全：** lockfile 确保跑的是你锁定的那个版本，但不判断那一版有没有问题。上锁前要先审过。
> - **倒退侦测不到：** README 提醒，如果有人在 lockfile 里，把 `v4`、`main` 这类会移动的参照改回它历史上较旧的 commit，工具侦测不到。lockfile 的 diff 要有人看，或改用完整版本标签。
> - **扩展不支持 GitHub Enterprise Server。**
{: .prompt-warning }

## 什么情况怎么做

| 我想… | 怎么做 |
| --- | --- |
| 第一次上锁 | 先开 Dependabot、检查 `uses:`；装好扩展，在 repo 根目录执行 `gh actions-lock`；看懂 diff 再提交 |
| 先只锁一个 workflow | `gh actions-lock .github/workflows/<文件名>.yml` |
| 保留 `@v3` 的写法 | 执行时加 `--no-narrow` |
| 新增或修改了 `uses:` | 再执行一次 `gh actions-lock` |
| 在 PR 检查 lockfile 有没有过期 | 加入 `verify-lockfile.yml` 跑 `gh actions-lock --verify`，并设成必须通过的检查 |
| 收到 `ref-moved` 警告 | 看过上游变更，要跟上就执行 `gh actions-lock --relock` |
| 完整版本标签被移动 | 先弄清楚原因，再 `gh actions-lock --relock` 或改写 `uses:` |
| 锁住的 commit 不在上游历史里 | 人工确认后才 `--accept-moved`，不要放进自动化 |
| 有本地 action（`./`） | `--migrate-local-actions` 改成 `$/` |
| 组织有 action 允许清单 | 改成对应的完整 SHA，或经管理员确认的最小范围通配符 |
| 要求每个 workflow 都上锁 | 管理员配置 Require lockfile 策略；Enterprise Cloud 可以先用 Evaluate 观察，再改成 Active |
| lockfile 坏掉 | 从 git 还原后再执行 `gh actions-lock`，不要删掉重新生成 |

## 常见错误与处理

- **手动改 lockfile：** 扩展会拒绝 `ref` 和 workflow 参照对不上的记录。要改就改 workflow，再重新执行 `gh actions-lock`。
- **上锁后，workflow 被允许清单挡下：** 先确认是否因锁定后改以 SHA 匹配；使用对应的完整 SHA 或经管理员审查的有限范围规则，不要全面放行。
- **出现 `local-action` 错误：** 本地 action 里用了其他 action。用 `--migrate-local-actions` 改成 `$/`，或加 `--ignore-local-actions`，但要承担执行到一半失败的风险。
- **job 跑到一半出现 `lockfile missing pin for …`：** 保留 `./` 的本地 action 用了 lockfile 没记到的 action。改成 `$/` 最省事。
- **新的 workflow 没被 Dependabot 纳入：** Dependabot 不会替你上锁新 workflow，自己执行一次 `gh actions-lock`。
- **Dependabot 更新后 lockfile 没动：** 先确认该 workflow 已纳入管理，再看 PR 差异与 `--verify` 输出。只看文件有没有变动，不能判断这次更新是否完整。
- **在 CI 里自动加 `--accept-moved`：** 拿掉。这正是 lockfile 要拦下的情况。
- **以为 reusable workflow 也锁住了：** 没有，`jobs.<job_id>.uses` 要另外钉完整 SHA。
- **检查成功，却没有看到参照移动警告：** v0.4.1 的部分 `ref-moved` 信息只在 JSON 输出中，且警告不会让结束码失败；用 `--verify --json` 查看。
- **删掉 lockfile 重新生成：** 所有参照会重新解析成现在指到的 commit。改从 git 还原。

## 结论与下一步

`@v3` 是一张可以被移走的贴纸。workflow lockfile 让你保留好读的版本号，同时把“实际跑哪个 commit”记下来交给 GitHub 把关：先开 Dependabot，执行 `gh actions-lock`，看懂 diff 再提交，然后用 `--verify` 让 CI 帮你盯著。标签被移动时，停下来看一眼，不要让自动化替你按下 `--accept-moved`。

负责发布的 workflow 特别值得先锁。[npm Trusted Publishing 配置教程：发包不再放长期 token](/posts/npm-trusted-publishing-github-actions/)拿掉了长期 token，但 workflow 跑的 action 若被换掉，一样能发出有问题的版本。想替同一条 CI 流程加上自动化审查，见[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/posts/github-actions-ai-agent-pr-review/)；更完整的 AI 工作流风险检查，见 [OWASP Agentic Top 10 检查表：AI 工作流十项风险与修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
