# SEO Roast 路線圖：justmao.com（2026-11-22）

判決：沒有 FATAL。站外檢查都通過，GSC「網頁索引」顯示 Google 已收錄 278 頁，沒有整站性的阻擋。還沒確認的是 Bing，以及 10 個「已檢索但未建立索引」的網址是哪幾頁，所以它們排第 1 列。

這份文件由 `/seo-roast` 產生，只做排序。每一列的細節與數字在 [`backlog.md`](backlog.md)，策略以 [`docs/seo-execution-plan.md`](../docs/seo-execution-plan.md) 為準，兩者衝突時以方案為準。

本站沒有產品與營收。「營收影響」一律換成非品牌自然點擊，數字取自 GSC 基線（2026-10-23 到 11-19，見 [`context.md`](context.md)）。沒有資料的寫「未量測」。

## 檢查結果

2026-11-22 對線上站執行。下表是通過的項目，沒過的都在路線圖裡。

| 檢查 | 結果 |
| --- | --- |
| robots.txt | 預設允許，只擋 `/norobots/`，列出三份 sitemap，三份都回 XML |
| 爬蟲存取 | Googlebot、Bingbot、GPTBot、OAI-SearchBot、PerplexityBot、ClaudeBot 抓首頁、`/en/`、`robots.txt`、`llms.txt` 都回 200。Bingbot 與 GPTBot 抓一篇英文文章，內容長度與 curl 預設 UA 相同 |
| 不存在的網址 | 三個語系都回 404 |
| 轉址 | `http://`、`www.`、無尾斜線與 `justmaocom.github.io` 都是一次 301 |
| sitemap 的 174 個網址 | 全部回 200，canonical 指向自己，沒有 `noindex`，`<html lang>` 正確，標題沒有重複 |
| hreflang | 三個語系加 `x-default`，每頁都列出自己，互指的網址都在 sitemap 裡。分類頁依設計不輸出 |
| 語系數 | 3 個，各 37 篇，檔名一一對應。英文文章頁沒有殘留的中文介面字串 |
| 數字一致 | `llms.txt` 列 37 篇文章，sitemap 也是 37 篇 |
| Google 索引（GSC 匯出，資料到 2026-11-16） | 已建立索引 278 頁。沒有「遭到 robots.txt 封鎖」，沒有 canonical 被 Google 改選的類別，「已找到 - 目前尚未建立索引」是 0 |
| Markdown for Agents | 帶 `Accept: text/markdown` 抓首頁與文章頁，回 `text/markdown` |
| 重點文章的內文連入 | pstack 與 mattpocock/skills 兩個系列的每一篇都有 3 篇以上 |

## 路線圖

依基線期間的曝光由多到少排（第 2 到 10 列），索引驗證放最前面，因為它沒過的話下面每一列都白做。

