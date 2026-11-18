/* FinDash: общие функции внутренних страниц */
(function () {
  'use strict';
  window.$ = function (s, r) { return (r || document).querySelector(s); };
  window.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  window.usd = function (n, sign) { var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (n < 0 ? '−' : sign ? '+' : '') + '$' + s; };
  var t;
  window.toast = function (m) { var e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.className = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); } e.textContent = m; e.classList.add('on'); clearTimeout(t); t = setTimeout(function () { e.classList.remove('on'); }, 2600); };
  window.rng = function (s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
  window.csv = function (name, rows) { var b = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + b], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  /* акцентный цвет из настроек (общий для всех страниц FinDash) */
  try { var ac = localStorage.getItem('fd-accent'); if (ac) { document.documentElement.style.setProperty('--accent', ac); document.documentElement.style.setProperty('--accent-hover', ac); } } catch (e) {}
  /* мобильное меню */
  var mb = $('#menuBtn'), sb = $('#sidebar');
  if (mb && sb) {
    mb.setAttribute('aria-label', 'Открыть меню'); mb.setAttribute('aria-expanded', 'false');
    mb.addEventListener('click', function () { var on = sb.classList.toggle('active'); mb.setAttribute('aria-expanded', String(on)); });
    document.addEventListener('click', function (e) { if (window.innerWidth <= 768 && sb.classList.contains('active') && !sb.contains(e.target) && e.target !== mb) { sb.classList.remove('active'); mb.setAttribute('aria-expanded', 'false'); } });
  }
  var s = $('#globalSearch');
  if (s) { s.setAttribute('aria-label', 'Поиск транзакций'); s.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !document.body.dataset.search) location.href = 'fintech_transactions.html?q=' + encodeURIComponent(s.value.trim()); }); }
  if (window.self === window.top) {
    var a = document.createElement('a'); a.href = '../index.html'; a.textContent = '← К портфолио'; a.setAttribute('aria-label', 'Вернуться в портфолио');
    a.setAttribute('style', 'position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:.65rem 1.1rem;border-radius:999px;background:#fff;color:#0b0f19;font:600 14px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.5)');
    document.body.appendChild(a);
  }
})();
