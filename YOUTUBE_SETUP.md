# YouTube Bot Setup Guide

## Overview

The YouTube bot has been fixed and is now ready to use with `server.js`. It uses the official YouTube Data API v3 with OAuth2 authentication (more reliable and compliant with YouTube's Terms of Service).

## What Was Fixed

### Issues Found:
1. **Line 16-18**: `PROCESS.ENV` was incorrect (should be `process.env`)
2. Used CommonJS (`require`) instead of ES modules (`import`)
3. Missing export for `postYouTubeComment` function
4. Function name mismatch (`postYoutubeComment` vs `postYouTubeComment`)
5. Missing `node-fetch` dependency (now using native fetch)

### Changes Made:
1. Converted to ES modules syntax (import/export)
2. Fixed environment variable references (`process.env`)
3. Added proper export for `postYouTubeComment` function
4. Added video ID extraction from various YouTube URL formats
5. Updated return structure to match test expectations
6. Removed dependency on `node-fetch` (using native fetch)

## Environment Variables Required

Add these to your `.env` file:

```env
# YouTube API Credentials (OAuth2)
CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=http://localhost:3000/oauth2callback
```

## How to Get YouTube API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
7. Copy the `CLIENT_ID` and `CLIENT_SECRET` to your `.env` file

## Initial Authorization (One-Time Setup)

Before using the bot, you need to authorize it:

```bash
node youtube_bot.js auth
```

This will:
1. Open your browser to Google's OAuth consent page
2. Ask you to grant YouTube commenting permissions
3. Save the access and refresh tokens to `youtube_tokens.json`
4. Automatically refresh tokens when they expire

## Usage

### Via API (server.js)

The YouTube bot is already integrated with `server.js`:

```bash
# Start the server
npm start

# Make a POST request
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "comment": "Great video!"
  }'
```

### Via Test Script

```bash
node test_youtube.js
```

### Directly (CLI)

```bash
# First authorize
node youtube_bot.js auth

# Then post comments
node youtube_bot.js post
```

## Supported URL Formats

The bot automatically handles all YouTube URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`
- Direct video ID: `VIDEO_ID`

## Response Format

**Success:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "comment": "Your comment text",
  "commentId": "comment_id_from_youtube",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "comment": "Your comment text"
}
```

## Token Management

- Tokens are saved to `youtube_tokens.json`
- Access tokens expire after 1 hour
- Refresh tokens are used to get new access tokens automatically
- No need to re-authorize unless refresh token is revoked

## Important Notes

1. **OAuth vs Puppeteer**: This bot uses OAuth (not Puppeteer like other bots) for better reliability
2. **Rate Limits**: YouTube API has quota limits (default: 10,000 units/day)
3. **Comments Cost**: Each comment costs 50 quota units
4. **Permissions**: Requires `youtube.force-ssl` scope for commenting

## Troubleshooting

### "No tokens found. Please authorize first."
Run: `node youtube_bot.js auth`

### "Invalid YouTube URL format"
Check that your URL matches one of the supported formats above

### "Access token expired"
The bot automatically refreshes tokens. If this persists, re-authorize:
```bash
rm youtube_tokens.json
node youtube_bot.js auth
```

### Quota Exceeded
Wait until the next day or request quota increase from Google Cloud Console

## Integration Status

The YouTube bot is now fully integrated with `server.js` and ready to use:
- Function exported correctly
- Import working in server.js
- No linting errors
- Matches expected response format

