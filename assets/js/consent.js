/**
 * 分析工具（GA、Clarity）的 cookie 同意橫幅。
 *
 * _includes/analytics/*.html 不直接載入追蹤碼，而是把載入函式排進 window.analyticsLoaders，
 * 由本檔決定何時執行。Clarity 自 2025-10-31 起要求歐盟、英國、瑞士的訪客給出同意訊號，
 * 所以歐洲時區的訪客要先按「接受」才載入；其他地區照常直接載入，不顯示橫幅。
 * 頁尾的「Cookie 設定」可重新開啟橫幅；改為拒絕時清掉已寫入的 cookie。
 */
(() => {
  'use strict';

  const loaders = window.analyticsLoaders || [];
  // 只有 production 建置才有分析工具，本機預覽沒有東西要問
  if (!loaders.length) return;

  // 執行後清空佇列，所以佇列空了就代表這一頁已經載入追蹤碼
  const run = (consented) => loaders.splice(0).forEach((load) => load(consented));

  // shortcut: 以瀏覽器時區近似所在地，用 VPN 或時區與所在地不同的訪客會判斷錯；要精確時改用 Cloudflare 的地理資訊
  const EEA_TZ = /^(Europe\/|Atlantic\/(Azores|Canary|Faroe|Madeira|Reykjavik)$|Asia\/(Nicosia|Famagusta)$)/;
  if (!EEA_TZ.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '')) {
    run(false);
    return;
  }

  const KEY = 'analytics-consent';
  // 介面文字跟著頁面語系（<html lang>）走，未列出的語系用繁中
  const STRINGS = {
    'zh-TW': {
      label: 'Cookie 同意',
      text: '本站使用 Google Analytics 與 Microsoft Clarity 的 cookie 分析點擊與捲動，同意後才啟用。',
      accept: '接受',
      decline: '拒絕',
      settings: 'Cookie 設定'
    },
    'zh-CN': {
      label: 'Cookie 同意',
      text: '本站使用 Google Analytics 与 Microsoft Clarity 的 Cookie 分析点击与滚动，同意后才启用。',
      accept: '接受',
      decline: '拒绝',
      settings: 'Cookie 设置'
    },
    en: {
      label: 'Cookie consent',
      text: 'This site uses Google Analytics and Microsoft Clarity cookies to analyze clicks and scrolling, only if you accept.',
      accept: 'Accept',
      decline: 'Decline',
      settings: 'Cookie settings'
    }
  };
  const t = STRINGS[document.documentElement.lang] || STRINGS['zh-TW'];

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function remember(choice) {
    try {
      localStorage.setItem(KEY, choice);
    } catch (e) {
      /* 無痕模式等情況寫不進去，選擇只對這一頁有效 */
    }
  }

  // GA 的 _ga、_ga_*，Clarity 的 _clck、_clsk；GA 寫在主網域上，兩種 domain 都刪
  function clearCookies() {
    document.cookie.split('; ').forEach((pair) => {
      const name = pair.split('=')[0];
      if (!/^(_ga|_clck|_clsk)/.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
    });
  }

  function decide(choice) {
    remember(choice);
    document.querySelector('.consent-banner')?.remove();
    if (choice === 'granted') {
      run(true);
      return;
    }
    if (window.clarity) window.clarity('consent', false);
    clearCookies();
    // 已在這一頁執行的追蹤碼停不下來，重新載入後就不會再載入
    if (!loaders.length) location.reload();
  }

  function showBanner() {
    if (document.querySelector('.consent-banner')) return;

    const banner = document.createElement('aside');
    banner.className = 'consent-banner';
    banner.setAttribute('aria-label', t.label);

    const text = document.createElement('p');
    text.textContent = t.text;

    const actions = document.createElement('div');
    [
      [t.accept, 'granted'],
      [t.decline, 'denied']
    ].forEach(([label, choice]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => decide(choice));
      actions.append(button);
    });

    banner.append(text, actions);
    document.body.append(banner);
  }

  function addSettings() {
    const footer = document.querySelector('footer p');
    if (!footer) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'consent-settings';
    button.textContent = t.settings;
    button.addEventListener('click', showBanner);
    footer.append(' ', button);
  }

  const choice = stored();
  if (choice === 'granted') run(true);
  // 追蹤碼可能在上一頁關閉時又寫回 cookie，所以每次載入都清一次
  if (choice === 'denied') clearCookies();

  // 在其他分頁改成拒絕時，這一頁已在執行的追蹤碼一樣要停掉
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue === 'denied' && !loaders.length) location.reload();
  });

  function init() {
    addSettings();
    if (choice !== 'granted' && choice !== 'denied') showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
