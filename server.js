import express from 'express';
import dotenv from 'dotenv';
import { postLinkedInComment } from './bot.js';
import { postYouTubeComment } from './youtube_bot.js';

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

app.listen(PORT, () => {
  console.log(`Social Media Comment Bot API running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

