---
title: "我的部落格怎麼同時維護繁中、簡中、英文三個版本"
description: "本站每篇文章都有繁中、簡中、英文三個版本。這篇用實際的設定說明網址怎麼分、譯文怎麼放、外掛沒處理到的網址怎麼補，以及怎麼讓搜尋引擎分清三個版本。"
date: 2026-11-13 08:30:00 +0800
categories: [軟體開發, 多語系網站]
tags: [jekyll, i18n, github-pages, hreflang, seo, side-project]
---

這個網站從 2026 年 9 月底開始，每篇文章都同時有繁體中文、簡體中文、英文三個版本。寫這篇的時候，三個語系各有 28 篇，一篇不缺。

我想做三語，是因為讀者不只在台灣。可是真的動手後才發現，「把文章翻成三份」只是最容易的一段。比較麻煩的是那些看不到的地方：分享出去的連結指向哪個語系、搜尋引擎知不知道這三頁是同一篇、讀者從 Google 點進來會不會被帶走。這些地方做錯了，網站照樣能開，只是悄悄出錯。

這篇用本站實際的設定，說明我怎麼處理這些事。想替自己的個人網站加上多語系的人，可以拿它當一份實際運作的參考。本站用 Jekyll 和 Chirpy 主題；換成別的工具，做法會不同，但要處理的問題大多一樣。

> **版本說明**：本文依 2026-11-13（台北時間）本站 repo 的設定撰寫，使用 Jekyll 4.4.1、Chirpy 主題 7.6.0、jekyll-polyglot 1.14.0。Google 與 polyglot 的說法依同一天讀取的官方文件。整個站的設定都公開在 [GitHub repo](https://github.com/justmaocom/justmaocom.github.io)，文中提到的檔案都可以在那裡看到完整內容。
{: .prompt-info }

## 開始前：先認識幾個詞

- **Jekyll**：把 Markdown 文章轉成網頁的工具。它在發布前一次產生所有網頁（這種網站叫靜態網站），伺服器只負責把檔案送出去。
- **主題（theme）**：決定網站外觀和版面的一整套檔案。本站用 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy)。
- **front matter**：每篇文章最上面、夾在兩行 `---` 之間的設定，寫標題、日期、分類等資料。
- **permalink**：一篇文章固定的網址路徑，例如 `/posts/jekyll-blog-three-languages/`。
- **外掛（plugin）與 hook**：外掛是替 Jekyll 加功能的程式；hook 是 Jekyll 在建置的某個時間點（例如「網頁都產生完之後」）自動呼叫的一段程式。
- **GitHub Actions**：GitHub 提供的自動化服務。本站每次合併新的修改，它就會自動建置網站並發布到 GitHub Pages。
- **sitemap**：列出網站所有網址的檔案，給搜尋引擎看。
- **hreflang**：寫在網頁裡、告訴搜尋引擎「這一頁還有哪些語言版本、網址在哪」的標記。

## 網址怎麼分：繁中在根目錄，其他語系加前綴

三個語系的網址長這樣：

| 語系 | 首頁 | 這篇文章 |
| --- | --- | --- |
| 繁體中文（預設） | `/` | `/posts/jekyll-blog-three-languages/` |
| 簡體中文 | `/zh-CN/` | `/zh-CN/posts/jekyll-blog-three-languages/` |
| 英文 | `/en/` | `/en/posts/jekyll-blog-three-languages/` |

