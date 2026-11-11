---
title: "Let Two AI Agents Work Separately: Isolated Working Directories With git worktree"
description: "How to give two AI agents their own git worktree, how to list and remove them, and why this does not suit a repo that uses submodules."
date: 2026-11-11 09:00:00 +0800
categories: [AI, Software Development]
tags: [git, coding-agent, workflow]
media_subpath: /assets/img/posts/git-worktree-parallel-ai-agents/
image:
  path: cover.en.webp
  alt: "Give two AI agents separate git worktrees so each can work on its own branch, then clean up when done."
---

If I let two coding agents (AI assistants that can read files, edit them, and run commands) work on different tasks in the same folder, it is like two people sharing one desk and one computer: when one switches to another branch (a separate line of work), the files the other person is halfway through change as well. A better approach is to let the same repo (the place that holds the project files and the full history of changes) grow a second or third working directory, each checked out on its own branch. That is what [git worktree](https://git-scm.com/docs/git-worktree) is for.

This post is only about isolating those working directories and cleaning them up afterward. It does not compare AI tools. If you are thinking about what it means, in a process sense, to let several AI agents work in parallel, see [AI Writes Code Faster. Why Is Shipping Still Slow? How I Think About an AI-Native SDLC](/en/posts/ai-native-sdlc-playbook/).

> **Version note:** This post follows the git-scm.com [git-worktree manual](https://git-scm.com/docs/git-worktree) (the Git 2.56.0 edition), read on 2026-11-11. Multiple checkout with git worktree is still marked experimental, and later behavior may change; treat the manual as the source of truth.
{: .prompt-info }

## What a Worktree Is

A working directory (also called a working tree) is the folder whose files you actually open and edit. Git calls that folder, together with its own HEAD (the pointer that says which branch or commit you are on) and related metadata, a worktree. The first one, created by `git clone` or `git init`, is the main worktree. Any extra one you add with `git worktree add` is a linked worktree. A non-bare repository has one main worktree and zero or more linked worktrees. That is the wording in the [manual's description](https://git-scm.com/docs/git-worktree#_description).

These worktrees [share almost everything](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish), except the per-worktree files such as HEAD and the index (the staging area, where changes sit after `git add` and before you commit):

- Shared: the commit history, branches, tags, the stash (a way to set unfinished changes aside), and, by default, the repository configuration.
- Separate: the files in each folder, which branch that folder is on, and each folder's own index.

So a new commit made in one worktree is immediately visible in the others, but the files on each desk do not automatically become the same copy.

![Each worktree has its own files and its own HEAD, while all of them share one history and one set of branches](shared-core.en.webp){: w="1600" h="900" }
_A concept illustration, not the real UI. At the top is what every worktree shares: history, branches, stashes, and config. Below, each worktree has its own files, HEAD, and staging area (index)._

One implementation detail matters in practice: the `.git` at the top of a linked worktree [is a small file, not a full directory](https://git-scm.com/docs/git-worktree#_details). It points back at administrative data in the main repository. Do not treat that folder as a standalone repo, and do not delete the `.git` file.

> **Advanced:** If you want one worktree to have its own settings, such as a different `user.email`, run `git config extensions.worktreeConfig true`, then write values with `git config --worktree`. The [manual notes](https://git-scm.com/docs/git-worktree#_configuration_file) that older Git versions will refuse to open a repository with this extension enabled. Shared configuration is enough in most cases.
{: .prompt-tip }

## When to Use It, and When Not To

Worktrees are a good fit in three situations:

- You want two AI agents (or you and one agent) to work on separate tasks without editing the same files.
- You are halfway through a change, you do not want to stash that work, and you still need to fix something urgent. That is the [official example in the manual](https://git-scm.com/docs/git-worktree#_examples).
- You want a throwaway, clean folder for tests or experiments. In that case, use the `-d` option described later.

You do not need a worktree when you are doing only one thing, or when the change is small enough that switching branches is enough. Those are practical suggestions, not hard rules from the manual.

One case is clearly a poor fit. A submodule is another repository nested as a subdirectory; the outer repository that holds it is what the manual calls a superproject.

> **Do not use this method for parallel work in a repository that has submodules.** The [BUGS section of the official manual](https://git-scm.com/docs/git-worktree#_bugs) says:
>
> Multiple checkout in general is still experimental, and the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject.
{: .prompt-warning }

## Step 1: Add a New Working Directory

I suggest putting the new worktree **beside** the repository folder, for example `../myapp-login`, not inside it. That is to keep it from being treated as ordinary project files, not a path required by the manual.

The most common form creates a new branch and a new folder at the same time. The new branch starts at the current HEAD by default; to choose a starting point, put that name last:

```bash
git worktree add -b feature-login ../myapp-login
git worktree add -b fix-typo ../myapp-typo main
```

If you pass only a path, Git [automatically names the new branch after the last path component](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish). For example, `git worktree add ../hotfix` creates a branch called `hotfix`.

If the branch already exists, and it is not already checked out in another worktree (checkout means placing that branch's files in a folder so you can edit them), you can attach it like this:

```bash
git worktree add ../myapp-login feature-login
```

If you only want to try something and do not want a new branch, use `-d`. The new folder then has a detached HEAD: it is not on any branch, and it sits directly on a commit.

```bash
git worktree add -d ../myapp-try
```

`-b` refuses to create a branch that already exists. `-B` **resets** that branch to the starting point you give it, which moves the branch away from wherever it pointed before. Use that option with care.

Then go into the new folder to work:

```bash
cd ../myapp-login
```

Open any coding agent there and commit as usual. The new folder contains only files that Git tracks. Untracked things such as `node_modules` or `.env` need to be installed again, or copied over yourself.

**What you get:** a separate folder, on its own branch, that does not interfere with the original working directory.

## One Branch Can Live in Only One Place

The [manual states](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish) that if a branch is already checked out in another worktree, `add` will refuse to use it, unless you pass `--force`. That safeguard stops two folders from editing the same branch at once. **I do not recommend bypassing it with `--force`.**

As a related point of ordinary Git behavior: the main folder also cannot `git checkout` a branch that another worktree already holds, and you cannot delete that branch until you remove the worktree that is using it.

![Once a branch is checked out in one worktree, another worktree can't check it out too](one-branch-one-place.en.webp){: w="1600" h="900" }
_A concept illustration, not the real UI. The worktree on the left already holds the branch, so the one on the right is blocked from using it._

## Step 2: List the Worktrees You Have

To see how many working directories are open, run:

```bash
git worktree list
```

According to the [manual](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-list), the main worktree is listed first, followed by each linked worktree. Each line includes the path, the current commit, and the branch (or detached HEAD if there is no branch). A locked worktree is marked `locked`; one that can be cleaned up is marked `prunable`.

To see why a worktree is locked or prunable, add `-v`. The reason appears on the following line:

```bash
git worktree list -v
```

If you need to parse the list in a script, use `git worktree list --porcelain`. The manual says this format stays stable across Git versions, and it recommends combining it with `-z` so a path that contains a newline is still parseable.

**What you get:** a list of every working directory, and where each one is checked out.

## A Worked Example: A Login Page and a Typo Fix

Suppose I have a website repository in a folder called `myapp`. I want one AI agent to build a login page, and another to fix a typo in the README, without either one touching the other's files.

1. In `myapp`, update the main branch first: `git switch main`, then `git pull`.
2. From `main`, create one new branch and one new folder for each task:

```bash
git worktree add -b feature-login ../myapp-login main
git worktree add -b fix-typo ../myapp-typo main
```

**What this step gives you:** two new folders, checked out on `feature-login` and `fix-typo`.

3. Open two terminals, enter `../myapp-login` and `../myapp-typo`, and start one coding agent in each. Commit in each folder as usual. The files do not affect each other. After `git worktree list`, you should see three folders: the original `myapp`, plus these two new ones.
4. For review, push each branch and open a PR (a pull request, asking to merge the branch into the main line):

```bash
git push -u origin feature-login
```

Do the same for the other branch. You can then automate the review; see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/en/posts/github-actions-ai-agent-pr-review/). For a fixed approach to structure checks, review, and merge conflicts, see [mattpocock/skills, Part 5: Structure, Code Review, and Merge Conflicts](/en/posts/mattpocock-skills-design-review-integration/). You can also inspect the difference locally from the main folder with `git diff main...feature-login`.

5. Merge: wait for the PR to merge, or run `git merge` yourself in the main folder.
6. Clean up: remove the worktrees first, then delete the branches.

```bash
git worktree remove ../myapp-login
git branch -d feature-login
git worktree remove ../myapp-typo
git branch -d fix-typo
```

After a final `git worktree list`, only the main folder should remain.

A small note: if the project rules live in an AGENTS.md that Git tracks, every worktree will have the same copy. See [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/en/posts/agents-md-project-rules-for-coding-agents/). If you also want automatic checks at fixed moments in a working directory, see [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/en/posts/claude-code-hooks-automate-checks/).

## Step 3: Clean Up With remove and prune

When the work is done, remove the linked worktree:

```bash
git worktree remove ../myapp-login
```

The [manual requires](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-remove) that only a clean worktree can be removed: there must be no untracked files, and no modifications in tracked files. If something is still outstanding, the command refuses. Add `--force` only when you are sure you do not need what is left. The main worktree cannot be removed.

`remove` deletes the folder and the worktree record. **The branch remains.** Remember to run `git branch -d <branch>` separately.

If you accidentally delete the folder with `rm -rf` or by putting it in the trash, `git worktree list` may mark that entry `prunable`. Preview what will be cleaned, then prune:

```bash
git worktree prune -n -v
git worktree prune
```

The [prune description](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-prune) says this removes administrative data left behind by missing working trees. The manual also asks you to use `git worktree remove` next time. prune does not delete branches either.

If you do nothing, a later `git gc` will run `git worktree prune --expire 3.months.ago`. You can change that grace period with [`gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire), including the values `now` and `never`.

![Remove finished worktrees, prune records left by deleted folders, and locked worktrees stay put](cleanup.en.webp){: w="1600" h="900" }
_A concept illustration, not the real UI. Finished worktrees can be removed; leftover records from a manual delete are pruned; a locked worktree is left alone._

## Protect a Worktree With lock and unlock

If a worktree lives on a portable drive or a network share that is not always mounted, lock it so its administrative files are not pruned automatically. A locked worktree also cannot be moved or removed.

```bash
git worktree lock --reason "on an external drive" ../myapp-usb
```

You can also lock it at creation time, so there is no gap in between:

```bash
git worktree add --lock --reason "on an external drive" -b feature-usb ../myapp-usb
```

`git worktree list -v` shows the lock reason. When you are done, unlock it:

```bash
git worktree unlock ../myapp-usb
```

The manual allows `--force` twice to operate on a locked worktree, but the safer step is to `unlock` first, rather than forcing a deletion from the start.

## How to Move or Repair a Worktree

To let Git move the folder:

```bash
git worktree move ../myapp-typo ../tasks/myapp-typo
```

The [manual notes](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-move) that you cannot use this command on the main worktree, or on a linked worktree that contains submodules.

If you already moved it in the file manager or with `mv`, run `git worktree repair` inside the worktree at its new location. If you moved several, pass every new path from any one of them:

```bash
git worktree repair ../tasks/myapp-typo ../tasks/myapp-login
```

If it was the main folder that moved, run `git worktree repair` in the main folder, so the linked worktrees can point back to it.

## Which Command to Use in Each Situation

| I want to… | Use this |
| --- | --- |
| Start a new task on a new branch | `git worktree add -b <branch> <path> [start-point]` |
| Check out an existing branch in a new folder | `git worktree add <path> <branch>` |
| Try something without creating a branch | `git worktree add -d <path>` |
| See what is open | `git worktree list` (`-v` for details, `--porcelain -z` for scripts) |
| Clean up when finished | `git worktree remove <path>`, then `git branch -d <branch>` |
| Recover after a manual folder delete | `git worktree prune` (dry-run with `-n -v` first) |
| Keep a worktree on an external drive from being pruned | `git worktree lock --reason "…" <path>` / `unlock` |
| Change its location | `git worktree move`; if you already moved it, `git worktree repair` |
| Give each folder different settings | `extensions.worktreeConfig` plus `git config --worktree` |
| Work in a repo that has submodules | Do not use worktrees for parallel development |
| Do only one thing | You do not need a worktree; switch branches |

## Common Mistakes

- Trying to use the same branch in two worktrees, then hitting a refusal. Create one branch for each.
- Deleting the folder with `rm -rf` instead of `git worktree remove`. Clean the leftover record with `git worktree prune`.
- Forgetting to delete the branch after `remove`, so it stays in the repository.
- Expecting `node_modules` or `.env` to appear automatically in the new folder. Copy or reinstall untracked files yourself.
- Creating the worktree inside the repository folder, where it can get mixed up with project files.
- Moving the folder in a file manager, after which Git cannot find it. Run `git worktree repair` at the new path.
- Pushing ahead in a repository that has submodules. See the limitation above.
- Adding `--force` as soon as a command refuses. That can discard uncommitted work, or bypass the rule that a branch may be checked out in only one place.

## What to Do Next

The next time two AI agents need to work at once, start with `git worktree add -b` so each gets its own folder. When the work is done, run `git worktree remove`, and delete the branches you no longer need. If the repository has submodules, skip this approach.

From there, you can write project rules for the agent in each working directory; see [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/en/posts/agents-md-project-rules-for-coding-agents/). To automate review, see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/en/posts/github-actions-ai-agent-pr-review/). For command details, use the [git-worktree manual](https://git-scm.com/docs/git-worktree). The grace period for automatic cleanup is documented under [`gc.worktreePruneExpire` in git-config](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire).
