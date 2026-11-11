---
title: "让两个 AI 分开工作：用 git worktree 开独立工作目录"
description: "同一个 repo 要让两个 AI 分开干活时，用 git worktree 开出独立工作目录。这篇文章教你怎么开、怎么看、怎么收，以及有 submodule 时为什么不要用。"
date: 2026-11-11 09:00:00 +0800
categories: [AI, 软件开发]
tags: [git, coding-agent, workflow]
media_subpath: /assets/img/posts/git-worktree-parallel-ai-agents/
image:
  path: cover.zh-CN.webp
  alt: "用 git worktree 帮两个 AI 各开一个工作目录，停在自己的分支上干活，做完再收掉。"
---

如果我让两个 coding agent（会自己读文件、改文件、跑命令的 AI 编程助手）在同一个文件夹里各干各的，等于两个人共用一张桌子、一台电脑：一个切换到别的分支（一条独立的修改路线），另一个做到一半的文件就跟着变。更好的做法是让同一个 repo（放项目文件和完整修改历史的仓库）长出第二、第三个工作目录，每个都停在自己的分支上。这就是 [git worktree](https://git-scm.com/docs/git-worktree) 做的事。

本文只谈怎么把工作目录隔开，以及做完怎么收尾，不比较各家 AI 工具。若你在想“一次让多个 AI 并行做事”在流程上是什么意思，请看[AI 写代码更快了，产品为什么还是交付不了？我如何理解 AI 原生开发流程](/zh-CN/posts/ai-native-sdlc-playbook/)。

> **版本说明**：本文依据 2026-11-11 读取的 git-scm.com [git-worktree 手册](https://git-scm.com/docs/git-worktree)（Git 2.56.0 版）撰写；git worktree 的多重 checkout 官方仍标记为实验性，之后行为可能改变，以手册为准。
{: .prompt-info }

## worktree 是什么

工作目录（working tree）是你实际打开、编辑文件的那个文件夹。git 把“一个工作目录，加上它自己的 HEAD（标明我现在在哪个分支、哪个 commit）等数据”合称为 worktree。你用 `git clone` 或 `git init` 得到的第一个，叫 main worktree（主工作目录）；之后用 `git worktree add` 加出来的，叫 linked worktree。一个不是裸仓库的 repo，会有一个主工作目录，以及零个或多个 linked worktree。[手册的说明段](https://git-scm.com/docs/git-worktree#_description)就是这样定义的。

这些工作目录[共用几乎所有东西](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)，只把每个 worktree 自己的文件分开，例如 HEAD 和暂存区（index，也就是 `git add` 之后、commit 之前放东西的地方）：

- 共用：commit 历史、分支、标签、stash（把还没 commit 的修改先收起来的机制），以及默认的 repo 配置。
- 各自：文件夹里实际的文件、当前停在哪个分支、各自的暂存区。

所以你在一个工作目录里新增一个 commit，其他工作目录立刻都看得到这段历史；但两边桌上的文件不会自动变成同一份。

![每个工作目录有自己的文件和当前位置，但共用同一份历史记录和分支](shared-core.zh-CN.webp){: w="1600" h="900" }
_概念图，不是实际界面。上方是所有工作目录共用的历史记录、分支、stash 和设置；下方每个工作目录各有自己的文件、HEAD 和暂存区。_

还有一件实现上的事情要知道：linked worktree 顶层的 `.git` [不是一个完整的文件夹，而是一个小文件](https://git-scm.com/docs/git-worktree#_details)，指向主 repo 里的管理数据。不要把它当成独立的 repo 去复制，也不要删掉这个 `.git` 文件。

> **进阶：** 若你希望某个 worktree 有自己的配置，例如不同的 `user.email`，可先执行 `git config extensions.worktreeConfig true`，再用 `git config --worktree` 写入。[手册提醒](https://git-scm.com/docs/git-worktree#_configuration_file)：旧版 Git 会拒绝读取开启了这个扩展的 repo。一般情况用共用的配置就够了。
{: .prompt-tip }

## 什么时候该用、什么时候不用

适合使用 worktree 的情况大致有三种：

- 想同时让两个 AI（或你和一个 AI）各做一件事，而且不要改到同一批文件。
- 手上已经改到一半，暂时不想用 stash 把修改收起来，却又要去修一件急事。这是[手册举的官方场景](https://git-scm.com/docs/git-worktree#_examples)。
- 只想在一个用完就丢的干净文件夹里跑测试或试东西。这时可用稍后会提到的 `-d`。

不需要 worktree 的情况：一次只做一件事，或改动很小、切换分支就够了。这些是使用上的建议，不是手册里的硬性规定。

有一种情况则明确不适合。submodule 是把另一个 repo 当成子文件夹挂进来的做法；挂着这些子 repo 的外层，手册称为 superproject。

> **有 submodule 的 repo，不要用这个方法并行开发。** [官方手册的 BUGS 段](https://git-scm.com/docs/git-worktree#_bugs)写道：
>
> Multiple checkout in general is still experimental, and the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject.
>
> 翻译：多重 checkout 总体上仍属实验性质，对 submodule 的支持也不完整。不建议对 superproject 做多重 checkout。
{: .prompt-warning }

## 步骤 1：开一个新的工作目录

建议把新的 worktree 放在 repo 文件夹**旁边**，例如 `../myapp-login`，不要放在 repo 里面。这是为了避免它被当成项目里的普通文件，不是手册规定的路径。

最常用的写法，是一边开新分支、一边开新文件夹。新分支默认从当前的 HEAD 开始；若要指定起点，把分支名写在最后：

```bash
git worktree add -b feature-login ../myapp-login
git worktree add -b fix-typo ../myapp-typo main
```

如果只给路径，git 会[自动用文件夹的最后一段作为新分支名](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)。例如 `git worktree add ../hotfix` 会创建名为 `hotfix` 的分支。

若分支已经存在，只要它还没在别的 worktree 里被 checkout（把某个分支或 commit 的文件内容放到文件夹里让你编辑），可以这样接手：

```bash
git worktree add ../myapp-login feature-login
```

只是想试试看、不想开新分支，可用 `-d`，让新文件夹处于 detached HEAD（不在任何分支上、直接停在某个 commit）的状态：

```bash
git worktree add -d ../myapp-try
```

`-b` 遇到已经存在的分支会拒绝创建。`-B` 则会把那个分支**重置**到你指定的起点。这会让该分支原来指向的位置被改掉，请谨慎使用。

然后进入新文件夹工作：

```bash
cd ../myapp-login
```

在这里打开任何 coding agent、照常 commit 就可以。新文件夹里只有被 git 跟踪的文件；像 `node_modules`、`.env` 这类没被跟踪的东西，需要重新安装，或自己复制过来。

**你会得到：** 一个独立的文件夹，停在自己的分支上，和原来的工作目录互不干扰。

## 同一个分支一次只能在一个地方

[手册写明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)：如果某个分支已经在别的 worktree 被 checkout，再对它执行 `add` 会被拒绝，除非加上 `--force`。这是保护，避免两个文件夹同时改同一条分支。**不建议用 `--force` 绕过。**

顺便提一下（这是一般的 git 行为）：主文件夹也不能再 `git checkout` 已被其他 worktree 占用的分支；那条被占用的分支也删不掉，要先把对应的 worktree 移除。

![同一个分支已经在一个工作目录里，另一个工作目录就不能再用它](one-branch-one-place.zh-CN.webp){: w="1600" h="900" }
_概念图，不是实际界面。左边的工作目录已经占用了这条分支，右边再想用同一条时会被挡住。_

## 步骤 2：看当前有哪些

想知道现在开了几个工作目录，执行：

```bash
git worktree list
```

[手册说明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-list)：主 worktree 会排在第一行，接着是每一个 linked worktree。每一行会有路径、当前的 commit，以及所在分支（若没有分支，会标示 detached HEAD）。被锁住的会标 `locked`，可以清理的会标 `prunable`。

若要看锁定或可清理的原因，加上 `-v`，原因会显示在下一行：

```bash
git worktree list -v
```

若要写脚本解析这份列表，可用 `git worktree list --porcelain`。手册说这个格式跨版本稳定，并建议搭配 `-z`，以免路径里若有换行符时不好拆分。

**你会得到：** 一份当前所有工作目录的列表，包含各自停在哪里。

## 实际场景：登录页和一处错字

假设有一个网站 repo，文件夹叫 `myapp`。我想让一个 AI 做登录页，另一个修 README 里的错字，两边不要碰到对方的文件。

1. 先在 `myapp` 里更新主分支：`git switch main`，再 `git pull`。
2. 从 `main` 各开一条新分支、各开一个文件夹：

```bash
git worktree add -b feature-login ../myapp-login main
git worktree add -b fix-typo ../myapp-typo main
```

**这一步你会得到：** 两个新文件夹，分别停在 `feature-login` 和 `fix-typo`。

3. 打开两个终端，分别进入 `../myapp-login` 和 `../myapp-typo`，各开一个 coding agent，各自 commit。两边的文件互不影响。执行 `git worktree list`，应该会看到三个文件夹：原来的 `myapp`，加上这两个新的。
4. 审查时，把每个分支各自推上去开 PR（pull request，请求把分支合并进主分支）：

```bash
git push -u origin feature-login
```

另一条分支同样处理。之后可以让审查自动跑起来，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)；若想对“谁来看结构、审修改”有一套固定做法，请看 [mattpocock/skills 系列（5）：代码写完之后，谁来看结构、审修改、解冲突](/zh-CN/posts/mattpocock-skills-design-review-integration/)。也可以先在本机的主文件夹查看差异：`git diff main...feature-login`。

5. 合并：等 PR 合并，或在主文件夹里自己 `git merge`。
6. 收尾：先移除工作目录，再删除分支。

```bash
git worktree remove ../myapp-login
git branch -d feature-login
git worktree remove ../myapp-typo
git branch -d fix-typo
```

最后再执行 `git worktree list`，应该只剩主文件夹。

小提醒：如果项目的规则写在 AGENTS.md，而且这份文件有被 git 跟踪，每个 worktree 都会有同一份，请看[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)。若还想在某个工作目录里做固定时机的自动检查，请看[把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒](/zh-CN/posts/claude-code-hooks-automate-checks/)。

## 步骤 3：收尾

做完以后，用移除命令收掉 linked worktree：

```bash
git worktree remove ../myapp-login
```

[手册规定](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-remove)：只有干净的 worktree（没有未跟踪文件，被跟踪的文件也没有修改）才能移除；还有东西没处理时会被拒绝。确定不要了，才加上 `--force`。主 worktree 不能移除。

`remove` 只去掉文件夹和 worktree 的记录，**分支还在**。记得另外执行 `git branch -d <分支>`。

如果不小心用 `rm -rf` 或把文件夹扔进回收站，`git worktree list` 可能会把那一条标成 `prunable`。请先预览会清掉什么，再真正清理：

```bash
git worktree prune -n -v
git worktree prune
```

[prune 的说明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-prune)是：清掉已经不见的工作目录所留下的管理数据。手册也说，下次请改用 `git worktree remove`。prune 同样不会删除分支。

若你什么都不做，之后执行 `git gc` 时，git 会调用 `git worktree prune --expire 3.months.ago`。宽限期可用配置项 [`gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire) 调整，也可以设成 `now` 或 `never`。

![做完的工作目录用 remove 收掉，被手动删掉的用 prune 清记录，上锁的不会被清](cleanup.zh-CN.webp){: w="1600" h="900" }
_概念图，不是实际界面。做完的工作目录可以收掉，只留下记录的用 prune 清理；有上锁的会留着。_

## 保护：lock 与 unlock

若 worktree 放在便携设备或网络共享上，不一定随时挂载，可以把它锁住，以免管理数据被自动清掉。锁住之后，也不能 move 或 remove。

```bash
git worktree lock --reason "放在外接硬盘" ../myapp-usb
```

也可以在创建时就锁上，这样中间没有空窗：

```bash
git worktree add --lock --reason "放在外接硬盘" -b feature-usb ../myapp-usb
```

执行 `git worktree list -v` 可以看到锁定原因。用完后再解开：

```bash
git worktree unlock ../myapp-usb
```

手册提供了连续两次 `--force` 来强制处理已锁定的 worktree，但建议先 `unlock`，不要一开始就强行删除。

## 搬家：move 与 repair

要用 git 自己搬位置：

```bash
git worktree move ../myapp-typo ../tasks/myapp-typo
```

[手册注明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-move)：主 worktree，或含有 submodule 的 linked worktree，不能用这条命令搬。

如果已经用文件资源管理器或 `mv` 搬走了，到搬过去的那个 worktree 里执行 `git worktree repair`。若一次搬了多个，在任一处把新路径都传进去：

```bash
git worktree repair ../tasks/myapp-typo ../tasks/myapp-login
```

若搬走的是主文件夹，就在主文件夹里执行 `git worktree repair`，让各个 linked worktree 重新指回来。

## 什么情况用什么

| 我想… | 用这个 |
| --- | --- |
| 开新任务、新分支 | `git worktree add -b <分支> <路径> [起点]` |
| 在新文件夹接手已存在的分支 | `git worktree add <路径> <分支>` |
| 只想试试看、不开分支 | `git worktree add -d <路径>` |
| 看现在有哪些 | `git worktree list`（细节 `-v`，脚本 `--porcelain -z`） |
| 做完收掉 | `git worktree remove <路径>`，再 `git branch -d <分支>` |
| 文件夹被手动删了 | `git worktree prune`（先 `-n -v`） |
| 放在外接硬盘、怕被清 | `git worktree lock --reason "…" <路径>`／`unlock` |
| 换位置 | `git worktree move`；已手动搬就 `git worktree repair` |
| 每个文件夹不同配置 | `extensions.worktreeConfig` 加上 `git config --worktree` |
| repo 有 submodule | 不要用 worktree 并行开发 |
| 只做一件事 | 不需要 worktree，切换分支就好 |

## 常见错误

- 两个 worktree 想用同一个分支，结果被拒绝。请各开一条分支。
- 用 `rm -rf` 删文件夹，而不是 `git worktree remove`。留下的记录再用 `git worktree prune` 清理。
- `remove` 之后忘了删除分支，分支仍留在 repo 里。
- 以为新文件夹会自动带有 `node_modules` 或 `.env`。没被跟踪的文件要自己补。
- 把 worktree 开在 repo 文件夹里面，之后容易和项目文件混在一起。
- 用文件资源管理器搬走之后，git 找不到它。到新位置执行 `git worktree repair`。
- 有 submodule 的 repo 仍然强行使用。请回到前面的限制说明。
- 一看到拒绝就加 `--force`。这可能让未提交的修改被丢掉，或绕过“同一条分支只能在一个地方”的保护。

## 结论与下一步

下次要让两个 AI 同时动手，先用 `git worktree add -b` 各开一个文件夹，做完再 `git worktree remove`，并记得删除用完的分支。repo 里若有 submodule，就别用这个方法。

接下来，可以给每个工作目录里的 AI 写好项目规则，请看[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/zh-CN/posts/agents-md-project-rules-for-coding-agents/)；若要把审查自动化，请看[用 GitHub Actions 加 AI Agent 自动化审查：以本站 PR 为例](/zh-CN/posts/github-actions-ai-agent-pr-review/)。命令的细节以 [git-worktree 手册](https://git-scm.com/docs/git-worktree)为准，自动清理的宽限期见 [git-config 中的 `gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire)。
