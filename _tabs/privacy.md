---
# 標題由 _data/locales/<lang>.yml 的 tabs.privacy 提供
icon: fas fa-user-shield
order: 6
# 放在頁尾，不進側欄（_includes/footer.html）
footer: true
description: justmao.com 載入哪些分析工具與第三方服務、各自何時連線與收集什麼，以及電子報存了哪些資料。
---

你在 justmao.com 看文章時，瀏覽器會連到哪些第三方、留下哪些資料？這頁逐項列出本站載入的追蹤程式碼與第三方服務，以及你能怎麼關掉它們。

最後更新：2026-11-27

## 歐洲時區的訪客同意後才載入分析工具

本站載入兩個分析工具。下表列出各自的用途，完整的收集項目見官方說明。

| 工具 | 用途 | 在本站網域寫入的 cookie | 官方說明 |
| --- | --- | --- | --- |
| Google Analytics | 統計瀏覽的頁面與流量來源 | `_ga`、`_ga_*` | [Google 隱私權政策](https://policies.google.com/privacy) |
| Microsoft Clarity | 記錄點擊、捲動與滑鼠移動，產生熱點圖與工作階段重播 | `_clck`、`_clsk` | [Microsoft 隱私權聲明](https://privacy.microsoft.com/privacystatement) |

要不要先問你，依瀏覽器的時區決定：

- 時區不在歐洲：打開頁面就直接載入兩個工具。畫面上不會出現橫幅，頁尾也沒有「Cookie 設定」按鈕。
- 時區在歐洲：頁面底部出現橫幅，按「接受」才載入。按「拒絕」就不載入，並刪掉上表的 cookie。之後可以按頁尾版權列旁的「Cookie 設定」，重新開啟橫幅。

時區不在歐洲的訪客想關掉分析工具，只能在瀏覽器這一層擋下它們：

- 使用擋追蹤的擴充功能。
- 安裝 [Google Analytics 停用外掛](https://tools.google.com/dlpage/gaoptout)，它只對 Google Analytics 有效。

只封鎖本站的 cookie 關不掉分析工具。兩個工具仍會載入，Clarity 沒有 cookie 也會繼續收集資料，見 [Clarity 的同意說明](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management)。

## 文章頁的影片與分享按鈕會連到第三方

文章頁上還有兩項第三方服務，連線的時機各不相同。

| 服務 | 什麼時候連線 | 送出什麼或存什麼 | 官方說明 |
| --- | --- | --- | --- |
| YouTube 嵌入影片 | 有嵌入影片的文章，捲到影片附近時才載入 | 播放器從 www.youtube.com 載入，載入後 YouTube 會寫入它自己的 cookie | [Google 隱私權政策](https://policies.google.com/privacy) |
| 分享按鈕（X、Facebook、Telegram、Weibo、Reddit、Threads） | 按下才連到該平台 | 該平台會收到這篇文章的標題與網址 | 各平台自己的政策 |

## 電子報的地址存在本站自架的伺服器

[電子報](/newsletter/)頁的訂閱表單，會送到本站自架的電子報系統 listmonk（news.justmao.com）。訂閱資料包含你的電子郵件地址，以及你訂閱的語系清單，三個語系各有一份清單。

listmonk 不把你的 IP 位址存進訂閱資料。電子報不追蹤開信與點擊，listmonk 和 SMTP2GO 的追蹤功能都沒有開。送出表單時，伺服器仍會用你的 IP 位址，限制同一個位址的送出次數。

送出前，你的瀏覽器要先算出一道 ALTCHA 驗證題（proof-of-work），確認送出的不是機器人。題目向 news.justmao.com 取得，不經過第三方驗證服務。驗證元件的檔案放在本站，你第一次操作表單時才下載。

訂閱採雙重確認（double opt-in）：先寄一封確認信給你，你按下確認才算訂閱。確認信與電子報都經 SMTP2GO 寄出，它的資料處理見 [SMTP2GO 隱私權政策](https://www.smtp2go.com/privacy/)。

想取消訂閱或要求刪除地址，請寫信到頁尾「聯繫」欄的 Email。

## AI 搜尋會把你輸入的字詞送到 Cloudflare

每一頁頂欄的放大鏡按鈕（或按 Ctrl/⌘+K）會打開 AI 搜尋視窗，搜尋由 Cloudflare AI Search 處理。你在搜尋框打字時，每停頓一下，瀏覽器就把框裡的字詞送到 Cloudflare AI Search（search.justmao.com），不必按 Enter。Cloudflare 同時會經手你的 IP 位址等連線資訊，處理方式見 [Cloudflare 隱私權政策](https://www.cloudflare.com/privacypolicy/)。

搜尋元件內建一項使用統計，會另外把搜尋字詞與點過的結果送給 Cloudflare，本站把它關掉了。元件的檔案放在本站，你第一次打開搜尋視窗時才下載。你開啟過與收藏的結果只存在你的瀏覽器，見下一節的表格。

## 有些資料只存在你的瀏覽器

下表的資料存在你的瀏覽器，不會送回本站。前六項存在 localStorage（瀏覽器替每個網站保留的儲存空間），最後一項是離線快取。

| 名稱 | 存什麼 |
| --- | --- |
| `theme` | 你手動切換的深淺色模式 |
| `site-lang` | 你手動選過的語系 |
| `site-lang-hint-dismissed` | 你關掉了語系提示列 |
| `analytics-consent` | 歐洲時區訪客在 cookie 橫幅上的選擇 |
| `search-snippet:recent-results` | 你在 AI 搜尋最近開啟的 5 筆結果（標題、摘要與網址等） |
| `search-snippet:favorite-results` | 你在 AI 搜尋收藏的結果（標題、摘要與網址等） |
| 離線快取 | 你看過的頁面與檔案，供離線瀏覽 |

在瀏覽器清除本站的網站資料，就會刪掉上表全部項目。

## 主機會經手連線資訊，網頁本身不設定 cookie

網站由 GitHub Pages 託管，請求經 Cloudflare 轉送。兩者傳送網頁時會經手你的 IP 位址等連線資訊，處理方式見 [GitHub 隱私權聲明](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)與 [Cloudflare 隱私權政策](https://www.cloudflare.com/privacypolicy/)。

本站的網頁本身不設定 cookie，cookie 只來自前面列出的第三方服務。字型與前端函式庫（Font Awesome、mermaid、MathJax 等）都放在本站，不從其他網站載入。

## 有疑問請寫信到頁尾的 Email

對這頁的內容有疑問，請寫信到頁尾「聯繫」欄的 Email。
