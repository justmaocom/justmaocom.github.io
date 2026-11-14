---
title: "npm 12 Blocks Install Scripts by Default: Review Scripts and Add a 7-Day Cooldown"
description: "npm 12 no longer runs dependency install scripts by default. This post shows how to approve the packages that really need them with npm install-scripts and add a 7-day cooldown with min-release-age, and explains why the tensorlake advisory requires removing a persistent service before revoking tokens."
date: 2026-11-14 18:00:00 +0800
categories: [Security, Supply Chain]
tags: [supply-chain-security, npm, application-security, incident-response]
media_subpath: /assets/img/posts/npm-12-install-scripts-allowscripts/
image:
  path: cover.en.webp
  alt: "npm 12 blocks dependency install scripts at install time and lets through only the packages you approved in allowScripts."
---

After upgrading to npm 12, you might see something confusing: `npm install` finishes successfully and the packages are there, but a feature no longer works. A dependency's install script may have been skipped.

npm 12 no longer runs these scripts by default. Your job now is to check which packages need review, understand each script's purpose and source, approve the ones you need, and commit the list to version control. You can also add a 7-day cooldown to reduce the chance of installing a malicious version as soon as it appears. These two protections do different jobs, and both have limits.

A few terms first:

- **Dependency**: a package your project uses, including the packages it depends on in turn.
- **Install script**: a command that runs automatically during installation, commonly named `preinstall`, `install`, or `postinstall`. It runs with the permissions of the account running npm and can access files and credentials that account can read.
- **`package.json`**: the file that records project settings and dependencies. npm 12 also stores script approvals here.
- **Lockfile** (`package-lock.json`): records resolved dependency versions and sources so later installs can use the same versions.
- **`.npmrc`**: npm's configuration file. This post puts shared team settings in the project root.
- **Token**: a credential that proves identity. Whoever has it can act within the permissions it grants.

Why review install scripts? Malicious code can run at this stage, before your application even loads the package. `tensorlake@0.5.144`, published on October 8, 2026, is one example. According to the [official security advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2), it used `preinstall` to steal GitHub and npm tokens, cloud credentials, and AI tool and MCP configuration.

The [npm Trusted Publishing setup guide](/posts/npm-trusted-publishing-github-actions/) covers the publisher side. This post looks at the installer side: how to manage scripts, avoid freshly published versions, and why the tensorlake incident calls for a specific response order.