繁中是我寫作的語言，所以放在根目錄，其他語系在網址前面加上語系代碼。這是 [jekyll-polyglot](https://github.com/untra/polyglot)（以下簡稱 polyglot）這個外掛的做法，設定只有幾行，寫在 `_config.yml`：

```yaml
languages: ["zh-TW", "zh-CN", "en"]
default_lang: zh-TW
lang_vars: [lang]

# 這些檔案只輸出一份在根目錄，不複製到 /<lang>/ 之下
exclude_from_localization:
  - assets/lib
  - assets/img
  - assets/js/i18n.js
  - assets/robots.txt
  - CNAME
```
{: file="_config.yml" }

polyglot 的原理是每個語系各建置一次完整的網站。它的 README 寫，它會「替每個要處理的語言各開一個獨立的程序」。預設語系輸出到根目錄，其他語系輸出到 `/zh-CN/`、`/en/` 底下，而每次建置時，網站的語系變數會換成那個語系。Chirpy 主題本來就有繁中、簡中、英文的介面文字，所以「上一篇」、「分類」、「搜尋」這些按鈕文字會自動換成對應語言，我不必自己翻。

`exclude_from_localization` 列的是三個語系共用、只需要一份的檔案，例如圖片和 JavaScript。不列進去的話，每張圖片都會被複製三份。

## 譯文怎麼放：同一個檔名，放在三個資料夾

一篇文章的三個版本，檔名完全相同，只是放在不同資料夾：

```text
_posts/
├── 2026-11-13-jekyll-blog-three-languages.md        ← 繁中原文
├── zh-CN/
│   └── 2026-11-13-jekyll-blog-three-languages.md    ← 簡中
└── en/
    └── 2026-11-13-jekyll-blog-three-languages.md    ← 英文
```

譯文的 front matter 不必寫語系，`_config.yml` 的 `defaults` 會依資料夾自動補上：

```yaml
defaults:
  - scope:
      path: _posts/zh-CN
    values:
      lang: zh-CN
  - scope:
      path: _posts/en
    values:
      lang: en
```
{: file="_config.yml" }

polyglot 看到三份檔案的 permalink 相同，就把它們當成同一篇的不同語系版本。某個語系缺了譯文時，它會拿繁中原文頂替；README 的說法是，缺少對應版本的頁面會「退回 `default_lang`」，內容不會不見。這個機制讓我可以先發繁中、晚點再補譯文，但本站的規則是三個版本一起發布，所以實際上沒用到。

側欄的「關於」、「專案」這類有內文的頁面也一樣，譯文放在 `_tabs/zh-CN/`、`_tabs/en/`。

### 翻譯規則寫在 repo 裡

三個版本要一致，靠的不是記性，而是寫下來的規則。本站的規則放在 repo 的 `CLAUDE.md`，不論是我自己翻，還是請 AI 起稿，都照同一份規則：

- 簡中不是轉換字形就好，用詞要換成大陸慣用的說法，例如「軟體」改成「软件」、「程式碼」改成「代码」，引號「」改成“”。同一個詞要看上下文，例如「指令」只有在指命令列時才改成「命令」。
- 三個版本的 `tags` 必須完全相同，因為各語系共用同名的標籤頁。
- `categories` 照一張固定的對照表翻譯，例如「資訊安全」在簡中是「信息安全」，在英文是「Security」。新增分類時，就在表上補一列。
- 站內連結一律寫成 `/posts/<slug>/`，不寫語系前綴，建置時會自動補上。

最後一條很重要。如果在英文文章裡手寫 `/en/posts/...`，看起來沒錯，但哪天網址規則改了，就得一篇一篇找出來修。

## polyglot 沒處理到的網址：自己寫 hook 補

polyglot 會把 HTML 裡 `href="..."` 形式的站內連結補上語系前綴，所以英文頁面上的連結會連到其他英文頁面。問題是，網頁裡還有很多網址不是寫在 `href` 裡，它們仍然指向繁中版：

- `og:url`：分享到社群網站時，卡片上連過去的網址。
- JSON-LD：寫給搜尋引擎看的結構化資料，裡面有本頁網址和作者「關於」頁的網址。
- 分享按鈕：網址被編碼後放在連結的參數裡。
- 站內搜尋讀取的 `search.json`：路徑和裡面每篇文章的網址。
- RSS feed 和 sitemap 裡的完整網址。

這些沒修的話，會發生的事情是：讀者在英文文章按「分享」，朋友點開卻看到繁中版；搜尋引擎讀英文頁的結構化資料，看到的本頁網址卻是繁中那一頁。網站看起來一切正常，所以很難發現。

本站用一支 hook 補上這些網址，檔案是 `_plugins/i18n-hook.rb`。它在 polyglot 處理完之後執行，把「本頁的繁中網址」這個精確字串換成該語系的網址。下面是處理 HTML 的核心部分：

```ruby
page_url = "#{ origin }#{ doc.url }"
local_url = "#{ origin }/#{ lang }#{ doc.url }"
doc.output = doc.output
  .gsub(%(content="#{ page_url }"), %(content="#{ local_url }"))
  .gsub(%("url":"#{ page_url }"), %("url":"#{ local_url }"))
  .gsub(%("@id":"#{ page_url }"), %("@id":"#{ local_url }"))
  .gsub(CGI.escape(page_url), CGI.escape(local_url)) # 分享按鈕的 query string
```
{: file="_plugins/i18n-hook.rb" }

只換精確字串，是為了不誤動其他網址，例如圖片的網址（圖片只有一份，不該加前綴）和指向繁中版的 hreflang 連結。

同一支 hook 也替各語系換掉網站名稱和描述。`_config.yml` 裡有一段 `i18n_site`，寫英文版的網站標題、簡中版的副標題等，建置該語系時套用。

## 讓搜尋引擎分清三個版本

對搜尋引擎來說，三個語系就是三個不同的網址。如果什麼都不說，它可能把三頁當成內容重複，或在使用者搜尋中文時顯示英文版。下面是本站跟多語系直接相關的幾項 SEO 設定。

### 每一頁都列出三個語系版本

Google 用 hreflang 判斷一頁的其他語言版本。[Google 的說明](https://developers.google.com/search/docs/specialty/international/localized-versions)有幾條規則要注意：

- 每個語言版本都要列出自己，以及所有其他語言版本。
- 兩頁要互相指向對方，只有單向指向的標記會被忽略。
- 網址要寫完整，包含 `https://`。

本站在每一頁的 `<head>` 輸出四行，三個語系各一行，再加一行 `x-default`：

```html
<link rel="alternate" hreflang="zh-TW" href="https://justmao.com/posts/jekyll-blog-three-languages/">
<link rel="alternate" hreflang="zh-CN" href="https://justmao.com/zh-CN/posts/jekyll-blog-three-languages/">
<link rel="alternate" hreflang="en" href="https://justmao.com/en/posts/jekyll-blog-three-languages/">
<link rel="alternate" hreflang="x-default" href="https://justmao.com/en/posts/jekyll-blog-three-languages/">
```

因為三個語系的頁面都用同一個模板產生，每一頁輸出的四行都一樣，自然滿足「列出自己」和「互相指向」這兩條。模板在 `_includes/metadata-hook.html`，那是 Chirpy 預留給使用者在 `<head>` 加東西的位置。

`x-default` 的用途，Google 的說法是「沒有其他語言符合使用者的瀏覽器設定時使用」。本站讓它指向英文版，因為瀏覽器語言既不是中文也不是英文的讀者，英文版最可能讀得懂。

有一種頁面例外：分類頁。分類名稱在三個語系不同，例如「資訊安全」、「信息安全」、「Security」，網址也就不同，沒有一對一的對應版本，所以分類頁不輸出 hreflang。

### robots.txt 只有一份，列出三份 sitemap

每個語系各自產生一份 sitemap：`/sitemap.xml`、`/zh-CN/sitemap.xml`、`/en/sitemap.xml`。搜尋引擎只讀網域根目錄的 `robots.txt`，所以本站讓這一份列出三份 sitemap：

```text
User-agent: *

Disallow: /norobots/

Sitemap: https://justmao.com/sitemap.xml
Sitemap: https://justmao.com/zh-CN/sitemap.xml
Sitemap: https://justmao.com/en/sitemap.xml
```

這裡有一個小陷阱。產生 sitemap 的外掛 jekyll-sitemap 發現某個語系沒有 `robots.txt` 時，會自動補一份，結果 `/zh-CN/robots.txt`、`/en/robots.txt` 又冒出來了。這兩份沒有作用，只會讓人困惑，所以 `i18n-hook.rb` 在 sitemap 產生之後把它們刪掉。

### 讀者進站時，看到哪個語系

多語網站常見的做法是看瀏覽器語言，自動把讀者轉到對應版本。[Google 的說明](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)建議避免這樣做，理由是這種轉址可能讓使用者和搜尋引擎看不到網站的所有版本。它建議的做法是在頁面上放其他語言版本的連結，讓使用者自己選。

本站的規則寫在 `assets/js/i18n.js`，大致是這樣：

1. 頂欄搜尋框旁邊有語系選單，讀者選了之後，網站會記住這個選擇。
2. 讀者手動選過語系，之後從站外進來，就帶到他選的語系。這是讀者自己表達過的意願，不是網站猜的。
3. 沒選過的讀者，只有在直接打開首頁（沒有從別的網頁點進來）時，才依瀏覽器語言導向。
4. 從 Google 搜尋結果或別人的連結點進來的讀者，留在他點的那個版本，不轉走。
5. 搜尋引擎的爬蟲完全不轉址，讓它們依 hreflang 各自收錄三個版本。

第 5 條的爬蟲名單有一個容易漏掉的項目：Google Search Console 檢查網址用的 `Google-InspectionTool`。它的 User-Agent（瀏覽器或爬蟲送出的自我介紹字串）裡沒有 `bot` 這個字，本站一開始只用 `bot`、`crawl` 這類字眼辨認爬蟲，沒認出它。漏掉的話，它檢查英文頁時可能被當成一般讀者轉到別的語系，檢查的就不是你想看的那一頁。

### 順帶一提：給 AI 工具讀的 llms.txt

本站根目錄有一份 `llms.txt`，是給 AI 瀏覽器和 coding agent 讀的文章索引（格式見 [llmstxt.org](https://llmstxt.org/)），從文章列表自動產生。它也是每個語系各一份，裡面的網址同樣由 `i18n-hook.rb` 補上語系前綴。它跟語系無關的部分，以及其他一般的 SEO 設定，不在這篇的範圍。

## 用檢查擋住「悄悄壞掉」

`i18n-hook.rb` 靠精確字串比對改寫網址。這個做法簡單，但很脆弱：哪天 Chirpy 主題或 jekyll-seo-tag 改了輸出格式，例如在 `"url":` 後面多加一個空白，比對就對不上，網址也就沒被換掉。建置不會報錯，網站也照樣能開。

所以本站另外寫了一支檢查程式 `tools/check-i18n.rb`。它不管 hook 怎麼寫，只看建置出來的成品：簡中和英文的每一頁，上面提到的每一類網址都要帶正確的語系前綴，而且每一類都至少要找到一個網址。最後這條是防止「格式變了，所以一個都沒抓到，所以零個錯誤」這種假的通過。它也會檢查 `/zh-CN/robots.txt`、`/en/robots.txt` 不存在。

檢查項目寫成一張表，新增一類需要帶前綴的網址時，在表上加一列就好：

```ruby
checks = [
  ['og:url', html, ->(s) { head[s].scan(/property="og:url" content="([^"]*)"/).flatten }, is_local_page],
  ['JSON-LD @id', html, ->(s) { head[s].scan(/"@id":"([^"]*)"/).flatten }, is_local_page],
  # ……分享按鈕、search.json、feed.xml、sitemap.xml、llms.txt
]
```
{: file="tools/check-i18n.rb" }

這支檢查放在 GitHub Actions 的發布流程裡，順序是：建置網站，跑 `check-i18n.rb`，跑 SEO 檢查，用 html-proofer 檢查站內連結，全部通過才發布。送 pull request 時也會跑同樣的檢查，只是不發布。在本機，執行 `bash tools/test.sh` 就能跑完整套。

## 代價

三語不是免費的，實際的代價是這些：

- **每篇文章要寫三次。** 就算請 AI 起稿，簡中的用詞和英文的語氣還是要看過。原文修改後，兩份譯文也要跟著改。
- **建置時間變長。** polyglot 每個語系各建置一次完整的網站，語系越多，每次建置要做的事就越多。
- **要多維護兩支程式。** `i18n-hook.rb` 和 `check-i18n.rb` 都是因為 polyglot 沒處理到才需要的。升級主題或外掛之後，要重跑檢查。

## 如果你也想做

照本站的經驗，順序可以這樣排：

1. 先決定網址規則，哪個語系放根目錄、其他語系用什麼前綴。之後再改，所有舊網址都要轉址。
2. 把翻譯規則寫下來，尤其是分類和標籤怎麼對應。
3. 建置後打開非預設語系的頁面原始碼，搜尋你的網域，看每一個網址是不是都帶了語系前綴。`og:url`、結構化資料、分享按鈕和 sitemap 最容易漏掉。
4. 每一頁輸出完整的 hreflang，包含指向自己的那一行。
5. 不要依瀏覽器語言強制轉址，改放一個語系選單。
6. 把第 3 步寫成自動檢查，放進每次發布都會跑的流程裡。

第 3 步是最容易被跳過的。網站看起來正常，不代表每一個網址都對了。
