#!/usr/bin/env ruby
#
# 補上 jekyll-seo-tag 與主題沒處理的 SEO 細節。
#
# - 標籤頁設為 noindex。它由 jekyll-archives 產生，不吃 front matter defaults，所以在這裡標記。
#   帶 noindex 的頁面一律移出 sitemap；<meta name="robots"> 由 _includes/metadata-hook.html 輸出。
# - <title> 的站名後綴改用 _config.yml 的 title_suffix，首頁維持完整的 title。
# - tab 頁（封存、分類、標籤、專案、關於）是 collection 文件，Jekyll 會拿建置時間當它的 date，
#   seo-tag 因此把它當成文章輸出。這裡拿掉日期、改回一般頁面，並把標題換成該語系的 tab 名稱。
#
# 與其他 hook 一樣以精確字串比對改寫輸出，成品由 tools/check-seo.rb 檢查。

require 'cgi'
require 'json'

module SeoHook

  JSON_LD = %r{(<script type="application/ld\+json">)(.*?)(</script>)}m
  ARTICLE_TIME = %r{<meta property="article:(?:published|modified)_time" content="[^"]*" />}

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
  SeoHook.fix_tab(doc) if doc.is_a?(Jekyll::Document) && doc.collection.label == 'tabs'
end
