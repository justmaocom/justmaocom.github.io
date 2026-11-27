# JustMao

[![Build and Deploy](https://github.com/justmaocom/justmaocom.github.io/actions/workflows/pages-deploy.yml/badge.svg?branch=main)](https://github.com/justmaocom/justmaocom.github.io/actions/workflows/pages-deploy.yml?query=branch%3Amain) [![License: MIT](https://img.shields.io/github/license/justmaocom/justmaocom.github.io)](LICENSE) [![Content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](https://creativecommons.org/licenses/by/4.0/) [![Website](https://img.shields.io/website?url=https%3A%2F%2Fjustmao.com)](https://justmao.com) [![Last commit](https://img.shields.io/github/last-commit/justmaocom/justmaocom.github.io/main)](https://github.com/justmaocom/justmaocom.github.io/commits/main)

English | [正體中文](README.zh-TW.md)

Source code for [justmao.com](https://justmao.com), JustMao's personal site. The site covers coding agent skills and workflows, the security problems that agents bring in, and source-code deep dives into open-source tools.

The site is built with [Jekyll](https://jekyllrb.com/) and the [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme, and GitHub Actions deploys it to GitHub Pages. Every post has three versions: Traditional Chinese, Simplified Chinese, and English. The guides in `docs/` are in Traditional Chinese.

## Tech stack and features

- Ruby 3.4, Jekyll, and `jekyll-theme-chirpy ~> 7.6`
- Multilingual output through [jekyll-polyglot](https://github.com/untra/polyglot), with Traditional Chinese at the site root, Simplified Chinese at `/zh-CN/`, and English at `/en/`
- Self-hosted fonts and front-end libraries in `assets/lib`, with versions pinned by `package.json` and `package-lock.json`
- PWA with an offline cache
- Post search on the home page only, with the search index downloaded on first use
- A newsletter signup form in the footer that posts to a self-hosted [listmonk](https://listmonk.app/), with an [ALTCHA](https://altcha.org/) proof-of-work check that loads when a reader first focuses the form
- Google Analytics and Microsoft Clarity in production, loaded only after consent for visitors in European time zones
- An `llms.txt` post index, and Markdown versions of posts for requests that send `Accept: text/markdown`
- The custom domain `justmao.com`, served through Cloudflare

## The theme files live in the gem

Chirpy's layouts, includes, styles, and scripts come from the `jekyll-theme-chirpy` gem, not from this repository. To find the theme source files, run `bundle info --path jekyll-theme-chirpy`.

To override a theme file, copy it from the gem to the same path in this repository, then edit the copy. Jekyll uses the repository file over the gem file.

## Run the site locally

Install Git, Ruby 3.4, Bundler, and Bash first. The Ruby 2.6 that ships with macOS cannot run this project. Ruby 4.x does not work either, because Chirpy 7.6 supports only Ruby 3.x. Homebrew's `ruby` formula is already 4.x, so install `ruby@3.4` instead and put its `bin` directory at the front of `PATH`.

```bash
git clone https://github.com/justmaocom/justmaocom.github.io.git
cd justmaocom.github.io
bundle install
bash tools/run.sh
```

The site runs at [http://127.0.0.1:4000](http://127.0.0.1:4000) by default. The files in `assets/lib` are committed to the repository, so you do not need Node.js to build or preview the site. To update these front-end libraries, see the [`assets/lib` update steps](docs/local-development.md#更新-assetslib) in the local development guide.

The build reads Git history to find when each post last changed, so do not use a shallow clone. For the full environment setup, draft previews, and common problems, see the [local development guide](docs/local-development.md).

## Check your changes

Before you submit a change, run the same checks as CI:

```bash
bash tools/test.sh
```

The script builds the site in production mode. It then checks the language prefixes of URLs in the Simplified Chinese and English output, checks the SEO output, and runs html-proofer on internal links.

## Repository layout

```text
_posts/          Posts, with Simplified Chinese and English translations in zh-CN/ and en/
_drafts/         Drafts, created when needed
_tabs/           Sidebar and footer pages
_includes/       Theme partials that this site overrides or adds
_layouts/        Theme layouts that this site overrides
_plugins/        Custom Jekyll plugins, such as localized URL rewriting and SEO fixes
_data/           Contact links, the share menu, project page data, newsletter list UUIDs, and UI strings per language
assets/img/      Site and post images
assets/js/       Custom front-end scripts
assets/js/dist/  Theme service worker override that changes on every build, so browsers detect updates
assets/lib/      Front-end assets for Chirpy and the ALTCHA widget, copied from npm packages by tools/sync-lib.mjs
docs/            Guides for local development, post authoring, writing style, series, and translation
tools/           Scripts that run the site locally, check it, and list URLs for IndexNow
_config.yml      Site and theme settings
index.html       Home page entry
```

Post file names use the `YYYY-MM-DD-title.md` format and go in `_posts/`. The Simplified Chinese and English translations use the same file name and go in `_posts/zh-CN/` and `_posts/en/`. For Chirpy front matter, images, code blocks, and drafts, see the [post authoring guide](docs/chirpy-post-authoring.md). Before you write or edit post text, read the [writing style guide](docs/post-writing-style.md). For posts in a series, see the [series guide](docs/series-playbook.md). For translation wording and category mappings, see the [translation guide](docs/translation-guide.md). The comments at the top of each file in `_plugins/` explain how the multilingual output and the SEO fixes work.

## Deployment

After a push to `main` or `master`, GitHub Actions builds the site with Ruby 3.4, runs the same checks as `tools/test.sh`, and confirms that `assets/lib` matches `package-lock.json`. The workflow deploys to GitHub Pages only after all of these pass. A push that changes only `README.md`, `README.zh-TW.md`, `LICENSE`, or `.gitignore` does not trigger a deployment. Pull requests run the build and the checks, but do not deploy. You can also run the workflow manually from the Actions tab.

During the build, `tools/indexnow.rb` compares the new sitemaps with the live ones and lists the URLs that are new, updated, or removed. After the deployment, the `indexnow` job sends these URLs to [IndexNow](https://www.indexnow.org/), so that Bing and other search engines crawl them again sooner. The `<key>.txt` file in the repository root, whose name matches its content, is the IndexNow verification key. Do not rename it or change its content.

The last-modified time of each post comes from Git history. Some bulk commits do not change post content, such as an image conversion or a site-wide path change. After such a commit merges into `main`, add its full SHA to `.lastmod-ignore-revs`. Otherwise every post shows as just updated, and the `lastmod` values in the sitemap become wrong. Add the SHA only after the merge, because a rebase changes it.

A URL Rewrite Rule in the Cloudflare dashboard handles content negotiation for `Accept: text/markdown`. The rule is not in this repository. The comment at the top of `_plugins/markdown-hook.rb` records its conditions and rewrite expression. When you add a language, or make that plugin output other pages, update the rule to match.

## License

The code is licensed under the [MIT License](LICENSE). The posts in `_posts/` are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as the footer of each post on the site states.
