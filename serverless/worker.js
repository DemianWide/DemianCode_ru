/**
 * DemianCode — один Worker для двух задач (Cloudflare Workers, бесплатно):
 *
 *  1) Форма заявок с сайта (POST / с JSON) → сообщение вам в Telegram.
 *  2) Бот-анкета для клиентов (webhook POST /tg): задаёт вопросы, принимает фото,
 *     в конце присылает вам готовое ТЗ (файл brief.md) и фотографии.
 *  3) Служебные адреса /admin/* (по ключу) — чтобы скачать ТЗ и фото на компьютер.
 *
 * Секреты (Settings → Variables and Secrets), в коде их нет:
 *   BOT_TOKEN       токен бота от @BotFather
 *   CHAT_ID         ваш chat_id (сюда приходят заявки и анкеты)
 *   ORIGINS         адреса сайта через запятую (для формы)
 *   WEBHOOK_SECRET  случайная строка из латиницы и цифр (защита webhook)
 *   ADMIN_KEY       случайная строка (доступ к /admin/*)
 * Привязка (Settings → Bindings → KV namespace):
 *   BRIEFS          хранилище анкет
 */

/* ---------- вопросы анкеты ---------- */
const FIELDS = ['Слаботочные системы', 'Электромонтаж', 'Сантехника и отопление', 'Кондиционеры и вентиляция', 'Ремонт и отделка', 'Другое'];

const CALC_RE = /калькулятор|расч[её]т|посчитать|считать|смета/i;

// Ядро: 6 вопросов. Остальное задаётся по ситуации (when) или только если клиент согласился (opt).
const STEPS = [
  { k: 'company', t: 'Название компании', q: 'Как называется ваша компания? Если работаете сами, напишите, как к вам обращаться.' },
  { k: 'field', t: 'Сфера', q: 'Чем вы занимаетесь? Выберите вариант или напишите своё.', opts: FIELDS },
  { k: 'city', t: 'Город и регион', q: 'В каком городе или регионе вы работаете?' },
  { k: 'services', t: 'Услуги и цены', q: 'Перечислите услуги и примерные цены, по одной в строке. Например:\nПрокладка кабеля — от 120 ₽/м\nМонтаж камеры — 1 500 ₽\nЕсли цен пока нет, пишите только услуги.' },
  { k: 'contacts', t: 'Контакты для сайта', q: 'Какие контакты показать на сайте? Телефон, Telegram или WhatsApp, почта, адрес, график. Можно одним сообщением.' },
  { k: 'wants', t: 'Что нужно на сайте', q: 'Что ещё должно быть на сайте? Выберите вариант или напишите своими словами, например: калькулятор, отзывы, примеры работ, карта, этапы работы.', opts: ['Хватит визитки с заявками', 'Калькулятор стоимости', 'Галерея моих работ', 'Отзывы и этапы работы'] },
  { k: 'calc', t: 'Калькулятор', when: (a) => CALC_RE.test(a.wants || ''), q: 'Что должен считать калькулятор? Например: метры кабеля, число точек, площадь. Если не знаете, напишите «решайте сами».' },
  { k: 'photos', t: 'Фото', photos: true, q: 'Есть фото для сайта: логотип, ваши работы, объекты, команда? Присылайте до 15 штук, можно по несколько сразу. Логотип подпишите словом «лого». Закончили, нажмите «Готово». Нет фото, нажмите «Пропустить».' },
  { k: 'more', t: 'Дополнительно', gate: true, q: 'Основное собрано. Осталось пара необязательных вопросов про оформление, домен и сроки. Ответите сейчас или оставите на моё усмотрение?', opts: ['Отвечу сейчас', 'Решайте сами'] },
  { k: 'style', t: 'Стиль и цвета', opt: true, q: 'Какой стиль ближе и есть ли фирменные цвета или сайты, которые нравятся? Можно ссылкой или словами.', opts: ['Строгий тёмный', 'Светлый деловой', 'Яркий и заметный', 'Предложите сами'], skip: true },
  { k: 'domain', t: 'Домен', opt: true, q: 'Есть ли у вас свой домен (адрес сайта)? Напишите его или «нет».', skip: true },
  { k: 'deadline', t: 'Срок', opt: true, q: 'К какому сроку нужен сайт?', opts: ['Срочно, до недели', 'В течение месяца', 'Не горит'], skip: true },
  { k: 'comment', t: 'Комментарий', opt: true, q: 'Что ещё важно учесть? Любые пожелания своими словами.', skip: true }
];

