---
title: "把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒"
description: "不想每次改完檔都自己提醒排版、跑測試、留意敏感檔？這篇教你用 Claude Code hooks，在固定時機自動做這些檢查，並說明它擋不下什麼。"
date: 2026-11-10 11:00:00 +0800
categories: [AI, 軟體開發]
tags: [claude-code, coding-agent, workflow, testing]
media_subpath: /assets/img/posts/claude-code-hooks-automate-checks/
image:
  path: cover.webp
  alt: "改完檔自動排版、碰到敏感檔先擋下再提醒，收工時再跑測試。"
---

每次請 AI 改完檔，我都還要自己想：排版有沒有跑？測試有沒有過？有沒有不小心改到 `.env`？這些事其實不必每次開口。Claude Code（在終端機裡使用的 AI 程式助理）提供 hooks：在對話過程的固定時機，執行你事先寫好的指令，而不是等 AI 自己決定要不要做。

這篇說明 hooks 是什麼、什麼時候適合用，以及怎麼在專案裡設定四種常見檢查：改完檔自動排版、碰到敏感檔時擋下該次修改、收工時跑測試，還有對話被壓縮後把專案規則補回來。最後會說明它擋不下什麼，因為 hooks 不是安全邊界。

> **版本**：本文依 2026-11-10（台北時間）讀取的 [Claude Code hooks 指南](https://code.claude.com/docs/en/hooks-guide)與 [Hooks reference](https://code.claude.com/docs/en/hooks)（含 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)）整理。當天 npm 上 Claude Code 最新是 2.1.322。之後的版本，事件與欄位可能會改變。
{: .prompt-info }

若你關心的是第三方 skill 和 MCP 帶來的權限風險，見[先前這篇](/posts/coding-agent-supply-chain-permission-risks/)。本篇只談日常可以自己設定的自動檢查。

## hooks 是什麼，什麼時候用

Hook 是你定義的指令，Claude Code 會在生命週期的關鍵時機執行它。官方的說法是：某些動作會固定發生，而不依賴模型自己選擇要不要跑。適合用在不需要臨場判斷、每次都該做的事，例如排版、跑測試、或在改到特定檔案時先擋下來並說明原因。需要斟酌的決定，還是留給你或權限設定。

常見的時機包括：

- **PreToolUse**：工具（例如改檔、執行指令）實際執行前，可以擋下該次呼叫。
- **PostToolUse**：工具成功執行後，例如用來排版剛剛改過的檔案。
- **Stop**：Claude 結束這輪回覆時。注意，它在每次回覆結束時都會觸發，不只在「整個任務完成」時。
- **SessionStart**：對話開始或接續時。若只想在壓縮後補規則，可以用 matcher 限定 `compact`。

Hook 事件比上面列出的還多，完整列表見 [Hooks reference](https://code.claude.com/docs/en/hooks#hook-lifecycle)。入門不必一次全用。

![對話過程中四個固定時機，各自可以執行你設定的檢查](hook-timeline.webp){: w="1280" h="720" }
_概念圖，不是實際介面。四個時機依序可以是：工具執行前、執行成功後、這輪回覆結束、以及對話開始或被壓縮之後。_

**什麼時候用：** 同一件事你已經提醒過不止一次，而且判斷規則寫得清楚，例如「改完 JavaScript 就排版」「不要用 Edit 或 Write 改 `.env`」。

**下一步：** 先決定設定要放在哪個檔案，再從一個 hook 開始。

## 設定放在哪裡

本篇的範例都寫在專案根目錄的 `.claude/settings.json`。這個檔可以提交到 repo，讓同一專案的人共用。其他位置還有：只作用於你本機所有專案的 `~/.claude/settings.json`，以及不會進版控的 `.claude/settings.local.json`。各層的 hooks 是合併，不是互相取代。

設定檔是 JSON，不能有註解，也不能在最後一個項目後面多寫逗號。結構是三層：先寫事件名稱，再寫一組帶 matcher 的規則，最後是要執行的 hooks。

Matcher 是用來過濾「這次要不要跑」的條件。對 PreToolUse 和 PostToolUse 來說，它比的是工具名稱，而且大小寫必須完全一致。例如 `"Edit|Write"` 只在 Claude 使用 `Edit` 或 `Write` 時觸發，用 `Bash`、`Read` 或其他工具時不會跑。也可以寫成 `"Edit, Write"`，意思相同。沒有寫 matcher，或寫 `"*"`，就會在該事件每次發生時都執行。

設定好之後，在 Claude Code 的提示符輸入 `/hooks`，會打開一個唯讀的瀏覽畫面，列出目前的 hooks，以及它們來自使用者設定、專案設定、本機設定、外掛或目前這次對話。這只是查看，不能在這裡改設定。

下面的指令範例需要 [`jq`](https://jqlang.org/)（用來從 hooks 傳入的 JSON 取出欄位）。排版那一項另外需要 Node.js 和 `npx`，才能執行依官方指南 Prettier 範例改寫的指令：路徑先存進變數再加引號，空白或單引號才不會被拆開。Hook 腳本在 macOS 和 Linux 上必須是可執行檔，設定後請執行 `chmod +x .claude/hooks/*.sh`。

## 改完檔自動排版：PostToolUse

**什麼時候用：** 你希望 Claude 用 `Edit` 或 `Write` 改完檔後，自動依專案的排版規則重排，不必每次再提醒。

把這段加到專案的 `.claude/settings.json`（若檔案裡已有 `"hooks"`，只要在裡面加上 `PostToolUse`，不要整份覆寫）：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path'); npx prettier --write \"$f\""
          }
        ]
      }
    ]
  }
}
```

**它會做什麼：** 工具成功改檔後，這條指令從輸入的 JSON 取出檔案路徑，交給 `npx prettier --write` 就地排版。這是依官方指南的 Prettier 範例改寫的：先把路徑存進變數、再加引號交給 `npx prettier --write`，路徑裡有空白或單引號也不會被拆開。

**你會得到什麼：** 成功時，對話裡通常不會跳出訊息；要看的是檔案是否已被重排。官方的檢查方式是：請 Claude 在 JavaScript 檔裡加上單引號字串，再開檔確認是否被改成雙引號（依 Prettier 預設設定）。

**下一步：** 若你還想在改到 `.env` 或 `.git/` 時先擋下來，接著設定 PreToolUse。

## 改到敏感檔時擋下該次修改：PreToolUse

**什麼時候用：** 你不希望 Claude 用 `Edit` 或 `Write` 直接改 `.env`、`.git/` 裡的檔，或 `package-lock.json`。這裡說的是擋下該次修改並把原因回饋給 Claude，不是「AI 不能碰這些檔」。

先新增 `.claude/hooks/protect-files.sh`（官方指南保護檔範例的寫法，並處理 Windows 路徑的反斜線）：

```bash
#!/bin/bash
# protect-files.sh — based on official Claude Code hooks guide example
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Normalize Windows backslash separators so the patterns below match
FILE_PATH="${FILE_PATH//\\//}"

