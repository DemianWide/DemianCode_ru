/* ==========================================================
   FIELDCODE v2 — app.js
   config.json → рендер → настройки доступности → GSAP → калькулятор
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  /* ---------- Настройки пользователя (localStorage безопасно) ---------- */
  const KEY = 'fc-prefs';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* приватный режим */ } };

  const sysReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = () => sysReduced.matches || root.dataset.motion === 'off';

  root.classList.add('js');

  /* ---------- Объявления для скринридера ---------- */
  const live = () => $('#liveStatus');
  function announce(msg) {
    const n = live();
    if (!n) return;
    n.textContent = '';
    setTimeout(() => { n.textContent = msg; }, 60);
  }

  /* ---------- Загрузка конфига ---------- */
  async function loadConfig() {
    try {
      const res = await fetch('config.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      // открыто двойным кликом (file://): fetch заблокирован, берём копию из config.js
      if (window.__CONFIG__) return window.__CONFIG__;
      root.classList.remove('js');
      const box = el('div', '', '<b>Не удалось загрузить config.json.</b><br>Откройте сайт через локальный сервер: запустите <code>start.bat</code> или «Live Server» в VS Code. При открытии файла напрямую (file://) браузер блокирует загрузку.');
      box.setAttribute('role', 'alert');
      box.style.cssText = 'position:fixed;z-index:999;left:50%;top:90px;transform:translateX(-50%);width:min(560px,92vw);padding:18px 22px;border-radius:16px;background:#FF7A1A;color:#1a0a00;font:500 15px/1.5 Inter,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)';
      document.body.appendChild(box);
      throw e;
    }
  }

  /* ---------- Рендер контента ---------- */
  function render(cfg) {
    document.title = cfg.meta.title;
    const md = $('meta[name="description"]');
    if (md) md.content = cfg.meta.description;

    $$('[data-key]').forEach((n) => {
      const v = get(cfg, n.dataset.key);
      if (typeof v === 'string') n.textContent = v;
    });

    // Навигация
    const nav = $('#navList');
    cfg.nav.forEach((i) => nav.appendChild(el('li', '', `<a href="${esc(i.href)}">${esc(i.label)}</a>`)));
    $('#nav').setAttribute('aria-label', cfg.nav_label);

    // Hero
    const t = $('#heroTitle');
    cfg.hero.title_lines.forEach((line) => {
      let safe = esc(line);
      const acc = esc(cfg.hero.title_accent || '');
      if (acc && safe.includes(acc)) safe = safe.replace(acc, `<span class="accent">${acc}</span>`);
      t.appendChild(el('span', 'line', `<span>${safe}</span>`));
    });
    cfg.hero.trust.forEach((b) => $('#heroTrust').appendChild(el('li', '', esc(b))));
    $('#heroVisual').setAttribute('aria-label', cfg.hero.visual_label);

    // Статистика (анимированные цифры скрыты от скринридера, читается итог)
    $('#statsSection').setAttribute('aria-label', cfg.stats_label);
    cfg.stats.forEach((s) => {
      $('#statsList').appendChild(el('li', '',
        `<div class="stat__num"><span aria-hidden="true"><span data-count="${s.value}">0</span>${esc(s.suffix || '')}</span><span class="sr-only">${s.value}${esc(s.suffix || '')}</span></div><div class="stat__label">${esc(s.label)}</div>`));
    });

    // Боли → решения
    cfg.pains.items.forEach((p) => {
      $('#painsList').appendChild(el('li', 'pain glass reveal',
        `<div class="pain__col pain__col--pain"><p class="pain__label">${esc(cfg.pains.col_pain)}</p><p>${esc(p.pain)}</p></div>
         <div class="pain__col pain__col--fix"><p class="pain__label">${esc(cfg.pains.col_fix)}</p><p>${esc(p.fix)}</p></div>`));
    });

    // Обо мне
    cfg.about.paragraphs.forEach((p) => $('#aboutParagraphs').appendChild(el('p', '', esc(p))));
    const aboutImg = $('#aboutImg');          // может отсутствовать: me.jpg ещё не добавлен
    if (aboutImg) aboutImg.alt = cfg.about.photo_alt;
    cfg.about.points.forEach((p, i) => {
      $('#aboutPoints').appendChild(el('li', 'point glass reveal',
        `<span class="point__n" aria-hidden="true">0${i + 1}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>`));
    });

    // Услуги
    cfg.services.items.forEach((s, i) => {
      const tags = s.tags.map((x) => `<li>${esc(x)}</li>`).join('');
      $('#servicesGrid').appendChild(el('article', 'card glass reveal',
        `<img class="card__tex" src="assets/images/service-${esc(s.id)}.webp" loading="lazy" decoding="async" alt="" onerror="this.remove()">
         <span class="card__num" aria-hidden="true">${esc(s.num)}</span>
         <h3 class="card__title">${esc(s.title)}</h3>
         <p class="card__text">${esc(s.text)}</p>
         <p class="card__result"><span>${esc(cfg.services.result_label)}</span>${esc(s.result)}</p>
         <ul class="tags">${tags}</ul>
         <p class="card__price">${esc(s.price)}</p>`));
    });

    // Примеры
    const cs = cfg.cases;
    cs.items.forEach((c) => {
      const tags = c.tags.map((x) => `<li>${esc(x)}</li>`).join('');
      $('#casesGrid').appendChild(el('article', 'case glass reveal',
        `<span class="case__label">${esc(cs.label)}</span>
         <h3>${esc(c.title)}</h3>
         <dl>
           <div><dt>${esc(cs.task_label)}</dt><dd>${esc(c.task)}</dd></div>
           <div><dt>${esc(cs.solution_label)}</dt><dd>${esc(c.solution)}</dd></div>
           <div><dt>${esc(cs.result_label)}</dt><dd class="is-result">${esc(c.result)}</dd></div>
         </dl>
         <ul class="tags">${tags}</ul>`));
    });

    // Этапы
    $('#timelineSteps').setAttribute('aria-label', cfg.pipeline.steps_label);
    cfg.pipeline.steps.forEach((s) => {
      $('#timelineSteps').appendChild(el('li', 'step',
        `<span class="step__n" aria-hidden="true">${esc(s.n)}</span><div class="step__body glass"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`));
    });

    // Цены
    cfg.pricing.plans.forEach((p) => {
      const f = p.features.map((x) => `<li>${esc(x)}</li>`).join('');
      $('#pricingGrid').appendChild(el('article', `plan glass reveal${p.highlight ? ' plan--hl' : ''}`,
        `${p.highlight ? `<span class="plan__badge">${esc(cfg.pricing.recommended)}</span>` : ''}
         <h3 class="plan__name">${esc(p.name)}</h3>
         <p class="plan__price">${esc(p.price)}</p>
         <p class="plan__desc">${esc(p.desc)}</p>
         <ul class="plan__features">${f}</ul>
         <button class="btn ${p.highlight ? 'btn--primary' : 'btn--ghost'} plan__cta" type="button" data-lead data-plan="${esc(p.name)}" aria-label="${esc(p.cta || cfg.lead.submit)}: тариф «${esc(p.name)}», ${esc(p.price)}">${esc(p.cta || cfg.lead.submit)}</button>`));
    });

    // FAQ (нативный <details>: доступен с клавиатуры и скринридерам)
    cfg.faq.items.forEach((q) => {
      $('#faqList').appendChild(el('details', 'glass reveal',
        `<summary>${esc(q.q)}</summary><div class="faq__a"><p>${esc(q.a)}</p></div>`));
    });

    // Контакты
    const c = cfg.contacts;
    const cta = $('#contactsCta');
    cta.textContent = c.cta;
    if (typeof HTMLDialogElement !== 'function') { cta.href = c.telegram.href; cta.target = '_blank'; cta.rel = 'noopener'; cta.removeAttribute('data-lead'); }
    if (cta.target === '_blank') cta.setAttribute('aria-label', `${c.cta} (откроется в новой вкладке)`);
    $('#contactsList').setAttribute('aria-label', c.list_label);
    ['telegram', 'whatsapp', 'phone', 'email'].forEach((k) => {
      const x = c[k];
      if (!x) return;
      const ext = /^https?:/.test(x.href);
      $('#contactsList').appendChild(el('li', '',
        `<a href="${esc(x.href)}"${ext ? ' target="_blank" rel="noopener"' : ''} aria-label="${esc(x.label)}: ${esc(x.value)}${ext ? ' (откроется в новой вкладке)' : ''}"><small aria-hidden="true">${esc(x.label)}</small><span aria-hidden="true">${esc(x.value)}</span></a>`));
    });
  }

  /* ---------- Настройки доступности ---------- */
  function initA11y(cfg) {
    const A = cfg.a11y;
    const btn = $('#a11yBtn'), panel = $('#a11yPanel'), closeBtn = $('#a11yClose');
    const themeRadios = $$('input[name="theme"]');
    const quick = $('#themeQuick');
    const contrast = $('#contrastToggle'), motion = $('#motionToggle');
    const fsMinus = $('#fsMinus'), fsPlus = $('#fsPlus'), fsReset = $('#fsReset');
    const MAX_FS = 3;

    btn.setAttribute('aria-label', A.open);
    closeBtn.setAttribute('aria-label', A.close);
    fsMinus.setAttribute('aria-label', A.font_minus);
    fsReset.setAttribute('aria-label', A.font_reset);
    fsPlus.setAttribute('aria-label', A.font_plus);

    const resolveTheme = (pref) => pref === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref;

    function applyTheme(pref, say) {
      prefs.theme = pref;
      root.dataset.theme = resolveTheme(pref);
      themeRadios.forEach((r) => { r.checked = r.value === pref; });
      const next = root.dataset.theme === 'dark' ? A.theme_light : A.theme_dark;
      quick.setAttribute('aria-label', `${A.theme}: ${next}`);
      savePrefs();
      if (say) announce(A[`announce_theme_${pref}`]);
    }
    function applyFs(level, say) {
      level = Math.max(0, Math.min(MAX_FS, level));
      prefs.fs = level || 0;
      if (level) root.dataset.fs = level; else delete root.dataset.fs;
      fsMinus.setAttribute('aria-disabled', level === 0);
      fsPlus.setAttribute('aria-disabled', level === MAX_FS);
      savePrefs();
      if (say) announce(`${A.announce_font}: ${level} / ${MAX_FS}`);
    }
    function applyContrast(on, say) {
      prefs.contrast = on;
      if (on) root.dataset.contrast = 'high'; else delete root.dataset.contrast;
      contrast.checked = on; savePrefs();
      if (say) announce(on ? A.announce_contrast_on : A.announce_contrast_off);
    }
    function applyMotion(off, say, initial) {
      const was = root.dataset.motion === 'off';
      prefs.motion = off ? 'off' : 'on';
      if (off) root.dataset.motion = 'off'; else delete root.dataset.motion;
      motion.checked = off; savePrefs();
      if (off && !initial) killMotion();
      if (say) announce(off ? A.announce_motion_on : A.announce_motion_off);
      if (!off && was && !initial) setTimeout(() => location.reload(), 900);
    }

    // Начальное состояние
    applyTheme(prefs.theme || 'dark', false);
    applyFs(+prefs.fs || 0, false);
    applyContrast(!!prefs.contrast, false);
    motion.checked = root.dataset.motion === 'off';

    themeRadios.forEach((r) => r.addEventListener('change', () => applyTheme(r.value, true)));
    quick.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (prefs.theme === 'auto') applyTheme('auto', false); });

    const step = (d) => () => { const cur = +prefs.fs || 0; const nxt = cur + d; if (nxt >= 0 && nxt <= MAX_FS) applyFs(nxt, true); };
    fsMinus.addEventListener('click', step(-1));
    fsPlus.addEventListener('click', step(+1));
    fsReset.addEventListener('click', () => applyFs(0, true));
    contrast.addEventListener('change', () => applyContrast(contrast.checked, true));
    motion.addEventListener('change', () => applyMotion(motion.checked, true, false));

    $('#a11yReset').addEventListener('click', () => {
      const wasOff = root.dataset.motion === 'off';
      applyTheme('dark', false); applyFs(0, false); applyContrast(false, false);
      prefs.motion = 'on'; delete root.dataset.motion; motion.checked = false; savePrefs();
      announce(A.announce_reset);
      if (wasOff) setTimeout(() => location.reload(), 900);
    });

    // Открытие / закрытие панели
    function openPanel() {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      (themeRadios.find((r) => r.checked) || closeBtn).focus();
    }
    function closePanel(returnFocus = true) {
      if (panel.hidden) return;
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus();
    }
    btn.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
    closeBtn.addEventListener('click', () => closePanel());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanel(); closeMenu(); } });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) closePanel(false); });
  }

  /* ---------- Меню, header, scrollspy ---------- */
  let closeMenu = () => {};
  function initUI() {
    const header = $('#header');
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 24);
    onScroll(); addEventListener('scroll', onScroll, { passive: true });

    const burger = $('#burger'), nav = $('#nav');
    closeMenu = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню'); };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });

    // Подсветка текущего раздела + aria-current
    const links = $$('.nav__list a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(en.target.id);
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

    // После перехода по якорю переносим фокус на раздел (для клавиатуры и скринридеров)
    addEventListener('hashchange', () => {
      const t = document.getElementById(location.hash.slice(1));
      if (t) { if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    });
  }

  /* ---------- Калькулятор ---------- */
  function initCalculator(cfg) {
    const c = cfg.calculator;
    const selWork = $('#calcWork'), qty = $('#calcQty'), qtyOut = $('#calcQtyOut'), unit = $('#calcUnit');
    const seg = $('#calcComplexity'), mat = $('#calcMaterials'), out = $('#calcTotal');
    $('#calcForm').setAttribute('aria-label', c.form_label);

    c.works.forEach((w, i) => selWork.appendChild(new Option(w.label, i)));
    c.complexity.forEach((k, i) => {
      const lab = el('label', '', `<input type="radio" name="complexity" value="${i}"${i === 0 ? ' checked' : ''}><span>${esc(k.label)}</span>`);
      seg.appendChild(lab);
    });
    seg.setAttribute('role', 'radiogroup');
    seg.addEventListener('change', update);

    const state = { v: 0 };
    let tween, timer, first = true;
    const finalText = (n) => `${fmt(n)} ${c.currency}`;
    const speak = (n) => {
      clearTimeout(timer);
      if (first) return;
      timer = setTimeout(() => announce(`${c.labels.total}: ${finalText(n)}`), 900);
    };
    const animateTo = (target) => {
      if (motionOff() || !window.gsap) { out.textContent = finalText(target); return; }
      tween && tween.kill();
      tween = gsap.to(state, { v: target, duration: .6, ease: 'power3.out', onUpdate: () => { out.textContent = finalText(state.v); } });
    };

    function setWork() {
      const w = c.works[+selWork.value];
      qty.max = w.max; qty.value = w.default; unit.textContent = w.unit;
      update();
    }
    function update() {
      const w = c.works[+selWork.value];
      const q = +qty.value;
      const kIdx = +(seg.querySelector('input:checked')?.value || 0);
      qtyOut.textContent = q;
      qty.setAttribute('aria-valuetext', `${q} ${w.unit}`);
      qty.style.setProperty('--p', `${((q - qty.min) / (qty.max - qty.min)) * 100}%`);
      let total = w.rate * q * c.complexity[kIdx].k;
      if (mat.checked) total *= 1 + c.materials_markup;
      animateTo(total);
      speak(total);
    }
    selWork.addEventListener('change', setWork);
    qty.addEventListener('input', update);
    mat.addEventListener('change', update);
    setWork();
    first = false;
  }

  /* ---------- Интерактивная 3D-модель (подгружается только по клику) ---------- */
  function init3D(cfg) {
    const btn = $('#view3d'), visual = $('#heroVisual');
    if (!btn || !visual) return;
    const H = cfg.hero;
    const MODEL = 'assets/3d/hero.opt.glb';
    const VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    const savedLabel = visual.getAttribute('aria-label');
    let viewer = null;

    const loadViewer = () => new Promise((resolve, reject) => {
      if (window.customElements && customElements.get('model-viewer')) return resolve();
      const s = document.createElement('script');
      s.type = 'module'; s.src = VIEWER; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });

    function close() {
      if (viewer) viewer.remove();
      viewer = null;
      visual.classList.remove('is-3d');
      visual.setAttribute('role', 'img');
      visual.setAttribute('aria-label', savedLabel);
      btn.textContent = H.view3d;
      btn.setAttribute('aria-pressed', 'false');
      btn.disabled = false;
    }

    async function open() {
      btn.disabled = true;
      btn.textContent = H.view3d_loading;
      announce(H.view3d_loading);
      try { await loadViewer(); } catch (e) { close(); announce(H.view3d_error); return; }
      viewer = document.createElement('model-viewer');
      viewer.className = 'hero__model';
      viewer.setAttribute('src', MODEL);
      viewer.setAttribute('alt', H.view3d_alt);
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('environment-image', 'neutral');
      viewer.setAttribute('shadow-intensity', '.6');
      viewer.setAttribute('exposure', '1.1');
      viewer.setAttribute('interaction-prompt', 'none');
      if (!motionOff()) viewer.setAttribute('auto-rotate', '');
      viewer.addEventListener('load', () => announce(H.view3d_hint), { once: true });
      viewer.addEventListener('error', () => { close(); announce(H.view3d_error); }, { once: true });
      // role="img" делает содержимое «картинкой» для скринридера, поэтому на время 3D снимаем его
      visual.removeAttribute('role');
      visual.removeAttribute('aria-label');
      visual.classList.add('is-3d');
      visual.appendChild(viewer);
      btn.textContent = H.view3d_close;
      btn.setAttribute('aria-pressed', 'true');
      btn.disabled = false;
    }

    btn.addEventListener('click', () => (viewer ? close() : open()));
  }

  /* ---------- Окно заявки (→ Telegram через серверный скрипт) ---------- */
  function initLead(cfg) {
    const L = cfg.lead, dlg = $('#leadDialog');
    if (!L || !dlg || typeof dlg.showModal !== 'function') return; // без <dialog> работают обычные якоря на #contacts
    const form = $('#leadForm'), err = $('#leadErr'), submit = $('#leadSubmit');
    const fields = $('#leadFields'), ok = $('#leadOk'), planBox = $('#leadPlan'), planOut = $('#leadPlanName');
    const contact = $('#leadContact'), consent = $('#leadConsent');
    let opener = null, ctx = '', busy = false;

    contact.placeholder = L.contact_ph;
    $('#leadName').placeholder = L.name_ph;
    $('#leadMessage').placeholder = L.message_ph;
    $('#leadClose').setAttribute('aria-label', L.close);
    $$('[data-lead]').forEach((t) => t.setAttribute('aria-haspopup', 'dialog'));

    const validContact = (v) => {
      const s = v.trim(), digits = s.replace(/\D/g, '');
      return digits.length >= 10 || /^@?[A-Za-z0-9_]{4,32}$/.test(s) || /t\.me\//i.test(s) || /^\S+@\S+\.\S+$/.test(s);
    };
    const setErr = (html, field) => {
      err.innerHTML = html;
      [contact, consent].forEach((f) => f.removeAttribute('aria-invalid'));
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    };

    function open(trigger) {
      opener = trigger;
      const extra = trigger.dataset.leadCtx === 'calc' ? `Расчёт в калькуляторе: ${($('#calcTotal') || {}).textContent || '0'} ₽` : '';
      ctx = [trigger.dataset.plan ? `Тариф «${trigger.dataset.plan}»` : '', extra].filter(Boolean).join('. ');
      planBox.hidden = !ctx; planOut.textContent = ctx;
      setErr('');
      fields.hidden = false; ok.hidden = true; busy = false;
      submit.disabled = false; submit.textContent = L.submit;
      document.body.classList.add('modal-open');
      dlg.showModal();
      contact.focus();
    }
    function close() { if (dlg.open) dlg.close(); }
    dlg.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (opener && document.contains(opener)) opener.focus();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); }); // клик по фону
    $('#leadClose').addEventListener('click', close);
    $('#leadDone').addEventListener('click', close);

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lead]');
      if (!t) return;
      e.preventDefault();
      open(t);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      if (!validContact(contact.value)) return setErr(esc(L.err_contact), contact);
      if (!consent.checked) return setErr(esc(L.err_consent), consent);
      setErr('');
      const data = new FormData(form);
      if (data.get('website')) { fields.hidden = true; ok.hidden = false; return; } // ловушка для ботов
      busy = true; submit.disabled = true; submit.textContent = L.sending;
      const payload = {
        contact: contact.value.trim(), name: String(data.get('name') || '').trim(),
        message: String(data.get('message') || '').trim(), plan: ctx, page: location.href
      };
      try {
        const r = await fetch(L.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok !== true) throw new Error('send failed');
        fields.hidden = true; ok.hidden = false; ok.focus();
        announce(L.success_title);
        form.reset();
      } catch (x) {
        busy = false; submit.disabled = false; submit.textContent = L.submit;
        const tg = cfg.contacts.telegram;
        setErr(`${esc(L.err_send)} <a href="${esc(tg.href)}" target="_blank" rel="noopener">${esc(L.direct)} (${esc(tg.value)})</a>`);
      }
    });
  }

  /* ---------- Анимации ---------- */
  let animCtx = [];
  function killMotion() {
    if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((t) => t.kill());
    if (window.gsap) {
      gsap.globalTimeline.clear();
      gsap.set('.reveal, .step, .hero__title .line > span, .hero .eyebrow, .hero__sub, .hero__actions .btn, .trust li, .hero__visual, .rig, .hero__img, .rig__tag, .card, .calc, .section__title, .contacts__title', { clearProps: 'all' });
    }
    root.classList.remove('js');
    $$('[data-count]').forEach((n) => (n.textContent = n.dataset.count));
    const f = $('#timelineFill'); if (f) f.style.height = '100%';
    $$('.step').forEach((s) => s.classList.add('is-active'));
  }

  function initAnimations() {
    if (!window.gsap || !window.ScrollTrigger || motionOff()) { killMotion(); return; }
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero .eyebrow', { y: 16, opacity: 0, duration: .6 })
      .from('.hero__title .line > span', { yPercent: 105, duration: .9, stagger: .1 }, '-=.3')
      .from('.hero__sub', { y: 20, opacity: 0, duration: .7 }, '-=.5')
      .from('.hero__actions .btn', { y: 16, opacity: 0, duration: .6, stagger: .08 }, '-=.4')
      .from('.trust li', { y: 12, opacity: 0, duration: .5, stagger: .08 }, '-=.3')
      .from('.hero__visual', { scale: .8, opacity: 0, duration: 1.2, ease: 'expo.out' }, .2);

    gsap.to('.hero__visual', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    ScrollTrigger.batch('.reveal', {
      start: 'top 90%',
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: .8, stagger: .1, ease: 'power3.out', overwrite: true }),
    });

    $$('[data-count]').forEach((n) => {
      const end = +n.dataset.count, o = { v: 0 };
      ScrollTrigger.create({ trigger: n, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => (n.textContent = Math.round(o.v)) }) });
    });

    gsap.to('#timelineFill', { height: '100%', ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 65%', end: 'bottom 70%', scrub: .5 } });
    $$('.step').forEach((s) => {
      gsap.from(s, { opacity: 0, x: -30, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } });
      ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 62%',
        onEnter: () => s.classList.add('is-active'), onEnterBack: () => s.classList.add('is-active'),
        onLeaveBack: () => s.classList.remove('is-active') });
    });

    gsap.from('.calc', { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.calc', start: 'top 88%' } });

    // Лёгкий параллакс 3D-объекта и 3D-наклон карточек — только для мыши
    if (matchMedia('(pointer:fine)').matches) {
      addEventListener('pointermove', (e) => {
        if (motionOff()) return;
        const x = (e.clientX / innerWidth - .5) * 2, y = (e.clientY / innerHeight - .5) * 2;
        gsap.to('.rig, .hero__img', { rotateY: x * 10, rotateX: -y * 8, duration: 1, ease: 'power3.out', transformPerspective: 1200 });
      }, { passive: true });
      $$('.card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          if (motionOff()) return;
          const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--mx', `${px * 100}%`); card.style.setProperty('--my', `${py * 100}%`);
          gsap.to(card, { rotateY: (px - .5) * 6, rotateX: -(py - .5) * 6, duration: .5, ease: 'power2.out', transformPerspective: 1000 });
        });
        card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .6, ease: 'power3.out' }));
      });
    }
  }

  /* ---------- Старт ---------- */
  loadConfig()
    .then((cfg) => {
      render(cfg);
      initA11y(cfg);
      initUI();
      initLead(cfg);
      initCalculator(cfg);
      init3D(cfg);
      initAnimations();
      addEventListener('load', () => window.ScrollTrigger && ScrollTrigger.refresh());
    })
    .catch((e) => console.error('[FIELDCODE] config error:', e));
})();
