# Docker Quick Start Guide

Quick reference for deploying the LeadGen Comment Bot with Docker.

## Setup (One-time)

```bash
# 1. Create your environment file
cp env.template .env

# 2. Edit .env with your credentials
nano .env  # or use any text editor

# 3. Make scripts executable (already done)
chmod +x docker-*.sh
```

## Deploy Using Docker Compose (Recommended)

```bash
# Start the bot
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down
```

## Deploy Using Shell Scripts

```bash
# Build the Docker image
./docker-build.sh

# Run the container
./docker-run.sh

# Stop the container
./docker-stop.sh

# View logs
docker logs -f leadgen-bot
```

## Deploy Manually

```bash
# Build
docker build -t leadgen-bot .

# Run
docker run -d \
  --name leadgen-bot \
  -p 3000:3000 \
  -e LINKEDIN_USER="your_email@example.com" \
  -e LINKEDIN_PASS="your_password" \
  -e YOUTUBE_USER="your_youtube@example.com" \
  -e YOUTUBE_PASS="your_youtube_password" \
  --cap-add=SYS_ADMIN \
  leadgen-bot

# Stop
docker stop leadgen-bot && docker rm leadgen-bot
```

## Test the API

```bash
# Health check
curl http://localhost:3000/health

# Post a LinkedIn comment
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:YOUR_POST_ID/",
    "comment": "Great post!"
  }'

# Post a YouTube comment
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "comment": "Amazing content!"
  }'
```

## Troubleshooting

### View Logs
```bash
docker-compose logs -f
# or
docker logs -f leadgen-bot
```

### Restart Container
```bash
docker-compose restart
# or
docker restart leadgen-bot
```

### Clear Browser Profiles (Force Re-login)
```bash
docker-compose down -v
docker-compose up -d
```

### Check Container Status
```bash
docker ps
# Should show "healthy" status
```

## File Structure

```
app/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from image
├── env.template           # Environment variables template
├── docker-build.sh        # Build script
├── docker-run.sh          # Run script
├── docker-stop.sh         # Stop script
├── DOCKER_DEPLOYMENT.md   # Full deployment guide
└── DOCKER_QUICK_START.md  # This file
```

## Need More Help?

See `DOCKER_DEPLOYMENT.md` for comprehensive documentation including:
- Production deployment
- Security best practices
- Advanced configuration
- Troubleshooting guide

