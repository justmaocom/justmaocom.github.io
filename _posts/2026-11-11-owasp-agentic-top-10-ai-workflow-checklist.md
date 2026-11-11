---
title: "拿 OWASP Agentic Top 10 檢查你的 AI 工作流：十項風險逐條對照與修法"
description: "把 OWASP Agentic Top 10 整理成十題是／否檢查，用來對照你的 coding agent、MCP 與 CI，並附上可著手的修法。"
date: 2026-11-11 16:00:00 +0800
categories: [資訊安全, AI Agent]
tags: [ai-security, coding-agent, prompt-injection, mcp, claude-code]
media_subpath: /assets/img/posts/owasp-agentic-top-10-ai-workflow-checklist/
image:
  path: cover.webp
  alt: "照 OWASP Agentic Top 10 的十項風險，逐題檢查並修好自己的 AI 開發工作流。"
---

用 coding agent 久了，工具會愈接愈多：多一個 MCP、多一條自動放行、再把 CI 接上去，卻很少回頭把整個工作流檢查一遍。OWASP（一個非營利的開放資安社群，最有名的是網站風險清單「OWASP Top 10」）在 2025 年 12 月發布了〈[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)〉，也可簡稱 OWASP Agentic Top 10。發布頁的原文是：a globally peer-reviewed framework，由 100 多位專家、研究者與實務工作者共同寫成，用來指出自主與 agent 系統最關鍵的資安風險。

這份清單原本是寫給要建 agent 系統的組織。我把它翻譯成個人開發工作流可以回答的十題是／否問題，每題附上修法。分組、情境、檢查題和修補順序都是本站整理，**不是** OWASP 官方的「個人開發者檢查表」；ASI 編號只是編號，不代表嚴重度。

範圍是個人開發者的 coding agent 工作流，例如 Claude Code、Codex、Cursor 的 agent，以及接上的 MCP 和 GitHub Actions。和[裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/) 的分工是：那篇從「裝了什麼」講攻擊面；這篇用 OWASP 的十項把整個工作流掃一遍。供應鏈篇已經詳細寫過的案例，這裡不再重講。

> **版本說明**：本文依 OWASP〈OWASP Top 10 for Agentic Applications 2026〉（2025 年 12 月發布，2026-11-11 重新核對仍是最新版）與各工具 2026-11-11 的官方文件撰寫。Claude Code、Codex、Cursor 的預設權限近期都有調整，設定名稱與預設值以官方文件為準。
{: .prompt-info }

## 先說幾個詞

- **AI agent／agentic**：不只回答問題，還會自己規劃步驟、呼叫工具、改檔、跑指令的 AI。
- **工具（tool）**：agent 能呼叫的功能，例如讀檔、跑終端機指令、上網、呼叫 MCP server。
- **MCP（Model Context Protocol）**：讓 agent 接上外部工具和資料的標準；MCP server 就是提供這些工具的程式。
- **提示注入（prompt injection）**：把指令藏在 agent 會讀到的內容裡，讓它照著做。
- **權限模式／核准（approval）**：agent 做某些事之前要不要先問你。
- **沙箱（sandbox）**：把 agent 跑的指令關在限制範圍內，例如能寫哪些資料夾、能連哪些網站。
- **token／憑證**：代替帳密的通行碼，誰拿到就能用你的身分做事。
- **長期記憶／脈絡（memory／context）**：agent 每次開工都會讀的東西，例如 `CLAUDE.md`、`AGENTS.md`、規則檔、自動記錄的摘要。
- **最小權限（least privilege）**：只給完成這件事真正需要的權限。
- **最小自主（Least-Agency）**：OWASP 的用語，不需要的自主權就不要給。
- **kill switch**：出事時能立刻停掉的開關。

## 怎麼用這份清單：四步一輪

OWASP 在文件第 7 頁提出 Least-Agency：「avoid unnecessary autonomy; deploying agentic behavior where it is not needed expands the attack surface without adding value。」翻譯：避免不必要的自主；在用不到的地方部署 agent 行為，只會擴大攻擊面、不會增加價值。同一段也強調要看得見它在做什麼（observability）。

我把檢查整理成四步一輪：

