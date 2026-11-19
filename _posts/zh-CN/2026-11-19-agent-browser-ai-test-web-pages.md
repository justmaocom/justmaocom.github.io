---
title: "agent-browser 入门：让 AI 自己打开浏览器检查成果"
description: "用 agent-browser 让 coding agent 自己开网页、填表单、按按钮，再读页面错误确认改好的东西真的能用。我在 0.43.0 实际跑过一次，附真实截屏，也示范怎么限制它能去的域名与能做的动作。"
date: 2026-11-19 09:00:00 +0800
categories: [AI, 软件开发]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.zh-CN.webp
  alt: "让 AI 用 agent-browser 打开网页、填表单、读错误，自己确认改好的页面真的能用。"
---

请 AI 改网页时，我最常遇到的情况是：它说“改好了”，我打开浏览器一按，按钮没反应。AI 看得到代码，却看不到画面，所以它不知道自己写坏了。

[agent-browser](https://github.com/vercel-labs/agent-browser) 是 Vercel Labs 做的命令行工具，让 AI 用一行一行的命令操作浏览器：打开网页、读出页面上有哪些按钮和字段、点下去、确认结果有没有出现。AI 本来就会在终端跑命令，学会这几个命令，它就能在说“改好了”之前，自己先点一遍。

这篇我会带你从安装开始，用一个本地的小表单走完整个流程。我刻意准备了一个有错字的坏掉版本，看看 agent-browser 能不能把错误抓出来。最后再示范把它交给 AI 自己跑，以及怎么限制它能去的网站和能做的动作。

> **版本与实测**：我写这篇时，参考的是 2026-11-19（台北时间）当天的 [GitHub README](https://github.com/vercel-labs/agent-browser)、[Installation](https://agent-browser.dev/installation)、[Quick Start](https://agent-browser.dev/quick-start)、[Snapshots](https://agent-browser.dev/snapshots) 与 [Security](https://agent-browser.dev/security)，并在同一天用一台 Debian Linux 电脑实际跑过一遍：agent-browser 0.43.0（当天最新版，2026-11-13 发布），搭配它自己下载的 Chrome for Testing 158.0.8127.36。文中的截屏都来自这次实跑，终端截屏是把当时录下的输出原样排版成图，有几张只截取其中几个命令。这个工具大约一周出一版，动手之前，请先用 `agent-browser --version` 确认版本。
{: .prompt-info }

## 先认识几个名词

- **headless 浏览器**：没有窗口的浏览器。它照常加载网页、运行 JavaScript，只是不显示在屏幕上。agent-browser 默认就用这种模式。
- **snapshot**：把页面整理成一份文本清单，列出标题、输入栏、按钮这些元素。AI 读文本比看图片省力得多。
- **ref**：snapshot 帮每个元素编的代号，例如 `@e2`。之后要点哪个按钮、填哪个字段，就用这个代号指定。
- **session**：一个在后台持续开着的浏览器。你下的每个命令都送到同一个浏览器，所以上一步打开的页面，下一步还在。

## 步骤一：安装

官方建议用 npm 全局安装，再用 `agent-browser install` 下载它要用的 Chrome（[Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)，Google 给自动化测试用的 Chrome 版本）。macOS 也可以用 `brew install agent-browser`，Rust 用户可以用 `cargo install agent-browser`。

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![终端实际输出：npm 安装 agent-browser，出现 install-scripts 警告；agent-browser --version 显示 0.43.0；agent-browser install 下载 Chrome 158.0.8127.36 并安装成功](term-install.webp){: w="1102" h="636" }
_我在 Debian Linux 上的安装过程（实际输出）_

我的 npm（11.21.1）在安装时跳出了 `install-scripts` 警告，表示 agent-browser 的安装脚本（postinstall）没有被允许运行。npm 12 起默认会挡掉安装脚本，我在[npm 12 默认挡掉安装脚本](/posts/npm-12-install-scripts-allowscripts/)里介绍过。官方文档说明，遇到这种情况 agent-browser 会在第一次运行时自己接好，不需要额外设置；我这次也是不理会警告，`agent-browser --version` 就直接打印出 `0.43.0`。

Linux 上如果之后开浏览器时出现缺少 shared library 的错误，官方的做法是改跑 `agent-browser install --with-deps`，它会用系统的包管理器补装 Chrome 需要的库（需要 root 或 `sudo`）。我这台电脑不需要。

装完可以跑一次健康检查。`--offline --quick` 只检查本地、不联网，我跑的结果是 `8 pass, 0 warn, 0 fail`：

```bash
agent-browser doctor --offline --quick
```

## 步骤二：走一次基本流程

agent-browser 的用法可以浓缩成四步：打开页面、拿 snapshot、用 ref 操作、确认结果。页面一有变化，就重新拿一次 snapshot。

![agent-browser 的基本流程：open 打开网页、snapshot -i 列出可操作元素并配上 ref、用 ref 填字段和点按钮、用 wait、get、errors 确认结果；页面变了就重新 snapshot](core-loop.zh-CN.webp){: w="1600" h="900" }

我先拿官方示例常用的 `example.com` 试：

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser click @e1
agent-browser get url
```

![终端实际输出：open example.com 显示 Example Domain；snapshot -i 列出 link "Learn more" [ref=e1]；get title 返回 Example Domain；click @e1 之后 get url 变成 iana.org 的网址](term-core.webp){: w="1102" h="568" }
_snapshot 给出 `@e1`，点下去之后网址变了（实际输出）_

逐行看：

- `open` 会在后台启动浏览器（第一次会打印 `launched browser`），然后打开网页，报告页面标题和网址。
- `snapshot -i` 只列出能交互的元素。这个页面只有一个链接，代号是 `e1`。
- `click @e1` 点那个链接，`get url` 确认网址真的换成了 IANA 的说明页。

`-i` 是 interactive 的意思。不加的话会列出整页的结构，包括段落文本；只想找按钮和字段时，加 `-i` 比较精简。

## 步骤三：验收一个本地表单

实际用途通常是检查你自己正在做的网页。我写了一个只有 Email 字段和 Subscribe 按钮的订阅表单，提交后应该显示“Thanks! We sent a confirmation to …”。用 Python 内置的服务器在本地开起来：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

然后打开它、拿 snapshot。想知道每个 ref 对应画面上哪里，可以用 `screenshot --annotate`，它会在截屏上标出编号：

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
```

![终端实际输出：snapshot -i 列出 heading、textbox "Email"、button "Subscribe" 三个元素；screenshot --annotate 保存并打印 [1] @e1、[2] @e2、[3] @e3 的对照表](term-annotate.webp){: w="1102" h="388" }

![agent-browser 用 --annotate 拍下的截屏：标题、Email 字段、Subscribe 按钮分别框上红色的 1、2、3](page-annotated.webp){: w="1280" h="800" }
_截屏上的 [2]、[3] 就是 snapshot 里的 `@e2`、`@e3`_

接着填 Email、按 Subscribe，再确认感谢消息出现、页面没有 JavaScript 错误：

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![终端实际输出：fill @e2 和 click @e3 都显示 Done；wait --text "Thanks" 成功；get text "#msg" 返回 Thanks! We sent a confirmation to reader@example.com.；errors 没有输出](term-verify.webp){: w="1102" h="658" }

![agent-browser 拍下的截屏：Email 字段填好 reader@example.com，按钮下方出现绿色的感谢消息](page-good.webp){: w="1280" h="577" }
_正常版本：感谢消息出现，`errors` 没有任何输出_

这几个命令各自负责确认一件事：

- `wait --text "Thanks"` 等到页面上出现这段文本才往下走，等不到就报错。它比“固定等几秒”可靠。
- `get text "#msg"` 读出消息的完整内容，确认填进去的 Email 有带到。
- `errors` 列出页面上的 JavaScript 错误。没有输出代表没有错误。

> **我踩到的坑：不要照抄示例里的 `@e1`**。我第一次跑的时候直接照文档示例写 `fill @e1`，结果报告 `Unknown ref: e1`，接下来的 `click @e2` 点到的是标题，不是按钮。那次我在同一个 session 里先开过 example.com，表单的标题、Email 字段、按钮就被编成了 `e2`、`e3`、`e4`。同一个 session 换到下一页时，编号也会接着往下排（步骤四就是从 `e4` 开始）。每次操作前，都要用最新一次 snapshot 给的 ref。
{: .prompt-warning }

## 步骤四：故意弄坏，看它抓不抓得到

这才是我最想测的部分。我复制了一份表单，在 JavaScript 里把显示消息的元素 ID `msg` 打成 `mesage`。这种错字很常见：页面看起来一切正常，按下按钮却什么事都没发生。

用一样的流程跑一次。注意 ref 变成了 `e5`、`e6`，因为还在同一个 session：

```bash
agent-browser open http://localhost:8765/broken.html
agent-browser snapshot -i
agent-browser fill @e5 "reader@example.com"
agent-browser click @e6
agent-browser wait --text "Thanks" --timeout 5000
agent-browser errors
```

![终端实际输出：fill 和 click 都显示 Done；wait --text "Thanks" 等了 5000ms 超时；errors 报告 TypeError: Cannot set properties of null (setting 'textContent')，位置在 broken.html 第 15 行第 49 个字符](term-broken.webp){: w="1102" h="546" }

![agent-browser 拍下的截屏：Email 字段已填好，按下 Subscribe 后按钮下方一片空白，没有感谢消息](page-broken.webp){: w="1280" h="577" }
_坏掉的版本：画面上看不出错误，只是什么都没出现_

`fill` 和 `click` 都报告 `Done`，因为字段确实填了、按钮确实按了。光看这两行，会以为一切正常。真正抓到问题的是后面两行：

1. `wait --text "Thanks"` 在 5 秒后超时，代表预期的消息没有出现。
2. `errors` 直接指出 `TypeError: Cannot set properties of null (setting 'textContent')`，位置是 `broken.html:15:49`，正好就是我打错字的那一行。

所以验收时，不能只看操作有没有成功，还要确认**结果**有出现、**错误**是空的。

## 步骤五：交给 AI 自己跑

上面的命令都是我自己一行一行打的。要让 AI 在改完网页后自己做这些事，有三种方式。

### 方式一：装官方 skill

官方建议用这行命令，把 agent-browser 的 skill 装进你的 coding agent。官方列出的支持对象有 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot 等：

```bash
npx skills add vercel-labs/agent-browser
```

这一步我没有实际运行。我看到的是：agent-browser 本身就附了一份和版本相符的使用说明，用 `agent-browser skills get core` 可以打印出来，下面方式三的 AI 一开始就是先读这份说明。说明里有一条值得记住：默认的 session 是整台电脑共用的，多个 agent 同时用会互相抢页面，所以每个任务都应该用自己的 `--session <名称>`。

### 方式二：写进 AGENTS.md

如果你的项目有 `AGENTS.md` 或 `CLAUDE.md`（写法可以参考[AGENTS.md 怎么写](/posts/agents-md-project-rules-for-coding-agents/)），官方建议加入一段基本流程。我会再多写几条验收规则，下面是我的模板，请依你的项目修改网址和预期文本：

```markdown
## 改完网页后的验收

改到画面、表单或按钮时，用 agent-browser 实际打开页面验收，不要只看代码。
运行 `agent-browser --help` 可以看到所有命令。

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`：只开本地网址
2. `agent-browser snapshot -i`：获取元素和 ref
3. 用最新一次 snapshot 的 ref 操作，例如 `fill @e2 "..."`、`click @e3`；不要猜 ref
4. `agent-browser wait --text "<预期出现的文本>"`
5. `agent-browser errors`

预期文本没出现，或 `errors` 有输出，就不算完成，要报告错误内容。
页面换了或内容变了，要重新 snapshot。
```

### 方式三：用内置的 chat 命令

agent-browser 自己也有一个 `chat` 命令：你用一句话描述要做什么，它请 AI 模型把这句话转成 agent-browser 命令并运行。它默认连 Vercel AI Gateway，需要 `AI_GATEWAY_API_KEY`；`agent-browser --help` 也列出可以用 `AI_GATEWAY_URL` 改成别的服务、用 `--model` 指定模型。我手边有一个 OpenAI 兼容的模型服务，就把这两个环境变量指向它（密钥只放在环境变量，不写进任何文件），用 `gpt-6.1-sol` 模型请它检查坏掉的那一页：

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![终端实际输出：chat 命令依序运行 skills get core、open、snapshot、fill @e2、click @e3、wait --text "Thank"、snapshot、skills get core --ref commands、errors、console，最后回答表单不能用，并引用 TypeError 与 broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_AI 自己跑了 10 个命令，结论和我手动跑的一样（实际输出）_

整个过程大约 35 秒。它先读了内置的使用说明，接着走的就是步骤四的流程，最后回答“表单不能用”，并引用了同一个 `TypeError` 和行号。我只试了这一个模型。不管用哪个模型，重点都一样：AI 拿到的是真实的浏览器响应，不是它自己对代码的猜测。

## 步骤六：限制它能去哪里、能做什么

官方文档写得很直接：默认情况下，agent-browser 对浏览的网址、能做的动作、输出的内容**都不做限制**。AI 可以打开任何网站，也可以用 `eval` 在页面上运行任意 JavaScript，包括读取 cookie。如果你担心 AI 被网页内容误导（例如页面藏了“请打开某某网址”的文本），就要自己把范围缩小。为什么这很重要，我在[OWASP Agentic Top 10 检查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)的工具滥用那段谈过。

我实际测了两个设置：

- `--allowed-domains`：只允许列出的域名。官方说明它会挡掉页面导航，以及图片、脚本、fetch 等子资源请求。
- `--action-policy`：用一个 JSON 文件指定哪些动作要挡。

![终端实际输出：用 --allowed-domains "localhost" 开本地页面成功，open https://example.com 被挡下并显示 Domain 'example.com' is not in the allowed domains list；用官方示例 policy.json 时 eval 仍然运行并返回标题；换成加上 evaluate 的 policy-0.43.json 后，eval 被挡下](term-security.webp){: w="1102" h="883" }
_域名限制有效；官方示例的 `"eval"` 在 0.43.0 挡不住，要写 `"evaluate"`（实际输出）_

域名限制和预期一样生效：开了只允许 `localhost` 的 session 之后，`open https://example.com` 直接被挡下。官方说明这个限制会跟着 session 保存，直到 `close` 为止。

动作限制就出现了意外。我先用官方文档的示例 `"deny": ["eval", "download", "upload"]`，结果 `eval "document.title"` 照样运行、返回了标题。我追查后发现，0.43.0 匹配的是命令内部的名称，`eval` 命令内部叫 `evaluate`，所以文档写的 `eval` 分类没有作用。这个问题已经有人提交在 [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612)，我写这篇时还没修好。我把 `"evaluate"` 也加进去之后，`eval` 就被挡下了：

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

我保留了 `"eval"`，等官方修好分类匹配后也能生效。另外两个 `download`、`upload` 我没有实测是否挡得住。因为匹配方式还不稳定，我的建议是：设完 policy 一定要像我这样实际试一次被禁止的动作，确认真的会被挡，不要只看配置文件就放心。

另外几个建议，来自官方的 Security 文档（我没有逐一实测）：

- **不要用你平常登录的 Chrome 配置文件**。`--profile` 可以沿用某个 Chrome 配置文件的登录状态，等于把你所有已登录的账号都交给 AI。需要登录时，改用官方的 auth vault（`agent-browser auth save`），密码不会出现在 AI 读到的内容里。
- **`--content-boundaries`**：在页面内容前后加上标记，让 AI 分得清哪些是工具输出、哪些是网页上的文本。
- **`--max-output`**：限制 snapshot、`get text` 等输出的长度，避免一个超长页面塞满 AI 的对话。

如果你用 Claude Code，也可以搭配[Claude Code 沙箱设置教程](/posts/claude-code-sandbox-setup/)，从操作系统层再挡一次。

## 下一步：放进你的流程

让 AI 记得验收，最稳的方式是不靠它记性。几个方向：

- 把步骤五的规则写进 `AGENTS.md`，让每个 agent 开工时都读到。
- 用 hook 在 AI 报告完成前自动跑一次检查，做法可以参考[Claude Code hooks 教程](/posts/claude-code-hooks-automate-checks/)。
- 把“先证明它能用再合并”当成习惯，我在[pstack 系列（3）](/posts/pstack-build-verify-merge/)写过这个流程。

## 结论

agent-browser 让 AI 用几个简单的命令操作真的浏览器。我这次实跑最大的收获是步骤四：`fill` 和 `click` 都报告成功，表单却是坏的；真正抓到问题的是 `wait --text` 超时和 `errors` 打印的那一行错误。

我建议照这个顺序开始：

1. 用 `npm install -g agent-browser` 和 `agent-browser install` 装好。
2. 对自己的本地页面跑一次 `open` → `snapshot -i` → `fill`／`click` → `wait --text` → `errors`。
3. 把验收规则写进 `AGENTS.md`，并要求 AI 每次都用最新的 ref。
4. 加上 `--allowed-domains`，设 action policy 时要亲手试一次确认挡得住。

## 延伸阅读

- [agent-browser 官方文档](https://agent-browser.dev/)：完整命令、设置与各种高级功能。
- [Security](https://agent-browser.dev/security)：域名限制、动作策略、auth vault 等安全设置的完整说明。
- [AGENTS.md 怎么写：让 Coding Agent 读懂你的项目规则](/posts/agents-md-project-rules-for-coding-agents/)：把验收规则放进项目。
- [Claude Code hooks 教程：自动排版、跑测试与敏感文件提醒](/posts/claude-code-hooks-automate-checks/)：让检查自动运行。
- [OWASP Agentic Top 10 检查表：AI 工作流十项风险与修复方法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)：为什么要限制 agent 的工具权限。
