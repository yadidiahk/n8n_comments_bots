# 🚀 Deployment Guide

## Quick Start on GCP VM

After pulling the latest code from Git, simply run:

```bash
chmod +x deploy.sh
./deploy.sh
```

That's it! The script handles everything automatically.

## What deploy.sh Does

The script performs a complete deployment in 5 steps:

1. **Kills all Chrome/Chromium processes** - Prevents profile lock conflicts
2. **Stops Docker containers** - Clean shutdown of existing services
3. **Cleans profile lock files** - Removes all Singleton* files from browser profiles
4. **Manages Docker images** - Builds if needed or uses existing
5. **Starts containers** - Launches the application

## Usage Options

### Standard Deployment
```bash
./deploy.sh
```
Uses existing Docker image if available, builds if not.

### Full Rebuild
```bash
./deploy.sh --rebuild
```
Forces a complete rebuild of the Docker image (use after code changes).

### Skip Cleanup
```bash
./deploy.sh --no-cleanup
```
Skips Chrome process killing and lock file cleanup (faster, but may cause issues).

### Get Help
```bash
./deploy.sh --help
```
Shows all available options.

## After Deployment

Once deployed, you can:

- **View logs**: `docker-compose logs -f`
- **Check status**: `docker-compose ps`
- **Stop services**: `docker-compose down`
- **Restart**: `docker-compose restart`
- **Shell access**: `docker-compose exec leadgen-bot bash`

## Access Points

- **Main API**: http://localhost:3000
- **VNC Viewer**: http://localhost:6080/vnc.html
- **Health Check**: http://localhost:3000/health

## Troubleshooting

### Profile Lock Errors

If you see errors about "profile in use" or Chrome processes:

```bash
./deploy.sh --rebuild
```

This will:
1. Kill all Chrome processes
2. Clean all lock files
3. Rebuild the Docker image
4. Start fresh

### Manual Cleanup

If the automatic cleanup doesn't work:

```bash
# Stop everything
docker-compose down

# Kill Chrome processes manually
pkill -9 chrome
pkill -9 chromium

# Remove lock files
find . -name "SingletonLock" -delete
find . -name "SingletonSocket" -delete
find . -name "SingletonCookie" -delete

# Deploy again
./deploy.sh --rebuild
```

### Container Won't Start

Check the logs:
```bash
docker-compose logs -f leadgen-bot
```

Common issues:
- Port 3000 or 6080 already in use
- Docker daemon not running
- Insufficient disk space

## GCP VM Deployment Workflow

```bash
# 1. SSH into your GCP VM
gcloud compute ssh your-vm-name

# 2. Navigate to your project directory
cd /path/to/your/project

# 3. Pull latest changes
git pull origin main

# 4. Deploy
./deploy.sh

# 5. Check logs to verify
docker-compose logs -f
```

## Environment Variables

Make sure your `.env` file is configured with:

```env
# LinkedIn
LINKEDIN_USER=your_email
LINKEDIN_PASS=your_password

# Twitter
TWITTER_USER=your_email
TWITTER_PASS=your_password

# TikTok
TIKTOK_USER=your_email
TIKTOK_PASS=your_password

# Reddit (OAuth)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
REDDIT_ACCESS_TOKEN=your_token

# YouTube (OAuth)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Twitter API (alternative method)
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret

# Docker config
PORT=3000
```

## Architecture

The deployment consists of:

- **Docker Container**: Runs Node.js app with Chromium
- **Xvfb**: Virtual display for headless Chrome
- **noVNC**: Web-based VNC viewer
- **Browser Profiles**: Persistent login sessions (Docker volumes)

## Profile Lock Issue - Fixed!

The Chrome profile lock issue has been completely resolved with:

1. **Process cleanup at startup** (`start.sh` in container)
2. **Process cleanup before launch** (all bot files)
3. **Lock file cleanup** (multiple retry attempts)
4. **Host-side cleanup** (`deploy.sh` before deployment)

All levels now have robust cleanup mechanisms with retry logic.

## Need Help?

- Check container logs: `docker-compose logs -f`
- Check application logs inside container: `docker-compose exec leadgen-bot bash`
- Verify Chrome processes: `pgrep -f chrome`
- Check lock files: `find . -name "Singleton*"`

---

**Pro Tip**: For production deployments, always use `./deploy.sh --rebuild` to ensure you're running the latest code!

