---
title: "pstack, Part 2: Understand the Code, Then Design, Before You Change It"
description: "Get AI to understand code and compare designs before changing it: when to use pstack's /how, /why, /architect, /interrogate, and /arena, and how to prompt them."
date: 2026-10-23 21:45:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor, pstack]
media_subpath: /assets/img/posts/pstack-understand-design/
image:
  path: cover.en.webp
  alt: "Before changing code, understand it with /how and /why, design with /architect and /arena, then review with /interrogate."
---

Ask an AI coding assistant to "change this feature," and it often starts editing at the first place that looks reasonable, using the first approach it thinks of. This post shows you how to flip that order with five pstack skills: first have the AI explain how the code works now and why it is shaped that way, then have it compare a few designs, and after the change, have other models look for problems. For each skill I cover when to use it, how to write the command (with an example you can copy and adapt), what it does step by step, what you get back, and where to go next. At the end, I string all five together in a made-up example, followed by a "which one when" table.

> pstack Series | Part 2
>
> - Series guide: [What pstack is and how to read the four parts](/posts/pstack-series-guide/)
> - Previous (Part 1): [Install, pick models, start with /poteto-mode](/posts/pstack-install-routing/)
> - Next (Part 3): [After the code is written, prove it works before merging](/posts/pstack-build-verify-merge/)
{: .prompt-info }

> **Version note:** I based this post on pstack [version `0.15.43`](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/.cursor-plugin/plugin.json), at `cursor/plugins` commit `2f87c85` (05:47 on 2026-11-17, Taipei time), with Claude Code 2.1.326. All five posts in the series were rechecked against this version together on 2026-11-17; when I checked, `main` in `cursor/plugins` had no pstack changes after `2f87c85`. Later versions may behave differently.
{: .prompt-warning }

## Before You Start

pstack is a set of skills in Cursor's official plugin repository. A skill is a set of instructions that tells the AI how to do one kind of job. I covered installing pstack and picking models in [Part 1](/posts/pstack-install-routing/); this post assumes it is already installed.

**Commands take a prefix.** pstack's docs use Cursor's form, such as `/how`. In Claude Code (an AI coding assistant you use in a terminal), plugin commands carry the plugin name in front, so you type `/pstack:how`. My examples below use the Claude Code form; in Cursor, just drop the `pstack:`.

**None of these five skills start on their own.** Each one is set so the AI can't invoke it by itself, so you have to type the command. The other option is to hand the task to `/pstack:poteto-mode` and let it sequence the work. For example, if your prompt says "don't change any code yet," it runs a read-only investigation, which first traces the code involved and adds `/why` for questions about motivation.

I use the word "subagent" a lot below. When a skill runs, it sends out other AI instances to work on parts of the job in parallel; each one is a subagent. The more subagents a skill sends out, the more of your usage quota it usually takes.

![The five-skill flow: understand with /how and /why, design with /architect, then review with /interrogate; /arena also works on its own](five-skills-flow.en.webp){: w="800" h="450" }
_Understand first, then design, then review the change. `/arena` works on its own, and `/architect` switches to it for a large or contested design._

## /how: Learn How the Code Works Now

**When to use it:** before you change code you don't know well, or when you want to ask "where should this live, which module owns it, is this the right layer." It answers how things work now, not why they were written that way. That is `/why`'s job.

**How to write the command:** ask the question you actually have. Add an entry point and the part you care about most:

```text
/pstack:how how does <feature or module> work? start from <an entry point, such as an API or a command> and explain how data flows and what each file is responsible for. i most want to know <the part you care about>.
```

For example:

```text
/pstack:how where is the session created after a user logs in, and how does it expire? what happens on the frontend once it expires?
```

**What it does:**

1. If the scope is unclear, it states its interpretation and starts exploring; you can redirect it if it's off.
2. Whatever the size of the question, it sends a single read-only subagent that reads the code and writes the explanation in one pass. The subagent's brief: write an architectural explanation that a senior engineer new to this area could read and come away with a solid mental model, enough to start working in it confidently.
3. It hands you that explanation, with light edits or context from the conversation at most. It doesn't substantially rewrite it.

