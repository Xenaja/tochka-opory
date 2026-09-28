// Запуск: node worker/worker.test.mjs
import worker from './telegram-form-worker.js';

const ENV = { ALLOW_ORIGIN: 'https://xenaja.github.io,https://tochka.example.ru', BOT_TOKEN: 't', CHAT_ID: '1' };

let sent = null;
let tgOk = true;
globalThis.fetch = async (url, opts) => {
  sent = JSON.parse(opts.body);
  return { ok: tgOk, status: tgOk ? 200 : 400, text: async () => 'err' };
};
const origErr = console.error;
console.error = () => {};

const req = (origin, body, method = 'POST') => new Request('https://w.dev/', {
  method,
  headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
  ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
});

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : `: ${got} (ждали ${want})`}`);
};

const GH = 'https://xenaja.github.io';

let r = await worker.fetch(req(GH, null, 'OPTIONS'), ENV);
check('preflight github.io', r.headers.get('Access-Control-Allow-Origin'), GH);
check('Vary: Origin', r.headers.get('Vary'), 'Origin');
r = await worker.fetch(req('https://tochka.example.ru', null, 'OPTIONS'), ENV);
check('preflight второго адреса', r.headers.get('Access-Control-Allow-Origin'), 'https://tochka.example.ru');
r = await worker.fetch(req('https://evil.site', null, 'OPTIONS'), ENV);
check('чужой origin не эхом', r.headers.get('Access-Control-Allow-Origin'), GH);
r = await worker.fetch(req(GH, null, 'GET'), ENV);
check('GET -> 405', r.status, 405);

sent = null;
r = await worker.fetch(req(GH, {
  name: 'Мария <b>', tg: '@maria_k', choice: 'Открытая неделя',
  page: 'https://xenaja.github.io/tochka-opory/', utm_source: 'vk',
}), ENV);
check('заявка -> 200', r.status, 200);
check('заголовок сообщения', sent.text.split('\n')[0], '🟤 <b>Заявка — Точка опоры</b>');
check('имя экранировано', sent.text.includes('Мария &lt;b&gt;'), true);
check('ник кликабелен', sent.text.includes('<a href="https://t.me/maria_k">@maria_k</a>'), true);
check('выбор передан', sent.text.includes('<b>Выбор:</b> Открытая неделя'), true);
check('utm передан', sent.text.includes('source=vk'), true);
check('chat_id из секрета', sent.chat_id, '1');

sent = null;
await worker.fetch(req(GH, { name: 'Ира', tg: '+79001234567' }), ENV);
check('телефон не превращается в ссылку', sent.text.includes('<b>Телеграм:</b> +79001234567'), true);

sent = null;
r = await worker.fetch(req(GH, { name: 'бот', tg: '@bot', company: 'spam' }), ENV);
check('honeypot -> 200', r.status, 200);
check('honeypot не шлёт в Telegram', sent, null);

r = await worker.fetch(req(GH, { name: '', tg: '' }), ENV);
check('пустые поля -> 422', r.status, 422);
r = await worker.fetch(req(GH, '{bad'), ENV);
check('битый JSON -> 400', r.status, 400);

tgOk = false;
r = await worker.fetch(req(GH, { name: 'Оля', tg: '@olya_p' }), ENV);
check('ошибка Telegram -> 502', r.status, 502);

console.error = origErr;
console.log(`\n${pass} ок, ${fail} ошибок`);
process.exit(fail ? 1 : 0);