PROTECTED_PATTERNS=(".env" "package-lock.json" ".git/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done

exit 0
```

再在 `.claude/settings.json` 的 `"hooks"` 裡加上：

```json
"PreToolUse": [
  {
    "matcher": "Edit|Write",
    "hooks": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
      }
    ]
  }
]
```

`$CLAUDE_PROJECT_DIR` 是 Claude Code 提供的環境變數，指向目前專案根目錄。結束碼 `2` 在 PreToolUse 會阻止該次工具呼叫，腳本寫到 stderr（標準錯誤輸出）的 `Blocked:` 說明，會成為給 Claude 的回饋。結束碼 `0` 代表沒有額外決定，仍走原本的權限流程，並不等於核准這次操作。

![一般檔案通過，對敏感檔的那一次修改被擋下並留下提醒](guard-edit.webp){: w="1280" h="720" }
_概念圖，不是實際權限畫面。這個 hook 擋的是該次 Edit 或 Write，不是所有可能改到這個檔的路徑。_

**你會得到什麼：** 若路徑符合保護條件，該次修改不會執行，Claude 會看到擋下的原因。

**下一步：** 請記得，只用 `Edit|Write` 擋不住透過 `Bash` 或 `PowerShell` 改檔的情況，限制一節會說明怎麼補。若還想在收工時跑測試，接著設定 Stop。

## 收工時跑測試：Stop

**什麼時候用：** 你希望 Claude 結束這輪回覆時，先跑專案測試；測試失敗就不要就此收工，把失敗原因回饋後繼續修。

Stop hook 沒有 matcher。它在每次回覆結束時都會跑，使用者中斷時不會跑。若 hook 讓對話繼續，輸入裡的 `stop_hook_active` 會是 `true`。官方提醒一定要檢查這個欄位，或改讀對話紀錄，以免在永遠不會滿足的條件上一直擋下去。連續擋下並讓對話繼續八次之後，Claude Code 會強制結束這一輪；Claude 一旦再呼叫工具，這個計數就會歸零。

新增 `.claude/hooks/run-tests-on-stop.sh`。這裡用 `bun test`，配合後面的 Bun 情境；請換成你專案自己的測試指令，例如 `npm test` 或 `pytest`：

```bash
#!/bin/bash
# run-tests-on-stop.sh — Stop hook with official stop_hook_active guard
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # Allow Claude to stop
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
if ! (cd "$PROJECT_DIR" && bun test) >&2; then
  echo "Blocked stop: tests failed. Fix the failing tests before finishing." >&2
  exit 2
