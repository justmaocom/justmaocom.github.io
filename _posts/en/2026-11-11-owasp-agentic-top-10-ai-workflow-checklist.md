---
title: "Audit Your AI Workflow With the OWASP Agentic Top 10: Ten Risks, Ten Checks, and How to Fix Them"
description: "Turn the OWASP Agentic Top 10 into ten yes/no checks for your coding agent, MCP servers, and CI, with a fix for each yes."
date: 2026-11-11 16:00:00 +0800
categories: [Security, AI Agents]
tags: [ai-security, coding-agent, prompt-injection, mcp, claude-code]
media_subpath: /assets/img/posts/owasp-agentic-top-10-ai-workflow-checklist/
image:
  path: cover.en.webp
  alt: "Check your own AI coding workflow against each of the ten OWASP Agentic Top 10 risks, then fix what you find."
---

The longer you use a coding agent, the more tools you tend to attach: another MCP server, another auto-approved action, then CI on top, and rarely a pass over the whole workflow. OWASP (a nonprofit open security community, best known for the web risk list "OWASP Top 10") published the [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) in December 2025. It is also called the OWASP Agentic Top 10. The project page describes it as a globally peer-reviewed framework, written with more than 100 industry experts, researchers, and practitioners, to name the most critical security risks in autonomous and agentic systems.

The list was written for organizations that build agent systems. I turned it into ten yes/no questions a personal coding workflow can answer, with a fix for each one. The grouping, scenarios, self-check questions, and fix order are this site's own organization, **not** an official OWASP "checklist for individual developers." The ASI numbers are identifiers only; they do not rank severity.

The scope is a personal developer's coding-agent workflow: agents such as Claude Code, Codex, and Cursor, plus the MCP servers and GitHub Actions you attach to them. The split with [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/en/posts/coding-agent-supply-chain-permission-risks/) is this: that post starts from what you installed and walks through the attack surface; this post uses OWASP's ten items to scan the whole workflow. Cases already covered in the supply-chain post are not retold here.

> **Version note:** This article follows the OWASP Top 10 for Agentic Applications 2026 (published December 2025; rechecked on 2026-11-11 and still the current edition) and each tool's official docs as of 2026-11-11. Default permissions in Claude Code, Codex, and Cursor have shifted recently, so treat names and defaults in the official docs as authoritative.
{: .prompt-info }

## A Few Terms First

- **AI agent / agentic:** An AI that does more than answer questions: it plans steps, calls tools, edits files, and runs commands.
- **Tool:** A function the agent can call, such as reading a file, running a terminal command, going online, or calling an MCP server.
- **MCP (Model Context Protocol):** A standard for connecting an agent to external tools and data; an MCP server is the program that provides those tools.
- **Prompt injection:** Hidden instructions placed in content the agent will read, so that it follows them.
- **Permission mode / approval:** Whether the agent has to ask you before it does certain things.
- **Sandbox:** A restricted place for the agent's commands, such as which folders it can write and which sites it can reach.
- **Token / credential:** A pass that stands in for a password; whoever holds it can act as you.
- **Long-term memory / context:** What the agent reads every time it starts, such as `CLAUDE.md`, `AGENTS.md`, rule files, and auto-written summaries.
- **Least privilege:** Give only the access the task actually needs.
- **Least-Agency:** OWASP's term: do not grant autonomy you do not need.
- **Kill switch:** A way to stop everything immediately when something goes wrong.

## How to Use This Checklist: One Loop, Four Steps

On page 7, OWASP describes Least-Agency as "avoid unnecessary autonomy; deploying agentic behavior where it is not needed expands the attack surface without adding value." The same passage also stresses observability: you need to see what the agent is doing.

I organized the check into one four-step loop:

