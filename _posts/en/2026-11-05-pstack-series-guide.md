---
title: "pstack Series Guide: What It Is and How to Read the Four Parts"
description: "Still deciding on pstack, or only need one piece? This guide covers what it is, how the four parts connect, and which to read first."
date: 2026-11-05 18:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-series-guide/
image:
  path: cover.en.png
  alt: "Four parts: install, understand, prove it works, then steer and run alone; start where you're stuck."
---

You may have heard of pstack, opened the repo, and faced a long list of skill names. Or you may have landed on one post from search and wondered what comes before and after. This series has four parts, each covering one stretch of writing software with an AI. This guide doesn't retell the details. It answers three questions: what pstack is, how the four parts connect, and which one you should start with.

> pstack series | Guide
>
> - Start from the beginning (Part 1): [Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/)
>
> Parts 3 and 4 and this guide are pinned to pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json) (commit `c742dd6`); Part 1 uses `0.15.29` and Part 2 uses `0.15.30`. See the version notes below.
{: .prompt-info }

## What pstack Is

[pstack](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack) is a set of skills maintained by [Lauren Tan](https://x.com/poteto) (online as poteto) in Cursor's official plugin repo [`cursor/plugins`](https://github.com/cursor/plugins), under the MIT license. A skill is a set of instructions that tells an AI coding assistant how to do one kind of work. An AI coding assistant is a tool such as Cursor or Claude Code that can read and write project files and write code for you.

In version `0.15.36`, pstack has **58** skills, **24** principles (each named `principle-*`, a short, specific rule), and **23** playbooks (fixed steps for one kind of task, under `/poteto-mode`). Don't confuse the name with the Unix command `pstack` (which prints a process call stack); here it means this set of AI skills.

Two things help before you read further:

- **You start almost every skill yourself.** All but `/setup-pstack` are set so the AI can't start them on its own.
- **One everyday entry point is enough.** Run `/setup-pstack` once to pick models. For any task that needs a careful process, start with `/poteto-mode`, state the goal and what "done" means, and it picks a playbook. When you're stuck on which skill to use, ask `/poteto-help` first.

Installation, pinning a version, and the `/pstack:` prefix in Claude Code are all in [Part 1](/posts/pstack-install-routing/). This guide doesn't repeat them.

## Who It's For, and Who It Isn't

From what the four published posts already say, this skill set fits situations like these:

- You use Cursor or Claude Code and want the AI to work more methodically, without memorizing dozens of skill names first ([Part 1](/posts/pstack-install-routing/)).
- Before changing unfamiliar code, you want to understand the mechanism and why it looks that way, then compare designs ([Part 2](/posts/pstack-understand-design/)).
- You want "prove it works" as a process: reproduce, clean, check blast radius, drive a verification skill, open a PR, and still press merge yourself ([Part 3](/posts/pstack-build-verify-merge/)).
- You want to steer mid-task with principle names, turn your habits into your own mode, and run unattended under permission and spending limits ([Part 4](/posts/pstack-principles-customization/)).

In other cases you don't need the whole set:

- **Small, obvious changes**: just tell the AI; you don't need pstack (Parts 1 and 2 both say this; Part 2 is blunt that most changes don't need those tools).
- **You don't want to spend extra usage on a careful process**: pstack starts subagents and reviewers, and more reading and writing means more usage (cautions in Parts 1 and 2).
- **Unattended runs with every check turned off**, or `bypassPermissions` outside an isolated environment: Part 4 argues against that. Irreversible actions such as merging, force-pushing, deleting data, and messaging customers still need a human.

## How the Four Parts Connect

The four parts follow one workflow: install the tools, understand before you design, prove it works, then steer with principles and run alone within clear limits.

![Series map: install and playbooks, understand then design, prove then review, principles and run alone](series-map.en.png){: w="800" h="450" }
_The four parts follow the workflow; each post holds its own details._

In outline: install and pick models, then hand each task to `/poteto-mode` (Part 1); before changing code, use tools such as `/how`, `/why`, and `/architect` to understand and compare designs (Part 2); after writing, move through Build, Clean, Verify, and Prepare for Review, with merge still yours to decide (Part 3); day to day, steer with principle names, turn habits into your own mode, and when you need it, write the finish condition and limits so it can run alone, then audit the decision log in the morning (Part 4).

## What Each Part Covers

### Part 1: Install, Pick Models, Start With /poteto-mode

