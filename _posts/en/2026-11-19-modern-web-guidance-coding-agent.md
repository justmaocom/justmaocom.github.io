---
title: "Modern Web Guidance Hands-On: Agents Fix Legacy Web Code"
description: "Hands-on with Modern Web Guidance 1.0.1: install the agent skill, run legacy-scan, have Claude Code or Codex fix legacy HTML, CSS and JS, and verify in Chrome."
date: 2026-11-19 17:00:00 +0800
categories: [AI, skills]
tags: [modern-web-guidance, agent-skills, coding-agent, claude-code, codex, web-platform]
media_subpath: /assets/img/posts/modern-web-guidance-coding-agent/
image:
  path: cover.en.webp
  alt: "A sketchnote of a robot inspecting an old form, arrows to a checked new form: legacy-scan finds old patterns, apply the guides, rescan: 0."
---

The Modern Web Guidance SKILL.md says near the top that "training weights contain obsolete patterns". Measuring `scrollHeight` in JavaScript to grow a textarea and checking click targets by hand to close a dialog are two examples. Browsers now have built-in ways to do both.

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) is a skill and command-line tool for coding agents. According to the [GitHub README](https://github.com/GoogleChrome/modern-web-guidance), it is maintained by the Google Chrome, Microsoft Edge, Mozilla Firefox, and MDN teams together with the community. Before writing web code, the agent looks up a guide. The guide tells it which HTML, CSS, or JavaScript feature to use, how widely browsers support it, and what to fall back to when they don't. There is also a `legacy-scan` command that finds outdated patterns in an existing project.

In this post I install it and try it out. I wrote a small guestbook page, scanned it with `legacy-scan`, had Claude Code fix it using the guides, and then compared the before and after versions in a browser.

> The official sources I checked are the [Modern Web Guidance docs](https://developer.chrome.com/docs/modern-web-guidance), the [1.0 announcement](https://developer.chrome.com/blog/modern-web-guidance-v1) (published 2026-11-10), [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow), and the README, SKILL.md, and CLI source inside the npm package version 1.0.1. I read them on 2026-11-19 and checked them again on 2026-11-20 when I updated this post. I ran the tests on 2026-11-19 (Taipei time) on macOS with Node.js 25.2.1, npm 11.6.2, and Claude Code 2.1.328 (model `claude-opus-5-5`). I used modern-web-guidance 1.0.1, which was tagged latest on npm that day. The `skills` package that the installer pulled in was 1.9.0. The terminal screenshots are the recorded output laid out as images. I removed only the color codes, the intermediate spinner frames, and the exit-code markers my recording script added. When I updated this post, I reran the same commands on a second machine. The output of `search`, `retrieve`, `skills-lock.json`, and both `legacy-scan` runs matched the first run, so those images use the rerun output. The `install` image keeps the first run's output because the detected agent name differs.
{: .prompt-info }

## How it works

Modern Web Guidance has two parts:

- The skill is a SKILL.md plus a `guides/` folder. After installing it into my project, I counted 210 Markdown files in `guides/`.
- The CLI is the npm package `modern-web-guidance`. Following SKILL.md, the agent runs `npx -y modern-web-guidance@latest search "<query>"` to find relevant guide IDs, then `retrieve <id>` to load the full guide into its context.

Whether the agent reaches for it depends on the description in SKILL.md. It says to run the tool first for every HTML, CSS, and client-side JavaScript task ("MANDATORY: Execute FIRST"), followed by a long list of trigger topics such as dialogs, tables, dark mode, form validation, and Core Web Vitals. I wrote about how a description affects triggering in [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/).

According to the How It Works section of the README, `search` uses a local embedding model and BM25. It makes no network calls and needs no API key.

According to the Modernization workflow docs, `legacy-scan` scans the project locally with fixed rules and does not call any model. It only covers guides that static rules can check. My scan output said 38 guides, about 20% of the total. Each finding comes with "Keep when" and "Drop when" conditions, and the agent uses them to decide whether the finding is a false positive. The same page also says there is no `--fix` flag. The scanner only finds problems, and the agent makes the changes.

The docs landing page says the public evaluation shows a 91% pass rate with the guides, versus about 51% for frontier models without them. The README has a table of individual runs. The Nov 8 row for `claude_code (opus-5-5)` goes from 57% to 88%. I took these numbers from the official pages on 2026-11-19 and didn't measure them myself. The two examples below are the only things I ran myself.

## Setup: turn off usage reporting and inspect the package

The CLI needs Node.js 22 or later (`engines` in `package.json`). Before starting, I set one environment variable in my shell:

```bash
export DISABLE_TELEMETRY=1
```

This turns off usage reporting. Reading the CLI source, I found that when `search`, `retrieve`, `legacy-scan`, or `install` runs, it starts a detached background process that sends usage data to `play.googleapis.com`. According to the Telemetry & Privacy section of the README, it collects install counts, the name of the calling agent, the IDs of retrieved guides, and the search queries the agent writes. It does not collect the user's original prompt. Setting `DISABLE_TELEMETRY=1` stops it. So although search matching happens locally, the queries themselves are sent to `play.googleapis.com` by default.

Before installing, I downloaded the package with `npm pack modern-web-guidance@1.0.1` and looked through it, the same way I described in [Claude Code Plugins: What to Check Before You Install One](/posts/claude-code-plugin-safe-install/). The 1.0.1 `package.json` has no `scripts`, so nothing runs at install time. The package has 281 files and is 17 MB unpacked. The search vectors take about 8.8 MB, the single-file bundle `legacy-scan.mjs` about 4.9 MB, and the guides about 1.9 MB. The `install` subcommand just runs:

```bash
npx -y skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance
```

`skills` is Vercel's skill installer. No version is specified, so you get whatever is latest on npm at that moment (1.9.0 for me). It fetches the skill from `GoogleChrome/modern-web-guidance` on GitHub. It doesn't copy from the package I downloaded with `npm pack`.

## Step 1: try search and retrieve without installing

The CLI works without installing anything. The official examples use `@latest`. I pinned `@1.0.1` so you can reproduce my output:

```bash
npx -y modern-web-guidance@1.0.1 search "submit on enter key"
npx -y modern-web-guidance@1.0.1 retrieve ime-safe-enter-submit | head -n 12
```

![Actual terminal output: search "submit on enter key" returns 10 entries with id and description, the first being ime-safe-enter-submit; retrieve ime-safe-enter-submit prints the start of the guide, which explains that IME users press Enter to confirm a candidate](term-search.webp){: w="1100" h="1199" }
_search returns JSON and retrieve prints the full guide. Only the first 12 lines are shown (actual output)._

`search` returned 10 results, each with an `id` and a `description`. The first one, `ime-safe-enter-submit`, was the one I wanted. SKILL.md tells the agent to describe the capability the user sees, such as `"light dismiss dialog"`, to leave out framework names like React or Tailwind and the project's own component or file names, and to search for one feature at a time.

`retrieve` prints the whole guide. This one is 115 lines of Markdown covering the problem, the recommended code, accessibility notes, and browser support data. The guide explains that when Chinese, Japanese, or Korean users type with an input method editor (IME), Enter confirms the selected candidate. If the `keydown` handler submits on every Enter, the message goes out before the user has finished choosing the characters. The guide's fix is to check `event.isComposing` first. Safari reports `isComposing` as `false` on the Enter that confirms the candidate, so you also check `event.keyCode === 229`.

## Step 2: install into the project

The official install command is `npx modern-web-guidance@latest install` in the project folder. I pinned the version again and added two arguments:

```bash
npx -y modern-web-guidance@1.0.1 install --agent claude-code -y
```

`--agent` and `-y` are `skills add` options. `install` passes any extra arguments through unchanged. `--agent claude-code` installs for Claude Code only, and `-y` skips the confirmation.

![Actual terminal output: install detects the claude agent and installs non-interactively, clones the repository from GitHub, finds 2 skills, selects modern-web-guidance, and copies it to ./.claude/skills/modern-web-guidance](term-install.webp){: w="1100" h="1002" }
_I ran it inside Claude Code, so the first line says the claude agent was detected (actual output)._

Because I ran it from inside Claude Code, `skills` detected the agent and installed without asking anything. In a regular terminal it may ask which agents to install for and whether to install per project or globally. I didn't try that. The last line tells you to check skills before using them: "Review skills before use; they run with full agent permissions." So after installing, I looked at what it had added.

Two things were added to the project:

![Actual terminal output: skills-lock.json records source, commit 64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65, and computedHash; .claude/skills/modern-web-guidance contains only guides and SKILL.md; guides contains 210 Markdown files](term-lock.webp){: w="1100" h="608" }

- `.claude/skills/modern-web-guidance/`: only `SKILL.md` and `guides/`. The CLI itself is not there.
- `skills-lock.json`: records which GitHub commit the skill came from (`64a6d70`) and a content hash.

The lock file pins the SKILL.md and `guides/` installed in your project, not the CLI the agent actually runs. The installed SKILL.md tells the agent to run `npx -y modern-web-guidance@latest`, so even though I installed with `@1.0.1`, every lookup the agent makes runs whatever is latest on npm at the time. Reading the 1.0.1 source, I found that `search` and `retrieve` read the index and guides bundled with the CLI package, not the `guides/` folder in your project. So the guide content the agent gets by following SKILL.md also tracks the latest version on npm. I compared the files: the SKILL.md and guides installed that day were identical to the ones in the npm 1.0.1 package.

### Updating and removing

Every time SKILL.md calls the CLI, it passes `--skill-version 2026_11_10-47b4c80e`, and the CLI compares that against the version date it ships with. According to the source, when the CLI's bundled version is newer and the installed SKILL.md's version date is more than 5 days old, the output includes a message asking for an update. After 60 days, the message tells the agent to insist that the user update. The official Get started page says that installing through the CLI will "enable automatic updates", but in the modern-web-guidance 1.0.1 source I only found a version check followed by a reminder, with no code that updates anything automatically. I didn't check the `skills` tool, which does the actual installing.

To update, run this in your project folder:

```bash
npx modern-web-guidance@latest update
```

It hands off to `npx -y skills update`. To remove the skill, run `uninstall`, which hands off to `skills remove`. I only read the source for these two commands and didn't run them.

### Other ways to install

According to the official docs, you can also install with `npx skills add GoogleChrome/modern-web-guidance`. Claude Code users can install it as a plugin by running `claude plugin marketplace add GoogleChrome/modern-web-guidance` and then `claude plugin install modern-web-guidance@googlechrome`. I didn't try either. The README also notes that copies installed from `claude-plugins-official` have been stuck at `v0.0.194` since October 12. They need to be removed and reinstalled from the `googlechrome` marketplace. The [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) page also lists install commands for other agents such as GitHub CLI, Gemini CLI, Codex, and Copilot CLI. I didn't try any of those.

### Baseline target and experimental features

The guides use Baseline to decide whether a feature is safe to use. According to the Get started page, the default target is Baseline Widely available. To change it, add a line such as "This project's Baseline target is Baseline 2024." to `AGENTS.md` or `CLAUDE.md`. I didn't set one and used the default.

Two kinds of guides are off by default: volatile features, which have shipped in only one browser engine and may still change, and features that are still in origin trials. To turn them on, run `npx modern-web-guidance@latest set-allow-volatile-features` or `set-allow-origin-trials` in the project root. According to the 1.0.1 source, both commands refuse to run when they detect an agent environment or a non-interactive terminal, so you have to run them yourself in a terminal. I didn't turn on either one.

## Step 3: a guestbook page with legacy code

I wrote this page from the `legacy-scan` rule list, and every legacy pattern in it is there on purpose. It is a guestbook: Enter posts a message, Shift+Enter adds a new line, and a "Clear all" button opens a confirmation dialog. It has five legacy patterns:

1. The `keydown` handler submits on Enter without checking whether an IME is still composing.
2. JavaScript measures `scrollHeight` to grow the textarea with its content.
3. `textarea:invalid` shows the error style.
4. The dialog checks `e.target === confirmDialog` to detect a backdrop click and closes itself.
5. `list.innerHTML = ''` clears the messages.

I put the three files in a `site/` folder. If you want to follow along, save them exactly as shown so the line numbers in the next step match mine:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guestbook demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>Guestbook</h1>
    <p class="hint">Press Enter to post, Shift+Enter for a new line.</p>
    <form id="form">
      <label for="msg">Message</label>
      <textarea id="msg" rows="1" required placeholder="Say hi..."></textarea>
      <button type="submit">Post</button>
    </form>
    <ul id="list"></ul>
    <button id="clear" type="button" class="secondary">Clear all</button>
  </main>

  <dialog id="confirm">
    <p>Delete all messages?</p>
    <form method="dialog">
      <button value="cancel">Cancel</button>
      <button value="ok" class="danger">Delete</button>
    </form>
  </dialog>

  <script src="app.js"></script>
</body>
</html>
```
{: file="site/index.html" }

```css
body { font-family: system-ui, sans-serif; background: #f1f5f9; margin: 0; }
main { max-width: 480px; margin: 48px auto; background: #fff; padding: 28px 32px; border-radius: 14px; }
h1 { margin: 0 0 4px; color: #1e3a8a; }
.hint { margin: 0 0 16px; color: #64748b; font-size: 14px; }
label { display: block; margin-bottom: 6px; font-weight: 600; }
textarea { width: 100%; box-sizing: border-box; padding: 10px; font: inherit; resize: none; overflow: hidden; border: 2px solid #cbd5e1; border-radius: 8px; }
textarea:invalid { border-color: #dc2626; background: #fef2f2; }
button { margin-top: 10px; padding: 8px 16px; font: inherit; border: 0; border-radius: 8px; background: #2563eb; color: #fff; }
button.secondary { background: #e2e8f0; color: #0f172a; }
button.danger { background: #dc2626; }
ul { padding-left: 20px; }
dialog { border: 0; border-radius: 12px; padding: 20px 24px; }
dialog::backdrop { background: rgb(15 23 42 / 0.5); }
```
{: file="site/style.css" }

```javascript
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const list = document.getElementById('list');
const confirmDialog = document.getElementById('confirm');

function post() {
  const text = msg.value.trim();
  if (!text) return;
  const li = document.createElement('li');
  li.textContent = text;
  list.appendChild(li);
  msg.value = '';
  autosize();
}

// Grow the textarea as the user types.
function autosize() {
  msg.style.height = 'auto';
  msg.style.height = msg.scrollHeight + 'px';
}
msg.addEventListener('input', autosize);

// Enter posts the message, Shift+Enter adds a new line.
msg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    post();
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  post();
});

document.getElementById('clear').addEventListener('click', () => {
  confirmDialog.showModal();
});

// Close the dialog when the user clicks the backdrop.
confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) confirmDialog.close();
});

confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue === 'ok') list.innerHTML = '';
});
```
{: file="site/app.js" }

I committed the folder to git so I could see exactly what the agent changed later.

## Step 4: run legacy-scan

I ran it from the project root:

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![Actual terminal output: legacy-scan finds 6 items across 5 guides: dialog at app.js:41, form-fields-automatically-fit-contents at app.js:13 and app.js:19, ime-safe-enter-submit at app.js:25, js at app.js:46, and validate-input-after-interaction at style.css:7, each with Keep when and Drop when](term-scan-before.webp){: w="1100" h="1667" }
_It found all five legacy patterns, and the auto-grow code counted as two items (actual output)._

The result was 6 findings across 5 guides. The auto-grow code was counted twice: once at line 19, where it measures `scrollHeight`, and once at line 13, where `post()` calls `autosize()`. Every finding includes a rule description plus Keep when and Drop when. The top of the output also says the static analysis results are provisional and should be checked against those conditions.

This step doesn't change any files. The last line of the output suggests running `retrieve <guide-id>` to read the matching guide.

## Step 5: hand it to Claude Code

I ran Claude Code in non-interactive mode (`-p`) so the whole session was recorded as JSON I could go through afterwards. The prompt is the one from the 1.0 announcement, `/modern-web-guidance Modernize the code in this directory`. It invokes the skill directly, so this run doesn't show whether the agent would decide to use the skill on its own.

```bash
claude -p "/modern-web-guidance Modernize the code in this directory" \
  --setting-sources project \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" \
    "Bash(npx -y modern-web-guidance@latest *)" \
    "Bash(pnpx modern-web-guidance@latest *)" \
  --output-format stream-json --verbose --no-session-persistence > run.jsonl
```

What the options do:

- `--setting-sources project` reads only the project settings, so my own user settings and plugins aren't loaded. The init event in the log shows that apart from Claude Code's built-in skills, the only skill loaded was modern-web-guidance.
- `--permission-mode acceptEdits` lets it edit files directly.
- `--allowedTools` allows only reading and editing files, plus `npx -y modern-web-guidance@latest *`, the rule SKILL.md itself recommends. I have pnpm installed, and SKILL.md says to prefer `pnpx` when pnpm is available, so I allowed `pnpx` too. The agent didn't use `pnpx` in this run.

I set `DISABLE_TELEMETRY=1` in the shell before starting `claude -p`, so the commands the agent ran inherited it. The command above leaves out a few settings that only matter for my local environment.

The agent followed the Modernization workflow:

1. It ran `npx -y modern-web-guidance@latest legacy-scan site --json`, which found 6 items. It checked each against Keep when and Drop when, and kept all 6.
2. It used `retrieve` to fetch four guides at once (`dialog`, `form-fields-automatically-fit-contents`, `ime-safe-enter-submit`, `validate-input-after-interaction`), then fetched `validate-input-after-interaction` and `js`.
3. It rewrote the three files.
4. It reran `legacy-scan site --json`, and `totalFindings` was 0.

The Enter handling became:

```javascript
// Enter posts the message, Shift+Enter adds a new line.
msg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    // Enter also confirms IME composition (Japanese, Chinese, Korean); don't submit then.
    // keyCode 229 covers Safari, which reports isComposing as false on that keystroke.
    if (e.isComposing || e.keyCode === 229) return;
    form.requestSubmit(); // Runs native validation, unlike calling post() directly.
  }
});
```

Other changes:

- The auto-grow JavaScript is gone, replaced by CSS `field-sizing: content` with `max-block-size: 12lh` to cap the height at 12 lines. In browsers without `field-sizing`, the textarea stays one line tall and scrolls. The agent's report says the guide recommends accepting this fallback instead of adding a more complex workaround.
- Pressing Enter in an empty textarea now shows the browser's built-in required-field message, the same as clicking Post. Before, it did nothing.
- `textarea:invalid` became `textarea:user-invalid`, with a visible error message and `aria-invalid` kept in sync.
- The dialog got `closedby="any"`. Safari doesn't support that attribute, so there is a fallback that is attached only when support is missing. It checks the pointer coordinates to decide whether the click was outside the dialog.
- `list.innerHTML = ''` became `list.replaceChildren()`.

The agent didn't touch the "Clear all" button. If an agent follows the `declarative-dialog-popover-control` guide and switches a button like this to HTML `commandfor` and `command`, watch the polyfill the guide suggests. Browsers without `command` support need a polyfill. The guide says to use `npm install invokers-polyfill` in projects with a bundler or import maps, and to load it from a CDN otherwise, with this example:

```javascript
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  import('https://esm.run/invokers-polyfill');
}
```

That URL has no version. If the agent copies it as is, browsers without `command` support load whatever version of `invokers-polyfill` is latest at runtime. If your project doesn't allow loading code from a CDN at runtime, say so in `CLAUDE.md` or `AGENTS.md`. I covered how to write those rules in [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/posts/agents-md-project-rules-for-coding-agents/).

SKILL.md asks the agent to end its report with a `### Modern Web Guidance` section that lists each guide it used and quotes the rule it followed. The report from this run included it, and I found it useful when going through the diff.

