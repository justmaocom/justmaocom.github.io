---
title: "agent-browser Tutorial: Let AI Test Its Own Web Pages"
description: "Use agent-browser so your coding agent opens the page, uses the form, and reads JavaScript errors itself. Tested on 0.43.0, plus domain and action limits."
date: 2026-11-19 09:30:00 +0800
categories: [AI, Software Development]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.en.webp
  alt: "After an AI edits a web page, it uses agent-browser to try the page and check for JavaScript errors before it reports the job done."
---

When a coding agent changes a web page and only reads the code, it can't see whether the page reacts when someone clicks the button. The code can look fine while the page is still broken.

[agent-browser](https://github.com/vercel-labs/agent-browser) is a command-line tool from Vercel Labs, written in Rust. An AI uses it to drive a browser one command at a time: open a page, list the buttons and fields on it, click one, and read the result. Coding agents can already run terminal commands, so an agent can use these commands to click through the page before it reports "done."

In this post I start from installation and walk through the whole flow on a small local newsletter form. I also made a broken copy of the form with a typo, to see whether agent-browser's output points to the error. Then I hand the same check to an AI, and finally I test how to limit which domains it can visit and which actions it can take. The source of both demo pages is in the post, so you can repeat every step.

> The official material I checked is the agent-browser v0.43.0 tag: the [README](https://github.com/vercel-labs/agent-browser/tree/v0.43.0) plus four docs pages, [Installation](https://agent-browser.dev/installation), [Quick Start](https://agent-browser.dev/quick-start), [Snapshots](https://agent-browser.dev/snapshots), and [Security](https://agent-browser.dev/security). The docs website may already describe a newer version. On 2026-11-19 (Taipei time) I ran this test on a Debian 13 (x86_64) machine with agent-browser 0.43.0 and the Chrome for Testing 158.0.8127.36 build it downloaded. That day, 0.43.0 was the release GitHub marked as Latest, published on 2026-11-13 Taipei time. GitHub lists 10 releases from v0.39.1 (2026-10-14 Taipei time) through 0.43.0, so run `agent-browser --version` before you follow along. The terminal screenshots are the recorded output, laid out as images without changes. A few show only some of the commands.
{: .prompt-info }

## A few terms first

- A headless browser is a browser without a window. It loads pages and runs JavaScript as usual but doesn't show anything on screen. According to `--help`, agent-browser runs headless by default, and `--headed` shows the window.
- A snapshot is the text list agent-browser makes of a page, with elements such as headings, input fields, and buttons. According to agent-browser's bundled core skill (its usage guide), a snapshot is faster than a screenshot and uses far fewer tokens.
- A ref is the ID a snapshot gives each element, such as `@e2`. You use the ref to say which button to click or which field to fill.
- A session is a browser that stays open in the background. Every command in a session goes to the same browser, so the page you opened in one step is still there in the next. According to the README, it closes itself after an hour without commands. To close it yourself, run `agent-browser close`.

## Step 1: Install

The official docs recommend a global npm install, followed by `agent-browser install` to download the Chrome it uses. That Chrome is [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/), the build Google provides for automated testing. According to the docs, you can also use `brew install agent-browser` on macOS. `cargo install agent-browser` compiles from source and needs the Rust toolchain. I didn't try either of those. I used npm:

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![Real terminal output: npm installs agent-browser and prints an install-scripts warning; agent-browser --version prints agent-browser 0.43.0; agent-browser install downloads and installs Chrome 158.0.8127.36](term-install.webp){: w="1102" h="636" }
_My install on Debian Linux (real output)_

npm printed an `install-scripts` warning during the install. It said the postinstall script of `agent-browser@0.43.0` wasn't covered by allowScripts yet, and suggested `--allow-scripts=agent-browser` to allow it. I covered how npm blocks install scripts in [npm 12 Blocks Install Scripts by Default](/posts/npm-12-install-scripts-allowscripts/). According to the Installation docs, when a package manager such as npm 12 blocks install scripts by default, agent-browser links itself on the first run, with no extra setup. I ignored the warning and ran `agent-browser --version`. It printed `agent-browser 0.43.0` without any extra step.

On Linux, `agent-browser install` printed the same hint twice. It said to run `agent-browser install --with-deps` if the browser fails to launch or you see "shared library" errors. According to the docs, that command uses your system package manager to add the libraries Chrome needs, and it goes through `sudo` when you aren't root. I didn't run `--with-deps`, and the browser launched fine in every later step.

After installing, you can run a health check:

```bash
agent-browser doctor --offline --quick
```

My result was `Summary: 8 pass, 0 warn, 0 fail`. According to the docs, `--offline --quick` only checks the local machine, doesn't go online, and skips the browser launch test. The output also had the line `AI_GATEWAY_API_KEY not set (chat command disabled)`. Step 5 uses that environment variable.

## Step 2: Run the basic loop once

Using agent-browser comes down to four steps: open the page, take a snapshot, act on refs, and check the result. Whenever the page changes, take a new snapshot.

![The basic agent-browser loop: open the page, use snapshot -i to list interactive elements with refs, fill fields and click by ref, then confirm the result with wait, get, and errors; take a new snapshot when the page changes](core-loop.en.webp){: w="1600" h="900" }

I started with `example.com`, which both the README and Quick Start use:

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser screenshot shots/example.png
agent-browser click @e1
agent-browser get url
agent-browser snapshot -i
```

![Real terminal output: open example.com shows Example Domain; snapshot -i lists link "Learn more" [ref=e1]; get title returns Example Domain; screenshot saves a file; after click @e1, get url returns an iana.org address; the last snapshot -i prints (no interactive elements)](term-core.webp){: w="1102" h="568" }
_The snapshot gives `@e1`, and clicking it changes the URL (real output)_

Line by line:

- `open` starts the browser in the background. The first time, it prints `[agent-browser] launched browser`. Then it opens the page and prints the title and URL.
- `snapshot -i` lists only the elements you can interact with. This page has one link, with the ref `e1`. The real 0.43.0 output format is `- link "Learn more" [ref=e1]`, which differs from the sample format in the Quick Start docs. Go by the output you see.
- `screenshot` saves the current view as a PNG file.
- `click @e1` clicks that link. `get url` returns `https://www.iana.org/help/example-domains`, so the page changed.
- After the page change, `snapshot -i` prints `(no interactive elements)`.

`-i` stands for interactive. Without it, the snapshot lists the structure of the whole page, including paragraph text. When you only need buttons and fields, `-i` keeps the output short.

## Step 3: Test a local form

In practice you'll usually check a page you're building. I wrote a newsletter form with one Email field and one Subscribe button. After you submit it, the text "Thanks! We sent a confirmation to" plus your email should appear below the button. This demo only updates the page text; it doesn't send a confirmation email. Here's the complete `site/index.html`. Save it exactly as is, without reformatting, so the error line number in Step 4 matches mine:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Newsletter demo</title>
<style>body{font-family:system-ui,sans-serif;background:#fff7ed;margin:0;display:grid;place-items:center;min-height:100vh}
main{background:#fff;border:2px solid #fdba74;border-radius:16px;padding:32px 40px;width:420px}
h1{margin:0 0 8px;color:#9a3412}label{display:block;margin:16px 0 6px}input{width:100%;padding:10px;font-size:16px;box-sizing:border-box}
button{margin-top:16px;padding:10px 18px;font-size:16px;background:#ea580c;color:#fff;border:0;border-radius:8px}
#msg{margin-top:16px;color:#166534;font-weight:600}</style></head>
<body><main><h1>Weekly newsletter</h1><p>A local demo page for agent-browser.</p>
<form id="f"><label for="email">Email</label><input id="email" type="email" placeholder="you@example.com" required>
<button type="submit">Subscribe</button></form><p id="msg" role="status"></p></main>
<script>
document.getElementById('f').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  document.getElementById('msg').textContent = 'Thanks! We sent a confirmation to ' + email + '.';
});
</script></body></html>
```
{: file="site/index.html" }

From the folder that contains `site`, run the line below to serve it on port 8765 with Python's built-in HTTP server. Leave that terminal running and open another terminal for agent-browser commands. Any static file server works, as long as the URL is `http://localhost:8765/`:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

If you just finished Step 2, run `agent-browser close` first to close the browser. In my main run of this step, the browser was closed, so `open` printed `launched browser` and the refs started at `e1`. If you don't close it first, the refs keep counting up. The warning at the end of this section explains why. Next, open the page and take a snapshot:

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
```

The snapshot lists three elements. The heading is `e1`, the Email field is `e2`, and the Subscribe button is `e3`.

Next, I filled in the email, clicked Subscribe, then checked for the thank-you message and JavaScript errors:

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![Real terminal output: open prints launched browser; snapshot -i lists e1 to e3; fill @e2 and click @e3 both show Done; wait --text "Thanks" succeeds; get text "#msg" returns Thanks! We sent a confirmation to reader@example.com.; errors prints nothing](term-verify.webp){: w="1102" h="658" }

![Screenshot taken by agent-browser: the Email field contains reader@example.com, and a green thank-you message appears below the button](page-good.webp){: w="1280" h="577" }
_In the working version, the message appears and `errors` prints nothing_

Each of these commands checks one thing:

- `wait --text "Thanks"` waits until that text appears on the page and fails if it never does. According to `wait --help`, `--text` is a substring match. The core skill also recommends this kind of wait over a fixed wait such as `wait 2000`.
- `get text "#msg"` reads the full text of the `#msg` element, so you can confirm the email you typed made it in. Always quote `"#msg"`. On my first attempt, the wrapper script lost the quotes, so the command that ran was `agent-browser get text #msg`. The shell treated everything after `#` as a comment, and agent-browser replied `Missing arguments for: get text`.
- `errors` lists JavaScript errors and uncaught exceptions on the page. It printed nothing here, so the tool recorded no JavaScript errors during this run. You still need to check the page's result to tell whether the feature works.

> Don't copy refs from the docs examples. On my first attempt I wrote `fill @e1` straight from a docs example and got `✗ Unknown ref: e1`. The next command, `click @e2`, reported `✓ Done`, but in that run `e2` was the heading, not the button, so the `wait` after it timed out after 25000ms. The cause was that I hadn't run `close` first. The same session had already opened example.com, whose link used up `e1`, so the form's heading, Email field, and button were numbered `e2`, `e3`, and `e4`. According to the Snapshots docs, navigating to another page invalidates the old refs, but their IDs aren't recycled. So within one session, the numbers keep counting up after each navigation. Before every action, use the refs from the latest snapshot.
{: .prompt-warning }

## Step 4: Break it on purpose and see if it notices

I copied `index.html` to `broken.html` and changed two lines. Line 2 adds ` (broken)` to the `<title>`. Line 15 misspells the ID of the message element, `msg`, as `mesage`. Leave every other line alone, including `#msg` in the CSS on line 7 and `id="msg"` on line 10. If you replace every `msg`, the typo cancels out and the page works again. You can make your own copy from the diff below and put it in the same `site` folder:

```diff
--- site/index.html
+++ site/broken.html
@@ -2 +2 @@
-<html lang="en"><head><meta charset="utf-8"><title>Newsletter demo</title>
+<html lang="en"><head><meta charset="utf-8"><title>Newsletter demo (broken)</title>
@@ -15 +15 @@
-  document.getElementById('msg').textContent = 'Thanks! We sent a confirmation to ' + email + '.';
+  document.getElementById("mesage").textContent = 'Thanks! We sent a confirmation to ' + email + '.';
```

The typo doesn't change how the page looks. After you click the button, the message never appears.

I ran the same flow again in the same session. This time the snapshot gave the heading `e4`, the Email field `e5`, and the button `e6`, because it was still the same session and the numbers kept counting up. I added `--timeout 5000` to `wait` so it only waits 5 seconds. Without it, `wait` uses the default of 25 seconds. `--help` lists `AGENT_BROWSER_DEFAULT_TIMEOUT` with a default of 25000 ms.

```bash
agent-browser open http://localhost:8765/broken.html
agent-browser snapshot -i
agent-browser fill @e5 "reader@example.com"
agent-browser click @e6
agent-browser wait --text "Thanks" --timeout 5000
agent-browser errors
agent-browser console
agent-browser screenshot shots/broken.png
```

![Real terminal output: fill and click both show Done; wait --text "Thanks" times out after 5000ms; errors reports TypeError: Cannot set properties of null (setting 'textContent') at line 15, column 49 of broken.html](term-broken.webp){: w="1102" h="546" }

![Screenshot taken by agent-browser: the Email field is filled in, but after clicking Subscribe the area below the button is empty, with no thank-you message](page-broken.webp){: w="1280" h="577" }
_In the broken version, nothing on screen shows an error, and the message never appears_

`fill` and `click` both reported `✓ Done`. According to the README, `click` fails when the target is covered, hidden, or disabled, so `Done` only means the action happened. It doesn't mean the page reacted correctly. Those two lines alone don't show the problem. The next two commands do:

1. `wait --text "Thanks" --timeout 5000` printed `✗ Wait timed out after 5000ms`, so the expected message never appeared.
2. `errors` printed `TypeError: Cannot set properties of null (setting 'textContent')` at `broken.html:15:49`, which is line 15, where I put the typo. `getElementById("mesage")` finds no element and returns `null`, and setting `textContent` on `null` throws this error.

`console` printed nothing this time, and the last `screenshot` captured the page shown above, with the thank-you message missing.

So when you test a page, confirm that the expected result appeared and that `errors` prints nothing. `✓ Done` on an action doesn't mean the page passed.

### Extra: Label refs on a screenshot

To see which ref matches which part of the screen, use `screenshot --annotate`. The next two images come from a separate run. I used a new session, set the window size, then opened the form and took an annotated screenshot. To try this, first close the session from Step 4:

```bash
agent-browser close
agent-browser set viewport 1280 800
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
agent-browser close
```

![Real terminal output: snapshot -i lists three elements, a heading, textbox "Email", and button "Subscribe"; screenshot --annotate saves the file and prints a legend mapping [1] @e1, [2] @e2, and [3] @e3](term-annotate.webp){: w="1102" h="388" }

![Screenshot taken by agent-browser with --annotate: the heading, the Email field, and the Subscribe button are boxed in red and labeled 1, 2, and 3](page-annotated.webp){: w="1280" h="800" }
_Labels [2] and [3] on the screenshot are `@e2` and `@e3` from the snapshot_

## Step 5: Hand it to the AI

I ran the commands above from a few shell scripts I wrote, with no AI involved. Below are three ways to hand the check to an AI. The first two give the workflow to your existing coding agent; the third uses the built-in `chat` command to check a local site that's already running. I only tested the third.

### Option 1: Install the official skill

A skill is a usage guide written for a coding agent to read. According to the docs, the command below installs the agent-browser skill into your coding agent. Supported agents are Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, Goose, OpenCode, and Windsurf:

```bash
npx skills add vercel-labs/agent-browser
```

I didn't run this step. According to the v0.43.0 README, the skill it installs is a short stub that tells the agent to run `agent-browser skills get core` first, so the guide the agent reads matches the CLI version you installed. `skills get core` prints agent-browser's bundled core skill, and it was the first command the AI ran in Option 3.

The core skill warns that the default session is one browser shared by everything on the machine. Working in it can take over another agent's page, so give each task its own `--session <name>`. All my test runs used the default session, without `--session`.

### Option 2: Put it in AGENTS.md

If your project has an `AGENTS.md` or `CLAUDE.md`, you can write the flow into it. See [How to Write AGENTS.md](/posts/agents-md-project-rules-for-coding-agents/) for how. The Installation docs provide a short section on the basic loop. Below is my template based on that section, with a few testing rules added. I haven't given this template to an AI to run, so change the URL and the expected text to fit your project:

```markdown
## Test web changes before you report them done

When you change a page, a form, or a button, open the page with agent-browser and test it. Don't rely on reading the code.
Run `agent-browser --help` to see every command.
Add `--session <name for this task>` to every command. Don't use the default session.

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`: open local URLs only
2. `agent-browser snapshot -i`: get the elements and their refs
3. Act with refs from the latest snapshot, such as `fill @e2 "..."` and `click @e3`. Don't guess refs.
4. `agent-browser wait --text "<text you expect to appear>"`
5. `agent-browser errors`
6. `agent-browser close`

If the expected text doesn't appear, or `errors` prints anything, the task isn't done. Report the error.
Take a new snapshot whenever the page or its content changes.
```

### Option 3: Use the built-in chat command

agent-browser also has a `chat` command. According to `chat --help`, it sends your plain-language instruction to an AI model, which turns it into agent-browser commands and runs them in the session you select. It can't create or switch sessions. `chat` needs `AI_GATEWAY_API_KEY`. According to `--help`, `AI_GATEWAY_URL` is the Vercel AI Gateway base URL, with a default of `https://ai-gateway.vercel.sh`. The default model is `anthropic/claude-sonnet-4.6`, and `--model` picks a different one.

I have access to an OpenAI-compatible LiteLLM service, so I pointed `AI_GATEWAY_URL` and `AI_GATEWAY_API_KEY` at it. The key and the URL stayed in environment variables and never went into any file. With the local HTTP server still running, first run `agent-browser close` to close the previous browser, then ask the `gpt-6.1-sol` model to check the broken page:

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![Real terminal output: the chat command runs skills get core, open, snapshot, fill @e2, click @e3, wait --text "Thank", snapshot, skills get core --ref commands, errors, and console, then answers that the form doesn't work, quoting the TypeError and broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_The AI ran 10 commands on its own and reached the same conclusion I did by hand (real output)_

From start to the final `close`, the run took 36 seconds. The AI's first command was `skills get core`, which loads the core skill. Then it ran `open`, a `snapshot` without `-i`, `fill @e2`, `click @e3`, and `wait --text "Thank" --timeout 3000`. After that it took another `snapshot`, looked up `skills get core --ref commands`, and finally checked `errors` and `console`. Its refs were `e2` and `e3` because I had run `close` at the end of the previous run, so this was a new session. In the end it answered that the form doesn't work, quoting the same `TypeError` and `broken.html:15:49`.

I also ran the same instruction once with `-v`, which prints the full output of every command. The command order and the conclusion were the same, and `wait` printed `✗ Wait timed out after 3000ms`. Both runs used only one model, `gpt-6.1-sol`.

## Step 6: Limit where it can go and what it can do

According to the Security docs, agent-browser puts no limits on navigation, actions, or output by default. You have to turn those controls on yourself. The AI can open any site, and it can use `eval` to run any JavaScript on the page, such as reading `document.cookie`. If you're worried about the AI being misled by page content, for example a page with hidden text telling it to open some URL, you need to narrow the scope yourself. For more on this kind of risk, see the tool misuse section of my [OWASP Agentic Top 10 Checklist](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

I tested two settings:

- `--allowed-domains` allows only the listed domains. According to the docs, it blocks page navigation as well as sub-resource requests such as images, scripts, and fetch calls.
- `--action-policy` points to a policy file in JSON that lists which actions to block.

![Real terminal output: with --allowed-domains "localhost", the local page opens, and open https://example.com is blocked with Domain 'example.com' is not in the allowed domains list; with the docs' example policy.json, eval still runs and returns the title; with policy-0.43.json, which adds evaluate, eval is blocked](term-security.webp){: w="1102" h="883" }
_The domain limit works; the docs' `"eval"` doesn't block anything in 0.43.0, so add `"evaluate"` (real output)_

The domain limit matched the docs. After I opened a session with `--allowed-domains "localhost"`, `open https://example.com` was blocked with `✗ Domain 'example.com' is not in the allowed domains list`. According to the docs, the domain limit and the action policy are saved with the session until a successful `close`.

The action policy didn't match the docs. I started with the example from the Security docs, `"deny": ["eval", "download", "upload"]`, and `eval "document.title"` still ran and returned `"Newsletter demo"`. I checked the v0.43.0 source. `cli/src/native/policy.rs` compares the command's internal action name exactly. The internal action name of the `eval` command is `evaluate`, so the `eval` category from the docs has no effect. Someone has already reported this in [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612), and the fix is in [PR #2506](https://github.com/vercel-labs/agent-browser/pull/2506). Both were still open when I wrote this post. After I added `"evaluate"`, `eval` was blocked with `✗ Action 'evaluate' denied by policy: Action 'evaluate' is denied by policy`:

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

The file keeps `"eval"`. According to the description of PR #2506, the fix makes category names match the actions under them, and then the `"eval"` entry will take effect. I didn't test whether `download` and `upload` get blocked.

I also tried two more setups by hand. The first was the strict example from the Security docs, changed to `"default": "deny"` with an `allow` list of `navigate`, `snapshot`, `click`, `fill`, `wait`, `get`, and `close`. `open`, `snapshot -i`, `fill`, `click`, and `wait --text` all ran, but `get text "#msg"` was blocked with `Action 'gettext' denied by policy`. `get title`, `get url`, `screenshot`, and `errors` were blocked too, because their internal action names are `title`, `url`, `screenshot`, and `errors`, which aren't in the list. The second was `--confirm-actions eval`, which had no effect either. `eval "1+1"` returned `2` without asking for confirmation.

So after you set an action policy, run an action it should block, like I did, and confirm it gets stopped. Also confirm that the commands you need aren't blocked along with it. Don't trust the contents of the policy file alone.

The next few measures come from the official docs. I didn't run any of them:

- According to `--help`, `--profile` reuses the sign-in state of a Chrome profile. If you use the profile you normally sign in with, the AI can use the state of every account signed in to that profile. According to the Security docs, `--allowed-domains` can't be combined with `--profile` either. When you need to sign in, the Security docs offer the auth vault. `agent-browser auth save` stores the credentials locally, you then sign in by name, and the password stays out of what the AI reads.
- `--content-boundaries` wraps page content in markers with a random nonce, so the AI can tell tool output apart from text on the web page.
- `--max-output` caps the length of output from snapshot, `get text`, `get html`, `eval`, and `console`, so one huge page doesn't flood the AI's context.

According to the Security docs, the domain limit isn't an operating system firewall. If you use Claude Code, you can add a second layer at the operating system level with [Claude Code Sandbox Setup](/posts/claude-code-sandbox-setup/).

## Next: build it into your workflow

To make testing part of your workflow, add the steps to your project instructions or set up an automatic check:

- Put the template from Step 5 in `AGENTS.md`, so coding agents that support it can read the steps when they start.
- Use a hook to run a check automatically before the AI reports it's done. See [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/).
- Prove it works before you merge. I described that flow in [pstack, Part 3](/posts/pstack-build-verify-merge/).

## Conclusion

The key result of my run is in Step 4. On the broken form, `fill` and `click` both reported `✓ Done`. What caught the problem was `wait --text` timing out and the `TypeError` at `broken.html:15:49` that `errors` printed. When the AI checked the same page with `chat`, it reached the same conclusion. Also, in 0.43.0 an action policy that denies `"eval"` as the docs show doesn't block `eval`. You need `"evaluate"`.

I suggest starting in this order:

1. Install with `npm install -g agent-browser` and `agent-browser install`, then check the version with `agent-browser --version`.
2. Against your own local page, run `open`, `snapshot -i`, `fill` or `click`, `wait --text`, and `errors`, in that order.
3. Put the testing rules in `AGENTS.md`, and require the AI to always use refs from the latest snapshot.
4. Add `--allowed-domains`. When you set an action policy, try a blocked action yourself to confirm it gets stopped.

## Further reading

- The [agent-browser docs](https://agent-browser.dev/) cover every command, setting, and advanced feature.
- [Security](https://agent-browser.dev/security) is the full guide to domain limits, the action policy, the auth vault, and other safety settings.
- [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/posts/agents-md-project-rules-for-coding-agents/) shows how to put your testing rules in the project.
- [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/) shows how to run checks automatically.
- [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/) explains why you should limit an agent's tools.
