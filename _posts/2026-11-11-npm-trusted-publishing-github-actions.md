---
title: "npm Trusted Publishing 設定教學：發套件不再放長期 token"
description: "在 GitHub Actions 用 Trusted Publishing 發布 npm 套件，不必放長期 token。這篇教你怎麼設定，以及設好後怎麼收掉舊權杖。"
date: 2026-11-11 13:00:00 +0800
categories: [資訊安全]
tags: [supply-chain-security, github-actions, ci, application-security]
media_subpath: /assets/img/posts/npm-trusted-publishing-github-actions/
image:
  path: cover.webp
  alt: "用 Trusted Publishing 在 GitHub Actions 發 npm 套件，不必再放長期 token。"
---

先講結論：用 GitHub Actions 自動發布 npm 套件時，可以改用 npm 的 Trusted Publishing，不必再把長期 token 存在 CI 裡。設好之後，還要另外收掉舊 token，風險才算真的降下來。

先認識幾個詞：

- **npm 套件**：放上 npm 登錄庫（registry）、讓別人能用 `npm install` 安裝的程式碼。**發布**（publish）就是把新版本傳上去。
- **CI／CD**：程式一推上去，就自動跑測試、打包、發布的流程。
- **GitHub Actions**：GitHub 內建的 CI／CD 工具。
- **repo**（repository）：GitHub 上存放專案程式碼的地方。
- **workflow**：放在 repo 的 `.github/workflows/` 裡的 YAML 設定檔，寫明要自動做哪些事。
- **runner**：實際執行 workflow 的機器。

為什麼要換？token（權杖）是一串代替帳號密碼的通行碼，誰拿到，就能用你的身分做它允許的事。如果你的自動發布，是把一個 `NPM_TOKEN` 放進 GitHub Actions 的 secrets（GitHub 存放密碼等機密資料的地方），這就是長期 token：在撤銷或到期前一直有效。一旦外洩，別人就能冒你的名發新版。

另一篇[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)是從使用者那端看這個風險：文中的 Nx 案例，依 [Nx 官方安全公告](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c)，攻擊者是透過 GitHub Actions 的注入漏洞取得 npm 發布權杖。本篇改從**發布者**這端，拿掉「長期 token 放在 CI」這個風險。但要先說清楚：Trusted Publishing 擋不下那類事件本身。workflow 若已被注入惡意指令，它照樣可以發布。想讓每個版本多一道人工把關，見後面的〈進階：更嚴格的做法〉。

本篇只談 GitHub 代管的 runner（由 GitHub 提供的機器），搭配 npmjs.com 上的設定。若想幫 workflow 加上自動化審查，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。

> **版本說明**：本文依 2026-11-11 讀取的 npm 官方文件〈[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)〉撰寫；npm 近幾個月仍在調整這項功能（例如 2026-09-03 之後新建的設定，預設只允許 stage publish），設定畫面與預設值以官方文件為準。
{: .prompt-info }

## Trusted Publishing 是什麼、怎麼運作

一句話：[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) 讓 npm 改看「這次發布來自哪個 repo、哪個 workflow」來確認身分，所以 CI 裡不必再存長期 npm token。

它靠的是 OIDC（OpenID Connect），一套讓系統之間出示身分證明的標準。每次發布時，GitHub 會簽發一張短期身分證明（技術上叫 JWT），寫明這是哪個 repo、哪個 workflow。npm 核對它和你事先在 npmjs.com 填好的設定相符，才換發這次發布用的短期憑證。依文件，這種憑證經過加密簽署，只給你的 workflow 用，無法取出，也不能重複使用。

流程可以想成四步：

1. workflow 在 GitHub 代管的 runner 上開始跑。執行發布的 job（workflow 裡的一組步驟）要有 `id-token: write` 權限，才能申請身分證明。
2. GitHub 簽發 OIDC 身分證明，寫明 repo 與 workflow。
3. npm 核對組織或使用者名稱、repo、workflow 檔名都相符，才換發短期憑證。
4. 執行 `npm publish`。若是公開 repo 加上公開套件，npm 還會自動附上 provenance（來源證明：公開記錄這個版本是從哪個 repo、哪個 workflow 建出來的）。

