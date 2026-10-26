---
title: "mattpocock/skills 系列（5）：程式寫完之後，誰來看結構、審修改、解衝突"
description: "測試通過不代表一切都好。本文介紹 codebase-design、improve-codebase-architecture、code-review 與 resolving-merge-conflicts 四個 skill，並用按席次計費的例子實際做出一次合併衝突。"
date: 2026-10-14 10:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, code-review, software-architecture, git]
media_subpath: /assets/img/posts/mattpocock-skills-design-review-integration/
image:
  path: cover.png
  alt: "測試通過後還要看三件事：結構有沒有越改越亂、修改是否照需求，以及衝突時兩邊各想做什麼。"
---

上一篇用 `implement` 做完了「停用成員並釋放席次」，測試從紅燈（失敗）轉成綠燈（通過），AI 最後也照指令跑了一次 `code-review`。現在你手上有三張做完的工作單，和一條準備合併回主線的分支（分支就是從主線複製出來、讓你放心修改的一份副本）。

測試通過，只代表程式的行為和測試寫的一樣。但還有三件事是測試看不出來的：

- 程式的結構，會不會越改越亂？
- 這次的修改，有沒有多做或漏做需求裡的東西？
- 兩個人同時改到同一段程式時，該留誰的版本？

`mattpocock/skills` 用四個 skill 處理這三件事。`codebase-design` 和 `improve-codebase-architecture` 管結構，`code-review` 管這次的修改，`resolving-merge-conflicts` 管合併時的衝突。

> mattpocock/skills 系列｜第 5 篇
>
> - 上一篇（第 4 篇）：[AI 開工寫程式前，先決定要看哪一種訊號](/posts/mattpocock-skills-implementation-feedback-loops/)
> - 下一篇（第 6 篇）：[查資料、做交接、學新東西，都有固定做法](/posts/mattpocock-skills-research-handoff/)
> - 系列導讀：[這套 skill 是什麼、六篇該怎麼讀](/posts/mattpocock-skills-series-guide/)
>
> 本文資料以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。按席次計費的 skill 呼叫流程依原始指令推演；文中的合併衝突與合併後的測試失敗則是實際執行結果。
{: .prompt-info }

