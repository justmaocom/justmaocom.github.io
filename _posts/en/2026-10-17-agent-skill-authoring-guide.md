---
title: "Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep"
description: "Writing your own Agent Skill? Covers SKILL.md rules, descriptions that trigger correctly, references and scripts, trigger and output tests, and upkeep."
date: 2026-10-17 23:10:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, skill-authoring, testing, claude-code, codex, cursor]
media_subpath: /assets/img/posts/agent-skill-authoring-guide/
image:
  path: cover.en.png
  alt: "A skill works only if its description gets it picked at the right moment; scripts and tests check the output, and each change reruns them."
---

Every time I ask an AI to edit a post on this blog, I paste the same list of rules again: English titles stay under 70 characters, dates carry `+0800`, the cover caption is a one-sentence summary of the post. Around the fifth paste, you start wondering whether it could just remember.

That's what an Agent Skill is for. This post looks at skills from the author's side: when one is worth writing, how to lay out the files, how to write a description that gets the skill picked at the right moment, how to test it, whether it still works in another agent, and how to keep it working. Along the way I build a real skill that checks the front matter of this site's posts.

This post doesn't cover installing skills other people wrote. If you'd rather start with ready-made ones, the [mattpocock/skills series guide](/posts/mattpocock-skills-series-guide/) is a good place to begin.

> Everything the spec and each tool's docs say here is based on the official documentation as I read it on October 17, 2026. None of those pages carry a version number, and they change, so check them again before you rely on a detail.
>
> The example skill's checks were run on October 17, 2026, with skills-ref 0.1.0 (agentskills/agentskills commit `69ef37e`) and Python 3.13.5. Every command and output in this post comes from those runs. **Trigger-rate tests and output-quality evals were not run**; the "Test in Three Layers" section explains why.
{: .prompt-info }

## A Few Terms First

| Term | In one sentence |
| --- | --- |
| Skill | A folder built around `SKILL.md`, an instruction file for the AI, plus optional scripts and reference files. |
| Front matter | The settings block between the two `---` lines at the top of a file. Both `SKILL.md` and this blog's posts have one. |
| YAML | A format for writing settings one `name: value` line at a time; front matter is written in it. |
| Context window | The most text an AI can see at once. The more that's always loaded, the less room is left for the actual work. |
| Token | The unit an AI uses to measure text length. More words means more tokens. |

## When a Skill Is Worth Writing

