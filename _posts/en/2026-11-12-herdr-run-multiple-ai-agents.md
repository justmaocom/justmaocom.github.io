---
title: "herdr Tutorial: Run Multiple AI Agents in One Terminal"
description: "Install herdr with brew or mise, give each AI its own worktree and pane, spot the blocked one in the sidebar, then detach and come back."
date: 2026-11-12 08:00:00 +0800
categories: [AI, Software Development]
tags: [coding-agent, workflow, git, claude-code, codex, herdr]
media_subpath: /assets/img/posts/herdr-run-multiple-ai-agents/
image:
  path: cover.en.webp
  alt: "Give each AI coding agent its own pane with herdr, see at a glance which one needs you, and come back after you detach."
---

If you have read [git worktree for AI Agents: Run Two Agents in One Repo](/posts/git-worktree-parallel-ai-agents/) and now run two or three coding agents at once, the next snag is usually this: to find out which one is waiting for you to click Allow and which one is still working, you have to flip through the windows one by one. And if you close the terminal or your SSH connection drops, work that was only halfway done may stop with it.

herdr is a tool that manages workspaces and split views in your terminal. It puts each agent in its own split view (a pane), and the sidebar shows a colored dot for each agent, so you can tell whether it is working, waiting for you, or done. Even if you close the view you are looking at, the work in the background can keep going. The official description is "the runtime your coding agents live on."

