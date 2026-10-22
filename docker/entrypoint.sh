#!/usr/bin/env bash
set -euo pipefail

mkdir -p /app/data/logs

rm -f /app/data/chrome-profile/Singleton* 2>/dev/null || true

Xvfb :99 -screen 0 1366x900x24 -nolisten tcp &
sleep 1
fluxbox >/dev/null 2>&1 &

if [ -n "${VNC_PASSWORD:-}" ]; then
  x11vnc -storepasswd "$VNC_PASSWORD" /tmp/vncpass >/dev/null
  VNC_AUTH=(-rfbauth /tmp/vncpass)
else
  VNC_AUTH=(-nopw)
fi
x11vnc -display :99 -forever -shared -quiet -rfbport 5900 "${VNC_AUTH[@]}" >/dev/null 2>&1 &
websockify --web /usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &

exec node dist/main.js
