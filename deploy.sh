#!/usr/bin/env bash
# Публикация: тесты -> шлюз -> коммит -> push в GitHub Pages.
# Использование: ./deploy.sh "текст коммита"
set -euo pipefail
cd "$(dirname "$0")"
MSG="${1:-update landing}"

echo "── тесты"
node worker/worker.test.mjs >/dev/null && echo "воркер: ок"
node tests/form.test.mjs >/dev/null && echo "форма: ок"
if curl -s -o /dev/null http://127.0.0.1:8765/index.html; then
  node tools/smoke.mjs >/dev/null && echo "браузер: ок"
else
  echo "браузерный тест пропущен: нет локального сервера (python -m http.server 8765 --bind 127.0.0.1)"
fi

echo "── шлюз"
./gate.sh

git add -A
if git diff --cached --quiet; then
  echo "изменений нет — коммит пропущен"
else
  git commit -m "$MSG"
fi
git push
echo "готово: https://xenaja.github.io/tochka-opory/ (Pages обновится за минуту)"