> 系列開始之後，`mattpocock/skills` 已經更新到 `1.3.x`。[`v1.3.0` 移除了 `resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)，官方說沒有其他 skill 取代它；同一版也把詞彙表 `CONTEXT.md` 改名為 `GLOSSARY.md`。本文為了和前四篇一致，仍以 `1.2.3` 為準。
{: .prompt-warning }

## 先認識三個詞

這篇只需要先記住三個詞：

| 本文用詞 | 一句話解釋 |
| --- | --- |
| 模組 | 一塊有名字、可以單獨拿來用的程式，小到一個函式，大到一整個套件都算 |
| 介面 | 別人使用這個模組時要知道的東西，就像家電上的按鈕和說明書 |
| 接點 | 程式裡可以把零件換掉的位置，就像插座，模組的介面就在這裡。上一篇的「測試接點」是同一個詞，從測試的角度看：測試從這個位置進去觀察行為 |

## 四個 skill 各管什麼

| skill | 做什麼 | 什麼時候用 | AI 會不會自己啟動 |
| --- | --- | --- | --- |
| `codebase-design` | 一份討論程式結構用的詞彙表 | 想討論某段程式該怎麼切、怎麼包 | 會 |
| `improve-codebase-architecture` | 定期幫專案做健康檢查，找出值得整理的地方 | 有空的時候；或修 bug 時發現程式很難測 | 不會，要你手動叫它 |
| `code-review` | 合併前的審查 | 一條分支做完，準備合併前 | 會 |
| `resolving-merge-conflicts` | 幫你解合併衝突 | 已經卡在衝突裡的時候 | 會 |

這四個在 `ask-matt` 的路線圖裡位置都不同：[`codebase-design` 是底層詞彙](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L59)，[`improve-codebase-architecture` 是平時保養](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，[`code-review` 是主流程的最後一步](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26)，[`resolving-merge-conflicts` 不在任何流程裡](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L79)，卡住了才用。

`improve-codebase-architecture` 是這四個裡唯一[設定成 AI 不能自己啟動](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L4)的一個，Codex 那邊的設定檔[也關掉了](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/agents/openai.yaml#L4-L5)。它會先圈出範圍，再派小幫手把那一帶的程式讀過一遍，相當花時間，所以由你決定什麼時候跑。

## `codebase-design`：先統一大家講話的用詞

`codebase-design` 沒有步驟，它只是一份詞彙表。目的是讓你和 AI 討論程式結構時，同一個詞指的是同一件事。原文甚至[要求不要換成其他說法](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L12)，例如不要把「模組」講成「元件」或「服務」。

這和第 2 篇的 `domain-modeling` 很像。[`ask-matt` 把兩者並列](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L55-L59)：`domain-modeling` 統一業務上的用詞，例如「計費席次」；`codebase-design` 統一程式結構的用詞。上一篇的 `tdd` [遇到「這個介面該長什麼樣」的問題時](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26)，也是回來查這一份。

### 好的模組：按鈕少，裡面做很多事

整份詞彙表的核心是一個想法：[好的模組要「深」](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L8)。

用咖啡機來比喻。一台好的咖啡機只有一顆按鈕，磨豆、加熱、萃取都在機器裡面完成，這就是「深」。如果每一個步驟都要你自己按一顆按鈕，按鈕多到和裡面做的事差不多，就是「淺」。

[原文對「深」的定義](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L20)就是：使用者每多學一顆按鈕，能換到多少功能。換到越多，這個模組越深。

深模組有兩個好處：用的人省事，只要記住少數幾個按鈕；改的人好找，要改的東西都集中在同一個地方。

設計介面時，它要 AI [問自己三個問題](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L54-L58)：

- 按鈕能不能再少一點？
- 每個按鈕要填的東西能不能再簡單一點？
- 能不能把更多麻煩事藏進裡面？

![左側淺模組有五顆按鈕：指派席次、釋放席次、計算人數、通知計費、檢查成員，裡面只是照順序往下傳；右側深模組只有指派、停用、查可用席次三顆按鈕，其餘的事都藏在裡面；底部寫著「用的人只要記三顆按鈕，測試也從這三顆按下去」](deep-vs-shallow-module.png){: width="800" height="450" }
_同樣的席次功能，左邊要記五顆按鈕，右邊只要三顆。_

### 四條判斷原則

[原文一共列了四條](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L60-L65)：

1. **深不深，看的是按鈕，不是裡面。** 裡面可以拆成很多小零件，只要不讓使用者看到就好。
2. **刪掉看看。** 想像把這個模組刪掉。如果麻煩跟著消失，它只是個傳話的中間人；如果麻煩散回每個使用它的地方，它就有存在的價值。
3. **測試和使用者按同一組按鈕。** 如果你想繞過按鈕直接去測裡面，代表這個模組切得不對。
4. **只有一種零件可以插的插座，不算插座。** 「以後可能要換」不是理由，至少要真的有兩種東西會插進來（例如正式版和測試用的假版本），才值得在這裡留一個接點。

第 4 條說的情況很常見。很多人為了「以後可能要換資料庫」先多包一層，結果專案從頭到尾只用過一種。依這條原則，那一層只是讓程式多繞了一圈。

### 兩份附錄

`codebase-design` 另外附了兩份文件，處理「決定要整理某個模組之後」的事：

- [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L5-L37) 說明怎麼依照模組依賴的東西來決定怎麼測，例如依賴的是外部付款服務，測試時就換成假的。它也提醒：模組整理好、針對新的按鈕補好測試之後，[舊的測試要刪掉](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L32-L37)，不要新舊兩套一起留著。
- [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L19-L44) 說明怎麼「多畫幾種設計再挑」。AI 會同時分派 3 個以上的小幫手，各自用不同的方向設計，例如「按鈕越少越好」或「最常用的情況最簡單」，最後比較並給出明確的推薦，而不是丟一份選單給你自己挑。

## `improve-codebase-architecture`：定期幫專案做健康檢查

如果 `codebase-design` 是整理時用的工具箱，`improve-codebase-architecture` 就是[先到現場巡一遍，找出值得整理的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)。它的目標是[把淺模組整理成深模組](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L9)，讓程式更好測，AI 也更容易看懂。

它分三步。

**第一步：先決定看哪裡。** 整理的好處是讓以後的修改變容易，所以[優先看最近常被改的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L20-L23)。你指定了範圍就照你的；沒指定的話，AI 會翻修改紀錄，找出反覆被改的檔案。

接著它會先讀專案的詞彙表 `CONTEXT.md`，再派一個小幫手去讀程式，記下[讀起來卡卡的地方](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L27-L35)。例如：為了搞懂一件事，得在好幾個小檔案之間跳來跳去；或者某段程式很難測。

如果專案裡有「決策紀錄」，也就是記下某個設計為什麼這樣決定的文件，它也會先讀。[和既有決定相衝突的建議](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L56)，只有在問題真的嚴重到值得重新討論時才會提出。

**第二步：產出一份網頁報告。** 報告[存在電腦的暫存資料夾](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L39)，不會混進專案裡。每個建議是一張卡片，[寫著涉及哪些檔案、哪裡有問題、打算怎麼改、改了有什麼好處，附一張改前改後的對照圖](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L43-L52)，並標上「強烈建議」、「值得研究」或「僅供參考」三種推薦程度。

這一步[還不會提出具體的設計](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L60)。報告寫完，AI 只會問你一句：想先研究哪一個？

**第三步：針對你挑的那一個，一起把細節問清楚。** AI 用第 2 篇介紹過的 `grilling` 一題一題問你，[釐清限制、要依賴什麼、整理後長什麼樣、哪些測試能留下](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L62-L71)。談話中出現新詞，就順手補進 `CONTEXT.md`。如果你因為一個重要的理由否決了這個建議，AI 會問要不要寫成決策紀錄，免得下次健康檢查又提出一樣的東西。

這一步產出的是一個想法，不是程式。這個想法要[回到主流程](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L52)，從 `grill-with-docs` 開始，照第 3、4 篇的路線走一遍。

作者在 README 裡[建議每隔幾天跑一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L178)，但也說得很直白：它是健康檢查，不是急救。很亂的老專案，它能指出問題在哪，卻不會幫你一次理乾淨。

## `code-review`：合併前分兩邊檢查

`code-review` 檢查的是[某個時間點之後的所有修改](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L6-L11)。這個時間點可以是某個分支，例如 `main`，也可以是某一次 commit（commit 是把一批修改存成一個版本，並附上一段說明）。

它把檢查拆成兩邊，各問一個問題：

- **照規矩寫了嗎？**（原文叫 Standards）程式有沒有遵守專案自己訂的寫法規範。
- **照需求做了嗎？**（原文叫 Spec）程式有沒有做到工作單或規格要求的內容。

兩邊各交給一個小幫手同時檢查，互不干擾，最後再把兩份報告放在一起給你看。

### 它怎麼做

1. **[先確認從哪裡開始比](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L17-L23)。** 你沒說，它就問。動手前先確認這個起點存在、而且真的有修改，免得兩個小幫手白跑一趟。
2. **[找需求文件](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L25-L32)。** 先看 commit 訊息有沒有提到工作單編號，再找你給的路徑和 `docs/` 這類資料夾。都找不到就問你；你說沒有，「照需求做了嗎」這一邊就跳過。
3. **[找專案規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L34-L56)。** 例如 `CONTRIBUTING.md` 這類寫著「我們的程式要怎麼寫」的文件。
4. **[兩個小幫手同時開工](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L58-L72)。** 報告各限 400 字。每一項發現都要指出依據，是違反哪份規範的哪一條，或是規格裡的哪一句。
5. **[兩份報告分開呈現](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L74-L78)。** 不合併、也不排出「最嚴重的第一名」。

第 2 步要知道工作單放在哪，這是第 1 篇 setup 時留下的設定。[設定檔不在時，AI 會請你先跑 setup](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L13)。

### 沒有寫規範，也有一份基本檢查表

很多專案根本沒寫規範。所以「照規矩寫了嗎」這一邊[固定會帶一份基本檢查表](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L38-L56)，內容取自 Martin Fowler《重構》一書第 3 章列的 12 種「程式的壞味道」。壞味道指的是不一定有錯、但看了會讓人皺眉的寫法。舉三個例子：

| 壞味道 | 長什麼樣子 | 建議怎麼改 |
| --- | --- | --- |
| 名字看不懂 | 看名稱猜不出它在做什麼 | 改名；想不出好名字，通常代表設計本身就不清楚 |
| 改一件事要動很多地方 | 一個小需求，得在好幾個檔案裡東改一點西改一點 | 把會一起改的東西收到同一個地方 |
| 替不存在的需求預留彈性 | 為了「以後可能用到」多加的參數或設定 | 刪掉，等真的需要再加 |

這份表有兩個前提：專案自己的規範優先，專案明文允許的寫法就不算壞味道；每一項都只是提醒，報告要寫成「可能有這個問題」，不能當成硬性違規。

第三個例子和 `codebase-design` 的「只有一種零件可以插的插座，不算插座」是同一件事，一個在設計時提醒，一個在審查時抓出來。

### 為什麼要分兩邊

原文的理由很簡單：[一次修改可能只過了其中一關](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L80-L87)。

- 寫得很漂亮，卻做錯了需求：規矩過關，需求沒過。
- 需求完全照做，卻破壞了專案的慣例：需求過關，規矩沒過。

分開報告，才不會讓一邊的好成績蓋過另一邊的問題。

![左側「照規矩寫了嗎」報告列出兩個可能的壞味道，標明只是提醒；右側「照需求做了嗎」報告引用規格原文，列出計費已收到新席次數，以及停用沒有席次的成員可能做錯；底部寫著「寫得漂亮卻做錯需求，一邊的好成績蓋不掉另一邊的問題」](code-review-two-axes.png){: width="800" height="450" }
_兩份報告分開放，不合成一份排名。_

上一篇提過，[`tdd` 把整理寫法的工作留到審查階段](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L38)。「照規矩寫了嗎」這一邊，就是測試通過之後，回頭整理寫法的那一步。

## `resolving-merge-conflicts`：先搞懂兩邊想做什麼，再合併

先說明什麼是合併衝突。兩個人從同一份程式各自修改，又剛好改到同一段，負責管理版本的工具 git 不知道該留哪一邊，就會停下來，把兩邊的版本都標出來，讓人決定。

這個 skill 只有[五個步驟](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L6-L14)：

1. 先看清楚現在卡在哪裡、哪些檔案有衝突。
2. 替每一處衝突找出源頭：讀 commit 訊息、PR（請別人審查並合併修改的申請）和原本的工作單，搞懂兩邊各自為什麼這樣改。
3. 一處一處解決。能兩邊都保留就都保留；真的只能選一邊時，選符合這次合併目的的那邊，並寫下為什麼。不准自己發明新功能，也[不准直接放棄合併](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L10)。
4. 跑一次專案的自動檢查，通常包括型別檢查（確認資料的種類沒有用錯）、測試和格式整理，把合併弄壞的地方修好。
5. 完成合併並 commit。

重點在第 2 步。衝突標記只告訴你「兩邊的文字不一樣」，不會告訴你兩邊各自想做到什麼。如果直接選「只留我這邊」或「只留對方那邊」，程式也許能跑，卻可能默默丟掉別人刻意加的修改。

![左側直接選「只留我這邊」，結果「停用不存在的成員時回傳 false」被默默丟掉；右側先讀兩邊的 commit，把檢查成員、通知計費和回傳結果都保留下來；底部寫著「衝突只告訴你文字不同，不會告訴你兩邊想做什麼」](merge-conflict-intent.png){: width="800" height="450" }
_直接挑一邊雖然能跑，卻可能少掉一半的修改目的。_

前面提過，這個 skill 在 `1.3.0` 被移除了，[封存的說明頁](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md#L1)寫明沒有替代品。不過這五個步驟不需要任何工具，就算沒裝這個 skill，也可以照著做。

## 哪些地方要花你的時間

| 環節 | 由誰負責 | 要做什麼 |
| --- | --- | --- |
| 健康檢查的範圍 | 你 | 指定要看哪一塊；不指定就由 AI 從修改紀錄推斷 |
| 看健康檢查報告 | 你 | 從建議中挑一個，判斷推薦程度合不合理 |
| 細節討論 | 你 | 回答限制與取捨；否決建議時決定要不要留下決策紀錄 |
| 多畫幾種設計 | AI 和你 | AI 同時派出幾個小幫手；你讀完幾份設計和推薦後決定 |
| 審查的起點與需求文件 | 你 | 告訴它從哪裡開始比、需求文件在哪 |
| 讀審查報告 | 你 | 兩邊分開看；壞味道只是提醒，要不要改由你決定 |
| 解合併衝突 | AI，必要時是你 | 追查兩邊的修改目的；真的只能選一邊時，確認 AI 的選擇和理由 |

最花時間的是健康檢查和「多畫幾種設計」，因為兩者都要讀很多程式。好在它們也最不急：程式能跑，只是結構不夠好，挑有空的時候做就行。

## 什麼情況用哪一個

| 你遇到的狀況 | 用哪個 | 什麼時候不適合 |
| --- | --- | --- |
| 想討論某段程式該怎麼切、按鈕該留哪些 | `codebase-design` | 卡住的是業務用詞而不是程式結構時，改用 `domain-modeling` |
| 有空，想找出專案裡值得整理的地方 | `improve-codebase-architecture` | 正在趕功能時。它的產出是想法，之後還要再走一次主流程 |
| 修完 bug，卻找不到地方寫測試來防止它再發生 | `improve-codebase-architecture` | 找得到地方時，直接補測試就好 |
| 一條分支做完，準備合併 | `code-review` | 沒有需求文件時，只會檢查「照規矩寫了嗎」 |
| 合併時卡在衝突上 | `resolving-merge-conflicts`（`1.2.x`） | 合併完成後才出現怪問題，改用上一篇的 `diagnosing-bugs` |

## 模擬情境：替按席次計費做一次審查與合併

以下的 skill 呼叫沒有實際執行，流程依 `1.2.3` 版的原始指令推演。其中的合併衝突用 git 2.47.3 實際做過，合併後的測試用 Node.js v20.19.2 跑過；程式是為本文寫的最小範例，並非取自 `mattpocock/skills`。

### 審查「停用成員並釋放席次」

第三張工作單做完後，`implement` 會自動呼叫 `code-review`。你也可以自己開一個新對話來跑：

```text
$code-review main
```
{: .nolineno }

意思是「檢查從 `main` 分出來之後的所有修改」。AI 從 commit 訊息裡找到工作單編號；專案沒有寫規範，所以「照規矩寫了嗎」這一邊只用基本檢查表。

兩份報告可能長這樣（推演）：

- **照規矩寫了嗎**：通知計費的程式散在「指派席次」和「停用成員」兩個地方，「可能有『改一件事要動很多地方』的問題」。這只是提醒，不是錯誤。
- **照需求做了嗎**：工作單要求的「計費系統收到新的席次數量」已經做到。但停用一個本來就沒有席次的成員時會怎樣，工作單沒寫，程式也沒處理，列為「看起來做了，但可能有漏洞」。

你可以先處理需求那一項，回頭把規則問清楚；規矩那一項，留到下次健康檢查再說。

### 讓健康檢查接手結構問題

幾天後你跑了 `$improve-codebase-architecture`，並指定範圍「席次計費」。報告裡可能出現這樣一張卡片（推演）：

- **標題**：把席次計費整理成一個模組
- **涉及檔案**：`seats.js`、`billing-sync.js`
- **問題**：指派、停用、通知計費散在兩個檔案，每個用到它的地方，都得記得改完席次後要通知計費。
- **做法**：席次計費只對外留三顆按鈕：「指派」、「停用」、「查可用席次」，通知計費藏在裡面自動完成。
- **推薦程度**：值得研究

用「刪掉看看」檢查一下：把 `billing-sync.js` 刪掉，「改完席次要通知計費」這件事會散回每一個用到它的地方。所以這份麻煩是真的存在，只是放錯了位置。

你選了這張卡片，AI 就開始一題一題問細節，談完後把想法帶回 `grill-with-docs`，再照第 3、4 篇的路線走一次。

### 兩條分支同時改到 `deactivateMember()`

同一時間，同事在另一條分支 `guard-unknown` 改了停用功能：停用一個不存在的成員時，回傳 `false`。而你的分支 `notify-billing` 讓停用後通知計費。兩邊都從同一份 `seats.js` 開始改：

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```
{: file="seats.js（兩邊共同的起點）" }

在你的分支上合併同事的分支：

```bash
git merge guard-unknown
```
{: .nolineno }

git 停下來，說有衝突：

```plaintext
Auto-merging seats.js
CONFLICT (content): Merge conflict in seats.js
Automatic merge failed; fix conflicts and then commit the result.
```

打開 `seats.js`，git 把兩邊的版本都標了出來。`<<<<<<< HEAD` 到 `=======` 是你這邊，`=======` 到 `>>>>>>>` 是同事那邊：

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

這時呼叫 `$resolving-merge-conflicts`。照第 2 步，AI 先讀兩邊的 commit 訊息：你這邊是「停用後通知計費系統新的席次數量」，同事那邊是「停用不存在的成員時回傳 false」。兩個目的並不衝突，所以兩邊都保留：

```javascript
export function deactivateMember(workspace, memberId, billing) {
  if (!workspace.assigned.has(memberId)) return false;
  workspace.assigned.delete(memberId);
  billing.updateSeatCount(workspace.assigned.size);
  return true;
}
```
{: file="seats.js（解決後）" }

順序也有講究：先檢查成員在不在，不在就直接結束，計費系統就不會收到一次沒有變化的通知。這一點兩邊的 commit 都沒提到，是 AI 合併時自己做的判斷，所以要寫進合併的 commit 訊息，讓你審查時看得到。

接著照第 4 步跑測試。上一篇用 `node --test seats.test.js` 跑的測試，呼叫 `deactivateMember()` 時沒有傳入計費系統。我把合併後的程式放回上一篇的測試，用 Node.js v20.19.2 實際跑過，結果是 `fail 1`（一個測試失敗），錯誤類型為 `TypeError`，意思是程式拿到了不能用的東西：這裡是計費系統沒有傳進來。

這正是「把合併弄壞的地方修好」要處理的情況：要在測試裡補一個假的計費系統，而不是把通知計費那一行刪掉。全部通過之後，AI 才會 commit。

## 我認為兩份報告要分開讀，壞味道不必當場修

這一節是我自己的看法，原始資料沒有直接這樣說。

`code-review` 刻意不替兩份報告排先後，所以先讀哪一份由你決定。我會先讀「照需求做了嗎」。這一邊有問題，代表功能可能做錯了，合併前就要處理。「照規矩寫了嗎」的壞味道，原文自己就說只是提醒，大多可以等下次整理時一起看。

我也不會讓 `code-review` 當場把每個壞味道都修掉。上面模擬的「改一件事要動很多地方」，不是改個名字就能解決的。它需要的是健康檢查那一套：先巡一遍、再討論、再回到主流程。在審查時硬改，等於沒有需求文件就去動結構，正好跳過了第 3、4 篇建立的檢查點。

不過這個做法有個前提：專案真的會定期做健康檢查。如果團隊從來不排時間整理，留下來的壞味道只會越積越多。這種情況下，還不如在審查時先把最明顯的幾個修掉。

## 小結

程式寫完之後要判斷的事，大多不是測試能回答的。

- 這次的修改，交給 `code-review` 分兩邊看：照規矩寫了嗎、照需求做了嗎。
- 結構的問題，交給 `improve-codebase-architecture` 定期健康檢查，再用 `codebase-design` 的詞彙討論怎麼改。
- 兩條分支撞在一起時，先讀兩邊的 commit 和工作單，搞懂各自想做什麼，再決定怎麼合。

換到你自己的專案，下一步是在一條做完、準備合併的分支上跑一次 `$code-review main`。先處理「照需求做了嗎」那一邊的問題，再決定「照規矩寫了嗎」的壞味道要不要排進下次健康檢查。

## 延伸閱讀

- [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md#L1-L114)：完整的詞彙表和四條原則，以及它刻意不採用的幾種說法。
- [`codebase-design/DEEPENING.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DEEPENING.md#L1-L37)：依照模組依賴的東西，決定怎麼測。
- [`codebase-design/DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/DESIGN-IT-TWICE.md#L1-L44)：「多畫幾種設計再挑」的完整做法。
- [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md#L16-L71)：健康檢查的三個步驟。
- [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md#L1-L87)：兩邊檢查的完整指令，以及 12 種壞味道的完整清單。
- [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md#L1-L14)：`1.2.3` 版的五個步驟；移除後的[封存說明頁](https://github.com/mattpocock/skills/blob/984a2c023c9fb42bb6ea40c70a652284a109dc05/docs/engineering/resolving-merge-conflicts.md)另外解釋了為什麼不該直接挑一邊。
