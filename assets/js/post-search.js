/**
 * 首頁搜尋欄（_includes/post-search.html）。
 *
 * 第一次聚焦或輸入時才下載本語系的 search.json，之後同一頁重複使用；
 * 主題原本的搜尋在每一頁載入時都下載整份。
 * 每個以空白分隔的字詞都出現在標題、分類、標籤或內文裡才算符合，不分大小寫。
 * 結果依 search.json 的順序（新到舊）全部列出，文章卡片照常留在下方。
 */
(() => {
  'use strict';

  const root = document.getElementById('post-search');
  if (!root) return;

  const input = document.getElementById('post-search-input');
  const clear = root.querySelector('.post-search-clear');
  const status = root.querySelector('.post-search-status');
  const list = root.querySelector('.post-search-results');

  let entries = null;

  function load() {
    if (!entries) {
      entries = fetch(root.dataset.index)
        .then((res) => {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then((posts) =>
          posts.map((post) => ({
            title: post.title,
            url: post.url,
            text: [post.title, post.categories, post.tags, post.content].join(' ').toLowerCase()
          }))
        )
        .catch(() => {
          entries = null; // 下次輸入時重新下載
          return [];
        });
    }
    return entries;
  }

  async function update() {
    clear.hidden = !input.value;
    const q = input.value.trim();
    if (!q) {
      status.textContent = '';
      list.replaceChildren();
      return;
    }

    const all = await load();
    if (input.value.trim() !== q) return; // 等資料時字又改了，交給較新的那次

    const words = q.toLowerCase().split(/\s+/);
    const hits = all.filter((entry) => words.every((word) => entry.text.includes(word)));

    // :query 用函式代入，使用者輸入的 $& 等字樣才不會被 replace 當成特殊語法
    status.textContent = hits.length
      ? root.dataset.results.replace(':count', hits.length).replace(':query', () => q)
      : root.dataset.empty;
    list.replaceChildren(
      ...hits.map((entry) => {
        const link = document.createElement('a');
        link.href = entry.url;
        link.textContent = entry.title;
        const li = document.createElement('li');
        li.append(link);
        return li;
      })
    );
  }

  input.addEventListener('focus', load, { once: true });
  // 注音、拼音選字期間不搜尋，選完字由 compositionend 補上
  input.addEventListener('input', (event) => {
    if (!event.isComposing) update();
  });
  input.addEventListener('compositionend', update);
  clear.addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
  });
})();
