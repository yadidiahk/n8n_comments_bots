# OAuth Token Setup Guide

## 🔐 Setting Up OAuth Tokens on GCP VM

This guide shows you how to generate OAuth tokens **directly on your VM** instead of copying them from your local machine.

---

## Why Generate Tokens on VM?

✅ **Easier**: No file copying or SCP commands  
✅ **Direct**: Generate tokens where they'll be used  
✅ **Secure**: Tokens never leave the VM  
✅ **Fresh**: Get new tokens with latest permissions  

---

## Prerequisites

Before starting:
- ✅ VM is deployed and running
- ✅ Application is deployed with docker-compose
- ✅ Firewall rule allows port 3000
- ✅ You have OAuth credentials in your `.env` file

---

## Step-by-Step Instructions

### 1. YouTube OAuth Token

YouTube requires Google OAuth 2.0 flow.

#### 1.1 Stop Docker Container

```bash
# SSH to your VM
cd ~/leadgen-comment-bot

# Stop the container (we need port 3000 free)
docker-compose down
```

#### 1.2 Install Dependencies

```bash
# Make sure dependencies are installed
npm install
```

#### 1.3 Run YouTube Auth

```bash
# Start the OAuth server
node youtube_bot.js auth
```

You'll see:
```
Open http://localhost:3000 to start YouTube OAuth flow
```

#### 1.4 Complete OAuth Flow

**On your local machine**, open your browser to:
```
http://YOUR_VM_IP:3000
```
(Replace `YOUR_VM_IP` with your actual VM external IP)

Then:
1. Click **"Authorize with YouTube"**
2. Sign in with your Google account
3. Click **"Allow"** to grant permissions
4. You'll see: **"Authorization complete! Tokens saved. You can close this tab."**

#### 1.5 Stop Auth Server

Back on the VM terminal:
```bash
# Press Ctrl+C to stop the auth server
```

#### 1.6 Verify Token Created

```bash
# Check that token file was created
ls -la youtube_tokens.json

# You should see the file
```

#### 1.7 Restart Application

```bash
# Restart the docker container
docker-compose up -d
```

**YouTube OAuth is complete!** ✅

---

### 2. Twitter/X OAuth Token

Twitter tokens are generated **automatically** on first API call. No manual setup needed!

#### 2.1 Verify Credentials in .env

```bash
# Check your .env has these
cat .env | grep X_CLIENT
```

Should show:
```
X_CLIENT_ID=your_twitter_client_id
X_CLIENT_SECRET=your_twitter_client_secret
```

#### 2.2 Test Twitter API (this generates tokens)

```bash
# From your local machine, test the Twitter endpoint
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/username/status/TWEET_ID",
    "comment": "Test reply"
  }'
```

On **first call**, the bot will:
1. Generate OAuth challenge (x_pkce.json)
2. Redirect you to authorize
3. Save tokens (x_tokens.json)
4. Auto-refresh tokens when needed

#### 2.3 Check Logs

```bash
# Watch the OAuth flow in logs
docker-compose logs -f
```

You'll see authentication happening.

**Twitter OAuth is automatic!** ✅

---

### 3. Reddit OAuth Token

Reddit requires a personal access token from their OAuth flow.

#### 3.1 Get Reddit App Credentials

If you don't have them yet:

1. Go to: https://www.reddit.com/prefs/apps
2. Scroll down, click **"create another app..."**
3. Fill in:
   ```
   name: MyRedditBot
   type: select "script"
   description: Personal use bot
   about url: (leave blank)
   redirect uri: http://localhost:8000
   ```
4. Click **"create app"**
5. Note your credentials:
   - **CLIENT_ID**: The string under "personal use script"
   - **CLIENT_SECRET**: The "secret" field

#### 3.2 Generate Access Token

On the VM:

```bash
# Replace with your actual credentials
curl -X POST https://www.reddit.com/api/v1/access_token \
  --user 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' \
  --data 'grant_type=password&username=YOUR_REDDIT_USERNAME&password=YOUR_REDDIT_PASSWORD'
```

Response will look like:
```json
{
  "access_token": "1234567890-AbCdEfGhIjKlMnOpQrStUvWxYz",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "*"
}
```

#### 3.3 Add Token to .env

Copy the `access_token` value and add it to your `.env`:

```bash
# Edit .env
nano .env

# Add this line (or update if it exists):
REDDIT_ACCESS_TOKEN=1234567890-AbCdEfGhIjKlMnOpQrStUvWxYz

# Save with Ctrl+X, Y, Enter
```

#### 3.4 Restart Application

```bash
# Restart to load new token
docker-compose restart

# Check logs
docker-compose logs -f
```

**Reddit OAuth is complete!** ✅

---

## Verification

### Check All Token Files

```bash
cd ~/leadgen-comment-bot

# List token files
ls -la *tokens.json *pkce.json

# Should see:
# youtube_tokens.json
# x_tokens.json (after first Twitter call)
# x_pkce.json (after first Twitter call)
```

