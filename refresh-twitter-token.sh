#!/bin/bash

# Twitter OAuth Token Refresh Script
# Proactively refreshes token every 1 hour 45 minutes to keep it fresh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "🔄 Twitter Token Refresh"
echo "=========================================="
echo "Time: $(date)"
echo ""

# Check if tokens file exists
if [ ! -f "x_tokens.json" ]; then
    echo "❌ x_tokens.json not found. Run 'node twitter_bot.js auth' first."
    exit 1
fi

# Extract current expiry time
EXPIRES_AT=$(grep -o '"expires_at":[0-9]*' x_tokens.json | grep -o '[0-9]*')
CURRENT_TIME=$(date +%s)
TIME_LEFT=$((EXPIRES_AT - CURRENT_TIME))

echo "📊 Token Status:"
echo "   Current time:  $(date -d @$CURRENT_TIME 2>/dev/null || date -r $CURRENT_TIME)"
echo "   Expires at:    $(date -d @$EXPIRES_AT 2>/dev/null || date -r $EXPIRES_AT)"
echo "   Time left:     $((TIME_LEFT / 60)) minutes"
echo ""

# If token expires in less than 30 minutes, trigger refresh by making a test call
if [ $TIME_LEFT -lt 1800 ]; then
    echo "⚠️  Token expires soon. Triggering refresh via API call..."
    
    # Make a dummy API call to trigger auto-refresh
    # This will fail because the tweet URL is invalid, but it will refresh the token first
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/twitter/comment \
      -H "Content-Type: application/json" \
      -d '{"tweetUrl": "https://x.com/test/status/1", "comment": "token refresh test"}' || echo "call made")
    
    echo "   API call made (token should be refreshed)"
    
    # Check new expiry
    sleep 2
    NEW_EXPIRES_AT=$(grep -o '"expires_at":[0-9]*' x_tokens.json | grep -o '[0-9]*')
    
    if [ "$NEW_EXPIRES_AT" != "$EXPIRES_AT" ]; then
        echo "   ✅ Token refreshed successfully!"
        echo "   New expiry: $(date -d @$NEW_EXPIRES_AT 2>/dev/null || date -r $NEW_EXPIRES_AT)"
    else
        echo "   ℹ️  Token not refreshed (may still be valid)"
    fi
else
    echo "✅ Token still valid for $((TIME_LEFT / 60)) minutes"
    echo "   No refresh needed yet"
fi

echo ""
echo "=========================================="
echo "Done at $(date)"
echo "=========================================="

