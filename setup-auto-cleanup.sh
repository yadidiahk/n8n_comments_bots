#!/bin/bash

# Setup Automatic Daily Cleanup for Lead Gen Bot
# This script installs a cron job to clean disk space automatically

set -e

echo "=========================================="
echo "🤖 Setup Automatic Cleanup"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Make sure cleanup script is executable
chmod +x cleanup-disk-space.sh

echo "📋 Available Cleanup Schedules:"
echo ""
echo "  1) Every 3 days at 3 AM  (recommended for 30GB+ disk)"
echo "  2) Daily at 3:00 AM      (recommended for 10-20GB disk)"
echo "  3) Daily at 2:00 AM      (earlier cleanup)"
echo "  4) Every 12 hours        (twice daily - aggressive)"
echo "  5) Weekly (Sunday 3 AM)  (for low-usage systems)"
echo "  6) Custom schedule       (you specify)"
echo ""

read -p "Choose option (1-6): " SCHEDULE_CHOICE

case $SCHEDULE_CHOICE in
    1)
        CRON_SCHEDULE="0 3 */3 * *"
        DESCRIPTION="Every 3 days at 3:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    4)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="Every 12 hours"
        ;;
    5)
        CRON_SCHEDULE="0 3 * * 0"
        DESCRIPTION="Weekly on Sunday at 3:00 AM"
        ;;
    6)
        echo ""
        echo "Cron format: MIN HOUR DAY MONTH WEEKDAY"
        echo "Examples:"
        echo "  0 3 * * *     = Daily at 3 AM"
        echo "  0 */6 * * *   = Every 6 hours"
        echo "  30 2 * * 1-5  = 2:30 AM on weekdays"
        echo ""
        read -p "Enter cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom: $CRON_SCHEDULE"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📅 Selected Schedule: $DESCRIPTION"
echo "   Cron: $CRON_SCHEDULE"
echo ""

# Create the cron job entry
CRON_JOB="$CRON_SCHEDULE cd $SCRIPT_DIR && ./cleanup-disk-space.sh >> /tmp/leadgen-cleanup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "cleanup-disk-space.sh"; then
    echo "⚠️  Existing cleanup cron job found"
    read -p "Replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Remove old cron job
    crontab -l 2>/dev/null | grep -v "cleanup-disk-space.sh" | crontab -
    echo "✅ Old cron job removed"
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "=========================================="
echo "✅ Automatic Cleanup Installed!"
echo "=========================================="
echo ""
echo "📅 Schedule: $DESCRIPTION"
echo "📂 Script: $SCRIPT_DIR/cleanup-disk-space.sh"
echo "📝 Log file: /tmp/leadgen-cleanup.log"
echo ""
echo "🔍 Useful Commands:"
echo ""
echo "  # View current cron jobs"
echo "  crontab -l"
echo ""
echo "  # View cleanup logs"
echo "  tail -f /tmp/leadgen-cleanup.log"
echo ""
echo "  # Test the cleanup script now"
echo "  ./cleanup-disk-space.sh"
echo ""
echo "  # Remove automatic cleanup"
echo "  crontab -e  # then delete the line containing 'cleanup-disk-space.sh'"
echo ""
echo "  # Or remove ALL cron jobs (careful!)"
echo "  crontab -r"
echo ""
echo "=========================================="
echo "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "The cleanup will run automatically on schedule."
echo "First run: Check /tmp/leadgen-cleanup.log after the scheduled time."
echo ""

