#!/bin/bash

# Setup Automatic Twitter Token Refresh
# Runs every 1 hour 45 minutes to keep tokens fresh

set -e

echo "=========================================="
echo "🔄 Setup Twitter Token Auto-Refresh"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Make sure refresh script is executable
chmod +x refresh-twitter-token.sh

echo "📋 This will set up automatic token refresh"
echo "   Frequency: Every 1 hour 45 minutes"
echo "   Method: Cron job"
echo "   Log file: /tmp/twitter-token-refresh.log"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

# Cron schedule: Every 1 hour 45 minutes (every 105 minutes)
# Run at minute 0 and minute 45 past every other hour
CRON_JOB="0,45 */2 * * * cd $SCRIPT_DIR && ./refresh-twitter-token.sh >> /tmp/twitter-token-refresh.log 2>&1"

# Alternative: Run every 105 minutes (more complex but precise)
# CRON_JOB="*/105 * * * * cd $SCRIPT_DIR && ./refresh-twitter-token.sh >> /tmp/twitter-token-refresh.log 2>&1"

echo ""
echo "📅 Cron Schedule: 0,45 */2 * * *"
echo "   Translation: Minute 0 and 45, every 2 hours"
echo "   Examples:"
echo "   - 12:00 AM, 12:45 AM"
echo "   - 2:00 AM, 2:45 AM"
echo "   - 4:00 AM, 4:45 AM"
echo "   - etc."
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "refresh-twitter-token.sh"; then
    echo "⚠️  Existing token refresh cron job found"
    read -p "Replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Remove old cron job
    crontab -l 2>/dev/null | grep -v "refresh-twitter-token.sh" | crontab -
    echo "✅ Old cron job removed"
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "=========================================="
echo "✅ Token Auto-Refresh Installed!"
echo "=========================================="
echo ""
echo "📅 Schedule: Every 1 hour 45 minutes"
echo "📂 Script: $SCRIPT_DIR/refresh-twitter-token.sh"
echo "📝 Log file: /tmp/twitter-token-refresh.log"
echo ""
echo "🔍 Useful Commands:"
echo ""
echo "  # View current cron jobs"
echo "  crontab -l"
echo ""
echo "  # View refresh logs"
echo "  tail -f /tmp/twitter-token-refresh.log"
echo ""
echo "  # Test the script manually"
echo "  ./refresh-twitter-token.sh"
echo ""
echo "  # Remove automatic refresh"
echo "  crontab -l | grep -v refresh-twitter-token.sh | crontab -"
echo ""
echo "=========================================="
echo "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "Note: The auto-refresh is a backup. Token already"
echo "refreshes automatically when you make API calls!"
echo ""

