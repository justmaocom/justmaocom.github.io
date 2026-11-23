# justmao.com SEO 執行方案

目標是讓 justmao.com 從 Google 拿到更多非品牌搜尋點擊，三個語系都算。

技術基建已經到位，這份方案不動它。要做的事依序是先建立 GSC 基線，再用 Page Owner 表管理現有 35 篇文章，然後每週依 SERP 選題寫新文章，最後把每篇文章送到相關的社群與上游專案。

證據等級標在句尾。「實測」是我在 2026-11-18 對線上站或 repo 跑指令看到的結果，文章數、圖片數與內文連入數在 2026-11-19 依 repo 重新計算。「推論」是由實測結果與 playbook 推出的判斷。「猜測」是沒有資料支撐、必須先驗證的假設。我手上沒有 GSC 與 Ahrefs 資料，所以這份方案不寫任何搜尋量、排名、索引數或競品數字。

## 1. 目前狀態

| 項目 | 結果 | 對應章節 |
| --- | --- | --- |
| HTTP、www、尾斜線 | `http://`、`www.` 與無尾斜線網址都 301 到 `https://justmao.com/.../`（實測） | 第 8、10 章 |
| 不存在的頁面 | `/nope-404/` 回真正的 404（實測） | 第 10 章 |
| robots.txt | 沒有誤擋，列出三份 sitemap，帶 `Content-Signal`（實測） | 第 8 章 |
| sitemap | 每個語系一份，各 57 個網址，標籤頁已排除（實測） | 第 10 章 |
| canonical 與 hreflang | 三個語系都自我指向，hreflang 含自身與 `x-default`，`<html lang>` 正確（實測） | 第 7、10 章 |
| 譯文 | 簡中、英文各 35 篇，與繁中檔名一一對應（實測） | 第 9 章 |
| 結構化資料 | 文章輸出 `BlogPosting` 與 `BreadcrumbList`，「關於」頁輸出帶 `sameAs` 的 `ProfilePage`，各語系 URL 帶前綴（實測） | 第 9、10 章 |
| 圖片 alt | 文內 102 張圖都有 alt，35 篇都有封面 alt（實測） | 第 9 章 |
| lastmod | 依 git 歷史產生，兩篇保留較早日期，機制有效（實測） | 第 8、10 章 |
| 監控 | GSC 已驗證，GA4 已裝，IndexNow 已接，Bing Webmaster Tools 未驗證（實測，讀 `_config.yml`） | 第 8 章 |
| GEO | 有 `llms.txt`、Markdown for Agents 與 `Content-Signal`（實測） | 第 23 章 |
| 效能 | 沒有量測，這份方案不對效能下結論 | 第 11 章 |

第 1 章說技術基建「基本是一次性工程」，第 17 章說幾十頁的網站做結構化內部連結的邊際效益不高，第 22 章說沒有流量的新站要看非品牌詞頁面有沒有累積。本站有 35 篇文章，最早一篇是 2026-09-15 發布的（實測）。所以接下來的瓶頸在內容與站外，不在技術（推論）。

## 2. 前提調整

這本書寫給 AI 工具站與 SaaS 官網。本站是個人技術部落格，沒有產品、定價與註冊流程。下表把書中的概念換成本站的對應物（推論）。

| 書中概念 | 本站對應 |
| --- | --- |
| Entity | 一位軟體工程師用實際操作與原始碼驗證 coding agent 用法的個人網站，已寫在 `home_title` 與「關於」頁 |
| ICP 使用者 | 已經在用 Claude Code、Codex、Cursor，想馬上設定某件事的工程師，對應教學文 |
| ICP 購買者 | 評估要不要導入某套 skill、某個工具，或要替團隊設安全規則的技術主管，對應比較文與檢查清單 |
| ICP 學習者 | 想理解 AI 原生開發流程或 FDE 的讀者，對應說明文 |
| 目錄與頻道 | 分類與系列導讀，網址維持 `/posts/<slug>/` |
| SEO 必做型頁面 | 首頁、「關於」頁、兩篇系列導讀 |
| SEO 增長型頁面 | 每一篇教學、比較與拆解文章 |
| 轉化 | 自然搜尋進站後的互動、點到 GitHub 與 X 的外連、留言。這是我的假設，請你定案 |
| Money Pages | 非品牌自然點擊最多、互動也最好的文章，等 GSC 與 GA4 有資料再挑 |

