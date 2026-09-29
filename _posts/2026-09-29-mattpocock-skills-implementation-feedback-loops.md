---
title: "mattpocock/skills 系列（4）：AI 開工寫程式前，先決定要看哪一種訊號"
description: "工作單準備好後，AI 會同時寫程式與測試。本文說明 implement、tdd、diagnosing-bugs 與 prototype 各自靠什麼判斷做對了，並用按席次計費的例子實際跑一輪從紅燈到綠燈的測試。"
date: 2026-09-29 15:32:58 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, tdd, debugging, prototyping]
media_subpath: /assets/img/posts/mattpocock-skills-implementation-feedback-loops/
image:
  path: cover.png
  alt: "mattpocock/skills 系列第 4 篇封面：終端機裡同一條 node --test 先顯示 3 !== 4 的紅燈，再轉成 pass 1 的綠燈，旁邊的便條寫著預期值 = 4 出自規格；底部列出 implement、tdd、diagnosing-bugs 與 prototype"
---

上一篇用 `to-tickets` 把按席次計費切成三張工作單，每張都貼上了 `ready-for-agent`，表示資訊已經齊全，可以交給 AI 接手。現在要開一個新的對話，讓 AI 實作其中一張「停用成員並釋放席次」。它會自己改程式，也會自己寫測試，最後回報「測試全部通過」。

可是這些測試也是 AI 寫的。它可能只是在替自己剛寫的程式背書，根本沒對照需求。程式和測試都由 AI 寫，你要看什麼才知道它做對了？

`mattpocock/skills` 把這一段交給四個 skill：`implement`、`tdd`、`diagnosing-bugs` 與 `prototype`，每個 skill 看的訊號都不一樣。

> mattpocock/skills 系列｜第 4 篇
>
> - 上一篇（第 3 篇）：[先找出缺口，再決定要寫規格還是拆工作單](/posts/mattpocock-skills-specs-work-breakdown/)
>
> 本文資料以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。按席次計費的 skill 呼叫流程依原始指令推演；文中的紅燈與綠燈測試輸出則是實際執行結果。
{: .prompt-info }

## 先認識幾個詞

下面幾個詞會反覆出現：

| 本文用詞 | 原文 | 意思 |
| --- | --- | --- |
| 紅燈、綠燈 | red、green | 測試失敗顯示紅色，通過顯示綠色。先寫一個會失敗的測試，再寫剛好讓它通過的程式，這一來一回就是一輪 |
| 測試接點 | seam | 從外面觀察程式行為的公開入口，例如一個對外提供的函式。測試只從這裡進去，不碰內部細節 |
| 回饋迴路 | feedback loop | 一條可以反覆執行、立刻告訴你「對」或「錯」的指令，例如一次測試或一個腳本 |
| 原型 | prototype | 只為了回答一個設計問題而寫、之後不會直接上線的程式 |

## 四個 skill 各看一種回饋訊號

這四個 skill 都放在 repo 的 `skills/engineering/` 底下，套件授權是 [MIT](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L10)。它們在 `ask-matt` 的路線圖裡位置不同。

`implement` 位在主流程的最後一段。[`ask-matt` 的主流程](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L22-L26)寫明，它在實作每張工作單時會搭配 `tdd`，完成後再跑 `code-review`。`code-review` 負責審查這次修改的程式，第 5 篇會介紹。`diagnosing-bugs` 是另一個入口，[專門處理「東西壞了」](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L42)。`prototype` 則是需求討論中的岔路，[遇到只靠對話談不定的設計問題時才走](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L18-L21)。

| skill | 什麼時候出場 | 靠什麼判斷做對了 |
| --- | --- | --- |
| `implement` | 規格或工作單已經準備好 | 型別檢查、測試，以及最後的 `code-review` |
| `tdd` | 要先寫測試、再寫程式 | 事先確認的測試接點上，一個先紅後綠的測試 |
| `diagnosing-bugs` | 功能壞掉、報錯或變慢，第一眼找不到原因 | 一條已經對這個 bug 亮過紅燈的指令 |
| `prototype` | 設計問題無法在紙上判斷 | 由人實際點過或看過之後的反應 |

## `implement` 把工作單交給測試與審查

