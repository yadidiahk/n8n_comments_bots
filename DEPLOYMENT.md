# Quick Deployment Guide for n8n Integration

## Quick Start (5 Minutes)

### Step 1: Prepare Your API for Deployment

Your API is ready to deploy. Here's what you have:
- `server.js` - Express server
- `bot.js` - LinkedIn automation logic
- `package.json` - Dependencies
- `env.example` - Environment variables template

### Step 2: Choose a Hosting Platform

#### Recommended: Render.com (Free Tier)

**Why Render.com?**
- Free tier available
- Supports Puppeteer out of the box
- Easy environment variable management
- Auto-deploy from GitHub

**Steps:**

1. Push your code to GitHub (if not already)
   ```bash
   cd /Users/yadidiah/Desktop/LeadGenCodes
   git add app/
   git commit -m "Add LinkedIn bot API"
   git push
   ```

2. Go to https://render.com and sign up

3. Click "New +" → "Web Service"

4. Connect your GitHub repository

5. Configure the service:
   - **Name**: linkedin-bot-api
   - **Root Directory**: `app`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

6. Add Environment Variables:
   - `LINKEDIN_USER` = your LinkedIn email
   - `LINKEDIN_PASS` = your LinkedIn password
   - `PORT` = 3000

7. Click "Create Web Service"

8. Wait for deployment (5-10 minutes)

9. Your API will be available at: `https://linkedin-bot-api-xxxx.onrender.com`

### Step 3: Test Your Deployed API

```bash
curl https://your-api-url.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T..."
}
```

### Step 4: Configure n8n

1. Open your n8n workflow

2. Add an "HTTP Request" node

3. Configure the node:
   - **Method**: POST
   - **URL**: `https://your-api-url.onrender.com/api/linkedin/comment`
   - **Body Content Type**: JSON
   - **JSON Body**:
   ```json
   {
     "postUrl": "{{ $json.postUrl }}",
     "comment": "{{ $json.comment }}"
   }
   ```

4. Test the workflow!

## Alternative: Railway.app

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in Settings
6. Deploy

Your API will be at: `https://your-project.up.railway.app`

## Alternative: VPS (DigitalOcean, AWS, etc.)

If you prefer a VPS:

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone your-repo-url
cd your-repo/app

# Install dependencies
npm install

# Create environment file
cat > .env << EOF
LINKEDIN_USER=your_email@example.com
LINKEDIN_PASS=your_password
PORT=3000
EOF

# Install PM2
sudo npm install -g pm2

# Start the application
pm2 start server.js --name linkedin-bot

# Set up PM2 to start on boot
pm2 startup
pm2 save

# Configure firewall
sudo ufw allow 3000
sudo ufw enable
```

## Testing with Postman or cURL

### Test health endpoint:
```bash
curl https://your-api-url/health
```

### Test comment posting:
```bash
curl -X POST https://your-api-url/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "postUrl": "https://www.linkedin.com/posts/username-activity-123456/",
    "comment": "Great post! Thanks for sharing."
  }'
```

## n8n Workflow Example

Here's a complete n8n workflow structure:

1. **Trigger Node** (Webhook, Schedule, or Manual)
2. **Set Data Node** - Set postUrl and comment
3. **HTTP Request Node** - Call your API
4. **IF Node** - Check if success
5. **Success/Error handling nodes**

Example HTTP Request Node configuration:
- URL: `https://your-api-url/api/linkedin/comment`
- Method: POST
- Body:
```json
{
  "postUrl": "{{ $json.linkedInPostUrl }}",
  "comment": "{{ $json.commentText }}"
}
```

## Important Security Notes

1. **Never expose your API publicly without authentication** if you're concerned about unauthorized use
2. Consider adding API key authentication if needed
3. Keep your LinkedIn credentials secure using environment variables
4. Monitor your API usage to avoid LinkedIn rate limits

## Cost Estimates

- **Render.com Free**: $0/month (750 hours, sleeps after inactivity)
- **Railway Free**: $5 credit/month
- **DigitalOcean Droplet**: $6/month (basic)
- **AWS EC2 t2.micro**: Free tier eligible

## Troubleshooting

### API returns 500 error
- Check environment variables are set correctly
- Review application logs in your hosting dashboard
- Test locally first: `cd app && npm start`

### Puppeteer errors on hosting
- Some platforms need additional configuration for Puppeteer
- On Render.com, it should work out of the box
- If issues persist, add to package.json:
```json
"engines": {
  "node": "20.x"
}
```

### LinkedIn blocks the bot
- LinkedIn may detect automated activity
- Try reducing frequency of requests
- Ensure you're using a stable IP address
- Consider using residential proxies for production use

## Next Steps

1. Deploy your API
2. Test the health endpoint
3. Test with a real LinkedIn post
4. Integrate with n8n
5. Set up monitoring and logging
6. Add authentication if needed

Need help? Check the main README.md for more detailed information.

