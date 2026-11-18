/* ==========================================================
   Эффекты портфолио. Подключается после js/portfolio.js.
   Ничего не ломает, если что-то не поддерживается: каждый
   блок в try/catch, а при prefers-reduced-motion тяжёлое не стартует.
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isHome = document.body.dataset.page === 'home';
  const safe = (fn) => { try { fn(); } catch (e) { console.warn('[fx]', e); } };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Слои: аврора, зерно, прогресс ---------- */
  function layers() {
    const prog = document.createElement('div'); prog.className = 'fx-progress'; prog.setAttribute('aria-hidden', 'true');
    document.body.prepend(prog);
    if (!reduced) {
      const a = document.createElement('div'); a.className = 'fx-aurora'; a.setAttribute('aria-hidden', 'true');
      a.innerHTML = '<i></i><i></i><i></i>';
      const g = document.createElement('div'); g.className = 'fx-grain'; g.setAttribute('aria-hidden', 'true');
      document.body.prepend(a); document.body.append(g);
    }
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = root.scrollHeight - innerHeight;
      const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      prog.style.setProperty('--p', p.toFixed(4));
      root.style.setProperty('--sy', p.toFixed(4));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Заголовки по словам ---------- */
  function splitTitles() {
    if (reduced) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } }), { threshold: .3 });
    $$('.section__title, .contact__title, .block-title').forEach((h) => {
      const text = h.textContent; if (!text.trim()) return;
      h.setAttribute('aria-label', text);
      h.innerHTML = text.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--wi:${i}">${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span></span>`).join(' ');
      h.classList.add('fx-split');
      io.observe(h);
    });
  }

  /* ---------- Счётчики ---------- */
  function counters() {
    if (reduced) return;
    $$('.facts b').forEach((b) => {
      const target = parseInt(b.textContent, 10);
      if (!Number.isFinite(target) || target <= 0) return;
      b.textContent = '0';
      const io = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return; io.disconnect();
        const t0 = performance.now(), dur = 1400;
        const tick = (t) => {
          const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
          b.textContent = String(Math.round(target * e));
          if (k < 1) requestAnimationFrame(tick);
        };
        setTimeout(() => requestAnimationFrame(tick), 700);
      });
      io.observe(b);
    });
  }

  /* ---------- Spotlight, блик и магнитные кнопки ---------- */
  function pointerFx() {
    if (reduced || !fine) return;
    $$('.principle, .skill, .feat li, .contact__links a, .next, .step').forEach((c) => {
      c.classList.add('fx-spot');
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--sx', `${e.clientX - r.left}px`); c.style.setProperty('--sy', `${e.clientY - r.top}px`);
      });
    });
    $$('.browser').forEach((b) => b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--gx', `${e.clientX - r.left}px`); b.style.setProperty('--gy', `${e.clientY - r.top}px`);
    }));
    $$('.btn, .icon-btn, .brand').forEach((m) => {
      const k = m.classList.contains('btn--lg') ? .32 : .26;
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * k, y = (e.clientY - r.top - r.height / 2) * k;
        m.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      m.addEventListener('pointerleave', () => { m.style.translate = ''; });
    });
  }

  /* ---------- Параллакс превью при прокрутке ---------- */
  function parallax() {
    if (reduced || !isHome) return;
    const items = $$('.work__preview');
    let tick = false;
    const run = () => {
      tick = false;
      items.forEach((n) => {
        const r = n.getBoundingClientRect();
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        n.style.translate = `0 ${clamp(c * -34, -34, 34).toFixed(1)}px`;
      });
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- Бегущая строка реагирует на скорость скролла ---------- */
  function marquee() {
    const track = $('#marquee'); if (!track || reduced) return;
    let last = scrollY, vel = 0, anim = null;
    const loop = () => {
      const d = scrollY - last; last = scrollY;
      vel += (d - vel) * .12;
      if (!anim) anim = track.getAnimations()[0];
      if (anim) anim.playbackRate = 1 + clamp(Math.abs(vel) * .35, 0, 9) * (vel < 0 ? -1 : 1);
      track.parentElement.style.transform = `skewX(${clamp(-vel * .25, -8, 8).toFixed(2)}deg)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Курсор ---------- */
  function cursor() {
    if (reduced || !fine) return;
    const ring = document.createElement('div'); ring.className = 'fx-cur'; ring.setAttribute('aria-hidden', 'true'); ring.innerHTML = '<span>Смотреть</span>';
    const dot = document.createElement('div'); dot.className = 'fx-dot'; dot.setAttribute('aria-hidden', 'true');
    document.body.append(ring, dot);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false;
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; rx = x; ry = y; root.classList.add('fx-cursor-on'); }
      dot.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.remove('fx-cursor-on'));
    document.addEventListener('pointerenter', () => { if (seen) root.classList.add('fx-cursor-on'); });
    addEventListener('pointerdown', () => ring.classList.add('is-down'));
    addEventListener('pointerup', () => ring.classList.remove('is-down'));
    const over = (e) => {
      const t = e.target;
      const view = t.closest && t.closest('.work__preview');
      const link = t.closest && t.closest('a, button, [role="tab"], summary, input, textarea');
      ring.classList.toggle('is-view', !!view);
      ring.classList.toggle('is-link', !!link && !view);
    };
    document.addEventListener('pointerover', over, { passive: true });
    (function loop() { rx += (x - rx) * .16; ry += (y - ry) * .16; ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`; requestAnimationFrame(loop); })();
  }

  /* ---------- Частицы в hero ---------- */
  function particles() {
    const hero = $('#top'); if (!hero || reduced) return;
    const cv = document.createElement('canvas'); cv.className = 'fx-canvas'; cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let looping = false, w = 0, h = 0, dpr = 1, pts = [], mouse = { x: -999, y: -999 }, run = true, rgb = '200,242,90';
    const readColor = () => {
      const c = getComputedStyle(root).getPropertyValue('--accent-text').trim();
      const m = /^#([0-9a-f]{6})$/i.exec(c);
      if (m) { const n = parseInt(m[1], 16); rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`; }
    };
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.round(w * h / 16000), 24, 70);
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.4 + .6 }));
      readColor();
    };
    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver((es) => { run = es[0].isIntersecting; if (run && !looping) frame(); }).observe(hero);
    new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    new ResizeObserver(resize).observe(hero);
    const L = 130;
    function frame() {
      if (!run) { looping = false; return; }
      looping = true;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 150 && d > 0) { p.x += dx / d * 1.1; p.y += dy / d * 1.1; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = `rgba(${rgb},.75)`; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) { ctx.strokeStyle = `rgba(${rgb},${(1 - d / L) * .28})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        const m = pts[i], dm = Math.hypot(m.x - mouse.x, m.y - mouse.y);
        if (dm < 170) { ctx.strokeStyle = `rgba(${rgb},${(1 - dm / 170) * .55})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      requestAnimationFrame(frame);
    }
    resize(); frame();
  }

  /* ---------- Шторка: заставка и переходы между страницами ---------- */
  function curtain() {
    const KEY_NAV = 'fx-nav', KEY_INTRO = 'fx-intro';
    let navFlag = false, introSeen = false;
    try { navFlag = sessionStorage.getItem(KEY_NAV) === '1'; introSeen = sessionStorage.getItem(KEY_INTRO) === '1'; } catch (e) { /* нет storage */ }
    const ready = () => { root.classList.remove('fx-cover'); root.classList.add('fx-ready'); };
    if (reduced) { ready(); return; }

    const c = document.createElement('div'); c.className = 'fx-curtain'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="fx-curtain__mark">D<b>.</b></div><div class="fx-curtain__name">DemianCode</div><div class="fx-curtain__n">0%</div>';
    document.body.append(c);
    root.classList.remove('fx-cover'); // шторка уже закрывает экран

    const out = () => { c.classList.add('is-out'); setTimeout(() => { root.classList.add('fx-ready'); }, 120); setTimeout(() => c.remove(), 1100); };
    const showIntro = isHome && !introSeen && !location.hash;
    if (showIntro) {
      try { sessionStorage.setItem(KEY_INTRO, '1'); } catch (e) { /* ок */ }
      const n = $('.fx-curtain__n', c);
      c.classList.add('is-show');
      const t0 = performance.now(), dur = 1250;
      (function step(t) {
        const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
        c.style.setProperty('--load', e.toFixed(3)); n.textContent = `${Math.round(e * 100)}%`;
        if (k < 1) requestAnimationFrame(step); else setTimeout(out, 180);
      })(t0);
    } else {
      // обычный вход: шторка просто уезжает вверх
      c.style.background = navFlag ? 'var(--accent)' : 'var(--bg)';
      requestAnimationFrame(() => requestAnimationFrame(out));
    }
    try { sessionStorage.removeItem(KEY_NAV); } catch (e) { /* ок */ }

    // исходящий переход
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin && location.protocol !== 'file:') return;
      if (u.protocol !== location.protocol) return;
      const same = u.pathname === location.pathname;
      if (same) return; // якоря и та же страница — без шторки
      if (!/\.html?$/.test(u.pathname) && !u.pathname.endsWith('/')) return;
      e.preventDefault();
      try { sessionStorage.setItem(KEY_NAV, '1'); } catch (er) { /* ок */ }
      const k = document.createElement('div'); k.className = 'fx-curtain is-pre is-in-nav'; k.setAttribute('aria-hidden', 'true');
      document.body.append(k);
      requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('is-go')));
      setTimeout(() => { location.href = a.href; }, 520);
    });
    // возврат по «назад» из bfcache
    addEventListener('pageshow', (e) => { if (e.persisted) $$('.fx-curtain').forEach((n) => n.remove()); });
  }

  safe(layers);
  safe(splitTitles);
  safe(counters);
  safe(pointerFx);
  safe(parallax);
  safe(marquee);
  safe(cursor);
  safe(particles);
  safe(curtain);
})();
