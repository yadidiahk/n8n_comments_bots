# ⚡ QUICK FIX: Out of Disk Space on GCP VM

## 🚨 The Error You're Seeing
```json
{
    "success": false,
    "error": "ENOSPC: no space left on device, write"
}
```

## ✅ FASTEST FIX (Copy-Paste These Commands)

```bash
# 1. Navigate to your project directory
cd /path/to/your/project  # Change this to your actual path

# 2. Stop the app
docker-compose down

# 3. Run the cleanup script
chmod +x cleanup-disk-space.sh
./cleanup-disk-space.sh

# 4. Check you have space now (need 2GB+ free)
df -h

# 5. Restart the app
./deploy.sh --rebuild

# 6. Test again
curl http://localhost:3000/health
```

## 📊 Check Disk Space
```bash
# Quick check
df -h

# See what's taking space
du -sh * | sort -hr | head -10

# Check Docker usage
docker system df
```

## 🧹 If Cleanup Script Doesn't Help

```bash
# Nuclear option: Clean EVERYTHING
docker-compose down
docker system prune -a --volumes -f
docker volume prune -f

# Clean all caches manually
find . -type d -name "Cache" -exec rm -rf {}/\* \;
find . -type d -name "GPUCache" -exec rm -rf {}/\* \;
find . -name "*.log" -delete

# Restart
./deploy.sh --rebuild
```

## 🔧 Long-term Fix: Increase Disk Size

```bash
# On your local machine (not on GCP VM)
# List your disks
gcloud compute disks list

# Resize disk from 10GB to 30GB (example)
gcloud compute disks resize YOUR_DISK_NAME \
  --size=30GB \
  --zone=YOUR_ZONE

# Then SSH into VM and expand filesystem
gcloud compute ssh your-vm-name

# On the VM, run:
sudo growpart /dev/sda 1
sudo resize2fs /dev/sda1

# Verify new size
df -h
```

## 📅 Prevent Future Issues - Automate It!

### Easiest Way (Recommended):
```bash
# Automated setup script (interactive)
chmod +x setup-auto-cleanup.sh
./setup-auto-cleanup.sh

# Choose your schedule (daily, every 12 hours, weekly, etc.)
# Done! Cleanup will run automatically
```

### Manual Way:
```bash
# Set up automatic cleanup every day at 3 AM
crontab -e

# Add this line:
0 3 * * * cd /path/to/project && ./cleanup-disk-space.sh >> /tmp/cleanup.log 2>&1
```

See `AUTOMATION_GUIDE.md` for complete automation options.

## 🎯 Success Checklist

After cleanup, verify:
- [ ] `df -h` shows at least 2GB free
- [ ] `docker-compose up -d` starts without errors
- [ ] `curl http://localhost:3000/health` returns `{"status":"healthy"}`
- [ ] API requests work without ENOSPC errors

## 💡 Pro Tips

1. **Before each git pull and deploy:**
   ```bash
   ./cleanup-disk-space.sh
   ```

2. **Monitor disk space:**
   ```bash
   # Add to .bashrc or .zshrc
   alias diskcheck='df -h | grep -E "Filesystem|/$"'
   ```

3. **Recommended GCP VM specs:**
   - Minimum: 20GB disk, 2GB RAM
   - Recommended: 30GB disk, 4GB RAM
   - Why: Each browser profile can grow to 500MB-1GB

---

**Still stuck?** Check `DISK_SPACE_ISSUE.md` for comprehensive troubleshooting.

