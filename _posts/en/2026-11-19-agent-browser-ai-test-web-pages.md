---
title: "agent-browser Tutorial: Let AI Test Its Own Web Pages"
description: "Install agent-browser and let your coding agent open a page, fill a form, and catch JavaScript errors itself. Tested on 0.43.0, plus domain and action limits."
date: 2026-11-19 09:00:00 +0800
categories: [AI, Software Development]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.en.webp
  alt: "With agent-browser, an AI opens the page, fills the form, and reads the errors to confirm its fix really works."
---

When I ask an AI to change a web page, this happens a lot: it says "done," I open the browser, click the button, and nothing happens. The AI can see the code but not the screen, so it doesn't know it broke something.

[agent-browser](https://github.com/vercel-labs/agent-browser) is a command-line tool from Vercel Labs that lets an AI drive a browser one command at a time: open a page, list the buttons and fields on it, click one, and check whether the expected result shows up. AI coding agents already run commands in the terminal. Once they learn these few commands, they can click through the page themselves before they say "done."

In this post I'll start from installation and walk through the whole flow on a small local form. I also made a broken copy of the form with a typo on purpose, to see whether agent-browser catches the error. At the end I'll hand the job to an AI and show how to limit which sites it can visit and what it can do.

> **Version and test run**: this post is based on the official material I read on 2026-11-19 (Taipei time): the [GitHub README](https://github.com/vercel-labs/agent-browser), [Installation](https://agent-browser.dev/installation), [Quick Start](https://agent-browser.dev/quick-start), [Snapshots](https://agent-browser.dev/snapshots), and [Security](https://agent-browser.dev/security). On the same day I ran everything on a Debian Linux machine with agent-browser 0.43.0 (the latest version that day, released 2026-11-13) and the Chrome for Testing 158.0.8127.36 build it downloaded. Every screenshot comes from that run. The terminal screenshots are the recorded output, laid out as images without changes; a few show only some of the commands. The tool ships about one release a week, so run `agent-browser --version` before you follow along.
{: .prompt-info }

## A few terms first

- **Headless browser**: a browser without a window. It loads pages and runs JavaScript as usual but doesn't show anything on screen. agent-browser uses this mode by default.
- **Snapshot**: a text list of the elements on a page, such as headings, input fields, and buttons. Reading text is much cheaper for an AI than looking at an image.
- **Ref**: the ID a snapshot gives each element, such as `@e2`. You use it to say which button to click or which field to fill.
- **Session**: a browser that stays open in the background. Every command goes to the same browser, so the page you opened in one step is still there in the next.

## Step 1: Install

The official docs recommend a global npm install, followed by `agent-browser install` to download the Chrome it uses ([Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/), the Chrome build Google provides for automated testing). On macOS you can also use `brew install agent-browser`, and Rust users can use `cargo install agent-browser`.

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![Real terminal output: npm installs agent-browser and prints an install-scripts warning; agent-browser --version prints 0.43.0; agent-browser install downloads and installs Chrome 158.0.8127.36](term-install.webp){: w="1102" h="636" }
_My install on Debian Linux (real output)_

My npm (11.21.1) printed an `install-scripts` warning during the install, meaning agent-browser's install script (postinstall) wasn't allowed to run. Starting with npm 12, install scripts are blocked by default, which I covered in [npm 12 Blocks Install Scripts by Default](/posts/npm-12-install-scripts-allowscripts/). The official docs say agent-browser links itself on the first run in that case, with no extra setup. That matched my run: I ignored the warning, and `agent-browser --version` printed `0.43.0` right away.

On Linux, if launching the browser later fails with a missing shared library error, the official fix is to run `agent-browser install --with-deps`. It uses your system package manager to add the libraries Chrome needs (root or `sudo` required). My machine didn't need it.

After installing, you can run a health check. `--offline --quick` only checks the local machine without going online. My result was `8 pass, 0 warn, 0 fail`:

```bash
agent-browser doctor --offline --quick
```

## Step 2: Run the basic loop once

Using agent-browser comes down to four steps: open the page, take a snapshot, act on refs, and check the result. Whenever the page changes, take a new snapshot.

![The basic agent-browser loop: open the page, use snapshot -i to list interactive elements with refs, fill fields and click by ref, then confirm the result with wait, get, and errors; take a new snapshot when the page changes](core-loop.en.webp){: w="1600" h="900" }

I started with `example.com`, which the official examples use a lot:

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser click @e1
agent-browser get url
```

![Real terminal output: open example.com shows Example Domain; snapshot -i lists link "Learn more" [ref=e1]; get title returns Example Domain; after click @e1, get url returns an iana.org address](term-core.webp){: w="1102" h="568" }
_The snapshot gives `@e1`, and clicking it changes the URL (real output)_

Line by line:

- `open` starts the browser in the background (the first time, it prints `launched browser`), opens the page, and reports its title and URL.
- `snapshot -i` lists only the elements you can interact with. This page has one link, with the ref `e1`.
- `click @e1` clicks that link, and `get url` confirms the URL really changed to IANA's help page.

`-i` stands for interactive. Without it, you get the structure of the whole page, including paragraph text. When you only need buttons and fields, `-i` keeps the output short.

## Step 3: Test a local form

In practice you'll usually check a page you're building. I wrote a newsletter form with just an Email field and a Subscribe button. After you submit it, it should show "Thanks! We sent a confirmation to …". I served it locally with Python's built-in server:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

Then I opened it and took a snapshot. To see which ref matches which part of the screen, use `screenshot --annotate`. It draws the numbers on the screenshot:

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
```

![Real terminal output: snapshot -i lists three elements, a heading, textbox "Email", and button "Subscribe"; screenshot --annotate saves the file and prints a legend mapping [1] @e1, [2] @e2, and [3] @e3](term-annotate.webp){: w="1102" h="388" }

![Screenshot taken by agent-browser with --annotate: the heading, the Email field, and the Subscribe button are boxed in red and labeled 1, 2, and 3](page-annotated.webp){: w="1280" h="800" }
_Labels [2] and [3] on the screenshot are `@e2` and `@e3` from the snapshot_

Next, fill in the email, click Subscribe, then confirm the thank-you message appears and the page has no JavaScript errors:

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![Real terminal output: fill @e2 and click @e3 both show Done; wait --text "Thanks" succeeds; get text "#msg" returns Thanks! We sent a confirmation to reader@example.com.; errors prints nothing](term-verify.webp){: w="1102" h="658" }

![Screenshot taken by agent-browser: the Email field contains reader@example.com, and a green thank-you message appears below the button](page-good.webp){: w="1280" h="577" }
_The working version: the message appears and `errors` prints nothing_

Each of these commands checks one thing:

- `wait --text "Thanks"` waits until that text appears on the page and fails if it never does. That's more reliable than waiting a fixed number of seconds.
- `get text "#msg"` reads the full message, so you can confirm the email you typed made it in.
- `errors` lists JavaScript errors on the page. No output means no errors.

> **A mistake I made: don't copy `@e1` from the examples.** On my first try I wrote `fill @e1` straight from the docs. It failed with `Unknown ref: e1`, and the next command, `click @e2`, clicked the heading instead of the button. In that run I had opened example.com earlier in the same session, so the form's heading, Email field, and button were numbered `e2`, `e3`, and `e4`. When you move to another page in the same session, the numbers keep counting up too (Step 4 starts at `e4`). Before every action, use the refs from the latest snapshot.
{: .prompt-warning }

## Step 4: Break it on purpose and see if it notices

This is the part I most wanted to test. I made a copy of the form and, in its JavaScript, misspelled the ID of the message element, `msg`, as `mesage`. Typos like this are common: the page looks fine, but clicking the button does nothing.

I ran the same flow. Note that the refs are now `e5` and `e6`, because it's still the same session:

```bash
agent-browser open http://localhost:8765/broken.html
agent-browser snapshot -i
agent-browser fill @e5 "reader@example.com"
agent-browser click @e6
agent-browser wait --text "Thanks" --timeout 5000
agent-browser errors
```

![Real terminal output: fill and click both show Done; wait --text "Thanks" times out after 5000ms; errors reports TypeError: Cannot set properties of null (setting 'textContent') at line 15, column 49 of broken.html](term-broken.webp){: w="1102" h="546" }

![Screenshot taken by agent-browser: the Email field is filled in, but after clicking Subscribe the area below the button is empty, with no thank-you message](page-broken.webp){: w="1280" h="577" }
_The broken version: nothing on screen shows an error; the message just never appears_

`fill` and `click` both report `Done`, because the field really was filled and the button really was clicked. From those two lines alone, everything looks fine. The last two lines are what catch the problem:

1. `wait --text "Thanks"` times out after 5 seconds, which means the expected message never appeared.
2. `errors` points straight at `TypeError: Cannot set properties of null (setting 'textContent')` at `broken.html:15:49`, the exact line with my typo.

So when you test a page, checking that each action succeeded isn't enough. You also need to confirm the **result** appeared and the **errors** list is empty.

## Step 5: Hand it to the AI

So far I typed every command myself. There are three ways to get an AI to do this on its own after it changes a page.

### Option 1: Install the official skill

The docs recommend this command to install the agent-browser skill into your coding agent. The supported agents they list include Claude Code, Codex, Cursor, Gemini CLI, and GitHub Copilot:

```bash
npx skills add vercel-labs/agent-browser
```

I didn't run this step. What I did see is that agent-browser ships its own usage guide that matches its version. `agent-browser skills get core` prints it, and the AI in Option 3 read this guide before anything else. One rule in it is worth remembering: the default session is shared by everything on the machine, so several agents using it at once will take over each other's pages. Give each task its own `--session <name>`.

### Option 2: Put it in AGENTS.md

If your project has an `AGENTS.md` or `CLAUDE.md` (see [How to Write AGENTS.md](/posts/agents-md-project-rules-for-coding-agents/)), the docs suggest adding a short section on the basic loop. I'd add a few testing rules too. Here's my template; change the URL and the expected text to fit your project:

```markdown
## Test web changes before you report them done

When you change a page, a form, or a button, open the page with agent-browser and test it. Don't rely on reading the code.
Run `agent-browser --help` to see every command.

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`: open local URLs only
2. `agent-browser snapshot -i`: get the elements and their refs
3. Act with refs from the latest snapshot, such as `fill @e2 "..."` and `click @e3`. Don't guess refs.
4. `agent-browser wait --text "<text you expect to appear>"`
5. `agent-browser errors`

If the expected text doesn't appear, or `errors` prints anything, the task isn't done. Report the error.
Take a new snapshot whenever the page or its content changes.
```

### Option 3: Use the built-in chat command

agent-browser also has a `chat` command. You describe the task in one sentence, and it asks an AI model to turn that into agent-browser commands and run them. By default it connects to Vercel AI Gateway and needs `AI_GATEWAY_API_KEY`. `agent-browser --help` also lists `AI_GATEWAY_URL` for pointing it at a different service, and `--model` for choosing the model. I have access to an OpenAI-compatible model service, so I pointed those two environment variables at it (the key stayed in an environment variable and never went into any file) and asked the `gpt-6.1-sol` model to check the broken page:

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![Real terminal output: the chat command runs skills get core, open, snapshot, fill @e2, click @e3, wait --text "Thank", snapshot, skills get core --ref commands, errors, and console, then answers that the form doesn't work, quoting the TypeError and broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_The AI ran 10 commands on its own and reached the same conclusion I did by hand (real output)_

The whole thing took about 35 seconds. It read the bundled usage guide first, then followed the same flow as Step 4, and finally answered that the form doesn't work, quoting the same `TypeError` and line number. I only tried this one model. Whatever model you use, the point is the same: the AI is working from real browser responses, not its own guesses about the code.

## Step 6: Limit where it can go and what it can do

The official docs are blunt about this: by default, agent-browser puts **no limits** on which URLs it visits, what actions it takes, or what it outputs. The AI can open any site, and it can use `eval` to run any JavaScript on the page, including reading cookies. If you're worried about the AI being misled by page content (say, a page with hidden text telling it to open some URL), you need to narrow the scope yourself. I explained why this matters in the tool misuse section of [OWASP Agentic Top 10 Checklist](/posts/owasp-agentic-top-10-ai-workflow-checklist/).

I tested two settings:

- `--allowed-domains`: only allow the listed domains. The docs say it blocks page navigation as well as sub-resource requests such as images, scripts, and fetch calls.
- `--action-policy`: a JSON file that lists which actions to block.

![Real terminal output: with --allowed-domains "localhost", the local page opens, and open https://example.com is blocked with Domain 'example.com' is not in the allowed domains list; with the docs' example policy.json, eval still runs and returns the title; with policy-0.43.json, which adds evaluate, eval is blocked](term-security.webp){: w="1102" h="883" }
_The domain limit works; the docs' `"eval"` doesn't block anything in 0.43.0, so add `"evaluate"` (real output)_

The domain limit worked as expected. Once the session allowed only `localhost`, `open https://example.com` was blocked right away. The docs say this limit is saved with the session until you run `close`.

The action policy surprised me. I started with the docs' example, `"deny": ["eval", "download", "upload"]`, and `eval "document.title"` still ran and returned the title. When I dug in, I found that 0.43.0 matches the command's internal name, and the internal name of the `eval` command is `evaluate`, so the `eval` category from the docs has no effect. Someone has already reported this in [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612), and it wasn't fixed when I wrote this post. After I added `"evaluate"`, `eval` was blocked:

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

I kept `"eval"` so the file still works once the category matching is fixed. I didn't test whether `download` and `upload` actually get blocked. Since the matching isn't reliable yet, my advice is this: after you set a policy, actually try a blocked action like I did and confirm it gets stopped. Don't trust the config file alone.

A few more recommendations from the official Security docs (I didn't test each one):

- **Don't use the Chrome profile you normally sign in with.** `--profile` can reuse the sign-in state of a Chrome profile, which hands every account you're signed into over to the AI. When you need to sign in, use the official auth vault (`agent-browser auth save`) instead. Passwords stay out of what the AI reads.
- **`--content-boundaries`**: wraps page content in markers so the AI can tell tool output apart from text on the web page.
- **`--max-output`**: caps the length of output from `snapshot`, `get text`, and similar commands, so one huge page doesn't flood the AI's context.

If you use Claude Code, you can also add a second layer at the operating system level with [Claude Code Sandbox Setup](/posts/claude-code-sandbox-setup/).

## Next: build it into your workflow

The most reliable way to make the AI test its work is to not depend on it remembering. A few options:

- Put the rules from Step 5 in `AGENTS.md`, so every agent reads them when it starts.
- Use a hook to run a check automatically before the AI reports it's done. See [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/).
- Make "prove it works before you merge" a habit. I described that flow in [pstack, Part 3](/posts/pstack-build-verify-merge/).

## Conclusion

agent-browser lets an AI drive a real browser with a few simple commands. The biggest lesson from my run was Step 4: `fill` and `click` both reported success, yet the form was broken. What actually caught the problem was `wait --text` timing out and the one-line error that `errors` printed.

I suggest starting in this order:

1. Install with `npm install -g agent-browser` and `agent-browser install`.
2. Run `open` → `snapshot -i` → `fill`/`click` → `wait --text` → `errors` once against your own local page.
3. Put the testing rules in `AGENTS.md`, and require the AI to always use the latest refs.
4. Add `--allowed-domains`. When you set an action policy, test it yourself to confirm it blocks what it should.

## Further reading

- [agent-browser docs](https://agent-browser.dev/): every command, setting, and advanced feature.
- [Security](https://agent-browser.dev/security): the full guide to domain limits, action policies, the auth vault, and other safety settings.
- [How to Write AGENTS.md: Give Coding Agents Your Project Rules](/posts/agents-md-project-rules-for-coding-agents/): put your testing rules in the project.
- [Claude Code Hooks: Format, Test, and Flag Sensitive Files](/posts/claude-code-hooks-automate-checks/): run checks automatically.
- [OWASP Agentic Top 10 Checklist: Audit Your AI Workflow](/posts/owasp-agentic-top-10-ai-workflow-checklist/): why you should limit an agent's tools.