Finally, I reran the scan myself from the project root:

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![Actual terminal output: legacy-scan reports 0 findings from 38 qualified guides and notes that it covers only about 20% of the guides](term-scan-after.webp){: w="1100" h="287" }
_After the changes, the rescan found 0 items (actual output)._

The output also points out that `legacy-scan` covers only 38 guides. Zero findings means those 38 guides' rules found nothing more. Patterns covered by the other guides aren't checked.

### Triggering it without the slash command

Here I invoked the skill directly with its slash command. According to the Modernization workflow docs, you can also trigger the scan without it by asking the agent to check a whole repository or folder for "legacy patterns" or to "modernize" it. If you name a single component, the agent does a regular guide lookup with `search` and `retrieve` instead. SKILL.md says the same: it runs `legacy-scan` only for broad modernization requests that don't name a specific feature or component. I didn't test this way of triggering it.

Another example prompt in the docs asks the agent to propose a plan before it edits anything:

```text
Modernize this repository using Modern Web Guidance. Scan our frontend files for legacy patterns, verify the findings, and propose a modernization plan before making any code edits.
```

The first time I use it on an existing project, this is the prompt I'd pick, so I can see which findings the agent keeps before it changes any code.

## Step 6: compare in a browser

`legacy-scan` only reads code, so I checked the page behavior in a browser. I wrote a small Node.js script with no dependencies that drives headless Chrome 157 over the Chrome DevTools Protocol, opening only local files and using a throwaway Chrome profile. It performs the same actions on the before and after pages and takes screenshots.

