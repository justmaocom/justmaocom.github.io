---
title: "OpenSSH 密碼驗證繞過漏洞：哪些主機受影響，Alpine 使用者怎麼修補？"
description: "OpenSSH 10.6p2 修補了只在 musl 加上無 PAM 的 sshd 才會出現的密碼驗證繞過（CVE-2026-123158）。這篇整理受影響條件、怎麼確認主機，以及 Alpine 的修補步驟。"
date: 2026-11-07 18:00:00 +0800
categories: [資訊安全]
tags: [application-security]
media_subpath: /assets/img/posts/openssh-musl-password-bypass-alpine/
image:
  path: cover.webp
  alt: "只有 musl、不經 PAM、密碼登入仍開著的 sshd 受影響，套件更新後還要重啟。"
---

先講結論：這次 OpenSSH 的密碼驗證繞過漏洞，**不是**所有跑 OpenSSH 的機器都會中。Ubuntu、Debian、Fedora、RHEL 這類使用 glibc 的 Linux 不在這次的範圍內，你筆電上的 `ssh` 用戶端也不是問題所在。真正需要處理的，主要是 Alpine Linux 這類使用 musl、而且 SSH 伺服器沒有透過 PAM 驗證密碼的主機。

如果你有在 Alpine 上開 SSH，這篇會帶你判斷自己是否受影響，以及怎麼安全地更新。

## 先釐清三個名詞

