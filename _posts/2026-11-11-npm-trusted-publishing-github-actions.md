---
title: "發 npm 套件不再放長期 token：Trusted Publishing 設定教學"
description: "在 GitHub Actions 用 Trusted Publishing 發布 npm 套件，不必放長期 token。這篇教你怎麼設定，以及設好後怎麼收掉舊權杖。"
date: 2026-11-11 13:00:00 +0800
categories: [資訊安全]
tags: [supply-chain-security, github-actions, ci, application-security]
media_subpath: /assets/img/posts/npm-trusted-publishing-github-actions/
image:
  path: cover.webp
  alt: "用 Trusted Publishing 在 GitHub Actions 發 npm 套件，不必再放長期 token。"
---

如果我在 GitHub Actions 的 secrets（存放密碼類設定的地方）放了一個 `NPM_TOKEN` 來自動發布，那是一把撤銷前一直有效的鑰匙。token（權杖）是一串代替帳號密碼的通行碼，誰拿到就能用你的身分做它允許的事；長期 token（long-lived token）則是在撤銷或到期前一直有效。外洩之後，別人就能冒名發新版。

這件事從使用者那端看過：[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/) 裡的 Nx 案例，攻擊者就是透過 GitHub Actions 的注入漏洞取得 npm 發布權杖。本篇改從**發布者**這端減少「長期 token 放在 CI」這個風險。它不能擋下那類事件本身：若 workflow 已被注入，Trusted Publishing 仍然可以發布。也因此，後面會提到用 environment 核准，或改用 stage publish，讓每個版本多一道人工把關。

CI／CD 是程式一推上去就自動跑測試、打包、發布的流程。GitHub Actions 是 GitHub 內建的自動化，workflow 則是放在 `.github/workflows/` 裡的一份 YAML 設定檔；實際執行它的機器叫 runner。本篇只展開 GitHub 代管的 runner，搭配 npmjs.com 的設定。若你想看怎麼幫 workflow 加上自動化審查，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。

> **版本說明**：本文依 2026-11-11 讀取的 npm 官方文件〈[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)〉撰寫；npm 這半年持續調整這項功能（例如允許的動作、staged publishing），設定畫面與預設值以官方文件為準。
{: .prompt-info }

## Trusted Publishing 是什麼、怎麼運作

[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) 讓你在 CI 裡發布 npm 套件時，不必再存放長期 npm token。每次發布，GitHub Actions 用 OIDC（OpenID Connect，一套「出示身分證明」的標準）開一張短期身分證明（JWT），寫明這是哪個 repo、哪個 workflow；npm 核對你事先填好的設定相符後，才換發一張只在這次 job 有效、用完就失效的短期憑證。文件的原句是：each publish uses short-lived, cryptographically-signed tokens that are specific to your workflow and cannot be extracted or reused。翻譯：每次發布都使用針對這個 workflow、經過加密簽署的短期憑證，無法取出，也不能重複使用。

流程可以想成四步：

1. GitHub Actions 開始跑，且這個 job 有 `id-token: write`，跑在 GitHub 代管的 runner 上。
2. GitHub 發出 OIDC 身分證明，寫明 repo 與 workflow。
3. npm 核對組織或使用者名稱、repo、workflow 檔名都相符，才換發短期憑證。
4. 執行 `npm publish`。若是公開 repo 加上公開套件，還會自動附上 provenance（來源證明，公開記錄這個版本是從哪個 repo、哪個 workflow 建出來的）。

npm CLI 會先自動偵測 OIDC 環境並用它來驗證，再退回使用傳統 token。也就是說，設好之後，舊的 token 暫時還能發布，後面要另外收掉。

![GitHub Actions 用 OIDC 向 npm 換一次性的短期憑證來發布，不必存放 npm token](flow.webp){: w="1600" h="900" }
_概念圖：GitHub Actions 先出示身分證明，npm 核對設定後才換發這次發布用的短期憑證。公開 repo 加上公開套件時，會自動附上 provenance。發布這一步不需要 npm token；安裝私有相依套件仍要 read-only token。_

## 什麼時候該用、什麼時候還不行

