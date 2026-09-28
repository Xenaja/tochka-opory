# Точка опоры — лендинг

Одностраничник онлайн-лаборатории внутренней устойчивости «Точка опоры»: 5 недель, фокус-группа до 12 человек,
открытая неделя 13–19.10.2026 (донейшн от 300 ₽), полная программа 20.10–23.11.2026 (4 900 ₽).
Ведущие: Ксения Телегина, Наталья Кравченко, Валентина Данилова. Цель страницы — заявка через форму.

- Репозиторий: `github.com/Xenaja/tochka-opory`, GitHub Pages из `main`.
- Адрес: https://xenaja.github.io/tochka-opory/ (черновик, `noindex`, пока не закрыт PENDING).
- Макет: `design_handoff_tochka_opory/` (в git не идёт). Утверждён и заморожен — отступления только через `DECISIONS.md`.
- Недостающие данные: `PENDING.md`. Процесс: скилл landing-quality.

## Структура
```
index.html        вся разметка и ВСЕ тексты страницы (правка текста = правка здесь)
privacy.html      политика конфиденциальности
css/tokens.css    цвета и параметры шрифта заголовков (из макета, не менять молча)
css/base.css      сброс, типографика, кнопки, dev-маркировка data-pending
css/sections.css  секции сверху вниз
css/doc.css       текстовые страницы
js/config.js      НАСТРОЙКИ САЙТА: шрифт заголовков, капс, уплотнение, заметки, дыхание, темп
js/main.js        интерактив: приветствие, точка в логотипе, чек-лист, био, FAQ, выбор в форме
js/form.js        форма -> воркер; ENDPOINT
worker/           Cloudflare Worker: заявка -> Telegram (+ тесты)
tests/            тест нормализации ника
tools/            smoke.mjs (браузерный тест), shot.sh (скриншоты), og.html (исходник og.jpg)
img/              WebP 1x/2x, исходники PNG — в папке хэндофа
```
Правило проекта: стили и скрипты отдельными файлами, инлайновых `style=""` нет (шлюз проверяет).

## Команды
- Локально: `python -m http.server 8765 --bind 127.0.0.1` → http://127.0.0.1:8765/
- Тесты: `node worker/worker.test.mjs`, `node tests/form.test.mjs`, `node tools/smoke.mjs` (нужен сервер)
- Шлюз: `./gate.sh` — в черновике перечисляет незакрытое, без `noindex` валит публикацию
- Публикация: `./deploy.sh "что поменяли"` — тесты, шлюз, коммит, push

## Подключение формы (PENDING F-01)
1. Организаторы создают бота у @BotFather, добавляют его в свой чат, присылают токен.
2. chat_id: написать в чат, открыть `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. `cd worker && npx wrangler deploy && npx wrangler secret put BOT_TOKEN && npx wrangler secret put CHAT_ID`
4. Адрес воркера — в `js/form.js` → `ENDPOINT`. Свой домен страницы — дописать в `ALLOW_ORIGIN`
   (`worker/wrangler.toml`) и снова `npx wrangler deploy`, иначе браузер упрётся в CORS (curl его не покажет).
5. Проверить заявкой с живой страницы, что сообщение дошло.

## Боевой запуск
Когда F-01 и L-01 закрыты: убрать `data-env="dev"` в обоих html, `data-pending` с закрытых элементов,
`noindex` в `index.html`; при своём домене — заменить `xenaja.github.io/tochka-opory` в canonical/og/robots/sitemap
и положить `CNAME`. Затем `./deploy.sh`.
