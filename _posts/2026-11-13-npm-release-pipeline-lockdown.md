---
title: "開了 Trusted Publishing 還不夠：npm 發布流程也要上鎖"
description: "tensorlake 的惡意版本帶著合法的 provenance。這篇用 GitHub environment、ruleset 和 npm staged publishing 把發布流程上鎖，讓攻擊者推得進 repo 也發不出新版。"
date: 2026-11-13 20:00:00 +0800
categories: [資訊安全, 供應鏈]
tags: [supply-chain-security, github-actions, ci, application-security, npm]
media_subpath: /assets/img/posts/npm-release-pipeline-lockdown/
image:
  path: cover.webp
  alt: "在 npm 發布流程的四個環節各加一道鎖：改程式碼、推 tag、發布 job、npm 公開。"
---

先講結論：Trusted Publishing 解決的是「CI 裡放著一把長期 token」，但它不檢查你要發布的內容。攻擊者只要推得進你的 repo，就能讓你自己的 workflow 替他發布，發出去的版本照樣帶著合法的來源證明。要擋這種情況，得替發布流程本身加上關卡：發布前要有人核准、限制誰能推發布用的 tag 和改 workflow，最後在 npm 改成「先暫存，再由人用 2FA 核准」。

這篇是[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)的續篇。OIDC、`id-token: write` 這些設定不再重講；還沒設好 Trusted Publishing，請先看那篇。

先認識幾個詞：

- **provenance（來源證明）**：npm 公開記錄某個版本是從哪個 repo、哪個 workflow 建出來的。
- **tag（標籤）**：替某個 commit（提交）取的名字，常用來標記版本，例如 `v1.2.3`。上一篇的範例 workflow 就是推上 `v*` tag 才發布。
- **GitHub environment**：GitHub Actions 的部署關卡。job 指定了某個 environment，就要先通過它的規則（例如等人核准）才會開始跑。
- **ruleset（規則集）**：GitHub repo 的規則，可以限制誰能推送、建立或刪除特定的分支或 tag。
- **staged publishing（暫存發布）**：npm 的發布方式。新版本先進暫存區，維護者用 2FA 核准後才公開。
- **2FA（兩步驟驗證）**：除了密碼，還要再輸入一組驗證碼。