1. **盤點**：寫下你用的 agent、它能讀的資料夾、能跑的指令、接了哪些 MCP、手上有哪些 token、有哪些自動化（CI、排程）。
2. **對照**：十題逐一回答是或否；答「是」就代表要修。
3. **修補**：先修「沒人把關、做了就收不回」的項目。
4. **複查**：加了新工具、MCP，或改了設定，就再跑一輪。

![健檢 AI 工作流的四個步驟：盤點、對照、修補、複查，原則是用不到的自主權就別給](audit-loop.webp){: w="1600" h="900" }
_概念圖：盤點、對照、修補、複查圍成一輪；中心原則是最小自主（Least-Agency），用不到的自主權就別給。這四步是本站整理的用法，不是 OWASP 官方流程。_

## 十項總覽

官方清單依 ASI01 到 ASI10 編號。為了好讀，我把十項分成五組：它讀到什麼、它能動什麼、身分與來源、串起來的自動化，以及你自己。這不是 OWASP 的官方分類，編號也不代表哪一項比較嚴重。

![OWASP Agentic Top 10 的十項風險，依「讀到什麼、能動什麼、身分與來源、串起來的自動化、你自己」分五組](map.webp){: w="1600" h="900" }
_概念圖：十項依本站整理分成五組。底部已註明分組不是 OWASP 官方分類，來源是 OWASP Top 10 for Agentic Applications 2026。_

| ID | 英文正式名稱 | 白話名稱 | 一句話 |
| --- | --- | --- | --- |
| ASI01 | Agent Goal Hijack | 目標被劫持 | 讀到的內容改掉它要做的事 |
| ASI02 | Tool Misuse and Exploitation | 工具被誤用 | 合法工具被用在錯的地方 |
| ASI03 | Identity and Privilege Abuse | 身分與權限濫用 | 拿你的身分和鑰匙做事 |
| ASI04 | Agentic Supply Chain Vulnerabilities | 供應鏈 | 裝進來的 MCP、skill 有問題 |
| ASI05 | Unexpected Code Execution (RCE) | 意外執行程式碼 | 它寫的、跑的程式被利用 |
| ASI06 | Memory & Context Poisoning | 記憶與脈絡污染 | 錯的內容寫進長期記憶 |
| ASI07 | Insecure Inter-Agent Communication | agent 間通訊 | 互傳的訊息被冒充或竄改 |
| ASI08 | Cascading Failures | 連鎖失效 | 一個小錯被自動化一路放大 |
| ASI09 | Human-Agent Trust Exploitation | 過度信任 agent | 講得很有把握，你就按了同意 |
| ASI10 | Rogue Agents | 失控的 agent | 偏離任務還持續自己行動 |

## 逐項檢查

每一項都用同一組結構：先白話說明，再對到 coding agent 上常見的樣子，接著一題是／否（「是」就要修），最後寫怎麼修。檢查題和清單圖是同一套意思。官方原文會加引號和連結；情境與修法裡的工具做法，是本站對照，不是 OWASP 替各家工具寫的步驟。

