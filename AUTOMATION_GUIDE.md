# 🤖 Automation Guide - Daily Cleanup

## ⚡ Quick Setup (Easiest Way)

```bash
# SSH into your GCP VM
gcloud compute ssh your-vm-name

# Navigate to project
cd /path/to/your/project

# Run the auto-setup script
chmod +x setup-auto-cleanup.sh
./setup-auto-cleanup.sh

# Follow the prompts and choose your schedule
```

That's it! The cleanup will run automatically on your chosen schedule.

---

## 📅 Recommended Schedules

| Disk Size | Schedule | Cron Expression | Best For |
|-----------|----------|-----------------|----------|
| **30GB+** | Every 3 days at 3 AM | `0 3 */3 * *` | **Recommended for larger disks** |
| **20-30GB** | Daily at 3 AM | `0 3 * * *` | Medium disk size |
| **10-20GB** | Every 12 hours | `0 */12 * * *` | Smaller disks, active usage |
| **Testing/Dev** | Weekly (Sunday) | `0 3 * * 0` | Sufficient for low usage |

---

## 🛠️ Manual Setup (Alternative Method)

If you prefer to set it up manually:

```bash
# 1. Edit crontab
crontab -e

# 2. Add one of these lines based on your disk size:

# For 30GB+ disk: Every 3 days at 3 AM (RECOMMENDED)
0 3 */3 * * cd /path/to/your/project && ./cleanup-disk-space.sh >> /tmp/leadgen-cleanup.log 2>&1

# For 20-30GB disk: Daily at 3 AM
0 3 * * * cd /path/to/your/project && ./cleanup-disk-space.sh >> /tmp/leadgen-cleanup.log 2>&1

# For 10-20GB disk: Every 12 hours
0 */12 * * * cd /path/to/your/project && ./cleanup-disk-space.sh >> /tmp/leadgen-cleanup.log 2>&1

# 3. Save and exit (Ctrl+X, then Y, then Enter in nano)
```

### Understanding the Cron Format

```
MIN  HOUR  DAY  MONTH  WEEKDAY  COMMAND
│    │     │    │      │        │
│    │     │    │      │        └─ Command to run
│    │     │    │      └────────── Day of week (0-7, Sun=0 or 7)
│    │     │    └───────────────── Month (1-12)
│    │     └────────────────────── Day of month (1-31)
│    └──────────────────────────── Hour (0-23)
└───────────────────────────────── Minute (0-59)
```

### Common Cron Examples

```bash
# Every 3 days at 3:00 AM (recommended for 30GB+)
0 3 */3 * *

# Every day at 3:00 AM
0 3 * * *

# Every day at 2:30 AM
30 2 * * *

# Every 6 hours
0 */6 * * *

# Every 12 hours (twice daily)
0 */12 * * *

# Weekdays only at 3 AM (Mon-Fri)
0 3 * * 1-5

# Weekly on Sunday at 3 AM
0 3 * * 0

# First day of every month at 4 AM
0 4 1 * *
```

---

## 🔍 Verify Setup

### Check if cron job is installed
```bash
crontab -l
```

You should see a line like:
```
0 3 * * * cd /path/to/your/project && ./cleanup-disk-space.sh >> /tmp/leadgen-cleanup.log 2>&1
```

### Test the cleanup manually
```bash
cd /path/to/your/project
./cleanup-disk-space.sh
```

### Check cleanup logs
```bash
# View entire log
cat /tmp/leadgen-cleanup.log

# Watch logs in real-time
tail -f /tmp/leadgen-cleanup.log

# Check last 50 lines
tail -n 50 /tmp/leadgen-cleanup.log

# Check when last cleanup ran
ls -lh /tmp/leadgen-cleanup.log
```

---

## 📊 Monitor Automatic Cleanup

### Create a monitoring script

```bash
# Create monitor script
cat > check-cleanup-status.sh << 'EOF'
#!/bin/bash
echo "=========================================="
echo "🔍 Cleanup Status Monitor"
echo "=========================================="
echo ""
echo "📅 Current Cron Jobs:"
crontab -l | grep cleanup || echo "  No cleanup cron jobs found"
echo ""
echo "📝 Last Cleanup Log (last 20 lines):"
tail -n 20 /tmp/leadgen-cleanup.log 2>/dev/null || echo "  No log file yet"
echo ""
echo "💾 Current Disk Usage:"
df -h | grep -E "Filesystem|/$"
echo ""
echo "📊 Profile Sizes:"
cd /path/to/your/project
du -sh *_profile/ 2>/dev/null || echo "  No profiles found"
EOF

chmod +x check-cleanup-status.sh
```