How do you start the first time? This part covers two install paths, how to check and pin a version, picking models with `/setup-pstack`, and how to write a `/poteto-mode` task. After it, you can start without memorizing every skill name; when you're stuck, ask `/poteto-help` first.

→ [Part 1: Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/)

### Part 2: Understand the Code, Then Design, Before You Change It

Facing unfamiliar code, how do you get the AI to understand before it edits? This part covers `/how`, `/why`, `/architect`, `/interrogate`, and `/arena`: when to use each, how to prompt it, what you get, and what to do next. Most small changes don't need them; when you do, understand first, compare designs, then change the code.

→ [Part 2: Understand the Code, Then Design, Before You Change It](/posts/pstack-understand-design/)

### Part 3: After the Code Is Written, Prove It Works Before Merging

The code is written. What counts as proof that it works? This part splits the flow into Build, Clean, Verify, and Prepare for Review, covering playbooks, `/tdd`, verification skills, opening a PR, and babysit. Opening a PR doesn't start babysit on its own; you always decide whether to merge.

→ [Part 3: After the Code Is Written, Prove It Works Before Merging](/posts/pstack-build-verify-merge/)

### Part 4: Steer With Principles, Build Your Own Mode, and Let It Run Unattended

You don't need a long paragraph every time you want to change how the AI works. This part covers steering mid-conversation with principle names; building your own way of working with `/automate-me`, `/reflect`, and `/correct`; the six-part unattended prompt, permissions, and spending caps; and auditing the decision log in the morning with `/show-me-your-work`.

→ [Part 4: Steer With Principles, Build Your Own Mode, and Let It Run Unattended](/posts/pstack-principles-customization/)

## Which Part to Start With

![Reading routes: first time at Part 1, before edits at Part 2, unattended runs at Part 4](reading-routes.en.png){: w="800" h="450" }
_Match the step you're stuck on, then open that part. You don't have to read all four in order before you start._

| Your situation | Start here |
| --- | --- |
| Not installed yet, or unsure how to invoke commands | [Part 1](/posts/pstack-install-routing/) |
| You can use `/poteto-mode`, but edits often go the wrong way | [Part 2](/posts/pstack-understand-design/) |
| The feature is written; you're stuck on proof or opening a PR | [Part 3](/posts/pstack-build-verify-merge/) |
| Everyday use works; you want principles, your own mode, or unattended runs | [Part 4](/posts/pstack-principles-customization/) |
| You only want to know what this set is | Stay on this guide, then jump with the table above |

## Version Notes

Each post pins a different version. Trust the version box at the top of that post:

| Part | pstack | Commit |
| --- | --- | --- |
| Part 1 | `0.15.29` | `88d4751` |
| Part 2 | `0.15.30` | `eb4db2b` |
| Parts 3 and 4, and this guide | `0.15.36` | `c742dd6` |

> **Version**: this guide is based on pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json), which is commit `c742dd6` in `cursor/plugins` (2026-10-28 07:12, Taipei time). I checked on 2026-11-05: the latest `cursor/plugins` main is `bb68f23` (2026-11-04 15:20, Taipei time), with no changes in the pstack folder since `c742dd6`, and the latest Claude Code is 2.1.318. Later versions may change the counts and the behavior.
{: .prompt-info }

To install the same version as this guide, clone the repo, check out `c742dd6`, then add it as a marketplace. Details and the risks of an unpinned install are in [Part 1](/posts/pstack-install-routing/) and [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).

## Conclusion

pstack is a set of skills in Cursor's official plugin repo: in the version this guide pins, there are 58 skills, 24 principles, and 23 playbooks. Day to day, run `/setup-pstack` once, reach for `/poteto-mode` often, and ask `/poteto-help` when you're stuck. The four parts cover install and picking a playbook, understanding before design, proving it works before review, and steering with principles so it can run alone within limits. You don't have to read them in order; match the step you're stuck on and start there.

## Further Reading

- [Official pstack (the commit this guide pins)](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack): the README, the guide, and each skill.
- [Guide directory](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/): from install and overnight runs to principles and making it yours.
- [Part 1](/posts/pstack-install-routing/) · [Part 2](/posts/pstack-understand-design/) · [Part 3](/posts/pstack-build-verify-merge/) · [Part 4](/posts/pstack-principles-customization/)
- [mattpocock/skills Series Guide](/posts/mattpocock-skills-series-guide/) and [Part 1](/posts/mattpocock-skills-setup-routing-guide/): a series about a different set of skills.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): where skills live and how to write `SKILL.md`.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): permissions, sandboxes, and pinning versions.
