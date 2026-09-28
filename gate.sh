#!/usr/bin/env bash
# Шлюз перед сдачей (landing-quality D5).
# Черновик (есть noindex) — незакрытые данные разрешены, но перечисляются.
# Боевой режим (noindex снят) — любая находка валит публикацию.
cd "$(dirname "$0")"
SRC="index.html privacy.html css js"
fail=0; warn=0
draft=0; grep -q 'name="robots" content="noindex' index.html && draft=1

report() { # $1 — заголовок, дальше вывод grep
  local title=$1; shift
  local out; out=$("$@" 2>/dev/null) || return 0
  [ -z "$out" ] && return 0
  echo "── $title"; echo "$out"
  if [ $draft -eq 1 ]; then warn=1; else fail=1; fi
}

report "незакрытые данные (data-pending)" grep -rn 'data-pending="' $SRC --include=*.html --include=*.js
report "dev-режим не снят" grep -rn 'data-env="dev"' index.html privacy.html
report "форма не подключена (ENDPOINT = null)" grep -n 'const ENDPOINT = null' js/form.js
# атрибут placeholder у полей — вёрстка, а не заглушка, поэтому слова placeholder в списке нет
if grep -rniE 'lorem|\+7 000|000-00-00|уточня|заглушк|TODO|example\.com' $SRC; then
  echo "НЕ СДАВАТЬ: плейсхолдеры в разметке"; fail=1
fi
if grep -n 'style="' index.html privacy.html; then
  echo "НЕ СДАВАТЬ: инлайновые стили (правило проекта — css/ отдельно)"; fail=1
fi
[ "$(grep -c '<h1' index.html)" -eq 1 ] || { echo "НЕ СДАВАТЬ: h1 должен быть один"; fail=1; }

if [ $fail -ne 0 ]; then echo "── шлюз НЕ пройден"; exit 1; fi
if [ $warn -ne 0 ]; then echo "── черновик: публиковать можно только с noindex, до боевого запуска закрыть PENDING.md"; exit 0; fi
echo "── шлюз пройден"
