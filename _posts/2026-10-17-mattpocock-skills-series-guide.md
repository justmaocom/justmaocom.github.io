---
title: "mattpocock/skills 系列導讀：這套 skill 是什麼、六篇該怎麼讀"
description: "還在考慮要不要用 mattpocock/skills，或只想解決其中一個問題？這篇導讀把系列六篇串成一條路線，說明每篇回答什麼，並依你的情況建議從哪一篇讀起。"
date: 2026-10-17 20:20:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, mattpocock, workflow]
media_subpath: /assets/img/posts/mattpocock-skills-series-guide/
image:
  path: cover.png
  alt: "六篇照開發順序排，合起來涵蓋官方外掛的 25 個 skill；先找出你卡在哪一步，再從那一篇讀起。"
---

> **版本提醒（2026-10-19 查證）**：本系列六篇都以 `1.2.3` 版為準。`mattpocock/skills` 已在 2026-10-04 發布 [`1.3.0`](https://github.com/mattpocock/skills/releases/tag/v1.3.0) 和 [`1.3.1`](https://github.com/mattpocock/skills/releases/tag/v1.3.1)，官方外掛從下文說的 25 個 skill 變成 27 個：[第 5 篇](/posts/mattpocock-skills-design-review-integration/)介紹的 `resolving-merge-conflicts` 已移除；新增的 `implement-spec`、`pr`、`retro` 本系列還沒介紹；[第 2 篇](/posts/mattpocock-skills-requirements-shared-language/)的詞彙表 `CONTEXT.md` 也改名為 `GLOSSARY.md`。其餘 24 個 skill 都還在。本系列之後會依新版全面更新。
{: .prompt-warning }

你可能是聽人提過 `mattpocock/skills`，打開 repo 卻看到一長串 skill 名稱；也可能是從搜尋點進其中一篇，想知道前後還有什麼。這個系列寫了六篇，每篇處理開發流程裡的一段。這篇導讀不重講細節，只回答三件事：這套 skill 是什麼、六篇怎麼串起來，以及你該從哪一篇開始。

> mattpocock/skills 系列｜導讀
>
> - 從頭開始（第 1 篇）：[先設定專案規則，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)
>
> 本系列以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準，各篇開頭另外註明了之後的版本變動。
{: .prompt-info }

## mattpocock/skills 是什麼

[`mattpocock/skills`](https://github.com/mattpocock/skills) 是 Matt Pocock 公開的一整組 skill。skill 可以理解成一份「告訴 AI 程式助理怎麼完成某件工作」的操作說明，例如怎麼訪談需求，或怎麼把規格拆成一張張工作單。AI 程式助理指的是 Claude Code、Codex 這類能讀寫專案檔案、替你寫程式的 AI 工具。

作者在 [README](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L19) 裡說，這些 skill 刻意做得小、容易改，也能自由組合。官方外掛的 [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json#L21-L47) 收錄了 25 個 skill，這個系列六篇合起來，剛好把這 25 個都介紹過一次。repo 裡另外還有仍在試驗或目前不主動推廣的項目，不在系列範圍內。

有兩件事先知道會比較好讀：

- **大部分工作要由你點名開始。** 很多 skill 設定成只能由人啟動，AI 不會自己跑。
- **`ask-matt` 像服務台，不是總管。** 你描述目前卡在哪裡，它建議下一個該用的 skill，但不會自動把整套流程跑完。

安裝方式、第一次要做的設定，都寫在[第 1 篇](/posts/mattpocock-skills-setup-routing-guide/)，這裡不重複。

## 適合誰、不適合誰

從六篇的內容來看，這套 skill 最適合下面這種專案：

- 由好幾個人一起維護，或一項功能要分好幾次對話才做得完。
- 用工作追蹤工具（例如 GitHub Issues）記錄待辦事項、交接工作。
- 你希望 AI 做事有固定步驟，而且每個關鍵點都留給人確認。

反過來，有些情況用不到整套流程：

- 功能小到一次對話就做得完：需求談完直接實作，不必再用 `to-spec`、`to-tickets` 寫規格、拆工作單（第 3 篇）。
- 只是討論一個還沒成形的想法，用 `grill-me` 訪談一次就夠了，不必替每個名詞建立文件（第 2 篇）。
- 不在專案資料夾裡的一次性工作，不必為了一個 skill 建立整套專案設定（第 1 篇）。

也要先說清楚它做不到的事。第 1 篇提過，這套流程不保證能縮短開發時間；它直接帶來的好處，是把專案慣例寫成文件，並在你不確定下一步時給建議。第 4 篇也提醒，這些規則只是寫在 Markdown 裡的指令，沒有程式強制執行；AI 列出要測試的位置時，你若沒細看就按同意，這道把關就等於沒有作用。

## 六篇怎麼串起來

六篇的順序，就是一項功能從需求到合併的順序。前五篇是一條主線，第 6 篇處理寫程式以外、但常常卡住進度的事。

![系列地圖：第 1 到第 5 篇依序是設定與找下一步、釐清需求、規格與工作單、實作與測試、審查與合併，第 6 篇處理查資料、交接、學習等寫程式以外的事，每篇下方列出涵蓋的 skill](series-map.png){: width="800" height="450" }
_六篇照開發順序排列，每篇處理一段，第 6 篇補上寫程式以外的事。_

主線大致是這樣走的：先用 `grill-with-docs` 把需求問清楚；功能大到要分好幾次對話時，用 `to-spec` 整理規格、`to-tickets` 切成工作單；接著每張工作單開一次新對話，用 `implement` 實作，它會在過程中用 `tdd`，最後再跑 `code-review`。其他 skill 多半是岔路：別人送進來的回報交給 `triage`，大到列不完決策的工作交給 `wayfinder`，東西壞了用 `diagnosing-bugs`。

六篇用的是同一個例子：替一個訂閱服務加入按席次計費。從第 1 篇的模擬情境開始，一路沿用到第 6 篇，所以依序讀時，可以看到同一項功能怎麼一步步往下走。

## 六篇各講什麼

### 第 1 篇：先設定專案規則，再用 ask-matt 找下一步

面對 25 個 skill，第一次該從哪裡開始？這篇說明兩種安裝方式怎麼選、`setup-matt-pocock-skills` 會替專案留下哪些設定，以及怎麼用 `ask-matt` 找出下一步。讀完你會知道，不必先把每個 skill 搞懂也能開始。

→ [第 1 篇：先設定專案規則，再用 ask-matt 找下一步](/posts/mattpocock-skills-setup-routing-guide/)

### 第 2 篇：把模糊需求問清楚，留下共用詞彙

會議紀錄裡「成員」、「使用者」、「席次」混著用，該怎麼問清楚？這篇介紹 `grill-me`、`grill-with-docs`、`grilling`、`domain-modeling` 與 `wait-what`：AI 照問題的先後關係一輪一輪問；用 `grill-with-docs` 時，確認過的詞彙會寫進專案的詞彙表 `CONTEXT.md`，少數重要決定寫成決策紀錄。

→ [第 2 篇：把模糊需求問清楚，留下共用詞彙](/posts/mattpocock-skills-requirements-shared-language/)

### 第 3 篇：先找出缺口，再決定要寫規格還是拆工作單

需求談完了，下一步是寫規格、拆工作單，還是去問握有答案的人？這篇說明 `to-spec`、`to-tickets`、`triage`、`wayfinder` 與 `to-questionnaire` 各自補哪一種缺口。重點是先看缺的是哪種資訊，而不是把五個都跑一遍。

→ [第 3 篇：先找出缺口，再決定要寫規格還是拆工作單](/posts/mattpocock-skills-specs-work-breakdown/)

### 第 4 篇：AI 開工寫程式前，先決定要看哪一種訊號

程式和測試都由 AI 寫的時候，你要看什麼才知道它做對了？這篇介紹 `implement`、`tdd`、`diagnosing-bugs` 與 `prototype`，答案是看 AI 自己改不了的東西：你確認過的測試位置、出自規格的預期值，以及一條對 bug 亮過紅燈的指令。文中的紅燈轉綠燈測試是實際跑過的。

→ [第 4 篇：AI 開工寫程式前，先決定要看哪一種訊號](/posts/mattpocock-skills-implementation-feedback-loops/)

### 第 5 篇：程式寫完之後，誰來看結構、審修改、解衝突

測試通過，不代表結構沒有越改越亂，也不代表修改照著需求做。這篇介紹 `codebase-design`、`improve-codebase-architecture`、`code-review` 與 `resolving-merge-conflicts`：定期做健康檢查、審查分「照規矩寫了嗎」和「照需求做了嗎」兩邊看，合併衝突時先搞懂兩邊各想做什麼。文中實際做出了一次合併衝突。

→ [第 5 篇：程式寫完之後，誰來看結構、審修改、解衝突](/posts/mattpocock-skills-design-review-integration/)

### 第 6 篇：查資料、做交接、學新東西，都有固定做法

寫程式以外的事也會卡住進度：查官方文件、把工作交給下一個人、只有你能登入後台去做的設定、學一個新主題。這篇介紹 `research`、`handoff`、`wizard`、`teach` 與 `writing-for-agents`，每個都有一套固定做法。

→ [第 6 篇：查資料、做交接、學新東西，都有固定做法](/posts/mattpocock-skills-research-handoff/)

## 依你的情況選起點

不一定要從頭讀到尾。先想想你現在卡在哪裡：

![閱讀路線：第一次用讀第 1、2、3 篇；需求講不清楚讀第 2 篇；不知道該寫規格還是開工作單讀第 3 篇；想讓 AI 寫的程式可信讀第 4、5 篇；審查修改、整理結構或處理合併衝突讀第 5 篇；交接、查資料或學新東西讀第 6 篇；想看完整流程就從第 1 篇讀到第 6 篇](reading-paths.png){: width="800" height="450" }
_先找到自己卡住的地方，再從對應的那一篇讀起。_

| 你的情況 | 建議讀 |
| --- | --- |
| 第一次用，想知道值不值得裝 | 第 1 → 2 → 3 篇 |
| 需求老是講不清楚，大家的用詞對不上 | 第 2 篇 |
| 需求談完了，不知道該寫規格還是開工作單 | 第 3 篇 |
| 想知道 AI 寫的程式和測試能不能信 | 第 4 → 5 篇 |
| 要審查修改、整理結構或處理合併衝突 | 第 5 篇 |
| 要交接工作、查資料，或學一個新主題 | 第 6 篇 |
| 想看一項功能從頭到尾怎麼走 | 第 1 篇依序讀到第 6 篇 |

如果你已經裝好了，也可以直接問 `ask-matt`：描述現在卡在哪一步，它會建議下一個該用的 skill，你再回來讀介紹那個 skill 的那一篇。

## 版本說明

六篇在 2026 年 9 月 21 日到 10 月 14 日之間發布，內容都以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。系列寫作期間 repo 仍在更新，各篇開頭的提示框另外註明了之後的版本變動。實際使用前，建議對照 repo 目前的版本。

## 延伸閱讀

- [`mattpocock/skills`](https://github.com/mattpocock/skills)：官方 repo。
- [`README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md)：作者對這套 skill 的說明與安裝方式（`1.2.3` 版）。
- [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json#L21-L47)：官方外掛收錄的 25 個 skill 清單。
- [`ask-matt/SKILL.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)：`ask-matt` 用來建議下一步的完整路線圖。