This post covers the terminal Herdr TUI ([herdr.dev/tui](https://herdr.dev/tui)), not the Herdr desktop App ([herdr-app](https://github.com/herdrdev/herdr-app)) that the herdr.dev homepage now mainly promotes. They are separate programs: an agent started in one does not show up in the other. For the desktop app, see [Herdr Desktop App: Manage AI Agents With Spaces and Tabs](/posts/herdr-app-desktop-manage-ai-agents/).

This article focuses on macOS and Linux, and uses Claude Code and Codex as the examples (the official list of supported agents is longer; see [Agents](https://herdr.dev/tui/docs/0.9.5/agents/)). Native Windows support is generally available, with known limitations; see [Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/). This post does not cover Windows installation.

> **Version note:** This article follows the official docs for herdr v0.9.5 (released on 2026-10-15; confirmed on 2026-11-12 as still the latest stable release). herdr is still a 0.x product and changes quickly, so treat commands and keyboard shortcuts in the [official docs](https://herdr.dev/tui/docs/0.9.5/) as authoritative.
{: .prompt-info }

## A Few Terms First

- **Terminal:** The text window where you type commands.
- **herdr:** A tool that manages workspaces and split views in the terminal, recognizes which coding agent is running in each view, and shows its current state. The official docs also call it a terminal workspace manager.
- **Workspace / tab / pane:** The three layers in herdr. A workspace is one project or task (the official guidance is "one workspace per repo, task, or investigation"); a tab is a layout inside a workspace; a pane is a real terminal split (official wording: "A pane is a real terminal.").
- **Background server / client:** herdr runs terminals in a background server; the view you see is a client attached to it. Close the view, and the server and the agents inside it keep running.
- **Detach / reattach:** Leave the view for a while, then come back to the same session.
- **Prefix key:** Press `ctrl+b`, release it, then press the next key. On a Mac this is the Control key, not Command. For example, `prefix+shift+g` means press `ctrl+b`, release, then press `shift+g`. If you have used tmux, this will feel familiar.
- **Package manager:** A program such as Homebrew (`brew`) or mise that installs, upgrades, and removes tools for you.
- **Coding agent, worktree, and branch:** Same sense as in the worktree post—an agent edits files and runs commands on its own; a worktree is a separate working directory in the same repo; a branch is a separate line of changes in git, and each working directory sits on its own branch.

Commands, shortcuts, state definitions, and what happens when you disconnect all follow the official docs, with links. "Install with brew or mise," "one workspace per worktree," and "deal with blocked first" are this site's suggestions, and the text marks them as such.

## When to Use It, and When to Skip It

- It is worth using if you run two or more agents at once, or you often step away or work over SSH.
- If you only run one agent, or you already have a setup that works, you do not have to switch.
- herdr does not replace your agents or wrap them. The official README says "herdr doesn't wrap or replace them; it owns their terminals." It manages the terminals; the agent is still the one you already use.

## Before You Start

- A Mac or Linux computer and a terminal. On macOS, the built-in Terminal app is fine.
- Either Homebrew or mise. If you have used neither, on macOS you can install Homebrew first by following the instructions on the [Homebrew website](https://brew.sh/).
- A project folder managed with git that has at least one commit. You will need it in Step 3 to create a worktree.
- Claude Code or Codex already installed and signed in: typing `claude` or `codex` in a regular terminal should start it.

Once herdr is installed, each round of work is the five steps in the figure below, which match Steps 2 through 6.

![Five steps with herdr: start, add a worktree, run one agent per pane, find the blocked one, then detach and come back](workflow.en.webp){: w="1600" h="900" }
_Concept diagram: The five steps in one loop are Start herdr, Add a worktree, Run agents, Find the stuck one, and Detach and return. The prefix means press ctrl+b, release, then press the next key._

## Step 1: Install herdr

![Install herdr with brew or mise; if you use the official curl | sh one-liner, download and read the script first](install.en.webp){: w="1600" h="900" }
_Concept diagram: The left side is this site's suggestion, installing and upgrading with brew or mise. The right side is the one-liner from the official Install/TUI page; if you use it, download the script, read it, then run it._

If you already use [Homebrew](https://formulae.brew.sh/formula/herdr), I recommend `brew install herdr`. If you already use [mise](https://mise.jdx.dev/), I recommend `mise use -g herdr`. Both are listed on the official [Install](https://herdr.dev/tui/docs/0.9.5/install/) page.

The official Install/TUI page also offers a one-line install command, `curl -fsSL https://herdr.dev/install.sh | sh`. I recommend not pasting that straight into a shell, for two reasons. First, what runs is whatever the server returns at that moment, which you have not read, and a later run may not be the same. Second, it installs into `~/.local/bin` and then updates itself with `herdr update`, so it never appears in your package manager's list, which makes it harder to see what you installed or to remove it later. With brew or mise, you can look up the version, and upgrades and uninstalls use the same tool. That is not a claim that the install script is broken; it comes from the habit of reading first, then running. The reasons are in [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).

If you do need the official script, download it to a file first:

```bash
curl -fsSL https://herdr.dev/install.sh -o herdr-install.sh
```

Open it in a text editor and read it (or run `less herdr-install.sh` in the terminal and press `q` when you are done). Once you are satisfied, run `sh herdr-install.sh`. If you cannot tell what the script does, use brew or mise instead.

If mise reports `herdr not found in mise tool registry`, the official docs say to update mise and try again (run `brew upgrade mise` if you installed mise with brew, or `mise self-update` otherwise).

After the install, run `herdr --version`. According to the official docs, it should print a version number, such as 0.9.5. If you use a Chinese, Japanese, or Korean input method and the prefix shortcuts do not respond, make sure you are on 0.9.5 or later; the official notes for this release include a fix for that.

For upgrades, use `brew upgrade herdr` if you installed with brew, and `mise upgrade herdr` if you installed with mise. The official wording is: "Use `herdr update` only for installs managed by Herdr's own installer. Update Homebrew, mise, and Nix installs through those package managers instead." After a package-manager upgrade, run `herdr` again to reconnect with the new client; the background server and agents that were already running are not affected. To move the server itself to the new version, run `herdr server stop` (this stops every running agent; see Step 6), then run `herdr` to start it again, as the Update section of the Install page describes.

## Step 2: Start herdr in Your Project Folder

In the terminal, `cd` into your project folder (for example, `cd ~/projects/demo-app`), then run `herdr`. According to the [Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/), it launches or attaches to your default background session, and if that session has no workspaces yet, it opens one automatically; that is the demo-app entry in the sidebar below. Each worktree you add later gets one more workspace (Step 3).

![Real herdr screen: the sidebar lists the demo-app workspace; two panes run git commands and a build](screen-main.en.webp){: w="1600" h="900" }
_Real screen: herdr opened in the demo-app folder, with a second pane split off by prefix+v. Both panes run a plain shell, not an agent, so the agents list is empty._

You can use herdr entirely with the mouse: click to switch between panes, tabs, workspaces, and agents, drag borders to resize, and right-click to split. The official docs say the mouse covers everything and keyboard shortcuts are optional, so do not worry if you cannot remember the shortcuts listed below.

## Step 3: Give Each Working Directory Its Own Workspace

This site's approach is one workspace per worktree, so each agent edits only its own working directory and two agents never change the same file at the same time. This follows the same idea as the worktree post. There are two ways to create one; pick either. Both use `git worktree` underneath. For how to merge and delete branches when you are done, and why repos with submodules should not use worktrees, see [git worktree for AI Agents: Run Two Agents in One Repo](/posts/git-worktree-parallel-ai-agents/).

**Option A: Let herdr create it.** In the project's workspace, press `prefix+shift+g` (`New worktree` is also available from the workspace's row in the sidebar). A new worktree dialog opens. The branch field starts with a random name, so press ctrl+c to clear it, type the branch name you want (for example, `login-page`), and press Enter. herdr creates a git worktree and opens it as a new workspace, grouped under the original project; click its name in the sidebar to switch to it. This does the same thing as running the following inside the project folder:

```bash
herdr worktree create --branch login-page
```

![The new worktree dialog from prefix+shift+g, with branch login-page and the checkout folder below](screen-worktree.en.webp){: w="1600" h="900" }
_Real screen: prefix+shift+g adds a worktree. The branch field starts with a random name, so press ctrl+c to clear it before typing; Enter creates it and opens a new workspace._

The default location is `~/.herdr/worktrees/<repo>/<branch>`. You can change it with `[worktrees] directory` in `~/.config/herdr/config.toml`; see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/).

**Option B: Follow the worktree post.** Inside the project folder, create the worktree folder with git first, for example:

```bash
git worktree add -b login-page ../demo-app-login-page
```

Then press `prefix+shift+n` in herdr to open a new workspace, and run `cd ../demo-app-login-page` in it to move into the folder you just created.

Closing a workspace (`prefix+shift+d`) does not delete the folder or the branch. According to the official docs, closing the project's row also closes the worktree workspaces grouped under it. To remove a worktree folder, select that worktree's workspace in the sidebar (the row grouped under the project) and use `Delete worktree checkout...` (which runs `git worktree remove`), or run `git worktree remove` yourself; delete the branch separately.

If you need another terminal in the same workspace, for example to run tests, split a pane: `prefix+v` to the right, `prefix+minus` downward.

## Step 4: Start an Agent in Each Pane

Switch to the workspace you want, and type `claude` or `codex` in a pane, just as you would in a regular terminal. According to the Quick start, herdr detects which agent it is automatically, and a new row appears in the agents section of the sidebar. Official support also includes Cursor Agent CLI, GitHub Copilot CLI, OpenCode, and others; see the full list on [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) rather than repeating it here.

Integrations are optional. You can read states without them; install one if you want the same conversation to resume after herdr's background server restarts. The commands are `herdr integration install claude` and `herdr integration install codex`; see [Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/). An integration changes the agent's settings: for Claude Code, it adds a hook script and the matching hook entries in `settings.json`; for Codex, it adds a hook script, updates `hooks.json`, and turns on `[features] hooks = true` in `config.toml`. You can remove one with `herdr integration uninstall claude` (or `codex`), but Codex's `config.toml` is not reverted. For what a hook is, see [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/).

## Step 5: Read the States and Find the Stuck One

![herdr's five agent states, blocked, working, done, idle, and unknown, with what each means and what to do](states.en.webp){: w="1600" h="900" }
_Concept diagram: What the five states mean, and what this site suggests you do. Deal with blocked first. A new prompt may first show as idle, and idle does not mean you can click Allow without reading. The colors in the figure are this site's palette, not herdr's own UI colors._

The sidebar marks each agent's state with a colored dot; if an agent in a workspace is blocked, that workspace's own row also uses the blocked color. The sidebar only shows dots. To see the state names written out (working, blocked, done, idle), press `prefix+g` to open the Go to list. The official docs define five states; the right-hand column, "what you should do," is this site's suggestion.

| State | Official meaning, in plain words | What this site suggests you do |
| --- | --- | --- |
| blocked | It is waiting for an answer, an approval, or a decision | Deal with it first: open it, read carefully, then answer |
| working | It is running | Leave it alone and let it work |
| done | It finished, and you have not looked yet | Go read the result and check what changed |
| idle | It finished or is waiting for the next instruction, and you have already looked | You can give it the next task |
| unknown | herdr cannot tell the state | Open it yourself and take a look |

![herdr sidebar: two worktree workspaces grouped under demo-app, and colored dots showing four agent states](screen-states.en.webp){: w="1600" h="900" }
_Real screen (herdr default theme): yellow dot = working, red = blocked, teal = done, hollow green = idle. The demo “agents” are shell scripts reporting state with herdr pane report-agent, not Claude Code or Codex._

To find a stuck agent quickly, press `prefix+g` to open the Go to list, then press `b` to show only blocked agents (`w` for working, `i` for idle, `d` for done, `a` for all). Pick a row with the arrow keys and press Enter to jump there.

![herdr Go to list grouped by workspace, each row labeled idle, working, blocked, or done](screen-goto.en.webp){: w="1600" h="900" }
_Real screen: prefix+g opens Go to with each state written out; press b to keep only the blocked row, then Enter to jump there. The demo “agents” are shell scripts reporting state with herdr pane report-agent, not Claude Code or Codex._

herdr does not show notifications by default (`delivery` under `[ui.toast]` in the config file defaults to `off`). To turn them on, open the config file `~/.config/herdr/config.toml` (create it if it does not exist) and add:

```toml
[ui.toast]
delivery = "herdr"
```

Save the file, then run `herdr server reload-config` (or press `prefix+shift+r`) to apply it. With `herdr`, the toast appears inside herdr; with `system`, herdr uses your operating system's notifications instead. On macOS, `system` tries terminal-notifier first, so the official docs suggest `brew install terminal-notifier`. For the other options, see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) or the [Config reference](https://herdr.dev/tui/docs/0.9.5/config-reference/).

The official [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) page says blocked detection is deliberately strict: an unusual new prompt that herdr has not seen before may first show as idle instead of blocked. It also says "idle status is not authorization to approve an action," which means seeing idle does not make it safe to approve. After you jump to the pane, read it carefully before you click Allow. That is the same point as human-agent trust and approval fatigue in [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

## Step 6: Detach, Then Come Back

To leave, press `prefix+q` (`ctrl+b`, then `q`), or just close the terminal window. According to the Quick start, the server and the agents inside it keep running; run `herdr` again later to reattach to the same session.

What survives and what does not is in the official [Session state](https://herdr.dev/tui/docs/0.9.5/session-state/) table. In plain terms: if you only detach, everything keeps running. If the herdr server restarts, or the machine reboots or shuts down, every program that was running, agents included, ends (the README says "the original processes do not survive"). When you run `herdr` again, the workspace, tab, and pane layout comes back; an agent's conversation comes back only if you installed an integration (Step 4).

To shut everything down, run `herdr server stop`. Officially, that ends the session and stops its panes. Note that this stops every agent still running in those panes.

## One Loop at a Glance, Plus a Keyboard Cheatsheet

The loop is the five steps in the figure: start herdr in the project folder, add a worktree for each task, start an agent in each pane, find the blocked one in the sidebar or Go to, then run `herdr` again after you detach.

`ctrl+b` is the prefix: press it, release, then press the next key. The official [Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/) page puts it this way: "`prefix+c` means: press `ctrl+b`, release, then press `c`." Press `prefix+?` when you forget a shortcut.

| Keys | Action |
| --- | --- |
| `prefix+v` / `prefix+minus` | Split a pane right / down |
| `prefix+h` / `j` / `k` / `l` | Move to the pane on the left / below / above / right |
| `prefix+c` | New tab (a naming window opens first; press Enter to create it) |
| `prefix+w` | Open workspace navigation to switch workspaces |
| `prefix+shift+n` | New workspace |
| `prefix+shift+g` | New worktree |
| `prefix+shift+d` | Close the selected workspace |
| `prefix+g` | Open Go to (then `b` to show blocked only) |
| `prefix+z` | Zoom the current pane |
| `prefix+x` | Close the current pane |
| `prefix+q` | Detach |
| `prefix+?` | Show every shortcut |

## What to Do in Each Situation

| Situation | Suggestion |
| --- | --- |
| You only run one agent | You may not need herdr; if your current windows are enough, you can skip it for now |
| Two or three agents each change a different feature | This site's suggestion is one workspace per worktree |
| You want the agent to keep running while you step away | Detach with `prefix+q`, then run `herdr` later to come back |
| You work on a remote machine over SSH | Run `herdr` on the remote host, so work can continue after the connection drops; or use `herdr --remote <host>`. See [How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/) |
| A state looks wrong | Run `herdr agent explain <target>` to see why it was classified that way; see [Agents](https://herdr.dev/tui/docs/0.9.5/agents/) |
| You want everything stopped | `herdr server stop` (this stops every agent in those panes) |
| You installed with brew or mise and need to upgrade | `brew upgrade herdr` or `mise upgrade herdr`; do not use `herdr update` |
| You do not want herdr contacting herdr.dev in the background | Under `[update]` in the config file, add `version_check = false` and `manifest_check = false`; see [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/) |

## Common Misunderstandings

- "If I close the window, the work stops." If you only detach, the server and the agents keep running.
- "With herdr, even a reboot will not interrupt anything." The original processes do not survive; only the layout is restored. The conversation resumes only if you installed an integration.
- "Idle means nothing is wrong, so I can click Allow." A new prompt may first be classified as idle; idle is not authorization.
- "herdr replaces Claude Code or Codex." It does not; it only manages terminals.
- "Closing a worktree workspace deletes the folder." It does not, and it does not delete the branch either.
- "I can run `herdr update` even if I installed with brew." The official docs say to upgrade through the package manager.

## What to Do Next

Give each AI its own pane, find blocked in the sidebar, then detach and come back. For the same workflow on a remote machine, see [How to work](https://herdr.dev/tui/docs/0.9.5/how-to-work/). There is also an official skill that lets an agent operate herdr: `herdr --skill` prints content that matches your current version. Read any third-party skill before you install it; [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/) explains why.

Further reading: the [herdr README](https://github.com/herdrdev/herdr), the [v0.9.5 release](https://github.com/herdrdev/herdr/releases/tag/v0.9.5), the [docs home](https://herdr.dev/tui/docs/0.9.5/), [Install](https://herdr.dev/tui/docs/0.9.5/install/), [Quick start](https://herdr.dev/tui/docs/0.9.5/quick-start/), [Concepts](https://herdr.dev/tui/docs/0.9.5/concepts/), [Keyboard](https://herdr.dev/tui/docs/0.9.5/keyboard/), [Agents](https://herdr.dev/tui/docs/0.9.5/agents/), [Integrations](https://herdr.dev/tui/docs/0.9.5/integrations/), [Session state](https://herdr.dev/tui/docs/0.9.5/session-state/), [Configuration](https://herdr.dev/tui/docs/0.9.5/configuration/), [Windows support](https://herdr.dev/tui/docs/0.9.5/windows-beta/), and the [Homebrew formula](https://formulae.brew.sh/formula/herdr).
