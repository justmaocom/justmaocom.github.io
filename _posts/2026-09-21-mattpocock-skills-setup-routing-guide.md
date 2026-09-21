---
title: "mattpocock/skills 入門：先設定專案規則，再用 ask-matt 找下一步"
description: "從安裝與初始設定開始，說明 setup-matt-pocock-skills 與 ask-matt 的分工，並以按席次計費需求示範第一次工作流程。"
date: 2026-09-21 11:16:29 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, mattpocock, workflow]
media_subpath: /assets/img/posts/mattpocock-skills-setup-routing-guide/
image:
  path: cover.png
---

你準備替既有服務加入按席次計費，卻不知道該先釐清需求、寫規格、補測試，還是直接實作。打開 mattpocock/skills 的清單，又看到 25 個名稱。難道要先理解每個 skill 才能開始？

不用。這套工具把第一次使用分成兩個入口。`setup-matt-pocock-skills` 先記錄專案的工作規則，`ask-matt` 再根據你遇到的問題建議下一個 skill。

不過，`ask-matt` 只是路由器，不是自動執行整套流程的總管。它告訴你下一步該呼叫什麼，仍要由你啟動該 skill。

> 本文以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)為準。官方外掛的 [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json#L21-L47) 收錄 25 個 skills；程式庫另外還有 9 個試驗中項目與 4 個目前不主動推廣的工具，分別列在 [`in-progress/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/README.md#L1-L18) 和 [`misc/README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/misc/README.md#L1-L8)。本文與後續系列只討論官方外掛收錄的 25 個。
{: .prompt-info }

## 先分清楚安裝與呼叫

![六格圖解說明 mattpocock/skills：選擇 Claude Code 外掛或 skills.sh，執行 setup 建立專案設定，再由 ask-matt 建議下一個 skill。功能需求依序經過需求釐清、撰寫規格、拆分工作與實作](ask-matt-router-tutorial.png){: width="800" height="450" }
_第一次使用的完整路徑：選擇安裝方式、執行 setup，再由 ask-matt 建議下一個 skill。_

安裝方式決定 skill 檔案由誰維護，呼叫方式則決定誰能啟動某個 skill。這是兩個不同問題。

### 選一種安裝方式

專案把 [`.agents/install-block.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/install-block.md#L5-L57) 當成安裝說明的唯一來源。選擇方式如下：

| 使用情況                       | 安裝方式       | 後續維護方式                   |
| ------------------------------ | -------------- | ------------------------------ |
| Claude Code，不修改 skill 內容 | 官方外掛       | 自動接收更新，內容唯讀         |
| Claude Code，需要自行修改內容  | skills.sh      | 檔案放進專案，自行修改與更新   |
| Codex 或其他相容工具           | skills.sh      | 檔案放進專案，自行修改與更新   |

Claude Code 的官方外掛安裝指令是：

```bash
claude plugins install mattpocock-skills
```
{: .nolineno }

Codex 或其他相容工具使用 skills.sh：

```bash
npx skills@latest add mattpocock/skills
```
{: .nolineno }

skills.sh 會讓你選擇要安裝哪些 skills，以及要提供給哪些 coding agents。若只想使用本文的兩個入口，至少選入 `setup-matt-pocock-skills` 和 `ask-matt`。採納 `ask-matt` 建議後，後續要呼叫的 skills 也必須已經安裝。

兩種安裝方式不要同時使用，否則每個 skill 會出現兩份。使用 skills.sh 時，更新單一 skill 的指令是：

```bash
npx skills@latest update <name>
```
{: .nolineno }

### 看懂誰能啟動 skill

專案依啟動者把 skills 分成兩類：

| 原始名稱      | 誰能啟動                              |
| ------------- | ------------------------------------- |
| user-invoked  | 只能由人明確指定                      |
| model-invoked | 人可以指定，AI 也能依工作內容自行採用 |

第一類 skill 可以呼叫第二類，卻不能呼叫另一個第一類 skill。完整限制記在[呼叫方式規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)。

`setup-matt-pocock-skills` 與 `ask-matt` 都是 user-invoked，你必須主動點名。兩套工具的寫法不同：

| 工具        | 呼叫範例                    |
| ----------- | --------------------------- |
| Claude Code | `/setup-matt-pocock-skills` |
| Codex       | `$setup-matt-pocock-skills` |

Codex 可以輸入 `$` 從清單選取 skill，也可以直接輸入 `$skill-name`。這項語法可在 [OpenAI 的 Codex skills 文件](https://developers.openai.com/codex/skills/)核對。其他 coding agent 請依各自的 skill 選單或呼叫語法操作。

這項限制也代表 `ask-matt` 只能提出建議。例如它推薦 `grill-with-docs` 後，你仍要另行呼叫該 skill。它不會自動一路執行 `to-spec`、`to-tickets` 和 `implement`。

## setup 會替專案留下哪些設定

第一次使用其他 engineering skills 前，每個專案要先執行一次 `setup-matt-pocock-skills`。這不是固定腳本，而是一段會先檢查、再詢問、最後才寫入檔案的流程。

它會查看 Git remote、既有的 `AGENTS.md` 或 `CLAUDE.md`、名詞文件、ADR、`docs/agents/` 與 monorepo 結構，再確認三件事：

- 工作追蹤在哪裡。GitHub 是預設選項，也支援 GitLab、本機 Markdown，以及由你描述操作方式的 Jira、Linear 等其他工具。
- 是否需要設定 triage 標籤。只有已安裝 `triage` 時才會詢問。
- 名詞與 ADR 放在哪裡。一般專案直接採單一位置；偵測到 monorepo 跡象時，才會詢問是否按 context 拆分。

確認後，它預計修改或建立以下檔案：

| 位置                           | 寫入內容                     | 條件                                          |
| ------------------------------ | ---------------------------- | --------------------------------------------- |
| `CLAUDE.md` 或 `AGENTS.md`     | `## Agent skills` 區塊       | 有 `CLAUDE.md` 就修改它，否則修改 `AGENTS.md` |
| `docs/agents/issue-tracker.md` | 工作追蹤工具的位置與操作方式 | 一定會建立或更新                              |
| `docs/agents/domain.md`        | 名詞與 ADR 的保存方式        | 一定會建立或更新                              |
| `docs/agents/triage-labels.md` | 問題分類使用的標籤           | 只在安裝了 `triage` 時建立或更新              |

若兩份根目錄指引檔都不存在，它會先問你要建立哪一份，不會自行選擇。若檔案內已有 `## Agent skills`，它會更新原區塊，不會再加一份。

setup 只把 triage 標籤名稱寫進 `docs/agents/triage-labels.md`。原始流程沒有在 GitHub 或 GitLab 建立標籤的步驟，使用前仍要確認 issue tracker 裡已有對應標籤。

寫入前，skill 必須展示 `## Agent skills` 區塊與各文件草稿，讓你修改和批准。完成後，這些檔案仍是一般的專案文件。你可以直接編輯，不必每次重新執行 setup；只有想更換 issue tracker 或重新設定時才需要再跑一次。

## ask-matt 如何選下一步

`ask-matt` 不要求你先記住所有 skill 名稱。你只要描述目前的工作狀態，它就會建議從哪個 skill 開始。

常見起點如下：

| 目前狀況                               | 建議起點          |
| -------------------------------------- | ----------------- |
| 在專案內釐清一個還不完整的想法         | `grill-with-docs` |
| 沒有 working directory，只想釐清想法   | `grill-me`        |
| 外部回報的錯誤或需求堆在 issue tracker | `triage`          |
| 難以重現、間歇發生或近期才出現的錯誤   | `diagnosing-bugs` |
| 大到無法在一個工作階段釐清的模糊專案   | `wayfinder`       |

一般功能開發的主要流程是先用 `grill-with-docs` 釐清需求。若問題必須靠可執行程式或畫面才能回答，流程會用 `handoff` 暫時轉去做 `prototype`，取得答案後再回到原本的需求討論。

確定是跨多個工作階段的開發後，再用 `to-spec` 整理規格、用 `to-tickets` 拆工作，最後為每張 ticket 開新的工作階段執行 `implement`。`implement` 會在內部使用 `tdd` 完成功能，再以 `code-review` 檢查變更。

從需求訪談到 `to-tickets` 應留在同一個 context，讓後一步保留前面的討論。tickets 建立完成後，每張 ticket 才各自開新的 context。完整選擇規則位於 [`ask-matt/SKILL.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)。

![左側進度條顯示正在背 25 個 skills，右側 ask-matt 詢問目前卡在哪一步](ask-matt-router-meme.png){: width="800" height="450" }
_記憶測驗取消，工作開始。_

## 模擬情境：替既有服務加入按席次計費

這一節依 `1.2.3` 版的原始規則推演，不是實測紀錄。假設專案包含數個套件，程式碼放在 GitHub，工作也用 GitHub Issues 追蹤。

使用 Codex 時，先透過 skills.sh 安裝。這個情境假設已選入後文提到的所有 skills。完成後輸入：

```text
$setup-matt-pocock-skills
```

setup 看到 GitHub remote 後，會建議繼續使用 GitHub Issues。它也會從專案結構判斷這是 monorepo，再詢問名詞文件要共用一份，還是按 context 分開保存。

如果同時安裝了 `triage`，setup 還會詢問是否保留五個預設標籤：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

你確認 issue tracker、標籤和文件位置後，AI 程式助理會先展示待寫入內容。你批准後，它才修改 `CLAUDE.md` 或 `AGENTS.md`，並建立 `docs/agents/` 下的設定文件。

設定完成後，再描述目前卡住的工作：

```text
$ask-matt 需要替既有訂閱系統加入按席次計費。這項工作會跨數個工作階段，目前只有需求描述。
```

按照路由規則，`ask-matt` 會建議先用 `grill-with-docs` 問清楚計價、席次生命週期、帳單週期與遷移等問題。這時流程不會自動往下跑，你要另行呼叫：

```text
$grill-with-docs
```

需求釐清後，在同一個 context 依序呼叫：

```text
$to-spec
$to-tickets
```

`to-tickets` 會把規格拆成較小的工作，並記錄 ticket 之間的依賴關係，原始文件稱為 `blocking edges`。

等 tickets 建立完成，再為每張 ticket 開新的工作階段並呼叫：

```text
$implement <ticket URL 或編號>
```

這個流程安排只處理工作順序，不會替團隊決定價格規則、席次計算方式或資料遷移策略。這些產品與技術選擇仍要在需求釐清階段確認。

## 第一次使用時怎麼選

如果要採用這套 engineering 流程，先選一種安裝方式，再為專案執行一次 setup。之後遇到不知道該走哪條流程的工作，再問 `ask-matt`。

若你已經知道下一個 skill 是什麼，可以跳過 `ask-matt`，直接呼叫它。不過，依賴 issue tracker 或 domain docs 的 engineering skills 仍需要先完成 setup。對一次性、無 repository 的工作，則不必為了使用獨立 skill 而建立整套專案設定。

這篇文章核對的是 `1.2.3` 版的設計與操作方式，不代表這套流程一定能縮短開發時間。它的直接作用是把專案慣例寫成文件，並在你不確定下一步時提供選擇。下一篇再處理需求釐清與共用詞彙。

## 延伸閱讀

- [`README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md#L25-L80)：核對官方安裝方式與第一次設定的說明。
- [呼叫方式規範](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md#L1-L22)：理解哪些流程要由人啟動。
- [`setup-matt-pocock-skills`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md#L9-L116)：查看它讀取與寫入哪些檔案。
- [`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L9-L90)：查看不同問題各自適合哪個下一步。
- [OpenAI Codex skills](https://developers.openai.com/codex/skills/)：核對 Codex 的 skill 選取與呼叫方式。
