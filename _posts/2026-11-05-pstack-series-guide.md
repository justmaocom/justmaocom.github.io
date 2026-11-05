---
title: "pstack 系列導讀：這套 skill 是什麼、四篇該怎麼讀"
description: "還在考慮要不要用 pstack，或只想解決其中一個問題？這篇導讀說明這套 skill 是什麼、四篇怎麼串，並依你的情況建議從哪一篇讀起。"
date: 2026-11-05 18:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor]
media_subpath: /assets/img/posts/pstack-series-guide/
image:
  path: cover.png
  alt: "四篇從安裝、看懂、證明能用，到用原則指揮與自己跑；先找出你卡在哪一步，再從那一篇讀起。"
---

你可能聽人提過 pstack，打開 repo 卻看到一大串 skill 名稱；也可能是從搜尋點進其中一篇，想知道前後還有什麼。這個系列寫了四篇，每篇處理用 AI 寫程式時的一段流程。這篇導讀不重講細節，只回答三件事：pstack 是什麼、四篇怎麼串起來，以及你該從哪一篇開始。

> pstack 系列｜導讀
>
> - 從頭開始（第 1 篇）：[安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
>
> 本系列第 3、4 篇與本導讀以 pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json)（commit `c742dd6`）為準；第 1 篇以 `0.15.29`、第 2 篇以 `0.15.30` 為準，細節見下方版本說明。
{: .prompt-info }

## pstack 是什麼

[pstack](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack) 是 [Lauren Tan](https://x.com/poteto)（網路暱稱 poteto）在 Cursor 官方外掛庫 [`cursor/plugins`](https://github.com/cursor/plugins) 裡維護的一整組 skill，授權是 MIT。skill 可以理解成一份「告訴 AI 程式助理怎麼完成某類工作」的操作說明；AI 程式助理指的是 Cursor、Claude Code 這類能讀寫專案檔案、替你寫程式的工具。

在 `0.15.36` 這一版，pstack 有 **58** 個 skill、**24** 條原則（名稱都是 `principle-*`，各是一條短而具體的規則），以及 **23** 個 playbook（針對一種任務寫好的固定步驟，掛在 `/poteto-mode` 底下）。名稱不要和 Unix 指令 `pstack`（用來印行程式呼叫堆疊）搞混；這裡說的是這套 AI skill。

有兩件事先知道會比較好讀：

- **幾乎每個 skill 都要你親自叫。** 除了 `/setup-pstack`，其餘都設成 AI 不能自己啟動。
- **平常多記一個入口就夠。** 先跑一次 `/setup-pstack` 選模型；之後每個需要嚴謹流程的任務，用 `/poteto-mode` 開頭，寫清楚目標和「怎樣算完成」，它會替你挑 playbook。卡住不知道該用哪個時，先問 `/poteto-help`。

安裝、固定版本、以及 Claude Code 裡指令要加 `/pstack:` 前綴，都寫在[第 1 篇](/posts/pstack-install-routing/)，這裡不重複。

## 適合誰、不適合誰

從四篇正文已經寫過的立場來看，這套 skill 比較適合下面這些情況：

- 你用 Cursor 或 Claude Code，想讓 AI 做事更有條理，但不想先背幾十個 skill 名字（[第 1 篇](/posts/pstack-install-routing/)）。
- 改不熟的程式之前，想先弄懂機制與「為什麼長這樣」，再比較幾種設計（[第 2 篇](/posts/pstack-understand-design/)）。
- 希望「證明它能用」變成固定流程：重現、清理、檢查影響範圍、用驗證 skill 實際操作、開 PR，合併仍由你自己按（[第 3 篇](/posts/pstack-build-verify-merge/)）。
- 想用原則名稱中途指揮 AI、把習慣做成自己的 mode，並在權限與費用上限下做無人值守（[第 4 篇](/posts/pstack-principles-customization/)）。

反過來，有些情況不必動用整套：

- **很小、很明顯的修改**：直接跟 AI 說就好，不用 pstack（第 1、2 篇都寫過；第 2 篇更明說大部分改動並不需要那些工具）。
- **不願意為嚴謹流程多花用量**：pstack 會派子代理、組評審，讀寫的內容越多，用掉的用量越多（第 1、2 篇注意事項）。
- **無人值守卻想關光所有檢查**，或在未隔離的環境用 `bypassPermissions`：第 4 篇明確反對。合併、force push、刪資料、對客戶發訊息這類不可逆的動作，仍要由人決定。

## 四篇怎麼串起來

四篇的順序，就是一件工作從裝好工具、看懂再設計、證明能用，到用原則指揮並在界線內自己跑的順序。

![四篇：安裝與挑 playbook、看懂再設計、證明能用再送審、原則與自己跑](series-map.png){: w="800" h="450" }
_四篇照工作流排列；每篇處理一段，細節各自寫在該篇。_

主線大致是這樣走的：先裝好、選模型，之後每個任務交給 `/poteto-mode`（第 1 篇）；動手改之前，用 `/how`、`/why`、`/architect` 這類工具先看懂、再比較設計（第 2 篇）；寫完之後走實作、清理、驗證、送審，合併仍由你決定（第 3 篇）；日常用原則名稱調整方向，把習慣做成自己的 mode，需要時再寫好完成條件與界線讓它自己跑，早上看決策紀錄（第 4 篇）。

## 四篇各講什麼

### 第 1 篇：安裝、選模型，再用 /poteto-mode 挑 playbook

第一次該怎麼開始？這篇教你兩種安裝方式、怎麼檢查與固定版本、用 `/setup-pstack` 選模型，以及怎麼寫 `/poteto-mode` 的任務描述。讀完你會知道，不必先背下所有 skill 名字也能開始；卡住時先問 `/poteto-help`。

→ [第 1 篇：安裝、選模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)

### 第 2 篇：改程式之前，先看懂再設計

面對不熟的程式，怎麼讓 AI 先搞懂再動手？這篇介紹 `/how`、`/why`、`/architect`、`/interrogate` 和 `/arena`：什麼時候用、指令怎麼寫、會拿到什麼、下一步怎麼接。大部分小改動並不需要它們；需要時，先看懂、再比較設計，再改。

→ [第 2 篇：改程式之前，先看懂再設計](/posts/pstack-understand-design/)

### 第 3 篇：寫完程式之後，先證明它能用再合併

程式寫完了，怎樣才算真的能用？這篇把流程分成實作、清理、驗證、送審四個階段，涵蓋 playbook、`/tdd`、驗證 skill、開 PR 和 babysit。開 PR 不會自動開始 babysit；合併永遠由你決定。

→ [第 3 篇：寫完程式之後，先證明它能用再合併](/posts/pstack-build-verify-merge/)

### 第 4 篇：用原則指揮 AI、做出自己的 mode，再放心讓它自己跑

想改 AI 的做法，不必每次寫一大段話。這篇教你用原則名稱中途指揮、用 `/automate-me`、`/reflect`、`/correct` 做出自己的工作方式，以及無人值守前要寫好的六段提示、權限與費用上限，還有早上用 `/show-me-your-work` 檢查決策紀錄。

→ [第 4 篇：用原則指揮 AI、做出自己的 mode，再放心讓它自己跑](/posts/pstack-principles-customization/)

## 依你的情況選起點

![三種閱讀路線：第一次用從第 1 篇、改程式前從第 2 篇、已會用想自己跑從第 4 篇](reading-routes.png){: w="800" h="450" }
_先對上你現在卡在哪一步，再點進那一篇；不必依序讀完四篇才動手。_

| 你的情況 | 建議從哪裡開始 |
| --- | --- |
| 還沒裝過，或不知道指令怎麼叫 | [第 1 篇](/posts/pstack-install-routing/) |
| 已會用 `/poteto-mode`，但改程式前常改錯方向 | [第 2 篇](/posts/pstack-understand-design/) |
| 功能寫完了，卡在「怎樣才算證明能用」或開 PR | [第 3 篇](/posts/pstack-build-verify-merge/) |
| 已會日常使用，想用原則指揮、做自己的 mode，或做無人值守 | [第 4 篇](/posts/pstack-principles-customization/) |
| 只想先知道這套東西是什麼 | 繼續留在本篇，再依上表跳 |

## 版本說明

本系列各篇釘的版本不同，讀的時候以該篇開頭的版本框為準：

| 篇 | pstack | commit |
| --- | --- | --- |
| 第 1 篇 | `0.15.29` | `88d4751` |
| 第 2 篇 | `0.15.30` | `eb4db2b` |
| 第 3 篇、第 4 篇、本導讀 | `0.15.36` | `c742dd6` |

> **版本**：本導讀以 pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json) 為準，對應 `cursor/plugins` 的 commit `c742dd6`（2026-10-28 07:12，台北時間）。我在 2026-11-05 查證時，`cursor/plugins` main 最新是 `bb68f23`（2026-11-04 15:20，台北時間），`c742dd6` 之後 pstack 資料夾沒有變動；Claude Code 最新是 2.1.318。之後的版本，數量與行為可能會改變。
{: .prompt-info }