| # | 等級 | 問題 | 影響的點擊 | 做法 | 負責 | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 待驗證 | Bing 的索引狀態沒有資料，Bing Webmaster Tools 未驗證。Google 有 10 頁「已檢索 - 目前尚未建立索引」、1 頁轉址式 404、1 頁其他 4xx、2 頁 404，匯出檔沒有網址清單，也沒有依 sitemap 篩選 | Bing 的索引還供應 Copilot 與 DuckDuckGo。那 10 頁如果是文章，曝光就是 0 | Bing Webmaster Tools 從 GSC 匯入。在 GSC「網頁索引」點進這四個原因各匯出網址清單，再依三份 sitemap 篩選，各與 58 比較（方案階段 0 第 5、6 步，backlog 17） | 站長匯出，agent 判讀 | Google 整站已驗證，其餘下一步 |
| 2 | REVENUE | `/en/posts/pstack-install-routing/` 排名 10.3，點閱率 1.08% | 923 次曝光 | 標題與開頭已在 PR #122 改完。2026-12-06 以後匯出 GSC 驗收（backlog 1） | 站長匯出，agent 判讀 | 已上線，待驗收 |
| 3 | REVENUE | `/posts/mattpocock-skills-series-guide/` 排名 7.9，點閱率 3%，帶曝光的多是英文查詢 | 592 次曝光 | 先匯出這頁的查詢，再決定改繁中標題還是讓英文版排上來（backlog 8） | 站長匯出，agent 改 | 等資料 |
| 4 | REVENUE | 三個語系的首頁都沒有連到兩篇系列導讀，它們排在首頁第 2、3 頁，沒有任何文章置頂。方案把這兩篇列為必做型頁面 | 兩篇導讀承接系列主詞，mattpocock 那篇有 592 次曝光 | 兩篇導讀加 `pin: true`，三個語系共 6 個檔案。這會改變首頁的排列，要站長先同意。合併後把 SHA 加進 `.lastmod-ignore-revs` | 站長決定，agent 改 | 待決定 |
| 5 | REVENUE | `/en/posts/pstack-understand-design/` 排名 6.2，點閱率 2%，標題 69 字元會被截斷 | 500 次曝光。同系列第 3 篇的同類查詢點閱率是 12% 到 29% | 先匯出這頁的查詢，並查證 `the complete guide to pstack` 是不是別人的文章標題（backlog 3、4） | 站長匯出，agent 改 | 等資料 |
| 6 | REVENUE | `/en/projects/` 排名 4.5，0 次點擊，標題只有 `Projects \| JustMao` | 410 次曝光 | 匯出這頁的查詢，看讀者在找什麼（backlog 5） | 站長匯出，agent 改 | 等資料 |
| 7 | REVENUE | `/en/posts/mattpocock-skills-setup-routing-guide/` 排名 9.3，點閱率 2.4%，原本的英文標題沒有 install 與 ask-matt | 205 次曝光 | 英文標題與描述已在 PR #126 改完。2026-12-06 以後匯出 GSC 驗收（backlog 2） | 站長匯出，agent 判讀 | PR #126 待合併 |
| 8 | REVENUE | `/en/posts/mattpocock-skills-research-handoff/` 排名 10.1，0 次點擊 | 104 次曝光 | 把 handoff 放進英文標題前段（backlog 6） | agent | 未開始 |
| 9 | REVENUE | 英文的 AGENTS.md 與 skill 撰寫兩篇排在第 3 頁（22.4 與 20.5） | 52 與 28 次曝光 | 讀搜尋結果前五名，找出本站缺什麼（backlog 9） | agent | 工時較長 |
| 10 | REVENUE | `pstack statechart` 有人搜尋，全站沒有一篇提到 | 21 次曝光 | 確認這個 skill 是哪一版加入的，再決定補在第 2 篇或另寫（backlog 7） | agent | 未開始 |
| 11 | REVENUE | `shadcn-improve-advisor-executor` 沒有任何文章在內文連入它，沒過方案的發布前清單（至少 1 篇同叢集舊文連入） | 未量測，2026-11-22 才發布 | 從同叢集的舊文補一個上下文連結，三個語系一起改 | agent | 未開始 |
| 12 | COMPOUNDING | 站外連結的數量與來源未知，沒有 Ahrefs，GSC「連結」報表沒匯出 | 未量測 | 匯出 GSC「連結」的熱門連結網站，再照方案階段 5 做：GitHub 個人頁與專案 README 連回站台、到上游專案的 Discussions 分享 | 站長 | 未開始 |
| 13 | COMPOUNDING | AI 助理有沒有引用本站未知，[`ai-prompts.md`](ai-prompts.md) 的 25 題還沒問過 | 未量測。爬蟲端沒有阻擋 | 把 25 題拿去問 ChatGPT、Perplexity 與 Google AI Overviews，結果填回表內 | 站長 | 未開始 |
| 14 | COMPOUNDING | B 與 D 叢集沒有 hub 文章 | D 叢集四篇三個語系合計 42 次曝光、2 次點擊 | 先查搜尋結果確認有人搜尋，再寫（backlog 12、13） | agent | 未開始 |
| 15 | COMPOUNDING | 37 篇文章的 `lastmod` 有 35 篇是 2026-11-21，2 篇是 11-22 | 未量測。全站同一天更新時，搜尋引擎分不出哪篇真的改過 | 之後全站性的文風修改，合併前先決定算不算內容更新，不算就把 SHA 加進 `.lastmod-ignore-revs` | 站長 | 待決定 |

roast 的門檻是 3 篇內文連入，比方案的 1 篇嚴。只沒過 roast 門檻的有 7 篇，暫不處理：`agent-browser-ai-test-web-pages`、`openwiki-agent-docs-maintenance`（1 篇），`herdr-run-multiple-ai-agents`、`herdr-app-desktop-manage-ai-agents`、`modern-web-guidance-coding-agent`、`openai-libheif-sso-attack-chain`、`openssh-musl-password-bypass-alpine`（2 篇）。F 叢集的 `gpa-question-webapp-study-loop`、`fde-platform-customization-economics`（0 篇）與 `jekyll-blog-three-languages`（1 篇）依方案階段 3 不補。三個語系的數字相同。

## 不適用與不採用

- **SafeSearch**：站上沒有使用者上傳的媒體，留言由 giscus 在 iframe 裡載入。
- **只有 1 篇文章的分類頁**：13 個分類有 7 個只有 1 篇。roast 的規則是少於 3 筆就 `noindex`，方案第 5 章與 `CLAUDE.md` 決定保持可收錄，基線期間這些頁面也有曝光，所以不動。
- **首屏版面**：沒有用瀏覽器量測。首頁 HTML 的主內容第一個區塊是文章卡片。
- **展示牆、定價頁、產品徽章與嵌入碼**：本站沒有產品（方案第 3 章）。
- **付費連結、目錄站提交、LinkDR、AI SEO Tracker**：方案第 3 章決定不做。

## 細項（上面的列做完之前不處理）

- 首頁分頁（`/page2/` 到 `/page4/`）的描述與首頁相同，三個語系共 9 頁。`/en/page2/` 與 `/en/page3/` 合計 79 次曝光、0 次點擊（backlog 14）。
- 首頁有 10 個 `<h1>`（backlog 15）。
- 7 篇文章的描述過長（backlog 11）。
- 效能沒有量測（backlog 16）。