要注意：npm 是**額外**接受 trusted publisher，原本的 token 和手動發布照樣有效。npm CLI 會自動偵測 OIDC 環境，有就優先用它，沒有才退回傳統 token。所以設好之後，舊 token 仍然能發布，要到步驟 4 另外收掉。

![GitHub Actions 用 OIDC 向 npm 換一次性的短期憑證來發布，不必存放 npm token](flow.webp){: w="1600" h="900" }
_概念圖：GitHub Actions 先出示身分證明，npm 核對設定後才換發這次發布用的短期憑證。公開 repo 加上公開套件時，會自動附上 provenance。發布這一步不需要 npm token；安裝私有相依套件仍要 read-only token。_

## 什麼時候該用、什麼時候還不行

**先講結論：** 用 GitHub Actions（GitHub 代管的 runner）自動發布的套件，適合現在就換；自己架的 runner 目前還不行。

**為什麼是現在。** [npm 文件寫明](https://docs.npmjs.com/about-access-tokens)，舊式（legacy）token 已在 2025 年 11 月移除，現在只剩 granular access token（細粒度 token：可以限定它能碰哪些套件、有哪些權限、何時到期）。而用 granular token 直接發布新版本的能力，文件寫將於 2027 年 1 月移除。也就是說，CI 若靠 token 直接發布，到時候就得換方法。npm 在 [CI/CD 說明](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow)裡也建議：從 CI 發布套件，用 trusted publishing，不要用 access token。

**適合用在：** 以 GitHub Actions、GitHub 代管 runner 自動發布的套件。官方也支援 GitLab.com 的 shared runner 和 CircleCI cloud，設定方式見[同一份文件](https://docs.npmjs.com/trusted-publishers)；本篇不展開這兩種平台。

**目前還不行：** self-hosted runner（自己架的執行機器）。[文件寫](https://docs.npmjs.com/trusted-publishers)目前不支援，未來規劃會支援。文件目前列出的支援平台只有上面這三種。

**它不處理這些事：**

- 安裝私有相依套件。相依套件是你的專案要用到的其他套件；其中若有私有的，安裝時仍要一把 read-only（只能讀、不能發布）的 granular token。
- 其他 npm 指令。Trusted Publishing 只管發布；`npm install`、`npm view`、`npm access` 等指令若需要驗證，仍要用傳統方式。

## 步驟 0：先準備這些

開始之前，確認這四件事：

- **版本夠新：** npm CLI 11.5.1 以上、Node.js 22.14.0 以上，這是[官方文件](https://docs.npmjs.com/trusted-publishers)的版本要求。官方範例用 Node 24，目前內附的 npm（11.19.x）已經符合。**Node 22 內附的 npm 是 10.x，不到 11.5.1**；一定要用 Node 22 的話，請在發布前先升級 npm，例如在 workflow 加一步 `npm install -g npm@latest`。
- **`repository.url` 完全一致：** `package.json`（套件的設定檔，記錄名稱、版本等資訊）裡的 `repository.url`，必須和你的 GitHub repo **完全一致**，大小寫也要相同。從 fork（複製別人的 repo 而來）的專案若沒改這個欄位，發布會失敗。
- **帳號與 2FA：** 你的 npm 帳號要能管理這個套件，並已開啟 2FA（兩步驟驗證：除了密碼，還要再輸入一組驗證碼）。步驟 4 會把套件改成「發布必須 2FA」，進階的 stage publish 核准也要用 2FA。
- **套件已經在 npm 上：** 設定入口在既有套件的 Settings 頁。官方文件沒有另外寫「全新套件」該怎麼設定。

**你會得到：** 版本夠新、`repository.url` 對得上 GitHub repo 的專案，可以開始填表。

## 步驟 1：在 npmjs.com 新增 Trusted Publisher

這一步是告訴 npm：要信任哪個 repo 的哪個 workflow。

到 [npmjs.com](https://www.npmjs.com) 打開你的套件，進入 **Settings**，找到 **Trusted Publisher** 區塊，在 **Select your publisher** 選 **GitHub Actions**。文件寫的管理路徑是：Packages → 你的套件 → Settings → Trusted publishing。

**先分清楚兩種介面。** npm 文件把設定分成兩個版本，可以在文件頁面頂端切換：

- **Multiple trusted publishers**：一個套件最多可設 10 個 trusted publisher。
- **Single trusted publisher**：一個套件一次只能設 1 個。

兩種介面的預設值、期限和能不能修改都不一樣，下面分開說明。請對照你在 npmjs.com 看到的畫面，讀文件對應的那一版。

要填的欄位：

- **Organization or user**（必填）：GitHub 使用者名稱或組織名。
- **Repository**（必填）：repo 名稱。例如 repo `my-lib` 放在 `octo-org` 底下，這兩欄就分別填 `octo-org` 和 `my-lib`。
- **Workflow filename**（必填）：只填檔名，例如 `publish.yml`，不要填完整路徑；要含 `.yml` 或 `.yaml`，而且這個檔必須放在 `.github/workflows/`。若發布拆成兩個 workflow，要填「呼叫端」的檔名，見後面〈特殊情況：發布拆成兩個 workflow〉。
- **Environment name**（選填）：GitHub 的 environment 是可以加上人工核准等保護規則的部署關卡。有用才填，沒用就留空。
- **Allowed actions**：允許這個 publisher 做哪些動作。

**Allowed actions 一定要看。** 它有兩個選項：`npm publish` 是直接發布、立刻公開；`npm stage publish` 是先把版本送進暫存區，等維護者用 2FA 核准後才公開。

- Multiple 介面：`npm stage publish` 一律允許，`npm publish` 要另外勾。依文件，2026-09-03 之後新建的設定，**預設只允許 `npm stage publish`**。
- Single 介面：這一欄必填，兩項至少勾一項。

不管哪一種介面，要讓步驟 2 範例裡的 `npm publish` 成功，**都要勾選 `npm publish`**。只允許 `npm stage publish` 是更嚴格的做法，留到後面的〈進階〉。

**存檔前要知道：**

1. 所有欄位都分大小寫，必須完全一致。
2. npm 存檔時**不會驗證**設定。填錯不會當場報錯，要到真正發布時才會失敗。
3. Multiple 介面的既有設定不能修改，填錯只能刪掉重建；Single 介面則可以隨時修改或移除。
4. Multiple 介面的新設定[必須在 2 天內完成第一次成功發布](https://docs.npmjs.com/trusted-publishers)，否則會過期，之後不能再使用或編輯，只能刪掉重建。所以建議先看完步驟 2、把 workflow 準備好，再回來存這張表。

**你會得到：** npm 上的一筆 Trusted Publisher 設定，等 workflow 來對。

## 步驟 2：寫 workflow

在 repo 裡新增 `.github/workflows/publish.yml`，貼上下面這份 [npm 官方範例](https://docs.npmjs.com/trusted-publishers)。檔名要和你在 npmjs.com 填的一致：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false  # never use caching in release builds

      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm publish  # Or: npm stage publish
```

逐行對照：

- `on: push: tags: v*`：只有推上 `v1.2.3` 這類 tag 才會發布。tag（標籤）是替某次 commit（提交）標上的名稱，常用來標記版本；一般的 commit 不會觸發發布。
- `permissions: id-token: write`：最關鍵的一行，讓 GitHub 能為這個 job 簽發 OIDC 身分證明。[GitHub 文件](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token)寫，它只允許取得 OIDC token，不會因此給其他資源寫入權限。
- `contents: read`：讓 job 能讀取 repo 內容。[GitHub 文件](https://docs.github.com/en/actions/reference/security/oidc)的範例註明，`actions/checkout` 取出程式碼需要這個權限。
- `runs-on: ubuntu-latest`：使用 GitHub 代管的 runner。
- `setup-node` 的 `registry-url` 指向 npm 官方登錄庫；`package-manager-cache: false` 照官方註解：release 建置不要用快取。
- 最後依序安裝相依（`npm ci`）、建置、測試，再 `npm publish`。如果你在 Allowed actions 只允許 stage publish，這一行要改用註解裡的 `npm stage publish`。

發布這一步**不需要** `NODE_AUTH_TOKEN`，也**不需要**加 `--provenance`：只要是公開 repo、公開套件，又是用 Trusted Publishing 發布，npm 會自動產生 provenance。`actions/checkout`、`actions/setup-node` 若出了更新的主版本，以各自 README 為準；本文範例照 npm 官方文件，使用 `@v6`。

**有私有相依套件時**，在 `npm ci` 那一步加上：

{% raw %}
```yaml
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}
```
{% endraw %}

這裡的 `NPM_READ_TOKEN` 必須是 **read-only** 的 granular token，只用來安裝，不能發布。建立方式：在 npmjs.com 點頭像 → **Access Tokens** → **Generate New Token**，Permissions 選 **Read-only**（目前不能用 CLI 建立 granular token）。建好後存進 repo 的 secrets，名稱和範例一樣叫 `NPM_READ_TOKEN`。

**scoped 套件第一次公開發布時：** scoped 套件是名稱以 `@` 開頭、像 `@組織/套件` 的套件。npm 的〈[Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)〉寫，scoped 套件預設以私有可見度發布，要公開就用 `npm publish --access public`；[provenance 文件](https://docs.npmjs.com/generating-provenance-statements)也提醒，第一次發布時要明確設成公開。

**你會得到：** 一份不必存放發布用 token 的 workflow。

## 步驟 3：跑一次、確認成功

在 repo 推一個符合 `v*` 的 tag（例如 `v1.2.3`），觸發上面的 workflow。

怎麼判斷成功：

- **看發布結果：** workflow 的 `npm publish` 這一步沒有報錯，npm 上出現這個新版本。npm 存檔時不驗證設定，所以設定對不對，要真的發布一次才知道。
- **看 provenance：** 若同時符合「Trusted Publishing、公開 repo、公開套件」三個條件，這個版本會自動附上 provenance。依〈[Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance)〉，npmjs.com 套件頁 README 右側的 Version 欄會出現綠色勾勾，點開可以看到建置環境、來源 commit 等細節。private repo 本來就不會產生 provenance，沒看到不代表設定失敗。
- **不要用 `npm whoami` 確認：** 文件寫，這個指令不是用來檢查 trusted publishing 權限的。

發布失敗的話，對照後面的〈常見錯誤與處理〉。用 Multiple 介面時記得 2 天期限：過期就只能刪掉重建。

**下一步：** 確認成功後，再收掉舊 token，順序不要顛倒。

## 步驟 4：收掉舊 token

設好 Trusted Publishing，舊 token 不會自動失效。npm 是在原本的 token 和手動發布之外，**額外**接受 trusted publisher。所以要照文件的 Migration tip（遷移建議）依序收尾：

1. 先設好 Trusted Publishing，並確認發布成功。
2. 到套件的 **Settings → Publishing access**，選 **Require two-factor authentication and disallow tokens**，再按 **Update Package Settings**。之後 granular token 一律不能發布這個套件；trusted publisher 用的是 OIDC，不受影響。
3. 撤銷不再需要的 token：在 npmjs.com 點頭像 → **Access Tokens**，點該 token 的 **×**，或勾選後按 **Delete Selected Tokens**；也可以在終端機用 `npm token list` 找出 ID，再執行 `npm token delete <id>`。文件寫，撤銷最多可能要一小時才生效。說明見 [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens)。

撤銷後，GitHub secrets 裡原本發布用的 `NPM_TOKEN` 也就用不到了，可以一併刪除。

**你會得到：** 發布改走 OIDC，舊的長期 token 不再能發新版。

## 特殊情況：發布拆成兩個 workflow

有些專案會把發布拆成兩個 workflow：一個負責呼叫（呼叫端），一個真正執行 `npm publish`（被呼叫端）。被呼叫的那份要在 `on` 裡寫 `workflow_call`，別的 workflow 才能呼叫它；這種寫法叫 reusable workflow。

這時有兩件事容易填錯：

- **兩層都要給 `id-token: write`。** npm 文件要求呼叫端和被呼叫端都要有。[GitHub 文件](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)也寫，被呼叫的 workflow 只能降低、不能提高呼叫端傳來的權限；呼叫端沒給，被呼叫端也拿不到。
- **npmjs.com 要填呼叫端的檔名。** npm 驗證的是呼叫端 workflow 的檔名，不是真正寫著 `npm publish` 的那一份。文件也提到，用 `workflow_dispatch`（從 GitHub 網頁手動觸發）發布時，也可能出現類似的不相符。

例如呼叫端叫 `release.yml`、被呼叫端叫 `publish.yml`：

```yaml
# .github/workflows/release.yml（呼叫端）
name: Release
on:
  release:
    types: [published]
permissions:
  contents: read
jobs:
  call-publish:
    permissions:
      contents: read
      id-token: write
    uses: ./.github/workflows/publish.yml
```

```yaml
# .github/workflows/publish.yml（被呼叫端）
name: Publish Package
on:
  workflow_call:
permissions:
  contents: read
  id-token: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm ci
      - run: npm test
      - run: npm publish
```

這時 npmjs.com 要填 `release.yml`，不是 `publish.yml`。

![拆成兩個 workflow 時，兩邊都要給 id-token: write，npmjs.com 要填呼叫端的檔名](reusable-workflow.webp){: w="1600" h="900" }
_概念圖：左邊是呼叫端 release.yml，右邊是被呼叫端 publish.yml；兩邊都要給 id-token: write，npmjs.com 要填的是呼叫端檔名。_

## 進階：更嚴格的做法

Trusted Publishing 拿掉了長期 token，但 workflow 本身若被攻破，仍然可以發布。想多加關卡，文件建議這幾種，不必一次全做：

- **environment 加人工核准：** 在 GitHub 為發布 job 指定 environment，並設定需要人工核准；npmjs.com 的 **Environment name** 要填同一個名稱。
- **tag protection rules：** 限制誰能推送發布用的 tag。
- **只允許 stage publish：** Allowed actions 只留 `npm stage publish`，workflow 的最後一行也改成 `npm stage publish`。每個版本會先進暫存區，維護者用 2FA 核准後才公開；核准可以在 npmjs.com 套件的 **Staged Packages** 分頁按 **Approve**，或用 `npm stage approve <stage-id>`。文件把「trusted publisher 只允許 stage publish」視為更強的組合。這需要 npm CLI 11.15.0 以上，細節見 [Staged publishing](https://docs.npmjs.com/staged-publishing)。
- **定期檢查：** 定期稽核套件的 trusted publisher 設定，刪掉沒在用的發布 token。

## 限制

![設定 Trusted Publishing 的六項清單，以及四個要先知道的限制](checklist.webp){: w="1600" h="900" }
_概念圖：左邊把本文步驟 0 到步驟 4 整理成六項清單，右邊是四個最常碰到的限制：self-hosted runner、private repo 沒有 provenance、私有相依仍要 token，以及 publisher 數量依介面而不同。清單裡的 2 天期限只適用 Multiple 介面；完整的限制見下方。_

> 使用前請先看這些限制：
>
> - 目前不支援 self-hosted runner。
> - Trusted Publishing 擋不下 workflow 注入：workflow 若已被注入惡意指令，它照樣可以發布。
> - provenance 只在「Trusted Publishing、公開 repo、公開套件」同時成立時自動產生。[文件寫](https://docs.npmjs.com/trusted-publishers)，private repo 不會產生 provenance，即使發布的是公開套件也一樣；CircleCI 目前也不產生。
> - provenance 讓人查證「這個版本從哪裡建出來」，[「並不保證套件沒有惡意程式」](https://docs.npmjs.com/generating-provenance-statements)。
> - 安裝私有相依套件仍需要 read-only token。
> - 可設定的 publisher 數量依介面而定：Multiple 介面最多 10 個，Single 介面一次只能 1 個。
> - Multiple 介面的既有設定不能修改，只能刪掉重建。
{: .prompt-warning }

## 什麼情況怎麼做

| 我想… | 怎麼做 |
| --- | --- |
| 第一次設定 | 先核對版本與 `repository.url`；在 npmjs.com 新增 GitHub Actions publisher 並勾選 `npm publish`；寫好帶 `id-token: write` 的 workflow；Multiple 介面要在 2 天內完成第一次發布 |
| 確認設定成功 | 實際發布一次；npm 存檔時不驗證，`npm whoami` 也不能用來確認 |
| 發布出現 ENEEDAUTH | 核對 workflow 檔名（含副檔名）、大小寫、GitHub 代管 runner，以及 `id-token: write` |
| 設定填錯要改 | Multiple 介面：刪掉重建；Single 介面：直接修改 |
| 設定過期了 | 刪掉重建，再於 2 天內完成發布 |
| 用 Node 22 | 發布前先把 npm 升級到 11.5.1 以上，或改用 Node 24 |
| 有私有相依 | `npm ci` 加 read-only 的 `NODE_AUTH_TOKEN` |
| workflow 拆兩層 | 兩層都給 `id-token: write`；npmjs.com 填呼叫端檔名 |
| 用 self-hosted runner | 目前不支援，還不能改用 Trusted Publishing |
| 想讓每個版本都要人核准 | environment 加核准，或 Allowed actions 只留 `npm stage publish` |
| 設好之後還有舊 token | 先確認發布成功，再改 Publishing access，最後撤銷 token |

## 常見錯誤與處理

照做時最容易卡住的地方，以及怎麼處理：

- **出現 `ENEEDAUTH` 或「Unable to authenticate」：** 核對 npmjs.com 上的 workflow 檔名（要含 `.yml` 或 `.yaml`）和所有欄位的大小寫；確認用的是 GitHub 代管 runner；確認 workflow 有 `id-token: write`。
- **`repository.url` 對不上：** `package.json` 的 `repository.url` 要和 GitHub repo 完全一致。從 fork 來的專案要特別檢查。
- **Allowed actions 沒勾 `npm publish`：** 2026-09-03 之後在 Multiple 介面新建的設定，預設只允許 stage publish。這種介面的既有設定不能改，要刪掉重建、勾選 `npm publish`，再於 2 天內發布。
- **設定過期：** Multiple 介面的新設定若 2 天內沒有成功發布，就會過期。刪掉重建，再於 2 天內發布。
- **用了 `workflow_call`，卻填被呼叫端的檔名：** 改填呼叫端的檔名，並確認兩層都有 `id-token: write`。
- **用 Node 22，卻沒升級 npm：** Node 22 內附 npm 10.x，不到 11.5.1。發布前先升級 npm，或改用 Node 24。
- **私有相依安裝失敗：** `npm ci` 需要 read-only token；Trusted Publishing 不負責安裝。
- **以為沒有 provenance 就是失敗：** private repo 本來就不會產生 provenance。
- **用 `npm whoami` 檢查：** 文件寫，這個指令不是用來檢查 trusted publishing 權限的。
- **以為設好就讓舊 token 失效：** 還要改 Publishing access，並撤銷不再使用的 token。

## 結論與下一步

把 GitHub Actions 的發布從「放一把長期鑰匙」改成「每次當場換短期憑證」之後，記得收掉舊 token，必要時再加上核准或 stage publish。使用者那一端還能怎麼降低風險，見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)；若要幫這些 workflow 加自動化審查，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。

官方說明以 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 為準，並可參閱 [provenance](https://docs.npmjs.com/generating-provenance-statements)、[about access tokens](https://docs.npmjs.com/about-access-tokens)、[staged publishing](https://docs.npmjs.com/staged-publishing)，以及 [GitHub 的 OIDC 說明](https://docs.github.com/en/actions/concepts/security/openid-connect)。本站其他資安文章，也可看 [OpenSSH 密碼驗證繞過漏洞 CVE-2026-123158：Alpine 怎麼修補](/posts/openssh-musl-password-bypass-alpine/)。