Run it anytime:
```bash
./check-cleanup-status.sh
```

---

## 🔧 Modify or Remove Cron Job

### Edit existing cron jobs
```bash
crontab -e
```

### Remove specific cron job
```bash
# List current jobs
crontab -l

# Remove the cleanup job only
crontab -l | grep -v "cleanup-disk-space.sh" | crontab -
```

### Remove ALL cron jobs (careful!)
```bash
crontab -r
```

---

## 📧 Email Notifications (Optional)

Get notified when cleanup runs:

```bash
# Edit crontab
crontab -e

# Add MAILTO at the top (before cron jobs)
MAILTO=your-email@example.com

# Then your cron job
0 3 * * * cd /path/to/your/project && ./cleanup-disk-space.sh
```

Note: Requires mail server configured on your VM.

---

## 🚨 Troubleshooting

### Cron job not running?

**1. Check if cron service is running:**
```bash
sudo systemctl status cron
# or
sudo service cron status
```

**2. Check system logs:**
```bash
grep CRON /var/log/syslog
```

**3. Check script permissions:**
```bash
ls -l cleanup-disk-space.sh
# Should show: -rwxr-xr-x
```

**4. Test script manually:**
```bash
cd /path/to/your/project
./cleanup-disk-space.sh
# If this works, cron should work too
```

**5. Check for errors in cron log:**
```bash
tail -f /tmp/leadgen-cleanup.log
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Script not executable | `chmod +x cleanup-disk-space.sh` |
| Wrong path in cron | Use absolute paths |
| No logs generated | Check `/var/mail/username` |
| Cron not running | `sudo systemctl start cron` |

---

## 🎯 Best Practices

### 1. **Log Rotation**
Keep logs from growing too large:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/leadgen-cleanup

# Add this:
/tmp/leadgen-cleanup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

### 2. **Health Check After Cleanup**
Modify cron job to restart app after cleanup:

```bash
0 3 * * * cd /path/to/project && ./cleanup-disk-space.sh && docker-compose restart >> /tmp/leadgen-cleanup.log 2>&1
```

### 3. **Cleanup Before Deployment**
Add to your workflow:

```bash
# Before deploying
./cleanup-disk-space.sh
df -h
./deploy.sh --rebuild
```

### 4. **Monitor Disk Usage Trends**
Create a daily disk usage log:

```bash
# Add this cron job
0 * * * * df -h | grep -E "/$" >> /tmp/disk-usage-history.log
```

Then analyze:
```bash
# See disk usage over time
cat /tmp/disk-usage-history.log
```

---

## 📱 Slack/Discord Notifications (Advanced)

Get notified in Slack/Discord when cleanup runs:

```bash
# Add to cleanup-disk-space.sh at the end:
WEBHOOK_URL="your-webhook-url"
curl -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"✅ Disk cleanup completed. Free space: $(df -h | grep '/$' | awk '{print $4}')\"}"
```

---

## 🔄 Complete Automation Workflow

Here's the recommended full automation setup:

```bash
# 1. Initial setup (run once)
cd /path/to/your/project
chmod +x setup-auto-cleanup.sh
./setup-auto-cleanup.sh

# 2. Verify setup
crontab -l

# 3. Test manually
./cleanup-disk-space.sh

# 4. Monitor logs
tail -f /tmp/leadgen-cleanup.log

# 5. Add monitoring (optional)
0 9 * * * df -h | mail -s "Daily Disk Report" your-email@example.com
```

---

## ✅ Success Checklist

After setting up automation:

- [ ] Cron job installed (`crontab -l` shows the job)
- [ ] Script is executable (`ls -l cleanup-disk-space.sh`)
- [ ] Tested manually (script runs without errors)
- [ ] Log file created (`ls -l /tmp/leadgen-cleanup.log`)
- [ ] Cleanup freed space (`df -h` shows more free space)
- [ ] Application still works (`curl http://localhost:3000/health`)
- [ ] Waited for scheduled time and checked logs

---

## 🆘 Quick Reference

```bash
# Setup automatic cleanup
./setup-auto-cleanup.sh

# Check cron jobs
crontab -l

# View cleanup logs
tail -f /tmp/leadgen-cleanup.log

# Run cleanup manually
./cleanup-disk-space.sh

# Check disk space
df -h

# Remove automation
crontab -e  # then delete the line

# Test cron expression
# Visit: https://crontab.guru
```

---

**Remember:** Once set up, the cleanup runs automatically. No manual intervention needed! 🎉