The Claude Code docs give a practical test: write a skill when you keep [pasting the same instructions, checklist, or multi-step procedure into chat](https://code.claude.com/docs/en/skills), or when a section of `CLAUDE.md` has grown from a fact into a procedure.

The difference is when things load. `CLAUDE.md` is read into every conversation; a skill's body loads only when it's used, so, as the same page puts it, long reference material costs almost nothing until you need it. `AGENTS.md` is always loaded too, and every line of it has a cost, which [Part 6 of the series](/posts/mattpocock-skills-research-handoff/) covers.

There are also times you shouldn't bother. agentskills.io's [best practices](https://agentskills.io/skill-creation/best-practices) are blunt about it: if the agent already handles the whole task well without the skill, the skill may not be adding value. Anthropic's [authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) suggests building evaluations first: run the AI on a few representative tasks with no skill, write down exactly where it goes wrong, then write just enough instruction to close those gaps.

In my case, the AI already knows YAML and knows what Jekyll is. What it doesn't know are rules that only exist on this site, like "English titles max out at 70 characters" or "the cover caption can't start with 「封面：」 (Chinese for 'Cover:')". That's exactly the kind of gap a skill should fill.

General advice on writing documents for AI, such as how to phrase pointer sentences, putting common cases first, and cutting sentences that change nothing, is already covered in the [`writing-for-agents` section of Part 6](/posts/mattpocock-skills-research-handoff/). I won't repeat it here; this post sticks to the mechanics that are specific to skills.

## The Smallest Working Skill

Under the [Agent Skills specification](https://agentskills.io/specification), the smallest skill is a folder with one `SKILL.md` in it. Everything else is optional: `scripts/` for code the agent can run, `references/` for documents it reads when needed, and `assets/` for templates, images, and similar resources.

`SKILL.md` opens with YAML front matter, followed by a Markdown body. The minimum looks like this:

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

The spec defines just six fields:

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | 1–64 characters; lowercase letters, digits, and `-` only; can't start or end with `-`; no consecutive `--`; **must match the parent folder's name** |
| `description` | Yes | 1–1024 characters; says what the skill does and when to use it |
| `license` | No | A license name, or the name of a license file bundled with the skill |
| `compatibility` | No | 1–500 characters; environment requirements, such as system packages. The spec says most skills don't need it |
| `metadata` | No | A map from string keys to string values, for anything the spec doesn't define |
| `allowed-tools` | No | A space-separated list of pre-approved tools; **experimental**, and support varies by tool |

Individual tools add their own rules on top:

- **Anthropic's platform**: [`name` can't contain XML tags or the reserved words `anthropic` and `claude`; `description` can't contain XML tags](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure).
- **Claude Code**: [every field is optional](https://code.claude.com/docs/en/skills), and a missing `name` falls back to the folder name. A misspelled or unknown field is ignored without any error. If the YAML doesn't parse, the skill still loads, just with every field empty.
- **claude.ai uploads and the Skills API**: the same page says these paths accept only the spec's six fields, and one extra field is a hard error:

```text
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name
```

Put those three together and the trap is clear: a mistake in Claude Code goes unreported, and you only find out when you try to upload the same skill somewhere else. The safest habit is to **use only the spec's six fields**, which is also the basis for the cross-agent section later on.

## The Description Decides When It Runs

An agent doesn't read every skill when it starts. Under the spec's [progressive disclosure](https://agentskills.io/specification#progressive-disclosure), it first loads only each skill's `name` and `description`, and reads the full `SKILL.md` once a task looks like a match. agentskills.io's [guide to optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) puts it plainly: the description carries the entire burden of triggering.

The same guide points out something easy to miss: agents usually reach for a skill only when a task is beyond what they can do on their own. A simple one-step request like "read this PDF" may not trigger a PDF skill even when the description matches perfectly, because the agent can handle it with basic tools.

### Two Docs, Two Styles

The two official guides disagree on phrasing, so here they are side by side:

- **agentskills.io** ([optimization guide](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)): use imperative phrasing, written as an instruction to the agent ("Use this skill when..."); describe what the user is trying to achieve, not how the skill works inside; explicitly list the situations it applies to, including ones where the user never names the domain; keep it concise.
- **Anthropic** ([authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#writing-effective-descriptions)): always write in the third person, as in "Processes Excel files and generates reports", and avoid "I can help you..." or "You can use this to...". The reason given is that the description goes into the system prompt, and an inconsistent point of view can cause discovery problems.

They don't actually conflict. Both reject "I" and "you"; one prefers imperatives, the other the third person. My example uses both: the first sentence says what it does in the third person, the second lists situations with "Use this skill when...", and the last says when not to use it:

```yaml
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
```

That last "Do not use it for..." sentence has a source too: when queries that shouldn't trigger keep triggering, the optimization guide suggests spelling out what the skill does **not** do, to draw the line between it and nearby capabilities.

### Budget for Length

A description can be up to 1024 characters, but the usable space is usually smaller, because the list of every installed skill has to fit in the context window:

| Tool | List budget | When it overflows |
| --- | --- | --- |
| Claude Code | The whole listing gets 1% of the context window; each skill's `description` plus `when_to_use` is cut at 1,536 characters ([docs](https://code.claude.com/docs/en/skills)) | Descriptions are dropped, starting with the skills you invoke least |
| Codex | The initial list uses at most 2% of the context window, or 8,000 characters when the window size is unknown ([docs](https://learn.chatgpt.com/docs/build-skills)) | Descriptions are shortened first; with many skills, some may be left out with a warning |

Both say to **put the key use case first**, so the most important words survive a cut. My description is 484 characters, and its three parts are ordered with that in mind.

## One Skill, One Job

[agentskills.io](https://agentskills.io/skill-creation/best-practices#design-coherent-units) compares a skill to a function: it should be one coherent unit of work. Scope it too narrowly and a single task has to load several skills whose instructions may conflict; scope it too broadly and it gets hard to trigger precisely. The Codex docs say it in one line: [Keep each skill focused on one job](https://learn.chatgpt.com/docs/build-skills#best-practices).

My example does one thing: check a post's front matter and fix it until it passes. Translation, cover images, and typos in the body are out of scope.

On naming, Anthropic [recommends the gerund form](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#naming-conventions), like `processing-pdfs`, accepts noun phrases like `pdf-processing`, and says to avoid vague names like `helper` or `utils`. Hence `checking-post-front-matter`.

### Who Can Start It

Some skills shouldn't run whenever the AI decides they fit. Each tool has its own switch:

| Tool | Setting | Effect |
| --- | --- | --- |
| Claude Code | `disable-model-invocation: true` | Claude won't start it on its own; you run it by typing `/name` ([docs](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)) |
| Claude Code | `user-invocable: false` | You can't run it with `/name`; only Claude can start it |
| Cursor | `disable-model-invocation: true` | Loaded only when you explicitly type `/skill-name` ([docs](https://cursor.com/docs/skills#disabling-automatic-invocation)) |
| Codex | `policy.allow_implicit_invocation: false` in `agents/openai.yaml` | Not started implicitly from your prompt; explicit `$skill` still works ([docs](https://learn.chatgpt.com/docs/build-skills#optional-metadata)) |

The Claude Code docs suggest manual-only for workflows with side effects or timing you want to control, such as `/commit` or `/deploy`: you don't want Claude deciding to deploy because your code looks ready. For a real example, see [`implement` in Part 4 of the series](/posts/mattpocock-skills-implementation-feedback-loops/), which sets both the Claude Code and the Codex switch.

There's a trade-off to watch here. `disable-model-invocation` and `user-invocable` aren't among the spec's six fields. Put them in `SKILL.md` and they work in Claude Code and Cursor, but claude.ai uploads and the Skills API reject them, and the `skills-ref` check later in this post flags them too. Codex keeps the same setting in a separate file, `agents/openai.yaml`, so `SKILL.md` itself can stay spec-only. My example only reads files and never changes anything, so letting the AI decide when to use it carries no risk, and I set neither switch.

## Move Details Into References and Scripts

![Progressive disclosure in three layers: name and description load at startup, the SKILL.md body loads when triggered, and reference files and scripts are used only when needed](progressive-disclosure.en.png){: width="800" height="450" }
_One skill loads in three layers: each layer is bigger than the one above it, and enters the context window later._

The [spec](https://agentskills.io/specification#progressive-disclosure) splits a skill into three layers:

1. **Metadata** (about 100 tokens): `name` and `description`, loaded at startup for every skill.
2. **Instructions** (under 5000 tokens recommended): the full `SKILL.md` body, read when the skill is activated.
3. **Resources**: files in `scripts/`, `references/`, and `assets/`, loaded only when needed.

The spec also recommends keeping the main `SKILL.md` under 500 lines and file references one level deep. Anthropic's authoring guide explains why: when Claude meets a reference inside a referenced file, it [may preview it with something like `head -100`](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-deeply-nested-references) instead of reading the whole thing, and end up with incomplete information. So link every reference file straight from `SKILL.md`, and give any reference file over 100 lines a table of contents at the top.

Splitting files isn't enough on its own; you also have to say **when** to read each one. agentskills.io's example is "[Read `references/api-errors.md` if the API returns a non-200 status code](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)", which is far more useful than "see references/ for details". Here's how my example does it:

```markdown
Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.
```

### Scripts Are Meant to Be Run

The big difference between scripts and reference files: according to [Anthropic's overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#level-3-resources-and-code-loaded-as-needed), scripts run through bash, the code never enters the context, and only the output costs tokens. The authoring guide adds that your instructions should [make clear whether to run a script or read it as reference](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#provide-utility-scripts).

If a rule can be checked by code, don't ask the AI to judge it from prose. My example puts all eight rules in a script, and `SKILL.md` only tells the AI how to run it and read the result. The script follows [agentskills.io's guide to scripts](https://agentskills.io/skill-creation/using-scripts#designing-scripts-for-agentic-use):

| What the guide asks for | What the example does |
| --- | --- |
| No interactive prompts (agents run in non-interactive shells, and a script waiting for input hangs) | All input comes from arguments; with no path, it prints an error and exits |
| A `--help` option | `--help` lists the options, output format, exit codes, and examples |
| Error messages that say what went wrong and what to try | For example, `--now needs a UTC offset, e.g. +08:00` |
| Data on stdout, diagnostics on stderr | The result is one JSON object; "now checking file X" goes to stderr |
| Meaningful exit codes, documented in `--help` | 0 passed, 1 problems found, 2 usage error |
| Predictable output size | Only files with problems are listed by default; `--all` lists everything |

The actual `--help` output:

```console
$ python3 scripts/check_front_matter.py --help
Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language is taken from the path: _posts/en/ -> en, _posts/zh-CN/ -> zh-CN,
anything else -> zh-TW. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
```

### State Your Dependencies

The scripts guide also says to [state prerequisites in `SKILL.md`](https://agentskills.io/skill-creation/using-scripts#one-off-commands) instead of assuming the agent's environment has them, and to use the `compatibility` field for runtime-level requirements. Pin versions in one-off commands, for example `npx eslint@9.0.0`. Anthropic's authoring guide has a whole section titled "[Avoid assuming tools are installed](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-assuming-tools-are-installed)".

On the machine where I ran the example, `python3` has no PyYAML, so the script uses only the standard library and parses just the fields it needs. That limit is written into `compatibility` and the Gotchas. If you switch to PyYAML, declare it inside the script with [PEP 723](https://peps.python.org/pep-0723/) and say in `SKILL.md` how to run it.

## Build It: A Front Matter Checker Skill

The full layout of the example:

```console
$ find checking-post-front-matter -type f | sort
checking-post-front-matter/SKILL.md
checking-post-front-matter/evals/evals.json
checking-post-front-matter/evals/files/2026-10-01-bad-zh.md
checking-post-front-matter/evals/files/en/2026-10-01-bad-en.md
checking-post-front-matter/evals/files/en/2026-10-01-good-en.md
checking-post-front-matter/evals/trigger-queries.json
checking-post-front-matter/references/site-rules.md
checking-post-front-matter/scripts/check_front_matter.py
```

`evals/` holds the test files used in the testing section. Here is every file in full.

### SKILL.md

````markdown
---
name: checking-post-front-matter
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
compatibility: Requires python3 (tested with 3.13). Standard library only, no PyYAML.
metadata:
  version: "1.0"
---

# Checking Post Front Matter

## Steps

1. Run the checker on the files you changed, from the skill directory:
   `python3 scripts/check_front_matter.py <post file or directory> ...`
   For a new post, pass all three language files (`_posts/`, `_posts/zh-CN/`, `_posts/en/`).
2. Read the JSON on stdout. Exit code 0 means every file passed, 1 means
   at least one problem, 2 means the command itself was wrong (see stderr).
3. Fix each problem in the post, then run the checker again. Stop only when
   it exits 0.
4. Tell the user which files you checked and what you changed. If you
   shortened a title or description, show the old and new text.

Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.

## Gotchas

- The script uses only the Python standard library, so it parses a small
  subset of YAML: one-line `key: value` pairs, `image:` with indented
  `path` / `alt`, and `categories` as `[a, b]` or a `- item` list. A block
  scalar (`|` or `>`) is reported as a `yaml` problem. Rewrite that value
  on one line instead of installing PyYAML.
- Language comes from the path: `_posts/en/` is English, `_posts/zh-CN/` is
  Simplified Chinese, everything else is Traditional Chinese. Use `--lang`
  for files outside `_posts/`.
- `date-future` compares with the machine clock. Jekyll skips future posts
  at build time, so do not "fix" it by building with `--future`; move the
  date to a time that has already passed.
- Lengths count Unicode characters (Python `len`), so one Chinese character
  counts as 1.
- The checker never edits files. Make the fixes yourself.
````

There are only four steps, and step 3 is what agentskills.io calls a [validation loop](https://agentskills.io/skill-creation/best-practices#validation-loops): run the check, fix what it finds, run it again, and stop only when it passes.

agentskills.io calls the gotchas list [the highest-value content in many skills](https://agentskills.io/skill-creation/best-practices#gotchas-sections): not general advice, but concrete facts the AI will get wrong unless told. The one about not "fixing" a future date with `--future` comes from this site's previous post, the series guide: its date was set later than the build time, and Jekyll quietly skipped the post.

### references/site-rules.md

```markdown
# Site Rules Behind Each Check

Each `rule` in the checker's output maps to one rule below.

| rule | What it enforces | Why |
| --- | --- | --- |
| `required` | `title`, `description` and `date` exist and are not empty | Chirpy uses them for the post page, home cards and SEO metadata |
| `length` | English `title` ≤ 70 characters, `description` ≤ 160 | Longer text gets cut off in search results and cards |
| `date-format` | `YYYY-MM-DD HH:MM:SS +0800` (any `+/-HHMM` offset) | Writing the offset keeps the publish day the same on every machine and in CI |
| `date-future` | `date` is not later than now | Jekyll does not build posts dated in the future |
| `categories` | At most 2 entries | Chirpy's category hierarchy has two levels |
| `alt` | `image.alt` exists; Chinese ≤ 60 characters, English ≤ 140; does not start with 「封面：」 or 「本文」; differs from `description` | Chirpy uses the alt as the cover's alt text, the caption under the cover and the home card's alt text, so it should be a one-sentence summary of the post |
| `yaml` | The value could be read by the checker's YAML subset | See the Gotchas in SKILL.md |
| `front-matter` | The file starts with a `---` block and closes it | Without it, Jekyll treats the file as having no front matter |

Source: the repo's `docs/chirpy-post-authoring.md`.
```

### scripts/check_front_matter.py

```python
#!/usr/bin/env python3
"""Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language is taken from the path: _posts/en/ -> en, _posts/zh-CN/ -> zh-CN,
anything else -> zh-TW. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

LIMITS = {"en": {"title": 70, "description": 160, "alt": 140},
          "zh-TW": {"alt": 60}, "zh-CN": {"alt": 60}}
BAD_ALT_PREFIXES = ("封面：", "封面:", "本文")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$")


class UsageError(Exception):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise UsageError(f"{message}; run with --help to see the options")


def unquote(raw):
    """Return the scalar value of a one-line YAML value (subset only)."""
    v = raw.strip()
    if not v:
        return ""
    if v[0] == '"':
        end = v.rfind('"')
        if end == 0:
            raise ValueError("unclosed double quote")
        return json.loads(v[: end + 1])  # YAML double quotes ~ JSON escapes
    if v[0] == "'":
        end = v.rfind("'")
        if end == 0:
            raise ValueError("unclosed single quote")
        return v[1:end].replace("''", "'")
    if v[0] in "|>":
        raise ValueError("block scalars (| or >) are not supported")
    return re.sub(r"\s+#.*$", "", v)


def parse_list(raw):
    v = raw.strip()
    if not (v.startswith("[") and v.endswith("]")):
        return None
    inner = v[1:-1].strip()
    return [unquote(x) for x in inner.split(",")] if inner else []


def read_front_matter(text):
    """Parse the keys this checker needs. Returns (fields, problems)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, [("front-matter", "", "file does not start with a --- line")]
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return None, [("front-matter", "", "no closing --- line")]
    fields, problems, parent = {}, [], None
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"^(\s*)([A-Za-z_][\w-]*):(.*)$", line)
        if not m:
            if parent == "categories" and line.strip().startswith("- "):
                fields["categories"].append(unquote(line.strip()[2:]))
            continue
        indent, key, value = m.groups()
        key = key if not indent else f"{parent}.{key}"
        if not indent:
            parent = key
        try:
            if key == "categories":
                lst = parse_list(value)
                fields[key] = lst if lst is not None else []
            elif value.strip():
                fields[key] = unquote(value)
        except ValueError as e:
            problems.append(("yaml", key, f"line {n}: {e}"))
    return fields, problems


def lang_of(path, forced):
    if forced:
        return forced
    parts = path.resolve().parts
    if "en" in parts:
        return "en"
    if "zh-CN" in parts:
        return "zh-CN"
    return "zh-TW"


def check(path, lang, now):
    probs = []
    fields, parse_probs = read_front_matter(path.read_text(encoding="utf-8"))
    probs += parse_probs
    if fields is None:
        return probs
    for key in ("title", "description", "date"):
        if not fields.get(key):
            probs.append(("required", key, f"'{key}' is missing or empty"))
    lim = LIMITS[lang]
    for key in ("title", "description"):
        if key in lim and fields.get(key) and len(fields[key]) > lim[key]:
            probs.append(("length", key,
                          f"{len(fields[key])} characters, limit is {lim[key]} for {lang}"))
    date = fields.get("date")
    if date:
        m = DATE_RE.match(date)
        if not m:
            probs.append(("date-format", "date",
                          f"'{date}' must look like YYYY-MM-DD HH:MM:SS +0800"))
        else:
            when = datetime.strptime(date, "%Y-%m-%d %H:%M:%S %z")
            if when > now:
                probs.append(("date-future", "date",
                              f"{date} is later than {now.isoformat(timespec='seconds')}; "
                              "Jekyll skips future posts at build time"))
    cats = fields.get("categories")
    if cats is not None and len(cats) > 2:
        probs.append(("categories", "categories",
                      f"{len(cats)} levels, Chirpy supports at most 2"))
    alt = fields.get("image.alt")
    if not alt:
        probs.append(("alt", "image.alt", "'image.alt' is missing or empty"))
    else:
        if len(alt) > lim["alt"]:
            probs.append(("alt", "image.alt",
                          f"{len(alt)} characters, limit is {lim['alt']} for {lang}"))
        if alt.startswith(BAD_ALT_PREFIXES):
            probs.append(("alt", "image.alt",
                          "must not start with 「封面：」 or 「本文」; write a one-sentence summary"))
        if alt == fields.get("description"):
            probs.append(("alt", "image.alt", "is identical to 'description'"))
    return probs


def main(argv):
    ap = Parser(add_help=False)
    ap.add_argument("-h", "--help", action="store_true")
    ap.add_argument("--lang", choices=sorted(LIMITS))
    ap.add_argument("--now")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("paths", nargs="*")
    args = ap.parse_args(argv)
    if args.help:
        print(__doc__.strip())
        return 0
    if not args.paths:
        raise UsageError("give at least one post file or directory, "
                         "e.g. python3 scripts/check_front_matter.py _posts/en")
    try:
        now = (datetime.fromisoformat(args.now) if args.now
               else datetime.now().astimezone())
    except ValueError:
        raise UsageError(f"--now must be an ISO time such as "
                         f"2026-10-17T23:00:00+08:00, got '{args.now}'")
    if now.tzinfo is None:
        raise UsageError("--now needs a UTC offset, e.g. +08:00")
    files = []
    for p in map(Path, args.paths):
        if p.is_dir():
            files += sorted(p.rglob("*.md"))
        elif p.is_file():
            files.append(p)
        else:
            raise UsageError(f"path not found: {p}")
    if not files:
        raise UsageError("no .md files found in the given paths")
    results, failed = [], 0
    for f in files:
        lang = lang_of(f, args.lang)
        print(f"checking {f} as {lang}", file=sys.stderr)
        probs = check(f, lang, now)
        failed += bool(probs)
        if probs or args.all:
            results.append({"file": str(f), "lang": lang, "ok": not probs,
                            "problems": [{"rule": r, "field": k, "message": m}
                                         for r, k, m in probs]})
    print(json.dumps({"checked": len(files), "failed": failed, "results": results},
                     ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except UsageError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
```

### Run It Once

Here it is against the three test files in `evals/files/`, two broken on purpose and one correct:

```console
$ python3 scripts/check_front_matter.py evals/files
checking evals/files/2026-10-01-bad-zh.md as zh-TW
checking evals/files/en/2026-10-01-bad-en.md as en
checking evals/files/en/2026-10-01-good-en.md as en
{
  "checked": 3,
  "failed": 2,
  "results": [
    {
      "file": "evals/files/2026-10-01-bad-zh.md",
      "lang": "zh-TW",
      "ok": false,
      "problems": [
        {
          "rule": "date-future",
          "field": "date",
          "message": "2030-01-01 09:00:00 +0800 is later than 2026-10-17T23:08:22+08:00; Jekyll skips future posts at build time"
        },
        {
          "rule": "categories",
          "field": "categories",
          "message": "3 levels, Chirpy supports at most 2"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "must not start with 「封面：」 or 「本文」; write a one-sentence summary"
        }
      ]
    },
    {
      "file": "evals/files/en/2026-10-01-bad-en.md",
      "lang": "en",
      "ok": false,
      "problems": [
        {
          "rule": "length",
          "field": "title",
          "message": "83 characters, limit is 70 for en"
        },
        {
          "rule": "length",
          "field": "description",
          "message": "169 characters, limit is 160 for en"
        },
        {
          "rule": "date-format",
          "field": "date",
          "message": "'2026-10-01 09:00:00' must look like YYYY-MM-DD HH:MM:SS +0800"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "'image.alt' is missing or empty"
        }
      ]
    }
  ]
}
```

The exit code is 1. The first three lines are progress notes on stderr; the JSON after them is stdout. The correct file isn't in `results` because only files with problems are listed by default. A usage error exits with 2:

```console
$ python3 scripts/check_front_matter.py evals/files/nope.md
Error: path not found: evals/files/nope.md
```

Then I ran it on all 36 post files on this site's main branch (commit `636e148`). Ten of the 36 failed:

- Nine files, the three language versions of three posts, have no `image` block at all, so each is flagged for a missing `image.alt`.
- Two English files have titles over 70 characters: the OpenWiki post at 72 and the supply-chain security post at 79.

I've recorded these but didn't fix them as part of this post.

One bonus: when I ran it on this very post's three language files, it stopped me on the first try. I had set the date to 23:20, the check ran at 23:18, and all three files got `date-future`. Had I just built the site, this post wouldn't have shown up.

## Test in Three Layers

![Three layers of testing: format checks validate the fields with skills-ref, trigger tests use about 20 queries to see whether the skill gets picked, and output checks compare results with and without the skill](three-layer-tests.en.png){: width="800" height="450" }
_Each layer tests one thing: is the format right, does it get picked, and does it do the job once picked._

### Format Checks

The spec points to [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref) for validating frontmatter. One caveat up front: its README says it is **intended for demonstration purposes only** and **not meant to be used in production**. It's a reference implementation, not a finished product.

I installed it from a fixed commit:

```console
$ git clone -q https://github.com/agentskills/agentskills.git && cd agentskills && git checkout -q 69ef37e9424c0a7ea9dd2293b559e43ec8176379 && git log -1 --format='%h %cs'
69ef37e 2026-08-09
$ python3 -m venv .venv && .venv/bin/pip install -q -e skills-ref && .venv/bin/skills-ref --version
skills-ref, version 0.1.0
```

Validating the example skill prints one line and exits with 0:

```console
$ skills-ref validate checking-post-front-matter
Valid skill: checking-post-front-matter
```

Then I made three broken copies and ran each one. All three exit with 1.

A name with consecutive `--`:

```console
$ skills-ref validate bad--name
Validation failed for bad--name:
  - Skill name cannot contain consecutive hyphens
```

A folder name that doesn't match `name`:

```console
$ skills-ref validate check-front-matter
Validation failed for check-front-matter:
  - Directory name 'check-front-matter' must match skill name 'checking-post-front-matter'
```

An added Claude Code–only field, `when_to_use`:

```console
$ skills-ref validate checking-post-front-matter
Validation failed for checking-post-front-matter:
  - Unexpected fields in frontmatter: when_to_use. Only ['allowed-tools', 'compatibility', 'description', 'license', 'metadata', 'name'] are allowed.
```

The last one is the one to remember: a field that's perfectly valid in Claude Code is an error in skills-ref. That's why I said earlier to stick to the six fields.

Claude Code also has `claude plugin validate <skills directory>`, which finds `SKILL.md` files whose frontmatter doesn't parse. It [requires v2.1.233 or later](https://code.claude.com/docs/en/skills). Claude Code isn't installed on my machine, so I didn't run it.

### Trigger Tests

A valid format doesn't mean the skill gets picked at the right moment. agentskills.io's [optimization guide](https://agentskills.io/skill-creation/optimizing-descriptions#designing-trigger-eval-queries) suggests testing it like this:

- Write about 20 queries: 8–10 that **should** trigger and 8–10 that **shouldn't**.
- Make the "shouldn't" queries near-misses that share words with the skill but need something else. Something obviously unrelated, like "write a fibonacci function", tests nothing.
- Run each query 3 times and compute a trigger rate, with 0.5 as a reasonable default threshold.
- Split the queries into a train set (about 60%) and a validation set (about 40%). Change the description based only on train-set failures, and use the validation set only to check whether the change generalizes, so the description doesn't overfit those exact phrasings.
- Five rounds is usually enough. If nothing improves, the problem may be the queries themselves.

The Claude Code docs use [the same idea](https://code.claude.com/docs/en/skills#evaluate-and-iterate-on-a-skill): run the same prompts in fresh sessions with the skill on and with it off, and compare. Fresh sessions matter, because leftover context from writing the skill hides gaps in the written instructions.

I wrote 20 queries for the example: 10 should trigger and 10 shouldn't, 12 in the train set and 8 in validation, with each set split evenly between the two kinds. Many are in Chinese; the set mixes both languages on purpose. `split` is a field I added to keep the split fixed; the guide's example format has only `query` and `should_trigger`:

```json
[
  { "query": "我剛寫完 _posts/en/2026-10-20-new-post.md，開 PR 前幫我確認 front matter 都沒問題", "should_trigger": true, "split": "train" },
  { "query": "is my english title too long? its the one in _posts/en/2026-10-18-agent-skills.md", "should_trigger": true, "split": "train" },
  { "query": "我把三語的 description 都改短了，幫我看看還有沒有超過限制", "should_trigger": true, "split": "train" },
  { "query": "Build passed locally but my new post doesn't show up on the site. The date is 2026-10-17 23:40:00 +0800, what's wrong?", "should_trigger": true, "split": "train" },
  { "query": "封面下面那行字要怎麼寫才對？幫我檢查 _posts/zh-CN/ 這篇的 alt", "should_trigger": true, "split": "train" },
  { "query": "Before I open the PR for the agent-skill post, run whatever checks the site needs on the three post files", "should_trigger": true, "split": "train" },
  { "query": "幫我把這篇文章的分類改成 [AI, skills, 教學]，改完確認一下格式", "should_trigger": true, "split": "validation" },
  { "query": "I edited the title and image alt on yesterday's post, can you make sure I didn't break any of our rules", "should_trigger": true, "split": "validation" },
  { "query": "review the metadata block at the top of _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md", "should_trigger": true, "split": "validation" },
  { "query": "新文章三個語言版本都寫好了，PR 前最後檢查一下標題長度跟日期", "should_trigger": true, "split": "validation" },
  { "query": "幫我修正 _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md 第 40 行的錯字", "should_trigger": false, "split": "train" },
  { "query": "what's the difference between a YAML block scalar with | and >?", "should_trigger": false, "split": "train" },
  { "query": "我的 _config.yml 縮排好像錯了，jekyll build 報 YAML 錯誤", "should_trigger": false, "split": "train" },
  { "query": "Can you translate this zh-TW post into English and put it under _posts/en/?", "should_trigger": false, "split": "train" },
  { "query": "幫我寫一個 GitHub Actions workflow，每次 push 都跑 jekyll build 和 htmlproofer", "should_trigger": false, "split": "train" },
  { "query": "the cover image looks blurry on the home page, can you regenerate it at 2x?", "should_trigger": false, "split": "train" },
  { "query": "Check the front matter of this Hugo post: content/posts/hello.md uses TOML between +++ lines", "should_trigger": false, "split": "validation" },
  { "query": "幫我想三個比較吸引人的英文標題，主題是自己寫 Agent Skill", "should_trigger": false, "split": "validation" },
  { "query": "Our SKILL.md frontmatter fails skills-ref validate, can you see why?", "should_trigger": false, "split": "validation" },
  { "query": "Chirpy 的 tags 和 categories 差在哪？解釋就好，不用動任何檔案", "should_trigger": false, "split": "validation" }
]
```

A few of the near-misses are worth explaining. "Fix the typo on line 40" (the first `false` query) touches the same post but only its body. "Check the front matter of this Hugo post" uses the same term, but the format is TOML and outside the skill's scope. "Our SKILL.md frontmatter fails skills-ref validate" even shares the word frontmatter, but what it needs is skills-ref.

> **Trigger rates were not run for this post.** A trigger test has to run in a real agent, so you can see whether it read `SKILL.md`. The machine I used has none of the `claude`, `codex`, `cursor-agent`, `gemini`, or `copilot` CLIs (I checked with `command -v`), so this section gives the queries and the method, but no trigger-rate numbers. You can take this JSON to your own agent and run it the way the guide describes.
{: .prompt-warning }

### Output Checks

Once picked, the skill still has to do the job right. agentskills.io's [guide to evaluating output](https://agentskills.io/skill-creation/evaluating-skills) suggests keeping test cases in `evals/evals.json`. Each case has a realistic `prompt`, an `expected_output` describing success, and any input `files`; objective `assertions` get added after you've seen a first round of results. The guide suggests starting with 2–3 cases:

```json
{
  "skill_name": "checking-post-front-matter",
  "evals": [
    {
      "id": 1,
      "prompt": "I just wrote evals/files/en/2026-10-01-bad-en.md. Can you check whether its front matter is OK before I open a PR, and tell me what to fix?",
      "expected_output": "A list of every front matter problem in the file (title and description too long, date without a UTC offset, missing image.alt), each with a concrete fix.",
      "files": ["evals/files/en/2026-10-01-bad-en.md"],
      "assertions": [
        "The response says the title is longer than 70 characters",
        "The response says the description is longer than 160 characters",
        "The response says the date has no +0800-style offset",
        "The response says image.alt is missing",
        "The response does not claim the file passes"
      ]
    },
    {
      "id": 2,
      "prompt": "幫我看一下 evals/files/2026-10-01-bad-zh.md 的封面圖說和日期有沒有問題，我覺得怪怪的",
      "expected_output": "指出 alt 以「封面：」開頭、日期在未來會被 Jekyll 跳過、categories 超過兩層，並建議怎麼改。",
      "files": ["evals/files/2026-10-01-bad-zh.md"],
      "assertions": [
        "The response says image.alt must not start with 「封面：」",
        "The response says the 2030 date is in the future and the post would be skipped at build time",
        "The response says categories has 3 levels and the limit is 2",
        "The response does not suggest building with --future as the fix"
      ]
    },
    {
      "id": 3,
      "prompt": "Quick sanity check on evals/files/en/2026-10-01-good-en.md before I push, nothing fancy",
      "expected_output": "A short confirmation that the file has no front matter problems, without inventing issues.",
      "files": ["evals/files/en/2026-10-01-good-en.md"],
      "assertions": [
        "The response says the file passes",
        "The response does not list any front matter problem",
        "No file was modified"
      ]
    }
  ]
}
```

Each case runs twice, once with the skill and once without it (or with the previous version when you're revising), and every run starts from a clean context. Assertions should be objectively checkable: "the output file is valid JSON" beats "the output is good". The guide also notes that mechanical checks are more reliable as scripts than as LLM judgment. In this example, case 3's "No file was modified" can be checked with `git status` instead of asking an AI to grade it.

Anthropic's authoring guide adds one more point: a skill's effect depends on the model, so [test it with all the models you plan to use it with](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#test-with-all-models-you-plan-to-use).

> **Output evals were not run for this post.** Same reason as the trigger tests: no agent was available, so there are no with-skill and without-skill results to compare. The `evals.json` above is a set of written test cases only.
{: .prompt-warning }

Even unrun, those three cases caught a mistake, though the mistake was in a test file, not the script. On my first run, the deliberately broken English test file's description was only 156 characters. The script was right not to flag it, but `evals.json` expected it to be over 160. When a result doesn't match the expectation, check the test as well as the skill. The output guide says the same: [review the assertions themselves](https://agentskills.io/skill-creation/evaluating-skills#grading-principles), not just the results.

## Does It Work in Another Agent?

Agent Skills is an open standard. Tools with official docs on their support include Claude Code, Codex, Cursor, and GitHub Copilot, and agentskills.io's [Client Showcase](https://agentskills.io/clients) lists more. Here's where those four look for skills:

| Tool | Project | Personal |
| --- | --- | --- |
| Claude Code ([docs](https://code.claude.com/docs/en/skills#where-skills-live)) | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| Codex ([docs](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)) | `.agents/skills` in every directory from the current working directory up to the repo root | `$HOME/.agents/skills`; plus `/etc/codex/skills` at the admin level |
| Cursor ([docs](https://cursor.com/docs/skills#skill-directories)) | `.agents/skills/`, `.cursor/skills/`; for compatibility, also `.claude/skills/` and `.codex/skills/` | `~/.agents/skills/`, `~/.cursor/skills/`; for compatibility, also `~/.claude/skills/` and `~/.codex/skills/` |
| GitHub Copilot ([docs](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)) | `.github/skills`, `.claude/skills`, `.agents/skills` | `~/.copilot/skills`, `~/.agents/skills` |

One inference from this table (mine, not something any of the docs say): as of the October 17, 2026 docs, `.agents/skills/` appears in the Codex, Cursor, and Copilot lists, but the Claude Code docs don't list it. Going the other way, `.claude/skills/` covers Claude Code, Cursor, and Copilot, but not Codex. In other words, **no single path is read by all four**.

### What Static Checks the Example Passed

I haven't run this skill in any agent, so I can't say it's been tested in any of them. What I could do is a static portability check, which looks only at the files without running an agent:

| Check | Result |
| --- | --- |
| Front matter uses only the spec's six fields | Yes: `name`, `description`, `compatibility`, `metadata`; `skills-ref validate` passes |
| `name` is present and matches the folder name | Yes. The Codex docs say `SKILL.md` must include `name` and `description`; Cursor also requires `name` to match the folder |
| No tool-specific body syntax | Yes. No Claude Code `` !`command` `` injection and no `${CLAUDE_SKILL_DIR}`; script paths are relative to the skill root, as the [scripts guide](https://agentskills.io/skill-creation/using-scripts#referencing-scripts-from-skill-md) recommends |

That last row needs a word of explanation. In Claude Code, `` !`command` `` runs a command before Claude sees the skill and puts the output into the body, and `${CLAUDE_SKILL_DIR}` is replaced with the skill's folder. The Claude Code docs say that Claude Code–only body features, with dynamic injection as the example, [don't work in claude.ai chat or through the API](https://code.claude.com/docs/en/skills). I found no docs on how other tools handle them, so the honest statement is: **don't assume they work**.

## Versioning and Maintenance

On versions, the spec only lets you put something like `version: "1.0"` in `metadata`, and it doesn't define what a version number means. Managing versions with git tags or a CHANGELOG is a convention, not part of the spec. My suggestion: whenever you change the description or what a script does, tag it and write a one-line note.

For the revision itself, the output guide has a practical routine: [snapshot the old version before editing](https://agentskills.io/skill-creation/evaluating-skills#spawning-runs), use it as the baseline (saved under `old_skill/`), and rerun the same cases. That's how you tell whether the new version is actually better or just wrong in a different way.

Three more maintenance habits:

- **Don't write things that will go stale.** Anthropic's authoring guide suggests moving retired approaches into [an "old patterns" section](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-time-sensitive-information) instead of mixing them into the main steps.
- **Every time you correct the AI, add a gotcha.** agentskills.io calls this [one of the most direct ways to improve a skill](https://agentskills.io/skill-creation/best-practices#gotchas-sections).
- **Prune skills you don't use.** Every skill takes part of the list budget described earlier, whether it's used or not. Claude Code's `/skill-doctor` shows what each skill costs and how often it's used, and [requires v2.1.252 or later](https://code.claude.com/docs/en/skills#find-unused-skills).

## Security Work the Author Owns

The risks of installing someone else's skill, and how users should check one, are covered in [the supply-chain security post](/posts/coding-agent-supply-chain-permission-risks/). Here I'll stick to what the person writing the skill can do up front:

- **Don't have the skill fetch instructions from external URLs.** Anthropic's docs say [skills that fetch data from external URLs pose particular risk](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#security-considerations), since the fetched content may contain malicious instructions, and even a trustworthy skill can be compromised if its external dependencies change.
- **Keep `allowed-tools` to the minimum.** In Claude Code, this field lets the skill use the listed tools without asking during the turn it's invoked. The docs specifically say [workspace trust doesn't gate this field](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill): a skill in a repo can grant itself tools, even in a `-p` run in a folder you've never trusted. The example doesn't use the field.
- **Keep secrets out of scripts.** This is my own practice, not a rule from any doc: keys and tokens come from environment variables and never go into any file in the skill, because the whole folder gets shared and committed.
- **Pin your dependencies.** The scripts guide says to [pin versions in one-off commands](https://agentskills.io/skill-creation/using-scripts#one-off-commands) so the same command behaves the same way over time.
- **Offer `--dry-run` for anything that changes things.** The scripts guide suggests letting the agent [preview what a destructive or stateful operation will do](https://agentskills.io/skill-creation/using-scripts#further-considerations). The example's script only reads files and never writes any, so it doesn't need one.

Users will review your skill the way they'd review any software. The best you can do is make that review easy: few files, scripts whose purpose is obvious at a glance, and nothing that reaches outside.

## My Take

What follows is my opinion, not a conclusion from any of the docs.

**The description and the gotchas deserve the most time.** Folder layout and field rules you get right once by following the spec, and `skills-ref` catches the mistakes. What really decides whether a skill is useful is whether it gets picked at the right moment, and whether, once picked, it avoids the traps you already knew about.

**If a rule can be a script, make it a script.** If the example's eight rules were prose, the AI would count characters itself and could miscount every time. As a script, the result is the same every run, and the AI only has to read it and fix the post.

**For cross-agent use, give up a few convenient fields.** `when_to_use` and `disable-model-invocation` are handy in Claude Code, but put them in `SKILL.md` and the skill fails skills-ref and claude.ai uploads. For a skill only you use in Claude Code, that's fine. For one your team uses across tools, I'd stick to the six fields.

**A description that hasn't been trigger-tested is a guess.** That includes this post's example. I wrote 20 queries, but until they're run, I don't know whether the skill gets picked when someone asks me to check a title's length.

## Further Reading

Spec and methods (agentskills.io):

- [Specification](https://agentskills.io/specification): folder layout, the six fields, progressive disclosure
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices): scope, gotchas, validation loops
- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions): writing descriptions and testing triggers
- [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills): `evals.json` and with/without-skill comparisons
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts): designing script interfaces
- [Client Showcase](https://agentskills.io/clients): products that support Agent Skills
- [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref): the validator (for demonstration)

Tool docs:

- Anthropic: [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview), [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Claude Code: [Extend Claude with skills](https://code.claude.com/docs/en/skills)
- Codex: [Build skills](https://learn.chatgpt.com/docs/build-skills)
- Cursor: [Agent Skills](https://cursor.com/docs/skills)
- GitHub Copilot: [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

Related posts on this site:

- [mattpocock/skills series guide](/posts/mattpocock-skills-series-guide/): if you'd rather start with ready-made skills
- [Part 6 of the series](/posts/mattpocock-skills-research-handoff/): the `writing-for-agents` writing principles
- [Part 4 of the series](/posts/mattpocock-skills-implementation-feedback-loops/): a real manual-only skill
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): risks and a checklist from the user's side
