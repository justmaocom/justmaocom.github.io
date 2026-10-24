---
title: "pstack, Part 1: Install, Pick Models, Start With /poteto-mode"
description: "A step-by-step guide to pstack in Claude Code or Cursor: install it, check or pin the version, pick models with /setup-pstack, and write tasks for /poteto-mode."
date: 2026-10-22 15:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-install-routing/
image:
  path: cover.en.png
  alt: "How to install pstack, check its version, pick models with /setup-pstack, and then hand every task to /poteto-mode."
---

pstack helps an AI coding assistant work in a more orderly way, but open it up and there are dozens of skills. This post shows you how to start: install pstack, confirm which version you got, pick your models, and then hand every task to `/poteto-mode`. You don't need to learn every name first.

A few terms first. An AI coding assistant is a tool such as Cursor or Claude Code that can read and write the files in your project and write code for you. A skill is a set of instructions that tells the AI how to do one kind of work, and you call it with a slash command such as `/poteto-mode`. pstack is a set of skills that Lauren Tan maintains in Cursor's official plugin repository, [`cursor/plugins`](https://github.com/cursor/plugins/tree/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack). A playbook is a fixed list of steps for one type of task; for example, "fix a bug" means reproduce it, find the cause, fix it, and then verify. A subagent is a separate AI that the main chat sends off to do one small piece of work. A token is the unit an AI's usage is counted in; the more it reads and writes, the more tokens it uses.

The whole flow has three steps: install once, pick models once with `/setup-pstack`, and start every new task with `/poteto-mode`. Say what you want and what "done" looks like, and it picks the playbook. When you're not sure what to use, ask `/poteto-help`.

The example prompts in this post are generic. Copy them and swap in details from your own project.