The first pair shows the page right after it loads:

![Guestbook before and after, side by side. On the left, before: the empty textarea already has a red border and red background. On the right, after: the textarea has a normal gray border](pair-load.webp){: w="2584" h="840" }
_Left: before, with the error style showing on load. Right: after, with the normal style._

In the old version the textarea is `required` and empty, so it matches `:invalid` as soon as the page loads. The user sees a red box before typing anything. With `:user-invalid`, the error style waits until the user has interacted with the field or tried to submit. On the new page I clicked Post without typing, and the red border and the error message appeared:

![The new guestbook after clicking Post with an empty textarea: the textarea has a red border and the message "Enter a message before posting." appears below it](page-empty-submit.webp){: w="1280" h="840" }

The second pair tests IME input. I used the DevTools Protocol to simulate a Chinese IME in the middle of composing, with an unconfirmed "你好" in the textarea, and then sent Enter. Here are those two calls from my script. I left out the key release and the text-commit event that follow them:

```javascript
await send('Input.imeSetComposition', { text: '你好', selectionStart: 2, selectionEnd: 2 });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
```

I also added a `keydown` listener to the textarea that only logs events and doesn't block anything. Both versions received `key: "Enter"`, `keyCode: 229`, and `isComposing: true`.

![Guestbook before and after, side by side. On the left, before: "你好" is still being composed in the textarea, and the message list already has a "你好" entry. On the right, after: the textarea contains "你好" and the list is empty](pair-ime.webp){: w="2584" h="840" }
_Left: before, the Enter meant to confirm the IME candidate posted "你好". Right: after, nothing was posted._

