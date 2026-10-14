---
title: "mattpocock/skills 系列（6）：查資料、做交接、學新東西，都有固定做法"
description: "寫程式之外，還有很多事會拖慢進度：查資料、交接給下一個人、設定只有你能動手的帳號、學一個新主題。本文介紹 research、wizard、handoff、teach 與 writing-for-agents 五個 skill，並沿用按席次計費的例子走一遍。"
date: 2026-10-14 14:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, research, handoff, documentation]
media_subpath: /assets/img/posts/mattpocock-skills-research-handoff/
image:
  path: cover.png
  alt: "封面：一份附出處的研究筆記和一張交接單，代表本文介紹的五個 skill：怎麼讓 AI 查資料、交接工作、帶你設定帳號和學新東西。"
---

前五篇談的都是「把功能做出來」：問清楚需求、寫規格、拆工作單、寫程式、審查與合併。但實際做按席次計費時，還會遇到另一類事情：

- 付款服務的按比例收費規則怎麼算？得有人去查官方文件。
- 原型要在另一個資料夾做，現在這段對話裡談好的東西，要怎麼帶過去？
- 付款服務的金鑰只有你登得進後台去拿，AI 幫不上忙。
- 你自己對「按比例計費」一知半解，想好好學一次。
- 專案給 AI 看的說明文件越寫越長，AI 卻常常沒照著做。

這些事都不是寫程式，卻常常卡住進度。`mattpocock/skills` 用五個 skill 處理它們：`research`、`handoff`、`wizard`、`teach` 和 `writing-for-agents`。

> mattpocock/skills 系列｜第 6 篇
>
> - 上一篇（第 5 篇）：[程式寫完之後，誰來看結構、審修改、解衝突](/posts/mattpocock-skills-design-review-integration/)
>
> 本文資料以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。這五個 skill 在 `1.2.3` 都已存在，到目前最新的 `1.3.1` 也都還在。按席次計費的 skill 呼叫流程依原始指令推演；文中的 wizard 腳本語法檢查則是實際執行結果。
{: .prompt-info }