## 3. 不做的事

- 不做工具頁模板與 Feature、Solution、Pricing 頁。本站沒有可以操作的產品（第 14 章）。
- 不做 pSEO。本站沒有可以按欄位組合、每頁又有獨立資料的內容（第 21 章）。
- 不提交 AI 導航站與目錄站，也不買客座文章。這些是替產品建反向連結的做法，部落格文章拿不到有讀者的分類位置（第 18 到 20 章）。
- 不做付費轉化追蹤。沒有註冊與付款可以追（第 22 章）。
- 不做 Ahrefs 競品對標。沒有 Ahrefs 資料，就算不出對手的 Top Pages 與 Referring Domains（第 4 章）。改成在階段 4 查 SERP 時，記下反覆出現在前 10 名的網域，這份名單就是本站的 SEO 競爭對手。
- 不加 `FAQPage` 與 `HowTo` 結構化資料。第 9 章說 Google 已停止顯示這兩種複合式搜尋結果。
- 不改現有網址，包括百分比編碼的中文分類網址。第 7 章與 `CLAUDE.md` 都要求上線後的網址不要為了好看而改。
- 不做百度 SEO。這是另一套搜尋引擎與規則，不在這份方案範圍內。

## 4. 執行步驟

每個階段結尾都有一項檢查。階段 0 到 3 依序做，檢查沒過就不進下一階段。階段 4 到 6 是持續進行、會互相重疊的工作，結尾的檢查是定期回顧點。

### 階段 0 建立量測基線

時間是第 1 週，大約 1 小時。

1. 在 GSC 的 **Sitemaps** 分別提交 `/sitemap.xml`、`/zh-CN/sitemap.xml` 與 `/en/sitemap.xml`。robots.txt 已經列出這三份，但只有在 GSC 提交過，**網頁索引** 報表才能依 sitemap 篩選，你也才看得到各語系的索引狀況（第 10 章）。
2. 在 **成效** 報表選過去 3 個月，記下總點擊與總曝光。
3. 在同一份報表新增查詢篩選，選「自訂（規則運算式）」與「不符合」，填入 `(?i)justmao|只是一根毛`，記下非品牌點擊與曝光。
4. 新增網頁篩選，分別記下三個語系的數字。英文用「網址包含」`/en/`，簡中用「網址包含」`/zh-CN/`，繁中用規則運算式「不符合」`/(en|zh-CN)/`。
5. 在 **網頁索引** 依 sitemap 篩選，記下每份 sitemap 已建立索引的網址數，與 57 比較。
6. 到 Bing Webmaster Tools 選「從 Google Search Console 匯入」。這一步不用改 repo，之後就有 Bing 的查詢與索引資料。目前 IndexNow 只負責送網址，拿不到回饋資料。
7. 在 GA4 的資料串流設定確認「加強型評估」有開，捲動與外連點擊才會記錄。

**檢查。** 一張基線表寫好了。表上有日期，以及每個語系的已索引數、非品牌點擊與非品牌曝光。

### 階段 1 定下 Entity 與主題地圖

時間是第 1 週。

下面的 Entity 草稿取自 `_tabs/about.md` 與 `home_title`，邊界那一條要你定稿（第 5 章）。

- 我是誰。一位軟體工程師的個人網站，用實際操作與原始碼驗證 coding agent 的用法。
- 我提供什麼。Coding agent 的 skill 與工作流程教學、agent 與開發流程的資安檢查、開源工具的原始碼拆解。
- 我服務誰。已經在用 coding agent 的工程師與技術主管，涵蓋繁中、簡中與英文讀者。
- 我不寫什麼。這一條是建議，請你改。AI 新聞與模型發表速報、與 agent 無關的一般程式教學、聊天機器人的提示詞技巧。

主題地圖依現有 35 篇整理如下（實測，依文章內容分類）。

