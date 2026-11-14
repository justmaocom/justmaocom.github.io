---
title: "gh actions-lock Tutorial: Pin GitHub Actions Dependencies With a Lockfile"
description: "A workflow that says @v3 can run different code when that tag moves. This post explains how GitHub workflow lockfiles work, then walks through locking, reviewing the diff, and day-to-day upkeep with gh actions-lock."
date: 2026-11-14 18:32:00 +0800
categories: [Security, Supply Chain]
tags: [supply-chain-security, github-actions, ci, dependabot, gh-actions-lock]
media_subpath: /assets/img/posts/gh-actions-lock-workflow-lockfile/
image:
  path: cover.en.webp
  alt: "Record intended action commits in actions.lock so a moved tag cannot silently select different code."
---

A workflow line such as `uses: actions/checkout@v7` looks like a simple choice of version 7. In practice, it runs the commit the `v7` tag currently points to. Move that upstream tag, and the code can change without any edits to your workflow.

GitHub introduced workflow lockfiles on 2026-10-28. `gh actions-lock` resolves supported actions to exact commits and records them in `.github/workflows/actions.lock`; onboarded workflows then use those records. You can keep readable version names while making the actual code part of the review. Generating the lockfile does not perform that security review for you.

A few terms first:

- **GitHub Actions**: GitHub's built-in automation service. Push code, and it can run tests, builds, and deployments for you.
- **repo** (repository): where a project's code lives on GitHub.
- **workflow**: a YAML file in the repo's `.github/workflows/` folder that says what to automate.
- **action**: a reusable, ready-made step inside a workflow, such as `actions/checkout`, which checks out your code. A workflow picks an action and its version with a `uses:` line.
- **commit and SHA**: a commit is a snapshot of the code at one point in time. A SHA is the commit's unique ID, a long string of letters and digits. Change a single character and the ID changes.
- **tag**: a friendly name for a commit, such as `v3.1.0`. A tag is like a sticker: it can be peeled off and stuck onto a different commit.
- **lockfile**: a file that records exactly which version of each dependency to use. If you have written JavaScript, `package-lock.json` is the same idea.
- **Dependabot**: GitHub's built-in bot. When a dependency has a new version, it opens a PR (a request to merge changes) to update it.
- **gh**: GitHub's official command-line tool (GitHub CLI). `gh actions-lock` is an extension for it.

This post is about one supply chain risk: an action someone else wrote gets swapped out. [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/) briefly recommends locking third-party actions with a lockfile under ASI04 (supply chain). This post walks through how to do it.

