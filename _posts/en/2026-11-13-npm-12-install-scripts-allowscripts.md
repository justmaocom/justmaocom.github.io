---
title: "npm 12 Blocks Install Scripts by Default: Approve allowScripts, Add a 7-Day Cooldown"
description: "npm 12 no longer runs dependency install scripts by default. This post shows how to approve the packages that really need them with npm install-scripts, add a 7-day cooldown with min-release-age, and why revoking tokens can't be your first step after installing a malicious package."
date: 2026-11-13 20:00:00 +0800
categories: [Security, Supply Chain]
tags: [supply-chain-security, npm, application-security, incident-response]
media_subpath: /assets/img/posts/npm-12-install-scripts-allowscripts/
image:
  path: cover.en.webp
  alt: "npm 12 blocks dependency install scripts at install time and lets through only the packages you approved in allowScripts."
---

The short version: after you upgrade to npm 12, install scripts from dependencies no longer run by default. You only need to do three things: see which packages are blocked, approve the ones that really need their scripts, and commit the list to your repo. Then spend one more minute adding a 7-day cooldown to `.npmrc`, so freshly published versions don't get installed right away.

A few terms first:

- **Dependency**: someone else's package that your project uses, plus the packages those packages use in turn.
- **Install script**: a command a package runs automatically when it is installed. It is defined in the package's `package.json` under the names `preinstall`, `install`, and `postinstall`. It runs as your user account, so it can read any file you can read.
- **`package.json`**: your project's settings file, which records its name, version, and dependencies. npm 12 also stores the list of approved packages here.
- **Lockfile** (`package-lock.json`): the file that records which version of each dependency was actually installed.
- **`.npmrc`**: npm's settings file. Put it in your project's root folder and it affects only that project.
- **Token**: a passcode that stands in for your account password; whoever has it can do whatever that token allows in your name.

