# 系列教學規則

本站搜尋流量最多的是 pstack 與 mattpocock/skills 兩個系列：GSC 2026-10-23 到 11-22 的資料裡，兩個系列合計佔全站 67% 的曝光、79% 的點擊。這份文件把這兩個系列的做法寫成規則，之後新的 agent 工具都照這份規則寫成「分集加一篇系列導讀」。

這份文件只寫系列特有的規則。三語翻譯、tags 與 categories 見[三語翻譯規則](translation-guide.md)；front matter 與排版語法見[文章撰寫指南](chirpy-post-authoring.md)；文風見[文章寫法](post-writing-style.md)；選題、查 SERP 與發布檢查見 [SEO 執行方案](seo-execution-plan.md)的階段 4。

## 什麼主題要寫成系列

下面四項都符合，才寫成系列。只符合一部分的，寫成單篇。

- 主角是一個剛推出或剛大改版的 agent 工具或 skill 套件，例如 pstack、mattpocock/skills。
- 內容拆得出 3 篇以上，而且每篇對應工作流程裡的一段，讀者可以只讀其中一篇。
- 查過 SERP，繁中或簡中還沒有完整的教學。查法見 SEO 執行方案的階段 4。
- 會實際安裝、實際跑過再寫。版本會變的工具，要能標出查證的版本。

只有兩篇、或兩篇講的是不同程式的（例如 herdr 的 TUI 與桌面 App），先不加系列導讀，用內文連結互連就好。等到第 3 篇再補導讀。

## 網址 slug

- 分集：`<工具>-<這篇的主題>`，例如 `pstack-install-routing`、`mattpocock-skills-research-handoff`。
- 導讀：`<工具>-series-guide`，例如 `pstack-series-guide`。
- `<工具>` 用 repo 或套件的名稱，全部小寫，`/` 換成 `-`。slug 裡不放篇號，之後插入新的一篇也不用改網址。

## 標題

三個語系的標題都在 57 個半形字寬內（全形字算 2），開頭放讀者會搜的字：先放工具名，再放這篇解決的事。英文描述在 160 字元內，第一句寫出讀者會學到什麼。

| 種類 | 繁中與簡中 | 英文 |
| --- | --- | --- |
| 分集 | `<工具> 系列（N）：<這篇的重點>` | `<工具>, Part N: <這篇的重點>` |
| 導讀 | `<工具> 系列導讀：<一句說明>` | `<工具> Series Guide: <一句說明>` |

- 現有的例子：`pstack 系列（2）：改程式之前，先看懂再設計`、`pstack, Part 2: Understand Code and Compare Designs First`、`pstack Series Guide: What It Is and Where to Start`。
- 英文標題用 title case。冒號後面的部分，就是系列導覽與導讀 H3 會用的連結文字，所以要能單獨讀懂。
- 英文不必逐字翻譯繁中標題，改用英文讀者會搜的字，例如 install、handoff 這類 GSC 實際出現的查詢。
- 別人文章的標題不要拿來當我們的標題。例如 `the complete guide to pstack` 是 poteto 在 X 上的文章標題，見 `seo/backlog.md`。
- 標題發布後要改，另外開 PR，不跟內文修改放在一起。原因見[文章寫法](post-writing-style.md)與下面的「發布檢查」。
- 現有兩個系列有幾篇超過 57 字寬，這份規則不追溯；要縮短時，照 `seo/backlog.md` 另外處理。

## 系列標籤

每篇分集與導讀都加上同一個系列標籤，就是 slug 裡的 `<工具>`，例如 `pstack`、`mattpocock`。三個語系的 tags 完全相同，規則見[三語翻譯規則](translation-guide.md)。categories 照對照表，同一個系列的每一篇用同一組分類，例如兩個現有系列都是 `[AI, skills]`。

## 系列導覽

每篇在引言之後放一個 `.prompt-info` 導覽區塊。新增一篇時，替上一篇補上通往新文章的連結，只連到已經建立的文章（[三語翻譯規則](translation-guide.md)的「站內連結」）。

- 連結文字用目標文章標題冒號後面的部分，三個語系各用各自的標題。英文要與目標文章的英文標題完全相同，大小寫也一樣。
- 新的系列照下面的順序列：上一篇、下一篇、系列導讀。pstack 系列把系列導讀放在第一行，現有文章不用改。
- 版本提醒可以接在同一個區塊裡，用一行 `>` 空行隔開。

繁中：

```markdown
> <工具> 系列｜第 N 篇
>
> - 上一篇（第 N-1 篇）：[<上一篇冒號後的標題>](/posts/<上一篇 slug>/)
> - 下一篇（第 N+1 篇）：[<下一篇冒號後的標題>](/posts/<下一篇 slug>/)
> - 系列導讀：[<導讀冒號後的標題>](/posts/<工具>-series-guide/)
{: .prompt-info }
```

簡中：

