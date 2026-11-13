---
title: "Sandbox the Commands Your AI Runs: Set Up Claude Code /sandbox Step by Step and Keep SSH Keys and Tokens Out"
description: "Claude Code's sandbox is off by default and still reads ~/.ssh when on. Turn it on, verify it, keep keys and tokens out, with real results from a Mac."
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

This post walks you through these steps: turn on `/sandbox`, confirm it actually blocks, keep keys and tokens out, and turn off "retry outside the sandbox." Then it lists what the sandbox does not cover and how to fill those gaps. Each step includes the results I actually got on my own Mac, and at the end there is a `settings.json` you can copy as is.

> **Version and test run**: this post follows [Sandboxing](https://code.claude.com/docs/en/sandboxing), [Permissions](https://code.claude.com/docs/en/permissions), [Settings reference](https://code.claude.com/docs/en/settings-reference), and the [changelog](https://code.claude.com/docs/en/changelog), read on 2026-11-13 (Taipei time). I ran through it the same day with Claude Code 2.1.323 on macOS, the latest version that day (released November 12). Several November releases fixed sandbox and permission-rule bugs one after another. For example, 2.1.321 fixed read-only commands running outside the sandbox without a prompt, and deny rules not applying when `cp` or `mv` wrote into a folder. 2.1.323 fixed the sandbox possibly turning off mid-conversation, and `excludedCommands` letting commands it didn't list run outside the sandbox. Before you follow along, run `claude update` in your terminal, then check the version with `claude --version`.
{: .prompt-info }

This post is the hands-on follow-up to [Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them](/posts/owasp-agentic-top-10-ai-workflow-checklist/). That post only asks you to "confirm whether `/sandbox` is on." This one shows how to configure it once it is. For why you should limit an agent's permissions, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/). This post doesn't repeat that.

## A Few Terms First

These words come up again and again below, so here they are in one line each:

- **Sandbox**: a fence the operating system guards. Programs inside run as usual, but they can only touch the files and network the fence allows.
- **Token**: a string that stands in for a password. Tools use it to sign in to services such as GitHub or npm. Anyone who gets it can act as you.
- **Environment variable**: a setting a program receives from the terminal when it starts. Many tools keep tokens here, such as `GITHUB_TOKEN`.
- **Domain**: a website's name, such as `example.com` or `github.com`.
- **Allowlist**: the domains you list in advance as OK to connect to. Anything not on it needs a separate decision.
- **Proxy**: a relay that forwards network connections. Every connection a sandboxed command makes goes through a proxy that Claude Code runs on your computer, and the proxy checks the domain.
- **Permission mode**: decides whether Claude asks you before acting. The default, Manual mode, asks each time. Auto mode leaves it to a separate AI classifier model. `bypassPermissions` mode asks nothing.
- **`!` commands**: if you start your input in Claude Code with `!`, the command after it runs directly in your terminal without going through Claude.

## How I Tested

So you can reproduce the results, here is how I did it:

- **Setup**: macOS (Apple Silicon), Claude Code 2.1.323, the morning of 2026-11-13 (Taipei time). I didn't test Linux or WSL2.
- **Method**: the `/sandbox` panel only works in the interactive screen. In non-interactive mode (`claude -p`, which passes your request as an argument and exits when done), it replies `/sandbox isn't available in this environment.` So I wrote the settings for each step into a JSON file and passed it with `claude -p "Use Bash to run ..." --settings file`. These are the same keys the panel or `settings.json` sets.
- **No real keys**: I created a fake "canary" file, `~/.sandboxlab-canary/secret.txt` (its content is `FAKE-SECRET-FOR-TEST`, 21 bytes), to stand in for `~/.ssh`, and a fake environment variable, `SANDBOXLAB_FAKE_TOKEN`, to stand in for `GITHUB_TOKEN`. I deleted both afterward.
- **Nobody can press "allow" in non-interactive mode**: so wherever a prompt would appear, the results below show a denial. In the normal interactive screen, you get a confirmation prompt instead.
- In the output, home directory paths are rewritten as `~` and the test folder is shortened to `…/sandboxlab`. Everything else is as it appeared, except that I removed curl's progress meter.

## What the Sandbox Blocks and What It Allows by Default

The sandbox covers only commands. That means the commands Claude runs through the Bash, PowerShell, and Monitor tools, plus any programs those commands start. The operating system enforces the limits. macOS uses its built-in Seatbelt, and Linux and WSL2 use bubblewrap. Native Windows is not supported, so Claude Code runs commands outside the sandbox there. To use the sandbox on Windows, install Claude Code inside WSL2.

The official docs list the defaults once it's on:

| Area | Default | Setting to adjust it |
| --- | --- | --- |
| Writes | Only the working directory (the folder you started Claude Code in), a per-user temporary folder, and any folders you add. Even there, protected paths such as Claude Code's settings files, `.mcp.json`, and `.git/hooks` still can't be written | `filesystem.allowWrite`, `filesystem.denyWrite` |
| Reads | Almost the whole computer, **including `~/.ssh` and `~/.aws/credentials`** | `filesystem.denyRead`, `credentials` |
| Network | No direct outbound connections. Every connection goes through a local proxy that checks it against the domains you allow, and the allowlist starts empty. What happens to a domain not on the list **depends on your permission mode**. Manual mode asks you, and `bypassPermissions` mode allows it | `network.allowedDomains`, `network.deniedDomains`, `network.strictAllowlist` |
| Environment variables | Inherited from Claude Code's environment, **including any tokens in it** | `credentials` |

![The sandbox wraps the commands Claude runs; the file tools, hooks, MCP servers, and commands you type yourself with ! are outside it](inside-outside.en.webp){: w="1600" h="900" }
_A concept illustration, not the real UI. The sandbox covers only commands. Other components follow permission rules or run with your full permissions._

The defaults restrict writes and network access tightly, but barely restrict reads and environment variables. With only the sandbox turned on and nothing else set, I asked Claude to check the canary file and the fake token. The result was exactly the same as with the sandbox off:

```text
# Settings: {"sandbox": {"enabled": true}}. Asked Claude to run:
# wc -c ~/.sandboxlab-canary/secret.txt; test -n "$SANDBOXLAB_FAKE_TOKEN" && echo set || echo unset
      21 ~/.sandboxlab-canary/secret.txt
set
```

`21` means the file was readable, and `set` means the token was there. Step 3 fills that gap.

## When to Turn It On

It's worth turning on if any of these apply:

- You often press "allow" to let Claude run commands, or you want it to run them without asking you every time. With the sandbox on, the sandbox stops actions that go out of bounds, so you don't have to review every command yourself.
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

After installing, restart Claude Code, because it checks for these packages only at startup. WSL1 is not supported, so upgrade to WSL2 first. Newer Ubuntu releases restrict user namespaces by default (AppArmor), which keeps bubblewrap from starting. `/sandbox` points out this problem. For the fix, see the official [Add an AppArmor profile for bubblewrap](https://code.claude.com/docs/en/sandboxing#add-an-apparmor-profile-for-bubblewrap).

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

Both modes have exactly the same file and network limits. The only difference is whether you get asked. Choose auto-allow if you want to press "allow" less often, or regular permissions if you want to review every command yourself. One thing to note: with auto-allow, Claude no longer asks before it uses commands to change files in the working directory. That holds even in Manual mode, which normally asks before every file edit.

Claude Code saves the mode you pick in the panel only to `.claude/settings.local.json` in **this project**. To turn on the sandbox for every project, set `"sandbox": { "enabled": true }` in `~/.claude/settings.json`. With only `enabled` set, the mode defaults to auto-allow. To switch to regular permissions, also add `"autoAllowBashIfSandboxed": false`.

**What you get:** the commands Claude runs are now limited by the sandbox. The first time a command tries to reach a new domain that isn't on the list, what happens depends on your permission mode:

- Manual mode (the default): it asks you first.
- Auto mode: a classifier model decides.
- `bypassPermissions` mode: it allows the connection without asking.

To stop every mode from allowing domains outside the list, add `"network": { "strictAllowlist": true }` to `sandbox` in your user settings, or in a file you pass with `--settings` (since 2.1.219; it has no effect in a repo's settings files). Domains outside the list are then always denied, so add the ones you need to `allowedDomains`.

**What I actually got:** I asked Claude to run `curl -sS -o /dev/null -w "%{http_code}\n" https://example.com`, which prints only the site's status code (`200` means it connected), under four settings:

```text
# 1. Empty allowlist, Manual mode (non-interactive, nobody answers the prompt -> denied)
curl: (56) CONNECT tunnel failed, response 403
000

<sandbox_violations>
deny network-outbound example.com:443 (user denied)
</sandbox_violations>

# 2. example.com added to allowedDomains, Manual mode
200

# 3. Empty allowlist, bypassPermissions mode (allowed without asking)
200

# 4. strictAllowlist: true added, bypassPermissions mode
curl: (56) CONNECT tunnel failed, response 403
000

<sandbox_violations>
deny network-outbound example.com:443 (host is not on the allow list)
</sandbox_violations>
```

Compare 3 and 4: in `bypassPermissions` mode, domains outside the list go through without a prompt, and only `strictAllowlist` stops them.

## Step 2: Confirm It Actually Blocks

The official docs give two commands for this check. **Ask Claude to run them.** Don't type them yourself after `!`. Commands you type with `!` run outside the sandbox in most cases anyway, so they can't tell you whether the sandbox works.

| Command | Result when the sandbox is working |
| --- | --- |
| `touch ~/sandbox-probe` | macOS shows `Operation not permitted`; Linux and WSL2 show `Read-only file system` |
| `curl --noproxy '*' https://example.com` | Shows `Could not resolve host`, because this command can't get around the sandbox's proxy |

The first command tries to create an empty file in your home directory, which tests that commands can't write outside the working directory. The second tells curl to skip the proxy and connect directly, which tests that commands can't connect out on their own.

Keep three things in mind during the check:

1. **Use Manual mode.** If Claude asks whether to retry outside the sandbox, **say no**. In `bypassPermissions` mode, or when an allow rule happens to match the command, the retry runs outside the sandbox without asking, and the check no longer tells you anything (Step 4 turns this retry off).
2. **Don't start Claude Code in your home directory.** If you started it there, or added your home directory as a working directory, `touch` can write there anyway, so test again from a project folder.
3. **If `touch` still succeeds once you rule out both cases**, delete `~/sandbox-probe` first, then run `/sandbox` to confirm the sandbox is on and all dependencies are installed.

**What I actually got (macOS):**

```text
# Asked Claude to run: touch ~/sandbox-probe
touch: ~/sandbox-probe: Operation not permitted
# exit code 1

# Asked Claude to run: curl --noproxy '*' https://example.com
curl: (6) Could not resolve host: example.com
# exit code 6
```

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

I recommend putting this in your user settings, `~/.claude/settings.json`, so it applies to every project. The `deny` entries from every settings layer are merged. Any layer can add more, but no layer can remove a `deny` entry another layer added. That doesn't mean someone else's repo can't touch your protection, though. A repo's settings take precedence over your user settings, and there are other ways to loosen the sandbox. Step 5 covers how to guard against that.

**How to check:** these checks print only a file size or whether a variable is set, so the contents of your keys or tokens never end up in the conversation.

1. Type `wc -c ~/.ssh/known_hosts` yourself after `!` (swap in a file that actually exists on your computer). This runs outside the sandbox, so it prints the file size.
2. Ask Claude to run the same command. Once the setting takes effect, it should no longer be able to read the file.
3. Do the same for environment variables. First run `test -n "$GITHUB_TOKEN" && echo set || echo unset` yourself with `!` and confirm it prints `set`, which means your shell had this variable to begin with. Then ask Claude to run it. Once the setting takes effect, it should print `unset`.
4. If Claude asks to retry outside the sandbox, say no.

If you'd rather not test with real keys, do what I did: create a file containing a fake string and a fake environment variable, list them in `credentials`, and delete them when you're done.

**What I actually got:** I set the canary folder `~/.sandboxlab-canary` and the fake token `SANDBOXLAB_FAKE_TOKEN` to `"mode": "deny"` and asked Claude to run the same command as before:

```text
# Before setting credentials (sandbox on only)
      21 ~/.sandboxlab-canary/secret.txt
set

# After setting credentials
wc: ~/.sandboxlab-canary/secret.txt: open: Operation not permitted
unset
```

The file couldn't be opened, and the token was gone from the environment.

**What it also blocks:** once `~/.ssh` is blocked, `git push` and `git pull` over SSH fail in the sandbox. In fact, on macOS, SSH remotes can't connect from inside the sandbox even if you don't block `~/.ssh`. You have three options:

- Simplest: type `git push` yourself after `!` when you push, so it runs outside the sandbox.
- Switch the remote to HTTPS. That needs an HTTPS credential such as a personal access token, and the settings above already removed `GITHUB_TOKEN` from the sandbox, so weigh the tradeoff.
- Use the official `excludedCommands` to move commands such as `git push` out of the sandbox. Excluded commands run with your full permissions and can connect to any host, so think it through before you use it.

> If you want a tool to sign in as usual inside the sandbox without seeing the real token, the official docs also offer `"mode": "mask"`. The command sees only a placeholder value, and the proxy swaps in the real one when it sends the request. It requires the experimental `network.tlsTerminate`, and on macOS, `mask` on a file has the same effect as `deny`. The setup is more involved, so start with `deny`. For details, see [Mask credentials](https://code.claude.com/docs/en/sandboxing#mask-credentials). I didn't test this mode.
{: .prompt-tip }

## Step 4: Turn Off Retries Outside the Sandbox

When a command fails in the sandbox, Claude can pass the `dangerouslyDisableSandbox` parameter to ask to run it again outside the sandbox. This is an escape hatch for tools that don't work in the sandbox. Who approves that rerun depends on your permission mode:

- Manual mode and `acceptEdits` mode: a confirmation titled "Bash command (unsandboxed)" appears.
- Auto mode: a separate classifier model decides.
- `bypassPermissions` mode: it **runs without asking**.
- Also, if an allow rule happens to match the command, such as `Bash(curl *)`, the rerun goes through without asking you.

**What I actually got:** in `bypassPermissions` mode, with retries still allowed, I asked Claude to create a file outside the working directory and, if that failed, retry with `dangerouslyDisableSandbox`:

```text
# Attempt 1 (in the sandbox)
touch: ../outside/probe-T12.txt: Operation not permitted

# Attempt 2 (dangerouslyDisableSandbox: true, no prompt at all)
(Bash completed with no output)
```

The second attempt worked, and the file really was created outside the working directory. In Manual mode, the retry stops at the confirmation step. Because I was in non-interactive mode with nobody to press "allow," it was denied with `Run outside of the sandbox`.

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

**What I actually got:** same request, same `bypassPermissions` mode, with `allowUnsandboxedCommands: false` added:

```text
# Attempt 1 (in the sandbox)
touch: ../outside/probe-T13.txt: Operation not permitted

# Attempt 2 (Claude still passed dangerouslyDisableSandbox: true, but it was ignored and ran in the sandbox)
touch: ../outside/probe-T13.txt: Operation not permitted
```

**What you get:** a command that fails in the sandbox simply fails. Claude reports the error and you decide whether to change the settings, instead of Claude moving outside the sandbox on its own.

**What it also blocks:** tools that don't work in the sandbox simply fail, and Claude can no longer retry them outside it. The official troubleshooting section lists examples such as `docker`, `jest`, Go-based tools on macOS such as `gh`, `gcloud`, and `terraform`, and sign-in flows that need to open a browser. When you hit one, run it yourself with `!`.

If turning retries off entirely feels too strict, another option is to keep them and add the ask rule `Bash(dangerouslyDisableSandbox:true)` under `permissions.ask`. Then every retry outside the sandbox asks you first, even in auto mode and `bypassPermissions` mode. When I added this rule in `bypassPermissions` mode, Claude's retry stopped at the confirmation step (shown as a `Run outside of the sandbox` denial in non-interactive mode), and the file wasn't created.

## Step 5: What the Sandbox Does Not Cover

The sandbox covers only commands. The items below are outside its scope and need other measures.

**Claude's file and network tools.** Read, Edit, Write, WebFetch, and WebSearch are Claude Code's built-in tools. Permission rules decide whether they can be used, and the sandbox doesn't limit them. The official docs say explicitly that `denyRead` doesn't stop the Read tool, and `allowedDomains` doesn't restrict WebFetch. In other words, even if the sandbox blocks `cat ~/.ssh/id_ed25519`, Claude can still read the file with the Read tool.

**What I actually got:** with the Step 3 settings still in place (the canary folder set to `deny`), I asked Claude to read the same file with the Read tool instead:

```text
# Read tool result (the line number is added by the Read tool)
1	FAKE-SECRET-FOR-TEST
```

The file that `wc` couldn't open in the sandbox, the Read tool read in full. There was also a twist. The first time I asked, Claude refused to use Read on its own, saying it would respect the sandbox settings. But once I explained that this was an authorized test with a fake file, it read it. So don't count on the AI's self-restraint as a defense: text hidden in a web page or repo can talk it into things too. To actually close this gap, add deny rules to your permission settings:

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

**What I actually got:** with these two rules added, the Read tool was refused outright. Asking the Write tool to write outside the working directory in `bypassPermissions` mode was refused too:

```text
# Read tool on the canary file
File is in a directory that is denied by your permission settings.

# Write tool on ../outside/probe-T16.txt
…/sandboxlab/outside/probe-T16.txt is outside …/sandboxlab/project; the
permissions.blockWritesOutsideWorkingDirectories setting blocks writes outside
the working directories. Ask the user to add the directory with /add-dir, or to
remove that setting.
```

**Programs Claude Code starts itself.** [Hooks](/posts/claude-code-hooks-automate-checks/), local MCP servers, plugin monitors, LSP servers, status line commands, and `apiKeyHelper` all run with your full permissions. So do mods, which are plugins that run their own code inside Claude Code. Check what one does before you install it, because the sandbox can't help here. To keep credential environment variables away from these programs too, the official docs offer the `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` environment variable. With or without the sandbox, it removes credentials from the environment of every subprocess.

**Commands you type yourself with `!`.** In most cases these run outside the sandbox, even with Strict sandbox mode on. Step 3 relies on this when you run `git push` yourself. The flip side is that the sandbox doesn't protect you from commands you type here.

**Commands listed in `excludedCommands`.** The sandbox doesn't limit listed commands at all. The broader an entry (for example, `docker *`), the more can happen outside the sandbox. The official docs recommend that when a tool only needs to write to one more folder or reach one more domain, you use `allowWrite` or `allowedDomains` instead, so it stays in the sandbox.

**Settings files in someone else's repo.** A repo's `.claude/settings.json` and `.claude/settings.local.json` take precedence over your user settings. Normally, they can:

- Turn the sandbox off with `"enabled": false`.
- Add `excludedCommands` to move commands out of the sandbox (excluded commands can read `~/.ssh` and tokens).
- Reopen paths you blocked with a narrower `allowRead`.
- Add `allowWrite` and `allowedDomains` to loosen writes and network access.

Settings that live only in `~/.claude/settings.json` can't stop any of this.

Before you open an unfamiliar repo, look at these two files. A safer approach is to save your sandbox settings to a separate file, such as `~/.claude/sandbox-strict.json`, holding the `sandbox` section of the complete settings in the next section (the outermost level is `{ "sandbox": { ... } }`). Then pass it with `--settings` when you start Claude Code:

```bash
claude --settings ~/.claude/sandbox-strict.json
```

When `--settings` turns off retries outside the sandbox, the sandbox enters what the official docs call the "admin-required" state (since 2.1.285). Claude Code then ignores the repo's `excludedCommands`, `allowedDomains`, write permissions, and any setting that changes `enabled` to `false`. The repo also can't use `allowRead` to reopen paths that `credentials` in `--settings` blocked. The tradeoff is that `/sandbox` no longer opens the panel. It shows `Sandbox settings are overridden by a higher-priority configuration` instead. To see where settings come from, check `Setting sources` in `/status`. (I couldn't see either screen in non-interactive mode, so I didn't test them.)

**What I actually got:** I made an "unfriendly" test repo whose `.claude/settings.json` contained only `{"sandbox": {"excludedCommands": ["touch *"]}}`. Inside it, I asked Claude to run `touch` to create an empty file outside the repo:

```text
# --settings turns on the sandbox only: the repo moved touch out of the sandbox, and the file was created
(Bash completed with no output)

# --settings adds allowUnsandboxedCommands: false: the repo's excludedCommands is ignored
touch: ../outside/probe-T15b.txt: Operation not permitted
```

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

## If Something Gets Blocked, and How to Turn It Off

With the sandbox on, normal work occasionally gets blocked too. Start by reading the error message to see which kind it is:

| What you see | What it means | What to do |
| --- | --- | --- |
| `Operation not permitted` (`Read-only file system` on Linux) | The command tried to write outside the allowed area, or read a file you blocked | If it really needs that folder, add it to `filesystem.allowWrite`. If you're not sure, run the command yourself with `!` |
| `CONNECT tunnel failed, response 403`, or `deny network-outbound <domain>` inside `<sandbox_violations>` | It tried to reach a domain that isn't on the allowlist | If it really needs that domain, add it to `allowedDomains`, or allow it in the prompt |
| `Could not resolve host` | The tool didn't use the proxy and tried to connect directly | Usually a tool that doesn't support proxies, such as plain `ssh` or a database client. Run it yourself with `!` |

The rule of thumb: open only the one folder or domain that's actually needed, and don't drop a whole tool into `excludedCommands` just to save effort.

To turn the sandbox off, temporarily or for good, go to the settings file where you turned it on and change `"enabled"` to `false` (if you used the panel, that's `.claude/settings.local.json` in the project; if you set it in your user settings, it's `~/.claude/settings.json`). Save, then restart Claude Code. If you passed it with `--settings`, just start without that file next time.

## Conclusion

The sandbox is off by default, and even when it's on it blocks only writes and network access. You have to cover reads and environment variables yourself. I ran through it once, and everything I tested matched the official docs. Follow the order in this post:

1. Turn it on with `/sandbox`.
2. Ask Claude to run two commands to confirm writes and network access are blocked.
3. List the keys and tokens to protect in `sandbox.credentials`.
4. Turn off retries outside the sandbox with `allowUnsandboxedCommands: false`.

Finally, remember that the sandbox covers only commands. Claude's file tools depend on permission rules (in my test, the Read tool went straight past the sandbox), hooks and MCP servers run with your full permissions, and a repo's settings can loosen the sandbox, so start with `--settings` when you open an unfamiliar repo.

## Further Reading

- [Sandboxing](https://code.claude.com/docs/en/sandboxing): the full official guide, including troubleshooting and organization-level enforced settings.
- [Permissions](https://code.claude.com/docs/en/permissions): how to write permission rules, and how to restrict the file tools.
- [Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them](/posts/owasp-agentic-top-10-ai-workflow-checklist/): where this post started, a ten-question self-check.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): MCP servers and plugins run outside the sandbox, and this post explains the risks they bring.
- [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/posts/claude-code-hooks-automate-checks/): hooks run with your full permissions and aren't limited by the sandbox.