**sshd 和 ssh 不一樣。** `sshd` 是伺服器端的程式，負責接受別人連進來；`ssh` 是你拿來連到別台機器的用戶端。這次的問題出在 `sshd`，[OpenSSH 10.6p2 的版本說明](https://www.openssh.org/txt/release-10.6p2)標示的也是 `sshd(8)`。

**musl 是系統底層的 C 函式庫。** 幾乎每支程式都要靠 C 函式庫做基本工作，例如把密碼轉成雜湊值。大多數 Linux 發行版用 glibc，Alpine 用的是 musl。

**PAM 是一套驗證框架。** 系統可以把「這組帳號密碼對不對」交給 PAM 處理。如果 sshd 不經過 PAM，它就會自己呼叫 C 函式庫來比對密碼，這次的問題就出在這條路上。

## 發生了什麼事

OpenSSH 在 2026-11-05 發布 Portable OpenSSH 10.6p2，說明中寫到這版包含一項「critical security workaround」，影響「使用 musl libc 且停用 PAM 的 Linux 系統」。OpenSSH 也特別說明，他們認為根本原因不在 sshd，只是可以透過 sshd 被利用，所以在 sshd 這端擋掉。

同一天 [Alpine 發布安全公告](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)，並替 3.16 到 edge 的每個分支都推出修補套件。這個漏洞的編號是 [CVE-2026-123158](https://cveawg.mitre.org/api/cve/CVE-2026-123158)，紀錄於 2026-11-05 23:46（台北時間）發布。

嚴重程度有兩種說法，來源不同。OpenSSH 自己用的字是 critical。CVE 紀錄裡，負責登錄這筆 CVE 的 MITRE 給的 CVSS 3.1 分數（評估漏洞嚴重程度的分數）是 8.1，等級為 High。截至我查證時，[NVD 的紀錄](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158)狀態仍是「Received」，NVD 還沒有自己評分。

補充一點：The Hacker News 的報導和 Alpine 公告發布時都寫著「尚未分配 CVE」。截至我查證時，CVE 紀錄已經有這個編號，Alpine 的安全資料庫（secdb）也已把這個 CVE 對應到各分支的修補版本。

## 問題出在哪裡

一般來說，一個帳號的密碼欄如果是 `*`，意思是「這個帳號沒有可用的密碼」。很多只用金鑰登入的帳號就是這樣設定。

sshd 在沒有 PAM 的情況下，會把你輸入的密碼丟給 `crypt()` 算出雜湊，再拿去和系統儲存的值比對。`*` 太短，裡面沒有 salt（雜湊計算用的參數），所以 sshd 會借用機器上另一個帳號的 salt 來算。

麻煩在於 musl 的 `crypt()` 遇到超過 256 bytes 的密碼時，會回傳 `*` 表示「出錯了」。正常流程下，錯誤應該被當成失敗處理，登入被拒絕。但 sshd 把這個 `*` 當成一般的雜湊結果拿去比對，剛好和帳號儲存的 `*` 一樣，於是比對成功，錯誤訊號就被誤認成「密碼正確」。

10.6p2 的做法是讓 sshd 拒絕和過短的儲存欄位比對，Alpine 各穩定分支的套件則帶有針對同一問題的修補。

![概念插畫：一個「錯誤」訊號在比對時被誤當成驗證通過](auth-error.webp){: w="1280" h="720" }
_概念圖，不是實際架構。錯誤回傳本來應該讓登入失敗，不該被當成驗證成功。_

## 你的主機要同時符合這些條件才會受影響

依照 Alpine 公告整理，以下條件**全部成立**才會受影響：

1. 在使用 musl 的 Linux 上執行，且正在執行的 sshd 尚未修補。版號以你所用發行版的安全公告為準，已經套用 backport 修補並重啟的 sshd，即使其他條件都成立，也不受這個漏洞影響。
2. sshd 不經過 PAM 驗證密碼。在 Alpine 上，這代表裝的是 `openssh-server`（本身就沒有 PAM），或是裝了 `openssh-server-pam` 但設定 `UsePAM no`。
3. `PasswordAuthentication` 是 `yes`。上游 OpenSSH 的預設值是 `yes`，但發行版或雲端映像可能另外設定，要以 sshd 的有效設定為準。
4. 機器上有密碼欄為 `*` 的帳號。Alpine 公告特別列出：從 3.16 左右起預設的 `root:*`、用 `adduser` 建立卻沒設密碼的金鑰帳號，以及透過 musl-nscd 從目錄服務（例如 nslcd、winbind、sssd）來的使用者，因為它們在本機沒有 shadow 紀錄。
5. 機器上至少有另一個本機帳號使用 `$5$` 或 `$6$` 開頭的密碼雜湊，也就是真的設過密碼。

此外，攻擊者要能連到你的 SSH 連接埠，也要知道那個 `*` 帳號的名稱。Alpine 公告說，條件都成立時，攻擊者一次連線就能登入，不需要重試。我覺得這句話要和上面的條件一起看，條件不成立時就不適用。

有幾個容易誤會的地方：

- **密碼欄是 `*` 不等於「禁止登入」。** 它只代表沒有密碼。用 `!` 鎖住的帳號，Alpine 公告說不受影響。
- **「我都用金鑰登入」不等於「已經關掉密碼驗證」。** 只要 `PasswordAuthentication` 還是 `yes`，sshd 就還接受密碼登入，不管你平常怎麼連。
- **root 另有規則。** Alpine 從大約 3.16 起，root 預設就是 `root:*`。不過 OpenSSH 預設的 `PermitRootLogin prohibit-password` 會擋掉 root 的密碼登入，除非你改成 `yes`。真正要注意的是：如果另一個可登入的帳號能透過 `doas` 之類的方式變成 root，這層保護就幫不上忙。

Alpine 官方 tiny-cloud 雲端映像（3.18.11 到 3.24.3）是一個具體例子。裡面的 `alpine` 帳號密碼欄是 `*`，而且可以免密碼使用 `doas`。剛開機時是安全的，但只要機器上出現任何 `$6$` 雜湊，例如管理員設了主控台密碼，就符合條件。用 cloud-init 設定的映像會寫入 `PasswordAuthentication no`，Alpine 公告將它列為不受影響。

**不在這次範圍內的情況：** 使用 glibc 的發行版、非 Linux 系統、sshd 透過 PAM 驗證（例如 `openssh-server-pam` 搭配 `UsePAM yes`）、沒有在容器內執行 sshd 的 Docker 容器，以及沒有任何 `$` 型密碼雜湊的機器。如果你的容器是用 Alpine 當基底，而且裡面真的跑了 sshd，就要照上面的條件逐項檢查。自己編譯 OpenSSH 的環境也一樣。

## 先確認你的主機狀態

以下是唯讀的檢查方式，請在你自己管理的伺服器上執行。`sshd -T` 和讀取 `/etc/shadow` 需要 root 權限，後面的更新步驟也一樣。

先確認作業系統和已安裝的 OpenSSH 套件：

```sh
cat /etc/os-release
apk info -v | grep openssh
```

不要只看 `ssh -V`。那是用戶端的版本，不能代表伺服器上的 sshd，也看不出發行版的修補版號。

接著看 sshd 實際生效的設定：

```sh
sshd -T | grep -Ei '^(usepam|passwordauthentication|permitrootlogin) '
```

`sshd -T` 印出的是預設情境下的結果。如果你的設定檔用了 `Match` 區塊或 `Include`，不同使用者或來源 IP 可能套用不同設定，這時可以加上 `-C` 指定連線情境，讓 sshd 套用相符的 `Match` 規則後再輸出。依 [sshd(8) 說明文件](https://man.openbsd.org/sshd.8)，`user` 是登入帳號，`addr` 是連線來源的 IP，`host` 是連線來源經反查後的主機名稱，不是你這台伺服器的名稱。例如要看帳號 `deploy` 從 `203.0.113.10` 連進來時的設定：

```sh
sshd -T -C user=deploy,addr=203.0.113.10 | grep -i passwordauthentication
```

如果你的 `Match` 規則是用來源主機名稱判斷，再加上 `host=`。跑一次 `-T` 不能代表所有連線情境都安全。

如果要看有哪些帳號的密碼欄是 `*`、哪些有 `$5$` 或 `$6$` 雜湊，可以用只印出帳號名稱的方式查：

```sh
awk -F: '$2=="*"{print "無密碼:", $1} $2 ~ /^\$[56]\$/{print "有雜湊:", $1}' /etc/shadow
```

這行只會印出帳號名稱，不會印出雜湊本身。要注意，透過 musl-nscd 從目錄服務來的使用者不在 `/etc/shadow` 裡，這行查不到他們，但 Alpine 公告把他們算進受影響的帳號。`/etc/shadow` 的內容請不要貼到論壇、聊天群組或 AI 工具裡。

## Alpine 的修補步驟

Alpine 的修補是 backport，舊分支的版號不會變成 10.6p2。例如 3.24 修補後的 `openssh` 版本是 `10.3_p1-r2`，3.22 是 `10.0_p1-r11`。所以判斷有沒有修好，要拿你的分支去對照 [Alpine 公告裡的版本表](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)，不能只看是不是 10.6p2。公告也說 3.21.10、3.22.8、3.23.8、3.24.4 這些映像版本已經包含修補套件。

動手之前，先做好兩件事：用另一個視窗確認金鑰登入可以用，並保留目前已經連上的 SSH 連線。如果是雲端主機，確認你還進得了供應商的管理主控台。

Alpine 官方的做法是更新後重啟 sshd。下面的 `sshd -t` 檢查和新舊連線的確認，是我額外加上的保護步驟。另外，`apk upgrade -U -a` 會更新整個系統的套件，不只 openssh，建議先看過會變動的套件，並安排維護時段再做。

1. 更新套件：`apk upgrade -U -a`
2. 檢查設定檔沒有錯誤：`sshd -t`
3. 重新啟動 sshd：`rc-service sshd restart`
4. 開一個新的 SSH 連線，確認登得進去。
5. 新連線正常後，再關掉原本的舊連線。

第 3 步不能省。Alpine 公告特別提醒，升級套件不會替換正在執行的 sshd，不重啟就還是舊程式在跑。

![概念插畫：管理員保留舊連線，同時開新連線確認更新後能登入](safe-update.webp){: w="1280" h="720" }
_先保留現有連線，再用新連線驗證；套件更新後仍要重啟 sshd 才會生效。_

如果你是自己從原始碼編譯 OpenSSH，請升級到 10.6p2。

## 暫時沒辦法更新的話

Alpine 公告建議，至少先把密碼登入關掉，也就是設定 `PasswordAuthentication no`。The Hacker News 也引述 OpenSSH 的 Damien Miller，呼籲受影響的系統立即關閉密碼驗證或停用 SSH。這會讓所有帳號都不能用密碼登入 SSH，所以一定要先確認金鑰登入可用，否則可能把自己鎖在外面。

要注意 `Match` 區塊裡可能另外寫了 `PasswordAuthentication yes`，只改主設定不一定夠。另外，Alpine 預設的 sshd_config 從 3.19 起才會讀 `/etc/ssh/sshd_config.d/` 這個 drop-in 資料夾，更舊的版本會忽略它。Alpine 公告提供了完整的指令，包含 drop-in 設定檔與修改 `Match` 區塊的方式，也說明了如何還原。我建議直接照[公告的「If you cannot update」段落](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)操作，不要自己拼湊。

改完設定同樣要 `sshd -t` 檢查，再重啟 sshd 才會生效。重啟後用 `sshd -T | grep -i passwordauthentication` 確認印出 `passwordauthentication no`，有 `Match` 設定的話也要用 `-C` 檢查相關情境。

## 如果擔心已經被登入過

目前 OpenSSH 和 Alpine 都沒有提到已知的攻擊事件。不過「還沒有報告」不代表「確定沒有人利用過」。另一方面，網路上已經有公開的 PoC，CISA 在 CVE 紀錄中的註記是「poc」，這只代表概念驗證已公開，不等於已經有人在野外利用。

Alpine 建議，在對外開放的機器上檢查這些地方：

- `/var/log/messages` 中 sshd 的 `Accepted password for` 紀錄，特別是登入的帳號本來就沒有密碼，例如 `alpine`、`root` 或只用金鑰的帳號。
- `doas` 的使用紀錄。
- 最近新增的帳號、檔案，以及 `authorized_keys` 有沒有多出不認得的金鑰。

這些紀錄只是線索。查不到可疑紀錄，不能證明主機沒事，因為紀錄可能沒保存、被輪替，或被改過。Alpine 的說法是：如果沒辦法排除曾被登入，就把這台機器當成已遭入侵。實際做法上，可以先把主機從網路隔離或封鎖 SSH 對外連線，從乾淨的映像重建，再更換這台機器上用過的金鑰、密碼、API token 等憑證。

## 給大家的長期建議

這次的條件很特定，但有兩個習慣值得留下來。第一，對外開放的 SSH 伺服器盡量只用金鑰登入，並且明確設定 `PasswordAuthentication no`，不要依賴預設值。第二，判斷有沒有修補時，看你所用發行版的公告和套件版號，不要只拿上游版本號比對。

## 主要來源

查證截至 2026-11-07（台北時間）。

- [OpenSSH 10.6p2 release notes](https://www.openssh.org/txt/release-10.6p2)
- [Alpine Linux 安全公告：openssh-server password authentication bypass](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)
- [Alpine secdb（v3.24 main）](https://secdb.alpinelinux.org/v3.24/main.json)：CVE 與修補版本的對應
- [CVE-2026-123158 紀錄（CVE Services API）](https://cveawg.mitre.org/api/cve/CVE-2026-123158)
- [NVD 上的 CVE-2026-123158（API）](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158)
- [oss-security 郵件列表討論](https://www.openwall.com/lists/oss-security/2026/11/05/3)
- [The Hacker News 原始報導](https://thehackernews.com/2026/11/openssh-issues-emergency-fix-for-flaw.html)
