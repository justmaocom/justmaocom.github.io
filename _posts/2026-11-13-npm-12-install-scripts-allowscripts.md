---
title: "npm 12 預設擋掉安裝腳本：allowScripts 怎麼核准、怎麼加 7 天冷靜期"
description: "npm 12 預設不再執行相依套件的安裝腳本。這篇教你用 npm install-scripts 核准真正需要的套件、用 min-release-age 加上 7 天冷靜期，以及裝到惡意套件時，為什麼不能第一步就撤 token。"
date: 2026-11-13 20:00:00 +0800
categories: [資訊安全, 供應鏈]
tags: [supply-chain-security, npm, application-security, incident-response]
media_subpath: /assets/img/posts/npm-12-install-scripts-allowscripts/
image:
  path: cover.webp
  alt: "npm 12 在安裝時先擋下相依套件的安裝腳本，只放行列在 allowScripts 裡、你核准過的套件。"
---

先講結論：升級到 npm 12 之後，相依套件的安裝腳本預設不會再執行。你要做的事只有三件：看哪些套件被擋、核准真正需要的、把名單 commit 進 repo。再花一分鐘在 `.npmrc` 加上 7 天冷靜期，剛發布的版本就不會馬上裝進來。

先認識幾個詞：

- **相依套件**（dependency）：你的專案要用到的別人的套件，以及它們再用到的套件。
- **安裝腳本**（install script）：套件在被安裝時自動執行的指令，寫在它的 `package.json` 裡，名稱是 `preinstall`、`install`、`postinstall`。它用你的帳號執行，你讀得到的檔案，它都讀得到。
- **`package.json`**：專案的設定檔，記錄名稱、版本和相依套件。npm 12 核准過的名單也寫在這裡。
- **lockfile**（`package-lock.json`）：記錄每個相依套件「實際裝了哪一版」的檔案。
- **`.npmrc`**：npm 的設定檔，放在專案根目錄就只影響這個專案。
- **token**（權杖）：一串代替帳號密碼的通行碼，誰拿到，就能用你的身分做它允許的事。

