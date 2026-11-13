---
title: "Trusted Publishing Is Not Enough: Lock Down Your npm Release Pipeline"
description: "The malicious tensorlake release carried valid provenance. Use GitHub environments, rulesets, and npm staged publishing so an attacker who can push to your repo still cannot ship a release."
date: 2026-11-13 20:00:00 +0800
categories: [Security, Supply Chain]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.en.webp
  alt: "Four locks on an npm release pipeline: changing code, pushing a tag, the publish job, and npm going public."
---

The short version: trusted publishing removes the long-lived token from CI, but it does not check what you are publishing. Anyone who can push to your repo can make your own workflow publish for them, and the release still carries valid provenance. To stop that, put checkpoints on the release pipeline itself: require a person to approve each publish, limit who can push release tags and change workflows, and switch npm to "stage first, then a person approves with 2FA."

This is a follow-up to [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/). It does not repeat the OIDC and `id-token: write` setup; if trusted publishing is not set up yet, start there.

A few terms first:

- **Provenance**: a public record from npm of which repository and which workflow built a given version.
- **Tag**: a name given to a commit, usually to mark a version, such as `v1.2.3`. The example workflow in the previous post publishes only when a `v*` tag is pushed.
- **GitHub environment**: a deployment checkpoint in GitHub Actions. A job that names an environment must pass that environment's rules (such as waiting for approval) before it starts.
- **Ruleset**: a set of GitHub repo rules that can limit who may push, create, or delete particular branches or tags.
- **Staged publishing**: an npm publishing mode. A new version goes into a staging area first and becomes public only after a maintainer approves it with 2FA.
- **2FA** (two-factor authentication): a second code you enter on top of your password.

