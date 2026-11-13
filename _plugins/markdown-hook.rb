#!/usr/bin/env ruby
#
# 替文章與「關於」頁在 index.html 旁多輸出一份 index.md（原始 Markdown），首頁的 index.md 則是 llms.txt。
#
# GitHub Pages 不會依 Accept 標頭回不同內容，內容協商由 Cloudflare 的 URL Rewrite Rule 完成：
# 請求帶 Accept: text/markdown 時把路徑改寫成 <路徑>index.md。規則列出的路徑要與這裡輸出的一致，
# 否則 agent 會拿到 404。規則設在 Cloudflare dashboard，不在 repo 內，內容如下：
#
#   條件：
#     (any(http.request.headers["accept"][*] contains "text/markdown")) and
#     (http.request.uri.path in {"/" "/en/" "/zh-CN/" "/about/" "/en/about/" "/zh-CN/about/"} or
#      (ends_with(http.request.uri.path, "/") and
#       (starts_with(http.request.uri.path, "/posts/") or
#        starts_with(http.request.uri.path, "/en/posts/") or
#        starts_with(http.request.uri.path, "/zh-CN/posts/"))))
#   改寫路徑（Dynamic）：concat(http.request.uri.path, "index.md")
#
# 驗證：curl -sI -H "Accept: text/markdown" https://justmao.com/ 的 content-type 應為 text/markdown。

module MarkdownHook

  module_function

  def source?(doc)
    doc.collection.label == 'posts' || doc.url == '/about/'
  end

  def write(site)
    prefix = site.active_lang == site.default_lang ? '' : "/#{ site.active_lang }"

    site.collections.values.flat_map(&:docs).each do |doc|
      raw = doc.data['raw_markdown'] or next

      body = raw
        .gsub(/\{% (?:end)?raw %\}\n?/, '')
        .gsub('](/posts/', "](#{ site.baseurl }#{ prefix }/posts/") # polyglot 只替 HTML 的 href 補語系前綴
      title = doc.data['title'] ? "# #{ doc.data['title'] }\n\n" : ''
      File.write(site.in_dest_dir(doc.url, 'index.md'), "#{ title }#{ body.strip }\n")
    end

    FileUtils.cp(site.in_dest_dir('llms.txt'), site.in_dest_dir('index.md'))
  end

end

# 轉成 HTML 之後 doc.content 就不再是 Markdown，要在這之前留一份
Jekyll::Hooks.register :documents, :pre_render do |doc|
  doc.data['raw_markdown'] = doc.content if MarkdownHook.source?(doc)
end

Jekyll::Hooks.register :site, :post_write do |site|
  MarkdownHook.write(site)
end
