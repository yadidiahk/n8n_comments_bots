#!/bin/bash

# Docker Build Script for LeadGen Comment Bot
# This script builds the Docker image for deployment

set -e  # Exit on error

echo "Building LeadGen Comment Bot Docker Image..."
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found!"
    echo "Creating .env from template..."
    if [ -f env.template ]; then
        cp env.template .env
        echo "Please edit .env file with your actual credentials before deploying."
        exit 1
    else
        echo "Error: env.template not found!"
        exit 1
    fi
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t leadgen-bot:latest .

echo ""
echo "Build completed successfully!"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file has the correct credentials"
echo "2. Run: docker-compose up -d"
echo "   OR"
echo "   Run: ./docker-run.sh"
echo ""

