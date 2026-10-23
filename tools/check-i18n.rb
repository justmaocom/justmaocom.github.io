#!/usr/bin/env ruby
#
# 檢查非預設語系的建置成品，確認網址都指向該語系。
#
# _plugins/i18n-hook.rb 以精確字串比對改寫輸出，Chirpy 或 jekyll-seo-tag 改了輸出格式時
# 會靜默失效，html-proofer 也看不出來，所以這裡只看成品，不看 hook 怎麼做。
#
# Usage: ruby tools/check-i18n.rb [site_dir]
#   site_dir 是放 <lang>/ 的目錄，即 _site 加上 baseurl，預設 _site

require 'cgi'
require 'uri'
require 'yaml'

config = YAML.load_file(File.expand_path('../_config.yml', __dir__))
site_dir = ARGV.fetch(0, '_site')
baseurl = config['baseurl'].to_s
origin = "#{ config['url'] }#{ baseurl }"
failures = []

(config['languages'] - [config['default_lang']]).each do |lang|
  root = "#{ site_dir }/#{ lang }"
  html = Dir["#{ root }/**/*.html"].sort
  # 檔案路徑對應的本頁網址；含非 ASCII 字元的網址在輸出中是百分比編碼，比對前先解碼
  local_url = ->(file) { "#{ origin }/#{ lang }#{ file.delete_prefix(root).delete_suffix('index.html') }" }
  is_local_page = ->(url, file) { URI.decode_uri_component(url) == local_url[file] }
  is_local_prefix = ->(url, _) { url.start_with?("#{ origin }/#{ lang }/", "#{ origin }/assets/") }

  # [說明, 檔案, 從內容取出要檢查的網址, 每個網址應滿足的條件]
  checks = [
    ['og:url', html, ->(s) { s.scan(/property="og:url" content="([^"]*)"/).flatten }, is_local_page],
    ['JSON-LD @id', html, ->(s) { s.scan(/"@id":"([^"]*)"/).flatten }, is_local_page],
    ['分享按鈕網址', html,
     ->(s) { s.scan(/#{ Regexp.escape(CGI.escape(origin)) }[\w.~%-]*/).map { |u| CGI.unescape(u) } },
     is_local_page],
    ['search.json 路徑', html, ->(s) { s.scan(%r{[^'"\s]*/assets/js/data/search\.json}) },
     ->(url, _) { url == "#{ baseurl }/#{ lang }/assets/js/data/search.json" }],
    ['search.json 文章網址', Dir["#{ root }/assets/js/data/search.json"],
     ->(s) { s.scan(/"url": "([^"]*)"/).flatten }, ->(url, _) { url.start_with?("#{ baseurl }/#{ lang }/") }],
    *%w(feed.xml sitemap.xml).map do |name|
      [name, Dir["#{ root }/#{ name }"], ->(s) { s.scan(/#{ Regexp.escape(origin) }[^"'<>\s]*/) }, is_local_prefix]
    end
  ]

  summary = checks.map do |desc, files, extract, valid|
    urls = files.flat_map { |file| extract[File.read(file)].map { |url| [file, url] } }
    urls.reject { |file, url| valid[url, file] }.each { |file, url| failures << "#{ file }: #{ desc } #{ url }" }
    failures << "#{ root }: 沒有找到任何 #{ desc }" if urls.empty?
    "#{ desc } #{ urls.size }"
  end
  puts "#{ lang }: #{ html.size } 個 HTML，#{ summary.join('、') }"
end

abort failures.join("\n") unless failures.empty?
