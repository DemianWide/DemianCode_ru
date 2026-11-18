/* ==========================================================
   Портфолио — скрипт. Данные: data/site.js (window.SITE).
   Главная и страница кейса используют один файл.
   ========================================================== */
(() => {
  'use strict';
  const S = window.SITE;
  if (!S) { console.error('[portfolio] data/site.js не загружен'); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const page = document.body.dataset.page;
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const url = (p) => encodeURI(p);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  const announce = (msg) => {
    const n = $('#liveStatus'); if (!n) return;
    n.textContent = ''; setTimeout(() => { n.textContent = msg; }, 50);
  };

  /* ---------- Общее: тексты, тема, навигация ---------- */
  function fillText() {
    $$('[data-t]').forEach((n) => { const v = get(S, n.dataset.t); if (v != null) n.textContent = v; });
    document.title = S.meta.title;
    const d = $('meta[name="description"]'); if (d) d.content = S.meta.description;
  }

  function initTheme() {
    const btn = $('#themeBtn');
    const apply = (t) => {
      root.dataset.theme = t;
      try { localStorage.setItem('pf-theme', t); } catch (e) { /* приватный режим */ }
      const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'light' ? '#F4F4EF' : '#0A0B0D';
    };
    btn.setAttribute('aria-label', S.ui.theme);
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      apply(next);
      announce(next === 'light' ? 'Светлая тема' : 'Тёмная тема');
    });
    apply(root.dataset.theme || 'dark');
  }

  function initNav() {
    const prefix = page === 'home' ? '' : 'index.html';
    const list = $('#navList');
    S.nav.forEach((n) => list.appendChild(el('li', '', `<a href="${prefix}#${esc(n.id)}" data-id="${esc(n.id)}">${esc(n.label)}</a>`)));
    $('#skipLink').textContent = S.ui.skip;
    $('#brand').setAttribute('aria-label', `${S.brand.name}: ${S.ui.home.toLowerCase()}`);
    $('#nav').setAttribute('aria-label', S.ui.nav_label);

    const burger = $('#burger'), nav = $('#nav');
    const setMenu = (open) => {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? S.ui.menu_close : S.ui.menu_open);
    };
    setMenu(false);
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    document.addEventListener('click', (e) => { if (nav.classList.contains('is-open') && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false); });

    const header = $('#header');
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 12);
    onScroll(); addEventListener('scroll', onScroll, { passive: true });

    if (page === 'home') {
      const links = new Map($$('#navList a').map((a) => [a.dataset.id, a]));
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.removeAttribute('aria-current'));
          const a = links.get(e.target.id); if (a) a.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      S.nav.forEach((n) => { const s = $('#' + n.id); if (s) io.observe(s); });
      const hero = $('#top');
      if (hero) new IntersectionObserver((es) => { if (es[0].isIntersecting) links.forEach((a) => a.removeAttribute('aria-current')); }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }
  }

  function reveal() {
    const items = $$('.rv');
    if (!('IntersectionObserver' in window) || reduced.matches) { items.forEach((n) => n.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach((n, i) => { n.style.setProperty('--d', `${(i % 4) * 0.07}s`); io.observe(n); });
  }

  /* ---------- Превью работы: картинка, а если её нет, живая страница ---------- */
  function buildPreview(p, { interactiveTilt = true } = {}) {
    const host = el('div', 'browser');
    host.innerHTML = `<div class="browser__bar" aria-hidden="true"><i></i><i></i><i></i><span class="browser__url">${esc(p.title.toLowerCase())}.demo</span></div><div class="browser__view"></div>`;
    const view = $('.browser__view', host);

    const useFrame = () => {
      const f = el('iframe');
      f.src = url(p.demos[0].href); f.loading = 'lazy'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.title = p.title;
      if ('inert' in f) f.inert = true;
      view.appendChild(f);
      const fit = () => view.style.setProperty('--k', (view.clientWidth / 1440).toFixed(4));
      fit();
      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(view); else addEventListener('resize', fit);
    };
    const probe = new Image();
    probe.onload = () => { const i = el('img'); i.src = probe.src; i.alt = ''; i.decoding = 'async'; i.loading = 'lazy'; view.appendChild(i); };
    probe.onerror = useFrame;
    probe.src = p.cover;

    if (interactiveTilt && !reduced.matches) {
      const wrap = host;
      wrap.addEventListener('pointermove', (e) => {
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        wrap.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`); wrap.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
      });
      wrap.addEventListener('pointerleave', () => { wrap.style.setProperty('--rx', '0deg'); wrap.style.setProperty('--ry', '0deg'); });
    }
    return host;
  }

  /* ---------- Главная ---------- */
  function renderHome() {
    // заголовок: строки, {акцент}
    const h1 = $('#heroTitle');
    S.hero.title.forEach((line, i) => {
      const accent = /^\{(.*)\}$/.exec(line);
      const ln = el('span', 'ln', `<span style="--i:${i}">${accent ? `<em>${esc(accent[1])}</em>` : esc(line)}</span>`);
      h1.appendChild(ln);
    });
    S.hero.facts.forEach((f) => $('#facts').appendChild(el('li', '', `<b>${esc(f.n)}</b><span>${esc(f.t)}</span>`)));

    const words = S.hero.marquee.map((w) => `<span>${esc(w)}</span>`).join('');
    $('#marquee').innerHTML = words + words;

    // эффект свечения и параллакс песочницы
    const hero = $('#top'), sb = $('.sandbox');
    if (hero && !reduced.matches && matchMedia('(hover: hover)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', `${e.clientX - r.left}px`); hero.style.setProperty('--my', `${e.clientY - r.top}px`);
        if (sb) { sb.style.setProperty('--px', ((e.clientX / innerWidth - .5) * 2).toFixed(3)); sb.style.setProperty('--py', ((e.clientY / innerHeight - .5) * 2).toFixed(3)); }
      });
    }

    // работы
    const list = $('#worksList');
    S.projects.forEach((p) => {
      const caseHref = `project.html?p=${encodeURIComponent(p.slug)}`;
      const w = el('article', 'work rv');
      const prev = el('div', 'work__preview');
      prev.appendChild(buildPreview(p));
      prev.insertAdjacentHTML('beforeend', `<a class="work__link" href="${caseHref}" aria-label="${esc(S.works.case_label)}: ${esc(p.title)}"></a><span class="work__badge" aria-hidden="true">${esc(S.works.case_label)} →</span>`);
      const info = el('div', 'work__info', `
        <span class="work__n">${esc(p.index)} / ${esc(String(S.projects.length).padStart(2, '0'))}</span>
        <h3 class="work__title">${esc(p.title)}</h3>
        <p class="work__sub">${esc(p.subtitle)}</p>
        <p class="work__meta">${esc(p.type)} · ${esc(p.year)}</p>
        <ul class="tags" aria-label="Особенности">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="work__actions">
          <a class="btn btn--accent" href="${caseHref}">${esc(S.works.case_label)} <span class="arr" aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="${url(p.demos[0].href)}" target="_blank" rel="noopener" aria-label="${esc(S.works.demo_label)}: ${esc(p.title)} ${esc(S.ui.new_tab)}">${esc(S.works.demo_label)} <span class="arr" aria-hidden="true">↗</span></a>
        </div>`);
      w.append(prev, info);
      list.appendChild(w);
    });

    // обо мне
    S.about.paragraphs.forEach((t) => $('#aboutParagraphs').appendChild(el('p', '', esc(t))));
    $('#aboutImg').alt = S.about.photo_alt;
    S.about.principles.forEach((x) => $('#principles').appendChild(el('li', 'principle rv', `<h3>${esc(x.t)}</h3><p>${esc(x.d)}</p>`)));
    S.about.skills.forEach((g) => $('#skills').appendChild(el('div', 'skill rv', `<h4>${esc(g.g)}</h4><ul class="chips">${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`)));
    S.about.process.forEach((s) => $('#process').appendChild(el('li', 'step rv', `<span class="step__n">${esc(s.n)}</span><h4>${esc(s.t)}</h4><p>${esc(s.d)}</p>`)));

    // контакты
    const c = S.contact, mail = $('#contactMail');
    mail.textContent = c.email.value; mail.href = c.email.href;
    c.links.forEach((l) => $('#contactLinks').appendChild(el('li', '', `<a href="${esc(l.href)}" target="_blank" rel="noopener" aria-label="${esc(l.label)}: ${esc(l.value)} ${esc(S.ui.new_tab)}"><small aria-hidden="true">${esc(l.label)}</small><span aria-hidden="true">${esc(l.value)}</span></a>`)));
    $('#copyMail').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(c.email.value); announce(c.copied); const b = $('#copyMail'); b.textContent = c.copied; setTimeout(() => { b.textContent = c.copy; }, 2200); }
      catch (e) { announce(c.copy_fail); }
    });
  }

  /* ---------- Страница кейса ---------- */
  function renderCase() {
    const root_ = $('#caseRoot');
    const slug = new URLSearchParams(location.search).get('p');
    const i = S.projects.findIndex((p) => p.slug === slug);
    if (i < 0) {
      root_.innerHTML = `<p class="section__lead" style="margin-top:3rem"><a class="crumb" href="index.html#works">← ${esc(S.case.not_found)}</a></p>`;
      return;
    }
    const p = S.projects[i], next = S.projects[(i + 1) % S.projects.length], C = S.case;
    document.title = `${p.title} — кейс · ${S.brand.name}`;

    const tabs = p.demos.length > 1
      ? `<div class="tabs" role="tablist" aria-label="${esc(C.demo_title)}">${p.demos.map((d, k) => `<button class="tab" role="tab" id="tab${k}" aria-selected="${k === 0}" aria-controls="demoPanel" tabindex="${k === 0 ? 0 : -1}" data-i="${k}">${esc(d.label)}</button>`).join('')}</div>` : '';

    root_.innerHTML = `
      <a class="crumb" href="index.html#works">← ${esc(C.back)}</a>
      <h1 class="case__title">${esc(p.title)}</h1>
      <p class="case__sub">${esc(p.subtitle)}</p>
      <dl class="case__meta">
        <div><dt>${esc(C.meta.year)}</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>${esc(C.meta.type)}</dt><dd>${esc(p.type)}</dd></div>
        <div><dt>${esc(C.meta.role)}</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>${esc(C.meta.stack)}</dt><dd>${esc(p.stack.slice(0, 3).join(', '))}</dd></div>
      </dl>

      <section class="demo" aria-labelledby="demoTitle">
        <div class="demo__head">
          <div><h2 id="demoTitle">${esc(C.demo_title)}</h2><p>${esc(C.demo_hint)}</p></div>
          <a class="btn btn--ghost btn--sm" id="demoOpen" href="${url(p.demos[0].href)}" target="_blank" rel="noopener">${esc(C.open_new)} <span class="arr" aria-hidden="true">↗</span></a>
        </div>
        ${tabs}
        <div class="demo__frame" id="demoPanel" role="${p.demos.length > 1 ? 'tabpanel' : 'region'}" ${p.demos.length > 1 ? 'aria-labelledby="tab0"' : `aria-label="${esc(C.demo_title)}"`}>
          <iframe id="demoFrame" src="${url(p.demos[0].href)}" title="${esc(p.title)}: ${esc(p.demos[0].label)}" loading="eager"></iframe>
        </div>
      </section>

      <div class="case__grid">
        <div class="rv"><h2>${esc(C.task)}</h2><p class="case__lead">${esc(p.summary)}</p><p class="case__lead" style="font-size:1.05rem">${esc(p.task)}</p></div>
        <div class="rv"><h2>${esc(C.solution)}</h2><ol class="solution">${p.solution.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      </div>

      <section class="case__block rv" aria-labelledby="featT"><h2 id="featT">${esc(C.features)}</h2>
        <ul class="feat">${p.features.map((f) => `<li><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></li>`).join('')}</ul></section>

      <section class="case__block rv" aria-labelledby="stackT"><h2 id="stackT">${esc(C.stack)}</h2>
        <ul class="chips" style="margin-top:1.2rem">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>

      <a class="next rv" href="project.html?p=${encodeURIComponent(next.slug)}"><small>${esc(C.next)}</small><strong><span>${esc(next.title)}</span><span class="arr" aria-hidden="true">→</span></strong></a>`;

    // переключение вкладок демо
    if (p.demos.length > 1) {
      const frame = $('#demoFrame'), open = $('#demoOpen'), panel = $('#demoPanel');
      const tabEls = $$('.tab', root_);
      const select = (k, focus) => {
        tabEls.forEach((t, n) => { t.setAttribute('aria-selected', String(n === k)); t.tabIndex = n === k ? 0 : -1; });
        const d = p.demos[k];
        frame.src = url(d.href); frame.title = `${p.title}: ${d.label}`;
        open.href = url(d.href); panel.setAttribute('aria-labelledby', `tab${k}`);
        if (focus) tabEls[k].focus();
      };
      tabEls.forEach((t, k) => {
        t.addEventListener('click', () => select(k));
        t.addEventListener('keydown', (e) => {
          const n = tabEls.length;
          if (e.key === 'ArrowRight') { e.preventDefault(); select((k + 1) % n, true); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); select((k - 1 + n) % n, true); }
          if (e.key === 'Home') { e.preventDefault(); select(0, true); }
          if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
        });
      });
    }
  }

  /* ---------- Старт ---------- */
  fillText();
  initTheme();
  initNav();
  if (page === 'home') renderHome(); else renderCase();
  reveal();
})();
