---
title: "Modern Web Guidance 實測：讓 coding agent 跟上網頁新寫法"
description: "Modern Web Guidance 1.0.1 實測：安裝 agent skill，用 legacy-scan 掃出舊網頁寫法，交給 Claude Code 和 Codex 依指南修改，再用 Chrome 比對改前改後，附沙箱裡遇到的問題。"
date: 2026-11-19 17:00:00 +0800
categories: [AI, skills]
tags: [modern-web-guidance, agent-skills, coding-agent, claude-code, codex, web-platform, sandbox]
media_subpath: /assets/img/posts/modern-web-guidance-coding-agent/
image:
  path: cover.webp
  alt: "手繪筆記風插圖：小機器人拿放大鏡檢查舊網頁表單，箭頭指向打勾的新表單，旁邊寫著 legacy-scan 掃出舊寫法、agent 依指南改完、重掃歸零。"
---

Modern Web Guidance 的 SKILL.md 開頭寫，模型訓練資料裡有過時的寫法（training weights contain obsolete patterns）。像是用 JavaScript 量 `scrollHeight` 讓輸入框長高，或自己判斷點擊位置來關掉對話框，現在都有瀏覽器內建的寫法。

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) 是一套給 coding agent 用的 skill 和命令列工具。依 [GitHub README](https://github.com/GoogleChrome/modern-web-guidance)，它由 Google Chrome、Microsoft Edge、Mozilla Firefox 和 MDN 團隊與社群共同維護。agent 寫網頁前先用它查指南，指南會告訴 agent 現在該用哪個 HTML、CSS 或 JavaScript 功能、瀏覽器支援到哪裡、不支援時改用什麼寫法。它另外有一個 `legacy-scan` 指令，可以掃出現有專案裡該換掉的舊寫法。

這篇我在開了沙箱的 Claude Code 裡實際安裝它。我寫了一個留言板範例頁，先用 `legacy-scan` 掃，再交給 Claude Code 依指南修改，最後用瀏覽器比對改前改後。過程中卡在沙箱的地方，我也一併寫出來。

> 我對照的官方資料是 [Modern Web Guidance 文件](https://developer.chrome.com/docs/modern-web-guidance)、[1.0 發布文章](https://developer.chrome.com/blog/modern-web-guidance-v1)（2026-11-10 發布）、[Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow)，以及 npm 套件 1.0.1 裡的 README 與 SKILL.md，讀取日期是 2026-11-19。實測在同一天（台北時間）進行，環境是 macOS、Node.js 25.2.1、npm 11.6.2、Claude Code 2.1.328（模型 `claude-opus-5-5`），Claude Code 的沙箱是開著的。modern-web-guidance 用 1.0.1，這是當天 npm 上標為 latest 的版本；安裝時被帶進來的 `skills` 是 1.9.0。文中的終端機截圖是把錄下的輸出排成圖片，只拿掉了顏色控制碼、spinner 動畫的中間影格，以及我錄製時自己加的結束碼標記。改版時我在第二台電腦用同樣的指令重跑，`search`、`retrieve`、`skills-lock.json` 和兩次 `legacy-scan` 的輸出都和第一次相同，圖片用的是重跑的輸出；`install` 那張因為偵測到的 agent 名稱不同，保留第一次的輸出。
{: .prompt-info }

## 它怎麼運作

Modern Web Guidance 分成兩部分：

- skill 是一份 SKILL.md，加上 `guides/` 資料夾裡的指南。我裝進專案後數了一下，`guides/` 底下有 210 份 Markdown。
- CLI 是 npm 套件 `modern-web-guidance`。agent 依 SKILL.md 的指示執行 `npx -y modern-web-guidance@latest search "<查詢>"` 找出相關指南的 ID，再用 `retrieve <ID>` 把整份指南讀進上下文。

agent 什麼時候會用它，要看 SKILL.md 的 description。這段寫明所有 HTML、CSS 與前端 JavaScript 工作都要先執行它（MANDATORY: Execute FIRST），後面還列了一長串觸發主題，例如對話框、表格、深色模式、表單驗證、Core Web Vitals。description 怎麼影響觸發，我在〈[自己寫 Agent Skill](/posts/agent-skill-authoring-guide/)〉寫過。

依 README 的 How It Works，`search` 用的是本機的嵌入模型和 BM25 比對，不呼叫外部 API，也不需要 API key。

依 Modernization workflow 文件，`legacy-scan` 在本機用固定規則掃描專案，不呼叫任何模型。它只涵蓋能用靜態規則判斷的指南，我這次的掃描結果寫的是 38 份，約占全部指南的 20%。掃出來的結果還要由 agent 依每條規則附的保留條件（Keep when）與排除條件（Drop when）判斷是不是誤判。1.0 發布文章也寫明它沒有 `--fix` 參數，它只負責找，修改交給 agent。

文件首頁寫，公開評測中有指南時的通過率是 91%，沒有指南的前沿模型約 51%。README 另有一張逐次結果表，其中 11 月 8 日的 `claude_code (opus-5-5)` 一列是 57% → 88%。這些數字都來自官方頁面（2026-11-19 讀取），不是我測出來的。我自己只跑了下面這一個範例。

## 準備：在沙箱裡跑 npx

我的 Claude Code 開著沙箱，指令只能寫入專案資料夾和 `$TMPDIR`，沙箱的設定方式可以參考〈[Claude Code 沙箱設定教學](/posts/claude-code-sandbox-setup/)〉。我第一次在沙箱裡跑 `npm view modern-web-guidance`，npm 就回了 `EPERM`，並提示「Your cache folder contains root-owned files」，要我用 `sudo chown` 修 `~/.npm`。但問題不在檔案擁有者，是沙箱不讓 npm 寫 `~/.npm` 的快取。我把快取改到 `$TMPDIR` 底下，後面的 npx 就都能跑了：

```bash
export npm_config_cache="$TMPDIR/npm-cache"
export DISABLE_TELEMETRY=1
```

第二行是關掉使用紀錄。我讀了 CLI 的原始碼，`search`、`retrieve`、`legacy-scan`、`install` 這些指令執行時，會在背景開一個獨立的子行程，把使用紀錄送到 `play.googleapis.com`。依 README 的 Telemetry & Privacy 段落，收集的內容包含安裝次數、呼叫它的 agent 名稱、取回的指南 ID，以及 agent 產生的搜尋字詞，不包含使用者原本的提示。設定 `DISABLE_TELEMETRY=1` 就不會送。所以搜尋本身雖然在本機比對，搜尋字詞預設還是會送出去。

安裝前，我先用 `npm pack modern-web-guidance@1.0.1` 把套件下載下來看，作法和〈[Claude Code plugin 安全安裝](/posts/claude-code-plugin-safe-install/)〉一樣。1.0.1 的 `package.json` 沒有 `scripts`，所以安裝時不會跑安裝腳本。套件共 281 個檔案，解開後 17 MB，其中搜尋用的向量資料約 8.8 MB，打包成單一檔案的 `legacy-scan.mjs` 約 4.9 MB，指南約 1.9 MB。`install` 子指令只執行下面這行：

```bash
npx -y skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance
```

`skills` 是 Vercel 的 skill 安裝工具，這裡沒有指定版本，會抓當下 npm 上的最新版（我那次是 1.9.0）。它會從 GitHub 上的 `GoogleChrome/modern-web-guidance` 抓 skill，不是從我剛用 `npm pack` 下載的套件裡複製。

## 步驟一：先不安裝，試 search 和 retrieve

不安裝也能直接用 CLI。官方文件的範例是 `@latest`，我改成固定 `@1.0.1`，讓輸出可以重現：

```bash
npx -y modern-web-guidance@1.0.1 search "submit on enter key"
npx -y modern-web-guidance@1.0.1 retrieve ime-safe-enter-submit | head -n 12
```

![終端機實際輸出：search "submit on enter key" 回傳 10 筆 id 與 description，第一筆是 ime-safe-enter-submit；retrieve ime-safe-enter-submit 印出指南開頭，說明使用輸入法的使用者按 Enter 是在確認候選字](term-search.webp){: w="1100" h="1199" }
_search 回傳 JSON，retrieve 印出指南全文，這裡只截前 12 行（實際輸出）_

`search` 回傳 10 筆結果，每筆有 `id` 和 `description`。第一筆 `ime-safe-enter-submit` 就是我要找的。SKILL.md 對 agent 的搜尋寫法有規定：描述使用者看得到的功能，例如 `"light dismiss dialog"`；不要加 React、Tailwind 這類框架名稱，也不要加專案裡的元件或檔案名稱；一次只查一個功能。

`retrieve` 印出的是整份指南。這份是 115 行的 Markdown，裡面有問題說明、建議寫法、無障礙注意事項和瀏覽器支援資料。指南寫到，中文、日文、韓文使用者用輸入法打字時，按 Enter 是在確認候選字。如果程式在 `keydown` 看到 Enter 就送出，使用者還沒選完字，訊息就送出去了。指南建議的寫法是先檢查 `event.isComposing`。Safari 在確認候選字的那次 Enter 會把 `isComposing` 回報成 `false`，所以還要加上 `event.keyCode === 229`。

## 步驟二：安裝到專案

官方文件的安裝指令是在專案資料夾執行 `npx modern-web-guidance@latest install`。我同樣固定版本，並加了兩個參數：

```bash
npx -y modern-web-guidance@1.0.1 install --agent claude-code -y
```

`--agent` 和 `-y` 是 `skills add` 的參數，`install` 會把多出來的參數原樣轉給它。`--agent claude-code` 只裝給 Claude Code，`-y` 跳過確認。

![終端機實際輸出：install 偵測到 claude agent 後以非互動方式安裝，從 GitHub clone 倉庫，找到 2 個 skill，選了 modern-web-guidance，最後複製到 ./.claude/skills/modern-web-guidance](term-install.webp){: w="1100" h="1002" }
_我在 Claude Code 的沙箱裡執行，所以輸出第一行是偵測到 claude agent（實際輸出）_

因為我是在 Claude Code 裡執行，`skills` 偵測到 agent 環境，直接以非互動方式安裝。在一般終端機執行時，它可能會問你要裝給哪些 agent、裝在專案還是全域，這種情況我沒有試。最後一行提醒使用前先檢查 skill：「Review skills before use; they run with full agent permissions.」所以我裝完先看了裝進來的檔案。

專案裡多了兩樣東西：

![終端機實際輸出：skills-lock.json 記錄 source、commit 64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65 與 computedHash；.claude/skills/modern-web-guidance 底下只有 guides 和 SKILL.md；guides 底下有 210 份 Markdown](term-lock.webp){: w="1100" h="608" }

- `.claude/skills/modern-web-guidance/`：只有 `SKILL.md` 和 `guides/`，沒有 CLI 本體。
- `skills-lock.json`：記錄這份 skill 來自 GitHub 的哪個 commit（`64a6d70`）和內容雜湊值。

lock 檔鎖住的是指南的內容，鎖不住 CLI 版本。裝進來的 SKILL.md 叫 agent 執行的是 `npx -y modern-web-guidance@latest`，所以就算你安裝時寫了 `@1.0.1`，agent 每次查詢時跑的還是 npm 上當下的最新版。我比對過，這天裝進來的 SKILL.md 和指南，跟 npm 1.0.1 套件裡的內容完全相同。

依官方文件，也可以用 `npx skills add GoogleChrome/modern-web-guidance` 安裝。Claude Code 使用者還可以先執行 `claude plugin marketplace add GoogleChrome/modern-web-guidance`，再執行 `claude plugin install modern-web-guidance@googlechrome`，以 plugin 安裝。這兩種我沒有試。README 另外提醒，以前從 `claude-plugins-official` 裝的版本自 10 月 12 日起停在 `v0.0.194`，要移除後改從 `googlechrome` marketplace 重新安裝。README 也列了 GitHub Copilot CLI、OpenAI Codex 等其他 agent 的安裝方式，我只測了 Claude Code。

指南會依 Baseline 判斷一個功能能不能直接用。依官方的 [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) 文件，沒有指定時預設目標是 Baseline Widely available；要改的話，在 `AGENTS.md` 或 `CLAUDE.md` 寫一句像「This project's Baseline target is Baseline 2024.」這樣的說明。這次我沒有設，用的是預設值。

## 步驟三：準備一個有舊寫法的留言板

這個範例頁是我照 `legacy-scan` 的規則清單寫的，裡面的舊寫法都是故意放的。它是一個留言板，按 Enter 送出留言，Shift+Enter 換行，還有一個「Clear all」按鈕會跳出確認對話框。我放了五種舊寫法：

1. `keydown` 看到 Enter 就送出，沒有檢查輸入法是否正在選字。
2. 用 JavaScript 量 `scrollHeight`，讓輸入框跟著內容長高。
3. 用 `textarea:invalid` 顯示錯誤樣式。
4. 對話框靠 `e.target === confirmDialog` 判斷有沒有點到背景，再自己關掉。
5. 用 `list.innerHTML = ''` 清空留言。

三個檔案放在 `site/` 資料夾。要照著做的話，請原樣存檔，下一步掃描結果的行號才會和我的一樣：

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

我把整個資料夾用 git commit 起來，之後才看得到 agent 改了什麼。

## 步驟四：用 legacy-scan 掃一次

在專案根目錄執行：

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![終端機實際輸出：legacy-scan 找到 5 份指南共 6 個項目，分別是 dialog 的 app.js:41、form-fields-automatically-fit-contents 的 app.js:13 與 app.js:19、ime-safe-enter-submit 的 app.js:25、js 的 app.js:46、validate-input-after-interaction 的 style.css:7，每項都附 Keep when 與 Drop when](term-scan-before.webp){: w="1100" h="1667" }
_五種舊寫法全被找到，自動長高的那段算成兩個項目（實際輸出）_

結果是 5 份指南、6 個項目。自動長高那段被算了兩次：一次是第 19 行量 `scrollHeight` 的地方，一次是第 13 行在 `post()` 裡呼叫 `autosize()`。每個項目都附上規則說明、Keep when 和 Drop when。輸出開頭也寫明，靜態分析的結果只是初步判斷，要用這些條件再確認一次。

這一步不會改任何檔案。輸出的最後一行提示可以用 `retrieve <guide-id>` 讀對應的指南。

## 步驟五：交給 Claude Code 修改

我讓 Claude Code 以非互動模式（`-p`）執行，這樣整個過程可以錄成 JSON 事後檢查。提示用的是 1.0 發布文章裡的寫法 `/modern-web-guidance Modernize the code in this directory`，也就是直接叫用這個 skill，所以這次沒有測到 agent 會不會自己判斷要用它。

```bash
claude -p "/modern-web-guidance Modernize the code in this directory" \
  --setting-sources project \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" \
    "Bash(npx -y modern-web-guidance@latest *)" \
    "Bash(pnpx modern-web-guidance@latest *)" \
  --output-format stream-json --verbose --no-session-persistence > run1.jsonl
```

幾個參數的用意：

- `--setting-sources project` 只讀專案的設定，不載入我自己的使用者設定和 plugin。執行紀錄的 init 事件顯示，載入的 skill 除了 Claude Code 內建的那些，只有 modern-web-guidance。
- `--permission-mode acceptEdits` 讓它可以直接改檔。
- `--allowedTools` 只放行讀檔、改檔，以及 SKILL.md 自己建議放行的 `npx -y modern-web-guidance@latest *`。我的電腦有裝 pnpm，SKILL.md 說有 pnpm 時會優先用 `pnpx`，所以 `pnpx` 也一起放行。為此我還多設了兩個 pnpm 的快取變數，兩次執行 agent 都沒有用到 `pnpx`，這裡就省略了。

我是在外層 Claude Code 的沙箱 shell 裡先設好 `npm_config_cache` 和 `DISABLE_TELEMETRY`，再啟動 `claude -p`，所以 agent 跑的指令會帶著這兩個環境變數，也受同一個沙箱限制。demo 專案沒有自己的沙箱設定，`--setting-sources project` 也不會讀我的使用者設定。從一般終端機執行同樣的指令，應該不會遇到後面 `/tmp/npm-cache` 的權限錯誤，這個我沒有試。

### 第一次：掃描指令被擋下

agent 一開始就要跑掃描，但它在指令前面加了 `NPM_CONFIG_CACHE=/tmp/npm-cache`：

```text
NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest legacy-scan . --json
→ This command requires approval
```

這個前綴來自 SKILL.md，它點名 Codex、Claude Code 這類有沙箱的環境，說 `~/.npm` 不能寫時就設 `NPM_CONFIG_CACHE=/tmp/npm-cache`。但指令前面多了環境變數，就對不上 SKILL.md 建議的放行規則 `npx -y modern-web-guidance@latest *`。非互動模式不會跳出詢問，所以直接被擋掉。

掃描跑不了，agent 改讀 `.claude/skills/modern-web-guidance/guides/` 裡的指南，自己讀程式碼找出問題並修改。整輪 73 秒、18 個回合，執行紀錄裡的 `total_cost_usd` 是 0.62 美元。它回報的開頭就寫，掃描和語法檢查都因為沒有放行而沒跑，所以改完也沒有重掃確認；它也說自己沒有在瀏覽器打開過頁面。

它還照 `declarative-dialog-popover-control` 指南，把「Clear all」改成 HTML 的 `commandfor` 與 `command="show-modal"`。不支援的瀏覽器要另外載 polyfill，它照指南的 CDN 範例寫了這段，也把 `<script>` 改成 `type="module"`：

```javascript
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  import('https://esm.run/invokers-polyfill');
}
```

這個網址沒有指定版本，不支援 `command` 的瀏覽器會在執行時載入 `invokers-polyfill` 當下的最新版。指南寫的是，有 bundler 或 import map 的專案用 `npm install invokers-polyfill`，其他情況用 CDN。我的範例沒有 bundler，所以 agent 照著選了 CDN。它在回報裡把這點列為「One decision for you」，說也可以改成兩行的 fallback，不載外部程式碼。如果你的專案不允許在執行時從 CDN 載入程式碼，就要在 `CLAUDE.md` 或 `AGENTS.md` 寫清楚，寫法可以參考〈[AGENTS.md 怎麼寫](/posts/agents-md-project-rules-for-coding-agents/)〉。

### 第二次：放行規則對上了，換快取路徑寫不進去

我把頁面還原，提示完全不變，只在 `--allowedTools` 多加一條規則：

```bash
"Bash(NPM_CONFIG_CACHE=/tmp/npm-cache npx -y modern-web-guidance@latest *)"
```

這次指令有執行，但 npm 失敗了：

```text
npm error code EPERM
npm error syscall mkdir
npm error path /tmp/npm-cache
...
npm error Your cache folder contains root-owned files, due to a bug in
```

原因是我的沙箱只允許寫入 `$TMPDIR`（`/tmp/claude-501`），不包含 `/tmp/npm-cache`。agent 接著改試 `NPM_CONFIG_CACHE=$TMPDIR/npm-cache`，Claude Code 回「A variable in this command can't be checked before it runs」，因為放行規則沒辦法事先確認變數展開後的指令。它再試了寫死路徑的版本，同樣不符合放行規則。最後它拿掉前綴，執行 `npx -y modern-web-guidance@latest legacy-scan site --json`。這次成功了，因為環境裡本來就有我設的 `npm_config_cache`。

掃描成功之後，agent 照 Modernization workflow 的流程做了這幾件事：

1. 掃到 6 個項目，逐一對照 Keep when 和 Drop when，結論是 6 個都保留。
2. 用 `retrieve` 一次取回 `dialog`、`form-fields-automatically-fit-contents`、`ime-safe-enter-submit`、`validate-input-after-interaction` 四份指南，接著再取回 `validate-input-after-interaction` 和 `js`。
3. 改寫三個檔案。
4. 重跑 `legacy-scan site --json`，`totalFindings` 是 0。

整輪 90 秒、17 個回合，`total_cost_usd` 是 0.59 美元。這次被擋的 4 個指令裡，3 個是快取路徑的嘗試，另一個是把 `node --check site/app.js` 和重掃串在一起的指令，因為 `node --check` 不在放行清單裡。最後它拆開來只跑重掃。

Enter 送出的部分改成這樣：

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

其他幾處：

- 自動長高的 JavaScript 刪掉，改用 CSS `field-sizing: content`，並用 `max-block-size: 12lh` 限制最高 12 行。不支援 `field-sizing` 的瀏覽器裡，輸入框會停在一行高、內容多了就捲動。agent 在回報裡說明，指南建議接受這個結果，不另外寫更複雜的替代方案。
- 輸入框是空的時候按 Enter，現在會跳出瀏覽器內建的必填提示，和按 Post 一樣。改前的版本是什麼都不做。
- `textarea:invalid` 改成 `textarea:user-invalid`，多了一段錯誤訊息，並同步 `aria-invalid`。
- 對話框加上 `closedby="any"`。Safari 不支援這個屬性，所以保留一段 fallback，只在不支援時才掛上，改用游標座標判斷有沒有點在對話框外面。
- `list.innerHTML = ''` 改成 `list.replaceChildren()`。

這次它沒有改「Clear all」的寫法，也沒有加 CDN polyfill。同一句提示跑兩次，寫出來的程式碼不一樣，所以 agent 改完還是要看 diff。

SKILL.md 要求 agent 用到指南時，在回報最後加一段 `### Modern Web Guidance`，逐項列出用了哪份指南、引用了指南裡的哪句話。兩次執行都有這一段，對照 diff 時很好用。

最後我自己在專案根目錄重跑一次掃描：

```bash
npx -y modern-web-guidance@1.0.1 legacy-scan .
```

![終端機實際輸出：legacy-scan 回報 0 findings from 38 qualified guides，並提醒只涵蓋約 20% 的指南](term-scan-after.webp){: w="1100" h="287" }
_改完後重掃是 0 個項目（實際輸出）_

輸出同時提醒，`legacy-scan` 只涵蓋 38 份指南。0 個項目只表示這 38 份指南的規則沒有再找到問題，其他指南涵蓋的寫法它不會檢查。

## 步驟六：在瀏覽器裡比對

`legacy-scan` 只看程式碼，所以我另外用瀏覽器確認頁面行為。Chrome 在我的沙箱裡無法啟動，headless Chrome 會因為 macOS 的 mach port 權限被拒而直接結束。所以這一步我改在沙箱外跑，只開本機的檔案，Chrome profile 也是用完就丟的。我寫了一個不需要安裝套件的 Node.js 小腳本，透過 Chrome DevTools Protocol 操作 headless Chrome 157，對改前和改後的頁面各做同樣的操作再截圖。

第一組是剛打開頁面的樣子：

![留言板改前改後並排。左邊是改前，輸入框還沒輸入任何東西就是紅框紅底；右邊是改後，輸入框是一般的灰色邊框](pair-load.webp){: w="2584" h="840" }
_左：改前，一打開就顯示錯誤樣式。右：改後，一般樣式。_

改前的輸入框有 `required`，內容是空的，所以一載入就符合 `:invalid`，使用者還沒打字就看到紅框。改成 `:user-invalid` 之後，要等使用者操作過或按了送出，才會顯示錯誤樣式。我在改後的頁面直接按 Post，紅框和錯誤訊息就出現了：

![改後的留言板在空白狀態按下 Post，輸入框變成紅框，下方出現 Enter a message before posting. 的錯誤訊息](page-empty-submit.webp){: w="1280" h="840" }

第二組是輸入法。我用 DevTools Protocol 模擬中文輸入法正在選字的狀態，讓輸入框裡有一段還沒確認的「你好」，再送出一次 Enter。下面是腳本裡的這兩步，後面還有放開 Enter 和確認文字的事件，這裡省略：

```javascript
await send('Input.imeSetComposition', { text: '你好', selectionStart: 2, selectionEnd: 2 });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
```

我另外在輸入框掛了一個只記錄、不攔截的 `keydown` 監聽。兩個版本收到的事件都是 `key: "Enter"`、`keyCode: 229`、`isComposing: true`。

![留言板改前改後並排。左邊是改前，輸入框裡的你好還在選字，下方留言列表已經多了一則你好；右邊是改後，輸入框裡有你好，列表是空的](pair-ime.webp){: w="2584" h="840" }
_左：改前，選字用的 Enter 把「你好」送出了。右：改後，沒有送出。_

改前的版本把還在選字的「你好」當成留言送出。改後的版本看到 `isComposing` 是 `true` 就不送出，留言列表是空的。

這個測試是模擬出來的，我沒有用 macOS 的注音或拼音輸入法實際打字，也沒有在 Safari 和 Firefox 上測。對話框的 `closedby="any"` 與 Safari 的 fallback，我也沒有實測。

## 我在沙箱裡遇到的問題

1. 沙箱不讓 npm 寫 `~/.npm`，npm 卻回報成「root-owned files」，叫你用 `sudo chown`。不要照做，把 `npm_config_cache` 指到沙箱能寫的地方就好。我的作法是在啟動 `claude -p` 之前，在同一個 shell 先 `export npm_config_cache="$TMPDIR/npm-cache"`。
2. SKILL.md 叫 agent 在指令前加 `NPM_CONFIG_CACHE=/tmp/npm-cache`。在我的沙箱裡 `/tmp/npm-cache` 不能寫；而加了前綴的指令，也對不上 SKILL.md 自己建議的放行規則。我這次能跑完，是因為 agent 最後拿掉前綴，而環境裡剛好已經有可寫的快取路徑。
3. Chrome 無法在沙箱裡啟動，所以瀏覽器比對那一步我是在沙箱外跑的。

這兩次我都用非互動模式，被擋的指令會直接失敗。互動模式下應該會改成跳出詢問，這部分我沒有試。

## 換一台電腦、換一個範例再跑一次

上面的留言板是我照 `legacy-scan` 的規則清單寫的，掃得到並不意外。所以我在 2026-11-20（台北時間）換到另一台 Linux 電腦（Debian 13、Node.js 24.22.1、npm 11.21.1、Chrome 156），重新下載 1.0.1，自己寫了一個不同主題的頁面再跑一次。這次的 agent 是 Codex CLI 0.171.0，模型是 `gpt-6.1-sol`，透過我自己架的 LiteLLM 呼叫，沙箱模式是 `workspace-write` 並開放網路。

先說和前面一致的部分：同樣的 `search "submit on enter key"` 回傳同樣 10 筆，`skills-lock.json` 的 commit 和 `computedHash` 相同，裝進來的也是 210 份指南。我把上面留言板的三個檔案原樣存檔再掃，一樣是 5 份指南、6 個項目，行號也相同。

新的範例是一個露營區訂位頁，三個檔案放在 `web/`。我放進去的舊寫法有這些：

- 搜尋框用 `e.keyCode === 13` 判斷 Enter 後搜尋。
- 四個必填欄位用 `input:invalid` 顯示錯誤樣式。
- 確認視窗是自己用 `div` 做的，靠 `e.target === overlay` 判斷點到外面再關掉，沒有用 `<dialog>`。
- 勾選「租帳篷」時，用 JavaScript 幫外層加 class 改底色。
- FAQ 展開用 `max-height: 9999px`。
- 從 jsDelivr 載入 dayjs，沒有 `integrity`。
- 兩段重複的 `@media (prefers-color-scheme: dark)`。
- 用 `results.innerHTML = ''` 清空搜尋結果。

`legacy-scan` 找到 5 份指南、5 個項目：

![終端機實際輸出：legacy-scan 在露營區範例找到 5 份指南共 5 個項目，分別是 animate-to-intrinsic-sizes 的 style.css:11、dark-mode 的 style.css:18、js 的 app.js:9、secure-external-subresources 的 index.html:8、validate-input-after-interaction 的 style.css:6](term-campsite-scan.webp){: w="1100" h="1593" }
_第二台電腦、自己寫的範例（實際輸出）_

沒掃到的有三個：`div` 做的確認視窗、勾選方塊的 class 切換，以及 `keyCode === 13` 的搜尋框。dialog 規則看的是掛在 `<dialog>` 上的 click 監聽，所以自己用 `div` 做的視窗不在範圍內。`keyCode === 13` 則不算漏掉。ime-safe-enter-submit 指南寫到，輸入法選字時按 Enter，瀏覽器回報的 `keyCode` 是 229 而不是 13，所以舊的 `keyCode === 13` 寫法本來就不會在選字時觸發。會出問題的，是把它改成 `e.key === 'Enter'` 卻沒有加上檢查。

我用和前面一樣的提示交給 Codex：`$modern-web-guidance Modernize the code in this directory`（`$` 是 Codex 指定 skill 的寫法）。過程如下：

- 它照 SKILL.md 在指令前加了 `NPM_CONFIG_CACHE=/tmp/npm-cache`。Codex 的 `workspace-write` 沙箱預設可以寫 `/tmp`，所以掃描、`retrieve`、重掃都直接成功，沒有遇到前面 Claude Code 沙箱的快取問題。
- 它用一次 `retrieve` 取回 5 份指南。內容有 84.4 KB，CLI 沒有直接印出，而是存成 `/tmp/mwg-guide-….md`，要 agent 再分段讀檔。
- 5 個項目全部修改，重掃是 0。我自己在專案根目錄用 1.0.1 重掃也是 0。
- 它另外把搜尋框改成 `e.key === 'Enter' && !e.isComposing`。這段不在掃描結果裡，它也沒有取回 ime-safe-enter-submit 指南。照指南的說法，這樣改少了 `e.keyCode === 229`，在 Safari 確認候選字的那次 Enter 可能會送出。我手邊沒有 Safari 可以驗證，這點是從 diff 和指南看出來的。
- 為了自己檢查，它用 npm 把 jsdom 裝到 `/tmp` 跑 DOM 測試，也用 curl 下載 CDN 上的檔案比對雜湊值。開放網路時，agent 會做這類額外下載。
- 整輪 119 秒。執行紀錄裡的 token 用量是輸入 525,856（其中 434,990 命中快取）、輸出 4,418。

瀏覽器的部分，我同樣用 DevTools Protocol 操作 headless Chrome 156，模擬輸入法正在選「溪邊」時按 Enter。除了改前（A）和 Codex 改後（B），我另外做了一個對照組（C），只把 A 的條件改成 `e.key === 'Enter'`：

![露營區範例三個版本並排，都在輸入法選字中按了 Enter。A 是 keyCode === 13，搜尋結果 0 筆，必填欄位一載入就是紅框；B 是 Codex 改後的版本，結果 0 筆，欄位是一般樣式；C 是對照組 e.key === 'Enter'，選字中就搜尋出溪邊 A1 riverside，欄位也是紅框](trio-campsite-ime.webp){: w="1954" h="696" }
_A：原本的 keyCode === 13。B：Codex 改後。C：對照組，只改成 e.key === 'Enter'。_

- 三個版本收到的事件都是 `key: "Enter"`、`keyCode: 229`、`isComposing: true`。
- A 和 B 都沒有搜尋，C 在選字時就搜尋了。
- 剛載入時，A 和 C 的四個必填欄位都是紅框，B 是一般樣式。在 B 直接按 Book，欄位才變成紅框並出現錯誤訊息，`aria-invalid` 也變成 `true`。

還有一點要注意：`legacy-scan` 預設會跳過看起來像文件、範例或測試的資料夾，例如 `docs/`、`examples/`、`demo/`、`test/`。我把同一個範例放在 `demo/` 底下掃，結果是 0，最後一行寫著 `Skipped 3 docs and test files`，加上 `--include-docs-and-tests` 才掃到 5 個項目。照著做時如果把範例放在 `demo/`，記得加這個參數，或換一個資料夾名稱。

![終端機實際輸出：範例放在 demo 資料夾時 legacy-scan 回報 0 findings 並寫著 Skipped 3 docs and test files，加上 --include-docs-and-tests 後找到 5 個項目](term-demo-skip.webp){: w="1100" h="460" }

最後我也確認了使用紀錄。我在不能連網的環境裡，不設 `DISABLE_TELEMETRY` 跑一次 `search "booking date picker"`，並把送出用的 `fetch` 換成只記錄、不送出。背景子行程準備 POST 到 `play.googleapis.com` 的內容，包含這句搜尋字詞，以及找到的指南 ID 和相似度分數。設了 `DISABLE_TELEMETRY=1` 再跑，就沒有這個請求。

## 搭配瀏覽器檢查

依 1.0 發布文章，官方建議搭配 Chrome DevTools for agents，讓 agent 看得到頁面在瀏覽器裡實際執行的狀況。DevTools for agents 我還沒有試。

這次我用的是自己寫的 DevTools Protocol 小腳本。如果要讓 agent 自己打開頁面檢查，可以參考我寫的〈[agent-browser 入門：讓 AI 自己打開瀏覽器檢查成果](/posts/agent-browser-ai-test-web-pages/)〉。合併前先確認能用的流程，我在〈[pstack 系列（3）：寫完程式之後，先證明它能用再合併](/posts/pstack-build-verify-merge/)〉寫過。

## 結論

這次實跑，`legacy-scan` 在本機找出我放進去的 5 種舊寫法，共 6 個項目。Claude Code 依指南修改後重掃是 0。瀏覽器裡也看得到差別：空白輸入框不再一打開就是紅框，輸入法選字時按 Enter 也不會送出。換一台電腦、用自己寫的露營區範例交給 Codex，掃描和重掃的結果一樣可以重現，但 agent 也會改到掃描範圍以外的地方，而且不一定照指南改完整。

沙箱裡最麻煩的是 npm 快取。另外，裝進來的 skill 永遠叫 agent 跑 `@latest`，安裝時固定的版本只管得到指南內容，管不到 CLI。

我建議照這個順序開始：

1. 先不安裝，用 `npx modern-web-guidance@<版本> legacy-scan .` 掃自己的專案，看它找到什麼。程式碼放在 `demo/`、`examples/` 這類資料夾時，記得加 `--include-docs-and-tests`。
2. 決定要不要送使用紀錄，不送就設 `DISABLE_TELEMETRY=1`。
3. 安裝到專案後，打開 `.claude/skills/modern-web-guidance/SKILL.md` 讀一遍，並把 `skills-lock.json` 一起 commit。
4. 如果開著沙箱，先處理 npm 快取路徑，再交給 agent。
5. agent 改完後，看 diff，特別是掃描結果以外的修改，並在瀏覽器裡實際操作一次。

## 延伸閱讀

- [Modern Web Guidance 官方文件](https://developer.chrome.com/docs/modern-web-guidance)，有安裝方式、範例提示和 Baseline 目標的設定方式。
- [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow) 說明 `legacy-scan` 搭配 agent 修改的四步流程。
- 〈[自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護](/posts/agent-skill-authoring-guide/)〉說明 SKILL.md 的 description 怎麼影響觸發。
- 〈[Claude Code plugin 安全安裝：裝之前先看哪些檔案](/posts/claude-code-plugin-safe-install/)〉說明安裝 skill 或 plugin 前要看哪些檔案。
- 〈[Claude Code 沙箱設定教學：擋住 SSH 金鑰與 token](/posts/claude-code-sandbox-setup/)〉說明這次用的沙箱怎麼開。
