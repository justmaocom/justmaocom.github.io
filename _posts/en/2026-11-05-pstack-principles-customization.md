---
title: "pstack, Part 4: Steer With Principles, Build Your Own Mode, and Let It Run Unattended"
description: "Change how the AI works with one principle name, turn your habits into your own mode, and set limits before it runs unattended, using pstack in Claude Code."
date: 2026-11-05 10:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, cursor, claude-code]
media_subpath: /assets/img/posts/pstack-principles-customization/
image:
  path: cover.en.png
  alt: "Steer the AI with principle names, turn your habits into a mode, let it run within clear limits, and audit its decision log."
---

When an AI coding assistant gets something wrong, I used to type a long paragraph explaining what I wanted. pstack offers a shorter way: say the name of a principle, and the AI redoes the work by that rule. This is the last part of the series, and it teaches three things: how to steer the AI mid-conversation with principle names; how to turn your own habits into a mode the AI follows; and, when you want it to work while you sleep, how to write the prompt, how to set permissions and spending limits, and how to check what it did in the morning.

> pstack series | Part 4 (final part)
>
> - Series guide: what this skill set is and how to read the four parts (not yet published)
> - Previous (Part 3): [After the Code Is Written, Prove It Works Before Merging](/posts/pstack-build-verify-merge/)
> - Next: this is the last part of the series
{: .prompt-info }

> **Version**: this post is based on pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json), which is commit `c742dd6` in `cursor/plugins` (2026-10-28 07:12, Taipei time), the same as Part 3, with Claude Code 2.1.318. I checked on 2026-11-05: the latest `cursor/plugins` main is `bb68f23` (2026-11-04 15:20, Taipei time), with no changes in the pstack folder since `c742dd6`, and the latest Claude Code is 2.1.318.
{: .prompt-info }

## Before You Start

pstack is a set of skills in Cursor's official plugin repo. A skill is a set of instructions that tells the AI how to do one kind of work. Installation is covered in [Part 1](/posts/pstack-install-routing/). To install the same version as this post, clone the repo, check out this post's commit, and add the folder as a marketplace (the source catalog Claude Code installs plugins from):

```bash
git clone https://github.com/cursor/plugins.git ~/src/cursor-plugins
git -C ~/src/cursor-plugins checkout c742dd61706fbacc1b95f1a20b7b988cf096ce6c
claude plugin marketplace add ~/src/cursor-plugins
claude plugin install pstack@cursor-plugins
```

If you install with `/plugin marketplace add cursor/plugins` instead, you get whatever is latest at that moment, not a version you have reviewed. For the risks, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).

**Commands need a prefix.** In Claude Code (an AI coding assistant you use in the terminal), plugin commands start with the plugin name, such as `/pstack:correct`. The examples below use the Claude Code form; in Cursor, drop the `pstack:`.

**You start every one of these skills yourself.** Of pstack's 58 skills, all but `/setup-pstack` are set so the AI can't start them on its own (`disable-model-invocation: true`), and that includes the principles. The AI reads a skill's instructions only when you type its command.

**The official guide is written for Cursor.** Some things in it exist only in Cursor, such as `/loop` and `create-skill`. pstack ships [Claude Code adapter notes](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md), which `/poteto-mode` reads first in Claude Code to map Cursor names to their Claude Code equivalents. Where the two differ, I give the Claude Code way below.

## Steer the AI With Principle Names

### What a Principle Is

pstack has 24 principles. Each one is its own skill, named `principle-<name>`, and each is a short, specific rule, such as "remove dead weight before you build on top of it." They come in five groups ([README](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257), [guide chapter 8](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L29-L70)):

| Group | Count | What it decides |
| --- | --- | --- |
| core | 10 | How much to build, and when to rethink the design |
| architecture | 6 | Where state, validation, and compatibility live |
| verification | 5 | What counts as proof |
| delegation | 2 | How to keep parallel work sane |
| meta | 1 | Turning repeated advice into structure |

