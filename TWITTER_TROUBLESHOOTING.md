# Twitter Puppeteer Bot Troubleshooting

## Issue: "Unusual login activity" verification screen

### Problem
After entering your email/username, Twitter shows a screen asking to "Enter your phone number or username" due to unusual login activity.

### Why This Happens
- Twitter detected login from a new location or device
- You're logging in via automation (Puppeteer)
- Your account has enhanced security settings

### Solution

**Set your Twitter username in .env:**
```env
TWITTER_USER=your_email@example.com
TWITTER_PASS=your_password
TWITTER_USERNAME=YourTwitterHandle
```

The bot will automatically:
1. ✅ Detect the verification screen
2. ✅ Clear the email from the field
3. ✅ Enter your Twitter handle (from `TWITTER_USERNAME`)
4. ✅ Click Next to proceed to password

**Important**: Use your Twitter handle WITHOUT the @ symbol.
- ✅ Correct: `TWITTER_USERNAME=YadidiahK`
- ❌ Wrong: `TWITTER_USERNAME=@YadidiahK`

### Manual Override

If the bot can't handle verification automatically, you can complete it manually:

**Option 1: Automatic with Manual Fallback (default)**
- Bot tries to handle verification automatically
- If it fails, browser stays open for 90 seconds
- Complete the verification manually in the browser window
- Bot will continue once you're done

**Option 2: Full Manual Mode**
Enable manual mode in your `.env`:
```env
TWITTER_MANUAL_MODE=true
```

With manual mode:
- ✅ Browser never closes automatically
- ✅ You have full control at every step
- ✅ Complete ANY verification manually (2FA, email code, captcha, etc.)
- ✅ Bot waits indefinitely for you
- ✅ Press Ctrl+C to exit when done

**When to use manual mode:**
- Your account has 2FA enabled
- Twitter keeps asking for verification
- You want to see exactly what's happening
- You prefer to complete login yourself

---

## Issue: "Login modal appears when trying to reply"

### Problem
When the bot tries to reply to a tweet, Twitter shows a "Reply to join the conversation" modal asking you to log in, even though you thought you were already logged in.

### Why This Happens
- Your Twitter session in the `twitter_profile` directory has expired or been invalidated
- Twitter detected suspicious activity and requires re-authentication
- The session cookies are corrupted or incomplete

### Solution

**Step 1: Clear the old session**
```bash
cd /Users/yadidiah/Desktop/LeadGenCodes/app
rm -rf ./twitter_profile
```

**Step 2: Run the bot again**
The bot will automatically prompt for login and create a fresh session.

```bash
# Via API
curl -X POST http://localhost:3000/api/twitter2/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://x.com/username/status/123456",
    "comment": "Your reply here"
  }'

# Or via CLI
node twitter_puppeteer_bot.js "https://x.com/username/status/123456" "Your reply"
```

**Step 3: Complete any verification**
- If Twitter shows 2FA, complete it
- If it asks for phone/email verification, provide it
- The bot will wait up to 60 seconds for manual verification

### Tips for Success

1. **Use headful mode** - The bot runs with `headless: false` so you can see what's happening
2. **Watch the browser** - If verification is needed, you'll see it
3. **Environment variables** - Make sure you have:
   ```env
   TWITTER_USER=your_email_or_phone
   TWITTER_PASS=your_password
   TWITTER_USERNAME=YourTwitterHandle  # Optional but recommended for verification
   ```
   
   **Note**: `TWITTER_USERNAME` should be your Twitter handle WITHOUT the @ symbol.
   Example: If your Twitter is @YadidiahK, set `TWITTER_USERNAME=YadidiahK`
4. **Session persistence** - Once logged in successfully, the session is saved for future use

### Still Having Issues?

If you continue to have problems:

1. **Check screenshots** - The bot saves `twitter-error-screenshot.png` on errors
2. **Check logs** - Look for detailed error messages in the console
3. **Try manual login** - Login manually to twitter.com in a regular browser to ensure your credentials work
4. **Account restrictions** - Check if your Twitter account has any restrictions or requires verification

### Alternative: Use OAuth API Instead

If Puppeteer continues to have issues, you can use the OAuth-based Twitter bot instead:

```bash
# Uses Twitter API with OAuth (no browser needed)
curl -X POST http://localhost:3000/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://x.com/username/status/123456",
    "comment": "Your reply"
  }'
```

See `OAUTH_SETUP_GUIDE.md` for OAuth setup instructions.

