/* Интерактив страницы. Без JS всё читается: био и ответы FAQ раскрыты, форма видна. */
import { initForm } from './form.js';

/* Приветствие над дыхательным кругом — по времени суток посетителя */
function initGreeting() {
  const el = document.getElementById('greeting');
  if (!el) return;
  const h = new Date().getHours();
  el.textContent = h < 5 ? 'Доброй ночи.' : h < 12 ? 'Доброе утро.' : h < 18 ? 'Добрый день.' : 'Добрый вечер.';
}

/* Точка в логотипе растёт по мере прокрутки страницы */
function initLogoDot() {
  const dot = document.getElementById('logoDot');
  if (!dot) return;
  let raf = 0;
  let last = -1;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (Math.abs(p - last) < .01) return;
    last = p;
    dot.style.setProperty('--p', p.toFixed(3));
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  update();
}

/* Чек-лист «Вы узнаете себя, если…» */
function initChecklist() {
  const items = [...document.querySelectorAll('.chk')];
  const box = document.getElementById('whoAnswer');
  const msg = document.getElementById('whoMsg');
  if (!items.length || !box || !msg) return;
  const total = items.length;

  const render = () => {
    const n = items.filter((b) => b.getAttribute('aria-pressed') === 'true').length;
    box.hidden = n === 0;
    msg.textContent = n === total
      ? 'Все пять. Мы очень вас ждём.'
      : n === 1
        ? 'Даже одного пункта достаточно, чтобы прийти посмотреть.'
        : `Вы узнали себя в ${n} из ${total}. Кажется, лаборатория – для вас.`;
  };

  items.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    render();
  }));
}

/* «Подробнее / Свернуть» у ведущих */
function initBios() {
  document.querySelectorAll('.host .text-btn').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Свернуть' : 'Подробнее';
      panel.hidden = !open;
    };
    set(false);
    btn.hidden = false;
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  });
}

/* FAQ: открыт один вопрос за раз, по умолчанию первый */
function initFaq() {
  const qs = [...document.querySelectorAll('.faq-q')];
  const panel = (q) => document.getElementById(q.getAttribute('aria-controls'));
  const open = (target) => qs.forEach((q) => {
    const on = q === target;
    q.setAttribute('aria-expanded', String(on));
    panel(q).hidden = !on;
  });
  open(qs[0]);
  qs.forEach((q) => q.addEventListener('click', () => {
    open(q.getAttribute('aria-expanded') === 'true' ? null : q);
  }));
}

/* Кнопки, ведущие к форме, заранее выбирают вариант: «Полная программа» или «Открытая неделя» */
function initChoiceLinks() {
  document.querySelectorAll('a[data-choice]').forEach((a) => {
    a.addEventListener('click', () => {
      const radio = document.querySelector(`#leadForm input[name="choice"][value="${a.dataset.choice}"]`);
      if (radio) radio.checked = true;
    });
  });
}

initGreeting();
initLogoDot();
initChecklist();
initBios();
initFaq();
initChoiceLinks();
initForm();
