#!/bin/bash

echo "==========================================="
echo "Reddit Authentication Quick Fix"
echo "==========================================="
echo ""
echo "The old Reddit credentials are invalid (401 error)."
echo "You have 2 options:"
echo ""
echo "OPTION 1: Get Manual Access Token (Quick - expires in 1 hour)"
echo "  1. Visit: https://not-an-aardvark.github.io/reddit-oauth-helper/"
echo "  2. Check: submit, edit, read"
echo "  3. Click 'Generate Token'"
echo "  4. Copy the token"
echo ""
echo "OPTION 2: Create New Reddit App (Best - auto-refresh)"
echo "  1. Visit: https://www.reddit.com/prefs/apps"
echo "  2. Create 'script' type app"
echo "  3. Get CLIENT_ID and CLIENT_SECRET"
echo ""
read -p "Which option? (1 or 2): " option

if [ "$option" = "1" ]; then
    echo ""
    echo "Open this URL in your browser:"
    echo "https://not-an-aardvark.github.io/reddit-oauth-helper/"
    echo ""
    read -p "Paste the access token here: " token
    
    # Create .env file with the token
    cat > .env << EOF
# Reddit Access Token (expires in 1 hour)
REDDIT_ACCESS_TOKEN=$token

# Add your other credentials here:
# LINKEDIN_USER=
# LINKEDIN_PASS=
# YOUTUBE_CLIENT_ID=
# YOUTUBE_CLIENT_SECRET=
# X_CLIENT_ID=
# X_CLIENT_SECRET=
# TIKTOK_USER=
# TIKTOK_PASS=
PORT=3000
EOF
    
    echo ""
    echo "✓ .env file created with access token"
    echo ""

elif [ "$option" = "2" ]; then
    echo ""
    echo "Go to: https://www.reddit.com/prefs/apps"
    echo "Create a 'script' type app"
    echo ""
    read -p "Enter CLIENT_ID: " client_id
    read -p "Enter CLIENT_SECRET: " client_secret
    read -p "Enter Reddit USERNAME: " username
    read -sp "Enter Reddit PASSWORD: " password
    echo ""
    
    # Create .env file with credentials
    cat > .env << EOF
# Reddit OAuth Credentials (auto-refresh)
REDDIT_CLIENT_ID=$client_id
REDDIT_CLIENT_SECRET=$client_secret
REDDIT_USERNAME=$username
REDDIT_PASSWORD=$password

# Add your other credentials here:
# LINKEDIN_USER=
# LINKEDIN_PASS=
# YOUTUBE_CLIENT_ID=
# YOUTUBE_CLIENT_SECRET=
# X_CLIENT_ID=
# X_CLIENT_SECRET=
# TIKTOK_USER=
# TIKTOK_PASS=
PORT=3000
EOF
    
    echo ""
    echo "✓ .env file created with OAuth credentials"
    echo ""
else
    echo "Invalid option"
    exit 1
fi

echo "==========================================="
echo "Next Steps:"
echo "==========================================="
echo "1. If on server, copy .env file to server:"
echo "   scp .env your-server:/path/to/app/"
echo ""
echo "2. Rebuild Docker container:"
echo "   docker-compose down"
echo "   docker-compose up -d --build"
echo ""
echo "3. Check logs:"
echo "   docker logs -f leadgen-comment-bot"
echo ""
echo "See REDDIT_AUTH_FIX.md for detailed instructions"
echo "==========================================="

