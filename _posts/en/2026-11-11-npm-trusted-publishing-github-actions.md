---
title: "Publish npm Packages Without Long-Lived Tokens: A Trusted Publishing Setup Guide"
description: "How to set up npm trusted publishing with GitHub Actions, what you get after it works, and how to retire old tokens."
date: 2026-11-11 13:00:00 +0800
categories: [Security]
tags: [supply-chain-security, github-actions, ci, application-security]
media_subpath: /assets/img/posts/npm-trusted-publishing-github-actions/
image:
  path: cover.en.webp
  alt: "Set up npm trusted publishing on GitHub Actions so each release uses a short-lived credential, not a long-lived token."
---

If I put an `NPM_TOKEN` in GitHub Actions secrets (the place GitHub stores password-like settings) so a workflow can publish automatically, that is a key that stays valid until it is revoked. A token is a passcode that stands in for an account password; whoever has it can do whatever that token allows in your name. A long-lived token stays valid until it is revoked or it expires. If it leaks, someone else can publish a new version as you.

The same risk shows up from the user's side. In [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/en/posts/coding-agent-supply-chain-permission-risks/), the Nx case describes an attacker who obtained an npm publish token through a GitHub Actions injection flaw. This post looks at the **publisher** side, and how to reduce the risk of leaving a long-lived token in CI. Trusted publishing cannot stop that kind of incident by itself: if the workflow has already been injected, it can still publish. That is why later sections mention environment approvals, or stage publish, so each version can get a human check.

CI/CD is the pipeline that runs tests, builds, and publishes when code is pushed. GitHub Actions is GitHub's built-in automation; a workflow is a YAML file in `.github/workflows/`, and a runner is the machine that executes it. This post covers GitHub-hosted runners and the settings on npmjs.com. For adding automated review to a workflow, see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/en/posts/github-actions-ai-agent-pr-review/).

> **Version note:** This post follows npm's official guide, [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers), as read on 2026-11-11. npm has kept adjusting this feature over the past six months (for example, allowed actions and staged publishing). Treat the official docs as the source of truth for the current form and defaults.
{: .prompt-info }

## What Trusted Publishing Is, and How It Works

