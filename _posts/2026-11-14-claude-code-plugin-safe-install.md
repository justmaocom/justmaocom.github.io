---
title: "裝 Claude Code plugin 之前先看什麼：從官方目錄學會安全安裝"
description: "一個 Claude Code plugin 可能同時帶進 skill、hook 和 MCP server，有些會在你沒下指令時自己執行程式。這篇從官方目錄找 plugin 開始，教你安裝前要打開哪些檔案、怎麼選安裝範圍，以及裝了之後怎麼停用與移除。"
date: 2026-11-14 21:00:00 +0800
categories: [資訊安全, 供應鏈]
tags: [claude-code, claude-code-plugins, coding-agent, supply-chain-security, mcp]
media_subpath: /assets/img/posts/claude-code-plugin-safe-install/
image:
  path: cover.webp
  alt: "裝 Claude Code plugin 之前，先打開 hooks.json 與 .mcp.json 這些會自動執行程式的檔案。"
---

Claude Code（在終端機裡使用的 AI 程式助理）可以安裝 plugin。一個 plugin 是一整包擴充功能，裝一次就會把好幾樣東西一起放進 Claude Code：教 Claude 做事的 skill、自訂的斜線指令、在固定時機自動執行的 hook，以及連到外部服務的 MCP server。

方便在這裡，要小心的地方也在這裡。其中有幾樣東西會在你沒下任何指令的時候自己執行程式，用的還是你的帳號權限。官方在安裝前會顯示這段提醒（中譯）：

> Plugin 可以在你的電腦上執行程式，並存取你的檔案與 shell。安裝、更新或使用 plugin 之前，請確認你信任它。Anthropic 無法控制 plugin 內含哪些 MCP server、檔案或其他軟體，也無法驗證它們會如預期運作，或日後不會改變。詳情請見各 plugin 的首頁。

問題是，「確認你信任它」要怎麼確認？這篇不推薦任何 plugin，只整理一套安裝前後的檢查方法：從官方目錄怎麼找、裝之前要打開哪幾個檔案、選哪個安裝範圍，以及裝了之後怎麼停用和移除。

