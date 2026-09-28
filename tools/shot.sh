#!/usr/bin/env bash
# Скриншот страницы на заданной ширине: tools/shot.sh <ширина> <высота> <файл.png> [путь]
# Узкие ширины снимаются через iframe: headless Chrome не даёт окно уже ~500px
W=$1; H=$2; OUT=$3; SRC=${4:-/index.html}
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
if [ "$W" -ge 600 ]; then URL="http://127.0.0.1:8765$SRC"; WIN="$W,$H"
else URL="http://127.0.0.1:8765/tools/frame.html?w=$W&h=$H&src=$SRC"; WIN="600,$H"; fi
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=$WIN --screenshot="$(cygpath -w "$OUT")" "$URL" >/dev/null 2>&1
echo "$OUT"
