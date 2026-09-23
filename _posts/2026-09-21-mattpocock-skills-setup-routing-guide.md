---
title: "mattpocock/skills 系列（1）：先設定專案規則，再用 ask-matt 找下一步"
description: "第一次使用 mattpocock/skills，不必先記住 25 個 skill。本文說明安裝方式、setup-matt-pocock-skills 會替專案留下哪些設定，以及如何用 ask-matt 找出下一步。"
date: 2026-09-21 11:16:29 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, mattpocock, workflow]
media_subpath: /assets/img/posts/mattpocock-skills-setup-routing-guide/
image:
  path: cover.png
---

你準備替既有的訂閱服務加入按席次計費，卻不確定該先釐清需求、寫規格、補測試，還是直接動手寫程式。你聽說 mattpocock/skills 能讓 AI 程式助理把這類工作做得更有條理，打開清單卻看到 25 個 skill 名稱。難道要先把每一個都搞懂才能開始？

先說明幾個名詞。AI 程式助理指的是 Claude Code、Codex 這類能讀寫專案檔案、替你寫程式的 AI 工具。skill 則可以理解成一份「告訴 AI 程式助理如何完成特定工作」的操作說明，例如怎麼訪談需求，或怎麼把規格拆成一項項工作。`mattpocock/skills` 是 Matt Pocock 公開的一整組 skill。

答案是不必全部看懂。第一次使用只需要兩步：先用 `setup-matt-pocock-skills` 把專案的工作規則記下來，再用 `ask-matt` 依你遇到的問題，建議下一個該用的 skill。

不過，`ask-matt` 比較像服務台，不是會自動跑完整套流程的總管。它只會告訴你下一步該用哪個 skill，實際啟動仍要由你來做。

