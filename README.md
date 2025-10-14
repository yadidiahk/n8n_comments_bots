# Social Media Comment Bot API

A Node.js Express API for automating comments on LinkedIn, YouTube, Reddit, and Twitter/X using Puppeteer.

## Features

- ✅ Post comments on LinkedIn posts
- ✅ Post comments on YouTube videos (including Shorts)
- ✅ Post comments on Reddit posts
- ✅ Post replies on Twitter/X tweets
- ✅ Support for all YouTube URL formats
- ✅ Persistent browser sessions (stay logged in)
- ✅ Automatic error handling with screenshots
- ✅ RESTful API interface
- ✅ Environment variable configuration

## Supported YouTube URL Formats

The bot automatically detects and handles all YouTube URL formats:

- **Standard**: `https://www.youtube.com/watch?v=VIDEO_ID`
- **Shortened**: `https://youtu.be/VIDEO_ID`
- **Shorts**: `https://www.youtube.com/shorts/VIDEO_ID`
- **Mobile**: `https://m.youtube.com/watch?v=VIDEO_ID`
- **Embed**: `https://www.youtube.com/embed/VIDEO_ID`
- **Old Format**: `https://www.youtube.com/v/VIDEO_ID`

## Quick Start

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Configure Credentials

Create a `.env` file in the `app` directory:

```env
# LinkedIn Credentials
LINKEDIN_USER=your_linkedin_email@example.com
LINKEDIN_PASS=your_linkedin_password

# YouTube Credentials  
YOUTUBE_USER=your_youtube_email@gmail.com
YOUTUBE_PASS=your_youtube_password

# Reddit Credentials
REDDIT_USER=your_reddit_username
REDDIT_PASS=your_reddit_password

# Twitter/X Credentials
TWITTER_USER=your_twitter_username_or_email
TWITTER_PASS=your_twitter_password

# Server Port (optional)
PORT=3000
```

### 3. Start the Server

```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Get API Information

```http
GET /
```

Returns information about available endpoints.

### Health Check

```http
GET /health
```

Returns server health status.

### Post LinkedIn Comment

```http
POST /api/linkedin/comment
Content-Type: application/json

{
  "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:...",
  "comment": "Great post! Thanks for sharing."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "postUrl": "...",
  "comment": "..."
}
```

### Post YouTube Comment

```http
POST /api/youtube/comment
Content-Type: application/json

{
  "videoUrl": "https://youtu.be/VIDEO_ID",
  "comment": "Amazing video! Keep up the great work."
}
```

**Accepts any YouTube URL format** - the bot will automatically normalize it.

**Response:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "videoUrl": "...",
  "comment": "..."
}
```

### Post Reddit Comment

```http
POST /api/reddit/comment
Content-Type: application/json

{
  "postUrl": "https://www.reddit.com/r/subreddit/comments/abc123/post_title/",
  "comment": "Great discussion! Thanks for sharing your thoughts."
}
```

**Supports both new and old Reddit** - works with both `www.reddit.com` and `old.reddit.com` URLs.

**Response:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "postUrl": "...",
  "comment": "..."
}
```

### Post Twitter/X Reply

```http
POST /api/twitter/comment
Content-Type: application/json

{
  "tweetUrl": "https://twitter.com/username/status/1234567890",
  "comment": "Great tweet! Thanks for sharing."
}
```

**Supports both twitter.com and x.com** - works with both domains.

**Response:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "tweetUrl": "...",
  "comment": "..."
}
```

## Usage Examples

### cURL Examples

**LinkedIn:**
```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:1234567890",
    "comment": "Excellent insights!"
  }'
```

**YouTube (Standard Video):**
```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "comment": "Great video!"
  }'
```

**YouTube (Short URL):**
```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
    "comment": "Awesome!"
  }'
```

**YouTube (Shorts):**
```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/shorts/VIDEO_ID",
    "comment": "Love this short!"
  }'
```

**Reddit:**
```bash
curl -X POST http://localhost:3000/api/reddit/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.reddit.com/r/technology/comments/abc123/post_title/",
    "comment": "Great discussion! Thanks for sharing."
  }'
```

