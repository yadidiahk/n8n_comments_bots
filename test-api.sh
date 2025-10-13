#!/bin/bash

echo "Testing LinkedIn Bot API..."
echo ""

API_URL="${1:-http://localhost:3000}"

echo "1. Testing health endpoint..."
curl -s "${API_URL}/health" | jq .
echo ""

echo "2. Testing root endpoint..."
curl -s "${API_URL}/" | jq .
echo ""

echo "3. Testing comment endpoint (you need to provide postUrl and comment)..."
echo "Example usage:"
echo "curl -X POST ${API_URL}/api/linkedin/comment \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"postUrl\": \"YOUR_LINKEDIN_POST_URL\", \"comment\": \"Your comment here\"}'"
echo ""

echo "Done! API is ready to use with n8n."

