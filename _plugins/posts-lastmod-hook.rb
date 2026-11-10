#!/usr/bin/env ruby
#
# Check for changed posts
#
# 文章在建立之後還有其他 commit 時，把最後一次修改的時間寫進 last_modified_at。
# 頁面上的「更新於」、JSON-LD 的 dateModified 與 sitemap 的 lastmod 都讀這個欄位。
#
# .lastmod-ignore-revs 列出的 commit 不算修改，用來排除圖片轉檔這類沒有動到內容的批次變更，
# 否則所有文章會同時顯示成剛更新過。

IGNORED_REVS = begin
  File.readlines(File.expand_path('../.lastmod-ignore-revs', __dir__), chomp: true)
      .map { |line| line.sub(/#.*/, '').strip }
      .reject(&:empty?)
rescue Errno::ENOENT
  []
end

Jekyll::Hooks.register :posts, :post_init do |post|

  # 由新到舊，每行是「SHA 日期」；最舊的一筆是建立文章的 commit，不算修改
  commits = IO.popen(['git', 'log', '--pretty=%H %ad', '--date=iso', '--', post.path], &:read).lines(chomp: true)
  edits = commits[0...-1].reject { |line| IGNORED_REVS.include?(line[/\S+/]) }

  post.data['last_modified_at'] = edits.first.split(' ', 2).last unless edits.empty?

end
