# Social Media Comment Bot

Automated bot for posting comments on LinkedIn, Twitter/X, TikTok, Reddit, and YouTube.

## Quick Start

### First Time Setup
1. Clone the repository
2. Add your credentials to `.env` file
3. Run deployment:
```bash
./deploy.sh --rebuild
```

### Regular Deployment
After `git pull`:
```bash
./deploy.sh
```

### Commands
- **Deploy/Restart**: `./deploy.sh`
- **Deploy with rebuild**: `./deploy.sh --rebuild`
- **Stop**: `docker-compose down`
- **View logs**: `docker-compose logs -f`
- **Check status**: `docker-compose ps`

## Access

- **API**: http://localhost:3000
- **VNC**: http://localhost:6080/vnc.html

## API Endpoints

### LinkedIn
```bash
POST /linkedin/comment
Body: { "postUrl": "...", "commentText": "..." }
```

### Twitter (Puppeteer)
```bash
POST /twitter/reply-puppeteer
Body: { "tweetUrl": "...", "commentText": "..." }
```

### Twitter (OAuth API)
```bash
POST /twitter/reply
Body: { "tweetUrl": "...", "commentText": "..." }
```

### TikTok
```bash
POST /tiktok/comment
Body: { "videoUrl": "...", "commentText": "..." }
```

### Reddit
```bash
POST /reddit/comment
Body: { "postUrl": "...", "commentText": "..." }
```

### YouTube
```bash
POST /youtube/comment
Body: { "videoUrl": "...", "commentText": "..." }
```

## Environment Variables

Create a `.env` file with:

```env
# LinkedIn
LINKEDIN_USER=your_email
LINKEDIN_PASS=your_password

# Twitter/X (Puppeteer)
TWITTER_USER=your_email_or_phone
TWITTER_PASS=your_password

# Twitter/X (OAuth API)
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret

# TikTok
TIKTOK_USER=your_email
TIKTOK_PASS=your_password

# Reddit
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Chrome
CHROME_BIN=/usr/bin/chromium
```

## Troubleshooting

### Profile locked error
Run the deploy script - it automatically cleans lock files:
```bash
./deploy.sh
```

### Container won't start
```bash
docker-compose down
docker system prune -f
./deploy.sh --rebuild
```

### Out of disk space
```bash
docker system prune -a --volumes -f
```