The old version posted the half-composed "你好" as a message. The new version saw `isComposing` was `true` and didn't submit, so the list stayed empty.

This test is a simulation. I didn't type with a real macOS Zhuyin or Pinyin IME, and I didn't test Safari or Firefox. I also didn't test the dialog's `closedby="any"` or its Safari fallback.

## A second machine and a different example

I wrote the guestbook above from the `legacy-scan` rule list, so it's no surprise the scan caught everything. On 2026-11-20 (Taipei time) I moved to a second machine running Linux (Debian 13, Node.js 24.22.1, npm 11.21.1, Chrome 156), downloaded 1.0.1 again, and ran it on a page I wrote from scratch on a different topic. This time the agent was Codex CLI 0.171.0 with the `gpt-6.1-sol` model, called through my self-hosted LiteLLM, in the `workspace-write` sandbox with network access on.

First, what matched the earlier run: the same `search "submit on enter key"` returned the same 10 entries, `skills-lock.json` had the same commit and `computedHash`, and the install brought in 210 guides. When I saved the three guestbook files from this post as-is and scanned them, I got the same 5 guides and 6 findings on the same lines.

The new example is a campsite booking page, three files in `web/`. These are the legacy patterns I put in:

- The search box runs a search when `e.keyCode === 13`.
- Four required fields use `input:invalid` for the error style.
- The confirmation popup is a home-made `div` that closes when `e.target === overlay`, not a `<dialog>`.
- Ticking "Rent a tent" uses JavaScript to add a class to the parent row to change its background.
- The FAQ expands with `max-height: 9999px`.
- dayjs loads from jsDelivr without `integrity`.
- Two duplicate `@media (prefers-color-scheme: dark)` blocks.
- `results.innerHTML = ''` clears the search results.

