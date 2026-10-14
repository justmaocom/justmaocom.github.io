---
title: "mattpocock/skills Series (5): Agree on Module Vocabulary, Then Review Changes on Two Axes"
description: "Once the code is written, who judges whether the structure is sound and whether the change matches the spec? This post breaks down codebase-design, improve-codebase-architecture, code-review, and resolving-merge-conflicts, and produces a real merge conflict using the per-seat billing example."
date: 2026-10-14 10:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, code-review, software-architecture, git]
media_subpath: /assets/img/posts/mattpocock-skills-design-review-integration/
image:
  path: cover.png
  alt: "Cover of part 5 of the mattpocock/skills series: on the left, a module block with a small interface and a deep implementation; on the right, a review report split into Standards and Spec columns; codebase-design, improve-codebase-architecture, code-review, and resolving-merge-conflicts are listed at the bottom"
---

In the previous post, `implement` finished "Deactivate a member and release the seat." The test went from red to green, and, as instructed, the AI called `code-review` at the end. You now have three finished tickets, a branch ready to merge, and a review report written by the AI.

Passing tests only tell you the behavior matches the tests. Whether the structure is getting messier with every change, whether this change did more or less than the spec asked, and which side to keep when two branches both edit `deactivateMember()`: none of these are questions tests can answer.

`mattpocock/skills` hands this stage to four skills: `codebase-design`, `improve-codebase-architecture`, `code-review`, and `resolving-merge-conflicts`. The first two deal with the structure of the code; the last two deal with how this change makes it into the main line.

> mattpocock/skills Series | Part 5
>
> - Previous (Part 4): [Before AI Starts Coding, Decide Which Signal to Trust](/posts/mattpocock-skills-implementation-feedback-loops/)
>
> This post is based on [version `1.2.3`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10). The skill invocations in the per-seat billing example are inferred from the original instructions; the merge conflict and the post-merge test failure are real execution results.
{: .prompt-info }

