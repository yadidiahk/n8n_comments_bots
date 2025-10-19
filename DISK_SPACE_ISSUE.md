# 💾 Disk Space Issue - Fix Guide

## Problem
Your GCP VM ran out of disk space, causing the error:
```json
{
    "success": false,
    "error": "ENOSPC: no space left on device, write"
}
```

## Why This Happens
Browser automation apps accumulate:
- Browser cache files (100s of MB per profile)
- Graphics shader caches
- Log files
- Docker images and containers
- Screenshots and debug files

## 🚨 IMMEDIATE FIX (Run on GCP VM)

```bash
# SSH into your GCP VM
gcloud compute ssh your-vm-name

# Navigate to project
cd /path/to/your/project

# 1. Check disk space
df -h

# 2. Stop containers
docker-compose down

# 3. Run cleanup script
chmod +x cleanup-disk-space.sh
./cleanup-disk-space.sh

# 4. Verify space is available (need at least 2GB free)
df -h

# 5. Redeploy
./deploy.sh --rebuild
```

## 🔧 Manual Cleanup (If Script Doesn't Work)

```bash
# Stop everything
docker-compose down

# Clean all Docker resources
docker system prune -a --volumes -f

# Clean browser caches manually
find . -type d -name "Cache" -exec rm -rf {}/\* \; 2>/dev/null
find . -type d -name "GPUCache" -exec rm -rf {}/\* \; 2>/dev/null
find . -type d -name "ShaderCache" -exec rm -rf {}/\* \; 2>/dev/null
find . -name "*.log" -delete 2>/dev/null
rm -f *.png *.jpg *.html 2>/dev/null

# Check space
df -h

# Rebuild
./deploy.sh --rebuild
```

## 🛡️ PREVENTION - Long-term Solutions

### 1. **Increase GCP VM Disk Size**
```bash
# Check current disk size
gcloud compute disks list

# Resize disk (example: 20GB to 50GB)
gcloud compute disks resize DISK_NAME --size=50GB --zone=YOUR_ZONE

# Resize the filesystem (on VM)
sudo growpart /dev/sda 1
sudo resize2fs /dev/sda1
```

### 2. **Schedule Automatic Cleanup (Cron Job)**
```bash
# Edit crontab on GCP VM
crontab -e

# Add this line to run cleanup every Sunday at 3 AM
0 3 * * 0 cd /path/to/project && ./cleanup-disk-space.sh >> /tmp/cleanup.log 2>&1
```

### 3. **Add Disk Space Monitoring**
```bash
# Check disk space before each deployment
df -h | awk '$NF=="/"{if($5>90) print "WARNING: Disk usage at "$5}'
```

### 4. **Disable Screenshot Debugging**
In production, you can disable debug screenshots to save space.

Edit bot files and comment out screenshot lines:
```javascript
// await page.screenshot({ path: 'debug.png' });  // Disabled in production
```

### 5. **Enable Docker Volume Pruning**
Add to your deploy.sh or run weekly:
```bash
# Remove unused volumes
docker volume prune -f
```

## 📊 Disk Space Requirements

| Component | Space Needed | Notes |
|-----------|--------------|-------|
| Docker Images | 2-3 GB | Node + Chromium |
| Browser Profiles | 500 MB each | 5 profiles = 2.5 GB |
| Node Modules | 300 MB | Dependencies |
| Caches (growing) | 1-2 GB | Accumulates over time |
| **Minimum Total** | **6-8 GB** | **Recommended: 20GB+** |

## 🔍 Monitoring Commands

```bash
# Check overall disk usage
df -h

# Find largest directories
du -h --max-depth=1 . | sort -hr | head -20

# Check Docker disk usage
docker system df

# Check specific profile sizes
du -sh *_profile/

# Monitor disk space continuously
watch -n 5 'df -h | grep -E "Filesystem|/$"'
```

## ⚡ Quick Reference

| Problem | Solution |
|---------|----------|
| Out of space | Run `./cleanup-disk-space.sh` |
| Still no space | Run `docker system prune -a --volumes -f` |
| Need more space | Resize GCP disk |
| Prevent issue | Add weekly cron job |
| Monitor space | Add to deploy.sh |

## 🎯 What the Cleanup Script Does

1. ✅ Shows current disk usage
2. ✅ Stops Docker containers
3. ✅ Removes unused Docker images/volumes
4. ✅ Cleans browser cache directories
5. ✅ Removes log files
6. ✅ Deletes screenshots
7. ✅ Shows space freed
8. ✅ Preserves login sessions (cookies/localStorage)

## ✅ Success Indicators

After cleanup, you should see:
- At least 2GB free disk space
- Docker containers start successfully
- API responds to requests
- No ENOSPC errors

---

## 🆘 If Cleanup Doesn't Free Enough Space

### Option 1: Increase GCP VM Disk
```bash
gcloud compute disks resize DISK_NAME --size=30GB --zone=YOUR_ZONE
```

### Option 2: Use Separate Volume for Profiles
Modify `docker-compose.yml` to use external volumes on separate disk.

### Option 3: Clean Everything and Start Fresh
```bash
# ⚠️ WARNING: This will remove all browser sessions
docker-compose down -v
docker system prune -a --volumes -f
rm -rf *_profile/
./deploy.sh --rebuild
# You'll need to re-login to all platforms
```

---

**Remember:** Browser automation apps need significant disk space. For production, use at least 20GB disk on GCP VM.

