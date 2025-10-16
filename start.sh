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
echo "=========================================="
echo "🧹 Cleaning up stale Chrome processes and profile locks..."
echo "=========================================="

# Kill all Chrome/Chromium processes aggressively
echo "Killing Chrome/Chromium processes..."
pkill -9 -f chrome || true
pkill -9 -f chromium || true
sleep 2

# Verify all processes are killed
REMAINING=$(pgrep -f "chrome|chromium" | wc -l)
if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️ Warning: $REMAINING Chrome/Chromium processes still running, killing again..."
  pgrep -f "chrome|chromium" | xargs -r kill -9 || true
  sleep 2
else
  echo "✅ All Chrome/Chromium processes terminated"
fi

# Clean lock files for all profile directories
echo "Removing profile lock files..."
for profile_dir in /app/twitter_profile /app/linkedin_profile /app/reddit_profile /app/tiktok_profile /app/youtube_profile; do
  if [ -d "$profile_dir" ]; then
    echo "Cleaning $profile_dir..."
    rm -f "$profile_dir"/SingletonLock "$profile_dir"/SingletonSocket "$profile_dir"/SingletonCookie 2>/dev/null || true
    rm -f "$profile_dir"/Default/SingletonLock "$profile_dir"/Default/SingletonSocket "$profile_dir"/Default/SingletonCookie 2>/dev/null || true
    
    # Also remove any orphaned lock files in subdirectories
    find "$profile_dir" -type f -name "SingletonLock" -delete 2>/dev/null || true
    find "$profile_dir" -type f -name "SingletonSocket" -delete 2>/dev/null || true
    find "$profile_dir" -type f -name "SingletonCookie" -delete 2>/dev/null || true
  fi
done

echo "✅ Profile lock cleanup completed"
echo "=========================================="

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
