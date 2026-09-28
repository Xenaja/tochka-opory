/* Настройки сайта. Меняются здесь — вёрстку трогать не нужно.
   Значения по умолчанию = утверждённый вид макета. */
window.SITE_CONFIG = {
  bgTone: 'dusty-rose',        // 'dusty-rose' — пыльно-розовый | 'milk' — молочный (прежний)
  headingFont: 'Tenor Sans',   // 'Tenor Sans' | 'Prata' | 'Yeseva One' | 'Alice' | 'Cormorant'
  headingCaps: true,           // заголовки капсом + разрядка .04em
  headingBold: true,           // лёгкое уплотнение заголовков (у Tenor Sans одно начертание)
  handNotes: true,             // рукописные заметки Caveat
  breath: true,                // анимация дыхательного круга (false — статичный круг и подпись «точка опоры»)
  breathTempo: '4-6'           // '4-6' — 10 с, вдох 40% | '4-4' — 8 с, вдох 50%
};

/* Применение настроек. Скрипт синхронный и стоит до стилей, чтобы страница не мигала. */
(function (cfg) {
  // [css-стек, вес, стиль акцентных слов, коэффициент кегля, параметры Google Fonts]
  var FONTS = {
    'Tenor Sans': ["'Tenor Sans', sans-serif", 400, 'normal', .76, 'Tenor+Sans'],
    'Prata': ["'Prata', serif", 400, 'normal', .8, 'Prata'],
    'Yeseva One': ["'Yeseva One', serif", 400, 'normal', .78, 'Yeseva+One'],
    'Alice': ["'Alice', serif", 400, 'normal', .86, 'Alice'],
    'Cormorant': ["'Cormorant', serif", 500, 'italic', 1, 'Cormorant:ital,wght@0,500;1,500']
  };
  var f = FONTS[cfg.headingFont] || FONTS['Tenor Sans'];
  var root = document.documentElement;
  var s = root.style;

  s.setProperty('--hf', f[0]);
  s.setProperty('--hw', f[1]);
  s.setProperty('--hi', f[2]);
  s.setProperty('--hz', String(f[3] * (cfg.headingCaps ? .9 : 1)));
  s.setProperty('--ht', cfg.headingCaps ? 'uppercase' : 'none');
  s.setProperty('--hl', cfg.headingCaps ? '.04em' : 'normal');
  s.setProperty('--hs', cfg.headingBold ? '.014em' : '0');

  if (cfg.bgTone === 'milk') root.setAttribute('data-tone', 'milk');
  if (!cfg.handNotes) root.classList.add('no-notes');
  if (!cfg.breath) root.classList.add('no-breath');
  root.setAttribute('data-tempo', cfg.breathTempo === '4-4' ? '4-4' : '4-6');

  // подключаем только выбранный шрифт заголовков
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + f[4] + '&display=swap';
  document.head.appendChild(link);
})(window.SITE_CONFIG);
