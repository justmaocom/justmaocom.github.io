#!/usr/bin/env ruby
#
# 補上 jekyll-seo-tag 與主題沒處理的 SEO 細節。
#
# - 標籤頁設為 noindex。它由 jekyll-archives 產生，不吃 front matter defaults，所以在這裡標記。
#   標籤索引頁（/tags/）的 noindex 寫在 _tabs/tags.md。
#   帶 noindex 的頁面一律移出 sitemap；<meta name="robots"> 由 _includes/metadata-hook.html 輸出。
# - <title> 的站名後綴改用 _config.yml 的 title_suffix，首頁改用 home_title。
# - 首頁的分頁與分類頁原本和別頁共用標題或描述：分頁的 <title> 補上頁碼；分類頁的 <title> 與
#   描述依分類名稱、文章數與最新一篇產生。文字樣板在 _data/locales/<lang>.yml 的 seo。
# - tab 頁是 collection 文件，Jekyll 會拿建置時間當它的 date，
#   seo-tag 因此把它當成文章輸出。這裡拿掉日期、改回一般頁面，並把標題換成該語系的 tab 名稱。
#   sitemap 裡 tab 頁的 lastmod 也是建置時間，每次部署都會變，一併拿掉。
# - 「關於」頁被 seo-tag 當成首頁輸出 WebSite，和真正的首頁重複，改成 ProfilePage。
# - 每頁第一張封面圖是 LCP 元素，主題卻對所有圖片加 loading="lazy"，瀏覽器要等版面算完才開始下載。
#   這裡改成立即載入並提高優先度。
# - seo-tag 把圖片型別寫成 imageObject，schema.org 的型別名稱有分大小寫，改成 ImageObject。
# - 文章頁另外輸出一段 BreadcrumbList JSON-LD（首頁 → 分類 → 子分類 → 文章），分類網址取自
#   jekyll-archives 產生的分類頁。
# - 主題的 viewport 帶 user-scalable=no，使用者無法放大頁面，這裡拿掉。
# - 補上 seo-tag 沒輸出的結構化資料：文章的 inLanguage 與 publisher、首頁 WebSite 的 alternateName、
#   「關於」頁 Person 的 description。不加 @id：check-i18n 要求 @id 都是本頁網址。
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

  def strings(site)
    site.data.dig('locales', site.config['lang'], 'seo') || {}
  end

  # 把樣板裡的 :name、:count 等換成實際的值
  def fill(template, values)
    values.reduce(template.to_s) { |text, (key, value)| text.gsub(":#{ key }", value.to_s) }
  end

  # 分類頁由 jekyll-archives 產生，沒有 front matter，描述在這裡寫進 page.data 交給 seo-tag 輸出
  def describe_categories(site)
    template = strings(site)['category_description'] or return

    site.pages.each do |page|
      next unless page.data['layout'] == 'category'

      latest = page.posts.max_by(&:date)
      page.data['description'] = fill(template, name: page.title, count: page.posts.size, latest: latest.data['title'])
    end
  end

  # 「彙整」與「分類」這兩個 tab 沒有內文，不補描述的話 seo-tag 會沿用站台描述，與首頁重複。
  # 「專案」頁的內文開頭沒寫出收錄哪一類專案，搜尋結果上看不出這頁有什麼，也改用 seo.projects_description。
  def describe_listing_tabs(site)
    counts = { 'archives' => site.posts.docs.size, 'categories' => site.pages.count { |page| page.data['layout'] == 'category' },
               'projects' => site.data['projects'].to_a.size }

    site.collections['tabs'].docs.each do |tab|
      name = tab.basename_without_ext
      template = strings(site)["#{ name }_description"] or next
      tab.data['description'] = fill(template, count: counts[name])
    end
  end

  # 首頁、首頁的分頁、分類頁與有 seo.<tab>_title 的 tab 頁各自的 <title>；其他頁面回傳 nil，維持主題的輸出
  def listing_title(doc)
    site = doc.site
    suffix = site.config['title_suffix'] || site.config['title']

    if doc.data['layout'] == 'category'
      "#{ fill(strings(site)['category_title'], name: doc.title) } | #{ suffix }"
    elsif doc.data['layout'] == 'home' && doc.pager && doc.pager.page > 1
      "#{ fill(strings(site)['page_title'], num: doc.pager.page) } | #{ suffix }"
    elsif doc.url == '/'
      site.config['home_title']
    elsif doc.is_a?(Jekyll::Document) && doc.collection.label == 'tabs' && strings(site)["#{ doc.basename_without_ext }_title"]
      "#{ strings(site)["#{ doc.basename_without_ext }_title"] } | #{ suffix }"
    end
  end

  def retitle_listing(doc)
    title = listing_title(doc) or return
    doc.output = doc.output.sub(%r{<title>.*?</title>}m) { "<title>#{ CGI.escapeHTML(title) }</title>" }
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

  def allow_zoom(doc)
    doc.output = doc.output.sub('user-scalable=no initial-scale=1', 'initial-scale=1')
  end

  # 個人部落格的發行者就是作者本人
  def enrich_article(doc)
    doc.output = doc.output.sub(JSON_LD) do
      head, tail = $1, $3
      data = JSON.parse($2)
      data['inLanguage'] = doc.site.active_lang
      data['publisher'] = data['author'] if data['author']
      "#{ head }#{ JSON.generate(data).gsub('</', '<\/') }#{ tail }"
    end
  end

  # Google 決定搜尋結果上的站台名稱時，會參考首頁 WebSite 的 name 與 alternateName
  def add_alternate_name(doc)
    name = doc.site.config['alternate_name'] or return
    doc.output = doc.output.sub('"@type":"WebSite",', %("@type":"WebSite","alternateName":#{ name.to_json },))
  end

  def fix_image_type(doc)
    doc.output = doc.output.sub('"@type":"imageObject"', '"@type":"ImageObject"')
  end

  # 首頁 → 分類 → 子分類 → 文章。polyglot 只補 href="…" 的語系前綴，這裡的網址要自己帶上。
  # 最後一項不寫 item，Google 會用本頁網址；item 不能寫成 @id，check-i18n 要求 @id 都是本頁網址。
  def add_breadcrumb(doc)
    site = doc.site
    lang = site.active_lang == site.default_lang ? '' : "/#{ site.active_lang }"
    base = "#{ site.config['url'] }#{ site.baseurl }#{ lang }"
    # 與主題 topbar 的 {{ tabs.home | capitalize }} 相同
    home = site.data.dig('locales', site.config['lang'], 'tabs', 'home').to_s.capitalize
    categories = Array(doc.data['categories']).filter_map do |name|
      archive = site.pages.find { |page| page.data['layout'] == 'category' && page.title == name }
      { 'name' => name, 'item' => "#{ base }#{ archive.url }" } if archive
    end
    items = [{ 'name' => home, 'item' => "#{ base }/" }, *categories, { 'name' => doc.data['title'] }]
    data = {
      '@context' => 'https://schema.org',
      '@type' => 'BreadcrumbList',
      'itemListElement' => items.each.with_index(1).map { |item, i| { '@type' => 'ListItem', 'position' => i }.merge(item) }
    }
    json = JSON.generate(data).gsub('</', '<\/')
    # 接在 seo-tag 那段之後，check-seo 讀第一段 JSON-LD 當文章資料
    doc.output = doc.output.sub(JSON_LD) { "#{ $& }#{ $1 }#{ json }#{ $3 }" }
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
        data['mainEntity'] = person.merge({ 'name' => data.delete('name'), 'description' => data['description'], 'sameAs' => data.delete('sameAs') }.compact)
      end
      data['headline'] = local if local
      # 不用 script_safe：它會把 / 寫成 \/，i18n-hook 就比對不到 "url":"https://…" 了
      "#{ head }#{ JSON.generate(data).gsub('</', '<\/') }#{ tail }"
    end
  end

end

Jekyll::Hooks.register :site, :pre_render do |site|
  SeoHook.mark_noindex(site)
  SeoHook.describe_categories(site)
  SeoHook.describe_listing_tabs(site)
end

Jekyll::Hooks.register [:documents, :pages], :post_render do |doc|
  next unless doc.output_ext == '.html'

  SeoHook.shorten_title(doc)
  SeoHook.retitle_listing(doc)
  SeoHook.prioritize_cover(doc)
  SeoHook.allow_zoom(doc)
  SeoHook.fix_image_type(doc)
  SeoHook.add_alternate_name(doc) if doc.url == '/'
  SeoHook.enrich_article(doc) if doc.data['layout'] == 'post'
  SeoHook.add_breadcrumb(doc) if doc.data['layout'] == 'post'
  SeoHook.fix_tab(doc) if doc.is_a?(Jekyll::Document) && doc.collection.label == 'tabs'
end

Jekyll::Hooks.register :pages, :post_render do |page|
  SeoHook.drop_tab_lastmod(page) if page.url == '/sitemap.xml'
end
