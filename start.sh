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

# Clean up any stale Chrome/Chromium processes and locks from previous runs
echo "Cleaning up stale Chrome processes and profile locks..."
pkill -9 chrome || true
pkill -9 chromium || true
rm -f /app/twitter_profile/SingletonLock /app/twitter_profile/SingletonSocket /app/twitter_profile/SingletonCookie 2>/dev/null || true
rm -f /app/twitter_profile/Default/SingletonLock /app/twitter_profile/Default/SingletonSocket /app/twitter_profile/Default/SingletonCookie 2>/dev/null || true
echo "✅ Cleanup completed"

echo "=========================================="
echo "Starting headful environment for Puppeteer"
echo "=========================================="
echo "Display:        ${XVFB_DISPLAY}"
echo "Resolution:     ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${DEPTH}"
echo "noVNC Port:     ${NOVNC_PORT}"
echo "App Port:       ${PORT}"
echo "------------------------------------------"

# Start X virtual framebuffer
Xvfb ${XVFB_DISPLAY} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${DEPTH} &
sleep 2

# Start lightweight window manager
fluxbox >/dev/null 2>&1 &
sleep 2

# Start x11vnc for remote desktop access
x11vnc -display ${XVFB_DISPLAY} -nopw -forever -shared -rfbport ${VNC_PORT} >/dev/null 2>&1 &
sleep 2

# Start noVNC using the correct launcher script
echo "Starting noVNC..."
bash ${NO_VNC_HOME}/utils/websockify/run --web ${NO_VNC_HOME} 0.0.0.0:${NOVNC_PORT} 127.0.0.1:${VNC_PORT} >/var/log/novnc.log 2>&1 &
sleep 5

# Start Node.js API server
echo "Starting Node.js server..."
node /app/server.js &

echo "✅ All services started successfully!"
echo "------------------------------------------"
echo "Access API:   http://localhost:${PORT}/"
echo "Access noVNC: http://localhost:${NOVNC_PORT}/vnc.html"
echo "------------------------------------------"

# Keep the container alive
tail -f /dev/null
