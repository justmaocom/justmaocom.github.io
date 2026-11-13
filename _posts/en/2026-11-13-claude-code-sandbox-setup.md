---
title: "Sandbox the Commands Your AI Runs: Set Up Claude Code /sandbox Step by Step and Keep SSH Keys and Tokens Out"
description: "Claude Code's sandbox is off by default, and once it's on, it still allows reading ~/.ssh by default. This post turns on /sandbox step by step, confirms it actually blocks, keeps keys and tokens out, and lists what the sandbox does not cover."
date: 2026-11-13 09:00:00 +0800
categories: [Security, AI Agents]
tags: [claude-code, coding-agent, ai-security, sandbox]
media_subpath: /assets/img/posts/claude-code-sandbox-setup/
image:
  path: cover.en.webp
  alt: "Use /sandbox to put the commands Claude runs in a sandbox, then keep SSH keys and tokens out."
---

Claude Code, an AI coding assistant you use in the terminal, runs commands on its own, such as running tests, installing packages, and calling `git`. These commands run under your account, so by default they can read any file you can read, including SSH keys and cloud credentials. Claude Code has a built-in sandbox that keeps these commands inside limits the operating system enforces, which restrict where they can write and which sites they can connect to.

But the sandbox is **off by default**. Even when it's on, the official docs state that it still allows reading `~/.ssh` and `~/.aws/credentials` by default. Many people assume "it's on, so it's safe," but a few steps are still missing.

This post walks you through these steps: turn on `/sandbox`, confirm it actually blocks, keep keys and tokens out, and turn off "retry outside the sandbox." Then it lists what the sandbox does not cover and how to fill those gaps. At the end there is a `settings.json` you can copy as is.

