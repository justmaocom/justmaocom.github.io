---
title: "pstack, Part 2: Understand the Code, Then Design, Before You Change It"
description: "How do you get AI to understand code and compare designs before changing it? I tested pstack's /how, /why, /architect, /interrogate, and /arena in Claude Code."
date: 2026-10-23 21:45:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.en.png
  alt: "Understand first with /how and /why, then compare designs with /architect and /arena, and let /interrogate find the flaws."
---

Ask an AI coding assistant to "add a feature," and it often starts editing at the first place that looks reasonable, using the first approach it thinks of. The problem this post tackles is how to get the AI to understand the existing code first, and then compare a few designs, before anything changes. My practice program is the same one as in [Part 1](/posts/pstack-install-routing/): `ledger`, a small expense-ledger CLI written in Python (a CLI is a program you use by typing commands in a terminal) that totals a bank's CSV export into income, spending, net, and spending per category. I ran each of five pstack skills on it once; below I show what each one actually produced, then explain in plain terms how it helped me.

The short version: every point in the `/how` explanation checked out. `/why` was mostly right, with one line number off by one. Of the three design steps, `/architect` was the most expensive: one run used USD 4.29 in API-equivalent cost. API-equivalent cost is what the run would cost at API list prices; I used my subscription's quota, so nothing was actually charged.

> pstack Series | Part 2
>
> - Series guide: What pstack is and how to read the four parts (not yet published)
> - Previous (Part 1): [Install, pick models, start with /poteto-mode](/posts/pstack-install-routing/)
> - Next (Part 3): After the code is written, prove it works before merging (not yet published)
{: .prompt-info }

> **Version note:** This post is based on pstack [version `0.15.30`](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/.cursor-plugin/plugin.json), at `cursor/plugins` commit `eb4db2b` (14:08 on 2026-10-22, Taipei time), with Claude Code 2.1.309. After Part 1 was written, Claude Code updated itself and the plugin automatically, so the two posts use different versions:
>
> | | Part 1 | This post |
> | --- | --- | --- |
> | pstack | `0.15.29` (`88d4751`) | `0.15.30` (`eb4db2b`) |
> | Skills | 56 | 57 |
> | Claude Code | 2.1.306 | 2.1.309 |
>
> The only change from `0.15.29` to `0.15.30` is a new skill, `statechart`. None of the parts this post uses changed: how, why, teach, architect, interrogate, arena, swarm, poteto-mode, and the Claude Code adapter notes. When I checked at 21:28 on 2026-10-23 (Taipei time), `main` in `cursor/plugins` had two more pstack commits after `eb4db2b` (`7698375` and `4ec7ffa`). Both only touch `statechart`, and the version is still `0.15.30`.
{: .prompt-warning }

> **How this was tested:** I ran every test myself between 15:42 and 21:20 on 2026-10-23 (Taipei time), on my Mac (macOS 27.0, Claude Code 2.1.309). I used Claude Code's non-interactive mode, `claude -p`, which takes the whole instruction at once instead of a back-and-forth chat. The permission allowlist (the list of what the AI is allowed to do) was the same as in Part 1, plus read-only `git blame`: no writes to the global settings under `~/.claude/`, no `git push`, `gh`, `curl`, or web access, and no `--dangerously-skip-permissions`. Every prompt said not to commit (a commit is one recorded change in git). The practice project stayed at version `579a745` the whole time, and drafts went only into `.pstack-scratch/`, a folder outside version control. The full prompts are in the appendix at the end. **Nothing was tested in Cursor.**
{: .prompt-tip }

## The Five Skills

pstack is a set of skills in Cursor's official plugin repository. A skill is a set of instructions that tells the AI how to do one kind of job. Claude Code is an AI coding assistant you use in a terminal; in Claude Code, commands carry the plugin name in front, as in `/pstack:how`. This post uses five skills:

- `/how`: explains how the code works now.
- `/why`: digs through the change history to find out why the code looks the way it does.
- `/architect`: drafts the design before any implementation.
- `/interrogate`: has several different AI models each look for problems in a design.
- `/arena`: has several AIs each do the same task, then picks the best result and grafts in the good parts of the others.

Each skill below follows the same order: what I asked it to do, what it actually produced (quoted from the test records), what that means, and what it cost.

Most of the skills answered me in Chinese, because I wrote the prompts in Chinese. Where an excerpt below is labeled as a translation, I translated it from the Chinese original; code, sample output, and the English arena report are quoted as they are.

pstack keeps a model settings file (`~/.claude/rules/pstack-models.md` in Claude Code) that says which model each role uses and at what effort (how hard the AI is asked to think); `/setup-pstack`, covered in [Part 1](/posts/pstack-install-routing/), is what generates it. During these tests, every role that uses several models at once (the architect and arena runners, and the interrogate reviewers) was set to one each of opus, sonnet, and haiku, all at high effort.

## Understanding the Code: /how and /why

![Diagram: on the left, /how answers how the code works now, delivering the full path, a flowchart, and 10 gotchas, all of which I checked and found correct; on the right, /why answers why the code looks this way, searching git history and past conversation logs and separating direct evidence from inference, mostly right with one line number off by one; at the bottom, /teach and /recall are marked as not tested](understand-how-why.en.png){: width="800" height="450" }
_/how asks "how does it work now?" and /why asks "why does it look like this?"_

### /how: How This Code Works Now

**What I asked:** explain which code a CSV file passes through, from being read in, to the numbers being calculated, to the result being printed.

**What it produced:** an explanation with an overview, the full path, a flowchart, and 10 gotchas. Here are 4 of the gotchas, translated from the Chinese original:

```text
4. **Parenthesis edge cases**: `(-12)` becomes **+12**; `1e3` is accepted as 1000; `$12` fails. None of these are tested.
5. **A BOM at the start of the file makes every row fail**: CSVs exported from Excel often carry a BOM, but this code uses `utf-8` rather than `utf-8-sig`, so the header is read as `\ufeffdate` and the error message is `error: line 2: 'date'`.
6. **Line numbers can be off**: line numbers count data rows, so they drift when there are blank lines or line breaks inside quotes. Using `reader.line_num` would be accurate.
7. **`--month` doesn't check the format**: passing `2026-1` quietly returns all zeros. And because filtering happens after parsing, one bad row in September also makes a query for October fail.
```

**What it means:** these are details that are hard to spot by reading the code but really do cause errors. For example, a parenthesized negative such as `(-12)` is treated as positive 12; CSVs exported from Excel often start with an invisible BOM marker, which makes every row fail to load; and a mistyped `--month 2026-1` doesn't raise an error, it just returns a pile of zeros. I checked all 10 points against the code and by running it, and every one was correct. This helps me because, before I change anything, I know where the code is fragile and what the tests are missing.

How it worked is worth noting too. It judged this a small question and sent only 1 subagent to read the code. A subagent is a separate AI that the main conversation sends off to do one piece of the work. After the subagent reported back, the main conversation checked the line numbers it cited before giving me the answer.

**Cost:** about USD 0.73, in under 3 minutes.

### /why: Why It Looks Like This

**What I asked:** find out why "turning parenthesized amounts into negatives" lives in the parser (the module that reads and parses the file) rather than in the modules that do the calculations or the output.

**What it produced:** a layered report. Here are its opening conclusion and the first item under "Reasonable inferences," translated from the Chinese original:

```text
Putting the conversion in `parse_amount` was decided by the AI agent that made fix commit `3c1ea12` (run c2), and it wrote down its reasons. You only specified the behavior; you didn't specify which file to change.
```

```text
## Reasonable inferences
- **[Inferred]** The original author appears to have treated "interpreting the CSV amount format" as the parser's job from the start, based on the docstring and README both being in the first commit. But nobody wrote down the reason for splitting the work this way.
```

