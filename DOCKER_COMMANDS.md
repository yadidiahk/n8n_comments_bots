# Docker Quick Commands Reference

## Local Development

### Start Everything
```bash
./docker-start.sh
```

### Manual Control
```bash
# Build and start
docker-compose up -d --build

# View logs (follow mode)
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### Testing
```bash
# Health check
curl http://localhost:3000/health

# Post a comment
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/posts/...",
    "comment": "Your comment here"
  }'
```

## Deploy to Cloud

### Push to Docker Hub
```bash
# Login
docker login

# Tag
docker tag linkedin-bot-api:latest YOUR_USERNAME/linkedin-bot-api:latest

# Push
docker push YOUR_USERNAME/linkedin-bot-api:latest
```

### Deploy to VPS
```bash
# SSH to your server
ssh user@your-server-ip

# Install Docker (if needed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone your repo
git clone your-repo-url
cd your-repo/app

# Create .env
nano .env

# Start
docker-compose up -d

# Done! Access at http://your-server-ip:3000
```

### Deploy to AWS ECS
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create repo
aws ecr create-repository --repository-name linkedin-bot-api

# Tag and push
docker tag linkedin-bot-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/linkedin-bot-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/linkedin-bot-api:latest

# Create task definition and service via AWS Console
```

### Deploy to Google Cloud Run
```bash
# Build and submit
gcloud builds submit --tag gcr.io/PROJECT_ID/linkedin-bot-api

# Deploy
gcloud run deploy linkedin-bot-api \
  --image gcr.io/PROJECT_ID/linkedin-bot-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars LINKEDIN_USER=email,LINKEDIN_PASS=pass
```

## Debugging

```bash
# Check if running
docker ps

# View logs
docker logs linkedin-bot-api
docker-compose logs -f

# Enter container shell
docker exec -it linkedin-bot-api /bin/bash

# Check resource usage
docker stats linkedin-bot-api

# Inspect container
docker inspect linkedin-bot-api
```

## Cleanup

```bash
# Stop and remove
docker-compose down

# Remove volumes too
docker-compose down -v

# Remove image
docker rmi linkedin-bot-api

# Clean up everything
docker system prune -a
```

## Production Tips

```bash
# Always run detached
docker-compose up -d

# Auto-restart on crashes
docker-compose up -d --restart unless-stopped

# Monitor logs
docker-compose logs -f --tail=100

# Update to latest
git pull
docker-compose down
docker-compose up -d --build
```

## n8n Integration URL

Once deployed, use in n8n HTTP Request node:

**Local:**
```
http://localhost:3000/api/linkedin/comment
```

**VPS:**
```
http://YOUR_SERVER_IP:3000/api/linkedin/comment
```

**With Domain:**
```
https://your-domain.com/api/linkedin/comment
```

## Environment Variables

Required in `.env` or docker-compose:
- `LINKEDIN_USER` - Your LinkedIn email
- `LINKEDIN_PASS` - Your LinkedIn password
- `PORT` - API port (default: 3000)