fi
exit 0
```

對應的設定：

```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-tests-on-stop.sh"
      }
    ]
  }
]
```

在 Stop 事件裡，結束碼 `2` 會不讓 Claude 停下，stderr 的說明會成為繼續工作的理由。

**你會得到什麼：** 測試通過，這輪可以結束；失敗時，Claude 會依回饋繼續處理，而不是在已經由 hook 接續的情況下再擋一次。

**下一步：** 若你擔心對話壓縮後遺漏專案慣例，再加上 SessionStart。

## 壓縮後把規則補回來：SessionStart

對話脈絡（上下文，也就是目前還留在模型眼前的內容）太長時，Claude Code 會做 compaction（壓縮）：把先前的對話摘要，好騰出空間，過程中可能漏掉重要細節。官方建議用 SessionStart hook，並把 matcher 設成 `compact`，在每次壓縮後把關鍵規則再寫進脈絡。指令印到標準輸出的純文字，會被加進 Claude 的脈絡。靜態、不太會變的規則，也可以改放在 `CLAUDE.md`。

**什麼時候用：** 有幾條規則你希望每次壓縮後都還在，例如套件管理工具或測試指令。

```json
"SessionStart": [
  {
    "matcher": "compact",
    "hooks": [
      {
        "type": "command",
        "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing. Current sprint: auth refactor.'"
      }
    ]
  }
]
```

把提醒文字改成你的專案規則即可。`compact` 對應自動或手動壓縮。SessionStart 不能用來擋住壓縮本身。

**你會得到什麼：** 依官方說明，壓縮後 Claude 會再看到這段提醒。

**下一步：** 用 `/hooks` 確認四個事件都出現在清單裡。

## 用 /hooks 檢查設定

在 Claude Code 提示符輸入 `/hooks`，打開唯讀的 hooks 瀏覽畫面。清單會標示每條 hook 的來源，例如使用者設定、專案設定、本機設定、外掛或目前這次對話。選一條可以看到它實際執行的內容，以及定義它的設定檔路徑或外掛名稱。也可以改看 `All events`，連尚未設定的事件一併列出。

這個畫面只供查看，改設定仍要編輯對應的 JSON 檔。

## 完整範例：一個小專案的一天

假設你在維護一個小型網站，希望改完 JavaScript 就排版、不要用 Edit 或 Write 改到 `.env`、每次回覆結束先跑測試，壓縮後還記得「用 Bun、提交前先測」。

排版仍用前面依官方指南 Prettier 範例改寫的 `npx prettier` 指令，路徑加引號後空白或單引號不會被拆開；這和你用 Bun 還是 npm 管理套件無關。

1. 在專案根目錄建立 `.claude/settings.json`，放入上面四個事件的設定；建立 `protect-files.sh` 和 `run-tests-on-stop.sh`，把測試指令改成你的專案指令，並執行 `chmod +x .claude/hooks/*.sh`。
2. 確認已安裝 `jq`，以及可執行 `npx prettier` 的 Node.js 環境。
3. 啟動 Claude Code，輸入 `/hooks`，確認 PostToolUse、PreToolUse、Stop、SessionStart 都在清單中，來源是專案設定。
4. 請 Claude 在一個 `.js` 檔加上功能。它用 Edit 或 Write 改完後，Prettier 會接著排版。
5. 若它試著用 Edit 或 Write 改 `.env`，該次修改會被擋下，並帶回 `Blocked:` 的說明。
6. 它說做完時，Stop hook 會跑測試；失敗就依回饋繼續，而不是直接收工。
7. 若這次對話經過壓縮，SessionStart 會把你寫的提醒再送進脈絡。

這四步可以分開加，不必一次全開。

## 該用哪個 hook

| 你的情況 | 用這個 |
| --- | --- |
| 用 Edit 或 Write 改完檔，要自動排版 | PostToolUse，matcher 設 `Edit\|Write` |
| 不要讓該次 Edit 或 Write 改到 `.env`、`.git/` 等檔 | PreToolUse，matcher 設 `Edit\|Write`，結束碼 2 擋下並說明原因 |
| 不論誰改了某個檔，都要在檔案寫入後做掃描 | FileChanged（檔案寫入後才跑，不能事先擋住） |
| 這輪回覆結束時先跑測試或掃描工作目錄 | Stop，並檢查 `stop_hook_active` |
| 壓縮後把專案規則補回脈絡 | SessionStart，matcher 設 `compact` |
| 只想確認目前設定了哪些 hooks | `/hooks`（唯讀瀏覽） |

## 使用前要先知道的限制

這些限制都來自官方文件，使用前請先看過。

**Matcher 只比工具名稱。** `"Edit|Write"` 在 Claude 改用 `Bash` 或 `PowerShell` 改檔時不會觸發。官方建議：若必須看到每一次改檔，例如做合規掃描或稽核紀錄，加一個 Stop hook，在每輪結束時掃描工作目錄；若要在每次呼叫時都看到，另外 match `Bash|PowerShell`，並用 `git status --porcelain` 列出已修改和尚未追蹤的檔案。若只在意某個檔案被寫入，不論是誰寫的，改用 [FileChanged](https://code.claude.com/docs/en/hooks#filechanged)。因此，上面的保護腳本只能寫成「擋下該次 Edit 或 Write」，不要理解成 AI 完全不能碰到這些檔。

![正門有人看守，側路仍可繞過；只比對 Edit 和 Write 擋不住經由指令改檔](bash-bypass.webp){: w="1280" h="720" }
_概念圖。Matcher 守的是指定的工具名稱；經由 Bash 或 PowerShell 改檔，會走另一條路。_

**`if` 只能盡量過濾。** 除了 matcher，工具事件還能加 `if`，用權限規則的語法依工具名稱和參數決定要不要啟動 hook，例如 `"Edit(*.ts)"`。官方寫明它是 best-effort（盡力而為，不保證每次都濾對）。真正要強制允許或禁止時，應使用權限系統，而不是只靠 hook。`if` 只對工具相關事件有效，加在其他事件上反而會讓 hook 完全不跑。

**Hook 回傳 allow，不會繞過 deny。** 設定裡的拒絕規則，包括組織代管的拒絕清單，仍然有效。相對地，hook 的 deny 在各種權限模式都有效。結束碼 0 也不等於核准。

**PostToolUse 不能還原已經發生的事。** 工具執行完才會跑到這個 hook，檔案寫入、指令執行或網路請求都已經生效。Exit 2 在這裡也不能撤回，只能把說明交給 Claude。要事先阻擋或改寫呼叫，用 PreToolUse。

**Hook 以你的完整使用者權限執行。** 官方警告：command hook 會用你的帳號權限執行指令，能改、刪或讀取這個帳號能碰到的任何檔案。加進設定前，先自己看過、在安全的環境試跑指令。在共用或正式環境使用前，請先讀 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)。互動工作階段會先問你是否信任該資料夾；但用 `claude -p` 或 SDK 時，官方說明不會跳出這個對話，會直接把資料夾視為已信任，因此 repo 裡的 `.claude/settings.json` 也可能在你從未確認過的目錄裡被執行。Hooks 不稱為安全邊界，也不能宣稱擋得住所有路徑。

## 結論

Hooks 讓排版、敏感檔提醒和收工測試在固定時機自動發生，不必每次再開口。先從專案的 `.claude/settings.json` 加一個 hook，用 `/hooks` 確認它出現在清單裡，再依需要往上加。同時要記得：matcher 只看工具名稱，Bash 或 PowerShell 可以繞過只看守 Edit 和 Write 的規則；`if` 只是盡量過濾；allow 不會繞過 deny；PostToolUse 無法還原已執行的動作。把它當成提高效率的固定檢查，而不是最後一道防線。

## 延伸閱讀

- [Claude Code hooks 指南](https://code.claude.com/docs/en/hooks-guide)：常見用法與可複製範例。
- [Hooks reference](https://code.claude.com/docs/en/hooks)：事件、輸入輸出與 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：權限與供應鏈風險，和本篇的日常檢查互補。
- [AI 寫程式變快了，產品為什麼還是交不出去？我怎麼理解 AI 原生開發流程](/posts/ai-native-sdlc-playbook/)：說明 skill 和 hook 的差別。
