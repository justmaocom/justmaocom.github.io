---
title: "agent-browser 入門：讓 AI 自己打開瀏覽器檢查成果"
description: "用 agent-browser 讓 coding agent 自己開網頁、填表單、按按鈕，再讀頁面錯誤確認改好的東西真的能用。我在 0.43.0 實際跑過一次，附真實截圖，也示範怎麼限制它能去的網域與能做的動作。"
date: 2026-11-19 09:00:00 +0800
categories: [AI, 軟體開發]
tags: [agent-browser, coding-agent, browser-automation, testing, ai-security]
media_subpath: /assets/img/posts/agent-browser-ai-test-web-pages/
image:
  path: cover.webp
  alt: "讓 AI 用 agent-browser 打開網頁、填表單、讀錯誤，自己確認改好的頁面真的能用。"
---

請 AI 改網頁時，我最常遇到的情況是：它說「改好了」，我打開瀏覽器一按，按鈕沒反應。AI 看得到程式碼，卻看不到畫面，所以它不知道自己寫壞了。

[agent-browser](https://github.com/vercel-labs/agent-browser) 是 Vercel Labs 做的命令列工具，讓 AI 用一行一行的指令操作瀏覽器：打開網頁、讀出頁面上有哪些按鈕和欄位、點下去、確認結果有沒有出現。AI 本來就會在終端機跑指令，學會這幾個指令，它就能在說「改好了」之前，自己先點一遍。

這篇我會帶你從安裝開始，用一個本機的小表單走完整個流程。我刻意準備了一個有錯字的壞掉版本，看看 agent-browser 能不能把錯誤抓出來。最後再示範把它交給 AI 自己跑，以及怎麼限制它能去的網站和能做的動作。

> **版本與實測**：我寫這篇時，參考的是 2026-11-19（台北時間）當天的 [GitHub README](https://github.com/vercel-labs/agent-browser)、[Installation](https://agent-browser.dev/installation)、[Quick Start](https://agent-browser.dev/quick-start)、[Snapshots](https://agent-browser.dev/snapshots) 與 [Security](https://agent-browser.dev/security)，並在同一天用一台 Debian Linux 電腦實際跑過一遍：agent-browser 0.43.0（當天最新版，2026-11-13 發布），搭配它自己下載的 Chrome for Testing 158.0.8127.36。文中的截圖都來自這次實跑，終端機截圖是把當時錄下的輸出原樣排版成圖，有幾張只截取其中幾個指令。這個工具大約一週出一版，照著做之前，請先用 `agent-browser --version` 確認版本。
{: .prompt-info }

## 先認識幾個名詞

- **headless 瀏覽器**：沒有視窗的瀏覽器。它照常載入網頁、執行 JavaScript，只是不顯示在螢幕上。agent-browser 預設就用這種模式。
- **snapshot**：把頁面整理成一份文字清單，列出標題、輸入欄、按鈕這些元素。AI 讀文字比看圖片省力得多。
- **ref**：snapshot 幫每個元素編的代號，例如 `@e2`。之後要點哪個按鈕、填哪個欄位，就用這個代號指定。
- **session**：一個在背景持續開著的瀏覽器。你下的每個指令都送到同一個瀏覽器，所以上一步打開的頁面，下一步還在。

## 步驟一：安裝

官方建議用 npm 全域安裝，再用 `agent-browser install` 下載它要用的 Chrome（[Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)，Google 給自動化測試用的 Chrome 版本）。macOS 也可以用 `brew install agent-browser`，Rust 使用者可以用 `cargo install agent-browser`。

```bash
npm install -g agent-browser
agent-browser --version
agent-browser install
```

![終端機實際輸出：npm 安裝 agent-browser，出現 install-scripts 警告；agent-browser --version 顯示 0.43.0；agent-browser install 下載 Chrome 158.0.8127.36 並安裝成功](term-install.webp){: w="1102" h="636" }
_我在 Debian Linux 上的安裝過程（實際輸出）_

我的 npm（11.21.1）在安裝時跳出了 `install-scripts` 警告，表示 agent-browser 的安裝腳本（postinstall）沒有被允許執行。npm 12 起預設會擋掉安裝腳本，我在〈[npm 12 預設擋掉安裝腳本](/posts/npm-12-install-scripts-allowscripts/)〉介紹過。官方文件說明，遇到這種情況 agent-browser 會在第一次執行時自己接好，不需要額外設定；我這次也是不理會警告，`agent-browser --version` 就直接印出 `0.43.0`。

Linux 上如果之後開瀏覽器時出現缺少 shared library 的錯誤，官方的做法是改跑 `agent-browser install --with-deps`，它會用系統的套件管理員補裝 Chrome 需要的函式庫（需要 root 或 `sudo`）。我這台電腦不需要。

裝完可以跑一次健康檢查。`--offline --quick` 只檢查本機、不連網路，我跑的結果是 `8 pass, 0 warn, 0 fail`：

```bash
agent-browser doctor --offline --quick
```

## 步驟二：走一次基本流程

agent-browser 的用法可以濃縮成四步：打開頁面、拿 snapshot、用 ref 操作、確認結果。頁面一有變化，就重新拿一次 snapshot。

![agent-browser 的基本流程：open 打開網頁、snapshot -i 列出可操作元素並配上 ref、用 ref 填欄位和點按鈕、用 wait、get、errors 確認結果；頁面變了就重新 snapshot](core-loop.webp){: w="1600" h="900" }

我先拿官方範例常用的 `example.com` 試：

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser get title
agent-browser click @e1
agent-browser get url
```

![終端機實際輸出：open example.com 顯示 Example Domain；snapshot -i 列出 link "Learn more" [ref=e1]；get title 回傳 Example Domain；click @e1 之後 get url 變成 iana.org 的網址](term-core.webp){: w="1102" h="568" }
_snapshot 給出 `@e1`，點下去之後網址變了（實際輸出）_

逐行看：

- `open` 會在背景啟動瀏覽器（第一次會印出 `launched browser`），然後打開網頁，回報頁面標題和網址。
- `snapshot -i` 只列出能互動的元素。這個頁面只有一個連結，代號是 `e1`。
- `click @e1` 點那個連結，`get url` 確認網址真的換成了 IANA 的說明頁。

`-i` 是 interactive 的意思。不加的話會列出整頁的結構，包括段落文字；只想找按鈕和欄位時，加 `-i` 比較精簡。

## 步驟三：驗收一個本機表單

實際用途通常是檢查你自己正在做的網頁。我寫了一個只有 Email 欄位和 Subscribe 按鈕的訂閱表單，送出後應該顯示「Thanks! We sent a confirmation to …」。用 Python 內建的伺服器在本機開起來：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

然後打開它、拿 snapshot。想知道每個 ref 對應畫面上哪裡，可以用 `screenshot --annotate`，它會在截圖上標出編號：

```bash
agent-browser open http://localhost:8765/
agent-browser snapshot -i
agent-browser screenshot --annotate shots/annotated.png
```

![終端機實際輸出：snapshot -i 列出 heading、textbox "Email"、button "Subscribe" 三個元素；screenshot --annotate 存檔並印出 [1] @e1、[2] @e2、[3] @e3 的對照表](term-annotate.webp){: w="1102" h="388" }

![agent-browser 用 --annotate 拍下的截圖：標題、Email 欄位、Subscribe 按鈕分別框上紅色的 1、2、3](page-annotated.webp){: w="1280" h="800" }
_截圖上的 [2]、[3] 就是 snapshot 裡的 `@e2`、`@e3`_

接著填 Email、按 Subscribe，再確認感謝訊息出現、頁面沒有 JavaScript 錯誤：

```bash
agent-browser fill @e2 "reader@example.com"
agent-browser click @e3
agent-browser wait --text "Thanks"
agent-browser get text "#msg"
agent-browser errors
agent-browser screenshot shots/good.png
```

![終端機實際輸出：fill @e2 和 click @e3 都顯示 Done；wait --text "Thanks" 成功；get text "#msg" 回傳 Thanks! We sent a confirmation to reader@example.com.；errors 沒有輸出](term-verify.webp){: w="1102" h="658" }

![agent-browser 拍下的截圖：Email 欄位填好 reader@example.com，按鈕下方出現綠色的感謝訊息](page-good.webp){: w="1280" h="577" }
_正常版本：感謝訊息出現，`errors` 沒有任何輸出_

這幾個指令各自負責確認一件事：

- `wait --text "Thanks"` 等到頁面上出現這段文字才往下走，等不到就報錯。它比「固定等幾秒」可靠。
- `get text "#msg"` 讀出訊息的完整內容，確認填進去的 Email 有帶到。
- `errors` 列出頁面上的 JavaScript 錯誤。沒有輸出代表沒有錯誤。

> **我踩到的坑：不要照抄範例裡的 `@e1`**。我第一次跑的時候直接照文件範例寫 `fill @e1`，結果回報 `Unknown ref: e1`，接下來的 `click @e2` 點到的是標題，不是按鈕。那次我在同一個 session 裡先開過 example.com，表單的標題、Email 欄位、按鈕就被編成了 `e2`、`e3`、`e4`。同一個 session 換到下一頁時，編號也會接著往下排（步驟四就是從 `e4` 開始）。每次操作前，都要用最新一次 snapshot 給的 ref。
{: .prompt-warning }

## 步驟四：故意弄壞，看它抓不抓得到

這才是我最想測的部分。我複製了一份表單，在 JavaScript 裡把顯示訊息的元素 ID `msg` 打成 `mesage`。這種錯字很常見：頁面看起來一切正常，按下按鈕卻什麼事都沒發生。

用一樣的流程跑一次。注意 ref 變成了 `e5`、`e6`，因為還在同一個 session：

```bash
agent-browser open http://localhost:8765/broken.html
agent-browser snapshot -i
agent-browser fill @e5 "reader@example.com"
agent-browser click @e6
agent-browser wait --text "Thanks" --timeout 5000
agent-browser errors
```

![終端機實際輸出：fill 和 click 都顯示 Done；wait --text "Thanks" 等了 5000ms 逾時；errors 回報 TypeError: Cannot set properties of null (setting 'textContent')，位置在 broken.html 第 15 行第 49 字](term-broken.webp){: w="1102" h="546" }

![agent-browser 拍下的截圖：Email 欄位已填好，按下 Subscribe 後按鈕下方一片空白，沒有感謝訊息](page-broken.webp){: w="1280" h="577" }
_壞掉的版本：畫面上看不出錯誤，只是什麼都沒出現_

`fill` 和 `click` 都回報 `Done`，因為欄位確實填了、按鈕確實按了。光看這兩行，會以為一切正常。真正抓到問題的是後面兩行：

1. `wait --text "Thanks"` 在 5 秒後逾時，代表預期的訊息沒有出現。
2. `errors` 直接指出 `TypeError: Cannot set properties of null (setting 'textContent')`，位置是 `broken.html:15:49`，正好就是我打錯字的那一行。

所以驗收時，不能只看操作有沒有成功，還要確認**結果**有出現、**錯誤**是空的。

## 步驟五：交給 AI 自己跑

上面的指令都是我自己一行一行打的。要讓 AI 在改完網頁後自己做這些事，有三種方式。

### 方式一：裝官方 skill

官方建議用這行指令，把 agent-browser 的 skill 裝進你的 coding agent。官方列出的支援對象有 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot 等：

```bash
npx skills add vercel-labs/agent-browser
```

這一步我沒有實際執行。我看到的是：agent-browser 本身就附了一份和版本相符的使用說明，用 `agent-browser skills get core` 可以印出來，下面方式三的 AI 一開始就是先讀這份說明。說明裡有一條值得記住：預設的 session 是整台電腦共用的，多個 agent 同時用會互相搶頁面，所以每個任務都應該用自己的 `--session <名稱>`。

### 方式二：寫進 AGENTS.md

如果你的專案有 `AGENTS.md` 或 `CLAUDE.md`（寫法可以參考〈[AGENTS.md 怎麼寫](/posts/agents-md-project-rules-for-coding-agents/)〉），官方建議加入一段基本流程。我會再多寫幾條驗收規則，下面是我的範本，請依你的專案修改網址和預期文字：

```markdown
## 改完網頁後的驗收

改到畫面、表單或按鈕時，用 agent-browser 實際打開頁面驗收，不要只看程式碼。
執行 `agent-browser --help` 可以看到所有指令。

1. `agent-browser --allowed-domains "localhost" open http://localhost:8765/`：只開本機網址
2. `agent-browser snapshot -i`：取得元素和 ref
3. 用最新一次 snapshot 的 ref 操作，例如 `fill @e2 "..."`、`click @e3`；不要猜 ref
4. `agent-browser wait --text "<預期出現的文字>"`
5. `agent-browser errors`

預期文字沒出現，或 `errors` 有輸出，就不算完成，要回報錯誤內容。
頁面換了或內容變了，要重新 snapshot。
```

### 方式三：用內建的 chat 指令

agent-browser 自己也有一個 `chat` 指令：你用一句話描述要做什麼，它請 AI 模型把這句話轉成 agent-browser 指令並執行。它預設連 Vercel AI Gateway，需要 `AI_GATEWAY_API_KEY`；`agent-browser --help` 也列出可以用 `AI_GATEWAY_URL` 改成別的服務、用 `--model` 指定模型。我手邊有一個 OpenAI 相容的模型服務，就把這兩個環境變數指向它（金鑰只放在環境變數，不寫進任何檔案），用 `gpt-6.1-sol` 模型請它檢查壞掉的那一頁：

```bash
agent-browser chat --model gpt-6.1-sol "Open http://localhost:8765/broken.html, type reader@example.com into the email field, click Subscribe, and check that a thank-you message appears. Also check the page for JavaScript errors. Tell me in two sentences whether the form works."
```

![終端機實際輸出：chat 指令依序執行 skills get core、open、snapshot、fill @e2、click @e3、wait --text "Thank"、snapshot、skills get core --ref commands、errors、console，最後回答表單不能用，並引用 TypeError 與 broken.html:15:49](term-chat.webp){: w="1102" h="411" }
_AI 自己跑了 10 個指令，結論和我手動跑的一樣（實際輸出）_

整個過程大約 35 秒。它先讀了內建的使用說明，接著走的就是步驟四的流程，最後回答「表單不能用」，並引用了同一個 `TypeError` 和行號。我只試了這一個模型。不管用哪個模型，重點都一樣：AI 拿到的是真實的瀏覽器回應，不是它自己對程式碼的猜測。

## 步驟六：限制它能去哪裡、能做什麼

官方文件寫得很直接：預設情況下，agent-browser 對瀏覽的網址、能做的動作、輸出的內容**都不做限制**。AI 可以打開任何網站，也可以用 `eval` 在頁面上執行任意 JavaScript，包括讀取 cookie。如果你擔心 AI 被網頁內容誤導（例如頁面藏了「請打開某某網址」的文字），就要自己把範圍縮小。為什麼這很重要，我在〈[OWASP Agentic Top 10 檢查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)〉的工具濫用那段談過。

我實際測了兩個設定：

- `--allowed-domains`：只允許列出的網域。官方說明它會擋掉頁面導覽，以及圖片、腳本、fetch 等子資源請求。
- `--action-policy`：用一個 JSON 檔指定哪些動作要擋。

![終端機實際輸出：用 --allowed-domains "localhost" 開本機頁面成功，open https://example.com 被擋下並顯示 Domain 'example.com' is not in the allowed domains list；用官方範例 policy.json 時 eval 仍然執行並回傳標題；換成加上 evaluate 的 policy-0.43.json 後，eval 被擋下](term-security.webp){: w="1102" h="883" }
_網域限制有效；官方範例的 `"eval"` 在 0.43.0 擋不住，要寫 `"evaluate"`（實際輸出）_

網域限制如預期運作：開了只允許 `localhost` 的 session 之後，`open https://example.com` 直接被擋下。官方說明這個限制會跟著 session 保存，直到 `close` 為止。

動作限制就出現了意外。我先用官方文件的範例 `"deny": ["eval", "download", "upload"]`，結果 `eval "document.title"` 照樣執行、回傳了標題。我追查後發現，0.43.0 比對的是指令內部的名稱，`eval` 指令內部叫 `evaluate`，所以文件寫的 `eval` 分類沒有作用。這個問題已經有人回報在 [issue #1612](https://github.com/vercel-labs/agent-browser/issues/1612)，我寫這篇時還沒修好。我把 `"evaluate"` 也加進去之後，`eval` 就被擋下了：

```json
{
  "default": "allow",
  "deny": ["eval", "evaluate", "download", "upload"]
}
```
{: file="policy-0.43.json" }

我保留了 `"eval"`，等官方修好分類比對後也能生效。另外兩個 `download`、`upload` 我沒有實測是否擋得住。因為比對方式還不穩定，我的建議是：設完 policy 一定要像我這樣實際試一次被禁止的動作，確認真的會被擋，不要只看設定檔就放心。

另外幾個建議，來自官方的 Security 文件（我沒有逐一實測）：

- **不要用你平常登入的 Chrome 設定檔**。`--profile` 可以沿用某個 Chrome 設定檔的登入狀態，等於把你所有已登入的帳號都交給 AI。需要登入時，改用官方的 auth vault（`agent-browser auth save`），密碼不會出現在 AI 讀到的內容裡。
- **`--content-boundaries`**：在頁面內容前後加上標記，讓 AI 分得清哪些是工具輸出、哪些是網頁上的文字。
- **`--max-output`**：限制 snapshot、`get text` 等輸出的長度，避免一個超長頁面塞滿 AI 的對話。

如果你用 Claude Code，也可以搭配〈[Claude Code 沙箱設定教學](/posts/claude-code-sandbox-setup/)〉，從作業系統層再擋一次。

## 下一步：放進你的流程

讓 AI 記得驗收，最穩的方式是不靠它記性。幾個方向：

- 把步驟五的規則寫進 `AGENTS.md`，讓每個 agent 開工時都讀到。
- 用 hook 在 AI 回報完成前自動跑一次檢查，做法可以參考〈[Claude Code hooks 教學](/posts/claude-code-hooks-automate-checks/)〉。
- 把「先證明它能用再合併」當成習慣，我在〈[pstack 系列（3）](/posts/pstack-build-verify-merge/)〉寫過這個流程。

## 結論

agent-browser 讓 AI 用幾個簡單的指令操作真的瀏覽器。我這次實跑最大的收穫是步驟四：`fill` 和 `click` 都回報成功，表單卻是壞的；真正抓到問題的是 `wait --text` 逾時和 `errors` 印出的那一行錯誤。

我建議照這個順序開始：

1. 用 `npm install -g agent-browser` 和 `agent-browser install` 裝好。
2. 對自己的本機頁面跑一次 `open` → `snapshot -i` → `fill`／`click` → `wait --text` → `errors`。
3. 把驗收規則寫進 `AGENTS.md`，並要求 AI 每次都用最新的 ref。
4. 加上 `--allowed-domains`，設 action policy 時要親手試一次確認擋得住。

## 延伸閱讀

- [agent-browser 官方文件](https://agent-browser.dev/)：完整指令、設定與各種進階功能。
- [Security](https://agent-browser.dev/security)：網域限制、動作政策、auth vault 等安全設定的完整說明。
- [AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)：把驗收規則放進專案。
- [Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)：讓檢查自動執行。
- [OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)：為什麼要限制 agent 的工具權限。
