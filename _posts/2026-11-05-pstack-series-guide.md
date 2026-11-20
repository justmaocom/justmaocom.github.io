---
title: "pstack 系列導讀：這套 skill 是什麼、四篇該怎麼讀"
description: "還在考慮要不要用 pstack，或只想解決其中一個問題？這篇導讀說明這套 skill 是什麼、四篇怎麼串，並依你的情況建議從哪一篇讀起。"
date: 2026-11-05 18:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor, pstack]
media_subpath: /assets/img/posts/pstack-series-guide/
image:
  path: cover.webp
  alt: "四篇從安裝、看懂、證明能用，到用原則指揮與自己跑；先找出你卡在哪一步，再從那一篇讀起。"
---

你可能聽人提過 pstack，打開 repo 卻只看到一長串 skill 名稱；也可能是從搜尋點進其中一篇，想知道前後還有哪些。這個系列我寫了四篇，每篇處理用 AI 寫程式時的其中一段流程。這篇導讀我不重講細節，只回答三件事：pstack 是什麼、四篇怎麼串起來，還有你該從哪一篇開始。

> pstack 系列｜導讀
>
> - 從頭開始（第 1 篇）：[安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
>
> 這個系列的五篇，我都以 pstack [`0.15.43`](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/.cursor-plugin/plugin.json)（commit `2f87c85`）為準，細節見下方的版本說明。
{: .prompt-info }

## pstack 是什麼

[pstack](https://github.com/cursor/plugins/tree/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack) 是 [Lauren Tan](https://x.com/poteto)（網路暱稱 poteto）在 Cursor 官方外掛庫 [`cursor/plugins`](https://github.com/cursor/plugins) 裡維護的一整組 skill，採 MIT 授權。我會把 skill 想成一份操作說明，告訴 AI 程式助理怎麼完成某一類工作；這裡的 AI 程式助理，指的是 Cursor、Claude Code 這類能讀寫專案檔案、替你寫程式的工具。

在 `0.15.43` 這一版，pstack 有 **58** 個 skill、**24** 條原則（每條都是簡短而具體的規則，名稱都是 `principle-*`），以及 **22** 個 playbook（針對某一種任務寫好的固定步驟，掛在 `/poteto-mode` 底下）。另外，別把它和 Unix 指令 `pstack`（用來印出行程的呼叫堆疊）搞混；這裡我說的是這套 AI skill。

有兩件事先知道，後面會比較好讀：

- **幾乎每個 skill 都要你親自叫。** 除了 `/setup-pstack`，其他 skill 都設定成不讓 AI 自己啟動。
- **平常只要記住一個入口。** 先跑一次 `/setup-pstack` 選好模型；之後凡是需要嚴謹流程的任務，都用 `/poteto-mode` 開頭，寫清楚目標和「怎樣算完成」，它就會替你挑 playbook。卡住、不知道該用哪個 skill 時，先問 `/poteto-help`。

怎麼安裝、怎麼固定版本，還有在 Claude Code 裡指令要加 `/pstack:` 前綴，這些我都寫在[第 1 篇](/posts/pstack-install-routing/)，這裡就不重複了。

## 適合誰、不適合誰

綜合我在四篇裡寫過的看法，這套 skill 比較適合下面這幾種情況：

- 你用 Cursor 或 Claude Code，想讓 AI 做事更有條理，但不想先背幾十個 skill 名字（[第 1 篇](/posts/pstack-install-routing/)）。
- 改不熟的程式之前，想先弄懂機制與「為什麼長這樣」，再比較幾種設計（[第 2 篇](/posts/pstack-understand-design/)）。
- 希望「證明它能用」變成固定流程：重現、清理、檢查影響範圍、用驗證 skill 實際操作、開 PR，最後由你自己按下合併（[第 3 篇](/posts/pstack-build-verify-merge/)）。
- 想用原則名稱中途指揮 AI、把習慣做成自己的 mode，並在權限與費用上限內讓它無人值守地跑（[第 4 篇](/posts/pstack-principles-customization/)）。

反過來說，我認為下面這些情況不必動用整套：

- **很小、很明顯的修改**：直接跟 AI 說就好，不用 pstack（我在第 1、2 篇都提過；第 2 篇更直接說，大部分改動其實用不到那些工具）。
- **不願意為嚴謹流程多花用量**：pstack 會派出子代理、組評審，讀寫的內容越多，花掉的用量就越多（見第 1、2 篇的注意事項）。
- **無人值守卻想關光所有檢查**，或在沒有隔離的環境裡用 `bypassPermissions`：我在第 4 篇明確反對這麼做。合併、force push、刪資料、對客戶發訊息這類不可逆的動作，還是要由人來決定。

## 四篇怎麼串起來

我照一件工作的流程排這四篇：先裝好工具，再看懂、設計，接著證明能用，最後用原則指揮，讓它在界線內自己跑。

![四篇：安裝與挑 playbook、看懂再設計、證明能用再送審、原則與自己跑](series-map.webp){: w="800" h="450" }
_四篇照工作流程排列，每篇處理其中一段，細節都寫在各篇裡。_

主線大致是這樣：先裝好、選好模型，之後每個任務都交給 `/poteto-mode`（第 1 篇）；動手改之前，先用 `/how`、`/why`、`/architect` 這類工具看懂程式，再比較設計（第 2 篇）；接著照實作、清理、驗證、送審的順序把事情做完，合併仍由你決定（第 3 篇）；日常則用原則名稱調整方向、把習慣做成自己的 mode，需要時寫好完成條件與界線，讓它自己跑，隔天早上再看決策紀錄（第 4 篇）。

## 四篇各講什麼

### 第 1 篇：安裝、選模型，再用 /poteto-mode 挑 playbook

第一次用，該從哪裡開始？這篇介紹兩種安裝方式、怎麼檢查並固定版本、怎麼用 `/setup-pstack` 選模型，以及 `/poteto-mode` 的任務描述該怎麼寫。讀完你會知道，不必先背下所有 skill 名字也能上手；卡住時，先問 `/poteto-help` 就好。

→ [第 1 篇：安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)

### 第 2 篇：改程式之前，先看懂再設計

面對不熟的程式，怎麼讓 AI 先搞懂再動手？這篇介紹 `/how`、`/why`、`/architect`、`/interrogate` 和 `/arena`，包括什麼時候用、指令怎麼寫、會拿到什麼，以及下一步怎麼接；另外也介紹依情況加用的 `/teach`、`/recall`、`/swarm`，以及試作和寫計畫兩個 playbook。大部分小改動並不需要它們；真的需要時，順序是先看懂、比較設計，最後才動手改。

→ [第 2 篇：改程式之前，先看懂再設計](/posts/pstack-understand-design/)

### 第 3 篇：寫完程式之後，先證明它能用再合併

程式寫完了，怎樣才算真的能用？這篇把流程拆成實作、清理、驗證、送審四個階段，會講到 playbook、`/tdd`、驗證 skill、開 PR 和 babysit。另外，開 PR 不會自動開始 babysit；要不要合併，永遠由你決定。

→ [第 3 篇：寫完程式之後，先證明它能用再合併](/posts/pstack-build-verify-merge/)

### 第 4 篇：用原則指揮 AI、做出自己的 mode，再放心讓它自己跑

想改 AI 的做法，不必每次都寫一大段話。這篇會講怎麼用原則名稱中途指揮 AI、怎麼用 `/automate-me`、`/reflect`、`/correct` 做出自己的工作方式；也會講讓它無人值守之前，要先寫好的六段提示、權限與費用上限，以及隔天早上怎麼用 `/show-me-your-work` 檢查決策紀錄。

→ [第 4 篇：用原則指揮 AI、做出自己的 mode，再放心讓它自己跑](/posts/pstack-principles-customization/)

## 依你的情況選起點

![三種閱讀路線：第一次用從第 1 篇、改程式前從第 2 篇、已會用想自己跑從第 4 篇](reading-routes.webp){: w="800" h="450" }
_先找出你現在卡在哪一步，再點進對應的那一篇；不必把四篇依序讀完才動手。_

| 你的情況 | 建議從哪裡開始 |
| --- | --- |
| 還沒裝過，或不知道指令怎麼叫 | [第 1 篇](/posts/pstack-install-routing/) |
| 要從零開始一個新專案，repo 還是空的 | 先看下方的「新專案怎麼走」 |
| 已會用 `/poteto-mode`，但常常一動手就改錯方向 | [第 2 篇](/posts/pstack-understand-design/) |
| 功能寫完了，卡在「怎樣才算證明能用」或開 PR | [第 3 篇](/posts/pstack-build-verify-merge/) |
| 日常使用已經上手，想用原則指揮、做自己的 mode，或讓它無人值守地跑 | [第 4 篇](/posts/pstack-principles-customization/) |
| 只想先知道這套東西是什麼 | 先讀完這篇，再照上表跳過去 |

### 新專案怎麼走

四篇的例子都是已經有程式的專案，pstack 也沒有專為新專案寫的 playbook。repo 還是空的時候，我建議照 [`foundational-thinking`](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/principle-foundational-thinking/SKILL.md#L13) 這條原則安排順序。它要求先做能幫到之後每個階段的東西，例如 CI、測試和共用型別。

1. 照[第 1 篇](/posts/pstack-install-routing/)安裝。`/setup-pstack` 問要不要產生驗證用的 skill 時，先拒絕，因為專案還不能啟動。
2. 跳過[第 2 篇](/posts/pstack-understand-design/)的 `/how` 和 `/why`，空的 repo 沒有程式和歷史可讀。直接用同一篇的試作和 `/architect` 決定核心的資料形狀。
3. 用寫計畫把工作拆成 PR。第一個 PR 只放 CI、測試框架、共用型別和一個能啟動的骨架。`/tdd` 找不到現成的測試路徑時，不會為了走流程從零建一條（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/tdd/SKILL.md#L16)），所以測試框架要先放進來。
4. 骨架能啟動之後，再執行 `/create-verification-skill`。專案不能建置或啟動時，它會先修好或回報問題，再產生驗證 skill（[SKILL.md](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/create-verification-skill/SKILL.md#L21)）。
5. 之後每個功能都照[第 3 篇](/posts/pstack-build-verify-merge/)的流程做。提示裡「哪些既有的行為不能變」，填前面幾個 PR 已經驗證過的行為。

第 3 步的提示可以這樣寫：

```text
/pstack:poteto-mode 把這個設計寫成計畫。第一個 PR 只放 CI、測試框架、共用型別和一個能啟動的骨架。之後一個 PR 做一個功能，每個都有自己的驗證步驟。
```

骨架合併之後，專案就已經有程式了，四篇都可以照原本的方式使用。

## 版本說明

> **版本**：這篇導讀我以 pstack [`0.15.43`](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/.cursor-plugin/plugin.json) 為準，對應 `cursor/plugins` 的 commit `2f87c85`（2026-11-17 05:47，台北時間），搭配 Claude Code 2.1.326。系列五篇在 2026-11-17 一起改以這一版查證；我查證時，`cursor/plugins` 的 main 在 `2f87c85` 之後沒有改動 pstack。之後的版本，數量和行為都可能改變。
{: .prompt-info }

如果你想裝和這篇導讀相同的版本，我建議先 clone 下來、checkout 到 `2f87c85`，再加進 marketplace；詳細步驟和不釘版本的風險，見[第 1 篇](/posts/pstack-install-routing/)和[供應鏈與權限風險](/posts/coding-agent-supply-chain-permission-risks/)。

## 結論

pstack 是 Cursor 官方外掛庫裡的一套 skill，在本導讀釘的版本裡有 58 個 skill、24 條原則、22 個 playbook。我建議先跑一次 `/setup-pstack`，平常記住 `/poteto-mode`，卡住時問 `/poteto-help`。四篇依序處理安裝與挑 playbook、看懂再設計、證明能用再送審、用原則指揮並在界線內自己跑；你不必照順序讀完，找出自己卡在哪一步，從那一篇開始就好。

## 延伸閱讀

- [官方 pstack（本導讀釘選的 commit）](https://github.com/cursor/plugins/tree/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack)：README、指南與各個 skill。
- [指南目錄](https://github.com/cursor/plugins/tree/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/docs/guide/)：從安裝、overnight、原則到做出自己的 mode。
- [第 1 篇](/posts/pstack-install-routing/)｜[第 2 篇](/posts/pstack-understand-design/)｜[第 3 篇](/posts/pstack-build-verify-merge/)｜[第 4 篇](/posts/pstack-principles-customization/)
- [mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)和[系列（1）](/posts/mattpocock-skills-setup-routing-guide/)：另一套 skill 的系列文章。
- [自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護](/posts/agent-skill-authoring-guide/)：skill 放哪裡、`SKILL.md` 怎麼寫。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：權限、沙箱和鎖版本。