When you hand multi-step work to `/pstack:poteto-mode`, it reads the principle index at the start, applies the ones the task triggers, and names each applied principle in its reply along with **the decision it changed** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L15)).

The guide puts it this way: you don't invoke principles one by one, you use their names to steer ([guide chapter 8](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L5)). Each name stands for a complete rule, so one phrase redirects the work more precisely than a paragraph of instructions.

### How to Say It in Claude Code

In the same conversation, start your next message with the principle's command, followed by what you want done:

```text
/pstack:principle-<name> <what you want done under this principle>
```

With the command form, Claude Code reads the principle's full instructions, not just a name. Below are the four I use most. For all 24, see [the principles table in the README](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257).

![When to name four principles: a plan too big, done without proof, a symptom fix, repeated failed fixes](principles-steer.en.png){: w="800" h="450" }
_Four common principles, and when to say their names._

### laziness-protocol: When the Plan Is Too Big

**When to use it**: the AI's plan adds several helper functions or wrapper layers, or makes the same decision in several places.

**What to type**:

```text
/pstack:principle-laziness-protocol apply this to your plan, then implement it.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-laziness-protocol/SKILL.md#L9-L10)):

1. **Consolidates decisions.** The same choice isn't made in several places; it goes behind one source of truth, and the rest just use the result.
2. **Minimizes the diff.** It makes the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.

**What you get**: a smaller plan or change, and a reply that says what this principle removed.

**Next step**: confirm that what it removed really isn't needed, then let it continue.

### prove-it-works: Done, but No Proof

**When to use it**: the AI says "done," but all it shows you is "the build passed" or its own summary.

**What to type**:

```text
/pstack:principle-prove-it-works run the real command and show me the output, not the build log.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-prove-it-works/SKILL.md#L9-L22)):

1. **Checks the real thing.** It reads the actual value and runs the actual program, instead of inferring from file times, caches, or a subagent's self-report.
2. **Suspects the check first when a check fails.** It makes sure it looked in the right place before it blames the code.
3. **Scripts the check when it can.** The strongest proof is a script that can be rerun, not a one-time look.

**What you get**: the commands it actually ran, with their output. While verifying, it often finds a new problem and reports it in the reply.

**Next step**: read the output yourself and confirm it checked the thing you care about.

### fix-root-causes: The Symptom Got Fixed, Not the Cause

**When to use it**: there's a bug, and the AI's fix is a guard on the line where the error showed up.

**What to type**:

```text
/pstack:principle-fix-root-causes <the symptom>. find the first place it went wrong and fix it there.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-fix-root-causes/SKILL.md#L9-L21)):

1. **Reproduces first.**
2. **Keeps asking "why"** until the answer is a wrong decision in the code, not the consequence of an earlier one.
3. **Instruments when stuck**, reading the actual error and the actual state instead of guessing.
4. **Asks whether the triggering state is legitimate.** If it is, the code that broke on it is the cause; if it should never exist, it looks for what produced it.
5. **Looks for the same fault elsewhere**, and fixes every instance.

**What you get**: the root cause, the fix, and whether the same problem exists anywhere else.

**Next step**: check that the cause it names really is the first place things went wrong.

### attack-the-premise: When Fixes Keep Failing

**When to use it**: two or more fixes have already failed the same check.

**What to type**:

```text
/pstack:principle-attack-the-premise the last two fixes failed. write down the premise they share, test it, then decide what to do next.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-attack-the-premise/SKILL.md#L9-L19)):

1. **Writes the premise down**: the one sentence every failed fix assumed.
2. **Tests the premise first**: it finds an observation that would come out differently if the premise were false, and makes it.
3. **Follows the evidence**: if the evidence contradicts the premise, it looks for the cause elsewhere; if it confirms it, it asks the next "why," as in fix-root-causes.
4. **Starts no new fix until the premise is written down and tested.**

**What you get**: the written premise, how it was tested and what came out, and the direction chosen from that.

**Next step**: if the premise fell, let it re-plan from the new direction.

### How to Tell It Really Applied the Rule

