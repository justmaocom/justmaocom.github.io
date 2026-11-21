# SEO 例行工作的背景資料

這個目錄是 `/seo-autopilot` 的狀態檔，每次執行先讀、結束前更新。它列在 `_config.yml` 的 `exclude`，不會輸出到網站。repo 是公開的，這裡不放不能公開的資料。

策略以 [`docs/seo-execution-plan.md`](../docs/seo-execution-plan.md) 為準。該方案「不做的事」與這份例行工作的預設步驟衝突時，以方案為準：不提交目錄站、不買連結、不做工具頁與 pSEO、不加 `FAQPage`／`HowTo`、不改既有網址、分類頁保持可收錄。

## 執行設定

| 項目 | 值 | 來源 |
| --- | --- | --- |
| Site | `https://justmao.com` | `_config.yml` 的 `url`、`CNAME` |
| Product | 沒有產品。一位軟體工程師的個人技術部落格，用實際操作與原始碼驗證 coding agent 的用法 | `docs/seo-execution-plan.md` 第 2 章、`_tabs/about.md` |
| Conversion | 假設：自然搜尋進站後的互動、點到 GitHub 與 X 的外連、留言。尚未由站長定案 | `docs/seo-execution-plan.md` 第 2 章 |
| Competitors | 由搜尋結果找，見下方 | 2026-11-21 的 WebSearch |
| Ship mode | PR for review（預設值，站長沒有指定） | main 有 `protect-main` ruleset，歷史上的變更都走 PR |

## 站台事實

- 36 篇文章，各有繁中（根目錄）、簡中（`/zh-CN/`）、英文（`/en/`）三個版本。來源：`_posts/`、`_posts/zh-CN/`、`_posts/en/`。
- 每個語系一份 sitemap，各 57 個網址：36 篇文章、13 個分類頁、4 個首頁分頁、4 個 tab。標籤頁是 `noindex`，不在 sitemap。來源：2026-11-21 抓取 `https://justmao.com/sitemap.xml` 等三份。
- 最早一篇發布於 2026-09-15。來源：`_posts/2026-09-15-gpa-question-webapp-study-loop.md`。
- 寫作範圍：coding agent 的 skill 與工作流程、agent 與供應鏈的資安、開源工具的原始碼拆解。來源：`_tabs/about.md`。
- 主題叢集 A 到 F 與每篇的歸屬：`docs/seo-execution-plan.md` 階段 1 與附錄 A，已轉成 `keyword-map.csv`。
- 留言用 giscus，分析用 GA4 與 Microsoft Clarity，歐洲時區訪客要先同意才載入。來源：`_config.yml` 的 `comments` 與 `analytics`、`assets/js/consent.js`。
- Google Search Console 已驗證，Bing Webmaster Tools 未驗證，IndexNow 已接。來源：`_config.yml` 的 `webmaster_verifications`、`tools/indexnow.rb`。

## 沒有接上的資料

這個執行環境沒有 Search Console、Ahrefs 或分析工具的連線，WebSearch 只回美國的結果。因此搜尋量、難度、排名、點擊、索引狀態一律留空或寫「未驗證」，繁中與簡中的搜尋結果也沒有查證。

## 搜尋結果上的競爭對手

2026-11-21 用 WebSearch 各查一次下列英文查詢，記下排在前面的網域。這是單次查詢的結果，沒有排名數字。

| 叢集 | 查詢 | 出現的網域 |
| --- | --- | --- |
| A pstack | `pstack cursor plugin poteto-mode guide` | flaviocopes.com（`/pstack/`、`/poteto-mode/`）、hermes-agent.nousresearch.com、cursor.com、pi.dev |
| A mattpocock/skills | `mattpocock skills guide grill-me to-spec tdd` | claude.com、github.com、aihero.dev、medium.com、levelup.gitconnected.com、newsletter.pragmaticengineer.com |
| B hooks | `Claude Code hooks tutorial format test sensitive files` | code.claude.com、datacamp.com、educative.io、ifkarsyah.github.io、morphllm.com、uxplanet.org |
| B SDLC | `AI-native SDLC playbook Anthropic` | claude.com、linkedin.com、devops.com、nngroup.com、thenewstack.io |
| C 沙箱 | `Claude Code sandbox setup block SSH keys tokens` | anthropic.com、docs.nvidia.com、dev.classmethod.jp、medium.com、hoop.dev、docs.docker.com |
| D npm 12 | `npm 12 install scripts allowScripts min-release-age` | socket.dev、github.blog、docs.npmjs.com、lilting.ch、jfrog.com、dev.to、infoq.com |

`seo/competitors/` 追蹤三個與本站規模相近、主題重疊最多的個人或小型網站：

- **flaviocopes.com**：有 `/pstack/`、`/poteto-mode/`、`/agents-md/`、`/git-worktrees/`，以及 `/tools/agents-md-generator/` 等工具頁。
- **lilting.ch**：日文為主、有英文版，寫 npm 12、agent-browser、agent 沙箱等同類題目。
- **aihero.dev**：mattpocock/skills 作者自己的站，有每個 skill 的說明頁。

官方文件（code.claude.com、docs.npmjs.com、github.blog）與大型媒體不列入追蹤，它們的 sitemap 變動對選題沒有幫助。
