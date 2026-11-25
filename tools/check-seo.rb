#!/usr/bin/env ruby
#
# 檢查建置成品的 SEO 輸出：作者與署名連結、文章與首頁的結構化資料、標題後綴、tab 頁的結構化資料、標籤頁 noindex、
# sitemap 內容、x-default 與 feed 連結、封面圖的載入方式與 alt、viewport、首頁與分類頁的標題與描述、
# llms.txt 的文章清單、給 agent 的 Markdown 版本與其中的圖片路徑、文章的 BreadcrumbList。
#
# _plugins/seo-hook.rb 與 _includes/metadata-hook.html 依賴主題和 jekyll-seo-tag 的輸出格式，
# 格式一變就會靜默失效，所以這裡只看成品。語系網址的檢查在 tools/check-i18n.rb。
#
# Usage: ruby tools/check-seo.rb [site_dir]
#   site_dir 是 _site 加上 baseurl，預設 _site

require 'cgi'
require 'json'
require 'uri'
require 'yaml'

config = YAML.load_file(File.expand_path('../_config.yml', __dir__))
site_dir = ARGV.fetch(0, '_site')
origin = "#{ config['url'] }#{ config['baseurl'] }"
default_lang = config['default_lang']
tab_files = Dir[File.expand_path('../_tabs/*.md', __dir__)]
tabs = tab_files.map { |file| File.basename(file, '.md') }
# front matter 寫了 noindex 的 tab 不會出現在 sitemap
listed_tabs = tab_files.reject { |file| File.read(file).match?(/^noindex: true$/) }.map { |file| File.basename(file, '.md') }
failures = []