const MAX_PHOTOS = 15;
const TTL_STATE = 7 * 24 * 3600;
const TTL_BRIEF = 90 * 24 * 3600;

/* ---------- мелочи ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, n);
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

function safeEq(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function tg(env, method, payload) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return await r.json();
  } catch { return { ok: false }; }
}

// запоминаем, какому клиенту принадлежит сообщение у владельца (для ответа через Reply)
const mapOwner = (env, r, client) =>
  r && r.ok && r.result ? env.BRIEFS.put(`own:${r.result.message_id}`, String(client), { expirationTtl: 30 * 24 * 3600 }) : null;

const say = (env, chat, text, keys) =>
  tg(env, 'sendMessage', {
    chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true,
    reply_markup: keys ? { keyboard: keys, resize_keyboard: true, one_time_keyboard: true } : { remove_keyboard: true }
  });

function keysFor(step) {
  const rows = [];
  if (step.opts) for (let i = 0; i < step.opts.length; i += 2) rows.push(step.opts.slice(i, i + 2));
  if (step.photos) rows.push(['Готово', 'Пропустить']);
  else if (step.skip) rows.push(['Пропустить']);
  return rows.length ? rows : null;
}

/* ---------- анкета ---------- */
async function ask(env, chat, i) {
  const s = STEPS[i];
  const head = s.opt || s.gate ? '' : `<b>Вопрос ${i + 1}.</b> `;
  await say(env, chat, head + esc(s.q), keysFor(s));
}

async function getState(env, chat) {
  const raw = await env.BRIEFS.get(`st:${chat}`);
  return raw ? JSON.parse(raw) : null;
}
const putState = (env, chat, st) => env.BRIEFS.put(`st:${chat}`, JSON.stringify(st), { expirationTtl: TTL_STATE });

async function startBrief(env, msg) {
  const chat = msg.chat.id;
  const st = { i: 0, a: {}, sid: Date.now(), from: { name: clip(msg.from?.first_name || '', 40), user: clip(msg.from?.username || '', 40) } };
  await putState(env, chat, st);
  await say(env, chat,
    'Здравствуйте! Я помогу заказать сайт. Отвечу на несколько вопросов (это быстро), и мастер быстро соберёт сайт под вас.\n' +
    'Отменить можно в любой момент командой /cancel, начать заново командой /start.');
  await ask(env, chat, 0);
}

async function listPhotos(env, chat, sid) {
  const out = [];
  let cursor;
  do {
    const r = await env.BRIEFS.list({ prefix: `ph:${chat}:${sid}:`, cursor });
    for (const k of r.keys) if (k.metadata) out.push(k.metadata);
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor && out.length < 200);
  return out;
}

