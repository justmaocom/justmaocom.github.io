---
title: "自己寫 Agent Skill：從 SKILL.md 結構到觸發測試與維護"
description: "想自己寫 Agent Skill？從 SKILL.md 的欄位規則、能被正確觸發的 description，到拆分參考檔與腳本、觸發測試、跨 agent 檢查與版本維護，用一個實際跑過的範例走一遍。"
date: 2026-10-17 23:10:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, skill-authoring, testing, claude-code, codex, cursor]
media_subpath: /assets/img/posts/agent-skill-authoring-guide/
image:
  path: cover.png
  alt: "skill 好不好用，先看 description 能否在對的時候被選中，再用腳本與測試確認輸出，每次改版都重跑。"
---

每次請 AI 幫忙改部落格文章，我都要再貼一次同一串規則：英文標題不能超過 70 個字元、日期要帶 `+0800`、封面圖說要寫成一句話的摘要……貼到第五次，就會開始想：能不能讓它自己記得？

Agent Skill 就是做這件事的。這篇從「寫 skill 的人」的角度出發：什麼時候值得寫、檔案怎麼放、description 怎麼寫才會在對的時候被叫出來、怎麼測、換一個 agent 還能不能用，以及之後怎麼維護。過程中我會實際做一個檢查本站文章 front matter 的 skill。

這篇不教怎麼安裝別人寫好的 skill。想先用現成的，可以從 [mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)開始。

> 規範和各家工具的說法，都依 2026 年 10 月 17 日查閱的官方文件。這些文件網址沒有版本號，內容會更新，用之前請再對照一次。
>
> 範例 skill 的檢查在 2026 年 10 月 17 日實際執行，使用 skills-ref 0.1.0（agentskills/agentskills commit `69ef37e`）與 Python 3.13.5，文中的指令和輸出都是當時跑出來的。**觸發率測試和輸出品質評測沒有實跑**，原因寫在「分三層測試」一節。
{: .prompt-info }

## 先認識幾個詞

| 詞 | 一句話解釋 |
| --- | --- |
| Skill | 一個資料夾，核心是給 AI 看的說明檔 `SKILL.md`，也可以附腳本和參考資料。 |
| Front matter | 檔案最上面兩條 `---` 之間的設定區。`SKILL.md` 和本站的文章都有。 |
| YAML | 一種用「名稱: 值」一行一行寫設定的格式，front matter 就是用它寫的。 |
| Context window | AI 一次能看到的文字量上限。常駐的東西越多，留給工作的空間就越少。 |
| Token | AI 計算文字長度的單位。字越多，token 就越多。 |

## 什麼時候值得寫成 Skill

