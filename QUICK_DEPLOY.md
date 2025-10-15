# Quick Deployment Reference

## 🚀 5-Minute Deploy Checklist

### Phase 1: Push to Git (Local Machine)
```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app
git add .
git commit -m "deploy: production-ready social media bot"
git remote add origin https://github.com/YOUR_USERNAME/leadgen-bot.git
git push -u origin main
```

---

### Phase 2: Create GCP VM
1. Go to: https://console.cloud.google.com/compute
2. Click **CREATE INSTANCE**
3. Configure:
   - Name: `leadgen-bot-vm`
   - Machine: `e2-medium` (2 vCPU, 4 GB)
   - OS: `Ubuntu 22.04 LTS`
   - Disk: `20 GB`
   - ✅ Allow HTTP/HTTPS traffic
   - Reserve static IP
4. Click **CREATE**
5. Note your **External IP**: `___.___.___` 

---

### Phase 3: Setup VM
```bash
# Connect to VM (click SSH button in GCP Console)

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

### Phase 4: Clone & Configure
```bash
# Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/leadgen-bot.git
cd leadgen-bot

# Create .env file
nano .env
# Paste your credentials, then Ctrl+X, Y, Enter
```

---

### Phase 5: Generate OAuth Tokens (RECOMMENDED)

**Option A: Generate on VM (Easiest)** ✨

After deployment, run these on the VM:

```bash
# YouTube OAuth
docker-compose down
node youtube_bot.js auth
# Open http://YOUR_VM_IP:3000 in browser, authorize, then Ctrl+C
docker-compose up -d

# Twitter OAuth - automatic on first API call
# Reddit OAuth - use curl to get token, add to .env
```

**Option B: Upload from Local (If you already have them)**
```bash
# From your local machine
cd /Users/yadidiah/Desktop/LeadGenCodes/app
gcloud compute scp youtube_tokens.json leadgen-bot-vm:~/leadgen-bot/ --zone=us-central1-a
gcloud compute scp x_tokens.json leadgen-bot-vm:~/leadgen-bot/ --zone=us-central1-a
```

---

### Phase 6: Deploy
```bash
# Back on VM
cd ~/leadgen-bot

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

### Phase 7: Configure Firewall

**In GCP Console:**
1. Go to **VPC Network** → **Firewall**
2. Click **CREATE FIREWALL RULE**

**Rule 1 (API):**
```
Name: allow-leadgen-api
Source IP: 0.0.0.0/0
Protocols: tcp:3000
```

**Rule 2 (noVNC):**
```
Name: allow-novnc
Source IP: 0.0.0.0/0
Protocols: tcp:6080
```

---

### Phase 8: Test

```bash
# Test health (replace YOUR_VM_IP)
curl http://YOUR_VM_IP:3000/health

# Test API
curl http://YOUR_VM_IP:3000/

# Open in browser
http://YOUR_VM_IP:6080/vnc.html
```

---

## 📝 Your API Endpoints

Replace `YOUR_VM_IP` with your actual IP:

```bash
# LinkedIn
curl -X POST http://YOUR_VM_IP:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{"postUrl":"LINKEDIN_URL","comment":"Test"}'

# YouTube
curl -X POST http://YOUR_VM_IP:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"YOUTUBE_URL","comment":"Test"}'

# Reddit
curl -X POST http://YOUR_VM_IP:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{"postUrl":"REDDIT_URL","comment":"Test"}'

# Twitter/X
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl":"TWEET_URL","comment":"Test"}'

# TikTok
curl -X POST http://YOUR_VM_IP:3000/api/tiktok/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"TIKTOK_URL","comment":"Test"}'
```

---

## 🔧 Common Commands

### On VM:
```bash
# Navigate to app
cd ~/leadgen-bot

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Start
docker-compose up -d

# Pull updates
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
docker stats
```

### From Local Machine:
```bash
# Connect to VM
gcloud compute ssh leadgen-bot-vm --zone=us-central1-a

# Upload file
gcloud compute scp LOCAL_FILE leadgen-bot-vm:~/leadgen-bot/

# Push code updates
git add .
git commit -m "update message"
git push origin main
```

---

## ⚠️ Troubleshooting

**Cannot connect to API:**
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 6080

# Check if running
docker-compose ps
```

**Restart everything:**
```bash
docker-compose down
docker-compose up -d --build
```

**Check logs for errors:**
```bash
docker-compose logs | grep -i error
```

---

## 💰 Cost
- **e2-medium VM**: ~$25-30/month
- **Static IP**: ~$3/month  
- **Disk 20GB**: ~$2/month
- **Total**: ~$30-35/month

---

## 📚 Full Documentation
- **GCP_DEPLOYMENT_GUIDE.md** - Complete step-by-step guide
- **DEPLOYMENT_CHECKLIST.md** - Pre-deployment verification
- **DEPLOYMENT_SUMMARY.md** - What was reviewed
- **README.md** - API usage guide

---

## ✅ Done!

Your bot is now live at:
- **API**: `http://YOUR_VM_IP:3000`
- **noVNC**: `http://YOUR_VM_IP:6080/vnc.html`

🎉 Ready to comment on social media via API!