> **Version**: this post follows [Sandboxing](https://code.claude.com/docs/en/sandboxing), [Permissions](https://code.claude.com/docs/en/permissions), [Settings reference](https://code.claude.com/docs/en/settings-reference), and the [changelog](https://code.claude.com/docs/en/changelog), read on 2026-11-13 (Taipei time). That day, the latest Claude Code was 2.1.323 (released November 12). Several November releases fixed sandbox and permission-rule bugs one after another. For example, 2.1.321 fixed read-only commands running outside the sandbox without a prompt, and deny rules not applying when `cp` or `mv` wrote into a folder. 2.1.323 fixed the sandbox possibly turning off mid-conversation, and `excludedCommands` letting commands it didn't list run outside the sandbox. Update Claude Code to the latest version before you follow along.
{: .prompt-info }

This post is the hands-on follow-up to [Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them](/posts/owasp-agentic-top-10-ai-workflow-checklist/). That post only asks you to "confirm whether `/sandbox` is on." This one shows how to configure it once it is. For why you should limit an agent's permissions, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/). This post doesn't repeat that.

## What the Sandbox Blocks and What It Allows by Default

The sandbox covers only commands. That means the commands Claude runs through the Bash, PowerShell, and Monitor tools, plus any programs those commands start. The operating system enforces the limits. macOS uses its built-in Seatbelt, and Linux and WSL2 use bubblewrap. Native Windows is not supported, so Claude Code runs commands outside the sandbox there. To use the sandbox on Windows, install Claude Code inside WSL2.

The official docs list the defaults once it's on:

| Area | Default | Setting to adjust it |
| --- | --- | --- |
| Writes | Only the working directory, a per-user temporary folder, and any folders you add. Even there, protected paths such as Claude Code's settings files, `.mcp.json`, and `.git/hooks` still can't be written | `filesystem.allowWrite`, `filesystem.denyWrite` |
| Reads | Almost the whole computer, **including `~/.ssh` and `~/.aws/credentials`** | `filesystem.denyRead`, `credentials` |
| Network | No direct outbound connections. Every connection goes through a local proxy that checks it against the domains you allow, and the allowlist starts empty. What happens to a domain not on the list **depends on your permission mode**. Manual mode asks you, and `bypassPermissions` mode allows it | `network.allowedDomains`, `network.deniedDomains`, `network.strictAllowlist` |
| Environment variables | Inherited from Claude Code's environment, **including any tokens in it** | `credentials` |

![The sandbox wraps the commands Claude runs; the file tools, hooks, MCP servers, and commands you type yourself with ! are outside it](inside-outside.en.webp){: w="1600" h="900" }
_A concept illustration, not the real UI. The sandbox covers only commands. Other components follow permission rules or run with your full permissions._

The defaults restrict writes and network access tightly, but barely restrict reads and environment variables. Step 3 fills that gap.

## When to Turn It On

It's worth turning on if any of these apply:

- You often press "allow" to let Claude run commands, or you want it to run them without asking you every time. With the sandbox on, the sandbox blocks actions that go out of bounds, instead of you reviewing each command.
- You let Claude read things you didn't write, such as someone else's repo, issues, web pages, or package source code. That content may hide text that tells the AI to run commands.
- Your computer has keys, cloud credentials, or tokens, and you don't want commands the AI runs to read them.

## Step 1: Turn It On With /sandbox

On **macOS**, there's nothing extra to install. On **Linux and WSL2**, install bubblewrap and socat first:

```bash
# Ubuntu / Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

After installing, restart Claude Code, because it checks dependencies only at startup. WSL1 is not supported, so upgrade to WSL2 first. Newer Ubuntu releases restrict user namespaces by default (AppArmor), which keeps bubblewrap from starting. `/sandbox` points out this problem. For the fix, see the official [Add an AppArmor profile for bubblewrap](https://code.claude.com/docs/en/sandboxing#add-an-apparmor-profile-for-bubblewrap).

Then type this in Claude Code:

```text
/sandbox
```

This opens the sandbox panel, which has three tabs:

- **Mode**: choose how commands in the sandbox get approved.
- **Overrides**: whether a command that fails in the sandbox can be rerun outside it. Step 4 turns this off.
- **Config**: view the sandbox settings currently in effect.

On Linux, if the panel shows **only** a Dependencies tab, the sandbox can't start yet. Fix the missing items the tab lists (or the AppArmor restriction), then restart. If the Dependencies tab appears next to the other tabs, only an optional component (the seccomp filter) is missing, and the sandbox still runs.

On the Mode tab, pick one of two options:

- **auto-allow**: commands that run in the sandbox no longer ask you one by one. Deny rules still apply, and ask rules that target specific content, such as `Bash(git push *)`, still prompt you to confirm.
- **regular permissions**: the sandbox still applies its limits, but each command still asks you through the normal permission flow.

Both modes have exactly the same file and network limits. The only difference is whether you get asked. Choose auto-allow if you want to press "allow" less often, or regular permissions if you want to review every command yourself. Note that once you pick auto-allow, Claude no longer asks before it uses commands to change files in the working directory, even if your permission mode is Manual mode, which asks before each file edit.

Claude Code saves the mode you pick in the panel only to `.claude/settings.local.json` in **this project**. To turn on the sandbox for every project, set `"sandbox": { "enabled": true }` in `~/.claude/settings.json`. With only `enabled` set, the mode defaults to auto-allow. To switch to regular permissions, also add `"autoAllowBashIfSandboxed": false`.

**What you get:** the commands Claude runs are now limited by the sandbox. The first time a command tries to reach a new domain, Manual mode (the default permission mode) asks you first. Auto mode leaves it to a classifier model, and `bypassPermissions` mode allows it. To stop every mode from allowing domains outside the list, add `"network": { "strictAllowlist": true }` to `sandbox` in your user settings (since 2.1.219; it has no effect in a repo's settings files). Domains outside the list are then always denied, so add the ones you need to `allowedDomains`.

## Step 2: Confirm It Actually Blocks

The official docs give two commands for this check. **Ask Claude to run them.** Don't type them yourself after the `!` prompt. Commands you type with `!` run outside the sandbox in most cases anyway, so they can't tell you whether the sandbox works.

| Command | Result when the sandbox is working |
| --- | --- |
| `touch ~/sandbox-probe` | macOS shows `Operation not permitted`; Linux and WSL2 show `Read-only file system` |
| `curl --noproxy '*' https://example.com` | Shows `Could not resolve host`, because this command can't get around the sandbox's proxy |

The first command tests that it can't write to your home directory. The second tests that it can't connect out on its own.

Run this check in Manual mode. If Claude asks whether to retry outside the sandbox, **say no**. In `bypassPermissions` mode, or when an allow rule happens to match the command, the retry runs outside the sandbox without asking, and the check no longer tells you anything (Step 4 turns this retry off). Also, if you started Claude Code in your home directory, or added your home directory as a working directory, `touch` can write there anyway, so test again from a project folder. If `touch` still succeeds once you rule out both cases, delete `~/sandbox-probe` first, then run `/sandbox` to confirm the sandbox is on and all dependencies are installed.

**What you get:** if both commands fail, the write and network limits are working.

## Step 3: Keep Keys and Tokens Out

The sandbox has **no built-in list of credentials**. It blocks only the files and variables you list. Use `sandbox.credentials` to list what to protect. The official example below blocks the AWS credentials file and the whole SSH folder, and removes `GITHUB_TOKEN` and `NPM_TOKEN` from the environment of sandboxed commands:

```json
{
  "sandbox": {
    "enabled": true,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

For a file, `"mode": "deny"` means commands in the sandbox can't read it. For an environment variable, it means the variable is removed before each sandboxed command runs. Replace the list with credentials that actually exist on your computer, such as config files for other cloud services, or other environment variables that hold tokens.

I recommend putting this in your user settings, `~/.claude/settings.json`, so it applies to every project. The `deny` entries from every settings layer are merged. Any layer can add more, but no layer can remove a `deny` entry another layer added. That doesn't mean a repo can't touch your protection, though. A repo's settings take precedence over your user settings, and there are other ways to loosen the sandbox. Step 5 covers how to guard against that.

**How to check:** first type `wc -c ~/.ssh/known_hosts` yourself after `!` (swap in a file that actually exists on your computer). This runs outside the sandbox, so it prints the file size. Then ask Claude to run the same command. Once the setting takes effect, it should no longer be able to read the file. `wc -c` prints only the file size, so the contents don't end up in the conversation. Do the same for environment variables. First run `test -n "$GITHUB_TOKEN" && echo set || echo unset` yourself with `!` and confirm it prints `set`, which means your shell had this variable to begin with. Then ask Claude to run it. Once the setting takes effect, it should print `unset`. This command doesn't print the token itself either. If Claude asks to retry outside the sandbox, say no.

**What it also blocks:** once `~/.ssh` is blocked, `git push` and `git pull` in the sandbox fail if they go over SSH. On macOS, SSH remotes can't connect from inside the sandbox even if you don't block `~/.ssh`. The simplest fix is to type `git push` yourself after `!` when you push, so it runs outside the sandbox. Another option is to switch the remote to HTTPS, but that needs an HTTPS credential such as a personal access token, and the settings above have already removed `GITHUB_TOKEN` from the sandbox. The official docs also offer `excludedCommands` to move commands such as `git push` out of the sandbox, but excluded commands run with your full permissions and can connect to any host, so think it through before you use it.

> If you want a tool to sign in as usual inside the sandbox without seeing the real token, the official docs also offer `"mode": "mask"`. The command sees only a placeholder value, and the proxy swaps in the real one when it sends the request. It requires the experimental `network.tlsTerminate`, and on macOS, `mask` on a file has the same effect as `deny`. The setup is more involved, so start with `deny`. For details, see [Mask credentials](https://code.claude.com/docs/en/sandboxing#mask-credentials).
{: .prompt-tip }

## Step 4: Turn Off Retries Outside the Sandbox

When a command fails in the sandbox, Claude can pass the `dangerouslyDisableSandbox` parameter to ask to run it again outside the sandbox. This is an escape hatch for tools that don't work in the sandbox. Who approves that rerun depends on your permission mode:

- Manual mode and `acceptEdits` mode: a confirmation titled "Bash command (unsandboxed)" appears.
- Auto mode: a separate classifier model decides.
- `bypassPermissions` mode: it **runs without asking**.
- Also, if an allow rule happens to match the command, such as `Bash(curl *)`, the rerun goes through without asking you.

To keep every command Claude runs inside the sandbox, close this escape hatch:

```json
{
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "failIfUnavailable": true
  }
}
```

- `allowUnsandboxedCommands: false`: Claude Code ignores `dangerouslyDisableSandbox`. From then on, every command Claude runs executes in the sandbox, except those that match `excludedCommands`. The Overrides tab in `/sandbox` calls this state **Strict sandbox mode**.
- `failIfUnavailable: true`: if the sandbox can't start (an unsupported platform or missing dependencies), Claude Code exits with an error at startup. Without this setting, Claude Code only shows a warning at startup and **still runs commands outside the sandbox**. The tradeoff is that Claude Code won't start at all on unsupported platforms such as native Windows, or on Ubuntu before you fix the AppArmor restriction.

An `allowUnsandboxedCommands: false` in your user settings isn't overridden even if a project's settings say `true` (since 2.1.285).

**What you get:** a command that fails in the sandbox simply fails. Claude reports the error and you decide whether to change the settings, instead of Claude moving outside the sandbox on its own.

**What it also blocks:** tools that don't work in the sandbox simply fail, and Claude can no longer retry them outside it. The official troubleshooting section lists examples such as `docker`, `jest`, Go-based tools on macOS such as `gh`, `gcloud`, and `terraform`, and sign-in flows that need to open a browser. When you hit one, run it yourself with `!`. If turning retries off entirely feels too strict, another option is to keep them and add the ask rule `Bash(dangerouslyDisableSandbox:true)` under `permissions.ask`. Then every retry outside the sandbox asks you first, even in auto mode and `bypassPermissions` mode.

## Step 5: What the Sandbox Does Not Cover

The sandbox covers only commands. The items below are outside its scope and need other measures.

**Claude's file and network tools.** Read, Edit, Write, WebFetch, and WebSearch follow permission rules, and the sandbox doesn't limit them. The official docs say explicitly that `denyRead` doesn't stop the Read tool, and `allowedDomains` doesn't restrict WebFetch. In other words, even if the sandbox blocks `cat ~/.ssh/id_ed25519`, Claude can still read the file with the Read tool. To close this gap, add deny rules to your permission settings:

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  }
}
```

