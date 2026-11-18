/* StoreCRM: общие функции внутренних страниц */
(function () {
  'use strict';
  window.$ = function (s, r) { return (r || document).querySelector(s); };
  window.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  window.rub = function (n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; };
  var t;
  window.toast = function (msg) {
    var el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('on'); clearTimeout(t); t = setTimeout(function () { el.classList.remove('on'); }, 2600);
  };
  window.rng = function (seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; };
  window.csv = function (name, rows) {
    var body = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
  var s = $('#globalSearch');
  if (s) {
    s.setAttribute('aria-label', 'Поиск по клиентам');
    s.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !document.body.dataset.search) location.href = 'e_commerce_clients.html?q=' + encodeURIComponent(s.value.trim());
    });
  }
  /* Кнопка возврата в портфолио: не показывается внутри превью */
  if (window.self === window.top) {
    var a = document.createElement('a');
    a.href = '../index.html'; a.textContent = '← К портфолио'; a.setAttribute('aria-label', 'Вернуться в портфолио');
    a.setAttribute('style', 'position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:.65rem 1.1rem;border-radius:999px;background:#0f172a;color:#fff;font:600 14px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.2)');
    if (window.innerWidth <= 768) a.style.bottom = '84px';
    document.body.appendChild(a);
  }
})();