`legacy-scan` found 5 findings across 5 guides:

![Actual terminal output: legacy-scan finds 5 findings across 5 guides in the campsite example: animate-to-intrinsic-sizes at style.css:11, dark-mode at style.css:18, js at app.js:9, secure-external-subresources at index.html:8, and validate-input-after-interaction at style.css:6](term-campsite-scan.webp){: w="1100" h="1593" }
_Second machine, my own example (actual output)_

Three patterns weren't flagged: the `div` popup, the checkbox class toggle, and the `keyCode === 13` search box. The dialog rule looks for click listeners on a `<dialog>`, so a home-made `div` popup is out of scope. The `keyCode === 13` handler isn't a miss. The ime-safe-enter-submit guide says that when Enter confirms an IME candidate, browsers report `keyCode` 229, not 13, so an old `keyCode === 13` handler never fires during composition. The bug appears when you switch it to `e.key === 'Enter'` without adding a check.

I gave Codex the same prompt as before: `$modern-web-guidance Modernize the code in this directory` (`$` is how Codex names a skill). Here's what happened:

- It fetched all 5 guides with one `retrieve`. The output was 84.4 KB, so the CLI saved it to `/tmp/mwg-guide-….md` instead of printing it and told the agent to read the file in chunks.
- It changed all 5 findings, and its rescan found 0. My own rescan with 1.0.1 from the project root also found 0.
- It also changed the search box to `e.key === 'Enter' && !e.isComposing`. That line wasn't in the scan results, and it never retrieved the ime-safe-enter-submit guide. According to that guide, this version is missing `e.keyCode === 229`, so in Safari the Enter that confirms a candidate may still trigger a search. I don't have Safari to check this; I'm going by the diff and the guide.
- To check its own work, it installed jsdom with npm into `/tmp` for a DOM test, and used curl to download the CDN file and compare hashes. With network access on, expect extra downloads like these.
- The whole run took 119 seconds. The run log shows 525,856 input tokens (434,990 of them cached) and 4,418 output tokens.

