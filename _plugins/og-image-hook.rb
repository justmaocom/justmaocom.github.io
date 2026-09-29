#!/usr/bin/env ruby
#
# 修正文章預覽圖（og:image、twitter:image、JSON-LD image）的網址。
#
# 主題的 _includes/head.html 預期 jekyll-seo-tag 把相對的 image.path（例如 cover.webp）
# 解析成「站台根目錄 + cover.webp」，再把它替換成加上 media_subpath 的正確網址。
# jekyll-seo-tag 2.9 改成相對於頁面目錄解析，輸出變成 /posts/<slug>/cover.webp，
# 主題的替換因此落空，預覽圖指向不存在的檔案。
#
# 這裡在輸出後把 seo-tag 產生的錯誤網址換成正確網址。覆寫 head.html 會整份遮蔽 gem 版本，
# 所以改用 hook；主題日後修正時錯誤網址不再出現，這段就不會有作用。

Jekyll::Hooks.register [:documents, :pages], :post_render do |doc|

  next unless doc.output_ext == '.html'

  image = doc.data['image']
  src = image.is_a?(Hash) ? image['path'] : image
  # 絕對路徑與外部網址 seo-tag 和主題都處理得了
  next unless src.is_a?(String) && !src.empty?
  next if src.include?(':') || src.start_with?('/')

  site = doc.site
  origin = "#{ site.config['url'] }#{ site.baseurl }"

  # 與 jekyll-seo-tag 2.9 的 ImageDrop#build_absolute_path 相同
  page_dir = doc.url.end_with?('/') ? doc.url : File.dirname(doc.url)
  wrong = "#{ origin }#{ File.join(page_dir, src) }"

  # 與主題的 _includes/media-url.html 相同
  path = "#{ doc.data['media_subpath'] }/#{ src }"
  path = "#{ site.config['cdn'] }/#{ path }" if site.config['cdn']
  path = path.gsub('///', '/').gsub('//', '/').sub(':/', '://')
  right = path.include?('://') ? path : "#{ origin }#{ path }"

  next if wrong == right

  doc.output = doc.output.gsub(wrong, right)

end