[Trusted publishing](https://docs.npmjs.com/trusted-publishers) lets you publish npm packages from CI without storing a long-lived npm token. On each publish, GitHub Actions uses OIDC (OpenID Connect, a standard for presenting proof of identity) to issue a short-lived identity document (a JWT) that names the repository and the workflow. npm checks that document against the settings you saved, then issues a short-lived credential that is valid only for that job and expires afterward. In the docs' words: each publish uses short-lived, cryptographically-signed tokens that are specific to your workflow and cannot be extracted or reused.

The flow has four steps:

1. GitHub Actions starts a job that has `id-token: write`, on a GitHub-hosted runner.
2. GitHub issues an OIDC identity that names the repository and the workflow.
3. npm checks that the organization or user, the repository, and the workflow filename all match, then issues the short-lived credential.
4. The job runs `npm publish`. For a public repository and a public package, npm also attaches provenance automatically (a public record of which repository and workflow built that version).

The npm CLI detects an OIDC environment and uses it for authentication first, then falls back to traditional tokens. So after you set this up, existing tokens can still publish until you restrict them later.

![GitHub Actions trades an OIDC identity for a short-lived npm credential, so no npm token is stored](flow.en.webp){: w="1600" h="900" }
_A concept illustration: GitHub Actions presents an identity, npm checks your settings, and only then issues a short-lived credential for this publish. A public repository plus a public package also gets provenance. Publishing itself needs no npm token; installing private dependencies still needs a read-only token._

## When to Use It, and When You Cannot Yet

There is also a deadline in the docs. [npm writes](https://docs.npmjs.com/about-access-tokens) that legacy tokens were removed in November 2025, and that the ability to publish new package versions directly with a granular access token will be removed in January 2027.

It is a good fit when you already publish automatically with GitHub Actions on GitHub-hosted runners. The official docs also support GitLab.com shared runners and CircleCI cloud; see [the same page](https://docs.npmjs.com/trusted-publishers) for those platforms. This post does not walk through them.

It does not work yet on a self-hosted runner (a machine you run yourself). The [docs say](https://docs.npmjs.com/trusted-publishers) self-hosted runners are not currently supported, but are planned for future releases. Other CI platforms that are not listed also cannot use this method.

It also does not replace every other use of a token. Installing private dependencies still needs a read-only token (a granular token that can read, but not publish). Commands such as `npm install`, `view`, and `access` still require traditional authentication.

## Step 0: What You Need Before You Start

Before you begin, check that:

- You have npm CLI 11.5.1 or later, and Node.js 22.14.0 or later. Those are the [official version requirements](https://docs.npmjs.com/trusted-publishers). The official example uses Node 24. The npm that ships with Node 22 is 10.x, which is below 11.5.1. If you need to stay on Node 22, upgrade npm before you publish, for example with `npm install -g npm@latest`.
- The `repository.url` field in `package.json` **exactly matches** the GitHub repository. A fork that still points at the upstream URL will fail to publish.
- You have permission to publish the package, and 2FA (two-factor authentication) is enabled on the account. Changing package settings requires 2FA.
- The package already exists on npm. The official setup entry is on the Settings page of an existing package; the docs do not describe a separate flow for a brand-new package.

**What you get:** a project whose repository URL matches GitHub, on versions that are new enough to start the form.

## Step 1: Add a Trusted Publisher on npmjs.com

On [npmjs.com](https://www.npmjs.com), open your package, go to **Settings**, find **Trusted Publisher**, and under **Select your publisher** choose **GitHub Actions**. You can also think of the path as Packages → your package → Settings → Trusted publishing.

The fields are:

- **Organization or user** (required): your GitHub username or organization name
- **Repository** (required): the repository name
- **Workflow filename** (required): the filename only, such as `publish.yml`, including the `.yml` or `.yaml` extension; the file must live in `.github/workflows/`
- **Environment name** (optional): fill this in only if you use a GitHub environment for deployment protection
- **Allowed actions**: which actions this publisher may perform

Look closely at Allowed actions. According to the docs, configurations created after 2026-09-03, on the interface that allows multiple publishers, **default to allowing only `npm stage publish`**. If you want the `npm publish` command in the example below to succeed, **select `npm publish`**. If your account shows the single-publisher interface, you must select at least one action. A stricter option is to allow only `npm stage publish`; that is covered in the later section on tighter controls.

Depending on the interface your account shows, you may be able to configure several trusted publishers (up to 10), or only one at a time. The "up to 10" limit appears in the Multiple trusted publishers documentation, not in the single-publisher version.

Every field is case-sensitive and must be exact. npm does **not** verify the configuration when you save it; mistakes show up only when you try to publish. On the multiple-publishers interface, [a newly created configuration must complete its first successful publish within 2 days](https://docs.npmjs.com/trusted-publishers). If it is not validated in time, it expires, cannot be used or edited, and has to be deleted and created again. After you save the form, run a publish.

**What you get:** a trusted publisher record on npm, waiting for the workflow to match it.

## Step 2: Write the GitHub Actions Workflow

This is the [official npm example](https://docs.npmjs.com/trusted-publishers). You can copy it into `.github/workflows/publish.yml` (use the same filename you entered on npmjs.com):

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

Line by line:

- `on: push: tags: v*` publishes only when you push a tag such as `v1.2.3`, so ordinary commits do not go out.
- `permissions: id-token: write` is the critical line. It lets GitHub's OIDC provider issue the identity document. [GitHub's docs](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token) say this only allows requesting an OIDC token; it does not grant write access to other resources.
- `contents: read` lets the job read the repository.
- `runs-on: ubuntu-latest` uses a GitHub-hosted runner.
- In `setup-node`, `registry-url` points at the official npm registry, and `package-manager-cache: false` follows the official comment: never use caching in release builds.
- The job then installs dependencies, builds, tests, and runs `npm publish`.

You do **not** need `NODE_AUTH_TOKEN`, and you do **not** need `--provenance`. When you publish with trusted publishing from a public repository to a public package, npm generates provenance automatically. If `actions/checkout` or `actions/setup-node` has a newer major version, follow that action's README; this example uses `@v6`, as in the official npm docs.

If the package has private dependencies, add this to the `npm ci` step:

{% raw %}
```yaml
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}
```
{% endraw %}

Use a **read-only** granular access token (a token whose package list, permissions, and expiry you can limit). The first time you publish a scoped public package (a name like `@org/package`), you also need `--access public`; otherwise it may be published as restricted.

**What you get:** a publish workflow that does not store an `NPM_TOKEN`.

## Step 3: Run a Publish and Confirm It Worked

Push a tag that matches `v*` to trigger the workflow. After a successful run, if all three conditions are met — trusted publishing, a public repository, and a public package — the package page shows provenance information. That is what the docs say you should see, and it is how you confirm the setup worked.

**Next step:** only after that success should you retire old tokens. Do not reverse the order.

## When the Workflow Uses workflow_call

Some projects split publishing into two workflows: one that calls, and one that actually runs `npm publish`. The called file must include `workflow_call` under `on`, so another workflow can invoke it. That pattern is a reusable workflow.

Two details are easy to get wrong:

- **Both layers** need `id-token: write`. The caller and the called workflow must each have it.
- npm validates the **caller's** workflow filename, not the file that contains `npm publish`. So the Workflow filename on npmjs.com must be the caller's filename. The docs note that `workflow_dispatch` can raise a similar mismatch.

For example, with `release.yml` as the caller and `publish.yml` as the called workflow:

```yaml
# .github/workflows/release.yml (caller)
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
# .github/workflows/publish.yml (called)
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

On npmjs.com, enter `release.yml`, not `publish.yml`.

![With a reusable workflow, both files need id-token: write, and npmjs.com needs the caller's filename](reusable-workflow.en.webp){: w="1600" h="900" }
_A concept illustration: on the left, the caller `release.yml`; on the right, the called `publish.yml`. Both need `id-token: write`, and npmjs.com should be given the caller's filename._

## Step 4: Retire Your Old Tokens

Trusted publishing is accepted **in addition to** traditional tokens and manual publishes. Follow the docs' migration tip, in this order:

1. Set up trusted publishers and confirm that a publish works.
2. On the package, go to **Settings → Publishing access**, select **Require two-factor authentication and disallow tokens**, then click **Update Package Settings**. This setting blocks traditional token authentication and does not affect trusted publishers you have already configured.
3. Revoke tokens you no longer need: open your avatar menu → **Access Tokens** → delete them, or run `npm token list` and then `npm token delete <id>`. The docs say revocation can take up to an hour to take effect. See [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens).

**What you get:** publishes that go through OIDC, with old long-lived tokens no longer able to ship a new version.

## Stricter Options

If you want extra gates, the docs suggest these options. You do not have to use all of them:

- Give the publish job a GitHub environment and require a human approval; enter the same name in **Environment name** on npmjs.com.
- Use tag protection rules to limit who can push the tags that trigger a release.
- In Allowed actions, permit only `npm stage publish`, so each version goes to a staging area and a maintainer must approve it with 2FA before it goes live. The docs treat a stage-only trusted publisher as a stronger combination. This requires npm CLI 11.15.0 or later; see [Staged publishing](https://docs.npmjs.com/staged-publishing).

## Limits You Should Know First

![Six steps to set up trusted publishing, plus four limits to know first](checklist.en.webp){: w="1600" h="900" }
_A concept illustration: six setup steps on the left, and four limits on the right, including self-hosted runners, when provenance is missing, private dependencies, and a publisher count that depends on the interface._

> Read these limits before you rely on the setup:
>
> - Self-hosted runners are not supported today.
> - In the [docs' wording](https://docs.npmjs.com/generating-provenance-statements): Provenance generation is not supported for private repositories, even when publishing public packages. CircleCI also does not generate provenance today.
> - Provenance tells people where a version was built; it [does not guarantee the package has no malicious code](https://docs.npmjs.com/generating-provenance-statements).
> - Installing private dependencies still requires a read-only token.
> - The number of publishers you can configure depends on the interface: some accounts may set up to 10, others only one at a time.
> - On the multiple-publishers interface, an existing configuration cannot be edited; you have to delete it and create a new one.
{: .prompt-warning }

## What to Do in Each Situation

| I want to… | Do this |
| --- | --- |
| Set it up for the first time | Check the versions and `repository.url`, add a GitHub Actions publisher on npmjs.com, allow `npm publish`, write a workflow with `id-token: write`, then complete a first publish within 2 days |
| Hit ENEEDAUTH on publish | Check the workflow filename (including the extension), letter case, a GitHub-hosted runner, and `id-token: write` |
| Stay on Node 22 | Upgrade npm to 11.5.1 or later before publishing, or switch to Node 24 |
| Install private dependencies | Add a read-only `NODE_AUTH_TOKEN` to `npm ci` |
| Split the workflow into two files | Give `id-token: write` to both layers; enter the caller's filename on npmjs.com |
| Use a self-hosted runner | Do not use trusted publishing yet |
| Require a person to approve each version | Add an environment approval, or allow only `npm stage publish` |
| Still have old tokens after setup | Confirm a successful publish, change Publishing access, then revoke the tokens |

## Common Mistakes

- Seeing `ENEEDAUTH` or "Unable to authenticate": first check the workflow filename (including `.yml` or `.yaml`), that every field matches exactly, that you are on a GitHub-hosted runner, and that `id-token: write` is present.
- The `repository.url` in `package.json` does not exactly match the GitHub repository.
- Allowed actions does not include `npm publish`, especially on a configuration created after 2026-09-03, which defaults to stage publish only.
- On the multiple-publishers interface, more than 2 days passed without a first successful publish, so the configuration expired.
- With `workflow_call`, entering the called workflow's filename on npmjs.com.
- Upgrading only to Node 22, and keeping the bundled npm 10.x.
- Using `npm whoami` to check whether trusted publishing is in effect. The docs say this command is not a check of trusted publishing permissions.
- Assuming old tokens stop working as soon as trusted publishing is configured. You still need to change Publishing access and revoke unused tokens.

## What to Do Next

Once GitHub Actions publishes with a short-lived credential instead of a long-lived key, retire the old tokens, and add an approval or stage publish if you want a tighter gate. For defenses on the user side, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/en/posts/coding-agent-supply-chain-permission-risks/). To add automated review to these workflows, see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/en/posts/github-actions-ai-agent-pr-review/).

Treat [Trusted publishing](https://docs.npmjs.com/trusted-publishers) as the official reference, along with [provenance](https://docs.npmjs.com/generating-provenance-statements), [about access tokens](https://docs.npmjs.com/about-access-tokens), [staged publishing](https://docs.npmjs.com/staged-publishing), and [GitHub's OIDC documentation](https://docs.github.com/en/actions/concepts/security/openid-connect). For another security write-up on this site, see [OpenSSH Password Authentication Bypass: Which Hosts Are Affected, and How Alpine Users Can Patch](/en/posts/openssh-musl-password-bypass-alpine/).
