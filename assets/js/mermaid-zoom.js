/**
 * Mermaid 圖表點擊後開啟全螢幕檢視，支援滾輪／雙指縮放與拖曳平移。
 *
 * Chirpy 的 post.min.js 會把 mermaid 程式碼區塊轉成 <pre class="mermaid">，
 * 再由 mermaid 畫成 inline SVG；切換淺／深色時整批重新渲染。
 * 因此這裡用事件委派與 MutationObserver，不綁定在初次載入時的節點上。
 */
(() => {
  'use strict';

  const DIAGRAM = 'pre.mermaid';
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 20;
  const STEP = 1.4;

  const clamp = (value, lo, hi) => Math.min(Math.max(value, lo), hi);

  let ui = null;
  let opener = null; // 觸發開啟的圖表，關閉後把焦點還回去
  let size = { w: 0, h: 0 }; // 圖表原始尺寸，取自 viewBox
  let view = { scale: 1, x: 0, y: 0 };

  const pointers = new Map();
  let pinchDist = 0;
  let panFrom = null;
  let dragged = false;

  function build() {
    if (ui) return ui;

    const root = document.createElement('div');
    root.className = 'mermaid-zoom';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '圖表放大檢視');
    root.hidden = true;
    root.innerHTML = [
      '<div class="mermaid-zoom__stage">',
      '<div class="mermaid-zoom__canvas"></div>',
      '</div>',
      '<div class="mermaid-zoom__toolbar">',
      '<button type="button" data-act="out" aria-label="縮小">&minus;</button>',
      '<button type="button" data-act="reset" aria-label="重設縮放">重設</button>',
      '<button type="button" data-act="in" aria-label="放大">&plus;</button>',
      '<button type="button" data-act="close" aria-label="關閉">&times;</button>',
      '</div>'
    ].join('');

    const stage = root.querySelector('.mermaid-zoom__stage');
    const canvas = root.querySelector('.mermaid-zoom__canvas');
    const toolbar = root.querySelector('.mermaid-zoom__toolbar');

    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (btn.dataset.act === 'in') zoomAt(cx, cy, STEP);
      else if (btn.dataset.act === 'out') zoomAt(cx, cy, 1 / STEP);
      else if (btn.dataset.act === 'reset') fit();
      else close();
    });

    stage.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        // deltaMode: 0 像素、1 行、2 頁，換算成大致相同的縮放手感
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
        zoomAt(e.clientX, e.clientY, Math.exp((-e.deltaY * unit) / 500));
      },
      { passive: false }
    );

    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged = false;

      if (pointers.size === 1) {
        panFrom = { x: e.clientX, y: e.clientY };
        stage.classList.add('is-grabbing');
      } else if (pointers.size === 2) {
        panFrom = null;
        pinchDist = distance();
      }
    });

    stage.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        const dist = distance();
        if (pinchDist > 0 && dist > 0) {
          const mid = midpoint();
          zoomAt(mid.x, mid.y, dist / pinchDist);
          dragged = true;
        }
        pinchDist = dist;
        return;
      }

      if (!panFrom) return;
      const dx = e.clientX - panFrom.x;
      const dy = e.clientY - panFrom.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
      view.x += dx;
      view.y += dy;
      panFrom = { x: e.clientX, y: e.clientY };
      render();
    });

    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) {
        panFrom = null;
        stage.classList.remove('is-grabbing');
      } else {
        const only = pointers.values().next().value;
        panFrom = { x: only.x, y: only.y };
      }
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    stage.addEventListener('dblclick', (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, STEP);
    });

    // 點背景關閉，但拖曳結束時不關
    stage.addEventListener('click', (e) => {
      if (dragged) return;
      if (!e.target.closest('.mermaid-zoom__canvas')) close();
    });

    root.addEventListener('keydown', (e) => {
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      switch (e.key) {
        case 'Escape':
          close();
          break;
        case '+':
        case '=':
          zoomAt(cx, cy, STEP);
          break;
        case '-':
        case '_':
          zoomAt(cx, cy, 1 / STEP);
          break;
        case '0':
          fit();
          break;
        case 'ArrowLeft':
          view.x += 60;
          render();
          break;
        case 'ArrowRight':
          view.x -= 60;
          render();
          break;
        case 'ArrowUp':
          view.y += 60;
          render();
          break;
        case 'ArrowDown':
          view.y -= 60;
          render();
          break;
        default:
          return;
      }
      e.preventDefault();
    });

    document.body.appendChild(root);
    ui = { root, stage, canvas, closeBtn: toolbar.querySelector('[data-act="close"]') };
    return ui;
  }

  function distance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function midpoint() {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function render() {
    ui.canvas.style.transform =
      'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.scale + ')';
  }

  function zoomAt(clientX, clientY, factor) {
    const rect = ui.stage.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const next = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = next / view.scale;

    view.x = px - (px - view.x) * ratio;
    view.y = py - (py - view.y) * ratio;
    view.scale = next;
    render();
  }

  function fit() {
    const rect = ui.stage.getBoundingClientRect();
    const scale = clamp(
      Math.min(rect.width / size.w, rect.height / size.h) * 0.94,
      MIN_SCALE,
      MAX_SCALE
    );

    view = {
      scale,
      x: (rect.width - size.w * scale) / 2,
      y: (rect.height - size.h * scale) / 2
    };
    render();
  }

  function open(diagram) {
    const svg = diagram.querySelector('svg');
    if (!svg) return;

    build();
    opener = diagram;

    const box = svg.viewBox && svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    size = {
      w: box && box.width > 0 ? box.width : rect.width || 800,
      h: box && box.height > 0 ? box.height : rect.height || 600
    };

    // 複製一份進來，原圖留在頁面上，mermaid 的 <defs> 與內嵌 <style> 都會一起帶過來
    const clone = svg.cloneNode(true);
    clone.removeAttribute('style');
    clone.setAttribute('width', size.w);
    clone.setAttribute('height', size.h);
    clone.style.maxWidth = 'none';
    clone.style.width = size.w + 'px';
    clone.style.height = size.h + 'px';

    ui.canvas.replaceChildren(clone);
    ui.canvas.style.width = size.w + 'px';
    ui.canvas.style.height = size.h + 'px';

    ui.root.hidden = false;
    document.documentElement.classList.add('mermaid-zoom-open');
    requestAnimationFrame(() => {
      ui.root.classList.add('is-open');
      fit();
      ui.closeBtn.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!ui || ui.root.hidden) return;

    ui.root.classList.remove('is-open');
    ui.root.hidden = true;
    ui.canvas.replaceChildren();
    document.documentElement.classList.remove('mermaid-zoom-open');
    pointers.clear();
    panFrom = null;

    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  function decorate() {
    document.querySelectorAll(DIAGRAM + ':not([data-zoomable])').forEach((el) => {
      if (!el.querySelector('svg')) return;
      el.dataset.zoomable = 'true';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', '放大檢視圖表');
    });
  }

  document.addEventListener('click', (e) => {
    const diagram = e.target.closest(DIAGRAM);
    if (!diagram || !diagram.dataset.zoomable) return;
    if (!window.getSelection().isCollapsed) return; // 正在選取文字就不要開
    open(diagram);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const diagram = e.target.closest ? e.target.closest(DIAGRAM) : null;
    if (!diagram || !diagram.dataset.zoomable) return;
    e.preventDefault();
    open(diagram);
  });

  const start = () => {
    decorate();

    // mermaid 是非同步渲染，主題切換時還會整批重畫，所以持續盯著內容區
    const content = document.querySelector('.content') || document.body;
    new MutationObserver(decorate).observe(content, { childList: true, subtree: true });

    // 切換淺／深色會重新渲染圖表，檢視層裡的複本會跟著過期，直接關閉
    new MutationObserver(() => close()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme']
    });

    window.addEventListener('resize', () => {
      if (ui && !ui.root.hidden) fit();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
