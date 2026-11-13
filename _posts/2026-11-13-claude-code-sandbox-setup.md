---
title: "把 AI 下的指令關進沙箱：Claude Code /sandbox 一步步設定，擋住 SSH 金鑰與 token"
description: "Claude Code 的沙箱預設關閉，開了之後預設仍讀得到 ~/.ssh。這篇一步步開啟 /sandbox、確認真的有擋、把金鑰和 token 擋在外面，並列出沙箱管不到的地方。"
date: 2026-11-13 09:00:00 +0800
categories: [資訊安全, AI Agent]
tags: [claude-code, coding-agent, ai-security, sandbox]
media_subpath: /assets/img/posts/claude-code-sandbox-setup/
image:
  path: cover.webp
  alt: "用 /sandbox 把 Claude 跑的指令關進沙箱，再把 SSH 金鑰和 token 擋在外面。"
---

Claude Code（在終端機裡使用的 AI 程式助理）會自己下指令：跑測試、裝套件、呼叫 `git`。這些指令用的是你的帳號，所以預設能讀你讀得到的檔案，包括 SSH 金鑰和雲端憑證。Claude Code 內建沙箱（sandbox），可以把這些指令關在作業系統強制執行的範圍裡，限制它們能寫哪裡、能連哪些網站。

但沙箱**預設是關閉的**。就算打開了，官方文件也寫明：預設仍讀得到 `~/.ssh` 和 `~/.aws/credentials`。很多人以為「開了就安全」，其實還差幾步。

這篇一步步帶你做完這幾件事：開啟 `/sandbox`、確認它真的有擋、把金鑰和 token 擋在外面、關掉「沙箱外重試」，最後列出沙箱管不到的地方，以及怎麼補。文末附一份可以直接複製的 `settings.json`。

