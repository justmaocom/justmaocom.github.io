/**
 * 頂欄的 AI 搜尋按鈕（_includes/topbar.html）與 Ctrl/⌘+K，打開 Cloudflare AI Search 的搜尋視窗。
 *
 * 讀者第一次點按鈕或按快捷鍵時才載入元件，沒用到搜尋的讀者不必多下載約 29 KB（gzip 後）。
 * 元件先帶齊屬性放進頁面，等腳本定義元件時才升級，初始化時就讀得到全部設定。
 * disable-analytics 不能拿掉：少了它，元件會另外把搜尋字詞與點擊送到端點的 /stats，繞過 consent.js 的同意流程。
 *
 * 元件自己也監聽 Ctrl/⌘+K，但視窗開著時不擋瀏覽器的預設動作（Firefox 會跳到搜尋列），所以這裡一直擋；
 * 元件的 open() 在視窗開著時什麼都不做，兩邊都處理也只開一次。
 * 元件的 theme 不跟著主題的深淺色切換，每次打開前照 <html> 的 data-bs-theme 設定。
 */
(() => {
  'use strict';

  const button = document.getElementById('ai-search-trigger');
  let modal;

  // 腳本載入失敗時 whenDefined 不會完成，按鈕要重新整理頁面後才能再用
  function load() {
    const el = document.createElement('search-modal-snippet');
    el.setAttribute('api-url', button.dataset.apiUrl);
    el.setAttribute('translations', button.dataset.translations);
    el.setAttribute('request-options', button.dataset.requestOptions);
    el.setAttribute('disable-analytics', '');
    el.setAttribute('show-url', '');
    document.body.append(el);

    const script = document.createElement('script');
    script.src = button.dataset.widget;
    document.head.append(script);
    return customElements.whenDefined('search-modal-snippet').then(() => el);
  }

  async function openSearch() {
    modal ??= load();
    const el = await modal;
    el.setAttribute('theme', document.documentElement.dataset.bsTheme || 'auto');
    el.open();
  }

  button.addEventListener('click', openSearch);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
  });
})();
