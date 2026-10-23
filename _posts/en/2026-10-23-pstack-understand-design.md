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

Ask an AI coding assistant to add a feature to a small project, and it usually starts editing at the first place that looks reasonable, using the first approach it thinks of. But does it really understand how this code works today, and why it looks the way it does? And is that first approach the best one? Before you use pstack to change code, how do you get the AI to understand it first and compare designs second?

A few terms first. pstack is a set of skills in Cursor's official plugin repository, and a skill is a set of instructions that tells the AI how to do one kind of job. A subagent is a separate AI that the main conversation sends off to do one piece of the work. This post uses five skills:

- `/how`: explains how the code works now.
- `/why`: digs through git history and other records to find out why the code looks the way it does.
- `/architect`: settles the types and interfaces before any implementation.
- `/arena`: has several subagents each do the same task, then picks one result as the base and grafts in the good parts of the others.
- `/interrogate`: has reviewers running on different models each look for problems in a design or a change.

In Claude Code, commands carry the plugin name in front, as in `/pstack:how`. I ran each of these five skills once on the same practice project. Every point in the `/how` explanation checked out. `/why` was mostly right, with one line number off by one. Of the three design steps, `/architect` was the most expensive: one run used USD 4.29 in API-equivalent cost.

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

> **How this was tested:** I ran every test myself between 15:42 and 21:20 on 2026-10-23 (Taipei time), on my Mac (macOS 27.0, Claude Code 2.1.309), using Claude Code's non-interactive mode, `claude -p` (with stream-json output), not by hand in the interactive interface. The permission allowlist was the same as in Part 1, plus read-only `git blame`: no writes to the global settings under `~/.claude/`, no `git push`, `gh`, `curl`, or web access, and no `--dangerously-skip-permissions`. Every prompt said not to commit. The practice project's HEAD stayed at `579a745` the whole time, and drafts went only into `.pstack-scratch/`, a folder outside version control. I wrote the prompts in Chinese; the ones below are translations. **Nothing was tested in Cursor.**
{: .prompt-tip }

## Understanding the Code: /how and /why

The practice project is the same as in Part 1: `pstack-lab`, a Python bookkeeping CLI called `ledger`. After Part 1's bug fix and the new `--json` option, it has 13 tests.

![Diagram: on the left, /how sends a single explainer and returns an 8-step path, a flowchart, a role table, and 10 caveats, all of which I verified; on the right, /why sends 3 investigators and 1 synthesizer through git history, MCP, and local session logs, mostly right with one line number off by one; below, /teach and /recall are marked not tested](understand-how-why.en.png){: width="800" height="450" }
_/how asks "how does it work now"; /why asks "why does it look like this."_

### /how: How It Works Now

```text
/pstack:how How are this project's parser and summary connected? Explain the whole path from the CLI reading the CSV, parsing it into Transactions, summarize computing the numbers, to the text or --json output, and how the modules divide the work. This is a read-only question: don't modify, add, or delete any file, and don't commit.
```