**Twitter/X:**
```bash
curl -X POST http://localhost:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/username/status/1234567890",
    "comment": "Great insight! Thanks for sharing this."
  }'
```

### JavaScript/Node.js Example

```javascript
const response = await fetch('http://localhost:3000/api/youtube/comment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    videoUrl: 'https://youtu.be/VIDEO_ID',
    comment: 'Great content!'
  })
});

const result = await response.json();
console.log(result);
```

### Python Example

```python
import requests

response = requests.post('http://localhost:3000/api/youtube/comment', json={
    'videoUrl': 'https://youtu.be/VIDEO_ID',
    'comment': 'Amazing video!'
})

print(response.json())
```

## Testing

Test the YouTube bot with different URL formats:

```bash
node test-url-formats.js
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad Request (missing parameters)
- `500` - Internal Server Error (bot failure, credential issues, etc.)

Errors include helpful messages:
```json
{
  "success": false,
  "error": "YouTube credentials not found in environment variables"
}
```

## Debugging

When errors occur, the bot automatically saves screenshots:

**YouTube:**
- `youtube-error-screenshot.png` - General errors
- `youtube-login-error.png` - Login page issues
- `youtube-password-error.png` - Password field issues
- `youtube-comment-field-not-found.png` - Comment box issues
- `youtube-post-submit-screenshot.png` - Post-submission verification

**Reddit:**
- `reddit-error-screenshot.png` - General errors
- `reddit-login-page-debug.png` - Login page issues
- `reddit-comment-box-not-found.png` - Comment box issues
- `reddit-post-submit-screenshot.png` - Post-submission verification

**Twitter/X:**
- `twitter-error-screenshot.png` - General errors
- `twitter-login-page-debug.png` - Login page issues
- `twitter-password-error.png` - Password field issues
- `twitter-comment-box-not-found.png` - Comment box issues
- `twitter-post-submit-screenshot.png` - Post-submission verification

**LinkedIn:**
- `error-screenshot.png` - General errors
- `login-page-debug.png` - Login page issues
- `comment-box-not-found.png` - Comment box issues

## Browser Profiles

The bots maintain persistent browser sessions (no need to login every time):

- LinkedIn: `./linkedin_profile/`
- YouTube: `./youtube_profile/`
- Reddit: Browser uses default profile (will stay logged in)

To clear sessions and start fresh:
```bash
rm -rf linkedin_profile youtube_profile
```

## Deployment Notes

- Set `headless: true` in bot files for production
- Use environment variables for credentials (never commit `.env`)
- Ensure sufficient memory for Chromium (recommended: 1GB+)
- Consider using a process manager like PM2 for production

## Security Best Practices

1. **Never commit credentials** - Use `.gitignore` for `.env`
2. **Use application-specific passwords** when available
3. **Rotate credentials regularly**
4. **Monitor for unusual activity** on your social media accounts
5. **Use dedicated accounts** for automation if possible

## Troubleshooting

### Error: "Credentials not found"
- Ensure `.env` file exists in the `app` directory
- Check that variables are correctly named (YOUTUBE_USER, YOUTUBE_PASS, etc.)
- Verify no spaces around the `=` sign in `.env`

### Error: "Could not find email input field"
- Google may be showing a consent page
- Try deleting the `youtube_profile` directory
- Check screenshots for debugging

### Error: "Navigation timeout"
- Increase timeout values in the bot code
- Check your internet connection
- Verify the video URL is accessible

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
```

## Project Structure

```
app/
├── bot.js              # LinkedIn bot logic
├── youtube_bot.js      # YouTube bot logic
├── reddit_bot.js       # Reddit bot logic
├── twitter_bot.js      # Twitter/X bot logic
├── server.js           # Express API server
├── package.json        # Dependencies
├── .env               # Credentials (not in git)
├── test.js            # Simple test script
├── test_youtube.js    # YouTube test script
├── test_reddit.js     # Reddit test script
├── linkedin_profile/  # LinkedIn browser session
└── youtube_profile/   # YouTube browser session
```

## License

MIT

## Disclaimer

Use this tool responsibly and in accordance with the Terms of Service of LinkedIn, YouTube, Reddit, and Twitter/X. Automated interactions may violate these platforms' policies. Use at your own risk.



