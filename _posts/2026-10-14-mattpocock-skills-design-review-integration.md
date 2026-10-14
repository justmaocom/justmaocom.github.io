---
title: "mattpocock/skills 系列（5）：先講好模組的詞彙，再分兩條軸審查修改"
description: "程式寫完之後，誰來判斷結構好不好、修改有沒有照規格？本文拆解 codebase-design、improve-codebase-architecture、code-review 與 resolving-merge-conflicts，並用按席次計費的例子實際做出一次合併衝突。"
date: 2026-10-14 10:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, code-review, software-architecture, git]
media_subpath: /assets/img/posts/mattpocock-skills-design-review-integration/
image:
  path: cover.png
  alt: "mattpocock/skills 系列第 5 篇封面：左邊是一個介面小、實作深的模組方塊，右邊是一份分成 Standards 與 Spec 兩欄的審查報告；底部列出 codebase-design、improve-codebase-architecture、code-review 與 resolving-merge-conflicts"
---

上一篇用 `implement` 做完了「停用成員並釋放席次」，測試從紅燈轉成綠燈，AI 也照指令在最後呼叫了 `code-review`。現在你手上有三張做完的工作單、一條準備合併的分支，以及一份 AI 寫的審查報告。

測試通過只能說明行為符合測試。程式結構會不會越改越亂、這次修改有沒有多做或漏做規格裡的東西、兩條分支同時改到 `deactivateMember()` 時該留哪一邊，這些都不是測試能回答的問題。

`mattpocock/skills` 把這一段交給四個 skill：`codebase-design`、`improve-codebase-architecture`、`code-review` 與 `resolving-merge-conflicts`。前兩個處理程式的結構，後兩個處理這次的修改怎麼進到主線。

> mattpocock/skills 系列｜第 5 篇
>
> - 上一篇（第 4 篇）：[AI 開工寫程式前，先決定要看哪一種訊號](/posts/mattpocock-skills-implementation-feedback-loops/)
>
> 本文資料以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。按席次計費的 skill 呼叫流程依原始指令推演；文中的合併衝突與合併後的測試失敗則是實際執行結果。
{: .prompt-info }