1. **Inventory:** Write down which agents you use, which folders they can read, which commands they can run, which MCP servers are attached, which tokens they can reach, and which automation follows (CI, scheduled jobs).
2. **Check:** Answer yes or no to each of the ten questions; every "yes" is something to fix.
3. **Fix:** Start with items where no one is in the loop and the action cannot be undone.
4. **Re-check:** When you add a tool or MCP server, or change a setting, run the loop again.

![Four steps to audit an AI workflow: inventory, check, fix, and re-check, guided by least agency](audit-loop.en.webp){: w="1600" h="900" }
_Concept diagram: Inventory, Check, Fix, and Re-check form one loop. The center principle is Least-Agency: do not grant autonomy you do not need. These four steps are this site's method, not an official OWASP process._

## An Overview of the Ten Risks

The official list is numbered ASI01 through ASI10. To make it easier to read, I grouped the ten items into five buckets: what it reads, what it can do, keys and sources, chained automation, and you. This is not OWASP's official taxonomy, and the numbers do not mean one item is worse than another.

![OWASP Agentic Top 10 in five groups: what it reads, what it can do, keys and sources, chained automation, and you](map.en.webp){: w="1600" h="900" }
_Concept diagram: The ten risks in this site's five groups. The footer already notes that the grouping is not an official OWASP classification, and that the source is the OWASP Top 10 for Agentic Applications 2026._

| ID | Official Name | Short Name | In One Sentence |
| --- | --- | --- | --- |
| ASI01 | Agent Goal Hijack | Goal Hijack | Content it reads can change what it is supposed to do |
| ASI02 | Tool Misuse and Exploitation | Tool Misuse | A legitimate tool is used in the wrong place |
| ASI03 | Identity and Privilege Abuse | Identity & Privilege | It acts with your identity and your keys |
| ASI04 | Agentic Supply Chain Vulnerabilities | Supply Chain | An MCP server or skill you installed is compromised |
| ASI05 | Unexpected Code Execution (RCE) | Unexpected Code Exec | Code it writes or runs is exploited |
| ASI06 | Memory & Context Poisoning | Memory Poisoning | Bad content is written into long-term memory |
| ASI07 | Insecure Inter-Agent Communication | Inter-Agent Comms | Messages between agents are spoofed or changed |
| ASI08 | Cascading Failures | Cascading Failures | A small error is amplified down an automated chain |
| ASI09 | Human-Agent Trust Exploitation | Human Trust | It sounds sure of itself, so you click Approve |
| ASI10 | Rogue Agents | Rogue Agents | It drifts off the task and keeps acting on its own |

## Check Each Risk in Official Order

Each item uses the same four beats: a plain-language explanation, how it shows up in a coding-agent workflow, one yes/no question (a "yes" means fix it), and how to fix it. The questions match the checklist figure. Official wording is quoted and linked; the tool-specific steps in the scenarios and fixes are this site's mapping, not steps OWASP wrote for each vendor.

Tool defaults have shifted recently. The sections below tell you where to look and what to confirm, and they do not treat one day's defaults as permanent. For Claude Code, check `/permissions` and the [permissions](https://code.claude.com/docs/en/permissions), [security](https://code.claude.com/docs/en/security), and [sandboxing](https://code.claude.com/docs/en/sandboxing) docs. For Codex, use [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security). For Cursor, use [Agent Security](https://cursor.com/docs/agent/security).

### ASI01 Agent Goal Hijack: The Content It Reads Can Change What It Does

**In plain language:** The agent cannot reliably tell "your instructions" apart from "content it happens to read," so a hidden sentence in a web page, issue, or document can change its goal. That is prompt injection.

**How it looks in your AI workflow:** A common pattern is that you ask it to read a document, a GitHub issue, or a web page, and it then edits files or runs commands without asking.

**Check:** After reading a web page, issue, or doc, can it act without asking you?

**How to fix it:** OWASP's mitigations treat all natural-language input as untrusted and call for "requiring human approval for high-impact or goal-changing actions." When it is reading external content, switch to a read-only or plan mode; set high-impact actions such as `git push` or file deletion to require confirmation. Details and cases are in the [supply-chain post](/en/posts/coding-agent-supply-chain-permission-risks/).