> **版本**：本文依 2026-11-13（台北時間）讀取的 [Sandboxing](https://code.claude.com/docs/en/sandboxing)、[Permissions](https://code.claude.com/docs/en/permissions)、[Settings reference](https://code.claude.com/docs/en/settings-reference) 與 [changelog](https://code.claude.com/docs/en/changelog) 整理。當天最新的 Claude Code 是 2.1.323（11 月 12 日發布）。11 月的幾個版本連續修了沙箱與權限規則的問題，例如 2.1.321 修正唯讀指令沒經過提示就在沙箱外執行，以及 `cp`／`mv` 寫進資料夾時拒絕規則失效；2.1.323 修正沙箱可能在對話中途關掉、`excludedCommands` 讓沒列到的指令跑出沙箱。請先把 Claude Code 更新到最新版再照著做。
{: .prompt-info }

這篇是〈[拿 OWASP Agentic Top 10 檢查你的 AI 工作流：十項風險逐條對照與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)〉的實作續篇。那篇只要你「確認 `/sandbox` 有沒有開」，這篇示範開了之後怎麼設定。為什麼要限制 agent 的權限，見〈[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)〉，這裡不再重講。

## 沙箱擋什麼、預設放行什麼

沙箱只包住「指令」：Claude 透過 Bash、PowerShell 和 Monitor 工具跑的指令，以及這些指令再啟動的程式。限制由作業系統執行，macOS 用內建的 Seatbelt，Linux 和 WSL2 用 bubblewrap。原生 Windows 不支援，Claude Code 會直接在沙箱外跑指令；要在 Windows 上用沙箱，得把 Claude Code 裝在 WSL2 裡。

官方文件列出開啟後的預設值：

| 項目 | 預設 | 用哪個設定調整 |
| --- | --- | --- |
| 寫入 | 只能寫工作目錄、一個每位使用者專用的暫存資料夾，以及你另外加入的資料夾。其中 Claude Code 的設定檔、`.mcp.json`、`.git/hooks` 這類受保護的路徑仍然不能寫 | `filesystem.allowWrite`、`filesystem.denyWrite` |
| 讀取 | 幾乎整台電腦都讀得到，**包括 `~/.ssh`、`~/.aws/credentials`** | `filesystem.denyRead`、`credentials` |
| 網路 | 不能直接連外。連線都要經過本機的代理，代理會比對你允許的網域，而允許清單一開始是空的。不在清單上的網域怎麼處理，**看你的權限模式**：Manual 模式會問你，`bypassPermissions` 模式直接放行 | `network.allowedDomains`、`network.deniedDomains`、`network.strictAllowlist` |
| 環境變數 | 沿用 Claude Code 的環境，**包括裡面的 token** | `credentials` |

![沙箱包住 Claude 跑的指令；檔案工具、hooks、MCP server 和你自己用 ! 打的指令在沙箱外](inside-outside.webp){: w="1600" h="900" }
_概念圖，不是實際介面。沙箱只管指令，其他元件依權限規則或以你的完整權限執行。_

寫入和網路預設就收得很緊，讀取和環境變數則幾乎沒擋。這就是第三步要補的地方。

## 什麼時候該開

符合下面任一種情況，就值得開：

- 你常按「允許」讓 Claude 跑指令，或想讓它不必每次問你就能跑。開了沙箱，可以改由沙箱擋住越界的動作，而不是靠你逐一看指令。
- 你會讓 Claude 讀不是你寫的東西，例如別人的 repo、issue、網頁或套件原始碼。這些內容可能藏著要 AI 執行指令的文字。
- 你的電腦上有金鑰、雲端憑證或 token，而且不想讓 AI 跑的指令讀到它們。

## 步驟一：用 /sandbox 開啟

**macOS** 不用另外安裝。**Linux 和 WSL2** 要先裝 bubblewrap 和 socat：

```bash
# Ubuntu / Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

裝好後重新啟動 Claude Code，因為相依套件只在啟動時檢查。WSL1 不支援，請先升級到 WSL2。較新的 Ubuntu 預設限制使用者命名空間（AppArmor），會讓 bubblewrap 無法啟動；`/sandbox` 會指出這個問題，解法見官方的 [Add an AppArmor profile for bubblewrap](https://code.claude.com/docs/en/sandboxing#add-an-apparmor-profile-for-bubblewrap)。

接著在 Claude Code 裡輸入：

```text
/sandbox
```

會打開沙箱面板，有三個分頁：

- **Mode**：選擇沙箱裡的指令要怎麼核准。
- **Overrides**：在沙箱裡失敗的指令，能不能改到沙箱外重跑。第四步會關掉它。
- **Config**：查看目前生效的沙箱設定。

在 Linux 上，如果面板**只有** Dependencies 分頁，代表沙箱還無法啟動，照分頁列出的缺項（或 AppArmor 限制）處理後重啟。如果 Dependencies 出現在其他分頁旁邊，缺的只是選用元件（seccomp filter），沙箱照樣能跑。

在 Mode 分頁二選一：

- **auto-allow**：在沙箱裡跑的指令不再逐一詢問你。拒絕規則仍然有效，`Bash(git push *)` 這類指定內容的詢問規則也照樣會跳出確認。
- **regular permissions**：沙箱照樣限制，但每個指令仍照一般權限流程問你。

兩種模式的檔案與網路限制完全相同，差別只在要不要問你。想少按幾次「允許」就選 auto-allow，想每個指令都自己看過就選 regular permissions。注意，選了 auto-allow 之後，就算你的權限模式是會逐一詢問改檔的 Manual 模式，Claude 用指令改工作目錄裡的檔案也不會再問你。

在面板選的模式只會存進**這個專案**的 `.claude/settings.local.json`。要讓所有專案都開沙箱，在 `~/.claude/settings.json` 設 `"sandbox": { "enabled": true }`。只寫 `enabled` 時，預設就是 auto-allow；要改成 regular permissions，再加上 `"autoAllowBashIfSandboxed": false`。

**你會得到什麼：** Claude 跑的指令開始受沙箱限制。第一次有指令要連新網域時，Manual 模式（預設的權限模式）會先問你；auto 模式交給分類模型判斷，`bypassPermissions` 模式則直接放行。不想讓任何模式放行清單外的網域，在使用者設定的 `sandbox` 裡加上 `"network": { "strictAllowlist": true }`（2.1.219 起；寫在 repo 的設定檔裡無效），清單外的網域一律拒絕，需要的網域改寫進 `allowedDomains`。

## 步驟二：確認真的有擋

官方給了兩行檢查指令。請**叫 Claude 執行**，不要自己在 `!` 提示符後面打：你自己用 `!` 打的指令，在大多數情況下本來就在沙箱外跑，測不出沙箱有沒有作用。

| 指令 | 沙箱有作用時的結果 |
| --- | --- |
| `touch ~/sandbox-probe` | macOS 顯示 `Operation not permitted`；Linux 和 WSL2 顯示 `Read-only file system` |
| `curl --noproxy '*' https://example.com` | 顯示 `Could not resolve host`，因為這個指令繞不過沙箱的代理 |

第一行測試「寫不到家目錄」，第二行測試「沒辦法自己連外」。

請在 Manual 模式下做這個檢查。如果 Claude 問你要不要改到沙箱外重試，**拒絕**；在 `bypassPermissions` 模式，或有允許規則剛好符合這個指令時，重試會不問就在沙箱外跑，檢查就不準了（第四步會關掉這個重試）。另外，如果你是在家目錄啟動 Claude Code，或把家目錄加成了工作目錄，`touch` 本來就寫得進去，換一個專案資料夾再測。排除這兩種情況後 `touch` 仍然成功，先刪掉 `~/sandbox-probe`，再執行 `/sandbox` 確認沙箱有開、相依套件都裝好了。

**你會得到什麼：** 兩行都失敗，代表寫入和網路限制有在作用。

## 步驟三：把金鑰和 token 擋在外面

沙箱**沒有內建的憑證清單**，只有你列出來的檔案和變數才會被擋。用 `sandbox.credentials` 列出要保護的項目。下面是官方範例，擋住 AWS 憑證檔和整個 SSH 資料夾，並把 `GITHUB_TOKEN`、`NPM_TOKEN` 從沙箱指令的環境裡拿掉：

```json
{
  "sandbox": {
    "enabled": true,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

`"mode": "deny"` 對檔案的意思是沙箱裡的指令不能讀，對環境變數的意思是每個沙箱指令執行前先把它移除。把清單換成你電腦上真的有的憑證，例如其他雲端服務的設定檔，或其他存 token 的環境變數。

建議放在使用者設定 `~/.claude/settings.json`，所有專案都會套用。各層設定的 `deny` 會合併，任何一層都可以再加，但沒有一層能拿掉別層加的 `deny`。不過這不代表 repo 動不了你的保護：repo 的設定優先於使用者設定，還有別的辦法放寬沙箱，步驟五會說明怎麼防。

**怎麼確認：** 先自己在 `!` 後面打 `wc -c ~/.ssh/known_hosts`（換成你電腦上確實存在的檔案），這是在沙箱外跑，會印出檔案大小。再請 Claude 跑同一行；設定生效後，它應該讀不到原本的檔案。`wc -c` 只印出檔案大小，不會把內容印進對話。環境變數也一樣，先自己用 `!` 跑 `test -n "$GITHUB_TOKEN" && echo set || echo unset`，確認印出 `set`（代表你的 shell 本來有這個變數），再請 Claude 跑；生效後應該印出 `unset`。這行同樣不會把 token 本身印出來。如果 Claude 要求改到沙箱外重試，拒絕。

**會擋到什麼：** 擋掉 `~/.ssh` 之後，沙箱裡的 `git push`、`git pull` 如果走 SSH 就會失敗。macOS 上就算沒擋 `~/.ssh`，沙箱裡的 SSH remote 本來也連不上。最簡單的做法是推送時自己在 `!` 後面打 `git push`，它在沙箱外跑。另一種是把 remote 換成 HTTPS，但這需要 personal access token 之類的 HTTPS 憑證，而上面的設定已經把 `GITHUB_TOKEN` 從沙箱裡拿掉了。官方也提供 `excludedCommands` 把 `git push` 等指令移出沙箱，但被移出的指令會用你的完整權限執行、能連任何主機，用之前請想清楚。

> 想讓工具在沙箱裡照常登入、又不讓它看到真正的 token，官方另有 `"mode": "mask"`：指令只看到一個替代值，代理在送出請求時才換成真的。它要搭配實驗性的 `network.tlsTerminate`，而且 macOS 上對檔案使用 `mask` 的效果等於 `deny`。設定較複雜，入門先用 `deny`，細節見 [Mask credentials](https://code.claude.com/docs/en/sandboxing#mask-credentials)。
{: .prompt-tip }

## 步驟四：關掉「沙箱外重試」

指令在沙箱裡失敗時，Claude 可以帶上 `dangerouslyDisableSandbox` 參數，要求在沙箱外重跑一次。這是給不相容沙箱的工具用的逃生口。誰來核准這次重跑，取決於你的權限模式：

- Manual 模式和 `acceptEdits` 模式：會跳出標題為「Bash command (unsandboxed)」的確認。
- auto 模式：交給另一個分類模型判斷。
- `bypassPermissions` 模式：**不問就直接跑**。
- 另外，如果有允許規則剛好符合這個指令，例如 `Bash(curl *)`，重跑也會直接通過，不會問你。

想讓 Claude 跑的指令都留在沙箱裡，就關掉這個逃生口：

```json
{
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "failIfUnavailable": true
  }
}
```

- `allowUnsandboxedCommands: false`：Claude Code 會忽略 `dangerouslyDisableSandbox`。之後 Claude 跑的指令，除了符合 `excludedCommands` 的以外，都在沙箱裡執行。`/sandbox` 的 Overrides 分頁把這個狀態叫做 **Strict sandbox mode**。
- `failIfUnavailable: true`：沙箱啟動不了時（平台不支援或缺相依套件），Claude Code 直接在啟動時報錯結束。沒有這一項，Claude Code 只會在啟動時顯示警告，**照樣在沙箱外跑指令**。代價是在原生 Windows 這類不支援的平台上，或 Ubuntu 的 AppArmor 限制還沒處理時，Claude Code 會無法啟動。

使用者設定裡的 `allowUnsandboxedCommands: false`，就算專案設定寫 `true` 也不會被蓋掉（2.1.285 起）。

**你會得到什麼：** 指令在沙箱裡失敗就是失敗，Claude 會回報錯誤，由你決定要不要調整設定，而不是自己跑到沙箱外。

**會擋到什麼：** 和沙箱不相容的工具會直接失敗，Claude 也不能再改到沙箱外重試。官方疑難排解列出的例子有 `docker`、`jest`，以及 macOS 上的 `gh`、`gcloud`、`terraform` 這類 Go 寫的工具、需要開瀏覽器的登入流程。遇到時自己用 `!` 執行。如果覺得完全關掉太嚴，另一個做法是保留重試，但加一條詢問規則 `Bash(dangerouslyDisableSandbox:true)`（寫在 `permissions.ask`），每次要到沙箱外重試都會問你，連 auto 模式和 `bypassPermissions` 模式也一樣。

## 步驟五：沙箱管不到什麼

沙箱只包住指令。下面這些不在範圍內，要用別的方法補。

**Claude 的檔案工具和網路工具。** Read、Edit、Write、WebFetch、WebSearch 依權限規則決定，不受沙箱限制。官方特別寫明：`denyRead` 擋不住 Read 工具，`allowedDomains` 也限制不了 WebFetch。換句話說，就算沙箱擋住了 `cat ~/.ssh/id_ed25519`，Claude 還是可以用 Read 工具去讀。要補上這一塊，在權限設定加拒絕規則：

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  }
}
```

