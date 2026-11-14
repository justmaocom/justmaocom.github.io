---
title: "gh actions-lock 教學：用 lockfile 鎖定 GitHub Actions 依賴"
description: "workflow 寫 @v3，執行的程式碼可能隨標籤移動而改變。這篇說明 GitHub 的 workflow lockfile 怎麼運作，並一步步用 gh actions-lock 上鎖、看懂 diff、日常維護。"
date: 2026-11-13 20:00:00 +0800
categories: [資訊安全, 供應鏈]
tags: [supply-chain-security, github-actions, ci, dependabot, gh-actions-lock]
media_subpath: /assets/img/posts/gh-actions-lock-workflow-lockfile/
image:
  path: cover.webp
  alt: "用 actions.lock 記錄預定執行的 action commit，避免標籤移動時悄悄換版。"
---

workflow 裡的 `uses: actions/checkout@v7` 看起來只是選了第 7 版，實際上跑的是 `v7` 標籤當下指向的 commit。上游移動標籤後，你的 workflow 沒改，執行的程式碼卻可能跟著變。

GitHub 在 2026-10-28 推出 workflow lockfile。用 `gh actions-lock` 把支援的 action 解析成確切 commit，記在 `.github/workflows/actions.lock`，納入管理的 workflow 就會依這份記錄執行。你可以保留好讀的版本號，同時把真正要跑的程式碼放進審查流程；不過，產生 lockfile 本身不代表已完成安全審查。

先認識幾個詞：

- **GitHub Actions**：GitHub 內建的自動化服務，程式一推上去，就能自動跑測試、建置、部署。
- **repo**（repository）：GitHub 上存放專案程式碼的地方。
- **workflow**：放在 repo 的 `.github/workflows/` 裡的 YAML 設定檔，寫明要自動做哪些事。
- **action**：workflow 裡可以重複使用的現成步驟，例如負責「取出程式碼」的 `actions/checkout`。workflow 用 `uses:` 這一行指定要用哪個 action、哪一版。
- **commit 與 SHA**：commit 是某一次提交時的程式碼快照；SHA 是每個 commit 獨一無二的編號，是一長串英數字，內容只要改一個字，編號就不同。
- **tag（標籤）**：替某個 commit 取的好記名字，例如 `v3.1.0`。標籤像一張貼紙，可以撕下來貼到別的 commit 上。
- **lockfile（鎖定檔）**：記錄每個依賴「確切是哪一版」的檔案。寫過 JavaScript 的人可能看過 `package-lock.json`，概念一樣。
- **Dependabot**：GitHub 內建的機器人，發現依賴有新版本時，會自動開 PR（請求合併變更的申請）幫你更新。
- **gh**：GitHub 官方的命令列工具（GitHub CLI）。`gh actions-lock` 是替它加上的擴充功能（extension）。

這篇處理的是「別人寫的 action 被換掉」這種供應鏈風險。[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)在 ASI04（供應鏈）提過一句「用 lockfile 鎖住第三方 action」，這篇把做法完整寫出來。