Naming a principle isn't the same as following it. The guide says the reply has to state **which decision the rule changed**; a citation with no decision behind it means the agent named the rule without applying it ([guide chapter 8](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L27)). The guide also says not to memorize the list: skim it once, and come back when you catch the agent doing something a name would have prevented ([guide chapter 8](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md#L70)).

## Make It Work Your Way

`/poteto-mode` is the pstack author's personal style. Chapter 9 of the guide shows how to swap in your own: `/automate-me` generates your mode, `/reflect` captures what one conversation taught you, and `/correct` changes the repo so the same mistake can't happen again ([guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L1-L5)).

### /automate-me: Turn Your Habits Into a Mode

**When to use it**: you keep making the same corrections, such as "shorter answers" or "run the tests before you say it's done," and you want the AI to work your way from the start. A mode is a skill that describes your working habits, named like `<your-name>-mode`.

**What to type**: the guide's version is just `/automate-me`, because in Cursor it knows where the transcripts (full records of your AI conversations) are. Claude Code keeps them in `~/.claude/projects/<project path>/`, where the folder name is the project path with each `/` and `.` changed to `-` ([Claude Code adapter notes](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L56)). I recommend saying in the prompt that it may read only this project's transcripts:

```text
/pstack:automate-me read only this project's transcripts (~/.claude/projects/<folder name made from the project path>/), no other projects. write the draft to .claude/skills/<my-name>-mode/SKILL.md, show it to me, and don't commit.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L13-L83)):

1. **Looks for an existing mode.** If you already have one, it asks whether to update it or start fresh; updating is the default.
2. **Mines your transcripts.** It reads only this project's history, splits the last few weeks into three slices, and sends subagents (extra AI helpers a skill starts to work in parallel) to read them for repeated preferences in replies, delegation, verification, code and prose, and process. Only patterns seen in at least two slices count.
3. **Asks you directly.** One or two multiple-choice questions confirm which patterns are really you, and one open question catches the rest. In `claude -p` (a mode that runs once to completion without the chat window) there's no question tool, so it asks in plain text instead ([Claude Code adapter notes](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md#L10)).
4. **Groups and drafts.** It organizes the results into sections, such as reply style, autonomy, verification, and process, and writes only the parts where you have a specific rule. It adds `disable-model-invocation: true` by default, so the mode loads only when you type its command.
5. **Edits the prose.** It runs `/unslop` so every line is direct and clear.
6. **Sends it for review.** The guide's way is to commit in a worktree (a separate working folder for the same repo) and open a PR, never pushing to main directly.

**What you get**: a draft `<your-name>-mode/SKILL.md`. Claude Code protects the project's `.claude/` folder, so a write there either asks you first or is refused ([permission modes](https://code.claude.com/docs/en/permission-modes#protected-paths)). If it's refused, have it write somewhere else first, then move the file in yourself after you read it.

**Next step**: read it and ask, "Does this read like me? What did it miss?" ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md#L94-L96)). Keep in mind that it mines **your conversations in this project**; if most of them were for something unusual, such as one-off tests, the result won't look like your everyday self. When your habits change, run an update:

```text
/pstack:automate-me update my mode skill with everything since its last edit
```

### /reflect: Write What One Conversation Taught You Back Into a Skill

**When to use it**: a task just finished after a long detour, and you don't want to repeat it.

**What to type** (from [guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L23-L31)):

```text
/pstack:reflect that took way too long. capture what we learned so the next run doesn't repeat it.
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md#L13-L60)):

1. **Finds this conversation's transcript.** It reads only this project's transcripts.
2. **Sends three reviewers in parallel.** They look for lessons from three angles: judgment, tooling, and a divergent view.
3. **Synthesizes.** One more agent sorts the proposals into Accepted, Rejected, and Backlog.
4. **Moves what structure can enforce to Backlog.** Anything a lint rule, script, or runtime check would enforce more reliably than a skill edit goes to Backlog.
5. **Waits for your approval.** It shows everything and **changes no skill until you explicitly approve**. It never edits a skill inside the plugin cache; it copies the skill to your project or personal skill folder first and edits the copy. It never opens a PR or pushes.

