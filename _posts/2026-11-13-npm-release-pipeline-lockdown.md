---
title: "開了 Trusted Publishing 還不夠：npm 發布流程也要上鎖"
description: "tensorlake 的惡意版本帶著合法的 provenance。這篇用 GitHub environment、ruleset 和 npm staged publishing 把發布流程上鎖，替程式碼、發布觸發與套件公開各加一道審查關卡。"
date: 2026-11-13 20:00:00 +0800
categories: [資訊安全, 供應鏈]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.webp
  alt: "在 npm 發布流程的四個環節各加一道鎖：改程式碼、推 tag、發布 job、npm 公開。"
---

Trusted Publishing 讓 CI 不必再保存長期發布 token，但它不會替你檢查程式碼。如果攻擊者能修改發布會用到的內容，又能觸發已授權的 workflow，就可能借用你的發布流程送出惡意版本，連來源證明都是真的。

要降低這種風險，不能只換掉驗證方式，還得檢查誰能合併程式碼、誰能建立發布 tag、哪個 job 可以取得發布權限，以及版本公開前有沒有人確認內容。這篇會把這些關卡串起來，最後讓 CI 只能送出暫存版本，由維護者在 npm 核准後才公開。

這是[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)的續篇。OIDC、`id-token: write` 的基本設定不再重講；還沒設好 Trusted Publishing，請先看那篇。

先認識幾個詞：

- **provenance（來源證明）**：讓人查證套件版本的來源 repo、建置 workflow 與相關 commit 的記錄，不是程式碼安全認證。
- **tag（標籤）**：指向某個 commit 的版本標記，例如 `v1.2.3`。上一篇的 workflow 用 `v*` tag 觸發發布。
- **GitHub environment**：可替 job 加上必要審核者、允許的分支與 tag 等部署規則；job 必須先通過規則才開始執行。
- **ruleset（規則集）**：限制分支與 tag 如何建立、更新或刪除的 repo 規則。
- **staged publishing（暫存發布）**：先把套件送進暫存區，維護者審查並通過 2FA 核准後，該版本才公開。
- **2FA（雙因素驗證）**：登入或敏感操作時，除了原本的驗證方式，再提供第二種驗證因素，不限於輸入驗證碼。

