# Reddit Authentication Fix Guide

## Problem
The Reddit OAuth credentials are returning `401 Unauthorized`, preventing the bot from posting comments and refreshing tokens.

## Root Causes
1. Reddit app credentials are invalid or revoked
2. Reddit account password has changed
3. Reddit account has 2FA enabled (breaks password-based OAuth)
4. Reddit app was deleted

## Solution Options

### Option 1: Create New Reddit App (Recommended)

This allows automatic token refresh for long-running bots.

#### Step 1: Create Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Scroll to "developed applications"
3. Click "create app" or "create another app"
4. Fill in:
   - **Name**: `CommentBot` (or any name)
   - **App type**: Select "script"
   - **Description**: Leave blank or add description
   - **About URL**: Leave blank
   - **Redirect URI**: `http://localhost:8080`
5. Click "create app"

#### Step 2: Get Credentials

After creating the app, note down:
- **CLIENT_ID**: The string directly under "personal use script" (e.g., `ox_IpudOacNTrC68D7yZkw`)
- **CLIENT_SECRET**: The value next to "secret" (click to reveal)

#### Step 3: Check Reddit Account

**IMPORTANT**: Your Reddit account must NOT have 2FA (Two-Factor Authentication) enabled for password-based OAuth to work.

- Go to https://www.reddit.com/prefs/update/
- Check if 2FA is enabled
- If enabled, you must either:
  - Disable 2FA (not recommended for security)
  - Or use Option 2 below (manual token)

#### Step 4: Update Environment Variables

Create a `.env` file on your server at `/home/kanaparthi/n8n_comments_bots/.env`:

```bash
# Reddit OAuth Credentials (for auto-refresh)
REDDIT_CLIENT_ID=your_client_id_from_step2
REDDIT_CLIENT_SECRET=your_client_secret_from_step2
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# Optional: Initial access token (will be auto-refreshed)
REDDIT_ACCESS_TOKEN=
```

#### Step 5: Rebuild and Restart Docker

```bash
cd /home/kanaparthi/n8n_comments_bots
docker-compose down
docker-compose up -d --build
docker logs -f leadgen-comment-bot
```

The bot will now automatically refresh the Reddit token when it expires.

---

### Option 2: Use Manual Access Token (Quick Fix)

If you have 2FA enabled or want a quick test, you can manually get an access token. **Note**: These tokens expire after 1 hour.

#### Using the OAuth Helper (Easiest)

1. Go to https://not-an-aardvark.github.io/reddit-oauth-helper/
2. Check these scopes: `submit`, `edit`, `read`
3. Click "Generate Token"
4. Login to Reddit when prompted
5. Copy the access token shown

#### Using curl (Alternative)

```bash
curl -X POST -d 'grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD' \
  --user 'CLIENT_ID:CLIENT_SECRET' \
  https://www.reddit.com/api/v1/access_token
```

Replace:
- `YOUR_USERNAME`: Your Reddit username
- `YOUR_PASSWORD`: Your Reddit password
- `CLIENT_ID`: From your Reddit app
- `CLIENT_SECRET`: From your Reddit app

#### Add Token to .env

Create/update `.env` file:

```bash
REDDIT_ACCESS_TOKEN=your_generated_token_here
```

#### Restart Docker

```bash
docker-compose down
docker-compose up -d
```

**Limitation**: You'll need to manually refresh the token every hour.

---

## Testing the Fix

After updating credentials and restarting Docker:

```bash
# Check logs
docker logs -f leadgen-comment-bot

# Test Reddit comment
curl -X POST http://localhost:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.reddit.com/r/test/comments/any_post_id/",
    "comment": "Test comment"
  }'
```

You should see:
```
Token appears to be expired or invalid. Attempting to refresh...
Reddit access token refreshed successfully
```

Or if using manual token:
```
Comment posted successfully!
```

---

## Troubleshooting

### Still Getting 401 Error?

1. **Check Reddit App Type**: Must be "script" type, not "web app" or "installed app"
2. **Verify Credentials**: Double-check CLIENT_ID and CLIENT_SECRET are correct
3. **Check Username**: Use Reddit username (not email)
4. **Password**: Use Reddit password (not app-specific password)
5. **2FA**: If enabled, must use Option 2 (manual token) or disable 2FA

### Token Refresh Not Working?

1. Check Docker environment variables are loaded:
   ```bash
   docker exec leadgen-comment-bot env | grep REDDIT
   ```
2. Verify `.env` file exists on server
3. Make sure you rebuilt the container after updating `.env`

### How to Check if 2FA is Enabled?

```bash
# Login to Reddit
# Go to: https://www.reddit.com/prefs/update/
# Look for "two-factor authentication" section
```

---

## Recommended Setup

For production/long-running bots:
1. Use Option 1 (automatic token refresh)
2. Keep 2FA disabled on the bot account (use a dedicated bot account)
3. Set strong password for the bot account
4. Never share the credentials

For testing/development:
1. Use Option 2 (manual token)
2. Keep your main account secure with 2FA
3. Generate new token when needed

---

## Summary

The old credentials in the code are no longer valid. You need to either:

1. **Best option**: Create a new Reddit app + add credentials to `.env` → automatic token refresh
2. **Quick option**: Generate manual access token → expires in 1 hour

After updating, rebuild and restart Docker for changes to take effect.

