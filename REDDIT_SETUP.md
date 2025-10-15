# Reddit Bot Setup Guide

## Overview

The Reddit bot has been fixed and is now properly integrated with `server.js`. It uses the official Reddit OAuth API for reliable and compliant comment posting.

## What Was Fixed

### Issues Found:
1. No export for `postRedditComment` function
2. Function took `thingId` instead of URL
3. Example code ran immediately on import
4. Missing URL parsing functionality
5. No proper error handling and response structure

### Changes Made:
1. Added `extractPostId()` to parse Reddit URLs
2. Exported `postRedditComment(postUrl, comment)` function
3. Added proper response structure matching test expectations
4. Added environment variable validation
5. Added comprehensive error handling
6. Made example code only run when file is executed directly

## Environment Variables Required

Add these to your `.env` file:

```env
# Reddit OAuth Access Token
REDDIT_ACCESS_TOKEN=your_reddit_oauth_access_token
```

## How to Get Reddit OAuth Access Token

### Option 1: Using Reddit's OAuth (Recommended)

1. **Create a Reddit App**:
   - Go to https://www.reddit.com/prefs/apps
   - Click "create app" or "create another app"
   - Choose "script" as the app type
   - Name: "MyRedditBot" (or any name)
   - Redirect URI: `http://localhost:8080`
   - Click "create app"

2. **Get Your Credentials**:
   - `CLIENT_ID`: The string under "personal use script"
   - `CLIENT_SECRET`: The "secret" field
   - `USERNAME`: Your Reddit username
   - `PASSWORD`: Your Reddit password

3. **Get Access Token**:
   ```bash
   # Using curl
   curl -X POST -d 'grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD' \
     --user 'CLIENT_ID:CLIENT_SECRET' \
     https://www.reddit.com/api/v1/access_token
   ```

   Or use a tool like `token.js` to automate this (create if needed).

### Option 2: Quick Test Token (Expires in 1 hour)

For quick testing, you can use Reddit's OAuth playground:
1. Go to https://not-an-aardvark.github.io/reddit-oauth-helper/
2. Select scopes: `submit`, `edit`
3. Click "Generate Token"
4. Copy the access token

## Usage

### Via API (server.js)

The Reddit bot is already integrated with `server.js`:

```bash
# Start the server
npm start

# Make a POST request
curl -X POST http://localhost:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.reddit.com/r/test/comments/abc123/title/",
    "comment": "Great post! Thanks for sharing."
  }'
```

### Via Test Script

```bash
node test_reddit.js
```

### Directly (CLI)

```bash
node reddit_bot.js
```

## Supported URL Formats

The bot automatically handles all Reddit URL formats:

- `https://www.reddit.com/r/subreddit/comments/POST_ID/title/`
- `https://old.reddit.com/r/subreddit/comments/POST_ID/title/`
- Direct post ID: `t3_POST_ID` or just `POST_ID`

## Response Format

**Success:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "postUrl": "https://www.reddit.com/r/test/comments/abc123/title/",
  "comment": "Your comment text",
  "commentId": "comment_id_from_reddit",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "postUrl": "https://www.reddit.com/r/test/comments/abc123/title/",
  "comment": "Your comment text"
}
```

## Token Management

### Access Token Expiration

Reddit OAuth access tokens expire after **1 hour**. You have two options:

1. **Manual Refresh**: Get a new token every hour
2. **Implement Refresh Token Flow**: Store refresh token and auto-renew

### Using Refresh Tokens (Recommended for Production)

If you need long-running automation, implement refresh token logic:

```javascript
async function refreshAccessToken() {
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  
  const data = await response.json();
  return data.access_token;
}
```

## Important Notes

1. **OAuth Approach**: Uses Reddit OAuth API (more reliable than web scraping)
2. **Rate Limits**: Reddit has rate limits - be mindful of request frequency
3. **User-Agent**: Required by Reddit API (already configured in bot)
4. **Permissions**: Token must have `submit` and `edit` scopes
5. **Token Expiry**: Access tokens expire after 1 hour

## Troubleshooting

### "REDDIT_ACCESS_TOKEN not found"
Add the token to your `.env` file:
```env
REDDIT_ACCESS_TOKEN=your_token_here
```

### "Invalid Reddit URL format"
Ensure your URL matches one of these formats:
- `https://www.reddit.com/r/subreddit/comments/POST_ID/...`
- `https://old.reddit.com/r/subreddit/comments/POST_ID/...`

### "401 Unauthorized" or Token Expired
Access tokens expire after 1 hour. Get a new token:
```bash
curl -X POST -d 'grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD' \
  --user 'CLIENT_ID:CLIENT_SECRET' \
  https://www.reddit.com/api/v1/access_token
```

### Rate Limiting
If you get rate limited, wait a few minutes before trying again. Reddit's rate limits are:
- 60 requests per minute for authenticated users
- Lower for unauthenticated requests

## Integration Status

The Reddit bot is now fully integrated with `server.js` and ready to use:
- ✅ Function exported correctly
- ✅ Import working in server.js
- ✅ No linting errors
- ✅ Matches expected response format
- ✅ URL parsing for all Reddit formats
- ✅ Proper error handling

## Environment Variables Summary

```env
# Required
REDDIT_ACCESS_TOKEN=your_reddit_oauth_access_token

# Optional (for auto-refresh implementation)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REFRESH_TOKEN=your_refresh_token
REDDIT_USERNAME=your_username
```

## Next Steps

1. **Create Reddit App**: https://www.reddit.com/prefs/apps
2. **Get Access Token**: Follow instructions above
3. **Add to .env**: `REDDIT_ACCESS_TOKEN=your_token`
4. **Test**: `node test_reddit.js` or use API endpoint
5. **Monitor**: Check token expiry and refresh as needed

The Reddit bot is ready to use once you configure the OAuth token!