function renderBrief(a, photos, who, id) {
  const lines = [`# Анкета клиента: ${a.company || 'без названия'}`, '', `Номер анкеты: ${id}`, `Telegram: ${who.user ? '@' + who.user : 'без ника'} (${who.name || 'имя не указано'}, id ${who.chat})`, ''];
  for (const s of STEPS) {
    if (s.photos || s.gate) continue;
    if (!a[s.k] && (s.when || s.opt)) continue;
    lines.push(`## ${s.t}`, a[s.k] ? a[s.k] : '— не указано', '');
  }
  if (a.more && /решайте/i.test(a.more)) {
    lines.push('## Оформление, домен, сроки', 'Клиент не стал отвечать и оставил на усмотрение мастера: предложить стиль, уточнить домен и срок при общении.', '');
  }
  const logos = photos.filter((p) => p.k === 'logo').length;
  lines.push('## Фото', `Всего: ${photos.length}${logos ? `, из них логотип: ${logos}` : ''}. Файлы приложены к сообщению в Telegram и скачиваются скриптом get_brief.ps1.`, '');
  lines.push('---', '', '## Задание для Claude', '',
    'Собери сайт для этого клиента на основе шаблона сайта-визитки из папки проекта (всё содержимое лежит в config.json).',
    '1. Заполни config.json по анкете: название, услуги и цены, преимущества, контакты, этапы работы, блоки сайта.',
    '2. Если нужен калькулятор, настрой его на услуги из анкеты.',
    '3. Подбери цвета по выбранному стилю и фирменным цветам.',
    '4. Положи логотип и фото клиента в папку assets/images (имена латиницей) и подставь в галерею.',
    '5. Проверь вёрстку на телефоне и компьютере, форму заявок и тексты на ошибки, затем соберь и выложи сайт.',
    'Если чего-то не хватает, оставь заметный комментарий и перечисли недостающее в конце.');
  return lines.join('\n');
}

async function finish(env, chat, st) {
  const photos = (await listPhotos(env, chat, st.sid)).slice(0, MAX_PHOTOS);
  const id = st.sid.toString(36) + String(chat).slice(-4);
  const who = { ...st.from, chat };
  const md = renderBrief(st.a, photos, who, id);
  const record = { id, at: new Date().toISOString(), who, answers: st.a, photos };
  await env.BRIEFS.put(`brief:${id}`, JSON.stringify(record), { expirationTtl: TTL_BRIEF, metadata: { c: clip(st.a.company || '', 60), f: clip(st.a.field || '', 40), t: Date.now() } });
  await env.BRIEFS.delete(`st:${chat}`);

  await say(env, chat, 'Спасибо! Анкета отправлена. Мастер посмотрит её и напишет вам прямо здесь, в этом чате, с ценой и сроками, обычно в тот же день. Можно писать сюда дополнения, я всё передам.');

  const owner = env.CHAT_ID;
  const head = `<b>Новая анкета на сайт</b>\nКомпания: <b>${esc(st.a.company)}</b>\nСфера: ${esc(st.a.field)}\nГород: ${esc(st.a.city)}\nКлиент: ${who.user ? '@' + esc(who.user) : esc(who.name || 'без ника')}\nФото: ${photos.length}\nНомер: <code>${id}</code>\n\n<i>Чтобы написать клиенту (цена, сроки), ответьте на это сообщение функцией «Ответить», бот перешлёт.</i>`;
  await mapOwner(env, await tg(env, 'sendMessage', { chat_id: owner, text: head, parse_mode: 'HTML' }), chat);

  const form = new FormData();
  form.append('chat_id', String(owner));
  form.append('caption', `Анкета ${id}`);
  form.append('document', new Blob([md], { type: 'text/markdown' }), `brief_${id}.md`);
  try { await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: 'POST', body: form }); } catch { /* ничего */ }

  for (let i = 0; i < photos.length; i += 10) {
    const chunk = photos.slice(i, i + 10);
    if (chunk.length === 1) await tg(env, 'sendDocument', { chat_id: owner, document: chunk[0].f, caption: chunk[0].k === 'logo' ? 'Логотип' : '' });
    else await tg(env, 'sendMediaGroup', { chat_id: owner, media: chunk.map((p, j) => ({ type: 'document', media: p.f, caption: i === 0 && j === 0 ? 'Фото клиента' : undefined })) });
  }
}

async function advance(env, chat, st) {
  const cur = STEPS[st.i];
  if (cur && cur.gate && /^решайте/i.test(st.a[cur.k] || '')) return finish(env, chat, st);
  st.i += 1;
  while (st.i < STEPS.length && STEPS[st.i].when && !STEPS[st.i].when(st.a)) st.i += 1;
  if (st.i >= STEPS.length) return finish(env, chat, st);
  await putState(env, chat, st);
  return ask(env, chat, st.i);
}