`implement` 是四個 skill 裡最短的一個。扣掉檔案開頭的 front matter 設定區塊，整份指令只有五行：

```markdown
Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
```
{: file="skills/engineering/implement/SKILL.md" }

逐行看，AI 會做下面五件事：

1. 讀你指定的規格或工作單，依照內容實作。
2. 能用 `tdd` 的地方就用，而且只在事先談好的測試接點上寫測試。
3. 過程中經常跑型別檢查與單一測試檔，整套測試只在最後跑一次。
4. 做完後呼叫 `code-review` 審查這次的修改。
5. 把成果 commit 到目前的分支。

要注意第 3 點：整套測試只在最後跑一次，所以這張工作單沒有動到的測試檔，要到最後才會執行。如果這次修改不小心弄壞了別處的功能，也要到那時才會發現。

`implement` 不會自己啟動。它的 front matter 設定了 [`disable-model-invocation: true`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/implement/SKILL.md#L4)，`agents/openai.yaml` 也寫了 [`allow_implicit_invocation: false`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/implement/agents/openai.yaml#L5)。AI 不會因為聊到「開始寫吧」就自行執行它，要由你明確呼叫。

功能要分好幾次對話才做得完時，[`ask-matt` 建議](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L23)每張工作單各跑一次 `implement`，兩張之間清空對話內容。因為每張工作單已經寫明所需資訊，上一張的對話不必保留。

## `tdd` 先約定在哪裡測，再一次只做一小段

`implement` 的第二行把測試交給 `tdd`。`tdd` 先處理「在哪裡測」，再處理「怎麼測」。

[它的規則](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L18-L24)要求 AI 在寫任何測試之前，先列出準備測試的接點，並請你確認。沒確認過的接點，一個測試都不寫。原文的理由是不可能每個地方都測，先談好接點，測試才會集中在最重要的流程與最複雜的邏輯上。

AI 開始探索程式時，[若專案裡有 `CONTEXT.md` 就先讀](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L10)，讓測試名稱沿用專案的共用詞彙。這份詞彙表就是第 2 篇用 `grill-with-docs` 留下的那一份。

接點確認後，才進入紅綠循環。[循環規則](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L34-L38)有三條：

- **先紅後綠。** 先寫一個會失敗的測試，再只寫剛好讓它通過的程式，不替後面還沒寫的測試預先做準備。
- **一次一小段。** 每一輪只處理一個接點、一個測試與一份最小實作。
- **重構不在循環裡。** 重構是指不改變程式行為、只整理寫法，這件事留到 `code-review` 階段再做。

`tdd` 另外點名[三種反模式](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L28-L32)：

| 反模式 | 長什麼樣子 | 會出什麼問題 |
| --- | --- | --- |
| 綁死實作細節 | 模擬自己的內部模組、測試私有方法，或繞過介面直接查資料庫 | 程式行為沒變、只是整理了寫法，測試卻壞了 |
| 同義反覆 | 預期值用和程式一模一樣的算法重算一遍 | 測試怎樣都會通過，永遠不會和程式唱反調 |
| 水平切分 | 先把所有測試寫完，再一次寫完所有實作 | 測到的是想像中的行為；還沒動手實作，測試的架構就先定死了 |

第三種的解法是垂直切分。一個測試配一份實作，再進下一輪，每一輪都根據上一輪學到的東西調整。上一篇 `to-tickets` 切工作單用的 tracer bullet 概念，在這裡又出現一次，只是尺度縮小到單一測試。

要模擬的對象也有限制。[`mocking.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/mocking.md#L3-L14) 只允許在系統邊界使用替身。替身是用假的物件頂替程式原本依賴的東西；系統邊界則是程式與外界接觸的地方，例如付款或寄信等外部服務、時間與亂數。自己寫的模組與內部元件不用替身。

## `diagnosing-bugs` 先做出會亮紅燈的指令

`tdd` 處理「還沒寫的程式」，`diagnosing-bugs` 處理「已經壞掉的程式」。它的[第一階段](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L18-L22)直接寫著「This is the skill」，意思是整個 skill 的重點就在這一步。在做出一條會對這個 bug 亮紅燈的指令之前，AI 不准開始推測原因。

[原文列出十種做法](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L24-L35)，大致依序嘗試。最優先的是一個會失敗的測試，接著是對開發伺服器送請求的腳本、帶固定輸入的 CLI 指令，以及操作瀏覽器的腳本。排在最後的是 `scripts/hitl-loop.template.sh`，只有在一定要人動手點畫面時才用。這個範本提供兩個函式：[`step` 顯示一步操作並等你按 Enter，`capture` 把你輸入的觀察結果記下來](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh#L20-L30)，最後印成 `KEY=VALUE` 交回給 AI。

第一階段有[四項完成條件](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L57-L66)。AI 必須提出一條已經實際跑過的指令並貼出執行結果，而這條指令要做到：

- 會走到出錯的程式路徑，並檢查使用者回報的那個症狀。
- 每次執行的結果都一樣。
- 幾秒內跑完。
- AI 可以自己執行，不必等人在旁邊操作。

偶爾才出現的 bug 不求每次重現，[目標是把重現率拉高](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L49-L51)。原文舉例，重現率 50% 的 bug 還追得下去，1% 就追不了。真的做不出迴路時，[AI 要停下來](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L53-L55)列出試過的方法，再向你要能重現問題的環境、去除機密後的紀錄檔，或請你允許它在正式環境暫時加上監測。

![左側推理牆用紅線串起「是快取吧」「時區問題」「競態條件」「第三方 API」「上週的部署」五張便條，下方寫著「我盯這段程式碼三天了」；右側只有一行 node --test seats.test.js 與一顆亮起的紅燈，底部寫著「沒亮過紅燈，就先別開始猜」](diagnosing-red-light-first.png){: width="800" height="450" }
_還沒有會亮紅燈的指令，推測再多也無法確認哪一個對。_

有了迴路之後，後面五個階段依序進行：

1. **[重現並縮小](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L68-L86)。** 確認亮紅燈的是使用者回報的那個症狀，再每次拿掉一項輸入或步驟，直到剩下的每一項都缺一不可。
2. **提出假設。** 一次列出 3 到 5 個排過優先順序的假設，每個都寫明它預測會發生什麼，並[先給你看](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L88-L98)。你不在時，AI 照自己的排序繼續。
3. **[加入觀察點](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L100-L112)。** 觀察點是在程式裡印出中間值等除錯輸出。每個觀察點對應一個假設，一次只改一個變因。除錯用的輸出一律加上像 `[DEBUG-a4f2]` 這樣的前綴，結束時搜尋一次就能全部刪掉。
4. **修正並補回歸測試。** 回歸測試用來確認同一個 bug 不會再出現。先寫一個會失敗的回歸測試，再修正。前提是[找得到正確的測試接點](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L114-L128)；如果找不到，也說明了一件事：現在的程式結構沒辦法用測試擋住這個 bug 再次出現。
5. **[清理](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L130-L138)。** 重跑原本的迴路、確認回歸測試通過、刪掉 `[DEBUG-` 開頭的輸出，並把最後證實的假設寫進 commit 或 PR 訊息。

第 2 步的假設要寫成「如果原因是 X，那麼改變 Y 會讓 bug 消失」。套在席次上，可以寫成「如果原因是停用時沒有把成員移出已指派名單，那麼在停用流程補上移除動作，可用席次就會正確增加」。寫不出預測的假設要丟掉或改寫。

第 4 步找不到測試接點時，[`ask-matt` 把後續交給 `improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L42)，下一篇會介紹。

## `prototype` 用拋棄式程式回答一個設計問題

前三個 skill 都能靠指令判斷對錯。有些設計問題卻得讓人親手試過，才會發現哪裡不對。例如：成員被停用後又要重新啟用，工作區卻剛好沒有可用席次了，這時該怎麼處理？

`prototype` 一開頭就寫明，原型是[回答一個問題的拋棄式程式](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/SKILL.md#L8-L17)，要回答什麼問題，就決定原型做成什麼樣子。它分成兩條路：

| 要回答的問題 | 產物 | 怎麼使用 |
| --- | --- | --- |
| 這套邏輯或狀態模型對不對 | 一個獨立的 HTML 檔，連按兩下就能開 | 按按鈕推動狀態，看每一步後的完整狀態 |
| 這個畫面該長什麼樣子 | 同一個網址路徑上的數個版本，用 `?variant=` 切換 | 用畫面底部的浮動列左右切換版本 |

邏輯原型要寫給不寫程式的人使用。[`LOGIC.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/LOGIC.md#L35-L50) 要求按鈕與狀態都用領域語言標示，畫面分成三塊：目前狀態、可以自由操作的按鈕，以及分成數個分頁的引導情境。每個情境都從同一個初始狀態開始。情境組合要涵蓋順利的流程、棘手的邊界情況，以及一個應該被拒絕的操作。用來回答問題的那段邏輯，要寫成一個不碰網頁元素的獨立模組，問題解決後可以直接搬進正式程式。

畫面原型預設做 3 個版本，[最多 5 個](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/UI.md#L36-L38)。版本之間要有結構上的差異，例如版面、資訊層次或主要操作方式不同。[`UI.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/UI.md#L54) 說，三個只稍微調整過的卡片格線不是原型，只是桌布：看起來各有花色，卻沒有回答任何設計問題。[它也建議把版本直接放進既有頁面](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/UI.md#L14-L30)，因為頁面周圍的真實資料與導覽列才能暴露設計問題。

![左側版本 A、B、C 是同一種六格卡片格線，只分別塗成藍、綠、紫，旁邊的色卡寫著「本週新色」；右側三個版本分別是側欄加清單、精簡表格與摘要在上，底部寫著「只換顏色的三個版本，是桌布型錄」](prototype-wallpaper-variants.png){: width="800" height="450" }
_版本之間要在版面與操作方式上有所不同，只換顏色看不出設計差異。_

兩條路共用[六條規則](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/SKILL.md#L19-L26)。原型從第一天就標明是拋棄式，一個指令或連按兩下就能啟動，預設不存資料，也不寫測試與錯誤處理。每次操作後都要把完整狀態顯示出來。

最後一條規則說明原型怎麼收尾。驗證過的決定寫進正式程式，原型本身則 commit 到主線以外的拋棄式分支，並在實作工作單上留下指向該分支的說明。[`ask-matt` 把這個分支命名為 `prototype/<name>`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L80)。主線只留下驗證過的結論。

## 測試由 AI 自己寫，靠兩條規則才算數

開頭問過：AI 自己寫程式也自己寫測試，測試會不會只是在替程式背書？`tdd` 靠兩條規則防止這種情況。

**第一條是測試位置由你確認。** 上面提過，AI 列出的接點要經過你同意，才能在那裡寫測試。你可以趁這一步，把「停用成員後可用席次增加」這類需求裡寫明的行為，指定為一定要驗證的項目。

**第二條是預期值要有獨立來源。** `tdd` 在說明[同義反覆這個反模式](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L31)時，要求預期值來自程式以外的依據，例如已知正確的數值、手算過的例子或規格。`tests.md` 用同一個加總函式示範了兩種寫法：

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
{: file="skills/engineering/tdd/tests.md" }

第一種寫法的 `expected` 用 `reduce` 重算一次。程式怎麼算，測試就怎麼算，所以它永遠會通過。第二種寫法直接寫 `15`，這個數字可以拿規格或手算核對，程式算錯時測試就會失敗。

不過，這兩條規則都只是寫在 Markdown 裡的指令，沒有程式強制執行。[`tdd` 資料夾](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd)裡只有 `SKILL.md`、`tests.md`、`mocking.md` 與一份 `agents/openai.yaml`，沒有任何檢查腳本。AI 列出接點時，你若沒細看就按同意，第一條規則等於沒有作用。

所以測試算不算數，要你自己看兩樣東西：你確認過的接點清單，以及每個預期值能不能在規格裡找到出處。

![左側考卷的出題、作答、批改都是 AI，標準答案欄寫著「照作答算一遍」，蓋著 100 分；右側考卷由你確認的接點出題，標準答案寫著「15，出自規格」，由 node --test 批改；底部寫著「自己出題、自己作答、自己打分數」](tautological-test-exam.png){: width="800" height="450" }
_預期值若照程式的算法重算，測試就會永遠通過。_

## 哪些地方要花你的時間

用了這四個 skill，就不必再憑感覺判斷做完了沒，可以看能重跑的測試或指令。不過下面這些地方都要有人確認：

| 環節 | 由誰付出 | 付出什麼 |
| --- | --- | --- |
| 呼叫 `implement` | 你 | 每張工作單手動呼叫一次，兩張之間清空對話 |
| `tdd` 寫測試前 | 你 | 逐一檢查 AI 列出的測試接點 |
| `implement` 收尾 | AI 與你 | 跑完整套測試與 `code-review`，你要看審查結果 |
| `diagnosing-bugs` 第一階段 | AI，必要時是你 | 原文要求在這裡[投入不成比例的心力](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L22)；做不出迴路時，要由你提供環境或紀錄 |
| `diagnosing-bugs` 提出假設 | 你 | 看一遍假設排序，補上你知道的背景 |
| `prototype` 交付後 | 你或領域專家 | 實際點過每個情境或每個版本，並說出哪裡不對 |
| `prototype` 收尾 | 團隊 | 維護 `prototype/<name>` 分支，並在工作單上留下指向它的說明 |

最花時間的是 `diagnosing-bugs` 的第一階段。原文認為[迴路做對了，bug 就等於修好了九成](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L37)，所以時間都花在這裡；做不出迴路，就不進下一階段。

## 什麼情況用哪一個

照你手上的狀況挑：

| 你手上的狀況 | 使用的 skill | 不適用的時候 |
| --- | --- | --- |
| 有貼上 `ready-for-agent` 的規格或工作單 | `implement` | 還沒有規格或工作單時，先回到 `to-spec`，或單獨用 `tdd` |
| 沒有規格，只想先寫測試、再做出一個具體功能 | `tdd` | 連公開介面該長什麼樣都還沒定，就先用 `codebase-design` 的詞彙討論介面 |
| 功能報錯、結果錯誤或變慢，第一眼找不到原因 | `diagnosing-bugs` | 做不出會亮紅燈的指令時，AI 會停下來向你要環境或紀錄，不會直接猜 |
| 狀態模型或畫面，只靠對話判斷不了 | `prototype` | 問題能在對話中談定時，留在 `grill-with-docs` 繼續問 |

[`ask-matt` 也允許單獨使用 `tdd`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L26)，用來測試並實作一個具體行為，不必先有完整規格。[`tdd` 遇到介面形狀本身有疑問時](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L26)，會改去查 `codebase-design` 的詞彙。

## 模擬情境：實作「停用成員並釋放席次」

以下的 skill 呼叫沒有實際執行，因為 `implement` 會修改專案並 commit。流程依 `1.2.3` 版的原始指令推演。其中的紅燈與綠燈測試在 Node.js v25.2.1 上實際跑過，程式是為本文寫的最小範例，並非取自 `mattpocock/skills`。

假設前兩張工作單「顯示工作區已購買與可用席次」與「把可用席次指派給成員」都已完成。你開一個新的對話，附上第三張工作單：

```text
$implement <停用成員並釋放席次的工作單連結>
```
{: .nolineno }

AI 讀完工作單與 `CONTEXT.md` 後，依 `tdd` 的規則先列出測試接點，例如「工作區對外提供的 `deactivateMember()` 與 `availableSeats()`」。你要確認兩件事：這兩個函式是不是其他程式實際會呼叫的入口，以及驗收條件裡的「可用席次增加一席」能不能從這裡觀察到。

你同意後，AI 寫下第一個測試。預期值的依據是規格裡的「測試決定」欄位：停用成員後，可用席次要增加一席。以買了 5 席、指派 2 席為例，停用其中一人後，可用席次要是 4。把下面內容存成 `seats.test.js`：

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, assignSeat, deactivateMember, availableSeats } from "./seats.js";

test("停用成員後，可用席次增加一席", () => {
  const workspace = createWorkspace({ purchasedSeats: 5 });
  assignSeat(workspace, "alice");
  assignSeat(workspace, "bob");

  deactivateMember(workspace, "alice");

  assert.equal(availableSeats(workspace), 4);
});
```

此時的 `seats.js` 只有前兩張工作單完成的部分，`deactivateMember()` 還是空的：

```javascript
export function createWorkspace({ purchasedSeats }) {
  return { purchasedSeats, assigned: new Set() };
}

export function assignSeat(workspace, memberId) {
  workspace.assigned.add(memberId);
}

export function deactivateMember(workspace, memberId) {
  // 尚未實作
}

export function availableSeats(workspace) {
  return workspace.purchasedSeats - workspace.assigned.size;
}
```

在同一個資料夾放一份內容為 `{ "type": "module" }` 的 `package.json`，接著執行單一測試檔：

```bash
node --test seats.test.js
```
{: .nolineno }

結果亮紅燈，實際可用席次是 3，預期是 4：

```plaintext
✖ 停用成員後，可用席次增加一席 (0.92075ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
...
✖ failing tests:

test at seats.test.js:5:1
✖ 停用成員後，可用席次增加一席 (0.92075ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  3 !== 4
  
      at TestContext.<anonymous> (file:///<已遮蔽路徑>/seat-tdd/seats.test.js:12:10)
...
```

紅燈代表這個測試抓得到「停用後沒有釋放席次」的問題。接著只寫剛好讓它通過的程式，也就是把 `// 尚未實作` 換成一行：

```javascript
export function deactivateMember(workspace, memberId) {
  workspace.assigned.delete(memberId);
}
```

再跑一次同一條指令，結果轉成綠燈：

```plaintext
✔ 停用成員後，可用席次增加一席 (0.343958ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 43.76225
```

這只完成了一輪。工作單的驗收條件還包括「計費系統收到新的席次數量」，AI 會照著已確認的接點清單繼續下一輪，每輪一個測試。全部完成後，`implement` 跑完整套測試、呼叫 `code-review`，再 commit 到目前的分支。你要看的是審查結果，以及每個測試的預期值能不能對回規格。

如果之後收到「停用成員後，可用席次沒有增加」的回報，上面那條 `node --test` 就是 `diagnosing-bugs` 第一階段要的迴路。它對這個症狀亮過紅燈，而且從上面的 `duration_ms` 看，不到 50 毫秒就跑完，符合「幾秒內跑完」的條件。

## 我認為 `implement` 的品質取決於工作單

這一節是我自己的看法，原始資料沒有直接這樣說：工作單寫得好不好，決定了實作的品質。

`implement` 的指令只有五行。它沒有說工作單寫得模糊時該停下來問誰，也沒有規定驗收條件不完整時怎麼處理。它只把「在事先談好的接點上測試」交給 `tdd`，而那些接點與預期值，大多早在 `to-spec` 確認檢查點、`to-tickets` 寫下驗收條件時就決定了。

所以我不會期待 `implement` 補救一張切得不好的工作單。AI 列出的接點若對不上驗收條件，或預期值在規格裡找不到，我會暫停實作，回到 `grill-with-docs` 或 `to-spec` 把缺的內容補齊。

這個看法只適用於照這套流程先寫規格、再切工作單的專案。單獨用 `tdd` 做一個小功能時，接點與預期值是在當下的對話裡直接談定的，沒有事先寫好的規格或工作單可以回頭補。

## 小結

程式和測試都由 AI 寫的時候，判斷做對了沒，要看 AI 自己改不了的東西。寫新功能時，看測試是不是寫在你確認過的接點上、預期值是不是出自規格；修 bug 時，看有沒有一條對這個症狀亮過紅燈的指令；設計還沒定時，就讓你或熟悉業務的人實際點過原型再說。

這篇只談把工作單變成程式的這一段。審查程式碼結構與這次的修改，下一篇會介紹 `codebase-design`、`improve-codebase-architecture` 與 `code-review`。

回到按席次計費，接下來可以開一個新的對話，對第一張沒有前置工作的工作單執行 `$implement`。AI 列出測試接點時逐一確認；它寫出測試後，再核對每個預期值都能在規格裡找到。

## 延伸閱讀

- [`implement`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/implement/SKILL.md#L1-L15)：五行指令全文，看它把哪些工作交給 `tdd` 與 `code-review`。
- [`tdd`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md#L12-L38)：核對測試接點的確認規則、三種反模式與紅綠循環的限制。
- [`tdd/tests.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/tests.md#L1-L77)：用結帳與加總的範例，對照好測試與壞測試的寫法差在哪裡。
- [`diagnosing-bugs`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md#L18-L138)：查看十種建立回饋迴路的方法，以及每個階段的完成條件。
- [`prototype`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/SKILL.md#L6-L26)：了解邏輯原型與畫面原型怎麼分流，以及原型做完後要保留什麼。
