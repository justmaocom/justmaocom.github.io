#!/usr/bin/env ruby
#
# 補齊 jekyll-polyglot 沒處理、但 Chirpy 需要的多語系細節。
#
# polyglot 以各語系各跑一次完整建置，非預設語系輸出到 /<lang>/ 之下，
# 並只把 HTML 裡 href="..." 形式的站內網址補上語系前綴。其餘寫在別處的網址
# 仍指向預設語系，這裡在它處理完之後再補上：
#
# - og:url、JSON-LD 的 url 與 @id（jekyll-seo-tag 寫在 content 或 JSON 裡），以及分享按鈕的網址
# - JSON-LD 裡作者的網址（_config.yml 的 author.url，指向「關於」頁）
# - 搜尋框讀取的 search.json 路徑，以及 search.json 內各篇文章的 url
# - feed.xml、sitemap.xml 等非 HTML 輸出中的絕對網址
#
# 非預設語系不輸出 robots.txt：爬蟲只讀網域根目錄那一份。_config.yml 的 exclude_from_localization
# 擋掉本 repo 的 assets/robots.txt 之後，jekyll-sitemap 發現站台沒有 robots.txt 會自己產生一份，
# 所以要等產生器跑完再移除。
#
# 另外依 _config.yml 的 i18n_site，替各語系覆寫 title、home_title、tagline、description。

require 'cgi'

module I18nHook

  SITE_KEYS = %w(title home_title tagline description).freeze

  module_function

  def localize_site_info(site)
    original = (site.config['i18n_site_original'] ||= site.config.slice(*SITE_KEYS))
    overrides = site.config.dig('i18n_site', site.active_lang) || {}
    SITE_KEYS.each do |key|
      site.config[key] = overrides.fetch(key, original[key])
    end
  end

  def drop_robots(site)
    site.pages.reject! { |page| page.url == '/robots.txt' }
  end

  def localize_output(site, doc)
    return if doc.output.nil? || doc.output.empty?

    lang = site.active_lang
    origin = "#{ site.config['url'] }#{ site.baseurl }"

    if doc.output_ext == '.html'
      # 只換「本頁網址」這個精確字串，圖片等其他網址與預設語系的 hreflang 連結都不動
      page_url = "#{ origin }#{ doc.url }"
      local_url = "#{ origin }/#{ lang }#{ doc.url }"
      doc.output = doc.output
        .gsub(%(content="#{ page_url }"), %(content="#{ local_url }"))
        .gsub(%("url":"#{ page_url }"), %("url":"#{ local_url }"))
        .gsub(%("@id":"#{ page_url }"), %("@id":"#{ local_url }"))
        .gsub(CGI.escape(page_url), CGI.escape(local_url)) # 分享按鈕的 query string
        .gsub("'#{ site.baseurl }/assets/js/data/search.json'",
              "'#{ site.baseurl }/#{ lang }/assets/js/data/search.json'")

      author_url = site.config.dig('author', 'url').to_s
      if author_url.start_with?("#{ origin }/")
        doc.output = doc.output.gsub(%("url":"#{ author_url }"),
                                     %("url":"#{ origin }/#{ lang }#{ author_url.delete_prefix(origin) }"))
      end
    else
      # 已帶語系前綴，或屬於只輸出一份的共用資源（assets/…）的網址，都不處理
      skip = "(?!(?:#{ site.languages.map { |l| Regexp.escape(l) }.join('|') })/)(?!assets/)"
      doc.output = doc.output
        .gsub(%r{(#{ Regexp.escape(origin) }/)#{ skip }}, "\\1#{ lang }/")
        .gsub(%r{("url": "#{ Regexp.escape(site.baseurl.to_s) }/)#{ skip }}, "\\1#{ lang }/")
    end
  end

end

Jekyll::Hooks.register :site, :post_read do |site|
  I18nHook.localize_site_info(site)
end

Jekyll::Hooks.register :site, :pre_render do |site|
  I18nHook.drop_robots(site) unless site.active_lang == site.default_lang
end

# polyglot 的 :site, :post_render hook 先註冊（gem 比 _plugins 早載入），
# 同優先度的 hook 依註冊順序執行，因此這裡看到的是它改寫過的輸出
Jekyll::Hooks.register :site, :post_render do |site|
  next if site.active_lang == site.default_lang

  (site.collections.values.flat_map(&:docs) + site.pages).each do |doc|
    I18nHook.localize_output(site, doc)
  end
end