**What it means:** it splits the answer into two layers. The first has direct evidence: putting the conversion in the parser was decided by the AI agent (an AI that reads files and runs commands on its own) that fixed the bug in [Part 1](/posts/pstack-install-routing/), following a "fix the root cause" rule, and that agent wrote down its reasons at the time. The second layer is inference: nobody recorded why the original author had the parser handle parentheses in the first place, so it could only guess from the comments in the code and the README, and it clearly labeled that as an inference. This helps me because I know which statements I can trust directly and which are guesses.

It searched git history (the record of every change), and it also decided on its own to read my local past Claude Code conversation logs as a stand-in for team chat. I checked the original text it cited, and all of it was there, except one line number that was off by one.

**Cost:** about USD 1.98, in under 4 minutes.

> `/why` reads your past Claude Code conversation logs. This time the allowlist only blocked writes to `~/.claude/`, not reads, so it could read them. If those logs contain anything you don't want handed to a model again, tighten the permissions first. For what an agent can read, see [the gaps that open up after you install third-party skills and MCP servers](/posts/coding-agent-supply-chain-permission-risks/).
{: .prompt-warning }

## Comparing Designs: /architect, /interrogate, and /arena

Once the code is understood, the next step is design. [The guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5) names the two most common mistakes: going with the AI's first design, and polishing a plan that no code has tested. pstack [deliberately has no planning skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103), and its author says in the [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268) that the best spec is code. So all three steps below produce code: a sketch, a runnable sample, or code that has been tested.

![Diagram: three cards in order: /architect, where 3 models each draft a sketch, the best one becomes the base with good parts of the others added, and it stops to list 5 questions for me to decide; /interrogate, where 3 models each look for problems and conclude the design is implementable after fixes, with 5 must-fix items; /arena, where two AIs each write a version, it catches a contradiction in my spec before starting, and all tests pass at the end; at the bottom, implementing from the sketch, /swarm, and applying results to the project are marked as not tested](design-three-steps.en.png){: width="800" height="450" }
_All three steps wrote only to the .pstack-scratch/ folder and left the project itself untouched._

### /architect: Draft the Design First

**What I asked:** design "monthly budgets per category with over-budget warnings" for `ledger`, deliver only a sketch, and stop to show me the design without implementing it.

I added `with checkpoint` after the command. [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) says that without it, the skill goes straight on to implementation after the design, with no pause for anyone to confirm.

**What it produced:** function names with their inputs and outputs (no function bodies yet), a sample output, and 5 questions for me to decide. Here are the sample output and the first question. The sample output is verbatim except for its first line, which I translated; the question is translated from the Chinese original:

```text
...the original 8 lines...
budget 2026-09:      spent      limit  remaining
  housing          1200.00    1200.00       0.00
  ...
budget 2026-10:      spent      limit  remaining
  food              153.45     150.00      -3.45  <-- OVER BUDGET by 3.45
  ...
WARNING: over budget: food (2026-10)
```

```text
1. **What should happen when `--month` isn't given?** My design lists every month; the other two options are to show only the latest month, or to require `--month`. This one matters most, and the three models disagreed on it.
```

**What it means:** the sample output was produced by actually running the design on the existing data, not worked out by hand. Food in October came to 153.45 against a budget of 150, so it flags 3.45 over. I checked it against the sample data, and the numbers are right.

Here's how it got there. Three Claude models (opus, sonnet, and haiku) each drew a sketch with a different structure, then sonnet, one of the three, scored them as the judge, and then it took the opus sketch as the base and folded in good parts from the other two. Then it stopped and listed 5 questions for me. The first, "what to do when no month is given," matters most, and the three models disagreed on it. This helps me because, before any real code is written, I can already see what the result will look like and which requirements I haven't spelled out.

**Cost:** about USD 4.29, about 13 minutes; the most expensive of the five skills this time.

### /interrogate: Three Models Look for Problems in the Sketch

