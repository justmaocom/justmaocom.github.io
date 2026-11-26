---
# 標題由 _data/locales/<lang>.yml 的 tabs.privacy 提供
icon: fas fa-user-shield
order: 6
# 放在頁尾，不進側欄（_includes/footer.html）
footer: true
description: Which analytics tools and third-party services justmao.com loads, when each one connects and what it collects, and what the newsletter stores.
---

When you read justmao.com, which third parties does your browser connect to, and what data does it leave behind? This page lists the tracking code and third-party services the site loads, and how you can turn them off.

Last updated: 2026-11-26

## Analytics load only after visitors in European time zones agree

The site loads two analytics tools. The table lists what each one is for. See the official policies for everything they collect.

| Tool | Purpose | Cookies it sets on this site's domain | Official policy |
| --- | --- | --- | --- |
| Google Analytics | Counts pages viewed and traffic sources | `_ga`, `_ga_*` | [Google Privacy Policy](https://policies.google.com/privacy) |
| Microsoft Clarity | Records clicks, scrolling, and mouse movement for heatmaps and session replays | `_clck`, `_clsk` | [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement) |

Your browser's time zone decides whether the site asks you first:

- Outside European time zones: both tools load as soon as you open a page. You see no banner, and the footer has no "Cookie settings" button.
- In a European time zone: a banner appears at the bottom of the page, and the tools load only after you click "Accept". Click "Decline" and they don't load, and the site deletes the cookies in the table above. You can reopen the banner later with the "Cookie settings" button next to the copyright line in the footer.

Outside European time zones, you can block analytics only in your browser:

- Use an extension that blocks trackers.
- Install the [Google Analytics Opt-out Browser Add-on](https://tools.google.com/dlpage/gaoptout). It works only for Google Analytics.

Blocking this site's cookies alone doesn't turn analytics off. Both tools still load, and Clarity keeps collecting data without cookies, as its [consent documentation](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management) explains.

## Videos and share buttons on posts connect to third parties

Posts use two more third-party services, and each one connects at a different time.

| Service | When it connects | What it sends or stores | Official policy |
| --- | --- | --- | --- |
| YouTube embeds | On posts with an embedded video, loads when you scroll near the video | The player loads from www.youtube.com, and YouTube then sets its own cookies | [Google Privacy Policy](https://policies.google.com/privacy) |
| Share buttons (X, Facebook, Telegram, Weibo, Reddit, Threads) | Connect to the platform only when you click | The platform receives the post's title and URL | Each platform's own policy |

## The newsletter stores your address on a server this site runs

The newsletter form in the footer sends your address to listmonk, a newsletter system this site hosts at news.justmao.com. Your subscription includes your email address and the language list you subscribed to. Each of the three languages has its own list.

listmonk doesn't store your IP address with your subscription. The newsletter doesn't track opens or clicks, because tracking is off in both listmonk and SMTP2GO. When you submit the form, the server still uses your IP address to limit how often one address can submit.

Before you submit, your browser solves an ALTCHA challenge (proof-of-work) to show it's not a bot. It gets the challenge from news.justmao.com, with no third-party verification service. The widget's files are hosted on this site and download only when you first use the form.

The newsletter uses double opt-in. You get a confirmation email first, and you're subscribed only after you confirm. SMTP2GO sends the confirmation email and the newsletter; see the [SMTP2GO Privacy Policy](https://www.smtp2go.com/privacy/) for how it handles data.

To unsubscribe or have your address deleted, send an email through the Email link in the footer's "Connect" column.

## Some data stays only in your browser

The data in this table stays in your browser and is never sent back to this site. The first four items live in localStorage, a storage area your browser keeps for each site. The last one is the offline cache.

| Name | What it stores |
| --- | --- |
| `theme` | The light or dark mode you picked |
| `site-lang` | The language you picked |
| `site-lang-hint-dismissed` | That you closed the language hint bar |
| `analytics-consent` | Your choice on the cookie banner, for visitors in European time zones |
| Offline cache | Pages and files you've viewed, for offline reading |

Clearing this site's data in your browser deletes everything in the table.

## Hosts handle connection data, but the pages set no cookies

GitHub Pages hosts the site, and Cloudflare forwards requests to it. Both handle connection data such as your IP address when they serve pages. See the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) for how they process it.

The site's own pages set no cookies. Cookies come only from the third-party services listed above. Fonts and front-end libraries (Font Awesome, mermaid, MathJax, and others) are hosted on this site, not loaded from other sites.

## Send questions to the Email link in the footer

If you have questions about this page, use the Email link in the footer's "Connect" column.