# 文章會在程式碼區塊展示 HTML 原始碼，所以 <!DOCTYPE 不看已閉合的 fenced code；未閉合的整段保留
def markdown_without_closed_fences(text)
  lines = text.lines
  kept = []
  i = 0
  while i < lines.size
    line = lines[i]
    if (m = line.match(/\A {0,3}(`{3,}|~{3,})(.*)\r?\n?\z/)) && (m[1].start_with?('~') || !m[2].include?('`'))
      close = /\A {0,3}#{Regexp.escape(m[1][0])}{#{m[1].size},}[ \t]*\r?\n?\z/
      j = (i + 1...lines.size).find { |k| lines[k].match?(close) }
      return (kept + lines[i..]).join unless j
      i = j + 1
      next
    end
    kept << line
    i += 1
  end
  kept.join
end

config['languages'].each do |lang|
  root = lang == default_lang ? site_dir : "#{ site_dir }/#{ lang }"
  prefix = lang == default_lang ? '' : "/#{ lang }"
  suffix = config['title_suffix']
  site_title = config.dig('i18n_site', lang, 'title') || config['title']
  home_title = config.dig('i18n_site', lang, 'home_title') || config['home_title']
  title = ->(html) { CGI.unescapeHTML(html[%r{<title>(.*?)</title>}m, 1]) }
  description = ->(html) { html[/<meta name="description" content="([^"]*)"/, 1] }
  home_description = (description[File.read("#{ root }/index.html")] rescue nil)
  json_ld = ->(html) { JSON.parse(html[%r{<script type="application/ld\+json">(.*?)</script>}m, 1]) }
  breadcrumbs = ->(html) { html.scan(%r{<script type="application/ld\+json">(.*?)</script>}m).map { |(json)| JSON.parse(json) }.select { |d| d['@type'] == 'BreadcrumbList' } }
  # [說明, 檔案, 檔案內容應滿足的條件]
  checks = [
    ['文章 JSON-LD 的 author', Dir["#{ root }/posts/*/index.html"],
     ->(s) { json_ld[s].then { |d| d['@type'] == 'BlogPosting' && d.dig('author', 'name') == config.dig('author', 'name') } }],
    ['文章 JSON-LD 的語言與發行者', Dir["#{ root }/posts/*/index.html"],
     ->(s) { json_ld[s].then { |d| d['inLanguage'] == lang && d['publisher'] && d['publisher'] == d['author'] } }],
    # 署名原本連到 social.links 的第一個（X）；文章改由 _data/authors.yml 指定作者後連到「關於」頁
    ['文章署名連到「關於」頁', Dir["#{ root }/posts/*/index.html"],
     ->(s) { s.include?(%(<a href="#{ origin }#{ prefix }/about/">#{ config.dig('social', 'name') }</a>)) }],
    # 主題的 feed.xml 直接輸出文章的 author，作者 ID 與名稱不同時會露出 ID
    ['feed 的作者名稱', ["#{ root }/feed.xml"],
     ->(s) { s.scan(%r{<author>\s*<name>(.*?)</name>}m).flatten.then { |names| names.any? && names.uniq == [config.dig('social', 'name')] } }],
    # 英文版在 i18n_site 把 alternate_name 留空，不輸出
    ['首頁 WebSite 的 alternateName', ["#{ root }/index.html"],
     ->(s) { json_ld[s].then { |d| d['@type'] == 'WebSite' && d['alternateName'] == config.dig('i18n_site', lang).to_h.fetch('alternate_name', config['alternate_name']) } }],
    ['<title> 後綴', Dir["#{ root }/{posts/*,about,archives}/index.html"],
     ->(s) { s[%r{<title>(.*?)</title>}m, 1].then { |t| t.end_with?(" | #{ suffix }") && (site_title == suffix || !t.end_with?(" | #{ site_title }")) } }],
    ['tab 頁不是文章', tabs.map { |tab| "#{ root }/#{ tab }/index.html" },
     ->(s) { !s.include?('article:published_time') && json_ld[s].then { |d| d['@type'] != 'BlogPosting' && !d.key?('datePublished') } }],
    ['標籤頁與標籤索引頁 noindex', Dir["#{ root }/tags/{,*/}index.html"],
     ->(s) { s.include?('<meta name="robots" content="noindex, follow">') }],
    ['文章頁沒有 noindex', Dir["#{ root }/posts/*/index.html"], ->(s) { !s.include?('name="robots"') }],
    ['sitemap 只列可收錄的頁面', ["#{ root }/sitemap.xml"],
     ->(s) { s.scan(%r{<loc>([^<]*)</loc>}).flatten.then { |urls| urls.any? && urls.none? { |u| u =~ %r{/tags/|/assets/|/google\w+\.html} } } }],
    ['x-default 指向英文版', Dir["#{ root }/{,posts/*/,about/}index.html"],
     ->(s) { s[/hreflang="x-default" href="([^"]*)"/, 1].to_s.start_with?("#{ origin }/en/") }],
    ['feed 連結', Dir["#{ root }/{,posts/*/}index.html"],
     ->(s) { s.include?(%(type="application/atom+xml")) && s[/type="application\/atom\+xml"[^>]* href="([^"]*)"/, 1] == "#{ config['baseurl'] }#{ prefix }/feed.xml" }],
    ['「關於」頁是 ProfilePage', ["#{ root }/about/index.html"],
     ->(s) { json_ld[s].then { |d| d['@type'] == 'ProfilePage' && d.dig('mainEntity', 'name') == config.dig('social', 'name') && d['description'] && d.dig('mainEntity', 'description') == d['description'] } }],
    ['JSON-LD 圖片型別', Dir["#{ root }/posts/*/index.html"], ->(s) { !s.include?('"imageObject"') }],
    ['sitemap 的 tab 頁沒有 lastmod', ["#{ root }/sitemap.xml"],
     ->(s) { listed_tabs.any? && listed_tabs.all? { |tab| s.include?("/#{ tab }/</loc>") && s !~ %r{/#{ tab }/</loc>\s*<lastmod>} } }],
    ['首頁標題', ["#{ root }/index.html"], ->(s) { title[s] == home_title }],
    ['首頁分頁的標題帶頁碼', Dir["#{ root }/page*/index.html"],
     ->(s) { title[s] != home_title && title[s] =~ /\d/ && title[s].end_with?(" | #{ suffix }") }],
    ['分頁連結帶尾斜線', Dir["#{ root }/{,page*/}index.html"],
     ->(s) { s.scan(%r{href="[^"]*/page\d+/?"}).then { |links| links.any? && links.all? { |link| link.end_with?('/"') } } }],
    # 標題不能只是「分類名稱 | 後綴」，描述不能沿用站台描述
    ['分類頁有自己的標題與描述', Dir["#{ root }/categories/*/index.html"],
     ->(s) { title[s] != "#{ CGI.unescapeHTML(s[/property="og:title" content="([^"]*)"/, 1]) } | #{ suffix }" && description[s] && description[s] != home_description }],
    ['「彙整」與「分類」頁有自己的描述', %w(archives categories).map { |tab| "#{ root }/#{ tab }/index.html" },
     ->(s) { description[s] && description[s] != home_description && description[s] !~ /:count/ }],
    # 標題不能只是「專案 | 後綴」，描述不能是內文開頭的泛稱
    ['「專案」頁有自己的標題與描述', ["#{ root }/projects/index.html"],
     ->(s) { title[s] != "#{ CGI.unescapeHTML(s[/property="og:title" content="([^"]*)"/, 1]) } | #{ suffix }" && title[s].end_with?(" | #{ suffix }") && description[s] && description[s] != home_description && !description[s].start_with?('These are projects', '這裡收錄', '这里收录') }],
    # 沒有封面的文章不會有 preview-img；有的話第一張要立即載入，其餘維持 lazy
    ['第一張封面圖優先載入', Dir["#{ root }/{,posts/*/}index.html"],
     ->(s) { s[/class="[^"]*\bpreview-img\b[^>]*>\s*<img\b[^>]*>/].then { |cover| cover ? cover.include?('fetchpriority="high"') && cover !~ /shimmer|loading="lazy"/ : !s.include?('preview-img') } }],
    # 主題處理 <img> 時曾把 alt 裡的「 /」刪掉；og:image:alt 由 seo-tag 輸出，不經過那段，拿來對照
    ['封面圖的 alt 與 og:image:alt 相同', Dir["#{ root }/posts/*/index.html"],
     ->(s) { s[/property="og:image:alt" content="([^"]*)"/, 1].then { |alt| alt.nil? || CGI.unescapeHTML(s[/\bpreview-img\b[^>]*>\s*<img\b[^>]*?\balt="([^"]*)"/, 1].to_s) == CGI.unescapeHTML(alt) } }],
    ['viewport 允許縮放', Dir["#{ root }/{,posts/*/,about/}index.html"],
     ->(s) { s[/<meta\s+name="viewport"[^>]*>/m].then { |tag| tag && !tag.include?('user-scalable') } }],
    ['llms.txt 列出每篇文章', ["#{ root }/llms.txt"],
     ->(s) { s.scan(%r{\]\(#{ Regexp.escape("#{ origin }#{ prefix }") }/posts/([^/)]+)/\)}).flatten.sort.then { |slugs| slugs.any? && slugs == Dir["#{ root }/posts/*/index.html"].map { |file| File.basename(File.dirname(file)) }.sort } }],
    # Cloudflare 把帶 Accept: text/markdown 的請求改寫到這些檔案，少一份 agent 就會拿到 404
    ['文章與「關於」頁有 Markdown 版本', Dir["#{ root }/{posts/*,about}/index.html"].map { |file| file.sub(/html\z/, 'md') },
     ->(s) { !s.strip.empty? && s !~ /\{% (?:end)?raw %\}/i && markdown_without_closed_fences(s) !~ /<!DOCTYPE/i }],
    # 圖片路徑要帶上 media_subpath，否則會指到文章目錄下不存在的檔案
    ['Markdown 版本的圖片都存在', Dir["#{ root }/{posts/*,about}/index.md"],
     ->(s) { markdown_without_closed_fences(s).scan(/!\[.*?\]\(([^)\s]+)/).flatten.reject { |src| src =~ %r{\A[a-z][a-z0-9+.-]*:}i }.all? { |src| File.exist?("#{ site_dir }#{ src.delete_prefix(config['baseurl'].to_s) }") } }],
    ['首頁的 Markdown 版本是 llms.txt', ["#{ root }/index.md"], ->(s) { s == File.read("#{ root }/llms.txt") }],
    # 首頁 → 分類 → 文章。分類網址要與頁面上的分類連結相同、指向已建置的分類頁；
    # 最後一項沒有 item，名稱與 <title> 相同（seo-tag 的 headline 會把 ' 換成 ’，不能拿來比）
    ['文章的 BreadcrumbList', Dir["#{ root }/posts/*/index.html"],
     ->(s) {
       items = breadcrumbs[s].then { |lists| lists.size == 1 ? lists[0]['itemListElement'] : [] }
       categories = items[1...-1].to_a
       # 只看文章底部的分類連結，內文也可能連到分類頁
       links = s[%r{class="post-tail-wrapper.*?</div>}m].to_s.scan(%r{href="(#{ config['baseurl'] }#{ prefix }/categories/[^"]+)"}).flatten.map { |href| "#{ config['url'] }#{ href }" }
       items.size >= 2 && items.map { |i| i['position'] } == (1..items.size).to_a &&
         items[0]['item'] == "#{ origin }#{ prefix }/" && categories.map { |i| i['item'] } == links &&
         categories.all? { |i| File.exist?("#{ root }#{ URI.decode_uri_component(i['item'].delete_prefix("#{ origin }#{ prefix }")) }index.html") } &&
         !items[-1].key?('item') && items[-1]['name'] == title[s].delete_suffix(" | #{ suffix }")
     }]
  ]

  summary = checks.map do |desc, files, valid|
    failures << "#{ root }: 沒有找到可檢查「#{ desc }」的檔案" if files.empty?
    files.each do |file|
      ok = File.exist?(file) && (valid[File.read(file)] rescue false)
      failures << "#{ file }: #{ desc }" unless ok
    end
    "#{ desc } #{ files.size }"
  end
  puts "#{ lang }: #{ summary.join('、') }"
end

abort failures.join("\n") unless failures.empty?