> **版本說明**：本文依 2026-11-14（台北時間）讀取的官方資料撰寫：[安裝與管理 plugin](https://code.claude.com/docs/en/discover-plugins)、[plugin 總覽](https://code.claude.com/docs/en/plugins)、[plugin 參考手冊](https://code.claude.com/docs/en/plugins-reference)、[plugin 安全說明](https://code.claude.com/docs/en/plugins/security)、[組織管理](https://code.claude.com/docs/en/plugins/org)、[市集參考手冊](https://code.claude.com/docs/en/plugins/marketplace-reference)，以及 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) 的 README 與市集清單。文中的終端機指令對照過 Claude Code 2.1.325 的 `--help`，本文沒有實際安裝任何 plugin。指令與介面會隨版本改變，請以你安裝的版本為準。
{: .prompt-info }

為什麼第三方擴充會帶來風險，在〈[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)〉談過，這裡不再重講。這篇只處理 plugin 的具體檢查步驟。

## 先認識幾個名詞

- **plugin**：一包 Claude Code 擴充功能，可能同時含有下面幾種東西。完整名稱寫成「plugin 名稱@市集名稱」。
- **市集（marketplace）**：plugin 的目錄。Claude Code 要先認識一個市集，才能從裡面安裝 plugin。Anthropic 的官方市集叫 `claude-plugins-official`，你第一次開啟 Claude Code 的互動畫面時，它會自動加入。
- **skill**：一份寫給 Claude 看的操作說明（`SKILL.md`），Claude 遇到相關工作時會照著做。
- **斜線指令**：在 Claude Code 輸入框以 `/` 開頭的指令，例如 `/plugin`。
- **hook**：在固定時機自動執行的 shell 指令，例如 Claude 每次改完檔案就自動排版。用法見〈[Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)〉。
- **MCP server**：讓 Claude 連到外部工具或服務的小程式，例如資料庫、GitHub 或文件搜尋。它可能是一支在你電腦上啟動的程式，也可能只是一個網址。
- **shell**：終端機裡負責執行指令的程式。能下 shell 指令，就幾乎能做你在終端機做得到的任何事。

## 一個 plugin 會帶進哪些東西

plugin 是一個資料夾，裡面的檔案依用途放在固定位置。依官方的參考手冊與安全說明，這些檔案可以分成兩類：只給 Claude 讀的文字，以及會執行程式的部分。

| 位置 | 是什麼 | 會自己執行程式嗎 |
| --- | --- | --- |
| `.claude-plugin/plugin.json` | plugin 的名片：名稱、版本、作者、首頁、授權 | 不會 |
| `skills/`、`commands/`、`agents/` | 寫給 Claude 的說明（Markdown 檔） | 不會，但會影響 Claude 接下來怎麼做 |
| `hooks/hooks.json` | 在固定時機執行的 shell 指令 | **會**，時機一到就執行 |
| `monitors/monitors.json` | 在背景持續執行的指令 | **會** |
| `.mcp.json` | MCP server 設定：要啟動哪支程式，或要連到哪個網址 | **會**，本機的 server 由 Claude Code 啟動 |
| `.lsp.json` | 語言伺服器（提供程式碼跳轉、錯誤提示的背景程式） | **會** |
| `bin/` | 可執行檔，plugin 啟用期間 Claude 可以直接呼叫 | Claude 呼叫時才執行，會經過權限規則 |

最需要記住的一句話出自官方安全說明：Claude Code 的權限規則和沙箱，管的是 Claude 自己發出的工具呼叫，不管 plugin 自己執行的程式。hook、monitor、MCP server 和 LSP server 都在沙箱外、以你完整的使用者權限執行。就算你照〈[Claude Code 沙箱設定教學：擋住 SSH 金鑰與 token](/posts/claude-code-sandbox-setup/)〉開了 `/sandbox`，plugin 的 hook 還是在沙箱外面跑。

另外，`plugin.json` 不是必要的檔案。官方說它可以省略，就算有，也只有 `name` 一定要填。作者、首頁、授權這些欄位都可能是空的。

![一個 plugin 裡的檔案分兩類：skills、commands、agents 只給 Claude 讀；hooks、monitors、.mcp.json、.lsp.json 會在沙箱外執行程式](plugin-anatomy.webp){: w="1600" h="900" }
_概念圖：左邊是給 Claude 讀的文字，右邊是會執行程式的部分。安裝前要逐一打開右邊的檔案。_

## 官方目錄裡的「官方」指的是什麼

官方 plugin 目錄是 GitHub 上的 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)。這個 repo 同時是兩樣東西：一個存放 plugin 的地方，以及 `claude-plugins-official` 市集的清單檔 `.claude-plugin/marketplace.json`。

repo 裡有兩個放 plugin 的資料夾，README 這樣說明：

- **`/plugins`**：Anthropic 自己開發與維護的 plugin。每次有人提出修改，這裡的每個資料夾都會被檢查。
- **`/external_plugins`**：在投稿管道改到 claude.ai/directory/manage 之前加入的第三方 plugin，以及 Anthropic 的頻道類 plugin（Discord、fakechat、iMessage 和 Telegram）。

不過，市集清單裡的 plugin 大多不在這兩個資料夾。我在 2026-11-14 讀取 `marketplace.json` 時，它列了 317 個 plugin，放在這個 repo 裡的只有 55 個（`/plugins` 41 個、`/external_plugins` 14 個）。其餘 262 個裡，261 個指向其他公司或開發者自己的 repo，1 個要在你的電腦上執行指令來取得。README 寫得很直接：這個 repo 的檢查涵蓋放在這裡的 plugin 資料夾，不涵蓋放在其他 repo 的 plugin。

