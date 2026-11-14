---
title: "Claude Code Plugins: What to Check Before You Install One"
description: "One Claude Code plugin can bring in skills, hooks, and MCP servers at once, and some of them run code without you asking. Starting from the official directory, this post shows which files to open before you install, how to pick an install scope, and how to disable and remove a plugin afterward."
date: 2026-11-14 21:00:00 +0800
categories: [Security, Supply Chain]
tags: [claude-code, claude-code-plugins, coding-agent, supply-chain-security, mcp]
media_subpath: /assets/img/posts/claude-code-plugin-safe-install/
image:
  path: cover.en.webp
  alt: "Before you install a Claude Code plugin, open the files that run code on their own, such as hooks.json and .mcp.json."
---

Claude Code, an AI coding assistant you use in the terminal, can install plugins. A plugin is a bundle of extensions. One install puts several things into Claude Code at once: skills that teach Claude how to do tasks, custom slash commands, hooks that run automatically at set moments, and MCP servers that connect to outside services.

That is what makes plugins convenient, and it is also why you need to be careful. Some of these pieces run code on their own when you haven't given any command, and they run with your account's permissions. Before installation, Claude Code shows this official warning:

> Plugins can run code on your computer, with access to your files and shell. Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's homepage for more information.

So how do you "make sure you trust" a plugin? This post doesn't recommend any plugins. It only lays out a set of checks for before and after you install: how to search the official directory, which files to open before you install, which install scope to choose, and how to disable and remove a plugin afterward.