First, one place where I departed from the guide. [The guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89) says `/interrogate` should be used on a diff. A diff is the difference between code before and after a change. Use it on a plan with no code, and the reviewers will dream up theoretical risks that never happen. This time I used it on the architect's sketch, not a diff. Still, the sketch had function names with their inputs and outputs, steps written out in words, a test list, and a runnable sample script, so it wasn't a plain prose plan.

**What I asked:** find problems in the architect's sketch, review only, and change no files.

**What it produced:** a review verdict. Here is its final summary, translated from the Chinese original:

```text
The verdict is **implementable after fixes**. Fix these 5 things before starting:
1. A huge amount (e.g. `1E+30`) passes budget-file validation, then goes straight to a traceback.
2. A budget file that isn't UTF-8 causes a traceback.
3. `test_json_sample_exact` compares against a compressed JSON example, so as written it is certain to fail.
4. `--month` validation accepts full-width digits and `0000`, and it also opens a second error exit.
5. The test list misses behavior the design itself adds, including 0-byte files, `-0`, multi-month JSON, and so on.
```

**What it means:** it had three different models act as reviewers, each looking for problems on its own. [The guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69) explains that each model has different blind spots, and a problem two models raise independently is a high-confidence signal. The main conversation then sorted every point into "must fix," "worth considering," "note only," and "rejected"; the 5 above are the must-fix items. In plain terms: if a budget is set to an astronomical number, or the budget file isn't UTF-8, the program crashes and prints a traceback (the error trail Python prints when it crashes); and one test in the sketch would fail as written. I spot-checked 3 key claims myself in Python, and all were true.

It also found a hole in the architect's own reasoning. The architect said listing every month "never silently drops a month," but all three reviewers pointed out that months with no transactions are in fact skipped. A reason one skill wrote down was challenged by the next. This helps me because, before implementing anything, I can fix several problems that would otherwise show users an error screen.

This single run can't tell you whether the guide's warning is right. This sketch already went down to function inputs, outputs, and steps, and the problems I spot-checked were real; but 4 items were also rejected, and [the guide says to read the rejected ones too](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71). If all you have is a prose plan, it's safer to follow the guide and write code first, then review it.

**Cost:** about USD 2.03. The whole run took about 23 minutes, but the actual computing was only about 3 minutes; see the observations below.

### /arena: Two AIs Each Write a Version

**What I asked:** have two AIs each rewrite the function that parses amounts so that it accepts only ordinary amount formats, rejects inputs such as `1e3`, `NaN`, and `$12`, and keeps every existing test passing.

In arena, each AI that does its own copy of the task is called a runner. The number of runners comes by default from the model settings that `/setup-pstack` generates, but [you can change it per run](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51). The model settings say 3; this time I deliberately asked for only 2 in the prompt (opus and haiku).

**What it produced:** a synthesis report, written in English. Here are two of its sections, verbatim:

```text
## Contract change during framing

The original ask also rejected `'1.234'` (3 decimals), but `tests/test_cli.py` parses `-5.555` through `load -> parse_amount`, so that conflicts with "all existing tests unchanged". The user chose option 1: no limit on decimal places, and the other rejections stay.
```

```text
## Convergence

The two candidates independently wrote the **same grammar**: `[0-9]` only, comma groups of exactly 3, a decimal point that needs digits on both sides, sign XOR parentheses, `fullmatch` on `text.strip()`. Their edge-case decisions were the same too: reject `12,34`, `.5`, `5.`, `( 12 )`, non-ASCII digits and empty input; accept a trailing newline. That is strong agreement, so the consensus shape ships.
```

**What it means:** the first section is about what happened before any work was handed out. I had asked it to reject `'1.234'`, with three decimal places, but an existing test has a `-5.555` that must load, so the two requirements can't both hold. Instead of forcing it, it ran the existing tests, found the contradiction, and stopped to ask me with 3 options. It recommended option 2: keep the strict two-decimal rule and, only in the verification copy, change that `-5.555` to a two-decimal value such as `-5.56`; it also pointed out that this amounts to changing an existing test, which I had ruled out. I chose option 1: no limit on decimal places, with the other rejections unchanged.

