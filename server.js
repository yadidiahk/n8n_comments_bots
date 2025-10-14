import express from 'express';
import dotenv from 'dotenv';
import { postLinkedInComment } from './bot.js';
import { postYouTubeComment } from './youtube_bot.js';
import { postRedditComment } from './reddit_bot.js';
import { postTwitterComment } from './twitter_bot.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// let it work

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Social Media Comment Bot API',
    endpoints: {
      linkedin: {
        path: '/api/linkedin/comment',
        method: 'POST',
        body: {
          postUrl: 'LinkedIn post URL',
          comment: 'Comment text to post'
        }
      },
      youtube: {
        path: '/api/youtube/comment',
        method: 'POST',
        body: {
          videoUrl: 'YouTube video URL (supports all formats: standard, shorts, youtu.be, embed)',
          comment: 'Comment text to post'
        },
        supportedUrlFormats: [
          'https://www.youtube.com/watch?v=VIDEO_ID',
          'https://youtu.be/VIDEO_ID',
          'https://www.youtube.com/shorts/VIDEO_ID',
          'https://m.youtube.com/watch?v=VIDEO_ID',
          'https://www.youtube.com/embed/VIDEO_ID',
          'https://www.youtube.com/v/VIDEO_ID'
        ]
      },
      reddit: {
        path: '/api/reddit/comment',
        method: 'POST',
        body: {
          postUrl: 'Reddit post URL',
          comment: 'Comment text to post'
        },
        supportedUrlFormats: [
          'https://www.reddit.com/r/subreddit/comments/POST_ID/...',
          'https://old.reddit.com/r/subreddit/comments/POST_ID/...'
        ]
      },
      twitter: {
        path: '/api/twitter/comment',
        method: 'POST',
        body: {
          tweetUrl: 'Twitter/X tweet URL',
          comment: 'Reply text to post'
        },
        supportedUrlFormats: [
          'https://twitter.com/username/status/TWEET_ID',
          'https://x.com/username/status/TWEET_ID'
        ]
      },
      health: {
        path: '/health',
        method: 'GET'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/linkedin/comment', async (req, res) => {
  try {
    const { postUrl, comment } = req.body;

    if (!postUrl) {
      return res.status(400).json({
        success: false,
        error: 'postUrl is required'
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'comment is required'
      });
    }

    console.log(`Received request to post comment on: ${postUrl}`);
    
    const result = await postLinkedInComment(postUrl, comment);
    
    res.json(result);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/youtube/comment', async (req, res) => {
  try {
    const { videoUrl, comment } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'videoUrl is required'
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'comment is required'
      });
    }

    console.log(`Received request to post YouTube comment on: ${videoUrl}`);
    
    const result = await postYouTubeComment(videoUrl, comment);
    
    res.json(result);
  } catch (error) {
    console.error('YouTube API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/reddit/comment', async (req, res) => {
  try {
    const { postUrl, comment } = req.body;

    if (!postUrl) {
      return res.status(400).json({
        success: false,
        error: 'postUrl is required'
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'comment is required'
      });
    }

    console.log(`Received request to post Reddit comment on: ${postUrl}`);
    
    const result = await postRedditComment(postUrl, comment);
    
    res.json(result);
  } catch (error) {
    console.error('Reddit API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/twitter/comment', async (req, res) => {
  try {
    const { tweetUrl, comment } = req.body;

    if (!tweetUrl) {
      return res.status(400).json({
        success: false,
        error: 'tweetUrl is required'
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'comment is required'
      });
    }

    console.log(`Received request to post Twitter reply on: ${tweetUrl}`);
    
    const result = await postTwitterComment(tweetUrl, comment);
    
    res.json(result);
  } catch (error) {
    console.error('Twitter API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.use(['/vnc.html', '/vnc', '/vnc/'], createProxyMiddleware({
  target: 'http://localhost:6080',
  changeOrigin: true,
  ws: true,
  logLevel: 'silent'
}));

console.log("✅ Proxy for noVNC active at /vnc.html");

app.listen(PORT, () => {
  console.log(`Social Media Comment Bot API running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

