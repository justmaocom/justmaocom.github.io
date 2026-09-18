#!/usr/bin/env ruby
#
# Inject the mermaid zoom viewer script into pages that render diagrams.
#
# 主題的 _includes/js-selector.html 沒有掛載自訂腳本的位置，
# 而覆寫該檔會整份遮蔽 gem 的版本、升級時安靜地停在舊邏輯，
# 因此改在 post_render 階段把 script 標籤補進頁面尾端。

Jekyll::Hooks.register [:documents, :pages], :post_render do |doc|

  next unless doc.output_ext == '.html'
  next unless doc.data['mermaid']

  src = "#{ doc.site.baseurl }/assets/js/mermaid-zoom.js"
  tag = "<script defer src=\"#{ src }\"></script>"

  # production 的 compress 版面會依 compress_html.endings 移除 </body>，
  # development 則保留，兩種輸出都要能接上
  if doc.output.include?('</body>')
    doc.output = doc.output.sub('</body>', "#{ tag }</body>")
  else
    doc.output += tag
  end

end
