#!/usr/bin/env ruby
#
# 比對剛建置的 sitemap 與線上版本，列出新增、lastmod 改變與被移除的網址，組成 IndexNow 的請求內容。
#
# IndexNow 要求只送有變動的網址，重送沒變的會被回 422 或 429，所以不送整份 sitemap。
# 文章的 lastmod 來自 git 歷史，重建同一個 commit 不會改變它。列表頁沒有 lastmod，只在新增或移除時送出。
#
# 這支腳本不發請求。有變動時在 stdout 印一行 JSON，由 .github/workflows/pages-deploy.yml 在部署後送出。
# 沒有變動或抓不到線上 sitemap 時什麼都不印，寧可漏送也不整份重送。
#
# Usage: ruby tools/indexnow.rb [site_dir]
#   site_dir 是 _site 加上 baseurl，預設 _site

require 'cgi'
require 'json'
require 'net/http'
require 'yaml'

config = YAML.load_file(File.expand_path('../_config.yml', __dir__))
site_dir = ARGV.fetch(0, '_site')
origin = "#{ config['url'] }#{ config['baseurl'] }"
sitemaps = config['languages'].map { |lang| lang == config['default_lang'] ? 'sitemap.xml' : "#{ lang }/sitemap.xml" }

keys = Dir["#{ site_dir }/*.txt"].filter_map do |file|
  name = File.basename(file, '.txt')
  name if name.match?(/\A[A-Za-z0-9-]{8,128}\z/) && File.read(file) == name
end
unless keys.size == 1
  abort "#{ site_dir }: 根目錄要剛好有一個 IndexNow 金鑰檔 <key>.txt，內容只有 key 本身、不含換行，目前找到 #{ keys.size } 個"
end
key = keys.first

parse = lambda do |xml, source|
  urls = xml.scan(%r{<url>(.*?)</url>}m).to_h do |(entry)|
    loc = entry[%r{<loc>([^<]+)</loc>}, 1] or raise "#{ source }: <url> 裡沒有 <loc>"
    [CGI.unescapeHTML(loc), entry[%r{<lastmod>([^<]+)</lastmod>}, 1]]
  end
  urls.empty? ? raise("#{ source }: 沒有 <url>") : urls
end

built = sitemaps.map { |path| parse[File.read("#{ site_dir }/#{ path }", encoding: 'UTF-8'), "#{ site_dir }/#{ path }"] }.reduce(:merge)

live = begin
  sitemaps.map do |path|
    url = "#{ origin }/#{ path }"
    res = Net::HTTP.get_response(URI(url))
    raise "#{ url }: HTTP #{ res.code }" unless res.is_a?(Net::HTTPSuccess)
    parse[res.body.force_encoding('UTF-8'), url]
  end.reduce(:merge)
rescue StandardError => e
  warn "IndexNow: 無法取得線上 sitemap，這次不送出（#{ e.message }）"
  exit
end

changed = built.reject { |loc, lastmod| live.key?(loc) && live[loc] == lastmod }.keys + (live.keys - built.keys)
warn "IndexNow: #{ changed.size } 個網址有變動", *changed
exit if changed.empty?

puts JSON.generate(host: URI(config['url']).host, key: key, keyLocation: "#{ origin }/#{ key }.txt", urlList: changed)