> **Version note**: this post is based on official material read on 2026-11-14 (Taipei time): [Discover and install plugins](https://code.claude.com/docs/en/discover-plugins), [Plugins overview](https://code.claude.com/docs/en/plugins), [Plugins reference](https://code.claude.com/docs/en/plugins-reference), [Plugin security](https://code.claude.com/docs/en/plugins/security), [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org), [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference), and the README and marketplace listing of [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official). I checked the terminal commands in this post against the `--help` output of Claude Code 2.1.325. I didn't actually install any plugin for this post. Commands and screens change between versions, so go by the version you have installed.
{: .prompt-info }

[Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/) explains why third-party extensions bring risk, so I won't repeat it here. This post covers only the concrete steps for checking a plugin.

## A few terms first

- **Plugin**: a bundle of Claude Code extensions. It may contain several of the things below at once. Its full name is written as "plugin-name@marketplace-name".
- **Marketplace**: a catalog of plugins. Claude Code has to know about a marketplace before it can install plugins from it. Anthropic's official marketplace is called `claude-plugins-official`. Claude Code adds it automatically the first time you open its interactive screen.
- **Skill**: a set of instructions written for Claude (`SKILL.md`). When Claude runs into a related task, it follows them.
- **Slash command**: a command you type in the Claude Code input box that starts with `/`, such as `/plugin`.
- **Hook**: a shell command that runs automatically at a set moment. For example, it can format a file every time Claude finishes editing it. For how to use hooks, see [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/).
- **MCP server**: a small program that connects Claude to outside tools or services, such as a database, GitHub, or documentation search. It can be a program that starts on your computer, or just a web address.
- **Shell**: the program in your terminal that runs commands. Anything that can run shell commands can do almost anything you can do in the terminal.

## What a plugin brings in

A plugin is a folder. Each file in it goes in a set location depending on what it does. Based on the official reference and security docs, these files fall into two groups: text that only Claude reads, and parts that run code.

| Location | What it is | Does it run code on its own? |
| --- | --- | --- |
| `.claude-plugin/plugin.json` | The plugin's business card: name, version, author, homepage, license | No |
| `skills/`, `commands/`, `agents/` | Instructions for Claude (Markdown files) | No, but they affect what Claude does next |
| `hooks/hooks.json` | Shell commands that run at set moments | **Yes**, as soon as the moment comes |
| `monitors/monitors.json` | Commands that keep running in the background | **Yes** |
| `.mcp.json` | MCP server settings, meaning which program to start or which web address to connect to | **Yes**, Claude Code starts local servers |
| `.lsp.json` | Language servers (background programs that provide code navigation and error hints) | **Yes** |
| `bin/` | Executables Claude can call directly while the plugin is enabled | Only when Claude calls them, and the call goes through permission rules |

The one point to remember most comes from the official security docs. Claude Code's permission rules and sandbox govern the tool calls Claude itself makes. They don't govern code that a plugin runs on its own. Hooks, monitors, MCP servers, and LSP servers all run outside the sandbox with your full user permissions. Even if you turned on `/sandbox` by following [Claude Code Sandbox Setup: Keep SSH Keys and Tokens Out](/posts/claude-code-sandbox-setup/), a plugin's hooks still run outside the sandbox.

Also, `plugin.json` isn't required. The official docs say you can leave it out, and even when it exists, only `name` is required. Fields such as author, homepage, and license may all be empty.

![The files in a plugin fall into two groups. Claude only reads skills, commands, and agents. Hooks, monitors, .mcp.json, and .lsp.json run code outside the sandbox.](plugin-anatomy.en.webp){: w="1600" h="900" }
_A concept illustration. The left side is text for Claude to read, and the right side is the parts that run code. Open each file on the right before you install._

## What "official" means in the official directory

The official plugin directory is [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) on GitHub. This repo is two things at once. It is a place that stores plugins, and it holds `.claude-plugin/marketplace.json`, the listing file of the `claude-plugins-official` marketplace.

The repo has two folders for plugins. The README describes them like this:

- **`/plugins`**: plugins that Anthropic develops and maintains itself. Every time someone proposes a change, every folder here is checked.
- **`/external_plugins`**: third-party plugins added before submissions moved to claude.ai/directory/manage, plus Anthropic's channel plugins (Discord, fakechat, iMessage, and Telegram).

Still, most plugins in the marketplace listing aren't in either folder. When I read `marketplace.json` on 2026-11-14, it listed 317 plugins. Only 55 of them live in this repo (41 in `/plugins` and 14 in `/external_plugins`). Of the other 262, 261 point to repos owned by other companies or developers, and the last 1 is fetched by running a command on your computer. The README says it plainly. The repo's checks cover the plugin folders stored here, not plugins stored in other repos.

The official docs also point out that a marketplace's name tells you who publishes the catalog. It doesn't tell you what each plugin in it does. So check every plugin before you install it, whichever marketplace it comes from. The warning before installation is the same for every marketplace, too.

So the official directory lowers your chance of installing an impostor, because Anthropic manages the listing. But it doesn't mean "every plugin passed a security review."

### Find out where a plugin actually lives

Find the plugin's entry in `marketplace.json` and look at its `source` field:

- If it says `./plugins/…` or `./external_plugins/…`, the plugin is in that folder of the official repo.
- If it's an object whose `source` is `url` or `git-subdir`, the plugin is in another repo that `url` points to. With `git-subdir`, `path` also names the folder inside that repo.

An entry looks roughly like this (the values are examples):

```json
{
  "name": "example-plugin",
  "author": { "name": "Example Inc." },
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/claude-plugins.git",
    "path": "plugins/example-plugin",
    "ref": "v1.2.0",
    "sha": "<40-character commit SHA>"
  },
  "homepage": "https://example.com"
}
```

`sha` is the ID of a commit, which is a snapshot of the code at one point in time. According to the marketplace reference, when an entry has both `ref` and `sha`, Claude Code fetches the version at `sha`. So the files to check are the ones at that commit, not the latest version in the other repo. On GitHub, you can open the folder at that version with a URL like `https://github.com/<owner>/<repo>/tree/<sha>/<path>`.

## Step 1: Find the plugin in `/plugin` and read its details first

In the Claude Code input box, type:

```text
/plugin
```
{: .nolineno }

The screen opens on the **Discover** tab, which lists plugins from the marketplaces you've added. Start typing to search, and press Enter to open a plugin's details. The other tabs are **Installed** (installed plugins), **Marketplaces** (marketplaces you've added), and **Errors** (loading errors).

If you already know the name, you can also type it directly:

```text
/plugin install <plugin-name>@claude-plugins-official
```
{: .nolineno }

Running this in a conversation doesn't install anything right away. It opens the same details panel first, so you can pick an install scope and then confirm.

The details panel has a **Will install** section. It lists the commands, agents, skills, hooks, and MCP and LSP servers the plugin will install. Look here first for hooks, MCP servers, or LSP servers. If there are any, code will run automatically once you install the plugin.

But the official docs also explain that Will install only tells you "there are hooks." It doesn't tell you what those hooks run. So the next step is to read the source files.

## Step 2: Open these files before you install

In the details panel, choose **Open homepage** or **View on GitHub** to open the source code. If neither option is there, go back to the marketplace's repo and find the plugin's folder the way the previous section describes. To check where you originally added the marketplace from, run this in your terminal:

```bash
claude plugin marketplace list
```
{: .nolineno }

Then open the files below in order. If a file doesn't exist, the plugin doesn't have that feature, so skip it.

### `.claude-plugin/plugin.json`: who made it and where it comes from

Look at `author`, `homepage`, `repository`, and `license`. Do the homepage and repo fields point to the same repo you're looking at? If the name looks alike but the account is different, be extra careful.

### `hooks/hooks.json`: what runs automatically, and when

This is the most important file. For each hook, check two things: the event name (when it runs) and `command` (what it runs). It looks roughly like this (the contents are an example):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/setup.sh\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/format.sh\"" }
        ]
      }
    ]
  }
}
```
{: file="hooks/hooks.json" }

Here's how to read it:

- `SessionStart` runs `setup.sh` every time you open Claude Code, without you doing anything.
- `PostToolUse` with `"matcher": "Edit|Write"` runs `format.sh` every time Claude finishes changing a file with the Edit or Write tool.
- `${CLAUDE_PLUGIN_ROOT}` stands for the folder where the plugin lives after installation. When a command only says "run some script," open that script too, because the script does the actual work.

If you see any of the following, stop and find out why: downloading something with `curl` or `wget` and running it right away; sending file contents or environment variables to an outside address; deleting or changing files outside the project; reading places that store keys, such as `~/.ssh` or `.env`. These aren't always malicious. Some hooks are meant to send code snippets to an outside service for analysis, and the README usually says so. What matters is that you know it does this and you're OK with it.

### `.mcp.json`: which programs start and where they connect

```json
{
  "mcpServers": {
    "example-docs": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    },
    "example-db": {
      "command": "npx",
      "args": ["-y", "@example/db-mcp@1.4.2"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```
{: file=".mcp.json" }

Here's how to read it:

- A server with `url` connects to an outside address. Check whether the domain belongs to that service itself. Whatever you look up or send through it in Claude goes to that address.
- A server with `command` starts a program on your computer. `npx -y package-name` downloads that package from npm and runs it. A fixed version number (such as `@1.4.2`) is better. With no version, or with `@latest`, each start may run different code.
- `env` lists the environment variables it needs, which are usually tokens or passwords. Limit what you give it to what it really needs.

### `bin/`, `monitors/`, and `.lsp.json`

- Look at every file in `bin/`. While the plugin is enabled, these files are on the search path (`PATH`) that Claude uses to run commands, so Claude can call them directly like any other command.
- `monitors/monitors.json` holds commands that run in the background. Read it the same way as hooks and check each `command`.
- `.lsp.json` starts language servers. Check which program it starts.

### `skills/`, `commands/`, `agents/`: skim them

These are instructions for Claude to read, and they don't run on their own. But instructions can tell Claude to run commands. Skim them once and watch for passages that tell Claude to download and run something, send data outside, or ignore your rules. The "Entry 1: Instructions Hidden in Content" section of [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/) covers this kind of hidden instruction in detail.

### List everything with one command

Going through folders by hand, you're bound to miss something. The official security docs offer a method. Clone the repo that holds the plugin, check out the commit named in the marketplace entry, and then use `plugin details` to list the components Claude Code finds in that folder:

```bash
git clone https://github.com/example-org/claude-plugins.git
cd claude-plugins
git checkout <sha-from-the-marketplace-entry>
claude --plugin-dir ./plugins/example-plugin plugin details example-plugin
```
{: .nolineno }

It prints a `Component inventory`, a list of the plugin's components. Compare it with the files you just read, and go back to anything you missed. After you install, you can also run `claude plugin details <plugin-name>` to check the copy that's actually installed.

### A checklist you can copy

You can paste this straight into your notes or team docs:

```markdown
## Claude Code plugin pre-install checklist

- [ ] From the marketplace entry's source and sha, confirm which repo and commit the plugin actually lives in
- [ ] The author, homepage, and repo in plugin.json match the source I'm looking at
- [ ] Will install in the details panel: any hooks, MCP servers, or LSP servers
- [ ] hooks/hooks.json: each hook's trigger and command, plus the scripts it calls
- [ ] .mcp.json: the program each server starts (is the version pinned?) or the address it connects to, and the environment variables it needs
- [ ] bin/, monitors/, .lsp.json: every file that runs
- [ ] skills/, commands/, agents/: nothing that tells Claude to download and run things, send data out, or ignore rules
- [ ] I've read every component that claude --plugin-dir <folder> plugin details <name> lists
- [ ] Decide the install scope (local, user, or project) and whether to auto-update
```

![Four steps before you install: confirm the source, read the details, read the files that run code, and list everything with plugin details. Then install at the smallest scope.](review-steps.en.webp){: w="1600" h="900" }
_A concept illustration. You finish all four steps before installing. Step 3 only covers the files you open, and step 4 uses the component list to catch what you missed._

## Step 3: Choose an install scope, then confirm

When you choose to install in the details panel, you pick an install scope:

| Scope | Who uses it | Which settings file it goes in |
| --- | --- | --- |
| Local | Only you, and only in this repo | `.claude/settings.local.json` |
| User | You, in every project on this computer | `~/.claude/settings.json` |
| Project | Everyone who works on this repo | `.claude/settings.json` (committed to the repo) |

For a plugin you're using for the first time, I suggest installing it at Local first and trying it in just one project. Once you're sure you want it in other projects too, install it at User. Choose Project only when you want the whole team to use it, and run it through your normal code review process. The "Next: put the checklist into your team's rules" section shows how.

To install from the terminal, use the command below. Without `--scope`, it defaults to user:

```bash
claude plugin install <plugin-name>@claude-plugins-official --scope local
```
{: .nolineno }

Two things to know:

- **Installing a plugin turns it on.** Unless the plugin itself sets `defaultEnabled: false`, it starts working as soon as it's installed.
- **Project scope doesn't install it on your teammates' computers.** After the setting is committed to the repo, each collaborator still has to run the install once themselves.

## Other marketplaces: check the source before you add one

Besides the official marketplace, anyone can create a marketplace. The command to add one is:

```text
/plugin marketplace add <source>
```
{: .nolineno }

The source can be any of these:

- A GitHub repo, written as `owner/repo`. You can add `#` to pick a tag or branch, such as `your-org/plugins#v1.2.0`.
- A full URL on another Git host, such as `https://gitlab.example.com/your-group/your-marketplace.git#v1.0.0`.
- The path to a local folder.
- An `https://` URL that points to a `marketplace.json`.

Before you add one, check these things:

- **Who owns the repo.** Get the link from a place you trust, such as the tool's official website or docs, not just from search results. Look-alike account names are common.
- **Whether a version is pinned.** Add a tag such as `#v1.2.0`, and the marketplace contents won't change every time the owner commits. But a tag itself can be moved, as [gh actions-lock Tutorial: Pin GitHub Actions Dependencies With a Lockfile](/posts/gh-actions-lock-workflow-lockfile/) explains, so a tag only cuts down on changes.
- **A one-line install command can also add a marketplace.** A command such as `/plugin install <name> --marketplace owner/repo` adds the marketplace first if you haven't added it yet. When someone shares a command like this, check who `owner/repo` is first, just the same.

### Auto-update: the files you reviewed can change

According to the official docs, Anthropic's official marketplaces (such as `claude-plugins-official`) auto-update by default. Other marketplaces, including third-party and local ones, don't. With auto-update on, Claude Code updates the plugins installed from that marketplace in the background. So the files you reviewed may be replaced without you knowing.

To turn off auto-update for a marketplace, go to the **Marketplaces** tab in `/plugin`, select the marketplace, and choose **Disable auto-update**.

The cost of turning it off is that you won't get fixes automatically. A more practical approach is to turn off auto-update for important projects and update by hand on a regular schedule. Before each update, look at what changed, especially `hooks/hooks.json` and `.mcp.json`. The command to update by hand is `claude plugin update <plugin-name>@<marketplace>`. Restart Claude Code after updating to apply it.

## After you install: disable, remove, and clean up

First, check what you've installed. `claude plugin list` shows each plugin's version, install scope, and status.

**Disable** a plugin when you don't need it for now, or when you suspect a problem. In the Installed tab of `/plugin`, select the plugin and press the space bar, or type `/plugin disable` to open the panel. In the terminal, run:

```bash
claude plugin disable <plugin-name>@<marketplace>
```
{: .nolineno }

After you disable a plugin, its files stay, and you can turn it back on later with `claude plugin enable`. If something odd is going on and you want to stop everything first, `claude plugin disable --all` disables every plugin.

To **remove** a plugin, type `/plugin uninstall`, or run this in the terminal:

```bash
claude plugin uninstall <plugin-name>@<marketplace> --scope <original-scope>
```
{: .nolineno }

`--scope` must match the scope you installed with. If you leave it out, it defaults to user. When you remove a plugin, keep these in mind:

- The plugin's data folder, `~/.claude/plugins/data/<id>/`, is deleted along with it. Add `--keep-data` to keep it.
- The plugin's code stays in `~/.claude/plugins/cache/` for another 14 days before a background cleanup deletes it. If you're sure you no longer trust it, delete `~/.claude/plugins/cache/<marketplace>/<plugin-name>/` yourself.
- When you remove a Project-scope plugin in the interface, it asks you to choose **Disable for me** (turns it off only for you, written to your `.claude/settings.local.json`) or **Uninstall for everyone** (removes it from the shared `.claude/settings.json`, which affects every collaborator).

To **remove a marketplace**, type `/plugin marketplace remove <marketplace>`. This also removes every plugin you installed from that marketplace.

If you removed a plugin because you suspected a problem, also replace any tokens you gave it. For what to do next, see the "After an Incident (or a Suspected One)" checklist in [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).

![Three ways to handle a plugin after you install it. Disabling keeps the files. Removing deletes its data, but the cache stays for 14 days. Removing a marketplace also removes the plugins you installed from it. A side note warns that auto-update can replace files you reviewed.](after-install.en.webp){: w="1600" h="900" }
_A concept illustration. Three ways to handle a plugin, from lightest to heaviest. If you suspect a problem, disable it first. Remove it once you're sure you don't need it._

## Next: put the checklist into your team's rules

One careful person isn't enough. A team needs a shared way of doing this. You can work at three levels.

**1. Write it into your project rules.** Put the checklist above into `CLAUDE.md`, `AGENTS.md`, or your PR template, and agree that "anyone who adds a plugin or marketplace attaches this checklist." For how to write a rules file, see [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/posts/agents-md-project-rules-for-coding-agents/).

**2. Review the settings file like code.** When your project recommends plugins, write `extraKnownMarketplaces` (which marketplaces to know about) and `enabledPlugins` (which plugins to enable) in `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "your-marketplace": {
      "source": { "source": "github", "repo": "your-org/your-marketplace" }
    }
  },
  "enabledPlugins": {
    "code-formatter@your-marketplace": true
  }
}
```
{: file=".claude/settings.json" }

This file is committed to the repo, so changing it is like changing code and has to go through PR review. You can add it to CODEOWNERS (a file that says who reviews which files), so that someone who knows this checklist approves the changes. The official docs note two more things. Writing `enabledPlugins` in the repo doesn't install anything automatically, so collaborators have to run `claude plugin install <name>@<marketplace> --scope project` themselves. And `extraKnownMarketplaces` only takes effect in folders the collaborator already trusts.

**3. Limit marketplace sources at the organization level.** If your company manages Claude Code settings centrally (managed settings), admins can use `strictKnownMarketplaces` to allow only certain sources, or `blockedMarketplaces` to block certain sources. Here is the official allowlist example:

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "anthropics/claude-plugins-official" },
    { "source": "github", "repo": "your-org/*" },
    { "source": "skills-dir" }
  ]
}
```

The first two lines allow only the official marketplace and marketplaces under the company's own account. The third line, `skills-dir`, maps to the local `~/.claude/skills/` folder, so whatever is in there keeps loading. Admins can also set `pluginTrustMessage` to add the company's own note after the pre-install warning, such as a link to the review process.

## What to do when

| I want to… | Do this |
| --- | --- |
| Find a plugin | Use the Discover tab in `/plugin`, or open its details first with `/plugin install <name>@claude-plugins-official` |
| Know where a plugin actually lives | Check `source` and `sha` in its `marketplace.json` entry |
| Know what runs automatically after I install | Read `hooks/hooks.json`, `.mcp.json`, `bin/`, `monitors/`, `.lsp.json` |
| Make sure I haven't missed a component | Clone the repo, then run `claude --plugin-dir <folder> plugin details <name>` |
| Try it at a small scope first | Choose Local when you install |
| Add another marketplace | Confirm `owner/repo` from an official link, and pin a version with `#tag` |
| Keep reviewed files from being swapped in the background | `/plugin` → Marketplaces → Disable auto-update, then update by hand after reading the diff |
| Stop using it for now | `claude plugin disable <name>@<marketplace>` |
| Stop everything when I suspect a problem | `claude plugin disable --all` |
| Remove it completely | `claude plugin uninstall <name>@<marketplace> --scope <scope>`, and delete the cache folder if needed |
| Keep the team consistent | Put the checklist into your project rules, and send `.claude/settings.json` through PR review |

