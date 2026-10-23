# 本機執行指南

這個網站使用 Jekyll 與 Chirpy 主題。CI 使用 Ruby 3.4，本機也應使用 Ruby 3.4，避免 Ruby 與 Bundler 版本不相容。

## 環境需求

請先安裝下列工具：

- Git
- Ruby 3.4
- Bundler
- Bash。macOS 與 Linux 可直接使用，Windows 建議透過 WSL 或 Git Bash 執行專案腳本。

macOS 內建的 Ruby 2.6 無法執行此專案。可透過 rbenv、asdf 或 Homebrew 安裝 Ruby 3.4。完成後先檢查目前 shell 實際使用的版本：

```bash
ruby -v
bundle -v
```

`ruby -v` 應顯示 `ruby 3.4.x`。若仍顯示 `2.6.x`，請先修正 Ruby 版本管理工具的 shell 設定，再繼續安裝依賴。

## 首次設定

從 GitHub 取得專案，再安裝 Ruby gems：

```bash
git clone https://github.com/justmaocom/justmaocom.github.io.git
cd justmaocom.github.io
bundle install
```

`assets/lib` 存放 Chirpy 使用的字型與前端套件。這些檔案已提交在 repository 內，建置與預覽網站不需要 Node.js。更新方式見[更新 assets/lib](#更新-assetslib)。

專案也需要完整的 Git 歷史來計算文章最後更新時間。一般 clone 不需額外處理。若曾使用 `--depth` 建立淺層 clone，可先檢查：

```bash
git rev-parse --is-shallow-repository
```

結果是 `true` 時，再取得完整歷史：

```bash
git fetch --unshallow
```

## 啟動開發伺服器

在 repository 根目錄執行：

```bash
bash tools/run.sh
```

瀏覽器開啟 [http://127.0.0.1:4000](http://127.0.0.1:4000)。開發伺服器已啟用 LiveReload，修改文章或版面後會重新產生頁面。修改 `_config.yml` 後需要停止並重新啟動伺服器。

按 `Ctrl+C` 可停止伺服器。

需要讓同一個區域網路內的其他裝置連線時，改綁所有網路介面：

```bash
bash tools/run.sh -H 0.0.0.0
```

其他裝置需使用這台電腦的區網 IP 與連接埠 `4000`。此模式會讓區網內的裝置存取開發站台，不使用時請維持預設的 `127.0.0.1`。

要用正式環境設定預覽，可執行：

```bash
bash tools/run.sh -p
```

## 預覽草稿

`_drafts/` 內的草稿不會出現在一般開發伺服器。預覽草稿時直接執行 Jekyll：

```bash
bundle exec jekyll serve --livereload --drafts --host 127.0.0.1
```

若文章已放在 `_posts/` 且 front matter 設為 `published: false`，則使用：

```bash
bundle exec jekyll serve --livereload --unpublished --host 127.0.0.1
```

這是兩種不同的草稿流程。`_drafts/` 不需要 `draft: true`。

## 送出前驗證

執行與 CI 相同的 production 建置及站內連結檢查：

```bash
bash tools/test.sh
```

腳本會刪除舊的 `_site/`、重新建置網站，再用 html-proofer 檢查產生的 HTML。外部網址不在檢查範圍內。指令成功結束且沒有錯誤訊息，才算通過驗證。

只想檢查部分輸出時，可先建置，再指定 `_site/` 內的目錄或 HTML 檔：

```bash
JEKYLL_ENV=production bundle exec jekyll build -d _site
bundle exec htmlproofer _site/posts --disable-external
```

## 更新 assets/lib

`assets/lib` 的版本由 `package.json` 的固定版本與 `package-lock.json` 的 sha512 integrity 決定。`tools/sync-lib.mjs` 從 `node_modules` 把主題需要的檔案複製到 `assets/lib/`。`fonts/` 與 `LICENSE` 不受腳本管理，維持原樣。

更新需要 Node.js 與 npm。先改版本，再重新產生 `assets/lib`：

```bash
npm install <套件>@<版本>
npm run sync-lib
```

接著把 `package.json`、`package-lock.json` 與 `assets/lib/` 一起提交。CI 的 `lib` job 會執行 `npm ci && npm run sync-lib`，產生的檔案與提交的 `assets/lib` 不同時就失敗。

Dependabot 每週檢查 npm 套件，minor 與 patch 合成一個 PR，major 各自一個 PR。這些 PR 只會修改 `package.json` 與 `package-lock.json`，所以要在 PR 分支上執行 `npm ci && npm run sync-lib`，提交 `assets/lib/` 後推回，`lib` 檢查才會通過。

mermaid 等套件的 dist 檔已把自己的相依套件打包進去。`package-lock.json` 裡的間接相依套件（例如 dompurify）升版時，站上的檔案不會改變。要修正這類漏洞，必須升級直接相依的套件，讓新版的 dist 檔帶入修正。

## 常見問題

### `bundle exec` 無法執行

先執行 `ruby -v` 與 `which ruby`。最常見的原因是 shell 仍在使用 macOS 內建的 Ruby 2.6。切換到 Ruby 3.4 後，重新執行 `bundle install`。

### 頁面沒有樣式、圖示或互動功能

檢查 `assets/lib` 是否與提交的內容一致：

```bash
git status -- assets/lib
```

若有檔案被修改或刪除，執行 `git restore assets/lib` 後重啟伺服器。

### 連接埠 4000 已被占用

不用 [tools/run.sh](../tools/run.sh)，直接指定其他連接埠：

```bash
bundle exec jekyll serve --livereload --host 127.0.0.1 --port 4001
```

接著開啟 [http://127.0.0.1:4001](http://127.0.0.1:4001)。

### 文章最後更新時間不正確

執行 `git rev-parse --is-shallow-repository`。若結果是 `true`，執行 `git fetch --unshallow` 後重新建置網站。
