---
title: "Trusted Publishing Is Not Enough: Lock Down Your npm Release Pipeline"
description: "The malicious tensorlake release carried valid provenance. Use GitHub environments, rulesets, and npm staged publishing to add review checkpoints for source changes, release triggers, and package publication."
date: 2026-11-14 18:25:00 +0800
categories: [Security, Supply Chain]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.en.webp
  alt: "Four locks on an npm release pipeline: changing code, pushing a tag, the publish job, and npm going public."
---

Trusted publishing removes the long-lived publishing token from CI, but it does not review your code. If an attacker can change the contents used for a release and trigger an authorized workflow, they may be able to use your pipeline to publish malware with genuine provenance.

Reducing that risk takes more than changing authentication. You also need to control who can merge code and create release tags, which job can obtain publishing permissions, and whether anyone reviews the package before it goes public. This post connects those checkpoints, ending with a CI workflow that can only stage a version for a maintainer to approve on npm.

This follows [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/). It does not repeat the basic OIDC and `id-token: write` setup. Start there if you have not configured trusted publishing yet.

A few terms first:

- **Provenance**: a record connecting a package version to its source repository, build workflow, and related commit. It is not a code safety certification.
- **Tag**: a version marker pointing to a commit, such as `v1.2.3`. The previous post's workflow publishes on `v*` tags.
- **GitHub environment**: deployment rules for a job, such as required reviewers and allowed branches or tags. The job must pass those rules before it starts.
- **Ruleset**: repository rules governing how branches and tags can be created, updated, or deleted.
- **Staged publishing**: submitting a package to a staging area first; the version becomes public only after a maintainer reviews it and approves with 2FA.
- **2FA** (two-factor authentication): requiring a second authentication factor for sign-in or a sensitive operation. It is not limited to entering a verification code.

