/* Форма заявки -> Cloudflare Worker (worker/) -> Telegram организаторов.
   ENDPOINT = null, пока воркер не развёрнут (PENDING F-01): в dev-режиме
   отправка имитируется, в проде шлюз deploy.sh не пропустит страницу с null.
   ⚠️ Адрес страницы должен быть в ALLOW_ORIGIN воркера, иначе браузер
   получит ошибку CORS (curl её не покажет). */
const ENDPOINT = null;

const CHOICE_LABEL = {
  open: 'Открытая неделя',
  full: 'Полная программа',
  both: 'И то и другое'
};

/* Ник приводим к виду @username; ссылку t.me/… превращаем в ник.
   Номер телефона тоже принимаем: не у всех в Телеграме есть ник. */
export function normalizeTg(raw) {
  let v = String(raw || '').trim();
  const link = v.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/@?([A-Za-z0-9_]+)\/?$/i);
  if (link) v = link[1];
  if (/^[+\d][\d\s()-]*$/.test(v)) {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 ? (v.startsWith('+') ? '+' : '') + digits : null;
  }
  if (!v.startsWith('@')) v = '@' + v;
  return /^@[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v) ? v : null;
}

function readUtm() {
  const p = new URLSearchParams(location.search);
  const out = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v.slice(0, 100);
  });
  return out;
}

export function initForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;

  const btn = form.querySelector('button[type=submit]');
  const note = document.getElementById('formNote');
  const done = document.getElementById('formDone');
  const doneTitle = document.getElementById('doneTitle');
  const NOTE_IDLE = note.textContent;
  const utm = readUtm();

  const setNote = (msg, isErr) => {
    note.textContent = msg;
    note.classList.toggle('is-err', Boolean(isErr));
  };

  const fieldError = (input, msg) => {
    const box = document.getElementById(input.id + '-err');
    if (box) box.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  const checkName = () => fieldError(
    form.name,
    form.name.value.trim() ? '' : 'Напишите, как к вам обращаться'
  );
  const checkTg = () => {
    if (!form.tg.value.trim()) return fieldError(form.tg, 'Оставьте ник в Телеграме');
    const tg = normalizeTg(form.tg.value);
    if (tg) form.tg.value = tg;
    return fieldError(form.tg, tg ? '' : 'Ник вида @username или номер телефона, привязанный к Телеграму');
  };
  const checkConsent = () => fieldError(
    form.consent,
    form.consent.checked ? '' : 'Нужно ваше согласие, чтобы мы могли написать'
  );

  form.name.addEventListener('blur', () => { if (form.name.value) checkName(); });
  form.tg.addEventListener('blur', () => { if (form.tg.value) checkTg(); });
  form.name.addEventListener('input', () => { if (form.name.getAttribute('aria-invalid') === 'true') checkName(); });
  form.tg.addEventListener('input', () => fieldError(form.tg, ''));
  form.consent.addEventListener('change', checkConsent);

  const showDone = (name) => {
    doneTitle.textContent = `Спасибо, ${name}`;
    form.hidden = true;
    done.hidden = false;
    doneTitle.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* honeypot: скрытое поле заполняют только боты — им молчаливый «успех».
       Эвристику «не было фокуса — бот» не ставим: в Safari клик по кнопке
       не даёт фокуса, и живая заявка молча терялась бы. */
    if (form.company.value.trim()) {
      showDone(form.name.value.trim() || 'за заявку');
      return;
    }

    const ok = [checkName(), checkTg(), checkConsent()];
    if (ok.includes(false)) {
      setNote('Заполните, пожалуйста, имя и телеграм', true);
      [form.name, form.tg, form.consent][ok.indexOf(false)].focus();
      return;
    }

    const name = form.name.value.trim();
    const payload = {
      name,
      tg: form.tg.value.trim(),
      choice: CHOICE_LABEL[form.choice.value] || form.choice.value,
      page: location.href.split('#')[0],
      ...utm
    };

    btn.disabled = true;
    btn.textContent = 'Отправляем…';
    setNote('Отправляем заявку…');

    try {
      if (!ENDPOINT) {
        if (document.documentElement.dataset.env !== 'dev') throw new Error('ENDPOINT не задан');
        console.warn('[dev] форма не подключена (PENDING F-01), заявка не ушла:', payload);
      } else {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('воркер ответил ' + res.status);
      }
      if (typeof window.ym === 'function' && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', 'lead');
      form.reset();
      showDone(name);
    } catch (err) {
      console.error('Форма заявки:', err);
      setNote('Не получилось отправить. Проверьте интернет и попробуйте ещё раз через минуту.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Отправить';
      if (!note.classList.contains('is-err')) setNote(NOTE_IDLE);
    }
  });
}