async function onMessage(env, msg) {
  if (!msg || !msg.chat || msg.chat.type !== 'private') return;
  const chat = msg.chat.id;
  const text = clip(msg.text || msg.caption || '', 1500);

  // владелец отвечает (Reply) на сообщение клиента -> пересылаем клиенту
  if (String(chat) === String(env.CHAT_ID) && msg.reply_to_message) {
    const client = await env.BRIEFS.get(`own:${msg.reply_to_message.message_id}`);
    if (client) {
      const r = await tg(env, 'copyMessage', { chat_id: client, from_chat_id: chat, message_id: msg.message_id });
      return tg(env, 'setMessageReaction', { chat_id: chat, message_id: msg.message_id, reaction: [{ type: 'emoji', emoji: r.ok ? '👍' : '👎' }] });
    }
  }

  if (/^\/start\b/i.test(text)) return startBrief(env, msg);
  if (/^\/cancel\b/i.test(text)) {
    await env.BRIEFS.delete(`st:${chat}`);
    return say(env, chat, 'Анкета отменена. Чтобы начать заново, напишите /start.');
  }
  if (/^\/help\b/i.test(text)) {
    return say(env, chat, 'Я задаю вопросы о вашей компании и собираю анкету для создания сайта. /start начать, /cancel отменить.');
  }

  const st = await getState(env, chat);
  if (!st) {
    // нет активной анкеты: это сообщение мастеру, передаём владельцу
    if (String(chat) === String(env.CHAT_ID)) return say(env, chat, 'Чтобы пройти анкету как клиент, нажмите /start.');
    const who = (msg.from?.username ? '@' + msg.from.username : msg.from?.first_name || 'клиент');
    const head = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: `<b>Сообщение от ${esc(who)}</b>\n<i>Ответьте на него, и бот перешлёт клиенту.</i>`, parse_mode: 'HTML' });
    await mapOwner(env, head, chat);
    const c = await tg(env, 'copyMessage', { chat_id: env.CHAT_ID, from_chat_id: chat, message_id: msg.message_id });
    await mapOwner(env, c, chat);
    return say(env, chat, 'Передал мастеру, он ответит здесь. Если хотите заказать сайт, нажмите /start.');
  }
  const step = STEPS[st.i];

  // фото принимаем на любом шаге
  const doc = msg.document && /^image\//.test(msg.document.mime_type || '') ? msg.document : null;
  if (msg.photo || doc) {
    const f = doc ? doc.file_id : msg.photo[msg.photo.length - 1].file_id;
    const logo = /лого|logo/i.test(text);
    await env.BRIEFS.put(`ph:${chat}:${st.sid}:${String(msg.message_id).padStart(10, '0')}`, '1', {
      expirationTtl: TTL_STATE, metadata: { f, k: logo ? 'logo' : 'work', c: clip(text, 100) }
    });
    // тихая реакция вместо ответа на каждое фото (чтобы не засорять чат при альбомах)
    await tg(env, 'setMessageReaction', { chat_id: chat, message_id: msg.message_id, reaction: [{ type: 'emoji', emoji: '👍' }] });
    return;
  }

  if (!text) return say(env, chat, 'Я понимаю только текст и фото. Ответьте, пожалуйста, текстом.', keysFor(step));

  if (step.photos) {
    if (/^(готово|пропустить)$/i.test(text)) return advance(env, chat, st);
    return say(env, chat, 'Пришлите фото или нажмите «Готово» (или «Пропустить»).', keysFor(step));
  }
  if (step.skip && /^пропустить$/i.test(text)) { st.a[step.k] = ''; return advance(env, chat, st); }
  if (text.length < 2) return say(env, chat, 'Ответ слишком короткий, напишите чуть подробнее.', keysFor(step));
  st.a[step.k] = clip(text, 1500);
  return advance(env, chat, st);
}