| 叢集 | 篇數 | 目前的 hub |
| --- | --- | --- |
| A. Agent skill 套件與寫法 | 13 | 兩篇系列導讀，分別有 12 與 5 篇內文連入 |
| B. Claude Code 與多 agent 工作流程 | 9 | 沒有 |
| C. Agent 資安與攻擊鏈 | 5 | `coding-agent-supply-chain-permission-risks`，有 15 篇連入 |
| D. 套件與 CI 供應鏈安全 | 4 | 沒有 |
| E. 原始碼拆解 | 1 | 沒有 |
| F. 主題外 | 3 | 不需要 |

`claude-code-sandbox-setup` 與 `claude-code-plugin-safe-install` 同時屬於 B 與資安。依第 6 章「一個叢集一個 Page Owner」的原則，各自只歸一個叢集，歸法見附錄 A。F 叢集的 3 篇照常保留，但不再往這些方向加文章，除非你決定擴大 Entity。

**檢查。** 35 篇各自只屬於一個叢集。每個新題目都能對到 A 到 E 其中一個叢集，對不到的就不寫。

### 階段 2 盤點現有 35 篇的 Page Owner

時間是第 2 週。

1. 以附錄 A 為底稿。在 GSC **成效** 選「網頁」分頁，逐篇點進去看「查詢」分頁，把曝光最多的非品牌查詢填進「GSC 實際主查詢」欄。
2. 找出同一個查詢有兩篇以上文章取得曝光的情況。做法是在「查詢」分頁點進該查詢，再看「網頁」分頁。優先查 herdr 的兩篇與 A 叢集的系列導讀與第 1 篇（猜測）。
3. 對每篇標上 Keep、Update 或 Merge。預設是 Keep。只有兩篇文章搶同一個查詢、而且內容確實重疊時才標 Merge（第 6 章）。
4. 資料還太少的文章維持 Keep，8 週後再看。

這一步有兩個成本。改任何一篇內文都要同時改三個語系的檔案，也會更新 `dateModified` 與 sitemap 的 `lastmod`，部署時 IndexNow 會再送一次這些網址。

**檢查。** 沒有任何一個查詢叢集同時對到兩個 Page Owner。

### 階段 3 補內部連結與兩個 hub

時間是第 2 到 3 週。

1. 替內文連入少的三篇補上下文連結（實測）。
   - `claude-code-plugin-safe-install` 目前 0 篇連入，可以從 `coding-agent-supply-chain-permission-risks` 與 `owasp-agentic-top-10-ai-workflow-checklist` 連入。
   - `agent-browser-ai-test-web-pages` 目前 0 篇連入，可以從 `claude-code-hooks-automate-checks` 與 `pstack-build-verify-merge` 連入，它本身已連到這兩篇。
   - `npm-12-install-scripts-allowscripts` 目前只有 `agent-browser-ai-test-web-pages` 連入，同叢集的 `npm-trusted-publishing-github-actions` 與 `npm-release-pipeline-lockdown` 還沒連到它。
2. `gpa-question-webapp-study-loop` 與 `fde-platform-customization-economics` 也是 0 篇內文連入，但首頁、彙整、分類與「延伸閱讀」都連得到它們，所以不算孤兒頁（實測）。它們屬於 F 叢集，不用補。
3. 評估替 B 與 D 叢集各寫一篇 hub 文章，做法比照兩篇系列導讀。Hub 要有自己的內容，例如把 D 叢集四篇的檢查項目整理成一張供應鏈檢查清單，不能只是一頁連結列表（第 16、17 章）。寫之前先照階段 4 的流程查 SERP，確認這個主題有人搜尋（猜測，尚未驗證）。

重新計算內文連入數可以在 repo 根目錄執行下面的指令，它只看繁中原文。

```bash
for f in _posts/*.md; do s=$(basename "$f" .md | cut -c12-); n=$(grep -l "/posts/$s/" _posts/*.md | grep -v "$f" | wc -l | tr -d ' '); echo "$n $s"; done | sort -n
```

**檢查。** 上面的指令顯示 A 到 E 叢集的每一篇都至少有 1 篇其他文章在內文連入它，而且 `bash tools/test.sh` 通過。

### 階段 4 建立每週新文章流程

從第 3 週開始，每週執行。

