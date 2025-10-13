#!/bin/bash

echo "============================================"
echo "Docker Complete Cleanup and Rebuild Script"
echo "============================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running!"
    echo "Please start Docker Desktop first, then run this script again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Stop all containers
echo "📦 Stopping all containers..."
docker-compose down 2>/dev/null || true

# Remove specific container if it exists
echo "🗑️  Removing linkedin-bot container..."
docker rm -f linkedin-bot-api 2>/dev/null || true

# Remove all stopped containers
echo "🗑️  Removing all stopped containers..."
docker container prune -f

# Remove the specific image
echo "🗑️  Removing linkedin-bot images..."
docker rmi app-linkedin-bot 2>/dev/null || true
docker rmi $(docker images | grep linkedin-bot | awk '{print $3}') 2>/dev/null || true

# Remove dangling images
echo "🗑️  Removing dangling images..."
docker image prune -f

# Remove volumes (optional - this will delete your browser profile)
echo "⚠️  WARNING: Removing volumes will delete your saved LinkedIn login!"
read -p "Do you want to remove volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing volumes..."
    docker volume prune -f
else
    echo "⏭️  Skipping volume removal (LinkedIn profile will be preserved)"
fi

# Remove networks
echo "🗑️  Removing unused networks..."
docker network prune -f

echo ""
echo "============================================"
echo "Cleanup Complete! Now rebuilding..."
echo "============================================"
echo ""

# Build fresh image
echo "🔨 Building new Docker image (this will take a few minutes)..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "============================================"
    echo "Starting container..."
    echo "============================================"
    echo ""
    
    # Start the container
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Container started successfully!"
        echo ""
        echo "============================================"
        echo "Container Status:"
        echo "============================================"
        docker-compose ps
        echo ""
        echo "============================================"
        echo "Viewing logs (press Ctrl+C to exit):"
        echo "============================================"
        echo ""
        sleep 2
        docker-compose logs -f
    else
        echo ""
        echo "❌ Failed to start container"
        exit 1
    fi
else
    echo ""
    echo "❌ Build failed"
    exit 1
fi