**What you get:** an architectural explanation written for a senior engineer. The skill file doesn't fix its sections; the pstack guide says it covers the runtime flow, the key types (the kinds and shapes of data, such as which fields an order has), and the non-obvious parts. If you want fixed sections, such as "which files to look at before starting," say so in your prompt. When you go through a read-only investigation with `/pstack:poteto-mode`, the result is organized into Overview, Key Concepts, How It Works, Where Things Live, and Gotchas; if the question is a choice between options, you get a recommendation with a tradeoffs table instead.

**What's next:** if you then want to know why it looks this way, run `/why`. The pstack guide's suggested order is how first, then why: mechanics before history. If you already understand it and are ready to make a change, go to `/architect`.

## /why: Find Out Why the Code Looks This Way

**When to use it:** when you want to know why a piece of code was written this way, why an approach was chosen, where a threshold number came from, or how a regression (something that used to work and then broke) came about. I think it is especially useful **before you change** something, so you know which parts exist for a reason and shouldn't be touched lightly.

**How to write the command:** name the target and ask your question. If you're asking because you plan to change it, include the change you have in mind and ask whether the original reason still holds:

```text
/pstack:why why does <a piece of code or a decision> work this way? does the reason still hold? i plan to <the change you want to make>.
```

For example:

```text
/pstack:why why is the API retry limit set to five? does the reason still hold? i plan to make it configurable.
```

If you suspect the history explains the mess, you can ask for both at once: "do why first, then how."

**What it does:** the skill file is a single paragraph. It doesn't say how many subagents to send, which kinds of sources to search, or what sections the report has. As I read it, it asks for three things:

1. **Answers from the record, not by guessing from the code.** It reads the commits (a commit is one recorded change in git) and PR (pull request) discussions that introduced the code, then those for each later change to it.
2. **Looks at other sources only when that trail is thin.** The skill file doesn't list them. If you have MCP servers connected (an MCP server is a connector that lets the AI use an outside tool, such as an issue tracker, Slack, or Notion), it may use them.
3. **Keeps track of who said what.** It cites what the authors wrote, marks its own inferences as inferences, and says what the record doesn't answer.

**What you get:** a cited answer that separates what the authors wrote, what it infers, and what the record doesn't cover. "Nobody wrote down why" is an answer too.

If you're asking because you plan to change the code, I suggest ending your prompt by asking it to list what to **Preserve**, what you can **Change**, what to **Avoid**, and what the **Risks** are. The skill file doesn't ask for this list, so you have to request it.

**What's next:** take what it found must not be touched lightly (or the list you asked for) to `/architect` as constraints for the design.

> `/why` reads commits and PR discussions; when that trail is thin, it may also use the MCP servers you've connected to read issues, docs, and chat history. Before you start, decide what you're willing to let the AI read. For how to tighten permissions, see my post [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/).
{: .prompt-tip }

## /architect: Sketch the Design Before Writing Code

**When to use it:** for work that isn't a small fix, where jumping straight into code could lock in the wrong structure. The pstack guide's rule of thumb: if the change crosses function boundaries or moves which code owns what, it earns `/architect`.

**How to write the command:** say what you want built and what you care about most. **If you want to see the design before it starts implementing, you must say "stop and show me the design first" in your prompt;** otherwise it moves on to writing code once the design is done:

```text
/pstack:architect design <the feature>. stop and show me the design before implementing, and tell me which two designs you compared and why you picked this one. i care most about <how callers use it / performance / room to grow>. constraints: <what /why found must not change>.
```

For example:

```text
/pstack:architect design the import pipeline, then stop and show me before implementing. i care most about how callers use it.
```

**What it does:** the skill file is just two short paragraphs. I've summed up the key points below:

