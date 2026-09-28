/**
 * Cloudflare Worker: заявка с лендинга «Точка опоры» -> сообщение в Telegram организаторам.
 *
 * Токен бота НЕ хранится в коде и НЕ попадает на сайт — он в секретах воркера.
 *   BOT_TOKEN    — токен бота от @BotFather (секрет)
 *   CHAT_ID      — chat_id чата организаторов (секрет); бот должен быть в этом чате
 *   ALLOW_ORIGIN — разрешённые адреса страницы через запятую (wrangler.toml)
 *
 * Заголовок Access-Control-Allow-Origin принимает ровно один адрес, поэтому origin
 * запроса сверяется со списком и возвращается эхом; чужому уходит первый из списка,
 * и его браузер ответ отклонит.
 */

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOW_ORIGIN || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const reqOrigin = request.headers.get('Origin') || '';
    const origin = allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || '';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: 'bad json' }, 400, cors);
    }

    // honeypot: поле скрыто от людей, заполняют его только боты
    if (data.company) return json({ ok: true }, 200, cors);

    const cut = (v, n) => String(v || '').trim().slice(0, n);
    const name = cut(data.name, 80);
    const tg = cut(data.tg, 64);
    const choice = cut(data.choice, 40);
    const page = cut(data.page, 300);
    const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .filter((k) => data[k])
      .map((k) => `${k.slice(4)}=${cut(data[k], 100)}`)
      .join(', ');

    if (!name || !tg) {
      return json({ ok: false, error: 'name and tg required' }, 422, cors);
    }

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // ник кликабелен прямо из уведомления
    const tgLink = /^@[A-Za-z0-9_]{4,32}$/.test(tg)
      ? `<a href="https://t.me/${tg.slice(1)}">${esc(tg)}</a>`
      : esc(tg);
    const text =
      '🟤 <b>Заявка — Точка опоры</b>\n\n' +
      `<b>Имя:</b> ${esc(name)}\n` +
      `<b>Телеграм:</b> ${tgLink}\n` +
      (choice ? `<b>Выбор:</b> ${esc(choice)}\n` : '') +
      (utm ? `<b>UTM:</b> ${esc(utm)}\n` : '') +
      (page ? `\n<i>${esc(page)}</i>` : '');

    let tgRes;
    try {
      tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
    } catch (err) {
      console.error('telegram fetch failed:', err);
      return json({ ok: false, error: 'telegram unreachable' }, 502, cors);
    }

    if (!tgRes.ok) {
      console.error('telegram error:', tgRes.status, await tgRes.text().catch(() => ''));
      return json({ ok: false, error: 'telegram failed' }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