為什麼要擋？因為攻擊者最常把惡意程式放在安裝腳本裡：你一打 `npm install`，還沒用到那個套件，程式就已經跑完了。2026 年 10 月 8 日的 `tensorlake@0.5.144` 就是這樣，依[官方公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)，它透過 `preinstall` 偷走 GitHub 與 npm token、雲端金鑰，以及 AI 工具和 MCP 的設定。這種事也不罕見：GitHub Advisory Database 幾乎每天都在公告新的惡意 npm 套件，光是 2026 年 10 月 26 日到 28 日這三天，就有 103 筆（2026-11-13 以 `type=malware`、`ecosystem=npm` 查詢 [GitHub Advisory Database](https://github.com/advisories?query=type%3Amalware+ecosystem%3Anpm) 的結果）。

另一篇[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)是站在**發布者**這端；這篇站在**安裝套件的人**這端：怎麼核准真正需要的安裝腳本、怎麼避開剛發布的版本，以及萬一裝到惡意套件，第一步該做什麼、不該做什麼。

> **版本說明**：本文依 2026-11-13 讀取的 npm CLI 12.2.2 官方文件〈[npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)〉、〈[npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)〉、〈[config](https://docs.npmjs.com/cli/v12/using-npm/config/)〉，以及 GitHub 的 [npm v12 變更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)整理，沒有附實測結果。指令與預設值以官方文件為準。
{: .prompt-info }

## npm 12 改了什麼

GitHub 在 2026-07-08 的[變更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)寫明，npm v12 已正式發布，並標成 `latest`（也就是 `npm install -g npm` 預設會裝到的版本）。和安裝腳本有關的改變是：

- **相依套件的安裝腳本預設不跑。** `preinstall`、`install`、`postinstall` 都算在內，沒有寫腳本、但帶有 `binding.gyp` 而會自動用 node-gyp 編譯的套件也一樣。從 git、本機檔案或連結裝進來的相依套件，它們的 `prepare` 腳本也一併擋下。
- **安裝時不會中斷。** [文件](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)寫，`npm install` 會默默跳過沒被核准的腳本，最後列出被跳過的套件，讓你回頭審查。
- **放行名單寫在 `package.json` 的 `allowScripts`。** 列在裡面、標成允許的套件，腳本照常執行；標成拒絕的，一律跳過，也不再出現在待審清單裡。

同一次改版也把兩種來源預設關掉：git 相依套件（`allow-git`）和網址相依套件（`allow-remote`，例如直接指向某個 `.tgz` 網址）。如果你的專案用到這兩種，升級後會裝不起來，要另外放行；本篇不展開。

![npm 12 安裝時，每個帶安裝腳本的套件都要先對照 allowScripts：核准的才執行，拒絕的直接跳過，還沒審查的跳過後列在清單上](gate.webp){: w="1600" h="900" }
_概念圖：安裝時，每個帶安裝腳本的套件都要先對照 `allowScripts`。核准過、而且版本相符的才會執行；明確拒絕的直接跳過；還沒審查的也跳過，並在安裝結束時列出來。核准預設會釘住版本，套件升級後要重新核准。_

**哪些人會受影響？** 用到「要在安裝時編譯或下載原生程式」的套件的人最常碰到，例如官方文件範例裡的 `canvas`、`sharp` 這類影像處理套件。升級後若一切正常，代表你的專案可能根本不需要安裝腳本；若某個功能壞了，或安裝結束時列出一串被跳過的套件，就照下面的步驟處理。

## 步驟 1：確認 npm 版本

在終端機執行：

```bash
npm -v
```

- **顯示 12.x**：預設已經在擋，直接做步驟 2。
- **顯示 11.16.0 以上的 11.x**：依 GitHub [6 月的預告](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/)，這些版本已經有同樣的機制，只是先以警告提醒。可以先用 `npm approve-scripts --allow-scripts-pending` 看看升級後會被擋的有哪些，把名單準備好再升級。
- **更舊的版本**：先升級 npm，例如執行 `npm install -g npm@latest`。

團隊裡每個人、還有 CI（程式推上去後自動跑測試與建置的流程）用的 npm 版本最好一致。否則同一份 `package.json`，在 npm 12 上會擋，在舊版上會照跑。

**你會得到：** 確認自己的 npm 已經會擋安裝腳本。

## 步驟 2：看哪些套件被擋

在專案資料夾裡執行：

```bash
npm install-scripts ls
```

這個指令只會列出「有安裝腳本、但還沒寫進 `allowScripts`」的套件，不會改任何檔案，可以放心多跑幾次。

接著逐一判斷要不要放行。先看它的腳本到底做什麼：

```bash
# 看某個版本的 package.json 裡寫了哪些腳本；套件與版本換成清單上列出的那一個
npm view <套件>@<版本> scripts
```

也可以直接打開 `node_modules/<套件>/package.json` 看同樣的內容，再看腳本呼叫的那支檔案。

判斷時可以參考這幾條（本站整理的經驗法則，不是官方規則）：

- **要編譯或下載原生程式**，例如影像處理、資料庫驅動：通常真的需要，核准。
- **只是送使用統計、印廣告或感謝訊息**：不需要，拒絕。
- **腳本會從不明網址下載東西，或程式碼被刻意弄得看不懂**：先不要核准，查清楚再說。
- **看不懂、也不確定**：先不核准，跑一次測試或把程式啟動看看。功能正常，就把它明確拒絕，免得它一直出現在清單上；壞了，再回頭核准。

**你會得到：** 一份「要核准」和「要拒絕」的名單。

## 步驟 3：核准或拒絕，然後 commit

核准需要的套件，可以一次列好幾個：

```bash
npm install-scripts approve canvas sharp
```

拒絕不需要的套件：

```bash
npm install-scripts deny telemetry-pkg
```

`npm approve-scripts` 和 `npm deny-scripts` 是這兩個指令的簡寫，效果相同。

**核准預設會釘住版本。** [文件](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)寫，`approve` 預設寫入的是 `套件@版本`，只放行你審查過的那一版。之後套件升級，新版本不在名單上，安裝腳本會再被擋下，重新出現在待審清單裡。這正是要的效果：攻擊者若偷偷發了一個加料的新版，不會因為你核准過舊版就自動跑起來。

寫進 `package.json` 之後，大致長這樣（npm 文件沒有附完整範例，這是依文件描述整理的寫法，版本號為示意）：

```json
{
  "allowScripts": {
    "canvas@3.2.0": true,
    "sharp@0.34.5": true,
    "telemetry-pkg": false
  }
}
```

- `true` 是允許，`false` 是拒絕。拒絕一律只寫套件名稱，不分版本。
- [文件](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)寫明，已經寫成 `false` 的套件永遠以拒絕為準，之後再 `approve` 也不會悄悄改回允許。
- 加上 `--no-allow-scripts-pin`，會改寫成只有名稱、不分版本的允許。這等於連未來的每一個新版都先放行了，除非你有很好的理由，否則不建議。
- `npm install-scripts approve --all` 會一次核准清單上的所有套件。文件的範例註解寫的是「審查之後」再用；沒看過就全部放行，等於把這道關卡拆掉。

核准是寫進 `package.json` 的名單。要讓剛才被跳過的腳本補跑，再執行 `npm rebuild <套件>`，例如 `npm rebuild canvas sharp`。[文件](https://docs.npmjs.com/cli/v12/commands/npm-rebuild/)說明，這個指令會執行套件的 `preinstall`、`install`、`postinstall` 和 `prepare`。

最後把名單 commit 進 repo，讓團隊和 CI 用同一份：

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 核准需要的安裝腳本"
```

**套件升級之後：** 釘住的版本對不上了，套件會重新出現在 `npm install-scripts ls`。看過新版的腳本沒問題，再 `approve` 一次，npm 會把舊的版本號改成新的。名單裡已經用不到的舊項目，用 `npm install-scripts prune --dry-run` 先預覽，再用 `npm install-scripts prune` 清掉。

**CI 要不要直接失敗？** 預設只是跳過並提醒。如果你希望「沒審查過的安裝腳本」讓 CI 直接失敗，在專案的 `.npmrc` 加上：

```ini
strict-allow-scripts=true
```

依[文件](https://docs.npmjs.com/cli/v12/using-npm/config/#strict-allow-scripts)，開了之後，有安裝腳本卻不在名單上的套件會讓安裝失敗；明確拒絕的套件照樣直接跳過，不會報錯。

**你會得到：** 一份放在 repo 裡、每個人和 CI 都照著用的 `allowScripts` 名單。

## 步驟 4：在 .npmrc 加上 7 天冷靜期

惡意版本通常很快就會被發現、下架。只要不馬上裝剛發布的版本，就能躲掉很大一部分。npm 的 `min-release-age` 就是做這件事：在專案根目錄的 `.npmrc` 加上：

```ini
min-release-age=7
min-release-age-exclude[]=@你的組織/*
```

- `min-release-age=7`：依[文件](https://docs.npmjs.com/cli/v12/using-npm/config/#min-release-age)，npm 只會裝「發布超過 7 天」的版本：在 `package.json` 允許的版本範圍內，挑已經滿 7 天的。範圍內一個都沒有，安裝就會失敗。
- `min-release-age-exclude[]`：列出不受限制的套件，可以寫套件名稱，也可以用 `@你的組織/*` 這種萬用字元。通常拿來排除自家維護的套件，讓它們一發布就能用。可以寫好幾行。

排除有兩個細節：

- **只有被點名的套件不受限。** 它自己用到的其他套件，照樣要等滿 7 天，除非也符合排除規則。
- **排除不會改變它從哪裡下載。** 文件提醒，你應該在公開的 npm 上也擁有自己組織的 scope（也就是 `@你的組織` 這個名稱），免得別人搶先用同樣的名稱發布套件。

![以 tensorlake 事件為例：惡意版本只在 npm 上約 1 小時 40 分鐘，設了 7 天冷靜期的專案根本不會選到它](cooldown.webp){: w="1600" h="900" }
_概念圖：以 tensorlake 事件為例。惡意的 0.5.144 在 2026-10-08 只上線約 1 小時 40 分鐘就被移除；設了 7 天冷靜期的專案，要到 10 月 15 日之後才會考慮這個版本，那時它早就不在了。_

以這次事件為例：依公告，`tensorlake@0.5.144` 只在 npm 上待了約 1 小時 40 分鐘（2026-10-08 01:12 到 02:54 UTC，台北時間 09:12 到 10:54）。設了 7 天冷靜期的專案，在那段時間不會選到它，等滿 7 天時，它也已經被移除了。

**代價是：緊急修補也要等。** 文件寫明，如果冷靜期擋住了 `npm audit fix` 要裝的修補版本，npm 會留在有漏洞的版本、發出警告，並以失敗結束。這時有兩種做法：

- 把那個套件暫時加進 `min-release-age-exclude[]`，裝好修補版再拿掉。
- 暫時把天數調小。

npm 還有一個 `before` 設定，指定「只裝某個日期之前發布的版本」。同一個設定檔裡兩個都寫時，以 `before` 為準。

**你會得到：** 剛發布的版本至少要等 7 天才會進到你的專案。

## 步驟 5：全域安裝與 npx 怎麼放行

`npm install -g`（全域安裝，裝成整台電腦都能用的指令）和 `npx`、`npm exec`（下載套件後直接執行一次）沒有專案的 `package.json` 可以寫，所以 `npm install-scripts` 在這些情況不能用，加上 `-g` 執行會出現 `EGLOBAL` 錯誤。

這時改用 `allow-scripts` 設定，值是用逗號分隔的套件名稱。[文件](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)的兩種寫法：

```bash
# 只在這次全域安裝放行
npm install -g --allow-scripts=canvas,sharp

# 寫進你個人的 npm 設定，之後一直有效
npm config set allow-scripts=canvas,sharp --location=user
```

- 依[文件](https://docs.npmjs.com/cli/v12/using-npm/config/#allow-scripts)，這個設定就是給 `npm exec`、`npx` 和 `npm install -g` 用的。在專案裡執行 `npm install`、`npm ci`、`npm update` 或 `npm rebuild` 時，在指令後面加 `--allow-scripts` 會直接報錯，專案請用 `allowScripts`。
- 名稱比對的是套件實際解析出來的身分，不是套件自己在 `package.json` 裡宣稱的名稱。
- 寫進個人設定的名單會一直有效，所以越短越好，不再需要的就拿掉。

**你會得到：** 全域工具和一次性執行，也只放行你點名的套件。

## 萬一裝到惡意套件：以 tensorlake 事件為例，為什麼不能第一步就撤 token

一般的建議是：懷疑中招，就先撤銷 token、換新的。但 tensorlake 這次不能這樣做。下面是這次事件官方公告的步驟，**只適用於這次事件**，不是通用流程；遇到其他事件，請以各自的官方公告為準。

**發生了什麼。** 依[官方公告](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2)：

- 2026-10-08，攻擊者用被盜的維護者帳號，把 `tensorlake@0.5.144` 發布到 npm。同版本號的 `tensorlake-native-*` 系列套件也受影響。
- 惡意程式藏在 `preinstall`，安裝時就執行。它會收集 GitHub 與 npm token、AWS 與 GCP 的雲端憑證、Kubernetes 與 Vault token、SSH 與 GPG 金鑰、`.env` 檔、瀏覽器存的密碼、加密貨幣錢包，以及 AI 工具和 MCP 的設定，再用偷到的 token 把自己發布到受害者有權限的其他套件和 repo。
- 它還會裝一個叫 `gh-token-monitor` 的常駐服務：**偷來的 GitHub token 一被撤銷，它就會刪除使用者的家目錄。**
- 這個版本是透過 tensorlake 自己的發布流程發出的，所以帶著有效的 npm provenance（來源證明）。這也是[Trusted Publishing 那篇](/posts/npm-trusted-publishing-github-actions/)提醒過的：provenance 只證明「從哪裡建出來」，不保證套件沒有惡意程式。

**先確認有沒有裝到。** 公告提供的方法：

- 在專案裡執行 `npm list tensorlake`，顯示 0.5.144 就是受影響。
- 在 `package-lock.json`、`yarn.lock`、`pnpm-lock.yaml` 裡找 `tensorlake@0.5.144` 或 `tensorlake-native-*@0.5.144`。
- 翻 CI 的建置紀錄，看 2026-10-08 01:12 到 02:54 UTC 之間，有沒有哪次安裝解析到 0.5.144。

公告寫明，只要在「安裝腳本有啟用」的電腦或 CI 上裝過 0.5.144，就要把那台機器，以及它碰得到的所有憑證，都當成已經外洩。

**處理順序（照公告）：**

1. **先斷網**：把那台電腦從網路上拔掉。
2. **移除 `gh-token-monitor`，而且要在撤銷任何 GitHub token 之前做**：
   - Linux：執行 `systemctl --user disable --now gh-token-monitor.service`，再刪除 `~/.config/gh-token-monitor/` 和 `~/.local/bin/gh-token-monitor.sh`。
   - macOS：執行 `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.user.gh-token-monitor.plist`，再刪除這個 plist 檔。
   - Windows：刪除名為 `gh-token-monitor` 的排程工作，以及 `%LOCALAPPDATA%\gh-token-monitor\` 資料夾。
3. **換一台乾淨的電腦輪換憑證**：那台電腦碰得到的所有憑證都要換新，而且要從另一台沒中招的電腦操作。
4. **檢查你的套件和 repo**：你的 token 能發布或寫入的 npm 套件和 repo，看有沒有不明的新版本、作者顯示為 `claude` 的 commit，或叫 `dependabot/github_actions/format/setup-formatter` 的分支。
5. **重灌**：用可信的映像檔（乾淨的系統安裝來源）重建那台電腦。

![以 tensorlake 事件為例的處理順序：先斷網、再移除 gh-token-monitor，接著換一台乾淨的電腦輪換憑證、檢查套件與 repo，最後重灌](incident-order.webp){: w="1600" h="900" }
_概念圖：以 tensorlake 事件為例。先斷網、先移除常駐服務，再從另一台乾淨的電腦換憑證；如果第一步就撤銷 GitHub token，常駐服務會刪掉家目錄。這是這次事件的官方步驟，不是通用流程。_

為什麼順序這麼重要？撤銷 token 本來是對的，但這次的惡意程式把「token 被撤銷」當成引爆條件。先撤 token，就是自己按下刪除鍵。斷網和移除服務放在前面，是先把它拆掉，再去換鑰匙。

更一般的「怎麼判斷自己是不是已經中招」，可以看[OWASP Agentic Top 10 檢查表](/posts/owasp-agentic-top-10-ai-workflow-checklist/)的同名段落。

## 限制

> 使用前請先知道這些限制：
>
> - **它只擋「安裝時」執行的腳本。** 套件本身的程式碼，在你的程式 `require` 或 `import` 它的時候照樣會執行；擋下安裝腳本，不代表這個套件就安全。
> - **核准等於信任。** 核准過的腳本照樣用你的帳號執行，讀得到你讀得到的檔案。
> - **釘版本只防「新版本」。** 如果你核准的那一版本身就有問題，釘版本幫不上忙。
> - **`npm install-scripts` 不認得 workspaces**（同一個 repo 裡管理多個套件的功能），文件寫明它「unaware of workspaces」。
> - **冷靜期會延後緊急修補。** 需要馬上更新時，要暫時排除那個套件。
> - **lockfile 裡已經鎖定的版本會不會重新檢查冷靜期，文件沒有寫明。**
> - **`--dangerously-allow-all-scripts` 會整個略過名單。** 文件寫它只是遷移時的應急手段，強烈不建議使用。
{: .prompt-warning }

## 什麼情況怎麼做

| 我想… | 怎麼做 |
| --- | --- |
| 知道哪些套件被擋 | `npm install-scripts ls`，只讀不改 |
| 放行需要的套件 | `npm install-scripts approve <套件>`，預設釘版本；再 `npm rebuild <套件>` 補跑腳本 |
| 擋掉不需要的套件 | `npm install-scripts deny <套件>`，之後也不會被 `approve --all` 改回來 |
| 讓 CI 遇到沒審查的腳本就失敗 | 專案 `.npmrc` 加 `strict-allow-scripts=true` |
| 套件升級後又被擋 | 看過新版腳本，再 `approve` 一次；用 `prune` 清掉舊項目 |
| 不裝剛發布的版本 | `.npmrc` 加 `min-release-age=7` |
| 自家套件要馬上能用 | `min-release-age-exclude[]=@你的組織/*` |
| 緊急修補被冷靜期擋住 | 暫時把該套件加進 `min-release-age-exclude[]`，或暫時調小天數 |
| 全域安裝或 npx 要跑腳本 | `npm install -g --allow-scripts=<套件>`，或 `npm config set allow-scripts=<套件> --location=user` |
| 懷疑裝到 tensorlake 0.5.144 | 照公告：斷網、先移除 `gh-token-monitor`、換台乾淨電腦輪換憑證 |

## 常見錯誤與處理

- **升級後某個功能壞了，卻沒有錯誤訊息：** 安裝腳本被跳過時不會中斷安裝。翻一下 `npm install` 最後列出的套件，或執行 `npm install-scripts ls`。
- **在專案裡加 `--allow-scripts` 結果報錯：** 這個參數只給全域安裝和 `npx` 用。專案請用 `npm install-scripts approve`。
- **加 `-g` 執行 `npm install-scripts` 出現 `EGLOBAL`：** 全域安裝沒有 `package.json` 可寫，改用 `--allow-scripts` 或 `npm config set allow-scripts=...`。
- **核准了卻一直出現在待審清單：** [文件](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)寫，lockfile 裡缺少下載網址（例如較舊的 lockfile）時，npm 沒辦法釘版本，會改成只寫名稱並發出警告。執行一次 `npm install` 更新 lockfile，就能恢復釘版本。
- **Dependabot 等工具開的升級 PR，CI 開始失敗：** 有開 `strict-allow-scripts` 時，升級後的版本不在名單上，這是預期中的提醒。看過新版腳本後重新核准，把 `package.json` 一起 commit 到那個 PR。
- **加了冷靜期後裝不起來：** 你指定的版本可能還不到 7 天。等幾天、改用較舊的版本，或確認它是不是該被排除的自家套件。
- **以為拒絕過的套件會被 `approve --all` 放行：** 不會，`false` 永遠優先。真的要放行，先把那一項從 `allowScripts` 拿掉。

## 結論與下一步

升級到 npm 12 之後，先跑 `npm install-scripts ls`，核准真正需要的、拒絕其他的，把 `allowScripts` commit 進 repo；再在 `.npmrc` 加上 `min-release-age=7`。萬一真的裝到惡意套件，先讀那次事件的官方公告再動手，tensorlake 這次就是「先撤 token 反而出事」的例子。

發布者那端怎麼拿掉長期 token，見[npm Trusted Publishing 設定教學：發套件不再放長期 token](/posts/npm-trusted-publishing-github-actions/)；AI 工具和 MCP 帶來的供應鏈風險，見[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)；想把整條 AI 工作流的風險一次盤點，見[OWASP Agentic Top 10 檢查表：AI 工作流十項風險與修法](/posts/owasp-agentic-top-10-ai-workflow-checklist/)。

官方說明以 [npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)、[npm-approve-scripts](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts/)、[config](https://docs.npmjs.com/cli/v12/using-npm/config/) 與 GitHub 的 [npm v12 變更公告](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)為準；tensorlake 事件以[官方安全公告 GHSA-8g63-53c9-65j2](https://github.com/tensorlakeai/tensorlake/security/advisories/GHSA-8g63-53c9-65j2) 為準。
