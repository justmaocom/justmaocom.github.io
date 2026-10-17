# Chirpy 文章撰寫設定研究

研究範圍是 Chirpy 7.6 起可用的文章 front matter 與內容語法。主要依據為 Chirpy 官方的 [Writing a New Post](https://chirpy.cotes.page/posts/write-a-new-post/) 與 [Text and Typography](https://chirpy.cotes.page/posts/text-and-typography/)；草稿規則另參考 Jekyll 官方的 [Posts](https://jekyllrb.com/docs/posts/) 說明。

## 版本邊界

本站 `Gemfile` 使用：

```ruby
gem "jekyll-theme-chirpy", "~> 7.6"
```

RubyGems 的 `~> 7.6` 代表 `>= 7.6` 且 `< 8.0`，不是只允許 7.6.x。專案也沒有提交 `Gemfile.lock`，所以每次解析依賴時可能取得不同的 7.x 版本。這個邊界已用 RubyGems 的 `Gem::Requirement` 在本機驗算；規則也見 [RubyGems 的 pessimistic version constraint](https://guides.rubygems.org/patterns/#pessimistic-version-constraint)。若要限制在 7.6.x，約束應寫成 `~> 7.6.0`。

`chirpy.cotes.page` 的教學網址沒有版本段，內容會隨目前版本更新，不能單獨當成 7.6 的固定規格。7.6 的最低基準應以 [v7.6.0 tag](https://github.com/cotes2020/jekyll-theme-chirpy/tree/v7.6.0) 與該 tag 的 [Writing a New Post 原始檔](https://github.com/cotes2020/jekyll-theme-chirpy/blob/v7.6.0/_posts/2019-08-08-write-a-new-post.md) 為準。若 Bundler 之後解析到較新的 7.x，仍須再比對該版本的 release notes。

## 最小可用 front matter

```yaml
---
title: 文章標題
description: 文章摘要
date: 2026-09-04 12:00:00 +0800
categories: [上層分類, 下層分類]
tags: [標籤一, 標籤二]
---
```

本站 `_config.yml` 已替 posts 設定 `layout: post`、`comments: true`、`toc: true` 與 `permalink: /posts/:title/`，文章通常不必重複填寫。Chirpy 的 7.6 設定基準可對照 [v7.6.0 的 `_config.yml`](https://github.com/cotes2020/jekyll-theme-chirpy/blob/v7.6.0/_config.yml)；Starter 的專案形態可對照 [chirpy-starter](https://github.com/cotes2020/chirpy-starter)。

## 檔名、日期與分類

- 正式文章放在 `_posts/`，檔名使用 `YYYY-MM-DD-title.md` 或 `.markdown`。日期部分決定 Jekyll 的文章日期，除非 front matter 的 `date` 另行覆寫。規則見 [Jekyll Posts](https://jekyllrb.com/docs/posts/#creating-post-files)。
- Chirpy 建議 `date` 寫完整時間與 UTC offset：`YYYY-MM-DD HH:MM:SS +/-TTTT`。本站時區是 `Asia/Taipei`，一般使用 `+0800`。明寫 offset 可避免作者電腦、CI 與站台時區不同時造成發布日偏移。見 [Chirpy Writing a New Post](https://chirpy.cotes.page/posts/write-a-new-post/#timezone-of-date) 與 [Jekyll configuration options](https://jekyllrb.com/docs/configuration/options/#global-configuration)。
- `categories` 是 YAML 陣列，Chirpy 的階層設計最多兩層，例如 `[程式開發, Ruby]`。可只填一層。`tags` 也是陣列，數量不受這個兩層限制；官方範本建議標籤名稱全用小寫。見 [Categories and Tags](https://chirpy.cotes.page/posts/write-a-new-post/#categories-and-tags)。

## 作者與摘要

- 未填 `author` 時，Chirpy 使用 `_config.yml` 的 `social.name` 與社群連結作為預設作者資料。本站目前會顯示 `JustMao`。
- 要覆寫單篇作者，先在 `_data/authors.yml` 以 ID 建立作者資料，再填 `author: <author_id>`。多位作者則用 `authors: [<author1_id>, <author2_id>]`。不要直接把顯示名稱當成 ID，除非它正好就是 `_data/authors.yml` 的鍵。見 [Author Information](https://chirpy.cotes.page/posts/write-a-new-post/#author-information)。
- `description` 是自訂摘要，會供文章列表、分享與 SEO metadata 等位置使用。未填時主題會由文章內容產生摘要；需要控制搜尋結果或卡片文字時應明填。見 [Post Description](https://chirpy.cotes.page/posts/write-a-new-post/#post-description)。

## 每篇文章的開關

```yaml
---
toc: false
comments: false
pin: true
math: true
mermaid: true
---
```

- `toc` 控制右側目錄。本站全域與 posts defaults 都是 `true`，單篇可用 `false` 關閉。見 [Table of Contents](https://chirpy.cotes.page/posts/write-a-new-post/#table-of-contents)。
- `comments` 控制單篇留言區。本站 posts defaults 雖是 `true`，但 `_config.yml` 的 `comments.provider` 尚未設定，因此目前不會出現可用的留言系統。單篇 `false` 可在日後啟用 provider 後仍保持關閉。見 [Comments](https://chirpy.cotes.page/posts/write-a-new-post/#comments)。
- `pin: true` 把文章釘選在首頁上方，多篇釘選文章按發布日期由新到舊排列。欄位名稱是 `pin`，不是 `pinned`。見 [Pinned Posts](https://chirpy.cotes.page/posts/write-a-new-post/#pinned-posts)。
- `math: true` 才會載入並處理文章中的數學式。行內與區塊公式依官方示例使用 MathJax 語法。見 [Mathematics](https://chirpy.cotes.page/posts/write-a-new-post/#mathematics)。
- `mermaid: true` 才會載入 Mermaid，內容放在語言標記為 `mermaid` 的 fenced code block。見 [Mermaid](https://chirpy.cotes.page/posts/write-a-new-post/#mermaid)。

## 圖片與媒體

文章內有多個相同媒體路徑前綴時，可設定：

```yaml
---
media_subpath: /assets/img/2026/example/
---
```

之後 `![說明](cover.webp)` 等相對媒體路徑會套用此前綴。`media_subpath` 適用於該篇文章的圖片、音訊與影片資源；完整外部 URL 不需要它。見 [Media URL Prefix](https://chirpy.cotes.page/posts/write-a-new-post/#media-url-prefix)。

文章的預覽圖使用 `image`：

```yaml
---
image:
  path: cover.webp
  lqip: data:image/webp;base64,...
  alt: 圖片替代文字
---
```

- `path` 是預覽圖來源，會與 `media_subpath` 配合。
- `lqip` 是圖片載入前顯示的低品質預覽，可填較小圖片的路徑或 data URI。沒有 LQIP 時可省略。
- `alt` 同時是封面圖的替代文字與封面下方的圖說（Chirpy 兩處都用它），請寫一句話的文章摘要：中文 60 字內、英文 140 字元內；不描述圖片，不以「封面：」或「本文」開頭，也不要照抄 `description`。

文章內圖片仍用 Markdown image 語法。緊接在圖片後方的斜體文字會成為圖說。Kramdown attribute 可指定寬高、位置、深淺色版本及陰影：

```markdown
![桌面畫面](screen.webp){: width="972" height="589" }
_這是圖說_

![靠左圖片](left.webp){: .left }
![淺色模式圖片](light.webp){: .light .shadow }
![深色模式圖片](dark.webp){: .dark .shadow }
```

完整規則見 [Images](https://chirpy.cotes.page/posts/write-a-new-post/#images)，預覽圖欄位見 [Preview Image](https://chirpy.cotes.page/posts/write-a-new-post/#preview-image)。

影片與音訊使用主題提供的 include：

```liquid
{% include embed/youtube.html id='VIDEO_ID' %}
{% include embed/video.html src='/assets/video/demo.mp4' %}
{% include embed/audio.html src='/assets/audio/demo.mp3' %}
```

YouTube 等分享平台與本機影片的參數見 [Video](https://chirpy.cotes.page/posts/write-a-new-post/#video)，音訊見 [Audio](https://chirpy.cotes.page/posts/write-a-new-post/#audio)。7.6.0 的 include 實作可直接檢查 [`embed/video.html`](https://github.com/cotes2020/jekyll-theme-chirpy/blob/v7.6.0/_includes/embed/video.html) 與 [`embed/audio.html`](https://github.com/cotes2020/jekyll-theme-chirpy/blob/v7.6.0/_includes/embed/audio.html)。這些行是要讓 Jekyll 實際執行的 Liquid，不可包在 `raw` 區段內。

## 提示框

Chirpy 另提供 `tip`、`info`、`warning`、`danger` 四種提示框，寫法是在 blockquote 後加對應 class：

```markdown
> 先備份再執行。
{: .prompt-warning }
```

格式與四種 class 見 [Prompts](https://chirpy.cotes.page/posts/text-and-typography/#prompts)。

## 程式碼區塊

一般 fenced code block 要填語言名稱，讓 Rouge 套用語法高亮：

````markdown
```ruby
puts "hello"
```
````

本站 `_config.yml` 已開啟 block code 的行號。Chirpy 預設不替 `plaintext`、`console` 與 `terminal` 顯示行號；其他區塊若要隱藏行號，在 code block 後加 `{: .nolineno }`。要標示來源檔名則加 `{: file="path/to/file.rb" }`，兩者可放在同一 attribute list。完整語法見 [Code Blocks](https://chirpy.cotes.page/posts/text-and-typography/#code-blocks)。

文章若要原樣展示 Liquid 的 `{{ ... }}` 或 `{% ... %}`，須用 Liquid 的 `raw` 區段包住，避免 Jekyll 在建置時先執行：

````liquid
{% raw %}
{{ site.title }}
{% include example.html %}
{% endraw %}
````

見 [Liquid Codes](https://chirpy.cotes.page/posts/text-and-typography/#liquid-codes)。若只是在文章中實際呼叫 Chirpy 的 `include`，則不要加 `raw`。

## 草稿

- 草稿放在 `_drafts/`，檔名不必有日期，例如 `_drafts/new-post.md`。Jekyll 沒有 `draft: true` 這個預設欄位。
- 用 `bundle exec jekyll serve --drafts` 預覽。完成後改成正式日期檔名並移到 `_posts/`。
- 本站 `_config.yml` 已替 `_drafts` 設定 `comments: false`。

草稿目錄、檔名與 `--drafts` 行為見 [Jekyll Drafts](https://jekyllrb.com/docs/posts/#drafts)。另一種做法是把文章留在 `_posts/` 並設 `published: false`，預覽時加 `--unpublished`；這是未發布文章，不等同 `_drafts` 工作流。見 [Jekyll front matter 的 `published`](https://jekyllrb.com/docs/front-matter/#predefined-global-variables)。

## 建議納入 `CLAUDE.md` 的重點

1. 提供一份本站可直接複製的 front matter 範本，日期固定示範 `+0800`。
2. 寫明分類最多兩層，tags 用陣列並建議小寫；不要把 categories 寫成任意深度的階層。
3. 記錄本站 `toc`、`comments` 的 defaults，以及留言 provider 目前為空。
4. 收錄 `media_subpath`、預覽圖 `image.path/lqip/alt`、`pin`、`math`、`mermaid` 與 code block attributes。
5. 補上 `_drafts` 與 `bundle exec jekyll serve --drafts` 流程。
6. 明示 `~> 7.6` 的實際範圍是整個 7.x；若文件要保證只適用 7.6.x，應同步縮緊 Gemfile 約束或提交 lockfile。
