# 待辦

依預期效益除以工時排序。本站沒有註冊流程，效益指非品牌自然點擊。數字來自 2026-11-22 匯入的 GSC 基線（資料期間 2026-10-23 到 11-19，見 `context.md`）。匯出檔沒有查詢與網頁的對照，標「推定」的是依查詢文字推斷的。

1. **驗收英文 pstack 第 1 篇的改動**。2026-12-06 以後再匯出一次 GSC，比較 `/en/posts/pstack-install-routing/` 的排名（基線 10.3）與點閱率（基線 1.08%），以及 `how to install pstack`（7.4）、`pstack install`（7.1）、`pstack claude code`（77.2）的排名。也看 `poteto mode`（9.3）與 `poteto-mode`（8.3），新標題保留了 `/poteto-mode`。不要用整頁點閱率判斷，這頁的曝光混了很多導覽類查詢。安裝類查詢的排名如果沒有前進，把第 1 步的安裝指令區塊移到「A Few Terms First」之前（三個語系一起改，寫作規則允許移動程式碼區塊）。
2. **英文 mattpocock/skills 第 1 篇的標題**。`/en/posts/mattpocock-skills-setup-routing-guide/`：205 次曝光、排名 9.3、點閱率 2.4%。相關查詢有 `ask matt`（9）、`ask-matt`（7）、`/ask-matt`（4）與 `how to add matt pocock skills`（推定）。英文標題 `Get Started Without Memorizing 25 Skills` 沒有 install 也沒有 ask-matt，繁中標題有。改英文標題與描述，並同步其他英文文章裡的連結文字。
3. **英文 pstack 第 2 篇的標題與描述**。`/en/posts/pstack-understand-design/`：500 次曝光、排名 6.2、點閱率 2%。`pstack part 2`（76 次曝光、排名 4.4、1.3%）與 `the complete guide to pstack pt. 2`（107、4.9、1.9%）推定是這頁。第 3 篇的同類查詢點閱率是 12% 到 29%。標題 69 字元會被截斷。先請站長匯出這頁的查詢，確認是哪些查詢的點閱率低再改。
4. **查證 `the complete guide to pstack` 是不是別人的文章標題**。pt. 2 與 pt. 3 共約 210 次曝光。2026-11-22 用 WebSearch（美國）查不到這個標題，可能是 X 上的文章。如果是，這類查詢的讀者要找的是那篇，不要為它改標題。
5. **`/en/projects/` 有 410 次曝光、排名 4.5、0 次點擊**。匯出檔看不出是哪些查詢，要站長匯出這頁的查詢。標題只有 `Projects | JustMao`。
6. **英文 mattpocock/skills 第 6 篇**。`/en/posts/mattpocock-skills-research-handoff/`：104 次曝光、排名 10.1、0 次點擊。handoff 相關查詢約 25 次曝光（`handoff skill matt pocock`、`mattpocock handoff skill` 等，推定）。考慮把 handoff 放進英文標題前段。
7. **pstack 的 `/statechart`**。`pstack statechart` 有 16 次曝光、排名 6.7，`statechart pstack` 5 次，但全站沒有一篇提到 statechart。系列以 0.15.43 版為準。先確認這個 skill 是哪一版加進來的，再決定是在第 2 篇補一節，還是等系列改以新版查證時一起寫。
8. **mattpocock/skills 系列導讀（繁中）**。`/posts/mattpocock-skills-series-guide/`：592 次曝光、排名 7.9、點閱率 3%。帶曝光的多是英文查詢（`mattpocock` 排名 10.4、`mattpocock skill.md`、`mattpocock skill`，推定）。要先看這頁的查詢，才知道是要改繁中標題，還是讓英文版排上來。
9. **英文 AGENTS.md 與 skill 撰寫兩篇在第 3 頁**。`/en/posts/agents-md-project-rules-for-coding-agents/` 排名 22.4（52 次曝光），`agents.md openai codex` 排名 47；`/en/posts/agent-skill-authoring-guide/` 排名 20.5（28）。要先讀前五名，找出本站缺什麼。工時較長。
10. **`pstack` 這個詞排名 19.1**（86 次曝光）。搜尋結果被 Linux 同名除錯工具的 man page 佔滿，順位不容易往前，先不處理。
11. **其餘過長的描述**。英文超過 160 字元：`pstack-understand-design`（189）、`ai-native-sdlc-playbook`（175）、`claude-code-hooks-automate-checks`（167）、`pstack-series-guide`（167）。繁中與簡中寬度超過 200：`mattpocock-skills-research-handoff`、`pstack-principles-customization`、`npm-12-install-scripts-allowscripts`。只改 front matter，合併後把 SHA 加進 `.lastmod-ignore-revs`。第 3 項會一併處理 `pstack-understand-design`。
12. **D 叢集 hub：npm 與 GitHub Actions 供應鏈檢查清單**。D 叢集四篇在基線期間三個語系合計 42 次曝光、2 次點擊。先查搜尋結果確認有人搜尋。
13. **B 叢集 hub：Claude Code 多 agent 工作流程總覽**。同上。
14. **首頁分頁的描述與首頁相同**。`/en/page2/`、`/en/page3/` 有 31 與 48 次曝光、0 次點擊。要改就在 `_plugins/seo-hook.rb` 比照 `page_title` 加一個樣板。
15. **首頁有 10 個 `<h1>`**。要覆寫 gem 的 `_layouts/home.html`，日後升級主題要自己合併（`docs/seo-execution-plan.md` 第 5 章）。
16. **效能沒有量測**。171 頁的伺服器回應都在 1.5 秒內（2026-11-22 抓取）。用 PageSpeed Insights 測首頁與各語系一篇文章的手機版，LCP 超過 2.5 秒或 CLS 超過 0.1 才處理。
17. **Bing Webmaster Tools**（站長）。從 GSC 匯入，不用改 repo。

## 已有結論

- 分類頁保持可收錄：基線期間 `/en/categories/supply-chain/` 等分類頁有曝光（2 到 9 次），與 `docs/seo-execution-plan.md` 第 5 章的判斷條件相符。
- 標籤頁在基線期間仍有曝光（`/en/tags/` 68 次），這是 PR #116（2026-11-21）加上 `noindex` 之前的資料。下次匯出時確認它們逐漸消失。
- pstack 的安裝來源：2026-11-22 讀 `cursor/plugins` main 的 `pstack/README.md`，Claude Code 的安裝方式就是 `/plugin marketplace add cursor/plugins` 加 `/plugin install pstack@cursor-plugins`，與本站文章一致。搜尋摘要說的「社群移植版」是 `michael-denyer/pstack-claude`，已在第 1 篇註明它不是官方版本。
- 上游 pstack 在 2026-11-19 有三個 commit（0.15.43 → 0.15.46）：`/statechart` 支援原生 Windows、Gemini 評審席位改用 Gemini 4 Neon。系列文寫的「評審名單預設是 Gemini」仍然成立，不需要改。

## 不做

- 免費工具頁。flaviocopes.com 有 AGENTS.md 產生器這類工具，但 `docs/seo-execution-plan.md` 第 3 章決定不做工具頁。
- 目錄站提交與付費連結，同上。
