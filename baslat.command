#!/bin/bash
# ============================================================
#  Fiyat Teklifi - macOS baslatici
#  Ilk kullanimda terminalde: chmod +x baslat.command
#  Sonra dosyaya cift tiklamak yeterli.
# ============================================================
cd "$(dirname "$0")" || exit 1
PORT=8787
URL="http://localhost:$PORT/"

if command -v node >/dev/null 2>&1; then
  ( sleep 1; open "$URL" ) &
  node server.js
else
  echo ""
  echo "  UYARI: Node.js bulunamadi."
  echo "  Teklifler storage.json yerine yalnizca tarayici bellegine kaydedilecek."
  echo "  Kalici dosya kaydi icin: https://nodejs.org"
  echo ""
  if command -v python3 >/dev/null 2>&1; then
    ( sleep 1; open "$URL" ) &
    python3 -m http.server "$PORT"
  else
    open index.html
  fi
fi
