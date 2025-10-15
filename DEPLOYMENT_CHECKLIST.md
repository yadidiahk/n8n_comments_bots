# Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Configuration
- [ ] `.env` file exists with all required credentials
- [ ] All OAuth tokens are generated and stored locally:
  - [ ] `youtube_tokens.json` (run `node youtube_bot.js auth` to generate)
  - [ ] `x_tokens.json` (run Twitter OAuth flow to generate)
  - [ ] `x_pkce.json` (generated automatically during Twitter auth)
- [ ] Verify `.env` contains:
  ```
  LINKEDIN_USER=your_email
  LINKEDIN_PASS=your_password
  YOUTUBE_CLIENT_ID=your_client_id
  YOUTUBE_CLIENT_SECRET=your_client_secret
  REDDIT_ACCESS_TOKEN=your_token
  X_CLIENT_ID=your_client_id
  X_CLIENT_SECRET=your_client_secret
  TIKTOK_USER=your_username
  TIKTOK_PASS=your_password
  PORT=3000
  ```

### 2. Security Check
- [x] `.gitignore` excludes sensitive files:
  - [x] `.env`
  - [x] `*_tokens.json`
  - [x] `*_profile/` directories
  - [x] OAuth token files
- [x] No hardcoded credentials in code
- [ ] Token files exist locally but are NOT committed to git

### 3. Dependencies
- [x] All npm packages listed in `package.json`
- [x] `package-lock.json` is up to date
- [ ] Run `npm install` to verify all dependencies install correctly

### 4. Docker Configuration
- [x] `Dockerfile` is properly configured
- [x] `docker-compose.yml` includes all environment variables
- [x] All browser profile volumes are defined
- [x] Ports 3000 (API) and 6080 (noVNC) are exposed
- [x] Health check endpoint configured

### 5. Bot Configuration
- [x] Bots are in headful mode (`headless: false`) for VNC access
- [x] Chrome/Chromium paths configured for Docker
- [x] Browser profiles persist across restarts

## Deployment Steps

### Option 1: Docker Compose (Recommended)

```bash
# 1. Build the image
docker-compose build

# 2. Start the service
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. Access the service
# - API: http://localhost:3000
# - noVNC: http://localhost:6080/vnc.html
```

### Option 2: Docker Run

```bash
# 1. Build the image
./docker-build.sh

# 2. Run the container
./docker-run.sh

# 3. Check logs
docker logs -f leadgen-bot
```

### Option 3: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Access at http://localhost:3000
```

## Post-Deployment Verification

### 1. Health Checks
- [ ] API responds: `curl http://localhost:3000/health`
- [ ] API info: `curl http://localhost:3000/`
- [ ] noVNC accessible: http://localhost:6080/vnc.html

### 2. Test Each Platform

**LinkedIn:**
```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{"postUrl": "YOUR_LINKEDIN_POST_URL", "comment": "Test comment"}'
```

**YouTube:**
```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://youtu.be/VIDEO_ID", "comment": "Test comment"}'
```

**Reddit:**
```bash
curl -X POST http://localhost:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{"postUrl": "REDDIT_POST_URL", "comment": "Test comment"}'
```

**Twitter/X:**
```bash
curl -X POST http://localhost:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl": "TWEET_URL", "comment": "Test reply"}'
```

**TikTok:**
```bash
curl -X POST http://localhost:3000/api/tiktok/comment \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "TIKTOK_VIDEO_URL", "comment": "Test comment"}'
```

### 3. Monitor Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker Run
docker logs -f leadgen-bot

# Check for errors
docker logs leadgen-bot 2>&1 | grep -i error
```

## OAuth Setup Requirements

### YouTube OAuth
1. Create project in Google Cloud Console
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add `http://localhost:3000/oauth2callback` as redirect URI
5. Run: `node youtube_bot.js auth`
6. Complete authorization flow
7. Token saved to `youtube_tokens.json`

### Twitter/X OAuth
1. Create app in Twitter Developer Portal
2. Enable OAuth 2.0
3. Add `http://localhost:3000/oauth2callback` as redirect URI
4. Get Client ID and Client Secret
5. Add to `.env`
6. API will handle OAuth flow automatically

### Reddit OAuth
1. Create app at https://www.reddit.com/prefs/apps
2. Select "script" type
3. Get Client ID and Client Secret
4. Use provided curl command or script to get access token
5. Add token to `.env` as `REDDIT_ACCESS_TOKEN`

See respective setup docs:
- `YOUTUBE_SETUP.md`
- `REDDIT_SETUP.md`
- `INTEGRATION_SUMMARY.md`

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 6080
lsof -ti:6080 | xargs kill -9
```

### Container Won't Start
```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache

# Check if ports are available
netstat -an | grep -E "3000|6080"
```

### Bot Login Issues
- Access noVNC at http://localhost:6080/vnc.html
- Watch the browser in real-time
- Check for CAPTCHA or 2FA prompts
- Verify credentials in `.env`

### OAuth Token Expired
- YouTube: Tokens auto-refresh (refresh token saved)
- Twitter: Tokens auto-refresh (refresh token saved)
- Reddit: Generate new access token (see REDDIT_SETUP.md)

## Production Considerations

### 1. Security
- [ ] Use environment variables for all credentials
- [ ] Never commit `.env`, token files, or profile directories
- [ ] Rotate credentials regularly
- [ ] Use application-specific passwords when available
- [ ] Monitor for unauthorized access

### 2. Scaling
- [ ] Use PM2 or similar for process management
- [ ] Configure auto-restart on failure
- [ ] Set up monitoring and alerting
- [ ] Configure resource limits in docker-compose

### 3. Maintenance
- [ ] Regularly update dependencies
- [ ] Monitor API rate limits
- [ ] Back up OAuth tokens
- [ ] Clean up old browser profiles periodically

### 4. For Headless Production
If you want to run in production without VNC (headless mode):
1. Set `headless: true` in all bot files (bot.js, tiktok_bot.js)
2. Comment out noVNC sections in Dockerfile and start.sh
3. Remove port 6080 from docker-compose.yml
4. Note: Manual login won't be possible in headless mode

## Support & Documentation

- **Main README**: `README.md`
- **Integration Summary**: `INTEGRATION_SUMMARY.md`
- **YouTube Setup**: `YOUTUBE_SETUP.md`
- **Reddit Setup**: `REDDIT_SETUP.md`
- **TikTok Setup**: `TIKTOK_SETUP.md`

## Current Status: ✅ READY FOR DEPLOYMENT

All critical checks passed. The application is ready to deploy with:
- ✅ Proper .gitignore configuration
- ✅ Environment variable template (.env.example)
- ✅ Complete Docker setup
- ✅ All dependencies installed
- ✅ OAuth token support
- ✅ Headful mode enabled for manual login
- ✅ noVNC remote access configured