現在換還有時間上的理由。[npm 文件寫明](https://docs.npmjs.com/about-access-tokens)：舊式（legacy）token 已於 2025 年 11 月移除；用 granular token 直接發布新版本的能力，將於 2027 年 1 月移除。

適合用在：以 GitHub Actions（GitHub 代管的 runner）自動發布的套件。官方同樣支援 GitLab.com 的 shared runner 與 CircleCI cloud，設定方式見[同一份文件](https://docs.npmjs.com/trusted-publishers)；本篇不展開這兩種平台。

目前還不行的情況：self-hosted runner（自己架的執行機器）。[文件寫](https://docs.npmjs.com/trusted-publishers)：目前不支援，未來規劃會支援。其他未列出的 CI 平台也還不能用這個方法。

它也不解決這些事：安裝私有相依套件（仍要 read-only token，也就是只能讀、不能發布的細粒度權杖）；`npm install`、`view`、`access` 等其他指令，仍需傳統驗證方式。

## 步驟 0：先準備這些

開始之前，請確認：

- npm CLI 11.5.1 或更新，Node.js 22.14.0 或更新。[官方文件的版本要求](https://docs.npmjs.com/trusted-publishers)就是這兩行。官方範例用 Node 24；Node 22 內附的 npm 是 10.x，不到 11.5.1。若你一定要用 Node 22，請在發布前先升級 npm，例如加一步 `npm install -g npm@latest`。
- `package.json` 的 `repository.url` 必須和 GitHub repo **完全一致**。從 fork 來的專案若沒改這個欄位，發布會失敗。
- 你要有這個套件的發布權限，而且帳號已開 2FA（兩步驟驗證）。改套件設定需要 2FA。
- 套件已經存在於 npm。官方文件的設定入口在既有套件的 Settings 頁；文件沒有另寫「全新套件」的流程。

**你會得到：** 一份對得上 GitHub repo、版本也夠新的專案，可以開始填表。

## 步驟 1：在 npmjs.com 新增 Trusted Publisher

到 [npmjs.com](https://www.npmjs.com) 打開你的套件，進入 **Settings**，找到 **Trusted Publisher**，在 **Select your publisher** 選 **GitHub Actions**。路徑也可以記成：Packages → 你的套件 → Settings → Trusted publishing。

要填的欄位是：

- **Organization or user**（必填）：GitHub 使用者名稱或組織名
- **Repository**（必填）：repo 名稱
- **Workflow filename**（必填）：只填檔名，例如 `publish.yml`，要包含 `.yml` 或 `.yaml`，而且這個檔必須在 `.github/workflows/`
- **Environment name**（選填）：若你用 GitHub environment 做部署保護，才填
- **Allowed actions**：允許這個 publisher 做哪些事

Allowed actions 要特別看一眼。依文件，2026-09-03 之後新建的設定，在可設定多個 publisher 的介面上，**預設只允許 `npm stage publish`**。若你要讓稍後範例裡的 `npm publish` 成功，**請勾選允許 `npm publish`**。若帳號看到的是一次只能設一個 publisher 的介面，則至少要勾一項。另一種更嚴的做法是只允許 `npm stage publish`，留給後面的進階節。

另外，依你帳號看到的介面，可能可以設多個 trusted publisher（最多 10 個），也可能一次只能設一個。「最多 10 個」只出現在 Multiple trusted publishers 的文件說明裡。

所有欄位大小寫都要完全一致。npm 在你存檔時**不會驗證**這些設定，填錯要到真正發布時才會報錯。若你看到的是可設定多個 publisher 的介面，[新設定必須在 2 天內完成第一次成功發布](https://docs.npmjs.com/trusted-publishers)，否則會過期，不能再使用或編輯，只能刪掉重建。填完表，就去跑一次發布。

**你會得到：** npm 上的一筆 Trusted Publisher 設定，等 workflow 來對。

## 步驟 2：寫 workflow

下面這份是 [npm 官方範例](https://docs.npmjs.com/trusted-publishers)，可直接複製到 `.github/workflows/publish.yml`（檔名請和你在 npmjs.com 填的一致）：

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

- `on: push: tags: v*`：只有推上 `v1.2.3` 這種 tag 才會發布，避免每次 commit 都上架。
- `permissions: id-token: write`：最關鍵。這是讓 GitHub 的 OIDC 提供者開出那張身分證明。[GitHub 文件](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token)寫：它只允許請求 OIDC token，不會因此給其他資源寫入權限。
- `contents: read`：讓這個 job 能讀取 repo 內容。
- `runs-on: ubuntu-latest`：使用 GitHub 代管的 runner。
- `setup-node` 的 `registry-url` 指向 npm 官方登錄庫；`package-manager-cache: false` 是官方註解裡的做法：release 建置不要用快取。
- 接著安裝相依、建置、測試，最後 `npm publish`。

這份流程**不需要** `NODE_AUTH_TOKEN`，也**不需要**加 `--provenance`。公開 repo、公開套件、而且是用 Trusted Publishing 發布時，npm 會自動產生 provenance。`actions/checkout`、`actions/setup-node` 若有更新的主版本，以各自 README 為準；本文範例照 npm 官方文件，使用 `@v6`。

若套件有私有相依，在 `npm ci` 那一步加上：

{% raw %}
```yaml
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}
```
{% endraw %}

這裡要用 **read-only** 的 granular access token（細粒度 token，可限制套件、權限和到期日）。第一次把 scoped 套件（名稱像 `@組織/套件`）以公開方式發布時，還需要 `--access public`，否則可能以受限權限上架。

**你會得到：** 一份不必存放 `NPM_TOKEN` 的發布 workflow。

## 步驟 3：跑一次、確認成功

在 repo 推一個符合 `v*` 的 tag，觸發上面的 workflow。成功之後，若符合「Trusted Publishing、公開 repo、公開套件」這三個條件，套件頁面會顯示 provenance 資訊。這是文件描述你應該看到的結果，用來確認設定有生效。

**下一步：** 確認成功後，再收掉舊 token，不要顛倒順序。

## 用 workflow_call 時

有些專案會把發布拆成兩個 workflow：一個負責呼叫，一個真正執行 `npm publish`。被呼叫的那份要在 `on` 裡寫 `workflow_call`（讓別的 workflow 可以呼叫它），這種寫法叫 reusable workflow。

這時有兩件容易填錯的事：

- **兩層都要**給 `id-token: write`，呼叫端和被呼叫端缺一不可。
- npm 驗證的是**呼叫端** workflow 的檔名，不是真正寫著 `npm publish` 的那一份。所以 npmjs.com 的 Workflow filename 要填呼叫端的檔名。文件提到，用 `workflow_dispatch` 手動觸發時，也會有類似狀況。

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

## 步驟 4：收掉舊 token

Trusted Publishing 是「額外」接受的驗證方式，傳統 token 和手動發布都還在。所以要照文件的 Migration tip，按這個順序收尾：

1. 先設好 Trusted Publishing，並確認一次發布成功。
2. 到套件的 **Settings → Publishing access**，選 **Require two-factor authentication and disallow tokens**，再按 **Update Package Settings**。這個選項只擋住傳統 token，不會影響已設定的 trusted publisher。
3. 最後撤銷不再需要的 token：點頭像 → **Access Tokens** → 刪除；或在終端機用 `npm token list`，再 `npm token delete <id>`。文件寫，撤銷最多可能延遲一小時才完全生效。說明見 [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens)。

**你會得到：** 發布改走 OIDC，舊的長期權杖不再能發新版。

## 進階：更嚴格的做法

若還想多加關卡，文件建議這幾種，不必一次全做：

- 在 GitHub 為發布 job 指定 environment，並加上人工核准；npmjs.com 的 **Environment name** 也要填同一個名稱。
- 使用 tag protection rules，限制誰能推送發布用的 tag。
- 在 Allowed actions 只允許 `npm stage publish`，讓每個版本先進入暫存區，再由維護者用 2FA 核准才上架。文件把「trusted publisher 只允許 stage publish」稱為較強的組合。這需要 npm CLI 11.15.0 或更新，細節見 [Staged publishing](https://docs.npmjs.com/staged-publishing)。

## 限制

![設定 Trusted Publishing 的六個步驟，以及四個要先知道的限制](checklist.webp){: w="1600" h="900" }
_概念圖：左邊是設定的六個步驟，右邊是四個要先知道的限制，包括 self-hosted runner、provenance 的條件、私有相依，以及 publisher 數量依介面而不同。_

> 使用前請先看這些限制：
>
> - 目前不支援 self-hosted runner。
> - [文件原文](https://docs.npmjs.com/generating-provenance-statements)：Provenance generation is not supported for private repositories, even when publishing public packages. 翻譯：私有 repo 不會產生 provenance，即使發布的是公開套件也一樣。CircleCI 目前也不產生 provenance。
> - provenance 讓人查證「這個版本從哪裡建出來」，[「並不保證套件沒有惡意程式」](https://docs.npmjs.com/generating-provenance-statements)。
> - 安裝私有相依仍需要 read-only token。
> - 可設定的 publisher 數量依介面而定：有的最多 10 個，有的一次只能一個。
> - 在可設定多個 publisher 的介面，既有設定不能修改，只能刪掉重建。
{: .prompt-warning }

## 什麼情況怎麼做

| 我想… | 怎麼做 |
| --- | --- |
| 第一次設定 | 先核對版本與 `repository.url`，在 npmjs.com 新增 GitHub Actions publisher，勾選 `npm publish`，寫好帶 `id-token: write` 的 workflow，然後在 2 天內完成第一次發布 |
| 發布出現 ENEEDAUTH | 核對 workflow 檔名（含副檔名）、大小寫、GitHub 代管 runner，以及 `id-token: write` |
| 用 Node 22 | 發布前先把 npm 升級到 11.5.1 以上，或改用 Node 24 |
| 有私有相依 | `npm ci` 加 read-only 的 `NODE_AUTH_TOKEN` |
| workflow 拆兩層 | 兩層都給 `id-token: write`；npmjs.com 填呼叫端檔名 |
| 用 self-hosted runner | 目前不要用 Trusted Publishing |
| 想讓每個版本都要人核准 | environment 加核准，或 Allowed actions 只留 `npm stage publish` |
| 設好之後還有舊 token | 先確認發布成功，再改 Publishing access，最後撤銷 token |

## 常見錯誤

- 出現 `ENEEDAUTH`、「Unable to authenticate」：先核對 workflow 檔名（要含 `.yml` 或 `.yaml`）、所有欄位大小寫、是否使用 GitHub 代管 runner，以及有沒有 `id-token: write`。
- `package.json` 的 `repository.url` 和實際 GitHub repo 不一致。
- Allowed actions 沒勾 `npm publish`，尤其是 2026-09-03 之後新建、預設只允許 stage publish 的設定。
- 可設定多個 publisher 的介面上，超過 2 天沒完成第一次成功發布，設定已過期。
- 使用 `workflow_call` 時，把 npmjs.com 的檔名填成被呼叫端。
- 只升級 Node 22，卻沿用內建的 npm 10.x。
- 以為執行 `npm whoami` 可以確認 Trusted Publishing 有沒有生效。文件寫：這個指令不是用來檢查 trusted publishing 權限的。
- 設好就以為舊 token 立刻失效。其實要改 Publishing access，並撤銷不再使用的 token。

## 結論與下一步

把 GitHub Actions 的發布從「放一把長期鑰匙」改成「每次當場換短期憑證」之後，記得收掉舊 token，必要時再加上核准或 stage publish。使用者那一端還能怎麼降低風險，見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)；若要幫這些 workflow 加自動化審查，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。

官方說明以 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 為準，並可參閱 [provenance](https://docs.npmjs.com/generating-provenance-statements)、[about access tokens](https://docs.npmjs.com/about-access-tokens)、[staged publishing](https://docs.npmjs.com/staged-publishing)，以及 [GitHub 的 OIDC 說明](https://docs.github.com/en/actions/concepts/security/openid-connect)。同站其他安全設定，也可看 [OpenSSH 密碼驗證繞過漏洞：哪些主機受影響，Alpine 使用者怎麼修補？](/posts/openssh-musl-password-bypass-alpine/)。