官方文件也提醒，市集的名稱告訴你這份目錄是誰發行的，不代表裡面每個 plugin 做了什麼，所以不論來自哪個市集，安裝前都要檢查。安裝前的那段提醒也不分市集，內容都一樣。

所以，官方目錄能讓你少裝到冒名的假貨，因為清單由 Anthropic 管理；但它不等於「每個 plugin 都通過安全審查」。

### 查出 plugin 實際放在哪裡

在 `marketplace.json` 裡找到 plugin 的條目，看它的 `source` 欄位：

- 寫成 `./plugins/…` 或 `./external_plugins/…`：plugin 就在官方 repo 的這個資料夾。
- 寫成一個物件，`source` 是 `url` 或 `git-subdir`：plugin 在 `url` 指向的另一個 repo。`git-subdir` 另外用 `path` 指出是 repo 裡的哪個資料夾。

條目的結構大致如下（數值是示意）：

```json
{
  "name": "example-plugin",
  "author": { "name": "Example Inc." },
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/claude-plugins.git",
    "path": "plugins/example-plugin",
    "ref": "v1.2.0",
    "sha": "<40 個字元的 commit SHA>"
  },
  "homepage": "https://example.com"
}
```

`sha` 是一個 commit 的編號，代表程式碼在某一次提交時的樣子。依市集參考手冊，條目同時寫了 `ref` 和 `sha` 時，Claude Code 會取出 `sha` 這一版。所以要檢查的是那個 commit 的檔案，不是對方 repo 現在的最新版。在 GitHub 上，可以用 `https://github.com/<帳號>/<repo>/tree/<sha>/<path>` 這種網址打開那一版的資料夾。

## 步驟 1：在 `/plugin` 找到 plugin，先看詳細資訊

在 Claude Code 的輸入框輸入：

```text
/plugin
```
{: .nolineno }

畫面會開在 **Discover** 分頁，列出你已加入的市集裡的 plugin。直接打字可以搜尋，按 Enter 打開詳細資訊。其他分頁是 **Installed**（已安裝）、**Marketplaces**（已加入的市集）和 **Errors**（載入錯誤）。

已經知道名稱的話，也可以直接輸入：

```text
/plugin install <plugin 名稱>@claude-plugins-official
```
{: .nolineno }

在對話裡執行這行不會馬上安裝，而是先打開同一個詳細資訊面板，讓你選好安裝範圍再確認。

詳細資訊面板有一區 **Will install**，列出這個 plugin 會裝進哪些指令、agent、skill、hook，以及 MCP 和 LSP server。先看這裡有沒有 hook、MCP server 或 LSP server。有的話，代表裝了之後會有程式自動執行。

但官方也說明，Will install 只告訴你「有 hook」，不告訴你 hook 會執行什麼。所以下一步要去看原始檔。

## 步驟 2：裝之前，打開這幾個檔案

在詳細資訊面板選 **Open homepage** 或 **View on GitHub** 打開原始碼。兩個選項都沒有的話，回到市集的 repo，用上一節的方法找到 plugin 的資料夾。市集當初是從哪裡加入的，可以在終端機用這行確認：

```bash
claude plugin marketplace list
```
{: .nolineno }

接著依序打開下面這些檔案。檔案不存在，代表這個 plugin 沒有那項功能，跳過即可。

### `.claude-plugin/plugin.json`：誰做的、從哪裡來

看 `author`、`homepage`、`repository` 和 `license`。首頁和 repo 欄位指向的地方，跟你正在看的 repo 是不是同一個？如果名稱很像、帳號卻不一樣，要特別小心。

### `hooks/hooks.json`：什麼時候、自動執行什麼