**What you get**: the Accepted, Rejected, and Backlog lists, with the skill each item would change.

**Next step**: approve only items that would change a future decision. The guide is blunt: one weird session is an anecdote, not a rule ([guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L31)).

### /correct: Make the Same Mistake Impossible

**When to use it**: you keep correcting the AI for the same kind of mistake. The fix belongs in the repo, not in your next prompt.

**What to type**: when you know the mistake, name it (from [guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L45)):

```text
/pstack:correct agents keep calling the database client directly instead of going through the repository layer
```

When you don't, leave it off and it finds the classes from history on its own:

```text
/pstack:correct
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md#L13-L32)):

1. **Finds the mistake classes.** It reads recent commits, reverts, review comments, the AI's instruction files, and comments that explain workarounds. A class counts once it has happened twice.
2. **Fixes each class at the highest level that works**, in this order:
   1. Architecture that makes the mistake impossible, such as one owner per piece of state and one supported way per task;
   2. Types, or a lint rule (an automatic check on how code is written) or CI (the checks that run automatically on every push), with an error that names what to use instead;
   3. A test;
   4. Docs or AI rules last, because nothing fails when the AI skips a rule.
3. **One commit per class, with proof the check works.** Each new check has to fail on a real past mistake. The same command runs locally and in CI.
4. **Keeps a rule table.** It keeps a table in the AI's instruction file (`CLAUDE.md` in Claude Code) pairing each rule with what enforces it. A rule nothing enforces is where the next repeat will happen.

**What you get**: each class with its evidence, the level chosen, and why a higher level didn't work, plus one commit per class.

**Next step**: review each commit. It may change your CI config or existing tests, and you should see those changes before anything is pushed.

The split between them: `/reflect` improves skills from one conversation, and `/correct` changes the repo so a mistake class can't come back ([guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L50)). One more thing: **don't edit a skill in the middle of a task**. Fix it in its own PR and keep the task moving ([guide chapter 9](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md#L98)).

## Let It Run: Writing an Unattended Prompt

### First, Check That It Has Earned Your Trust

Chapter 7 of the guide lists four conditions. Let it run alone only when all four hold; until then, run it while you watch ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L7-L16)):

- You've done the task once yourself, or watched the AI do it, so you know what good looks like.
- The AI has the tools and signals you would use, such as a verification skill, a profiler, and logs.
- Every stage proves its work and can stop the line when it misses the bar.
- You've read a few transcripts and turned the repeated failures into tools, skills, or checks.

### The Six Parts of the Prompt

The guide's handoff template has four elements: the goal, the finish condition, permissions, and an escape hatch ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L18-L36)). I split out "decision log" and "what it must not do," which makes six parts:

![Six parts of an unattended prompt: goal, done means, decision log, don't ask, never, and if stuck](overnight-prompt.en.png){: w="800" h="450" }
_The six parts of an unattended prompt. A duration is not a finish condition._

**When to use it**: the task meets the four conditions above, and you won't be at the computer.

**What to type**:

```text
/pstack:poteto-mode im going to bed. keep going until it's done.
goal: <what to finish>, on a new branch <branch name>.
done means: <checkable condition 1>; <condition 2>; <condition 3>.
decision log: keep one in decisions.tsv in the show-me-your-work format.
don't ask me: don't ask before committing; decide <other small, reversible choices> yourself and log them.
never: push, open a PR, merge, install packages, go online, or change files outside this folder.
if you're truly stuck: stop and write down where you're stuck, what you tried, and what you need me to decide.
```

What each line does:

- **"im going to bed"** is a session override. When `/poteto-mode` sees it, it stops asking and keeps going ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L88)).
- **"done means"** has to be a condition every iteration can actually check, such as "all tests pass" or "nothing calls the old function." The guide warns that **a duration is not a finish condition**: "work on this for 4 hours" gives the agent nothing to check, and you'll wake up to four hours of motion instead of a result ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L120)).
- **"a new branch"** keeps it away from your other work. The guide recommends a fresh worktree; Claude Code's `-w` (`--worktree`) option starts a session in its own worktree ([CLI reference](https://code.claude.com/docs/en/cli-reference)).
- **"don't ask me"** answers in advance what it would otherwise stop to ask.
- **"never"** draws the line. Writing it in the prompt isn't enough; block it with permission settings, as the next section shows.
- **"if you're truly stuck"** is the escape hatch. Stopping at a genuine dead end and writing it up beats a night of creatively reinterpreting the goal.

The guide's template ends with `/loop`, Cursor's built-in command for waking the AI on a schedule or an event; it isn't a pstack skill ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L35)). Claude Code has its own `/loop` that works differently, which this post doesn't cover; the template above doesn't use it and drives the work to done in one conversation.

**What it does**:

1. **Designs the run first.** For work you'll review after stepping away, `/poteto-mode` routes through [`/figure-it-out`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/figure-it-out/SKILL.md), which plans the phases and wires in the decision log ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L38)).
2. **States the finish condition as a checkable predicate** before the first iteration ([autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L5)).
3. **Makes the smallest change each iteration** and checks it against the finish condition; it commits progress and discards what didn't help, keeping nothing that only "might help."
4. **Handles mid-run discoveries that support the goal** without stopping to ask; it leaves only irreversible actions, product or preference calls no experiment can settle, and genuine dead ends for you.
5. **Logs one row per iteration** in the decision log.
6. **Stops only when the finish condition is met.** A plateau means changing approach, and it never relaxes the finish condition to declare victory ([autonomous-run playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/autonomous-run.md#L6-L13)).

**What you get**: a reply with the finish condition, the number of iterations, what landed, what was discarded, and the final state of the finish condition, plus a decision log.

**Next step**: check it in the morning with `/show-me-your-work` (next section).

### Running Unattended in Claude Code

If the AI stops to wait for your approval every time it runs a command while you're away, it stays stuck all night. So decide in advance what it may and may not do. I use `claude -p` with a permission mode, an allowlist, and a spending cap:

```bash
cd ~/my-project
claude -p "$(cat overnight-prompt.txt)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Grep" "Glob" "Bash(python3 -m unittest *)" "Bash(git add *)" "Bash(git commit *)" "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" \
  --disallowedTools "Bash(git push *)" "Bash(rm *)" "Bash(curl *)" "WebFetch" "WebSearch" \
  --max-budget-usd 10
