---
title: "Manage a Team of AI Agents With the Herdr Desktop App: Spaces, Tabs, and the Agents Sidebar"
description: "Keep each repo in a space and each task in a tab in the Herdr desktop app, see which AI agent needs you, and manage telemetry, per the v0.1.15 docs."
date: 2026-11-12 17:00:00 +0800
categories: [AI, Software Development]
tags: [coding-agent, workflow, claude-code, codex]
media_subpath: /assets/img/posts/herdr-app-desktop-manage-ai-agents/
image:
  path: cover.en.webp
  alt: "Organize AI agents across repos with spaces and tabs in the Herdr desktop app, and see from the sidebar which one is waiting for you."
---

When several AI agents work in different repos at the same time, the usual sticking point is this: you can't tell which one has stopped to wait for your answer, so you end up flipping through the windows one by one.

The Herdr desktop app (the program is called herdr-app) is built for exactly this. The first line of the official README reads: "Herdr is a desktop app for terminals and coding agents. Keep work in spaces, see which agents need you, and leave terminals running when you close the window." In other words, it is a desktop app for terminals and coding agents that groups your work into spaces, shows which agents need you, and keeps terminals running after you close the window. According to the FAQ on the official homepage, it is free, and the app, herdr-core, and Herdr TUI are all open source under Apache 2.0.

This is a follow-along beginner's guide: install the app, start an agent from the tab bar, organize work with spaces and tabs, and find the agent waiting for you in the agents sidebar. Then it covers what happens after you close the window, plus telemetry, automatic updates, and mod safety. If you can't remember the shortcuts, that's fine: the command palette finds every action by name and also lists its key.

This article is based on the official docs and includes no screenshots of the app; the three images are concept diagrams made by this site.

> **Version note:** This article follows the official docs for herdr-app v0.1.15 (released on 2026-11-11, Taipei time; confirmed on 2026-11-12 as still the current version on releases.herdr.dev and Homebrew). Herdr App has not reached 1.0 yet and changes quickly, so treat the [official README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md) as authoritative for how things work and which keys to press.
{: .prompt-info }

## A Few Terms First

- **Desktop app (herdr-app):** The window you see. The official guide describes it as "the window: spaces, tabs, layouts, panels"; it arranges terminals on screen.
- **herdr-core (command: `hc`):** The program that actually runs every terminal and agent. When the window closes or the app updates, it and the programs inside it keep running. The README sums up the split in one line: "The window arranges terminals. The core runs them."
- **Space / tab / pane:** The three layers in Herdr App. A space is a body of work on one machine, usually one repo; a tab is one task inside a space; a pane is one terminal on screen, or a mod panel.
- **Agent:** An AI program that runs in a terminal, such as Claude Code or Codex. According to the official site, anything that runs in a terminal can go into Herdr.
- **OSC 7501:** An open protocol that lets an agent report whether it is busy, done, or waiting for you. Herdr can show a status only for agents that report this way; agents that don't still run, just without a status.
- **SSH:** A way to connect to other machines. Herdr uses SSH to reach your other computers or servers, and the phone app connects over SSH too.
- **Telemetry:** Usage statistics the app sends back to its developers. According to the official docs, it is on by default in Herdr App and sends one small report a day.
- **Mods and layouts:** A mod is a JavaScript program that runs inside Herdr, such as a panel in a pane; a layout is how the whole window looks, and the built-in ones include Herdr, Terminals, and Herdr 98. According to the official docs, mods have full permissions and are not sandboxed extensions; more on that later.

## First, Tell Them Apart: Herdr App and Herdr TUI Are Two Programs

herdr.dev has two programs with very similar names. According to the official FAQ:

- **Herdr TUI** is the original Herdr: a terminal app with its own server. The FAQ says it keeps working, and everything for it is at [herdr.dev/tui](https://herdr.dev/tui/).
- **Herdr App** is a new, separate program built on herdr-core, and it is what this post covers.

The two **don't share agents**: an agent started in one does not show up in the other. The FAQ puts it this way: "They don't share agents, so what runs in one doesn't show up in the other." The phone app works only with herdr-core (which comes with Herdr App), not with Herdr TUI. According to the phone app page, Herdr TUI and herdr-core can both run on the same machine.

How to choose: this site suggests picking one as your main tool. Because agents aren't shared, running a few in each brings back the old problem of not knowing who is waiting for you. If you want to stay in the terminal, read [Run Several AI Coding Agents at Once and Spot the Stuck One: Getting Started With herdr](/en/posts/herdr-run-multiple-ai-agents/); if you want a desktop window, or want to check on agents from your phone, read on.

## When It Fits

- You run two or more agents at once, in different repos or on different tasks, and want one window that shows which one is waiting for you: a good fit.
- You want to close the window and let agents keep working: a good fit. According to the official docs, closing the window doesn't stop the terminals (see Step 5), and work on an SSH machine keeps going while your laptop sleeps (see Step 6).
- You only run one agent and your current setup works fine: you don't have to switch (this site's view).