## Common misconceptions

- **"If it's in the official directory, it's safe."** Most plugins in the official marketplace live in other repos, and the official repo's checks don't cover them. The pre-install warning is the same for every marketplace, too.
- **"With the sandbox on, I don't need to worry."** Hooks, monitors, MCP servers, and LSP servers all run outside the sandbox.
- **"Reading Will install is enough."** It tells you there are hooks, not what they run.
- **"Skills are just text, so I don't need to read them."** Text can tell Claude to run commands.
- **"Once I've checked it, I'm done."** With auto-update on, the files get replaced in the background.
- **"Removing it cleans everything up."** The cache stays for another 14 days, and any tokens you gave it still work.

## Conclusion

A plugin installs several kinds of extensions at once, so before you install, work out what it will do with your permissions, and when. Go in this order: confirm where the plugin actually lives from its marketplace entry, read Will install in the details panel, open the files that run code such as `hooks/hooks.json` and `.mcp.json`, compare against the component list from `plugin details`, and then install at the smallest scope. After you install, remember that auto-update replaces files. When you no longer need a plugin, disable or remove it.

To understand what the hooks a plugin brings in actually do, read [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/). To learn how the skills inside a plugin are written, see [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/). To check supply chain risks across your whole AI workflow with the same approach, see [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/).