The second section is the result: the two runners independently wrote exactly the same rule. It accepts only the digits 0–9, comma groups of exactly three, a decimal point with digits on both sides, and either a sign or parentheses but not both. [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) says that two results converging on the same shape is strong agreement. Next, sonnet scored them as the judge; it wasn't the model of either runner. The judge and the main conversation both picked the opus version as the base, and the main conversation then folded in one piece of code and a few tests from the haiku version. The merged version passed all its tests in the scratch folder, and I got the same result when I reran them on my own Mac.

One caution: the new version rejects some forms the old one accepted, such as `.5`, `5.`, `( 12 )`, and `12,34`, so check your data before applying it. This helps me because it caught a contradiction in my own spec before sending any AI off to do the work.

**Cost:** about USD 2.29 for the two parts together, about 6 minutes.

## What I Didn't Test

- Anything in Cursor.
- `/teach` and `/recall`. [The guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5) says `/teach` runs `/how` and `/why` again and turns them into a plain-language explanation, and `/recall` pulls together the current state of a topic from recent conversations and shared records.
- The [read-only investigation](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17) for when the cause is unclear (you add "don't change any code yet" to your `/poteto-mode` request). I didn't rerun it this time; [Part 1](/posts/pstack-install-routing/) ran it once.
- The architect's implementation from the sketch, and the step where it starts over if the architecture proves wrong. I deliberately stopped it at the checkpoint, so "does the implementation follow the sketch?" has no answer this time.
- Applying the arena result back to the project. The result stayed only in `.pstack-scratch/` on purpose.
- A standalone arena with the 3 runners in the model settings. Three runners appeared only in the round inside architect.
- `/swarm`, which splits work across several AIs working in parallel.
- The [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81) the guide recommends for answering design questions: building a few throwaway prototypes.

## What I Observed in This Environment

These were all observed in this particular environment (account, versions, `-p` mode, permission allowlist). They won't necessarily happen with other accounts or in the interactive interface.

**1. Subagents were often blocked from running commands, and the main conversation ran them itself.** In architect, interrogate, and arena, subagents had terminal commands (Bash) denied, and each time the main conversation did the verification itself. In Part 1, subagents running in the background couldn't run commands at all; this time `/why`'s background subagents could run git commands, though a few commands were still denied. When blocked, they switched to reading files, searching, or simpler commands, and noted in their reports what they hadn't actually run.

**2. Effort followed the model settings this time.** Effort is how hard the AI is asked to think. Every subagent dispatched this time used high, matching the model settings; in Part 1, both the bug fix and the feature run used low.

**3. `/interrogate` sat idle in `-p` mode.** After dispatching the reviewers, the main conversation set a backup timer to wake itself up after 20 minutes. The computing time of its replies added up to about 200 seconds, yet the whole run took 22 minutes 35 seconds. It looks like the reviewers had reported back long before, but it still waited until the 20-minute timer went off before finishing. This is inferred from the timing; no per-event timestamps confirm it.

**4. Architect didn't dispatch `/how`.** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) says to run `/how` before designing. This time the main conversation read the code itself and wrote a `grounding.md` for the later runners to share, without dispatching a `/how` subagent.

**5. The plugin updated itself between the two posts.** See the version note at the top.

## When to Use Which

To learn how a piece of code works now, use `/how`: it's the cheapest, and its gotchas are the most practical output. To learn why the code looks the way it does, when there's git history or past records to search, use `/why`, and keep its "direct evidence" and "inference" apart. When a feature will touch several modules, start with `/architect with checkpoint` to see the sketch and the open questions, then decide whether to implement; it's the most expensive, so skip it for small changes. Once you have an actual code change, or a sketch that goes down to function inputs and outputs, use `/interrogate` to have different models look for problems. For a small, concrete change where you want to compare two ways of writing it, use `/arena`. Whichever you use, spot-check a few of its conclusions yourself. The next post picks up from here: once the code is written, how do you prove it really works before merging?

