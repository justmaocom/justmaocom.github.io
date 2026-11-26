/**
 * 頁尾的電子報表單（_includes/footer.html）。
 *
 * 讀者第一次聚焦表單時才載入 ALTCHA 元件，每一頁不必多下載約 24 KB（gzip 後）。
 * 元件設為 auto="onsubmit"，按下訂閱時才向 news.justmao.com 拿題目，解完由元件自己送出表單。
 */
(() => {
  'use strict';

  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener(
    'focusin',
    () => {
      const script = document.createElement('script');
      script.src = form.dataset.widget;
      document.head.append(script);
    },
    { once: true }
  );

  // 元件還沒掛上時送出會少了 altcha 欄位，listmonk 只會回 400，先擋下；掛上之後由元件接手
  form.addEventListener('submit', (event) => {
    if (!form.querySelector('.altcha')) event.preventDefault();
  });
})();