For the browser check I again drove headless Chrome 156 over the DevTools Protocol and simulated pressing Enter while an IME was composing "溪邊". Besides the original (A) and the Codex version (B), I made a control (C) that only changes A's condition to `e.key === 'Enter'`:

![Three versions of the campsite page side by side, each after pressing Enter during IME composition. A uses keyCode === 13: 0 results, and the required fields are red on load. B is the Codex version: 0 results, and the fields look normal. C is the control with e.key === 'Enter': it already searched and shows 溪邊 A1 riverside, and the fields are red](trio-campsite-ime.webp){: w="1954" h="696" }
_A: the original keyCode === 13. B: after Codex. C: control, changed only to e.key === 'Enter'._

- All three versions received `key: "Enter"`, `keyCode: 229`, and `isComposing: true`.
- A and B didn't search. C searched in the middle of composition.
- On load, A and C show all four required fields in red, and B shows them normally. When I clicked Book on B with the form empty, the fields turned red, the error messages appeared, and `aria-invalid` became `true`.

One more thing to watch for: by default `legacy-scan` skips folders that look like docs, examples, or tests, such as `docs/`, `examples/`, `demo/`, and `test/`. When I put the same example under `demo/`, the scan reported 0 and ended with `Skipped 3 docs and test files`. With `--include-docs-and-tests` it found the 5 findings. If you follow along with your example in `demo/`, add that flag or use a different folder name.