要裝和本導讀相同的版本，請 clone 後 checkout 到 `c742dd6`，再加進 marketplace；細節與未釘選的風險見[第 1 篇](/posts/pstack-install-routing/)和[供應鏈與權限風險](/posts/coding-agent-supply-chain-permission-risks/)。

## 結論

pstack 是 Cursor 官方外掛庫裡的一套 skill：在本導讀釘的版本裡有 58 個 skill、24 條原則、23 個 playbook。平常先 `/setup-pstack`，之後多記 `/poteto-mode`，卡住問 `/poteto-help`。四篇依序處理安裝與挑 playbook、看懂再設計、證明能用再送審、用原則指揮並在界線內自己跑；你不必依序讀完，對上自己卡在哪一步，從那一篇開始即可。

## 延伸閱讀

- [官方 pstack（本導讀釘選的 commit）](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack)：README、指南與各個 skill。
- [指南目錄](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/)：從安裝、overnight、原則到做出自己的 mode。
- [第 1 篇](/posts/pstack-install-routing/)｜[第 2 篇](/posts/pstack-understand-design/)｜[第 3 篇](/posts/pstack-build-verify-merge/)｜[第 4 篇](/posts/pstack-principles-customization/)
- [mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)和[系列（1）](/posts/mattpocock-skills-setup-routing-guide/)：另一套 skill 的系列文章。
- [自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護](/posts/agent-skill-authoring-guide/)：skill 放哪裡、`SKILL.md` 怎麼寫。
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：權限、沙箱和鎖版本。