### Test Each Platform

From your local machine:

#### Test YouTube:
```bash
curl -X POST http://YOUR_VM_IP:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtu.be/VIDEO_ID",
    "comment": "Test comment"
  }'
```

#### Test Twitter:
```bash
curl -X POST http://YOUR_VM_IP:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/user/status/ID",
    "comment": "Test reply"
  }'
```

#### Test Reddit:
```bash
curl -X POST http://YOUR_VM_IP:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.reddit.com/r/test/comments/ID/",
    "comment": "Test comment"
  }'
```

---

## Troubleshooting

### YouTube: "Could not find OAuth client credentials"

**Problem**: Missing CLIENT_ID or CLIENT_SECRET in .env

**Solution**:
```bash
# Check .env has these:
cat .env | grep YOUTUBE_CLIENT

# Should show:
# YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
# YOUTUBE_CLIENT_SECRET=xxx
```

Add them if missing, then restart:
```bash
docker-compose restart
```

### YouTube: "Redirect URI mismatch"

**Problem**: OAuth callback URL not configured in Google Cloud Console

**Solution**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   http://YOUR_VM_IP:3000/oauth2callback
   ```
4. Click "Save"
5. Try auth again

### Twitter: OAuth not starting

**Problem**: Missing credentials or invalid CLIENT_ID

**Solution**:
```bash
# Verify credentials
cat .env | grep X_CLIENT

# Check Twitter Developer Portal:
# https://developer.twitter.com/en/portal/projects-and-apps

# Make sure:
# 1. App has OAuth 2.0 enabled
# 2. Redirect URI includes: http://localhost:3000/oauth2callback
# 3. CLIENT_ID and CLIENT_SECRET are correct
```

### Reddit: Token expired

**Problem**: Reddit tokens expire after 1 hour

**Solution**:
```bash
# Generate new token
curl -X POST https://www.reddit.com/api/v1/access_token \
  --user 'CLIENT_ID:CLIENT_SECRET' \
  --data 'grant_type=password&username=USER&password=PASS'

# Update .env with new token
nano .env

# Restart
docker-compose restart
```

**Note**: For production, consider implementing Reddit OAuth refresh flow.

### Port 3000 Already in Use

**Problem**: Can't run `node youtube_bot.js auth` because port is busy

**Solution**:
```bash
# Stop docker first
docker-compose down

# Then run auth
node youtube_bot.js auth

# After auth, restart docker
docker-compose up -d
```

---

## Token Lifecycle

### YouTube Tokens
- **Expires**: After 1 hour
- **Auto-refresh**: ✅ Yes (uses refresh_token)
- **Action needed**: None (automatic)

### Twitter Tokens
- **Expires**: After 2 hours
- **Auto-refresh**: ✅ Yes (uses refresh_token)
- **Action needed**: None (automatic)

### Reddit Tokens
- **Expires**: After 1 hour
- **Auto-refresh**: ❌ No (not implemented)
- **Action needed**: Regenerate token manually

---

## Security Best Practices

1. **Never share token files**
   ```bash
   # Token files should never be in git
   # Already excluded in .gitignore
   ```

2. **Backup tokens**
   ```bash
   # Backup to local machine
   gcloud compute scp leadgen-bot-vm:~/leadgen-comment-bot/youtube_tokens.json ./backup/
   ```

3. **Rotate credentials regularly**
   - Every 3-6 months, regenerate OAuth credentials
   - Update in Google/Twitter/Reddit developer portals
   - Update .env and regenerate tokens

4. **Monitor token usage**
   ```bash
   # Check logs for OAuth errors
   docker-compose logs | grep -i oauth
   docker-compose logs | grep -i token
   ```

---

## Summary

### OAuth Setup Checklist

- [ ] YouTube token generated via `node youtube_bot.js auth`
- [ ] Twitter credentials in .env (tokens auto-generate)
- [ ] Reddit access token in .env
- [ ] All tokens verified with test API calls
- [ ] Application restarted with `docker-compose up -d`
- [ ] Logs checked for errors

### Quick Commands

```bash
# Check if tokens exist
ls -la ~/leadgen-comment-bot/*tokens.json

# View token contents (for debugging)
cat ~/leadgen-comment-bot/youtube_tokens.json | jq

# Regenerate all tokens
# 1. YouTube: node youtube_bot.js auth
# 2. Twitter: automatic on first call
# 3. Reddit: curl command above

# Test all platforms
curl http://YOUR_VM_IP:3000/health
```

---

## Next Steps

After OAuth is set up:
1. ✅ Test all API endpoints
2. ✅ Monitor logs for errors
3. ✅ Set up monitoring/alerting
4. ✅ Document your token refresh schedule

**Your APIs are ready to use!** 🚀

For more help, see:
- `GCP_DEPLOYMENT_GUIDE.md` - Main deployment guide
- `YOUTUBE_SETUP.md` - YouTube OAuth details
- `REDDIT_SETUP.md` - Reddit OAuth details