`Read(...)` 拒絕規則擋 Claude 的檔案工具，也擋 Claude Code 認得的 `cat`、`head` 這類讀檔指令，並會一併擋住 Edit 和 Write 改同一個路徑（NotebookEdit 例外）。開了沙箱時，Claude Code 也會把它加進沙箱的讀取拒絕清單。路徑寫法和沙箱不同：`~/` 代表家目錄，絕對路徑要寫成 `//` 開頭。

`blockWritesOutsideWorkingDirectories`（2.1.314 起）讓 Write、Edit、NotebookEdit 在任何權限模式下都拒絕寫到工作目錄以外；它不限制指令，指令的寫入範圍由沙箱負責，兩者剛好互補。開了它要知道兩個副作用：Claude 不能再改 Claude Code 的設定檔，連專案裡的也不行，要自己改；Claude 的 `EnterWorktree`、`ExitWorktree` 工具也會被拿掉。要關掉它，得從每個設定檔刪掉這個鍵再重啟。想連讀取也限制在工作目錄內，還有 `blockReadsOutsideWorkingDirectories`（2.1.257 起）可用。

**Claude Code 自己啟動的程式。** [Hooks](/posts/claude-code-hooks-automate-checks/)、本機的 MCP server、外掛的 monitor、LSP server、狀態列指令、`apiKeyHelper`，都以你的完整權限執行。Mod（在 Claude Code 裡執行自己程式碼的外掛）也一樣。裝之前先看過它會做什麼，沙箱幫不上忙。想讓這些程式也拿不到憑證類的環境變數，官方提供 `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 環境變數，不論有沒有沙箱，都會把憑證從所有子程式的環境裡拿掉。

**你自己用 `!` 打的指令。** 大多數情況下在沙箱外執行，連開了 Strict sandbox mode 也一樣。步驟三自己推送 `git push` 用的就是這一點；反過來說，在這裡打的指令沒有沙箱幫你擋。

**`excludedCommands` 列出的指令。** 被列進去的指令完全不受沙箱限制。條目寫得愈寬（例如 `docker *`），沙箱外能做的事就愈多。官方建議：工具只是需要多寫一個資料夾或多連一個網域時，改用 `allowWrite` 或 `allowedDomains`，讓它留在沙箱裡。

**別人 repo 裡的設定檔。** repo 的 `.claude/settings.json` 和 `.claude/settings.local.json` 優先於你的使用者設定。一般情況下，它們可以寫 `"enabled": false` 把沙箱關掉，可以加 `excludedCommands` 把指令移出沙箱（被移出的指令讀得到 `~/.ssh` 和 token），可以用更窄的 `allowRead` 重新打開你擋掉的路徑，也可以加 `allowWrite`、`allowedDomains` 放寬寫入和網路。只寫在 `~/.claude/settings.json` 的設定擋不住這些。

打開不熟的 repo 前，先看一下這兩個檔案。更穩的做法是把沙箱設定另存一份，例如 `~/.claude/sandbox-strict.json`，內容是下一節完整設定裡的 `sandbox` 那一段（最外層是 `{ "sandbox": { ... } }`），再用 `--settings` 帶入啟動：

```bash
claude --settings ~/.claude/sandbox-strict.json
```

用 `--settings` 關掉沙箱外重試時，沙箱會進入官方說的「admin-required」狀態（2.1.285 起）。這時 Claude Code 會忽略 repo 設定裡的 `excludedCommands`、`allowedDomains`、寫入權限，以及把 `enabled` 改成 `false` 的設定；`--settings` 裡的 `credentials` 擋掉的路徑，repo 也不能再用 `allowRead` 打開。代價是 `/sandbox` 不再開啟面板，而是顯示 `Sandbox settings are overridden by a higher-priority configuration`；要確認設定來源，改用 `/status` 看 `Setting sources`。

**網域允許清單只看主機名稱。** 代理依連線要求的主機名稱放行，預設不解開也不檢查加密流量的內容。官方警告，允許 `github.com` 這類範圍很大的網域，可能成為把資料送出去的管道。允許清單只放真正需要的網域。另外，網路確認視窗選「Yes, and don't ask again」時，Claude Code 會存一條 `WebFetch(domain:...)` 允許規則，這條規則也讓 WebFetch 工具可以連到那個網域。

**git worktree。** 如果你照〈[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)〉的方式，在 worktree 裡開 Claude Code，沙箱會允許寫入主 repo 共用的 `.git` 資料夾，所以 `git commit` 照常運作；但其中的 `hooks/` 和 `config` 仍不能寫。從 2.1.323 起，沙箱裡的 `git worktree add`、`move`、`remove` 會因為唯讀而失敗，在不是這次對話開啟或加入的 worktree 裡 commit 也一樣。建立和移除 worktree 請自己在終端機做。

想把上面這些也一起關起來，就要把整個 Claude Code 放進容器、虛擬機器或官方的 sandbox runtime 裡執行。比較方式見官方的 [Sandbox environments](https://code.claude.com/docs/en/sandbox-environments)。

## 完整的 settings.json

把前面幾步合起來，放在 `~/.claude/settings.json`。如果檔案裡已經有 `permissions` 或 `sandbox`，把內容合併進去，不要整份覆蓋：

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)"
    ],
    "blockWritesOutsideWorkingDirectories": true
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "credentials": {
      "files": [
        { "path": "~/.aws/credentials", "mode": "deny" },
        { "path": "~/.ssh", "mode": "deny" }
      ],
      "envVars": [
        { "name": "GITHUB_TOKEN", "mode": "deny" },
        { "name": "NPM_TOKEN", "mode": "deny" }
      ]
    }
  }
}
```

