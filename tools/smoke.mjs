// Дымовой тест страницы в настоящем Chrome (DevTools Protocol).
// Нужен запущенный сервер: python -m http.server 8765 --bind 127.0.0.1
// Запуск: node tools/smoke.mjs [url]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'smoke-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) { console.error('Chrome не поднялся'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval error');
  return r.result.result.value;
};

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : `: ${JSON.stringify(got)} (ждали ${JSON.stringify(want)})`}`);
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

const open = async (width) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
  await send('Page.navigate', { url: URL_ });
  await sleep(2500);
};

for (const w of [375, 768, 1024, 1440]) {
  await open(w);
  check(`${w}: нет горизонтального скролла`, await js('return document.documentElement.scrollWidth <= innerWidth'), true);
}

await open(375);
check('один h1', await js('return document.querySelectorAll("h1").length'), 1);
check('навигация скрыта на 375', await js('return getComputedStyle(document.querySelector(".nav-links")).display'), 'none');
check('ответы FAQ: открыт только первый', await js('return [...document.querySelectorAll(".faq-a")].map(p => !p.hidden)'), [true, false, false, false, false, false, false]);
await js('document.querySelectorAll(".faq-q")[2].click()');
check('FAQ: клик открывает третий и закрывает первый', await js('return [...document.querySelectorAll(".faq-a")].map(p => !p.hidden)'), [false, false, true, false, false, false, false]);
await js('document.querySelectorAll(".faq-q")[2].click()');
check('FAQ: повторный клик закрывает', await js('return [...document.querySelectorAll(".faq-a")].filter(p => !p.hidden).length'), 0);

check('био свёрнуты', await js('return [...document.querySelectorAll(".host-more")].map(p => p.hidden)'), [true, true, true]);
await js('document.querySelector(".host .text-btn").click()');
check('био: раскрылось и кнопка «Свернуть»', await js('const b=document.querySelector(".host .text-btn"); return [!document.getElementById("bio-k").hidden, b.textContent, b.getAttribute("aria-expanded")]'), [true, 'Свернуть', 'true']);

check('чек-лист: ответ скрыт', await js('return document.getElementById("whoAnswer").hidden'), true);
await js('document.querySelectorAll(".chk")[0].click()');
check('чек-лист: 1 пункт', await js('return document.getElementById("whoMsg").textContent'), 'Даже одного пункта достаточно, чтобы прийти посмотреть.');
await js('document.querySelectorAll(".chk")[3].click()');
check('чек-лист: 2 пункта', await js('return document.getElementById("whoMsg").textContent'), 'Вы узнали себя в 2 из 5. Кажется, лаборатория – для вас.');
await js('document.querySelectorAll(".chk").forEach(b => b.getAttribute("aria-pressed")==="false" && b.click())');
check('чек-лист: все пять', await js('return document.getElementById("whoMsg").textContent'), 'Все пять. Мы очень вас ждём.');

check('по умолчанию выбрана полная программа', await js('return document.querySelector("#leadForm").choice.value'), 'full');
await js('document.querySelector("a[data-choice=open]").click()');
check('CTA открытой недели выбирает «Открытая неделя»', await js('return document.querySelector("#leadForm").choice.value'), 'open');
await js('document.querySelector(".hero a[data-choice=full]").click()');
check('CTA «Хочу в лабораторию» выбирает полную', await js('return document.querySelector("#leadForm").choice.value'), 'full');

await js('const f=document.getElementById("leadForm"); f.name.focus(); f.requestSubmit()');
check('пустая форма: ошибки полей', await js('const f=document.getElementById("leadForm"); return [f.name.getAttribute("aria-invalid"), f.tg.getAttribute("aria-invalid"), f.consent.getAttribute("aria-invalid"), document.getElementById("formNote").textContent]'),
  ['true', 'true', 'true', 'Заполните, пожалуйста, имя и телеграм']);
await js('const f=document.getElementById("leadForm"); f.name.value="Мария"; f.tg.value="мария"; f.requestSubmit()');
check('кривой ник: ошибка под полем', await js('return document.getElementById("lf-tg-err").textContent.length > 0'), true);
await js('const f=document.getElementById("leadForm"); f.tg.value="t.me/maria_k"; f.consent.click(); f.requestSubmit(); await new Promise(r=>setTimeout(r,300))');
check('отправка: экран успеха', await js('return [document.getElementById("leadForm").hidden, document.getElementById("formDone").hidden, document.getElementById("doneTitle").textContent]'), [true, false, 'Спасибо, Мария']);
check('фокус на заголовке успеха', await js('return document.activeElement.id'), 'doneTitle');

// все картинки и ресурсы на месте
const srcs = await js('return [...new Set([...document.images].flatMap(i => [i.currentSrc || i.src, ...(i.srcset ? i.srcset.split(",").map(s => new URL(s.trim().split(" ")[0], location.href).href) : [])]))]');
const bad = [];
for (const s of srcs) { const r = await fetch(s); if (!r.ok) bad.push(s); }
check(`картинки отдаются (${srcs.length})`, bad, []);
for (const p of ['privacy.html', 'favicon.svg', 'og.jpg', 'robots.txt']) {
  const r = await fetch(new URL(p, URL_));
  check(`${p} отдаётся`, r.status, 200);
}

check('нет ошибок в консоли', errors.filter((e) => !/favicon/.test(e)), []);

ws.close();
chrome.kill();
console.log(`\n${pass} ок, ${fail} ошибок`);
process.exit(fail ? 1 : 0);