> **版本說明**：本文依 2026-11-13 讀取的 GitHub [environment 文件](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[ruleset 文件](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)，以及 npm 的 [Trusted publishing](https://docs.npmjs.com/trusted-publishers) 與 [Staged publishing](https://docs.npmjs.com/staged-publishing) 文件整理，未實際變更 GitHub 或 npm 的發布設定。方案、介面與版本要求請以對應的官方文件為準。
{: .prompt-info }

## 真實案例：來源證明是真的，內容卻是惡意的

2026 年 10 月 8 日，npm 套件 `tensorlake` 出現惡意版本 `0.5.144`。依 [tensorlake 官方安全公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 攻擊者利用被盜的維護者帳號，把惡意程式碼推進 repo。
- 版本經過專案自己的 release workflow 發布，因此帶有有效的 npm provenance。
- 惡意程式在安裝時竊取 GitHub、npm 與雲端服務等憑證，再利用這些權限向其他套件與 repo 散播。
- 該版本在 npm 上存活約 1 小時 40 分鐘（當天 UTC 01:12 到 02:54）。

這個案例證明的是：**合法的建置來源，也可能產出惡意內容。** 公告沒有交代當時所有的發布驗證與保護設定，所以不能只憑 provenance 就推論他們用了 Trusted Publishing，也無從判斷是哪一道保護遭到繞過。不過，它清楚說明了為什麼不能只驗證「從哪個 workflow 發出來」。

## provenance 證明什麼、不證明什麼

可以把 provenance 想成包裹上的出貨單：能回頭查到這批貨出自哪間工廠、哪條產線，但不會告訴你每個零件有沒有被動過手腳。

npm 的 [provenance 文件](https://docs.npmjs.com/generating-provenance-statements)也提醒，來源證明不保證套件沒有惡意程式。它讓來源更容易查證，內容仍需要審查。

![provenance 能提供建置來源線索，不能保證套件內容安全](provenance.webp){: w="1600" h="900" }
_出貨單是真的，不代表內容一定安全。tensorlake 的公告確認惡意版本經過專案自己的發布流程，並帶有有效 provenance。_

## 把發布流程分成四個關卡

以本文的 tag 發布流程為例，要讓一個版本公開，通常會經過以下四個環節：

| 環節 | 要確認的事 | 對應設定 |
| --- | --- | --- |
| 程式碼與 workflow 進入發布來源 | 變更是否經過審查 | 分支 ruleset、CODEOWNERS |
| 建立發布 tag | 誰能建立，指向哪個 commit | tag ruleset、來源 commit 檢查 |
| 發布 job 執行 | 是否經核准，權限是否適當 | environment、job permissions |
| npm 版本公開 | 暫存內容是否符合預期 | stage-only publisher、人工 2FA 核准 |

設定時不照表格順序，先從發布 job 的人工核准做起。表格之外，第三方 action 的版本也要固定（步驟 3），避免 workflow 沒改，執行的內容卻變了。

![程式碼、發布 tag、發布 job 與 npm 公開前各有一道關卡](locks.webp){: w="1600" h="900" }
_這幾個關卡要一起看。GitHub 與 npm 是兩個獨立的授權邊界，兩邊的帳號、登入工作階段與驗證裝置都要各自保護。_

## 步驟 1：發布 job 先經過 environment 核准

先替發布 job 設一道人工關卡。依 [GitHub 文件](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)，Free、Pro、Team 的 required reviewers 只適用於公開 repo；私有 repo 要先確認方案支援。

需要 repo 管理權限才能設定：

1. 到 repo 的 **Settings → Environments → New environment**，建立 `npm-publish`。
2. 在 **Required reviewers** 加入能審核發布的人或團隊，最多六個。注意：其中**任一位**核准就能放行，不是所有人都要同意。
3. 有第二位審核者時，開啟 **Prevent self-review**，讓觸發發布的人不能自行核准。只有一位維護者時，開啟它會卡住發布。
4. 取消 **Allow administrators to bypass configured protection rules**，避免管理員略過核准、直接放行等待中的部署。
5. **Deployment branches and tags** 選 **Selected branches and tags**，新增 **Tag** 類型的 `v*` 規則。
6. 儲存保護設定。

在發布 job 指定同名 environment：

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    # 其餘設定見後面的完整範例
```

npmjs.com 的 Trusted Publisher 設定也要在 **Environment name** 填同一個 `npm-publish`。npm 文件為使用 environment 保護的專案提供這個欄位，GitHub 的 [OIDC 文件](https://docs.github.com/en/actions/reference/security/oidc)也說明 token 可以帶有 environment 資訊。只在 workflow 加一行、npm 端卻留空，就少了 npm 這一側的限制。填了這個欄位也不代表 workflow 可以任人修改，下一步仍要保護 workflow 本身。

依 npm 的 Multiple trusted publishers 文件，既有連線不能直接修改，需要刪掉重建，新連線須在兩天內完成第一次成功發布。請先準備好 workflow 與核准者，再安排切換；介面若仍是 Single，請對照該版本文件。

觸發發布後，job 會等待核准。審核者到 workflow 執行頁面按 **Review deployments**，確認 tag、commit 與這次變更，再選 **Approve and deploy**。這時套件還沒建出來，內容要留到步驟 4 再檢查。

> 關閉管理員 bypass，不代表管理員不能修改或刪除 environment 設定。若攻擊者取得 repo 管理權限，仍可能改掉規則。只有一位維護者時，自行核准也只能防誤觸，無法區分本人與盜用同一帳號的人。
{: .prompt-tip }

## 步驟 2：保護發布來源與 tag

### 2-1：分開限制 tag 建立與改寫

到 **Settings → Rules → Rulesets → New tag ruleset**，把目標設成 `v*`，並確認 **Enforcement status: Active**。

建議分成兩份規則：

- **`release-tags-create`**：勾選 **Restrict creations**，Bypass list 只留負責發版的最小範圍。
- **`release-tags-immutable`**：勾選 **Restrict updates**、**Restrict deletions**，Bypass list 留空，讓發版者也不能任意移動或刪除既有 tag。

為什麼要分開？[GitHub 文件](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)說明，這些限制只讓有 bypass 權限者通過。如果三項放在同一份 ruleset，又把發版者加入 bypass，他們就同時能建立、改寫與刪除 tag，發布用的 tag 也就稱不上不可變。

**Bypass list 也不是任意填使用者名稱。** [建立規則集的文件](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)列出的選項包括角色、團隊與 GitHub App。組織 repo 可用專門的發版團隊；個人 repo 要看介面提供的角色選項。選整個 Write 或 Maintain 角色，就會放行該角色的所有人。

這些規則仍可能被有管理權限的人修改，因此管理權限與規則變更本身也要受到監督。

### 2-2：程式碼與 workflow 都要審查

只保護 `.github/` 還不夠。攻擊者也可能修改套件原始碼、`package.json` 的發布腳本，或建置時載入的檔案。以下 CODEOWNERS 範例先涵蓋所有檔案，再讓發布團隊負責 `.github/`：

```text
* @your-org/package-reviewers
/.github/ @your-org/release-reviewers
```

把示意團隊換成實際帳號或團隊。後面的規則會覆寫前面對相同路徑的指定；這裡 `.github/` 由 release-reviewers 負責，不是兩個團隊都必須核准。依 [CODEOWNERS 文件](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)，負責者必須有 repo 寫入權限；使用團隊時，團隊也須具備適當的可見性與權限。

替發布來源分支（本文用 `main`）建立 **Active** 的 branch ruleset，設定：

- **Require a pull request before merging**，並要求至少一位審核者核准。
- **Require review from Code Owners**，讓變更必須經過對應路徑的負責者核准。
- **Dismiss stale pull request approvals when new commits are pushed**，避免審過的內容又被換掉；也可加上 **Require approval of the most recent reviewable push**，要求最後推送者以外的人核准最新可審查的變更。
- **Block force pushes**，Bypass list 盡量留空；把專案必要的測試列為 required status checks。

**CODEOWNERS 本身不會阻擋合併。** 必須搭配要求 code owner 審查的規則才會生效。只有一位維護者時，把自己列成 owner 也不等於有了獨立的第二人審查。

### 2-3：確認 tag 指向已審查的 commit

`v*` 只比對 tag 名稱，**不會證明該 commit 已合併到 `main`**。同樣地，environment 的 tag 規則比對的是執行時的 ref，不會替你確認來源分支。

發版者與 environment 審核者要確認 tag 指向的 commit 來自已審查的發布分支。後面的 workflow 範例也會檢查目前 commit 是否在 `origin/main` 的歷史裡，擋住誤指向其他分支的 tag。

這項檢查的前提是 `main` 的審查規則確實生效，而且 workflow 沒被竄改。它不能代替 tag 權限、workflow 審查或 npm 最後一關。

## 步驟 3：固定 action 版本，並保護 lockfile

`uses: actions/checkout@v6` 裡的 `v6` 是可以移動的 tag。若要固定直接引用的 action，可改成經核對與審查的完整 commit SHA；後面的範例採用這種寫法。

GitHub 在 2026-10-28 的 [GA 公告](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)宣布 workflow lockfile 正式推出，適用方案列了 Free、Team 與 Enterprise Cloud 等；不過本文查閱時，[操作文件](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)的適用方案欄仍標示 Enterprise Cloud。請先確認 repo 的實際支援情況，不能只靠方案名稱判斷已啟用。

支援的 repo 可依文件執行：

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

檢查 workflow 與 `.github/workflows/actions.lock` 的變更，確認無誤後一起提交。**只鎖這一份 workflow，不代表整個 repo 都已納入。** 跨 repo 的 reusable workflow 要由來源 repo 維護自己的 lockfile；npm 相依套件、腳本臨時下載的程式，也不會因此全部固定。

Dependabot 會替已納入管理的 workflow 更新對應 lockfile，但更新仍要審查。若 repo 提供 **Require lockfile** 政策，可用來強制採用；lockfile 和政策本身也要保護，否則有人把它們刪掉，鎖定就悄悄失效了。鎖定版本只確保執行內容一致，不保證該內容安全。

## 步驟 4：CI 只送暫存版本，由 npm 核准公開

這一關把「CI 可以提交套件」和「版本可以公開」分開。依 [npm 文件](https://docs.npmjs.com/trusted-publishers)，`npm stage approve` 等管理暫存內容的操作不能使用 CI 的 OIDC token；[staged publishing 文件](https://docs.npmjs.com/staged-publishing)也要求公開前由維護者通過 2FA 核准。

OIDC token 不能核准，但這道分隔只在 CI 拿不到其他 npm 憑證時才成立。**不要把能核准的 npm 帳號憑證、登入工作階段或驗證手段交給同一個發布流程**；GitHub 與 npm 分開授權，一邊失守時，另一道關卡才還在。

先安排切換順序：

1. 確認 npm CLI 至少為 **11.15.0**、Node.js 至少為 **22.14.0**，並有具發布權限、已啟用 2FA 的 npm 帳號負責核准。
2. 在 npmjs.com 檢查這個套件的**所有 Trusted Publisher**。目標連線只允許 `npm stage publish`，取消 `npm publish`；不需要的 `npm dist-tag` 權限也不要開。保留的其他連線若還能直接發布，就等於留著另一條入口。
3. 把 workflow 最後一步改成 `npm stage publish`。若需刪掉重建 publisher，先把 workflow 準備好，留意新連線的驗證期限。
4. 確認新路徑運作後，依前篇收尾：**Settings → Publishing access → Require two-factor authentication and disallow tokens**，再撤銷不再使用的發布 token。這項設定限制傳統 token，不會停用 OIDC publisher，也不會替每一筆 publisher 自動改成 stage-only。

2026-07-08 的 [npm 變更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)預告約從 2027 年 1 月起，進一步限制用 2FA-bypass granular token 直接發布。這只是預告的時程，不必等到那時才收緊權限。

![CI 用 OIDC 提交暫存版本，維護者在 npm 審查與核准後才公開](stage-approve.webp){: w="1600" h="900" }
_圖中的權限分工以 stage-only publisher 為前提；若還有直接發布的 publisher 或其他發布憑證，就不能保證每條路徑都會經過暫存。_

### workflow 範例

這份範例假設從 `main` 發版、有 `npm-publish` environment，且 npm 端已設為 stage-only。兩個 action 的 SHA 是本文查閱時官方 `v6` tag 對應的 commit；採用前仍應核對上游並依專案需求審查，之後透過 PR 更新：

```yaml
name: Stage Package

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Check release commit
        run: |
          git merge-base --is-ancestor HEAD refs/remotes/origin/main
      - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm --version
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm stage publish
```

依 [checkout 文件](https://github.com/actions/checkout/tree/d23441a48e516b6c34aea4fa41551a30e30af803#usage)，`fetch-depth: 0` 會取得完整歷史與分支，供 `origin/main` 的祖先檢查使用；分支名稱若不是 `main`，請一起修改。`id-token: write` 只給需要發布的 job，但同一個 job 裡的每個步驟都拿得到這份權限：`npm ci`、建置與測試也會執行程式碼，所以發布腳本與相依套件同樣要審查。若使用 npm 12，也要準備必要的安裝腳本核准名單；不要為了讓發布成功就一律放行。

### 核准前要看什麼

workflow 完成後，到 npmjs.com **帳號設定的 Staged Packages** 查看；也可在自己的可信電腦上操作 CLI。以下名稱都是佔位文字，執行前要換成實際套件名稱與 stage ID，並保留引號：

```bash
npm stage list '@your-org/your-package'
npm stage view 'YOUR_STAGE_ID'
npm stage download 'YOUR_STAGE_ID'
# 確認內容後才核准；核准會公開該版本
npm stage approve 'YOUR_STAGE_ID'
```

至少確認：

- 套件名稱、版本、dist-tag 與提交者，是否對應這次預定發布。
- workflow 執行與來源 commit，是否對應已審查的變更。
- **實際下載的 tarball 內容**，尤其編譯產物、安裝腳本與新增檔案。原始碼 PR 通過，不代表產出的檔案一定相同；SHASUM 也只是識別內容，不能代替審查。

有疑慮就先不要核准，必要時用 `npm stage reject 'YOUR_STAGE_ID'` 拒絕。不要在帶有正式憑證的電腦上直接執行可疑套件來「驗證」。

第一次暫存全新套件時，npm 會建立公開的 `0.0.0-stage` 佔位版本，實際暫存內容仍待核准才公開。批次核准功能還在逐步開放；就算一批只需通過一次 2FA，每個套件仍要逐一審查。

## 依維護方式安排優先順序

| 情況 | 建議 |
| --- | --- |
| 只有一位維護者 | 先做好 stage-only、清查其他發布入口與 npm 帳號保護；不要把自行核准當成第二人審查 |
| 有兩位以上維護者 | 加上獨立 PR 審查與 Prevent self-review，確認有人能接手核准 |
| 私有 repo 無法設定 required reviewers | 依方案採用可用的分支與 tag 規則，並保留 npm 端的內容審查 |
| 發版頻繁 | 用自動測試、差異報告與套件清單協助審查；不要把核准簡化成直接按按鈕 |
| 已有多個 publisher | 逐筆檢查是否仍需直接發布或 dist-tag 權限，刪除不用的連線 |
| 還在用 `NPM_TOKEN` 發布 | 先照[前篇](/posts/npm-trusted-publishing-github-actions/)完成遷移，再收掉舊入口 |

## 常見問題與限制

- **job 一直等待**：先看是不是在等 environment 核准。只有一人卻開啟 Prevent self-review，可能沒人能放行。
- **environment 名稱寫錯**：GitHub 可能自動建立沒有保護的新 environment。核對 GitHub 與 npm 兩邊設定；不能把 job 開始執行當成設定成功。
- **tag 符合 `v*`，卻沒經過 `main` 審查**：名稱檢查不等於 commit 來源檢查，兩者都要確認。
- **改成 `npm stage publish`，仍可直接發布**：檢查所有 publisher 的 Allowed actions，以及其他 token、帳號與手動發布權限。改一行 workflow 不會收回其他入口。
- **規則都設了，管理員仍能改掉**：執行時的 bypass、修改保護設定的權限，是兩件事。repo 管理員與 npm 管理者都屬於需要保護的高權限身分。
- **有 2FA 就代表內容安全？** 2FA 只確認操作者是誰，不會替你審查套件。npm 帳號、工作階段與驗證裝置若也失守，最後一關仍可能被通過。
- **runner 限制**：本文只談 GitHub 代管 runner；npm 文件目前不支援 self-hosted runner 的 Trusted Publishing。

先把發布權限的入口列清楚，再替來源審查、tag、job 與公開各加上適合的限制。最重要的一點是：核准 commit 和核准最後產出的套件，是兩次不同的確認，哪一次都不能省。

還沒設好 OIDC，先看[npm Trusted Publishing 設定教學](/posts/npm-trusted-publishing-github-actions/)；workflow 的自動化審查可參考[用 GitHub Actions 加 AI Agent 自動化審查](/posts/github-actions-ai-agent-pr-review/)；更完整的工作流風險整理，見[OWASP Agentic Top 10 檢查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。