依第 12 章，每週只排你真的寫得完的篇數，而且每篇都要三個語系。11 月 1 日到 14 日發了 17 篇，平均每週約 8 篇（實測，數 `_posts` 檔名日期）。每篇多了查 SERP 這一步之後，建議把篇數降到每篇都能完整走完下面流程的數量（推論）。

每篇新文章都照下面的順序做（第 9、13 章）。

1. 先確認主題落在哪個叢集，以及現有文章能不能承接。能承接就更新舊文，不開新頁（第 6 章）。
2. 每個語系各定一個 Top Keyword。不要直接翻譯關鍵字，要分別查目標市場的 SERP（第 9 章）。繁中查台灣的 Google，英文查美國的 Google。
3. 打開 SERP 前 10 名逐一閱讀，記下頁面類型、格式、角度、大家都有的段落，以及大家都沒講清楚的地方（第 13 章）。
4. 先寫大家都有的基礎內容，再補上只有你有的資訊增量。本站已有的增量是實際跑出來的結果、標明的工具版本、失敗情況，以及事實與判斷分開寫（第 16 章）。
5. 標題與描述在三個語系各自圍繞該語系的 Top Keyword 撰寫。
6. 主題要寫成多篇系列時，照[系列教學規則](series-playbook.md)規劃分集與系列導讀。

第 15 章建議優先寫比較、替代與評測文，因為純知識型查詢容易被 AI Overview 直接回答。下面是符合 Entity 的候選題目，全部都要先查 SERP（猜測）。

- mattpocock/skills 與 pstack 的比較。本站兩套都寫過完整系列，這是別人很難寫出的比較。
- herdr 與其他終端機多 agent 管理工具的比較。
- Claude Code 沙箱與 devcontainer 的比較，重點是各自擋得住什麼。
- 「AGENTS.md 與 CLAUDE.md 的差別」先不要開新頁。現有的 AGENTS.md 文章已經說明兩個工具各自怎麼讀，所以它就是這個意圖的 Page Owner。如果 GSC 出現這類查詢，就在那篇補一個 H2。
- 追新功能。第 5 章說新出現的詞還沒有搜尋量資料，競爭也少。本站 npm 12 與 `gh actions-lock` 兩篇就是這類題目。固定追 Claude Code、Codex、npm 與 GitHub Actions 的 changelog，有本站讀者在意的新功能就實測後寫。

發布前用下面這份清單檢查。它由第 9 章的清單改寫，拿掉了本站不適用的項目。

- [ ] 這篇是某個查詢叢集唯一的 Page Owner。
- [ ] 每個語系的標題自然包含該語系的 Top Keyword，描述具體寫出讀者會得到什麼。
- [ ] 開頭兩三句寫出這篇解決什麼問題、適合誰。
- [ ] 讀者照著做完，不需要回到搜尋結果再找其他文章。第 3 章把這叫做 Last-Click。
- [ ] 文中寫出工具版本與查證日期。
- [ ] 至少有 1 篇同叢集的舊文在內文連到這篇。系列文要補上一篇的導覽。
- [ ] 封面與文內圖片都有 alt，而且是 WebP。
- [ ] `bash tools/test.sh` 通過。
- [ ] 部署後在 GSC 用 **網址審查** 檢查繁中與英文網址各一次。

**檢查。** 每篇發布滿 2 週後，在 GSC **網頁索引** 確認三個語系的網址都已建立索引。沒有建立索引的，先查內部連結與內容重複，不要靠增加篇數解決（第 21 章）。

### 階段 5 取得站外推薦

在每篇文章發布後執行，持續進行。

第 18 章的判斷標準依序是讀者精準、主題相關、在領域內有影響力，最後才看 DR。依這個標準，本站適合下面幾種做法（推論）。

1. 在 GitHub 個人頁 README 與 X 個人簡介放上網站連結。專案 repo 的 README 連回對應文章，例如 `gpa-question-webapp`。這一項要你確認目前的狀態。
2. 寫到特定開源工具的文章，例如 mattpocock/skills、pstack、herdr 與 OpenWiki，到上游的 Discussions 或相關 issue 分享。只在文章確實回答了某個問題時才分享。第 18 章把這類做法歸為 Asking。
3. 依語系選社群。英文文章分享到英文開發者社群，例如 Reddit 的 coding agent 相關版。原創調查，例如 libheif 攻擊鏈與 OpenWiki 拆解，可以考慮 Hacker News。繁中文章分享到台灣的開發者社群。
4. 用 `md2x` skill 把文章轉成 X Articles 草稿，文中要連回原文。X 上的連結主要帶來點擊，不太會傳遞排名訊號（推論）。

