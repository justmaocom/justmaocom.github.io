# 只是一根毛

[justmao.com](https://justmao.com) 的原始碼。這是 JustMao 的個人網站，主要記錄 AI Agent、RAG、後端、資安與軟體開發實作。

網站以 [Jekyll](https://jekyllrb.com/) 和 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 建置，內容使用正體中文，並透過 GitHub Actions 部署到 GitHub Pages。

## 技術與設定

- Ruby 3.4、Jekyll 與 `jekyll-theme-chirpy ~> 7.6`
- GitHub Pages 自動部署與 `html-proofer` 站內連結檢查
- `assets/lib` submodule 提供自架的字型與前端套件
- PWA 與離線快取
- Giscus 留言
- 自訂網域 `justmao.com`

Chirpy 主題本身由 gem 提供。這個 repository 只保留站台設定、內容，以及 gem 無法完整提供的 `_plugins/`、`_tabs/` 和 `index.html`。若要覆寫主題版面，請把主題 gem 中的檔案複製到 repository 內的相同路徑後再修改。

## 本機執行

請先安裝 Git、Ruby 3.4、Bundler 與 Bash。macOS 內建的 Ruby 2.6 無法執行此專案。

```bash
git clone --recurse-submodules https://github.com/justmaocom/justmaocom.github.io.git
cd justmaocom.github.io
bundle install
bash tools/run.sh
```

網站預設位於 [http://127.0.0.1:4000](http://127.0.0.1:4000)。若 clone 時沒有下載 submodule，請補執行：

```bash
git submodule update --init
```

本專案使用 Git 歷史計算文章最後更新時間，請勿使用 shallow clone。完整的環境設定、草稿預覽方式與常見問題請見[本機執行指南](docs/local-development.md)。

## 驗證

送出變更前，執行與 CI 相同的 production 建置及站內連結檢查：

```bash
bash tools/test.sh
```

## 主要結構

```text
_posts/          正式文章
_tabs/           側邊欄頁面
_plugins/        自訂 Jekyll plugin
_data/           聯絡方式與分享選單設定
assets/img/      網站與文章圖片
assets/lib/      Chirpy 前端資源 submodule
docs/            開發與文章撰寫文件
tools/           本機啟動與驗證腳本
_config.yml      網站與主題設定
index.html       首頁入口
```

文章檔名使用 `YYYY-MM-DD-title.md`，放在 `_posts/`。Chirpy front matter、圖片、程式碼區塊與草稿規則請見[文章撰寫指南](docs/chirpy-post-authoring.md)。

## 部署

推送到 `main` 或 `master` 後，GitHub Actions 會使用 Ruby 3.4 建置網站、執行 `html-proofer`，再將輸出部署到 GitHub Pages。工作流程也可從 Actions 頁面手動執行。

## 授權

本專案採用 [MIT License](LICENSE)。
