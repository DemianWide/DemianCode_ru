/**
 * Приём заявок с сайта и пересылка в Telegram. Бесплатно, на Cloudflare Workers.
 * Секреты (Settings → Variables and Secrets) — в коде их нет:
 *   BOT_TOKEN  — токен бота от @BotFather
 *   CHAT_ID    — ваш chat_id
 *   ORIGINS    — адреса сайта через запятую, например https://demianwide.github.io,https://ваш-домен.ru
 */
const MAX = { contact: 80, name: 60, message: 800, plan: 160, page: 200 };

const clean = (v, n) =>
  (typeof v === 'string' ? v : '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, n);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = !allowed.length || allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin && origin ? origin : (allowed[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
    };
    const out = (code, ok, error = '') => new Response(JSON.stringify({ ok, error }), { status: code, headers: cors });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return out(405, false, 'method');
    if (!okOrigin) return out(403, false, 'origin');
    if (!env.BOT_TOKEN || !env.CHAT_ID) return out(500, false, 'not configured');

    let data;
    try { data = await req.json(); } catch { return out(400, false, 'json'); }
    if (!data || typeof data !== 'object') return out(400, false, 'json');

    const contact = clean(data.contact, MAX.contact);
    const name = clean(data.name, MAX.name);
    const message = clean(data.message, MAX.message);
    const plan = clean(data.plan, MAX.plan);
    const page = clean(data.page, MAX.page);
    if (contact.length < 4) return out(422, false, 'contact');

    const lines = ['<b>Новая заявка с сайта</b>'];
    if (plan) lines.push('Выбор: ' + esc(plan));
    lines.push('Контакт: <b>' + esc(contact) + '</b>');
    if (name) lines.push('Имя: ' + esc(name));
    if (message) lines.push('Задача:\n' + esc(message));
    if (page) lines.push('Страница: ' + esc(page));

    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true })
    });
    return r.ok ? out(200, true) : out(502, false, 'telegram');
  }
};