工具的預設權限最近有調整，下面只教你去哪裡看、確認什麼，不以某一天的預設值當作永遠正確。Claude Code 可從 `/permissions`、[permissions](https://code.claude.com/docs/en/permissions)、[security](https://code.claude.com/docs/en/security) 與 [sandboxing](https://code.claude.com/docs/en/sandboxing) 文件確認；Codex 看 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)；Cursor 看 [Agent Security](https://cursor.com/docs/agent/security)。

### ASI01 Agent Goal Hijack：讀到的內容改掉它要做的事

**白話說：** Agent 分不清「你的指令」和「它讀到的內容」，所以網頁、issue、文件裡藏的一段話，就能改掉它要做的事。這就是提示注入。

**在你的 AI 開發環境長這樣：** 放到 coding agent 上，常見的樣子是：你請它讀一篇文件、一個 GitHub issue，或上網查資料，它讀完就直接改檔或跑指令。

**檢查題：** 讀完網頁、issue 或文件後，它能不問你就動手嗎？

**怎麼修：** OWASP 的對策是把所有自然語言輸入都當不可信，並且「requiring human approval for high-impact or goal-changing actions」。讀外部內容時，改用唯讀或 plan 模式；像 `git push`、刪檔這類高影響動作，設成要先問你。細節與案例見[供應鏈篇](/posts/coding-agent-supply-chain-permission-risks/)。

### ASI02 Tool Misuse and Exploitation：合法工具被用在錯的地方

**白話說：** 工具本身是合法的、權限也是你給的，但 agent 用錯地方：刪資料、狂打付費 API，或把資料送出去。

**在你的 AI 開發環境長這樣：** OWASP 有一個直接講 coding agent 的例子：一套被允許自動執行、看起來無害的工具裡包含 ping，攻擊者讓 agent 反覆呼叫，藉 DNS 查詢把資料送出去。

**檢查題：** 有沒有自動放行的工具能刪檔、發送或連網？

**怎麼修：** 自動放行清單只放真的無害、而且不能連網的工具；刪除、發送、發布這類動作要先確認。Claude Code 的規則是依 `deny`、`ask`、`allow` 的順序比對，且 allow 不能蓋過 deny，可用 `/permissions` 檢查目前規則。Cursor 的文件寫：MCP 連線要先核准，每個工具預設仍要再核准，allowlist 只放真正需要的。OWASP 也建議設用量上限（費用、次數或 token 預算）。更完整的權限與自動執行說明，見[供應鏈篇](/posts/coding-agent-supply-chain-permission-risks/)。

### ASI03 Identity and Privilege Abuse：身分與權限濫用

**白話說：** Agent 用的是誰的身分、拿著哪些鑰匙？如果它直接繼承你整個帳號的權限，被騙時就是用「你」的全部權限去做事。

**在你的 AI 開發環境長這樣：** 放到 coding agent 上，常見的樣子是：它能讀到你的 SSH key、雲端憑證、`.env` 裡的長期 token，或直接用你登入 Git 與雲端的身分跑指令。

**檢查題：** 它用的是你的完整帳號、長期 token 或 SSH key 嗎？

**怎麼修：**

- 依 OWASP 對策 1：給任務專用、範圍小、短效的 token，而不是整把長期鑰匙。
- 不要把長期 token 放在 agent 讀得到的地方。Claude Code 可用 deny 規則擋檔案工具讀取，例如官方文件舉的 `Read(./.env)`、`Read(./secrets/**)`，以及 `Read(~/.ssh/**)`。規則寫好後，用 `/permissions` 確認有生效。
- CI 發布若還在放長期 npm token，可改用 OIDC 短期憑證。這是本站的對照例子，不是 OWASP 原文提到的做法，說明見[發 npm 套件不再放長期 token：Trusted Publishing 設定教學](/posts/npm-trusted-publishing-github-actions/)。
- GitHub Actions 可把 workflow 預設權限設成唯讀，例如頂層寫 `permissions: contents: read`，個別 job 真正需要時再打開。作法見 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。

### ASI04 Agentic Supply Chain Vulnerabilities：供應鏈

**白話說：** 你裝的 MCP server、skill、外掛或提示範本，任何一個是假的或被改過，agent 就會照著做。和傳統套件供應鏈不同的是，agent 常在執行當下才載入這些東西。

**在你的 AI 開發環境長這樣：** 清單裡多了一個沒鎖版本、來源也沒看過的 MCP 或 skill。

**檢查題：** 有沒有 MCP、skill 或外掛沒鎖版本、來源沒看過？

**怎麼修：** 先列出你裝了什麼，來源要看過，版本要鎖住。MCP 官方 [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) 提醒：本機 MCP server 和你的帳號權限一樣大，裝之前要看完整、未被截斷的啟動指令，並明確核准。Claude Code 的 [security 文件](https://code.claude.com/docs/en/security) 也寫：只看 `.mcp.json` 看不到這個 session 能載入的全部 server，而且 Anthropic 不稽核 MCP server。鎖版本的細節見[供應鏈篇](/posts/coding-agent-supply-chain-permission-risks/)。

### ASI05 Unexpected Code Execution (RCE)：意外執行程式碼

**白話說：** Agent 會自己寫程式、自己跑指令。如果被騙或寫錯，它跑的就是攻擊者想要的東西，而且是用你電腦上的權限在跑。

**在你的 AI 開發環境長這樣：** OWASP 舉過 vibe coding 工具在工作區執行未經審查的安裝或 shell 指令、把正式資料刪掉或覆寫；也舉過在「修 build」時讓 agent 重建 lockfile，結果拉進被動手腳的小版本。

**檢查題：** 它跑的指令直接在你的主機上，沒有沙箱嗎？

**怎麼修：**

- 依 OWASP 對策：不要讓 agent 直接連到正式環境；能隔離就隔離，檔案系統盡量只開專用工作目錄。若你想把兩個任務徹底分開，也可以參考[讓兩個 AI 分開工作：用 git worktree 開獨立工作目錄](/posts/git-worktree-parallel-ai-agents/)。
- Claude Code 請先看 [sandboxing 文件](https://code.claude.com/docs/en/sandboxing) 與 `/sandbox`，確認沙箱是不是開著。依 2026-11-11 的文件，沙箱預設是關的；開了之後，預設仍讀得到家目錄裡的憑證檔，例如 `~/.ssh`、`~/.aws/credentials`，要另外用 `filesystem.denyRead` 或 `permissions.blockReadsOutsideWorkingDirectories` 收緊。官方專案設定範例是：

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "denyRead": ["~/"],
      "allowRead": ["."]
    }
  }
}
```

文件提醒：若把同一份設定放在 `~/.claude/settings.json`，`.` 會解析成 `~/.claude`，專案檔反而會被擋住。`bypassPermissions` 只應在容器或虛擬機器這類隔離環境使用。

- Codex 請直接核對 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)。官方原文寫：預設關閉網路；本機以作業系統強制的沙箱限制能碰的範圍，通常是目前的 workspace。只讀可執行 `codex --sandbox read-only --ask-for-approval on-request`。
- lockfile 不要讓 agent 隨意重建；需要更新時自己看過再改。

### ASI06 Memory & Context Poisoning：記憶與脈絡污染

**白話說：** 這不是一次性的騙，而是把錯的東西寫進它的記憶，之後每次開新對話都會照著錯的走。

**在你的 AI 開發環境長這樣：** Coding agent 的長期脈絡包括 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules`、自動寫下的 memory 檔，以及跨 session 的摘要。若它能自己改這些檔，而你看不到 diff，污染就會留下。

