---
# 標題由 _data/locales/<lang>.yml 的 tabs.privacy 提供
icon: fas fa-user-shield
order: 6
# 放在頁尾，不進側欄（_includes/footer.html）
footer: true
description: justmao.com 加载哪些分析工具与第三方服务、各自何时连接与收集什么，以及电子报存了哪些数据。
---

你在 justmao.com 看文章时，浏览器会连接哪些第三方、留下哪些数据？这页逐项列出本站加载的跟踪代码与第三方服务，以及你可以怎样关闭它们。

最后更新：2026-11-26

## 欧洲时区的访客同意后才加载分析工具

本站加载两个分析工具。下表列出各自的用途，完整的收集项目见官方说明。

| 工具 | 用途 | 在本站域名写入的 Cookie | 官方说明 |
| --- | --- | --- | --- |
| Google Analytics | 统计浏览的页面与流量来源 | `_ga`、`_ga_*` | [Google 隐私政策](https://policies.google.com/privacy) |
| Microsoft Clarity | 记录点击、滚动与鼠标移动，生成热图与会话回放 | `_clck`、`_clsk` | [Microsoft 隐私声明](https://privacy.microsoft.com/privacystatement) |

是否先征求你的同意，由浏览器的时区决定：

- 时区不在欧洲：打开页面就直接加载两个工具。页面上不会出现横幅，页脚也没有“Cookie 设置”按钮。
- 时区在欧洲：页面底部出现横幅，点击“接受”才加载。点击“拒绝”就不加载，并删除上表的 Cookie。之后可以点击页脚版权栏旁的“Cookie 设置”，重新打开横幅。

时区不在欧洲的访客想关闭分析工具，只能在浏览器这一层处理：

- 在浏览器中屏蔽本站的 Cookie。
- 使用拦截跟踪的浏览器扩展。
- 安装 [Google Analytics 停用插件](https://tools.google.com/dlpage/gaoptout)，它只对 Google Analytics 有效。

## 文章页的评论、视频与分享按钮会连接第三方

文章页上还有三项第三方服务，连接的时机各不相同。

| 服务 | 什么时候连接 | 发送什么或存储什么 | 官方说明 |
| --- | --- | --- | --- |
| giscus 评论（giscus.app） | 打开文章页就从 giscus.app 下载评论程序，滚动到评论区才加载评论框 | 用 GitHub 账号登录才能评论或添加表情回应。评论公开存放在本站 GitHub 仓库的 Discussions 讨论区。 | [giscus 隐私政策](https://github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md)、[GitHub 隐私声明](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |
| YouTube 嵌入视频 | 有嵌入视频的文章，滚动到视频附近时才加载 | 播放器从 www.youtube.com 加载，加载后 YouTube 会写入它自己的 Cookie | [Google 隐私政策](https://policies.google.com/privacy) |
| 分享按钮（X、Facebook、Telegram、微博、Reddit、Threads） | 点击后才连接该平台 | 该平台会收到这篇文章的标题与网址 | 各平台自己的政策 |

## 电子报的地址存在本站自建的服务器

页脚的电子报表单，会提交到本站自建的电子报系统 listmonk（news.justmao.com）。订阅数据包括你的电子邮箱地址，以及你订阅的语言列表，三种语言各有一个列表。

listmonk 不会把你的 IP 地址存入订阅数据，也不跟踪电子报的打开与点击。提交表单时，服务器仍会用你的 IP 地址，限制同一个地址的提交次数。

提交前，你的浏览器要先算出一道 ALTCHA 验证题（proof-of-work），确认提交的不是机器人。题目从 news.justmao.com 获取，不经过第三方验证服务。验证组件的文件放在本站，你第一次操作表单时才下载。

订阅采用双重确认（double opt-in）：先给你发一封确认邮件，你点击确认才算订阅。确认邮件与电子报都经 SMTP2GO 发送，它的数据处理见 [SMTP2GO 隐私政策](https://www.smtp2go.com/privacy/)。

想取消订阅或要求删除地址，请发邮件到页脚“联系”栏的 Email。

## 有些数据只存在你的浏览器

下表的数据存在你的浏览器，不会发回本站。前五项存在 localStorage（浏览器为每个网站保留的存储空间），最后一项是离线缓存。

| 名称 | 存什么 |
| --- | --- |
| `theme` | 你手动切换的深浅色模式 |
| `site-lang` | 你手动选过的语言 |
| `site-lang-hint-dismissed` | 你关闭了语言提示栏 |
| `analytics-consent` | 欧洲时区访客在 Cookie 横幅上的选择 |
| `giscus-session` | giscus 的登录状态，登录后才写入，退出登录时删除 |
| 离线缓存 | 你看过的页面与文件，供离线浏览 |

在浏览器中清除本站的网站数据，就会删除上表全部项目。

## 主机会经手连接信息，网页本身不设置 Cookie

网站由 GitHub Pages 托管，请求经 Cloudflare 转发。两者传送网页时会经手你的 IP 地址等连接信息，处理方式见 [GitHub 隐私声明](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)与 [Cloudflare 隐私政策](https://www.cloudflare.com/privacypolicy/)。

本站的网页本身不设置 Cookie，Cookie 只来自前面列出的第三方服务。字体与前端库（Font Awesome、mermaid、MathJax 等）都放在本站，不从其他网站加载。

## 有疑问请发邮件到页脚的 Email

对这页的内容有疑问，请发邮件到页脚“联系”栏的 Email。