用一張表追蹤，欄位包含來源網址、目標文章、連結屬性、刊出日期，以及 GA4 的引薦工作階段數（第 18 章）。

**檢查。** 每兩週看一次 GA4 **流量開發** 的引薦來源，以及 GSC **連結** 報表的「熱門連結網站」。

### 階段 6 每兩週複盤

從第 4 週開始，每兩週一次。

每次看下面四件事，每件事都對應一個決定（第 0.2、22 章）。

| 看什麼 | GSC 報表 | 對應的決定 |
| --- | --- | --- |
| 有曝光、平均排名在 11 到 20 名的非品牌查詢（第 20 章） | **成效**，篩選非品牌與語系 | 更新該查詢的 Page Owner 的標題、H2 或內容 |
| 同一個查詢出現兩篇文章 | **成效**，查詢的「網頁」分頁 | 選定 Page Owner，調整另一篇的角度 |
| 各叢集的曝光趨勢 | **成效**，用網址規則運算式篩選叢集內的 slug | 下一批題目優先排在曝光成長的叢集 |
| 各語系的曝光趨勢 | **成效**，依語系篩選 | 決定各語系要不要繼續投入同樣的人力 |

第 8 週要做一次語系投入的決定。中國大陸的主要搜尋引擎不是 Google，所以 Google 上的簡中曝光可能偏低（推論）。如果 8 週後簡中的非品牌曝光遠低於另外兩個語系，可以考慮簡中改為只維持字詞轉換，不再逐篇查簡中 SERP。這個決定要你來做。

**檢查。** 每次複盤留下一行紀錄，寫明日期、看到的數字，以及據此做了哪個決定。

## 5. 低優先的技術待辦

這些都要改程式，做之前請改走 Feature 流程。每項都標了成本。

| 項目 | 依據 | 成本 |
| --- | --- | --- |
| 只有 1 篇文章的分類頁 | 13 個分類中有 7 個只有 1 篇（實測），第 10 章說 sitemap 只放希望出現在搜尋結果的頁面 | 和 `CLAUDE.md`「分類頁保持可收錄」的決定衝突，先看 GSC 有沒有分類頁的曝光再決定 |
| 首頁有 10 個 `<h1>` | 主題的首頁卡片標題用 `<h1>`（實測） | 要把 gem 裡的 `_layouts/home.html` 複製到 repo 再改，日後升級主題要自己合併 |
| 效能 | 沒有量測 | 先用 PageSpeed Insights 測首頁與各語系一篇文章的手機版。LCP 超過 2.5 秒或 CLS 超過 0.1 才處理（第 11 章） |

lastmod 有一件事要你決定。35 篇中有 32 篇的 `lastmod` 是 2026-11-17（實測）。原因是 11-17 有 32 個逐篇改成第一人稱的 commit，剛好對應這 32 篇，而且都是真的改了內文，所以機制沒有出錯（實測，讀 `git log`）。現在把這些 commit 補進 `.lastmod-ignore-revs`，32 篇的 `dateModified` 會往回改，IndexNow 會再送一次全部文章，所以我建議維持現狀。之後如果再做「只改文風、不改事實」的全站修改，先決定它算不算內容更新。不算的話，合併後把 SHA 加進 `.lastmod-ignore-revs`。

## 附錄 A 現有 35 篇的 Page Owner 底稿

「標題主詞」取自目前的繁中標題，只代表標題鎖定的詞，沒有驗證搜尋量。「建議」是根據內容與連結結構的初判，階段 2 要用 GSC 資料修正。

