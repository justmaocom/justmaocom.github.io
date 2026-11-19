---
title: "agent-browser 入门：让 AI 自己打开浏览器检查成果"
description: "用 agent-browser 让 coding agent 自己打开网页、操作表单，再读取 JavaScript 错误，确认改好的网页真的能用。我在 0.43.0 上实际跑过，附示例页源代码，以及域名限制与 action policy 的实测结果。"
date: 2026-11-19 09:30:00 +0800
categories: [AI, 软件开发]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.zh-CN.webp
  alt: "AI 改完网页后，先用 agent-browser 实际操作页面、检查 JavaScript 错误，再报告完成。"
---

coding agent 改完网页后，如果只读代码，就看不到按钮点下去之后页面有没有反应。代码看起来没问题，页面仍然可能是坏的。

[agent-browser](https://github.com/vercel-labs/agent-browser) 是 Vercel Labs 用 Rust 写的命令行工具。AI 用它一次发一条命令来操作浏览器，比如打开网页、列出页面上的按钮和输入框、点击，再读取结果。coding agent 本来就能在终端里运行命令，所以它可以在报告“改好了”之前，先用这些命令把页面点一遍。

这篇我从安装讲起，用一个本地的订阅表单走完整个流程。我另外做了一个带错别字的坏版本，看 agent-browser 的输出能不能指出错误。接着我把同样的检查交给 AI 运行，最后测试怎样限制它能访问的域名和能做的操作。两个示例页的源代码都在文中，你可以照着复现。

> 我对照的官方资料是 agent-browser v0.43.0 tag 里的 [README](https://github.com/vercel-labs/agent-browser/tree/v0.43.0)，以及 [Installation](https://agent-browser.dev/installation)、[Quick Start](https://agent-browser.dev/quick-start)、[Snapshots](https://agent-browser.dev/snapshots)、[Security](https://agent-browser.dev/security) 四份文档。官网上的文档可能已经在介绍更新的版本。2026-11-19（台北时间）我在一台 Debian 13（x86_64）电脑上做了这次实测，用的是 agent-browser 0.43.0 和它自己下载的 Chrome for Testing 158.0.8127.36。0.43.0 是当天 GitHub 上标为 Latest 的版本，发布于台北时间 2026-11-13。从 v0.39.1（台北时间 2026-10-14）到 0.43.0，GitHub 上一共发布了 10 个版本，所以动手之前，请先用 `agent-browser --version` 查看你的版本。文中的终端截图是把当时录下的输出原样排版成图片，有几张只截取了其中几条命令。
{: .prompt-info }

## 先认识几个名词

- headless 浏览器是没有窗口的浏览器。它照常加载网页、运行 JavaScript，只是不显示在屏幕上。根据 `--help`，agent-browser 默认使用这种模式，加上 `--headed` 才会显示窗口。
- snapshot 是 agent-browser 把页面整理成的文本清单，列出标题、输入框、按钮等元素。根据 agent-browser 内置的 core skill（使用指南），snapshot 比截图快，消耗的 token 也少得多。
- ref 是 snapshot 给每个元素分配的编号，比如 `@e2`。要点哪个按钮、填哪个输入框，就用 ref 指定。
- session 是一个在后台一直开着的浏览器。同一个 session 的命令都发给同一个浏览器，所以上一步打开的页面，下一步还在。根据 README，它空闲一小时后会自动关闭。要手动关闭，就运行 `agent-browser close`。

## 步骤一：安装

官方推荐用 npm 全局安装，再用 `agent-browser install` 下载它要用的 Chrome。这个 Chrome 是 [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)，也就是 Google 提供给自动化测试用的版本。根据官方文档，macOS 也可以用 `brew install agent-browser`。`cargo install agent-browser` 则会从源代码编译，需要 Rust 工具链。这两种我没有试，我用的是 npm：

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![终端实际输出：npm 安装 agent-browser，出现 install-scripts 警告；agent-browser --version 显示 agent-browser 0.43.0；agent-browser install 下载 Chrome 158.0.8127.36 并安装成功](term-install.webp){: w="1102" h="636" }
_我在 Debian Linux 上的安装过程（实际输出）_

npm 在安装时输出了 `install-scripts` 警告。内容是 `agent-browser@0.43.0` 的 postinstall 脚本还不在 allowScripts 列表里，并提示可以加 `--allow-scripts=agent-browser` 允许它运行。npm 拦截安装脚本的机制，我在《[npm 12 默认挡掉安装脚本](/posts/npm-12-install-scripts-allowscripts/)》里介绍过。根据官方 Installation 文档，使用 npm 12 这类默认拦截安装脚本的包管理器时，agent-browser 会在第一次运行时自动完成链接，不需要额外设置。我没有理会这个警告，接着运行 `agent-browser --version`，它直接打印出 `agent-browser 0.43.0`。

在 Linux 上，`agent-browser install` 打印了两次提示，说浏览器启动失败或出现 shared library 报错时，要改为运行 `agent-browser install --with-deps`。根据官方文档，这条命令会用系统的包管理器补装 Chrome 需要的库，非 root 用户会通过 `sudo` 运行。我没有运行 `--with-deps`，后面每一步浏览器都正常启动了。

装好后可以做一次健康检查：

```bash
agent-browser doctor --offline --quick
```

我得到的结果是 `Summary: 8 pass, 0 warn, 0 fail`。根据官方文档，`--offline --quick` 只检查本地、不联网，也会跳过实际启动浏览器的测试。输出里还有一行 `AI_GATEWAY_API_KEY not set (chat command disabled)`，步骤五会用到这个环境变量。

## 步骤二：走一遍基本流程

agent-browser 的用法可以归纳成四步：打开页面、获取 snapshot、用 ref 操作、确认结果。页面一有变化，就重新获取 snapshot。

![agent-browser 的基本流程：open 打开网页、snapshot -i 列出可操作元素并配上 ref、用 ref 填输入框和点按钮、用 wait、get、errors 确认结果；页面变了就重新 snapshot](core-loop.zh-CN.webp){: w="1600" h="900" }

我先用官方 README 和 Quick Start 都用到的 `example.com` 来试：

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser screenshot shots/example.png
agent-browser click @e1
agent-browser get url
agent-browser snapshot -i
```

![终端实际输出：open example.com 显示 Example Domain；snapshot -i 列出 link "Learn more" [ref=e1]；get title 返回 Example Domain；screenshot 保存文件；click @e1 之后 get url 变成 iana.org 的网址；最后的 snapshot -i 显示 (no interactive elements)](term-core.webp){: w="1102" h="568" }
_snapshot 给出 `@e1`，点击之后网址变了（实际输出）_

逐行来看：

- `open` 在后台启动浏览器，第一次会打印 `[agent-browser] launched browser`。接着它打开网页，打印页面标题和网址。
- `snapshot -i` 只列出可交互的元素。这个页面只有一个链接，ref 是 `e1`。0.43.0 实际打印的格式是 `- link "Learn more" [ref=e1]`，和 Quick Start 文档里的示例格式不同，请以你自己看到的输出为准。
- `screenshot` 把当前画面保存成 PNG 文件。
- `click @e1` 点击那个链接。`get url` 返回 `https://www.iana.org/help/example-domains`，说明已经跳转了。
- 跳转后的 `snapshot -i` 打印 `(no interactive elements)`。

`-i` 是 interactive 的缩写。不加的话，snapshot 会列出整个页面的结构，连段落文本也包括在内。只想找按钮和输入框时，加 `-i` 输出更短。

## 步骤三：验收一个本地表单

实际用途通常是检查你自己正在开发的网页。我写了一个订阅表单，只有一个 Email 输入框和一个 Subscribe 按钮。提交后，按钮下方应该显示“Thanks! We sent a confirmation to”加上你填的 Email。这个示例只更新页面文本，不会真的发送确认邮件。下面是完整的 `site/index.html`。请原样保存，不要重新排版，这样步骤四的报错行号才会和我的一致：

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

在 `site` 的上一级文件夹运行下面这条命令，用 Python 内置的 HTTP 服务器在 8765 端口提供页面。启动后，让这个终端保持运行，另开一个终端操作 agent-browser。任何能提供静态文件的服务器都可以，只要网址是 `http://localhost:8765/`：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

如果你刚做完步骤二，先运行 `agent-browser close` 关闭浏览器。我正式跑这一步时，浏览器是关闭状态，所以 `open` 打印了 `launched browser`，ref 从 `e1` 开始。如果没有先关闭，ref 会接着往后编号，原因见本节最后的警告。接着打开页面、获取 snapshot：

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
```

snapshot 列出了三个元素，标题是 `e1`，Email 输入框是 `e2`，Subscribe 按钮是 `e3`。

接着填写 Email、点击 Subscribe，再确认感谢消息出现，并检查 JavaScript 错误：

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![终端实际输出：open 打印 launched browser；snapshot -i 列出 e1 到 e3；fill @e2 和 click @e3 都显示 Done；wait --text "Thanks" 成功；get text "#msg" 返回 Thanks! We sent a confirmation to reader@example.com.；errors 没有输出](term-verify.webp){: w="1102" h="658" }

![agent-browser 拍下的截图：Email 输入框填好了 reader@example.com，按钮下方出现绿色的感谢消息](page-good.webp){: w="1280" h="577" }
_正常版本的感谢消息出现了，`errors` 也没有任何输出_

这几条命令各自确认一件事：

- `wait --text "Thanks"` 等到页面上出现这段文本才继续，等不到就报错。根据 `wait --help`，`--text` 是子字符串匹配。官方 core skill 也建议用这种等待方式，不要用 `wait 2000` 这类固定毫秒数。
- `get text "#msg"` 读取 `#msg` 元素的完整内容，确认填进去的 Email 已经带上。`"#msg"` 一定要加引号。我第一次尝试时，封装命令的脚本把引号弄丢了，实际运行的是 `agent-browser get text #msg`。shell 把 `#` 之后的内容当成注释，agent-browser 返回了 `Missing arguments for: get text`。
- `errors` 列出页面上的 JavaScript 错误和未捕获的异常。这次没有任何输出，说明工具没有记录到这轮操作的 JavaScript 错误；仍要结合页面结果判断功能是否正常。

> 不要照搬文档示例里的 ref。我第一次尝试时照着文档示例写了 `fill @e1`，得到 `✗ Unknown ref: e1`。接下来的 `click @e2` 返回 `✓ Done`，但那次的 `e2` 是标题，不是按钮，所以后面的 `wait` 等了 25000ms 后超时。原因是那次我没有先 `close`。同一个 session 之前打开过 example.com，它的链接已经占用了 `e1`，表单的标题、Email 输入框、按钮就被编成了 `e2`、`e3`、`e4`。根据 Snapshots 文档，跳转页面会让旧的 ref 失效，但编号不会回收复用。所以在同一个 session 里跳转后，编号会接着往后排。每次操作前，都要用最近一次 snapshot 给出的 ref。
{: .prompt-warning }

## 步骤四：故意改坏，看它能不能发现

我把 `index.html` 复制成 `broken.html`，改了两行。第 2 行的 `<title>` 加上 ` (broken)`。第 15 行把要写入消息的元素 ID 从 `msg` 错写成 `mesage`。其他行都不改，第 7 行 CSS 里的 `#msg` 和第 10 行的 `id="msg"` 也要保留。如果把所有 `msg` 都替换掉，错别字就被抵消了，页面反而正常。你可以照着下面的差异自己做一份，放在同一个 `site` 文件夹里：

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

这个错别字不会改变页面的外观。点击按钮后，画面上只是不会出现消息。

我在同一个 session 里用同样的流程再跑一次。这次 snapshot 给出的 ref 是标题 `e4`、Email 输入框 `e5`、按钮 `e6`，因为还在同一个 session，编号接着往后排。`wait` 我加了 `--timeout 5000`，只等 5 秒。不加的话会等默认的 25 秒，`--help` 列出的 `AGENT_BROWSER_DEFAULT_TIMEOUT` 默认值就是 25000 毫秒。

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

![终端实际输出：fill 和 click 都显示 Done；wait --text "Thanks" 等待 5000ms 后超时；errors 报告 TypeError: Cannot set properties of null (setting 'textContent')，位置在 broken.html 第 15 行第 49 个字符](term-broken.webp){: w="1102" h="546" }

![agent-browser 拍下的截图：Email 输入框已填好，点击 Subscribe 后按钮下方一片空白，没有感谢消息](page-broken.webp){: w="1280" h="577" }
_坏掉的版本在画面上看不出错误，只是什么都没出现_

`fill` 和 `click` 都返回 `✓ Done`。根据 README，`click` 在目标被遮挡、隐藏或禁用时会失败，所以 `Done` 只说明操作已经完成，不说明页面做出了正确的反应。只看这两行，发现不了问题。发现问题的是后面两条命令：

1. `wait --text "Thanks" --timeout 5000` 打印 `✗ Wait timed out after 5000ms`，预期的消息没有出现。
2. `errors` 打印 `TypeError: Cannot set properties of null (setting 'textContent')`，位置是 `broken.html:15:49`，正是我写错的第 15 行。`getElementById("mesage")` 找不到元素，返回 `null`，给 `null` 设置 `textContent` 就会抛出这个错误。

`console` 这次没有输出，最后的 `screenshot` 保存了上面那张没有感谢消息的画面。

所以验收时，请确认预期的结果出现了，而且 `errors` 没有输出。操作返回 `✓ Done`，不等于验收通过。

### 补充：在截图上标出 ref

想知道每个 ref 对应画面上的哪个位置，可以用 `screenshot --annotate`。下面两张图来自我单独跑的一次。我用了新的 session，先设置窗口大小，再打开表单并拍下带编号的截图。如果要试这一段，请先关闭步骤四的 session：

```bash
agent-browser close
agent-browser set viewport 1280 800
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
agent-browser close
```

![终端实际输出：snapshot -i 列出 heading、textbox "Email"、button "Subscribe" 三个元素；screenshot --annotate 保存文件并打印 [1] @e1、[2] @e2、[3] @e3 的对照表](term-annotate.webp){: w="1102" h="388" }

![agent-browser 用 --annotate 拍下的截图：标题、Email 输入框、Subscribe 按钮分别框上红色的 1、2、3](page-annotated.webp){: w="1280" h="800" }
_截图上的 [2]、[3] 就是 snapshot 里的 `@e2`、`@e3`_

## 步骤五：交给 AI 自己跑

上面的命令是我写成几个 shell 脚本运行的，AI 没有参与。下面介绍三种把检查交给 AI 的方式。前两种把流程交给已有的 coding agent；第三种用内置的 `chat` 检查已经启动的本地网站。我只实测了第三种。

### 方式一：安装官方 skill

skill 是给 coding agent 读的使用说明。根据官方文档，下面这条命令会把 agent-browser 的 skill 安装到你的 coding agent 里，支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Goose、OpenCode 和 Windsurf：

```bash
npx skills add vercel-labs/agent-browser
```

这一步我没有运行。根据 v0.43.0 的 README，这样装进去的 skill 只是一个很短的引导，内容是让 agent 先运行 `agent-browser skills get core`，所以 agent 读到的说明会和你安装的 CLI 版本对应。`skills get core` 打印的就是 agent-browser 内置的 core skill，下面方式三里 AI 的第一条命令就是它。

core skill 提醒，默认的 session 是整台电脑共用的一个浏览器，在里面操作可能会抢走别的 agent 的页面，所以每个任务都应该用自己的 `--session <名称>`。我这次的实测全部在默认 session 里运行，没有用 `--session`。

### 方式二：写进 AGENTS.md

如果你的项目有 `AGENTS.md` 或 `CLAUDE.md`，可以把流程写进去，写法可以参考《[AGENTS.md 怎么写](/posts/agents-md-project-rules-for-coding-agents/)》。官方 Installation 文档提供了一段基本流程。下面是我在那段基础上改写的模板，多加了几条验收规则。这个模板我没有实际交给 AI 运行过，请根据你的项目修改网址和预期文本：

```markdown
## 改完网页后的验收

改到界面、表单或按钮时，用 agent-browser 实际打开页面验收，不要只看代码。
运行 `agent-browser --help` 可以看到所有命令。
每条命令都加上 `--session <这个任务的名称>`，不要用默认 session。

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`：只打开本地网址
2. `agent-browser snapshot -i`：获取元素和 ref
3. 用最近一次 snapshot 的 ref 操作，例如 `fill @e2 "..."`、`click @e3`；不要猜 ref
4. `agent-browser wait --text "<预期出现的文本>"`
5. `agent-browser errors`
6. `agent-browser close`

预期文本没有出现，或 `errors` 有输出，就不算完成，要报告错误内容。
页面跳转或内容变化后，要重新 snapshot。
```

### 方式三：用内置的 chat 命令

agent-browser 还有一个 `chat` 命令。根据 `chat --help`，它把你用自然语言写的指示交给 AI 模型，由模型转成 agent-browser 命令，在你选定的 session 里运行。它不能自己创建或切换 session。运行 `chat` 需要 `AI_GATEWAY_API_KEY`。根据 `--help`，`AI_GATEWAY_URL` 是 Vercel AI Gateway 的 base URL，默认是 `https://ai-gateway.vercel.sh`。默认模型是 `anthropic/claude-sonnet-4.6`，可以用 `--model` 更换。

我手上有一个 OpenAI 兼容的 LiteLLM 服务，就把 `AI_GATEWAY_URL` 和 `AI_GATEWAY_API_KEY` 指向它。密钥和网址都只放在环境变量里，没有写进任何文件。确认本地 HTTP 服务器仍在运行后，先用 `agent-browser close` 关闭上一轮的浏览器，再用 `gpt-6.1-sol` 模型让它检查坏掉的那一页：

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![终端实际输出：chat 命令依次运行 skills get core、open、snapshot、fill @e2、click @e3、wait --text "Thank"、snapshot、skills get core --ref commands、errors、console，最后回答表单不能用，并引用 TypeError 与 broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_AI 自己跑了 10 条命令，结论和我手动跑的一样（实际输出）_

从开始到最后的 `close` 结束，一共 36 秒。AI 的第一条命令是 `skills get core`，先读取 core skill。接着它依次运行了 `open`、不加 `-i` 的 `snapshot`、`fill @e2`、`click @e3`、`wait --text "Thank" --timeout 3000`，再运行一次 `snapshot`，查看了 `skills get core --ref commands`，最后看 `errors` 和 `console`。它用的 ref 是 `e2`、`e3`，因为上一次运行结束时我已经 `close`，这是一个新的 session。最后它回答表单不能用，并引用了同一个 `TypeError` 和 `broken.html:15:49`。

同一句指示我另外加 `-v` 跑过一次，`-v` 会打印每条命令的完整输出。那次的命令顺序和结论都一样，`wait` 打印了 `✗ Wait timed out after 3000ms`。两次我都只用了 `gpt-6.1-sol` 这一个模型。

## 步骤六：限制它能访问哪里、能做什么

根据官方 Security 文档，agent-browser 默认对导航、操作和输出都不做限制，这些控制都要自己开启。AI 可以打开任何网站，也可以用 `eval` 在页面上运行任意 JavaScript，比如读取 `document.cookie`。如果你担心 AI 被网页内容误导，比如页面藏了一段让它打开某个网址的文本，就要自己缩小范围。这类风险可以参考我写的《[OWASP Agentic Top 10 检查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)》中工具滥用那一节。

我实测了两项设置：

- `--allowed-domains` 只允许列出的域名。根据官方文档，它会拦截页面导航，也会拦截图片、脚本、fetch 等子资源请求。
- `--action-policy` 指定一个 JSON 格式的 policy 文件，列出哪些操作要拦截。

![终端实际输出：用 --allowed-domains "localhost" 打开本地页面成功，open https://example.com 被拦截并显示 Domain 'example.com' is not in the allowed domains list；用官方示例 policy.json 时 eval 仍然运行并返回标题；换成加上 evaluate 的 policy-0.43.json 后，eval 被拦截](term-security.webp){: w="1102" h="883" }
_域名限制有效；官方示例里的 `"eval"` 在 0.43.0 拦不住，要写 `"evaluate"`（实际输出）_

域名限制的结果和文档描述一致。用 `--allowed-domains "localhost"` 打开 session 之后，`open https://example.com` 被拦截，打印 `✗ Domain 'example.com' is not in the allowed domains list`。根据官方文档，域名限制和 action policy 都会随 session 保存，直到 `close` 成功为止。

action policy 的结果和文档不一致。我先用 Security 文档里的示例 `"deny": ["eval", "download", "upload"]`，结果 `eval "document.title"` 照样运行，返回 `"Newsletter demo"`。我查看了 v0.43.0 的源代码，`cli/src/native/policy.rs` 是用命令内部的操作名称做完全匹配。`eval` 命令内部的操作名称是 `evaluate`，所以文档里写的 `eval` 分类不起作用。这个问题已经有人在 [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612) 里报告过，修复放在 [PR #2506](https://github.com/vercel-labs/agent-browser/pull/2506)，我写这篇时两者都还是 open。我把 `"evaluate"` 也加进去之后，`eval` 被拦截，打印 `✗ Action 'evaluate' denied by policy: Action 'evaluate' is denied by policy`：

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

文件里保留了 `"eval"`。根据 PR #2506 的说明，它会让分类名称也能匹配到下面的操作，到那时 `"eval"` 这一项就会生效。`download` 和 `upload` 能不能拦住，我没有测试。

我另外手动试了两种写法。第一种是把 Security 文档里的严格示例改成 `"default": "deny"`，`allow` 列表是 `navigate`、`snapshot`、`click`、`fill`、`wait`、`get`、`close`。结果 `open`、`snapshot -i`、`fill`、`click`、`wait --text` 都能运行，但 `get text "#msg"` 被拦截，提示是 `Action 'gettext' denied by policy`。`get title`、`get url`、`screenshot`、`errors` 也都被拦截，因为它们内部的操作名称分别是 `title`、`url`、`screenshot`、`errors`，不在列表里。第二种是 `--confirm-actions eval`，它也不起作用，`eval "1+1"` 没有要求确认就返回了 `2`。

所以设置好 action policy 之后，请像我这样实际运行一次被禁止的操作，确认它会被拦截。也要确认你需要的命令没有被一起拦掉。不要只看 policy 文件的内容就放心。

下面几项做法来自官方文档，我都没有实际运行：

- 根据 `--help`，`--profile` 会沿用某个 Chrome profile 的登录状态。如果用你平时登录的 profile，AI 就能使用那个 profile 里所有已登录账号的状态。根据 Security 文档，`--allowed-domains` 也不能和 `--profile` 同时使用。需要登录时，Security 文档提供的是 auth vault，用 `agent-browser auth save` 把账号密码保存在本地，之后按名称登录，密码不会出现在 AI 读到的内容里。
- `--content-boundaries` 会在页面内容前后加上带随机 nonce 的标记，让 AI 分清哪些是工具输出、哪些是网页上的文本。
- `--max-output` 限制 snapshot、`get text`、`get html`、`eval`、`console` 的输出字符数，避免一个超长页面占满 AI 的上下文。

根据 Security 文档，域名限制不是操作系统层面的防火墙。如果你用 Claude Code，可以再配合《[Claude Code 沙箱设置教程](/posts/claude-code-sandbox-setup/)》，在操作系统层面再加一道限制。

## 下一步：放进你的流程

要把验收变成固定流程，可以把操作规则写进项目指引，或设置自动检查：

- 把步骤五的模板写进 `AGENTS.md`，让支持这份指引的 coding agent 在开始工作时读取。
- 用 hook 在 AI 报告完成前自动运行一次检查，做法可以参考《[Claude Code hooks 教程](/posts/claude-code-hooks-automate-checks/)》。
- 合并前先证明它能用，我在《[pstack 系列（3）](/posts/pstack-build-verify-merge/)》里写过这个流程。

## 结论

这次实测的关键结果在步骤四。坏掉的表单上，`fill` 和 `click` 都返回 `✓ Done`。发现问题的是 `wait --text` 超时，以及 `errors` 打印的 `TypeError` 和 `broken.html:15:49`。AI 用 `chat` 检查同一个页面，也得出了同样的结论。另外，0.43.0 的 action policy 照文档写 `"eval"` 拦不住 `eval`，要写 `"evaluate"`。

我建议按这个顺序开始：

1. 用 `npm install -g agent-browser` 和 `agent-browser install` 安装，再用 `agent-browser --version` 确认版本。
2. 对自己的本地页面依次运行 `open`、`snapshot -i`、`fill` 或 `click`、`wait --text`、`errors`。
3. 把验收规则写进 `AGENTS.md`，要求 AI 每次都用最近一次 snapshot 的 ref。
4. 加上 `--allowed-domains`。设置 action policy 时，亲手试一次被禁止的操作，确认它会被拦截。

## 延伸阅读

- [agent-browser 官方文档](https://agent-browser.dev/)，包含完整的命令、设置和高级功能说明。
- [Security](https://agent-browser.dev/security) 完整介绍域名限制、action policy、auth vault 等安全设置。
- 《[AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/posts/agents-md-project-rules-for-coding-agents/)》介绍怎样把验收规则放进项目。
- 《[Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)》介绍怎样让检查自动运行。
- 《[OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)》说明为什么要限制 agent 的工具权限。
