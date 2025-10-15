# OAuth Setup with Separate Ports

## 🎯 Problem Solved!

Previously, OAuth flows used port 3000, which conflicted with Docker. Now each OAuth flow has its own port, so you can:
- ✅ Keep Docker running (port 3000 - API + noVNC)
- ✅ Run OAuth flows simultaneously (ports 3001, 3002)
- ✅ Use noVNC to complete OAuth in browser

---

## 📊 Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| **Docker (Main API)** | 3000 | Express API + all endpoints |
| **noVNC** | 6080 | Remote desktop access |
| **YouTube OAuth** | 3001 | YouTube OAuth flow |
| **Twitter OAuth** | 3002 | Twitter OAuth flow |

---

## 🔧 Setup Steps on GCP VM

### Step 1: Configure Firewall

Add firewall rules for OAuth ports:

**In GCP Console:**
1. Go to **VPC Network** → **Firewall**
2. Click **CREATE FIREWALL RULE**

**Rule 1 - YouTube OAuth:**
```
Name: allow-youtube-oauth
Direction: Ingress
Action: Allow
Targets: All instances in the network
Source IP ranges: 0.0.0.0/0
Protocols and ports: tcp:3001
```

**Rule 2 - Twitter OAuth:**
```
Name: allow-twitter-oauth
Direction: Ingress
Action: Allow
Targets: All instances in the network
Source IP ranges: 0.0.0.0/0
Protocols and ports: tcp:3002
```

### Step 2: Keep Docker Running

```bash
# SSH to your VM
cd ~/leadgen-comment-bot

# Make sure Docker is running
docker-compose up -d

# Verify it's up
docker-compose ps

# You should see it running on ports 3000 and 6080
```

### Step 3: Run YouTube OAuth (Port 3001)

```bash
# In VM, navigate to app
cd ~/leadgen-comment-bot

# Make sure dependencies are installed
npm install

# Run YouTube OAuth on port 3001
node youtube_bot.js auth
```

**Output:**
```
Open http://localhost:3001 to start YouTube OAuth flow
Or access from browser: http://YOUR_VM_IP:3001
```

**On your local machine**, open browser:
```
http://YOUR_VM_IP:3001
```

1. Click "Authorize with YouTube"
2. Sign in with Google account
3. Grant permissions
4. See "Authorization complete! Tokens saved."
5. `youtube_tokens.json` created! ✅

**Back on VM:**
```bash
# Press Ctrl+C to stop OAuth server

# Verify token file
ls -la youtube_tokens.json
```

### Step 4: Run Twitter OAuth (Port 3002)

```bash
# Still in ~/leadgen-comment-bot

# Run Twitter OAuth on port 3002
node twitter_bot.js auth
```

**Output:**
```
Open http://localhost:3002 to start Twitter OAuth flow
Or access from browser: http://YOUR_VM_IP:3002
```

**On your local machine**, open browser:
```
http://YOUR_VM_IP:3002
```

1. Click "Authorize with Twitter"
2. Sign in with Twitter/X account
3. Grant permissions
4. See "Authorization complete!"
5. `x_tokens.json` and `x_pkce.json` created! ✅

**Back on VM:**
```bash
# Press Ctrl+C to stop OAuth server

# Verify token files
ls -la x_tokens.json x_pkce.json
```

---

## 🎉 All Done!

### Verify All Tokens Exist

```bash
cd ~/leadgen-comment-bot

# List token files
ls -la *.json

# Should show:
# youtube_tokens.json
# x_tokens.json
# x_pkce.json
# package.json
# package-lock.json
```

### Restart Docker (if needed)

```bash
# Docker should still be running, but if you stopped it:
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🧪 Test Everything

### Test with Docker Running

```bash
# Docker is running on port 3000
# noVNC is accessible on port 6080

# Test health
curl http://YOUR_VM_IP:3000/health

# Test YouTube API (uses youtube_tokens.json)
curl -X POST http://YOUR_VM_IP:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://youtu.be/VIDEO_ID","comment":"Test!"}'

