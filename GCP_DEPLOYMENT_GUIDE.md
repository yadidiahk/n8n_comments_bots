# Complete GCP Deployment Guide

## 🚀 Deploy Social Media Comment Bot to Google Cloud Platform

This guide walks you through deploying your application to a GCP VM instance and making the APIs accessible online.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Prepare & Push to Git](#step-1-prepare--push-to-git)
3. [Step 2: Create GCP VM Instance](#step-2-create-gcp-vm-instance)
4. [Step 3: Connect to VM & Setup](#step-3-connect-to-vm--setup)
5. [Step 4: Install Docker](#step-4-install-docker)
6. [Step 5: Clone & Configure Application](#step-5-clone--configure-application)
7. [Step 6: Deploy with Docker](#step-6-deploy-with-docker)
8. [Step 7: Configure Firewall & Access](#step-7-configure-firewall--access)
9. [Step 8: Test Your APIs](#step-8-test-your-apis)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### Local Machine:
- [x] Git installed
- [x] Application folder ready (`/Users/yadidiah/Desktop/LeadGenCodes/app`)
- [x] `.env` file with all credentials
- [x] OAuth tokens generated (youtube_tokens.json, x_tokens.json)

### GCP Account:
- [ ] Google Cloud Platform account
- [ ] Project created in GCP Console
- [ ] Billing enabled
- [ ] Compute Engine API enabled

---

## Step 1: Prepare & Push to Git

### 1.1 Initialize Git Repository (if not already done)

```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app

# Initialize git (if not already initialized)
git init

# Check current status
git status
```

### 1.2 Stage Your Changes

```bash
# Add all files (sensitive files are excluded by .gitignore)
git add .

# Check what will be committed
git status
```

**Verify these files are NOT staged (should be excluded):**
- `.env`
- `x_tokens.json`
- `youtube_tokens.json`
- `x_pkce.json`
- `*_profile/` directories
- `*.png` screenshots

### 1.3 Commit Your Changes

```bash
# Commit with a meaningful message
git commit -m "feat: add complete social media comment bot with Docker support

- Add LinkedIn, YouTube, Reddit, Twitter/X, TikTok bot support
- Configure Docker deployment with noVNC
- Add OAuth support for YouTube, Twitter, Reddit
- Add comprehensive documentation
- Configure headful mode for manual login
"
```

### 1.4 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new **private** repository (keep it private for security)
3. Name it: `leadgen-comment-bot` or your preferred name
4. Don't initialize with README (you already have files)
5. Click "Create repository"

### 1.5 Push to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/leadgen-comment-bot.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

**Enter your GitHub credentials when prompted.**

### 1.6 Verify on GitHub

- Go to your repository URL
- Verify files are there
- **Double-check**: Ensure `.env`, token files, and profiles are NOT visible

---

## Step 2: Create GCP VM Instance

### 2.1 Access GCP Console

1. Go to https://console.cloud.google.com/
2. Select or create a project
3. Navigate to **Compute Engine** → **VM Instances**

### 2.2 Create New VM Instance

Click **"CREATE INSTANCE"** and configure:

#### Basic Configuration:
```
Name: leadgen-bot-vm
Region: us-central1 (or closest to you)
Zone: us-central1-a (or any available)
```

#### Machine Configuration:
```
Series: E2
Machine type: e2-medium (2 vCPU, 4 GB memory)
  - Recommended for running Chrome with puppeteer
  - Can upgrade to e2-standard-2 if needed
```

#### Boot Disk:
```
Operating System: Ubuntu
Version: Ubuntu 22.04 LTS
Boot disk type: Balanced persistent disk
Size: 20 GB (minimum, 30 GB recommended)
```

#### Identity and API Access:
```
Service account: Compute Engine default service account
Access scopes: Allow default access
```

#### Firewall:
```
✅ Allow HTTP traffic
✅ Allow HTTPS traffic
```

### 2.3 Advanced Options

Expand **"Networking, Disks, Security, Management, Sole-tenancy"**

**Networking:**
- Click on "Network interfaces"
- Under "External IPv4 address" → Select "Create IP address"
- Name it: `leadgen-bot-ip`
- Click "Reserve"

This gives you a **static IP** that won't change when you restart the VM.

### 2.4 Create the VM

- Review your configuration
- Click **"CREATE"**
- Wait 1-2 minutes for VM to start

### 2.5 Note Your VM Details

Once created, note these down:
```
External IP: ___.___.___.___ (e.g., 35.123.456.789)
Internal IP: 10.x.x.x
Zone: us-central1-a
```

---

## Step 3: Connect to VM & Setup

### 3.1 Connect via SSH

**Option A: Browser SSH (Easiest)**
1. In GCP Console, find your VM instance
2. Click **"SSH"** button next to your VM
3. A browser window will open with terminal access

**Option B: Command Line (from your Mac)**
```bash
# Install gcloud CLI if not already installed
# Download from: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Connect via SSH
gcloud compute ssh leadgen-bot-vm --zone=us-central1-a
```

### 3.2 Update System

Once connected to the VM:

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install basic tools
sudo apt install -y git curl wget vim nano htop
```

---

## Step 4: Install Docker

### 4.1 Install Docker

```bash
# Remove old versions (if any)
sudo apt remove docker docker-engine docker.io containerd runc

# Install dependencies
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verify installation
sudo docker --version
```

### 4.2 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4.3 Configure Docker Permissions

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout and login again)
newgrp docker

# Verify you can run docker without sudo
docker ps
```

---

## Step 5: Clone & Configure Application

### 5.1 Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/leadgen-comment-bot.git

# Navigate to app directory
cd leadgen-comment-bot
```

### 5.2 Create .env File

The `.env` file is not in git (for security), so create it manually:

```bash
# Create .env file
nano .env
```

Paste your credentials (copy from your local `.env`):

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# LinkedIn Credentials
LINKEDIN_USER=your_linkedin_email@example.com
LINKEDIN_PASS=your_linkedin_password

# YouTube OAuth Credentials
YOUTUBE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_google_client_secret

# Reddit OAuth Credentials
REDDIT_ACCESS_TOKEN=your_reddit_oauth_access_token

# Twitter/X OAuth Credentials
X_CLIENT_ID=your_twitter_client_id
X_CLIENT_SECRET=your_twitter_client_secret

# TikTok Credentials
TIKTOK_USER=your_tiktok_username
TIKTOK_PASS=your_tiktok_password
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 5.3 Upload OAuth Token Files

You need to transfer your OAuth token files to the VM.

**Option A: Use SCP (from your Mac)**

```bash
# From your local machine (new terminal window)
cd /Users/yadidiah/Desktop/LeadGenCodes/app

# Upload youtube_tokens.json
gcloud compute scp youtube_tokens.json leadgen-bot-vm:~/leadgen-comment-bot/ --zone=us-central1-a

# Upload x_tokens.json
gcloud compute scp x_tokens.json leadgen-bot-vm:~/leadgen-comment-bot/ --zone=us-central1-a

# Upload x_pkce.json
gcloud compute scp x_pkce.json leadgen-bot-vm:~/leadgen-comment-bot/ --zone=us-central1-a
```

**Option B: Copy-Paste Content**

On the VM:

```bash
cd ~/leadgen-comment-bot

# Create youtube_tokens.json
nano youtube_tokens.json
# Paste content from your local file, then Ctrl+X, Y, Enter

# Create x_tokens.json
nano x_tokens.json
# Paste content from your local file, then Ctrl+X, Y, Enter

# Create x_pkce.json
nano x_pkce.json
# Paste content from your local file, then Ctrl+X, Y, Enter
```

### 5.4 Verify Files

```bash
# Check all files are present
ls -la

# Verify .env exists
cat .env | head -5

# Verify token files exist
ls -la *.json
```

---

## Step 6: Deploy with Docker

### 6.1 Build Docker Image

```bash
cd ~/leadgen-comment-bot

# Build the image
docker-compose build

# This will take 5-10 minutes on first build
```

### 6.2 Start the Application

```bash
# Start services in detached mode
docker-compose up -d

# Check if containers are running
docker-compose ps
```

You should see:
```
NAME                    STATUS    PORTS
leadgen-comment-bot     Up        0.0.0.0:3000->3000/tcp, 0.0.0.0:6080->6080/tcp
```

### 6.3 Check Logs

```bash
# View logs
docker-compose logs -f

# Press Ctrl+C to exit log view

# Check for errors
docker-compose logs | grep -i error
```

### 6.4 Verify Application is Running

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return: {"status":"healthy","timestamp":"..."}

# Test API info
curl http://localhost:3000/
```

---

## Step 7: Configure Firewall & Access

### 7.1 Create Firewall Rules

Go back to **GCP Console** → **VPC Network** → **Firewall**

#### Create Rule for API (Port 3000):

1. Click **"CREATE FIREWALL RULE"**
2. Configure:
   ```
   Name: allow-leadgen-api
   Direction: Ingress
   Action: Allow
   Targets: All instances in the network
   Source IP ranges: 0.0.0.0/0
   Protocols and ports: tcp:3000
   ```
3. Click **"CREATE"**

#### Create Rule for noVNC (Port 6080):

1. Click **"CREATE FIREWALL RULE"**
2. Configure:
   ```
   Name: allow-novnc
   Direction: Ingress
   Action: Allow
   Targets: All instances in the network
   Source IP ranges: 0.0.0.0/0
   Protocols and ports: tcp:6080
   ```
3. Click **"CREATE"**

### 7.2 Get Your External IP

```bash
# On the VM
curl ifconfig.me

# Or check in GCP Console under VM Instances
```

Your external IP: `35.xxx.xxx.xxx` (example)

---

## Step 8: Test Your APIs

### 8.1 Test from Your Local Machine

Replace `YOUR_VM_IP` with your actual VM external IP.

#### Test Health Check:

```bash
curl http://YOUR_VM_IP:3000/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-10-15T..."}
```

#### Test API Info:

```bash
curl http://YOUR_VM_IP:3000/
```

Should return API documentation.

#### Test noVNC Access:

Open in browser:
```
http://YOUR_VM_IP:6080/vnc.html
```

You should see a remote desktop interface showing the Chrome browser.

### 8.2 Test LinkedIn Comment API

```bash
curl -X POST http://YOUR_VM_IP:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:YOUR_POST_ID",
    "comment": "Test comment from API!"
  }'
```

### 8.3 Test YouTube Comment API

```bash
curl -X POST http://YOUR_VM_IP:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtu.be/VIDEO_ID",
    "comment": "Great video! Thanks for sharing."
  }'
```

### 8.4 Test Reddit Comment API

```bash
curl -X POST http://YOUR_VM_IP:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.reddit.com/r/test/comments/POST_ID/title/",
    "comment": "Interesting discussion!"
  }'
```

### 8.5 Test Twitter/X Comment API

```bash
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/username/status/TWEET_ID",
    "comment": "Great tweet!"
  }'
```

### 8.6 Test TikTok Comment API

```bash
curl -X POST http://YOUR_VM_IP:3000/api/tiktok/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.tiktok.com/@username/video/VIDEO_ID",
    "comment": "Amazing content!"
  }'
```

---

## Troubleshooting

### Cannot Connect to VM

**Check firewall rules:**
```bash
# On VM
sudo ufw status

# If active and blocking, allow ports
sudo ufw allow 3000
sudo ufw allow 6080
```

**Check if service is listening:**
```bash
sudo netstat -tulpn | grep -E '3000|6080'
```

### Docker Container Not Starting

**Check logs:**
```bash
docker-compose logs

# Check specific container
docker logs leadgen-comment-bot
```

**Restart containers:**
```bash
docker-compose down
docker-compose up -d
```

**Rebuild if needed:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 PID

# Restart docker-compose
docker-compose restart
```

### OAuth Tokens Not Working

**Regenerate tokens:**

For YouTube:
```bash
# On your local machine
cd /Users/yadidiah/Desktop/LeadGenCodes/app
node youtube_bot.js auth

# Then upload new youtube_tokens.json to VM
gcloud compute scp youtube_tokens.json leadgen-bot-vm:~/leadgen-comment-bot/ --zone=us-central1-a
```

For Twitter:
- Will be regenerated on first API call
- Check logs: `docker-compose logs -f`

### Low Memory / Performance Issues

**Check memory usage:**
```bash
free -h
docker stats
```

**Upgrade VM:**
1. Stop VM in GCP Console
2. Click "Edit"
3. Change machine type to `e2-standard-2` (2 vCPU, 8 GB)
4. Save and start VM

### Cannot Access noVNC

**Check if x11vnc is running:**
```bash
docker-compose exec leadgen-bot ps aux | grep x11vnc
```

**Restart container:**
```bash
docker-compose restart
```

---

## Maintenance & Updates

### Update Application Code

```bash
# SSH to VM
gcloud compute ssh leadgen-bot-vm --zone=us-central1-a

# Navigate to app directory
cd ~/leadgen-comment-bot

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f
```

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Search for errors
docker-compose logs | grep -i error
```

### Backup OAuth Tokens

```bash
# From your local machine
gcloud compute scp leadgen-bot-vm:~/leadgen-comment-bot/youtube_tokens.json ./youtube_tokens_backup.json --zone=us-central1-a

gcloud compute scp leadgen-bot-vm:~/leadgen-comment-bot/x_tokens.json ./x_tokens_backup.json --zone=us-central1-a
```

### Stop Application

```bash
# SSH to VM
cd ~/leadgen-comment-bot

# Stop containers
docker-compose down

# Stop and remove volumes (careful - deletes browser profiles)
docker-compose down -v
```

### Restart Application

```bash
cd ~/leadgen-comment-bot
docker-compose restart
```

### Check Resource Usage

```bash
# System resources
htop

# Docker resources
docker stats

# Disk usage
df -h

# Docker disk usage
docker system df
```

---

## Security Best Practices

### 1. Restrict Firewall Access

If you know your IP, restrict access:

```bash
# In GCP Console, edit firewall rule
# Change Source IP ranges from: 0.0.0.0/0
# To your IP: YOUR_IP/32
```

### 2. Use HTTPS (Optional)

Install Nginx with SSL:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### 3. Regular Updates

```bash
# Update system weekly
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd ~/leadgen-comment-bot
docker-compose pull
docker-compose up -d
```

### 4. Monitor Logs

Set up log monitoring:
```bash
# Check for failed login attempts
docker-compose logs | grep -i "failed\|error" | tail -50
```

---

## Cost Optimization

### Estimated Monthly Cost

**VM Instance (e2-medium):**
- Running 24/7: ~$25-30/month
- Static IP: ~$3/month
- Disk (20GB): ~$2/month

**Total: ~$30-35/month**

### Reduce Costs

**Option 1: Stop VM when not in use**
```bash
# From local machine
gcloud compute instances stop leadgen-bot-vm --zone=us-central1-a

# Start when needed
gcloud compute instances start leadgen-bot-vm --zone=us-central1-a
```

**Option 2: Use preemptible VM** (can be terminated anytime)
- 60-90% cheaper
- Good for testing, not for production

**Option 3: Use Cloud Run** (pay per request)
- More complex setup
- Better for sporadic usage

---

## Quick Reference Commands

### On Local Machine:

```bash
# Push updates to git
git add .
git commit -m "update message"
git push origin main

# Connect to VM
gcloud compute ssh leadgen-bot-vm --zone=us-central1-a

# Upload files to VM
gcloud compute scp LOCAL_FILE leadgen-bot-vm:~/leadgen-comment-bot/ --zone=us-central1-a
```

### On GCP VM:

```bash
# Navigate to app
cd ~/leadgen-comment-bot

# Pull updates
git pull origin main

# Rebuild and restart
docker-compose down && docker-compose build && docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart
docker-compose restart

# Stop
docker-compose down
```

---

## Summary

You've successfully deployed your Social Media Comment Bot to GCP! 🎉

**Your APIs are now accessible at:**
- API: `http://YOUR_VM_IP:3000`
- noVNC: `http://YOUR_VM_IP:6080/vnc.html`

**Next Steps:**
1. Test all endpoints
2. Monitor logs regularly
3. Set up monitoring/alerting
4. Consider adding HTTPS
5. Document your external IP

**Support:**
- Check `DEPLOYMENT_CHECKLIST.md` for testing
- Review `README.md` for API usage
- Check logs: `docker-compose logs -f`

---

## Need Help?

Common issues:
- **503 Error**: Service not running → Check `docker-compose ps`
- **Connection refused**: Firewall issue → Check GCP firewall rules
- **OAuth errors**: Token expired → Regenerate tokens
- **Out of memory**: Upgrade VM to e2-standard-2

For more help, check the logs: `docker-compose logs -f`

Good luck! 🚀

