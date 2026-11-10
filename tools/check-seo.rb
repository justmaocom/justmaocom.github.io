#!/usr/bin/env ruby
#
# 檢查建置成品的 SEO 輸出：作者、標題後綴、tab 頁的結構化資料、標籤頁 noindex、
# sitemap 內容、x-default 與 feed 連結。
#
# _plugins/seo-hook.rb 與 _includes/metadata-hook.html 依賴主題和 jekyll-seo-tag 的輸出格式，
# 格式一變就會靜默失效，所以這裡只看成品。語系網址的檢查在 tools/check-i18n.rb。
#
# Usage: ruby tools/check-seo.rb [site_dir]
#   site_dir 是 _site 加上 baseurl，預設 _site

require 'json'
require 'yaml'

config = YAML.load_file(File.expand_path('../_config.yml', __dir__))
site_dir = ARGV.fetch(0, '_site')
origin = "#{ config['url'] }#{ config['baseurl'] }"
default_lang = config['default_lang']
tabs = Dir[File.expand_path('../_tabs/*.md', __dir__)].map { |file| File.basename(file, '.md') }
failures = []

config['languages'].each do |lang|
  root = lang == default_lang ? site_dir : "#{ site_dir }/#{ lang }"
  prefix = lang == default_lang ? '' : "/#{ lang }"
  suffix = config['title_suffix']
  site_title = config.dig('i18n_site', lang, 'title') || config['title']
  json_ld = ->(html) { JSON.parse(html[%r{<script type="application/ld\+json">(.*?)</script>}m, 1]) }
  # [說明, 檔案, 檔案內容應滿足的條件]
  checks = [
    ['文章 JSON-LD 的 author', Dir["#{ root }/posts/*/index.html"],
     ->(s) { json_ld[s].then { |d| d['@type'] == 'BlogPosting' && d.dig('author', 'name') == config.dig('author', 'name') } }],
    ['<title> 後綴', Dir["#{ root }/{posts/*,about,archives}/index.html"],
     ->(s) { s[%r{<title>(.*?)</title>}m, 1].then { |t| t.end_with?(" | #{ suffix }") && (site_title == suffix || !t.end_with?(" | #{ site_title }")) } }],
    ['tab 頁不是文章', tabs.map { |tab| "#{ root }/#{ tab }/index.html" },
     ->(s) { !s.include?('article:published_time') && json_ld[s].then { |d| d['@type'] != 'BlogPosting' && !d.key?('datePublished') } }],
    ['標籤頁 noindex', Dir["#{ root }/tags/*/index.html"],
     ->(s) { s.include?('<meta name="robots" content="noindex, follow">') }],
    ['文章頁沒有 noindex', Dir["#{ root }/posts/*/index.html"], ->(s) { !s.include?('name="robots"') }],
    ['sitemap 只列可收錄的頁面', ["#{ root }/sitemap.xml"],
     ->(s) { s.scan(%r{<loc>([^<]*)</loc>}).flatten.then { |urls| urls.any? && urls.none? { |u| u =~ %r{/tags/.|/assets/|/google\w+\.html} } } }],
    ['x-default 指向英文版', Dir["#{ root }/{,posts/*/,about/}index.html"],
     ->(s) { s[/hreflang="x-default" href="([^"]*)"/, 1].to_s.start_with?("#{ origin }/en/") }],
    ['feed 連結', Dir["#{ root }/{,posts/*/}index.html"],
     ->(s) { s.include?(%(type="application/atom+xml")) && s[/type="application\/atom\+xml"[^>]* href="([^"]*)"/, 1] == "#{ config['baseurl'] }#{ prefix }/feed.xml" }]
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