### ASI02 Tool Misuse and Exploitation: A Legitimate Tool Used in the Wrong Place

**In plain language:** The tool itself is legitimate, and the permission is one you granted, but the agent uses it in the wrong place: deleting data, hammering a paid API, or sending data out.

**How it looks in your AI workflow:** OWASP gives a coding-agent example: a set of tools that look harmless and are allowed to run automatically includes ping, and an attacker has the agent call it repeatedly so that data leaves through DNS queries.

**Check:** Can any auto-approved tool delete files, send data, or reach the network?

**How to fix it:** Keep the auto-approve list to tools that are truly harmless and cannot reach the network; deletion, sending, and publishing should require confirmation. Claude Code matches rules in `deny`, `ask`, then `allow` order, and allow cannot override deny; use `/permissions` to review the current rules. Cursor's docs say MCP connections need approval, each tool still requires approval by default, and the allowlist should include only what you actually need. OWASP also recommends usage limits (cost, call counts, or a token budget). For a fuller account of permissions and auto-run, see the [supply-chain post](/en/posts/coding-agent-supply-chain-permission-risks/).

### ASI03 Identity and Privilege Abuse: Your Identity and Keys Doing the Work

**In plain language:** Whose identity is the agent using, and which keys is it holding? If it inherits your full account, a successful trick is carried out with all of "your" privileges.

**How it looks in your AI workflow:** A common pattern is that it can read your SSH keys, cloud credentials, a long-lived token in `.env`, or run commands as the Git and cloud identity you already signed in with.

**Check:** Does it run with your full account, a long-lived token, or your SSH key?

**How to fix it:**

- Follow OWASP mitigation 1: give task-scoped, short-lived tokens, not a long-lived master key.
- Do not leave long-lived tokens where the agent can read them. Claude Code can deny file-tool reads; official examples include `Read(./.env)`, `Read(./secrets/**)`, and `Read(~/.ssh/**)`. After you write the rules, confirm them with `/permissions`.
- If CI still publishes with a long-lived npm token, you can switch to short-lived OIDC credentials. That is this site's worked example, not a method named in the OWASP text; see [Publish npm Packages Without Long-Lived Tokens: A Trusted Publishing Setup Guide](/en/posts/npm-trusted-publishing-github-actions/).
- GitHub Actions can default workflow permissions to read-only, for example by setting `permissions: contents: read` at the top and opening extra access only in the job that needs it. See the [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).

### ASI04 Agentic Supply Chain Vulnerabilities: What You Installed Is Compromised

**In plain language:** If an MCP server, skill, plugin, or prompt template you installed is fake or has been altered, the agent will follow it. Unlike a traditional package supply chain, agents often load these components at run time.

**How it looks in your AI workflow:** The inventory now includes an MCP server or skill whose version is unpinned and whose source you have not reviewed.

**Check:** Is any MCP server, skill, or plugin unpinned or from an unreviewed source?

**How to fix it:** List what you installed, review the source, and pin the version. The official MCP [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) note that a local MCP server runs with the same privileges as your account; before you install one, review the full, untruncated startup command and approve it explicitly. Claude Code's [security docs](https://code.claude.com/docs/en/security) also say that `.mcp.json` alone does not show every server a session can load, and that Anthropic does not security-audit MCP servers. Pinning details are in the [supply-chain post](/en/posts/coding-agent-supply-chain-permission-risks/).

### ASI05 Unexpected Code Execution (RCE): Code It Writes or Runs Gets Exploited

**In plain language:** The agent writes code and runs commands itself. If it is tricked or it writes something wrong, what it runs is what an attacker wanted, with the privileges of your machine.

