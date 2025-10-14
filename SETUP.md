# Social Media Comment Bot - Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. Navigate to the app directory:
   ```bash
   cd /Users/yadidiah/Desktop/LeadGenCodes/app
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

## Configuration

### Setting Up Credentials

You need to set environment variables for the social media platforms you want to use.

#### Option 1: Create a .env file (Recommended)

Create a `.env` file in the `/app` directory:

```bash
# LinkedIn Credentials
LINKEDIN_USER=your_linkedin_email@example.com
LINKEDIN_PASS=your_linkedin_password

# YouTube Credentials
YOUTUBE_USER=your_youtube_email@gmail.com
YOUTUBE_PASS=your_youtube_password

# Server Configuration (optional)
PORT=3000
```

#### Option 2: Export Environment Variables

Alternatively, export them in your terminal:

```bash
# For LinkedIn
export LINKEDIN_USER="your_linkedin_email@example.com"
export LINKEDIN_PASS="your_linkedin_password"

# For YouTube
export YOUTUBE_USER="your_youtube_email@gmail.com"
export YOUTUBE_PASS="your_youtube_password"
```

## Running the Server

Start the server:
```bash
npm start
```

Or directly:
```bash
node server.js
```

The server will start on port 3000 (or the PORT specified in your .env file).

## API Endpoints

### 1. Health Check
```bash
GET http://localhost:3000/health
```

### 2. LinkedIn Comment
```bash
POST http://localhost:3000/api/linkedin/comment
Content-Type: application/json

{
  "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:1234567890",
  "comment": "Great post! Thanks for sharing."
}
```

### 3. YouTube Comment
```bash
POST http://localhost:3000/api/youtube/comment
Content-Type: application/json

{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "comment": "Amazing video! Keep up the great work."
}
```

### 4. API Documentation
```bash
GET http://localhost:3000/
```

## Testing the APIs

### Using curl:

**LinkedIn:**
```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "YOUR_LINKEDIN_POST_URL",
    "comment": "Your comment text"
  }'
```

**YouTube:**
```bash
curl -X POST http://localhost:3000/api/youtube/comment \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "YOUR_YOUTUBE_VIDEO_URL",
    "comment": "Your comment text"
  }'
```

## Troubleshooting

### Error: "LinkedIn/YouTube credentials not found in environment variables"

**Solution:** Make sure you have set the environment variables (see Configuration section above).

### Error: "Could not find email input field on Google login page"

**Possible causes:**
1. YouTube credentials are not set
2. Google's login page structure has changed
3. Network/connection issues

**Solution:** 
- Check that YOUTUBE_USER and YOUTUBE_PASS are set correctly
- Look for a screenshot file named `youtube-login-error.png` in the `/app` directory for debugging

### Error: "Could not find password input field on Google login page"

**Solution:** 
- Check the screenshot file `youtube-password-error.png` in the `/app` directory
- Verify your YouTube credentials are correct

### Browser Sessions

The bots use persistent browser profiles to maintain login sessions:
- LinkedIn: `./linkedin_profile/`
- YouTube: `./youtube_profile/`

If you encounter login issues, you can delete these folders to start fresh:
```bash
rm -rf linkedin_profile youtube_profile
```

## Important Notes

- The bots run in **headless mode** by default for deployment
- First-time login may require 2FA verification
- Login sessions are cached to avoid repeated logins
- Screenshots are automatically saved on errors for debugging

## Security

- Never commit your `.env` file to version control
- Keep your credentials secure
- Use application-specific passwords if available
- Consider using environment-specific credential management for production

## Deployment

For production deployment, make sure to:
1. Set environment variables on your hosting platform
2. Install all dependencies: `npm install`
3. The server is already configured to run in headless mode
4. Ensure proper file permissions for browser profile directories


