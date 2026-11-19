---
title: "Modern Web Guidance Hands-On: Getting a Coding Agent to Write Current Web Code"
description: "Modern Web Guidance is an agent skill of web development guides maintained by the Chrome, Edge, Firefox, and MDN teams. I installed 1.0.1 inside the Claude Code sandbox, ran legacy-scan on a small guestbook page, and had Claude Code fix it from the guides. I also show before-and-after screenshots and the sandbox problems I ran into."
date: 2026-11-19 17:00:00 +0800
categories: [AI, skills]
tags: [modern-web-guidance, agent-skills, coding-agent, claude-code, web-platform, sandbox]
media_subpath: /assets/img/posts/modern-web-guidance-coding-agent/
image:
  path: cover.en.webp
  alt: "Modern Web Guidance finds the legacy patterns in a guestbook page, Claude Code fixes them from the guides, and a rescan finds zero."
---

The Modern Web Guidance SKILL.md says near the top that "training weights contain obsolete patterns". Measuring `scrollHeight` in JavaScript to grow a textarea and checking click targets by hand to close a dialog are two examples. Browsers now have built-in ways to do both.

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) is a skill and command-line tool for coding agents. According to the [GitHub README](https://github.com/GoogleChrome/modern-web-guidance), it is maintained by the Google Chrome, Microsoft Edge, Mozilla Firefox, and MDN teams together with the community. Before writing web code, the agent looks up a guide. The guide tells it which HTML, CSS, or JavaScript feature to use, how widely browsers support it, and what to fall back to when they don't. There is also a `legacy-scan` command that finds outdated patterns in an existing project.

In this post I install it in Claude Code with the sandbox turned on. I wrote a small guestbook page, scanned it with `legacy-scan`, had Claude Code fix it using the guides, and then compared the before and after versions in a browser. I also cover where the sandbox got in the way.

> The official sources I checked are the [Modern Web Guidance docs](https://developer.chrome.com/docs/modern-web-guidance), the [1.0 announcement](https://developer.chrome.com/blog/modern-web-guidance-v1) (published 2026-11-10), [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow), and the README and SKILL.md inside the npm package version 1.0.1. I read them on 2026-11-19. I ran everything the same day (Taipei time) on macOS with Node.js 25.2.1, npm 11.6.2, and Claude Code 2.1.328 (model `claude-opus-5-5`), with the Claude Code sandbox on. I used modern-web-guidance 1.0.1, which was tagged latest on npm that day. The `skills` package that the installer pulled in was 1.9.0. The terminal screenshots are the recorded output laid out as images. I removed only the color codes, the intermediate spinner frames, and the exit-code markers my recording script added.
{: .prompt-info }

## How it works

Modern Web Guidance has two parts:

- The skill is a SKILL.md plus a `guides/` folder. After installing it into my project, I counted 210 Markdown files in `guides/`.
- The CLI is the npm package `modern-web-guidance`. Following SKILL.md, the agent runs `npx -y modern-web-guidance@latest search "<query>"` to find relevant guide IDs, then `retrieve <id>` to load the full guide into its context.

Whether the agent reaches for it depends on the description in SKILL.md. It says to run the tool first for every HTML, CSS, and client-side JavaScript task ("MANDATORY: Execute FIRST"), followed by a long list of trigger topics such as dialogs, tables, dark mode, form validation, and Core Web Vitals. I wrote about how a description affects triggering in [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/).

According to the How It Works section of the README, `search` uses a local embedding model and BM25. It makes no network calls and needs no API key.

According to the Modernization workflow docs, `legacy-scan` scans the project locally with fixed rules and does not call any model. It only covers guides that static rules can check. My scan output said 38 guides, about 20% of the total. Each finding comes with "Keep when" and "Drop when" conditions, and the agent uses them to decide whether the finding is a false positive. The 1.0 announcement also says there is no `--fix` flag. The scanner only finds problems, and the agent makes the changes.

The docs landing page says the public evaluation shows a 91% pass rate with the guides, versus about 51% for frontier models without them. The README has a table of individual runs. The Nov 8 row for `claude_code (opus-5-5)` goes from 57% to 88%. I took these numbers from the official pages on 2026-11-19 and didn't measure them myself. The example below is the only thing I ran.

## Setup: running npx in the sandbox

My Claude Code sandbox only lets commands write to the project folder and `$TMPDIR`. I explained how to set it up in [Claude Code Sandbox Setup: Keep SSH Keys and Tokens Out](/posts/claude-code-sandbox-setup/). The first time I ran `npm view modern-web-guidance` in the sandbox, npm returned `EPERM` and said "Your cache folder contains root-owned files", telling me to fix `~/.npm` with `sudo chown`. But ownership wasn't the problem: the sandbox doesn't let npm write its cache to `~/.npm`. I moved the cache under `$TMPDIR`, and npx worked from then on:

```bash
export npm_config_cache="$TMPDIR/npm-cache"
export DISABLE_TELEMETRY=1
```

The second line turns off usage reporting. Reading the CLI source, I found that when `search`, `retrieve`, `legacy-scan`, or `install` runs, it starts a detached background process that sends usage data to `play.googleapis.com`. According to the Telemetry & Privacy section of the README, it collects install counts, the name of the calling agent, the IDs of retrieved guides, and the search queries the agent writes. It does not collect the user's original prompt. Setting `DISABLE_TELEMETRY=1` stops it. So although search matching happens locally, the queries themselves are sent to `play.googleapis.com` by default.

Before installing, I downloaded the package with `npm pack modern-web-guidance@1.0.1` and looked through it, the same way I described in [Claude Code Plugins: What to Check Before You Install One](/posts/claude-code-plugin-safe-install/). The 1.0.1 `package.json` has no `scripts`, so nothing runs at install time. The package has 281 files and is 17 MB unpacked. The search vectors take about 8.8 MB, the single-file bundle `legacy-scan.mjs` about 4.9 MB, and the guides about 2.3 MB. The `install` subcommand just runs:

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

![Actual terminal output: search "submit on enter key" returns 10 entries with id and description, the first being ime-safe-enter-submit; retrieve ime-safe-enter-submit prints the start of the guide, which explains that IME users press Enter to confirm a candidate](term-search.webp){: w="1102" h="1045" }
_search returns JSON and retrieve prints the full guide. Only the first 12 lines are shown (actual output)._

`search` returned 10 results, each with an `id` and a `description`. The first one, `ime-safe-enter-submit`, was the one I wanted. SKILL.md tells the agent to describe the capability the user sees, such as `"light dismiss dialog"`, to leave out framework names like React or Tailwind and the project's own component or file names, and to search for one feature at a time.

`retrieve` prints the whole guide. This one is 115 lines of Markdown covering the problem, the recommended code, accessibility notes, and browser support data. The guide explains that when Chinese, Japanese, or Korean users type with an input method editor (IME), Enter confirms the selected candidate. If the `keydown` handler submits on every Enter, the message goes out before the user has finished choosing the characters. The guide's fix is to check `event.isComposing` first. Safari reports `isComposing` as `false` on the Enter that confirms the candidate, so you also check `event.keyCode === 229`.

## Step 2: install into the project

The official install command is `npx modern-web-guidance@latest install` in the project folder. I pinned the version again and added two arguments:

```bash
npx -y modern-web-guidance@1.0.1 install --agent claude-code -y
```

`--agent` and `-y` are `skills add` options. `install` passes any extra arguments through unchanged. `--agent claude-code` installs for Claude Code only, and `-y` skips the confirmation.

![Actual terminal output: install detects the claude agent and installs non-interactively, clones the repository from GitHub, finds 2 skills, selects modern-web-guidance, and copies it to ./.claude/skills/modern-web-guidance](term-install.webp){: w="1102" h="883" }
_I ran it inside the Claude Code sandbox, so the first line says the claude agent was detected (actual output)._

Because I ran it from inside Claude Code, `skills` detected the agent and installed without asking anything. In a regular terminal it may ask which agents to install for and whether to install per project or globally. I didn't try that. The last line tells you to check skills before using them: "Review skills before use; they run with full agent permissions." So after installing, I looked at what it had added.

Two things were added to the project:

![Actual terminal output: skills-lock.json records source, commit 64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65, and computedHash; .claude/skills/modern-web-guidance contains only guides and SKILL.md; guides contains 210 Markdown files](term-lock.webp){: w="1102" h="489" }

- `.claude/skills/modern-web-guidance/`: only `SKILL.md` and `guides/`. The CLI itself is not there.
- `skills-lock.json`: records which GitHub commit the skill came from (`64a6d70`) and a content hash.

The lock file only pins the guide content. The installed SKILL.md tells the agent to run `npx -y modern-web-guidance@latest`, so even though I installed with `@1.0.1`, every lookup the agent makes runs whatever is latest on npm at the time. I compared the files: the SKILL.md and guides installed that day were identical to the ones in the npm 1.0.1 package.

According to the official docs, you can also install with `npx skills add GoogleChrome/modern-web-guidance`. Claude Code users can install it as a plugin by running `claude plugin marketplace add GoogleChrome/modern-web-guidance` and then `claude plugin install modern-web-guidance@googlechrome`. I didn't try either. The README also notes that copies installed from `claude-plugins-official` have been stuck at `v0.0.194` since October 12. They need to be removed and reinstalled from the `googlechrome` marketplace. The README also has install instructions for other agents such as GitHub Copilot CLI and OpenAI Codex. I only tested Claude Code.

The guides use Baseline to decide whether a feature is safe to use. According to the official [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) page, the default target is Baseline Widely available. To change it, add a line such as "This project's Baseline target is Baseline 2024." to `AGENTS.md` or `CLAUDE.md`. I didn't set one and used the default.

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

![Actual terminal output: legacy-scan finds 6 items across 5 guides: dialog at app.js:41, form-fields-automatically-fit-contents at app.js:13 and app.js:19, ime-safe-enter-submit at app.js:25, js at app.js:46, and validate-input-after-interaction at style.css:7, each with Keep when and Drop when](term-scan-before.webp){: w="1102" h="1463" }
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
  --output-format stream-json --verbose --no-session-persistence > run1.jsonl
```

What the options do:

- `--setting-sources project` reads only the project settings, so my own user settings and plugins aren't loaded. The init event in the log shows that apart from Claude Code's built-in skills, the only skill loaded was modern-web-guidance.
- `--permission-mode acceptEdits` lets it edit files directly.
- `--allowedTools` allows only reading and editing files, plus `npx -y modern-web-guidance@latest *`, the rule SKILL.md itself recommends. I have pnpm installed, and SKILL.md says to prefer `pnpx` when pnpm is available, so I allowed `pnpx` too. I also set two pnpm cache variables for that. The agent never used `pnpx` in either run, so I left them out here.

I set `npm_config_cache` and `DISABLE_TELEMETRY` in a shell inside my outer Claude Code session's sandbox and started `claude -p` from there, so the commands the agent ran inherited both variables and ran under the same sandbox. The demo project has no sandbox settings of its own, and `--setting-sources project` skips my user settings. From a plain terminal you probably wouldn't hit the `/tmp/npm-cache` permission error described below, but I didn't test that.

### Run 1: the scan command was blocked

The agent tried to run the scan right away, but it put `NPM_CONFIG_CACHE=/tmp/npm-cache` in front of the command:

```text
NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest legacy-scan . --json
→ This command requires approval
```

The prefix comes from SKILL.md. It names sandboxed environments such as Codex and Claude Code, and says to set `NPM_CONFIG_CACHE=/tmp/npm-cache` when `~/.npm` is read-only. But with the variable in front, the command no longer matches the allow rule SKILL.md recommends, `npx -y modern-web-guidance@latest *`. Non-interactive mode doesn't prompt, so the command was rejected.

Without the scan, the agent read the guides in `.claude/skills/modern-web-guidance/guides/`, found the problems by reading the code itself, and made its changes. The run took 73 seconds and 18 turns, and `total_cost_usd` in the log was $0.62. Its report says at the top that the scan and the syntax check didn't run because they weren't approved, so it never rescanned to confirm the fixes. It also says it never opened the page in a browser.

In this run the agent also followed the `declarative-dialog-popover-control` guide and switched "Clear all" to HTML `commandfor` with `command="show-modal"`. Browsers without support need a polyfill, and it used the guide's CDN example for that. It also changed the `<script>` tag to `type="module"`:

```javascript
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  import('https://esm.run/invokers-polyfill');
}
```

That URL has no version, so browsers without `command` support load whatever version of `invokers-polyfill` is latest at runtime. The guide says to use `npm install invokers-polyfill` in projects with a bundler or import maps, and the CDN otherwise. My example has no bundler, so the agent picked the CDN, as the guide says. In its report it listed this under "One decision for you" and offered a two-line fallback that loads no outside code. If your project doesn't allow loading code from a CDN at runtime, say so in `CLAUDE.md` or `AGENTS.md`. I covered how to write those rules in [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/posts/agents-md-project-rules-for-coding-agents/).

### Run 2: the allow rule matched, but the cache path wasn't writable

I restored the page and kept the prompt exactly the same. The only change was one more rule in `--allowedTools`:

```bash
"Bash(NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest *)"
```

This time the command ran, but npm failed:

```text
npm error code EPERM
npm error syscall mkdir
npm error path /tmp/npm-cache
...
npm error Your cache folder contains root-owned files, due to a bug in
```

My sandbox allows writes to `$TMPDIR` (`/tmp/claude-501`), which doesn't include `/tmp/npm-cache`. The agent then tried `NPM_CONFIG_CACHE=$TMPDIR/npm-cache`, and Claude Code answered "A variable in this command can't be checked before it runs", because the allow rule can't check what the variable expands to ahead of time. It then tried versions with the path written out in full, and those didn't match the allow rule either. Finally it dropped the prefix and ran `npx -y modern-web-guidance@latest legacy-scan site --json`. That worked, because the `npm_config_cache` I had set was already in the environment.

Once the scan ran, the agent followed the Modernization workflow:

1. The scan found 6 items. It checked each against Keep when and Drop when, and kept all 6.
2. It used `retrieve` to fetch four guides at once (`dialog`, `form-fields-automatically-fit-contents`, `ime-safe-enter-submit`, `validate-input-after-interaction`), then fetched `validate-input-after-interaction` and `js`.
3. It rewrote the three files.
4. It reran `legacy-scan site --json`, and `totalFindings` was 0.

The run took 90 seconds and 17 turns, and `total_cost_usd` was $0.59. Of the 4 commands blocked in this run, 3 were cache path attempts. The other chained `node --check site/app.js` with the rescan, and `node --check` wasn't on the allow list. In the end it ran the rescan by itself.

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

This time it didn't touch the "Clear all" button and didn't add the CDN polyfill. The same prompt run twice produced different code, so you still need to read the diff after the agent finishes.

SKILL.md asks the agent to end its report with a `### Modern Web Guidance` section that lists each guide it used and quotes the rule it followed. Both runs included it, and I found it useful when going through the diff.

Finally, I reran the scan myself from the project root:

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![Actual terminal output: legacy-scan reports 0 findings from 38 qualified guides and notes that it covers only about 20% of the guides](term-scan-after.webp){: w="1102" h="187" }
_After the changes, the rescan found 0 items (actual output)._

The output also points out that `legacy-scan` covers only 38 guides. Zero findings means those 38 guides' rules found nothing more. Patterns covered by the other guides aren't checked.

## Step 6: compare in a browser

`legacy-scan` only reads code, so I checked the page behavior in a browser. Chrome won't start inside my sandbox. Headless Chrome exits right away because macOS denies its mach port access. So I ran this step outside the sandbox, opening only local files and using a throwaway Chrome profile. I wrote a small Node.js script with no dependencies that drives headless Chrome 157 over the Chrome DevTools Protocol. It performs the same actions on the before and after pages and takes screenshots.

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

## Problems I hit in the sandbox

1. The sandbox blocks npm from writing `~/.npm`, but npm reports it as "root-owned files" and tells you to run `sudo chown`, but ownership isn't the problem. I pointed `npm_config_cache` at a folder the sandbox allows by running `export npm_config_cache="$TMPDIR/npm-cache"` in the shell before starting `claude -p`.
2. SKILL.md tells the agent to prefix commands with `NPM_CONFIG_CACHE=/tmp/npm-cache`. In my sandbox `/tmp/npm-cache` isn't writable, and the prefixed command doesn't match the allow rule SKILL.md itself recommends. My run finished only because the agent eventually dropped the prefix and the environment already had a writable cache path.
3. Chrome won't start inside the sandbox, so I ran the browser comparison outside it.

Both runs used non-interactive mode, where blocked commands just fail. In interactive mode I'd expect a prompt instead, but I didn't test it.

## Pairing it with browser checks

According to the 1.0 announcement, the project recommends pairing it with Chrome DevTools for agents, which lets the agent see how the page actually behaves in the browser. I haven't tried DevTools for agents yet.

This time I used my own small DevTools Protocol script. If you want the agent to open the page and check it itself, see [agent-browser Tutorial: Let AI Test Its Own Web Pages](/posts/agent-browser-ai-test-web-pages/). I described my process for proving a change works before merging in [pstack, Part 3: After the Code Is Written, Prove It Works Before Merging](/posts/pstack-build-verify-merge/).

## Conclusion

In this run, `legacy-scan` found all 5 legacy patterns I planted, 6 findings in total, without leaving my machine. After Claude Code made changes based on the guides, a rescan found 0. In the browser, the empty textarea no longer turns red on load, and pressing Enter to confirm an IME candidate no longer posts the message.

Most of my sandbox trouble came from the npm cache path (see the list above). And because the installed skill always runs `@latest`, pinning a version at install time only pins the guides.

This is the order I'd suggest:

1. Without installing anything, run `npx modern-web-guidance@<version> legacy-scan .` on your own project and see what it finds.
2. Decide whether you want usage data sent. If not, set `DISABLE_TELEMETRY=1`.
3. After installing into your project, read `.claude/skills/modern-web-guidance/SKILL.md`, and commit `skills-lock.json` along with it.
4. If you use the sandbox, sort out the npm cache path before handing work to the agent.
5. When the agent finishes, read the diff and try the page in a browser yourself.

## Further reading

- [Modern Web Guidance docs](https://developer.chrome.com/docs/modern-web-guidance): installation, example prompts, and how to set a Baseline target.
- [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow): the four-step process of running `legacy-scan` and having the agent make the changes.
- [Write Your Own Agent Skill: From SKILL.md to Testing and Upkeep](/posts/agent-skill-authoring-guide/): how the description in SKILL.md affects when a skill triggers.
- [Claude Code Plugins: What to Check Before You Install One](/posts/claude-code-plugin-safe-install/): which files to read before installing a skill or plugin.
- [Claude Code Sandbox Setup: Keep SSH Keys and Tokens Out](/posts/claude-code-sandbox-setup/): how to turn on the sandbox I used here.
