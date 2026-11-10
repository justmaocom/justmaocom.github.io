---
title: "How to Write AGENTS.md: Give Coding Agents Your Project Rules"
description: "How to write AGENTS.md, how Codex and Claude Code each load it, and how to share one file between both tools."
date: 2026-11-10 18:00:00 +0800
categories: [AI, Software Development]
tags: [coding-agent, codex, claude-code, workflow, documentation]
media_subpath: /assets/img/posts/agents-md-project-rules-for-coding-agents/
image:
  path: cover.webp
  alt: "Write project rules once in AGENTS.md, then see how Codex and Claude Code each load that file."
---

When I have both Codex and Claude Code open on the same project, what I worry about most is writing the rules twice and letting one copy drift. A coding agent (an AI assistant that can read files, edit them, and run commands) needs those project notes to know how to run tests, which files to leave alone, and what to do before it submits a change.

AGENTS.md is a README for those assistants. You write it in Markdown, a plain-text format for headings and lists, and there are no required fields. The format is stewarded by the [Agentic AI Foundation](https://agents.md/) under the Linux Foundation.

This post covers how to write the file, and what the official docs for [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [Claude Code](https://code.claude.com/docs/en/memory#agents-md) say each tool will actually read. I will not claim that every tool behaves the same way, and I will not list products I have not checked.

If you want a skill pack to help generate project rules, see [mattpocock/skills, Part 1: Get Started Without Memorizing 25 Skills](/en/posts/mattpocock-skills-setup-routing-guide/). That post is about that skill workflow. This one is about the file format itself, and how these two tools load it.

> **Version note:** This post follows the [Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md), the [Claude Code memory and CLAUDE.md docs](https://code.claude.com/docs/en/memory) (including the [AGENTS.md section](https://code.claude.com/docs/en/memory#agents-md)), and the [AGENTS.md site](https://agents.md/), all read on 2026-11-10 (Taipei time). That day, the latest Codex CLI on npm was 0.167.0, and Claude Code was 2.1.322. Later versions or docs may change how files are loaded.
{: .prompt-info }

## When You Should Write an AGENTS.md

These are good reasons to put the rules in AGENTS.md:

- You have already had to repeat the same reminder to the assistant.
- It keeps running the wrong test command, for example `npm test` when the project uses `pnpm test`.
- A new teammate, or anyone who opens this repo (code repository) next, also needs to know it.

The repository root is the top-level folder of the project, usually the root of the Git repository. Your current working directory is the folder you were in when you started the tool, and it may not be the root.

Two kinds of content do not belong here. Long workflows that apply only to one small area are a better fit as a short file in that subdirectory, or as a skill that loads when it is needed. Rules that must always happen are the other case. The [Claude Code docs](https://code.claude.com/docs/en/memory) are explicit: these files are context (text added to the conversation for the model to read), not enforced configuration. To block an action at a fixed point, use a hook; see [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/en/posts/claude-code-hooks-automate-checks/).

**When to use it:** the rule will be repeated, and later people on the project should see it too.

**What you get:** one committed file that both tools can aim at.

**Next step:** decide on a few concrete, checkable sentences, then put them at the repository root.

## What to Put in the File

Write instructions that are specific enough to check. The official contrast is clear: "Use 2-space indentation" works better than "format code nicely," and "Run `npm test` before opening a pull request" is clearer than "remember to test."

At a minimum, cover:

- Install and test commands
- Code style
- What to do before opening a pull request (PR), a request to merge a branch into the main line
- Cautions, such as security notes and files to leave alone

Keep it short. Claude Code suggests [staying under 200 lines per file](https://code.claude.com/docs/en/memory#write-effective-instructions); longer files use more context and are followed less consistently. Codex concatenates the files it finds and [stops at 32 KiB by default](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (`project_doc_max_bytes`); anything past that limit is not read. Put the important lines first.

Here is a root-level template you can copy, a little over twenty lines. Change the commands and paths to match your project:

```markdown
# AGENTS.md

## Project overview

This is a Node.js web service. Use pnpm to manage packages. The Node version is in `.nvmrc`.

## Install and test

- Install dependencies: `pnpm install`
- Run the full test suite: `pnpm test`
- Run a single file: `pnpm test -- path/to/file.test.ts`
- Before opening a PR, run `pnpm lint` and `pnpm test`

## Code style

- Use 2-space indentation, not tabs
- Add TypeScript types to public functions, and do not use `any`

## Cautions

- Do not edit `.env`, `.env.*`, or any file that holds secrets
- Do not write real API keys or passwords into the source

## Before you open a PR

- Use one sentence in the title to say what changed
- In the description, say how to run the tests and which ones you ran
```

If you use Codex code review on GitHub, you can add a `## Code Review Rules` section to the AGENTS.md closest to the code those rules govern. That is what the [Codex docs say for GitHub review](https://learn.chatgpt.com/docs/agent-configuration/agents-md#add-code-review-rules). It applies to that feature, and it is not a general rule for how both tools load instruction files.

## Where to Put It: How Codex Reads the Files

The [Codex guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) says Codex reads AGENTS.md before it does any work, and that it builds the instruction chain once per start. After you edit a file, restart Codex so the new text is picked up.

Personal, global guidance lives in `~/.codex/AGENTS.md` (or in `CODEX_HOME`, if you set that). If the same directory also has `AGENTS.override.md`, Codex reads that file instead of `AGENTS.md`. An override is a temporary stand-in for the usual rules. When you are done, delete it; do not leave an empty file behind. The official wording is that you remove the override to restore the original file.

For a project, Codex starts at the project root (typically the Git root) and walks down to your current working directory. In each directory it looks for `AGENTS.override.md`, then `AGENTS.md`, then any fallback names you configured, and it takes at most one file per directory. It concatenates those files from the root down. Files closer to your current directory appear later, so the more specific rules effectively override the broader ones above.

![From the project root down, each folder's rules stack in order, with the closest folder's rules last](folder-layers.webp){: w="1280" h="720" }
_A concept illustration, not the real UI. Codex walks from the project root down and concatenates each layer it finds, with the folder closest to your current directory last._

Discovery stops at the current directory: files deeper than that are not loaded at start. To use a subdirectory's rules, start Codex from that directory, or pass `codex --cd subdirectory`. If Codex cannot find a project root, it only checks the current directory.

When one directory has both an override and a regular file, Codex still takes only one, and the override wins:

![When one folder has two rules files, Codex picks only one, and the override wins](override-pick.webp){: w="1280" h="720" }
_A concept illustration, not the real UI. If a directory has both AGENTS.override.md and AGENTS.md, Codex takes only one file, and it looks at the override first._

If the repository already uses another filename, such as `TEAM_GUIDE.md`, add it to `project_doc_fallback_filenames` in `~/.codex/config.toml`. You can raise the combined size cap with `project_doc_max_bytes`; the default is 32 KiB. See the [Codex config sample](https://learn.chatgpt.com/docs/config-file/config-sample.md) for the fields.

**When to use it:** you want Codex to start a project with the right test commands and cautions already in place.

**Next step:** add an AGENTS.md at the root first. If one subproject needs different rules, add a file in that directory and start Codex there.

## How Claude Code Reads the Files

Claude Code can also read a repository's AGENTS.md as project instructions, so you do not have to add a CLAUDE.md just to get started. The [default conditions](https://code.claude.com/docs/en/memory#agents-md) are stricter, though.

By default, Claude reads AGENTS.md (including `.claude/AGENTS.md`) only when there is no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` in your current working directory or above it. If any of those files exists, Claude reads the CLAUDE.md files only. Your personal `~/.claude/CLAUDE.md`, your organization's managed CLAUDE.md, and files under `.claude/rules/` do not count in that check, so they do not stop AGENTS.md from loading.

There is a common trap: you add `CLAUDE.local.md` for private notes you will not commit, and Claude stops reading AGENTS.md. To keep both, type `/config` in the session and set Project instructions to `claude-md-and-agents-md`.

Claude Code also does not read `AGENTS.override.md`, `AGENTS.local.md`, or anything under a `.agents/` directory. An override you added for Codex has no effect on Claude.

A subdirectory AGENTS.md is not loaded at launch for every folder. The [official docs](https://code.claude.com/docs/en/memory#when-claude-code-reads-agents-md) place this behavior under the case where no counting CLAUDE.md files exist in the working directory or above: Claude then reads a subdirectory's AGENTS.md when it opens a file there with the Read tool, and that subdirectory has none of the three CLAUDE.md files of its own. If the repository root already has a CLAUDE.md, this default path does not apply. See the next section for what to do when you still need those subdirectory rules.

Direct AGENTS.md support requires Claude Code v2.1.277 or later. Older versions, sessions where the built-in plugin that reads AGENTS.md is disabled, or the first session after you upgrade from an older version, may not load it. In those cases, use the import in the next section. In an interactive session that does load it, you will often see a line such as `no CLAUDE.md found; AGENTS.md loaded: …`.

To change the default, set Project instructions in `/config`, or write the value in a user-level settings file. The four values mean:

| Value | What Claude reads |
| --- | --- |
| `claude-md-or-agents-md` | The default. It reads your CLAUDE.md files, or AGENTS.md when no CLAUDE.md files are present |
| `claude-md-and-agents-md` | Both. In each directory, CLAUDE.md files come first, then AGENTS.md |
| `claude-md` | CLAUDE.md files only |
| `managed-only` | At launch, only the organization's managed instructions and auto memory; project CLAUDE.md and AGENTS.md files are not loaded then |

**When to use it:** the repo already has an AGENTS.md, and you work mainly in Claude Code.

**Next step:** check whether a CLAUDE.md file already exists at or above the root, then decide whether to load AGENTS.md directly or import it.

## Share One File With Both Tools

If you use both tools, the aim is to maintain one shared set of rules.

**Step 1:** Put the team-wide rules in `AGENTS.md` at the repository root. Codex reads that file directly.

**Step 2:** If the project also needs Claude-specific notes, create a `CLAUDE.md` next to it. Put `@AGENTS.md` on the first line, then add the Claude-only content below. That is the [official example](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools). An import (the `@` syntax that expands another file and loads it too) uses a path relative to the CLAUDE.md that contains it, not to your current working directory. If you wrap the path in backticks, such as `` `@AGENTS.md` ``, it is only a mention, and the file is not expanded.

```markdown
@AGENTS.md

## Claude Code

Use plan mode for changes under `src/billing/`.
```

![A one-line import in CLAUDE.md pulls in the shared AGENTS.md](import-bridge.webp){: w="1280" h="720" }
_A concept illustration, not the real UI. A first line of `@AGENTS.md` in CLAUDE.md brings in the shared rules, so you do not have to copy them._

If you do not need any Claude-specific content, a symlink (a filename that points at another file) also works:

```bash
ln -s AGENTS.md CLAUDE.md
```

The command prints no output on success. If anyone on the team works on Windows, use the import instead. Officially, creating a symlink there needs Administrator privileges or Developer Mode, and if Git does not have `core.symlinks` enabled, a checkout can turn the link into a one-line plain-text file, which leaves the clone without your instructions.

Do not replace the import with a sentence such as "please read AGENTS.md." The docs say Claude then sees that file only if it decides to open it.

`/import` is also a poor long-term substitute. The official wording is that it appends a one-time copy of instruction files such as AGENTS.md to the matching CLAUDE.md. Later edits to AGENTS.md are not copied over automatically.

**What you get:** one file to maintain for shared rules, with Claude-only sentences kept in the lower half of CLAUDE.md.

**Next step:** confirm that both tools loaded the files, as in the next section.

## How to Confirm the File Was Loaded

After you edit the files, do not assume the tool has already seen the new text.

Restart Codex, then run the [official checks](https://learn.chatgpt.com/docs/agent-configuration/agents-md#verify-your-setup):

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

To confirm a subdirectory's rules, change the path to yours:

```bash
codex --cd services/payments --ask-for-approval never "Show which instruction files are active."
```

You should see the active instruction sources listed in order, such as the global file, the root AGENTS.md, and (when you start in a subdirectory) the closer file. That is the check described in the official docs, not a captured run from a particular session.

In Claude Code, run `/memory` and look for your file in the list, or run `/context all` and check under Memory files. In an interactive session that loaded AGENTS.md directly, you should also see the `AGENTS.md loaded` line mentioned earlier.

## A Worked Example: A Frontend Plus a Payments Service

Suppose the repo has a frontend in `web/` and a payments service in `services/payments/`. That layout is a monorepo: one repository that holds more than one project. I would place the files like this:

- Root `AGENTS.md`: shared install commands, code style, and PR rules
- `services/payments/AGENTS.md`: only the payments service's own test command, for example `make test-payments`
- Root `CLAUDE.md`: `@AGENTS.md` on the first line, then one Claude-specific rule, such as using plan mode before changing payment code

When you start Codex from the repository root, it loads the global file (if you have one) and the root AGENTS.md. It does not load `services/payments/AGENTS.md` at start, because discovery stops at the current directory. After `codex --cd services/payments`, the payments file is appended, and its more specific test command effectively overrides the broader one at the root.

When you start Claude Code from the root, a CLAUDE.md is already present, so [by default it reads the CLAUDE.md files only](https://code.claude.com/docs/en/memory#agents-md). The root AGENTS.md comes in through the `@AGENTS.md` import. If Claude then uses Read to open a file under `services/payments/`, the docs describe loading a subdirectory AGENTS.md only when no counting CLAUDE.md files exist in the working directory or above, and the subdirectory itself has none of those three files. The root already has a CLAUDE.md, so by default `services/payments/AGENTS.md` is not read directly.

If Claude should also see the payments rules, add a `CLAUDE.md` in `services/payments/` that starts with `@AGENTS.md`. A [subdirectory CLAUDE.md](https://code.claude.com/docs/en/memory#how-claude-md-files-load) loads when Claude reads, writes, or edits a file in that directory. The other option is to set Project instructions to `claude-md-and-agents-md`, so both kinds of files are read.

## Which File to Use in Each Situation

| Situation | Which file to use |
| --- | --- |
| Rules the whole team shares | `AGENTS.md` at the repository root |
| Rules that apply to only one subproject | `AGENTS.md` in that subdirectory (start Codex from there; if the root already has a CLAUDE.md, Claude needs an import or a settings change) |
| Your personal preferences across all projects | `~/.codex/AGENTS.md`, or `~/.claude/CLAUDE.md` |
| A temporary change to Codex rules | `AGENTS.override.md` in the same directory (delete it when you are done; Claude does not read it) |
| Extra rules for Claude only | `CLAUDE.md` with `@AGENTS.md` on the first line, then the extra notes |
| Private Claude notes you will not commit | `CLAUDE.local.md` (by default this stops Claude from reading AGENTS.md; change the setting if you still need both) |
| Something that must always happen | A hook or a permission setting, not an instruction file |

## Common Mistakes

- Writing slogans such as "keep the code clean," which give the assistant nothing it can check.
- Letting the file grow until the important lines are buried, or until they sit past the length the tool will read.
- Leaving two files that contradict each other. The [Claude docs](https://code.claude.com/docs/en/memory#write-effective-instructions) say that when instructions conflict, Claude may pick one arbitrarily.
- Editing AGENTS.md and forgetting to restart Codex, which still uses the chain built at start.
- Adding `CLAUDE.local.md` to a Claude project that relies on AGENTS.md, after which AGENTS.md is no longer read.
- Treating AGENTS.md as a security control. It is guidance, and it cannot block an action that must be forbidden.

## What to Do Next

You can add an AGENTS.md of 30 lines or fewer at the repository root today, with the install, test, and caution lines you actually use. If you also need Claude-specific notes, add a CLAUDE.md that starts with `@AGENTS.md`. Then use the commands above, or `/memory`, to confirm the files were loaded.

For more on why every line written for an assistant has a cost, see [mattpocock/skills, Part 6: Skills for Research, Handoffs, and Learning](/en/posts/mattpocock-skills-research-handoff/). The official references are the [Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md), the [Claude Code memory docs](https://code.claude.com/docs/en/memory#agents-md), and the [AGENTS.md site](https://agents.md/). To turn a rule into a check that runs at a fixed point, see the [hooks post](/en/posts/claude-code-hooks-automate-checks/).
