---
title: "Run Several AI Coding Agents at Once and Spot the Stuck One: Getting Started With herdr"
description: "Install herdr with brew or mise, give each AI its own worktree and pane, spot the blocked one in the sidebar, then detach and come back."
date: 2026-11-12 08:00:00 +0800
categories: [AI, Software Development]
tags: [coding-agent, workflow, git, claude-code, codex]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.en.webp
  alt: "Give each AI coding agent its own pane with herdr, see at a glance which one needs you, and come back after you detach."
---

After [Let Two AI Agents Work Separately: Isolated Working Directories With git worktree](/en/posts/git-worktree-parallel-ai-agents/), the next snag is often this: once two or three coding agents are running at once, you have to flip through windows to see which one is waiting for you to click Allow, and which one is still working. Close the terminal, or drop an SSH connection, and work that was only halfway done may stop with it.

herdr is a tool that manages workspaces and split views in your terminal. It puts each agent in its own pane and marks the sidebar with working, blocked, done, or idle; close the view you see, and the work in the background can keep going. The official description is "the runtime your coding agents live on."

This article focuses on macOS and Linux, and uses Claude Code and Codex as the examples (the official list of supported agents is longer; see [Agents](https://herdr.dev/tui/docs/0.9.5/agents/)). Native Windows support is generally available, with known limitations; see [Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/). This post does not cover Windows installation.

> **Version note:** This article follows the official docs for herdr v0.9.5 (released on 2026-10-15; confirmed on 2026-11-12 as still the latest stable release). herdr is still a 0.x product and changes quickly, so treat commands and keyboard shortcuts in the [official docs](https://herdr.dev/tui/docs/0.9.5/) as authoritative.
{: .prompt-info }

## A Few Terms First

- **Terminal:** The text window where you type commands.
- **herdr:** A tool that manages workspaces and split views in the terminal, recognizes which coding agent is running in each view, and shows its current state. The official docs also call it a terminal workspace manager.
- **Workspace / tab / pane:** The three layers in herdr. A workspace is one project or task (the official guidance is "one workspace per repo, task, or investigation"); a tab is a layout inside a workspace; a pane is a real terminal split (official wording: "A pane is a real terminal.").
- **Background server / client:** herdr runs terminals in a background server; the view you see is a client attached to it. Close the view, and the server and the agents inside it keep running.
- **Detach / reattach:** Leave the view for a while, then come back to the same session.
- **Prefix key:** Press `ctrl+b`, release, then press the next key. If you have used tmux, this will feel familiar.
- **Package manager:** A program such as Homebrew (`brew`) or mise that installs, upgrades, and removes tools for you.
- **Coding agent, worktree, and branch:** Same sense as in the worktree post—an agent edits files and runs commands on its own; a worktree is a separate working directory in the same repo; a branch is the git line that directory is on.

Commands, shortcuts, state definitions, and what happens when you disconnect follow the official docs, with links. "I recommend installing with brew or mise," "one worktree per workspace," and "deal with blocked first" are this site's suggestions, and they are marked as such.

## When to Use It, and When to Skip It

- It is worth using if you run two or more agents at once, or you often step away or work over SSH.
- If you only run one agent, or you already have a setup that works, you do not have to switch.
- herdr does not replace your agents or wrap them. The official README says "herdr doesn't wrap or replace them; it owns their terminals." It manages the terminals; the agent is still the one you already use.

The figure below is one full loop; the steps after it explain each part.

![Five steps with herdr: start, add a worktree, run one agent per pane, find the blocked one, then detach and come back](workflow.en.webp){: w="1600" h="900" }
_Concept diagram: The five steps in one loop are Start herdr, Add a worktree, Run agents, Find the stuck one, and Detach and return. The prefix means press ctrl+b, release, then press the next key._

## Step 1: Install herdr

![Install herdr with brew or mise; if you use the official curl | sh one-liner, download and read the script first](install.en.webp){: w="1600" h="900" }
_Concept diagram: The left side is this site's suggestion, installing and upgrading with brew or mise. The right side is the one-liner from the official homepage; if you use it, download the script, read it, then run it._

If you already use [Homebrew](https://formulae.brew.sh/formula/herdr), I recommend `brew install herdr`. If you already use [mise](https://mise.jdx.dev/), I recommend `mise use -g herdr`. Both are listed on the official [Install](https://herdr.dev/tui/docs/0.9.5/install/) page.

The official homepage also offers `curl -fsSL https://herdr.dev/install.sh | sh`. I recommend not pasting that straight into a shell: what runs is whatever the server returns at that moment, which you have not read, and a later run may not be the same. It also installs into `~/.local/bin` and then updates itself with `herdr update`, so it never appears in your package manager list and is harder to inventory or remove. With brew or mise, you can look up the version, and upgrade and uninstall use the same tool. That is not a claim that the install script is broken; it is the habit of reading first, then running, as in [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/en/posts/coding-agent-supply-chain-permission-risks/).

If you do need the official script, download it and read it first:

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

Open the file, then run `sh herdr-install.sh`.

If mise reports `herdr not found in mise tool registry`, the official docs say to update mise and try again.

After the install, run `herdr --version`. According to the official docs, it should print a version number, such as 0.9.5. If you use a Chinese, Japanese, or Korean input method and the prefix shortcuts do not respond, make sure you are on 0.9.5 or later; the official notes for this release include a fix for that.

For upgrades, use `brew upgrade herdr` if you installed with brew, and `mise upgrade herdr` if you installed with mise. The official wording is: "Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead." After a package-manager upgrade, a server that is already running will keep going; to pick up server-side changes, run `herdr server stop` and start again, as the Update section of the Install page describes.

## Step 2: Start herdr in Your Project Folder

`cd` into your project folder, then run `herdr`. According to the [Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/), it launches or attaches to your default background session, and if that session has no workspaces yet, it opens one automatically. I recommend one workspace per project.

You can click, drag borders, and right-click to split. The official docs treat the mouse and the keyboard as first-class; the keyboard is optional, not required.

## Step 3: Give Each Working Directory Its Own Workspace

This site's approach is one workspace per worktree, so each agent edits its own working directory, following the same idea as the worktree post. There are two ways to get there; pick one. Both are `git worktree` underneath. Merging, deleting branches, and the warning not to use worktrees with submodules all follow the worktree post.

**Option A: Let herdr create it.** Choose `New worktree` in the workspace list, or press `prefix+shift+g`, then enter a branch name. herdr creates a git worktree and opens it as a new workspace, grouped under the original project. That is the same as running this inside the project folder:

```bash
herdr worktree create --branch login-page
```

The default location is `~/.herdr/worktrees/<repo>/<branch>`. You can change it with `[worktrees] directory` in `~/.config/herdr/config.toml`; see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/).

**Option B: Follow the worktree post.** Create the folder first with `git worktree add -b …`, then open a new workspace in herdr with `prefix+shift+n` and `cd` into that folder.

Closing a herdr workspace, according to the official docs, does not delete the folder and does not delete the branch. To remove a checkout, use `Delete worktree checkout...` (which runs `git worktree remove`) or run `git worktree remove` yourself; delete the branch separately.

If you need another terminal in the same workspace, for example to run tests, split a pane: `prefix+v` to the right, `prefix+minus` downward.

## Step 4: Start an Agent in Each Pane

In each pane, type `claude` or `codex`. According to the Quick start, herdr detects the agent automatically. Official support also includes Cursor Agent CLI, GitHub Copilot CLI, OpenCode, and others; see the full list on [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) rather than repeating it here.

Integrations are optional. You can read states without them; install one if you want the same conversation to resume after the background server restarts. The commands are `herdr integration install claude` and `herdr integration install codex`; see [Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/). An integration changes the agent's settings: Claude Code gets a SessionStart hook; Codex updates `hooks.json` and turns on `[features] hooks = true` in `config.toml`. You can remove one with `herdr integration uninstall …`, but Codex's `config.toml` is not reverted. For what a hook is, see [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/en/posts/claude-code-hooks-automate-checks/).

## Step 5: Read the States and Find the Stuck One

![herdr's five agent states, blocked, working, done, idle, and unknown, with what each means and what to do](states.en.webp){: w="1600" h="900" }
_Concept diagram: What the five states mean, and what this site suggests you do. Deal with blocked first. A new prompt may first show as idle, and idle is not permission to click Allow. The colors in the figure are this site's palette, not herdr's own UI colors._

The sidebar shows each agent's state and rolls that up to the tab and the workspace: if one agent is blocked, the whole workspace looks blocked. The official docs define five states; the "what you should do" column is this site's suggestion.

| State | Official meaning, in plain words | What this site suggests you do |
| --- | --- | --- |
| blocked | It is waiting for an answer, an approval, or a decision | Deal with it first: open it, read carefully, then answer |
| working | It is running | Leave it alone and let it work |
| done | It finished, and you have not looked yet | Go read the result and check what changed |
| idle | It finished or is waiting, and you have already looked | You can give it the next task |
| unknown | herdr cannot tell the state | Open it yourself and take a look |

To jump quickly, press `prefix+g` to open the Goto list, then press `b` to show only blocked agents (`w` for working, `i` for idle, `d` for done, `a` for all), and press Enter to jump.

Notifications appear as in-app toasts by default (`[ui.toast]`); you can switch them to system notifications. For system notifications on macOS, the official docs suggest `brew install terminal-notifier`; see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/).

The official [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) page says blocked detection is deliberately strict, so an unusual new prompt may first show as idle, and that "idle status is not authorization to approve an action." After you jump to the pane, read it carefully before you click Allow. That is the same point as human-agent trust and approval fatigue in [Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them](/en/posts/owasp-agentic-top-10-ai-workflow-checklist/).

## Step 6: Detach, Then Come Back

To leave, press `prefix+q` (`ctrl+b`, then `q`), or just close the terminal window. According to the Quick start, the server and the agents inside it keep running; run `herdr` again later to reattach to the same session.

What survives and what does not is in the official [Session state](https://herdr.dev/tui/docs/0.9.5/session-state/) table. In plain terms: if you only detach, everything keeps running. If the herdr server restarts, or the machine reboots or shuts down, the original processes do not continue (the README says "the original processes do not survive"). The layout comes back; the conversation comes back only if you installed an integration.

To shut everything down, run `herdr server stop`. Officially, that ends the session and stops its panes. Note that this stops every agent still running in those panes.

## One Loop at a Glance, Plus a Keyboard Cheatsheet

The loop is the five steps in the figure: start herdr in the project folder, add a working directory for each task, start an agent in each pane, find the blocked one in the sidebar or Goto, then run `herdr` again after you detach.

`ctrl+b` is the prefix: press it, release, then press the next key. The official [Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/) page puts it this way: "`prefix+c` means: press `ctrl+b`, release, then press `c`." Press `prefix+?` when you forget a shortcut.

| Keys | Action |
| --- | --- |
| `prefix+v` / `prefix+minus` | Split a pane right / down |
| `prefix+h` / `j` / `k` / `l` | Move between panes |
| `prefix+c` | New tab |
| `prefix+w` | Workspace navigation |
| `prefix+shift+n` | New workspace |
| `prefix+shift+g` | New worktree |
| `prefix+g` | Open Goto (then `b` to show blocked only) |
| `prefix+z` | Zoom the current pane |
| `prefix+x` | Close the current pane |
| `prefix+q` | Detach |
| `prefix+?` | Show every shortcut |

## What to Do in Each Situation

| Situation | Suggestion |
| --- | --- |
| You only run one agent | You may not need herdr; if your current windows are enough, you can skip it for now |
| Two or three agents each change a different feature | This site's suggestion is one worktree per workspace |
| You want the agent to keep running while you step away | Detach with `prefix+q`, then run `herdr` later to come back |
| You work on a remote machine over SSH | Run `herdr` on the remote host, so work can continue after the connection drops; or use `herdr --remote <host>`. See [How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| A state looks wrong | Run `herdr agent explain <target>` to see why it was classified that way; see [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| You want everything stopped | `herdr server stop` (this stops every agent in those panes) |
| You installed with brew or mise and need to upgrade | `brew upgrade herdr` or `mise upgrade herdr`; do not use `herdr update` |
| You do not want herdr contacting herdr.dev in the background | Set `[update] version_check = false` and `manifest_check = false` in the config file; see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## Common Misunderstandings

- "If I close the window, the work stops." If you only detach, the server and the agents keep running.
- "With herdr, even a reboot will not interrupt anything." The original processes do not survive; only the layout is restored. The conversation resumes only if you installed an integration.
- "Idle means nothing is wrong, so I can click Allow." A new prompt may first be classified as idle; idle is not authorization.
- "herdr replaces Claude Code or Codex." It does not; it only manages terminals.
- "Closing a worktree workspace deletes the folder." It does not, and it does not delete the branch either.
- "I can run `herdr update` even if I installed with brew." The official docs say to upgrade through the package manager.

## What to Do Next

Give each AI its own pane, find blocked in the sidebar, then detach and come back. For the same workflow on a remote machine, see [How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/). There is also an official skill that lets an agent operate herdr: `herdr --skill` prints content that matches your current version. Read any third-party skill before you install it; see the supply-chain post.

Further reading: the [herdr README](https://github.com/herdrdev/herdr), the [v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5), the [docs home](https://herdr.dev/tui/docs/0.9.5/), [Install](https://herdr.dev/tui/docs/0.9.5/install/), [Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/), [Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/), [Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/), [Agents](https://herdr.dev/tui/docs/0.9.5/agents/), [Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/), [Session state](https://herdr.dev/tui/docs/0.9.5/session-state/), [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/), [Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/), and the [Homebrew formula](https://formulae.brew.sh/formula/herdr).