```markdown
> <工具> 系列｜第 N 篇
>
> - 上一篇（第 N-1 篇）：[<上一篇冒号后的标题>](/posts/<上一篇 slug>/)
> - 下一篇（第 N+1 篇）：[<下一篇冒号后的标题>](/posts/<下一篇 slug>/)
> - 系列导读：[<导读冒号后的标题>](/posts/<工具>-series-guide/)
{: .prompt-info }
```

英文：

```markdown
> <tool> Series | Part N
>
> - Previous (Part N-1): [<text after the colon in the previous title>](/posts/<previous slug>/)
> - Next (Part N+1): [<text after the colon in the next title>](/posts/<next slug>/)
> - Series guide: [<text after the colon in the guide title>](/posts/<tool>-series-guide/)
{: .prompt-info }
```

各位置的寫法：

| 位置 | 繁中 | 簡中 | 英文 |
| --- | --- | --- | --- |
| 第 1 篇 | 不寫「上一篇」 | 同左 | 不寫 Previous |
| 最後一篇的標頭 | `第 N 篇（最後一篇）` | `第 N 篇（最后一篇）` | `Part N (final part)` |
| 最後一篇的下一篇 | `- 下一篇：這是系列的最後一篇` | `- 下一篇：这是系列的最后一篇` | `- Next: this is the last part of the series` |
| 導讀的標頭 | `<工具> 系列｜導讀` | `<工具> 系列｜导读` | `<tool> Series \| Guide` |
| 導讀的連結 | `- 從頭開始（第 1 篇）：[…](…)` | `- 从头开始（第 1 篇）：[…](…)` | `- Start from the beginning (Part 1): […](…)` |

## 系列導讀

導讀是系列的總覽頁，要有自己的內容，不能只是一頁連結列表（SEO 執行方案階段 3）。照現有兩篇導讀的順序寫：

1. 引言：讀者可能從哪裡來（聽人提過、從搜尋點進其中一篇），以及這篇導讀會幫他決定從哪一篇讀起。
2. 導覽區塊加版本提醒。
3. `## <工具> 是什麼`：作者、授權、放在哪個 repo、給哪些 agent 用。
4. `## 適合誰、不適合誰`：用讀者的情況來寫。mattpocock/skills 導讀的寫法是「適合多人、跨多次對話的專案」。
5. `## N 篇照工作流程排列`：一張系列地圖，三個語系各一張（`series-map.webp`、`series-map.zh-CN.webp`、`series-map.en.webp`），加上每篇一個 H3。H3 寫成 `### 第 N 篇：<冒號後的標題>`，英文是 `### Part N: <text after the colon>`，與該篇標題一致。mattpocock/skills 導讀把地圖與 H3 分成「六篇照開發順序排」「六篇各講什麼」兩節，也可以。
6. `## 依你的情況選起點`：依讀者卡住的地方，指到某一篇或某一節。pstack 導讀在這一節後面還有一節結論。
7. `## 延伸閱讀`：連到另一個系列或同叢集的文章。

### 版本提醒

系列裡每一篇都寫明以哪一版為準，連到固定 commit 或 tag 的檔案，不連到 main。導讀寫整個系列共同的版本與查證日期。上游之後有變動時，在導讀與受影響的那幾篇各加一個 `.prompt-info`，列出改了什麼，例如 mattpocock/skills 系列在 `1.3.0` 之後的說明。

pstack 導讀的寫法可以照抄：「這個系列的五篇都以 pstack `0.15.43` 為準，搭配 Claude Code 2.1.326。這一版對應 `cursor/plugins` 的 commit `2f87c85`（2026-11-17 05:47，台北時間）。」

## 發布流程

1. 選題：題目先記在 Notion 的「部落格候選文章」資料庫，在「系列標籤」選這個工具；沒有這個選項就新增一個。
2. 撰稿：瓦特依 brief 寫三個語系的初稿，每一篇都要實際跑過，不寫沒做過的經驗或結果。
3. 審稿：黑熊審稿。審稿通過不等於可以合併，站長說「合併」才合併。
4. 導讀可以等到第 3 篇寫好時再寫。

每篇發布前，除了 SEO 執行方案階段 4 的清單，再檢查下面幾項：

- [ ] 這篇的導覽區塊三個語系都有，連結文字與目標文章的標題一致。
- [ ] 上一篇的導覽補上了通往這篇的「下一篇」，三個語系都改。
- [ ] 導讀加上這篇的 H3，系列地圖與「依你的情況選起點」也更新。
- [ ] 系列標籤三個語系相同，分類與同系列其他篇相同。
- [ ] 標題在 57 個半形字寬內，英文描述在 160 字元內。
- [ ] `bash tools/test.sh` 通過。

### 改標題之後

改了某一篇的標題，要在同一個 PR 裡把所有指向它的連結文字一起改掉：導覽區塊、導讀的 H3，以及其他文章裡用到標題的連結，三個語系都要查。這種只改連結文字的批次修改，合併進 `main` 後把 commit 的完整 SHA 加進 `.lastmod-ignore-revs`，另外開一個小 PR。否則被改到的文章都會顯示成剛更新，做法見 `README.zh-TW.md`。
