# Use Node.js LTS version with Debian base for better Puppeteer support
FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# --- Install system dependencies for Chrome, VNC, and Xvfb ---
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    ca-certificates \
    wget \
    unzip \
    xvfb \
    x11vnc \
    fluxbox \
    python3 \
    python3-pip \
    git \
    net-tools \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# --- Install noVNC and websockify for browser-based remote access ---
RUN pip3 install --break-system-packages websockify==0.10.0
RUN git clone https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone https://github.com/novnc/websockify /opt/noVNC/utils/websockify

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium

# Environment for Xvfb
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=800
ENV DEPTH=24
ENV NO_VNC_HOME=/opt/noVNC

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directories for browser profiles
RUN mkdir -p /app/linkedin_profile /app/youtube_profile /app/tiktok_profile && \
    chmod -R 777 /app/linkedin_profile /app/youtube_profile /app/tiktok_profile

# Copy and enable start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose the port Render will assign (noVNC will serve on this)
EXPOSE 3000 6080
ENV PORT=3000
ENV NODE_ENV=production

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start script will handle Xvfb + noVNC + Node app
CMD ["/start.sh"]