Why block them? Attackers most often hide malicious code in install scripts: the moment you type `npm install`, the code has already run, before you have even used the package. That is what happened with `tensorlake@0.5.144` on October 8, 2026. According to the [official advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2), it used `preinstall` to steal GitHub and npm tokens, cloud keys, and AI tool and MCP configurations. This is not rare, either: the GitHub Advisory Database announces new malicious npm packages almost every day. In just three days, October 26 to 28, 2026, there were 103 (based on a search of the [GitHub Advisory Database](https://github.com/advisories?query=type%3Amalware+ecosystem%3Anpm) for `type=malware` and `ecosystem=npm` on 2026-11-13).

Another post, [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/), looks at the **publisher** side. This post looks at the side of **the people who install packages**: how to approve the install scripts you really need, how to avoid freshly published versions, and, if you do install a malicious package, what to do first and what not to do.

> **Version note:** This post is based on the official npm CLI 12.2.2 docs [npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/), [npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/), and [config](https://docs.npmjs.com/cli/v12/using-npm/config/), as read on 2026-11-13, plus GitHub's [npm v12 changelog announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/). It does not include hands-on test results. Treat the official docs as the source of truth for commands and defaults.
{: .prompt-info }

## What Changed in npm 12

GitHub's [changelog announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) on 2026-07-08 says npm v12 is officially released and tagged `latest` (the version `npm install -g npm` installs by default). The changes that affect install scripts are:

- **Install scripts from dependencies don't run by default.** This covers `preinstall`, `install`, and `postinstall`. It also covers packages that have no script but include a `binding.gyp` file, which would otherwise be compiled automatically with node-gyp. For dependencies installed from git, local files, or links, their `prepare` scripts are blocked too.
- **Installs don't stop.** The [docs](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/) say `npm install` silently skips scripts that are not approved, then lists the skipped packages at the end so you can review them.
- **The allow list lives in `allowScripts` in `package.json`.** For packages listed there and marked as allowed, scripts run as usual. Packages marked as denied are always skipped and no longer show up in the review list.

The same release also turns off two sources by default: git dependencies (`allow-git`) and URL dependencies (`allow-remote`, for example a dependency that points straight at a `.tgz` URL). If your project uses either, they will fail to install after the upgrade, and you have to allow them separately; this post does not go into that.

![In npm 12, every package with an install script is checked against allowScripts at install time: approved ones run, denied ones are skipped, and ones not yet reviewed are skipped and listed](gate.en.webp){: w="1600" h="900" }
_A concept illustration: at install time, every package with an install script is checked against `allowScripts` first. Only packages that are approved, with a matching version, run. Packages that are explicitly denied are skipped. Packages not yet reviewed are skipped too, and listed when the install finishes. Approvals pin the version by default, so you have to approve again after a package upgrades._

**Who is affected?** People who use packages that compile or download native code at install time run into this most often, for example image-processing packages like `canvas` and `sharp`, which appear in the official docs' examples. If everything works after the upgrade, your project may not need install scripts at all. If something breaks, or the install ends with a list of skipped packages, follow the steps below.

## Step 1: Check Your npm Version

In a terminal, run:

```bash
npm -v
```

- **It shows 12.x**: blocking is already on by default; go straight to Step 2.
- **It shows 11.x, at 11.16.0 or later**: according to GitHub's [June notice of upcoming changes](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/), these versions already have the same mechanism, but only warn for now. You can run `npm approve-scripts --allow-scripts-pending` to see what will be blocked after the upgrade, and get your list ready before you upgrade.
- **An older version**: upgrade npm first, for example by running `npm install -g npm@latest`.

Everyone on your team, and CI (the pipeline that automatically runs tests and builds after you push code), should ideally use the same npm version. Otherwise the same `package.json` will block scripts on npm 12 but run them on older versions.

**What you get:** confirmation that your npm already blocks install scripts.

## Step 2: See Which Packages Are Blocked

In your project folder, run:

```bash
npm install-scripts ls
```

This command lists only packages that have install scripts but are not yet in `allowScripts`. It doesn't change any files, so it's safe to run as often as you like.

Then decide, one by one, whether to allow each package. First, look at what its scripts actually do:

```bash
# See which scripts a given version's package.json defines; replace the package and version with one from the list
npm view <package>@<version> scripts
```

You can also open `node_modules/<package>/package.json` directly to see the same content, then read the file the script calls.

These guidelines can help you decide (this site's own rules of thumb, not official rules):

- **It compiles or downloads native code**, for example for image processing or a database driver: it usually really needs to run. Approve it.
- **It only sends usage stats, or prints ads or thank-you messages**: not needed. Deny it.
- **The script downloads things from unknown URLs, or the code is deliberately made hard to read**: don't approve it yet. Find out more first.
- **You can't tell, and you're not sure**: don't approve it yet. Run your tests once, or start your app and see. If everything works, deny it explicitly so it stops showing up in the list; if something breaks, come back and approve it.

**What you get:** a list of packages to approve and packages to deny.

## Step 3: Approve or Deny, Then Commit

Approve the packages you need. You can list several at once:

```bash
npm install-scripts approve canvas sharp
```

Deny the packages you don't need:

```bash
npm install-scripts deny telemetry-pkg
```

`npm approve-scripts` and `npm deny-scripts` are shorthand for these two commands and work the same way.

**Approvals pin the version by default.** The [docs](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/) say `approve` writes `package@version` by default, so it allows only the version you reviewed. When the package upgrades later, the new version isn't on the list, so its install script is blocked again and goes back on the review list. That is exactly what you want: if an attacker quietly publishes a tampered new version, it won't run automatically just because you approved an older one.

Once written to `package.json`, it looks roughly like this (the npm docs don't include a full example; this is assembled from the docs' description, and the version numbers are only illustrative):

```json
{
  "allowScripts": {
    "canvas@3.2.0": true,
    "sharp@0.34.5": true,
    "telemetry-pkg": false
  }
}
```

- `true` means allow and `false` means deny. A denial always uses the package name only, with no version.
- The [docs](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/) say a package already set to `false` is always denied; a later `approve` won't quietly switch it back to allowed.
- Adding `--no-allow-scripts-pin` writes an allow entry with only the name and no version instead. That effectively allows every future version in advance, so it's not recommended unless you have a very good reason.
- `npm install-scripts approve --all` approves every package on the list at once. The comment on the docs' example says to use it only after you've reviewed them; allowing everything without looking amounts to tearing down this gate.

Approving only updates the list in `package.json`. To run the scripts that were skipped earlier, run `npm rebuild <package>`, for example `npm rebuild canvas sharp`. The [docs](https://docs.npmjs.com/cli/v12/commands/npm-rebuild/) explain that this command runs a package's `preinstall`, `install`, `postinstall`, and `prepare` scripts.

Finally, commit the list to the repo so your team and CI use the same one:

```bash
git add package.json package-lock.json
git commit -m "chore(deps): approve required install scripts"
```

**After a package upgrades:** the pinned version no longer matches, so the package shows up again in `npm install-scripts ls`. Once you've checked that the new version's scripts are fine, run `approve` again, and npm replaces the old version number with the new one. For old entries in the list that are no longer needed, preview with `npm install-scripts prune --dry-run`, then clean them up with `npm install-scripts prune`.

**Should CI fail outright?** By default, npm only skips the scripts and reminds you. If you want install scripts that haven't been reviewed to fail CI outright, add this to your project's `.npmrc`:

```ini
strict-allow-scripts=true
```

According to the [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#strict-allow-scripts), once this is on, a package that has install scripts but isn't on the list makes the install fail; packages that are explicitly denied are still just skipped, with no error.

**What you get:** an `allowScripts` list in your repo that everyone, including CI, follows.

## Step 4: Add a 7-Day Cooldown in .npmrc

Malicious versions are usually found and taken down quickly. Just by not installing freshly published versions right away, you can avoid a large share of them. That is what npm's `min-release-age` does. Add this to the `.npmrc` in your project's root folder:

```ini
min-release-age=7
min-release-age-exclude[]=@your-org/*
```

- `min-release-age=7`: according to the [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#min-release-age), npm installs only versions published more than 7 days ago: within the version range your `package.json` allows, it picks one that is at least 7 days old. If none in the range qualifies, the install fails.
- `min-release-age-exclude[]`: lists packages that are exempt. You can write a package name or a wildcard like `@your-org/*`. It's usually used to exempt packages you maintain yourself, so they're usable as soon as they're published. You can add several lines.

Two details about exemptions:

- **Only the named packages are exempt.** The other packages they use still have to wait the full 7 days, unless they also match an exemption rule.
- **An exemption doesn't change where the package is downloaded from.** The docs remind you that you should also own your organization's scope on the public npm registry (that is, the name `@your-org`), so nobody else can publish packages under the same name first.

![Using the tensorlake incident as an example: the malicious version was on npm for only about 1 hour 40 minutes, so a project with a 7-day cooldown would never have picked it](cooldown.en.webp){: w="1600" h="900" }
_A concept illustration, using the tensorlake incident as an example. The malicious 0.5.144 was online for only about 1 hour 40 minutes on 2026-10-08 before it was removed. A project with a 7-day cooldown would not consider this version until after October 15, and by then it was long gone._

Take this incident as an example: according to the advisory, `tensorlake@0.5.144` was on npm for only about 1 hour 40 minutes (2026-10-08 01:12 to 02:54 UTC, 09:12 to 10:54 Taipei time). A project with a 7-day cooldown would not pick it during that window, and by the time 7 days had passed, it had already been removed.

**The trade-off: urgent fixes have to wait too.** The docs say that if the cooldown blocks a fixed version that `npm audit fix` wants to install, npm stays on the vulnerable version, shows a warning, and exits with a failure. You have two options:

- Temporarily add that package to `min-release-age-exclude[]`, install the fixed version, then remove it.
- Temporarily lower the number of days.

npm also has a `before` setting, which means "install only versions published before a given date." If both are set in the same config file, `before` wins.

**What you get:** freshly published versions wait at least 7 days before they reach your project.

## Step 5: Allow Scripts for Global Installs and npx

`npm install -g` (a global install, which makes a command available across your whole computer) and `npx` / `npm exec` (download a package and run it once) have no project `package.json` to write to. So `npm install-scripts` doesn't work in these cases; running it with `-g` gives an `EGLOBAL` error.

Use the `allow-scripts` setting instead. Its value is a comma-separated list of package names. The [docs](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/) show two ways:

```bash
# Allow only for this one global install
npm install -g --allow-scripts=canvas,sharp

# Save it in your personal npm config so it stays in effect
npm config set allow-scripts=canvas,sharp --location=user
```

- According to the [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#allow-scripts), this setting is meant for `npm exec`, `npx`, and `npm install -g`. Inside a project, adding `--allow-scripts` to `npm install`, `npm ci`, `npm update`, or `npm rebuild` gives an error; for projects, use `allowScripts`.
- Names are matched against the package's actual resolved identity, not the name the package claims for itself in its `package.json`.
- A list saved in your personal config stays in effect, so keep it as short as possible and remove entries you no longer need.

**What you get:** global tools and one-off runs also allow only the packages you name.

## If You Install a Malicious Package: The tensorlake Case and Why Revoking Tokens Can't Come First

The usual advice is: if you suspect you've been compromised, revoke your tokens and issue new ones first. But in the tensorlake case, you can't do that. The steps below come from the official advisory for this incident and **apply only to this incident**; they are not a general procedure. For other incidents, follow each one's own official advisory.

**What happened.** According to the [official advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2):

- On 2026-10-08, an attacker used a stolen maintainer account to publish `tensorlake@0.5.144` to npm. The `tensorlake-native-*` packages with the same version number were affected too.
- The malicious code was hidden in `preinstall`, so it ran at install time. It collects GitHub and npm tokens, AWS and GCP cloud credentials, Kubernetes and Vault tokens, SSH and GPG keys, `.env` files, passwords saved in browsers, cryptocurrency wallets, and AI tool and MCP configurations. It then uses the stolen tokens to publish itself to other packages and repos the victim has access to.
- It also installs a background service called `gh-token-monitor`: **as soon as the stolen GitHub token is revoked, it deletes the user's home directory.**
- This version was published through tensorlake's own release pipeline, so it carried valid npm provenance (proof of where it was built). This is also what the [Trusted Publishing post](/posts/npm-trusted-publishing-github-actions/) warned about: provenance only proves where a version was built; it doesn't guarantee the package has no malicious code.

**First, check whether you installed it.** The advisory gives these methods:

- In your project, run `npm list tensorlake`. If it shows 0.5.144, you're affected.
- Search `package-lock.json`, `yarn.lock`, and `pnpm-lock.yaml` for `tensorlake@0.5.144` or `tensorlake-native-*@0.5.144`.
- Look through your CI build logs to see whether any install between 2026-10-08 01:12 and 02:54 UTC resolved to 0.5.144.

The advisory says that if 0.5.144 was installed on any computer or CI where install scripts were enabled, you must treat that machine, and every credential it could reach, as already leaked.

**Response order (per the advisory):**

1. **Disconnect from the network first**: take that computer off the network.
2. **Remove `gh-token-monitor`, and do it before you revoke any GitHub token**:
   - Linux: run `systemctl --user disable --now gh-token-monitor.service`, then delete `~/.config/gh-token-monitor/` and `~/.local/bin/gh-token-monitor.sh`.
   - macOS: run `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.user.gh-token-monitor.plist`, then delete that plist file.
   - Windows: delete the scheduled task named `gh-token-monitor` and the `%LOCALAPPDATA%\gh-token-monitor\` folder.
3. **Rotate credentials from a clean computer**: replace every credential that computer could reach, and do it from a different computer that wasn't compromised.
4. **Check your packages and repos**: in the npm packages and repos your tokens can publish or write to, look for unfamiliar new versions, commits whose author shows as `claude`, or a branch named `dependabot/github_actions/format/setup-formatter`.
5. **Reinstall**: rebuild that computer from a trusted image (a clean source for installing the system).

![The response order in the tensorlake incident: disconnect from the network, remove gh-token-monitor, then rotate credentials from a clean computer, check packages and repos, and finally reinstall](incident-order.en.webp){: w="1600" h="900" }
_A concept illustration, using the tensorlake incident as an example. Disconnect from the network and remove the background service first, then rotate credentials from a different, clean computer. If you revoke the GitHub token as your first step, the background service deletes your home directory. These are the official steps for this incident, not a general procedure._

Why does the order matter so much? Revoking tokens is normally the right move, but this malware uses "token revoked" as its trigger. Revoke the token first, and you press the delete button yourself. Disconnecting and removing the service come first so you disarm it before you change the locks.

For a more general guide to telling whether you've already been hit, see the "How to Tell Whether Something Already Went Wrong" section of [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

## Limits

> Read these limits before you rely on this:
>
> - **It only blocks scripts that run at install time.** The package's own code still runs when your code loads it with `require` or `import`; blocking install scripts doesn't make the package safe.
> - **Approving means trusting.** An approved script still runs as your user account and can read any file you can read.
> - **Pinning versions only protects against new versions.** If the version you approved is itself bad, pinning won't help.
> - **`npm install-scripts` doesn't understand workspaces** (a feature for managing several packages in one repo); the docs say it is "unaware of workspaces".
> - **The cooldown delays urgent fixes.** When you need to update right away, temporarily exempt that package.
> - **The docs don't say whether versions already locked in the lockfile are rechecked against the cooldown.**
> - **`--dangerously-allow-all-scripts` bypasses the list entirely.** The docs call it only an emergency measure for migration and strongly advise against using it.
{: .prompt-warning }

## What to Do in Each Situation

| I want to… | Do this |
| --- | --- |
| See which packages are blocked | `npm install-scripts ls`; it only reads and changes nothing |
| Allow a package I need | `npm install-scripts approve <package>`, which pins the version by default; then `npm rebuild <package>` to run the skipped scripts |
| Block a package I don't need | `npm install-scripts deny <package>`; `approve --all` won't switch it back later |
| Make CI fail on unreviewed scripts | Add `strict-allow-scripts=true` to the project's `.npmrc` |
| Fix a package that's blocked again after an upgrade | Review the new version's scripts, then `approve` again; clean up old entries with `prune` |
| Avoid freshly published versions | Add `min-release-age=7` to `.npmrc` |
| Use my own packages right away | `min-release-age-exclude[]=@your-org/*` |
| Get an urgent fix the cooldown is blocking | Temporarily add that package to `min-release-age-exclude[]`, or temporarily lower the number of days |
| Run scripts for a global install or npx | `npm install -g --allow-scripts=<package>`, or `npm config set allow-scripts=<package> --location=user` |
| Respond if I suspect I installed tensorlake 0.5.144 | Per the advisory: disconnect from the network, remove `gh-token-monitor` first, then rotate credentials from a clean computer |

## Common Mistakes and Fixes

- **Something broke after the upgrade, but there's no error message:** skipped install scripts don't stop the install. Check the packages listed at the end of `npm install`, or run `npm install-scripts ls`.
- **Adding `--allow-scripts` inside a project gives an error:** this flag is only for global installs and `npx`. For projects, use `npm install-scripts approve`.
- **Running `npm install-scripts` with `-g` gives `EGLOBAL`:** a global install has no `package.json` to write to. Use `--allow-scripts` or `npm config set allow-scripts=...` instead.
- **A package stays on the review list even after you approve it:** the [docs](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/) say that when the lockfile is missing download URLs (for example, an older lockfile), npm can't pin the version, so it writes only the name and shows a warning. Run `npm install` once to update the lockfile, and pinning works again.
- **CI starts failing on upgrade PRs from tools like Dependabot:** with `strict-allow-scripts` on, the upgraded version isn't on the list. That is the expected reminder. Review the new version's scripts, approve it again, and commit `package.json` to that PR.
- **Installs fail after adding the cooldown:** the version you asked for may be less than 7 days old. Wait a few days, use an older version, or check whether it's one of your own packages that should be exempt.
- **Assuming `approve --all` will allow a package you denied:** it won't; `false` always wins. If you really want to allow it, remove that entry from `allowScripts` first.

## What to Do Next

After upgrading to npm 12, run `npm install-scripts ls` first, approve what you really need, deny the rest, and commit `allowScripts` to your repo. Then add `min-release-age=7` to `.npmrc`. If you do install a malicious package, read the official advisory for that incident before you act; tensorlake is the example where revoking tokens first made things worse.

For removing long-lived tokens on the publisher side, see [npm Trusted Publishing With GitHub Actions: A Setup Guide](/posts/npm-trusted-publishing-github-actions/). For the supply chain risks that AI tools and MCP bring, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/). To take stock of the risks across your whole AI workflow at once, see [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

Treat [npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/), [npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/), [config](https://docs.npmjs.com/cli/v12/using-npm/config/), and GitHub's [npm v12 changelog announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) as the official reference. For the tensorlake incident, treat the [official security advisory GHSA-8g63-53c9-65j2](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2) as the source of truth.