> pstack Series | Part 1
>
> - Series guide: What pstack is and how to read the four parts (not yet published)
> - Next (Part 2): [Understand the code, then design, before you change it](/posts/pstack-understand-design/)
>
> **Version note**: This post is based on pstack [version `0.15.29`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json), at `cursor/plugins` commit `88d4751`, the version when this post first went out on 2026-10-22. When it was rewritten as a tutorial on 2026-10-24, it stayed on this version. The Claude Code commands and menus follow the [official docs](https://code.claude.com/docs/en/plugins/install) as read on 2026-10-24. Later versions may change commands and behavior.
>
> When checked on 2026-10-24 at 10:51 Taipei time, the latest version on `cursor/plugins` main was `0.15.32` (commit `e853501`), and the skill count had risen to 58 with the addition of `statechart` and `ketchup-video`. Compared with `0.15.29`, `setup-pstack`, the setup guide (01-setup), and the Claude Code notes haven't changed. The README added a paragraph on automatic and manual updates after its install steps (it matches Step 2 here), plus rows for the two new skills. `poteto-mode`'s SKILL.md and playbooks haven't changed, and only its internal scripts were updated; `poteto-help` only added two rows for those two new skills to its lookup table.
{: .prompt-info }

## What pstack Installs

Version `0.15.29` has 56 skills, and each skill is a slash command. It also has two dedicated subagents, `poteto-agent` and `comment-sicko`, plus 23 playbooks under `poteto-mode`.

In Claude Code, a plugin's commands carry the plugin's name as a prefix, so Cursor's `/poteto-mode` becomes `/pstack:poteto-mode` (see the [README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L28)). The examples below use the Claude Code form; in Cursor, just drop `pstack:`. Other differences are listed in the official [Claude Code notes](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md).

![Four steps: install pstack, check and update or pin the version, pick models with /setup-pstack, start each task with /poteto-mode](install-setup-flow.en.png){: width="800" height="450" }
_The first-run flow: install, check the version, pick models, then start from /poteto-mode._

## Step 1: Install

The [README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L15-L26) and the [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L5-L15) list two ways to install. In a Cursor chat, type:

```text
/add-plugin pstack
```

In Claude Code, first add the `cursor/plugins` GitHub repo (repository: the project folder that holds the code) as a marketplace (a plugin catalog), then install pstack from that catalog:

```text
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

`pstack@cursor-plugins` on the second line means "install pstack from the cursor-plugins catalog." According to the [Claude Code docs](https://code.claude.com/docs/en/plugins/install#install-a-plugin), typing `/plugin install` in a chat doesn't install right away. It first opens the plugin's details pane so you can see what it adds, and then asks you to pick a scope. "Install for you" (user scope) makes it available in every project on this machine.

> None of the commands above name a version. You get whatever is on the default branch of `cursor/plugins` at that moment (the default branch is the main line of work in a repo, usually called main). For what to check before installing someone else's plugin, see [this post on supply-chain and permission risks](/posts/coding-agent-supply-chain-permission-risks/).
{: .prompt-tip }

There are also third-party mirrors of pstack online, such as `backnotprop/pstack`. They are not the version that `cursor/plugins` maintains. If you use one, read through it and pin a version first, for the reasons in the same [supply-chain post](/posts/coding-agent-supply-chain-permission-risks/).

## Step 2: Check the Version, Update, or Pin It

### See Which Version You Got

After installing, confirm which version you have. According to the [Claude Code docs](https://code.claude.com/docs/en/plugins/install#install-a-plugin), running this line in your terminal (the window where you type commands) lists each plugin with its `Version`, `Scope`, and `Status`. You can also type `/plugin` in a chat and open the Installed tab.

```bash
claude plugin list
```

Compare the version with [`plugin.json`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/.cursor-plugin/plugin.json) to see whether you have the same version this post uses.

### Updates: Off by Default

According to the [Claude Code docs](https://code.claude.com/docs/en/plugins/install#keep-plugins-updated), Claude Code leaves auto-update **off** for third-party marketplaces, so pstack stays on the version you installed.

- **To update once by hand**: run the line below in your terminal.
- **To turn on auto-update**: type `/plugin` in a chat, open the Marketplaces tab, select `cursor-plugins`, and choose Enable auto-update.

```bash
claude plugin update pstack@cursor-plugins
```

> Before you update, look at what changed in pstack on `cursor/plugins`, then decide. Turning on auto-update means you accept every new change as it lands. The [supply-chain post](/posts/coding-agent-supply-chain-permission-risks/) explains why this matters.
{: .prompt-tip }

This post doesn't cover how updates work on the Cursor side.

### Pin a Specific Commit

A commit is one saved version in git (the most widely used version-control tool), and each commit has an ID (its SHA). To keep pstack on a commit you've reviewed, you can use a local folder as the marketplace.

Here's why. In Claude Code's official [command reference](https://code.claude.com/docs/en/plugins/cli-reference#plugin-install), `/plugin install` has no option for a version or commit. `/plugin marketplace add` lets you add `#ref` after the repo to [pin a branch or tag](https://code.claude.com/docs/en/plugins/install#add-a-marketplace) (a tag is a fixed name given to one commit, such as v1.0), but when I checked on 2026-10-24, `cursor/plugins` had no tags. The `sha` field that can pin a commit lives in the catalog's `marketplace.json` and is set by the catalog's maintainer (see the [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference#plugin-sources)); the pstack entry in `cursor/plugins` doesn't set it.

The official docs support adding a local folder as a marketplace. So you can download (clone) the repo to your computer, check out the commit you reviewed, and add that folder as a marketplace. Using this post's commit as the example, run in your terminal:

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout 88d47514b82e7c44f00f2b2a72ff6dd12158038c
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

If you already added `cursor/plugins` from GitHub, both sources use the catalog name `cursor-plugins`. You can remove the old one with `claude plugin marketplace remove cursor-plugins` and then run the commands above. Note that according to the [Claude Code docs](https://code.claude.com/docs/en/plugins/install#manage-marketplaces), removing a marketplace also uninstalls every plugin you installed from it, so you'll need to install again afterward.

This is the same "clone, then check out a reviewed commit" approach the [supply-chain post](/posts/coding-agent-supply-chain-permission-risks/) recommends. To upgrade later, check out a newer commit in that folder and then update the plugin.

## Step 3: Pick Models With /setup-pstack

pstack splits work across roles, such as the one that writes code, the one that makes judgment calls, and the ones that sit on a review panel, and each role can use a different model. [`/setup-pstack`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/setup-pstack/SKILL.md) picks the models for those roles.

**When to use it**: once after installing. Run it again when you switch accounts or plans, or want different models. According to the [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L29), a rerun keeps any role you changed.

**The command**:

```text
/pstack:setup-pstack
```

**What it does, step by step** ([SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/setup-pstack/SKILL.md#L10-L78)):

1. **Detects the models you can choose from.**
2. **Asks you for a reasoning budget.** The budget sets how hard a model thinks, also called effort. A higher level is more thorough but uses more tokens.
3. **Shows which model each role gets**, and asks whether to accept them all or change a few roles.
4. **Checks** that every model you chose is in the detected list. If one isn't, it stops and asks again.
5. **Writes the settings file.**
6. **Asks whether to generate verification skills for your project.** One lets the AI drive your app the way a user does and check the result itself (`/create-verification-skill`); the other is a formal verification skill (`/create-formal-verification-skill`), which proves a key property of your code holds in every case in scope, not only the cases tests reach. Each offer comes up once, you can say no, and it is skipped if the project already has that kind of skill.

There are four budgets:

| Budget | Reasoning effort |
| --- | --- |
| unlimited | Each model at its highest, up to `max` |
| large (default) | `xhigh` |
| medium | `high` |
| small | `medium` |

**What you get**: a global model settings file. Cursor writes `~/.cursor/rules/pstack-models.mdc`; Claude Code writes `~/.claude/rules/pstack-models.md`. Both live in your home folder. "Global" means it applies to every project on your computer, not just the current one. According to the [Claude Code notes](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L37), Claude Code loads the file automatically at the start of every new session.

**Next**: open a new chat. According to the [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L43), the model settings only apply to new sessions.

> **Pick only models your account can actually use.** According to the [Claude Code notes](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md#L44), in Claude Code the "detected models" are the model names the subagent tool accepts. That doesn't mean your account or plan can use every one of them. If you're not sure, set a role to `inherit-parent` or `auto`, and it uses the main chat's model (see the [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L31)).
{: .prompt-tip }

## When You're Unsure: Ask /poteto-help

[`/poteto-help`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md) is pstack's help desk.

**When to use it**: you don't know which skill to use or what to do first, or you want to know how to spend fewer tokens.

**The command**: ask in plain words.

```text
/pstack:poteto-help I just installed pstack. What should I do first?
```

```text
/pstack:poteto-help I want the AI to review my changes before I merge. Which skill should I use?
```

```text
/pstack:poteto-help pstack uses a lot of tokens. How can I use fewer?
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L9-L34)):

- It answers your question, gives you a prompt you can send as is, and links the file the answer came from.
- For a "how do I" question, it does **not** start the work itself. It lets you decide whether to send the prompt, because a real run spends tokens.
- If it can't tell what you need, it first asks one multiple-choice question: get set up, start a task, pick a skill, fix a run that went wrong, or make pstack your own.
- If you haven't run `/setup-pstack` and that changes the answer, it asks whether you want to set it up now.

A message that asks for work, such as "use pstack to fix this bug", isn't a help question. It switches to `/poteto-mode` and starts the work.

## Every Task: Start With /poteto-mode

[`/poteto-mode`](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md) is pstack's front door. Say clearly what you want, and it picks a playbook, follows its steps, and calls other skills when a step needs them.

### How to Write the Task

According to [guide chapter 2](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L40-L59), a good task description has at most five parts, and one sentence each is enough:

- **The goal**: what's broken, or what you want. In other words, the symptom.
- **What counts as done**: something that can pass or fail. "Make it better" and "work on it for an hour" don't count.
- **The proof you want to see**: for example, real command output or a before-and-after number.
- **What you already know**: an error message, steps to reproduce, a related link. These save it a search.
- **Real constraints**: for example, "reproduce first", "don't change any code yet", "zero behavior change", or "let me review before you proceed".

Leave two things out: **how to do it** (give it room to find a better way) and **your guess at the cause** (a stated guess narrows its search). Also don't list which skills to use in your prompt. The playbook already orders them, and a hand-written order tends to drop or reorder steps ([guide chapter 2](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L135)).

### Three Examples to Adapt

**Investigate a problem** (read, don't change):

```text
/pstack:poteto-mode After a user logs out, their shopping cart is still there. Find out where that data is kept. Don't change any code yet. Done means: explain where the data is stored and when it should be cleared, with the locations of the related files.
```

**Fix a bug**:

```text
/pstack:poteto-mode The CSV export drops the last row. It started after yesterday's release. Reproduce first, then fix. Done means: exporting the existing test data gives the same row count as the database. Show me the row counts before and after the fix.
```

**Add a feature**:

```text
/pstack:poteto-mode Add a --json flag to this command. The existing text output must not change at all. Verify both outputs.
```

According to [guide chapter 2](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L103), the phrase "don't change any code yet" pins a task to the Investigation playbook.

### What It Does

![Your task states the goal and done check; /poteto-mode matches a playbook and copies its steps into a todo list, marking skips](poteto-mode-routing.en.png){: width="800" height="450" }
_/poteto-mode first identifies the task type, then follows that playbook's steps._

1. **It identifies the task type and picks a playbook.** The [playbook list](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L121-L149) covers Investigation, Bug fix, Perf issue, Feature, Refactoring, Prototype, writing a skill, and more. Large or cross-cutting work, or work you'll step away from and check later, goes to the `figure-it-out` skill, which designs its own process.
2. **It copies the playbook's steps verbatim into a todo list**, ahead of any other todos.
3. **Steps it decides not to do don't disappear.** They stay on the list marked `skip: <reason>`, so you can see what it chose not to do.
4. **It works through the steps**, and calls any other skill a step needs on its own.
5. **It verifies and reports.** The "Opening a PR" playbook runs at the end of every other playbook. A PR (pull request) is a request for others to review and merge your changes.

### What You Get

- A todo list you can see, including skipped steps and their reasons.
- A final reply: what it did, the tradeoffs, and the decisions left to you. According to the [SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md#L110-L115), the reply is short but keeps every section the playbook asks for, and it includes the PR link if it opened one.

### Next Steps

- **Keep going**: once the chat holds the task, a short line is enough, such as "do it", "continue", or "keep going until done" ([guide chapter 2](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L77-L93)).
- **Change the subject**: to switch tasks in the same chat, start with "new task" so it picks a fresh playbook instead of treating the new problem as the next step of the last one ([guide chapter 2](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md#L95-L103)).

```text
/pstack:poteto-mode new task. figure out why the cache entry survives logout. don't change any code yet.
```

- **Call it again for each new task**: in Cursor, you can pick `/poteto-mode` from the `/` menu with Option+Enter (Mac) or Alt+Enter (Windows) to make it a Custom Mode, a mode that stays on for the whole chat. According to the [`poteto-help` notes](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-help/SKILL.md#L54-L58), Cursor's docs list Custom Modes only in the Agents Window and the CLI (a program you run with typed commands in a terminal). Everywhere else, Claude Code included, start each new task with `/pstack:poteto-mode`.

## Should You Install cursor-team-kit Too?

The [README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md#L255-L263) says three things `/poteto-mode` uses aren't in pstack but in another plugin, `cursor-team-kit`: `/deslop`, which cleans up code, and `control-cli` and `control-ui`, which drive a CLI and a browser UI. The README's advice is to install `cursor-team-kit` alongside pstack for the full set. [Guide chapter 5](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/05-build-and-clean.md#L59) adds that the steps before opening a PR run `/deslop`. If you don't have it, ask for the same cleanup in plain words, such as removing narrating comments, defensive code with no reason behind it, and changes unrelated to the task.

## When to Use Which

| Situation | What to use |
| --- | --- |
| You just installed pstack | `/pstack:setup-pstack`, once |
| You switched accounts or plans, or want other models | `/pstack:setup-pstack` again |
| You don't know which skill to use or what to do first | `/pstack:poteto-help` |
| Any task that needs rigor: investigating, fixing a bug, adding a feature | `/pstack:poteto-mode`, with the goal and done check |
| Changing the subject in the same chat | `/pstack:poteto-mode new task. …` |
| A small, obvious edit | No pstack; just tell the AI |

## A Full Example (Fictional)

The scenario below is made up to show the flow. It is not a record of a real run.

Say you've just joined a web app project and want to use pstack on a user report: "The link in the password reset email says it has expired as soon as I click it."

**1. Install and check the version.** Install pstack as in Step 1, then run `claude plugin list` and confirm the version is what you expect.

**2. Pick models.** Run `/pstack:setup-pstack`, choose the `large` budget, and keep only models your account can use. When it offers a verification skill and the project doesn't have one yet, you can say yes. When it's done, open a new chat.

**3. Ask first if you're unsure.** If you're not sure whether this is an investigation or a bug fix, ask:

```text
/pstack:poteto-help A user says the password reset link expires as soon as they click it. How should I start?
```

It replies with a suggested prompt. Read it, adjust it, and then send it.

**4. Hand it to /poteto-mode.**

```text
/pstack:poteto-mode User report: the link in the password reset email shows "expired" as soon as it's opened. Reproduce first, then fix. Done means: a newly sent link resets the password while it's still valid, and only shows "expired" after it expires. Show me the repro before and after the fix.
```

This description gives the symptom, the done check, and the proof you want. It doesn't include your guess at the cause or a list of skills. The todo list should then show the Bug fix playbook's steps; if any step is skipped, it will carry `skip:` and a reason, which is worth a look.

**5. Keep going, or switch.** When it stops to ask you something, answer and then say "continue". If you then want to add a "resend email" button, start with `new task` and describe the new feature and its done check.

## Things to Keep in Mind

- **Small edits don't need pstack.** The [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L52) is clear on this: for a small, obvious edit, just ask.
- **pstack uses extra tokens.** It sends out subagents and review panels, and that's the price of the rigor. The [setup guide](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md#L45-L52) lists ways to spend fewer: rerun `/setup-pstack` with a smaller budget or cheaper models, set a role to `auto` or `inherit-parent` so it uses the main chat's model, shorten a review panel's model list (each entry runs one more subagent), and save `/poteto-mode` for work that needs rigor.
- **The model settings are global.** A change affects every project on this computer.
- **Check what changed before you update.** Claude Code leaves auto-update off for third-party marketplaces, which gives you the chance to look first.
- **Don't order skills in your prompt.** Let the playbook do it.

If you'd like to see another skill set built around "set up first, then let a help desk suggest the next step," read [Part 1 of the mattpocock/skills series](/posts/mattpocock-skills-setup-routing-guide/) and the [series guide](/posts/mattpocock-skills-series-guide/).

## Conclusion

You don't need to learn every skill before using pstack. Install it once from the official source, check the version with `claude plugin list`, and look at what changed before you update. Pick models once with `/setup-pstack`, and only pick ones your account can use. Then start every new task with `/poteto-mode` (`/pstack:poteto-mode` in Claude Code), state the goal and what counts as done, and let it pick the playbook. When you're unsure, ask `/poteto-help`. The next part covers how to use pstack to understand the code, then design, before you change it.

## Further Reading

- [pstack README](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/README.md): installing, and the parts not shipped in pstack.
- [Setup guide: Set up pstack](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/01-setup.md): budgets, roles, and ways to spend fewer tokens.
- [Guide chapter 2: Route work through /poteto-mode](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/guide/02-poteto-mode.md): how to write a task, with more examples.
- [Claude Code notes](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/docs/harness/claude-code.md): the differences between Cursor and Claude Code.
- [`poteto-mode` SKILL.md](https://github.com/cursor/plugins/blob/88d47514b82e7c44f00f2b2a72ff6dd12158038c/pstack/skills/poteto-mode/SKILL.md): the full playbook list and how it matches tasks.
- [Claude Code: Install and manage plugins](https://code.claude.com/docs/en/plugins/install): adding, versioning, updating, and removing marketplaces.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): what to check before installing a plugin.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): descriptions, testing, and upkeep from a skill author's side.