`/how` has two paths. [Its SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/how/SKILL.md#L13-L20) says that for a large subsystem it first sends 2 to 4 explorers to look around in parallel and then hands their findings to an explainer. For a narrow question it skips the explorers and sends one explainer that reads and explains as it goes; when unsure, it takes the smaller path. An explorer is a subagent that reads code and reports what it finds; the explainer turns the findings into an explanation.

This time it took the smaller path and sent a single explainer (opus, effort high). After the explainer reported back, the main conversation checked the line numbers it cited with `cat -n` and grep before giving me the answer. The answer had an overview, key concepts, an 8-step path from `__main__.py` to the output, a mermaid flowchart, a table of each module's role, and 10 caveats.

I checked all 10 caveats against the code and ran the cases myself. All of them were correct. For example:

- `(-12)` is parsed as +12, `1e3` is accepted, and `$12` fails.
- If the CSV starts with a BOM, the error message becomes `line 2: 'date'`.
- `--month 2026-1` raises no error; it quietly returns all zeros.
- The JSON output doesn't set `ensure_ascii=False`, so Chinese category names come out as `\uXXXX`.

This took 2 minutes 37 seconds and USD 0.732 in API-equivalent cost.

### /why: Why It Looks Like This

```text
/pstack:why Why are accounting-style parenthesized amounts (for example `(12.00)` meaning -12.00) turned negative in parse_amount in ledger/parser.py, instead of being handled in report.py or cli.py? This is a read-only question: don't modify, add, or delete any file, and don't commit.
```

The [guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L33) says `/why` checks version control first. Then, depending on which MCP servers you have connected (MCP is the interface that lets AI reach outside tools), it searches tickets, docs, team chat, monitoring, error tracking, and analytics in parallel. The report keeps direct evidence apart from inference, and it says so when it finds nothing, because "nobody wrote down why" is an answer too.

This practice project has no tickets and no chat history. It started by finding the relevant code with `git log -p` and `git blame`, then sent 3 investigators in parallel, followed by 1 synthesizer, all opus with effort high:

- **Version control:** read 3 commits, the blame, and the reflog.
- **Session logs:** a category it added itself. It treated my local Claude Code conversation logs under `~/.claude/projects/`, plus the test records in the project's `.runs/` folder, as a stand-in for "team chat."
- **Claude Docs:** it treated a connected MCP server as "long-form docs" to search, but permissions blocked the tool. The synthesis recorded this source as "couldn't search," not as "searched, found nothing."

The version-control investigator reported first and mentioned that `.runs/` held the record of Part 1's bug fix. The main conversation used `SendMessage` to pass that lead to the session-log investigator, which was still running, instead of sending a new one.

The findings came in three levels: Direct, Supported, and Inferred. The direct evidence: the conversion sits in `parse_amount` because the agent that fixed the bug in Part 1 decided so, following a "fix the root cause" principle, and it wrote down why:

> `report.summarize` separates income and spending by sign. That part was correct; it was just receiving the wrong sign.

As for why the original author had the parser handle parentheses in the first place, it found no record and could only infer from the docstring and README. It also pointed out that the alternative of handling this in report or cli was never actually weighed in any record.

I checked its citations, and every quote can be found in the source. The only mistake was a line number: it said README "lines 13-15" existed in the first commit. The content was indeed there from the start, but at lines 12-14; lines 13-15 is where it sits now.

This took 3 minutes 35 seconds and USD 1.979 in API-equivalent cost, 2.7 times `/how`. Cache reads (re-reading content that was already cached) came to about 1.6 million tokens, and my subscription's 5-hour usage rose 11% in this one run.

> `/why` reads your past Claude Code conversations. This run's allowlist only blocked writes to `~/.claude/`, not reads, so it could read them. If those logs hold anything you don't want to hand a model again, tighten the permissions first. For what an agent can read, see [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).
{: .prompt-warning }

### Not Tested: /teach, /recall, and the Investigation Playbook

The [guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L5) lists four ways in for understanding code. Besides `/how` and `/why`, `/teach` runs `/how` and `/why` and turns the results into a plain-language explanation, and `/recall` pulls together where a topic stands from your recent conversations and shared records. I did **not test** either of them this time.

If the cause still isn't clear, the guide suggests a [read-only investigation](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L11-L17) first: put "don't change any code yet" in your `/poteto-mode` description and it follows the Investigation playbook. I didn't rerun it this time. In [Part 1](/posts/pstack-install-routing/), the read-only investigation took 5 minutes 5 seconds and listed 8 risks, the first of which was the planted bug.

## Comparing Designs: /architect, /interrogate, and /arena

Once the code is understood, the next step is design. The [guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L5) names the two most common mistakes: taking the AI's first design, and polishing a plan that no code has tested. Its answer is to plan in code. I ran each of the three commands once:

![Diagram: three cards in order; /architect with checkpoint, where 3 models each sketch a draft, a judge scores them, C1 becomes the base, and the run stops at the checkpoint; /interrogate, where 3 models look for flaws and the verdict is fix then implement, with 5 must-fix items; /arena, with 2 runners, which caught my contradictory spec before dispatching and ended with 17 passing tests; below, implementing the sketch, /swarm, and applying the result to ledger/ are marked not tested](design-three-steps.en.png){: width="800" height="450" }
_All three steps wrote only to .pstack-scratch/ and never touched the project itself._

### /architect: Sketch the Types and Interfaces First

`/architect` has five phases: understand the relevant code (Phase A), sketch several designs with an arena (Phase B), get a human sign-off (Phase C), implement from the sketch (Phase D), and scrap everything and start over if the architecture turns out wrong (Phase E). [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L41-L45) says that by default it goes straight from design to implementation with no human check in between; to see the design first, you have to say "with checkpoint."

```text
/pstack:architect with checkpoint: stop and show me the design; don't implement. Feature: monthly budgets per category with overspending warnings. The user provides a budget file (for example budgets.csv, columns category,monthly_limit). When `ledger summary` gets `--budget <file>`, after the existing output it lists, for each budgeted category, that month's spending, budget, and remaining amount, with a clear warning for categories over budget; `--json` should include this too. Without `--budget`, the text and JSON output must stay byte-for-byte identical to today. Produce type and interface sketches (function bodies say not implemented) and a design rationale. The sketches and all intermediate files go only under ~/pstack-lab/.pstack-scratch/; don't modify existing files in ledger/ or tests/, and don't commit.
```

**Phase A: it read the code itself and didn't send `/how`.** [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/architect/SKILL.md#L21-L23) calls for `/how` in this phase. This time the main conversation read `/how`'s SKILL.md but didn't send an explainer. It read all the code and ran the CLI itself, and wrote a shared `grounding.md` for the runners that came next.

**Phase B: really an arena.** It sent 3 runners (opus, sonnet, haiku, all effort high), each sketching a draft, and then a read-only sonnet judge to score them. A runner is a subagent in an arena that does the same task as the others. The three drafts really were built differently:

| Draft | Model | Structure | Without `--month` |
| --- | --- | --- | --- |
| C1 | opus | Budgets folded into `report.summarize` | Lists every month |
| C2 | sonnet | A separate `budget.py` module | Uses the latest month in the data |
| C3 | haiku | Split across `parser`, `report`, and `cli` | Uses the latest month in the data |

The judge gave C1 26 points, C3 25, and C2 24. The main conversation also scored them itself and also chose C1. Its reason: only C1 doesn't have to guess which month "that month" means. With the latest month, the summary at the top shows housing 1200.00 while the budget section below shows 0.00, which is misleading.

With the base chosen, it grafted in a few pieces from the other drafts:

- Pull the budget calculation out of `summarize` into a separate `evaluate_budget`, so there aren't two different ways of filtering by month.
- Check the `--month` format strictly when `--budget` is given (from C3). Otherwise `--month 2026-1` would show 0.00 for every category with no warning.
- Validate the budget file more carefully (from C3).
- Show how far over budget a category is (from C2).

The final interface sketch looks like this, with every function body still raising `NotImplementedError`:

```python
parser.parse_budget_rows(lines) -> dict[str, Decimal]
parser.load_budget(path) -> dict[str, Decimal]
report.BudgetLine          # TypedDict: spent, limit, remaining, over
report.BudgetReport = dict[str, dict[str, BudgetLine]]
report.evaluate_budget(txns, limits, month=None) -> BudgetReport
cli.format_budget(budget) -> str   # cli.main also gets --budget
```

The sample output wasn't worked out by hand: it came from running `verify_sample.py` on the existing data. I checked it against the sample CSV. October food is 4.50 + 86.20 + 62.75 = 153.45; with a budget of 150 the remainder is −3.45, flagged "<-- OVER BUDGET by 3.45". September housing at 1200.00 uses the budget exactly and isn't flagged.

**Phase C: it stopped at the checkpoint.** Instead of implementing, it listed 5 questions for me to decide: what to do without `--month`, the exit code when over budget, whether refunds offset spending, whether to warn about budget categories that never appear in the transactions, and whether an empty budget file is an error. The first question matters most, and the three models disagreed on it.

This took 12 minutes 42 seconds and USD 4.293 in API-equivalent cost (opus 3.484, sonnet 0.728, haiku 0.080), 5.9 times `/how`. The 5-hour usage went from 42% to 87%. The haiku runner wrote the most, about 69,500 output tokens, for only USD 0.08, and scored just 1 point below opus.

Phase D (implementation) and Phase E (starting over) were **not tested**, because I deliberately had it stop at the checkpoint. So this run can't say whether the implementation would have followed the sketch.

### /interrogate: Three Models Look for Flaws in the Sketch

First, one way this run differs from the guide. The [guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L89) says `/interrogate` belongs on a diff (an actual change to the code); point it at a plan with no code, and the reviewers will invent theoretical risks that would never happen. This time I pointed it at architect's sketch, not a diff. Still, the sketch had function signatures, TODO pseudocode, a test list, and a runnable `verify_sample.py`; it wasn't a plan in prose.

```text
/pstack:interrogate Do an adversarial review of the design sketch in ~/pstack-lab/.pstack-scratch/architect-budget/synthesis/ (parser.py.sketch.py, report.py.sketch.py, cli.py.sketch.py, test_sketch.py, rationale.md, verify_sample.py), against the existing ledger/ and tests/. Intent: add `--budget <file>` to `ledger summary` (budgets.csv, columns category,monthly_limit); after the existing output, list each budgeted category's spending, budget, and remainder for that month, with a clear warning when over budget, and include this in --json too; without --budget, text and JSON output must stay byte-for-byte identical. This is a not-implemented sketch; review the design itself (interfaces, edge cases, correctness, whether the tests are enough). Only review and give a verdict: don't modify or add any file, don't apply changes, and don't commit.
```

It sent 3 reviewers, opus, sonnet, and haiku, all with effort high. Per SKILL.md, all three get the same intent and content. The [guide](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L69) says the point is the different models: each has different blind spots, and an issue that two models raise independently is the most credible. SKILL.md says to send `generalPurpose` with `readonly: true`; on Claude Code, it used read-only `Explore` subagents instead.

The three reviewers reported 10, 9, and 17 findings, with haiku reporting the most. The main conversation didn't just merge them. It reproduced the edge cases itself with python3, then sorted every finding into four groups: Act on, Consider, Noted, and Dismissed. The verdict was "fix, then implement": 5 to act on, 6 to consider, 6 noted, and 4 dismissed. The 5 to act on:

1. A very large budget amount (such as `1E+30`) passes validation and later raises `InvalidOperation` during rounding. That exception isn't a `ValueError`, so cli doesn't catch it and the user sees a traceback.
2. A budget file that isn't UTF-8 causes a traceback, and Excel on Traditional Chinese Windows often exports CP950.
3. `test_json_sample_exact` in the test sketch is bound to fail as written.
4. The `--month` check accepts full-width digits and `0000`.
5. The test list misses cases such as a 0-byte file, `-0`, and JSON across months.

I spot-checked 3 of these in Python, and all three hold: `Decimal('1E+30').quantize(Decimal('0.01'))` raises `InvalidOperation`, which is an `ArithmeticError`; `'２０２６-10'` and `'0000-10'` both pass the sketch's month regex; and `Decimal('150.000')`, which equals 150.00, is wrongly rejected by the sketch's "more than two decimal places" rule.

Architect's rationale said listing every month would "never silently miss a month." All three reviewers pointed out that months with no transactions are in fact skipped. The sample also shows housing 1200.00 next to "2026-10 housing 0.00," which is the very situation architect cited to reject the "latest month" option. The main conversation's advice was that the conclusion doesn't have to change, but the first open question should be argued again with these counterexamples before I decide. The rationale written by one skill had a hole found by the next.

Among the 4 dismissed findings was haiku's "ANSI escape injection." The main conversation's reason: the budget file is the user's own local file, and the existing code prints transaction categories the same way. The guide reminds you to [read the dismissals too](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L71), because the main conversation isn't always right and you can overrule it. On the other hand, haiku also had two findings that only it raised and that turned out to be true: `(-50)` is treated as +50, and the jq example in the rationale doesn't work. It cost only USD 0.026.

This run cost USD 2.030 in API-equivalent cost, and the 5-hour usage went from 26% to 71%. The whole run took 22 minutes 35 seconds, but actual compute was only about 200 seconds; the reason is under "What I Observed in This Environment" below.

One run isn't enough to say whether the guide's warning is right. This sketch already had function signatures and pseudocode, and the issues I spot-checked were real, but 4 findings were still dismissed. If all you have is a plan in prose, it's safer to follow the guide and write the code before reviewing it.

### /arena: Two Runners Do the Same Job

[Arena's SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L9-L18) has six phases. Frame: write one task brief shared by every candidate, set a rubric (3 to 6 criteria that can be scored), and pick the runners. Fan out: send the runners in parallel. Cross-judge: a read-only judge on a different model scores them. Pick a base: choose one candidate as the base. Graft: bring in the good parts of the others. Verify: check the result.

The number of runners comes from the `/setup-pstack` settings by default, but [you can change it per run](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L47-L51). The settings file says 3; this time I asked for only 2 in the prompt (opus high and haiku high) to bring N down to the minimum:

```text
/pstack:arena Use only 2 runners: opus high and haiku high. This deliberately overrides the 3 arena runners (opus, sonnet, haiku) in the pstack-models settings to bring N to the minimum; pick a cross-judge from the configured pool. Task (small and concrete): harden parse_amount in ~/pstack-lab/ledger/parser.py to accept only ordinary amounts: an optional sign or accounting parentheses, digits with optional thousands commas, at most two decimal places. These must be rejected with ParseError: '(-50)', '(+50)', '1e3', 'NaN', 'Infinity', '$12', '1.234' (three decimal places). Current behavior such as '1,234.50', '-3.20', '(12.00)', and all existing tests must stay unchanged. Each candidate may only write under ~/pstack-lab/.pstack-scratch/arena-amount/candidate-<n>/: a full modified copy of parser.py, new tests, and a short rationale. Put the synthesis in ~/pstack-lab/.pstack-scratch/arena-amount/synthesis/ and verify inside .pstack-scratch (for example, copy ledger/ and tests/ to .pstack-scratch/arena-amount/verify/ and run python3 -m unittest). Don't modify ~/pstack-lab/ledger/ or tests/, don't use git worktree or /tmp, don't create branches, and don't commit.
```

**The Frame phase stopped my spec first.** Before sending any runner, it ran the existing 13 tests and found that the test data in `tests/test_cli.py:14` contains `-5.555`, which goes through the parser. In other words, "reject three decimal places" and "keep the existing tests unchanged" can't both hold. It offered 3 options, recommended option 2, and stopped to ask me. This part took 42 seconds and USD 0.242 in API-equivalent cost.

I chose option 1: keep the existing tests unchanged and drop `'1.234'` from the reject list. I continued the same conversation with `claude -p --resume` and replied:

```text
Option 1: no limit on decimal places; drop '1.234' from the reject list. The other reject examples stay ('(-50)', '(+50)', '1e3', 'NaN', 'Infinity', '$12'), and all existing tests stay unchanged and must pass. Everything else is as before: only 2 runners (opus high and haiku high, deliberately overriding the configured 3), output only under ~/pstack-lab/.pstack-scratch/arena-amount/, don't modify ledger/ or tests/, don't use git worktree or /tmp, don't create branches, and don't commit. Please continue through every arena phase.
```

**Both candidates wrote the same rules.** Opus and haiku independently arrived at exactly the same format rules: only ASCII digits 0–9; thousands commas must group by three; a decimal point needs digits on both sides; use a sign or parentheses, not both; and after trimming surrounding spaces, the whole string must match. [SKILL.md](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/skills/arena/SKILL.md#L40) says that when candidates converge on the same shape, that's strong consensus and you can take it as is.

**Picking a base and grafting.** The judge was sonnet, chosen because neither runner used that model. Both the judge and the main conversation chose opus's C1 as the base. Haiku's C2 lost points mainly because it parsed `(0.00)` as `-0.00`, where the original gives `0.00`. Still, C1 took one thing from C2: parenthesized amounts are now negated with `value.copy_negate() if value else value`. A plain minus sign rounds to the default precision of 28 significant digits; `copy_negate` doesn't, and zero stays the original `0.00`. A few of C2's tests were grafted in as well.

**Verification.** The main conversation copied the code into a `verify/` folder inside `.pstack-scratch/` and ran the tests. All 17 passed: the 13 original tests, unchanged, plus 4 new ones containing 19 accept and 59 reject subtests. It also ran the new tests against the original parser as a control and got 30 failures, which shows the new tests really do tell the two apart. I reran them on my Mac and got the same 17 passes. `(-50)`, `(+50)`, `1e3`, `NaN`, `Infinity`, and `$12` all raise `ParseError`, while `1,234.50`, `-3.20`, `(12.00)`, and `1.234` are accepted as before.

Its report also listed a few things to watch for:

- Values the old version accepted but the new one rejects: `.5`, `5.`, `( 12 )`, `12,34`, and non-ASCII digits. Check your data before applying the change.
- It admitted one slip of its own: the rubric file `rubric.md` sat in a shared folder that both candidates could read, and the opus runner read it. SKILL.md says the rubric is only for whoever picks. The judge checked and found no sign of playing to the rubric.
- Running `python3 -m unittest` from the project root finds 0 tests, because `tests/` has no `__init__.py`. Use this instead:

```bash
python3 -m unittest discover -s tests
```

This part took 5 minutes 38 seconds and USD 2.046 in API-equivalent cost (opus 1.889, sonnet 0.134, haiku 0.023). The two parts together took about 6 minutes and USD 2.288.

**Not tested** this time: applying the result to `ledger/` (it was deliberately kept in `.pstack-scratch/`), a standalone arena with the configured 3 runners (N=3 only happened in the arena inside architect), and `/swarm`, which splits work across several workers in parallel.

## When to Use Which

pstack [deliberately has no planning skill](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L103). In the [README](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/README.md#L266-L268), the author writes that they don't believe in planning first; the best spec is the code. The three design steps in this run worked the same way: architect produced types and function signatures, interrogate reviewed those signatures and pseudocode, and arena wrote the code outright and ran the tests.

Based on this run, here's how to choose:

| Your situation | Use | Cost this time (API equivalent) |
| --- | --- | --- |
| You want to know how some code works now | `/how` | 2 min 37 s, USD 0.732 |
| You want to know why the code looks this way, and there's git history or other records | `/why` | 3 min 35 s, USD 1.979 |
| The cause is unclear and you want to investigate before deciding whether to fix | `/poteto-mode` with "don't change any code yet" | See Part 1 |
| A new feature touches several modules and you want the types and interfaces settled first | `/architect with checkpoint` | 12 min 42 s, USD 4.293 |
| You have a diff, or a sketch down to function signatures, and want different models to find problems | `/interrogate` | 22 min 35 s (about 200 s of actual compute), USD 2.030 |
| A small, concrete change where you want to compare two or three ways to write it | `/arena` | About 6 min, USD 2.288 |

[The guide warns](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md#L77) not to skip `/how` just because "the AI will read the code anyway"; running `/how` first is cheaper than fixing the second bug. But when Part 1 added `--json`, it skipped `/how`, `/architect`, and `/interrogate` on its own: the related code was only two small files it had already read, four design subagents would cost more than the change itself, and the design wasn't contested. For a very small change, you don't have to run the whole set.

The guide also suggests answering design questions that can't be settled by building a few throwaway prototypes with the [Prototype playbook](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md#L73-L81), instead of asking you over and over. I did **not test** that playbook this time. The AI stopped to ask me twice in this run: architect's 5 open questions, and arena's discovery that my spec contradicted itself. Both were requirements for me to decide, not questions code could answer.

## What I Observed in This Environment

I observed all of the following in this run's environment (account, versions, `-p` mode, permission allowlist). They won't necessarily happen with another account or in the interactive interface.

**1. Subagents' Bash is often blocked, and the main conversation makes up for it.** In architect, interrogate, and arena alike, some subagent Bash calls were refused, and each time the main conversation did the checks itself. In Part 1, I saw background subagents unable to run Bash at all; this time the `/why` investigators running in the background could run git commands, though a few commands were still refused. When blocked, they switched to Read, Grep, or simpler commands and noted in their reports what they hadn't actually run.

**2. Effort followed the settings this time.** Every subagent dispatched this time ran at effort high, matching the settings file; in Part 1, both the bug fix and the feature used low.

**3. `/interrogate` sat idle in `-p` mode.** After sending the reviewers, the main conversation used `ScheduleWakeup` to set a 1,200-second wake-up as a fallback. The compute time of all its reply turns adds up to about 200 seconds, yet the whole run took 22 minutes 35 seconds. It looks as if the reviewers had reported long before, and it still waited for the 20-minute wake-up to finish. This is inferred from the timing; no per-event timestamps confirm it.

**4. Architect didn't send `/how`.** SKILL.md calls for `/how` in Phase A; this time the main conversation read the code and wrote `grounding.md` itself, without sending an explainer.

**5. The plugin updated itself between the two posts.** See the version note at the top.

## Usage and Cost

![Bar chart of API-equivalent dollars per step: /how 0.732, /why 1.979, /architect 4.293, /interrogate 2.030, and /arena's two parts 2.288, with 5-hour quota changes on the right and a total of about USD 11.40 for 7 calls at the bottom](cost-per-step.en.png){: width="800" height="450" }
_Architect cost the most; interrogate and architect each took 45% of the 5-hour quota._

| Run | Command | Time (Taipei) | Result | API equivalent (USD) |
| --- | --- | --- | --- | --- |
| a1 | `/pstack:how` | 15:42–15:45 | All correct | 0.732 |
| a2 | `/pstack:why` | 15:45–15:48 | Mostly right; one line number off by one | 1.979 |
| b1 | `/pstack:architect with checkpoint` | 15:55–16:08 | 3 runners plus a sonnet judge; chose C1; stopped at the checkpoint | 4.293 |
| q0 | Quota check | 20:39 | Replied only "ok," used to read the quota | 0.078 |
| b2 | `/pstack:interrogate` | 20:39–21:02 | Fix, then implement; 5 to act on; all 3 I spot-checked hold | 2.030 |
| b3 | `/pstack:arena` | 21:13 | Frame found my spec contradicted itself and stopped to ask | 0.242 |
| b3b | Arena continued (`--resume`) | 21:14–21:19 | I chose option 1; both candidates converged; 17 tests passed | 2.046 |

The 7 calls total about USD 11.40. That's the `total_cost_usd` Claude Code reports, an **amount converted at API prices**. This run used my subscription quota, and nothing extra was charged.

As for quota, the 5-hour usage was 20% before testing began, rose to 87% by the end of architect, and reset at 19:50. After that, interrogate took it from 26% to 71%, and arena's two parts from 74% to 84%; nothing was ever refused. The 7-day usage went from 67% before testing to 91%, but the rise from 76% to 83% between 16:08 and 20:39 came from my own everyday use of Claude Code, not from these tests.

## Before You Change Code, Get Evidence You Can See

The answer from this run is concrete: have the AI hand over something you can check, and only then let it compare designs. `/how` gave a path with line numbers plus caveats I could check one by one against the code; `/why` kept direct evidence apart from inference and said plainly what it couldn't find. In design, `/architect` had three models sketch drafts with genuinely different structures, then stopped and listed what was mine to decide; `/interrogate` had three more reviewers find holes in the sketch, including in architect's own reasoning; and `/arena` ran the tests before dispatching anyone and caught the contradiction in the spec I wrote.

The price is time and quota. From `/how` to `/arena`, including one quota check, this run came to about USD 11.40 in API-equivalent cost, and architect alone used nearly half the 5-hour quota. For a small change, `/how` alone may be enough; save `/architect with checkpoint` for features that touch several modules. Whichever you run, spot-check a few of its conclusions yourself at the end. The next post picks up from there: after the code is written, how to prove it works before merging.

## Further Reading

- [Guide: Understand the code](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/03-understand.md): when to use `/how`, `/why`, `/teach`, and `/recall`.
- [Guide: Design](https://github.com/cursor/plugins/blob/eb4db2b55b2b7dec3d9282754cddf0a56bf4ff10/pstack/docs/guide/04-design.md): `/architect`, `/arena`, `/swarm`, `/interrogate`, and prototypes.
- [pstack, Part 1: Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/): the practice project and the read-only investigation used here.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): SKILL.md structure and testing from the skill author's side.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): what files an agent can read, and how to tighten permissions.
- Another skill set's approach: [mattpocock/skills Series Guide](/posts/mattpocock-skills-series-guide/), [From Vague Requirements to Shared Terms](/posts/mattpocock-skills-requirements-shared-language/), [Spec, Tickets, or More Questions?](/posts/mattpocock-skills-specs-work-breakdown/), and [Skills for Research, Handoffs, and Learning](/posts/mattpocock-skills-research-handoff/).
