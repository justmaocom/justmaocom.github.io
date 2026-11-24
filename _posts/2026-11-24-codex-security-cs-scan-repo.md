---
title: "Codex Security 教學：用 cs scan 掃描自己的 repo"
description: "用 OpenAI 官方的 Codex Security CLI 掃描自己的 repo：安裝並固定版本、用 cs login 登入、先 dry-run 再正式掃描，接著讀懂 report.md、找回舊結果，並說明掃描前要先清掉哪些憑證。"
date: 2026-11-24 10:30:00 +0800
categories: [資訊安全, 程式碼安全]
tags: [codex-security, codex, application-security, vulnerability-scanning]
media_subpath: /assets/img/posts/codex-security-cs-scan-repo/
image:
  path: cover.webp
  alt: "在 repo 目錄執行 cs scan .，掃描完成後打開 report.md，先看範圍再看每個發現。"
mermaid: true
---

想知道自己的程式有沒有漏洞，又不想先架一整套資安平台？OpenAI 的 Codex Security 提供命令列工具 `cs`，可以掃描自己的程式碼儲存庫（repo）。這篇帶你在本機準備第一次掃描，並用範例報告說明怎麼核對掃描範圍和結果。

> 步驟依 [openai/codex-security](https://github.com/openai/codex-security) 的 npm-v0.10.1 版 [README](https://github.com/openai/codex-security/blob/npm-v0.10.1/README.md)、[CLI 參考](https://github.com/openai/codex-security/blob/npm-v0.10.1/sdk/typescript/docs/cli.md)，以及官方的 [CLI 快速入門](https://learn.chatgpt.com/docs/security/cli)整理，查證日期是 2026-11-24。工具更新很快，選項以已安裝版本的 `cs scan --help` 為準。
{: .prompt-info }

## Codex Security 會找漏洞，但不等於資安審計

Codex Security 是 OpenAI 官方的漏洞掃描工具，原始碼以 Apache-2.0 授權公開在 GitHub。它可以在 Codex 對話裡用，也能從終端機執行，或接進 CI（每次推送程式碼就自動跑的檢查）。這篇只談終端機的 CLI。

依 README 的說明，一次掃描會找出疑似漏洞、對照原始碼驗證，再把結果存成報告與發現項目（findings）。它還能替發現產生修補並驗證修補，這部分這篇不談。

我不會把它的結果當成正式的資安審計或滲透測試。官方文件也寫明，掃描完成不代表每個檔案都看過，報告沒有發現也不代表沒有漏洞。我把報告當成「接下來該先查哪裡」的清單。

第一次掃描的流程如下：

```mermaid
flowchart LR
  A[確認 Node 與 Python] --> B[安裝並固定版本]
  B --> C[cs login 登入]
  C --> D[清掉無關憑證]
  D --> E[dry-run 檢查]
  E --> F["cs scan ."]
  F --> G[讀 report.md]
  G --> H{範圍符合預期？}
  H -- 是 --> I[逐項查證發現]
  H -- 否 --> J[縮小範圍重掃]
```

## 掃描前先知道：它用你的權限執行，結果含原始碼

Codex Security CLI 用你的本機帳號啟動。依[官方快速入門](https://learn.chatgpt.com/docs/security/cli)，掃描時不會停下來請你核准。[SECURITY.md](https://github.com/openai/codex-security/blob/npm-v0.10.1/SECURITY.md) 建議只掃你信任、也有權評估的 repo。

開始前先確認這幾件事：

- **掃描程序會繼承環境變數。** 官方提醒，這包括和掃描無關的 API token 與雲端憑證。步驟 4 會在掃描前清掉這些變數。
- **程式碼會交給模型分析。** 預設的模型供應商是 OpenAI，也可以改用 Amazon Bedrock 等其他供應商。
- **報告與紀錄可能含敏感資訊。** 報告會附上程式碼片段和漏洞細節。依[官方 FAQ](https://learn.chatgpt.com/docs/security/cli/faq)，`cs scans logs` 會印出未遮蔽的紀錄，可能含有原始碼或憑證。分享前先檢查內容。
- **登入和資安存取資格要分開確認。** 依 README，部分資安請求與受保護的發現需要 [Trusted Access for Cyber](https://chatgpt.com/cyber)。帳號登入成功後，掃描仍可能被拒絕，見步驟 4。

## 步驟 1：確認 Node.js 與 Python 版本

CLI 需要 Node.js 22.13.0 以上的 22.x，或是 24.x、26.x，另外要有 Python 3.10 以上。先看手邊的版本：

```bash
node --version
python3 --version
```
{: .nolineno }

套件宣告的支援範圍是 `^22.13.0 || ^24.0.0 || ^26.0.0`，23、25 這類奇數版不在其中。用 Python 3.10 的話，還要裝 `tomli`：

```bash
python3 -m pip install tomli
```
{: .nolineno }

## 步驟 2：安裝 CLI，並固定在 0.10.1

用 npm 全域安裝，並寫明版本號：

```bash
npm install --global @openai/codex-security@0.10.1
```
{: .nolineno }

裝好後確認版本，應該印出 `0.10.1`：

```bash
cs --version
```
{: .nolineno }

安裝會提供 `cs` 和 `codex-security` 兩個指令，兩者完全相同。`cs` 和你電腦上的其他指令撞名時，改用 `codex-security`。

不想全域安裝，或 npm 回報 `EEXIST` 衝突，就改用 npx。後面每個步驟的 `cs`，都換成 `npx @openai/codex-security@0.10.1`：

```bash
npx @openai/codex-security@0.10.1 --version
```
{: .nolineno }

之後要升級，先讀 [GitHub Releases](https://github.com/openai/codex-security/releases) 的版本說明，再用新的版本號重裝。`cs update` 也能更新，但它會直接換到最新版。

## 步驟 3：用 cs login 登入 ChatGPT 帳號

**如果 Codex CLI 把 ChatGPT 登入資訊存在檔案裡，請先讓 Codex Security 建立自己的登入工作階段。** 依 CLI 參考，第一次掃描或查詢登入狀態時，CLI 可能會匯入 Codex 的登入資訊。這會讓兩個工具共用一枚只能用一次的更新權杖（refresh token）。

其中一個工具用掉權杖後，另一個下次更新登入資訊時就可能失敗。這時狀態仍可能顯示已登入。

登入會打開瀏覽器，用 ChatGPT 帳號完成。登入後再確認狀態：

```bash
cs login
cs login status
```
{: .nolineno }

在沒有瀏覽器的遠端機器上，工作區（workspace）允許的話，改用裝置驗證：

```bash
cs login --device-auth
```
{: .nolineno }

工作區不允許裝置驗證時，照 [CLI 參考的 SSH 轉發說明](https://github.com/openai/codex-security/blob/npm-v0.10.1/sdk/typescript/docs/cli.md#remote-login-with-ssh-forwarding)登入。

如果 Codex Security 回報「refresh token 已被使用」，就在這個 CLI 登出後重新登入。

```bash
cs logout
cs login
```
{: .nolineno }

## 步驟 4：先 dry-run，再正式掃描

在準備執行掃描的終端機裡，先檢查有沒有掃描用不到的憑證。環境變數的值都是單行時，可以用下列指令找出可疑的名稱。如果有多行憑證，例如 PEM 私鑰，請略過這個篩選範例，以免印出值的片段。

```bash
env | grep -iE 'token|secret|key|pass' | cut -d= -f1
```
{: .nolineno }

篩選也會比對變數的值，可能列出與憑證無關的名稱。確認哪些變數是掃描用不到的憑證後，再把它們填入下方的 `unset` 範例。

```bash
unset GITHUB_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
```
{: .nolineno }

`unset` 會從目前的 shell 移除這些變數，接下來從這裡啟動的掃描也不會繼承它們。Shell 設定檔和其他已開啟的終端機都不受影響。

切到 repo 的根目錄，先做一次 dry-run：

```bash
cd /path/to/your-repo
cs scan . --dry-run
```
{: .nolineno }

dry-run 只檢查本機的輸入：要掃哪裡、用哪種模式、結果存到哪裡。它不會開始掃描、不載入憑證，也不檢查 Python。所以 dry-run 通過，不代表登入和執行環境都沒問題。

dry-run 顯示的 `stateDirectory` 是掃描歷史與預設結果的根目錄。通常位於 `~/.codex/state/plugins/codex-security`。若要將本次結果另存到 repo 外的空目錄，dry-run 和正式掃描都加上同一個 `--output-dir`。

想先看報告的版型，可以試 mock 掃描。這個模式不需登入，也不呼叫模型或分析程式碼。報告裡的 `[Mock]` 發現都是模擬資料。

官方建議用獨立的暫存狀態目錄保存 mock 掃描，讓它的歷史紀錄和正式掃描分開。

```bash
CODEX_SECURITY_STATE_DIR="$(mktemp -d)" cs scan . --mock
```
{: .nolineno }

確認無誤後，拿掉 `--dry-run` 正式掃描：

```bash
cs scan .
```
{: .nolineno }

偵測到 `OPENAI_API_KEY` 或 `CODEX_API_KEY` 時，依 CLI 參考，非互動式或 JSON 輸出的掃描會優先用 API key。如果 ChatGPT 登入和 API key 都可用，互動式掃描會讓你選。要明確使用 ChatGPT 帳號，就用下面這個版本取代上一個指令。

```bash
cs scan . --auth chatgpt
```
{: .nolineno }

在互動式終端機裡，掃描會顯示即時儀表板，按 `d` 可以看細節。想要一行一行的純文字進度，加上 `--headless`。

用 ChatGPT 登入且工具取得額度資訊時，進度畫面會顯示帳號各時段的已用百分比。若要按估算費用設定單次掃描的停止條件，用 `--max-cost` 指定美元金額。

```bash
cs scan . --max-cost 5
```
{: .nolineno }

CLI 按模型的標準費率估算，超過門檻才會停止掃描。已送出的請求仍可能使估算金額超標。ChatGPT 帳號額度另外計算。

掃描結束時，終端機會印出一段摘要。下面是官方文件的範例：

```text
  REPORT    /path/outside/repository/codex-security-results/report.md
  FINDINGS  2 (2 confirmed this scan; 0 previously found; 1 high, 1 medium)
  SCOPE     repository: .
  ELAPSED   42s
  RESULTS   /path/outside/repository/codex-security-results
```
{: .nolineno }

`REPORT` 指向報告檔，`RESULTS` 指向存放這次掃描結果的目錄。掃描完成預設回傳結束碼 0，即使有發現也一樣。設定嚴重度門檻後，達到門檻會回傳 1，輸入或執行錯誤則可能回傳 2。

我用 ChatGPT Team 帳號實測，兩次掃描都在建立威脅模型時被資安政策擋下，最後回傳結束碼 2。威脅模型是掃描用來整理可能攻擊情境的摘要。當時 CLI 顯示這段訊息。

```text
This content was flagged for possible cybersecurity risk. If this seems wrong, try rephrasing your request. If you’re doing authorized security work that requires more cyber permissive safeguards, apply for Daybreak access via https://platform.openai.com/settings/organization/status-and-access before retrying.
```
{: .nolineno }

這表示 OpenAI 的資安使用政策擋下了請求。訊息裡的 Daybreak，是給已授權資安工作使用、限制較寬鬆的存取方案。帳號沒有這個資格時，縮小掃描範圍不一定有用，要先到 [Trusted Access for Cyber](https://chatgpt.com/cyber) 申請。

依 CLI 參考，通過後再掃描時要加上 `--codex daybreak=true`，因為這個開關預設關閉：

```bash
cs scan . --codex daybreak=true
```
{: .nolineno }

## 步驟 5：讀報告時，先看範圍再看發現

結果目錄裡最重要的是這三個檔案：

| 檔案 | 用途 |
| --- | --- |
| `report.md` | 給人讀的報告，整理掃描範圍與每個發現 |
| `findings.json` | 每個發現的位置與佐證，適合交給程式處理 |
| `scan-manifest.json` | 掃描狀態、目標與範圍，`scan.scope` 記錄納入與排除的路徑 |

掃描也會嘗試產生 `exports/results.sarif`。SARIF 是 GitHub 等平台可讀取的標準格式。即使這份選用的匯出檔沒產生，掃描仍可能完成。

上面的實測沒有產生正式報告。以下依官方文件與 mock 掃描的 `report.md` 說明各節的用途。

1. **Scope** 記錄掃描目標、commit（Revision）、納入與排除的路徑，以及掃描限制（Limitations and exclusions）。
2. **Scan Summary** 整理結果、發現數量，以及嚴重度和可信度的分布。
3. **Threat Model** 摘要說明掃描採用的威脅模型。
4. **Findings** 先列出每個發現的嚴重度（Severity）與可信度（Confidence），再逐項說明。

我會先在 Scope 核對 repo、commit 與排除的路徑，確認這份報告對應到我想掃的版本和範圍。接著看 Limitations and exclusions，弄清楚報告還有哪些範圍限制或待查事項。

嚴重度描述漏洞可能造成的影響。可信度則反映現有證據能多有力地支持這項發現，報告裡分成三級。

| 可信度 | 意思 |
| --- | --- |
| high | 有直接證據支持，沒有重大的未解疑點 |
| medium | 證據顯示問題可能存在，但還缺執行期或可觸及性的證明 |
| low | 證據不完整，只是留著待追查 |

每個發現的詳細說明分成幾段，從 Summary、Root Cause 一路到 Remediation。官方快速入門建議，每個發現都逐一確認：

- 受影響的程式碼在哪裡。
- 攻擊者要具備什麼前提條件。
- 驗證的證據是什麼。
- 還剩下哪些不確定的地方。

這些發現來自原始碼分析，不一定附有實際執行的重現結果。官方的建議是，證據足以支持問題成立之後，才挑出來修。

先看這次掃描的狀態，再決定該讀報告、補查範圍，還是先處理失敗的原因。

| 情況 | 下一步 |
| --- | --- |
| 掃描完成，範圍也符合預期 | 逐項查證發現，記下報告列出的限制 |
| 重要目錄未納入，或相關問題仍待查 | 先確認缺少的是範圍、權限還是背景資料，再決定是否針對相關目錄重掃 |
| 掃描失敗或被取消 | 用 `cs scans logs` 搭配那次掃描的 ID 查原因，處理後再重跑 |

依 CLI 參考，重跑同一個掃描不一定會補到原先漏掉的地方。如果是路徑漏選，可以用後面「縮小範圍」一節的 `--path` 指定要補查的目錄。

## 步驟 6：之後用 cs scans show 找回結果

在同一個 repo 裡，用原本的狀態目錄執行下方指令，會顯示最近一次完成的掃描。依 CLI 參考，`cs scans logs` 預設查的是最近一次執行，包含失敗或執行中的掃描。要確認兩個指令指向同一輪，就都指定掃描 ID。

```bash
cs scans show
```
{: .nolineno }

輸出的 `artifacts` 會列出報告、結果檔和可用的匯出檔路徑。要找這個 repo 的掃描紀錄，用 `cs scans list`。要查看跨掃描仍未處理的發現，用 `cs findings list`。

```bash
cs scans list
cs findings list
```
{: .nolineno }

`cs findings list` 會替每個未處理的發現列出 occurrence ID。確認某個發現是誤判時，用這個 ID 記下理由：

```bash
cs findings false-positive OCCURRENCE_ID --reason "這個輸入在進入查詢前已由框架跳脫"
```
{: .nolineno }

之後掃描同一個 repo，會把這個理由當成參考資料。依官方 FAQ，掃描仍會獨立檢查目前的程式碼，不會因此略過整類問題。

AI 掃描每次的結果可能不同。要比較兩次掃描，用 `cs scans compare`，預設比對最近兩次完成的掃描：

```bash
cs scans compare
```
{: .nolineno }

## 縮小範圍：只掃某些目錄，或只掃這次的變更

repo 很大，或只想看某一塊時，用下面這些選項：

```bash
# 只掃 src 和 tests
cs scan . --path src --path tests

# 排除 examples 目錄
cs scan . --exclude-path examples/

# 只掃從 origin/main 到 HEAD 已 commit 的變更
cs scan . --diff origin/main

# 給 Standard 掃描大約 15 分鐘的調查時間
cs scan . --max-time 15
```
{: .nolineno }

- **`--exclude-path` 優先於 `--path`。** 被排除的檔案仍可能被讀來當上下文，但位置全在排除範圍內的發現，會從結果中移除。
- **`--diff` 需要乾淨、完整的 checkout。** 目前所在的 commit 必須就是要掃的那一個，有未提交的修改要先 commit 或 stash。想掃還沒 commit 的修改，改用 `--working-tree`。
- **`--max-time` 的單位是分鐘。** 在 Standard 模式它只是建議值，時間到就不再開始新的調查，整理報告可能還要再花一些時間。

`--mode deep` 會分批重複執行 Standard 掃描，再合併並去除重複的發現，花的時間和額度都比較多。我建議第一次先用預設的 Standard 模式，看過報告再決定要不要用 deep。

## 放進 CI：改用 API key 與官方 GitHub Action

CI 要自動執行掃描，可以把 `OPENAI_API_KEY` 或 `CODEX_API_KEY` 設在掃描步驟的環境變數裡。依官方 CLI 參考，這把 key 只應提供給可信任 workflow 裡的掃描步驟。

官方也提供 GitHub Action。依 README，先把 OpenAI API key 存成 repo secret `CODEX_SECURITY_API_KEY`，再複製[每週掃描的 workflow 範例](https://github.com/openai/codex-security/blob/npm-v0.10.1/github-action/examples/repository.yml)。

範例裡的 `REPLACE_WITH_REVIEWED_COMMIT`，要換成 Action release 標示、你審查過的 commit SHA。把 action 釘在 commit SHA 的理由，可以參考[gh actions-lock 教學](/posts/gh-actions-lock-workflow-lockfile/)。

範例把單次掃描的估算費用門檻設為 5 美元。有發現時，預設只回報結果。掃描本身失敗時，job 仍會失敗。

若要讓 high 或 critical 的發現也使 CI 失敗，CLI 可用 `--fail-on-severity high`。用 Action 時，將 `fail-on-severity` 設為 `high`。

## 結論

我建議第一次先挑自己熟悉的 repo，用預設的 Standard 模式掃一次。可以從一項有充分證據的發現開始，對照自己的程式碼，確認問題成立再修。

## 延伸閱讀

- [openai/codex-security](https://github.com/openai/codex-security)：原始碼、README 與版本說明。
- [Codex Security CLI 快速入門](https://learn.chatgpt.com/docs/security/cli)：官方的第一次掃描教學。
- [Codex Security CLI FAQ](https://learn.chatgpt.com/docs/security/cli/faq)：誤判、重掃結果不同、費用上限等常見問題。
- [OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)：替 coding agent、MCP 與 CI 做十題自我檢查。
- [Claude Code 沙箱設定教學：擋住 SSH 金鑰與 token](/posts/claude-code-sandbox-setup/)：讓 AI 執行的指令碰不到金鑰與 token。
- [用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)：在 CI 用 Codex 審 PR 的實例。
- [gh actions-lock 教學：用 lockfile 鎖定 GitHub Actions 依賴](/posts/gh-actions-lock-workflow-lockfile/)：把 workflow 用到的 action 鎖在確切的 commit。
