---
title: "git worktree 教學：讓兩個 AI 在同一個 repo 分開工作"
description: "同一個 repo 要讓兩個 AI 分開做事時，用 git worktree 開出獨立工作目錄。這篇教你怎麼開、怎麼看、怎麼收，以及有 submodule 時為什麼不要用。"
date: 2026-11-11 09:00:00 +0800
categories: [AI, 軟體開發]
tags: [git, coding-agent, workflow]
media_subpath: /assets/img/posts/git-worktree-parallel-ai-agents/
image:
  path: cover.webp
  alt: "用 git worktree 幫兩個 AI 各開一個工作目錄，停在自己的分支上做事，做完再收掉。"
---

如果我讓兩個 coding agent（會自己讀檔、改檔、跑指令的 AI 程式助理）在同一個資料夾各做各的，等於兩個人共用一張桌子、一台電腦。一個 AI 切到別的分支（一條獨立的修改路線）時，資料夾裡的檔案會換成那條分支的版本，另一個 AI 做到一半的檔案就跟著變了。更好的做法是讓同一個 repo（放專案檔案和完整修改歷史的儲存庫）長出第二、第三個工作目錄，每個都停在自己的分支上。這就是 [git worktree](https://git-scm.com/docs/git-worktree) 做的事。

本篇只談怎麼把工作目錄隔開，以及做完怎麼合併、收尾，不比較各家 AI 工具。若你在想「一次讓多個 AI 平行做事」在流程上是什麼意思，見[AI 寫程式變快了，產品為什麼還是交不出去？我怎麼理解 AI 原生開發流程](/posts/ai-native-sdlc-playbook/)。

> **版本說明**：本文依 2026-11-11 讀取的 git-scm.com [git-worktree 手冊](https://git-scm.com/docs/git-worktree)（Git 2.56.0 版）撰寫；git worktree 的多重 checkout 官方仍標示為實驗性，之後行為可能改變，以手冊為準。
{: .prompt-info }

## worktree 是什麼

git 手冊介紹 worktree 的第一句話是：一個 repo 可以有好幾個工作目錄，讓你同時 checkout 不只一個分支。checkout 的意思，是把某個分支或 commit（一次存檔紀錄）的檔案內容放到資料夾裡讓你編輯。

工作目錄（working tree）是你實際打開、編輯檔案的那個資料夾。git 把「一個工作目錄，加上它自己的 HEAD（標示這個資料夾目前停在哪個分支、哪個 commit）等資料」合稱 worktree。你用 `git clone` 或 `git init` 得到的第一個，叫 main worktree（主工作目錄）；之後用 `git worktree add` 加出來的，叫 linked worktree。[手冊的說明段](https://git-scm.com/docs/git-worktree#_description)這樣定義：一個 repo 會有一個主工作目錄，以及零個或多個 linked worktree。手冊把 bare repository（裸儲存庫）排除在這條定義之外，本篇不會用到它。

這些工作目錄[共用幾乎所有東西](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)，只有少數屬於各個 worktree 自己的資料是分開的，例如 HEAD 和暫存區（index，也就是 `git add` 之後、commit 之前放東西的地方）。整理起來：

- 共用：commit 歷史、分支、標籤、stash（把還沒 commit 的修改先收起來的機制），以及預設的 repo 設定。
- 各自：資料夾裡實際的檔案、目前停在哪個分支（HEAD）、各自的暫存區。

「分支共用」的意思是每個工作目錄都看得到同一批分支，但每個資料夾各自決定現在停在哪一條。所以你在一個工作目錄裡新增一個 commit，其他工作目錄立刻都看得到這段歷史；但兩邊桌上的檔案不會自動變成同一份。

![每個工作目錄有自己的檔案和目前位置，但共用同一份歷史紀錄和分支](shared-core.webp){: w="1600" h="900" }
_概念圖，不是實際介面。上方是所有工作目錄共用的歷史紀錄、分支、stash 和設定；下方每個工作目錄各有自己的檔案、HEAD 和暫存區。_

還有一件實作上的事要知道：linked worktree 頂層的 `.git` [不是一個完整的資料夾，而是一個小檔案](https://git-scm.com/docs/git-worktree#_details)，指向主 repo 裡替這個 worktree 保留的管理資料（手冊稱為 administrative files）。也就是說，linked worktree 的資料夾本身不是完整的 repo。不要把它當成獨立的 repo 複製到別處，也不要刪掉這個 `.git` 檔。

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

不確定自己的 repo 有沒有用 submodule，可以這樣確認。用了 submodule 的 repo，最上層會有一個叫 `.gitmodules` 的設定檔，[手冊說明](https://git-scm.com/docs/gitmodules)每個 submodule 在裡面各有一段設定。這個檔名以點開頭，檔案總管預設可能會把它藏起來，所以用指令確認比較準：

```bash
git submodule status
```

[這個指令](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-status--cached--recursive--path)會替每個 submodule 印出一行，包含它目前停的 commit 和路徑。什麼都沒印出來，就表示這個 repo 沒有 submodule，可以照下面的步驟做。

## 步驟 1：開一個新的工作目錄

以下的指令都是打開終端機、在原本的 repo 資料夾裡執行。我用一個叫 `myapp` 的資料夾當例子；新開的 worktree 會連到你執行指令時所在的這個 repo。

建議把新的 worktree 放在 repo 資料夾**旁邊**，例如 `../myapp-login`。`../` 代表上一層資料夾，所以 `myapp-login` 會和 `myapp` 並排。不要放在 repo 裡面，以免它跟專案裡的一般檔案混在一起。這是我的建議，手冊沒有規定路徑。

最常用的寫法，是一邊開新分支、一邊開新資料夾。`-b` 後面接新分支的名字，再來是新資料夾的路徑：

```bash
git worktree add -b feature-login ../myapp-login
git worktree add -b fix-typo ../myapp-typo main
```

這兩行是兩個獨立的例子。第一行沒有指定起點，新分支會從目前的 HEAD 開始，也就是你在 `myapp` 裡目前停的那個 commit；第二行在最後寫了 `main`，新分支就從 `main` 開始。

`-b` 遇到已經存在的分支名稱會拒絕建立。另一個選項 `-B` 會略過這個保護，把那個分支**重設**到你指定的起點，分支原本指向的位置就被換掉了，請謹慎使用。

如果只給路徑，git 會[自動用資料夾的最後一段當成新分支名](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)。例如 `git worktree add ../hotfix` 會建立名為 `hotfix` 的分支。

若想用一條已經存在的分支，例如之前就建好的 `feature-search`，而且它還沒在別的 worktree 裡被 checkout，可以這樣接手：

```bash
git worktree add ../myapp-search feature-search
```

只是想試試看、不想開新分支，可用 `-d`。新資料夾會處於 detached HEAD（不在任何分支上、直接停在某個 commit）的狀態，停在和目前分支相同的 commit：

```bash
git worktree add -d ../myapp-try
```

建好之後，進入新資料夾工作：

```bash
cd ../myapp-login
```

在這裡開任何 coding agent、照常 commit 就可以。要注意，新資料夾裡只有被 git 追蹤（已經交給 git 管理）的檔案。像 `node_modules`（安裝好的相依套件）、`.env`（常用來放密碼或金鑰的設定檔）這類沒被追蹤的東西不會跟過來，需要重新安裝，或自己複製過來。

這一節的指令是各種寫法的示範，不用全部照打；後面的「實際情境」會從頭到尾完整做一次。

**你會得到：** 一個獨立的資料夾，停在自己的分支上，和原本的工作目錄互不干擾。

## 同一個分支一次只能在一個地方

[手冊寫明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-addpathcommit-ish)：如果某個分支已經在別的 worktree 被 checkout，再對它執行 `add` 會被拒絕，除非加上 `--force`。這是保護，避免兩個資料夾同時改同一條分支。**不建議用 `--force` 繞過。**

切換分支時也有同樣的保護。[`git switch`](https://git-scm.com/docs/git-switch#Documentation/git-switch.txt---ignore-other-worktrees) 和 `git checkout` 遇到已經被別的 worktree 用著的分支，會拒絕切過去。所以主資料夾不能直接切到 AI 正在用的那條分支。想看那條分支改了什麼，不用切過去，步驟 3 會教你用 `git diff` 直接比較。

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

若要寫腳本解析這份清單（平常使用不需要），可用 `git worktree list --porcelain`。手冊說這個格式跨版本穩定，並建議搭配 `-z`，這樣即使路徑裡有換行字元也能正確拆開。

**你會得到：** 一張目前所有工作目錄的清單，包含各自停在哪裡。

## 步驟 3：把成果合併回 main

在 worktree 裡做完、要留的修改都 commit 之後，下一步是把這條分支的成果放回 `main`。有兩種做法，選一種就好。

**做法一：在本機自己合併。** 回到主資料夾 `myapp`（例如從 `myapp-login` 執行 `cd ../myapp`），依序執行：

```bash
git switch main
git diff main...feature-login
git merge feature-login
```

- `git switch main`：讓主資料夾停在 `main`。
- `git diff main...feature-login`：列出 `feature-login` 從和 `main` 分岔那一刻起改了哪些地方。[手冊說明](https://git-scm.com/docs/git-diff)，三個點的寫法是從兩條分支的共同起點開始比較。先看過，確定沒問題再合併。
- `git merge feature-login`：[把那條分支上的 commit 合併進目前所在的分支](https://git-scm.com/docs/git-merge)，也就是 `main`。

合併時不需要切到 `feature-login`，所以它還留在 worktree 裡也沒關係。如果兩邊改到同一個檔案的同一段，git 沒辦法自己決定留哪一邊，[會停下來請你處理](https://git-scm.com/docs/git-merge#_how_conflicts_are_presented)，這種情況叫衝突（conflict）。怎麼處理衝突，可以參考 [mattpocock/skills 系列（5）：程式寫完之後，誰來看結構、審修改、解衝突](/posts/mattpocock-skills-design-review-integration/)。

**做法二：推上去開 PR。** 想讓別人或自動審查先看過，就把分支推到遠端 repo（放在 GitHub 這類網站上的那一份），再到網站上開 PR（pull request，請求把分支合併進主幹）：

```bash
git push -u origin feature-login
```

`origin` 是 `git clone` 時，git 預設替遠端 repo 取的名字。[`-u`](https://git-scm.com/docs/git-push#Documentation/git-push.txt--u) 會讓本機分支記住它對應的遠端分支，這個對應的分支叫上游（upstream），之後不帶參數的 `git pull` 就知道要從哪裡更新。

PR 在網站上合併以後，你電腦裡的 `main` 不會自動跟著更新。回到 `myapp` 執行：

```bash
git switch main
git pull
```

[`git pull`](https://git-scm.com/docs/git-pull) 會先抓下遠端的新變更，再合併進目前所在的分支。

**你會得到：** `main` 上有了這條分支的成果，接下來就可以收掉 worktree。

## 步驟 4：收尾

做完以後，回到主資料夾 `myapp`，用移除指令收掉 linked worktree。路徑可以寫相對路徑或完整路徑：

```bash
git worktree remove ../myapp-login
```

[手冊規定](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-remove)：只有乾淨的 worktree（沒有未追蹤檔，被追蹤的檔也沒有修改）才能移除；還有東西沒處理時會被拒絕。這時先回到那個資料夾，把要留的修改 commit 起來。確定裡面的東西都不要了，才加上 `--force`，沒 commit 的修改會跟著資料夾一起消失。主 worktree 不能移除。

`remove` 只拿掉資料夾和 worktree 的紀錄，**分支還在**，要另外刪掉。順序是先 remove 用著這條分支的 worktree，再刪分支：

```bash
git branch -d feature-login
```

[`-d` 只刪已經合併的分支](https://git-scm.com/docs/git-branch#Documentation/git-branch.txt--d)。手冊的條件是：分支必須已經完整合併進它的上游分支（例如用 `push -u` 設定過的遠端分支）；沒有設定上游的話，就是要合併進目前所在的分支。條件不符時 git 會拒絕刪除，提醒你這條分支上還有沒合併的 commit。這時先回頭確認，成果是不是還沒合併回 `main`，或還沒推上去。確定那些 commit 都不要了，才改用：

```bash
git branch -D feature-login
```

[`-D`](https://git-scm.com/docs/git-branch#Documentation/git-branch.txt--D) 等於 `--delete --force`，不管有沒有合併都會直接刪掉。

如果不小心用 `rm -rf` 或把資料夾丟進垃圾桶，`git worktree list` 可能會把那一筆標成 `prunable`。請先預覽會清掉什麼，再真正清理：

```bash
git worktree prune -n -v
git worktree prune
```

[prune 的說明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-prune)是：清掉已經不見的工作目錄所留下的管理資料。手冊也說，下次請改用 `git worktree remove`。prune 同樣不會刪分支。

若你什麼都不做，之後執行 `git gc` 時，git 會呼叫 `git worktree prune --expire 3.months.ago`，也就是只清掉超過三個月的、已經不見的工作目錄紀錄。寬限期可用設定項 [`gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire) 調整：設成 `now` 是不留寬限期、立刻清掉，設成 `never` 則是不自動清。

![做完的工作目錄用 remove 收掉，被手動刪掉的用 prune 清紀錄，上鎖的不會被清](cleanup.webp){: w="1600" h="900" }
_概念圖，不是實際介面。做完的工作目錄可以收掉，只留下紀錄的用 prune 清理；有上鎖的會留著。_

## 實際情境：登入頁和一處錯字

假設有一個網站 repo，資料夾叫 `myapp`。我想讓一個 AI 做登入頁，另一個修 README 裡的錯字，兩邊不要碰到對方的檔案。

1. 先在 `myapp` 裡更新主分支：`git switch main`，再 `git pull`。
2. 從 `main` 各開一條新分支、各開一個資料夾：

   ```bash
   git worktree add -b feature-login ../myapp-login main
   git worktree add -b fix-typo ../myapp-typo main
   ```

   **這一步你會得到：** 兩個新資料夾，分別停在 `feature-login` 和 `fix-typo`。

3. 打開兩個終端機，分別進入 `../myapp-login` 和 `../myapp-typo`，各開一個 coding agent，各自 commit。兩邊的檔案互不影響。執行 `git worktree list`，應該會看到三個資料夾：排在第一行的原來的 `myapp`，加上這兩個新的。
4. 審查：推上去之前，可以先在主資料夾 `myapp` 看這條分支改了什麼：`git diff main...feature-login`。要給別人審，就把每個分支各自推上去開 PR（pull request，請求把分支合併進主幹）：

   ```bash
   git push -u origin feature-login
   ```

   另一條分支同樣處理。之後可以讓審查自動跑起來，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)；若想對「誰來看結構、審修改」有一套固定做法，見 [mattpocock/skills 系列（5）：程式寫完之後，誰來看結構、審修改、解衝突](/posts/mattpocock-skills-design-review-integration/)。

5. 合併：開了 PR 的，等 PR 在網站上合併，再回 `myapp` 執行 `git pull` 更新 `main`。不開 PR 的，在主資料夾 `myapp`（第 1 步已經停在 `main`）執行 `git merge feature-login` 和 `git merge fix-typo`。細節見步驟 3。
6. 收尾：先確認兩個資料夾裡的 AI 都停下來、要留的修改都 commit 了，因為 `remove` 只收乾淨的資料夾。接著回到 `myapp`，先移除工作目錄，再刪分支：

   ```bash
   git worktree remove ../myapp-login
   git branch -d feature-login
   git worktree remove ../myapp-typo
   git branch -d fix-typo
   ```

   如果 `git branch -d` 拒絕刪除，見步驟 4 的說明。最後再執行 `git worktree list`，應該只剩主資料夾。

小提醒：如果專案的規則寫在 AGENTS.md，而且這份檔有被 git 追蹤，每個 worktree 都會有同一份，見[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)。若還想在某個工作目錄裡做固定時機的自動檢查，見[Claude Code hooks 教學：自動排版、跑測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

## 保護：lock 與 unlock

若 worktree 放在隨身碟或網路磁碟上，這類裝置不一定隨時接在電腦上，可以把它鎖住，以免它的管理資料被自動清掉。鎖住之後，也不能 move 或 remove。

對已經建好的 worktree 上鎖：

```bash
git worktree lock --reason "放在外接硬碟" ../myapp-usb
```

也可以在建立時就直接鎖上，這樣不會有「剛建好、還沒鎖」的空檔：

```bash
git worktree add --lock --reason "放在外接硬碟" -b feature-usb ../myapp-usb
```

執行 `git worktree list -v` 可以看到鎖定原因。用完後再解開：

```bash
git worktree unlock ../myapp-usb
```

手冊有提供連續兩次 `--force` 來強制處理已鎖定的 worktree，但建議先 `unlock`，不要一開始就硬刪。

## 搬家：move 與 repair

想把 worktree 換個位置，用 git 的 `move` 指令來搬。例如把還沒收掉的 `../myapp-typo` 搬到 `../tasks/` 底下：

```bash
git worktree move ../myapp-typo ../tasks/myapp-typo
```

[手冊註明](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt-move)：主 worktree，或含有 submodule 的 linked worktree，不能用這個指令搬。

如果已經用檔案總管或 `mv` 自己搬走了，git 記錄的位置就對不上了。這時到搬過去的那個 worktree 裡執行 `git worktree repair` 重新接上。若一次搬了多個，可以在任何一個 worktree 裡執行，把每個新路徑都列在後面：

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
| 把成果合併回 main | 在主資料夾 `git switch main`，再 `git merge <分支>`；或 `git push -u origin <分支>` 開 PR |
| 做完收掉 | `git worktree remove <路徑>`，再 `git branch -d <分支>` |
| 分支被 `-d` 拒絕刪除 | 先確認成果已合併；確定不要了才 `git branch -D <分支>` |
| 資料夾被手動刪了 | `git worktree prune`（先 `-n -v`） |
| 放在外接硬碟、怕被清 | `git worktree lock --reason "…" <路徑>`／`unlock` |
| 換位置 | `git worktree move`；已手動搬就 `git worktree repair` |
| 每個資料夾不同設定 | `extensions.worktreeConfig` 加上 `git config --worktree` |
| 不確定有沒有 submodule | 看最上層有沒有 `.gitmodules`，或執行 `git submodule status` |
| repo 有 submodule | 不要用 worktree 平行開發 |
| 只做一件事 | 不需要 worktree，切分支就好 |

## 常見錯誤

- 兩個 worktree 想用同一個分支，結果被拒絕。請各開一條分支。
- 用 `-b` 開分支時，名字和已經存在的分支重複，結果被拒絕。換一個新名字；如果本來就想接手那條分支，改用 `git worktree add <路徑> <分支>`。
- `git worktree remove` 被拒絕。通常是資料夾裡還有沒 commit 的修改或未追蹤檔。先把要留的 commit 起來，確定不要了才加 `--force`。
- 用 `rm -rf` 刪資料夾，而不是 `git worktree remove`。留下的紀錄再用 `git worktree prune` 清理。
- 在主資料夾想切到 AI 正在用的分支，結果被拒絕。不用切過去，用 `git diff main...<分支>` 看差異，或直接 `git merge <分支>`。
- `remove` 之後忘了刪分支，分支還留在 repo 裡。
- `git branch -d` 拒絕刪除。代表分支上還有沒合併的 commit，先確認成果已經合併或推上去，確定不要了才用 `-D`。
- 以為新資料夾會自動帶有 `node_modules` 或 `.env`。沒被追蹤的檔要自己補。
- 把 worktree 開在 repo 資料夾裡面，之後容易跟專案檔混在一起。
- 用檔案總管搬走之後，git 找不到它。到新位置執行 `git worktree repair`。
- 有 submodule 的 repo 仍然硬用。請回到前面的限制說明。
- 一看到拒絕就加 `--force`。這可能讓未提交的修改被丟掉，或繞過「同一條分支只能在一個地方」的保護。

## 結論與下一步

下次要讓兩個 AI 同時動手，先用 `git worktree add -b` 各開一個資料夾。做完把成果合併回 `main`（或推上去開 PR），再 `git worktree remove`，並記得刪掉用完的分支。repo 裡若有 submodule（最上層有 `.gitmodules`），就別用這個方法。

接下來，可以替每個工作目錄裡的 AI 寫好專案規則，見[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)；若要把審查自動化，見[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)。指令的細節以 [git-worktree 手冊](https://git-scm.com/docs/git-worktree)為準，自動清理的寬限期見 [git-config 中的 `gc.worktreePruneExpire`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gcworktreePruneExpire)。
