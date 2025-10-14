#!/usr/bin/env bash
set -e

# === Environment defaults ===
PORT=${PORT:-3000}
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
echo "noVNC Port:     ${PORT}"
echo "------------------------------------------"

# 1️⃣ Start virtual display (Xvfb)
echo "[1/5] Starting Xvfb..."
Xvfb ${XVFB_DISPLAY} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${DEPTH} &
sleep 1

# 2️⃣ Start lightweight window manager
echo "[2/5] Starting Fluxbox..."
fluxbox >/dev/null 2>&1 &
sleep 1

# 3️⃣ Start VNC server (to expose the Xvfb display)
echo "[3/5] Starting x11vnc..."
x11vnc -display ${XVFB_DISPLAY} -nopw -forever -shared -rfbport 5900 >/dev/null 2>&1 &
sleep 1

# 4️⃣ Start noVNC web interface (HTML5 VNC client)
echo "[4/5] Starting noVNC web server..."
python3 ${NO_VNC_HOME}/utils/websockify/run --web ${NO_VNC_HOME} ${PORT} 127.0.0.1:5900 >/dev/null 2>&1 &
sleep 2

echo "✅ noVNC started!"
echo "You can now open your browser at:"
echo "👉  http://<your-render-url>/vnc.html"
echo "------------------------------------------"
echo "When LinkedIn asks for verification, complete it here."
echo "------------------------------------------"

# 5️⃣ Start your Node.js application
echo "[5/5] Starting Node.js application..."
exec node server.js
