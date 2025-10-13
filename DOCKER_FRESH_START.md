# Docker Fresh Start Guide

## Quick Start (Automated)

### 1. Start Docker Desktop First
- Open Docker Desktop application
- Wait until the Docker icon in menu bar is steady (not animated)

### 2. Run the Cleanup Script
```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app
./docker-clean-rebuild.sh
```

This script will:
- Stop all containers
- Remove old images
- Clean up unused resources
- Rebuild from scratch
- Start the container
- Show logs

---

## Manual Steps (If You Prefer)

### 1. Start Docker Desktop
Make sure Docker Desktop is running.

### 2. Check Docker is Running
```bash
docker ps
```

### 3. Stop and Remove Current Container
```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app
docker-compose down
```

### 4. Remove All LinkedIn Bot Images
```bash
docker rmi app-linkedin-bot -f
docker rmi $(docker images | grep linkedin) -f
```

### 5. Clean Up Everything
```bash
# Remove stopped containers
docker container prune -f

# Remove dangling images
docker image prune -f

# Remove unused volumes (WARNING: deletes saved login)
docker volume prune -f

# Remove unused networks
docker network prune -f
```

### 6. Verify Everything is Clean
```bash
docker ps -a
docker images
```

### 7. Rebuild from Scratch
```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app
docker-compose build --no-cache
```

### 8. Start Fresh Container
```bash
docker-compose up -d
```

### 9. Check Status
```bash
docker-compose ps
docker-compose logs -f
```

### 10. Test the API
```bash
curl http://localhost:3000/health
```

---

## Environment Setup

Make sure you have your LinkedIn credentials set:

### Option 1: Using .env file
Create a `.env` file in the `/app` directory:
```
LINKEDIN_USER=your_email@example.com
LINKEDIN_PASS=your_password
PORT=3000
```

### Option 2: Export in terminal (temporary)
```bash
export LINKEDIN_USER="your_email@example.com"
export LINKEDIN_PASS="your_password"
```

---

## Testing After Fresh Start

### 1. Check Health
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T..."
}
```

### 2. Test Comment Posting
```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/posts/...",
    "comment": "Great insights! Thanks for sharing."
  }'
```

Or use Postman:
- **URL:** `http://localhost:3000/api/linkedin/comment`
- **Method:** POST
- **Headers:** Content-Type: application/json
- **Body:**
  ```json
  {
    "postUrl": "YOUR_LINKEDIN_POST_URL",
    "comment": "Your comment text"
  }
  ```

---

## Troubleshooting

### Docker Won't Start
- Check if Docker Desktop is running
- Restart Docker Desktop
- Check system resources (RAM, disk space)

### Build Fails
```bash
# Check Docker logs
docker-compose logs

# Try pulling base image first
docker pull node:20-slim

# Rebuild
docker-compose build --no-cache
```

### Container Exits Immediately
```bash
# Check logs
docker-compose logs

# Common issues:
# - Missing environment variables
# - Port 3000 already in use
# - Insufficient memory
```

### LinkedIn Login Issues
- First run requires manual login verification
- Profile is saved in `./linkedin_profile` folder
- Delete this folder to force fresh login:
  ```bash
  rm -rf linkedin_profile
  docker-compose restart
  ```

### Comment Box Not Found
- Check `comment-box-not-found.png` screenshot
- LinkedIn UI may have changed
- May require manual verification/CAPTCHA
- Try with a different post URL

---

## Quick Reference Commands

```bash
# View logs
docker-compose logs -f

# Restart container
docker-compose restart

# Stop container
docker-compose down

# Start container
docker-compose up -d

# Rebuild and restart
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# View container status
docker-compose ps

# Execute command in container
docker-compose exec linkedin-bot sh

# View resource usage
docker stats
```