```

- `--permission-mode acceptEdits`: reads, edits, and common file commands run without asking; other commands run only if the allowlist names them.
- `--allowedTools`: the allowlist of tools and commands that run without asking. Swap in your project's test command.
- `--disallowedTools`: the denylist. Deny rules apply in every permission mode ([permission modes](https://code.claude.com/docs/en/permission-modes#available-modes)).
- `--max-budget-usd`: stops the run once estimated spend reaches this amount; it works only with `claude -p` ([CLI reference](https://code.claude.com/docs/en/cli-reference)).

When `claude -p` runs with no permission mode set, actions that need approval are simply denied ([permission modes](https://code.claude.com/docs/en/permission-modes#tool-calls-denied-in-claude--p-and-agent-sdk-runs)). So an allowlist that's too short won't cause damage; the run just won't finish. Read the log in the morning and decide what to allow next time.

### Stopping on Purpose, or Picking Up Tomorrow

To stop on purpose, tell it to pause, or say you're about to go offline. The Pause safely playbook finishes or backs out of the current step, saves progress as a `wip:` commit, and writes a resume note. It takes no irreversible action to pause, such as opening a PR or pushing. Saying "keep going" never triggers a pause ([pause-safely playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/pause-safely.md#L1-L10)).

```text
/pstack:poteto-mode pause, i'm going offline.
```

A new conversation can pick up from that note through the Session pickup playbook: it reads the previous trail, rebuilds the state, and re-verifies on the real code anything the earlier run claimed was done ([session-pickup playbook](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/session-pickup.md)).

### When the Night Holds More Than One Task

For a night with several independent changes, the guide has two playbooks ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L72-L86)): Autopilot-full carries each PR all the way to merged; Autopilot-stack verifies the same way but **doesn't merge**, so you review and land them yourself in the morning. I recommend Autopilot-stack, because merging is a call you should make yourself:

```text
/pstack:poteto-mode autopilot these five changes, but don't merge. i'll land them in the morning.
```

## In the Morning: Audit the Decision Log With /show-me-your-work

**When to use it**: the AI ran a long piece of work on its own, and you're back and want to know what it did and why.

The decision log is a TSV file (a plain-text table with tab-separated columns), one row per decision, with columns for time, phase, decision, reason, evidence, and result. Evidence is a pointer, such as a commit SHA or `file:line`, never a paragraph ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L11-L22)). By default it lives at `decisions.tsv` in the work folder, or `.audit/<task-slug>.tsv` when several efforts run at once, and it is **not committed**; commit it only when the work is big enough that a reviewer needs the trail to trust the result ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L44-L48)). The log is append-only: a wrong call gets a new row that supersedes it, and old rows are never edited or deleted.

**What to type** (from [guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L62-L66)), in the same conversation that ran the work:

```text
/pstack:show-me-your-work catch me up on what you did last night
```

**What it does** ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md#L55-L74)):

1. **Audits the log against the transcript.** Every row has to match a real decision or action, and its evidence has to open and show what the row claims. Missing pivots get added. Wrong rows aren't edited or deleted; a new row corrects them.
2. **Gets a reviewer from a different model family.** It sends a subagent from a model family other than the one that did the work to read the trail and the transcript, flagging decisions with weak evidence, verification claimed without proof, and choices that look risky in hindsight.
3. **Retells what it did in order**, ending with an Attention section.

**What you get**: a chronological summary and an Attention section. Attention starts with `reviewed by <model>`, then lists each thing that needs your scrutiny, pointing at specific log rows.

**Next step**: read Attention first, then follow it to the rows it points at and spot-check their evidence ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L68)). You're auditing decisions, not re-reading the whole night. Also look at the `reviewed by` line: if your setup has only one model family, the review isn't truly cross-family. To render the TSV as a table in the terminal:

```bash
column -s$'\t' -t decisions.tsv
```

For a quick status instead of a full audit, run `/pstack:ketchup` in the same conversation; it only reads ([guide chapter 7](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md#L70)).

## Risks: What to Let Go, and What Must Ask First

### Where never-block-on-the-human Draws the Line

The core principle behind letting the AI run alone is [never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md#L9-L15): the human supervises asynchronously, and the AI shouldn't sit waiting. Reversible work, such as writing code, editing notes, or splitting tasks, goes ahead and gets reported; instead of asking "should I do X?", it does X and explains why. But **irreversible actions still need confirmation**, such as a force push (overwriting the remote branch's history), deleting production data, or sending external messages. Product direction comes from the human.

`/poteto-mode` also says that even after "im going to bed," it **always pauses** for these: force-pushing to shared branches, deploys, data deletion, and customer messages ([SKILL.md](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/SKILL.md#L86-L88)).

![Let reversible actions run, ask before irreversible ones; permissions and spending caps back that up](ask-line.en.png){: w="800" h="450" }
_The line is whether an action can be undone. The prompt is the first line of defense; permission settings are the second._

I draw the line a little more conservatively:

| Let it run | Always ask first, or block outright |
| --- | --- |
| Changing code and committing on a new branch | Pushing, opening a PR, merging |
| Running tests and the project's own commands | Installing packages, downloading from the internet |
| Writing the decision log and resume notes | Deleting files or data, rewriting git history |
| Drafts in a scratch folder | Changing CI config or the AI's settings (`.claude/`, `CLAUDE.md`) |

### Permissions: The Prompt Isn't Enough

A "never" in the prompt is a request; permission settings are the wall. Claude Code's permission modes let go to different degrees ([permission modes](https://code.claude.com/docs/en/permission-modes#available-modes)):

| Mode | Runs without asking | Best for |
| --- | --- | --- |
| `default` (Manual) | Reads only | Reviewing every action yourself |
| `acceptEdits` | Reads, edits, common file commands | Code changes, with an allowlist for other commands |
| `plan` | Reads | Exploring before changing anything |
| `auto` | Everything, with background safety checks | Long tasks |
| `dontAsk` | Reads and pre-approved tools; everything else is denied | Locked-down CI and scripts |
| `bypassPermissions` | Everything | Isolated containers and VMs only |

A few things to know:

- **Deny rules always apply**, even in `bypassPermissions`; but in `bypassPermissions`, allow rules have no effect.
- **Some folders are protected.** Writes to folders such as `.git` and `.claude` ask you first in `default` and `acceptEdits`, and are refused in `dontAsk` ([protected paths](https://code.claude.com/docs/en/permission-modes#protected-paths)). That's a good thing: the AI can't quietly rewrite its own settings. So expect `/automate-me` or `/reflect` to stop here when they write a skill.
- **Don't turn off every check just to avoid interruptions.** `bypassPermissions` belongs only in an isolated container or VM ([common setups](https://code.claude.com/docs/en/permission-modes#common-setups)).

### Spending: Set a Cap First

Unattended work starts many subagents, and spend can run higher than you expect.

- Add `--max-budget-usd` to `claude -p`. It's Claude Code's own estimate, which can differ from your bill and can slightly overshoot, so leave headroom; subagent spend counts toward it; and when you continue with `--resume`, earlier spend doesn't count toward this run's cap ([CLI reference](https://code.claude.com/docs/en/cli-reference)).
- On a subscription such as Pro or Max with usage credits turned on, set a monthly spend limit in claude.ai under Settings → Usage ([costs](https://code.claude.com/docs/en/costs)).
- In Cursor, check your plan's usage and limit settings before letting it run alone, too.

For more on permission and supply-chain risks, and how to tighten permissions, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).

## Full Example: One Day's Flow

This continues Part 3's example: a command-line tool that exports data.

**Daytime: steer with principle names.** I ask for a new option:

```text
/pstack:poteto-mode add a --since DATE option to the export command. tell me your plan first and don't change anything.
```

The plan adds two helper functions and three tests, which feels like too much:

```text
/pstack:principle-laziness-protocol apply this to your plan, then implement it and commit.
```

It says it's done but shows me only test results:

```text
/pstack:principle-prove-it-works run export --since on real data and show me the output. try some odd dates too.
```

**Evening: turn a repeated mistake into structure.** This week is the second time I've corrected it for comparing user input without normalizing it first:

```text
/pstack:correct filter values from user input are often compared without the same normalization the data gets
```

I review each commit, confirm the new check fails on the old mistake, and push it myself.

**Before bed: hand off the unattended work.** I write the six parts into `overnight-prompt.txt`:

```text
/pstack:poteto-mode im going to bed. keep going until it's done.
goal: add a --format csv option to export, on a new branch feat/export-csv.
done means: all tests pass; the CSV made from the sample data reads back in with the same row count; the existing JSON output is byte-for-byte unchanged.
decision log: keep one in decisions.tsv in the show-me-your-work format.
don't ask me: don't ask before committing; decide small things like column order and how to write empty values yourself, and log them.
never: push, open a PR, merge, install packages, go online, or change files outside this folder.
if you're truly stuck: stop and write down where you're stuck, what you tried, and what you need me to decide.
```

I start it with the `claude -p` command from the previous section, with the allowlist, denylist, and spending cap.

**Morning: audit.** I continue the same conversation (`claude -p --resume <session ID>`, or keep typing in the chat window):

```text
/pstack:show-me-your-work catch me up on what you did last night
```

I read Attention first, open the commits and output behind the rows it points at, answer the decisions it left for me, and then decide myself whether to push and open a PR.

**Last: keep the lesson.** One step took a long detour:

```text
/pstack:reflect parsing dates took way too long. capture what we learned so the next run doesn't repeat it.
```

I approve only the items that would change a future decision. After a while, I run `/pstack:automate-me` to turn these habits into my own mode.

## Which One When

| Your situation | Use this |
| --- | --- |
| The plan is too big, with too many wrappers | `/pstack:principle-laziness-protocol` |
| It says done, with no real output | `/pstack:principle-prove-it-works` |
| The fix only guards the symptom | `/pstack:principle-fix-root-causes` |
| Two fixes in the same direction both failed | `/pstack:principle-attack-the-premise` |
| You want to see all 24 principles | [The README's principles table](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/README.md#L223-L257) |
| You want the AI to work your way | `/pstack:automate-me` |
| You want one conversation's lessons in a skill | `/pstack:reflect` |
| You've corrected the same mistake twice or more | `/pstack:correct` |
| You want it to run to done on its own | `/pstack:poteto-mode` plus the six-part prompt |
| The night holds several independent changes | `/pstack:poteto-mode` plus Autopilot-stack |
| You want to stop on purpose and resume tomorrow | Tell `/pstack:poteto-mode` to pause |
| You want to audit what it did | `/pstack:show-me-your-work` |
| You only want the current status | `/pstack:ketchup` |

## Common Pitfalls

- **A duration as the finish condition**: "work on this for four hours" gives it nothing to check.
- **Limits that live only in the prompt**: block "don't push" with the denylist.
- **A principle that's only named**: the reply should show which decision it changed.
- **Editing a skill mid-task**: do it in its own PR.
- **A rule from one conversation**: approve only `/reflect` items that would change a future decision.
- **Letting the AI read every project's transcripts**: `/automate-me` and `/reflect` should read only this project's conversations.
- **A cross-family review that isn't**: check `reviewed by` in Attention.
- **No spending cap**: add `--max-budget-usd` to `claude -p`, and set your plan's spend limit.
- **Versions**: all of this follows pstack `0.15.36`'s docs, and later versions may work differently.

## Conclusion

To change how the AI works with one phrase, type `/pstack:principle-<name>` mid-conversation, then check that its reply says which decision the principle changed. To have the AI work your way, `/automate-me` builds your own mode from your conversations, `/reflect` writes one conversation's lessons back into a skill, and `/correct` changes the repo itself so the same mistake can't recur. To let it run while you're away, first make sure the task has earned that trust, then write the goal, a checkable finish condition, the decision log, what not to ask about, what it must never do, and how to stop when stuck; block irreversible actions with permission settings, set a spending cap, and in the morning start your `/show-me-your-work` audit from Attention. Let it go ahead on anything that can be undone, and keep every call that can't be undone for yourself.

## Further Reading

- [Guide: Run work while you sleep](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/07-overnight.md): the handoff template, the morning audit, and playbooks for a night with several tasks.
- [Guide: Steer with principle names](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/08-principles.md): a short tour of all 24 principles.
- [Guide: Make it yours](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/09-make-it-yours.md): `/automate-me`, `/reflect`, `/correct`, and how to write and test a skill.
- Skill docs: [automate-me](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/automate-me/SKILL.md), [reflect](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/reflect/SKILL.md), [correct](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/correct/SKILL.md), [show-me-your-work](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/show-me-your-work/SKILL.md), [never-block-on-the-human](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-never-block-on-the-human/SKILL.md).
- [Claude Code permission modes](https://code.claude.com/docs/en/permission-modes): what each mode allows, and the protected paths.
- [pstack, Part 1: Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/): installing, updating, and pinning a version.
- [pstack, Part 2: Understand the Code, Then Design, Before You Change It](/posts/pstack-understand-design/): `/how`, `/why`, `/architect`, `/interrogate`, and `/arena`.
- [pstack, Part 3: After the Code Is Written, Prove It Works Before Merging](/posts/pstack-build-verify-merge/): the Build, Clean, Verify, and Prepare for Review stages, including playbooks, `/tdd`, verification skills, and babysit.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): where skills live and how to write `SKILL.md`.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): permissions, sandboxes, and pinning versions.