A `Read(...)` deny rule blocks Claude's file tools and the file-reading commands Claude Code recognizes, such as `cat` and `head`. It also stops Edit and Write from changing the same path (NotebookEdit is the exception). With the sandbox on, Claude Code also adds the rule to the sandbox's read deny list. The path syntax differs from the sandbox's. `~/` means your home directory, and an absolute path must start with `//`.

`blockWritesOutsideWorkingDirectories` (since 2.1.314) makes Write, Edit, and NotebookEdit refuse to write outside the working directory in any permission mode. It doesn't restrict commands, because the sandbox handles where commands can write, so the two complement each other. It has two side effects. Claude can no longer edit Claude Code's settings files, even the ones in your project, so you have to edit them yourself. Claude also loses its `EnterWorktree` and `ExitWorktree` tools. To turn it off, delete the key from every settings file and restart. To keep reads inside the working directory as well, there is also `blockReadsOutsideWorkingDirectories` (since 2.1.257).

**Programs Claude Code starts itself.** [Hooks](/posts/claude-code-hooks-automate-checks/), local MCP servers, plugin monitors, LSP servers, status line commands, and `apiKeyHelper` all run with your full permissions. So do mods, which are plugins that run their own code inside Claude Code. Check what one does before you install it, because the sandbox can't help here. To keep credential environment variables away from these programs too, the official docs offer the `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` environment variable. With or without the sandbox, it removes credentials from the environment of every subprocess.

