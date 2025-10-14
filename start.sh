#!/usr/bin/env bash
set -e

PORT=${PORT:-3000}
VNC_PORT=5900
NOVNC_PORT=6080
XVFB_DISPLAY=:99
SCREEN_WIDTH=${SCREEN_WIDTH:-1280}
SCREEN_HEIGHT=${SCREEN_HEIGHT:-800}
DEPTH=${DEPTH:-24}
NO_VNC_HOME=${NO_VNC_HOME:-/opt/noVNC}

echo "=========================================="
echo "Starting headful environment for Puppeteer"
echo "=========================================="
echo "Display:        ${XVFB_DISPLAY}"
echo "Resolution:     ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${DEPTH}"
echo "noVNC Port:     ${NOVNC_PORT}"
echo "App Port:       ${PORT}"
echo "------------------------------------------"

Xvfb ${XVFB_DISPLAY} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${DEPTH} &
sleep 1

fluxbox >/dev/null 2>&1 &
sleep 1

x11vnc -display ${XVFB_DISPLAY} -nopw -forever -shared -rfbport ${VNC_PORT} >/dev/null 2>&1 &
sleep 1

# Run noVNC on a separate port (6080)
python3 ${NO_VNC_HOME}/utils/websockify/run --web ${NO_VNC_HOME} ${NOVNC_PORT} 127.0.0.1:${VNC_PORT} >/dev/null 2>&1 &
sleep 2

echo "✅ noVNC running at: http://localhost:${NOVNC_PORT}/vnc.html"
echo "------------------------------------------"

node server.js &

# Keep the container alive
tail -f /dev/null