## Before You Start

- A supported computer. Per the official FAQ: macOS (Apple Silicon), Linux (x86_64 and arm64), and Windows (x86_64). Linux needs a desktop session and a working Vulkan driver; Windows needs Windows 10 1803 or later, plus curl and tar.
- The agent you want to use, already installed, such as Claude Code or Codex. According to CHANGELOG 0.1.14, for Codex started from the + menu to keep its own session, you need Codex 0.156 or newer.

## Step 1: Install

### macOS (Apple Silicon): dmg or Homebrew

Pick one of the two.

**dmg:** Download [Herdr.dmg](https://releases.herdr.dev/app/Herdr.dmg) and drag Herdr to the Applications folder.

**Homebrew:**

```bash
brew install --cask herdr-app
```

According to the Homebrew cask data, the app is installed to `/Applications/Herdr.app` and the `herdr-app` command is provided as well; the cask marks the app as updating itself (`auto_updates: true`). See "How Automatic Updates Work" below.

> **No installer for Intel Macs:** The README says macOS builds are available for Apple Silicon only, and Intel Mac users can build from source; the official install script also stops on an Intel Mac. This post doesn't cover building from source.
{: .prompt-warning }

### Linux and Windows: Download the Script and Read It Before Running

For Linux and Windows, the official options are install scripts (the other route is building from source). The README itself warns: "The shell and PowerShell installers download and run code." In other words, both installers download and run code, and you can read them first if you prefer.

The README's Linux command is `curl -fsSL https://releases.herdr.dev/app/install.sh | sh`, which runs the script the moment it finishes downloading. This site suggests splitting that into two steps. First, download it to a file:

```bash
curl -fsSL https://releases.herdr.dev/app/install.sh -o herdr-app-install.sh
```

Open it in a text editor and read it. Once you understand it and it looks fine, run it:

```bash
sh herdr-app-install.sh
```

If you can't tell what the script does, don't run it yet. According to the comments at the top of the script and its contents, on Linux it:

- Installs the app to `~/.local/share/herdr-app`, puts the `herdr-app` command in `~/.local/bin`, and adds a launcher and icon.
- Installs herdr-core to `~/.local/bin/herdr-core` (along with `hc`) only if the machine doesn't have it yet; after that, the app keeps it up to date.
- Downloads the release manifest (`latest.json`), checks the download's SHA-256 against it, and stops if they don't match.

PATH is the list of folders the terminal looks in to find commands; if the installer asks, add `~/.local/bin` to it. Running the script again later updates the app. The script supports macOS too (the app goes in `~/Applications/Herdr.app`), but for Mac users this site suggests the dmg or Homebrew above.

**Windows** (x64, Windows 10 1803 or later, needs curl and tar): The official command, run in PowerShell, is `irm https://releases.herdr.dev/app/install.ps1 | iex` (the download page writes it as `powershell -c "irm https://releases.herdr.dev/app/install.ps1 | iex"`), which also runs the script right after downloading. This site suggests downloading [install.ps1](https://releases.herdr.dev/app/install.ps1) first, reading it in a text editor, and only then running the official line; if you can't follow it, hold off. Once installed, Herdr appears in the Start menu, and the installer adds `%LOCALAPPDATA%\Programs\herdr-app` to your user PATH; open a new terminal window for that to take effect.

### After Installing: Where herdr-core Comes From

Herdr App only arranges things; herdr-core is what actually runs the terminals. According to the official docs:

- Script install: if the machine doesn't have herdr-core yet, the script installs it; if it already does, the script leaves it alone.
- dmg or Homebrew install: per the official docs, the app sets up herdr-core if you don't have it yet, and can help install or update a core it cannot use.
- The app looks for the core in your PATH, `~/.local/bin`, Homebrew, mise, Nix, and cargo.
- When the app can't reach a running core, it tells you why and how to fix it (CHANGELOG 0.1.14).

## Step 2: Open the App and Start an Agent From the + in the Tab Bar

According to the download page, once you open Herdr, start an agent from the **+** in the tab bar: Claude Code, Codex, or any program. You can also start an agent directly in a pane, just as in a regular terminal; the official FAQ also recommends running agents directly in a Herdr pane (see Step 4 for why).

A few things to know:

- According to the README, new tabs start in the focused terminal's folder. So to have an agent work in a particular repo, first make sure the current terminal is in that repo's folder, then open a new tab.
- An unnamed space follows its first terminal's folder; if you want a label that stays, name the space or tab (default keys: `f2` for a tab, `shift-f2` for a space).
- If you're on a version older than 0.1.15 on macOS, the + menu may mark every agent as "not installed" right after login or a restart; 0.1.15 fixes this.

## Step 3: Get to Know Spaces, Tabs, and Panes

![One machine holds several spaces, each space has several tabs, and each tab splits into panes that each run an agent](structure.en.webp){: w="1600" h="900" }
_Concept diagram: one machine → space (usually one repo) → tab (one task) → pane (one terminal; each can run Claude Code or Codex)._

The official README describes the three layers like this: "A **space** holds work on one machine, usually in one repo. Each space has **tabs**. Split a tab into **panes** to put terminals or mod panels beside each other."

- **Space:** a body of work on one machine, usually one repo.
- **Tab:** one task inside a space, including its terminals and how they're split right and down. Closing the last tab in a space closes the space too.
- **Pane:** one terminal on screen, or a mod panel beside the terminals.

The official homepage suggests: "Use a space for each repo and a tab for each task." For example, in one repo, one tab could have Claude Code build a login page while another has Codex fix tests; when you want to watch an agent and run tests side by side, split the tab into two panes.

To split a pane: on macOS, press `cmd-d` to split right and `cmd-shift-d` to split down; on Linux/Windows, press `ctrl-shift-o` to split right and `ctrl-shift-e` to split down.

### Default Keyboard Shortcuts

Compiled from the official default key files ([macOS](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json), [Linux/Windows](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json)). `cmd-shift-p` means pressing Command, Shift, and P together. For other actions and their keys, open the command palette with `cmd-shift-p` (`ctrl-shift-p` on Linux/Windows).

| Action | macOS | Linux/Windows |
| --- | --- | --- |
| New space | `cmd-n` | `ctrl-shift-n` |
| New tab | `cmd-t` | `ctrl-shift-t` |
| Close tab | `cmd-w` | `ctrl-shift-w` |
| Split pane right | `cmd-d` | `ctrl-shift-o` |
| Split pane down | `cmd-shift-d` | `ctrl-shift-e` |
| Close pane | `cmd-shift-w` | `ctrl-shift-x` |
| Zoom current pane | `cmd-shift-enter` | `ctrl-shift-z` |
| Next / previous agent | `cmd-]` / `cmd-[` | `alt-down` / `alt-up` |
| Show / hide sidebar | `cmd-b` | `ctrl-shift-b` |
| Go to tab 1–9 | `cmd-1`…`cmd-9` | `ctrl-1`…`ctrl-9` |
| Go to space 1–9 | `ctrl-1`…`ctrl-9` | `alt-1`…`alt-9` |
| Rename tab / space | `f2` / `shift-f2` | `f2` / `shift-f2` |
| Command palette | `cmd-shift-p` | `ctrl-shift-p` |
| Settings | `cmd-,` | `ctrl-,` |
| Help | `cmd-/` | `ctrl-shift-/` |

### Using It With git worktree

If you followed [Let Two AI Agents Work Separately: Isolated Working Directories With git worktree](/en/posts/git-worktree-parallel-ai-agents/) and gave each agent its own working directory (a worktree), this site suggests one space per worktree, or at least a pane of its own, so each agent edits files only in its own directory. According to CHANGELOG 0.1.15, the app also has a dialog for opening worktrees (Open worktree), and the Spaces sidebar groups worktrees; the official docs don't describe the steps in detail, so this post doesn't go further.

## Step 4: Check the Agents Sidebar to Find the One Waiting for You

![The four states in the agents sidebar, Working, Blocked, Done, and Idle, what each means and what to do](agents.en.webp){: w="1600" h="900" }
_Concept diagram: what the four states mean and how this site suggests handling them; a worker without a pane opens in peek over your current tab when you click it. The colors are this site's illustration colors, not the app's interface colors._

According to the README, the agents sidebar brings the agents from all your spaces into one list, including programs started by another agent (the docs call them workers). Agents that report status show one of the four states below. The right-hand column is this site's suggestion.

| State | Official meaning (plain English) | What this site suggests you do |
| --- | --- | --- |
| Working | Still busy | Leave it alone and let it work |
| Blocked | Waiting for you | Handle it first: open it, see what it needs, then answer |
| Done | Finished while you were looking elsewhere | Check the result and what it changed |
| Idle | Not working, or finished and you've already looked | Give it the next task |

- Spaces and tabs show a status too: the most urgent one among their agents, in the order blocked > done > working > idle. So if a space shows blocked, at least one agent in it is waiting for you.
- Done turns into Idle once you've looked.
- Click an agent to see it. A worker without a pane opens in **peek**, over your current tab; if you want it beside your other work, keep it as a tab.
- You can also jump to the next / previous agent with keys: `cmd-]` / `cmd-[` on macOS, `alt-down` / `alt-up` on Linux/Windows.
- If terminal text contains a live terminal address, such as `t7` (a terminal on the same machine) or `vps/t7` (one on another machine), Ctrl-click it (Cmd-click on macOS) to peek at it.

Sounds and notifications: according to the built-in guide, when an agent needs you or finishes while you aren't looking, Herdr plays a sound, and when you aren't looking it also shows a clickable notification (a toast). Sounds are set under `sounds` in `settings.json`, and you can preview them in Settings > Alerts.

### When No Status Shows Up

Work through the official FAQ item by item:

1. **The agent doesn't report status.** Only agents that report via OSC 7501 have a status; others still run, just without one. According to the herdr-core page, it doesn't read the screen and has no built-in list of agents, so it doesn't guess. Older agent versions may not report yet, so update the agent first.
2. **The agent runs inside tmux started within Herdr.** Its status can't reach Herdr that way; run the agent directly in a Herdr pane. If you've never used tmux, skip this one.
3. **The agent was started in Herdr TUI.** It lives in the TUI's own server and won't show up in the app.

## Step 5: What Happens After You Close the Window

According to the README and the official FAQ:

| What you did | What happens to terminals and agents |
| --- | --- |
| Close the app window | They keep running in herdr-core |
| Quit or update the app | They keep running; nothing changes |
| Close a pane or tab | The terminals in it end |
| Reboot, log out, or herdr-core stops or crashes | The programs stop too |

After a reboot or the core stopping, kept panes come back with a fresh shell (the program that waits for your commands) in their last folder, with the same terminal address; but the original command is not run again, and Herdr doesn't restart the agent or resume its work in progress. The FAQ says: "Start it again and carry on." In other words, start the agent again yourself and continue.

Also, a terminal that exits on its own or is killed is closed, not restarted.

> **Mac users who just upgraded from an older version:** According to CHANGELOG 0.1.15, terminals opened before herdr-core 0.1.20 may still end when Herdr quits. Once the core is 0.1.20 or newer (Settings > Updates shows it), close and reopen those terminals, or reboot once.
{: .prompt-tip }

## Step 6 (Optional): Add an SSH Machine and Check In From Your Phone

### Add Another Machine

According to the README, add an SSH machine from Settings → Machines or the sidebar's Add machine action: pick a host from your SSH config, or type how SSH reaches it. Spaces on that machine then run their terminals there, not on your computer.

- That machine needs herdr-core too. According to CHANGELOG 0.1.14, if the connection needs a password, a new host key (the key SSH uses to confirm a host's identity), or herdr-core installed there, Settings > Add machine tells you what to run.
- As long as the remote machine and its core stay up, remote work keeps running when your local window closes or your laptop sleeps.
- According to the official homepage, Herdr connects over SSH, and Tailscale works too; your phone and computers talk straight to your machines, with no account, and your terminals never pass through Herdr.

### Check In From Your Phone

There is an official phone app for iPhone, iPad, and Android, available from the [App Store](https://apps.apple.com/app/id6828898364) and [Google Play](https://play.google.com/store/apps/details?id=dev.herdr.app). According to the [phone app page](https://herdr.dev/mobile/):

- Your phone talks to herdr-core on each machine directly over SSH, with no Herdr account and no official server in between.
- The Inbox is sorted by urgency: needs you, done, working, idle.
- Opening an agent gives you a real terminal you can type in; compose lets you paste text, screenshots, or photos, or dictate.
- It works only with herdr-core (the one that comes with Herdr App), not with Herdr TUI.
- To see what it looks like first, tap Try the demo when the app opens.
- The official site says the phone app has no sign-in, no ads, no tracking, and no analytics.

## Step 7 (Optional): Customize

**Command palette:** Press `cmd-shift-p` (`ctrl-shift-p` on Linux/Windows) to find any action by name; it also lists each command's key.

**Settings:** Press `cmd-,` (`ctrl-,` on Linux/Windows) to change fonts, colors, sounds, and other preferences.

**Config folder `~/.config/herdr-app`:** This is the app home, and on macOS and Windows it also lives under your user home. Settings, keys, layouts, mods, and the generated agent guide all live here. If you set the `XDG_CONFIG_HOME` or `HERDR_APP_HOME` environment variable, the location changes accordingly. According to the security doc, spaces, tabs, and splits are stored in each machine's core, not in this folder; removing this folder doesn't stop the core or erase its data.

**Change shortcuts: `keys.json`:** You can change any key in `keys.json`, for example:

```json
{"global": {"ctrl-shift-t": "tab.new"}}
```

Save it and the window reloads it; a broken edit keeps the last good version and writes the error to `keys.error`. Two things to watch. First, an untouched keys file gets the current default shortcuts on upgrade; once you've edited it (even just whitespace), the whole file is yours, and new default shortcuts must be added by hand. Second, plain ctrl+letter combinations (such as ctrl+c and ctrl+d) go to the program in the terminal by default, so don't bind them to Herdr actions.

**Built-in layouts and mods:** Duplicate one before changing its structure or code. Your copies stay yours; Herdr updates the shipped ones every time it starts.

**Let an agent make changes: `AGENTS.md`:** According to the official homepage, Herdr keeps its layout, sidebar, tabs, keys, and themes as plain files in `~/.config/herdr-app`, and the `AGENTS.md` in there explains them to your agent. The download page suggests pointing your agent at this guide and asking for what you want, such as a board, a timer on each tab, or another look. **Don't edit `AGENTS.md` yourself**: the app rewrites it on every start, so your changes get overwritten.

**`herdr-app --skill`:** Prints the agent guide for driving the window. The official split: use herdr-core for running and coordinating programs, and use the app to change what you see. herdr-core's own manual is `hc --skill`.

**Escape hatch `ctrl-alt-shift-escape`:** If a layout or key edit goes wrong and the window is a mess, press Ctrl, Alt (Option on a Mac keyboard), Shift, and Esc together. According to the built-in guide, this combo always works and can't be changed: it moves the current layout and `keys.json` aside (renamed to `*.reset-<time>`) and returns to the default `main` layout.

## Privacy, Updates, and Mod Safety

![Privacy and updates: turn off telemetry in Settings → Privacy or settings.json, check updates in Settings → Updates, mods have full permissions](privacy.en.webp){: w="1600" h="900" }
_Concept diagram: turn off telemetry in Settings → Privacy or by adding `"telemetry": false` to settings.json; check updates in Settings → Updates; mods have full permissions, so read them before installing._

### Telemetry Is On by Default: Three Ways to Turn It Off

According to the official [Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md) doc, usage telemetry is **on by default**: release builds send a small daily report to `https://telemetry.herdr.dev/v1/report` with a random install ID.

- What is sent: app and core versions, OS and architecture, bucketed usage time and counts, known agent names, built-in layout names, mod count, app command names, and fixed event counts. Custom layout names are sent as `custom`, and custom mod names are not sent.
- What is not sent: terminal text, prompts, file contents, folder paths, and free-text names.
- According to the [privacy page](https://herdr.dev/privacy/), usage reports are kept for 3 months, IP addresses are not stored, and data is not sold or shared.

Three ways to turn it off:

1. Turn it off in **Settings → Privacy**. The same page also lets you inspect the report.
2. Add the field `"telemetry": false` to your **existing** `settings.json` in `~/.config/herdr-app`. The official example is `{"telemetry": false}`; if the file already has other settings, add the field inside the outermost braces, separated from the other fields by a comma, rather than replacing the whole file.
3. **For one run only:** set the environment variable `DO_NOT_TRACK=1` or `HERDR_TELEMETRY=0`. CI environments disable collection too.

Two things to know:

- Turning it off deletes the local install ID and unsent reports, but **reports already sent can't be recalled**.
- Turning telemetry off does **not** stop update checks, network requests made by mods, or feedback you choose to send. Feedback is drafted for you to review and send, not sent silently.

### How Automatic Updates Work

According to the README and the built-in guide:

- Installed releases check for updates in the background and download the new app beside the running one. It takes over when you quit and reopen the app, or choose the update action. Your terminals keep running in the core.
- **Settings → Updates** shows what is available and keeps the app and core update actions together.
- What's New opens after an update; you can open it again from the command palette.
- The first start after an app update also updates herdr-core to the latest release of the same generation, keeping terminals running.
- If the app crashes or is killed while a verified newer update is waiting, the next launch installs it before opening a window.
- Builds from source don't update themselves.

### Update Verification: SHA-256 Only

> According to the official security doc, before unpacking an update the app checks its SHA-256 checksum (a fingerprint computed from the file's contents) against the release manifest. But that checksum comes from the same service as the manifest, so it only detects a damaged download; it is not an independent signature on the manifest, and the app does not verify a separate cryptographic signature on update manifests. When the release pipeline has no signing credentials configured, packages can be unsigned or ad hoc signed; Apple notarization (Apple's check of an app) is tested separately and is not required for publishing a release. In the doc's own words: "Do not assume every download is notarized or signed."
{: .prompt-warning }

### Mods and Other People's Layouts: Read Before You Install

> According to the official security doc, a mod is trusted JavaScript running inside Herdr, with no sandbox and full permissions: it can run programs with your environment, fetch URLs, and read files, and it can also run programs on machines you've connected. The doc states plainly that this "is not a security boundary," and there is no permission prompt for each program or network request. Read someone else's mod before installing it, and treat it like a shell script you would run yourself. Layouts can load mods too, so when you install someone else's layout, check the mods it references as well.
{: .prompt-warning }

When you look for other people's layouts or mods in the [gallery](https://herdr.dev/gallery), the built-in guide tells the agent to read the recipe and every file first, and before adding anything, to tell you whether the mod reaches the network, runs programs (`exec`, `hc`), or reads files outside its own folder.

Two more points about the config folder:

- Mods may store sensitive data in `~/.config/herdr-app`, and Herdr does not encrypt this folder.
- The app exposes a local control socket (a connection point local programs use to talk to each other) in this folder so agents can inspect and drive the window. The doc warns: treat access to this folder as access to the window and its commands.

## Wrapping Up

After these steps, you'll have one desktop window with a space for each repo and a tab for each task, and the agents sidebar tells you which agent is waiting for you.

- Install: on an Apple Silicon Mac, use the dmg or `brew install --cask herdr-app`; on Linux and Windows, download the script and read it before running; there is no installer for Intel Macs.
- Start agents: from the + in the tab bar, or directly in a pane.
- Organize: one space per repo, one tab per task; split panes to put things side by side.
- Check status: handle Blocked first, then Done; if there's no status, work through "When No Status Shows Up."
- Closing the window is fine; closing a pane or tab ends its terminals; after a reboot, start agents again yourself.
- Telemetry is on by default; turn it off in Settings → Privacy. Turning it off doesn't stop update checks.
- Updates are checked only against a SHA-256 from the same service, with no separate signature check.
- Read every file before installing someone else's mod or layout.

## Next Steps

- To manage agents in the terminal instead: [Run Several AI Coding Agents at Once and Spot the Stuck One: Getting Started With herdr](/en/posts/herdr-run-multiple-ai-agents/) (Herdr TUI, a different program from the app).
- To give each agent its own working directory: [Let Two AI Agents Work Separately: Isolated Working Directories With git worktree](/en/posts/git-worktree-parallel-ai-agents/).
- For details, the official [herdr-app README (v0.1.15)](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md) is authoritative.

Further reading: [README](https://github.com/herdrdev/herdr-app/blob/v0.1.15/README.md), [Security and privacy](https://github.com/herdrdev/herdr-app/blob/v0.1.15/docs/security.md), [Built-in guide AGENTS.md](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/AGENTS.md), [macOS default keys](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.macos.json), [Linux/Windows default keys](https://github.com/herdrdev/herdr-app/blob/v0.1.15/defaults/keys.json), [CHANGELOG](https://github.com/herdrdev/herdr-app/blob/v0.1.15/CHANGELOG.md), [Install script](https://github.com/herdrdev/herdr-app/blob/v0.1.15/distribution/install.sh), [herdr.dev](https://herdr.dev/), [Download page](https://herdr.dev/download/), [Phone app](https://herdr.dev/mobile/), [herdr-core](https://herdr.dev/core/), [Privacy](https://herdr.dev/privacy/), [Herdr TUI](https://herdr.dev/tui/), [Homebrew cask](https://formulae.brew.sh/cask/herdr-app).