> GitHub 上的主線在 `1.3.1` 之後，又替其中三個 skill 加了還沒正式發佈的小修正：[`wizard` 的腳本範本](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/wizard/template.sh)修了幾個相容性問題，[`handoff`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/handoff/SKILL.md#L8) 寫明暫存資料夾的找法，[`teach`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/teach/SKILL.md#L110) 要求測驗的正確答案不要老是放在同一個位置。這些修改不影響本文介紹的做法。
{: .prompt-tip }

## 先認識三個詞

| 本文用詞 | 一句話解釋 |
| --- | --- |
| 第一手資料 | 東西的原始出處，例如官方說明書、原始碼、規格書，而不是別人看完寫的心得 |
| 背景助手 | 另外開一個 AI 在旁邊做事，你可以繼續跟原本的 AI 談別的 |
| 對話記憶 | AI 在這一次對話裡記得的所有內容。對話開新的，記憶就清空 |

## 五個 skill 各管什麼

| skill | 做什麼 | 什麼時候用 | AI 會不會自己啟動 |
| --- | --- | --- | --- |
| `research` | 派背景助手去查第一手資料，寫成一份附出處的筆記 | 需要查官方文件、API 規則等事實時 | 會 |
| `handoff` | 把目前的對話整理成一份交接單 | 要換資料夾、換工具或交給同事時 | 不會，要你手動叫它 |
| `wizard` | 寫一支一步一步帶你操作的小程式 | 遇到只有你能做的步驟，例如登入後台拿金鑰 | 會 |
| `teach` | 在一個資料夾裡，分好幾次教你一個新主題 | 想真正學會某件事時 | 不會，要你手動叫它 |
| `writing-for-agents` | 一份「怎麼寫給 AI 看的文件」的參考手冊 | 寫 skill 或專案說明文件 `AGENTS.md` 時 | 會 |

`handoff` 和 `teach` 都[設定成](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L5)[AI 不能自己啟動](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L4)。交接和上課都是你決定要開始的事，AI 不該在聊天聊到一半時突然幫你做。

在 `ask-matt` 的路線圖裡，[`handoff` 被放在「階段交界」](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L61-L69)，其他四個都在[不屬於任何流程的單獨區塊](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L73-L86)，需要時才拿出來用。

## `research`：派一個助手去查原文

`research` 很短，[整份只有三件事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md#L6-L12)：

1. 開一個背景助手去查，你可以繼續做別的。
2. 只查第一手資料，例如官方文件、原始碼、規格書，每個說法都要追到真正的出處，不能引用別人的轉述。
3. 把結果寫成一份 Markdown 筆記（一種用簡單符號排版的純文字檔），每一句都附上出處，存在專案裡習慣放筆記的地方；沒有慣例就自己找個合理的位置，並告訴你放在哪。

為什麼堅持第一手資料？想像你問路，路人說「前面左轉應該就到了」，和你自己打開地圖看，可信度差很多。網路上的教學文章常常是某個版本的寫法，換了版本就不準；官方文件和原始碼才是現在真正的規則。

![左側是一串「聽說」：論壇心得引用部落格、部落格引用另一篇教學，越傳越走樣；右側直接讀官方文件、原始碼和規格書，整理成一份每句都附出處的筆記；底部寫著「每句話都追到原始出處」](research-primary-sources.png){: width="800" height="450" }
_二手文章一層一層轉述，越傳越走樣；第一手資料才是現在的規則。_

查完之後，這份筆記不是終點。[`ask-matt` 說明](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L81)，研究結果要帶進主流程的 `grill-with-docs`，當作討論需求時的材料。查資料是為了幫你思考，不是替你做決定。

## `handoff`：寫一張交接單給下一位

`handoff` 處理的是「換人接手」的情況。這個「人」可以是另一個 AI 對話，也可以是同事。

用醫院交班來比喻。下班的護理師不會把整天的經過從頭講一遍，而是交一張單子：病人現在狀況如何、還有什麼要做、哪些紀錄可以去哪裡查。`handoff` 做的就是這張單子。

它的規則只有[五條](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L8-L16)：

1. 把目前的對話整理成一份交接文件，存在電腦的暫存資料夾，不放進專案裡。
2. 文件裡要有一段「建議使用的 skill」，告訴下一位該先叫哪些 skill。
3. 已經寫在別處的東西不要重抄，例如規格、工作單、commit（把一批修改存成一個版本並附上說明），只要附上路徑或連結。
4. 把敏感資料遮掉，例如密碼、金鑰和個人資料。
5. 你叫它時如果順便說了「下一段要做什麼」，交接單就針對那件事來寫。

第 3 條最重要。交接單要短，才有人會看；重抄一遍規格，不但變長，兩份內容之後還可能對不上。

![左側是一長串對話紀錄，從頭捲到尾都還沒看到重點；右側是一張交接單，只列出「做到哪」、「下一步」、「建議使用的 skill」、「參考連結」四欄，密碼已遮掉；底部寫著「交接單只寫下一位需要的，其餘附上連結」](handoff-note.png){: width="800" height="450" }
_下一位不需要整段對話，只需要一張寫清楚現況和下一步的單子。_

### 什麼時候才需要交接單

`ask-matt` 對它的使用時機[寫得很窄](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L67)：只有在換了一套 AI 工具、換了一個資料夾、交給同事，或是做到一半要分出一件旁支工作時才用。

其他時候有更省事的選擇，例如直接在原對話繼續，或讓工具自動把對話壓縮後接著做。第 4 篇的 `prototype` 就是典型的使用時機：原型放在另一個資料夾，所以[去的時候交接一次，回來時再交接一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L18-L21)，把原型學到的東西帶回原本的討論。

## `wizard`：只有你能做的步驟，讓程式帶你做

有些事 AI 真的做不了：登入付款服務的後台複製金鑰、在雲端主機的網站上按幾個按鈕、把密碼存進 GitHub 的加密設定裡。這些步驟每次都要重新跟 AI 解釋一遍，很煩。

`wizard` 的做法是[寫一支互動式的小程式](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L8)，像家具組裝說明書那樣一步一步帶你：它會替你打開網頁、告訴你按哪裡、複製什麼，等你貼上之後，自動把值存到該放的地方，每一步都讓你確認，也顯示還剩幾步。

這支程式是 bash 腳本，也就是一串在終端機裡依序執行的指令。外觀和互動的部分已經[寫好在範本 `template.sh` 裡](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L10)，包括進度顯示、隱藏輸入密碼、重複執行不會寫壞設定檔等等。AI 只要負責規劃步驟、填入每一步的內容，範本上半部的共用程式碼一律不准改。

![左側是一個終端機畫面，顯示「步驟 1/2：付款服務金鑰」，下方提示已打開網頁、請貼上金鑰，輸入的內容顯示成圓點；右側列出結果：金鑰寫入 .env、需要的金鑰存進 GitHub 加密設定；底部寫著「只有你能做的事，讓程式一步一步帶你做」](wizard-human-steps.png){: width="800" height="450" }
_AI 寫好步驟，你只要照著畫面操作、貼上數值。_

它分四步：

1. **[先列出所有手動步驟](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L16-L25)。** AI 先讀專案的設定檔，例如 `.env`（存放金鑰等設定值的檔案）和自動化流程的設定，找出需要哪些值，再把步驟清單給你確認。每個值都要知道從哪裡拿、要存到哪裡、是不是機密。
2. **[寫清楚每一步的路線](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L27-L31)。** 例如「後台 → 開發者 → API 金鑰 → 顯示測試金鑰 → 複製」。AI 不確定現在的畫面長怎樣時，要問你或去查文件，[不准自己編出可能不存在的步驟](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L29)。
3. **[寫成腳本](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L33-L37)。** 每一步只做一件事；機密用隱藏輸入；做不能回頭的動作前，一定要先問你。
4. **[檢查並交給你](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L39-L44)。** AI 做語法檢查，但[不會自己從頭跑一遍](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L43)，因為腳本會打開瀏覽器、等人輸入。它改用逐行對照的方式確認每個值都有收集、都存到對的地方。

腳本[預設只用一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L12)，做完就刪。只有在你希望以後的人也能照著跑時，才放進專案，並在 README 加上說明，讓下一個人直接跑腳本，不必再問 AI。

## `teach`：把 AI 當成家教，分好幾次學

`teach` 和其他 skill 不同，它不是幫你做事，而是[教你學會一件事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L8)，而且預設要上好幾次課。

所以它會把目前的資料夾當成你的學習檔案夾，[把學習進度存成幾種檔案](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L12-L20)：

| 檔案 | 像什麼 | 放什麼 |
| --- | --- | --- |
| `MISSION.md` | 學習目標卡 | 你為什麼想學，學會之後能做到什麼 |
| `RESOURCES.md` | 參考書單 | 值得信任的資料來源，以及可以請教別人的社群 |
| `lessons/` | 一堂一堂的講義 | 每堂課一個網頁檔，只教一件小事 |
| `reference/` | 小抄 | 從課程濃縮出來、方便日後查的重點 |
| `learning-records/` | 學習日誌 | 你已經學會什麼，用來決定下一堂教什麼 |

### 先問你為什麼要學

[第一件事是搞清楚你學這個的目的](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L71-L79)。目的不清楚，課程就會變得空泛，AI 也無從判斷下一步該教什麼。目標要具體，[「十月前跑完半馬」比「變健康」好](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/MISSION-FORMAT.md#L28)。

### 每堂課只教一點點，而且要動手

[每堂課都要短](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L53)，因為人一次能記住的東西很少。每堂課要讓你得到一個看得見的小成果，難度則要[剛好比你現在的程度高一點](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L83-L89)，太簡單學不到東西，太難又會放棄。

它也很在意「真的記住」。[原文把記憶分成兩種](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L36-L45)：當下想得起來，和過一陣子還記得。當下想得起來容易讓人以為自己學會了，所以它會用「不看資料自己回想」、「隔幾天再練一次」這類方法，讓你記得更久。

另外兩個細節：知識一律[從可信的資料來，不靠 AI 自己的印象](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L30)；碰到需要實戰經驗的問題，它會[推薦你去相關社群問真正做過的人](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L116-L120)。

## `writing-for-agents`：寫給 AI 看的文件，也有寫法

前面那些 skill 本身，以及專案裡的 `AGENTS.md`（放在專案裡、告訴 AI 這個專案該怎麼做事的說明文件），都是「寫給 AI 看的文件」。`writing-for-agents` 就是寫這類文件的參考手冊，目的是讓 AI [每次都用同一套方式做事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L6)。

整份手冊很長，我挑出最實用的六個重點：

1. **指引句的寫法，決定 AI 會不會去讀那份文件。** 例如 `AGENTS.md` 裡寫「改計費功能前，先讀 `docs/billing.md`」。[原文說](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L12)，AI 有沒有去讀，看的是這句話寫得夠不夠清楚，而不是那份文件寫得多好。
2. **一直放著的文字都有成本。** `AGENTS.md` 的每一行，AI 每次對話都要讀過一遍。[原文把成本分成兩種](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L20-L27)：AI 要一直記著的字，和人要自己記得有哪些文件。
3. **常用的放前面，少用的另外放。** 就像工具箱，常用的螺絲起子放上層，少用的工具收進下層抽屜，再貼張標籤寫明裡面有什麼。[每次都會用到的寫在主文件，只有某些情況才用到的，搬到另一份檔案](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L39)。
4. **每一步都要寫清楚「怎樣算做完」。** [「理解需求」太模糊，AI 很容易提早喊完成](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L47-L52)；「每個改到的資料表都列出來」就清楚得多。
5. **說要做什麼，不要只說不要做什麼。** 跟人說「不要想大象」，對方腦中只剩大象。[原文建議直接寫出想要的行為](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L74)，例如寫「註解只寫一行」，而不是「不要寫長註解」。
6. **刪掉 AI 本來就會做的句子。** [一句話如果拿掉之後，AI 的行為沒有改變，它就只是佔位置](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L81)。

如果寫的是 skill，另一份 [`SKILL-MECHANICS.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL-MECHANICS.md#L5-L14) 說明怎麼決定「讓 AI 能自己啟動」還是「只能你手動叫」：前者要一直佔用 AI 的對話記憶，後者則要你自己記得它存在。這也解釋了為什麼 `handoff` 和 `teach` 被設成只能手動啟動。

## 哪些地方要花你的時間

| 環節 | 由誰負責 | 要做什麼 |
| --- | --- | --- |
| `research` 的問題 | 你 | 把要查的問題問清楚；查完後讀筆記，確認出處真的支持那句話 |
| `handoff` 的時機 | 你 | 判斷是不是真的要換地方或換人；不需要時就留在原對話 |
| 讀交接單 | 下一位 | 先照「建議使用的 skill」開始，再依連結去讀原始文件 |
| `wizard` 的步驟清單 | 你 | 確認步驟順序和每個值該存到哪裡 |
| 跑 `wizard` | 你 | 照畫面登入後台、複製貼上；不能回頭的動作要再確認一次 |
| `teach` 的學習目標 | 你 | 說清楚為什麼想學、學會後要做到什麼 |
| 上課 | 你 | 每堂課都要動手練習、做測驗，看不懂就直接問 |
| 改 `AGENTS.md` | 你和 AI | 每加一行都問自己：拿掉它，AI 的行為會不會變？ |

最花你時間的是 `teach`，因為學習本來就得自己花力氣，這部分 AI 替代不了。其次是 `wizard`，但它省下的是「每次都要重新跟 AI 解釋一遍」的時間，跑過一次就值得。

## 什麼情況用哪一個

| 你遇到的狀況 | 用哪個 | 什麼時候不適合 |
| --- | --- | --- |
| 需要查官方文件或原始碼確認某條規則 | `research` | 答案就在專案裡、讀一個檔案就知道時，直接讀就好 |
| 要換資料夾、換 AI 工具，或把工作交給同事 | `handoff` | 還在同一個地方繼續做時，留在原對話或讓工具自動壓縮對話 |
| 卡在只有你能操作的步驟 | `wizard` | AI 自己就做得到的事，[直接讓它做](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L3) |
| 想真正學會一個主題 | `teach` | 只是想知道一個答案時，直接問就好 |
| 寫 skill，或整理 `AGENTS.md` | `writing-for-agents` | 寫給人看的文件，例如部落格文章，用一般的寫作原則 |

## 模擬情境：替按席次計費查資料、交接、設定金鑰

以下的 skill 呼叫沒有實際執行，流程依 `1.2.3` 版的原始指令推演。其中的 wizard 腳本是用 `1.2.3` 版的範本，為本文寫的最小範例；我只用 bash 5.2.37 做了語法檢查，沒有實際執行，這也是 `wizard` 自己的規定。

### 先查清楚按比例收費的規則

第 3 篇用 `to-questionnaire` 問過財務負責人：月中新增席次後，要不要按剩餘天數比例收費？假設財務選了按比例收費，接下來就要確認付款服務實際怎麼算。你決定先查官方文件：

```text
$research 付款服務在訂閱中途增加數量時，怎麼按比例計算費用？只用官方文件與 API 參考。
```
{: .nolineno }

背景助手開始查的同時，你繼續和原本的 AI 談別的工作單。查完之後，專案裡多了一份筆記，每一句規則都附上官方文件的連結（推演）。你把這份筆記帶進 `grill-with-docs`，決定按席次計費要不要跟著付款服務的規則走。

### 交接到原型的資料夾

月中加席次的畫面怎麼呈現，你想先做個原型試試。原型要放在另一個資料夾，所以你叫了交接：

```text
$handoff 下一段要用 prototype 試做「月中加席次」的確認畫面
```
{: .nolineno }

交接單可能長這樣（推演）：

- **做到哪**：三張工作單都完成，計費規則已查好。
- **下一步**：做月中加席次的確認畫面原型，比較兩種寫法。
- **建議使用的 skill**：`prototype`。
- **參考連結**：規格、第三張工作單、剛才的研究筆記，都只附路徑，不重抄內容。

你在原型資料夾開一個新對話，把這張交接單給它，就能直接接手。

### 用 wizard 設定付款服務的金鑰

要接上真正的付款服務，得先拿到金鑰，這只有你能登入後台去拿。AI 讀了 `.env.example` 和自動化流程的設定後，列出兩個步驟給你確認：拿 API 金鑰，以及拿「每席價格」的 ID。確認後，它照範本寫出腳本，步驟部分大致像這樣：

```bash
TOTAL_STAGES=2

banner "Per-seat billing setup"

stage "Stripe: API keys"
say "We'll grab your Stripe test keys for local dev + CI."
open_url "https://dashboard.stripe.com/test/apikeys"
step "Copy the Publishable key (starts pk_test_)."
ask STRIPE_PUBLISHABLE_KEY "Paste the publishable key:"
step "Click 'Reveal test key' on the Secret key row, then copy it."
ask_secret STRIPE_SECRET_KEY "Paste the secret key:"
write_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
write_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_secret STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"

stage "Stripe: per-seat price"
open_url "https://dashboard.stripe.com/test/products"
step "Open the seat product and copy its Price ID (starts price_)."
ask STRIPE_SEAT_PRICE_ID "Paste the price ID:"
write_env STRIPE_SEAT_PRICE_ID "$STRIPE_SEAT_PRICE_ID"

finish
```
{: file="setup-billing.sh（步驟部分）" }

第一步照抄了範本裡的 Stripe 範例，第二步是為按席次計費加的。`ask_secret` 是隱藏輸入，你貼上的金鑰不會顯示在畫面上；`set_secret` 只用在自動化流程真正需要的那一個金鑰上。

接著做語法檢查：

```bash
bash -n setup-billing.sh
```
{: .nolineno }

這條指令沒有輸出、結束碼是 0，代表語法沒問題。我沒有實際跑這支腳本，因為它會打開瀏覽器、等人貼上金鑰，`wizard` 也[要求 AI 不要自己從頭跑](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L43)。剩下的就是你在終端機執行 `./setup-billing.sh`，照畫面一步一步做。

## 我認為最該先用的是 `handoff` 的第 3 條

這一節是我自己的看法，原始資料沒有直接這樣說。

五個 skill 裡，最容易被小看的是 `handoff`，它只有五條規則。但我覺得第 3 條「已經寫在別處的東西不要重抄，只附連結」，不只適用於交接單。

`research` 的筆記附出處、`wizard` 把值存進 `.env` 而不是寫在對話裡、`writing-for-agents` 要求同一件事只寫在一個地方，背後都是同一個想法：讓每件事只有一份正本，其他地方都指向它。前五篇留下的規格、工作單和 `CONTEXT.md`，就是這些正本。

所以我會先從交接單開始練習：交接前先問自己，這段內容是不是已經寫在某份文件裡了？如果是，就只附連結。

不過，這個習慣有個前提：正本得真的存在，而且有人維護。如果專案從來不寫規格，交接單只附連結就等於什麼都沒交代，這時還是得把重點寫進交接單裡。

## 小結

寫程式之外的事，也可以有固定做法：

- 要查事實，用 `research` 派助手去讀第一手資料，帶回附出處的筆記。
- 要換地方或換人，用 `handoff` 寫一張只列重點、其他附連結的交接單。
- 卡在只有你能做的步驟，用 `wizard` 讓程式一步一步帶你做。
- 想真正學會一件事，用 `teach` 分好幾次、邊學邊練。
- 寫給 AI 看的文件，照 `writing-for-agents` 的原則：寫清楚、放對位置、刪掉沒用的句子。

回到按席次計費，下一步是在終端機跑一次 `./setup-billing.sh`，把付款服務的金鑰設定好，再到原型資料夾，用交接單開始試做月中加席次的畫面。

## 延伸閱讀

- [`research`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md#L1-L12)：只有三步的完整指令。
- [`handoff`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L1-L16)：交接單的五條規則。
- [`wizard`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L1-L44)：四個步驟和每一步的完成條件；[`template.sh`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/template.sh#L182-L204) 則是腳本範本，最後一段是 Stripe 的範例步驟。
- [`teach`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L1-L140)：學習檔案夾的結構，以及課程該怎麼設計；[`MISSION-FORMAT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/MISSION-FORMAT.md#L1-L31) 是學習目標卡的格式。
- [`writing-for-agents`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L1-L81)：寫給 AI 看的文件的完整原則；[`SKILL-MECHANICS.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL-MECHANICS.md#L1-L22) 說明 skill 的啟動方式怎麼選。
