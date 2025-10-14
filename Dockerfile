# Use Node.js LTS version with Debian base for better Puppeteer support
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install dependencies required for Puppeteer/Chrome
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
    xdg-utils \
    ca-certificates \
    wget \
    unzip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production
# RUN if [ -f linkedin_profile.zip ]; then unzip -o linkedin_profile.zip -d .; fi

# Copy application files
COPY bot.js ./
COPY server.js ./
COPY youtube_bot.js ./

# Create directories for browser profiles
RUN mkdir -p /app/linkedin_profile /app/youtube_profile /app/tiktok_profile && \
    chmod -R 777 /app/linkedin_profile /app/youtube_profile /app/tiktok_profile


# Expose the port the app runs on
EXPOSE 3000

# Set environment variables defaults (will be overridden by .env or docker-compose)
ENV PORT=3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "server.js"]

