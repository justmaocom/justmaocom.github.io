#!/usr/bin/env ruby
#
# 補上 jekyll-seo-tag 與主題沒處理的 SEO 細節。
#
# - 標籤頁設為 noindex。它由 jekyll-archives 產生，不吃 front matter defaults，所以在這裡標記。
#   帶 noindex 的頁面一律移出 sitemap；<meta name="robots"> 由 _includes/metadata-hook.html 輸出。
# - <title> 的站名後綴改用 _config.yml 的 title_suffix，首頁維持完整的 title。
# - tab 頁（封存、分類、標籤、專案、關於）是 collection 文件，Jekyll 會拿建置時間當它的 date，
#   seo-tag 因此把它當成文章輸出。這裡拿掉日期、改回一般頁面，並把標題換成該語系的 tab 名稱。
#   sitemap 裡 tab 頁的 lastmod 也是建置時間，每次部署都會變，一併拿掉。
# - 「關於」頁被 seo-tag 當成首頁輸出 WebSite，和真正的首頁重複，改成 ProfilePage。
# - 每頁第一張封面圖是 LCP 元素，主題卻對所有圖片加 loading="lazy"，瀏覽器要等版面算完才開始下載。
#   這裡改成立即載入並提高優先度。
# - seo-tag 把圖片型別寫成 imageObject，schema.org 的型別名稱有分大小寫，改成 ImageObject。
#
# 與其他 hook 一樣以精確字串比對改寫輸出，成品由 tools/check-seo.rb 檢查。

require 'cgi'
require 'json'

module SeoHook

  JSON_LD = %r{(<script type="application/ld\+json">)(.*?)(</script>)}m
  ARTICLE_TIME = %r{<meta property="article:(?:published|modified)_time" content="[^"]*" />}
  # 文章頁的封面包在 <a class="… preview-img shimmer"> 裡，首頁卡片則是 <div class="preview-img shimmer">。
  # 用了 LQIP 的封面 class 是 blur，圖片由主題的腳本換上，不在這裡處理。
  COVER = %r{(class="[^"]*\bpreview-img) shimmer("[^>]*>\s*<img\b[^>]*?) loading="lazy"}

  module_function

  def mark_noindex(site)
    site.pages.each { |page| page.data['noindex'] = true if page.data['layout'] == 'tag' }
    (site.pages + site.documents).each { |doc| doc.data['sitemap'] = false if doc.data['noindex'] }
  end

  def shorten_title(doc)
    site = doc.site
    suffix = site.config['title_suffix'].to_s
    return if suffix.empty?

    doc.output = doc.output.sub(" | #{ site.config['title'] }</title>", " | #{ suffix }</title>")
  end

  # shimmer 要一起拿掉：主題的腳本只替 loading="lazy" 的圖片補做「已載入」的檢查，
  # 圖片若在腳本執行前就載入完成，載入中的動畫會一直留著。
  def prioritize_cover(doc)
    doc.output = doc.output.sub(COVER, '\1\2 fetchpriority="high"')
  end

  def fix_image_type(doc)
    doc.output = doc.output.sub('"@type":"imageObject"', '"@type":"ImageObject"')
  end

  def drop_tab_lastmod(sitemap)
    site = sitemap.site
    origin = "#{ site.config['url'] }#{ site.baseurl }"

    site.collections['tabs'].docs.each do |tab|
      loc = "<loc>#{ origin }#{ tab.url }</loc>"
      sitemap.output = sitemap.output.sub(%r{#{ Regexp.escape(loc) }\s*<lastmod>[^<]*</lastmod>}, loc)
    end
  end

  def fix_tab(doc)
    site = doc.site
    title = doc.data['title'].to_s
    # 與主題 head.html 取 <title> 的方式相同
    local = site.data.dig('locales', site.config['lang'], 'tabs', title.downcase)

    output = doc.output
      .gsub(ARTICLE_TIME, '')
      .sub('<meta property="og:type" content="article" />', '<meta property="og:type" content="website" />')

    if local
      %w(property="og:title" name="twitter:title").each do |attr|
        output = output.sub(%(<meta #{ attr } content="#{ CGI.escapeHTML(title) }" />),
                            %(<meta #{ attr } content="#{ CGI.escapeHTML(local) }" />))
      end
    end

    doc.output = output.sub(JSON_LD) do
      head, tail = $1, $3
      data = JSON.parse($2)
      %w(dateModified datePublished mainEntityOfPage).each { |key| data.delete(key) }
      data['@type'] = 'WebPage' if data['@type'] == 'BlogPosting'
      if data['@type'] == 'WebSite'
        data['@type'] = 'ProfilePage'
        person = data.delete('author') || { '@type' => 'Person' }
        data['mainEntity'] = person.merge({ 'name' => data.delete('name'), 'sameAs' => data.delete('sameAs') }.compact)
      end
      data['headline'] = local if local
      # 不用 script_safe：它會把 / 寫成 \/，i18n-hook 就比對不到 "url":"https://…" 了
      "#{ head }#{ JSON.generate(data).gsub('</', '<\/') }#{ tail }"
    end
  end

end

Jekyll::Hooks.register :site, :pre_render do |site|
  SeoHook.mark_noindex(site)
end

Jekyll::Hooks.register [:documents, :pages], :post_render do |doc|
  next unless doc.output_ext == '.html'

  SeoHook.shorten_title(doc)
  SeoHook.prioritize_cover(doc)
  SeoHook.fix_image_type(doc)
  SeoHook.fix_tab(doc) if doc.is_a?(Jekyll::Document) && doc.collection.label == 'tabs'
end

Jekyll::Hooks.register :pages, :post_render do |page|
  SeoHook.drop_tab_lastmod(page) if page.url == '/sitemap.xml'
end
