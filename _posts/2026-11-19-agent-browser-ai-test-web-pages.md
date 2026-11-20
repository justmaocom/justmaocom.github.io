---
title: "agent-browser 入門：讓 AI 自己打開瀏覽器檢查成果"
description: "用 agent-browser 讓 coding agent 自己打開網頁、操作表單，再讀 JavaScript 錯誤，確認改好的網頁真的能用。我在 0.43.0 實際跑過，附示範頁原始碼，以及網域限制與 action policy 的實測結果。"
date: 2026-11-19 09:30:00 +0800
categories: [AI, 軟體開發]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.webp
  alt: "AI 改完網頁後，先用 agent-browser 實際操作頁面、檢查 JavaScript 錯誤，再回報完成。"
---

coding agent 改完網頁後，如果只讀程式碼，就看不到按鈕按下去之後頁面有沒有反應。程式碼看起來沒問題，頁面仍然可能是壞的。

[agent-browser](https://github.com/vercel-labs/agent-browser) 是 Vercel Labs 用 Rust 寫的命令列工具。AI 用它一次下一個指令操作瀏覽器，例如打開網頁、列出頁面上的按鈕和欄位、點擊，再讀出結果。coding agent 本來就能在終端機執行指令，所以它可以在回報「改好了」之前，先用這些指令把頁面點一遍。

這篇我從安裝開始，用一個本機的訂閱表單走完整個流程。我另外做了一個有錯字的壞掉版本，看 agent-browser 的輸出能不能指出錯誤。接著我把同樣的檢查交給 AI 執行，最後測試怎麼限制它能去的網域和能做的動作。兩個示範頁的原始碼都在文中，你可以照著重做。

> 我對照的官方資料是 agent-browser v0.43.0 tag 裡的 [README](https://github.com/vercel-labs/agent-browser/tree/v0.43.0)，以及 [Installation](https://agent-browser.dev/installation)、[Quick Start](https://agent-browser.dev/quick-start)、[Snapshots](https://agent-browser.dev/snapshots)、[Security](https://agent-browser.dev/security) 四份文件。官網上的文件可能已經在說明更新的版本。2026-11-19（台北時間）我在一台 Debian 13（x86_64）電腦上做了這次實測，用的是 agent-browser 0.43.0 和它自己下載的 Chrome for Testing 158.0.8127.36。0.43.0 是當天 GitHub 上標示為 Latest 的版本，在台北時間 2026-11-13 發布。從 v0.39.1（台北時間 2026-10-14）到 0.43.0，GitHub 上一共出了 10 個版本，所以照著做之前，請先看你的版本：
>
> ```bash
> agent-browser --version
> ```
>
> 文中的終端機截圖是把當時錄下的輸出原樣排成圖片，有幾張只截取其中幾個指令。
{: .prompt-info }

## 先認識幾個名詞

- headless 瀏覽器是沒有視窗的瀏覽器。它照常載入網頁、執行 JavaScript，只是不顯示在螢幕上。依 `--help`，agent-browser 預設用這種模式，加上 `--headed` 才會顯示視窗。
- snapshot 是 agent-browser 把頁面整理成的文字清單，列出標題、輸入欄、按鈕等元素。依 agent-browser 內建的 core skill（使用指南），snapshot 比截圖快，用的 token 也少很多。
- ref 是 snapshot 幫每個元素編的代號，例如 `@e2`。要點哪個按鈕、填哪個欄位，就用 ref 指定。
- session 是一個在背景持續開著的瀏覽器。同一個 session 的指令都送到同一個瀏覽器，所以上一步打開的頁面，下一步還在。依 README，它閒置一小時後會自動關閉。要自己關掉，就執行：

  ```bash
  agent-browser close
  ```

## 步驟一：安裝

官方建議用 npm 全域安裝，再用 `agent-browser install` 下載它要用的 Chrome。這個 Chrome 是 [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)，也就是 Google 給自動化測試用的版本。依官方文件，macOS 也可以用 brew 安裝：

```bash
brew install agent-browser
```

用 cargo 安裝則會從原始碼編譯，需要 Rust 工具鏈：

```bash
cargo install agent-browser
```

這兩種我沒有試，我用的是 npm：

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![終端機實際輸出：npm 安裝 agent-browser，出現 install-scripts 警告；agent-browser --version 顯示 agent-browser 0.43.0；agent-browser install 下載 Chrome 158.0.8127.36 並安裝成功](term-install.webp){: w="1102" h="636" }
_我在 Debian Linux 上的安裝過程（實際輸出）_

npm 在安裝時印出了 `install-scripts` 警告。內容是 `agent-browser@0.43.0` 的 postinstall 腳本還不在 allowScripts 清單裡，並提示可以加 `--allow-scripts=agent-browser` 允許它執行。npm 擋安裝腳本的機制，我在〈[npm 12 預設擋掉安裝腳本](/posts/npm-12-install-scripts-allowscripts/)〉介紹過。依官方 Installation 文件，用 npm 12 這類預設擋安裝腳本的套件管理工具時，agent-browser 會在第一次執行時自己完成連結，不需要額外設定。我沒有理會這個警告，接著執行 `agent-browser --version`，它直接印出 `agent-browser 0.43.0`。

在 Linux 上，`agent-browser install` 印了兩次提示，說瀏覽器啟動失敗或出現 shared library 錯誤時，要改跑：

```bash
agent-browser install --with-deps
```

依官方文件，這個指令會用系統的套件管理工具補裝 Chrome 需要的函式庫，不是 root 時會透過 `sudo` 執行。我沒有跑 `--with-deps`，後面每一步的瀏覽器都正常啟動。

裝完可以跑一次健康檢查：

```bash
agent-browser doctor --offline --quick
```

我跑的結果是 `Summary: 8 pass, 0 warn, 0 fail`。依官方文件，`--offline --quick` 只檢查本機、不連網路，也會跳過實際啟動瀏覽器的測試。輸出裡還有一行 `AI_GATEWAY_API_KEY not set (chat command disabled)`，步驟五會用到這個環境變數。

## 步驟二：走一次基本流程

agent-browser 的用法可以整理成四步：打開頁面、取得 snapshot、用 ref 操作、確認結果。頁面一有變化，就重新取得 snapshot。

![agent-browser 的基本流程：open 打開網頁、snapshot -i 列出可操作元素並配上 ref、用 ref 填欄位和點按鈕、用 wait、get、errors 確認結果；頁面變了就重新 snapshot](core-loop.webp){: w="1600" h="900" }

我先用官方 README 和 Quick Start 都用到的 `example.com` 試：

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser screenshot shots/example.png
agent-browser click @e1
agent-browser get url
agent-browser snapshot -i
```

![終端機實際輸出：open example.com 顯示 Example Domain；snapshot -i 列出 link "Learn more" [ref=e1]；get title 回傳 Example Domain；screenshot 存檔；click @e1 之後 get url 變成 iana.org 的網址；最後的 snapshot -i 顯示 (no interactive elements)](term-core.webp){: w="1102" h="568" }
_snapshot 給出 `@e1`，點下去之後網址變了（實際輸出）_

逐行看：

- `open` 在背景啟動瀏覽器，第一次會印出 `[agent-browser] launched browser`。接著它打開網頁，印出頁面標題和網址。
- `snapshot -i` 只列出能互動的元素。這個頁面只有一個連結，ref 是 `e1`。0.43.0 實際印出的格式是 `- link "Learn more" [ref=e1]`，和 Quick Start 文件裡的範例格式不同，請以你自己看到的輸出為準。
- `screenshot` 把目前的畫面存成 PNG 檔。
- `click @e1` 點那個連結。`get url` 回傳 `https://www.iana.org/help/example-domains`，表示已經換頁了。
- 換頁後的 `snapshot -i` 印出 `(no interactive elements)`。

`-i` 是 interactive 的縮寫。不加的話，snapshot 會列出整頁的結構，連段落文字也在內。只想找按鈕和欄位時，加 `-i` 輸出比較短。

## 步驟三：驗收一個本機表單

實際用途通常是檢查你自己正在做的網頁。我寫了一個訂閱表單，只有一個 Email 欄位和一個 Subscribe 按鈕。送出後，按鈕下方應該顯示「Thanks! We sent a confirmation to」加上你填的 Email。這個示範只更新頁面文字，不會真的寄出確認信。下面是完整的 `site/index.html`。請照原樣存檔，不要重新排版，步驟四的錯誤行號才會和我的一樣：

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

在 `site` 的上一層資料夾執行下面這行，用 Python 內建的 HTTP 伺服器把它開在 8765 埠。啟動後，讓這個終端機保持執行，另開一個終端機操作 agent-browser。任何能提供靜態檔案的伺服器都可以，只要網址是 `http://localhost:8765/`：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

如果你剛做完步驟二，先關掉瀏覽器：

```bash
agent-browser close
```

我正式跑這一步時，瀏覽器是關著的，所以 `open` 印出 `launched browser`，ref 從 `e1` 開始。沒有先關的話，ref 會接著往下編，原因寫在本節最後的警告。接著打開頁面、取得 snapshot：

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
```

snapshot 列出三個元素，標題是 `e1`，Email 欄位是 `e2`，Subscribe 按鈕是 `e3`。

接著填 Email、按 Subscribe，再確認感謝訊息出現，並檢查 JavaScript 錯誤：

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![終端機實際輸出：open 印出 launched browser；snapshot -i 列出 e1 到 e3；fill @e2 和 click @e3 都顯示 Done；wait --text "Thanks" 成功；get text "#msg" 回傳 Thanks! We sent a confirmation to reader@example.com.；errors 沒有輸出](term-verify.webp){: w="1102" h="658" }

![agent-browser 拍下的截圖：Email 欄位填好 reader@example.com，按鈕下方出現綠色的感謝訊息](page-good.webp){: w="1280" h="577" }
_正常版本的感謝訊息出現了，`errors` 也沒有任何輸出_

這幾個指令各自確認一件事：

- `wait --text "Thanks"` 等到頁面上出現這段文字才往下走，等不到就報錯。依 `wait --help`，`--text` 是子字串比對。官方 core skill 也建議用這種等待，不要用 `wait 2000` 這類固定毫秒數。
- `get text "#msg"` 讀出 `#msg` 元素的完整內容，確認填進去的 Email 有帶到。`"#msg"` 一定要加引號。我第一次嘗試時，包指令的腳本把引號弄丟了，實際執行的是 `agent-browser get text #msg`。shell 把 `#` 之後當成註解，agent-browser 回了 `Missing arguments for: get text`。
- `errors` 列出頁面上的 JavaScript 錯誤和未捕捉的例外。這次沒有任何輸出，代表工具沒有記錄到這輪操作的 JavaScript 錯誤；仍要搭配頁面結果判斷功能是否正常。

> 不要照抄文件範例裡的 ref。我第一次嘗試時照文件範例寫了 `fill @e1`，得到 `✗ Unknown ref: e1`。接下來的 `click @e2` 回報 `✓ Done`，但那次的 `e2` 是標題，不是按鈕，所以後面的 `wait` 等了 25000ms 後逾時。原因是那次我沒有先 `close`。同一個 session 先開過 example.com，它的連結已經用掉 `e1`，表單的標題、Email 欄位、按鈕就被編成 `e2`、`e3`、`e4`。依 Snapshots 文件，換頁會讓舊的 ref 失效，但編號不會回收重用。所以在同一個 session 裡換頁後，編號會接著往下排。每次操作前，都要用最新一次 snapshot 給的 ref。
{: .prompt-warning }

## 步驟四：故意弄壞，看它抓不抓得到

我把 `index.html` 複製成 `broken.html`，改了兩行。第 2 行的 `<title>` 加上 ` (broken)`。第 15 行把要寫入訊息的元素 ID 從 `msg` 打錯成 `mesage`。其他行都不動，第 7 行 CSS 的 `#msg` 和第 10 行的 `id="msg"` 也要保留。如果把所有 `msg` 都換掉，錯字會被抵銷，頁面反而正常。你可以照下面的差異自己做一份，放在同一個 `site` 資料夾：

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

這個錯字不會改變頁面的外觀。按下按鈕後，畫面上只是不會出現訊息。

我在同一個 session 用一樣的流程再跑一次。這次 snapshot 給出的 ref 是標題 `e4`、Email 欄位 `e5`、按鈕 `e6`，因為還在同一個 session，編號接著往下排。`wait` 我加了 `--timeout 5000`，只等 5 秒。不加的話會等預設的 25 秒，`--help` 列出的 `AGENT_BROWSER_DEFAULT_TIMEOUT` 預設值就是 25000 毫秒。

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

![終端機實際輸出：fill 和 click 都顯示 Done；wait --text "Thanks" 等了 5000ms 逾時；errors 回報 TypeError: Cannot set properties of null (setting 'textContent')，位置在 broken.html 第 15 行第 49 字](term-broken.webp){: w="1102" h="546" }

![agent-browser 拍下的截圖：Email 欄位已填好，按下 Subscribe 後按鈕下方一片空白，沒有感謝訊息](page-broken.webp){: w="1280" h="577" }
_壞掉的版本在畫面上看不出錯誤，只是什麼都沒出現_

`fill` 和 `click` 都回報 `✓ Done`。依 README，`click` 在目標被遮住、隱藏或停用時會失敗，所以 `Done` 只代表動作確實做了，不代表頁面有正確反應。光看這兩行，看不出問題。抓到問題的是後面兩個指令：

1. `wait --text "Thanks" --timeout 5000` 印出 `✗ Wait timed out after 5000ms`，預期的訊息沒有出現。
2. `errors` 印出 `TypeError: Cannot set properties of null (setting 'textContent')`，位置是 `broken.html:15:49`，就是我打錯字的第 15 行。`getElementById("mesage")` 找不到元素，回傳 `null`，對 `null` 設定 `textContent` 就會丟出這個錯誤。

`console` 這次沒有輸出，最後的 `screenshot` 存下了上面那張沒有感謝訊息的畫面。

所以驗收時，請確認預期的結果出現了，而且 `errors` 沒有輸出。動作回報 `✓ Done`，不等於驗收通過。

### 補充：在截圖上標出 ref

想知道每個 ref 對應畫面上的哪裡，可以用 `screenshot --annotate`。下面兩張圖來自我另外跑的一次。我用新的 session，先設定視窗大小，再打開表單並拍下註記截圖。若要試這段，請先關掉步驟四的 session：

```bash
agent-browser close
agent-browser set viewport 1280 800
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
agent-browser close
```

![終端機實際輸出：snapshot -i 列出 heading、textbox "Email"、button "Subscribe" 三個元素；screenshot --annotate 存檔並印出 [1] @e1、[2] @e2、[3] @e3 的對照表](term-annotate.webp){: w="1102" h="388" }

![agent-browser 用 --annotate 拍下的截圖：標題、Email 欄位、Subscribe 按鈕分別框上紅色的 1、2、3](page-annotated.webp){: w="1280" h="800" }
_截圖上的 [2]、[3] 就是 snapshot 裡的 `@e2`、`@e3`_

## 步驟五：交給 AI 自己跑

上面的指令是我寫成幾個 shell 腳本執行的，AI 沒有參與。下面介紹三種把檢查交給 AI 的方式。前兩種把流程交給既有的 coding agent；第三種用內建的 `chat` 檢查已經開好的本機網站。我只實測了第三種。

### 方式一：裝官方 skill

skill 是給 coding agent 讀的使用說明。依官方文件，下面這行會把 agent-browser 的 skill 裝進你的 coding agent，支援 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Goose、OpenCode 和 Windsurf：

```bash
npx skills add vercel-labs/agent-browser
```

這一步我沒有執行。依 v0.43.0 的 README，這樣裝進去的 skill 只是一個很短的引導，內容是叫 agent 先執行 `agent-browser skills get core`，所以 agent 讀到的說明會對應你裝的 CLI 版本。`skills get core` 印出的就是 agent-browser 內建的 core skill，下面方式三的 AI 第一個指令就是它。

core skill 提醒，預設的 session 是整台電腦共用的一個瀏覽器，在裡面操作可能會搶走別的 agent 的頁面，所以每個任務都該用自己的 `--session <名稱>`。我這次的實測全部在預設 session 裡跑，沒有用 `--session`。

### 方式二：寫進 AGENTS.md

如果你的專案有 `AGENTS.md` 或 `CLAUDE.md`，可以把流程寫進去，寫法可以參考〈[AGENTS.md 怎麼寫](/posts/agents-md-project-rules-for-coding-agents/)〉。官方 Installation 文件提供了一段基本流程。下面是我依那段改寫的範本，多加了幾條驗收規則。這個範本我沒有實際交給 AI 跑過，請依你的專案修改網址和預期文字：

```markdown
## 改完網頁後的驗收

改到畫面、表單或按鈕時，用 agent-browser 實際打開頁面驗收，不要只看程式碼。
執行 `agent-browser --help` 可以看到所有指令。
每個指令都加上 `--session <這個任務的名稱>`，不要用預設 session。

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`：只開本機網址
2. `agent-browser snapshot -i`：取得元素和 ref
3. 用最新一次 snapshot 的 ref 操作，例如 `fill @e2 "..."`、`click @e3`；不要猜 ref
4. `agent-browser wait --text "<預期出現的文字>"`
5. `agent-browser errors`
6. `agent-browser close`

預期文字沒出現，或 `errors` 有輸出，就不算完成，要回報錯誤內容。
頁面換了或內容變了，要重新 snapshot。
```

### 方式三：用內建的 chat 指令

agent-browser 也有一個 `chat` 指令。依 `chat --help`，它把你用自然語言寫的指示交給 AI 模型，由模型轉成 agent-browser 指令，在你選的 session 裡執行。它不能自己建立或切換 session。執行 `chat` 需要 `AI_GATEWAY_API_KEY`。依 `--help`，`AI_GATEWAY_URL` 是 Vercel AI Gateway 的 base URL，預設是 `https://ai-gateway.vercel.sh`。預設模型是 `anthropic/claude-sonnet-4.6`，可以用 `--model` 換。

我手邊有一個 OpenAI 相容的 LiteLLM 服務，就把 `AI_GATEWAY_URL` 和 `AI_GATEWAY_API_KEY` 指向它。金鑰和網址都只放在環境變數裡，沒有寫進任何檔案。確認本機 HTTP 伺服器仍在執行後，先關掉上一輪的瀏覽器：

```bash
agent-browser close
```

再用 `gpt-6.1-sol` 模型請它檢查壞掉的那一頁：

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![終端機實際輸出：chat 指令依序執行 skills get core、open、snapshot、fill @e2、click @e3、wait --text "Thank"、snapshot、skills get core --ref commands、errors、console，最後回答表單不能用，並引用 TypeError 與 broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_AI 自己跑了 10 個指令，結論和我手動跑的一樣（實際輸出）_

從開始到最後的 `close` 結束共 36 秒。AI 的第一個指令是 `skills get core`，先讀 core skill。接著它依序跑了 `open`、不加 `-i` 的 `snapshot`、`fill @e2`、`click @e3`、`wait --text "Thank" --timeout 3000`，再跑一次 `snapshot`，查了 `skills get core --ref commands`，最後看 `errors` 和 `console`。它的 ref 是 `e2`、`e3`，因為前一次執行結束時我已經 `close`，這是新的 session。最後它回答表單不能用，並引用了同一個 `TypeError` 和 `broken.html:15:49`。

同一句指示我另外加 `-v` 跑過一次，`-v` 會印出每個指令的完整輸出。那次的指令順序和結論都一樣，`wait` 印出 `✗ Wait timed out after 3000ms`。兩次我都只用了 `gpt-6.1-sol` 這一個模型。

## 步驟六：限制它能去哪裡、能做什麼

依官方 Security 文件，agent-browser 預設對導覽、動作和輸出都不設限制，這些控制都要自己打開。AI 可以打開任何網站，也可以用 `eval` 在頁面上執行任意 JavaScript，例如讀 `document.cookie`。如果你擔心 AI 被網頁內容誤導，例如頁面藏了一段要它打開某個網址的文字，就要自己縮小範圍。這類風險可以參考我寫的〈[OWASP Agentic Top 10 檢查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)〉的工具濫用那一節。

我實測了兩個設定：

- `--allowed-domains` 只允許列出的網域。依官方文件，它會擋掉頁面導覽，也會擋掉圖片、腳本、fetch 等子資源請求。
- `--action-policy` 指定一個 JSON 格式的 policy 檔，列出哪些動作要擋。

![終端機實際輸出：用 --allowed-domains "localhost" 開本機頁面成功，open https://example.com 被擋下並顯示 Domain 'example.com' is not in the allowed domains list；用官方範例 policy.json 時 eval 仍然執行並回傳標題；換成加上 evaluate 的 policy-0.43.json 後，eval 被擋下](term-security.webp){: w="1102" h="883" }
_網域限制有效；官方範例的 `"eval"` 在 0.43.0 擋不住，要寫 `"evaluate"`（實際輸出）_

網域限制的結果和文件寫的一樣。用 `--allowed-domains "localhost"` 開啟 session 之後，`open https://example.com` 被擋下，印出 `✗ Domain 'example.com' is not in the allowed domains list`。依官方文件，網域限制和 action policy 都會跟著 session 保存，直到 `close` 成功為止。

action policy 的結果和文件不同。我先用 Security 文件裡的範例 `"deny": ["eval", "download", "upload"]`，結果 `eval "document.title"` 照樣執行，回傳 `"Newsletter demo"`。我查了 v0.43.0 的原始碼，`cli/src/native/policy.rs` 是拿指令內部的動作名稱做完全比對。`eval` 指令內部的動作名稱是 `evaluate`，所以文件寫的 `eval` 分類沒有作用。這個問題已經有人回報在 [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612)，修正放在 [PR #2506](https://github.com/vercel-labs/agent-browser/pull/2506)，我寫這篇時兩者都還是 open。我把 `"evaluate"` 也加進去之後，`eval` 被擋下，印出 `✗ Action 'evaluate' denied by policy: Action 'evaluate' is denied by policy`：

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

檔案裡保留了 `"eval"`。依 PR #2506 的說明，它會讓分類名稱也比對到底下的動作，到時候 `"eval"` 這一項就會生效。`download` 和 `upload` 擋不擋得住，我沒有測試。

我另外手動試了兩種寫法。第一種是把 Security 文件的嚴格範例改成 `"default": "deny"`，`allow` 清單是 `navigate`、`snapshot`、`click`、`fill`、`wait`、`get`、`close`。結果 `open`、`snapshot -i`、`fill`、`click`、`wait --text` 都能執行，但 `get text "#msg"` 被擋，訊息是 `Action 'gettext' denied by policy`。`get title`、`get url`、`screenshot`、`errors` 也都被擋，因為它們內部的動作名稱分別是 `title`、`url`、`screenshot`、`errors`，不在清單裡。第二種是 `--confirm-actions eval`，它也沒有作用，`eval "1+1"` 沒有要求確認就回傳 `2`。

所以設完 action policy 之後，請像我這樣實際執行一次被禁止的動作，確認它會被擋下。也要確認你需要的指令沒有被一起擋掉。不要只看 policy 檔的內容就放心。

下面幾個做法來自官方文件，這幾項我都沒有實際執行：

- 依 `--help`，`--profile` 會沿用某個 Chrome profile 的登入狀態。如果用你平常登入的 profile，AI 就能用那個 profile 裡所有已登入帳號的狀態。依 Security 文件，`--allowed-domains` 也不能和 `--profile` 一起用。需要登入時，Security 文件提供的是 auth vault，用 `agent-browser auth save` 把帳密存在本機，之後用名稱登入，密碼不會出現在 AI 讀到的內容裡。
- `--content-boundaries` 會在頁面內容前後加上帶隨機 nonce 的標記，讓 AI 分得出哪些是工具輸出、哪些是網頁上的文字。
- `--max-output` 限制 snapshot、`get text`、`get html`、`eval`、`console` 的輸出字數，避免一個超長頁面塞滿 AI 的上下文。

依 Security 文件，網域限制不是作業系統層的防火牆。如果你用 Claude Code，可以再搭配〈[Claude Code 沙箱設定教學](/posts/claude-code-sandbox-setup/)〉，在作業系統層再加一道限制。

## 下一步：放進你的流程

要把驗收變成固定流程，可以把操作規則寫進專案指引，或設定自動檢查：

- 把步驟五的範本寫進 `AGENTS.md`，讓支援這份指引的 coding agent 在開工時讀取。
- 用 hook 在 AI 回報完成前自動跑一次檢查，做法可以參考〈[Claude Code hooks 教學](/posts/claude-code-hooks-automate-checks/)〉。
- 合併前先證明它能用，我在〈[pstack 系列（3）](/posts/pstack-build-verify-merge/)〉寫過這個流程。

## 結論

這次實跑的關鍵結果在步驟四。壞掉的表單上，`fill` 和 `click` 都回報 `✓ Done`。抓到問題的是 `wait --text` 逾時，以及 `errors` 印出的 `TypeError` 和 `broken.html:15:49`。AI 用 `chat` 檢查同一頁，也得到同樣的結論。另外，0.43.0 的 action policy 照文件寫 `"eval"` 擋不住 `eval`，要寫 `"evaluate"`。

我建議照這個順序開始：

1. 用 `npm install -g agent-browser` 和 `agent-browser install` 安裝，再用 `agent-browser --version` 確認版本。
2. 對自己的本機頁面依序跑 `open`、`snapshot -i`、`fill` 或 `click`、`wait --text`、`errors`。
3. 把驗收規則寫進 `AGENTS.md`，要求 AI 每次都用最新一次 snapshot 的 ref。
4. 加上 `--allowed-domains`。設 action policy 時，親手試一次被禁止的動作，確認它會被擋下。

## 延伸閱讀

- [agent-browser 官方文件](https://agent-browser.dev/)，有完整的指令、設定和進階功能說明。
- [Security](https://agent-browser.dev/security) 完整說明網域限制、action policy、auth vault 等安全設定。
- 〈[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)〉說明怎麼把驗收規則放進專案。
- 〈[Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)〉說明怎麼讓檢查自動執行。
- 〈[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)〉說明為什麼要限制 agent 的工具權限。
