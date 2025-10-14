#!/bin/bash

# Docker Run Script for LeadGen Comment Bot
# This script runs the Docker container with proper configuration

set -e  # Exit on error

echo "Starting LeadGen Comment Bot..."
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env file from env.template and add your credentials."
    exit 1
fi

# Load environment variables from .env
export $(cat .env | grep -v '^#' | xargs)

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=leadgen-bot)" ]; then
    echo "Stopping existing container..."
    docker stop leadgen-bot 2>/dev/null || true
    docker rm leadgen-bot 2>/dev/null || true
fi

# Run the container
echo "Starting new container..."
docker run -d \
  --name leadgen-bot \
  -p ${PORT:-3000}:${PORT:-3000} \
  -e LINKEDIN_USER="${LINKEDIN_USER}" \
  -e LINKEDIN_PASS="${LINKEDIN_PASS}" \
  -e YOUTUBE_USER="${YOUTUBE_USER}" \
  -e YOUTUBE_PASS="${YOUTUBE_PASS}" \
  -e PORT="${PORT:-3000}" \
  -e NODE_ENV=production \
  -v leadgen_linkedin:/app/linkedin_profile \
  -v leadgen_youtube:/app/youtube_profile \
  -v leadgen_tiktok:/app/tiktok_profile \
  --cap-add=SYS_ADMIN \
  --restart unless-stopped \
  leadgen-bot:latest

echo ""
echo "Container started successfully!"
echo ""
echo "API is running at: http://localhost:${PORT:-3000}"
echo ""
echo "To view logs:"
echo "  docker logs -f leadgen-bot"
echo ""
echo "To stop the container:"
echo "  docker stop leadgen-bot"
echo ""


