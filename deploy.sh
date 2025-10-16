#!/bin/bash

echo "=========================================="
echo "🚀 Complete Deployment Script"
echo "=========================================="
echo ""

cd ~/n8n_comments_bots || { echo "Error: Directory not found"; exit 1; }

# Step 1: Stop container
echo "Step 1: Stopping container..."
docker-compose down
echo "✓ Container stopped"
echo ""

# Step 2: Clean up profile lock files on HOST
echo "Step 2: Cleaning profile lock files..."
rm -f twitter_profile/SingletonLock twitter_profile/SingletonSocket twitter_profile/SingletonCookie 2>/dev/null
rm -f twitter_profile/Default/SingletonLock twitter_profile/Default/SingletonSocket twitter_profile/Default/SingletonCookie 2>/dev/null
rm -f linkedin_profile/SingletonLock linkedin_profile/SingletonSocket linkedin_profile/SingletonCookie 2>/dev/null
rm -f linkedin_profile/Default/SingletonLock linkedin_profile/Default/SingletonSocket linkedin_profile/Default/SingletonCookie 2>/dev/null
rm -f tiktok_profile/SingletonLock tiktok_profile/SingletonSocket tiktok_profile/SingletonCookie 2>/dev/null
rm -f tiktok_profile/Default/SingletonLock tiktok_profile/Default/SingletonSocket tiktok_profile/Default/SingletonCookie 2>/dev/null
rm -f reddit_profile/SingletonLock reddit_profile/SingletonSocket reddit_profile/SingletonCookie 2>/dev/null
rm -f reddit_profile/Default/SingletonLock reddit_profile/Default/SingletonSocket reddit_profile/Default/SingletonCookie 2>/dev/null
echo "✓ Lock files removed"
echo ""

# Step 3: Check if rebuild is needed
echo "Step 3: Checking if Docker rebuild is needed..."
if [ "$1" == "--rebuild" ]; then
    echo "Rebuilding Docker image..."
    docker-compose build --no-cache
    echo "✓ Image rebuilt"
else
    echo "Skipping rebuild (use --rebuild flag to rebuild)"
fi
echo ""

# Step 4: Start container
echo "Step 4: Starting container..."
docker-compose up -d
echo "✓ Container started"
echo ""

# Step 5: Show status
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Container status:"
docker-compose ps
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop with: docker-compose down"
echo ""
echo "API Endpoints:"
echo "  - API: http://localhost:3000"
echo "  - VNC: http://localhost:6080/vnc.html"
echo ""