這份設定做了這些事：

- 所有專案預設都開沙箱，沙箱開不了就不啟動。
- Claude 跑的指令不能改到沙箱外重試。
- 沙箱裡的指令讀不到 SSH 金鑰和 AWS 憑證，也拿不到 `GITHUB_TOKEN`、`NPM_TOKEN`。
- Claude 的檔案工具讀不到同樣的檔案，也不能寫到工作目錄以外。

這些都是「repo 沒有另外放寬」時的效果。步驟五說過，repo 的設定可以把沙箱關掉或放寬；要擋住這一點，把 `sandbox` 那一段另存成 `~/.claude/sandbox-strict.json`（檔案本身仍是一個 JSON 物件，最外層是 `{ "sandbox": { ... } }`），用 `claude --settings ~/.claude/sandbox-strict.json` 啟動。

存檔後重啟 Claude Code，執行 `/sandbox`，到 Config 分頁確認設定有生效（用 `--settings` 啟動時改看 `/status` 的 `Setting sources`），再照步驟二和步驟三的方法檢查一次。

## 結論

沙箱預設關閉，開了也只擋寫入和網路，讀取和環境變數要自己補。照這篇的順序做：用 `/sandbox` 開啟，叫 Claude 跑兩行指令確認有擋，用 `sandbox.credentials` 列出要保護的金鑰和 token，再用 `allowUnsandboxedCommands: false` 關掉沙箱外重試。最後記得，沙箱只包住指令；Claude 的檔案工具要靠權限規則，hooks 和 MCP server 以你的完整權限執行，repo 的設定也能把沙箱放寬，打開不熟的 repo 時用 `--settings` 啟動。

## 延伸閱讀

- [Sandboxing](https://code.claude.com/docs/en/sandboxing)：官方的完整說明，包括疑難排解與組織層級的強制設定。
- [Permissions](https://code.claude.com/docs/en/permissions)：權限規則的寫法，以及怎麼限制檔案工具。
- [拿 OWASP Agentic Top 10 檢查你的 AI 工作流：十項風險逐條對照與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)：這篇的起點，十題自我檢查。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：MCP server 和外掛在沙箱外執行，這篇說明它們帶來的風險。
- [把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)：hooks 以你的完整權限執行，不受沙箱限制。
