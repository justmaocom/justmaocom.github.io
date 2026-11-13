# 三語翻譯規則

本站每篇文章和有內文的頁面，都有繁中（預設，根目錄）、簡中（`/zh-CN/`）、英文（`/en/`）三個版本。這份文件整理翻譯與多語系撰寫的規則，內容取自本機給 AI 助手讀的專案說明 `CLAUDE.md`。不論是人工翻譯，還是請 AI 起稿，都照這份規則。

多語系的建置機制（jekyll-polyglot、`_plugins/i18n-hook.rb`、hreflang）見 `_config.yml` 與各檔案開頭的註解；文章 front matter 與排版語法見[文章撰寫指南](chirpy-post-authoring.md)。

## 檔案放在哪裡

每篇文章都要有三個語系版本，檔名相同：

- 繁中原文：`_posts/<file>.md`。
- 簡中：`_posts/zh-CN/<file>.md`。
- 英文：`_posts/en/<file>.md`。

譯文的 front matter 不必寫 `lang`，`_config.yml` 的 `defaults` 會依路徑補上。polyglot 以相同 permalink 把三份配成同一頁；缺譯文時，該語系改用繁中原文頂替。

繁中原文修改後，要同步更新簡中版與英文版。

## 簡中：轉寫，不只是轉換字形

簡中從繁中原文轉寫，不只轉換字形，用詞也要換成大陸慣用詞，例如：

| 繁中 | 簡中 |
| --- | --- |
| 軟體 | 软件 |
| 程式碼 | 代码 |
| 資安 | 信息安全 |

- 引號「」換成“”。
- 同一個詞要看上下文決定，例如「指令」指 CLI 時才換成「命令」。

## 英文

英文從繁中原文翻譯。英文系列導覽的連結文字，要與目標文章的英文標題一致。

## tags：三語完全相同

`tags` 在三個語系必須與原文完全相同，因為各語系共用同名的標籤頁。

## categories：依對照表翻譯

`categories` 依下表轉換。新增分類時，在表上補一列。

| 繁中 | 簡中 | 英文 |
| --- | --- | --- |
| `軟體開發` | `软件开发` | `Software Development` |
| `Web應用` | `Web应用` | `Web Applications` |
| `資訊安全` | `信息安全` | `Security` |
| `攻擊鏈` | `攻击链` | `Attack Chains` |
| `文件維護` | `文档维护` | `Documentation` |
| `軟體工程` | `软件工程` | `Software Engineering` |
| `多語系網站` | `多语言网站` | `Multilingual Sites` |
| `AI Agent` | `AI Agent` | `AI Agents` |
| `AI` | `AI` | `AI` |
| `skills` | `skills` | `skills` |
| `FDE` | `FDE` | `FDE` |

## 站內連結

站內連結一律寫 `/posts/<slug>/`，不寫語系前綴，建置時會自動補上。

系列文章在引言後加入 `.prompt-info` 導覽。新增一篇時，讓新文章連回上一篇，並替上一篇補上通往新文章的連結。只連結已建立的文章，網址同樣使用 `/posts/<slug>/`。

## 文章以外需要三語的地方

- **側邊欄頁面**：有內文的 tab（如 `_tabs/about.md`）要另備 `_tabs/zh-CN/`、`_tabs/en/` 的同名譯文。只有 layout 的 tab 由主題 locale 翻譯標題，不需要譯文。主題 locale 沒有的 tab（如 `projects`）不寫 `title`，改在 `_data/locales/<lang>.yml` 補 `tabs.<檔名>`；這些檔案會與 gem 內同名 locale 深度合併，只需放新增的字串。否則 `<title>` 會是空的。
- **專案卡片**：`_data/projects.yml` 每新增一筆，三個語系的 `description` 都要填，欄位說明寫在該檔開頭。
- **介面文字**：新增自訂 JS 或 CSS `content` 的介面文字時，三個語系都要給；參考 `assets/js/mermaid-zoom.js` 的 `STRINGS` 與 SCSS 的 `html:lang(...)`。
- **SEO 文字樣板**：分頁與分類頁的 `<title>`、描述樣板放在 `_data/locales/<lang>.yml` 的 `seo`，三個語系都要給。
- **站台名稱與描述**：各語系的 `title`、`home_title`、`tagline`、`description` 寫在 `_config.yml` 的 `i18n_site`。

## 修改多語系機制時

- `_plugins/i18n-hook.rb` 以精確字串比對改寫輸出，主題或 jekyll-seo-tag 改了輸出格式就會靜默失效。升級 gem 或修改 hook 後，要跑 `tools/check-i18n.rb`（或整套 `bash tools/test.sh`）；新增需要語系前綴的輸出時，在腳本的 `checks` 表補一列。
- hreflang 的 `x-default` 指向英文版，與 `assets/js/i18n.js` 把非中文、非英文訪客導向英文的規則一致；改其中一邊時，另一邊要跟著改。