> 系列開始之後，`mattpocock/skills` 已經更新到 `1.3.x`。[`v1.3.0` 移除了 `resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)，官方說明沒有其他 skill 取代它；同一版也把詞彙表 `CONTEXT.md` 改名為 `GLOSSARY.md`。本文為了與前四篇一致仍以 `1.2.3` 為準，用新版的讀者請留意這兩處差異。
{: .prompt-warning }

## 先認識幾個詞

下面幾個詞會反覆出現。`codebase-design` [要求這些詞照原文使用](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L12)，不要換成「元件」、「服務」、「API」或「邊界」，所以本文也盡量固定譯法：

| 本文用詞 | 原文 | 意思 |
| --- | --- | --- |
| 模組 | module | 任何有介面、有實作的東西。可以是一個函式、一個類別，也可以是一整個套件 |
| 介面 | interface | 呼叫者要正確使用模組所需知道的一切。不只型別簽名，還包括不變條件、呼叫順序、錯誤情況與必要設定 |
| 深度 | depth | 呼叫者每學一單位介面，能用到多少行為。介面小、背後行為多叫「深」；介面幾乎和實作一樣複雜叫「淺」 |
| 接點 | seam | 介面所在的位置。上一篇的「測試接點」就是它 |
| 轉接器 | adapter | 在接點上實際滿足介面的東西，例如正式環境的資料庫實作，或測試用的記憶體版本 |
| 槓桿、局部性 | leverage、locality | 深度帶來的兩個好處：呼叫者用得少卻得到很多；維護者要改的東西集中在一處 |

這些定義見 [`codebase-design` 的詞彙表](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L14-L28)。

## 四個 skill 管的是不同時間點

這四個 skill 都放在 `skills/engineering/` 底下，在 `ask-matt` 的路線圖裡分屬三個區塊：

| skill | 在 `ask-matt` 的位置 | 什麼時候出場 | 會不會自己啟動 |
| --- | --- | --- | --- |
| `codebase-design` | [底層詞彙](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L59) | 討論模組形狀時，或被 `tdd`、`improve-codebase-architecture` 引用 | 會 |
| `improve-codebase-architecture` | [程式碼健康](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52) | 有空檔時定期掃一次，或 `diagnosing-bugs` 找不到測試接點時 | 不會，要手動呼叫 |
| `code-review` | [主流程收尾](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26) | `implement` 做完後，或任何時候想審查一條分支 | 會 |
| `resolving-merge-conflicts` | [不在任何流程裡](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L79) | 已經卡在合併或 rebase 衝突中 | 會 |

`improve-codebase-architecture` 是四個裡唯一設了 [`disable-model-invocation: true`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L4) 的，`agents/openai.yaml` 也寫了 [`allow_implicit_invocation: false`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/agents/openai.yaml#L4-L5)。它會掃整個專案、寫報告，所以要由你決定什麼時候跑。

## `codebase-design` 是一份詞彙表，不是一套流程

`codebase-design` 沒有步驟，它提供的是討論模組時的共用語言。[`ask-matt` 把它和 `domain-modeling` 並列](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L55-L59)為兩份「底層詞彙」：`domain-modeling` 管業務用語，例如第 2 篇整理的「計費席次」；`codebase-design` 管程式結構的用語。上一篇也提過，[`tdd` 遇到介面該長什麼樣的疑問時](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26)，就是來查這一份。

它的目標寫在開頭：[設計深模組](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L8)，讓呼叫者得到槓桿、維護者得到局部性，所有人都容易測試。設計介面時，它要 AI [問自己三個問題](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L54-L58)：方法能不能更少、參數能不能更簡單、能不能把更多複雜度藏在裡面。

### 四條原則

[原則一共四條](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L60-L65)：

- **深度是介面的性質，不是實作的性質。** 深模組內部可以由很多可替換的小零件組成，只要它們不出現在介面上。
- **刪除測試。** 想像把這個模組刪掉。如果複雜度跟著消失，它只是傳話的中間層；如果複雜度散回 N 個呼叫者身上，它就有存在的價值。
- **介面就是測試面。** 呼叫者和測試走同一個接點。如果你想繞過介面去測，代表模組的形狀可能不對。
- **一個轉接器只是假想的接點，兩個才是真的。** 沒有東西會在接點兩側變動時，就不要設接點。

第四條很容易被忽略。很多人為了「以後可能要換」先拉出一層介面，結果整個專案只有一個實作。依這條原則，這種接點只增加了一層間接呼叫。

![左側淺模組列出 assignSeat、releaseSeat、countAssigned、notifyBilling、checkMember 五個方法，實作只是一層層往下傳；右側深模組只露出 assign、deactivate、available，檢查成員、釋放席次與通知計費都藏在虛線接點後面；底部寫著「介面就是測試面：呼叫者和測試走同一個接點」](deep-vs-shallow-module.png){: width="800" height="450" }
_同樣的席次行為，淺模組要呼叫者記住五個方法，深模組只露出三個。_

它也明白[拒絕了 Ousterhout 的深度定義](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L105-L109)。《A Philosophy of Software Design》用實作行數與介面行數的比例來衡量深度，原文認為這會鼓勵把實作灌水，所以改用「槓桿」來定義。

### 兩份延伸文件

`codebase-design` 附了兩份文件，處理「決定要加深某個模組之後」的事：

| 文件 | 處理什麼 | 重點 |
| --- | --- | --- |
| [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L5-L37) | 依依賴的種類決定怎麼測 | 依賴分成四類：純記憶體運算、有本機替身（例如用 PGLite 代替 Postgres）、自家的遠端服務、第三方服務。加深後，舊的淺模組單元測試要刪掉，改在新介面上寫測試 |
| [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L19-L44) | 同一個模組設計幾種不同的介面再比較 | 平行派出 3 個以上的子代理，各自帶不同限制：介面最小化、彈性最大化、讓最常見的呼叫最簡單，必要時再加一個以 ports & adapters 為主的版本。比較後 AI 要給出明確推薦，不是只列選單 |

`DEEPENING.md` 的「替換而非疊加」值得特別記下來：[舊測試在新介面的測試寫好後就成了浪費，應該刪掉](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L32-L37)。如果某個測試在只改實作時也得跟著改，代表它測到了介面後面的東西。這和上一篇 `tdd` 的「綁死實作細節」反模式是同一件事。

## `improve-codebase-architecture` 找出值得加深的候選

`codebase-design` 是工作台，`improve-codebase-architecture` 則是[先去現場勘查，找出候選的那一個](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)。它的目標是[把淺模組變成深模組，讓程式更好測，也更容易讓 AI 讀懂](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L9)。流程分三步。

**第一步是先決定看哪裡。** 原文寫著 [「Scope before you scan: YAGNI」](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L20-L23)：加深模組的好處是讓之後的修改變容易，所以優先看最近常改的地方。你有指定方向就照你的；沒有的話，AI 會翻 `git log` 找出反覆被修改的檔案。接著它會先讀 `CONTEXT.md` 和該區域的 ADR，再派一個子代理去走一遍程式，記下[讓人卡住的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L27-L35)，例如理解一個概念得在好幾個小模組之間跳來跳去，或者某段程式從現在的介面很難測。

ADR 是 Architecture Decision Record，記錄一個架構決定和它的理由。第 2 篇的 `domain-modeling` 只替少數難以回頭的決定寫 ADR，這裡就用得上：[跟既有 ADR 衝突的候選](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L56)，只有在問題真的嚴重到值得重新討論那個決定時才提出來，而且要在報告上標明。

**第二步是產出一份 HTML 報告。** 報告[寫在系統的暫存資料夾](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L39)，不會進到 repo 裡。每個候選是一張卡片，[包含涉及的檔案、問題、解法、好處、前後對照圖，以及 `Strong`、`Worth exploring`、`Speculative` 三級推薦強度](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L43-L52)，最後再給一個最推薦先做的項目。[`HTML-REPORT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/HTML-REPORT.md#L40-L55) 對卡片的要求是以圖為主，問題和解法各只寫一句；圖要靠一段文字才看得懂，就重畫。

這一步有一條限制：[還不能提出介面設計](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L60)。報告寫完後，AI 只問你一句「想深入哪一個」。

**第三步是針對你選的候選進入訪談。** AI 用第 2 篇介紹過的 `grilling` [逐一確認限制、依賴、加深後的模組形狀、接點後面放什麼，以及哪些測試能留下來](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L62-L71)。過程中出現新詞就寫進 `CONTEXT.md`；你若用一個重要的理由否決了候選，AI 會問要不要寫成 ADR，免得下次掃描又提出同一個建議。想比較不同的介面時，就轉去用 `codebase-design` 的 Design It Twice。

這一步的產出是一個想法，不是程式。[`ask-matt` 說明](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，選定的候選要帶回主流程，從 `grill-with-docs` 開始，接著照第 3、4 篇的路線寫規格、拆工作單、實作。作者在 README 裡[建議每隔幾天跑一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L178)，但也說得很清楚：它是勘查，不是救援。老舊的程式能找到真的候選，卻不會替你把一團亂理清楚。

## `code-review` 把審查拆成兩條軸

`code-review` 審查的是[從某個固定點到 `HEAD` 的差異](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L6-L11)。固定點可以是 commit、分支、tag，甚至 `HEAD~5`。審查分成兩條軸：

- **Standards**：程式有沒有遵守這個 repo 寫下來的程式規範？
- **Spec**：程式有沒有忠實做到原始工作單或規格要求的內容？

兩條軸各交給一個平行的子代理，原文的理由是讓它們不互相汙染對方的上下文。

### 五個步驟

1. **[固定比較點](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L17-L23)。** 你沒指定，它就問。差異用三點的 `git diff <固定點>...HEAD`，也就是從兩條分支的分岔點開始比。動手前先確認這個參照存在、差異不是空的，免得兩個子代理都白跑。
2. **[找規格](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L25-L32)。** 依序找 commit 訊息裡的 issue 編號、你傳入的路徑、`docs/`、`specs/` 或 `.scratch/` 底下符合分支名稱的檔案。都找不到就問你；你說沒有，Spec 軸就跳過並註明「no spec available」。
3. **[找規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L34-L56)。** 找出 `CODING_STANDARDS.md`、`CONTRIBUTING.md` 這類文件，另外一律帶上一份基準清單（下面說明）。
4. **[同時派出兩個子代理](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L58-L72)。** 兩份報告都限制在 400 字以內。Standards 要引用違反的是哪份文件的哪條規則；Spec 要回報缺漏或只做一半的需求、規格沒要求卻多做的行為，以及看起來做了但做錯的地方，每一項都要引用規格原文。
5. **[彙整](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L74-L78)。** 兩份報告分別放在 `## Standards` 與 `## Spec` 底下，不合併、不重新排序。最後一行只列出各軸的發現數量和各自最嚴重的問題，不挑一個跨軸的「第一名」。

第 2 步會讀 `docs/agents/issue-tracker.md`，這是第 1 篇 `setup-matt-pocock-skills` 留下的設定。[檔案不存在時，AI 會請你先跑 setup](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L13)。

### 沒有規範文件也有一份基準

很多專案根本沒有寫好的程式規範。`code-review` 的 Standards 軸因此[固定帶一份基準清單](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L38-L56)，取自 Martin Fowler《Refactoring》第 3 章的 12 種程式碼異味，例如：

| 異味 | 長什麼樣子 | 建議怎麼改 |
| --- | --- | --- |
| Mysterious Name | 名稱看不出它做什麼 | 改名；想不出誠實的名字，代表設計本身不清楚 |
| Feature Envy | 一個方法用別的物件的資料比用自己的還多 | 把方法搬到那份資料旁邊 |
| Primitive Obsession | 用字串或數字代表一個值得有自己型別的業務概念 | 替它定義一個小型別 |
| Shotgun Surgery | 一個邏輯上的修改，得在很多檔案裡零散地改 | 把會一起變動的東西收進同一個模組 |
| Speculative Generality | 為規格裡不存在的需求預先加的抽象、參數或掛勾 | 刪掉，等真的需要再加 |

這份清單有兩條約束：**repo 的規範優先**，專案明文允許的寫法就不算異味；**每一項都只是判斷**，報告要寫成「可能有 Feature Envy」，不能當成硬性違規。工具已經自動檢查的項目，例如格式化，就不必再報。

Speculative Generality 和 `codebase-design` 的「一個轉接器只是假想的接點」講的是同一件事，只是一個在設計時提醒，一個在審查時抓出來。

### 為什麼要分成兩條軸

原文的理由很直接：[一次修改可能只通過其中一條](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L80-L87)。完全符合規範卻做錯了需求，是 Standards 通過、Spec 失敗；完全照工作單做，卻破壞了專案慣例，則反過來。分開回報，才不會讓其中一條的好結果蓋掉另一條的問題。

![左側 Standards 報告依據規範文件與 Fowler 12 種異味，列出可能有 Shotgun Surgery、Primitive Obsession，標明都是判斷；右側 Spec 報告引用規格原文，列出計費系統已收到新席次數量，以及停用未指派席次的成員可能做錯；底部寫著「符合規範卻做錯需求，一條軸就蓋不住另一條」](code-review-two-axes.png){: width="800" height="450" }
_兩份報告分開放，不合併成一份排序。_

上一篇提到 [`tdd` 把重構留到審查階段](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L38)。`code-review` 的 Standards 軸，就是紅綠循環之後回頭整理寫法的那個時間點。

## `resolving-merge-conflicts` 依意圖解衝突，不靠挑行

`resolving-merge-conflicts` 是四個裡最短的，扣掉 front matter 只有[五個步驟](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L6-L14)：

1. 看清楚目前合併或 rebase 的狀態，包括 git 歷史與衝突的檔案。
2. 替每一處衝突找出原始來源：讀 commit 訊息、PR 與原本的 issue 或工作單，搞清楚兩邊各自為什麼這樣改。
3. 逐段解決。能保留兩邊的意圖就都保留；真的互斥時，選符合這次合併目標的一邊，並寫下取捨。不准發明新的行為，也[一律不准 `--abort`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L10)。
4. 找出專案的自動檢查並執行，通常依序是型別檢查、測試、格式化，修好合併弄壞的地方。
5. 完成合併或 rebase：stage 所有檔案並 commit；rebase 時繼續到所有 commit 都套用完。

重點在第 2 步。衝突標記只告訴你兩邊的文字不同，不會告訴你兩邊各自想做到什麼。直接選 `--ours` 或 `--theirs`，或把看起來比較不重要的那段刪掉，程式也許能編譯，卻可能默默丟掉別人刻意加的修改。

![左側用 git checkout --ours 解衝突，只留下通知計費的版本，「停用不存在的成員回傳 false」被默默丟掉；右側先讀兩邊的 commit，保留存在檢查、通知計費與 return true；底部寫著「衝突標記只說文字不同，沒說兩邊想做什麼」](merge-conflict-intent.png){: width="800" height="450" }
_直接挑一邊能編譯，卻可能少掉一半的意圖。_

前面提過，這個 skill 在 `1.3.0` 被移除了。[封存的說明頁](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)寫明沒有其他 skill 取代它，移除的 commit 訊息只寫了「No longer needed」。不過它那五個步驟本身不依賴任何工具，就算不裝這個 skill，也可以直接照著做。

## 哪些地方要花你的時間

| 環節 | 由誰付出 | 付出什麼 |
| --- | --- | --- |
| `improve-codebase-architecture` 的範圍 | 你 | 指定要看的模組或痛點；不指定就由 AI 從 `git log` 推斷 |
| 看 HTML 報告 | 你 | 從候選中挑一個，並判斷推薦強度是否合理 |
| 架構訪談 | 你 | 回答限制與取捨；否決候選時決定要不要寫 ADR |
| Design It Twice | AI 與你 | AI 平行跑 3 個以上子代理；你讀完幾份設計與推薦後拍板 |
| `code-review` 的固定點與規格 | 你 | 告訴它從哪裡開始比、規格在哪裡 |
| 讀審查報告 | 你 | 兩條軸分開看；異味只是提示，要不要改由你決定 |
| 解合併衝突 | AI，必要時是你 | 追查兩邊的 commit 與工作單；兩邊意圖互斥時，確認 AI 選的那一邊與它寫下的取捨 |

成本最高的是 `improve-codebase-architecture` 和 Design It Twice，因為兩者都會派出子代理讀大量程式碼。它們也是最不急的：程式能動，只是結構不夠好，什麼時候處理都可以。

## 什麼情況用哪一個

| 你手上的狀況 | 使用的 skill | 不適用的時候 |
| --- | --- | --- |
| 想討論某個模組的介面該長什麼樣、接點放哪裡 | `codebase-design` | 卡住的是業務用語而不是程式結構時，用 `domain-modeling` |
| 有空檔，想找出專案裡值得重整的地方 | `improve-codebase-architecture` | 正在趕一個功能時；它的產出是想法，還要再走一次主流程 |
| `diagnosing-bugs` 修完 bug，卻找不到能擋住它再發生的測試接點 | `improve-codebase-architecture` | 找得到接點時，直接補回歸測試就好 |
| 一條分支或 PR 做完，要在合併前審查 | `code-review` | 還沒有規格時，Spec 軸會跳過，只剩 Standards |
| `git merge` 或 `git rebase` 停在衝突上 | `resolving-merge-conflicts`（`1.2.x`） | 合併完成後才出現奇怪的行為，改用 `diagnosing-bugs` |

## 模擬情境：替按席次計費做一次審查與合併

以下的 skill 呼叫沒有實際執行，流程依 `1.2.3` 版的原始指令推演。其中的合併衝突用 git 2.47.3 實際做過，合併後的測試用 Node.js v20.19.2 跑過；程式是為本文寫的最小範例，並非取自 `mattpocock/skills`。

### 審查「停用成員並釋放席次」

第三張工作單做完後，`implement` 自動呼叫了 `code-review`。你也可以自己在新對話裡跑一次：

```text
$code-review main
```
{: .nolineno }

AI 先確認 `git rev-parse main` 解析得到、`git diff main...HEAD` 不是空的，再從 commit 訊息裡的 issue 編號抓到工作單。專案沒有 `CODING_STANDARDS.md`，Standards 軸只帶 12 種異味的基準清單。

兩份報告可能會是這樣（推演）：

- **Standards**：`deactivateMember(workspace, memberId, billing)` 把 `memberId` 當成一般字串傳來傳去，「可能有 Primitive Obsession」；計費通知的程式散在 `assignSeat` 與 `deactivateMember` 兩處，「可能有 Shotgun Surgery」。兩項都是判斷，不是違規。
- **Spec**：工作單的驗收條件「計費系統收到新的席次數量」已經實作；但停用一個沒有被指派席次的成員時會發生什麼，工作單沒寫，程式也沒處理，列為「看起來做了，但可能做錯」。

這兩份報告不會被合成一份排序。你可以先處理 Spec 那一項，回頭問清楚規則；Standards 的兩項則留到下一次 `improve-codebase-architecture`。

### 讓 `improve-codebase-architecture` 接手結構問題

幾天後你跑了 `$improve-codebase-architecture`，並指定方向「席次計費」。AI 讀過 `CONTEXT.md` 裡的「計費席次」定義後，報告裡可能出現這樣一張卡片（推演）：

- **標題**：加深計費席次模組
- **涉及檔案**：`seats.js`、`billing-sync.js`
- **問題**：指派、停用與通知計費三件事分散在兩個淺模組，每個呼叫者都得記得在改完席次後通知計費。
- **解法**：讓計費席次模組對外只提供「指派」、「停用」與「查詢可用席次」，通知計費藏在接點後面。
- **依賴類別**：計費系統是第三方服務，屬於 `DEEPENING.md` 的第 4 類，測試時用替身轉接器。
- **推薦強度**：`Worth exploring`

套用刪除測試：把 `billing-sync.js` 刪掉，「改完席次要通知計費」這件事會散回每一個呼叫者身上，所以這段複雜度是真的，只是放錯了地方。你選了這張卡片，AI 就進入訪談，談完後把想法帶回 `grill-with-docs`，再照第 3、4 篇的路線走一次。

### 兩條分支同時改到 `deactivateMember()`

同一時間，另一條分支 `guard-unknown` 讓停用不存在的成員時回傳 `false`，而你的分支 `notify-billing` 讓停用後通知計費。兩條都從同一份 `seats.js` 分出來：

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```
{: file="seats.js（共同祖先）" }

在 `notify-billing` 上合併 `guard-unknown`：

```bash
git merge guard-unknown
```
{: .nolineno }

git 停在衝突上：

```plaintext
Auto-merging seats.js
CONFLICT (content): Merge conflict in seats.js
Automatic merge failed; fix conflicts and then commit the result.
```

`seats.js` 變成這樣：

```javascript
<<<<<<< HEAD
export function deactivateMember(workspace, memberId, billing) {
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
=======
export function deactivateMember(workspace, memberId) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  return true;
>>>>>>> guard-unknown
}
```
{: file="seats.js（衝突中）" }

這時呼叫 `$resolving-merge-conflicts`。照第 2 步，AI 先讀兩邊的 commit 訊息：一邊是「停用後通知計費系統新的席次數量」，另一邊是「停用不存在的成員時回傳 false」。兩個意圖並不互斥，所以兩邊都保留，而不是挑一邊：

```javascript
export function deactivateMember(workspace, memberId, billing) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
  return true;
}
```
{: file="seats.js（解決後）" }

順序也有意義：先檢查成員是否存在，不存在就直接回傳，計費系統就不會收到一次沒有變動的席次數量。這一點兩邊的 commit 都沒寫，是 AI 合併時做的判斷，所以應該寫進合併的 commit 訊息，讓你審查時看得到。

接著照第 4 步跑型別檢查與測試。上一篇那條 `node --test seats.test.js` 呼叫 `deactivateMember()` 時沒有傳 `billing`。我把解決後的程式放回上一篇的測試，用 Node.js v20.19.2 實際跑過，結果是 `fail 1`，錯誤類型為 `TypeError`。這正是「修好合併弄壞的地方」要處理的情況：測試得補上一個計費替身，而不是把通知那一行刪掉。全部通過後，AI 才 stage 並 commit。

## 我認為兩條軸要分開讀，異味不必當場修

這一節是我自己的看法，原始資料沒有直接這樣說。

`code-review` 刻意不替兩條軸排序，所以讀報告的順序得由你決定。我會先讀 Spec。Spec 軸的問題代表功能可能做錯了，合併前就要處理；Standards 軸的異味原文自己就標成判斷，大多可以等到下一次重整再一起看。

我也不會讓 `code-review` 當場把每個異味都修掉。上面模擬的 Shotgun Surgery 不是改一個名字就能解決的事，它需要的是 `improve-codebase-architecture` 那種先勘查、再訪談、再帶回主流程的完整處理。在審查階段硬修，等於在沒有規格的情況下改結構，正好跳過了第 3、4 篇建立起來的檢查點。

不過，這個做法建立在專案願意定期跑 `improve-codebase-architecture` 的前提上。如果團隊從來不排時間整理結構，留下來的異味只會越積越多；這時還不如在審查階段就先處理掉最明顯的幾個。

## 先決定這次修改要對照哪一份文件

程式寫完之後要判斷的事，大多不是測試能回答的。`code-review` 把它拆成兩個問題：有沒有照規範寫、有沒有照規格做，兩份報告分開讀。結構上的問題交給 `improve-codebase-architecture` 定期勘查，再用 `codebase-design` 的詞彙討論怎麼改。分支撞在一起時，先讀兩邊的 commit 與工作單，再決定怎麼合。

回到按席次計費，下一步是在第三張工作單的分支上跑一次 `$code-review main`，先處理 Spec 軸的那一項，再決定 Standards 軸的異味要不要排進下一次架構勘查。

## 延伸閱讀

- [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L1-L114)：完整的深模組詞彙、四條原則，以及它刻意不採用的幾種說法。
- [`codebase-design/DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L1-L37)：四種依賴類別各自怎麼測，以及「替換而非疊加」的測試策略。
- [`codebase-design/DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L1-L44)：平行子代理各帶什麼限制，以及比較設計時看哪三個面向。
- [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L16-L71)：從決定範圍、產出報告到訪談的三個步驟。
- [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L1-L87)：兩條軸的子代理提示內容，以及完整的 12 種異味清單。
- [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L1-L14)：`1.2.3` 版的五個步驟；移除後的[封存說明頁](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md)另外解釋了為什麼不該靠 `--ours` 或 `--theirs` 解衝突。