![Actual terminal output: with the example in a demo folder, legacy-scan reports 0 findings and says Skipped 3 docs and test files; with --include-docs-and-tests it finds 5](term-demo-skip.webp){: w="1100" h="460" }

Last, I checked the usage data. With no network access and `DISABLE_TELEMETRY` unset, I ran `search "booking date picker"` and swapped the `fetch` that sends the data for one that only logs it. The background process was about to POST the search query to `play.googleapis.com`, along with the IDs and similarity scores of the guides it found. With `DISABLE_TELEMETRY=1`, there was no request.

## Pairing it with browser checks

According to the 1.0 announcement, the project recommends pairing it with Chrome DevTools for agents. Modern Web Guidance helps the agent write current code from the start, and DevTools for agents lets the agent see how the page actually behaves in the browser. The announcement gives a few examples:

- Record a performance trace on a simulated low-end CPU, then break up long tasks following the guides until the main thread is never blocked for more than 50 milliseconds.
- Record dialog and popover animations to check that they fit the rest of the site, and confirm the component respects `prefers-reduced-motion`.
- When caching views in memory, use the memory tools to make sure memory use doesn't keep growing.

I haven't tried DevTools for agents yet.

This time I used my own small DevTools Protocol script. If you want the agent to open the page and check it itself, see [agent-browser Tutorial: Let AI Test Its Own Web Pages](/posts/agent-browser-ai-test-web-pages/). I described my process for proving a change works before merging in [pstack, Part 3: After the Code Is Written, Prove It Works Before Merging](/posts/pstack-build-verify-merge/).

