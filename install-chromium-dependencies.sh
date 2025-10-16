#!/bin/bash

# Install Chromium dependencies on Ubuntu/Debian GCP VM
echo "Installing Chromium and required system dependencies..."

sudo apt-get update

sudo apt-get install -y \
    chromium-browser \
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
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libgconf-2-4 \
    xdg-utils \
    wget \
    --no-install-recommends

echo "✓ Chromium dependencies installed!"
echo ""
echo "Now run: npm install"


