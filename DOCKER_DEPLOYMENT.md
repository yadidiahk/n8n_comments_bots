# Docker Deployment Guide

This guide will help you deploy the Lead Generation Comment Bot using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually comes with Docker Desktop)
- Your LinkedIn and YouTube credentials

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in the app directory:

```bash
cp env.template .env
```

Then edit the `.env` file with your actual credentials:

```env
LINKEDIN_USER=your_linkedin_email@example.com
LINKEDIN_PASS=your_linkedin_password
YOUTUBE_USER=your_youtube_email@example.com
YOUTUBE_PASS=your_youtube_password
PORT=3000
```

**IMPORTANT:** Never commit the `.env` file to version control!

### 2. Build and Run with Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Stop and remove volumes (clears browser profiles)
docker-compose down -v
```

### 3. Alternative: Build and Run with Docker CLI

```bash
# Build the image
docker build -t leadgen-bot .

# Run the container
docker run -d \
  --name leadgen-bot \
  -p 3000:3000 \
  -e LINKEDIN_USER="your_email@example.com" \
  -e LINKEDIN_PASS="your_password" \
  -e YOUTUBE_USER="your_youtube@example.com" \
  -e YOUTUBE_PASS="your_youtube_password" \
  --cap-add=SYS_ADMIN \
  leadgen-bot

# View logs
docker logs -f leadgen-bot

# Stop the container
docker stop leadgen-bot

# Remove the container
docker rm leadgen-bot
```

## Testing the Deployment

### 1. Check if the API is running

```bash
curl http://localhost:3000/health
```

You should see: `{"status":"healthy","timestamp":"..."}`

### 2. Test LinkedIn Comment Posting

```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:1234567890/",
    "comment": "Great post! Thanks for sharing."
  }'
```

### 3. Test YouTube Comment Posting

```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "comment": "Amazing video! Thanks for the content."
  }'
```

## Managing Browser Profiles

The Docker setup uses named volumes to persist browser profiles. This means:
- Login sessions are maintained across container restarts
- You won't need to re-authenticate every time

To clear browser profiles and force re-authentication:

```bash
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Chrome/Puppeteer Issues

If you encounter Chrome-related errors:

1. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

2. **Ensure SYS_ADMIN capability is added:**
   The container needs `SYS_ADMIN` capability to run Chrome's sandbox.

3. **Try running Chrome without sandbox (less secure):**
   Edit `bot.js` and `youtube_bot.js` to add:
   ```javascript
   args: [
     '--no-sandbox',
     '--disable-setuid-sandbox',
     // ... other args
   ]
   ```

### Memory Issues

Chrome can be memory-intensive. If you encounter out-of-memory errors:

```bash
# Increase Docker memory limit
docker run --memory="2g" ...
```

Or in `docker-compose.yml`:
```yaml
services:
  leadgen-bot:
    mem_limit: 2g
```

### Port Already in Use

If port 3000 is already in use:

1. Change the port in `.env`:
   ```env
   PORT=3001
   ```

2. Update the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3001"
   ```

### Verification/CAPTCHA Issues

If LinkedIn or YouTube asks for verification:

1. First run: The bot will wait 60 seconds for manual verification
2. Use browser profiles: Once authenticated, sessions are saved
3. Monitor logs: `docker-compose logs -f` to see when verification is needed

## Production Deployment

### Environment Variables via Secrets (More Secure)

Instead of using `.env` file, pass secrets directly:

```bash
docker run -d \
  --name leadgen-bot \
  -p 3000:3000 \
  -e LINKEDIN_USER="$(cat /run/secrets/linkedin_user)" \
  -e LINKEDIN_PASS="$(cat /run/secrets/linkedin_pass)" \
  --cap-add=SYS_ADMIN \
  leadgen-bot
```

### Behind a Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With HTTPS (Let's Encrypt)

Use a reverse proxy like Nginx or Traefik with Let's Encrypt integration.

## Monitoring

### Health Checks

The container includes a health check that pings `/health` endpoint every 30 seconds.

Check health status:
```bash
docker ps
# Look for "healthy" in STATUS column
```

### Resource Usage

```bash
docker stats leadgen-bot
```

## Scaling

To run multiple instances (e.g., for load balancing):

```bash
docker-compose up -d --scale leadgen-bot=3
```

Note: You'll need a load balancer (like Nginx) to distribute traffic.

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Security Best Practices

1. Never commit `.env` file
2. Use Docker secrets in production
3. Regularly update base images: `docker-compose pull`
4. Limit container resources: `mem_limit`, `cpus`
5. Run behind a reverse proxy with HTTPS
6. Monitor logs for suspicious activity

## Support

For issues or questions, check the logs first:
```bash
docker-compose logs -f
```

Common log patterns:
- `"Comment posted successfully!"` - Success
- `"Navigation timeout"` - Network/loading issues
- `"Login failed"` - Credential issues
- `"Comment box not found"` - Page structure changed