## Test Record

![Chart: horizontal bars showing the API-equivalent USD for each step: /how 0.732, /why 1.979, /architect 4.293, /interrogate 2.030, and /arena 2.288 for its two parts together; the footer reads 7 calls, about USD 11.40 in total](cost-per-step.en.png){: width="800" height="450" }
_Architect cost the most, followed by arena and interrogate._

| Run | Command | Time (Taipei) | Duration | Models and their API-equivalent cost (USD) | 5-hour quota | Details | API-equivalent (USD) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a1 | `/pstack:how` | 15:42–15:45 | 2 min 37 s | opus (main conversation + 1 subagent) | 21% → 24% | 8-step path, flowchart, responsibility table, 10 gotchas; every point checked out | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | 3 min 35 s | opus (3 investigators + 1 synthesizer) | 25% → 35% | Every citation was found; it said README lines 13–15 were there from the first commit, but at that commit they were lines 12–14 | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 12 min 42 s | opus 3.484, sonnet 0.728, haiku 0.080 | 42% → 87% | 3 sketches; the judge scored C1 (opus) 26, C3 (haiku) 25, C2 (sonnet) 24; C1 as the base; 5 open questions | 4.293 |
| q0 | Quota check | 20:39 | 2 s | opus | 26% → 26% | Replied only "ok," to read the quota | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | 22 min 35 s (about 200 s of actual computing) | opus 1.790, sonnet 0.213, haiku 0.026 | 26% → 71% | The three reviewers reported 10, 9, and 17 items; 5 must fix, 6 worth considering, 6 note only, 4 rejected; I spot-checked 3, all true | 2.030 |
| b3 | `/pstack:arena` | 21:13 | 42 s | opus | 74% → 75% | Ran the existing 13 tests, found that `-5.555` in `tests/test_cli.py:14` contradicts the spec, and stopped to ask | 0.242 |
| b3b | Arena continued (`--resume`) | 21:14–21:19 | 5 min 38 s | opus 1.889, sonnet 0.134, haiku 0.023 | 75% → 84% | 17 tests passed (13 existing + 4 new, with 19 accept and 59 reject subtests); the new tests fail on 30 items against the original version | 2.046 |

The 7 calls came to about USD 11.40 in total. This is the `total_cost_usd` that Claude Code reports, which is an **API-equivalent amount at API prices**; this time I used my subscription's quota, and nothing was actually charged.

The "5-hour quota" is the subscription's usage limit within a 5-hour window; the table shows the percentage read at the start and end of each run. The quota reset once at 19:50, so after b1 the numbers start again from 26%. Nothing was ever refused during the tests. The 7-day quota rose from 67% to 91%, but the rise from 76% to 83% between 16:08 and 20:39 was my own everyday use of Claude Code, not these tests.

## Appendix: Full Prompts

These are the full prompts I gave Claude Code for each run. I wrote them in Chinese; these are translations.

**`/how`**

```text
/pstack:how How are this project's parser and summary connected? Explain the whole path from the CLI reading the CSV, parsing it into Transactions, summarize computing the numbers, to the text or --json output, and how the modules divide the work. This is a read-only question: don't modify, add, or delete any file, and don't commit.
```

**`/why`**

```text
/pstack:why Why are accounting-style parenthesized amounts (for example `(12.00)` meaning -12.00) turned negative in parse_amount in ledger/parser.py, instead of being handled in report.py or cli.py? This is a read-only question: don't modify, add, or delete any file, and don't commit.
```

**`/architect`**