**Commands you type yourself with `!`.** In most cases these run outside the sandbox, even with Strict sandbox mode on. Step 3 relies on this when you run `git push` yourself. The flip side is that the sandbox doesn't protect you from commands you type here.

**Commands listed in `excludedCommands`.** The sandbox doesn't limit listed commands at all. The broader an entry (for example, `docker *`), the more can happen outside the sandbox. The official docs recommend that when a tool only needs to write to one more folder or reach one more domain, you use `allowWrite` or `allowedDomains` instead, so it stays in the sandbox.

**Settings files in someone else's repo.** A repo's `.claude/settings.json` and `.claude/settings.local.json` take precedence over your user settings. Normally, they can turn the sandbox off with `"enabled": false`, add `excludedCommands` to move commands out of the sandbox (excluded commands can read `~/.ssh` and tokens), reopen paths you blocked with a narrower `allowRead`, or add `allowWrite` and `allowedDomains` to loosen writes and network access. Settings that live only in `~/.claude/settings.json` can't stop any of this.

Before you open an unfamiliar repo, look at these two files. A safer approach is to save your sandbox settings to a separate file, such as `~/.claude/sandbox-strict.json`, holding the `sandbox` section of the complete settings in the next section (the outermost level is `{ "sandbox": { ... } }`). Then pass it with `--settings` when you start Claude Code:

