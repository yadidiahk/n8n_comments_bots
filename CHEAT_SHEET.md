# 📋 Lead Gen Bot - Quick Reference Cheat Sheet

## 🚀 Deployment Commands

```bash
# Normal deployment
./deploy.sh

# Full rebuild (after code changes)
./deploy.sh --rebuild

# Skip cleanup (faster, but may have issues)
./deploy.sh --no-cleanup
```

## 🧹 Disk Space Management

```bash
# Manual cleanup
./cleanup-disk-space.sh

# Setup automatic daily cleanup
./setup-auto-cleanup.sh

# Check disk space
df -h
```

## 📊 Monitoring

```bash
# View logs
docker-compose logs -f

# View specific bot logs
docker-compose logs -f leadgen-bot

# Check container status
docker-compose ps

# Check disk usage
du -sh *_profile/
```

## 🔧 Troubleshooting

```bash
# Out of space error
./cleanup-disk-space.sh
./deploy.sh --rebuild

# Profile locked error
./deploy.sh --rebuild

# Container won't start
docker-compose down
docker system prune -f
./deploy.sh --rebuild

# Complete reset (removes all data)
docker-compose down -v
docker system prune -a --volumes -f
rm -rf *_profile/
./deploy.sh --rebuild
```

## 🌐 Access Points

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Health Check | http://localhost:3000/health |
| VNC Viewer | http://localhost:6080/vnc.html |

## 📡 API Endpoints

```bash
# LinkedIn
POST /api/linkedin/comment
Body: {"postUrl": "...", "comment": "..."}

# Twitter (Puppeteer)
POST /api/twitter2/comment
Body: {"tweetUrl": "...", "comment": "..."}

# Twitter (OAuth)
POST /api/twitter/comment
Body: {"tweetUrl": "...", "comment": "..."}

# TikTok
POST /api/tiktok/comment
Body: {"videoUrl": "...", "comment": "..."}

# Reddit
POST /api/reddit/comment
Body: {"postUrl": "...", "comment": "..."}

# YouTube
POST /api/youtube/comment
Body: {"videoUrl": "...", "comment": "..."}
```

## 🐳 Docker Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Shell access
docker-compose exec leadgen-bot bash

# Clean Docker
docker system prune -a --volumes -f
```

## 🤖 Cron/Automation

```bash
# Setup auto cleanup
./setup-auto-cleanup.sh

# View cron jobs
crontab -l

# Edit cron jobs
crontab -e

# View cleanup logs
tail -f /tmp/leadgen-cleanup.log

# Remove cron job
crontab -l | grep -v cleanup | crontab -
```

## 🔍 Useful Checks

```bash
# Check all services
curl http://localhost:3000/health
docker-compose ps
df -h

# Find what's using space
du -sh * | sort -hr | head -10
docker system df

# Check Chrome processes
ps aux | grep chrome

# Check lock files
find . -name "Singleton*"
```

## 💾 GCP VM Management

```bash
# SSH into VM
gcloud compute ssh your-vm-name

# Resize disk
gcloud compute disks resize DISK_NAME --size=30GB --zone=ZONE

# On VM after resize
sudo growpart /dev/sda 1
sudo resize2fs /dev/sda1
df -h
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `deploy.sh` | Main deployment script |
| `cleanup-disk-space.sh` | Disk cleanup script |
| `setup-auto-cleanup.sh` | Setup automatic cleanup |
| `server.js` | Main API server |
| `.env` | Environment variables (credentials) |
| `docker-compose.yml` | Docker configuration |

## 🆘 Emergency Recovery

```bash
# If everything is broken
cd /path/to/project
docker-compose down -v
docker system prune -a --volumes -f
./cleanup-disk-space.sh
git pull
./deploy.sh --rebuild

# If out of space
./cleanup-disk-space.sh
docker system prune -a --volumes -f
df -h  # Should show 2GB+ free
./deploy.sh --rebuild
```

## 📚 Documentation Files

- `README.md` - Quick start guide
- `DEPLOYMENT.md` - Detailed deployment instructions
- `AUTOMATION_GUIDE.md` - Automation and cron jobs
- `DISK_SPACE_ISSUE.md` - Comprehensive disk space solutions
- `QUICK_FIX_DISK_SPACE.md` - Quick disk space fix
- `FIXES_SUMMARY.md` - Chrome profile lock fixes
- `QUICK_FIXES.md` - Recent bug fixes
- `CHEAT_SHEET.md` - This file!

## 🎯 Common Workflows

### Daily Development
```bash
git pull
./cleanup-disk-space.sh  # Optional
./deploy.sh
docker-compose logs -f
```

### Production Deployment
```bash
git pull
./cleanup-disk-space.sh
./deploy.sh --rebuild
docker-compose ps
curl http://localhost:3000/health
```

### Weekly Maintenance
```bash
./cleanup-disk-space.sh
docker system prune -f
docker-compose restart
df -h
```

### When Space Runs Out
```bash
./cleanup-disk-space.sh
docker system prune -a --volumes -f
./deploy.sh --rebuild
```

---

**Pro Tip:** Bookmark this file for quick reference! 🔖