> **Version note:** This post is based on the official npm CLI 12.2.2 docs [npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/), [npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/), and [config](https://docs.npmjs.com/cli/v12/using-npm/config/), as read on 2026-11-13, plus GitHub's [npm v12 announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/). It does not include hands-on test results for these npm commands. For exact commands and defaults, defer to the docs for your npm version.
{: .prompt-info }

## What Changed in npm 12

GitHub's [July 8, 2026 announcement](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) announced that npm v12 is generally available and tagged `latest`. The relevant changes are:

- **Dependency install scripts no longer run by default.** This covers `preinstall`, `install`, `postinstall`, and implicit node-gyp builds triggered by `binding.gyp`. The policy also covers `prepare` scripts for dependencies installed from git, local files, or links.
- **By default, npm skips the scripts and continues installing.** It lists packages awaiting approval at the end. So a successful install only means the packages are present; it does not mean their required build or download steps have completed.
- **Decisions live in `allowScripts` in `package.json`.** Scripts matching an approval can run. Explicitly denied scripts are skipped and no longer appear as pending review.

The same release also blocks git dependencies (`allow-git`) and remote URL dependencies (`allow-remote`, such as a direct `.tgz` URL) by default. Source approval and script approval are separate checks: approving a script does not also allow its source. Projects using these sources need to review those settings separately.

![npm 12 checks allowScripts to decide whether to run a script, skip it, or list it for review](gate.en.webp){: w="1600" h="900" }
_With the defaults in place, scripts matching an approval run. Explicitly denied scripts are skipped; unreviewed scripts are skipped and listed. Approvals pin versions by default, so upgrades need another review._

Packages that compile or download native code, such as image-processing libraries and database drivers, are more likely to be affected. The official docs use `canvas` and `sharp` in approval examples, but that does not mean every project needs to approve them. Check the versions and installation methods your project actually uses.

## Step 1: Check Your npm Version

In a terminal, run:

```bash
npm -v
```

- **12.x**: the policy is on by default. Go straight to Step 2.
- **11.x starting at 11.16.0**: GitHub's [June announcement](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/) says these versions show warnings to help you prepare for migration, but those warnings are not the same as npm 12's default blocking. Use `npm approve-scripts --allow-scripts-pending` to inspect the list, then approve or deny packages individually.
- **Older versions**: check that your Node.js version meets the target npm version's requirements before upgrading. To follow this post, you can explicitly select npm 12 with `npm install -g npm@12`.

Team members and CI should use the same npm version. The same `allowScripts` list is not guaranteed to block anything under an older npm version. Also check whether any settings override the defaults.

## Step 2: See Which Packages Need Review

In a project where dependencies have already been installed, run:

```bash
npm install-scripts ls
```

This read-only command lists packages with install scripts that are not yet covered by an `allowScripts` rule. Explicitly denied packages do not appear. For a new project, first run `npm install` with npm 12's defaults, then inspect its final output and this list.

Next, inspect the scripts for each version. If the list includes `canvas@3.2.0`, for example:

```bash
npm view canvas@3.2.0 scripts
```

`npm view` shows what the currently configured registry reports, which may not match what is installed locally. Also inspect that version's installed `package.json`, the files its scripts call, and where any downloaded programs come from. Transitive dependencies may be nested, and several versions of the same package may be installed. Do not review only the copy at the top level.

These guidelines can help:

- **It compiles or downloads native code**: the script may be necessary, but still check its source, download location, and purpose. Needing a build is not enough reason to approve it.
- **It only sends usage statistics or prints ads or thank-you messages**: deny it if the functionality you need does not depend on it.
- **It downloads from unknown URLs or uses deliberately obfuscated code**: leave it unapproved while you investigate. If you suspect malware, do not launch the package to test it.
- **Its purpose is unclear**: leave it pending. For a package whose source you trust, you can test relevant features while its install scripts remain blocked. If something breaks, identify what is missing before deciding whether to approve. This test only tells you whether the script is needed; it does not prove the package is safe.

## Step 3: Approve or Deny, Rebuild, Then Commit

These commands use the official docs' example package names. Replace them with packages you have reviewed:

```bash
npm install-scripts approve canvas sharp
npm install-scripts deny telemetry-pkg
```

`telemetry-pkg` is an illustrative denial entry. `npm approve-scripts` and `npm deny-scripts` provide the same operations.

**Approvals pin versions by default.** `approve` writes `package@version` entries to limit approval to reviewed versions. One detail matters: the [docs](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/) say a package name matches all installed versions of that package. If two versions are installed, review both before approving the name.

The resulting `package.json` looks roughly like this. This fragment is assembled from the docs; the versions are illustrative. Check what the command actually generates:

```json
{
  "allowScripts": {
    "canvas@3.2.0": true,
    "sharp@0.34.5": true,
    "telemetry-pkg": false
  }
}
```

- `true` allows and `false` denies. Denials use names without versions, and an existing denial takes priority over approval.
- `--no-allow-scripts-pin` records only the name and allows future versions too. It is generally best avoided.
- `approve --all` approves all pending packages at once. Use it only after reviewing each one.
- If the lockfile lacks a `resolved` URL, npm may be unable to verify the version and fall back to **name-only approval with a warning**. That broadens the approval, so do not ignore the warning. If `omit-lockfile-registry-resolved` is enabled, adjust it first, then follow the [docs](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/) to restore the lockfile's source data. Next, remove the broad name-only approval, reapprove, and inspect the diff to confirm that only version-specific rules remain.

Approval updates the list; it does not run scripts skipped earlier. Next, run:

```bash
npm rebuild canvas sharp
```

According to the [npm rebuild docs](https://docs.npmjs.com/cli/v12/commands/npm-rebuild/), this runs the lifecycle scripts for those packages. Then run your project's tests and build to check the features you actually need.

Inspect the diff before committing. Commit the approval list, and include the lockfile if it also has changes you intend to keep:

```bash
git diff -- package.json package-lock.json
git add package.json
# If package-lock.json has intended changes, also run git add package-lock.json
git commit -m "chore(deps): approve required install scripts"
```

**After an upgrade**, the new version no longer matches the old approval and appears for review again. Review its scripts before reapproving; npm updates the corresponding version rule. Preview obsolete entries with `npm install-scripts prune --dry-run`, then remove them with `npm install-scripts prune`. It also removes denial entries that no longer match installed packages, so if your team keeps denials to block certain packages preemptively, check before pruning.

**Want CI to fail on unreviewed scripts?** Add this to the project's `.npmrc`:

```ini
strict-allow-scripts=true
```

According to the [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#strict-allow-scripts), unreviewed install scripts then cause installation to fail; explicitly denied scripts are still skipped. After committing the settings and list, have CI run `npm ci` and your existing tests with the same npm version to confirm that a clean install can build successfully.

## Step 4: Add a 7-Day Cooldown in .npmrc

Script review controls what can run during installation. A cooldown controls how recent a selected version can be. It gives new releases more time to be discovered, reported, and removed if they are malicious; it does not guarantee detection within seven days.

Start with this in the project's root `.npmrc`:

```ini
min-release-age=7
```

The unit is **days**. The [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#min-release-age) say npm resolves dependencies to versions published more than seven days ago, within the allowed version range. If no version qualifies, resolution fails.

If an internal package truly needs to be available immediately, add an exception, for example:

```ini
min-release-age-exclude[]=@your-org/internal-tool
```

Replace the example with your actual package. You can exempt an entire scope with `@your-org/*`, but that lets more packages bypass the cooldown. Start with individual packages that need an exception.

Keep two things in mind:

- **Only matching packages are exempt.** Their dependencies still follow the cooldown unless they also match an exception.
- **An exception does not change the download source.** The exception list matches names only; it does not configure which registry npm uses. The docs also advise owning your private scope on the public npm registry, so others cannot publish packages under the same name first.

![The tensorlake malicious release window compared with a seven-day cooldown](cooldown.en.webp){: w="1600" h="900" }
_The tensorlake incident illustrates the principle: if resolution applies the seven-day limit without an exception or override, 0.5.144 is too new during its release window. The scope-wide exception shown in the image is only an optional example._

The advisory says `tensorlake@0.5.144` was on npm for about 1 hour 40 minutes (2026-10-08 01:12–02:54 UTC, 09:12–10:54 Taipei time). In other words, with the cooldown applied during resolution, it would have been removed before it was old enough to be selected. This shows the buffer a cooldown can provide, **not a guarantee for every installation scenario**. The docs also do not say whether versions already recorded in a lockfile are rechecked, so do not treat the cooldown as a malware scan of existing dependencies.

**Urgent fixes can be blocked too.** The docs say that if the cooldown blocks a patched version needed by `npm audit fix`, npm keeps the vulnerable version, warns, and exits with a failure. Verify the patched version and its source, then temporarily exempt that package. Remove the exception after updating and validating. Lowering the age also relaxes the policy, but affects other packages at the same time.

If the same config file sets `before`, which selects versions published before an absolute date, `before` takes priority. Across configuration sources, npm's normal precedence applies. Check whether CI arguments, environment variables, or personal settings change the project's intended limit.

Commit the shared `.npmrc` settings after checking that the file contains no tokens or other secrets, so the team and CI use the same policy.

## Step 5: Allow Scripts for Global Installs and npx

Global installs (`npm install -g`) and one-off runs (`npm exec`, `npx`) have no project `package.json` to record approvals in, and `npm install-scripts -g` fails with `EGLOBAL`. Use the `allow-scripts` setting for these cases instead.

Here, `your-cli@1.2.3` is a placeholder tool and version. Replace it with the tool you intend to install or run. Replace `canvas,sharp` with the packages whose install scripts it actually needs and that you have reviewed:

```bash
# Specify the tool to install; allow only the listed packages' scripts for this install
npm install -g your-cli@1.2.3 --allow-scripts=canvas,sharp

# One-off execution: the command and its arguments go after --
npm exec --allow-scripts=canvas,sharp --package=your-cli@1.2.3 -- your-cli

# Save a persistent list only if you need it
npm config set allow-scripts=canvas,sharp --location=user
```

- `--allow-scripts` names **packages allowed to run install scripts**. It does not specify which tool to install.
- The [docs](https://docs.npmjs.com/cli/v12/using-npm/config/#allow-scripts) say passing this option on the command line to a project-scoped `npm install`, `npm ci`, `npm update`, or `npm rebuild` is an error. Maintain `allowScripts` for projects.
- This list matches package names, unlike `allowScripts`, which pins versions by default. A personal setting persists; remove it when no longer needed with `npm config delete allow-scripts --location=user`.
- This controls only install scripts. The tool subsequently run by `npm exec` or `npx` still uses your permissions. Blocking install scripts does not make an unfamiliar tool safe to execute.

## After Installing Malware: The Special Response Order in the tensorlake Incident

Rotating credentials is a necessary response, but this incident adds a trap: the malware installs a persistent `gh-token-monitor` service that deletes the user's home directory when it detects revocation of the stolen GitHub token. The advisory therefore requires isolating the machine and removing the service before revoking tokens. **The following procedure is specific to this incident; do not apply it as a fixed sequence for every compromise.**

According to the [official advisory](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2), the affected packages are npm's `tensorlake@0.5.144` and the `tensorlake-native-*` packages at that version. The PyPI and crates.io packages and the tensorlake CLI were not affected. An attacker used a compromised maintainer account to publish through the project's own release workflow, so the malicious version carried valid npm provenance. Provenance shows where and how a package was built; it cannot guarantee the code is free of malicious behavior.

The payload collected GitHub, npm, and cloud credentials, SSH and GPG keys, `.env` files, browser passwords, and AI tool and MCP configuration. It also used stolen tokens to spread to other packages and repositories.

### Check Whether You Were Affected

Start with lockfiles and installation records. There is no need to execute the suspicious package:

- Find the `tensorlake` and `tensorlake-native-*` entries and check whether their corresponding `version` is `0.5.144`. Some lockfile formats store names and versions separately; searching only for the literal `tensorlake@0.5.144` can miss matches.
- `npm list tensorlake` shows only the currently installed version. Even if the package has since been removed or downgraded, that does not prove it was never installed.
- Check historical CI logs, especially for resolution to that version during 2026-10-08 01:12–02:54 UTC. The current lockfile does not replace installation history either.

The advisory says to treat a machine and its accessible credentials as compromised if it installed 0.5.144 with install scripts enabled. Finding the version is the starting point for investigation; also establish whether scripts ran and which credentials were accessible.

### Follow the Advisory

1. **Disconnect from the network** to isolate the affected machine.
2. **Stop and remove `gh-token-monitor` before revoking GitHub tokens**:
   - Linux: run `systemctl --user disable --now gh-token-monitor.service`, then delete `~/.config/gh-token-monitor/` and `~/.local/bin/gh-token-monitor.sh`.
   - macOS: run `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.user.gh-token-monitor.plist`, then delete the plist.
   - Windows: delete the `gh-token-monitor` scheduled task and `%LOCALAPPDATA%\gh-token-monitor\` folder.
3. **Rotate all accessible credentials from a different, clean machine**. Do not enter new credentials on the affected machine.
4. **Check packages and repositories for propagation**, including unexpected releases, commits authored by `claude`, and the `dependabot/github_actions/format/setup-formatter` branch. These are indicators from the advisory; assess them alongside the actual changes and records.
5. **Rebuild the machine from a trusted image**.

![The tensorlake response order: isolate, remove the persistent service, rotate credentials, check propagation, and rebuild](incident-order.en.webp){: w="1600" h="900" }
_This is the special sequence in the tensorlake advisory: remove the persistent service that can trigger deletion, then rotate credentials from a clean machine. For other incidents, follow their specific advisories and response guidance._

**Fix the project's dependencies too.** The advisory identifies `0.5.143` and earlier versions as unaffected by this incident. During recovery, remove the malicious version, update the lockfile, and confirm that future installs will not select `0.5.144` again. Downgrading or deleting `node_modules` does not undo credential theft or replace rebuilding and investigating the machine.

## What These Settings Do Not Protect

> - **Script approval is not a sandbox.** Approved scripts still use the npm account's permissions; file and network access are not automatically restricted.
> - **Loading packages and running tools still carry risk.** Malicious code can run through `require`, `import`, or direct tool execution.
> - **Pinning only narrows approval.** If the approved version is malicious, pinning it does not make it safe.
> - **A cooldown does not replace review and patching.** A malicious version that goes undetected for more than seven days can still qualify, while urgent patches may need a controlled exception.
> - **Check workspaces separately.** The docs say `npm install-scripts` is unaware of workspaces. Do not assume that adding `-w` manages a separate policy for each workspace.
> - **Other settings can override the policy.** `--ignore-scripts` prevents even approved scripts from running; `--dangerously-allow-all-scripts` bypasses approvals and denials. Do not make the latter your routine fix.
{: .prompt-warning }

## Common Situations and What to Do

| Situation | Action |
| --- | --- |
| Installation succeeds but a feature is broken | Check `npm install-scripts ls` for a skipped build step the feature needs |
| A feature still fails after approval | Confirm you ran `npm rebuild <package>`, then check `ignore-scripts` and build logs |
| Several versions of one package are installed | Review each; approving by name matches all installed versions |
| An upgrade PR fails CI because scripts need review | Review the new scripts, reapprove, and commit the list changes |
| A previously denied package now needs approval | Remove the denial, then review and approve; `approve --all` will not override `false` |
| Approval warns that it cannot pin a version | Check lockfile `resolved` data, repair it, then reapprove and confirm only version-specific rules remain |
| The cooldown blocks an urgent patch | Verify the source, exempt only that package temporarily, and remove the exception after validation |
| A global or one-off tool needs install scripts | Specify the tool and version, then list approved script packages with `--allow-scripts` |

Start with your existing project's review list. Restore necessary scripts after review, then share the list and `.npmrc` through version control with your team and CI. Whenever you upgrade a dependency, review the new version's scripts too.

For removing long-lived publishing tokens, see the [npm Trusted Publishing setup guide](/posts/npm-trusted-publishing-github-actions/). For related AI tool and MCP risks, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/). For a broader workflow review, see the [OWASP Agentic Top 10 checklist](/posts/owasp-agentic-top-10-ai-workflow-checklist/).