```text
/pstack:architect with checkpoint: stop and show me the design; don't implement. Feature: monthly budgets per category with overspending warnings. The user provides a budget file (for example budgets.csv, columns category,monthly_limit). When `ledger summary` gets `--budget <file>`, after the existing output it lists, for each budgeted category, that month's spending, budget, and remaining amount, with a clear warning for categories over budget; `--json` should include this too. Without `--budget`, the text and JSON output must stay byte-for-byte identical to today. Produce type and interface sketches (function bodies say not implemented) and a design rationale. The sketches and all intermediate files go only under ~/pstack-lab/.pstack-scratch/; don't modify existing files in ledger/ or tests/, and don't commit.
```

**`/interrogate`**

```text
/pstack:interrogate Do an adversarial review of the design sketch in ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ (parser.py.sketch.py, report.py.sketch.py, cli.py.sketch.py, test_sketch.py, rationale.md, verify_sample.py), against the existing ledger/ and tests/. Intent: add `--budget <file>` to `ledger summary` (budgets.csv, columns category,monthly_limit); after the existing output, list each budgeted category's spending, budget, and remainder for that month, with a clear warning when over budget, and include this in --json too; without --budget, text and JSON output must stay byte-for-byte identical. This is a not-implemented sketch; review the design itself (interfaces, edge cases, correctness, whether the tests are enough). Only review and give a verdict: don't modify or add any file, don't apply changes, and don't commit.
```

**`/arena`**

```text
/pstack:arena Use only 2 runners: opus high and haiku high. This deliberately overrides the 3 arena runners (opus, sonnet, haiku) in the pstack-models settings to bring N to the minimum; pick a cross-judge from the configured pool. Task (small and concrete): harden parse_amount in ~/pstack-lab/ledger/parser.py to accept only ordinary amounts: an optional sign or accounting parentheses, digits with optional thousands commas, at most two decimal places. These must be rejected with ParseError: '(-50)', '(+50)', '1e3', 'NaN', 'Infinity', '$12', '1.234' (three decimal places). Current behavior such as '1,234.50', '-3.20', '(12.00)', and all existing tests must stay unchanged. Each candidate may only write under ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/: a full modified copy of parser.py, new tests, and a short rationale. Put the synthesis in ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/ and verify inside .pstack-scratch (for example, copy ledger/ and tests/ to .pstack-scratch/arena-amount/verify/ and run python3 -m unittest). Don't modify ~/pstack-lab/ledger/ or tests/, don't use git worktree or /tmp, don't create branches, and don't commit.
```

After `/arena` stopped to ask me, I replied with `--resume`:

```text
Option 1: no limit on decimal places; drop '1.234' from the reject list. The other reject examples stay ('(-50)', '(+50)', '1e3', 'NaN', 'Infinity', '$12'), and all existing tests stay unchanged and must pass. Everything else is as before: only 2 runners (opus high and haiku high, deliberately overriding the configured 3), output only under ~/pstack-lab/.pstack-scratch/arena-amount/, don't modify ledger/ or tests/, don't use git worktree or /tmp, don't create branches, and don't commit. Please continue through every arena phase.
```

The command I used to rerun the tests on my own Mac:

```bash
python3 -m unittest discover -s tests
```

## Further Reading

- [Guide: Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md): when to use `/how`, `/why`, `/teach`, and `/recall`.
- [Guide: Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md): `/architect`, `/arena`, `/swarm`, `/interrogate`, and prototypes.
- [pstack, Part 1: Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/): the practice project and the read-only investigation used here.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): SKILL.md structure and testing from the skill author's side.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): what files an agent can read, and how to tighten permissions.
- Another skill set's approach: [mattpocock/skills Series Guide](/posts/mattpocock-skills-series-guide/), [From Vague Requirements to Shared Terms](/posts/mattpocock-skills-requirements-shared-language/), [Spec, Tickets, or More Questions?](/posts/mattpocock-skills-specs-work-breakdown/), and [Skills for Research, Handoffs, and Learning](/posts/mattpocock-skills-research-handoff/).