# Test Twitter API (uses x_tokens.json)
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl":"TWEET_URL","comment":"Test!"}'
```

### Watch Bots via noVNC

Open in browser:
```
http://YOUR_VM_IP:6080/vnc.html
```

Click "Connect" and you'll see the virtual desktop where headful bots run!

---

## 🔐 Important: Update OAuth Redirect URIs

### YouTube (Google Cloud Console)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3001/oauth2callback
   http://YOUR_VM_IP:3001/oauth2callback
   ```
4. Click "Save"

### Twitter (Developer Portal)

1. Go to: https://developer.twitter.com/en/portal/projects-and-apps
2. Click on your app → "Keys and tokens"
3. Scroll to "OAuth 2.0 Settings"
4. Under "Callback URI / Redirect URL", add:
   ```
   http://localhost:3002/oauth2callback
   http://YOUR_VM_IP:3002/oauth2callback
   ```
5. Click "Save"

**Note:** You can keep both localhost and VM IP for flexibility!

---

## 💡 Benefits of This Setup

### Before (Problem):
- OAuth on port 3000 ❌
- Had to stop Docker to run OAuth ❌
- Lost noVNC access ❌
- Couldn't test while setting up OAuth ❌

### After (Solution):
- OAuth on separate ports (3001, 3002) ✅
- Docker keeps running on port 3000 ✅
- noVNC stays accessible ✅
- Can test APIs while running OAuth ✅
- Multiple OAuth flows can run simultaneously ✅

---

## 🐛 Troubleshooting

### OAuth Server Won't Start

**Error:** `Port 3001 already in use`

```bash
# Check what's using the port
sudo lsof -i :3001

# Kill the process
sudo kill -9 PID

# Try again
node youtube_bot.js auth
```

### Can't Access OAuth URL

**Problem:** `http://YOUR_VM_IP:3001` not accessible

**Solution:**
```bash
# Check if firewall rules are created in GCP Console
# VPC Network → Firewall → verify allow-youtube-oauth exists

# Check local firewall
sudo ufw allow 3001
sudo ufw allow 3002

# Check if OAuth server is listening
sudo netstat -tulpn | grep 3001
```

### OAuth Redirect Error

**Error:** `redirect_uri_mismatch`

**Solution:**
- Make sure you updated redirect URIs in Google Cloud Console / Twitter Developer Portal
- Use the **exact same URLs** shown in the OAuth server output
- Include both `localhost` and your VM IP addresses

---

## 📝 Quick Reference Commands

```bash
# Start Docker (keeps noVNC alive)
docker-compose up -d

# Run YouTube OAuth (separate port)
node youtube_bot.js auth

# Run Twitter OAuth (separate port)
node twitter_bot.js auth

# Check all token files
ls -la *.json | grep -E "youtube|x_"

# Test APIs
curl http://YOUR_VM_IP:3000/health

# Access noVNC
# Open: http://YOUR_VM_IP:6080/vnc.html
```

---

## ✅ Checklist

Before testing:
- [ ] Docker is running (`docker-compose ps`)
- [ ] noVNC accessible (`http://YOUR_VM_IP:6080/vnc.html`)
- [ ] Firewall rules for 3001, 3002 created
- [ ] Google Cloud Console redirect URIs updated
- [ ] Twitter Developer Portal redirect URIs updated

OAuth setup:
- [ ] Run `node youtube_bot.js auth`
- [ ] Authorize in browser at port 3001
- [ ] `youtube_tokens.json` created
- [ ] Run `node twitter_bot.js auth` (if needed)
- [ ] Authorize in browser at port 3002
- [ ] `x_tokens.json` and `x_pkce.json` created

Testing:
- [ ] API responds (`curl http://YOUR_VM_IP:3000/health`)
- [ ] YouTube API works
- [ ] Twitter API works
- [ ] Can see bots in noVNC

---

## 🎉 You're All Set!

Now you can:
1. Keep Docker + noVNC running 24/7
2. Run OAuth flows anytime without interruption
3. Watch bots work in real-time via noVNC
4. Test all APIs while everything runs

Perfect setup for production! 🚀

