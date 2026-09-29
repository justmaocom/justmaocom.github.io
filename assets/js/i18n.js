/**
 * 語系偵測與切換。
 *
 * _includes/metadata-hook.html 在 <head> 同步載入本檔，並輸出各語系版本的
 * <link rel="alternate" hreflang>。這裡只讀那些連結，不自行推算網址：
 *
 * 1. 從站外進入（或直接開啟網址）時，依「使用者上次手動選的語系」，
 *    沒有的話依瀏覽器語系偏好，導向對應的語系版本。站內換頁不會再導向，
 *    所以使用者點進其他語系的連結後就留在那裡。
 * 2. 在頂欄搜尋框旁加上語系選單，選了之後記住該選擇。
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
  // 搜尋引擎與預覽機器人不做導向，讓它們依 hreflang 各自收錄
  const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless/i;

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

    const target = stored() || detect();
    if (target === current) return false;

    // 沒有對應版本的頁面（例如各語系名稱不同的分類頁）就留在原地
    const path = alternates()[target];
    if (!path) return false;

    location.replace(path + location.search + location.hash);
    return true;
  }

  function buildSwitcher() {
    // 放在 #search-trigger 前面：桌面版落在搜尋框左側，手機版落在放大鏡左側
    const trigger = document.getElementById('search-trigger');
    if (!trigger) return;

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
    trigger.before(group);
  }

  if (redirect()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSwitcher);
  } else {
    buildSwitcher();
  }
})();
