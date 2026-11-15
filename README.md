# 只是一根毛

正體中文 | [English](README.en.md)

[justmao.com](https://justmao.com) 的原始碼。這是 JustMao 的個人網站，記錄 coding agent 的 skill 與工作流程、agent 帶來的資安問題，以及開源工具的原始碼拆解。

網站以 [Jekyll](https://jekyllrb.com/) 和 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主題建置，透過 GitHub Actions 部署到 GitHub Pages。每篇文章都有正體中文、簡體中文與英文三個版本。

## 技術與設定

- Ruby 3.4、Jekyll 與 `jekyll-theme-chirpy ~> 7.6`
- [jekyll-polyglot](https://github.com/untra/polyglot) 多語系，正體中文在網站根目錄，簡體中文在 `/zh-CN/`，英文在 `/en/`
- `assets/lib` 提供自架的字型與前端套件，版本由 `package.json` 與 `package-lock.json` 鎖定
- PWA 與離線快取
- Giscus 留言，討論串存在本 repository 的 Discussions
- `llms.txt` 文章索引，以及請求帶 `Accept: text/markdown` 時回傳的 Markdown 版文章
- 自訂網域 `justmao.com`，前面經過 Cloudflare

## 主題檔案在 gem 裡

Chirpy 的 layout、include、樣式與腳本由 `jekyll-theme-chirpy` gem 提供，不在這個 repository 內。執行 `bundle info --path jekyll-theme-chirpy` 可以找到主題原始檔的位置。

要覆寫主題的某個檔案，把它從 gem 複製到 repository 內的相同路徑再修改。Jekyll 會優先使用 repository 內的同名檔案。

## 本機執行

請先安裝 Git、Ruby 3.4、Bundler 與 Bash。macOS 內建的 Ruby 2.6 無法執行此專案。Ruby 4.x 也不行，因為 Chirpy 7.6 只支援 Ruby 3.x。Homebrew 的 `ruby` 已是 4.x，請改裝 `ruby@3.4`，並把它的 `bin` 目錄放到 `PATH` 前面。

```bash
git clone https://github.com/justmaocom/justmaocom.github.io.git
cd justmaocom.github.io
bundle install
bash tools/run.sh
```

網站預設位於 [http://127.0.0.1:4000](http://127.0.0.1:4000)。`assets/lib` 的檔案已提交在 repository 內，建置與預覽網站不需要 Node.js。要更新這些前端套件，請見[本機執行指南](docs/local-development.md#更新-assetslib)。

本專案使用 Git 歷史計算文章最後更新時間，請勿使用 shallow clone。完整的環境設定、草稿預覽方式與常見問題請見[本機執行指南](docs/local-development.md)。

## 驗證

送出變更前，執行與 CI 相同的檢查：

```bash
bash tools/test.sh
```

這個腳本以 production 模式建置網站，再依序檢查非預設語系的網址前綴、SEO 輸出，最後用 html-proofer 檢查站內連結。

## 主要結構

```text
_posts/          正式文章，簡體中文與英文譯文在 zh-CN/ 與 en/ 子目錄
_drafts/         草稿，需要時再建立
_tabs/           側邊欄頁面
_includes/       覆寫或新增的主題片段
_plugins/        自訂 Jekyll plugin，例如多語系網址改寫與 SEO 修正
_data/           聯絡方式、分享選單、專案頁資料與各語系介面文字
assets/img/      網站與文章圖片
assets/js/       自訂前端腳本
assets/lib/      Chirpy 前端資源，由 tools/sync-lib.mjs 從 npm 套件複製
docs/            開發、文章撰寫與翻譯文件
tools/           本機啟動、驗證與 IndexNow 腳本
_config.yml      網站與主題設定
index.html       首頁入口
```

文章檔名使用 `YYYY-MM-DD-title.md`，放在 `_posts/`。簡體中文與英文譯文使用相同檔名，分別放在 `_posts/zh-CN/` 與 `_posts/en/`。Chirpy front matter、圖片、程式碼區塊與草稿規則請見[文章撰寫指南](docs/chirpy-post-authoring.md)，譯文的用詞與分類對照請見[三語翻譯規則](docs/translation-guide.md)。多語系與 SEO 的實作說明寫在 `_plugins/` 各檔案開頭的註解。

## 部署

推送到 `main` 或 `master` 後，GitHub Actions 使用 Ruby 3.4 建置網站，執行與 `tools/test.sh` 相同的檢查，並確認 `assets/lib` 與 `package-lock.json` 一致。全部通過後才部署到 GitHub Pages。只改動 `README.md`、`README.en.md`、`LICENSE` 或 `.gitignore` 的推送不會觸發部署。Pull request 只跑建置與檢查，不部署。工作流程也可從 Actions 頁面手動執行。

建置時，`tools/indexnow.rb` 比對新建置與線上的 sitemap，找出新增、更新或移除的網址。部署完成後，`indexnow` job 把這些網址送給 [IndexNow](https://www.indexnow.org/)，讓 Bing 等搜尋引擎提早重新抓取。根目錄檔名與內容相同的 `<key>.txt` 是 IndexNow 的驗證金鑰，不要改名或修改內容。

文章的最後更新時間來自 Git 歷史。沒有動到文章內容的批次 commit，例如圖片轉檔或全站改路徑，合併進 `main` 後要把它的完整 SHA 加進 `.lastmod-ignore-revs`。否則所有文章都會顯示成剛更新過，sitemap 的 `lastmod` 也跟著失準。SHA 要等合併後再填，因為 rebase 會改變它。

`Accept: text/markdown` 的內容協商由 Cloudflare dashboard 裡的一條 URL Rewrite Rule 處理，不在 repository 內。規則內容寫在 `_plugins/markdown-hook.rb` 開頭的註解。新增語系，或讓這個 plugin 輸出其他頁面時，要同步修改這條規則。

## 授權

程式碼採用 [MIT License](LICENSE)。`_posts/` 內的文章採用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，與網站上每篇文章頁尾的標示一致。
