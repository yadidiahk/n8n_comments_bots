# TikTok Bot Setup Guide

## Overview

The TikTok bot automates commenting on TikTok videos using Puppeteer and browser automation. It logs in to TikTok, navigates to a video, and posts comments automatically.

## Environment Variables Required

Add these to your `.env` file:

```env
# TikTok Account Credentials
TIKTOK_USER=your_tiktok_username_or_email
TIKTOK_PASS=your_tiktok_password

# Optional: Chrome executable path (auto-detected on most systems)
CHROME_BIN=/path/to/chrome  # Only needed if Chrome/Chromium is in a non-standard location
```

## How It Works

1. **Session Persistence**: The bot uses a `tiktok_profile/` directory to store browser session data. Once logged in, you won't need to login again for future runs (unless the session expires).

2. **Headful Mode**: The bot runs in visible mode (`headless: false`) so you can see what's happening. This is useful for:
   - Debugging issues
   - Completing manual verifications if TikTok requests them
   - Monitoring the automation process

3. **Anti-Bot Detection**: The bot includes measures to avoid detection:
   - Removes webdriver flag
   - Uses real Chrome user profile
   - Includes natural delays between actions

## Usage

### Via API (server.js)

The TikTok bot is integrated with `server.js`:

```bash
# Start the server
npm start

# Make a POST request
curl -X POST http://localhost:3000/api/tiktok/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.tiktok.com/@username/video/1234567890123456789",
    "comment": "Great video! Love this content!"
  }'
```

### Directly (CLI)

You can also import and use the function directly:

```javascript
import { postTikTokComment } from './tiktok_bot.js';

const result = await postTikTokComment(
  'https://www.tiktok.com/@username/video/1234567890123456789',
  'Amazing content!'
);
console.log(result);
```

## Supported URL Formats

The bot should handle all TikTok video URL formats:

- Standard: `https://www.tiktok.com/@username/video/VIDEO_ID`
- Short link: `https://vm.tiktok.com/SHORT_CODE` (may redirect)
- Mobile: `https://m.tiktok.com/@username/video/VIDEO_ID`

## Response Format