/* ---------- служебные адреса ---------- */
async function admin(req, env, url) {
  if (!safeEq(req.headers.get('X-Admin-Key'), env.ADMIN_KEY)) return json({ ok: false, error: 'auth' }, 401);
  const p = url.pathname.split('/').filter(Boolean); // ['admin', ...]
  if (p[1] === 'briefs') {
    const r = await env.BRIEFS.list({ prefix: 'brief:' });
    return json({ ok: true, briefs: r.keys.map((k) => ({ id: k.name.slice(6), ...(k.metadata || {}) })) });
  }
  if (p[1] === 'brief' && p[2]) {
    const raw = await env.BRIEFS.get(`brief:${p[2]}`);
    if (!raw) return json({ ok: false, error: 'not found' }, 404);
    const rec = JSON.parse(raw);
    rec.markdown = renderBrief(rec.answers, rec.photos, rec.who, rec.id);
    return json({ ok: true, brief: rec });
  }
  if (p[1] === 'file' && p[2] && p[3] !== undefined) {
    const raw = await env.BRIEFS.get(`brief:${p[2]}`);
    const ph = raw ? JSON.parse(raw).photos[Number(p[3])] : null;
    if (!ph) return json({ ok: false, error: 'not found' }, 404);
    const info = await tg(env, 'getFile', { file_id: ph.f });
    if (!info.ok) return json({ ok: false, error: 'telegram' }, 502);
    const file = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${info.result.file_path}`);
    return new Response(file.body, { status: file.status, headers: { 'Content-Type': file.headers.get('Content-Type') || 'application/octet-stream', 'X-File-Path': info.result.file_path, 'Cache-Control': 'no-store' } });
  }
  return json({ ok: false, error: 'not found' }, 404);
}

/* ---------- форма заявок с сайта ---------- */
const MAX = { contact: 80, name: 60, message: 800, plan: 160, page: 200 };

async function lead(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const okOrigin = !allowed.length || allowed.includes(origin);
  const cors = {
    'Access-Control-Allow-Origin': okOrigin && origin ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
  if (!okOrigin) return json({ ok: false, error: 'origin' }, 403, cors);
  if (!env.BOT_TOKEN || !env.CHAT_ID) return json({ ok: false, error: 'not configured' }, 500, cors);

  let data;
  try { data = await req.json(); } catch { return json({ ok: false, error: 'json' }, 400, cors); }
  if (!data || typeof data !== 'object') return json({ ok: false, error: 'json' }, 400, cors);

  const contact = clip(data.contact, MAX.contact), name = clip(data.name, MAX.name), message = clip(data.message, MAX.message);
  const plan = clip(data.plan, MAX.plan), page = clip(data.page, MAX.page);
  if (contact.length < 4) return json({ ok: false, error: 'contact' }, 422, cors);

  const lines = ['<b>Новая заявка с сайта</b>'];
  if (plan) lines.push('Выбор: ' + esc(plan));
  lines.push('Контакт: <b>' + esc(contact) + '</b>');
  if (name) lines.push('Имя: ' + esc(name));
  if (message) lines.push('Задача:\n' + esc(message));
  if (page) lines.push('Страница: ' + esc(page));
  const r = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true });
  return r.ok ? json({ ok: true, error: '' }, 200, cors) : json({ ok: false, error: 'telegram' }, 502, cors);
}

/* ---------- вход ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname === '/tg') {
      if (req.method !== 'POST' || !safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token'), env.WEBHOOK_SECRET)) return new Response('forbidden', { status: 403 });
      let update;
      try { update = await req.json(); } catch { return new Response('bad', { status: 400 }); }
      const job = onMessage(env, update.message).catch(() => {});
      if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
      return new Response('ok');
    }

    if (url.pathname.startsWith('/admin/')) return admin(req, env, url);

    return lead(req, env);
  }
};