**檢查題：** 它能自己改 CLAUDE.md、AGENTS.md 或記憶檔，你卻看不到 diff 嗎？

**怎麼修：**

- 依 OWASP 對策 7：把這些檔放進版本控制，改動看 diff 再合併。怎麼寫規則檔，見[AGENTS.md 怎麼寫：讓 Coding Agent 讀懂你的專案規則](/posts/agents-md-project-rules-for-coding-agents/)。
- 依對策 6：不要讓 agent 自動把自己的輸出寫回「可信記憶」。
- Claude Code 可用 `ConfigChange` hook 稽核或擋下工作階段中的設定變更，細節見[把重複檢查自動化：用 Claude Code hooks 做排版、測試與敏感檔提醒](/posts/claude-code-hooks-automate-checks/)。

### ASI07 Insecure Inter-Agent Communication：agent 間通訊

**白話說：** 好幾個 agent 互相傳話時，如果訊息沒有驗證身分、也沒有防竄改，別人就能冒充或改掉其中一句。

**在你的 AI 開發環境長這樣：** 這項主要針對多個 agent 互相溝通的系統。只用一個 agent 的人，大多可以先跳過。會碰到的情況包括：subagent 互傳結果、遠端 MCP、或 CI 裡一個 agent 的輸出直接當另一個 agent 的輸入。

**檢查題：** 一個 agent 的輸出，會被另一個 agent 直接照著做嗎？

**怎麼修：** 遠端 MCP 只用 HTTPS，而且連線要驗證。另一個 agent 的輸出，要當成還沒審過的輸入，不要直接照做。

### ASI08 Cascading Failures：連鎖失效

**白話說：** 一個小錯沒被擋下來，被下一步自動接手、放大，最後變成大事故。重點是錯誤怎麼一路傳下去，不一定是錯從哪裡來。

**在你的 AI 開發環境長這樣：** 常見的樣子是 AI 寫、AI 審、自動合併、自動部署，中間沒有人或不能略過的檢查點。OWASP 也提到「Governance drift cascade」：連續成功之後放寬審查，錯誤的設定就會一路擴散。

**檢查題：** 從寫程式到合併、部署，有一段完全沒有人或檢查擋著嗎？