**How it looks in your AI workflow:** OWASP describes vibe-coding tools that execute unreviewed install or shell commands in the workspace and delete or overwrite production data; it also describes an agent that, while "fixing the build," regenerates a lockfile and pulls in a tampered minor version.

**Check:** Do its commands run straight on your machine, with no sandbox?

**How to fix it:**

- Follow OWASP's mitigations: do not let the agent talk directly to production; isolate it when you can, and keep the filesystem as close as possible to a dedicated working directory. If you want two tasks fully separated, see [Let Two AI Agents Work Separately: Isolated Working Directories With git worktree](/en/posts/git-worktree-parallel-ai-agents/).
- For Claude Code, start with the [sandboxing docs](https://code.claude.com/docs/en/sandboxing) and `/sandbox`, and confirm whether the sandbox is on. As of the 2026-11-11 docs, it is off by default; even when you turn it on, it can still read credential files in the home directory, such as `~/.ssh` and `~/.aws/credentials`, unless you tighten that with `filesystem.denyRead` or `permissions.blockReadsOutsideWorkingDirectories`. The official project-level example is:

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "denyRead": ["~/"],
      "allowRead": ["."]
    }
  }
}
```

The docs warn that if you put the same block in `~/.claude/settings.json`, `.` resolves to `~/.claude`, and project files can be blocked instead. Use `bypassPermissions` only in an isolated environment such as a container or a virtual machine.

- For Codex, check [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) directly. The official wording is that network access is turned off by default, and that on a computer the OS-enforced sandbox usually limits writes to the current workspace. For a read-only session, run `codex --sandbox read-only --ask-for-approval on-request`.
- Do not let the agent regenerate lockfiles on its own; review the change yourself when an update is needed.

### ASI06 Memory & Context Poisoning: Bad Content Written Into Long-Term Memory

**In plain language:** This is not a one-off trick. Wrong content is written into the agent's memory, and later sessions follow the poisoned version.

**How it looks in your AI workflow:** A coding agent's long-term context includes `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, auto-written memory files, and cross-session summaries. If it can edit those files and you never see a diff, the poison stays.

**Check:** Can it edit CLAUDE.md, AGENTS.md, or memory files without you seeing a diff?

**How to fix it:**

- Follow OWASP mitigation 7: put these files in version control and review the diff before you merge. For how to write the rule file, see [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/en/posts/agents-md-project-rules-for-coding-agents/).
- Follow mitigation 6: do not let the agent automatically write its own output back into "trusted memory."
- Claude Code can use a `ConfigChange` hook to audit or block in-session configuration changes; details are in [Automate Repeated Checks: Format, Test, and Flag Sensitive Files With Claude Code Hooks](/en/posts/claude-code-hooks-automate-checks/).

### ASI07 Insecure Inter-Agent Communication: Messages Between Agents Can Be Spoofed or Changed

**In plain language:** When several agents pass messages, and those messages are neither authenticated nor protected against tampering, someone else can impersonate a sender or change a line.

**How it looks in your AI workflow:** This item is mainly about systems in which multiple agents talk to each other. If you use a single agent, you can usually skip it for now. It does come up with subagents passing results, remote MCP, or a CI job in which one agent's output is fed straight into another.

**Check:** Does one agent act on another agent's output without a check?

**How to fix it:** Use HTTPS for remote MCP, and authenticate the connection. Treat another agent's output as unreviewed input, and do not act on it automatically.

### ASI08 Cascading Failures: A Small Error Amplified by Automation

**In plain language:** A small error is not caught, the next automatic step picks it up and amplifies it, and it becomes a serious incident. The point is how the error travels, not only where it started.

**How it looks in your AI workflow:** A common pattern is AI writes, AI reviews, auto-merge, auto-deploy, with no person and no mandatory check in between. OWASP also describes a "Governance drift cascade": after a string of successes, review is relaxed, and a bad setting spreads.

**Check:** From code to merge to deploy, is any stretch unguarded by a person or check?