**Success:**
```json
{
  "success": true,
  "message": "Comment posted successfully!",
  "videoUrl": "https://www.tiktok.com/@username/video/1234567890123456789",
  "comment": "Your comment text"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## First Time Setup

1. **Set Environment Variables**:
   ```env
   TIKTOK_USER=your_tiktok_username_or_email
   TIKTOK_PASS=your_tiktok_password
   ```

2. **Run the Bot**:
   The first time you run the bot, it will:
   - Open a Chrome window
   - Navigate to TikTok
   - Login with your credentials
   - Save the session in `tiktok_profile/` directory

3. **Handle Verification** (if required):
   - If TikTok asks for verification (email code, SMS, CAPTCHA, etc.), the bot will pause for 60 seconds
   - Complete the verification manually in the browser window
   - The bot will resume automatically after verification

4. **Subsequent Runs**:
   - The bot will use the saved session
   - No login required unless the session expires

## Important Notes

### Session Management
- **Session Directory**: `tiktok_profile/` stores your browser profile and cookies
- **Persistence**: Once logged in, the session persists across runs
- **Expiration**: Sessions may expire after inactivity (varies by TikTok)
- **Multiple Accounts**: To use different accounts, use different `userDataDir` directories

### Security Considerations
1. **Password Storage**: Never commit your `.env` file with credentials
2. **Profile Directory**: The `tiktok_profile/` directory is in `.gitignore`
3. **Account Safety**: Use automation responsibly to avoid account restrictions
4. **Rate Limiting**: Don't spam comments - TikTok may flag aggressive automation

### TikTok's Anti-Bot Measures
TikTok has sophisticated anti-bot detection. The bot includes:
- Natural delays between actions
- Real browser profile usage
- Webdriver flag removal

However, TikTok may still:
- Request verification challenges
- Rate limit your account
- Temporarily restrict commenting

**Recommendation**: Use sparingly and behave like a human user.

## Troubleshooting

### "TikTok credentials not found"
Make sure your `.env` file has:
```env
TIKTOK_USER=your_username
TIKTOK_PASS=your_password
```

### "Login fields not found"
- TikTok's login UI may have changed
- Check the debug screenshot: `tiktok-login-page-debug.png`
- You may need to update the login selectors in `tiktok_bot.js`

### "Comment box not found"
- TikTok's comment UI may have changed
- Check the debug screenshot: `tiktok-comment-box-not-found.png`
- The video may have comments disabled
- You may need to update the comment box selectors

### Verification Required
If TikTok asks for verification:
1. The bot will pause for 60 seconds
2. Complete the verification in the browser window
3. The bot will continue automatically

### Chrome/Chromium Not Found
If you get "Browser not found" errors:
1. **macOS/Windows**: Puppeteer should find Chrome automatically
2. **Linux**: Set `CHROME_BIN=/usr/bin/chromium` or install Chromium:
   ```bash
   # Debian/Ubuntu
   sudo apt-get install chromium-browser
   
   # Arch Linux
   sudo pacman -S chromium
   ```

### Session Expired
If the session expires:
1. Delete the `tiktok_profile/` directory
2. Run the bot again to create a fresh login

### Account Restricted
If TikTok restricts your account:
- You may have commented too frequently
- Wait 24-48 hours before trying again
- Use the bot more sparingly
- Consider using a different account for automation

## Browser Visibility

The bot runs in **headful mode** (visible browser window) by default. This is intentional because:

1. **Verification**: You can complete manual verifications if needed
2. **Debugging**: You can see exactly what the bot is doing
3. **Detection**: Some anti-bot systems detect headless browsers

If you want to run it in headless mode (not recommended for TikTok):
```javascript
// In tiktok_bot.js, change:
headless: false,  // to:
headless: true,
```

## Rate Limits and Best Practices

### Recommended Usage
- **Frequency**: Don't comment more than once every 2-3 minutes
- **Volume**: Limit to 20-30 comments per day
- **Content**: Vary your comments - avoid posting identical text
- **Timing**: Spread comments throughout the day

### Signs You're Being Rate Limited
- Comments not appearing
- "Try again later" messages
- Temporary login restrictions

### Recovery from Rate Limits
1. Stop using the bot immediately
2. Wait 24-48 hours
3. Resume with lower frequency

## Integration with Server

The TikTok bot is fully integrated with the API server:

```javascript
// POST /api/tiktok/comment
{
  "videoUrl": "https://www.tiktok.com/@username/video/VIDEO_ID",
  "comment": "Your comment text"
}
```

The endpoint is documented at `http://localhost:3000/` when the server is running.

## Environment Variables Summary

```env
# Required
TIKTOK_USER=your_tiktok_username_or_email
TIKTOK_PASS=your_tiktok_password

# Optional (usually auto-detected)
CHROME_BIN=/usr/bin/chromium  # Only on Linux if needed
```

## Next Steps

1. **Add Credentials**: Add `TIKTOK_USER` and `TIKTOK_PASS` to your `.env` file
2. **Test**: Start the server and make a test API call
3. **Monitor**: Watch the browser window on first run
4. **Handle Verification**: Complete any verification challenges manually
5. **Automate**: Once logged in, the session persists for future runs

## Debug Screenshots

If something goes wrong, the bot automatically saves screenshots:

- `tiktok-login-page-debug.png`: Login page layout
- `tiktok-login-failed.png`: After failed login attempt
- `tiktok-comment-box-not-found.png`: When comment box isn't found
- `tiktok-submit-button-not-found.png`: When post button isn't found
- `tiktok-post-submit-screenshot.png`: After attempting to post
- `tiktok-error-screenshot.png`: General error state

These help diagnose issues when TikTok's UI changes.

## Maintaining the Bot

TikTok frequently updates their website. If the bot stops working:

1. **Check Screenshots**: Look at the debug screenshots to see what changed
2. **Update Selectors**: Modify the element selectors in `tiktok_bot.js`
3. **Test Manually**: Navigate the site yourself to identify new elements
4. **Browser Console**: Use Chrome DevTools to inspect elements

Common selectors that may need updating:
- Login button: `[data-e2e="top-login-button"]`
- Username field: `input[name="username"]`
- Password field: `input[name="password"]`
- Comment input: `[data-e2e="comment-input"]`
- Post button: `[data-e2e="comment-post"]`

## Support and Updates

If you encounter issues:

1. Check the debug screenshots
2. Verify your credentials are correct
3. Try deleting `tiktok_profile/` and logging in fresh
4. Check if TikTok's UI has changed
5. Update selectors if needed

The bot is ready to use once you configure your TikTok credentials!


