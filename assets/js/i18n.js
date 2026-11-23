/**
 * 語系偵測與切換。
 *
 * _includes/metadata-hook.html 在 <head> 同步載入本檔，並輸出各語系版本的
 * <link rel="alternate" hreflang>。這裡只讀那些連結，不自行推算網址：
 *
 * 1. 從站外進入（或直接開啟網址）時，依「使用者上次手動選的語系」導向對應的語系版本。
 *    沒有手動選過的訪客，只在直接開啟首頁時依瀏覽器語系導向；從搜尋結果或別處的連結
 *    進來的，留在他點的那個語系版本（Google 不建議自動把使用者帶到另一個語系）。
 *    站內換頁不會再導向，所以使用者點進其他語系的連結後就留在那裡。
 * 2. 在頂欄右側加上語系選單，選了之後記住該選擇。
 * 3. 上面沒導向、但瀏覽器語系和頁面不同的站外訪客，在視窗底部顯示提示列，
 *    由使用者自己決定要不要切換。點連結等同在選單選了該語系；關閉後不再顯示。
 */
(() => {
  'use strict';

  const script = document.currentScript;
  const current = script.dataset.lang;
  const defaultLang = script.dataset.defaultLang;
  const baseurl = script.dataset.baseurl || '';

  const KEY = 'site-lang';
  const LANGS = {
    'zh-TW': '繁體中文',
    'zh-CN': '简体中文',
    en: 'English'
  };
  // 按鈕上顯示目前語系的簡稱，讓使用者一眼看出這是語系切換
  const SHORT = {
    'zh-TW': '繁中',
    'zh-CN': '简中',
    en: 'EN'
  };
  const LABEL = {
    'zh-TW': '切換語言',
    'zh-CN': '切换语言',
    en: 'Switch language'
  };
  // 提示列寫給看得懂目標語系的讀者，所以依目標語系取字串，不是依目前頁面
  const HINT = {
    'zh-TW': { text: '本頁也有繁體中文版。', link: '切換到繁體中文', close: '關閉' },
    'zh-CN': { text: '本页也有简体中文版。', link: '切换到简体中文', close: '关闭' },
    en: { text: 'This page is also available in English.', link: 'Switch to English', close: 'Close' }
  };
  const HINT_KEY = 'site-lang-hint-dismissed';
  // 搜尋引擎與預覽機器人不做導向，讓它們依 hreflang 各自收錄
  // Search Console 的網址檢查與 Rich Results Test 用 Google-InspectionTool，UA 裡沒有 bot 字樣
  const BOT =
    /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|google-inspectiontool|googleother|mediapartners-google/i;

  function stored() {
    try {
      const lang = localStorage.getItem(KEY);
      return lang in LANGS ? lang : null;
    } catch (e) {
      return null;
    }
  }

  function remember(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {
      /* 無痕模式等情況寫不進去，就只切換這一次 */
    }
  }

  // 瀏覽器語系 → 站台語系：繁體（台、港、澳、Hant）歸 zh-TW，其餘中文歸 zh-CN，
  // en-* 歸 en。依偏好順序取第一個能對上的，全都對不上時用英文。
  function detect() {
    const prefs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];

    for (const pref of prefs) {
      const tag = pref.toLowerCase();
      if (tag === 'zh' || tag.startsWith('zh-')) {
        return /hant|-tw|-hk|-mo/.test(tag) ? 'zh-TW' : 'zh-CN';
      }
      if (tag === 'en' || tag.startsWith('en-')) return 'en';
    }
    return 'en';
  }

  // 只取 pathname，讓本機預覽（127.0.0.1）也導向本機而不是正式站
  function alternates() {
    const map = {};
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
      const lang = link.getAttribute('hreflang');
      if (lang in LANGS) map[lang] = new URL(link.href).pathname;
    });
    return map;
  }

  function home(lang) {
    return lang === defaultLang ? `${baseurl}/` : `${baseurl}/${lang}/`;
  }

  function isExternalEntry() {
    if (!document.referrer) return true;
    try {
      return new URL(document.referrer).origin !== location.origin;
    } catch (e) {
      return true;
    }
  }

  function redirect() {
    if (BOT.test(navigator.userAgent) || !isExternalEntry()) return false;

    const direct = !document.referrer && location.pathname === home(current);
    const target = stored() || (direct ? detect() : null);
    if (!target || target === current) return false;

    // 沒有對應版本的頁面（例如各語系名稱不同的分類頁）就留在原地
    const path = alternates()[target];
    if (!path) return false;

    location.replace(path + location.search + location.hash);
    return true;
  }

  function buildSwitcher() {
    const actions = document.querySelector('#topbar .topbar-actions');
    if (!actions) return;

    const paths = alternates();
    const group = document.createElement('div');
    group.className = 'dropdown lang-switcher';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'lang-toggle';
    toggle.className = 'btn btn-link';
    toggle.title = LABEL[current] || LABEL.en;
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.dataset.bsToggle = 'dropdown';
    toggle.innerHTML =
      '<i class="fa-solid fa-globe"></i>' +
      `<span class="lang-current">${SHORT[current] || SHORT.en}</span>` +
      '<i class="fa-solid fa-chevron-down lang-caret"></i>';

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end rounded-3 mt-1 p-1';

    Object.keys(LANGS).forEach((lang) => {
      const item = document.createElement('a');
      item.className = 'dropdown-item d-flex align-items-center';
      item.href = paths[lang] || home(lang);
      item.hreflang = lang;
      item.lang = lang;
      item.textContent = LANGS[lang];
      if (lang === current) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'true');
      }
      item.addEventListener('click', () => remember(lang));

      const li = document.createElement('li');
      li.appendChild(item);
      menu.appendChild(li);
    });

    group.append(toggle, menu);
    actions.prepend(group);
  }

  // 條件與 redirect() 互補：站外進來、沒手動選過語系，只是不自動導向
  function buildHint() {
    if (BOT.test(navigator.userAgent) || !isExternalEntry() || stored()) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch (e) {
      /* 讀不到就照常顯示，關閉只對這一頁有效 */
    }

    const target = detect();
    const path = alternates()[target];
    if (target === current || !path) return;

    const s = HINT[target];
    const hint = document.createElement('aside');
    hint.className = 'lang-hint';
    hint.lang = target;
    hint.setAttribute('aria-label', LANGS[target]);

    const text = document.createElement('span');
    text.textContent = s.text;

    const link = document.createElement('a');
    link.href = path;
    link.hreflang = target;
    link.textContent = s.link;
    link.addEventListener('click', () => remember(target));

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lang-hint-close';
    close.setAttribute('aria-label', s.close);
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    close.addEventListener('click', () => {
      hint.remove();
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch (e) {
        /* 寫不進去就只關這一次 */
      }
    });

    hint.append(text, link, close);
    document.body.append(hint);
  }

  function init() {
    buildSwitcher();
    buildHint();
  }

  if (redirect()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