```bash
claude --settings ~/.claude/sandbox-strict.json
```

When `--settings` turns off retries outside the sandbox, the sandbox enters what the official docs call the "admin-required" state (since 2.1.285). Claude Code then ignores the repo's `excludedCommands`, `allowedDomains`, write permissions, and any setting that changes `enabled` to `false`. The repo also can't use `allowRead` to reopen paths that `credentials` in `--settings` blocked. The tradeoff is that `/sandbox` no longer opens the panel. It shows `Sandbox settings are overridden by a higher-priority configuration` instead. To see where settings come from, check `Setting sources` in `/status`.

**The domain allowlist checks only hostnames.** The proxy allows a connection based on the hostname it requests, and by default it doesn't decrypt or inspect encrypted traffic. The official docs warn that allowing a broad domain such as `github.com` can become a channel for sending data out. Put only the domains you really need on the allowlist. Also, when you choose "Yes, and don't ask again" in the network prompt, Claude Code saves a `WebFetch(domain:...)` allow rule, and that rule also lets the WebFetch tool reach that domain.

**git worktree.** If you open Claude Code in a worktree, as in [Let Two AI Agents Work Separately: Isolated Working Directories With git worktree](/posts/git-worktree-parallel-ai-agents/), the sandbox allows writes to the main repo's shared `.git` folder, so `git commit` works as usual. The `hooks/` and `config` inside it are still not writable, though. Since 2.1.323, `git worktree add`, `move`, and `remove` fail in the sandbox because of read-only restrictions, and so does committing in a worktree that this conversation didn't open or add. Create and remove worktrees yourself in the terminal.

To contain everything above as well, run the whole of Claude Code inside a container, a virtual machine, or the official sandbox runtime. The official [Sandbox environments](https://code.claude.com/docs/en/sandbox-environments) page compares the options.

## The Complete settings.json

Here are the previous steps combined, for `~/.claude/settings.json`. If the file already has `permissions` or `sandbox`, merge these entries in instead of overwriting the whole file:

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

This configuration does the following:

- The sandbox is on by default in every project, and Claude Code won't start if the sandbox can't.
- Commands Claude runs can't be retried outside the sandbox.
- Commands in the sandbox can't read SSH keys or AWS credentials, and can't get `GITHUB_TOKEN` or `NPM_TOKEN`.
- Claude's file tools can't read those same files, and can't write outside the working directory.

All of this holds only as long as the repo doesn't loosen it. As Step 5 explained, a repo's settings can turn the sandbox off or loosen it. To guard against that, save the `sandbox` section as `~/.claude/sandbox-strict.json` (the file itself is still one JSON object, with `{ "sandbox": { ... } }` as the outermost level) and start with `claude --settings ~/.claude/sandbox-strict.json`.

After saving, restart Claude Code, run `/sandbox`, and confirm on the Config tab that the settings took effect (if you started with `--settings`, check `Setting sources` in `/status` instead). Then check again with the methods from Steps 2 and 3.

## Conclusion

The sandbox is off by default, and even when it's on it blocks only writes and network access. You have to cover reads and environment variables yourself. Follow the order in this post: turn it on with `/sandbox`, ask Claude to run two commands to confirm it blocks, list the keys and tokens to protect in `sandbox.credentials`, then turn off retries outside the sandbox with `allowUnsandboxedCommands: false`. Finally, remember that the sandbox covers only commands. Claude's file tools depend on permission rules, hooks and MCP servers run with your full permissions, and a repo's settings can loosen the sandbox, so start with `--settings` when you open an unfamiliar repo.

## Further Reading

- [Sandboxing](https://code.claude.com/docs/en/sandboxing): the full official guide, including troubleshooting and organization-level enforced settings.
- [Permissions](https://code.claude.com/docs/en/permissions): how to write permission rules, and how to restrict the file tools.
- [Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them](/posts/owasp-agentic-top-10-ai-workflow-checklist/): where this post started, a ten-question self-check.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): MCP servers and plugins run outside the sandbox, and this post explains the risks they bring.
- [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/posts/claude-code-hooks-automate-checks/): hooks run with your full permissions and aren't limited by the sandbox.