**How to fix it:** Keep at least one check that cannot be skipped before a merge or a deploy—either a person, or CI that must pass. GitHub's docs describe how to prevent GitHub Actions from creating or approving pull requests; see the [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use). If you already use an AI to help review PRs, also see [Automating PR Review With GitHub Actions and an AI Agent: This Site as an Example](/en/posts/github-actions-ai-agent-pr-review/); the point is that a review result should not automatically become an irreversible merge. Pin third-party actions: GitHub currently recommends a workflow dependency lockfile (`.github/workflows/actions.lock`); otherwise pin the action to a full commit SHA. See [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles).

### ASI09 Human-Agent Trust Exploitation: It Sounds Sure, So You Click Approve

**In plain language:** The agent sounds confident and the rationale looks complete, so you click Approve. You are the one who acted, and the record shows you.

**How it looks in your AI workflow:** OWASP's "Helpful Assistant Trojan" example is a tampered coding assistant that suggests an elegant one-line fix; after you paste it, a malicious command runs. A more everyday risk is approval fatigue: prompts keep appearing, and after a while you click Allow.

**Check:** Do you often click Allow without really reading?

**How to fix it:** For high-risk actions, read the diff or the full command before you approve. Claude Code's [security docs](https://code.claude.com/docs/en/security) say you are responsible for reviewing proposed code and commands for safety before approval. Do not let the agent's own explanation replace your judgment; OWASP mitigation 4 asks for a "plain-language risk summary (not model-generated rationales)." Put only the few commands you truly want to auto-run on the allow list, and keep the rest as ask, so the prompts that remain are worth reading. Before you change the settings, read how each tool describes approval fatigue or allowlists, and do not treat a classifier as a completed human review.

### ASI10 Rogue Agents: It Drifts Off the Task and Keeps Going

**In plain language:** The agent starts doing work you did not ask for, and it keeps going. That can follow a compromise, or it can be the agent probing for loopholes to hit a goal.

**How it looks in your AI workflow:** It might delete backups to "cut costs," or, after an injection, keep sending data out even once the malicious source is gone. For a personal developer, the practical question is whether you know how to stop it immediately.

**Check:** If it goes wrong, would you be unsure how to stop it and revoke its tokens?

**How to fix it:** Prepare a personal kill switch: know how to interrupt the current session, revoke the tokens it is using, and turn off scheduled or background jobs. Bound unattended work by scope and by time. OWASP mitigation 4 calls for "kill-switches and credential revocation"; mitigation 6 says "Keys must never be directly available to agents."

## A Checklist You Can Copy

You can copy the list below into your own notes. The questions match the ten items in the figure; every "yes" is something to fix.

![Ten yes/no checks based on the OWASP Agentic Top 10, where every yes marks something to fix](checklist.en.webp){: w="1600" h="900" }
_Concept diagram: Ten yes/no self-checks. These questions are this site's rendering of the official ten items, not an official OWASP exam._

**Inventory**

- [ ] Which coding agents do I use?
- [ ] Which folders can they read, and which commands can they run?
- [ ] Which MCP servers, skills, or plugins are attached? Have I reviewed the source and pinned the version?
- [ ] Which tokens, SSH keys, or cloud credentials can they reach?
- [ ] What automation follows, such as CI, scheduled jobs, or background tasks?

**Ten Questions (Every "Yes" Is Something to Fix)**

- [ ] ASI01. After reading a web page, issue, or doc, can it act without asking you?
- [ ] ASI02. Can any auto-approved tool delete files, send data, or reach the network?
- [ ] ASI03. Does it run with your full account, a long-lived token, or your SSH key?
- [ ] ASI04. Is any MCP server, skill, or plugin unpinned or from an unreviewed source?
- [ ] ASI05. Do its commands run straight on your machine, with no sandbox?
- [ ] ASI06. Can it edit CLAUDE.md, AGENTS.md, or memory files without you seeing a diff?
- [ ] ASI07. Does one agent act on another agent's output without a check?
- [ ] ASI08. From code to merge to deploy, is any stretch unguarded by a person or check?
- [ ] ASI09. Do you often click Allow without really reading?
- [ ] ASI10. If it goes wrong, would you be unsure how to stop it and revoke its tokens?

