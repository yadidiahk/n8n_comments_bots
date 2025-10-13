#!/bin/bash

# Docker Stop Script for LeadGen Comment Bot
# This script stops and removes the Docker container

set -e  # Exit on error

echo "Stopping LeadGen Comment Bot..."
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    exit 1
fi

# Stop using docker-compose if docker-compose.yml exists
if [ -f docker-compose.yml ]; then
    echo "Using docker-compose to stop..."
    docker-compose down
else
    # Stop the standalone container
    if [ "$(docker ps -q -f name=leadgen-bot)" ]; then
        echo "Stopping container..."
        docker stop leadgen-bot
        docker rm leadgen-bot
        echo "Container stopped and removed."
    else
        echo "Container is not running."
    fi
fi

echo "Done!"