> **Version note**: This post is based on GitHub's official material as read on 2026-11-13: the [GA announcement](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/), [Locking action dependencies in a repository's workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies), [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles), and the [gh-actions-lock v0.4.1 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md) and [troubleshooting guide](https://github.com/github/gh-actions-lock/blob/v0.4.1/docs/troubleshooting.md). This post does not report hands-on locking results. The tool keeps changing; check commands and options against `gh actions-lock --help` for your installed version.
{: .prompt-info }

## Why `@v3` may not be the version you reviewed

`uses: octo-org/deploy-action@v3` looks like "use version 3," but it really means "use whatever commit the `v3` sticker is on right now." Anyone authorized to update that tag can move the sticker; upstream tag protections may restrict who has that authority. Normally that is how authors ship releases: `v3` follows the latest 3.x. But if an author's account is compromised, an attacker can use the same move to stick the tag onto a commit with malicious code. Your workflow did not change by a single line, yet the next run executes someone else's code.

This has really happened. In March 2025, the widely used `tj-actions/changed-files` action was hit. According to the [GitHub security advisory](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3), attackers retroactively changed several version tags to point at the same malicious commit. That code printed CI secrets (tokens, keys, and so on) into the workflow logs. The advisory gives the affected window as March 14 to 15, 2025, and says over 23,000 repositories used the action. The US agency CISA also issued an [alert](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction) about the incident (CVE-2025-30066).

The usual defense used to be pinning each action to its full commit SHA. This site's deploy workflow does exactly that:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```
{: .nolineno }

A full SHA avoids following a moved tag, but does not establish that the commit is safe. It also has a readability cost. You cannot tell the version from the long ID, so you rely on the comment at the end of the line. The comment can drift out of sync with the SHA, and every update has to change both. Workflow lockfiles take a different approach: the workflow keeps a readable version such as `@v7.0.1`, and the SHA lives in the lockfile instead. The [official docs](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) put it plainly: for actions already onboarded to the lockfile, the file can pin their SHAs instead of putting a SHA on every line. That is not a reason to remove existing pins before onboarding, review, and verification are complete.

## What a workflow lockfile is and how it works

In one sentence: the lockfile is `.github/workflows/actions.lock`, a file that records which commit each action in each workflow resolved to, and GitHub runs what it says.

`gh actions-lock` generates it, and you should not edit it by hand. Each action gets these fields:

- `ref`: the tag or branch the commit was resolved from, such as `v3.1.0`.
- `commit`: the commit it resolved to, which is **the code that will actually run**.
- `owner_id` and `repo_id`: numeric IDs for the source repo. At run time they confirm that the name still belongs to the repo you locked.

It covers more than the actions in your own `uses:` lines. According to the [GA announcement](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/), the actions that those actions use (transitive dependencies) are locked too.

Once a workflow is added to the lockfile (GitHub calls this "onboarding"; this post calls it "locking"), the [concepts page](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) lists three rules at run time:

1. Every action the workflow uses must be in the lockfile.
2. The commit recorded in the lockfile runs, not whatever the tag points to now.
3. That commit must be reachable from the recorded tag or branch in the action's own repo. A commit that exists only in a fork (someone else's copy of the repo), or that is no longer in that tag's history, is rejected when the workflow runs.

So when a tag moves, the workflow either keeps running the locked version or is blocked outright. It never quietly switches to new code.

![Without a lockfile, a moved tag means running the swapped-in code; with a lockfile, the locked commit still runs](tag-vs-lock.en.webp){: w="1600" h="900" }
_Diagram: the same `uses: octo-org/deploy-action@v3` line. On the left there is no lockfile, so the run follows the tag. On the right there is a lockfile, so the locked commit runs, and if that commit is no longer in the tag's history, the run is blocked._

**Who can use it:** The GA announcement lists GitHub Enterprise Cloud (including data residency), Team, and Free. At the time of writing, however, the setup and policy guides still label their availability as Enterprise Cloud. Go by the features and policy settings your repository actually offers, and do not assume that being able to generate the file means your runs are protected. For the extension, the [v0.4.1 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md) lists support for github.com and GHE.com, but not GitHub Enterprise Server.

**One thing to be clear about:** a lockfile decides *which* version runs, not whether that version is safe. GitHub says to review dependencies before you lock them. If the version you lock is already bad, the lockfile will faithfully keep running it.

## Step 0: Get these ready