Claude Code 的文件給了一個很實際的判準：你一直把[同一段指示、檢查清單或多步驟流程貼進對話](https://code.claude.com/docs/en/skills)，或是 `CLAUDE.md` 裡某一段已經從「事實」長成了「流程」，就該寫成 skill。

差別在載入的時機。`CLAUDE.md` 每次對話都會讀進去；skill 的本文只在用到時才載入。同一份文件也寫明，長篇參考資料在用到之前幾乎不佔成本。`AGENTS.md` 也是常駐的，每一行都有成本，[系列第 6 篇](/posts/mattpocock-skills-research-handoff/)談過這一點。

反過來，也有不必寫的時候。agentskills.io 的[最佳實踐](https://agentskills.io/skill-creation/best-practices)講得很直接：如果 agent 沒有這個 skill 也能把整件事做好，這個 skill 可能沒有價值。Anthropic 的[撰寫指南](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)建議先做評測：讓 AI 在沒有 skill 的情況下做幾次代表性的任務，記下它具體錯在哪裡，再寫剛好能補上這些缺口的指示。

拿我的例子來說，AI 本來就懂 YAML，也知道 Jekyll 是什麼，但它不知道「本站英文標題上限 70 字元」「封面圖說不能以『封面：』開頭」這種只屬於這個專案的規則。這正是 skill 該補的東西。

至於「寫給 AI 看的文件」通用的寫作原則，像是指引句怎麼寫、常用的放前面、刪掉多餘的句子，系列第 6 篇的 [`writing-for-agents` 一節](/posts/mattpocock-skills-research-handoff/)已經整理過，這裡不再重複，只談 skill 特有的機制。

## 一個 Skill 的最小結構

依 [Agent Skills 規範](https://agentskills.io/specification)，一個 skill 最少只要一個資料夾，裡面放一個 `SKILL.md`。其他都是選用的：`scripts/` 放可以執行的程式，`references/` 放需要時才讀的文件，`assets/` 放範本、圖片這類資源。

`SKILL.md` 的開頭是 YAML front matter，後面接 Markdown 本文。最小的寫法長這樣：

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

規範裡的欄位只有六個：

| 欄位 | 必填 | 規則 |
| --- | --- | --- |
| `name` | 是 | 1–64 字元；只能用小寫英文字母、數字和 `-`；不能以 `-` 開頭或結尾；不能有連續的 `--`；**必須和上層資料夾同名** |
| `description` | 是 | 1–1024 字元；要寫這個 skill 做什麼，以及什麼時候用 |
| `license` | 否 | 授權名稱，或附在 skill 裡的授權檔名 |
| `compatibility` | 否 | 1–500 字元；寫環境需求，例如需要哪些系統套件。規範說多數 skill 不需要 |
| `metadata` | 否 | 字串對字串的對應表，放規範沒定義的額外資訊 |
| `allowed-tools` | 否 | 以空白分隔的預先核准工具清單；**實驗性**，各家支援程度不同 |

各家工具在這之上還有自己的規定：

- **Anthropic 平台**：[`name` 不能含 XML 標籤，也不能含保留字 `anthropic`、`claude`；`description` 不能含 XML 標籤](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure)。
- **Claude Code**：[所有欄位都是選填](https://code.claude.com/docs/en/skills)，沒寫 `name` 就用資料夾名稱；欄位名稱打錯或不認得，會直接忽略，不會報錯；YAML 解析失敗時 skill 仍會載入，只是所有欄位都是空的。
- **claude.ai 上傳與 Skills API**：同一份文件寫明，這兩條路只接受規範的六個欄位，多一個就直接報錯：

```text
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name
```

把這三條放在一起看就知道麻煩在哪：在 Claude Code 裡寫錯，沒有人會提醒你；等你想把同一個 skill 上傳到別的地方，才會出錯。所以最穩的做法是**只用規範的六個欄位**，這也是後面「換一個 agent 還能用嗎」的基礎。

## Description 決定它會不會被叫出來

agent 啟動時，不會把每個 skill 都讀完。依[規範的漸進式揭露](https://agentskills.io/specification#progressive-disclosure)，它只先載入每個 skill 的 `name` 和 `description`，等任務看起來對得上，才去讀整份 `SKILL.md`。agentskills.io 的 [description 最佳化指南](https://agentskills.io/skill-creation/optimizing-descriptions)說得更直接：觸發與否，整個落在 description 身上。

同一份指南還提到一個容易忽略的地方：agent 通常只在自己做不到的任務才會去找 skill。像「讀這個 PDF」這種一步就能做完的請求，就算 description 完全吻合，也可能不觸發，因為 agent 用基本工具就做得到。

### 兩份文件，兩種寫法

關於 description 該怎麼寫，兩份官方文件的說法不一樣，我照實列出來：

- **agentskills.io**（[最佳化指南](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)）：用祈使語氣，寫成對 agent 的指示，例如「Use this skill when...」，而不是「This skill does...」；寫使用者想達成什麼，而不是 skill 內部怎麼做；主動列出適用情境，包括使用者沒講出領域名稱的時候；保持精簡。
- **Anthropic**（[撰寫指南](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#writing-effective-descriptions)）：一律用第三人稱，例如「Processes Excel files and generates reports」，避免「I can help you...」或「You can use this to...」。理由是 description 會被放進系統提示，視角不一致可能影響 skill 被找到。

這兩種寫法其實是互相衝突的：agentskills.io 明說要寫「Use this skill when...」，而不是「This skill does...」；Anthropic 的例子卻正是「Processes Excel files...」這種第三人稱的句子。我的範例用的是折衷寫法，這是我自己的選擇，不是哪份文件的建議：第一句用第三人稱說它做什麼，第二句用「Use this skill when...」列出情境，最後一句寫明什麼時候不用：

```yaml
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
```

最後那句「Do not use it for...」也有出處：最佳化指南建議，如果不該觸發的查詢一直誤觸發，就補上 skill **不**做什麼，把它和相鄰的能力分開。

### 長度要算預算

description 上限是 1024 字元，但實際能用的空間通常更小，因為所有 skill 的清單要一起擠進 context window：

| 工具 | 清單預算 | 超出時 |
| --- | --- | --- |
| Claude Code | 整份清單佔 context window 的 1%；每個 skill 的 `description` 加 `when_to_use` 在清單裡截在 1,536 字元（[文件](https://code.claude.com/docs/en/skills)） | 從最少用到的 skill 開始拿掉 description |
| Codex | 初始清單最多佔 context window 的 2%，不知道 context window 大小時是 8,000 字元（[文件](https://learn.chatgpt.com/docs/build-skills)） | 先縮短 description；skill 很多時可能整個略過，並顯示警告 |

兩家都建議**把關鍵用途放在最前面**，被截斷時還留得住最重要的那幾個字。我的 description 是 484 字元，三段的順序就是照這個原則排的。

## 一個 Skill 只做一件事

[agentskills.io](https://agentskills.io/skill-creation/best-practices#design-coherent-units) 用函式來比喻：一個 skill 應該是一個完整的工作單位。切得太細，一個任務要同時載入好幾個 skill，指示可能互相打架；切得太粗，就很難在對的時候被精準叫出來。Codex 的文件也只寫了一句：[Keep each skill focused on one job](https://learn.chatgpt.com/docs/build-skills#best-practices)。

我的範例只管一件事：檢查文章的 front matter，有問題就修到通過。翻譯、產生封面、改內文錯字，都不在它的範圍裡。

命名方面，Anthropic [建議用動名詞](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#naming-conventions)，例如 `processing-pdfs`，名詞片語（`pdf-processing`）也可以接受；要避開 `helper`、`utils` 這種看不出在做什麼的名字。所以範例叫 `checking-post-front-matter`。

### 誰能啟動它

有些 skill 不該讓 AI 自己決定什麼時候跑。各家的開關不一樣：

| 工具 | 設定 | 效果 |
| --- | --- | --- |
| Claude Code | `disable-model-invocation: true` | Claude 不會自己啟動，只能你輸入 `/名稱` 叫它（[文件](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)） |
| Claude Code | `user-invocable: false` | 你不能用 `/名稱` 叫它，只有 Claude 能啟動 |
| Cursor | `disable-model-invocation: true` | 只有明確輸入 `/skill-name` 時才載入（[文件](https://cursor.com/docs/skills#disabling-automatic-invocation)） |
| Codex | `agents/openai.yaml` 裡的 `policy.allow_implicit_invocation: false` | 不會依提示自動啟動，仍可用 `$skill` 明確叫用（[文件](https://learn.chatgpt.com/docs/build-skills#optional-metadata)） |

Claude Code 的文件建議，有副作用或你想自己控制時機的流程，例如 `/commit`、`/deploy`，就設成只能手動，因為你不會想讓 Claude 覺得「程式看起來好了」就自己去部署。實際的例子可以看[系列第 4 篇的 `implement`](/posts/mattpocock-skills-implementation-feedback-loops/)，它同時設了 Claude Code 和 Codex 兩種開關。

這裡有一個要注意的取捨：`disable-model-invocation` 和 `user-invocable` 都不在規範的六個欄位裡。寫進 `SKILL.md`，在 Claude Code 和 Cursor 有效，但 claude.ai 上傳和 Skills API 會拒收，後面的 `skills-ref` 檢查也會報錯。Codex 把同樣的設定放在另一個檔案 `agents/openai.yaml`，`SKILL.md` 本身就能維持只有規範欄位。我的範例只讀檔、不改任何東西，讓 AI 自己決定要不要用沒有風險，所以兩種開關都沒設。

## 把細節拆到參考檔與腳本

![漸進式揭露三層：name 與 description 在啟動時就載入，SKILL.md 本文在觸發時才讀，參考檔和腳本只在需要時才用](progressive-disclosure.png){: width="800" height="450" }
_同一個 skill 分三層載入：越往下越大，但越晚才進入 context window。_

[規範](https://agentskills.io/specification#progressive-disclosure)把一個 skill 分成三層：

1. **Metadata**（約 100 tokens）：`name` 和 `description`，啟動時就載入所有 skill 的這一層。
2. **本文**（建議少於 5000 tokens）：整份 `SKILL.md`，skill 被啟動時才讀。
3. **資源**：`scripts/`、`references/`、`assets/` 裡的檔案，需要時才載入。

規範也建議 `SKILL.md` 主檔控制在 500 行以內，檔案引用只往下一層。Anthropic 的撰寫指南解釋了原因：Claude 讀到「被引用的檔案裡又引用了別的檔案」時，[可能只用 `head -100` 這類指令看前幾行](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-deeply-nested-references)，結果讀到不完整的資訊。所以參考檔都要直接從 `SKILL.md` 連過去；超過 100 行的參考檔，開頭要放一份目錄。

光把檔案拆開還不夠，還要寫明**什麼時候**讀哪個檔。agentskills.io 的例子是「[API 回傳非 200 時，讀 `references/api-errors.md`](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)」，這比「詳見 references/」有用得多。我的範例是這樣寫的：

```markdown
Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.
```

### 腳本是拿來執行的

腳本和參考檔最大的不同：依 [Anthropic 的說明](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#level-3-resources-and-code-loaded-as-needed)，腳本是透過 bash 執行的，程式碼本身不會進入 context，只有輸出會佔 token。撰寫指南也提醒，要在指示裡[寫清楚是「執行它」還是「當參考讀」](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#provide-utility-scripts)。

能用程式檢查的規則，就不要用文字叫 AI 自己判斷。我的範例把八條規則全寫進腳本，`SKILL.md` 只告訴 AI 怎麼跑、怎麼讀結果。腳本照 [agentskills.io 的腳本指南](https://agentskills.io/skill-creation/using-scripts#designing-scripts-for-agentic-use)設計：

| 指南的要求 | 範例怎麼做 |
| --- | --- |
| 不能有互動式提問（agent 跑的是非互動 shell，等輸入會一直卡住） | 所有輸入都用參數給，沒給路徑就直接報錯退出 |
| 提供 `--help` | `--help` 列出參數、輸出格式、exit code 和範例 |
| 錯誤訊息要說清楚哪裡錯、該怎麼改 | 例如 `--now needs a UTC offset, e.g. +08:00` |
| 資料輸出到 stdout，診斷訊息輸出到 stderr | 結果是一個 JSON 物件；「正在檢查哪個檔」寫到 stderr |
| exit code 有意義，並寫在 `--help` 裡 | 0 通過、1 有問題、2 用法錯誤 |
| 輸出長度可以預期 | 預設只列出有問題的檔案，加 `--all` 才列全部 |

實際的 `--help` 輸出：

```console
$ python3 scripts/check_front_matter.py --help
Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language comes from the folder right after _posts/: en -> en,
zh-CN -> zh-CN, anything else -> zh-TW. Outside _posts/, only the file's
parent folder counts. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
```

### 依賴要寫明

腳本指南也建議[在 `SKILL.md` 寫明前置需求](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，不要假設 agent 的環境已經裝好；執行階段的需求可以寫在 `compatibility` 欄位。用 `npx` 這類一次性指令時要鎖版本，例如寫 `npx eslint@9.0.0`。Anthropic 的撰寫指南也有一節就叫「[不要假設工具已經安裝](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-assuming-tools-are-installed)」。

我跑範例的機器上，`python3` 沒有裝 PyYAML，所以腳本只用標準函式庫，只解析需要的那幾個欄位。這個限制寫進了 `compatibility` 和 Gotchas。如果改用 PyYAML，就要用 [PEP 723](https://peps.python.org/pep-0723/) 在腳本裡宣告依賴，並在 `SKILL.md` 寫明怎麼執行。

## 實作：寫一個檢查文章 Front Matter 的 Skill

範例的完整結構：

```console
$ find checking-post-front-matter -type f | sort
checking-post-front-matter/SKILL.md
checking-post-front-matter/evals/evals.json
checking-post-front-matter/evals/files/2026-10-01-bad-zh.md
checking-post-front-matter/evals/files/en/2026-10-01-bad-en.md
checking-post-front-matter/evals/files/en/2026-10-01-good-en.md
checking-post-front-matter/evals/files/en/2026-10-01-no-image-en.md
checking-post-front-matter/evals/trigger-queries.json
checking-post-front-matter/references/site-rules.md
checking-post-front-matter/scripts/check_front_matter.py
```

`evals/` 是測試用的檔案，後面「分三層測試」會用到。下面是每個檔案的完整內容。

### SKILL.md

````markdown
---
name: checking-post-front-matter
description: Checks the front matter of Chirpy blog posts in this repo against the site's rules (required fields, English title and description length, date offset, category depth, cover image alt text). Use this skill after writing or editing a post under _posts/, before opening a PR for a post, or when the user asks whether a post's title, description, date or cover alt is OK, even if they don't say "front matter". Do not use it for typo fixes in the post body or for general YAML questions.
compatibility: Requires python3 (tested with 3.13). Standard library only, no PyYAML.
metadata:
  version: "1.0"
---

# Checking Post Front Matter

## Steps

1. Run the checker on the files you changed, from the skill directory:
   `python3 scripts/check_front_matter.py <post file or directory> ...`
   For a new post, pass all three language files (`_posts/`, `_posts/zh-CN/`, `_posts/en/`).
2. Read the JSON on stdout. Exit code 0 means every file passed, 1 means
   at least one problem, 2 means the command itself was wrong (see stderr).
3. Fix each problem in the post, then run the checker again. Stop only when
   it exits 0.
4. Tell the user which files you checked and what you changed. If you
   shortened a title or description, show the old and new text.

Read `references/site-rules.md` when a problem's `rule` is unclear to you, or
when the user asks why a rule exists. Do not read it on every run.

## Gotchas

- The script uses only the Python standard library, so it parses a small
  subset of YAML: one-line `key: value` pairs, `image:` with indented
  `path` / `alt`, and `categories` as `[a, b]` or a `- item` list. A block
  scalar (`|` or `>`) is reported as a `yaml` problem. Rewrite that value
  on one line instead of installing PyYAML.
- Language comes from the folder right after `_posts/`: `en/` is English,
  `zh-CN/` is Simplified Chinese, anything else is Traditional Chinese.
  Outside `_posts/` only the parent folder counts; use `--lang` if unsure.
- `date-future` compares with the machine clock. Jekyll skips future posts
  at build time, so do not "fix" it by building with `--future`; move the
  date to a time that has already passed.
- Lengths count Unicode characters (Python `len`), so one Chinese character
  counts as 1.
- The checker never edits files. Make the fixes yourself.
````

步驟只有四步，第 3 步是 agentskills.io 說的[驗證迴圈](https://agentskills.io/skill-creation/best-practices#validation-loops)：做完就跑檢查，有錯就改，改完再跑，直到通過為止。

Gotchas 是 agentskills.io 認為很多 skill 裡[最有價值的部分](https://agentskills.io/skill-creation/best-practices#gotchas-sections)：不是一般建議，而是「不講 AI 就一定會做錯」的具體事實。像「日期在未來就不要用 `--future` 硬 build」這條，來自本站上一篇系列導讀的實際經驗：日期設得比 build 時間晚，Jekyll 就直接跳過了那篇文章。

### references/site-rules.md

```markdown
# Site Rules Behind Each Check

Each `rule` in the checker's output maps to one rule below.

| rule | What it enforces | Why |
| --- | --- | --- |
| `required` | `title`, `description` and `date` exist and are not empty | Chirpy uses them for the post page, home cards and SEO metadata |
| `length` | English `title` ≤ 70 characters, `description` ≤ 160 | Longer text gets cut off in search results and cards |
| `date-format` | `YYYY-MM-DD HH:MM:SS +0800` (any `+/-HHMM` offset) | Writing the offset keeps the publish day the same on every machine and in CI |
| `date-future` | `date` is not later than now | Jekyll does not build posts dated in the future |
| `categories` | At most 2 entries | Chirpy's category hierarchy has two levels |
| `alt` | Checked only when the post has a cover (`image`): `image.alt` exists; Chinese ≤ 60 characters, English ≤ 140; does not start with 「封面：」 or 「本文」; differs from `description` | Chirpy uses the alt as the cover's alt text, the caption under the cover and the home card's alt text, so it should be a one-sentence summary of the post |
| `yaml` | The value could be read by the checker's YAML subset | See the Gotchas in SKILL.md |
| `front-matter` | The file starts with a `---` block and closes it | Without it, Jekyll treats the file as having no front matter |

Source: the repo's `docs/chirpy-post-authoring.md`.
```

### scripts/check_front_matter.py

```python
#!/usr/bin/env python3
"""Check Chirpy post front matter against this site's rules.

Usage: python3 scripts/check_front_matter.py [OPTIONS] PATH [PATH ...]

PATH can be a post file or a directory (all *.md files under it are checked).
The language comes from the folder right after _posts/: en -> en,
zh-CN -> zh-CN, anything else -> zh-TW. Outside _posts/, only the file's
parent folder counts. Use --lang to override it for every file.

Options:
  --lang {zh-TW,zh-CN,en}  Treat every file as this language
  --now ISO_TIME           Compare dates against this time instead of now,
                           e.g. 2026-10-17T23:00:00+08:00
  --all                    List passing files too (default: failures only)
  -h, --help               Show this help and exit

Output: one JSON object on stdout; progress notes go to stderr.
Exit codes:
  0  every file passed
  1  at least one file has a problem
  2  usage error (bad option, missing path, no .md files found)

Examples:
  python3 scripts/check_front_matter.py _posts/en/2026-10-17-my-post.md
  python3 scripts/check_front_matter.py --all _posts
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

LIMITS = {"en": {"title": 70, "description": 160, "alt": 140},
          "zh-TW": {"alt": 60}, "zh-CN": {"alt": 60}}
BAD_ALT_PREFIXES = ("封面：", "封面:", "本文")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$")


class UsageError(Exception):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise UsageError(f"{message}; run with --help to see the options")


def unquote(raw):
    """Return the scalar value of a one-line YAML value (subset only)."""
    v = raw.strip()
    if not v:
        return ""
    if v[0] == '"':
        end = v.rfind('"')
        if end == 0:
            raise ValueError("unclosed double quote")
        return json.loads(v[: end + 1])  # YAML double quotes ~ JSON escapes
    if v[0] == "'":
        end = v.rfind("'")
        if end == 0:
            raise ValueError("unclosed single quote")
        return v[1:end].replace("''", "'")
    if v[0] in "|>":
        raise ValueError("block scalars (| or >) are not supported")
    return re.sub(r"\s+#.*$", "", v)


def parse_list(raw):
    v = raw.strip()
    if not (v.startswith("[") and v.endswith("]")):
        return None
    inner = v[1:-1].strip()
    return [unquote(x) for x in inner.split(",")] if inner else []


def read_front_matter(text):
    """Parse the keys this checker needs. Returns (fields, problems)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, [("front-matter", "", "file does not start with a --- line")]
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return None, [("front-matter", "", "no closing --- line")]
    fields, problems, parent = {}, [], None
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"^(\s*)([A-Za-z_][\w-]*):(.*)$", line)
        if not m:
            if parent == "categories" and line.strip().startswith("- "):
                fields["categories"].append(unquote(line.strip()[2:]))
            continue
        indent, key, value = m.groups()
        key = key if not indent else f"{parent}.{key}"
        if not indent:
            parent = key
        try:
            if key == "categories":
                lst = parse_list(value)
                fields[key] = lst if lst is not None else []
            elif value.strip():
                fields[key] = unquote(value)
        except ValueError as e:
            problems.append(("yaml", key, f"line {n}: {e}"))
    return fields, problems


def lang_of(path, forced):
    if forced:
        return forced
    parts = path.resolve().parts
    if "_posts" in parts:
        last = len(parts) - 1 - parts[::-1].index("_posts")
        folder = parts[last + 1] if last + 2 < len(parts) else ""
    else:
        folder = path.resolve().parent.name
    return folder if folder in ("en", "zh-CN") else "zh-TW"


def check(path, lang, now):
    probs = []
    fields, parse_probs = read_front_matter(path.read_text(encoding="utf-8"))
    probs += parse_probs
    if fields is None:
        return probs
    for key in ("title", "description", "date"):
        if not fields.get(key):
            probs.append(("required", key, f"'{key}' is missing or empty"))
    lim = LIMITS[lang]
    for key in ("title", "description"):
        if key in lim and fields.get(key) and len(fields[key]) > lim[key]:
            probs.append(("length", key,
                          f"{len(fields[key])} characters, limit is {lim[key]} for {lang}"))
    date = fields.get("date")
    if date:
        m = DATE_RE.match(date)
        if not m:
            probs.append(("date-format", "date",
                          f"'{date}' must look like YYYY-MM-DD HH:MM:SS +0800"))
        else:
            when = datetime.strptime(date, "%Y-%m-%d %H:%M:%S %z")
            if when > now:
                probs.append(("date-future", "date",
                              f"{date} is later than {now.isoformat(timespec='seconds')}; "
                              "Jekyll skips future posts at build time"))
    cats = fields.get("categories")
    if cats is not None and len(cats) > 2:
        probs.append(("categories", "categories",
                      f"{len(cats)} levels, Chirpy supports at most 2"))
    has_image = any(k == "image" or k.startswith("image.") for k in fields)
    alt = fields.get("image.alt")
    if has_image and not alt:
        probs.append(("alt", "image.alt",
                      "'image.alt' is missing or empty; posts with an image need one"))
    elif alt:
        if len(alt) > lim["alt"]:
            probs.append(("alt", "image.alt",
                          f"{len(alt)} characters, limit is {lim['alt']} for {lang}"))
        if alt.startswith(BAD_ALT_PREFIXES):
            probs.append(("alt", "image.alt",
                          "must not start with 「封面：」 or 「本文」; write a one-sentence summary"))
        if alt == fields.get("description"):
            probs.append(("alt", "image.alt", "is identical to 'description'"))
    return probs


def main(argv):
    ap = Parser(add_help=False)
    ap.add_argument("-h", "--help", action="store_true")
    ap.add_argument("--lang", choices=sorted(LIMITS))
    ap.add_argument("--now")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("paths", nargs="*")
    args = ap.parse_args(argv)
    if args.help:
        print(__doc__.strip())
        return 0
    if not args.paths:
        raise UsageError("give at least one post file or directory, "
                         "e.g. python3 scripts/check_front_matter.py _posts/en")
    try:
        now = (datetime.fromisoformat(args.now) if args.now
               else datetime.now().astimezone())
    except ValueError:
        raise UsageError(f"--now must be an ISO time such as "
                         f"2026-10-17T23:00:00+08:00, got '{args.now}'")
    if now.tzinfo is None:
        raise UsageError("--now needs a UTC offset, e.g. +08:00")
    files = []
    for p in map(Path, args.paths):
        if p.is_dir():
            files += sorted(p.rglob("*.md"))
        elif p.is_file():
            files.append(p)
        else:
            raise UsageError(f"path not found: {p}")
    if not files:
        raise UsageError("no .md files found in the given paths")
    results, failed = [], 0
    for f in files:
        lang = lang_of(f, args.lang)
        print(f"checking {f} as {lang}", file=sys.stderr)
        probs = check(f, lang, now)
        failed += bool(probs)
        if probs or args.all:
            results.append({"file": str(f), "lang": lang, "ok": not probs,
                            "problems": [{"rule": r, "field": k, "message": m}
                                         for r, k, m in probs]})
    print(json.dumps({"checked": len(files), "failed": failed, "results": results},
                     ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except UsageError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
```

### 跑一次

對 `evals/files/` 裡的四個測試檔跑一次。其中兩個是故意寫錯的；另外兩個是正確的，一個有封面、一個沒有封面：

```console
$ python3 scripts/check_front_matter.py evals/files
checking evals/files/2026-10-01-bad-zh.md as zh-TW
checking evals/files/en/2026-10-01-bad-en.md as en
checking evals/files/en/2026-10-01-good-en.md as en
checking evals/files/en/2026-10-01-no-image-en.md as en
{
  "checked": 4,
  "failed": 2,
  "results": [
    {
      "file": "evals/files/2026-10-01-bad-zh.md",
      "lang": "zh-TW",
      "ok": false,
      "problems": [
        {
          "rule": "date-future",
          "field": "date",
          "message": "2030-01-01 09:00:00 +0800 is later than 2026-10-17T23:33:41+08:00; Jekyll skips future posts at build time"
        },
        {
          "rule": "categories",
          "field": "categories",
          "message": "3 levels, Chirpy supports at most 2"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "must not start with 「封面：」 or 「本文」; write a one-sentence summary"
        }
      ]
    },
    {
      "file": "evals/files/en/2026-10-01-bad-en.md",
      "lang": "en",
      "ok": false,
      "problems": [
        {
          "rule": "length",
          "field": "title",
          "message": "83 characters, limit is 70 for en"
        },
        {
          "rule": "length",
          "field": "description",
          "message": "169 characters, limit is 160 for en"
        },
        {
          "rule": "date-format",
          "field": "date",
          "message": "'2026-10-01 09:00:00' must look like YYYY-MM-DD HH:MM:SS +0800"
        },
        {
          "rule": "alt",
          "field": "image.alt",
          "message": "'image.alt' is missing or empty; posts with an image need one"
        }
      ]
    }
  ]
}
```

exit code 是 1。前四行是寫到 stderr 的進度訊息，後面的 JSON 是 stdout。兩個正確的檔案都沒有出現在 `results` 裡，因為預設只列出有問題的檔案。用法錯誤時 exit code 是 2：

```console
$ python3 scripts/check_front_matter.py evals/files/nope.md
Error: path not found: evals/files/nope.md
```

接著對本站 main 分支（commit `636e148`）上的 36 個文章檔全部跑一次。結果是 36 個檔案裡有 2 個不合規，都是英文標題超過 70 字元：OpenWiki 那篇 72 字元，供應鏈安全那篇 79 字元。另外有 3 篇文章的三語版本沒有封面圖，所以沒有檢查 alt，也不算問題。

這些我只記錄下來，沒有在這次一起改。

還有一個意外的收穫：我用它檢查這篇文章自己的三個語言檔，第一次就被擋下來了。我把日期設成 23:20，跑檢查時才 23:18，三個檔都報 `date-future`。如果直接 build，這篇文章就不會出現在網站上。

## 分三層測試

![三層測試：格式檢查用 skills-ref 驗證欄位，觸發測試用約 20 條查詢看會不會被叫出來，輸出檢查比較有沒有 skill 的結果](three-layer-tests.png){: width="800" height="450" }
_三層各測一件事：格式對不對、會不會被叫出來、叫出來之後做得對不對。_

### 格式檢查

規範推薦用 [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref) 驗證 frontmatter。要先說清楚：它的 README 寫明 **intended for demonstration purposes only, not meant to be used in production**，只是示範用的參考實作，不是正式的產品。

我用固定的 commit 安裝：

```console
$ git clone -q https://github.com/agentskills/agentskills.git && cd agentskills && git checkout -q 69ef37e9424c0a7ea9dd2293b559e43ec8176379 && git log -1 --format='%h %cs'
69ef37e 2026-08-09
$ python3 -m venv .venv && .venv/bin/pip install -q -e skills-ref && .venv/bin/skills-ref --version
skills-ref, version 0.1.0
```

驗證範例 skill，通過時只有一行，exit code 是 0：

```console
$ skills-ref validate checking-post-front-matter
Valid skill: checking-post-front-matter
```

接著故意做三個錯誤的版本，各跑一次，exit code 都是 1。

名稱有連續的 `--`：

```console
$ skills-ref validate bad--name
Validation failed for bad--name:
  - Skill name cannot contain consecutive hyphens
```

資料夾名稱和 `name` 對不上：

```console
$ skills-ref validate check-front-matter
Validation failed for check-front-matter:
  - Directory name 'check-front-matter' must match skill name 'checking-post-front-matter'
```

加了一個 Claude Code 專屬的欄位 `when_to_use`：

```console
$ skills-ref validate checking-post-front-matter
Validation failed for checking-post-front-matter:
  - Unexpected fields in frontmatter: when_to_use. Only ['allowed-tools', 'compatibility', 'description', 'license', 'metadata', 'name'] are allowed.
```

最後這個最值得注意：同一個欄位，在 Claude Code 裡完全合法，到了 skills-ref 就是錯誤。這就是前面說「只用六個欄位」的原因。

Claude Code 另外提供 `claude plugin validate <skills 目錄>`，可以找出 frontmatter 解析失敗的 `SKILL.md`，[需要 v2.1.233 以上](https://code.claude.com/docs/en/skills)。我的機器上沒有 Claude Code，所以沒有跑。

### 觸發測試

格式對了，不代表它會在對的時候被叫出來。agentskills.io 的[最佳化指南](https://agentskills.io/skill-creation/optimizing-descriptions#designing-trigger-eval-queries)建議這樣測：

- 準備約 20 條查詢，8–10 條**應該**觸發，8–10 條**不應該**觸發。
- 不該觸發的，要用「近似但其實不同」的查詢。像「寫一個費氏數列函式」這種完全無關的題目，什麼也測不出來。
- 每條跑 3 次，算觸發率，門檻預設 0.5。
- 把題目分成訓練組（約 60%）和驗證組（約 40%）。只看訓練組的失敗來改 description，驗證組只用來確認改善有沒有類推到新題目，避免 description 過度貼合這幾題。
- 大約 5 輪就夠；如果一直沒進步，問題可能出在題目本身。

Claude Code 的文件用的是[同一個思路](https://code.claude.com/docs/en/skills#evaluate-and-iterate-on-a-skill)：同一組查詢，在開著 skill 和關掉 skill 的新 session 裡各跑一次，互相比較。一定要開新 session，因為寫 skill 時留下的對話內容，會遮住文字裡沒寫清楚的地方。

我替範例寫了 20 條查詢，10 條該觸發、10 條不該觸發，訓練組 12 條、驗證組 8 條，兩組裡該觸發和不該觸發的各佔一半。`split` 是我自己加的欄位，用來把分組固定下來，指南的範例格式只有 `query` 和 `should_trigger`：

```json
[
  { "query": "我剛寫完 _posts/en/2026-10-20-new-post.md，開 PR 前幫我確認 front matter 都沒問題", "should_trigger": true, "split": "train" },
  { "query": "is my english title too long? its the one in _posts/en/2026-10-18-agent-skills.md", "should_trigger": true, "split": "train" },
  { "query": "我把三語的 description 都改短了，幫我看看還有沒有超過限制", "should_trigger": true, "split": "train" },
  { "query": "Build passed locally but my new post doesn't show up on the site. The date is 2026-10-17 23:40:00 +0800, what's wrong?", "should_trigger": true, "split": "train" },
  { "query": "封面下面那行字要怎麼寫才對？幫我檢查 _posts/zh-CN/ 這篇的 alt", "should_trigger": true, "split": "train" },
  { "query": "Before I open the PR for the agent-skill post, run whatever checks the site needs on the three post files", "should_trigger": true, "split": "train" },
  { "query": "幫我把這篇文章的分類改成 [AI, skills, 教學]，改完確認一下格式", "should_trigger": true, "split": "validation" },
  { "query": "I edited the title and image alt on yesterday's post, can you make sure I didn't break any of our rules", "should_trigger": true, "split": "validation" },
  { "query": "review the metadata block at the top of _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md", "should_trigger": true, "split": "validation" },
  { "query": "新文章三個語言版本都寫好了，PR 前最後檢查一下標題長度跟日期", "should_trigger": true, "split": "validation" },
  { "query": "幫我修正 _posts/2026-10-16-coding-agent-supply-chain-permission-risks.md 第 40 行的錯字", "should_trigger": false, "split": "train" },
  { "query": "what's the difference between a YAML block scalar with | and >?", "should_trigger": false, "split": "train" },
  { "query": "我的 _config.yml 縮排好像錯了，jekyll build 報 YAML 錯誤", "should_trigger": false, "split": "train" },
  { "query": "Can you translate this zh-TW post into English and put it under _posts/en/?", "should_trigger": false, "split": "train" },
  { "query": "幫我寫一個 GitHub Actions workflow，每次 push 都跑 jekyll build 和 htmlproofer", "should_trigger": false, "split": "train" },
  { "query": "the cover image looks blurry on the home page, can you regenerate it at 2x?", "should_trigger": false, "split": "train" },
  { "query": "Check the front matter of this Hugo post: content/posts/hello.md uses TOML between +++ lines", "should_trigger": false, "split": "validation" },
  { "query": "幫我想三個比較吸引人的英文標題，主題是自己寫 Agent Skill", "should_trigger": false, "split": "validation" },
  { "query": "Our SKILL.md frontmatter fails skills-ref validate, can you see why?", "should_trigger": false, "split": "validation" },
  { "query": "Chirpy 的 tags 和 categories 差在哪？解釋就好，不用動任何檔案", "should_trigger": false, "split": "validation" }
]
```

幾條值得說明的近似題：「修正第 40 行的錯字」改的是同一篇文章，但只動內文；「Hugo 文章的 front matter」講的是同一個詞，但格式是 TOML，不在範例的範圍內；「SKILL.md 的 frontmatter 驗證失敗」連 frontmatter 這個詞都一樣，要的卻是 skills-ref。

> **本文未實跑觸發率。** 觸發測試要在真的 agent 裡跑，看它有沒有去讀 `SKILL.md`。我跑範例的機器上沒有 `claude`、`codex`、`cursor-agent`、`gemini`、`copilot` 這些 CLI（實際用 `command -v` 檢查過），所以這裡只有題目和方法，沒有任何觸發率數字。你可以把這份 JSON 拿到自己的 agent 裡，照指南的方法跑。
{: .prompt-warning }

### 輸出檢查

被叫出來之後，還要做得對。agentskills.io 的[輸出評測指南](https://agentskills.io/skill-creation/evaluating-skills)建議把測試題放在 `evals/evals.json`，每題有使用者會怎麼問（`prompt`）、成功的樣子（`expected_output`）、需要的檔案（`files`），看過第一輪結果後再補上可以客觀檢查的 `assertions`。指南建議先從 2–3 題開始：

```json
{
  "skill_name": "checking-post-front-matter",
  "evals": [
    {
      "id": 1,
      "prompt": "I just wrote evals/files/en/2026-10-01-bad-en.md. Can you check whether its front matter is OK before I open a PR, and tell me what to fix?",
      "expected_output": "A list of every front matter problem in the file (title and description too long, date without a UTC offset, missing image.alt), each with a concrete fix.",
      "files": ["evals/files/en/2026-10-01-bad-en.md"],
      "assertions": [
        "The response says the title is longer than 70 characters",
        "The response says the description is longer than 160 characters",
        "The response says the date has no +0800-style offset",
        "The response says image.alt is missing",
        "The response does not claim the file passes"
      ]
    },
    {
      "id": 2,
      "prompt": "幫我看一下 evals/files/2026-10-01-bad-zh.md 的封面圖說和日期有沒有問題，我覺得怪怪的",
      "expected_output": "指出 alt 以「封面：」開頭、日期在未來會被 Jekyll 跳過、categories 超過兩層，並建議怎麼改。",
      "files": ["evals/files/2026-10-01-bad-zh.md"],
      "assertions": [
        "The response says image.alt must not start with 「封面：」",
        "The response says the 2030 date is in the future and the post would be skipped at build time",
        "The response says categories has 3 levels and the limit is 2",
        "The response does not suggest building with --future as the fix"
      ]
    },
    {
      "id": 3,
      "prompt": "Quick sanity check on evals/files/en/2026-10-01-good-en.md before I push, nothing fancy",
      "expected_output": "A short confirmation that the file has no front matter problems, without inventing issues.",
      "files": ["evals/files/en/2026-10-01-good-en.md"],
      "assertions": [
        "The response says the file passes",
        "The response does not list any front matter problem",
        "No file was modified"
      ]
    }
  ]
}
```

每題要跑兩次：一次有 skill，一次沒有（改版時則用舊版當對照），每次都要從乾淨的 context 開始。assertion 要能客觀判斷，像「輸出是合法的 JSON」就比「輸出很好」有用。指南也提到，機械性的檢查用腳本做，比讓 LLM 判斷可靠。以這個範例來說，第 3 題的「沒有改到任何檔案」，用 `git status` 就能判斷，不必請 AI 打分數。

Anthropic 的撰寫指南還多提醒一點：skill 的效果和搭配的模型有關，[要用你打算搭配的所有模型都測一次](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#test-with-all-models-you-plan-to-use)。

> **本文未實跑輸出評測。** 原因和觸發測試一樣：沒有可用的 agent，所以沒有「有 skill」和「沒有 skill」的對照結果。上面的 `evals.json` 只是寫好的題目。
{: .prompt-warning }

這三題倒是先幫我抓到一個錯誤，不過錯的是測試檔，不是腳本。我第一次跑的時候，故意寫錯的英文測試檔，description 其實只有 156 字元，腳本也正確地沒報錯，但 `evals.json` 預期它要超過 160。結果和預期對不上時，要回頭檢查的不只是 skill，還有測試本身。輸出評測指南也特別提醒，[要審查 assertion 本身](https://agentskills.io/skill-creation/evaluating-skills#grading-principles)，不只看結果。

## 換一個 Agent 還能用嗎

Agent Skills 是一個開放標準。有官方文件說明支援的，包括 Claude Code、Codex、Cursor 和 GitHub Copilot；agentskills.io 的 [Client Showcase](https://agentskills.io/clients) 還列了更多產品。四家各自會到這些地方找 skill：

| 工具 | 專案內 | 個人 |
| --- | --- | --- |
| Claude Code（[文件](https://code.claude.com/docs/en/skills#where-skills-live)） | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| Codex（[文件](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)） | 從目前工作目錄往上，到 repo 根目錄為止，每一層的 `.agents/skills` | `$HOME/.agents/skills`；另有管理者層級（ADMIN）的 `/etc/codex/skills` |
| Cursor（[文件](https://cursor.com/docs/skills#skill-directories)） | `.agents/skills/`、`.cursor/skills/`；為了相容，也讀 `.claude/skills/`、`.codex/skills/` | `~/.agents/skills/`、`~/.cursor/skills/`；為了相容，也讀 `~/.claude/skills/`、`~/.codex/skills/` |
| GitHub Copilot（[文件](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)） | `.github/skills`、`.claude/skills`、`.agents/skills` | `~/.copilot/skills`、`~/.agents/skills` |

從這張表可以推論出一件事（這是推論，不是哪份文件寫的）：依 2026 年 10 月 17 日的文件，`.agents/skills/` 同時出現在 Codex、Cursor、Copilot 的清單裡，但 Claude Code 的文件沒有列這個路徑；反過來，`.claude/skills/` 有 Claude Code、Cursor、Copilot，卻沒有 Codex。也就是說，**沒有一個路徑能同時被四家讀到**。

### 範例做了哪些靜態檢查

我沒有在任何一個 agent 裡實際跑過這個 skill，所以不能說「已在 X 上測過」。能做的是靜態可攜性檢查，也就是不用執行 agent，只看檔案本身：

| 檢查 | 結果 |
| --- | --- |
| frontmatter 只用規範的六個欄位 | 是：`name`、`description`、`compatibility`、`metadata`，`skills-ref validate` 通過 |
| 有寫 `name`，而且和資料夾同名 | 是。Codex 文件寫明 `SKILL.md` 必須有 `name` 和 `description`；Cursor 也要求 `name` 和資料夾同名 |
| 沒用任何工具專屬的本文語法 | 是。沒有用 Claude Code 的 `` !`指令` `` 動態注入，也沒用 `${CLAUDE_SKILL_DIR}`；腳本路徑都是相對於 skill 根目錄的寫法，這是[腳本指南](https://agentskills.io/skill-creation/using-scripts#referencing-scripts-from-skill-md)的建議 |

最後一點要特別說明。Claude Code 的 `` !`指令` `` 會在 Claude 看到 skill 之前先執行指令，把輸出塞進本文；`${CLAUDE_SKILL_DIR}` 則會換成 skill 所在的資料夾。Claude Code 的文件以動態注入為例寫明，這類只屬於 Claude Code 的本文功能，[在 claude.ai 和 API 上不會生效](https://code.claude.com/docs/en/skills)。其他工具我找不到文件說明，所以只能說：**不能假設它們會生效**。

## 版本與維護

規範裡和版本有關的，只有 `metadata` 可以放一個 `version: "1.0"`，但它沒有定義版本號代表什麼。用 git tag 或 CHANGELOG 管版本是慣例，不是規範；我的建議是每次改 description 或腳本的行為，都打一個 tag，寫一行變更說明。

改版的流程，輸出評測指南給了一個很實用的做法：[改之前先把舊版複製一份](https://agentskills.io/skill-creation/evaluating-skills#spawning-runs)，用舊版當對照組（放在 `old_skill/`），對同一組題目重跑。這樣才知道新版是真的變好，還是只是換了一種錯法。

另外三個維護習慣：

- **不要寫會過期的資訊。** Anthropic 的撰寫指南建議，已經不用的做法[收進一個「old patterns」區塊](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-time-sensitive-information)，不要混在主要步驟裡。
- **每次糾正 AI，就補一條 Gotcha。** agentskills.io 說，這是[改善 skill 最直接的方法之一](https://agentskills.io/skill-creation/best-practices#gotchas-sections)。
- **定期清掉沒在用的 skill。** 每個 skill 都會佔用前面說的清單預算，不管有沒有用到。Claude Code 的 `/skill-doctor` 可以列出每個 skill 的成本和使用次數，[需要 v2.1.252 以上](https://code.claude.com/docs/en/skills#find-unused-skills)。

## 作者該替使用者做的安全準備

裝別人的 skill 有哪些風險、使用者該怎麼檢查，[這篇供應鏈安全的文章](/posts/coding-agent-supply-chain-permission-risks/)已經整理過了。這裡只談寫 skill 的人能先做好的事：

- **不要讓 skill 抓外部網址的內容當指示。** Anthropic 的文件寫明，[會抓外部資料的 skill 風險特別高](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#security-considerations)，抓回來的內容可能藏著惡意指令；就算是可信的 skill，外部依賴一變也可能被汙染。
- **`allowed-tools` 給到最小。** 這個欄位在 Claude Code 裡，會讓 skill 在被叫用的那一輪不經詢問就使用列出的工具。文件特別寫明，[workspace trust 擋不住這個欄位](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)：repo 裡的 skill 可以替自己開權限，連在沒信任過的資料夾裡用 `-p` 執行也會套用。範例沒有用這個欄位。
- **腳本裡不放任何秘密資訊。** 這是我的做法，不是哪份文件的規定：金鑰、權杖一律從環境變數讀，不寫進 skill 的任何檔案，因為整個資料夾都會被分享、被提交到 repo。
- **依賴要鎖版本。** 腳本指南要求[一次性指令寫明版本](https://agentskills.io/skill-creation/using-scripts#one-off-commands)，這樣同一個指令隔一段時間再跑，結果也會一樣。
- **會改東西的操作要提供 `--dry-run`。** 腳本指南建議，破壞性或會改變狀態的操作，[讓 agent 能先預覽會發生什麼](https://agentskills.io/skill-creation/using-scripts#further-considerations)。範例的腳本只讀檔、從不寫檔，所以不需要這個參數。

使用者會把你的 skill 當成軟體來審查，那你能做的，就是讓它好審：檔案少、每個腳本做什麼一看就懂、沒有連到外面的東西。

## 我的判斷

以下是我的觀點，不是哪份文件的結論。

**最值得花時間的是 description 和 Gotchas。** 資料夾結構、欄位規則這些，照規範做一次就好，`skills-ref` 也會幫你抓錯。真正決定 skill 好不好用的，是它會不會在對的時候被叫出來，以及叫出來之後會不會踩到你早就知道的坑。

**能寫成腳本的規則，就寫成腳本。** 範例的八條規則，如果寫成文字讓 AI 自己數字元，每次都可能數錯；寫成腳本，結果每次都一樣，AI 只要負責讀結果、改文章。

**為了跨 agent，寧可放棄一些方便的欄位。** `when_to_use`、`disable-model-invocation` 在 Claude Code 裡都很好用，但一寫進 `SKILL.md`，就過不了 skills-ref 和 claude.ai 上傳。如果這個 skill 只給自己在 Claude Code 裡用，那就沒關係；要給團隊、跨工具用，我會只用六個欄位。

**沒跑過觸發測試的 description，只是一個猜測。** 這篇的範例也一樣。我寫了 20 條題目，但在真的跑過之前，我不知道它會不會在「幫我看標題長度」的時候被叫出來。

## 延伸閱讀

規範與方法（agentskills.io）：

- [Specification](https://agentskills.io/specification)：目錄結構、六個欄位、漸進式揭露
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)：範圍、Gotchas、驗證迴圈
- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)：description 寫法與觸發測試
- [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)：`evals.json` 與有無 skill 的對照
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)：腳本介面設計
- [Client Showcase](https://agentskills.io/clients)：支援 Agent Skills 的產品
- [skills-ref](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379/skills-ref)：驗證工具（示範用）

各家文件：

- Anthropic：[Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)、[Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Claude Code：[Extend Claude with skills](https://code.claude.com/docs/en/skills)
- Codex：[Build skills](https://learn.chatgpt.com/docs/build-skills)
- Cursor：[Agent Skills](https://cursor.com/docs/skills)
- GitHub Copilot：[About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

本站相關文章：

- [mattpocock/skills 系列導讀](/posts/mattpocock-skills-series-guide/)：想先用現成的 skill
- [系列第 6 篇](/posts/mattpocock-skills-research-handoff/)：`writing-for-agents` 的寫作原則
- [系列第 4 篇](/posts/mattpocock-skills-implementation-feedback-loops/)：只能手動啟動的 skill 實例
- [裝了第三方 skill 和 MCP 之後，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：使用者端的風險與檢查清單
