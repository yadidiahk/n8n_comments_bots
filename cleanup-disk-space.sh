#!/bin/bash

# Disk Space Cleanup Script for Lead Gen Bot
# Run this when disk space gets low or as a cron job

set -e

echo "=========================================="
echo "🧹 Disk Space Cleanup Script"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Show current disk usage
echo "📊 Current Disk Usage:"
df -h | grep -E "Filesystem|/$"
echo ""

# Function to get directory size
get_dir_size() {
    if [ -d "$1" ]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "N/A"
    fi
}

echo "📁 Current Profile Sizes:"
echo "  linkedin_profile:  $(get_dir_size linkedin_profile)"
echo "  twitter_profile:   $(get_dir_size twitter_profile)"
echo "  reddit_profile:    $(get_dir_size reddit_profile)"
echo "  tiktok_profile:    $(get_dir_size tiktok_profile)"
echo "  youtube_profile:   $(get_dir_size youtube_profile)"
echo ""

# Stop containers first
echo "🛑 Stopping Docker containers..."
docker-compose down 2>/dev/null || true
echo ""

# Clean Docker resources
echo "🐳 Cleaning Docker resources..."
echo "  - Removing unused containers, images, networks..."
docker system prune -a --volumes -f
echo "  ✅ Docker cleanup complete"
echo ""

# Clean browser profile caches
echo "🌐 Cleaning browser profile caches..."

clean_profile() {
    local profile=$1
    if [ -d "$profile" ]; then
        echo "  Cleaning $profile..."
        
        # Remove log files
        find "$profile" -type f -name "*.log" -delete 2>/dev/null || true
        
        # Clean cache directories
        rm -rf "$profile/Default/Cache/"* 2>/dev/null || true
        rm -rf "$profile/Default/Code Cache/"* 2>/dev/null || true
        rm -rf "$profile/Default/GPUCache/"* 2>/dev/null || true
        rm -rf "$profile/ShaderCache/"* 2>/dev/null || true
        rm -rf "$profile/GPUCache/"* 2>/dev/null || true
        rm -rf "$profile/GraphiteDawnCache/"* 2>/dev/null || true
        rm -rf "$profile/GrShaderCache/"* 2>/dev/null || true
        
        # Remove crash reports
        rm -rf "$profile/Crash Reports/"* 2>/dev/null || true
        
        # Remove old logs
        find "$profile" -type f -name "chrome_debug.log" -delete 2>/dev/null || true
        
        echo "    ✅ $profile cleaned"
    fi
}

clean_profile "linkedin_profile"
clean_profile "twitter_profile"
clean_profile "reddit_profile"
clean_profile "tiktok_profile"
clean_profile "youtube_profile"

echo ""

# Clean screenshots and temporary files
echo "📸 Cleaning screenshots and temp files..."
rm -f *.png 2>/dev/null || true
rm -f *.jpg 2>/dev/null || true
rm -f *.jpeg 2>/dev/null || true
rm -f *.html 2>/dev/null || true
rm -f *.tmp 2>/dev/null || true
echo "  ✅ Temp files cleaned"
echo ""

# Show space freed
echo "=========================================="
echo "📊 Disk Usage After Cleanup:"
df -h | grep -E "Filesystem|/$"
echo ""

echo "📁 Profile Sizes After Cleanup:"
echo "  linkedin_profile:  $(get_dir_size linkedin_profile)"
echo "  twitter_profile:   $(get_dir_size twitter_profile)"
echo "  reddit_profile:    $(get_dir_size reddit_profile)"
echo "  tiktok_profile:    $(get_dir_size tiktok_profile)"
echo "  youtube_profile:   $(get_dir_size youtube_profile)"
echo ""

echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Check if you have enough space (at least 2GB free)"
echo "  2. Run: ./deploy.sh --rebuild"
echo "  3. Monitor disk usage: df -h"
echo ""
echo "To prevent this issue, consider:"
echo "  - Increasing your GCP VM disk size"
echo "  - Running this script weekly (cron job)"
echo "  - Adding log rotation"
echo ""

