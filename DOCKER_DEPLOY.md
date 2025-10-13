# Docker Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker installed on your machine
- Docker Compose installed (usually comes with Docker Desktop)

## Local Development with Docker

### 1. Build and Run with Docker Compose (Easiest)

```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app

# Create .env file
cp env.example .env
# Edit .env with your LinkedIn credentials

# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The API will be available at `http://localhost:3000`

### 2. Build and Run with Docker Commands

```bash
# Build the image
docker build -t linkedin-bot-api .

# Run the container
docker run -d \
  --name linkedin-bot \
  -p 3000:3000 \
  -e LINKEDIN_USER="your_email@example.com" \
  -e LINKEDIN_PASS="your_password" \
  -e PORT=3000 \
  --shm-size=2gb \
  -v $(pwd)/linkedin_profile:/app/linkedin_profile \
  linkedin-bot-api

# View logs
docker logs -f linkedin-bot

# Stop the container
docker stop linkedin-bot
docker rm linkedin-bot
```

## Test Your Docker Container

```bash
# Health check
curl http://localhost:3000/health

# Test the API
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/posts/username-activity-123456/",
    "comment": "Great post!"
  }'
```

## Deploy to Cloud with Docker

### Option 1: Deploy to AWS ECS

1. **Push to Amazon ECR**:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name linkedin-bot-api --region us-east-1

# Tag image
docker tag linkedin-bot-api:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/linkedin-bot-api:latest

# Push image
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/linkedin-bot-api:latest
```

2. **Create ECS Task Definition** (via AWS Console):
   - Go to ECS → Task Definitions → Create new
   - Select Fargate
   - Add container with your ECR image URL
   - Set environment variables: `LINKEDIN_USER`, `LINKEDIN_PASS`, `PORT`
   - Allocate 2GB memory, 1 vCPU
   - Port mapping: 3000

3. **Create ECS Service**:
   - Go to your ECS Cluster
   - Create Service with your task definition
   - Configure load balancer (optional)
   - Set desired tasks: 1

### Option 2: Deploy to DigitalOcean App Platform

1. **Push to Docker Hub**:
```bash
# Login to Docker Hub
docker login

# Tag image
docker tag linkedin-bot-api:latest your-dockerhub-username/linkedin-bot-api:latest

# Push image
docker push your-dockerhub-username/linkedin-bot-api:latest
```

2. **Deploy on DigitalOcean**:
   - Go to DigitalOcean App Platform
   - Create New App → Docker Hub
   - Connect your Docker Hub account
   - Select your image: `your-dockerhub-username/linkedin-bot-api:latest`
   - Add environment variables
   - Deploy

### Option 3: Deploy to Google Cloud Run

```bash
# Build for Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/linkedin-bot-api

# Deploy to Cloud Run
gcloud run deploy linkedin-bot-api \
  --image gcr.io/YOUR_PROJECT_ID/linkedin-bot-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars LINKEDIN_USER=your_email@example.com,LINKEDIN_PASS=your_password,PORT=3000
```

### Option 4: Deploy to Railway with Docker

1. Create `railway.toml`:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
```

2. Deploy:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set LINKEDIN_USER=your_email@example.com
railway variables set LINKEDIN_PASS=your_password

# Deploy
railway up
```

### Option 5: Deploy to Render with Docker

1. Connect your GitHub repository to Render

2. Create new Web Service:
   - Environment: Docker
   - Dockerfile path: `app/Dockerfile`
   - Add environment variables

3. Deploy

### Option 6: Deploy to Your Own VPS with Docker

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone your repository
git clone your-repo-url
cd your-repo/app

# Create .env file
cat > .env << EOF
LINKEDIN_USER=your_email@example.com
LINKEDIN_PASS=your_password
PORT=3000
EOF

# Start the application
docker-compose up -d

# Set up auto-restart on system reboot
docker update --restart unless-stopped linkedin-bot-api

# Set up Nginx reverse proxy (optional)
apt-get install nginx
cat > /etc/nginx/sites-available/linkedin-bot << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/linkedin-bot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Install SSL certificate (optional)
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Docker Hub Deployment (Recommended for Production)

### 1. Create Automated Build

1. Push your code to GitHub
2. Connect GitHub to Docker Hub
3. Create Automated Build
4. Set build rules:
   - Source: `main` branch
   - Docker Tag: `latest`
   - Dockerfile location: `app/Dockerfile`
   - Build Context: `/app`

### 2. Use in Production

```bash
docker pull your-dockerhub-username/linkedin-bot-api:latest
docker run -d \
  --name linkedin-bot \
  -p 3000:3000 \
  -e LINKEDIN_USER="your_email" \
  -e LINKEDIN_PASS="your_password" \
  --shm-size=2gb \
  --restart unless-stopped \
  your-dockerhub-username/linkedin-bot-api:latest