> mattpocock/skills 系列｜第 1 篇
>
> - 下一篇（第 2 篇）：[把模糊需求問清楚，留下共用詞彙](/posts/mattpocock-skills-requirements-shared-language/)
>
> 本文以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。官方外掛的 [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json#L21-L47)收錄 25 個 skill；程式庫裡另有 9 個仍在試驗中、4 個目前不主動推廣的項目，分別列在 [`in-progress/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/README.md#L1-L18)和 [`misc/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/misc/README.md#L1-L8)。本系列只討論官方外掛收錄的 25 個。
{: .prompt-info }

## 先分清楚安裝與啟動

![六格圖解說明 mattpocock/skills：選擇 Claude Code 外掛或 skills.sh，執行 setup 建立專案設定，再由 ask-matt 建議下一個 skill。功能需求依序經過需求釐清、撰寫規格、拆分工作與實作](ask-matt-router-tutorial.png){: width="800" height="450" }
_第一次使用的完整路徑：選擇安裝方式、執行 setup，再由 ask-matt 建議下一個 skill。_

安裝與啟動是兩個不同的問題。安裝方式決定 skill 檔案放在哪裡、由誰負責更新；啟動方式則決定誰能叫某個 skill 開始工作。

### 選一種安裝方式

`mattpocock/skills` 以 [`.agents/install-block.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/install-block.md#L5-L57)作為安裝說明的唯一依據。依你使用的工具選擇：

| 使用情況                           | 安裝方式  | 之後怎麼維護                       |
| ---------------------------------- | --------- | ---------------------------------- |
| 使用 Claude Code，不打算修改內容   | 官方外掛  | 自動更新，內容不能修改             |
| 使用 Claude Code，想自行修改內容   | skills.sh | 檔案複製進專案，由你自行修改與更新 |
| 使用 Codex 或其他支援 skill 的工具 | skills.sh | 檔案複製進專案，由你自行修改與更新 |

Claude Code 是 Anthropic 推出的 AI 程式助理，Codex 則來自 OpenAI。Claude Code 的官方外掛安裝指令是：

```bash
claude plugins install mattpocock-skills
```
{: .nolineno }

也可以在 Claude Code 裡直接輸入 `/plugin install mattpocock-skills`。

Codex 或其他工具則使用 skills.sh 這個安裝工具：

```bash
npx skills@latest add mattpocock/skills
```
{: .nolineno }

skills.sh 會讓你勾選要安裝哪些 skill，以及要裝給哪些 AI 程式助理使用。一定要選入 `setup-matt-pocock-skills`；若想照本文使用 `ask-matt`，也要選入它。之後 `ask-matt` 建議的其他 skill，同樣要先安裝才能使用。

兩種方式擇一即可，同時使用會讓每個 skill 各出現兩份。使用 skills.sh 時，更新單一 skill 的指令是：

```bash
npx skills@latest update <name>
```
{: .nolineno }

### 看懂誰能啟動 skill

`mattpocock/skills` 依「誰能啟動」把 skill 分成兩類：

| 原文名稱      | 誰能啟動                              |
| ------------- | ------------------------------------- |
| user-invoked  | 只能由人輸入名稱啟動                  |
| model-invoked | 人可以啟動，AI 也能依工作內容自行採用 |

只能由人啟動的 skill，可以再叫用 AI 能自行採用的 skill，但不能叫用另一個只能由人啟動的 skill。完整限制記在[啟動方式規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)。

`setup-matt-pocock-skills` 與 `ask-matt` 都只能由人啟動，你必須主動輸入名稱。Claude Code 和 Codex 的輸入方式不同：

| 工具        | 輸入範例                    |
| ----------- | --------------------------- |
| Claude Code | `/setup-matt-pocock-skills` |
| Codex       | `$setup-matt-pocock-skills` |

在 Codex 中，可以先輸入 `$` 再從清單選取 skill，也可以直接輸入 `$skill-name`。這項語法可在 [OpenAI 的 Codex skills 文件](https://developers.openai.com/codex/skills/)核對。其他 AI 程式助理請依各自的 skill 選單或輸入方式操作。

這項限制也說明了為什麼 `ask-matt` 只能提出建議：它推薦的 `grill-with-docs` 同樣只能由人啟動，所以你得自己輸入。它也不會自動一路往下執行 `to-spec`、`to-tickets` 和 `implement`。

## setup 會替專案留下哪些設定

`mattpocock/skills` 裡偏重軟體開發的 skill（原文歸在 engineering 類）需要知道專案的一些基本資訊。因此，每個專案在第一次使用它們之前，要先執行一次 `setup-matt-pocock-skills`。它不是固定不變的安裝程式，而是先檢查、再詢問，最後才寫入檔案的流程。

它會先查看專案現況：程式碼放在哪個平台（例如 GitHub）、專案裡是否已有給 AI 看的說明檔（`AGENTS.md` 或 `CLAUDE.md`）、詞彙表與決策紀錄、先前留下的設定檔，以及專案是否由多個子專案組成（原文稱 monorepo）。其中，詞彙表（`CONTEXT.md`）記錄專案專用名詞的定義，決策紀錄（ADR）則記錄重要技術選擇的理由，下一篇會詳細介紹。

查看完畢後，它會依序確認三件事：

- **工作記錄在哪裡。** 原文稱為 issue tracker，本系列稱為「工作追蹤工具」，也就是團隊記錄待辦事項的地方。程式碼放在 GitHub 時，預設建議 GitHub Issues；放在 GitLab 時，則建議 GitLab。你也可以直接用專案資料夾裡的 Markdown 檔案記錄。若使用 Jira、Linear 等其他工具，則由你用一段文字說明操作方式。
- **是否沿用預設的分類標籤。** 這些標籤是給整理外部回報的 `triage` 使用的，所以只有安裝了 `triage` 才會詢問。
- **詞彙表與決策紀錄放在哪裡。** 一般專案集中放一份即可；只有發現專案由多個子專案組成時，才會詢問是否每個子專案各放一份。

確認後，它會修改或建立以下檔案：

| 位置                           | 寫入內容                                   | 條件                                     |
| ------------------------------ | ------------------------------------------ | ---------------------------------------- |
| `CLAUDE.md` 或 `AGENTS.md`     | `## Agent skills` 段落，指向下列各份設定檔 | 有 `CLAUDE.md` 就改它，否則改 `AGENTS.md` |
| `docs/agents/issue-tracker.md` | 工作追蹤工具的位置與操作方式               | 一定會建立或更新                         |
| `docs/agents/domain.md`        | 詞彙表與決策紀錄的存放方式                 | 一定會建立或更新                         |
| `docs/agents/triage-labels.md` | 分類標籤的名稱                             | 只在安裝了 `triage` 時建立或更新         |

如果專案裡兩份說明檔都沒有，它會先問你要建立哪一份，不會自行決定。如果檔案裡已經有 `## Agent skills` 段落，它會直接更新該段落，不會重複新增。

setup 只把標籤名稱寫進 `docs/agents/triage-labels.md`，原始流程裡沒有到 GitHub 或 GitLab 建立標籤的步驟。開始分類之前，最好先確認工作追蹤工具裡的標籤名稱與設定檔一致。

寫入前，它必須先展示 `## Agent skills` 段落與各份設定檔的草稿，讓你修改和確認。完成後，這些檔案就是一般的專案文件，之後可以直接編輯。只有想更換工作追蹤工具或從頭設定時，才需要再執行一次。

## ask-matt 如何選下一步

`ask-matt` 不要求你先記住所有 skill。你只要描述目前的狀況，它就會建議從哪個 skill 開始。常見的起點如下：

| 目前狀況                                     | 建議起點          |
| -------------------------------------------- | ----------------- |
| 在專案裡，想把一個還不完整的想法談清楚       | `grill-with-docs` |
| 沒有專案資料夾，只想把想法談清楚             | `grill-me`        |
| 要整理別人送進來的問題回報與需求             | `triage`          |
| 遇到難以重現、時有時無，或最近才出現的錯誤   | `diagnosing-bugs` |
| 工作範圍模糊，而且一次對話談不完             | `wayfinder`       |

一般功能開發的主線，是先用 `grill-with-docs` 透過訪談釐清需求。如果某個問題得先做出能實際操作的東西才答得出來，例如畫面該長什麼樣子，流程會暫時岔出去：先用 `handoff` 把目前的進度寫成交接文件，在新的對話裡用 `prototype` 做一個用完即丟的試作品，得到答案後再用 `handoff` 把結果帶回原本的討論。

如果確定這項工作要分成好幾次對話才做得完，接著用 `to-spec` 整理規格、用 `to-tickets` 把規格切成一張張工作單，最後每張工作單各開一次新的對話，用 `implement` 實作。`implement` 會在內部用 `tdd`（先寫測試、再寫程式的開發方式）完成功能，並在提交修改前用 `code-review` 檢查一遍。

從需求訪談到 `to-tickets`，都應該留在同一段對話裡，讓後面的步驟接續前面的討論。工作單建立好之後，每張工作單才各自開新的對話；工作單已寫明所需資訊，不必依賴先前的對話內容。完整規則位於 [`ask-matt/SKILL.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)。

![左側進度條顯示正在背 25 個 skills，右側 ask-matt 詢問目前卡在哪一步](ask-matt-router-meme.png){: width="800" height="450" }
_記憶測驗取消，工作開始。_

## 模擬情境：替既有服務加入按席次計費

這一節依 `1.2.3` 版的原始規則推演，不是實測紀錄。假設專案由幾個子專案組成，程式碼放在 GitHub，工作也用 GitHub Issues 追蹤。

以 Codex 為例，先用 skills.sh 安裝需要的 skill，這裡假設後文提到的 skill 都已選入。接著輸入：

```text
$setup-matt-pocock-skills
```

setup 發現程式碼放在 GitHub，會建議沿用 GitHub Issues。它也會從資料夾結構看出專案由多個子專案組成，因此詢問詞彙表要共用一份，還是每個子專案各放一份。

如果也安裝了 `triage`，setup 還會詢問是否沿用五個預設標籤：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

這五個標籤依序代表「等待評估」、「等待補充資訊」、「可以交給 AI 處理」、「需要由人處理」與「決定不處理」。如果團隊的工作追蹤工具早已使用別的標籤名稱，也可以改成對應的名稱，避免出現重複的標籤。

你確認這些選擇後，AI 程式助理會先展示要寫入的內容。你同意後，它才修改 `CLAUDE.md` 或 `AGENTS.md`，並在 `docs/agents/` 建立設定檔。

設定完成後，再描述目前卡住的工作：

```text
$ask-matt 需要替既有訂閱系統加入按席次計費。目前只有一段需求描述；需求應該能在一次對話中談清楚，但實作會分好幾次進行。
```

依照 `ask-matt` 的規則，它會建議先用 `grill-with-docs`，把價格怎麼算、席次何時開始與停止使用、帳單週期，以及舊客戶如何轉換等問題談清楚。流程不會自動往下跑，你要自己輸入：

```text
$grill-with-docs
```

需求談清楚後，繼續在同一段對話裡依序輸入：

```text
$to-spec
$to-tickets
```

`to-tickets` 會把規格切成較小的工作單，並標明哪些工作單要先完成、哪些要等前面的做完才能開始。

工作單建立好之後，每張工作單各開一次新的對話，再輸入：

```text
$implement <工作單網址或編號>
```

這套流程只負責安排工作順序，不會替團隊決定價格規則、席次怎麼計算，或舊資料怎麼轉換。這些產品與技術上的選擇，仍要在釐清需求時由團隊確認。

## 第一次使用時怎麼選

如果打算採用這套流程，先選一種安裝方式，再替專案執行一次 setup。之後若不確定某項工作該怎麼進行，再問 `ask-matt`。

如果你已經知道下一個 skill 是什麼，可以跳過 `ask-matt`，直接啟動它。不過，需要讀取工作追蹤工具或詞彙表設定的 skill，仍要先完成 setup。若只是一次性、不在專案資料夾裡的工作，就不必為了使用單一 skill 而建立整套專案設定。

這篇文章核對的是 `1.2.3` 版的設計與操作方式，不代表這套流程一定能縮短開發時間。它直接帶來的好處，是把專案慣例寫成文件，並在你不確定下一步時建議合適的 skill。下一篇會接著討論如何把需求問清楚，並建立團隊共用的詞彙。

## 延伸閱讀

- [`README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L25-L80)：核對官方安裝方式與第一次設定的說明。
- [啟動方式規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)：了解哪些 skill 只能由人啟動。
- [`setup-matt-pocock-skills`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md#L9-L116)：查看它讀取與寫入哪些檔案。
- [`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)：查看不同狀況各自適合哪個下一步。
- [OpenAI Codex skills](https://developers.openai.com/codex/skills/)：核對 Codex 的 skill 選取與啟動方式。
