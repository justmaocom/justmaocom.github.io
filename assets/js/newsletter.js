/**
 * 電子報頁的訂閱表單（_includes/newsletter-form.html）。
 *
 * 讀者第一次聚焦表單時才載入 ALTCHA 元件，只看不訂閱的讀者不必多下載約 24 KB（gzip 後）。
 * 元件設為 auto="onsubmit"，按下訂閱時才向 news.justmao.com 拿題目，解完由元件再送出一次表單。
 * 那一次改由這裡以 fetch 送出，結果顯示在表單下方，讀者不會離開這一頁。
 */
(() => {
  'use strict';

  const form = document.querySelector('.newsletter-form');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.newsletter-status');

  form.addEventListener(
    'focusin',
    () => {
      const script = document.createElement('script');
      script.src = form.dataset.widget;
      document.head.append(script);
    },
    { once: true }
  );

  // 元件還沒掛上時送出會少了 altcha 欄位，listmonk 只會回 400，先擋下；還沒驗證的那次由元件攔下。
  // 驗證結果只能用一次，listmonk 會拒絕重複的：送出期間停用按鈕，送完不論成敗都 reset 元件，下次重新驗證
  form.addEventListener('submit', async (event) => {
    if (!form.querySelector('.altcha')) return event.preventDefault();
    if (event.defaultPrevented) return;
    event.preventDefault();
    const body = new URLSearchParams(new FormData(form));
    button.disabled = true;
    status.textContent = '';
    let ok = false;
    try {
      // urlencoded 的 POST 不會觸發 preflight，Nginx 在這個網址只收 POST。
      // 限流的 429 由 Nginx 回、不帶 CORS 標頭，和斷線一樣走到 catch
      ok = (await fetch(form.action, { method: 'POST', body })).ok;
    } catch {}
    status.textContent = ok ? status.dataset.success : status.dataset.error;
    if (ok) form.elements.email.value = '';
    form.querySelector('altcha-widget').reset();
    button.disabled = false;
  });

  // 送出途中離開這一頁，回來時按鈕可能還停用：Firefox 重新載入時會保留 JS 設的 disabled，
  // 或瀏覽器從 bfcache 原樣還原這一頁（元件還留著用過的驗證結果）
  addEventListener('pageshow', () => {
    if (!button.disabled) return;
    button.disabled = false;
    form.querySelector('altcha-widget').reset?.();
  });

  // 元件只在 unverified 狀態才會在送出時驗證，失敗或過期後讀者再按訂閱，要先 reset 才會重試。
  // 掛在按鈕的 click（按 Enter 也會觸發）而不是 submit：元件驗證失敗後會自己再送出一次，掛在 submit 會無限重試
  button.addEventListener('click', () => {
    const state = form.querySelector('.altcha')?.dataset.state;
    if (state === 'error' || state === 'expired') form.querySelector('altcha-widget').reset();
  });
})();