**After You Add a New Tool**

- [ ] After you attach another MCP server or skill, or change permissions, CI, or a schedule, run the inventory and the ten questions again.

## What to Fix First

This is this site's suggested order, not an official OWASP ranking: first the items where no one is in the loop and the action cannot be undone (ASI08, and the parts of ASI05 that reach production), then long-lived credentials (ASI03), then auto-approval and MCP (ASI02, ASI04), and only then the rest. If you use a single agent, you can skip ASI07 for now.

## What to Do in Each Situation

| Situation | Suggestion |
| --- | --- |
| You use one agent and no MCP | Still run the inventory and the ten questions; ASI07 can usually wait, but the other items still apply |
| You have attached several MCP servers | Clear ASI04 and ASI02 first: review sources, pin versions, and require approval for each tool by default |
| You let the agent run unattended for a long time | Tighten ASI05, ASI08, and ASI10: isolate execution, bound time and scope, and write down how to stop and revoke first |
| The agent reads web pages or issues | Revisit ASI01 and ASI09: treat external content as untrusted, and have a person review high-impact actions |
| CI uses an agent to review or merge | Revisit ASI08: keep a check that cannot be skipped before merge |
| The team shares settings | Keep rule files and permission settings in git, and review diffs (ASI06); do not put long-lived credentials in shared files |
| You suspect the agent already did something odd | Stop it and revoke credentials the ASI10 way, then go back through logs and diffs |

## Common Misunderstandings

- "If the sandbox is on, it cannot read my SSH keys." As of the Claude Code sandboxing docs on 2026-11-11, a sandbox that is on can still read `~/.ssh` and `~/.aws/credentials` by default; you have to set `denyRead` or block reads outside the working directory. Trust the official docs you have open today.
- "Auto mode or an Auto-review classifier counts as a human review." Cursor's [Agent Security](https://cursor.com/docs/agent/security) page says Run Modes are best-effort guardrails, not a hard security boundary. Confirm Claude Code's starting permission mode with `/permissions` and the official docs; do not assume a classifier has already taken responsibility for you.
- "ASI01 is the most dangerous." The numbers are not a severity ranking, and OWASP does not score these ten items.
- "I only use one agent, so the Top 10 does not apply to me." Most items still apply; ASI07 is the one you can often skip for now.
- "Checking every box means I am safe." It does not. OWASP offers practical mitigations; Claude Code's [security docs](https://code.claude.com/docs/en/security) also say "no system is completely immune to all attacks." These ten questions are a starting point, not a guarantee that the work is finished.

## What to Do Next

Start today with the inventory and the ten questions, then fix the items that cannot be undone. Keep rules and permission settings in git, and run the loop again each time you add a tool. For automated checks, see the [hooks post](/en/posts/claude-code-hooks-automate-checks/). For the rule file, see the [AGENTS.md post](/en/posts/agents-md-project-rules-for-coding-agents/). For short-lived credentials in CI, see the [npm Trusted Publishing post](/en/posts/npm-trusted-publishing-github-actions/).

The official source is the OWASP GenAI Security Project's [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) ([PDF](https://genai.owasp.org/download/52117/), CC BY-SA 4.0). Tool docs: [Claude Code permissions](https://code.claude.com/docs/en/permissions), [sandboxing](https://code.claude.com/docs/en/sandboxing), [security](https://code.claude.com/docs/en/security), [Codex Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security), [Cursor Agent Security](https://cursor.com/docs/agent/security), [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices), and [GitHub Actions Secure use](https://docs.github.com/en/actions/reference/security/secure-use).
