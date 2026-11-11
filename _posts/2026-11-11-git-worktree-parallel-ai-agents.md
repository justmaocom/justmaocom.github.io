---
title: "讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄"
description: "同一個 repo 要讓兩個 AI 分開做事時，用 git worktree 開出獨立工作目錄。這篇教你怎麼開、怎麼看、怎麼收，以及有 submodule 時為什麼不要用。"
date: 2026-11-11 09:00:00 +0800
categories: [AI, 軟體開發]
tags: [git, coding-agent, workflow]
media_subpath: /assets/img/posts/git-worktree-parallel-ai-agents/
image:
  path: cover.webp
  alt: "用 git worktree 幫兩個 AI 各開一個工作目錄，停在自己的分支上做事，做完再收掉。"
---

如果我讓兩個 coding agent（會自己讀檔、改檔、跑指令的 AI 程式助理）在同一個資料夾各做各的，等於兩個人共用一張桌子、一台電腦：一個切到別的分支（一條獨立的修改路線），另一個做到一半的檔案就跟著變。更好的做法是讓同一個 repo（放專案檔案和完整修改歷史的儲存庫）長出第二、第三個工作目錄，每個都停在自己的分支上。這就是 [git worktree](https://git-scm.com/docs/git-worktree) 做的事。

本篇只談怎麼把工作目錄隔開，以及做完怎麼收尾，不比較各家 AI 工具。若你在想「一次讓多個 AI 平行做事」在流程上是什麼意思，見[AI 寫程式變快了，產品為什麼還是交不出去？我怎麼理解 AI 原生開發流程](/posts/ai-native-sdlc-playbook/)。

> **版本說明**：本文依 2026-11-11 讀取的 git-scm.com [git-worktree 手冊](https://git-scm.com/docs/git-worktree)（Git 2.56.0 版）撰寫；git worktree 的多重 checkout 官方仍標示為實驗性，之後行為可能改變，以手冊為準。
{: .prompt-info }

## worktree 是什麼

工作目錄（working tree）是你實際打開、編輯檔案的那個資料夾。git 把「一個工作目錄，加上它自己的 HEAD（標示我現在在哪個分支、哪個 commit）等資料」合稱 worktree。你用 `git clone` 或 `git init` 得到的第一個，叫 main worktree（主工作目錄）；之後用 `git worktree add` 加出來的，叫 linked worktree。一個不是裸儲存庫的 repo，會有一個主工作目錄，以及零個或多個 linked worktree。[手冊的說明段](https://git-scm.com/docs/git-worktree#_description)就是這樣定義的。

這些工作目錄[共用幾乎所有東西](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)，只把每個 worktree 自己的檔案分開，例如 HEAD 和暫存區（index，也就是 `git add` 之後、commit 之前放東西的地方）：

- 共用：commit 歷史、分支、標籤、stash（把還沒 commit 的修改先收起來的機制），以及預設的 repo 設定。
- 各自：資料夾裡實際的檔案、目前停在哪個分支、各自的暫存區。

所以你在一個工作目錄裡新增一個 commit，其他工作目錄立刻都看得到這段歷史；但兩邊桌上的檔案不會自動變成同一份。

![每個工作目錄有自己的檔案和目前位置，但共用同一份歷史紀錄和分支](shared-core.webp){: w="1600" h="900" }
_概念圖，不是實際介面。上方是所有工作目錄共用的歷史紀錄、分支、stash 和設定；下方每個工作目錄各有自己的檔案、HEAD 和暫存區。_

還有一件實作上的事要知道：linked worktree 頂層的 `.git` [不是一個完整的資料夾，而是一個小檔案](https://git-scm.com/docs/git-worktree#_details)，指向主 repo 裡的管理資料。不要把它當成獨立的 repo 去複製，也不要刪掉這個 `.git` 檔。

> **進階：** 若你希望某個 worktree 有自己的設定，例如不同的 `user.email`，可先執行 `git config extensions.worktreeConfig true`，再用 `git config --worktree` 寫入。[手冊提醒](https://git-scm.com/docs/git-worktree#_configuration_file)：舊版 Git 會拒絕讀取開了這個擴充的 repo。一般情況用共用的設定就夠了。
{: .prompt-tip }

## 什麼時候該用、什麼時候不用

適合用 worktree 的情況大致有三種：

- 想同時讓兩個 AI（或你和一個 AI）各做一件事，而且不要改到同一批檔案。
- 手上已經改到一半，暫時不想用 stash 把修改收起來，卻又要去修一件急件。這是[手冊舉的官方情境](https://git-scm.com/docs/git-worktree#_examples)。
- 只想在一個用完就丟的乾淨資料夾裡跑測試或試東西。這時可用稍後會提到的 `-d`。

不需要 worktree 的情況：一次只做一件事，或改動很小、切分支就夠了。這些是使用上的建議，不是手冊裡的硬性規定。

有一種情況則明確不適合。submodule 是把另一個 repo 當成子資料夾掛進來的做法；掛著這些子 repo 的外層，手冊稱為 superproject。

> **有 submodule 的 repo，不要用這個方法平行開發。** [官方手冊的 BUGS 段](https://git-scm.com/docs/git-worktree#_bugs)寫：
>
> Multiple checkout in general is still experimental, and the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject.
>
> 翻譯：多重 checkout 整體上仍屬實驗性質，對 submodule 的支援也不完整。不建議對 superproject 做多重 checkout。
{: .prompt-warning }

## 步驟 1：開一個新的工作目錄

建議把新的 worktree 放在 repo 資料夾**旁邊**，例如 `../myapp-login`，不要放在 repo 裡面。這是為了避免它被當成專案裡的一般檔案，不是手冊規定的路徑。

最常用的寫法，是一邊開新分支、一邊開新資料夾。新分支預設從目前的 HEAD 開始；若要指定起點，把分支名寫在最後：

```bash
git worktree add -b feature-login ../myapp-login
git worktree add -b fix-typo ../myapp-typo main
```

如果只給路徑，git 會[自動用資料夾的最後一段當成新分支名](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)。例如 `git worktree add ../hotfix` 會建立名為 `hotfix` 的分支。

若分支已經存在，只要它還沒在別的 worktree 裡被 checkout（把某個分支或 commit 的檔案內容放到資料夾裡讓你編輯），可以這樣接手：

```bash
git worktree add ../myapp-login feature-login
```

只是想試試看、不想開新分支，可用 `-d`，讓新資料夾處於 detached HEAD（不在任何分支上、直接停在某個 commit）的狀態：

```bash
git worktree add -d ../myapp-try
```

`-b` 遇到已經存在的分支會拒絕建立。`-B` 則會把那個分支**重設**到你指定的起點。這會讓該分支原本指向的位置被改掉，請謹慎使用。

然後進入新資料夾工作：

```bash
cd ../myapp-login
```

在這裡開任何 coding agent、照常 commit 就可以。新資料夾裡只有被 git 追蹤的檔案；像 `node_modules`、`.env` 這類沒被追蹤的東西，需要重新安裝，或自己複製過來。

**你會得到：** 一個獨立的資料夾，停在自己的分支上，和原本的工作目錄互不干擾。

## 同一個分支一次只能在一個地方

[手冊寫明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)：如果某個分支已經在別的 worktree 被 checkout，再對它執行 `add` 會被拒絕，除非加上 `--force`。這是保護，避免兩個資料夾同時改同一條分支。**不建議用 `--force` 繞過。**

順帶一提（這是一般的 git 行為）：主資料夾也不能再 `git checkout` 已被其他 worktree 佔用的分支；那條被佔用的分支也刪不掉，要先把對應的 worktree 移除。

![同一個分支已經在一個工作目錄裡，另一個工作目錄就不能再用它](one-branch-one-place.webp){: w="1600" h="900" }
_概念圖，不是實際介面。左邊的工作目錄已經占用了這條分支，右邊再想用同一條時會被擋住。_

## 步驟 2：看目前有哪些

想知道現在開了幾個工作目錄，執行：

```bash
git worktree list
```

[手冊說明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-list)：主 worktree 會排在第一行，接著是每一個 linked worktree。每一行會有路徑、目前的 commit，以及所在分支（若沒有分支，會標示 detached HEAD）。被鎖住的會標 `locked`，可以清理的會標 `prunable`。

若要看鎖定或可清理的原因，加上 `-v`，原因會顯示在下一行：

```bash
git worktree list -v
```

若要寫腳本解析這份清單，可用 `git worktree list --porcelain`。手冊說這個格式跨版本穩定，並建議搭配 `-z`，以免路徑裡若有換行字元時不好拆。

**你會得到：** 一張目前所有工作目錄的清單，包含各自停在哪裡。

## 實際情境：登入頁和一處錯字

假設有一個網站 repo，資料夾叫 `myapp`。我想讓一個 AI 做登入頁，另一個修 README 裡的錯字，兩邊不要碰到對方的檔案。

1. 先在 `myapp` 裡更新主分支：`git switch main`，再 `git pull`。
2. 從 `main` 各開一條新分支、各開一個資料夾：

```bash
git worktree add -b feature-login ../myapp-login main
git worktree add -b fix-typo ../myapp-typo main
```

**這一步你會得到：** 兩個新資料夾，分別停在 `feature-login` 和 `fix-typo`。

3. 打開兩個終端機，分別進入 `../myapp-login` 和 `../myapp-typo`，各開一個 coding agent，各自 commit。兩邊的檔案互不影響。執行 `git worktree list`，應該會看到三個資料夾：原來的 `myapp`，加上這兩個新的。
4. 審查時，把每個分支各自推上去開 PR（pull request，請求把分支合併進主幹）：

```bash
git push -u origin feature-login
```

另一條分支同樣處理。之後可以讓審查自動跑起來，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)；若想對「誰來看結構、審修改」有一套固定做法，見 [mattpocock/skills 系列（5）：程式寫完之後，誰來看結構、審修改、解衝突](/posts/mattpocock-skills-design-review-integration/)。也可以先在本機的主資料夾看差異：`git diff main...feature-login`。

5. 合併：等 PR 合併，或在主資料夾裡自己 `git merge`。
6. 收尾：先移除工作目錄，再刪分支。

```bash
git worktree remove ../myapp-login
git branch -d feature-login
git worktree remove ../myapp-typo
git branch -d fix-typo
```

最後再執行 `git worktree list`，應該只剩主資料夾。

小提醒：如果專案的規則寫在 AGENTS.md，而且這份檔有被 git 追蹤，每個 worktree 都會有同一份，見[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)。若還想在某個工作目錄裡做固定時機的自動檢查，見[把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

## 步驟 3：收尾

做完以後，用移除指令收掉 linked worktree：

```bash
git worktree remove ../myapp-login
```

[手冊規定](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-remove)：只有乾淨的 worktree（沒有未追蹤檔，被追蹤的檔也沒有修改）才能移除；還有東西沒處理時會被拒絕。確定不要了，才加上 `--force`。主 worktree 不能移除。

`remove` 只拿掉資料夾和 worktree 的紀錄，**分支還在**。記得另外執行 `git branch -d <分支>`。

如果不小心用 `rm -rf` 或把資料夾丟進垃圾桶，`git worktree list` 可能會把那一筆標成 `prunable`。請先預覽會清掉什麼，再真正清理：

```bash
git worktree prune -n -v
git worktree prune
```

[prune 的說明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-prune)是：清掉已經不見的工作目錄所留下的管理資料。手冊也說，下次請改用 `git worktree remove`。prune 同樣不會刪分支。

若你什麼都不做，之後執行 `git gc` 時，git 會呼叫 `git worktree prune --expire 3.months.ago`。寬限期可用設定項 [`gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire) 調整，也可以設成 `now` 或 `never`。

![做完的工作目錄用 remove 收掉，被手動刪掉的用 prune 清紀錄，上鎖的不會被清](cleanup.webp){: w="1600" h="900" }
_概念圖，不是實際介面。做完的工作目錄可以收掉，只留下紀錄的用 prune 清理；有上鎖的會留著。_

## 保護：lock 與 unlock

若 worktree 放在隨身碟或網路磁碟上，不一定隨時掛載，可以把它鎖住，以免管理資料被自動清掉。鎖住之後，也不能 move 或 remove。

```bash
git worktree lock --reason "放在外接硬碟" ../myapp-usb
```

也可以在建立時就鎖上，這樣中間沒有空窗：

```bash
git worktree add --lock --reason "放在外接硬碟" -b feature-usb ../myapp-usb
```

執行 `git worktree list -v` 可以看到鎖定原因。用完後再解開：

```bash
git worktree unlock ../myapp-usb
```

手冊有提供連續兩次 `--force` 來強制處理已鎖定的 worktree，但建議先 `unlock`，不要一開始就硬刪。

## 搬家：move 與 repair

要用 git 自己搬位置：

```bash
git worktree move ../myapp-typo ../tasks/myapp-typo
```

[手冊註明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-move)：主 worktree，或含有 submodule 的 linked worktree，不能用這個指令搬。

如果已經用檔案總管或 `mv` 搬走了，到搬過去的那個 worktree 裡執行 `git worktree repair`。若一次搬了多個，在任一處把新路徑都傳進去：

```bash
git worktree repair ../tasks/myapp-typo ../tasks/myapp-login
```

若搬走的是主資料夾，就在主資料夾裡執行 `git worktree repair`，讓各個 linked worktree 重新指回來。

## 什麼情況用什麼

| 我想… | 用這個 |
| --- | --- |
| 開新任務、新分支 | `git worktree add -b <分支> <路徑> [起點]` |
| 在新資料夾接手已存在的分支 | `git worktree add <路徑> <分支>` |
| 只想試試看、不開分支 | `git worktree add -d <路徑>` |
| 看現在有哪些 | `git worktree list`（細節 `-v`，腳本 `--porcelain -z`） |
| 做完收掉 | `git worktree remove <路徑>`，再 `git branch -d <分支>` |
| 資料夾被手動刪了 | `git worktree prune`（先 `-n -v`） |
| 放在外接硬碟、怕被清 | `git worktree lock --reason "…" <路徑>`／`unlock` |
| 換位置 | `git worktree move`；已手動搬就 `git worktree repair` |
| 每個資料夾不同設定 | `extensions.worktreeConfig` 加上 `git config --worktree` |
| repo 有 submodule | 不要用 worktree 平行開發 |
| 只做一件事 | 不需要 worktree，切分支就好 |

## 常見錯誤

- 兩個 worktree 想用同一個分支，結果被拒絕。請各開一條分支。
- 用 `rm -rf` 刪資料夾，而不是 `git worktree remove`。留下的紀錄再用 `git worktree prune` 清理。
- `remove` 之後忘了刪分支，分支還留在 repo 裡。
- 以為新資料夾會自動帶有 `node_modules` 或 `.env`。沒被追蹤的檔要自己補。
- 把 worktree 開在 repo 資料夾裡面，之後容易跟專案檔混在一起。
- 用檔案總管搬走之後，git 找不到它。到新位置執行 `git worktree repair`。
- 有 submodule 的 repo 仍然硬用。請回到前面的限制說明。
- 一看到拒絕就加 `--force`。這可能讓未提交的修改被丟掉，或繞過「同一條分支只能在一個地方」的保護。

## 結論與下一步

下次要讓兩個 AI 同時動手，先用 `git worktree add -b` 各開一個資料夾，做完再 `git worktree remove`，並記得刪掉用完的分支。repo 裡若有 submodule，就別用這個方法。

接下來，可以替每個工作目錄裡的 AI 寫好專案規則，見[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)；若要把審查自動化，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。指令的細節以 [git-worktree 手冊](https://git-scm.com/docs/git-worktree)為準，自動清理的寬限期見 [git-config 中的 `gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire)。
