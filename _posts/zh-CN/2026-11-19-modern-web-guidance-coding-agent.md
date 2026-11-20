---
title: "Modern Web Guidance 实测：让 coding agent 跟上网页新写法"
description: "Modern Web Guidance 1.0.1 实测：安装 agent skill，用 legacy-scan 扫出旧网页写法，交给 Claude Code 和 Codex 按指南修改，再用 Chrome 对比改前改后，附沙箱里遇到的问题。"
date: 2026-11-19 17:00:00 +0800
categories: [AI, skills]
tags: [modern-web-guidance, agent-skills, coding-agent, claude-code, codex, web-platform, sandbox]
media_subpath: /assets/img/posts/modern-web-guidance-coding-agent/
image:
  path: cover.zh-CN.webp
  alt: "手绘笔记风插图：小机器人拿放大镜检查旧网页表单，箭头指向打勾的新表单，旁边写着 legacy-scan 扫出旧写法、agent 按指南改完、重新扫描归零。"
---

Modern Web Guidance 的 SKILL.md 开头写，模型训练数据里有过时的写法（training weights contain obsolete patterns）。比如用 JavaScript 读取 `scrollHeight` 让输入框变高，或者自己判断点击位置来关闭对话框，现在都有浏览器内置的写法。

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) 是一套给 coding agent 用的 skill 和命令行工具。根据 [GitHub README](https://github.com/GoogleChrome/modern-web-guidance)，它由 Google Chrome、Microsoft Edge、Mozilla Firefox 和 MDN 团队与社区共同维护。agent 写网页前先用它查指南，指南会告诉 agent 现在该用哪个 HTML、CSS 或 JavaScript 功能、浏览器支持到什么程度、不支持时改用什么写法。它另外有一个 `legacy-scan` 命令，可以扫出现有项目里该替换掉的旧写法。

这篇我在开了沙箱的 Claude Code 里实际安装它。我写了一个留言板示例页，先用 `legacy-scan` 扫描，再交给 Claude Code 按指南修改，最后用浏览器对比改前改后。过程中在沙箱里卡住的地方，我也一并写出来。

> 我对照的官方资料是 [Modern Web Guidance 文档](https://developer.chrome.com/docs/modern-web-guidance)、[1.0 发布文章](https://developer.chrome.com/blog/modern-web-guidance-v1)（2026-11-10 发布）、[Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow)，以及 npm 包 1.0.1 里的 README 与 SKILL.md，读取日期是 2026-11-19。实测在同一天（台北时间）进行，环境是 macOS、Node.js 25.2.1、npm 11.6.2、Claude Code 2.1.328（模型 `claude-opus-5-5`），Claude Code 的沙箱是开着的。modern-web-guidance 用的是 1.0.1，也就是当天 npm 上标为 latest 的版本；安装时一起拉取的 `skills` 是 1.9.0。文中的终端截图是把当时录下的输出排成图片，只去掉了颜色控制码、spinner 动画的中间帧，以及我录制时自己加的退出码标记。改版时我在第二台电脑用同样的命令重跑，`search`、`retrieve`、`skills-lock.json` 和两次 `legacy-scan` 的输出都和第一次相同，图片用的是重跑的输出；`install` 那张因为检测到的 agent 名称不同，保留第一次的输出。
{: .prompt-info }

## 工作原理

Modern Web Guidance 分成两部分：

- skill 是一份 SKILL.md，加上 `guides/` 文件夹里的指南。我装进项目后数了一下，`guides/` 下面有 210 份 Markdown。
- CLI 是 npm 包 `modern-web-guidance`。agent 按 SKILL.md 的指示运行 `npx -y modern-web-guidance@latest search "<查询>"` 找出相关指南的 ID，再用 `retrieve <ID>` 把整份指南读进上下文。

agent 什么时候会用它，要看 SKILL.md 的 description。这段写明所有 HTML、CSS 与前端 JavaScript 工作都要先运行它（MANDATORY: Execute FIRST），后面还列了一长串触发主题，比如对话框、表格、深色模式、表单验证、Core Web Vitals。description 如何影响触发，我在《[自己写 Agent Skill](/posts/agent-skill-authoring-guide/)》里写过。

根据 README 的 How It Works，`search` 用的是本地的嵌入模型和 BM25 匹配，不调用外部 API，也不需要 API key。

根据 Modernization workflow 文档，`legacy-scan` 在本地用固定规则扫描项目，不调用任何模型。它只覆盖能用静态规则判断的指南，我这次的扫描结果写的是 38 份，约占全部指南的 20%。扫出来的结果还要由 agent 按每条规则附带的保留条件（Keep when）与排除条件（Drop when）判断是不是误报。1.0 发布文章也写明它没有 `--fix` 参数，它只负责找，修改交给 agent。

官方文档首页写，公开评测中有指南时的通过率是 91%，没有指南的前沿模型约 51%。README 另有一张逐次结果表，其中 11 月 8 日的 `claude_code (opus-5-5)` 一行是 57% → 88%。这些数字都来自官方页面（2026-11-19 读取），不是我测出来的。我自己只跑了下面这一个示例。

## 准备：在沙箱里跑 npx

我的 Claude Code 开着沙箱，命令只能写入项目文件夹和 `$TMPDIR`，沙箱的设置方法可以参考《[Claude Code 沙箱设置教程](/posts/claude-code-sandbox-setup/)》。我第一次在沙箱里跑 `npm view modern-web-guidance`，npm 就返回了 `EPERM`，并提示“Your cache folder contains root-owned files”，让我用 `sudo chown` 修复 `~/.npm`。但问题不在文件所有者，是沙箱不让 npm 写入 `~/.npm` 的缓存。我把缓存改到 `$TMPDIR` 下面，后面的 npx 就都能跑了：

```bash
export npm_config_cache="$TMPDIR/npm-cache"
export DISABLE_TELEMETRY=1
```

第二行是关闭使用数据上报。我读了 CLI 的源代码，`search`、`retrieve`、`legacy-scan`、`install` 这些命令运行时，会在后台启动一个独立的子进程，把使用数据发到 `play.googleapis.com`。根据 README 的 Telemetry & Privacy 一节，收集的内容包括安装次数、调用它的 agent 名称、取回的指南 ID，以及 agent 生成的搜索词，不包括用户原本的提示词。设置 `DISABLE_TELEMETRY=1` 就不会发送。所以搜索本身虽然在本地匹配，搜索词默认还是会发出去。

安装前，我先用 `npm pack modern-web-guidance@1.0.1` 把包下载下来看，做法和《[Claude Code plugin 安全安装](/posts/claude-code-plugin-safe-install/)》一样。1.0.1 的 `package.json` 没有 `scripts`，所以安装时不会跑安装脚本。包里共 281 个文件，解压后 17 MB，其中搜索用的向量数据约 8.8 MB，打包成单个文件的 `legacy-scan.mjs` 约 4.9 MB，指南约 1.9 MB。`install` 子命令只是运行下面这条命令：

```bash
npx -y skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance
```

`skills` 是 Vercel 的 skill 安装工具，这里没有指定版本，会拉取当时 npm 上的最新版（我那次是 1.9.0）。它从 GitHub 上的 `GoogleChrome/modern-web-guidance` 拉取 skill，而不是从我刚用 `npm pack` 下载的包里复制。

## 步骤一：先不安装，试 search 和 retrieve

不安装也能直接用 CLI。官方文档的示例是 `@latest`，我改成固定 `@1.0.1`，让输出可以复现：

```bash
npx -y modern-web-guidance@1.0.1 search "submit on enter key"
npx -y modern-web-guidance@1.0.1 retrieve ime-safe-enter-submit | head -n 12
```

![终端实际输出：search "submit on enter key" 返回 10 条 id 与 description，第一条是 ime-safe-enter-submit；retrieve ime-safe-enter-submit 打印指南开头，说明使用输入法的用户按 Enter 是在确认候选词](term-search.webp){: w="1100" h="1199" }
_search 返回 JSON，retrieve 打印指南全文，这里只截取前 12 行（实际输出）_

`search` 返回 10 条结果，每条有 `id` 和 `description`。第一条 `ime-safe-enter-submit` 就是我要找的。SKILL.md 对 agent 搜索词的写法有规定：描述用户看得到的功能，比如 `"light dismiss dialog"`；不要加 React、Tailwind 这类框架名称，也不要加项目里的组件或文件名；一次只查一个功能。

`retrieve` 打印的是整份指南。这份是 115 行的 Markdown，里面有问题说明、推荐写法、无障碍注意事项和浏览器支持数据。指南写到，中文、日文、韩文用户用输入法打字时，按 Enter 是在确认候选词。如果代码在 `keydown` 里看到 Enter 就提交，用户还没选完词，消息就发出去了。指南推荐的写法是先检查 `event.isComposing`。Safari 在确认候选词的那次 Enter 会把 `isComposing` 报告为 `false`，所以还要加上 `event.keyCode === 229`。

## 步骤二：安装到项目

官方文档的安装命令是在项目文件夹运行 `npx modern-web-guidance@latest install`。我同样固定了版本，并加了两个参数：

```bash
npx -y modern-web-guidance@1.0.1 install --agent claude-code -y
```

`--agent` 和 `-y` 是 `skills add` 的参数，`install` 会把多出来的参数原样传给它。`--agent claude-code` 只装给 Claude Code，`-y` 跳过确认。

![终端实际输出：install 检测到 claude agent 后以非交互方式安装，从 GitHub clone 仓库，找到 2 个 skill，选了 modern-web-guidance，最后复制到 ./.claude/skills/modern-web-guidance](term-install.webp){: w="1100" h="1002" }
_我在 Claude Code 的沙箱里运行，所以输出第一行是检测到 claude agent（实际输出）_

因为我是在 Claude Code 里运行的，`skills` 检测到 agent 环境，直接以非交互方式安装。在普通终端里运行时，它可能会问你要装给哪些 agent、装在项目里还是全局，这种情况我没有试。最后一行提醒使用前先检查 skill：“Review skills before use; they run with full agent permissions.”所以我装完先看了装进来的文件。

项目里多了两样东西：

![终端实际输出：skills-lock.json 记录 source、commit 64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65 与 computedHash；.claude/skills/modern-web-guidance 下面只有 guides 和 SKILL.md；guides 下面有 210 份 Markdown](term-lock.webp){: w="1100" h="608" }

- `.claude/skills/modern-web-guidance/`：只有 `SKILL.md` 和 `guides/`，没有 CLI 本体。
- `skills-lock.json`：记录这份 skill 来自 GitHub 的哪个 commit（`64a6d70`）和内容哈希值。

lock 文件锁住的是指南的内容，锁不住 CLI 版本。装进来的 SKILL.md 让 agent 运行的是 `npx -y modern-web-guidance@latest`，所以就算你安装时写了 `@1.0.1`，agent 每次查询时跑的仍是 npm 上当时的最新版。我对比过，这天装进来的 SKILL.md 和指南，与 npm 1.0.1 包里的内容完全相同。

根据官方文档，也可以用 `npx skills add GoogleChrome/modern-web-guidance` 安装。Claude Code 用户还可以先运行 `claude plugin marketplace add GoogleChrome/modern-web-guidance`，再运行 `claude plugin install modern-web-guidance@googlechrome`，以 plugin 的形式安装。这两种我没有试。README 另外提醒，以前从 `claude-plugins-official` 装的版本从 10 月 12 日起停在 `v0.0.194`，要卸载后改从 `googlechrome` marketplace 重新安装。README 也列出了 GitHub Copilot CLI、OpenAI Codex 等其他 agent 的安装方法，我只测了 Claude Code。

指南会根据 Baseline 判断一个功能能不能直接用。根据官方的 [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) 文档，没有指定时默认目标是 Baseline Widely available；要修改的话，在 `AGENTS.md` 或 `CLAUDE.md` 里写一句类似“This project's Baseline target is Baseline 2024.”的说明。这次我没有设置，用的是默认值。

## 步骤三：准备一个带旧写法的留言板

这个示例页是我照着 `legacy-scan` 的规则清单写的，里面的旧写法都是故意放的。它是一个留言板，按 Enter 发送留言，Shift+Enter 换行，还有一个“Clear all”按钮会弹出确认对话框。我放了五种旧写法：

1. `keydown` 看到 Enter 就提交，没有检查输入法是否正在选词。
2. 用 JavaScript 读取 `scrollHeight`，让输入框随内容变高。
3. 用 `textarea:invalid` 显示错误样式。
4. 对话框靠 `e.target === confirmDialog` 判断是否点到了背景，再自己关闭。
5. 用 `list.innerHTML = ''` 清空留言。

三个文件放在 `site/` 文件夹。如果要跟着做，请原样保存，下一步扫描结果的行号才会和我的一致：

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

我先把整个文件夹提交到 git，之后才能看到 agent 改了什么。

## 步骤四：用 legacy-scan 扫描一次

在项目根目录运行：

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![终端实际输出：legacy-scan 在 5 份指南下找到 6 项，分别是 dialog 的 app.js:41、form-fields-automatically-fit-contents 的 app.js:13 与 app.js:19、ime-safe-enter-submit 的 app.js:25、js 的 app.js:46、validate-input-after-interaction 的 style.css:7，每项都附 Keep when 与 Drop when](term-scan-before.webp){: w="1100" h="1667" }
_五种旧写法全被找到，自动变高的那段算成了两项（实际输出）_

结果是 5 份指南、6 项。自动变高那段被算了两次：一次是第 19 行读取 `scrollHeight` 的地方，一次是第 13 行在 `post()` 里调用 `autosize()`。每一项都附有规则说明、Keep when 和 Drop when。输出开头也写明，静态分析的结果只是初步判断，要用这些条件再确认一次。

这一步不会改任何文件。输出的最后一行提示可以用 `retrieve <guide-id>` 读对应的指南。

## 步骤五：交给 Claude Code 修改

我让 Claude Code 以非交互模式（`-p`）运行，这样整个过程可以录成 JSON 事后检查。提示词用的是 1.0 发布文章里的写法 `/modern-web-guidance Modernize the code in this directory`，也就是直接调用这个 skill，所以这次没有测到 agent 会不会自己判断要用它。

```bash
claude -p "/modern-web-guidance Modernize the code in this directory" \
  --setting-sources project \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" \
    "Bash(npx -y modern-web-guidance@latest *)" \
    "Bash(pnpx modern-web-guidance@latest *)" \
  --output-format stream-json --verbose --no-session-persistence > run1.jsonl
```

几个参数的用途：

- `--setting-sources project` 只读项目的设置，不加载我自己的用户设置和 plugin。运行记录的 init 事件显示，加载的 skill 除了 Claude Code 内置的那些，只有 modern-web-guidance。
- `--permission-mode acceptEdits` 让它可以直接改文件。
- `--allowedTools` 只放行读文件、改文件，以及 SKILL.md 自己建议放行的 `npx -y modern-web-guidance@latest *`。我的电脑装了 pnpm，SKILL.md 说有 pnpm 时优先用 `pnpx`，所以 `pnpx` 也一起放行。为此我还多设了两个 pnpm 的缓存变量，两次运行 agent 都没有用到 `pnpx`，这里就省略了。

我是在外层 Claude Code 的沙箱 shell 里先设好 `npm_config_cache` 和 `DISABLE_TELEMETRY`，再启动 `claude -p`，所以 agent 运行的命令会带着这两个环境变量，也受同一个沙箱限制。示例项目没有自己的沙箱设置，`--setting-sources project` 也不会读我的用户设置。从普通终端运行同样的命令，应该不会遇到后面 `/tmp/npm-cache` 的权限错误，这个我没有试。

### 第一次：扫描命令被拦下

agent 一开始就要跑扫描，但它在命令前面加了 `NPM_CONFIG_CACHE=/tmp/npm-cache`：

```text
NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest legacy-scan . --json
→ This command requires approval
```

这个前缀来自 SKILL.md，它点名了 Codex、Claude Code 这类有沙箱的环境，说 `~/.npm` 不能写时就设 `NPM_CONFIG_CACHE=/tmp/npm-cache`。但命令前面多了环境变量，就匹配不上 SKILL.md 建议的放行规则 `npx -y modern-web-guidance@latest *`。非交互模式不会弹出询问，所以直接被拦掉。

扫描跑不了，agent 改为读 `.claude/skills/modern-web-guidance/guides/` 里的指南，自己读代码找出问题并修改。整轮 73 秒、18 轮对话，运行记录里的 `total_cost_usd` 是 0.62 美元。它汇报的开头就写，扫描和语法检查都因为没有放行而没跑，所以改完也没有重新扫描确认；它也说自己没有在浏览器里打开过页面。

它还按 `declarative-dialog-popover-control` 指南，把“Clear all”改成 HTML 的 `commandfor` 与 `command="show-modal"`。不支持的浏览器要另外加载 polyfill，它照着指南的 CDN 示例写了这段，也把 `<script>` 改成了 `type="module"`：

```javascript
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  import('https://esm.run/invokers-polyfill');
}
```

这个网址没有指定版本，不支持 `command` 的浏览器会在运行时加载 `invokers-polyfill` 当时的最新版。指南写的是，有 bundler 或 import map 的项目用 `npm install invokers-polyfill`，其他情况用 CDN。我的示例没有 bundler，所以 agent 照着选了 CDN。它在汇报里把这点列为“One decision for you”，说也可以改成两行的 fallback，不加载外部代码。如果你的项目不允许在运行时从 CDN 加载代码，就要在 `CLAUDE.md` 或 `AGENTS.md` 里写清楚，写法可以参考《[AGENTS.md 怎么写](/posts/agents-md-project-rules-for-coding-agents/)》。

### 第二次：放行规则匹配上了，缓存路径却写不进去

我把页面还原，提示词完全不变，只在 `--allowedTools` 里多加一条规则：

```bash
"Bash(NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest *)"
```

这次命令执行了，但 npm 失败了：

```text
npm error code EPERM
npm error syscall mkdir
npm error path /tmp/npm-cache
...
npm error Your cache folder contains root-owned files, due to a bug in
```

原因是我的沙箱只允许写入 `$TMPDIR`（`/tmp/claude-501`），不包括 `/tmp/npm-cache`。agent 接着改试 `NPM_CONFIG_CACHE=$TMPDIR/npm-cache`，Claude Code 返回“A variable in this command can't be checked before it runs”，因为放行规则没法事先确认变量展开后的命令。它又试了写死路径的版本，同样不符合放行规则。最后它去掉前缀，运行 `npx -y modern-web-guidance@latest legacy-scan site --json`。这次成功了，因为环境里本来就有我设的 `npm_config_cache`。

扫描成功之后，agent 按 Modernization workflow 的流程做了这几件事：

1. 扫到 6 项，逐一对照 Keep when 和 Drop when，结论是 6 项都保留。
2. 用 `retrieve` 一次取回 `dialog`、`form-fields-automatically-fit-contents`、`ime-safe-enter-submit`、`validate-input-after-interaction` 四份指南，接着又取回 `validate-input-after-interaction` 和 `js`。
3. 改写三个文件。
4. 重新运行 `legacy-scan site --json`，`totalFindings` 是 0。

整轮 90 秒、17 轮对话，`total_cost_usd` 是 0.59 美元。这次被拦的 4 条命令里，3 条是缓存路径的尝试，另一条是把 `node --check site/app.js` 和重新扫描串在一起的命令，因为 `node --check` 不在放行清单里。最后它拆开来只跑了重新扫描。

Enter 发送的部分改成了这样：

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

其他几处：

- 删掉自动变高的 JavaScript，改用 CSS `field-sizing: content`，并用 `max-block-size: 12lh` 限制最高 12 行。在不支持 `field-sizing` 的浏览器里，输入框会停在一行高，内容多了就滚动。agent 在汇报里说明，指南建议接受这个结果，不另外写更复杂的替代方案。
- 输入框为空时按 Enter，现在会弹出浏览器内置的必填提示，和点 Post 一样。改前的版本什么都不做。
- `textarea:invalid` 改成 `textarea:user-invalid`，多了一段错误信息，并同步 `aria-invalid`。
- 对话框加上 `closedby="any"`。Safari 不支持这个属性，所以保留了一段 fallback，只在不支持时才挂上，改用指针坐标判断是否点在对话框外面。
- `list.innerHTML = ''` 改成 `list.replaceChildren()`。

这次它没有改“Clear all”的写法，也没有加 CDN polyfill。同一句提示词跑两次，写出来的代码不一样，所以 agent 改完还是要看 diff。

SKILL.md 要求 agent 用到指南时，在汇报最后加一节 `### Modern Web Guidance`，逐项列出用了哪份指南、引用了指南里的哪句话。两次运行都有这一节，对照 diff 时很好用。

最后我自己在项目根目录重新扫描了一次：

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![终端实际输出：legacy-scan 报告 0 findings from 38 qualified guides，并提醒只覆盖约 20% 的指南](term-scan-after.webp){: w="1100" h="287" }
_改完后重新扫描是 0 项（实际输出）_

输出同时提醒，`legacy-scan` 只覆盖 38 份指南。0 项只说明这 38 份指南的规则没有再找到问题，其他指南覆盖的写法它不会检查。

## 步骤六：在浏览器里对比

`legacy-scan` 只看代码，所以我另外用浏览器确认页面行为。Chrome 在我的沙箱里无法启动，headless Chrome 会因为 macOS 的 mach port 权限被拒绝而直接退出。所以这一步我在沙箱外运行，只打开本地文件，用的是用完即删的临时 Chrome profile。我写了一个不需要安装依赖的 Node.js 小脚本，通过 Chrome DevTools Protocol 操作 headless Chrome 157，对改前和改后的页面各做同样的操作再截图。

第一组是刚打开页面时的样子：

![留言板改前改后并排。左边是改前，输入框还没输入任何内容就是红框红底；右边是改后，输入框是普通的灰色边框](pair-load.webp){: w="2584" h="840" }
_左：改前，一打开就显示错误样式。右：改后，普通样式。_

改前的输入框有 `required`，内容为空，所以一加载就匹配 `:invalid`，用户还没打字就看到红框。改成 `:user-invalid` 之后，要等用户操作过或点了提交，才会显示错误样式。我在改后的页面直接点 Post，红框和错误信息就出现了：

![改后的留言板在空白状态下点击 Post，输入框变成红框，下方出现 Enter a message before posting. 的错误信息](page-empty-submit.webp){: w="1280" h="840" }

第二组是输入法。我用 DevTools Protocol 模拟中文输入法正在选词的状态，让输入框里有一段还没确认的“你好”，再发送一次 Enter。下面是脚本里的这两步，后面还有松开 Enter 和确认文字的事件，这里省略了：

```javascript
await send('Input.imeSetComposition', { text: '你好', selectionStart: 2, selectionEnd: 2 });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
```

我另外在输入框上挂了一个只记录、不拦截的 `keydown` 监听。两个版本收到的事件都是 `key: "Enter"`、`keyCode: 229`、`isComposing: true`。

![留言板改前改后并排。左边是改前，输入框里的你好还在选词，下方留言列表已经多了一条你好；右边是改后，输入框里有你好，列表是空的](pair-ime.webp){: w="2584" h="840" }
_左：改前，选词用的 Enter 把“你好”发出去了。右：改后，没有发送。_

改前的版本把还在选词的“你好”当成留言发了出去。改后的版本看到 `isComposing` 是 `true` 就不发送，留言列表是空的。

这个测试是模拟出来的，我没有用 macOS 的拼音或注音输入法实际打字，也没有在 Safari 和 Firefox 上测。对话框的 `closedby="any"` 与 Safari 的 fallback，我也没有实测。

## 我在沙箱里遇到的问题

1. 沙箱不让 npm 写 `~/.npm`，npm 却报成“root-owned files”，让你用 `sudo chown`。不要照做，把 `npm_config_cache` 指到沙箱能写的地方就行。我的做法是在启动 `claude -p` 之前，在同一个 shell 里先 `export npm_config_cache="$TMPDIR/npm-cache"`。
2. SKILL.md 让 agent 在命令前加 `NPM_CONFIG_CACHE=/tmp/npm-cache`。在我的沙箱里 `/tmp/npm-cache` 不能写；而加了前缀的命令，也匹配不上 SKILL.md 自己建议的放行规则。我这次能跑完，是因为 agent 最后去掉了前缀，而环境里恰好已经有可写的缓存路径。
3. Chrome 在我的沙箱里无法启动，所以浏览器对比那一步我是在沙箱外跑的。

这两次我用的都是非交互模式，被拦的命令会直接失败。交互模式下应该会改成弹出询问，这部分我没有试。

## 换一台电脑、换一个示例再跑一次

上面的留言板是我照着 `legacy-scan` 的规则清单写的，能扫出来并不意外。所以我在 2026-11-20（台北时间）换到另一台 Linux 电脑（Debian 13、Node.js 24.22.1、npm 11.21.1、Chrome 156），重新下载 1.0.1，自己写了一个不同主题的页面再跑一次。这次的 agent 是 Codex CLI 0.171.0，模型是 `gpt-6.1-sol`，通过我自己搭的 LiteLLM 调用，沙箱模式是 `workspace-write` 并开放网络。

先说和前面一致的部分：同样的 `search "submit on enter key"` 返回同样的 10 条，`skills-lock.json` 的 commit 和 `computedHash` 相同，装进来的也是 210 份指南。我把上面留言板的三个文件原样保存再扫描，同样是 5 份指南、6 项，行号也相同。

新的示例是一个露营地预订页，三个文件放在 `web/`。我放进去的旧写法有这些：

- 搜索框用 `e.keyCode === 13` 判断 Enter 后搜索。
- 四个必填字段用 `input:invalid` 显示错误样式。
- 确认窗口是自己用 `div` 做的，靠 `e.target === overlay` 判断点到外面再关闭，没有用 `<dialog>`。
- 勾选“租帐篷”时，用 JavaScript 给外层加 class 改底色。
- FAQ 展开用 `max-height: 9999px`。
- 从 jsDelivr 加载 dayjs，没有 `integrity`。
- 两段重复的 `@media (prefers-color-scheme: dark)`。
- 用 `results.innerHTML = ''` 清空搜索结果。

`legacy-scan` 找到 5 份指南、5 项：

![终端实际输出：legacy-scan 在露营地示例找到 5 份指南共 5 项，分别是 animate-to-intrinsic-sizes 的 style.css:11、dark-mode 的 style.css:18、js 的 app.js:9、secure-external-subresources 的 index.html:8、validate-input-after-interaction 的 style.css:6](term-campsite-scan.webp){: w="1100" h="1593" }
_第二台电脑、自己写的示例（实际输出）_

没扫到的有三个：`div` 做的确认窗口、勾选框的 class 切换，以及 `keyCode === 13` 的搜索框。dialog 规则看的是挂在 `<dialog>` 上的 click 监听，所以自己用 `div` 做的窗口不在范围内。`keyCode === 13` 则不算漏掉。ime-safe-enter-submit 指南写到，输入法选词时按 Enter，浏览器报告的 `keyCode` 是 229 而不是 13，所以旧的 `keyCode === 13` 写法本来就不会在选词时触发。会出问题的，是把它改成 `e.key === 'Enter'` 却没有加上检查。

我用和前面一样的提示交给 Codex：`$modern-web-guidance Modernize the code in this directory`（`$` 是 Codex 指定 skill 的写法）。过程如下：

- 它按 SKILL.md 在命令前加了 `NPM_CONFIG_CACHE=/tmp/npm-cache`。Codex 的 `workspace-write` 沙箱默认可以写 `/tmp`，所以扫描、`retrieve`、重新扫描都直接成功，没有遇到前面 Claude Code 沙箱的缓存问题。
- 它用一次 `retrieve` 取回 5 份指南。内容有 84.4 KB，CLI 没有直接打印，而是存成 `/tmp/mwg-guide-….md`，让 agent 再分段读取。
- 5 项全部修改，重新扫描是 0。我自己在项目根目录用 1.0.1 重新扫描也是 0。
- 它另外把搜索框改成 `e.key === 'Enter' && !e.isComposing`。这段不在扫描结果里，它也没有取回 ime-safe-enter-submit 指南。按指南的说法，这样改少了 `e.keyCode === 229`，在 Safari 确认候选词的那次 Enter 可能会提交。我手边没有 Safari 可以验证，这一点是从 diff 和指南看出来的。
- 为了自己检查，它用 npm 把 jsdom 装到 `/tmp` 跑 DOM 测试，也用 curl 下载 CDN 上的文件比对哈希值。开放网络时，agent 会做这类额外下载。
- 整轮 119 秒。运行记录里的 token 用量是输入 525,856（其中 434,990 命中缓存）、输出 4,418。

浏览器部分，我同样用 DevTools Protocol 操作 headless Chrome 156，模拟输入法正在选“溪邊”时按 Enter。除了改前（A）和 Codex 改后（B），我另外做了一个对照组（C），只把 A 的条件改成 `e.key === 'Enter'`：

![露营地示例三个版本并排，都在输入法选词中按了 Enter。A 是 keyCode === 13，搜索结果 0 条，必填字段一加载就是红框；B 是 Codex 改后的版本，结果 0 条，字段是普通样式；C 是对照组 e.key === 'Enter'，选词中就搜索出溪邊 A1 riverside，字段也是红框](trio-campsite-ime.webp){: w="1954" h="696" }
_A：原本的 keyCode === 13。B：Codex 改后。C：对照组，只改成 e.key === 'Enter'。_

- 三个版本收到的事件都是 `key: "Enter"`、`keyCode: 229`、`isComposing: true`。
- A 和 B 都没有搜索，C 在选词时就搜索了。
- 刚加载时，A 和 C 的四个必填字段都是红框，B 是普通样式。在 B 直接点 Book，字段才变成红框并出现错误信息，`aria-invalid` 也变成 `true`。

还有一点要注意：`legacy-scan` 默认会跳过看起来像文档、示例或测试的文件夹，例如 `docs/`、`examples/`、`demo/`、`test/`。我把同一个示例放在 `demo/` 下面扫描，结果是 0，最后一行写着 `Skipped 3 docs and test files`，加上 `--include-docs-and-tests` 才扫到 5 项。照着做时如果把示例放在 `demo/`，记得加这个参数，或者换一个文件夹名称。

![终端实际输出：示例放在 demo 文件夹时 legacy-scan 报告 0 findings 并写着 Skipped 3 docs and test files，加上 --include-docs-and-tests 后找到 5 项](term-demo-skip.webp){: w="1100" h="460" }

最后我也确认了使用数据。我在不能联网的环境里，不设 `DISABLE_TELEMETRY` 跑一次 `search "booking date picker"`，并把发送用的 `fetch` 换成只记录、不发送。后台子进程准备 POST 到 `play.googleapis.com` 的内容，包含这句搜索词，以及找到的指南 ID 和相似度分数。设了 `DISABLE_TELEMETRY=1` 再跑，就没有这个请求。

## 搭配浏览器检查

根据 1.0 发布文章，官方建议搭配 Chrome DevTools for agents，让 agent 看到页面在浏览器里的实际运行情况。DevTools for agents 我还没有试。

这次我用的是自己写的 DevTools Protocol 小脚本。如果想让 agent 自己打开页面检查，可以参考我写的《[agent-browser 入门：让 AI 自己打开浏览器检查成果](/posts/agent-browser-ai-test-web-pages/)》。合并前先确认能用的流程，我在《[pstack 系列（3）：写完代码之后，先证明它能用再合并](/posts/pstack-build-verify-merge/)》里写过。

## 结论

这次实测，`legacy-scan` 在本地找出了我放进去的 5 种旧写法，共 6 项。Claude Code 按指南修改后重新扫描是 0。浏览器里也看得到差别：空白输入框不再一打开就是红框，输入法选词时按 Enter 也不会发送。换一台电脑、用自己写的露营地示例交给 Codex，扫描和重新扫描的结果一样可以重现，但 agent 也会改到扫描范围以外的地方，而且不一定按指南改完整。

沙箱里最麻烦的是 npm 缓存。另外，装进来的 skill 总是让 agent 跑 `@latest`，安装时固定的版本只管得到指南内容，管不到 CLI。

我建议按这个顺序开始：

1. 先不安装，用 `npx modern-web-guidance@<版本> legacy-scan .` 扫描自己的项目，看它找到了什么。代码放在 `demo/`、`examples/` 这类文件夹时，记得加 `--include-docs-and-tests`。
2. 决定要不要发送使用数据，不发就设 `DISABLE_TELEMETRY=1`。
3. 安装到项目后，打开 `.claude/skills/modern-web-guidance/SKILL.md` 读一遍，并把 `skills-lock.json` 一起 commit。
4. 如果开着沙箱，先处理好 npm 缓存路径，再交给 agent。
5. agent 改完后，看 diff，特别是扫描结果以外的修改，并在浏览器里实际操作一次。

## 延伸阅读

- [Modern Web Guidance 官方文档](https://developer.chrome.com/docs/modern-web-guidance)，有安装方法、示例提示词和 Baseline 目标的设置方法。
- [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow) 说明 `legacy-scan` 搭配 agent 修改的四步流程。
- 《[自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护](/posts/agent-skill-authoring-guide/)》说明 SKILL.md 的 description 如何影响触发。
- 《[Claude Code plugin 安全安装：装之前先看哪些文件](/posts/claude-code-plugin-safe-install/)》说明安装 skill 或 plugin 前要看哪些文件。
- 《[Claude Code 沙箱设置教程：挡住 SSH 密钥与 token](/posts/claude-code-sandbox-setup/)》说明这次用的沙箱怎么开。
