#!/bin/bash

echo "=========================================="
echo "Deploying Profile Lock Fix"
echo "=========================================="
echo ""

# Step 1: Stop the container
echo "Step 1: Stopping container..."
docker-compose down
echo "✓ Container stopped"
echo ""

# Step 2: Kill any lingering Chrome processes (optional, but safe)
echo "Step 2: Cleaning up any lingering Chrome processes..."
docker-compose run --rm leadgen-comment-bot pkill -9 chromium || true
docker-compose run --rm leadgen-comment-bot pkill -9 chrome || true
echo "✓ Processes cleaned"
echo ""

# Step 3: Remove lock files from all profiles
echo "Step 3: Removing profile lock files..."
docker-compose run --rm leadgen-comment-bot sh -c "
  rm -f /app/twitter_profile/SingletonLock /app/twitter_profile/SingletonSocket /app/twitter_profile/SingletonCookie
  rm -f /app/twitter_profile/Default/SingletonLock /app/twitter_profile/Default/SingletonSocket /app/twitter_profile/Default/SingletonCookie
  rm -f /app/linkedin_profile/SingletonLock /app/linkedin_profile/SingletonSocket /app/linkedin_profile/SingletonCookie
  rm -f /app/linkedin_profile/Default/SingletonLock /app/linkedin_profile/Default/SingletonSocket /app/linkedin_profile/Default/SingletonCookie
  rm -f /app/tiktok_profile/SingletonLock /app/tiktok_profile/SingletonSocket /app/tiktok_profile/SingletonCookie
  rm -f /app/tiktok_profile/Default/SingletonLock /app/tiktok_profile/Default/SingletonSocket /app/tiktok_profile/Default/SingletonCookie
  echo 'Lock files removed'
" || echo "⚠ Cleanup failed (container may not be running yet)"
echo "✓ Lock files removed"
echo ""

# Step 4: Rebuild with new code
echo "Step 4: Rebuilding Docker image with fixed code..."
docker-compose build --no-cache
echo "✓ Image rebuilt"
echo ""

# Step 5: Start the container
echo "Step 5: Starting container with new code..."
docker-compose up -d
echo "✓ Container started"
echo ""

# Step 6: Show logs
echo "Step 6: Showing logs (Ctrl+C to exit)..."
echo "=========================================="
echo ""
sleep 3
docker-compose logs -f