> **Version note:** This post follows official docs read on 2026-11-13: GitHub's [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), and [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), plus npm's [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers) and [Staged publishing](https://docs.npmjs.com/staged-publishing). Both sides are still changing their settings pages, plan limits, and defaults. Treat the official docs as the source of truth.
{: .prompt-info }

## A Real Case: Genuine Provenance, Malicious Contents

On October 8, 2026, a malicious version 0.5.144 of the npm package `tensorlake` was published. According to [tensorlake's security advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2):

- The attacker used a compromised maintainer account to push malicious code directly to the repository.
- The version was then published through the project's **own release workflow**, so it carried valid npm provenance.
- The malicious code ran at install time, collected GitHub, npm, cloud, and other credentials from the machine, and used the stolen tokens to publish itself into other packages and repositories the victim could write to.
- The version was live on npm for about 1 hour 40 minutes (01:12 to 02:54 UTC).

The second point matters most. From npm's point of view, this publish looked like any other: right repository, right workflow. Trusted publishing would have let it through as well, because those are exactly the two things it checks. The previous post noted that trusted publishing cannot stop a workflow that has itself been abused. tensorlake is a real example.

## What Provenance Proves, and What It Doesn't

Think of provenance as a shipping label. It proves "this box came from this factory, off this production line." It does not tell you whether someone on the line swapped a part.

npm's [provenance docs](https://docs.npmjs.com/generating-provenance-statements) say it plainly: provenance "does not guarantee the package has no malicious code." What it gives you is a verifiable link back to the source code and build instructions, so people can audit them and decide whether to trust the package.

![Provenance works like a shipping label: it proves which repo and workflow built a version, not that the contents are safe](provenance.en.webp){: w="1600" h="900" }
_Diagram: the left side lists what provenance can answer, the right side what it cannot. The label on tensorlake 0.5.144 was entirely correct; the problem was malicious code put on the line._

So to stop incidents like tensorlake, you need a human check in two places: before code reaches the release pipeline, and before a version goes public.

## Four Doors an Attacker Must Get Through

To ship a malicious version through your workflow, an attacker has to do all four of these:

1. Get malicious code (or a modified workflow) into the repo.
2. Trigger a release, for example by pushing a `v*` tag.
3. Get the publish job to finish.
4. Get npm to make the version public.

Each door can take a lock:

| What the attacker needs | The matching lock | Where you set it | Step |
| --- | --- | --- | --- |
| Get code or a workflow into the repo | Branch rule: changes need a PR and code owner review | GitHub | Step 2 |
| Push a release tag | Tag rule: only named people can create `v*` tags | GitHub | Step 2 |
| Get the publish job to finish | Environment: someone must approve before it runs | GitHub | Step 1 |
| Make the version public | Stage publish only: a maintainer approves with 2FA | npmjs.com | Step 4 |

The third-party actions the publish job uses (steps written by others and pulled in with `uses:`) can also be pinned. See Step 3.

![The four doors in a release pipeline and the lock for each](locks.en.webp){: w="1600" h="900" }
_Diagram: from changing code, to pushing a tag, to running the publish job, to npm making it public, each door has its own lock. The first three live on GitHub; the last lives on npm and uses a different account's 2FA._

You do not have to do everything at once. "What to Do in Each Situation" near the end suggests where to start.

## Step 1: Put the Publish Job in an Environment With Required Reviewers

Goal: someone must click approve before the publish job runs.

**Check your plan first.** According to [GitHub's docs](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), on GitHub Free, Pro, and Team plans, required reviewers are available **only for public repositories**. Most open source npm packages live in public repos, so this is usually fine. For a private repo, confirm your plan supports it first.

**Create the environment** (you need admin access to the repo):

1. Open the repo and click **Settings**.
2. In the left sidebar, click **Environments**, then **New environment**.
3. Name it `npm-publish` (all examples in this post use that name) and click **Configure environment**.
4. Select **Required reviewers** and add the people or teams who can approve. You can add up to 6; approval from any one of them lets the job proceed.
5. Optionally select **Prevent self-review**: the person who triggered the release cannot approve it, so a second person always looks. **Do not turn this on if you are the only maintainer**, or nobody will be able to approve.
6. Clear **Allow administrators to bypass configured protection rules**. According to the docs, this is on by default, which lets administrators skip approval and deploy anyway.
7. Under **Deployment branches and tags**, choose **Selected branches and tags**, set Ref type to **Tag**, enter `v*`, and click **Add rule**. Now only runs triggered by a `v*` tag can use this environment.
8. Click **Save protection rules**.

**Update the workflow.** Using `publish.yml` from the previous post, add one `environment` line to the publish job:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish  # new: must pass this environment's rules first
    steps:
      # ...other steps unchanged
```

**Fill it in on npm as well.** Go back to your package's trusted publisher settings on npmjs.com and set **Environment name** to the same value, `npm-publish`. [npm's docs](https://docs.npmjs.com/trusted-publishers) describe this field as the one to fill in when you use GitHub environments for deployment protection. Existing configurations in the Multiple interface cannot be edited, so delete and recreate it; see Step 1 of the previous post for details.

**What happens when it runs.** After you push a `v*` tag, the publish job pauses and waits. The approver opens that workflow run, clicks **Review deployments**, selects the environment, and clicks **Approve and deploy** before the job starts. **Reject** makes the run fail.

**What you get:** a publish job that needs someone to approve every release. Even if attackers can push to the repo, the workflow will not ship a version on its own.

> If you are the only maintainer: when the stolen account is your own GitHub account, the attacker is the one clicking approve. That is what Step 4 is for. npm's check uses your npm account's 2FA, a different key from your GitHub account.
{: .prompt-tip }

## Step 2: Limit Who Can Push Tags and Change Workflows

Step 1 has a gap: anyone who can edit the workflow can delete the `environment` line or change the name. [GitHub's docs](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) say that when a workflow references an environment that does not exist, GitHub creates one with that name, and the new environment has no protection rules. So the workflow itself needs a lock too.

### 2-1: Only Release Managers Can Create `v*` Tags

npm's docs recommend tag protection rules to control who can create release tags. On GitHub, you do this with a ruleset that targets tags:

1. In the repo, go to **Settings** → **Rulesets** under **Rules** in the left sidebar → **New ruleset** → **New tag ruleset**.
2. Set **Ruleset name** to `release-tags` and Enforcement status to **Active**.
3. Under **Bypass list**, click **Add bypass** and add only the people or teams who actually cut releases.
4. Under **Target tags**, click **Add a target** and add the pattern `v*`.
5. Select **Restrict creations**, **Restrict updates**, and **Restrict deletions** (the last one is on by default).
6. Click **Create**.

According to the [rules reference](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), with these three rules on, only people in the bypass list can create, move, or delete `v*` tags.

### 2-2: Workflow Changes Need Review

First, add a `.github/CODEOWNERS` file that names who owns the `.github/` folder (which holds both the workflows and CODEOWNERS itself):

```text
/.github/ @your-github-name
```

Replace `@your-github-name` with your GitHub username or team. [GitHub's docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) require code owners to have write permission on the repo and recommend protecting the CODEOWNERS file itself.

Next, create a branch ruleset for the default branch (usually `main`): **New ruleset** → **New branch ruleset**, set Target branches to the default branch, and select:

- **Require a pull request before merging**: every change needs a PR and cannot be pushed straight to the branch. The tensorlake attacker pushed code directly to the repository.
  - Under it, select **Require review from Code Owners**: a PR that touches `.github/` needs a code owner's approval before it can merge.
  - Under it, select **Require approval of the most recent reviewable push**: if someone pushes a new commit after approval, someone other than the last pusher must approve again.
- **Block force pushes**: stops anyone from rewriting history with a force push (on by default).

Keep this bypass list to the bare minimum too, ideally empty.

**What you get:** being able to push to the repo no longer means being able to push a release tag, and removing the environment from the workflow needs a code owner's review first.

> If you are the only maintainer, there is no second person to review PRs, so a branch ruleset does less. Focus on the tag rule in 2-1 and on Step 4.
{: .prompt-tip }

## Step 3: Pin the Actions Your Workflow Uses

In `actions/checkout@v6`, the `v6` is also a tag. The action's author (or anyone who takes over the author's account) can point the same tag at different code, and your workflow will run that new code next time.

On 2026-10-28, GitHub made workflow lockfiles generally available ([changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)) on Free, Team, and Enterprise Cloud plans. A lockfile records the exact commit behind each action in `.github/workflows/actions.lock`. Even if a tag moves later, your workflow keeps running the version you locked:

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

Review the diff before you commit. When Dependabot opens a version update PR for this workflow, it updates the lockfile in the same PR. See [GitHub's docs](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies) for the full walkthrough; this post does not go further.

**What you get:** every action in the publish job is pinned to the version you reviewed.

## Step 4: Allow Only Stage Publish on npm, and Approve With 2FA

This is the last lock, and the most important one. Even if the first three fall, a version only reaches the staging area. It goes public only after a maintainer approves it on npm with 2FA.

It is also where npm itself is heading. According to the [GitHub changelog](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/), granular tokens that bypass 2FA are expected to lose the ability to publish directly around January 2027, keeping only the ability to read private packages and stage a publish. npm recommends moving automated publishing to trusted publishing, or to staged publishing with a human approval step.

**Why this lock works so well:**

- [npm's docs](https://docs.npmjs.com/trusted-publishers) say that `npm stage list`, `view`, `approve`, and `reject` require interactive authentication and **cannot use OIDC tokens**. CI can put a version in the staging area, but it cannot approve it.
- The [staged publishing docs](https://docs.npmjs.com/staged-publishing) say you are prompted for 2FA whether you approve in the CLI or on npmjs.com.
- Approval uses your npm account, not your GitHub account. An attacker who steals your GitHub account still lacks the npm key.

![CI can only stage a version; a maintainer must approve it with npm 2FA before it goes public](stage-approve.en.webp){: w="1600" h="900" }
_Diagram: CI runs npm stage publish with OIDC and the version lands in the staging area. Approval requires a maintainer to sign in to npm and pass 2FA, which CI's OIDC token cannot do._

**Setup:**

1. **npmjs.com**: in your package's **Settings** → trusted publisher, leave only `npm stage publish` under **Allowed actions** and **do not select** `npm publish`. According to the docs, configurations created after 2026-09-03 allow only `npm stage publish` by default. Existing configurations in the Multiple interface cannot be edited, so delete and recreate.
2. **Workflow**: change the last line from `npm publish` to `npm stage publish`. This needs npm CLI 11.15.0 or later and Node.js 22.14.0 or later.
3. **Retire tokens**: in your package's **Settings** → **Publishing access**, choose **Require two-factor authentication and disallow tokens** so old tokens cannot publish either. Skip this if you already did Step 4 of the previous post.

With all of these in place, `publish.yml` looks like this:

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
    environment: npm-publish      # Step 1: someone must approve first
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
      - run: npm stage publish    # Step 4: staging only
```

**Approving:** when the workflow finishes, the version waits in the staging area. On npmjs.com, open the **Staged Packages** tab in your account settings, check the contents, click **Approve**, and enter your 2FA code. You can also use the CLI on your own machine:

```bash
npm stage list <package-name>   # list versions waiting for approval
npm stage view <stage-id>       # show details for one version
npm stage download <stage-id>   # download it to inspect the contents
npm stage approve <stage-id>    # approve; prompts for 2FA
```

According to the docs, the first time a new package is staged, npm publishes a public placeholder version, `0.0.0-stage`. Batch actions for approving several versions at once are still rolling out gradually and may not be on your account yet.

**What you get:** CI can only stage a version. To make it public, someone has to sign in to npm and approve with 2FA.

## What to Do in Each Situation

| My situation | What to do |
| --- | --- |
| I am the only maintainer | Do Step 4 first, then 2-1. Step 1 is fine, but leave Prevent self-review off |
| There are two or more maintainers | Turn on Prevent self-review in Step 1, and add Steps 2 and 4 |
| The package lives in a private repo | Required reviewers are not available on Free, Pro, or Team. Start with Step 4 and check your plan for the rest |
| I release often and approvals feel slow | Keep at least Step 4; a quick `npm stage view` before approving is enough |
| I only have time for one thing | Step 4: it does not rely on your GitHub account, and CI cannot get around it |
| I still publish with `NPM_TOKEN` | Switch to trusted publishing using [the previous post](/posts/npm-trusted-publishing-github-actions/) first, then come back |

## Common Mistakes and Fixes

- **The publish job just sits there:** it is waiting for environment approval. Open the workflow run and click **Review deployments**.
- **The workflow uses `npm stage publish`, but `npm publish` is still allowed:** an attacker can change the last line back to `npm publish` and publish directly. Clear `npm publish` under Allowed actions.
- **Admin bypass left on:** administrator accounts, including a stolen one, can skip approval and deploy.
- **A typo in the environment name:** GitHub creates a new environment with that name and no protection rules, and the job runs right away. Check Settings → Environments for environments you don't recognize.
- **No limit under Deployment branches and tags:** runs from any branch can use the environment. Allow only `v*` tags.
- **Prevent self-review on with a single maintainer:** nobody can approve. Leave it off if you work alone.
- **`npm stage publish` fails:** make sure npm CLI is 11.15.0 or later.
- **A bypass list that is too broad:** anyone on it can skip the rules. Add only the people who need it.
- **Treating provenance as a safety badge:** provenance says where a version was built, not that its contents are safe.

## Limits

> Know these limits before you rely on this:
>
> - These checkpoints stop "can push to the repo, so can ship a release automatically." If approvers click without looking, the checkpoint does nothing. At minimum, check which commits a release includes before approving.
> - With a single maintainer, a stolen GitHub account can get through Steps 1 and 2 on its own; only Step 4 still holds.
> - If your npm account and its 2FA are compromised too, none of these checkpoints will stop it.
> - On Free, Pro, and Team plans, required reviewers work only in public repos.
> - This post covers only GitHub-hosted runners; npm's trusted publishing does not support self-hosted runners yet either.
{: .prompt-warning }

## What to Do Next

Trusted publishing keeps long-lived tokens out of CI. The four locks in this post make sure that "can push to the repo" no longer means "can ship a release." At a minimum, do Step 4: CI can only stage, and nothing goes public until someone approves with npm 2FA.

If trusted publishing is not set up yet, start with [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/). To add automated review to your workflow PRs, see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/posts/github-actions-ai-agent-pr-review/). To check supply chain risk from the AI workflow side, see [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

For the official details, see GitHub's [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), and npm's [Trusted publishing](https://docs.npmjs.com/trusted-publishers) and [Staged publishing](https://docs.npmjs.com/staged-publishing).