這是最重要的檔案。每個 hook 要看兩件事：事件名稱（什麼時候執行）和 `command`（執行什麼）。結構大致如下（內容是示意）：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/setup.sh\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/format.sh\"" }
        ]
      }
    ]
  }
}
```
{: file="hooks/hooks.json" }

這樣讀：

- `SessionStart`：每次開啟 Claude Code 就執行 `setup.sh`，不需要你做任何事。
- `PostToolUse` 加上 `"matcher": "Edit|Write"`：Claude 每次用 Edit 或 Write 工具改完檔案，就執行 `format.sh`。
- `${CLAUDE_PLUGIN_ROOT}` 代表 plugin 安裝後所在的資料夾。指令只寫「去執行某支腳本」時，那支腳本也要打開來看，真正做事的是它。

看到下面這些內容，先停下來弄清楚原因：用 `curl`、`wget` 下載東西後直接執行；把檔案內容或環境變數送到外部網址；刪除或修改專案以外的檔案；讀取 `~/.ssh`、`.env` 這類存放金鑰的位置。這些不一定是惡意，有些 hook 本來就會把程式碼片段送到外部服務分析，通常會寫在 README 裡。重點是你知道它會這麼做，而且能接受。

### `.mcp.json`：會啟動哪些程式、連到哪裡

```json
{
  "mcpServers": {
    "example-docs": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    },
    "example-db": {
      "command": "npx",
      "args": ["-y", "@example/db-mcp@1.4.2"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```
{: file=".mcp.json" }

這樣讀：

- 有 `url` 的 server 是連到外部網址。看網域是不是那個服務本身。你在 Claude 裡透過它查詢或傳送的內容，會送到那個網址。
- 有 `command` 的 server 是在你的電腦上啟動程式。`npx -y 套件名稱` 會從 npm 下載並執行那個套件。寫死版本號（例如 `@1.4.2`）比較好；沒寫版本或寫 `@latest`，每次啟動都可能跑到不同的程式。
- `env` 列出它需要哪些環境變數，通常就是 token 或密碼。給它的權限，最好只限於它真正需要的範圍。

### `bin/`、`monitors/` 和 `.lsp.json`

- `bin/` 裡的每個檔案都要看。plugin 啟用期間，這些檔案會被放進 Claude 執行指令時的搜尋路徑（`PATH`），Claude 可以像一般指令一樣直接呼叫它們。
- `monitors/monitors.json` 是在背景執行的指令，讀法跟 hook 一樣，看每一個 `command`。
- `.lsp.json` 會啟動語言伺服器，看它啟動的是哪支程式。

### `skills/`、`commands/`、`agents/`：快速掃過

這些是給 Claude 讀的說明，本身不會執行。但說明可以叫 Claude 去執行指令。快速掃過一遍，留意這幾種段落：要 Claude 下載並執行東西、把資料傳到外部、或要它略過你的規則。這類藏在內容裡的指令，〈[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)〉的「入口一」有詳細說明。

### 用一行指令列出完整內容

自己翻資料夾難免漏看。官方安全說明提供一個方法：把 plugin 所在的 repo clone 下來，切到市集條目寫的 commit，再用 `plugin details` 列出 Claude Code 在這個資料夾裡找到的元件：

```bash
git clone https://github.com/example-org/claude-plugins.git
cd claude-plugins
git checkout <市集條目裡的 sha>
claude --plugin-dir ./plugins/example-plugin plugin details example-plugin
```
{: .nolineno }

它會印出一份 `Component inventory`（元件清單）。拿它對照你剛才看過的檔案，有漏看的就回去補。裝好之後，也可以用 `claude plugin details <plugin 名稱>` 檢查實際安裝的那一份。

### 可複製的檢查清單

下面這份可以直接貼進筆記或團隊文件：

```markdown
## Claude Code plugin 安裝前檢查

- [ ] 從市集條目的 source 與 sha，確認 plugin 實際放在哪個 repo、哪個 commit
- [ ] plugin.json 的作者、首頁、repo，和我正在看的來源一致
- [ ] 詳細資訊面板的 Will install：有沒有 hook、MCP server、LSP server
- [ ] hooks/hooks.json：每個 hook 的觸發時機與 command，以及它呼叫的腳本
- [ ] .mcp.json：每個 server 啟動的程式（版本有沒有寫死）或連線網址，需要哪些環境變數
- [ ] bin/、monitors/、.lsp.json：每個會執行的檔案
- [ ] skills/、commands/、agents/：沒有要 Claude 下載執行、外傳資料或略過規則的內容
- [ ] claude --plugin-dir <資料夾> plugin details <名稱> 列出的元件都看過
- [ ] 決定安裝範圍（local、user 或 project）和要不要自動更新
```

![安裝前的四個步驟：確認來源、看詳細資訊、讀會執行程式的檔案、用 plugin details 列出完整清單，最後從最小範圍安裝](review-steps.webp){: w="1600" h="900" }
_概念圖：四個步驟都在安裝之前完成。第三步只看得到你打開的檔案，第四步用元件清單補上漏看的部分。_

## 步驟 3：選安裝範圍，再確認安裝

在詳細資訊面板按下安裝時，要選安裝範圍（scope）：

| 範圍 | 誰會用到 | 寫進哪個設定檔 |
| --- | --- | --- |
| Local | 只有你，而且只在這個 repo | `.claude/settings.local.json` |
| User | 你自己，這台電腦上的所有專案 | `~/.claude/settings.json` |
| Project | 這個 repo 的所有協作者 | `.claude/settings.json`（會提交進 repo） |

第一次用的 plugin，建議先裝在 Local，只在一個專案裡試用。確定其他專案也要用，再裝到 User。要讓整個團隊一起用，才選 Project，並且走一般的程式碼審查流程，做法見後面的「下一步：把檢查清單放進團隊規則」。

在終端機安裝的寫法如下，不加 `--scope` 時預設是 user：

```bash
claude plugin install <plugin 名稱>@claude-plugins-official --scope local
```
{: .nolineno }

有兩件事要知道：

- **安裝就等於啟用。** 除非 plugin 自己設定了 `defaultEnabled: false`，裝好它就開始運作。
- **Project 範圍不會自動裝到同事的電腦。** 設定提交進 repo 之後，每位協作者仍要自己執行一次安裝。

## 其他市集：加入之前先確認來源

除了官方市集，任何人都可以建立市集。加入市集的指令是：

```text
/plugin marketplace add <來源>
```
{: .nolineno }

來源可以是這幾種：

- GitHub repo，寫成 `owner/repo`。可以用 `#` 指定標籤或分支，例如 `your-org/plugins#v1.2.0`。
- 其他 Git 主機的完整網址，例如 `https://gitlab.example.com/your-group/your-marketplace.git#v1.0.0`。
- 本機資料夾的路徑。
- 指向 `marketplace.json` 的 `https://` 網址。

加入之前，先確認這幾件事：

- **這個 repo 是誰的。** 從你信任的地方取得連結，例如工具的官方網站或官方文件，不要只看搜尋結果。名稱相似的帳號並不少見。
- **有沒有指定版本。** 加上 `#v1.2.0` 這類標籤，市集內容就不會隨對方每次提交而改變。不過標籤本身可以被移動，原理見〈[gh actions-lock 教學：用 lockfile 鎖定 GitHub Actions 依賴](/posts/gh-actions-lock-workflow-lockfile/)〉，它只能讓變動少一點。
- **一行安裝指令也可能順便加入市集。** 像 `/plugin install <名稱> --marketplace owner/repo` 這種寫法，市集還沒加入時會先自動加入。看到別人貼這種指令，一樣先確認 `owner/repo` 是誰。

### 自動更新：你看過的檔案可能會變

依官方文件，Anthropic 的官方市集（例如 `claude-plugins-official`）預設會自動更新。其他市集，包括第三方市集和本機市集，預設不會。開啟自動更新時，Claude Code 會在背景更新從這個市集安裝的 plugin，所以你審查過的檔案，可能在你不知道的時候被換掉。

要關閉某個市集的自動更新，在 `/plugin` 切到 **Marketplaces** 分頁，選擇市集，再選 **Disable auto-update**。

關掉的代價是不會自動拿到修正。比較實際的做法是：重要的專案關閉自動更新，改成定期手動更新，更新前先看這次改了什麼，特別是 `hooks/hooks.json` 和 `.mcp.json`。手動更新的指令是 `claude plugin update <plugin 名稱>@<市集名稱>`，更新後要重新啟動 Claude Code 才會套用。

## 裝了之後：停用、移除、清乾淨

先確認自己裝了什麼。`claude plugin list` 會列出每個 plugin 的版本、安裝範圍和狀態。

**停用**：暫時不用，或懷疑它有問題時使用。在 `/plugin` 的 Installed 分頁選中 plugin 後按空白鍵，或輸入 `/plugin disable` 打開面板操作。在終端機則是：

```bash
claude plugin disable <plugin 名稱>@<市集名稱>
```
{: .nolineno }

停用後檔案還在，之後可以用 `claude plugin enable` 重新啟用。遇到不明狀況、想先全部停下來，可以用 `claude plugin disable --all` 停用所有 plugin。

**移除**：輸入 `/plugin uninstall`，或在終端機執行：

```bash
claude plugin uninstall <plugin 名稱>@<市集名稱> --scope <當初的範圍>
```
{: .nolineno }

`--scope` 要和安裝時一樣，不寫的話預設是 user。移除時要注意：

- plugin 存放資料的資料夾 `~/.claude/plugins/data/<id>/` 會一起刪除，加上 `--keep-data` 才會保留。
- 程式檔本身會在 `~/.claude/plugins/cache/` 多留 14 天，才由背景清理刪除。確定不再信任它，可以自己刪掉 `~/.claude/plugins/cache/<市集名稱>/<plugin 名稱>/`。
- Project 範圍的 plugin 在介面上移除時，會問你要選 **Disable for me**（只對自己停用，寫進你的 `.claude/settings.local.json`）還是 **Uninstall for everyone**（從共用的 `.claude/settings.json` 拿掉，影響所有協作者）。

**移除市集**：輸入 `/plugin marketplace remove <市集名稱>`。從這個市集安裝的所有 plugin 會一起被移除。

如果你是因為懷疑 plugin 有問題才移除它，曾經交給它的 token 也要換掉。後續處理可以參考〈[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)〉的「出事之後」清單。

![裝了之後的三種處理：停用保留檔案、移除會刪資料但 cache 留 14 天、移除市集會連同裝過的 plugin 一起移除；另外提醒自動更新會換掉看過的檔案](after-install.webp){: w="1600" h="900" }
_概念圖：由輕到重的三種處理方式。懷疑出事時先停用，確定不用再移除。_

## 下一步：把檢查清單放進團隊規則

一個人小心還不夠，團隊要有共同的做法。可以從三個層次著手。

**1. 寫進專案規則。** 把上面的檢查清單放進 `CLAUDE.md`、`AGENTS.md` 或 PR 範本，約定「新增 plugin 或市集時，要附上這份清單」。規則檔怎麼寫，見〈[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)〉。

**2. 把設定檔當成程式碼審查。** 專案要推薦 plugin 時，在 `.claude/settings.json` 寫 `extraKnownMarketplaces`（要認識哪些市集）和 `enabledPlugins`（要啟用哪些 plugin）：

```json
{
  "extraKnownMarketplaces": {
    "your-marketplace": {
      "source": { "source": "github", "repo": "your-org/your-marketplace" }
    }
  },
  "enabledPlugins": {
    "code-formatter@your-marketplace": true
  }
}
```
{: file=".claude/settings.json" }

這個檔案會提交進 repo，改它就跟改程式一樣，要經過 PR 審查。可以把它加進 CODEOWNERS（指定哪些檔案由誰審核的設定檔），讓熟悉這份檢查清單的人負責核准。官方文件另外說明兩點：在 repo 寫了 `enabledPlugins` 不會自動安裝，協作者要自己執行 `claude plugin install <名稱>@<市集> --scope project`；`extraKnownMarketplaces` 也只在協作者已經信任的資料夾裡生效。

**3. 在組織層級限制市集來源。** 公司若有統一管理 Claude Code 的設定（managed settings），管理員可以用 `strictKnownMarketplaces` 只允許特定來源，或用 `blockedMarketplaces` 封鎖特定來源。官方的允許清單範例如下：

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "anthropics/claude-plugins-official" },
    { "source": "github", "repo": "your-org/*" },
    { "source": "skills-dir" }
  ]
}
```

前兩行只允許官方市集和公司自己帳號底下的市集。第三行的 `skills-dir` 對應本機的 `~/.claude/skills/` 資料夾，讓放在那裡的內容繼續載入。管理員也可以設定 `pluginTrustMessage`，在安裝前的提醒後面加上公司內部的說明，例如審查流程的連結。

## 什麼情況怎麼做

| 我想… | 怎麼做 |
| --- | --- |
| 找 plugin | `/plugin` 的 Discover 分頁；或用 `/plugin install <名稱>@claude-plugins-official` 先打開詳細資訊 |
| 知道 plugin 實際放在哪 | 看 `marketplace.json` 條目的 `source` 和 `sha` |
| 知道裝了會自動執行什麼 | 讀 `hooks/hooks.json`、`.mcp.json`、`bin/`、`monitors/`、`.lsp.json` |
| 確定沒有漏看的元件 | clone 後執行 `claude --plugin-dir <資料夾> plugin details <名稱>` |
| 先小範圍試用 | 安裝時選 Local |
| 加入別的市集 | 從官方連結確認 `owner/repo`，用 `#標籤` 指定版本 |
| 不讓看過的檔案在背景被換掉 | `/plugin` → Marketplaces → Disable auto-update，改成手動更新並先看差異 |
| 暫時不用 | `claude plugin disable <名稱>@<市集>` |
| 懷疑出事，先全部停下 | `claude plugin disable --all` |
| 完全移除 | `claude plugin uninstall <名稱>@<市集> --scope <範圍>`，需要時刪掉 cache 資料夾 |
| 讓團隊做法一致 | 檢查清單寫進專案規則，`.claude/settings.json` 走 PR 審查 |