**怎麼修：** 合併或部署前，至少留一個不能略過的檢查點，可以是人，也可以是必過的 CI。GitHub 文件說明可以設定，不讓 GitHub Actions 建立或核准 pull request，見 [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)。若你本來就在用 AI 幫 PR 做審查，可一併看[用 GitHub Actions 加 AI Agent 自動化審查：以本站 PR 為例](/posts/github-actions-ai-agent-pr-review/)，重點是審查結果不要自動變成不可撤銷的合併。第三方 actions 請鎖定依賴：GitHub 目前最推薦用 workflow 依賴 lockfile（`.github/workflows/actions.lock`），否則把 action pin 到完整的 commit SHA，說明見 [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)。

### ASI09 Human-Agent Trust Exploitation：過度信任 agent

**白話說：** Agent 講得很有把握、理由很完整，你就按了「同意」。最後動手的是你，紀錄上也是你。

**在你的 AI 開發環境長這樣：** OWASP 的「Helpful Assistant Trojan」例子是：被動手腳的 coding assistant 建議一行漂亮的修正，你貼上後卻跑了惡意指令。另一種日常風險是審批疲勞：提示一直跳，看久了就直接按允許。

**檢查題：** 你常常沒細看就按「允許」嗎？

**怎麼修：** 高風險動作要先看 diff 或完整指令再按。Claude Code 的 [security 文件](https://code.claude.com/docs/en/security) 寫：You're responsible for reviewing proposed code and commands for safety before approval。不要讓 agent 自己的說明取代你的判斷；OWASP 對策 4 要求「plain-language risk summary (not model-generated rationales)」，也就是用白話風險摘要，而不是模型自己編的理由。把你確實認為可自動跑的少數指令寫進 allow，其他保留 ask，減少沒意義的提示。設定前先看各工具怎麼說明「核准疲勞」或 allowlist，不要只靠分類器當已經有人審過。

### ASI10 Rogue Agents：失控的 agent

**白話說：** Agent 開始做不是你交代的事，而且持續做下去。可能是被入侵後，也可能是為了達成目標去鑽漏洞。

**在你的 AI 開發環境長這樣：** 例如它為了「降低成本」而刪掉備份，或在被注入之後，即使惡意來源已經拿掉，仍繼續把資料送出去。對個人開發者來說，重點是：出事時你知不知道怎麼立刻停下來。

**檢查題：** 它出錯時，你說不出怎麼馬上停掉它、撤銷它的 token 嗎？

**怎麼修：** 先準備個人版的 kill switch：知道怎麼中斷目前的 session、撤銷它在用的 token、關掉排程或背景任務。長時間無人看管的任務，要限定範圍和時間。OWASP 對策 4 寫要有「kill-switches and credential revocation」；對策 6 寫「Keys must never be directly available to agents」，鑰匙不該直接交給 agent。

## 可複製的檢查清單

下面這份清單可以複製到自己的筆記。題目和圖上的十題是同一套意思；答「是」就是要修的地方。

![OWASP Agentic Top 10 的 10 題是／否自我檢查，答「是」的項目就是要修的地方](checklist.webp){: w="1600" h="900" }
_概念圖：十題是／否自我檢查。這十題是本站依官方十項整理的，不是 OWASP 發布的官方考卷。_

**盤點**

- [ ] 我用哪些 coding agent？
- [ ] 它能讀哪些資料夾、能跑哪些指令？
- [ ] 接了哪些 MCP、skill 或外掛？來源和版本我看過嗎？
- [ ] 它拿得到哪些 token、SSH key 或雲端憑證？
- [ ] 有哪些自動化會接著跑，例如 CI、排程、背景任務？

**十題（答「是」就要修）**

- [ ] ASI01　讀完網頁、issue 或文件後，它能不問你就動手嗎？
- [ ] ASI02　有沒有自動放行的工具能刪檔、發送或連網？
- [ ] ASI03　它用的是你的完整帳號、長期 token 或 SSH key 嗎？
- [ ] ASI04　有沒有 MCP、skill 或外掛沒鎖版本、來源沒看過？
- [ ] ASI05　它跑的指令直接在你的主機上，沒有沙箱嗎？
- [ ] ASI06　它能自己改 CLAUDE.md、AGENTS.md 或記憶檔，你卻看不到 diff 嗎？
- [ ] ASI07　一個 agent 的輸出，會被另一個 agent 直接照著做嗎？
- [ ] ASI08　從寫程式到合併、部署，有一段完全沒有人或檢查擋著嗎？
- [ ] ASI09　你常常沒細看就按「允許」嗎？
- [ ] ASI10　它出錯時，你說不出怎麼馬上停掉它、撤銷它的 token 嗎？

**每次加新工具後**

- [ ] 又接了 MCP、skill，或改了權限、CI、排程之後，再從頭跑一輪盤點與十題。

## 先修哪幾項

這是本站建議的順序，不是 OWASP 官方的優先級：先處理沒有人把關、而且做了就收不回的（ASI08，以及 ASI05 裡直接碰到正式環境的部分），再處理長期憑證（ASI03），然後是自動放行與 MCP（ASI02、ASI04），最後才是其餘項目。ASI07 若你只用一個 agent，可以先跳過。

## 什麼情況怎麼做

| 情況 | 建議 |
| --- | --- |
| 只用一個 agent、沒接 MCP | 仍要做盤點與十題；ASI07 大多可先跳過，其他項仍然適用 |
| 接了好幾個 MCP | 先清 ASI04 與 ASI02：來源、鎖版本、每個工具預設要核准 |
| 讓 agent 長時間自己跑 | 收緊 ASI05、ASI08、ASI10：隔離執行、設時間與範圍、先寫下停機與撤銷步驟 |
| agent 會讀網頁或 issue | 重看 ASI01 與 ASI09：外部內容當不可信，高影響動作要人看過 |
| CI 裡有 agent 自動審查或合併 | 重看 ASI08：合併前要有不能略過的檢查點 |
| 團隊共用設定 | 規則檔與權限設定放 git，改動看 diff（ASI06）；不要把長期憑證寫進共用檔 |
| 懷疑 agent 已經做了怪事 | 先用 ASI10 的方式停掉並撤銷憑證，再回頭查記錄與 diff |

## 常見誤解

- 「開了沙箱就讀不到 SSH key。」依 Claude Code 2026-11-11 的 sandboxing 文件，沙箱開了之後，預設仍讀得到 `~/.ssh`、`~/.aws/credentials`，要另外設 `denyRead` 或擋住工作目錄以外的讀取。請以你現在打開的官方文件為準。
- 「Auto mode 或 Auto-review 分類器等於有人審過。」Cursor 的 [Agent Security](https://cursor.com/docs/agent/security) 寫：Run Modes 是 best-effort guardrails，不是硬性安全邊界。Claude Code 的起始權限模式也請用 `/permissions` 與官方文件確認，不要假定分類器已經替你負責。
- 「ASI01 是最危險的。」編號不是嚴重度排名，OWASP 沒有為這十項打分數。
- 「我只用一個 agent，Top 10 和我無關。」大多數項目仍然適用；比較常能先跳過的是 ASI07。
- 「勾完就安全。」沒有這回事。OWASP 給的是可著手的對策；Claude Code 的 [security 文件](https://code.claude.com/docs/en/security) 也寫「no system is completely immune to all attacks」。這份十題是檢查起點，不是做完就結束的保證。

## 結論與下一步

今天先做盤點、把十題答完，再依「做了就收不回」的項目開始修；把規則和權限設定放進 git，之後每加一個工具就再跑一輪。自動化檢查可看[hooks 篇](/posts/claude-code-hooks-automate-checks/)，規則檔可看[AGENTS.md 篇](/posts/agents-md-project-rules-for-coding-agents/)，CI 上的短期憑證可看[npm Trusted Publishing 篇](/posts/npm-trusted-publishing-github-actions/)。

官方來源是 OWASP GenAI Security Project 的〈[OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)〉（[PDF](https://genai.owasp.org/download/52117/)，CC BY-SA 4.0）。工具文件可看 [Claude Code permissions](https://code.claude.com/docs/en/permissions)、[sandboxing](https://code.claude.com/docs/en/sandboxing)、[security](https://code.claude.com/docs/en/security)、[Codex Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)、[Cursor Agent Security](https://cursor.com/docs/agent/security)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)，以及 [GitHub Actions Secure use](https://docs.github.com/en/actions/reference/security/secure-use)。
