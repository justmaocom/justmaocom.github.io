# 待辦

依預期效益除以工時排序。本站沒有註冊流程，效益指非品牌自然點擊。沒有 Search Console 資料，所以排序是依搜尋結果與站上實測的推論。

1. **建立 GSC 基線並確認索引**（站長）。`docs/seo-execution-plan.md` 階段 0。三份 sitemap 共 171 個網址的索引狀態目前是「未驗證」。有了這份資料，第 5、6、9 項才能決定做不做。
2. **查證 pstack 的安裝來源**。查詢：`pstack`。頁面：`/posts/pstack-series-guide/`、`/posts/pstack-install-routing/`。2026-11-21 的搜尋摘要說官方版只支援 Cursor，Claude Code 要用社群移植版；本站寫的是兩邊都能安裝。搜尋摘要不是一手來源，先對照上游 repo 與 Cursor 的外掛頁，確認後才決定要不要改文章。
3. **比較文：mattpocock/skills 與 pstack**。查詢：`mattpocock skills vs pstack`（gap）。本站兩套都寫過完整系列。動筆前先查這個查詢的前五名，並讀 `flaviocopes.com/pstack/`，說得出本站多了什麼才寫。
4. **其餘過長的描述**。英文超過 160 字元：`pstack-understand-design`（189）、`ai-native-sdlc-playbook`（175）、`claude-code-hooks-automate-checks`（167）、`pstack-series-guide`（167）。繁中與簡中寬度超過 200：`mattpocock-skills-research-handoff`、`pstack-principles-customization`、`npm-12-install-scripts-allowscripts`。只改 front matter，合併後把 SHA 加進 `.lastmod-ignore-revs`。
5. **`ai-native-sdlc-playbook` 的繁中與簡中標題**。主詞「AI 原生開發流程」在標題最後，寬度 67。繁中與簡中的搜尋結果沒有查證，等 GSC 有這篇的查詢資料再決定要不要把主詞移到前面。
6. **英文標題超過 60 字元的 22 篇**。系列文的主詞都在最前面，被截掉的是副標。等 GSC 顯示某篇排名好但點擊率低，再改那一篇。
7. **D 叢集 hub：npm 與 GitHub Actions 供應鏈檢查清單**。把四篇的檢查項目整理成一張清單。先查搜尋結果確認有人搜尋。
8. **B 叢集 hub：Claude Code 多 agent 工作流程總覽**。同上。
9. **只有 1 篇文章的 7 個分類頁**。它們只有 1 到 2 個頁面連入。`docs/seo-execution-plan.md` 第 5 章決定先看 GSC 有沒有分類頁的曝光。
10. **首頁分頁的描述與首頁相同**。`/page2/` 到 `/page4/` 三個語系共 9 頁。效益低，要改就在 `_plugins/seo-hook.rb` 比照 `page_title` 加一個樣板。
11. **首頁有 10 個 `<h1>`**。要覆寫 gem 的 `_layouts/home.html`，日後升級主題要自己合併（`docs/seo-execution-plan.md` 第 5 章）。
12. **效能沒有量測**。這次只量了伺服器回應時間，171 頁都在 0.8 秒內。用 PageSpeed Insights 測首頁與各語系一篇文章的手機版，LCP 超過 2.5 秒或 CLS 超過 0.1 才處理。
13. **Bing Webmaster Tools**（站長）。從 GSC 匯入，不用改 repo。

## 不做

- 免費工具頁。flaviocopes.com 有 AGENTS.md 產生器這類工具，但 `docs/seo-execution-plan.md` 第 3 章決定不做工具頁。
- 目錄站提交與付費連結，同上。