> **版本說明**：本文依 2026-11-13 讀取的官方文件撰寫，包括 GitHub 的〈[Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)〉、〈[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)〉、〈[Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)〉，以及 npm 的〈[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)〉、〈[Staged publishing](https://docs.npmjs.com/staged-publishing)〉。兩邊的設定畫面、方案限制和預設值都還在調整，以官方文件為準。
{: .prompt-info }

## 真實案例：來源證明是真的，內容卻是惡意的

2026 年 10 月 8 日，npm 套件 `tensorlake` 被發布了一個惡意版本 0.5.144。依 [tensorlake 官方安全公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 攻擊者用一個被盜的維護者帳號，把惡意程式碼直接推進 repo。
- 接著透過專案**自己的 release workflow** 發布，所以這個版本帶著合法的 npm provenance。
- 惡意程式在安裝時執行，蒐集電腦裡的 GitHub、npm、雲端服務等各種憑證，再用偷來的 token 把自己發布到受害者有權限的其他套件和 repo。
- 這個版本在 npm 上停留了約 1 小時 40 分鐘（UTC 01:12 到 02:54）。

第二點最值得注意。從 npm 的角度看，這次發布和平常沒有兩樣：來自正確的 repo、正確的 workflow。就算用的是 Trusted Publishing 也一樣會過關，因為它核對的正是這兩件事。上一篇提過，Trusted Publishing 擋不下「workflow 本身被利用」的情況，tensorlake 就是實際的例子。

## provenance 證明什麼、不證明什麼

打個比方：provenance 像包裹上的出貨單，證明「這箱貨是從這間工廠、這條產線出來的」。它不會告訴你，產線上有沒有人偷偷換了零件。

npm 的 [provenance 文件](https://docs.npmjs.com/generating-provenance-statements)寫得很直接：有 provenance，「並不保證套件沒有惡意程式」。它提供的是一條可以查證的連結，讓人回頭找到原始碼和建置指令，再自己判斷要不要信任。

![provenance 像出貨單：能證明從哪個 repo、哪個 workflow 建出來，不能證明內容安全](provenance.webp){: w="1600" h="900" }
_概念圖：左邊是 provenance 能回答的問題，右邊是它回答不了的問題。tensorlake 0.5.144 的出貨單完全正確，問題出在產線上被放進了惡意程式碼。_

所以，要擋 tensorlake 這類事件，得在兩個地方加上人工把關：程式碼進到發布流程之前，以及版本公開之前。

## 攻擊者要過四道門

想想看，攻擊者要透過你的 workflow 發出惡意版本，得一路做到這四件事：

1. 把惡意程式碼（或改過的 workflow）放進 repo。
2. 觸發發布，例如推一個 `v*` tag。
3. 讓發布 job 跑完。
4. 讓 npm 把版本公開。

每一道門都可以加一把鎖：

| 攻擊者要做的事 | 對應的鎖 | 在哪裡設 | 本文步驟 |
| --- | --- | --- | --- |
| 把程式碼或 workflow 放進 repo | 分支規則：必須開 PR、由 code owner 審查 | GitHub | 步驟 2 |
| 推發布用的 tag | tag 規則：只有指定的人能建立 `v*` tag | GitHub | 步驟 2 |
| 讓發布 job 跑完 | environment：要有人核准才開始跑 | GitHub | 步驟 1 |
| 讓版本公開 | 只允許 stage publish：維護者用 2FA 核准 | npmjs.com | 步驟 4 |

另外，發布 job 用到的第三方 action（別人寫好、在 workflow 裡用 `uses:` 引用的步驟）也可以鎖住版本，見步驟 3。

![發布流程的四道門，以及各自對應的鎖](locks.webp){: w="1600" h="900" }
_概念圖：從改程式碼、推 tag、跑發布 job 到 npm 公開，每一道門各有一把鎖。前三把設在 GitHub，最後一把設在 npm，用的是另一個帳號的 2FA。_

不必一次全做。文末的〈什麼情況怎麼做〉會依你的情況建議從哪一步開始。

## 步驟 1：把發布 job 放進 environment，設必要審核者

目的：發布 job 開始跑之前，一定要有人按下核准。

**先確認方案。** 依 [GitHub 文件](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)，Free、Pro、Team 方案的必要審核者（required reviewers）只能用在**公開 repo**。npm 上的開源套件多半放在公開 repo，通常沒問題；私有 repo 請先確認你的方案能不能用。

**建立 environment**（需要 repo 的管理權限）：

1. 打開 repo，點 **Settings**。
2. 左側選 **Environments**，按 **New environment**。
3. 名稱填 `npm-publish`（本文範例都用這個名字），按 **Configure environment**。
4. 勾選 **Required reviewers**，加入可以核准的人或團隊。最多 6 個，其中任一人核准就會放行。
5. 視情況勾選 **Prevent self-review**：開了之後，觸發這次發布的人不能自己核准，一定要第二個人看過。**只有一位維護者時不要開**，否則沒有人能核准。
6. 取消勾選 **Allow administrators to bypass configured protection rules**。依文件，這個選項預設開啟，代表管理員可以跳過核准直接部署。
7. **Deployment branches and tags** 選 **Selected branches and tags**，Ref type 選 **Tag**，填 `v*`，按 **Add rule**。這樣只有 `v*` tag 觸發的執行能進這個 environment。
8. 按 **Save protection rules** 存檔。

**改 workflow。** 以上一篇的 `publish.yml` 為例，在發布 job 加上一行 `environment`：

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish  # 新增：要先通過這個 environment 的規則
    steps:
      # ……其餘步驟不變
```

**npm 那邊也要填。** 回到 npmjs.com 套件的 Trusted Publisher 設定，**Environment name** 填同一個名稱 `npm-publish`。[npm 文件](https://docs.npmjs.com/trusted-publishers)把這一欄寫給「用 GitHub environments 做部署保護」的情況。Multiple 介面的既有設定不能修改，要刪掉重建，細節見上一篇的步驟 1。

**跑起來會怎樣。** 推上 `v*` tag 後，發布 job 會停下來等待核准。核准的人打開這次 workflow 的執行頁面，按 **Review deployments**，勾選 environment，再按 **Approve and deploy**，job 才會開始跑；按 **Reject** 則這次執行失敗。

**你會得到：** 每次發布前都要有人按下核准的發布 job。攻擊者就算推得進 repo，workflow 也不會自動把版本發出去。

> 只有一位維護者時要知道：如果被盜的正是你的 GitHub 帳號，核准按鈕也是攻擊者在按。這種情況要靠步驟 4：npm 那一關用的是 npm 帳號的 2FA，和 GitHub 帳號是兩把不同的鑰匙。
{: .prompt-tip }

## 步驟 2：限制誰能推 tag、誰能改 workflow

步驟 1 有一個漏洞：能改 workflow 的人，可以把 `environment` 那一行拿掉，或改成別的名字。[GitHub 文件](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)寫，workflow 引用一個不存在的 environment 時，GitHub 會自動建立同名的 environment，而新建的 environment 沒有任何保護規則。所以 workflow 本身也要鎖住。

### 2-1：只讓負責發版的人建立 `v*` tag

npm 文件建議用 tag 保護規則，控制誰能建立發布用的 tag。在 GitHub，用以 tag 為目標的 ruleset 來做：

1. repo 的 **Settings** → 左側 **Rules** 底下的 **Rulesets** → **New ruleset** → **New tag ruleset**。
2. **Ruleset name** 填 `release-tags`，Enforcement status 選 **Active**。
3. **Bypass list** 按 **Add bypass**，只加入真正負責發版的人或團隊。
4. **Target tags** 按 **Add a target**，加入 `v*` 這個樣式。
5. 勾選 **Restrict creations**、**Restrict updates**、**Restrict deletions**（最後一項預設已勾）。
6. 按 **Create**。

依[規則說明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)，這三條規則開啟後，只有 Bypass list 裡的人能建立、移動或刪除 `v*` tag。

### 2-2：改 workflow 要經過審查

先在 repo 加一個 `.github/CODEOWNERS` 檔，指定誰負責 `.github/` 資料夾（workflow 和 CODEOWNERS 本身都在裡面）：

```text
/.github/ @your-github-name
```

`@your-github-name` 換成你的 GitHub 帳號或團隊。[GitHub 文件](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)要求 code owner 對 repo 有寫入權限，並建議把 CODEOWNERS 檔本身也納入保護。

接著替預設分支（通常是 `main`）建一個 branch ruleset：**New ruleset** → **New branch ruleset**，Target branches 選預設分支，然後勾選：

- **Require a pull request before merging**：所有變更都要開 PR，不能直接推進分支。tensorlake 的攻擊者就是把程式碼直接推進 repo。
  - 底下勾選 **Require review from Code Owners**：動到 `.github/` 的 PR，要 code owner 核准才能合併。
  - 底下勾選 **Require approval of the most recent reviewable push**：核准之後如果又有人推了新的 commit，要由「最後推送者以外的人」再核准一次。
- **Block force pushes**：禁止強制推送改寫歷史（預設已勾）。

Bypass list 同樣只放必要的人，最好留空。

**你會得到：** 推得進 repo 的人，不一定能推發布用的 tag；想改 workflow 拿掉 environment，也要先經過 code owner 審查。

> 只有一位維護者時，沒有第二個人能審 PR，branch ruleset 的效果有限。這時重點放在 2-1 的 tag 規則，以及步驟 4。
{: .prompt-tip }

## 步驟 3：鎖住 workflow 用到的 action

發布 job 裡的 `actions/checkout@v6`，`v6` 也是一個 tag。action 的作者（或盜用作者帳號的人）可以把同一個 tag 指向別的程式碼，你的 workflow 下次執行就會跑到新的內容。

GitHub 在 2026-10-28 正式推出 workflow lockfile（[changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)），Free、Team、Enterprise Cloud 方案都能使用。它會把每個 action 當下對應的 commit 記在 `.github/workflows/actions.lock`。之後就算 tag 被移動，workflow 也照樣跑你鎖住的那一版：

```bash
gh extension install github/gh-actions-lock
gh actions-lock .github/workflows/publish.yml
```

執行後先看一下 diff 再提交。Dependabot 替這個 workflow 開版本更新的 PR 時，會在同一個 PR 一起更新 lockfile。完整操作見 [GitHub 文件](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)，本篇不展開。

**你會得到：** 發布 job 用到的每個 action，都固定在你審過的那一版。

## 步驟 4：npm 只允許 stage publish，最後一關用 2FA 核准

這是最後、也最重要的一道鎖：就算前面三道都被突破，版本也只會進暫存區，要維護者在 npm 用 2FA 核准才會公開。

這也是 npm 自己指的方向。依 [GitHub changelog](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)，能「略過 2FA」的 granular token，預計約 2027 年 1 月起不能再直接發布，只能讀取私有套件和送出暫存發布；npm 建議把自動發布改成 Trusted Publishing，或「需要人工核准的 staged publishing」。

**為什麼這一關特別有用：**

- [npm 文件](https://docs.npmjs.com/trusted-publishers)寫，`npm stage list`、`view`、`approve`、`reject` 這些指令需要互動式驗證，**不能用 OIDC token**。也就是說，CI 能把版本送進暫存區，卻沒辦法自己核准。
- [Staged publishing 文件](https://docs.npmjs.com/staged-publishing)寫，不論在 CLI 還是 npmjs.com 核准，都會要求 2FA 驗證。
- 核准用的是 npm 帳號，不是 GitHub 帳號。GitHub 帳號被盜，攻擊者還是缺 npm 這把鑰匙。

![CI 只能把版本送進暫存區，公開前要維護者用 npm 的 2FA 核准](stage-approve.webp){: w="1600" h="900" }
_概念圖：CI 用 OIDC 執行 npm stage publish，版本進入暫存區；核准要由維護者登入 npm、通過 2FA，CI 的 OIDC token 做不到這一步。_

**設定：**

1. **npmjs.com**：套件的 **Settings** → Trusted Publisher，**Allowed actions** 只留 `npm stage publish`，**不要勾** `npm publish`。依文件，2026-09-03 之後新建的設定，預設就是只允許 `npm stage publish`。Multiple 介面的既有設定不能改，要刪掉重建。
2. **workflow**：最後一行從 `npm publish` 改成 `npm stage publish`。這需要 npm CLI 11.15.0 以上、Node.js 22.14.0 以上。
3. **收掉 token**：套件的 **Settings** → **Publishing access**，選 **Require two-factor authentication and disallow tokens**，讓舊 token 也發不了。上一篇的步驟 4 做過的話可以跳過。

三個步驟都做完後，`publish.yml` 會長這樣：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish      # 步驟 1：要有人核准才開始跑
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm stage publish    # 步驟 4：只送進暫存區
```

**核准：** workflow 跑完後，版本會停在暫存區。到 npmjs.com 的帳號設定打開 **Staged Packages** 分頁，確認內容後按 **Approve**，輸入 2FA 驗證碼。也可以在自己的電腦用 CLI：

```bash
npm stage list <套件名稱>       # 列出等待核准的版本
npm stage view <stage-id>       # 看這個版本的資訊
npm stage download <stage-id>   # 下載回來檢查內容
npm stage approve <stage-id>    # 核准，會要求 2FA
```

依文件，第一次用暫存方式發布的新套件，npm 會先放一個公開的佔位版本 `0.0.0-stage`；一次核准多個版本的批次功能還在逐步開放，你的帳號不一定看得到。

**你會得到：** CI 只能把版本送進暫存區。要公開，一定要有人登入 npm、通過 2FA 按下核准。

## 什麼情況怎麼做

| 我的情況 | 建議 |
| --- | --- |
| 只有我一個維護者 | 先做步驟 4，再做 2-1；步驟 1 可以做，但不要開 Prevent self-review |
| 有兩位以上維護者 | 步驟 1 開 Prevent self-review，加上步驟 2 和步驟 4 |
| 套件放在私有 repo | Free、Pro、Team 方案不能用 required reviewers；先做步驟 4，其他功能依方案確認 |
| 發版很頻繁，嫌每次都要核准 | 至少保留步驟 4；核准前用 `npm stage view` 看一眼就好 |
| 想先做一件就好 | 步驟 4：它不靠 GitHub 帳號，CI 也繞不過 |
| 還在用 `NPM_TOKEN` 發布 | 先照[上一篇](/posts/npm-trusted-publishing-github-actions/)改成 Trusted Publishing，再回來看這篇 |

## 常見錯誤與處理

- **發布 job 一直停著不動：** 它在等 environment 核准。到 workflow 的執行頁面按 **Review deployments**。
- **workflow 改成 `npm stage publish`，卻還勾著 `npm publish`：** 攻擊者把最後一行改回 `npm publish` 就能直接發布。Allowed actions 要取消勾選 `npm publish`。
- **忘了取消 Allow administrators to bypass：** 管理員帳號（包括被盜的管理員帳號）可以跳過核准直接部署。
- **environment 名稱打錯：** GitHub 會自動建一個同名、但沒有任何保護規則的新 environment，job 會直接開跑。到 Settings → Environments 看看有沒有多出陌生的 environment。
- **沒限制 Deployment branches and tags：** 任何分支觸發的執行都能進這個 environment。改成只允許 `v*` tag。
- **只有一位維護者卻開了 Prevent self-review：** 沒有人能核准。只有一人時不要開。
- **`npm stage publish` 失敗：** 確認 npm CLI 是 11.15.0 以上。
- **把 Bypass list 加得太寬：** 在 Bypass list 裡的人可以略過規則。只放真正需要的人。
- **以為有 provenance 就代表安全：** provenance 只說明版本從哪裡建出來，不說明內容安全。

## 限制

> 使用前請先知道這些限制：
>
> - 這些關卡擋的是「推得進 repo，就能自動發版」。核准的人如果沒看就按，關卡等於沒有；核准前至少看一下這次包含哪些 commit。
> - 只有一位維護者時，GitHub 帳號一旦被盜，步驟 1、2 都可能被攻擊者自己通過，只剩步驟 4 能擋。
> - npm 帳號和它的 2FA 如果也一起失守，這些關卡都擋不住。
> - Free、Pro、Team 方案的 required reviewers 只能用在公開 repo。
> - 本文只談 GitHub 代管的 runner；npm 的 Trusted Publishing 目前也不支援 self-hosted runner。
{: .prompt-warning }

## 結論與下一步

Trusted Publishing 讓你不必在 CI 放長期 token；這篇的四道鎖，則讓「推得進 repo」不再等於「發得出新版」。最少也要做步驟 4：讓 CI 只能送暫存，公開前一定要有人用 npm 的 2FA 核准。

還沒設好 Trusted Publishing，請先看[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)。想替 workflow 的 PR 加上自動化審查，可以看[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)；想從 AI 工作流的角度檢查供應鏈風險，見[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。

官方說明以 GitHub 的 [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)，以及 npm 的 [Trusted publishing](https://docs.npmjs.com/trusted-publishers)、[Staged publishing](https://docs.npmjs.com/staged-publishing) 為準。