> **Version note:** This post follows GitHub's [environment docs](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [ruleset docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), and npm's [Trusted publishing](https://docs.npmjs.com/trusted-publishers) and [Staged publishing](https://docs.npmjs.com/staged-publishing) docs, as read on 2026-11-13. The steps were not tested against live GitHub or npm publishing settings. Check the relevant official docs for plans, interfaces, and version requirements.
{: .prompt-info }

## A Real Case: Genuine Provenance, Malicious Contents

On October 8, 2026, the npm package `tensorlake` received a malicious release, `0.5.144`. According to [tensorlake's official security advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2):

- An attacker used a compromised maintainer account to push malicious code to the repository.
- The version went through the project's own release workflow and carried valid npm provenance.
- At installation, the malware stole GitHub, npm, cloud, and other credentials, then used those permissions to spread to other packages and repositories.
- The version was on npm for about 1 hour 40 minutes, from 01:12 to 02:54 UTC that day.

The case demonstrates that **a legitimate build source can produce malicious contents**. The advisory does not describe every authentication or protection setting in place, so provenance alone cannot establish that trusted publishing was used or identify which protection was bypassed. It does show why checking which workflow published a package is not enough.

## What Provenance Does and Does Not Prove

Think of provenance as a shipping document: it traces a shipment back to its factory and production line, but it tells you nothing about whether any part was tampered with.

The [npm provenance docs](https://docs.npmjs.com/generating-provenance-statements) make the same point: provenance does not guarantee that a package is free of malicious code. It makes the source easier to verify; the contents still need review.

![Provenance provides build-source information, not a guarantee that package contents are safe](provenance.en.webp){: w="1600" h="900" }
_A genuine shipping document does not make the contents safe. The tensorlake advisory confirms that the malicious version went through the project's own release workflow and carried valid provenance._

## Four Checkpoints in the Release Pipeline

For the tag-based release flow used here, a version usually passes through these four stages before becoming public:

| Stage | What to check | Controls |
| --- | --- | --- |
| Code and workflows enter the release source | Were the changes reviewed? | Branch ruleset and CODEOWNERS |
| A release tag is created | Who can create it, and which commit does it point to? | Tag rulesets and a source-commit check |
| The publishing job runs | Was it approved, and are its permissions appropriate? | Environment and job permissions |
| The npm version becomes public | Does the staged package match the intended release? | Stage-only publisher and human 2FA approval |

The steps below do not follow the table's order; they start with human approval for the publishing job. Outside the table, also pin third-party action versions (step 3) so the executed code cannot change while your workflow stays the same.

![Checkpoints for source changes, release tags, the publishing job, and npm publication](locks.en.webp){: w="1600" h="900" }
_Consider these controls together. GitHub and npm are separate authorization boundaries, so protect the accounts, sessions, and authentication devices on each side._

## Step 1: Require Environment Approval Before Publishing

Start with a human checkpoint for the publishing job. The [GitHub docs](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) limit required reviewers on Free, Pro, and Team to public repositories. Check plan support for a private repository first.

Configuring it requires repository admin access:

1. Open **Settings → Environments → New environment** and create `npm-publish`.
2. Add people or teams under **Required reviewers**, up to six. Approval from **any one** of them releases the job; not everyone has to agree.
3. Enable **Prevent self-review** when another reviewer is available, so the person triggering the release cannot approve it. With only one maintainer, this can block releases.
4. Disable **Allow administrators to bypass configured protection rules**, so administrators cannot skip approval on a pending deployment.
5. Under **Deployment branches and tags**, choose **Selected branches and tags** and add a **Tag** rule for `v*`.
6. Save the protection settings.

Name the same environment in the publishing job:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    # See the complete example below for the remaining settings
```

In the npmjs.com trusted publisher configuration, set **Environment name** to the same `npm-publish`. npm provides this field for projects that use environment protection, and GitHub's [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) explains that tokens can carry environment information. Adding only the workflow line and leaving the npm field empty drops the npm-side restriction. Setting the field does not make arbitrary workflow changes safe either, so the next step protects the workflow itself.

According to npm's Multiple trusted publishers documentation, existing connections cannot be edited directly. A connection has to be deleted and recreated, and the new one must complete its first successful publish within two days. Prepare the workflow and reviewers before switching. If you still have the Single interface, follow that version of the docs.

Once triggered, the job waits for approval. On the workflow run page, the reviewer selects **Review deployments**, checks the tag, commit, and changes, then chooses **Approve and deploy**. The final package has not been built yet at this checkpoint; inspect it in step 4.

> Disabling administrator bypass does not prevent an administrator from editing or deleting the environment. An attacker with repository administration rights may still change the rules. For a solo maintainer, self-approval can prevent an accidental release, but cannot distinguish the maintainer from someone using the same compromised account.
{: .prompt-tip }

## Step 2: Protect the Release Source and Tags

### 2-1: Separate Tag Creation From Tag Changes

Go to **Settings → Rules → Rulesets → New tag ruleset**, target `v*`, and set **Enforcement status: Active**.

Use two rulesets:

- **`release-tags-create`**: enable **Restrict creations**, granting bypass only to the smallest group responsible for releases.
- **`release-tags-immutable`**: enable **Restrict updates** and **Restrict deletions**, with an empty bypass list. Release publishers then cannot freely move or delete existing tags either.

Why separate them? The [rules documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) explains that only actors with bypass permission get past these restrictions. Put all three restrictions in one ruleset and exempt the release team, and that team can create, rewrite, and delete tags, so the release tags are no longer immutable.

**The bypass list is not an arbitrary username list.** The [ruleset creation docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository) list roles, teams, and GitHub Apps among the options. An organization repository can use a dedicated release team; a personal repository is limited to the roles its interface offers. Allowing the entire Write or Maintain role exempts everyone with that role.

Administrators may still change these rules. Administration rights and rule changes need oversight too.

### 2-2: Review Code as Well as Workflows

Protecting `.github/` alone is insufficient. An attacker might change package source, publishing scripts in `package.json`, or files used during the build. This CODEOWNERS example covers all files, then gives the release team ownership of `.github/`:

```text
* @your-org/package-reviewers
/.github/ @your-org/release-reviewers
```

Replace the example teams with real users or teams. Later matching patterns override earlier ones, so release-reviewers alone own `.github/` here; approval from both teams is not required. The [CODEOWNERS docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) require owners to have repository write access, and teams need the appropriate visibility and permissions.

Create an **Active** branch ruleset for the release source, `main` in this example:

- Enable **Require a pull request before merging** and require at least one approving review.
- Enable **Require review from Code Owners**, so changes need approval from the matching code owners.
- Enable **Dismiss stale pull request approvals when new commits are pushed**, so reviewed contents cannot simply be replaced. You can also enable **Require approval of the most recent reviewable push**, requiring someone other than the last pusher to approve the latest reviewable changes.
- Enable **Block force pushes**, keep the bypass list as small as possible, and make essential tests required status checks.

**CODEOWNERS does not block merging on its own.** It needs a rule requiring code-owner review. A solo maintainer also does not gain independent review simply by listing their own account as the owner.

### 2-3: Verify That the Tag Points to Reviewed Code

`v*` matches a tag name. **It does not prove that the commit has been merged into `main`.** Environment tag rules also match the run's ref; they do not check the source branch for you.

The release publisher and environment reviewer need to verify that the tagged commit comes from the reviewed release branch. The workflow below also checks that the current commit is in `origin/main`'s history, catching tags accidentally created from other branches.

That check assumes that `main` really enforces review and that the workflow has not been tampered with. It does not replace tag permissions, workflow review, or the final npm checkpoint.

## Step 3: Pin Actions and Protect the Lockfile

In `uses: actions/checkout@v6`, `v6` is a movable tag. Pin a directly referenced action to a full commit SHA that you have verified and reviewed. The complete example below uses this approach.

GitHub's [October 28, 2026 GA announcement](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/) introduced workflow lockfiles for plans including Free, Team, and Enterprise Cloud. However, the [setup guide](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies) still listed availability as Enterprise Cloud when this post was checked. Check actual support in your repository rather than assuming the plan name means the feature is enabled.

For a supported repository, follow the docs:

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

Review and commit the generated workflow changes and `.github/workflows/actions.lock` together. **Onboarding one workflow does not cover the entire repository.** A reusable workflow in another repository needs its source repository's own lockfile. This also does not pin all npm dependencies or programs downloaded by scripts.

Dependabot updates matching lockfile entries for onboarded workflows, but those updates still need review. If available, use the **Require lockfile** policy to enforce adoption. Protect the lockfile and policy themselves too; otherwise someone can delete them and the pinning quietly disappears. Pinning preserves which code runs; it does not establish that the code is safe.

## Step 4: Let CI Stage Versions and npm Approve Publication

This separates submitting a package from making it public. The [npm docs](https://docs.npmjs.com/trusted-publishers) say that operations such as `npm stage approve` cannot use the CI OIDC token. The [staged publishing docs](https://docs.npmjs.com/staged-publishing) require a maintainer's 2FA approval before publication.

The OIDC token cannot approve, but that separation holds only if CI has no other npm credentials. **Do not give the same publishing pipeline npm account credentials, sessions, or authentication methods capable of approval.** Keeping GitHub and npm authorization separate means a compromise on one side does not automatically defeat the other checkpoint.

Plan the transition:

1. Confirm npm CLI **11.15.0 or later**, Node.js **22.14.0 or later**, and an npm account with publishing access and 2FA enabled to approve releases.
2. Check **every trusted publisher** for the package on npmjs.com. Allow only `npm stage publish` on the target connection and disable `npm publish`. Leave unnecessary `npm dist-tag` permissions off too. Any other connection you keep that still allows direct publishing is another way in.
3. Change the workflow's last step to `npm stage publish`. If recreating a publisher is necessary, prepare the workflow first and account for the new connection's validation deadline.
4. Once the new route works, finish the migration described in the previous post: select **Settings → Publishing access → Require two-factor authentication and disallow tokens**, then revoke unused publishing tokens. This setting restricts traditional tokens; it neither disables OIDC publishers nor makes each publisher stage-only automatically.

The [July 8, 2026 npm announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) schedules further restrictions on direct publishing with 2FA-bypass granular tokens around January 2027. That date is only an announcement; there is no need to wait for it before tightening permissions.

![CI submits a staged version with OIDC; a maintainer reviews and approves publication on npm](stage-approve.en.webp){: w="1600" h="900" }
_This division of permissions assumes a stage-only publisher. If direct-publish publishers or other publishing credentials remain, not every route necessarily goes through staging._

### Example Workflow

This example assumes releases come from `main`, the `npm-publish` environment exists, and npm is configured for stage-only publishing. The action SHAs are the commits behind the official `v6` tags when this post was checked. Verify them upstream, review them for your project before adopting them, and use PRs for future updates:

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

As described in the [checkout docs](https://github.com/actions/checkout/tree/d23441a48e516b6c34aea4fa41551a30e30af803#usage), `fetch-depth: 0` retrieves full history and branches for the `origin/main` ancestry check; change the branch name if yours is different. Grant `id-token: write` only to the job that needs to publish, but every step in that job can use the permission: installation, builds, and tests also execute code, so review publishing scripts and dependencies too. With npm 12, prepare the necessary install-script approvals rather than allowing every script just to make a release succeed.

### What to Review Before Approving

After the workflow finishes, open **Staged Packages in your npmjs.com account settings**, or use the CLI on your own trusted computer. Replace the placeholder package name and stage ID below with real values, keeping the quotes:

```bash
npm stage list '@your-org/your-package'
npm stage view 'YOUR_STAGE_ID'
npm stage download 'YOUR_STAGE_ID'
# Approve only after review; this makes the version public
npm stage approve 'YOUR_STAGE_ID'
```

At minimum, check:

- The package name, version, dist-tag, and submitter match the intended release.
- The workflow run and source commit correspond to reviewed changes.
- **The actual downloaded tarball**, especially compiled output, install scripts, and added files. A reviewed source PR does not establish that the generated files match; a SHASUM identifies contents but does not review them.

If anything is unclear, leave it unapproved. Use `npm stage reject 'YOUR_STAGE_ID'` when appropriate. Do not execute a suspicious package on a computer holding production credentials to test it.

When staging a new package for the first time, npm creates a public `0.0.0-stage` placeholder. The actual staged contents stay private until approval. Batch approval is still rolling out; even if a batch needs only one 2FA challenge, review each package in it.

## Priorities for Different Maintenance Setups

| Situation | Recommendation |
| --- | --- |
| Solo maintainer | Start with stage-only publishing, an audit of other publishing routes, and npm account security; self-approval is not independent review |
| Two or more maintainers | Add independent PR review and Prevent self-review, with someone available to approve |
| Private repository without required reviewers | Use branch and tag controls your plan supports, and keep the npm content review |
| Frequent releases | Use automated tests, diff reports, and package inventories to support review; do not reduce approval to a button press |
| Multiple publishers already configured | Check each one's direct-publish and dist-tag permissions, and remove unused connections |
| Still publishing with `NPM_TOKEN` | Follow the [previous post](/posts/npm-trusted-publishing-github-actions/) to migrate before removing the old route |

## Common Problems and Limits

- **The job keeps waiting:** check whether it needs environment approval. Prevent self-review can leave a solo maintainer unable to approve.
- **The environment name is wrong:** GitHub may create an unprotected environment automatically. Check both GitHub and npm settings; a job starting is not proof of a successful configuration.
- **The tag matches `v*` but bypasses review on `main`:** a name check is not a source-commit check. Verify both.
- **Direct publishing still works after switching to staging:** inspect Allowed actions for all publishers, plus tokens, accounts, and manual publishing rights. Changing one workflow line does not remove other routes.
- **Administrators can still change the rules:** bypassing a pending deployment and changing protection settings are different powers. Repository and npm administrators remain sensitive identities to protect.
- **Does 2FA establish content safety?** It authenticates the person acting; it does not review the package for them. Compromised npm accounts, sessions, or authentication devices can still defeat the last checkpoint.
- **Runner limits:** this post covers GitHub-hosted runners. npm does not currently support trusted publishing on self-hosted runners.

First identify all publishing routes, then add suitable controls for source review, tags, jobs, and publication. Keep one distinction clear in the release process: approving a source commit and approving the resulting package are separate checks, and neither can be skipped.

For OIDC setup, start with the [npm Trusted Publishing guide](/posts/npm-trusted-publishing-github-actions/). For automated workflow reviews, see [Automating PR Review With GitHub Actions and an AI Agent](/posts/github-actions-ai-agent-pr-review/). For a broader view of workflow risks, see the [OWASP Agentic Top 10 Checklist](/posts/owasp-agentic-top-10-ai-workflow-checklist/).