```

## Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  linkedin-bot:
    image: your-dockerhub-username/linkedin-bot-api:latest
    container_name: linkedin-bot-api
    restart: always
    ports:
      - "3000:3000"
    environment:
      - LINKEDIN_USER=${LINKEDIN_USER}
      - LINKEDIN_PASS=${LINKEDIN_PASS}
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - linkedin_profile:/app/linkedin_profile
    security_opt:
      - seccomp:unconfined
    shm_size: 2gb
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  linkedin_profile:
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs linkedin-bot-api
docker logs -f linkedin-bot-api  # Follow logs

# Execute command in container
docker exec -it linkedin-bot-api /bin/bash

# Restart container
docker restart linkedin-bot-api

# Stop container
docker stop linkedin-bot-api

# Remove container
docker rm linkedin-bot-api

# Remove image
docker rmi linkedin-bot-api

# View resource usage
docker stats linkedin-bot-api

# Inspect container
docker inspect linkedin-bot-api

# Clean up unused resources
docker system prune -a
```

## Troubleshooting

### Container Exits Immediately
```bash
# Check logs
docker logs linkedin-bot-api

# Common issues:
# 1. Missing environment variables
# 2. Port already in use
# 3. Puppeteer can't launch Chrome
```

### Puppeteer Issues in Docker
```bash
# Increase shared memory
docker run --shm-size=2gb ...

# Or use disable-dev-shm-usage flag (already added in bot.js)
```

### Permission Issues
```bash
# Run with proper permissions
docker run --user $(id -u):$(id -g) ...

# Or fix permissions in Dockerfile
RUN chown -R node:node /app
USER node
```

### Memory Issues
```bash
# Increase container memory
docker run -m 2g ...

# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G
```

## Monitoring with Docker

### Using Watchtower (Auto-updates)
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  linkedin-bot-api
```

### Using Portainer (Web UI)
```bash
docker volume create portainer_data
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

Access Portainer at `http://localhost:9000`

## n8n Integration

Once deployed, use your Docker container's URL in n8n:

**HTTP Request Node:**
- Method: POST
- URL: `http://your-server-ip:3000/api/linkedin/comment`
- Body:
```json
{
  "postUrl": "{{ $json.postUrl }}",
  "comment": "{{ $json.comment }}"
}
```

If using a reverse proxy with SSL:
- URL: `https://your-domain.com/api/linkedin/comment`

## Security Best Practices

1. **Never include .env in image**:
   - Use .dockerignore
   - Pass environment variables at runtime

2. **Use secrets management**:
   - Docker secrets (Swarm mode)
   - Cloud provider secrets (AWS Secrets Manager, etc.)

3. **Run as non-root user**:
```dockerfile
USER node
```

4. **Keep images updated**:
```bash
docker pull node:20-slim
docker build --no-cache -t linkedin-bot-api .
```

5. **Scan for vulnerabilities**:
```bash
docker scan linkedin-bot-api
```

## Cost Estimates with Docker

- **Self-hosted VPS**: $5-10/month (DigitalOcean, Linode)
- **AWS ECS Fargate**: ~$15/month (with minimal usage)
- **Google Cloud Run**: Pay per request (~$5-10/month)
- **Railway**: $5-10/month
- **Render**: Free tier available, then $7/month

## Conclusion

Docker provides the best deployment experience:
- Consistent across all environments
- Easy to scale
- Works on any cloud provider
- Includes all dependencies
- Isolated and secure

Start with `docker-compose up -d` locally, then deploy to your preferred cloud provider!