## 常見誤解

- **「在官方目錄裡就代表安全。」** 官方市集裡大多數 plugin 放在其他 repo，官方 repo 的檢查不涵蓋它們。安裝前的提醒也不分市集。
- **「開了沙箱就不用擔心。」** hook、monitor、MCP server 和 LSP server 都在沙箱外執行。
- **「Will install 看過就好。」** 它只告訴你有 hook，不告訴你 hook 執行什麼。
- **「skill 只是文字，不用看。」** 文字可以叫 Claude 去執行指令。
- **「看過一次就沒事了。」** 開了自動更新，檔案會在背景被換掉。
- **「移除就清乾淨了。」** cache 會多留 14 天，交給它的 token 也還有效。

## 結論

plugin 把好幾種擴充一次裝進來，所以安裝前要先弄清楚，它會在什麼時候、用你的權限做什麼事。順序是：從市集條目確認 plugin 實際放在哪裡，讀詳細資訊面板的 Will install，打開 `hooks/hooks.json`、`.mcp.json` 這些會執行程式的檔案，用 `plugin details` 對照元件清單，再從最小的範圍安裝。裝了之後，記得自動更新會換掉檔案；不用了就停用或移除。

想看懂 plugin 帶來的 hook 在做什麼，可以讀〈[Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)〉。想知道 plugin 裡的 skill 是怎麼寫成的，見〈[自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護](/posts/agent-skill-authoring-guide/)〉。要用同一套思路檢查整個 AI 工作流的供應鏈風險，見〈[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)〉。