## Conclusion

In this run, `legacy-scan` found all 5 legacy patterns I planted, 6 findings in total, without leaving my machine. After Claude Code made changes based on the guides, a rescan found 0. In the browser, the empty textarea no longer turns red on load, and pressing Enter to confirm an IME candidate no longer posts the message. On a second machine, with my own campsite example and Codex, the scan and rescan results held up too, but the agent also changed code outside the scan results and didn't always follow the guide all the way.

Also, the installed skill always runs `@latest`, and the guides the agent reads come from that CLI version too. The version you pin at install time and `skills-lock.json` only cover the SKILL.md and `guides/` copied into your project.

This is the order I'd suggest:

1. Without installing anything, run `npx modern-web-guidance@<version> legacy-scan .` on your own project and see what it finds. If your code lives in a folder like `demo/` or `examples/`, add `--include-docs-and-tests`.
2. Decide whether you want usage data sent. If not, set `DISABLE_TELEMETRY=1`.
3. After installing into your project, read `.claude/skills/modern-web-guidance/SKILL.md`, and commit `skills-lock.json` along with it. When you see an update reminder, run `npx modern-web-guidance@latest update`.
4. The first time you hand it to an agent, ask for a modernization plan in the prompt and review it before letting the agent edit files.
5. When the agent finishes, read the diff, especially changes outside the scan results, and try the page in a browser yourself.

## Further reading

- [Modern Web Guidance docs](https://developer.chrome.com/docs/modern-web-guidance): installation, example prompts, and how to set a Baseline target.
- [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started): install commands for each agent, the Baseline target, and how to turn on guides for volatile features and origin trials.
- [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow): the four-step process of running `legacy-scan` and having the agent make the changes.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): how the description in SKILL.md affects when a skill triggers.
- [Claude Code Plugins: What to Check Before You Install One](/posts/claude-code-plugin-safe-install/): which files to read before installing a skill or plugin.
