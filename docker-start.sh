#!/bin/bash

echo "LinkedIn Bot API - Docker Deployment"
echo "====================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo ".env file created!"
        echo ""
        echo "IMPORTANT: Please edit .env and add your LinkedIn credentials:"
        echo "  nano .env"
        echo ""
        echo "Then run this script again."
        exit 1
    else
        echo "Error: env.example not found!"
        exit 1
    fi
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Building and starting Docker container..."
echo ""

# Stop any existing container
docker-compose down 2>/dev/null

# Build and start
docker-compose up -d --build

echo ""
echo "Waiting for container to start..."
sleep 5

# Check if container is running
if [ "$(docker-compose ps -q linkedin-bot)" ]; then
    echo ""
    echo "✓ Container is running!"
    echo ""
    echo "API is available at: http://localhost:3000"
    echo ""
    echo "Useful commands:"
    echo "  View logs:       docker-compose logs -f"
    echo "  Stop container:  docker-compose down"
    echo "  Restart:         docker-compose restart"
    echo ""
    echo "Testing the API..."
    sleep 2
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl http://localhost:3000/health
    echo ""
    echo ""
    echo "Your API is ready! Use this URL in n8n:"
    echo "  http://localhost:3000/api/linkedin/comment"
    echo ""
else
    echo ""
    echo "Error: Container failed to start!"
    echo "Checking logs..."
    docker-compose logs
fi