> Since this series started, `mattpocock/skills` has moved on to `1.3.x`. [`v1.3.0` removed `resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1), and the official note says nothing replaces it. The same release also renamed the glossary file `CONTEXT.md` to `GLOSSARY.md`. To stay consistent with the first four parts, this post still uses `1.2.3`; if you are on the newer version, keep these two differences in mind.
{: .prompt-warning }

## A Few Terms First

The following terms come up repeatedly. `codebase-design` [asks that they be used exactly as written](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L12), rather than swapped for "component," "service," "API," or "boundary," so this post sticks to them too:

| Term | Meaning |
| --- | --- |
| module | Anything with an interface and an implementation: a function, a class, or a whole package |
| interface | Everything a caller must know to use the module correctly: not just the type signature, but also invariants, ordering, error modes, and required configuration |
| depth | How much behavior a caller gets per unit of interface they have to learn. A small interface over a lot of behavior is "deep"; an interface nearly as complex as the implementation is "shallow" |
| seam | Where an interface lives. The "test seam" from the previous post is one of these |
| adapter | The concrete thing that satisfies an interface at a seam, such as the production database implementation or an in-memory version for tests |
| leverage, locality | The two payoffs of depth: callers learn little and get a lot; maintainers find what they need to change in one place |

These definitions come from [the `codebase-design` glossary](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L14-L28).

## The Four Skills Cover Different Moments

All four skills live under `skills/engineering/`, and in the `ask-matt` roadmap they belong to three different sections:

| skill | Where it sits in `ask-matt` | When it comes in | Can the model invoke it on its own? |
| --- | --- | --- | --- |
| `codebase-design` | [Vocabulary underneath](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L59) | When discussing a module's shape, or when `tdd` or `improve-codebase-architecture` pulls it in | Yes |
| `improve-codebase-architecture` | [Codebase health](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52) | A periodic scan when you have spare time, or when `diagnosing-bugs` can't find a test seam | No, you invoke it manually |
| `code-review` | [End of the main flow](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26) | After `implement`, or any time you want to review a branch | Yes |
| `resolving-merge-conflicts` | [Off every flow](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L79) | When you are already stuck in a merge or rebase conflict | Yes |

`improve-codebase-architecture` is the only one of the four that sets [`disable-model-invocation: true`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L4), and its `agents/openai.yaml` also sets [`allow_implicit_invocation: false`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/agents/openai.yaml#L4-L5). It scans the whole project and writes a report, so you decide when it runs.

## `codebase-design` Is a Vocabulary, Not a Process

`codebase-design` has no steps. What it provides is a shared language for talking about modules. [`ask-matt` lists it alongside `domain-modeling`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L55-L59) as the two "vocabularies underneath": `domain-modeling` covers business language, such as the "billable seat" from part 2, while `codebase-design` covers the language of code structure. As mentioned last time, [this is what `tdd` consults when the shape of an interface is in question](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26).

Its aim is stated up front: [design deep modules](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L8), giving callers leverage, maintainers locality, and everyone testability. When designing an interface, it has the AI [ask three questions](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L54-L58): can I reduce the number of methods, can I simplify the parameters, and can I hide more complexity inside?

### Four Principles

[There are four principles](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L60-L65):

- **Depth is a property of the interface, not the implementation.** A deep module can be built from many small, swappable parts internally, as long as they don't show up in the interface.
- **The deletion test.** Imagine deleting the module. If the complexity vanishes with it, it was just a pass-through; if the complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test past the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam; two adapters means a real one.** If nothing actually varies across a seam, don't introduce it.

The fourth one is easy to overlook. Many people pull out an interface layer "in case we need to swap it later," and the project ends up with exactly one implementation. By this principle, that seam only adds a level of indirection.

![Left: a shallow module exposes five methods (assignSeat, releaseSeat, countAssigned, notifyBilling, checkMember) whose implementation just passes calls down; right: a deep module exposes only assign, deactivate, and available, with member checks, seat release, and billing notification hidden behind a dashed seam; the bottom reads "The interface is the test surface: callers and tests cross the same seam"](deep-vs-shallow-module.png){: width="800" height="450" }
_The same seat behavior: the shallow module makes callers remember five methods, the deep one exposes three._

It also explicitly [rejects Ousterhout's definition of depth](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L105-L109). *A Philosophy of Software Design* measures depth as the ratio of implementation lines to interface lines; the skill argues this rewards padding the implementation, so it defines depth as leverage instead.

### Two Companion Documents

`codebase-design` ships two more documents for what happens once you've decided to deepen a module:

| Document | What it handles | Key points |
| --- | --- | --- |
| [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L5-L37) | How to test, based on the kind of dependency | Four dependency categories: in-process, local-substitutable (for example PGLite standing in for Postgres), remote but owned, and true external. Once deepened, delete the old unit tests on the shallow modules and write tests at the new interface |
| [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L19-L44) | Designing several different interfaces for the same module and comparing them | Spawn 3+ sub-agents in parallel, each with a different constraint: minimize the interface, maximize flexibility, make the most common call trivial, and, where applicable, one built around ports & adapters. After comparing, the AI must give a clear recommendation rather than a menu |

The "replace, don't layer" rule in `DEEPENING.md` is worth remembering: [once tests exist at the deepened module's interface, the old tests become waste and should be deleted](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L32-L37). If a test has to change when only the implementation changes, it is testing past the interface. That is the same "coupled to implementation details" anti-pattern from `tdd` in the previous post.

## `improve-codebase-architecture` Finds Candidates Worth Deepening

If `codebase-design` is the workbench, `improve-codebase-architecture` is [the site survey that finds the candidates](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52). Its goal is to [turn shallow modules into deep ones, for testability and AI-navigability](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L9). The process has three steps.

**Step one is deciding where to look.** The instructions say ["Scope before you scan: YAGNI"](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L20-L23): deepening a module pays off by making future changes easier, so it prioritizes the parts that change often. If you named a direction, it takes yours; otherwise the AI walks back through `git log` to find files that keep coming up. It then reads `CONTEXT.md` and any ADRs for that area, and spawns a sub-agent to walk the code and note [where it experiences friction](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L27-L35), such as having to bounce between several small modules to understand one concept, or code that is hard to test through its current interface.

An ADR (Architecture Decision Record) records an architectural decision and the reasoning behind it. In part 2, `domain-modeling` only wrote ADRs for the few decisions that are hard to reverse, and here they pay off: [a candidate that contradicts an existing ADR](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L56) is only surfaced when the friction is real enough to reopen that decision, and the report must say so clearly.

**Step two is an HTML report.** The report [is written to the OS temp directory](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L39), so nothing lands in the repo. Each candidate gets a card [with the files involved, the problem, the solution, the benefits, a before/after diagram, and a recommendation strength of `Strong`, `Worth exploring`, or `Speculative`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L43-L52), and the report ends with a top recommendation. [`HTML-REPORT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/HTML-REPORT.md#L40-L55) says the diagrams carry the weight, with one sentence each for the problem and the solution; if a diagram needs a paragraph to be understood, redraw it.

There is one restriction at this step: [do not propose interfaces yet](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L60). After the report is written, the AI only asks which one you'd like to explore.

**Step three is an interview on the candidate you pick.** Using `grilling` from part 2, the AI [walks through the constraints, dependencies, the shape of the deepened module, what sits behind the seam, and which tests survive](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L62-L71). New terms go into `CONTEXT.md` as they come up; if you reject the candidate for a load-bearing reason, the AI offers to record it as an ADR so the next scan won't suggest it again. To compare alternative interfaces, it switches to `codebase-design`'s Design It Twice.

What comes out of this step is an idea, not code. [As `ask-matt` puts it](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52), the chosen candidate goes back into the main flow at `grill-with-docs`, and then follows the route from parts 3 and 4: spec, tickets, implementation. In the README, the author [recommends running it every few days](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L178), but is also clear that it is a survey, not a rescue: on an old codebase it will find real candidates, but it won't untangle the mess for you.

## `code-review` Splits Review into Two Axes

`code-review` reviews [the diff between a fixed point and `HEAD`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L6-L11). The fixed point can be a commit, a branch, a tag, or even `HEAD~5`. The review has two axes:

- **Standards**: does the code follow this repo's documented coding standards?
- **Spec**: does the code faithfully implement what the originating ticket or spec asked for?

Each axis goes to its own parallel sub-agent. The stated reason is so they don't pollute each other's context.

### Five Steps

1. **[Pin the fixed point](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L17-L23).** If you didn't give one, it asks. The diff uses three-dot `git diff <fixed-point>...HEAD`, comparing from the merge-base. Before going further, it checks the ref resolves and the diff isn't empty, so neither sub-agent runs for nothing.
2. **[Find the spec](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L25-L32).** In order: issue references in commit messages, a path you passed in, and files under `docs/`, `specs/`, or `.scratch/` matching the branch name. If nothing turns up, it asks you; if you say there isn't one, the Spec axis is skipped and noted as "no spec available."
3. **[Find the standards](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L34-L56).** Documents such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`, plus a baseline list that always comes along (explained below).
4. **[Spawn both sub-agents at once](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L58-L72).** Each report is capped at 400 words. Standards must cite which rule in which file is violated; Spec reports missing or partial requirements, behavior the spec didn't ask for, and things that look implemented but look wrong, quoting the spec line for each.
5. **[Aggregate](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L74-L78).** The two reports go under `## Standards` and `## Spec`, without merging or reranking. The final line lists the number of findings per axis and the worst issue within each, without picking a single winner across axes.

Step 2 reads `docs/agents/issue-tracker.md`, the configuration left by `setup-matt-pocock-skills` in part 1. [If that file is missing, the AI tells you to run setup first](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L13).

### A Baseline Even Without Standards Docs

Plenty of projects have no written coding standards at all. So the Standards axis of `code-review` [always carries a baseline](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L38-L56): 12 code smells from chapter 3 of Martin Fowler's *Refactoring*, for example:

| Smell | What it looks like | Suggested fix |
| --- | --- | --- |
| Mysterious Name | A name that doesn't reveal what it does | Rename it; if no honest name comes, the design itself is murky |
| Feature Envy | A method that uses another object's data more than its own | Move the method next to that data |
| Primitive Obsession | A string or number standing in for a domain concept that deserves its own type | Give it a small type of its own |
| Shotgun Surgery | One logical change forces scattered edits across many files | Gather what changes together into one module |
| Speculative Generality | Abstractions, parameters, or hooks for needs the spec doesn't have | Delete them until a real need shows up |

Two rules bind this list: **the repo overrides**, so anything the project explicitly endorses isn't a smell; and **every item is a judgement call**, so the report says "possible Feature Envy," never a hard violation. Anything tooling already enforces, such as formatting, is skipped.

Speculative Generality and `codebase-design`'s "one adapter means a hypothetical seam" are the same idea: one is a warning at design time, the other catches it at review time.

### Why Two Axes

The reason given is simple: [a change can pass one axis and fail the other](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L80-L87). Code that follows every standard but implements the wrong thing passes Standards and fails Spec; code that does exactly what the ticket asked but breaks project conventions is the reverse. Reporting them separately keeps a good result on one axis from masking a problem on the other.

![Left: the Standards report, based on standards docs plus Fowler's 12 smells, lists possible Shotgun Surgery and possible Primitive Obsession, marked as judgement calls; right: the Spec report quotes the spec, showing billing receives the new seat count and that deactivating a member without a seat may be wrong; the bottom reads "Following the standards but building the wrong thing: one axis can't cover for the other"](code-review-two-axes.png){: width="800" height="450" }
_The two reports stay separate and are never merged into one ranking._

The previous post noted that [`tdd` leaves refactoring to the review stage](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L38). The Standards axis of `code-review` is that moment after the red-green cycle when you go back and tidy up.

## `resolving-merge-conflicts` Resolves by Intent, Not by Picking Lines

`resolving-merge-conflicts` is the shortest of the four: after the front matter, it is just [five steps](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L6-L14):

1. See the current state of the merge or rebase, including git history and the conflicting files.
2. Find the primary sources for each conflict: read commit messages, PRs, and the original issues or tickets to understand why each side changed what it did.
3. Resolve hunk by hunk. Preserve both intents where possible; where they truly conflict, pick the one matching the merge's stated goal and note the trade-off. Don't invent new behavior, and [never `--abort`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L10).
4. Find and run the project's automated checks, typically typecheck, then tests, then format, and fix anything the merge broke.
5. Finish the merge or rebase: stage everything and commit; when rebasing, continue until every commit is applied.

Step 2 is the point. Conflict markers only tell you the text differs on each side, not what each side was trying to achieve. Reaching for `--ours` or `--theirs`, or deleting whichever block looks less important, may compile, but it can silently drop a change someone made on purpose.

![Left: resolving with git checkout --ours keeps only the billing-notification version, silently dropping "return false when deactivating an unknown member"; right: reading both commits first keeps the existence check, the billing notification, and return true; the bottom reads "Conflict markers say the text differs, not what each side wanted"](merge-conflict-intent.png){: width="800" height="450" }
_Picking a side compiles, but can lose half the intent._

As noted above, this skill was removed in `1.3.0`. [The archived docs page](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1) says nothing replaces it, and the removal commit message only says "No longer needed." Still, the five steps don't depend on any tooling, so you can follow them directly even without the skill installed.

## Where Your Time Goes

| Stage | Who pays | What it costs |
| --- | --- | --- |
| Scope for `improve-codebase-architecture` | You | Name the module or pain point; otherwise the AI infers it from `git log` |
| Reading the HTML report | You | Pick one candidate and judge whether the recommendation strength makes sense |
| Architecture interview | You | Answer questions on constraints and trade-offs; decide whether a rejection becomes an ADR |
| Design It Twice | The AI and you | The AI runs 3+ sub-agents in parallel; you read the designs and the recommendation, then decide |
| Fixed point and spec for `code-review` | You | Tell it where to diff from and where the spec is |
| Reading the review | You | Read the two axes separately; smells are hints, and whether to act on them is your call |
| Resolving a merge conflict | The AI, and you when needed | Trace both sides' commits and tickets; when intents truly conflict, check the side the AI chose and the trade-off it wrote down |

The most expensive are `improve-codebase-architecture` and Design It Twice, since both send sub-agents to read a lot of code. They are also the least urgent: the code works, the structure just isn't great, and you can deal with it whenever.

## Which One to Use When

| Your situation | Skill to use | When it doesn't fit |
| --- | --- | --- |
| You want to discuss a module's interface or where a seam should go | `codebase-design` | If the problem is business language rather than code structure, use `domain-modeling` |
| You have spare time and want to find places worth restructuring | `improve-codebase-architecture` | When you're rushing a feature; its output is an idea that still has to go through the main flow |
| `diagnosing-bugs` fixed a bug but found no test seam to lock it down | `improve-codebase-architecture` | If there is a seam, just add the regression test |
| A branch or PR is done and needs review before merging | `code-review` | Without a spec, the Spec axis is skipped and only Standards remains |
| `git merge` or `git rebase` stopped on a conflict | `resolving-merge-conflicts` (`1.2.x`) | If strange behavior only shows up after the merge finished, use `diagnosing-bugs` |

## Walkthrough: Reviewing and Merging Per-Seat Billing

The skill invocations below were not actually run; the flow is inferred from the `1.2.3` instructions. The merge conflict was produced for real with git 2.47.3, and the post-merge test was run on Node.js v20.19.2; the code is a minimal example written for this post, not taken from `mattpocock/skills`.

### Reviewing "Deactivate a member and release the seat"

After the third ticket is done, `implement` calls `code-review` automatically. You can also run it yourself in a new conversation:

```text
$code-review main
```
{: .nolineno }

The AI first confirms that `git rev-parse main` resolves and `git diff main...HEAD` is not empty, then picks up the ticket from the issue number in the commit message. The project has no `CODING_STANDARDS.md`, so the Standards axis only carries the 12-smell baseline.

The two reports might look like this (inferred):

- **Standards**: `deactivateMember(workspace, memberId, billing)` passes `memberId` around as a plain string, "possible Primitive Obsession"; billing notification code is spread across `assignSeat` and `deactivateMember`, "possible Shotgun Surgery." Both are judgement calls, not violations.
- **Spec**: the acceptance criterion "the billing system receives the new seat count" is implemented; but the ticket doesn't say what happens when deactivating a member who has no assigned seat, and the code doesn't handle it, so it's listed as "looks implemented, but may be wrong."

These two reports are not merged into a single ranking. You can handle the Spec item first by going back to clarify the rule, and leave the two Standards items for the next `improve-codebase-architecture` run.

### Handing the Structural Problem to `improve-codebase-architecture`

A few days later you run `$improve-codebase-architecture` with the direction "per-seat billing." After reading the "billable seat" definition in `CONTEXT.md`, the report might include a card like this (inferred):

- **Title**: Deepen the billable seat module
- **Files**: `seats.js`, `billing-sync.js`
- **Problem**: assigning, deactivating, and notifying billing are spread across two shallow modules, and every caller has to remember to notify billing after changing seats.
- **Solution**: the billable seat module exposes only "assign," "deactivate," and "query available seats," with billing notification hidden behind the seam.
- **Dependency category**: the billing system is a third-party service, category 4 in `DEEPENING.md`, so tests use a mock adapter.
- **Recommendation strength**: `Worth exploring`

Apply the deletion test: delete `billing-sync.js`, and "notify billing after changing seats" spreads back to every caller, so the complexity is real, just in the wrong place. You pick this card, the AI starts the interview, and once it's done the idea goes back to `grill-with-docs` and follows the route from parts 3 and 4 again.

### Two Branches Editing `deactivateMember()` at Once

Meanwhile, another branch, `guard-unknown`, makes deactivating an unknown member return `false`, and your branch, `notify-billing`, notifies billing after deactivation. Both branched off the same `seats.js`:

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```
{: file="seats.js (common ancestor)" }

Merge `guard-unknown` into `notify-billing`:

```bash
git merge guard-unknown
```
{: .nolineno }

git stops on a conflict:

```plaintext
Auto-merging seats.js
CONFLICT (content): Merge conflict in seats.js
Automatic merge failed; fix conflicts and then commit the result.
```

`seats.js` now looks like this:

```javascript
<<<<<<< HEAD
export function deactivateMember(workspace, memberId, billing) {
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
=======
export function deactivateMember(workspace, memberId) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  return true;
>>>>>>> guard-unknown
}
```
{: file="seats.js (in conflict)" }

Now call `$resolving-merge-conflicts`. Following step 2, the AI first reads both commit messages: one says "notify the billing system of the new seat count after deactivation," the other "return false when deactivating an unknown member." The two intents don't conflict, so both are kept instead of picking a side:

```javascript
export function deactivateMember(workspace, memberId, billing) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
  return true;
}
```
{: file="seats.js (resolved)" }

The order matters too: checking that the member exists first and returning early means billing never receives a seat count that didn't change. Neither commit says this; it's a judgement the AI made during the merge, so it belongs in the merge commit message where you can see it during review.

Then, per step 4, run typecheck and tests. The `node --test seats.test.js` from the previous post calls `deactivateMember()` without passing `billing`. I put the resolved code back under that test and actually ran it on Node.js v20.19.2: the result was `fail 1`, with a `TypeError`. This is exactly the "fix anything the merge broke" case: the test needs a billing stand-in, rather than deleting the notification line. Only after everything passes does the AI stage and commit.

## My Take: Read the Two Axes Separately, and Don't Fix Every Smell on the Spot

This section is my own view; the source material doesn't say it directly.

`code-review` deliberately doesn't rank the two axes, so the reading order is up to you. I read Spec first. A Spec finding means the feature may be wrong and must be handled before merging; Standards smells are labeled as judgement calls by the skill itself, and most can wait for the next restructuring pass.

I also wouldn't let `code-review` fix every smell on the spot. The Shotgun Surgery in the walkthrough above isn't something a rename can solve; it needs the full treatment `improve-codebase-architecture` provides: survey, interview, then back into the main flow. Forcing it during review means changing structure without a spec, skipping exactly the checkpoints that parts 3 and 4 set up.

That said, this approach assumes the project actually runs `improve-codebase-architecture` regularly. If the team never makes time for structural cleanup, leftover smells just pile up; in that case, you're better off fixing the most obvious ones during review.

## Decide Which Document This Change Is Checked Against

Most of what needs judging after the code is written isn't something tests can answer. `code-review` splits it into two questions, whether the code follows the standards and whether it does what the spec says, and the two reports are read separately. Structural problems go to periodic surveys with `improve-codebase-architecture`, discussed in `codebase-design`'s vocabulary. When branches collide, read both sides' commits and tickets before deciding how to merge.

Back to per-seat billing: the next step is to run `$code-review main` on the third ticket's branch, deal with the Spec finding first, then decide whether the Standards smells go into the next architecture survey.

## Further Reading

- [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L1-L114): the full deep-module vocabulary, the four principles, and the framings it deliberately rejects.
- [`codebase-design/DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L1-L37): how to test each of the four dependency categories, and the "replace, don't layer" testing strategy.
- [`codebase-design/DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L1-L44): the constraint each parallel sub-agent gets, and the three dimensions used to compare designs.
- [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L16-L71): the three steps from scoping, to the report, to the interview.
- [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L1-L87): what goes into each axis's sub-agent prompt, and the full list of 12 smells.
- [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L1-L14): the five steps in `1.2.3`; after its removal, [the archived docs page](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md) also explains why you shouldn't resolve conflicts with `--ours` or `--theirs`.
