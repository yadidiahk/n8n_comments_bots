# Unified OAuth Server Guide

## 🎯 One Port for All OAuth Flows!

All OAuth authentication now uses **port 4000** with different paths:

| Service | URL | Callback Path |
|---------|-----|---------------|
| **YouTube** | `http://YOUR_VM_IP:4000/youtube` | `/youtube/callback` |
| **Twitter/X** | `http://YOUR_VM_IP:4000/twitter` | `/twitter/callback` |

**Benefits:**
- ✅ Only **one firewall rule** needed (port 4000)
- ✅ Clean, organized paths
- ✅ Both can run on same server
- ✅ Easier to manage

---

## 🔧 Setup Steps

### Step 1: Configure GCP Firewall (ONE RULE!)

**In GCP Console → VPC Network → Firewall:**

Click **CREATE FIREWALL RULE**:
```
Name: allow-oauth-server
Direction: Ingress
Action: Allow
Targets: All instances in the network
Source IP ranges: 0.0.0.0/0
Protocols and ports: tcp:4000
```

**That's it! Just one rule.** ✅

---

### Step 2: Update OAuth Redirect URIs

#### **YouTube (Google Cloud Console)**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   http://localhost:4000/youtube/callback
   http://YOUR_VM_IP:4000/youtube/callback
   ```
4. Click "Save"

#### **Twitter/X (Developer Portal)**

1. Go to: https://developer.twitter.com/en/portal/projects-and-apps
2. Click your app → OAuth 2.0 Settings
3. Under "Callback URI / Redirect URL", add:
   ```
   http://localhost:4000/twitter/callback
   http://YOUR_VM_IP:4000/twitter/callback
   ```
4. Click "Save"

---

## 🚀 Usage on GCP VM

### Keep Docker Running

```bash
# SSH to VM
cd ~/leadgen-comment-bot

# Keep Docker running (API + noVNC)
docker-compose up -d
```

### Run YouTube OAuth

```bash
# Navigate to app
cd ~/leadgen-comment-bot

# Install dependencies (first time only)
npm install

# Run YouTube OAuth
node youtube_bot.js auth
```

**Output:**
```
========================================
🔐 OAuth Server running on port 4000
========================================
YouTube OAuth: http://localhost:4000/youtube
Or from browser: http://YOUR_VM_IP:4000/youtube
========================================
```

**On your local machine**, open browser:
```
http://YOUR_VM_IP:4000/youtube
```

1. Click "Authorize with YouTube"
2. Sign in with Google account
3. Grant permissions
4. See "✅ YouTube Authorization complete! Tokens saved to youtube_tokens.json"
5. ✅ Done!

**Back on VM:**
```bash
# Press Ctrl+C to stop OAuth server

# Verify token file
ls -la youtube_tokens.json
```

---

### Run Twitter OAuth

```bash
# Navigate to app
cd ~/leadgen-comment-bot

# Run Twitter OAuth
node twitter_bot.js auth
```

**Output:**
```
========================================
🔐 OAuth Server running on port 4000
========================================
Twitter/X OAuth: http://localhost:4000/twitter
Or from browser: http://YOUR_VM_IP:4000/twitter
========================================
```

**On your local machine**, open browser:
```
http://YOUR_VM_IP:4000/twitter
```

1. Click "Authorize with Twitter/X"
2. Sign in with Twitter account
3. Grant permissions
4. See "✅ Twitter/X Authorization complete! Tokens saved to x_tokens.json"
5. ✅ Done!

**Back on VM:**
```bash
# Press Ctrl+C to stop OAuth server

# Verify token files
ls -la x_tokens.json x_pkce.json
```

---

## 📊 Complete Port Layout

```
Port 3000: Docker API (Main Application) - ALWAYS RUNNING
Port 6080: noVNC Remote Desktop - ALWAYS RUNNING
Port 4000: Unified OAuth Server - RUN WHEN NEEDED
```

---

## 🎉 Benefits of Unified Port

### Before (Multiple Ports):
- Port 3001 for YouTube ❌
- Port 3002 for Twitter ❌
- Multiple firewall rules ❌
- Confusing port management ❌

### After (One Port):
- Port 4000 for all OAuth ✅
- One firewall rule ✅
- Clean URL paths ✅
- Easy to remember ✅

---

## 🧪 Testing

### Verify All Token Files Exist

```bash
cd ~/leadgen-comment-bot

# List all token files
ls -la *.json | grep -E "youtube|x_"

# Should show:
# youtube_tokens.json
# x_tokens.json
# x_pkce.json
```

### Test APIs

```bash
# Keep Docker running
docker-compose up -d

# Test YouTube API
curl -X POST http://YOUR_VM_IP:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://youtu.be/VIDEO_ID","comment":"Test!"}'

# Test Twitter API
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl":"TWEET_URL","comment":"Test!"}'
```

---

## 🐛 Troubleshooting

### Port 4000 Already in Use

```bash
# Check what's using port 4000
sudo lsof -i :4000

# Kill the process
sudo kill -9 PID

# Try again
node youtube_bot.js auth
```

### Can't Access OAuth URL

```bash
# Check firewall rule exists
# GCP Console → VPC Network → Firewall → verify allow-oauth-server

# Check local firewall on VM
sudo ufw allow 4000

# Check if OAuth server is listening
sudo netstat -tulpn | grep 4000
```

### OAuth Redirect Error

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Verify redirect URIs in Google/Twitter console
2. Use exact URLs:
   - YouTube: `http://YOUR_VM_IP:4000/youtube/callback`
   - Twitter: `http://YOUR_VM_IP:4000/twitter/callback`
3. Make sure you saved changes in console

---

## 📝 Quick Reference

### Start OAuth Server

```bash
# YouTube
node youtube_bot.js auth
# Open: http://YOUR_VM_IP:4000/youtube

# Twitter
node twitter_bot.js auth
# Open: http://YOUR_VM_IP:4000/twitter
```

### Check Token Files

```bash
ls -la youtube_tokens.json x_tokens.json x_pkce.json
```

### Restart Docker

```bash
docker-compose restart
docker-compose logs -f
```

---

## ✅ Complete Checklist

Before OAuth setup:
- [ ] Docker running (`docker-compose ps`)
- [ ] Firewall rule for port 4000 created
- [ ] Google OAuth redirect URI updated (port 4000)
- [ ] Twitter OAuth redirect URI updated (port 4000)

YouTube OAuth:
- [ ] Run `node youtube_bot.js auth`
- [ ] Open `http://YOUR_VM_IP:4000/youtube`
- [ ] Authorize in browser
- [ ] `youtube_tokens.json` created
- [ ] Press Ctrl+C to stop server

Twitter OAuth:
- [ ] Run `node twitter_bot.js auth`
- [ ] Open `http://YOUR_VM_IP:4000/twitter`
- [ ] Authorize in browser
- [ ] `x_tokens.json` and `x_pkce.json` created
- [ ] Press Ctrl+C to stop server

Testing:
- [ ] Docker still running
- [ ] noVNC accessible (port 6080)
- [ ] API working (port 3000)
- [ ] All token files exist

---

## 🎊 Summary

**One port (4000), two paths:**
- `/youtube` → YouTube OAuth
- `/twitter` → Twitter OAuth

**Simple, clean, organized!** 🚀

No more juggling multiple ports - everything OAuth-related goes through port 4000 with clear, semantic paths.

Perfect for production deployment!