| slug | 叢集 | 標題主詞 | 意圖 | 建議 |
| --- | --- | --- | --- | --- |
| `mattpocock-skills-series-guide` | A | mattpocock/skills | 導覽 | Keep，系列主詞的 Page Owner |
| `mattpocock-skills-setup-routing-guide` | A | mattpocock/skills 安裝、ask-matt | 教學 | Keep |
| `mattpocock-skills-requirements-shared-language` | A | grill-me | 教學 | Keep |
| `mattpocock-skills-specs-work-breakdown` | A | to-spec、to-tickets | 教學 | Keep |
| `mattpocock-skills-implementation-feedback-loops` | A | tdd、diagnosing-bugs | 教學 | Keep |
| `mattpocock-skills-design-review-integration` | A | code-review、merge conflict | 教學 | Keep |
| `mattpocock-skills-research-handoff` | A | research、handoff | 教學 | Keep |
| `pstack-series-guide` | A | pstack | 導覽 | Keep，系列主詞的 Page Owner |
| `pstack-install-routing` | A | pstack 安裝、poteto-mode | 教學 | Keep |
| `pstack-understand-design` | A | pstack 設計流程 | 教學 | Keep |
| `pstack-build-verify-merge` | A | pstack 驗證與合併 | 教學 | Keep |
| `pstack-principles-customization` | A | pstack 原則、自訂 mode | 教學 | Keep |
| `agent-skill-authoring-guide` | A | Agent Skill 怎麼寫、SKILL.md | 教學 | Keep |
| `agents-md-project-rules-for-coding-agents` | B | AGENTS.md 怎麼寫 | 教學 | Keep，也承接 AGENTS.md 與 CLAUDE.md 的比較意圖 |
| `claude-code-hooks-automate-checks` | B | Claude Code hooks 教學 | 教學 | Keep |
| `claude-code-sandbox-setup` | B | Claude Code 沙箱設定 | 教學 | Keep |
| `git-worktree-parallel-ai-agents` | B | git worktree 教學 | 教學 | Keep，靠「AI agent」角度和一般 git 教學區隔 |
| `herdr-run-multiple-ai-agents` | B | herdr 入門 | 教學 | 階段 2 確認是否和桌面 App 篇搶同一個查詢 |
| `herdr-app-desktop-manage-ai-agents` | B | Herdr 桌面 App | 教學 | 同上，工具改版時更新 |
| `github-actions-ai-agent-pr-review` | B | GitHub Actions AI 審查 | 教學 | Keep |
| `ai-native-sdlc-playbook` | B | AI 原生開發流程 | 說明 | Keep |
| `agent-browser-ai-test-web-pages` | B | agent-browser 入門 | 教學 | 補內文連入，目前 0 篇；工具改版時更新 |
| `coding-agent-supply-chain-permission-risks` | C | 第三方 skill 與 MCP 的風險 | 說明與清單 | Keep，C 叢集實際上的 hub |
| `owasp-agentic-top-10-ai-workflow-checklist` | C | OWASP Agentic Top 10 | 檢查清單 | Keep |
| `claude-code-plugin-safe-install` | C | Claude Code plugin 安裝 | 教學 | 補內文連入，目前 0 篇 |
| `openai-libheif-sso-attack-chain` | C | HEIF、SSO 攻擊鏈 | 分析 | Keep |
| `openssh-musl-password-bypass-alpine` | C | CVE-2026-123158 | 修補指引 | 修補狀態改變時更新，長期流量有限 |
| `npm-trusted-publishing-github-actions` | D | npm Trusted Publishing | 教學 | Keep |
| `npm-release-pipeline-lockdown` | D | npm 發布流程上鎖 | 教學 | Keep |
| `npm-12-install-scripts-allowscripts` | D | npm 12 allowScripts | 教學 | 補內文連入，目前 0 篇 |
| `gh-actions-lock-workflow-lockfile` | D | gh actions-lock | 教學 | Keep |
| `openwiki-agent-docs-maintenance` | E | OpenWiki | 原始碼拆解 | OpenWiki 發新版時更新 |
| `gpa-question-webapp-study-loop` | F | 採購法題庫練習網站 | 專案紀錄 | Keep，不再加同方向文章 |
| `fde-platform-customization-economics` | F | FDE 規模化 | 演講筆記 | Keep，不再加同方向文章 |
| `jekyll-blog-three-languages` | F | Jekyll 多語系 | 教學 | Keep |