> **版本說明**：本文依 2026-11-13 讀取的 GitHub 官方資料撰寫：[GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)、[Locking action dependencies in a repository's workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)、[Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，以及 [gh-actions-lock v0.4.1 的 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md)與[疑難排解文件](https://github.com/github/gh-actions-lock/blob/v0.4.1/docs/troubleshooting.md)。本文未實際執行上鎖操作；工具持續更新，指令與選項請對照已安裝版本的 `gh actions-lock --help`。
{: .prompt-info }

## 為什麼 `@v3` 不一定是你審過的那一版

`uses: octo-org/deploy-action@v3` 看起來像是「用第 3 版」，其實是「用 `v3` 這張貼紙現在貼著的那個 commit」。有權更新那個 tag 的人，就能移動這張貼紙；實際權限也會受到上游的 tag 保護規則限制。平常這是作者發新版的方式：`v3` 跟著最新的 3.x 走。但作者的帳號一旦被盜，攻擊者也能用同一招，把貼紙貼到藏了惡意程式的 commit 上。你的 workflow 一行都沒改，下次執行卻跑了別人的程式。

這種事真的發生過。2025 年 3 月，很多 repo 都在用的 `tj-actions/changed-files` 就出過事。依 [GitHub 安全公告](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)，攻擊者事後修改了多個版本標籤，讓它們指向同一個惡意 commit；這段程式會把 CI 裡的機密資料（例如 token、金鑰）印進 workflow 的執行紀錄（log）。公告寫的受影響期間是 2025 年 3 月 14 日到 15 日，使用這個 action 的 repo 超過 23,000 個。美國 CISA 也為這起事件（CVE-2025-30066）發了[警示](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)。

以往常見的防法，是把 action 直接釘到完整的 commit SHA。本站的部署 workflow 就是這樣寫：

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```
{: .nolineno }

完整 SHA 可以避免跟著移動的 tag 換版，但不保證該 commit 的內容安全。閱讀時也有一個不便：一長串編號看不出是哪一版，只能靠行尾的註解。註解也可能和 SHA 對不上，每次更新都要兩個一起改。workflow lockfile 換了一種做法：workflow 裡繼續寫 `@v7.0.1` 這種好讀的版本號，SHA 另外記在 lockfile 裡。[官方文件](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)寫得很直接：已納入 lockfile 的 action，可以由 lockfile 固定 SHA，不必每一行都直接寫 SHA。這不表示可以先移除所有既有 SHA，再慢慢補 lockfile；應先完成納入、審查與驗證。

## workflow lockfile 是什麼、怎麼運作

一句話：lockfile 就是 `.github/workflows/actions.lock` 這個檔案，記下每個 workflow 用到的 action 解析到哪一個 commit，執行時 GitHub 以它為準。

它由 `gh actions-lock` 自動產生，不要手動修改。每個 action 會記這幾個欄位：

- `ref`：這個 commit 是從哪個標籤或分支解析出來的，例如 `v3.1.0`。
- `commit`：解析到的 commit，也就是**真正會執行的程式碼**。
- `owner_id`、`repo_id`：來源 repo 的數字編號。執行時用它確認，名字背後還是當初鎖住的那個 repo。

它不只記你直接寫在 `uses:` 的 action。依 [GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)，action 自己再用到的其他 action（遞移依賴）也會一起鎖住。

一個 workflow 被納入 lockfile 之後（官方稱為 onboard，本文叫「上鎖」），依[概念說明](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)，執行時有三條規則：

1. 這個 workflow 用到的每個 action，都必須出現在 lockfile 裡。
2. 執行的是 lockfile 裡記的那個 commit，不是標籤現在指到的 commit。
3. 那個 commit 必須在 action 自己的 repo 裡、從記錄的標籤或分支追得到。只存在於 fork（別人複製出去的 repo）的 commit，或已經不在那個標籤歷史裡的 commit，執行時會被拒絕。

所以標籤被移走時，workflow 要嘛照跑鎖住的那一版，要嘛直接被擋下，不會悄悄改跑新的程式。

![沒有 lockfile 時，標籤被移走就跑到被換上的程式；有 lockfile 時，照跑鎖住的那一版](tag-vs-lock.webp){: w="1600" h="900" }
_概念圖：同一行 `uses: octo-org/deploy-action@v3`。左邊沒有 lockfile，執行時跟著標籤走；右邊有 lockfile，照跑鎖住的 commit，那個 commit 若已不在標籤的歷史裡，這次執行會被擋下。_

**誰可以用：** GA 公告列出 GitHub Enterprise Cloud（含資料落地版本）、Team、Free；不過本文查閱時，操作與政策文件的適用方案欄仍標示 Enterprise Cloud。請確認 repo 實際提供的功能與政策入口，尤其不要把「可以產生檔案」當成「執行端已套用保護」。[v0.4.1 README](https://github.com/github/gh-actions-lock/blob/v0.4.1/README.md)列出 github.com 與 GHE.com 支援，不支援 GitHub Enterprise Server。

**要先說清楚：** lockfile 只決定「跑哪一版」，不判斷那一版安不安全。官方提醒，上鎖前要先審過依賴。你鎖住的那一版若本來就有問題，lockfile 會很忠實地一直跑它。

## 步驟 0：先準備這些

- **裝好 GitHub CLI 並登入：** 照 [GitHub CLI 官網](https://cli.github.com/)安裝，再用 `gh auth login` 登入。擴充功能需要已登入的 `gh`。
- **對 repo 有寫入權限：** 官方文件寫，有寫入權限就能建立 lockfile，不需要管理員權限。
- **先保存目前變更，另開工作分支：** 工具會修改 workflow 和 lockfile，先用 `git status --short` 確認現況。安裝工具後若想先看報告，可用只讀、不寫檔的 `gh actions-lock --no-fix`。
- **先開 Dependabot：** 官方建議在產生 lockfile 之前，先讓 Dependabot 管理 GitHub Actions 的版本。最基本的設定如下；若已有 `.github/dependabot.yml`，把這個更新項目合併進既有設定，不要整份覆蓋：

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- **檢查每一行 `uses:`：** 確認指向的都是仍在維護的目前版本。lockfile 會把你寫的版本原樣鎖住，舊版本鎖起來還是舊版本。
- **確認有沒有 action 允許清單：** 有些組織只允許使用特定的 action（allowlist）。上鎖之後比對方式會改變，步驟 3 會說明。

## 步驟 1：安裝 gh-actions-lock

```bash
gh extension install github/gh-actions-lock
```
{: .nolineno }

這會安裝當時最新的 release；本文依 v0.4.1 文件說明。若要明確選用該版，可在安裝時加上 `--pin v0.4.1`，但這指定的是 release tag，不是完整 commit SHA 或安全認證。仍需確認工具來源。未釘住版本的一般安裝，之後可這樣更新：

```bash
gh extension upgrade gh-actions-lock
```
{: .nolineno }

裝好後先看一次 `gh actions-lock --help`。README 寫，所有選項以這份說明為準。

## 步驟 2：產生 lockfile

在 repo 的根目錄執行：

```bash
gh actions-lock
```
{: .nolineno }

它會掃過 `.github/workflows/` 底下每一個 workflow，把每個能解析的 action 釘到一個 commit，再寫出 `.github/workflows/actions.lock`。

不想一次全部上鎖，也可以只鎖一個 workflow：

```bash
gh actions-lock .github/workflows/ci.yml
```
{: .nolineno }

官方的建議就是一個一個 workflow 慢慢納入。要注意，只有對整個目錄執行時，才會清掉已刪除 workflow 的舊紀錄。

## 步驟 3：看懂 diff 再提交

執行完後先用 `git status --short` 確認修改與新增的檔案，再用 `git diff -- .github/workflows/` 看已追蹤檔案的變更。**新建、尚未追蹤的 `actions.lock` 不會直接出現在一般 `git diff` 裡**，要開檔檢查，或加入暫存區後用 `git diff --cached` 查看。主要看兩處：

**第一處：workflow 檔裡的 `uses:` 寫得更精確。** 例如 `octo-org/deploy-action@v3` 可能被改寫成 `octo-org/deploy-action@v3.1.0`。若能找到對應的完整版本標籤，這種改寫會保留相同 commit，讓版本名稱更精確；不是自行升到另一個新版本。想保留 `@v3` 的寫法，執行時加上 `--no-narrow`。

**第二處：新增 `actions.lock`。** 檔案開頭有幾行註解，提醒這是自動產生、不要手動修改的檔案；接著的內容結構大致如下（數值是示意）：

```yaml
version: 'v0.0.3'
workflows:
    '.github/workflows/ci.yml':
        - 'octo-org/deploy-action@v3.1.0'
dependencies:
    'octo-org/deploy-action@v3.1.0':
        ref: 'v3.1.0'
        commit: '<commit SHA>'
        owner_id: 1234567
        repo_id: 7654321
```

`version` 是 lockfile 的格式版本，不是擴充功能版本。上面的 commit 與數字僅用來說明欄位，不能直接複製成有效 lockfile。`workflows` 列出每個 workflow 用到哪些 action；`dependencies` 記下每個 action 解析到的 commit。審查時看兩件事：

- **`commit` 變了：** 代表 workflow 之後會跑不同的程式碼。官方的說法是，變了的 `commit` 就是你的 workflow 會執行的程式碼，所以要去看上游改了什麼。
- **`owner_id` 或 `repo_id` 變了：** 這應該很少發生。官方建議先查清楚原因，再合併。

![提交前要看懂的兩處變更：uses: 改寫成完整版本號，以及新增的 actions.lock 各欄位的意思](review-diff.webp){: w="1600" h="900" }
_概念圖：上方是 workflow 檔的改寫，`@v3` 變成 `@v3.1.0`，指向同一個 commit；下方是新增的 `actions.lock`，以及 `ref`、`commit`、`owner_id`／`repo_id` 各代表什麼。_

**有 action 允許清單的話，清單要跟著改。** [官方文件](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)特別提醒：workflow 上鎖之後，允許清單比對的是鎖住的 commit SHA，不再是標籤。像 `actions/checkout@v6` 這種寫死標籤的項目會對不上，可以改成對應的完整 commit SHA；若管理員選擇使用萬用字元，應限制在可信的 owner／repo 範圍，不要為了解決錯誤就全面放寬。清單可能設在 repo、組織或企業層級，不確定的話先問管理員。

確認沒問題，就把 `actions.lock` 和改寫過的 workflow 一起提交。官方另外建議把 `.github/workflows/actions.lock` 加進 CODEOWNERS（指定哪些檔案要由誰審核的設定檔），並搭配分支保護或 ruleset 要求 code owner 核准。只新增 CODEOWNERS 不會阻擋合併；workflow 與 CODEOWNERS 本身也要保護，否則仍可能移除檢查或改用其他 action。

## 步驟 4：日常維護

上鎖不是做一次就結束。下面幾件事，決定它能不能長期有效。

**改了 `uses:` 就重新執行。** 新增 workflow，或在既有 workflow 增刪 action 時，再跑一次 `gh actions-lock`。不要手動改 lockfile。

**Dependabot 會一起更新。** 已上鎖的 workflow，Dependabot 開版本更新的 PR 時，會在同一個 PR 裡重產對應的 lockfile 紀錄，不需要額外設定。但它只處理已上鎖的 workflow：還沒上鎖的，它照舊只改 workflow 檔，也不會替你把新的 workflow 納入 lockfile。

**讓 CI 檢查 lockfile 有沒有過期。** `gh actions-lock --verify` 只檢查、不改檔案；缺少必要鎖定紀錄或驗證失敗等阻擋性問題，會讓檢查以錯誤結束，適合設成 PR 必須通過的檢查。gh-actions-lock 的 repo 提供了 [`verify-lockfile.yml` 範例](https://github.com/github/gh-actions-lock/blob/v0.4.1/.github/workflows/verify-lockfile.yml)。下面依它調整，將安裝版本指定為本文對照的 v0.4.1，適用於 github.com 的一般 PR 檢查：

{% raw %}
```yaml
# Fails when .github/workflows/actions.lock is out of sync with the
# workflows or a locked pin no longer verifies upstream.
name: verify-lockfile

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - run: gh extension install github/gh-actions-lock --pin v0.4.1
      - run: gh actions-lock --verify
```
{: file=".github/workflows/verify-lockfile.yml" }
{% endraw %}

幾個重點：

- `on`：每個 PR，以及推到 `main` 時都會檢查。
- `permissions: contents: read`：只給讀取權限，這個檢查不需要改任何東西。
- `persist-credentials: false`：不把 checkout 的 Git 憑證留在後續 Git 設定中。job 仍有 `GH_TOKEN` 供工具查詢 GitHub，這不等於整個 job 都沒有 token。
- `--pin v0.4.1`：指定擴充功能的 release tag，方便重現本文使用的版本選擇；它不會由 workflow lockfile 替這個下載的二進位工具鎖住內容。
- `gh actions-lock --verify`：沒有阻擋性錯誤時回傳 0，**仍可能有警告**；有阻擋性問題時回傳 1；工具本身出錯，例如選項錯誤、lockfile 讀不了或 token 被拒絕，則回傳 2。檢查通過不等於所有依賴都已審查或沒有風險。

README 提醒，把這份檔案複製進 repo 之後，要再跑一次 `gh actions-lock`，讓這個負責檢查的 workflow 自己也上鎖。

另外還有 `--verify-local`：不連網，只檢查每一行 `uses:` 在 lockfile 裡有沒有紀錄，適合提交前快速檢查。它不驗證來源，不能取代 `--verify`。工具也不會替你修正權限不足、網路錯誤或 API 限流；遇到這些問題，先修復查詢條件，不要把無法驗證當成通過。

**GHE.com 的 token 要另外看。** 依 v0.4.1 README，tenant 的 `GITHUB_TOKEN` 不能拿去查公開 github.com action；本機可另外登入 github.com，CI 則依文件提供僅供公開 repo 查詢的 `GH_ACTIONS_LOCK_GITHUB_COM_TOKEN`。不要為了解決限流就授予不必要的寫入權限。

**標籤或分支移動了，看種類處理。** 以下分開說明擴充功能的檢查與維護行為；實際執行 workflow 時，runner 仍會驗證鎖定紀錄。依 v0.4.1 疑難排解文件，`main`、`v4` 這類參照的 `ref-moved` 警告只出現在 JSON 輸出，也不會讓結束碼變成失敗。需要查看這類訊息，可執行 `gh actions-lock --verify --json`。

| 你寫的參照 | 發生什麼 | 怎麼做 |
| --- | --- | --- |
| 分支或部分版本，例如 `main`、`v4` | 舊 commit 仍可由上游歷史驗證時，保留舊鎖定；JSON 回報 `ref-moved` 警告 | 看過上游改了什麼，要跟上就執行 `gh actions-lock --relock` |
| 完整版本標籤，例如 `v3.1.0` | 標籤必須指向鎖住的 commit，移動了就報錯 | 先弄清楚標籤為什麼被移動，再執行 `gh actions-lock --relock`，或改寫 `uses:` 那一行 |
| 歷史被改寫，例如上游 force push 之後，鎖住的 commit 不在歷史裡了 | 報錯，`--relock` 也修不好 | 先排除 lockfile 被誤改，再審查上游歷史與新 commit；確認要採用後，才執行 `gh actions-lock --accept-moved` |

![標籤或分支移動時的三種情況：分支或部分版本、完整版本標籤、歷史被改寫，各自的結果與處理指令](moved-refs.webp){: w="1600" h="900" }
_概念圖：三種參照移動的情況與對應指令。第三種的 `--accept-moved` 只能在人工確認後使用，不要放進自動化。_

**`--accept-moved` 接受的是什麼？** 它表示你已檢查上游歷史，願意信任新的 commit，不是讓已無法驗證的舊 commit 繼續過關。歷史被改寫可能是正常維護，也可能是供應鏈攻擊或 lockfile 被誤改；工具無法替你判斷原因，所以先停下來。這個選項只處理 workflow 自己直接引用的依賴；若問題藏在第三方 composite action 裡，要升級、替換或停止使用該 action，不能靠同一個旗標全部放行。

`--relock` 也會改變要執行的 commit，仍要審查差異。兩個選項都不應被當成「CI 出錯就自動補上」的解法；官方尤其明確要求不要在自動化裡使用 `--accept-moved`。

**不要刪掉 lockfile。** README 提醒，鎖住的參照會一直沿用；刪掉重產，所有參照都會重新解析成「現在指到的 commit」，等於重新相信一次上游。檔案壞了，先比較目前、暫存區與可信版本的差異，保存要保留的變更，再從版本控制還原。下面的 `restore` 會覆蓋工作目錄中的 lockfile，但不會更新暫存區；執行前請確認沒有需要保留的未提交內容：

```bash
git fetch origin
git restore --source=origin/main --worktree -- .github/workflows/actions.lock
gh actions-lock
```

預設分支不叫 `main`，請替換第二行的來源分支；重新產生後檢查差異，再重新暫存確認過的內容。若可信分支的 lockfile 也已損壞，才考慮備份後重建，並逐項審查所有重新解析的依賴，不能把重建當成一般的消錯方式。

## 步驟 5：處理本機 action（`./`）

有些 workflow 會用 repo 自己裡面的 action，寫成 `uses: ./.github/actions/setup` 這樣。這種 `./` 路徑跑的是執行機器上當下取出的檔案，所以擴充功能沒辦法鎖住它，也看不到它裡面又用了哪些 action。

如果這個本機 action 還用了別的 action，`gh actions-lock` 會回報 `local-action` 錯誤，而且什麼都不寫。有兩種處理方式：

- **改成 `$/`（建議）：** 執行 `gh actions-lock --migrate-local-actions`，它會把 workflow 和 repo 內 `action.yml` 裡的 `uses: ./…` 改寫成 `uses: $/…`。`$/` 的意思是「在這個 workflow 所在的 commit，執行 repo 自己的 action」，因此它本身跟著 workflow 的 commit 固定，不需要另外一筆 lockfile entry；它引用的遠端 action 則可以記進 lockfile。如果原流程會 checkout 別的 ref，改寫就可能改變實際執行內容，不能只當成路徑換字。改寫後每一行都要看過。
- **保留 `./`：** 改加 `--ignore-local-actions`，只回報警告。代價是：本機 action 若只含 `run:`，或用到的 action 已記在**同一個 workflow** 的鎖定清單，就可能正常執行；缺少同一個 workflow 的對應紀錄時，job 會在那一步失敗，錯誤訊息類似 `lockfile missing pin for octo-org/setup-tool@v2.0.0`，而且前面的步驟已經跑過了。

## 進階：要求每個 workflow 都要上鎖

前面的步驟讓「已上鎖的 workflow」跑鎖住的版本，但擋不住有人新增一個沒上鎖的 workflow。想強制所有 workflow 都上鎖，可以用 **Require lockfile** 政策（[說明](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)）：

- 企業、組織或 repo 的管理員可以在 Actions 政策裡設定，把它加成 workflow 的執行保護。
- 它有兩種狀態：**Evaluate** 只記錄、不擋（僅限 GitHub Enterprise Cloud）；**Active** 會擋下範圍內所有還沒上鎖的 workflow，包括只有 `run:`、沒有 `uses:` 的 workflow，即使同一個 repo 的其他 workflow 已經上鎖。
- 改成 Active 之前，先在每個目標 repo 跑過 `gh actions-lock --verify`，或在 Evaluate 狀態下查看 Policy insights。
- 開了政策之後，`--verify` 的檢查仍然要留著：政策是在執行時擋下沒有有效 lockfile 的 workflow；`--verify` 則是在 PR 階段就提醒作者 lockfile 過期了。
- 組織若已開「action 必須釘到完整 SHA」的政策，它和 Require lockfile 是各自獨立的檢查，兩個都要通過。已上鎖的 workflow，就算檔案裡沒寫 SHA，也能同時通過兩者。

## lockfile 管不到的地方

> 上鎖之前，先知道這些限制：
>
> - **reusable workflow 不會被鎖：** 在 job 層級用 `jobs.<job_id>.uses` 呼叫的 reusable workflow（可被其他 workflow 呼叫的 workflow）不在 lockfile 裡，要另外釘完整的 commit SHA；它自己用的 action，由它所在 repo 的 lockfile 負責。開了 Require lockfile 政策時，被呼叫的 workflow 若沒有在自己的 repo 上鎖，這次執行會被擋下。
> - **container image 不會被鎖：** README 寫，`docker://` 步驟、job 的 `container:` 與 `services:`，以及 Docker action 的 image／Dockerfile 基底映像都不鎖；沒寫 `@sha256:` digest 的 image 會被列為警告。
> - **只管 action 的程式碼：** 傳給 action 的輸入、secrets、執行機器的系統映像檔，以及 `run:`、安裝腳本另外下載的內容，都不在它的範圍內。鎖住 action 不會限制它的檔案、網路或 token 權限。
> - **不判斷安全：** lockfile 確保跑的是你鎖住的那一版，但不判斷那一版有沒有問題。上鎖前要先審過。
> - **倒退偵測不到：** README 提醒，如果有人在 lockfile 裡，把 `v4`、`main` 這類會移動的參照改回它歷史上較舊的 commit，工具偵測不到。lockfile 的 diff 要有人看，或改用完整版本標籤。
> - **擴充功能不支援 GitHub Enterprise Server。**
{: .prompt-warning }

## 什麼情況怎麼做

| 我想… | 怎麼做 |
| --- | --- |
| 第一次上鎖 | 先開 Dependabot、檢查 `uses:`；裝好擴充功能，在 repo 根目錄執行 `gh actions-lock`；看懂 diff 再提交 |
| 先只鎖一個 workflow | `gh actions-lock .github/workflows/<檔名>.yml` |
| 保留 `@v3` 的寫法 | 執行時加 `--no-narrow` |
| 新增或修改了 `uses:` | 再執行一次 `gh actions-lock` |
| 在 PR 檢查 lockfile 有沒有過期 | 加入 `verify-lockfile.yml` 跑 `gh actions-lock --verify`，並設成必須通過的檢查 |
| 收到 `ref-moved` 警告 | 看過上游變更，要跟上就執行 `gh actions-lock --relock` |
| 完整版本標籤被移動 | 先弄清楚原因，再 `gh actions-lock --relock` 或改寫 `uses:` |
| 鎖住的 commit 不在上游歷史裡 | 人工確認後才 `--accept-moved`，不要放進自動化 |
| 有本機 action（`./`） | `--migrate-local-actions` 改成 `$/` |
| 組織有 action 允許清單 | 改成對應的完整 SHA，或經管理員確認的最小範圍萬用字元 |
| 要求每個 workflow 都上鎖 | 管理員設定 Require lockfile 政策；Enterprise Cloud 可以先用 Evaluate 觀察，再改成 Active |
| lockfile 壞掉 | 從 git 還原後再執行 `gh actions-lock`，不要刪掉重產 |

## 常見錯誤與處理

- **手動改 lockfile：** 擴充功能會拒絕 `ref` 和 workflow 參照對不上的紀錄。要改就改 workflow，再重新執行 `gh actions-lock`。
- **上鎖後，workflow 被允許清單擋下：** 先確認是否因鎖定後改以 SHA 比對；使用對應的完整 SHA 或經管理員審查的有限範圍規則，不要全面放行。
- **出現 `local-action` 錯誤：** 本機 action 裡用了其他 action。用 `--migrate-local-actions` 改成 `$/`，或加 `--ignore-local-actions`，但要承擔執行到一半失敗的風險。
- **job 跑到一半出現 `lockfile missing pin for …`：** 保留 `./` 的本機 action 用了 lockfile 沒記到的 action。改成 `$/` 最省事。
- **新的 workflow 沒被 Dependabot 納入：** Dependabot 不會替你上鎖新 workflow，自己執行一次 `gh actions-lock`。
- **Dependabot 更新後 lockfile 沒動：** 先確認該 workflow 已納入管理，再看 PR 差異與 `--verify` 輸出。只看檔案有沒有變動，不能判斷這次更新是否完整。
- **在 CI 裡自動加 `--accept-moved`：** 拿掉。這正是 lockfile 要攔下的情況。
- **以為 reusable workflow 也鎖住了：** 沒有，`jobs.<job_id>.uses` 要另外釘完整 SHA。
- **檢查成功，卻沒有看到參照移動警告：** v0.4.1 的部分 `ref-moved` 訊息只在 JSON 輸出中，且警告不會讓結束碼失敗；用 `--verify --json` 查看。
- **刪掉 lockfile 重產：** 所有參照會重新解析成現在指到的 commit。改從 git 還原。

## 結論與下一步

`@v3` 是一張可以被移走的貼紙。workflow lockfile 讓你保留好讀的版本號，同時把「實際跑哪個 commit」記下來交給 GitHub 把關：先開 Dependabot，執行 `gh actions-lock`，看懂 diff 再提交，然後用 `--verify` 讓 CI 幫你盯著。標籤被移動時，停下來看一眼，不要讓自動化替你按下 `--accept-moved`。

負責發布的 workflow 特別值得先鎖。[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)拿掉了長期 token，但 workflow 跑的 action 若被換掉，一樣能發出有問題的版本。想替同一條 CI 流程加上自動化審查，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)；更完整的 AI 工作流風險檢查，見 [OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