1. **Trace first:** before writing code, it traces every system the change touches.
2. **Sketch two designs:** it draws two different shapes, each with only types, function signatures (a function's name, parameters, and return value), and how modules divide the work.
3. **Pick one:** it chooses the one that best fits three tests: each piece of state has one owner, each task has one way to do it, and callers need to know the least.
4. **Hand big designs to `/arena`:** for a large or contested design, it runs `/arena` instead of sketching alone, so several subagents each draw one to compare.
5. **Redesign when workarounds pile up:** if the same workaround keeps coming back during implementation, it redesigns instead of patching around it.

**What you get:** a design made of types, function signatures, and module boundaries; unless you asked it to stop, the code built from that design follows. The skill file doesn't say what format the design comes in. If you want to see how the two designs compare, why it picked this one, and which questions are yours to decide, ask for them in your prompt, as in the template above.

**What's next:** when it stops to show you the design, ask about anything unclear, and let it go on to implement once you agree. If the design matters and a mistake would be expensive, you can run `/interrogate` on the design before implementation, so the models it sends out build a prototype or probe the current code to find where the design breaks; otherwise, run `/interrogate` on the change once it's built.

## /interrogate: Have Several Models Look for Problems

**When to use it:** after the code is changed and before you merge, to find problems neither you nor the AI noticed. It works best on **actual code changes**: every finding has to be proven by a run, so a plan with no code behind it gives it little to break.

**How to write the command:** say what to review. That can be a few files, a diff (the lines that changed between two versions), or a whole branch (a line of development in git). Adding "don't change anything yet" and "no nitpicks" makes the result more useful:

```text
/pstack:interrogate the whole branch, but skeptically. don't change anything yet. no nitpicks unless it's an actual bug or regression in behavior.
```

To review just a few files:

```text
/pstack:interrogate review <files or folder>. the goal of this change is <what you want to achieve>.
```

**What it does:**

1. **Sets the scope.** If you named files or a diff, it uses those. Otherwise it takes every change on the current branch from where it split off (the merge base) through your working directory, uncommitted changes included.
2. **Restates in its own words what the change is meant to do.** It draws on your message, the commit messages, and the PR description. If the intent is unclear, it asks you.
3. **Sends out adversaries.** It sends one adversary per model you've set in the `interrogate reviewers` line. Each gets its own worktree (a separate working copy of the same project), with your uncommitted changes copied in. Each gets the same scope, intent, and brief: break this change, and prove every finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. For a design or plan, it builds a prototype or probes the current code. Anything it didn't run stays out of the report, including style, naming, structure, and risks that only matter after some future change. Finding nothing is a valid result.
4. **Reruns to verify.** It reruns the command attached to each finding. A finding stays only if the output shows the failure and that failure breaks the intent of the change; the rest are dropped. Findings that share a root cause are merged into one.
5. **Keeps them all, rather than picking one.** It borrows `/arena`'s way of sending out workers, but skips the judge, the base pick, and the grafting: adversaries find different failures, so the verdict keeps every verified finding.

**What you get:** a verdict in three parts.

- **Intent:** its restatement of what the change is meant to do.
- **Findings:** each verified finding, with the command, its output, how it breaks the intent, and which adversaries found it. If none survive, it says there are no verified findings.
- **Dropped:** for each adversary, how many findings were dropped and why.

**It doesn't change your code automatically.** Whether to fix anything, and what, is up to you.

**What's next:** handle the Findings first; each one comes with its command, so you can rerun it yourself to confirm. Read the Dropped list too, and override the verdict if you disagree.

![The /interrogate flow: several adversaries each try to break the same change, the findings are rerun to verify, and the verdict has three parts: Intent, Findings, and Dropped](interrogate-buckets.en.webp){: w="800" h="450" }
_Several models each try to break the same change, and only findings that still fail on a rerun are kept. Nothing is changed automatically._

## /arena: Let Several AIs Each Try, Then Keep the Best

**When to use it:** for anything where a single attempt would likely lock in the wrong approach. The pstack guide's examples are standalone decisions like naming, data formats, and algorithms. You can also use it for a second opinion: your current design becomes one candidate, and you see whether the others found something better. For a large or contested design, `/architect` also switches to it to draw its sketches.

**How to write the command:** state the task, why it matters, and how many attempts you want. Ask for more when the decision matters and fewer when it doesn't:

```text
/pstack:arena <the task>. this matters because <it's hard to change later / it affects many places>. <N> candidates, own worktree per attempt.
```

For example:

```text
/pstack:arena pick the cache key format, 3 candidates. the format is expensive to change later.
```

```text
/pstack:arena give me a second opinion on our current approach.
```

**What it does:** it opens a to-do list with six phases.

1. **Frame:** every candidate gets exactly the same prompt, so the prompt is the contract. It states what each candidate should produce, then writes 3 to 6 concrete criteria that can be scored. The judge scores against these criteria, and it uses them itself to pick the base in step 4; the candidates see only the task. Each candidate gets its own place to work (a git worktree where possible, meaning a separate working copy of the same project) so they don't overwrite each other.
2. **Fan out:** it sends N subagents at the same time. Each does the task and adds a short note on the alternatives it considered and why it rejected them. If one produces nothing, it carries on with the remaining N-1 and notes the dropout.
3. **Cross-judge:** once every candidate is done, it sends one read-only judge. The judge must run on a model from a different vendor than the main conversation (Fable counts as Claude), scores each candidate against each criterion, and recommends one as the base. If no model from another vendor can run, it skips the judge and says so in its note. In Claude Code, subagents can only use Claude models (Opus, Sonnet, Haiku, Fable), so a model from another vendor in the judge list (Gemini by default) [runs on the main conversation's model instead](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/harness/claude-code.md#L36). If the list has only Claude models, the judge is skipped. Either way, the result says which.
4. **Pick:** it reads every candidate end to end itself and scores each one criterion by criterion; when there was a judge, it compares the result with the judge's. If they agree, the pick is confirmed. If not, one of them is biased or the criteria were unclear, so it reads both rationales before deciding. It picks the version a future maintainer can extend most easily without breaking its rules.
5. **Graft:** it goes over the losing candidates once more, usually taking one or two things worth porting from each, and folds them into the base by hand instead of pasting. If the candidates converge on the same approach, it ships that shared approach with no grafting. If they differ wildly, the task in phase 1 wasn't clear enough, so it reframes and runs again instead of averaging the differences.
6. **Verify:** it checks the merged result like any other output. If it finds a problem, it works out whether phase 1 was wrong (start over) or a candidate had caught it and the graft was missed (back to phase 5).

**What you get:** one merged result, with a short note naming the base and why, the judge's verdict (or that the judge was skipped), each graft and the candidate it came from, what was rejected and why, any convergence or dropouts, and the verification result.

**What's next:** if the result is code, you can run `/interrogate` before merging. If what you actually need is **coverage**, such as checking every package once, rather than comparing approaches, that's the job of another skill, `/swarm`. Don't use `/arena` for it.

![/arena's six phases: frame (set the rules), fan out, cross-judge (scoring), pick the base, graft (mix in strengths), verify (final check)](arena-phases.en.webp){: w="800" h="450" }
_More candidates means more subagents: N candidates plus at most one judge._

## A Complete Example (Made Up)

> **I made up this scenario.** It only shows how the five skills fit together.
{: .prompt-info }

Say you maintain a website that sends an email for every notification (a new comment, a new like). You want to add an option so users can get one daily digest email instead.

**1. Understand how notifications are sent today.**

```text
/pstack:how where are notifications triggered, how do they get queued, and what finally sends the email? i most want to know how the sending step connects to user preferences.
```

Read its explanation, and make sure you know where the sending code lives and what the traps are.

**2. Find out why it's one email per notification.**

```text
/pstack:why why is each notification emailed right away instead of in batches? does the reason still hold? i plan to add a daily digest option. at the end, list what to preserve, what can change, what to avoid, and the risks.
```

Because you asked for that list at the end of your prompt, the report includes it. It might, for example, point out that some kinds of notification were made instant on purpose and should stay that way.

**3. Sketch the design and have it stop for you.**

```text
/pstack:architect design a daily digest email option. stop and show me the design before implementing, and tell me which two designs you compared and why you picked this one. i care most about not affecting the existing instant notifications. constraints: <paste the preserve and avoid items from step 2>.
```

`/architect`'s first step already traces the code the change touches on its own, but its skill file doesn't have it dig into history; if you want the original reasons as constraints, run `/why` yourself first, as in step 2. I also wrote the first two steps of this example as manual runs so you understand the code yourself and can check whether the AI's understanding is off. If you don't need any of that, you can start at this step. When it stops, look at which two designs it compared and why it picked this one, ask about anything unclear, and then let it implement.

**4. Hand a standalone decision to `/arena`.**

Suppose the design leaves an open question: should the digest list notifications by time, or group them by type? A standalone decision like this can go to `/arena` on its own:

```text
/pstack:arena design the content layout for the daily digest email, 3 candidates. the point is to let users see the most important notifications at a glance.
```

**5. Review after the change, before merging.**

```text
/pstack:interrogate the whole branch, but skeptically. don't change anything yet. no nitpicks unless it's an actual bug or regression in behavior.
```

Handle the Findings first. Read Dropped too, and override it if you disagree.

> I wrote this example to call each skill **by hand**, so you stay in control of every step. Normally you can give the goal and constraints to `/pstack:poteto-mode` and let it decide which skills to use and in what order. When you do, don't list the skills in your prompt; that reorders steps it already sequences. Name a skill only when you want to override a default.
{: .prompt-tip }

## Which One When

The pstack guide starts with a point I think is important: **most changes need none of these.** Here is its rough ladder, to which I've added `/how` and `/why`:

| Situation | Use |
| --- | --- |
| You're about to change unfamiliar code and need to know how it works now | `/how` |
| You want to know why it's written this way and what must not change | `/why` (ask it to end with what to preserve and what to avoid) |
| A small, finished change you're unsure about | `/interrogate` alone |
| A change that crosses function boundaries or moves which code owns what | `/architect` (it brings `/arena` with it when the design is large or contested) |
| A standalone decision, such as naming, a data format, or an algorithm | `/arena` directly |
| A contested design that's expensive to reverse | `/architect`, then `/interrogate` before merging |
| Coverage, such as checking every package once | Not one of these five; use `/swarm` |
| You want the AI to decide | `/poteto-mode`, which already applies this ladder |

## Cautions

- **Quota:** the more subagents a skill sends out, the more quota it usually uses. `/how` sends one subagent. `/why`'s skill file doesn't say how many to send. `/interrogate` sends one adversary per model, and each one actually runs code in its own worktree. `/arena` sends N candidates plus at most one judge. `/architect` runs a whole `/arena` for a large or contested design, and that is when it sends out the most. A small change isn't worth `/architect` or `/arena`.
- **`/architect` doesn't stop by default:** if you want to see the design before implementation, say "stop and show me the design first" in your prompt.
- **Don't take the first design:** the first attempt is usually just the first shape the model thought of. For designs that matter, use `/architect` or `/arena` to see a few.
- **Don't review an abstract plan:** `/interrogate` keeps only problems a run can show, so a plan with no code behind it gives it little to break. Use it on actual code changes.
- **Don't accept every review comment:** `/interrogate` keeps only the findings a rerun proves and lists what it dropped and why, but you decide, and you can override it either way.
- **Don't let parallel AIs share one working directory:** they overwrite each other, and nobody can tell who changed what. With `/arena`, you can ask for its own worktree per attempt.
- **Versions:** I based everything here on the pstack `0.15.43` skill files; later versions may work differently.

## Conclusion

Before you change code with pstack, the order I suggest is: use `/how` to learn how the code runs now, and `/why` when you need the reasons that make some parts off-limits. Then use `/architect` to compare two designs and sketch the types, asking it in your prompt to stop so you see the design first. For a standalone decision, let `/arena` compare a few candidates. Once the code is changed, use `/interrogate` to have several models run the code and try to break it, keeping only the problems they can prove, and decide for yourself what to fix. You don't need all five every time: for a small change, just make it, and review it afterward if you're unsure.

## Further Reading

- [Guide: Understand the code](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/03-understand.md): when to use `/how`, `/why`, `/teach`, and `/recall`.
- [Guide: Design](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/04-design.md): `/architect`, `/arena`, `/swarm`, `/interrogate`, and prototypes.
- [Guide: Recipes and pitfalls](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/10-recipes-and-pitfalls.md): prompts worth copying and common mistakes.
- The five skill files: [how](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/how/SKILL.md), [why](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/why/SKILL.md), [architect](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/architect/SKILL.md), [interrogate](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/interrogate/SKILL.md), and [arena](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/arena/SKILL.md).
- [pstack, Part 1: Install, Pick Models, Start With /poteto-mode](/posts/pstack-install-routing/): how to install, and how `/poteto-mode` sequences a task.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): SKILL.md structure and testing from the skill author's side.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): what files an agent can read, and how to tighten permissions.
- Another skill set's approach: [mattpocock/skills Series Guide](/posts/mattpocock-skills-series-guide/), [From Vague Requirements to Shared Terms](/posts/mattpocock-skills-requirements-shared-language/), [Spec, Tickets, or More Questions?](/posts/mattpocock-skills-specs-work-breakdown/), [Structure, Code Review, and Merge Conflicts](/posts/mattpocock-skills-design-review-integration/), and [Skills for Research, Handoffs, and Learning](/posts/mattpocock-skills-research-handoff/).