- **Install and sign in to GitHub CLI:** Install it from the [GitHub CLI site](https://cli.github.com/), then sign in with `gh auth login`. The extension needs an authenticated `gh`.
- **Have write access to the repo:** The docs say write access is enough to create the lockfile. You do not need admin rights.
- **Save existing changes and use a working branch:** The tool modifies workflows and the lockfile. Check `git status --short` first. If you want a report first, run the read-only `gh actions-lock --no-fix` after installing the tool.
- **Turn on Dependabot first:** GitHub recommends letting Dependabot manage your GitHub Actions versions before you create the lockfile. The basic configuration is below. If `.github/dependabot.yml` already exists, merge this update entry into it rather than replacing the entire file:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- **Check every `uses:` line:** Make sure each one points to a current, maintained version. The lockfile locks what you wrote; an old version stays old once it is locked.
- **Find out whether you have an action allowlist:** Some organizations only allow specific actions. Locking changes how that list is matched; Step 3 explains.

## Step 1: Install gh-actions-lock

```bash
gh extension install github/gh-actions-lock
```
{: .nolineno }

This installs the latest release available at installation time; this post follows v0.4.1. To stay on that release, add `--pin v0.4.1` when installing. Note that this selects a release tag, not a full commit SHA, and it says nothing about whether the tool is safe; you still need to verify where it comes from. An unpinned installation can later be upgraded with:

```bash
gh extension upgrade gh-actions-lock
```
{: .nolineno }

After installing, read `gh actions-lock --help` once. The README says it is the authoritative list of options.

## Step 2: Generate the lockfile

From the root of the repo, run:

```bash
gh actions-lock
```
{: .nolineno }

It scans every workflow under `.github/workflows/`, pins each action it can resolve to a commit, and writes `.github/workflows/actions.lock`.

If you do not want to lock everything at once, you can lock a single workflow:

```bash
gh actions-lock .github/workflows/ci.yml
```
{: .nolineno }

GitHub actually recommends adding workflows one at a time. Note that only a run over the whole directory removes entries for workflows you have deleted.

## Step 3: Read the diff before you commit

Start with `git status --short` to find modified and new files, then use `git diff -- .github/workflows/` for tracked changes. **A new, untracked `actions.lock` does not appear in a normal `git diff`.** Open it directly, or stage it and inspect `git diff --cached`. There are two main changes to review.

**First: `uses:` lines in your workflows become more specific.** For example, `octo-org/deploy-action@v3` may become `octo-org/deploy-action@v3.1.0`. When a corresponding full version tag is available, this makes the name more specific without changing the resolved commit. It is not an automatic upgrade to a different release. To keep `@v3` as written, pass `--no-narrow`.

**Second: a new `actions.lock`.** It opens with a few comment lines saying the file is generated and should not be edited by hand. The rest looks roughly like this (values are made up):

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

`version` is the lockfile format version, not the extension version. `workflows` lists which actions each workflow uses. `dependencies` records the commit each action resolved to. When reviewing, look for two things:

- **A changed `commit`:** the workflow will run different code from now on. GitHub says to review it like any other code change and check what changed upstream.
- **A changed `owner_id` or `repo_id`:** this should be rare. GitHub says to investigate before you merge.

![Two changes to understand before committing: uses: lines rewritten to full versions, and what each field in the new actions.lock means](review-diff.en.webp){: w="1600" h="900" }
_Diagram: at the top, the workflow change, where `@v3` becomes `@v3.1.0` and still points to the same commit. At the bottom, the new `actions.lock` and what `ref`, `commit`, and `owner_id` / `repo_id` mean._

**If you use an action allowlist, update it.** The [how-to guide](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies) warns that once a workflow is locked, the allowlist is checked against the locked commit SHAs, not tags. Entries pinned to a tag, such as `actions/checkout@v6`, stop matching. Switch them to the corresponding full commit SHA, or have an administrator use a wildcard. If you use a wildcard, keep it limited to trusted owners and repositories instead of loosening the whole allowlist to make the error go away. The list may be set at the repo, organization, or enterprise level; ask an admin if you are not sure.

Once it all looks right, commit `actions.lock` together with the rewritten workflows. GitHub also recommends adding `.github/workflows/actions.lock` to CODEOWNERS (the file that says who must review which files) and requiring code owner approval through branch protection or a ruleset. CODEOWNERS alone does not block merges. Protect the workflows and CODEOWNERS too, so changes cannot simply remove the check or select different actions.

## Step 4: Day-to-day upkeep

Locking is not a one-time job. These habits decide whether it keeps working.

**Rerun it when `uses:` changes.** When you add a workflow, or add or remove actions in an existing one, run `gh actions-lock` again. Do not edit the lockfile by hand.

**Dependabot updates it for you.** For locked workflows, when Dependabot opens a version update PR, it regenerates the matching lockfile entry in the same PR, with no extra setup. It only does this for locked workflows, though. For workflows that are not locked, it updates the workflow file as usual, and it will not add new workflows to the lockfile for you.

**Have CI check whether the lockfile is stale.** `gh actions-lock --verify` only checks; it does not change files. Blocking problems, such as missing required pins or failed verification, make it exit with an error, so it works well as a required PR check. The gh-actions-lock repository provides a [`verify-lockfile.yml` sample](https://github.com/github/gh-actions-lock/blob/v0.4.1/.github/workflows/verify-lockfile.yml). The version below is adapted from it to install v0.4.1, the release this post follows, and is meant for ordinary PR checks on github.com:

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

The key parts:

- `on`: checks every PR, and every push to `main`.
- `permissions: contents: read`: read-only access. The check changes nothing.
- `persist-credentials: false`: does not leave the checkout's Git credentials in the Git config afterward. The job still passes a token to the tool through `GH_TOKEN` for its GitHub queries, so the job is not token-free.
- `--pin v0.4.1`: selects an extension release tag so every install matches the version this post follows. This downloaded binary is outside the workflow lockfile, which does not pin its contents.
- `gh actions-lock --verify`: exits 0 when no blocking errors remain, **even if there are warnings**; 1 for blocking findings; and 2 for a tool failure, such as a bad option, an unreadable lockfile, or a rejected token. Success does not establish that every dependency has been reviewed or is safe.

The README notes that after you copy this file into your repo, you should run `gh actions-lock` once more so the checking workflow is locked too.

There is also `--verify-local`. It works offline and only checks that every `uses:` line has a lockfile entry, which makes it handy before a commit. It does not verify where the code came from, so it cannot replace `--verify`. The tool also cannot fix missing permissions, network failures, or API rate limits for you. Fix the underlying problem and rerun; do not treat an inconclusive check as a pass.

**GHE.com needs separate token handling.** The v0.4.1 README says a GHE.com tenant's `GITHUB_TOKEN` cannot query public actions on github.com. Locally, sign in to github.com separately; in CI, follow the docs to provide `GH_ACTIONS_LOCK_GITHUB_COM_TOKEN`. That token only needs to look up public repositories, so give it no write access, and do not grant extra permissions to get around rate limits.

**When a tag or branch moves, it depends on the kind of reference.** The table below describes what the extension does when checking and maintaining the lockfile; when a workflow actually runs, the runner verifies the locked records separately. According to the v0.4.1 troubleshooting guide, `ref-moved` warnings for references such as `main` and `v4` appear only in JSON output and do not make the exit code fail. Use `gh actions-lock --verify --json` to inspect them.

| What you wrote | What happens | What to do |
| --- | --- | --- |
| A branch or partial version, such as `main` or `v4` | Keeps the old pin while its ancestry remains verifiable; JSON reports a `ref-moved` warning | Check what changed upstream; to move forward, run `gh actions-lock --relock` |
| A full version tag, such as `v3.1.0` | The tag must point at the locked commit; if it moved, you get an error | Find out why the tag moved, then run `gh actions-lock --relock` or edit the `uses:` line |
| Rewritten history, for example after an upstream force push, so the locked commit is no longer in the history | An error that `--relock` cannot fix | First rule out accidental lockfile edits, then review upstream history and the new commit; run `gh actions-lock --accept-moved` only when you intend to adopt it |

![Three cases when a tag or branch moves: branch or partial version, full version tag, and rewritten history, with the result and the command for each](moved-refs.en.webp){: w="1600" h="900" }
_Diagram: three ways a reference can move, with the matching command. `--accept-moved` in the third case is for use only after a human check, never in automation._

**What does `--accept-moved` accept?** It says you have reviewed upstream history and trust the new commit. It does not allow the old, unverifiable commit to keep passing. Rewritten history can come from legitimate maintenance, an attack, or an accidental lockfile edit; the tool stops because it cannot distinguish them. The option applies only to dependencies directly referenced by your workflow. For a pin inside a third-party composite action, upgrade, replace, or stop using that action rather than trying to bypass everything with the same flag.

`--relock` can change executed commits too, so review its diff. Neither option belongs in a generic "CI failed, add this flag" fix. The official docs specifically prohibit using `--accept-moved` in automation.

**Do not delete the lockfile.** The README warns that locked references are sticky; if you delete the file and regenerate it, every reference is resolved again to whatever it points to now, which means trusting upstream all over again. If the file is broken, compare your working copy, staged changes, and a trusted version first. Save changes you intend to keep before restoring. The `restore` below overwrites the working copy of the lockfile without updating the index; make sure no uncommitted contents need preserving:

```bash
git fetch origin
git restore --source=origin/main --worktree -- .github/workflows/actions.lock
gh actions-lock
```

Replace the source branch on the second line if yours is not `main`, then review the regenerated diff and stage the contents you have confirmed. Only if the trusted branch's lockfile is also corrupt should you consider rebuilding after making a backup. Review every newly resolved dependency; rebuilding is not a routine way to silence errors.

## Step 5: Handle local actions (`./`)

Some workflows use an action from inside the same repo, written like `uses: ./.github/actions/setup`. A `./` path runs whatever files are checked out on the runner at that moment, so the extension cannot lock it or see which actions that local action uses.

If that local action uses other actions, `gh actions-lock` reports a `local-action` error and writes nothing. You have two options:

- **Switch to `$/` (recommended):** Run `gh actions-lock --migrate-local-actions`. It rewrites `uses: ./…` to `uses: $/…` in your workflows and in the repo's `action.yml` files. `$/` means "run the repo's own action at the workflow's commit," so the action itself follows the workflow commit and needs no separate lockfile entry; its remote action dependencies can be recorded. If your workflow checks out a different ref before running the `./` action, `$/` runs the version at the workflow's commit instead, so what runs can change. Treat it as a behavior change, not just a path substitution. Review every rewritten line.
- **Keep `./`:** Pass `--ignore-local-actions` instead, which downgrades the error to a warning. A local action with only `run:` steps, or whose dependencies are already recorded for **the same workflow**, can still run. The cost: if the required entry for that workflow is missing, the job fails only when it reaches that step, with an error like `lockfile missing pin for octo-org/setup-tool@v2.0.0`, and the earlier steps have already run.

## Going further: require every workflow to be locked

The steps above make locked workflows run locked versions, but they do not stop someone from adding a new workflow that is not locked. To enforce locking everywhere, use the **Require lockfile** policy ([docs](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)):

- Enterprise, organization, and repo admins can add it as a workflow execution protection in an Actions policy.
- It has two modes. **Evaluate** only records what would be blocked (GitHub Enterprise Cloud only). **Active** blocks every targeted workflow that is not onboarded, including workflows with only `run:` steps and no `uses:`, even if other workflows in the same repository are onboarded.
- Before switching to Active, run `gh actions-lock --verify` in each targeted repo, or check Policy insights while in Evaluate mode.
- Keep the `--verify` check after the policy is on. The policy blocks runs without a valid lockfile; `--verify` tells authors their lockfile is stale while they are still working on the PR.
- If your organization already requires actions to be pinned to a full SHA, that policy and Require lockfile are separate checks, and both must pass. A locked workflow passes both, even with no SHAs in the file.

## What a lockfile does not cover

> Know these limits before you lock:
>
> - **Reusable workflows are not locked:** Reusable workflows (workflows other workflows can call) called at the job level with `jobs.<job_id>.uses` are not in the lockfile. Pin them to a full commit SHA. The actions they use are covered by the lockfile in their own repo. With the Require lockfile policy on, a run is blocked if the called workflow is not locked in its own repo.
> - **Container images are not locked:** The README says `docker://` steps, a job's `container:` and `services:`, and Docker action images or Dockerfile base images are not locked. Images without an `@sha256:` digest are flagged as warnings.
> - **It only covers action code:** Inputs, secrets, the runner image, and contents fetched separately by `run:` or installation scripts are out of scope. Locking does not restrict the action's file, network, or token permissions.
> - **It does not judge safety:** A lockfile makes sure the version you locked is the one that runs. It does not tell you whether that version is safe. Review before you lock.
> - **Rollbacks go unnoticed:** The README warns that if someone changes a moving reference such as `v4` or `main` in the lockfile back to an older commit in its history, the tool cannot detect it. Have someone review lockfile diffs, or use full version tags.
> - **The extension does not support GitHub Enterprise Server.**
{: .prompt-warning }

## What to do when

| I want to… | Do this |
| --- | --- |
| Lock for the first time | Turn on Dependabot and check `uses:` lines; install the extension and run `gh actions-lock` at the repo root; read the diff before committing |
| Lock just one workflow first | `gh actions-lock .github/workflows/<name>.yml` |
| Keep `@v3` as written | Pass `--no-narrow` |
| Add or change a `uses:` line | Run `gh actions-lock` again |
| Check for a stale lockfile on PRs | Add `verify-lockfile.yml` to run `gh actions-lock --verify`, and make it a required check |
| Handle a `ref-moved` warning | Check upstream changes; to move forward, run `gh actions-lock --relock` |
| Handle a moved full version tag | Find out why first, then `gh actions-lock --relock` or edit `uses:` |
| Handle a locked commit that left upstream history | `--accept-moved` only after a human check, never in automation |
| Use a local action (`./`) | Switch to `$/` with `--migrate-local-actions` |
| Work with an action allowlist | Use the matching full SHA or an administrator-approved, narrowly scoped wildcard |
| Require every workflow to be locked | An admin sets the Require lockfile policy; on Enterprise Cloud, observe with Evaluate first, then switch to Active |
| Fix a broken lockfile | Restore it from git, then run `gh actions-lock`; do not delete and regenerate it |

## Common mistakes and fixes

- **Editing the lockfile by hand:** The extension rejects entries whose `ref` does not match the workflow's reference. Change the workflow instead, then rerun `gh actions-lock`.
- **The allowlist blocks a workflow after locking:** Check whether matching has switched to the locked SHA. Use that full SHA or a limited rule reviewed by an administrator rather than allowing everything.
- **A `local-action` error:** A local action uses other actions. Switch to `$/` with `--migrate-local-actions`, or pass `--ignore-local-actions` and accept the risk of a job failing partway through.
- **A job fails partway with `lockfile missing pin for …`:** A local action kept as `./` uses an action with no lockfile entry. Switching to `$/` is the simplest fix.
- **Dependabot did not add a new workflow:** Dependabot does not lock new workflows. Run `gh actions-lock` yourself.
- **Dependabot updated an action but the lockfile did not change:** Check that the workflow is onboarded, then inspect the PR diff and `--verify` output. File changes alone do not establish whether an update is complete.
- **CI adds `--accept-moved` automatically:** Remove it. That is exactly what the lockfile is meant to stop.
- **Assuming reusable workflows are locked:** They are not. Pin `jobs.<job_id>.uses` to a full SHA separately.
- **Verification passes without showing moved-reference warnings:** Some v0.4.1 `ref-moved` messages appear only in JSON, and warnings do not fail the command. Inspect them with `--verify --json`.
- **Deleting and regenerating the lockfile:** Every reference gets resolved again to what it points to now. Restore it from git instead.

## Wrapping up

`@v3` is a sticker that can be moved. A workflow lockfile lets you keep readable version numbers while recording which commit actually runs and letting GitHub enforce it. Turn on Dependabot, run `gh actions-lock`, read the diff before you commit, and let CI watch it with `--verify`. When a tag moves, stop and take a look; do not let automation press `--accept-moved` for you.

Release workflows are especially worth locking first. Following [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/) removes the long-lived token from your release workflow, but if an action in that workflow is swapped out, it can still ship a bad release. To add automated review to the same CI pipeline, see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/posts/github-actions-ai-agent-pr-review/). For a fuller risk check of your AI workflow, see [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).
