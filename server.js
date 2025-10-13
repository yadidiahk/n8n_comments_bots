import express from 'express';
import { postLinkedInComment } from './bot.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'LinkedIn Comment Bot API',
    endpoints: {
      post: {
        path: '/api/linkedin/comment',
        method: 'POST',
        body: {
          postUrl: 'LinkedIn post URL',
          comment: 'Comment text to post'
        }
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

app.listen(PORT, () => {
  console.log(`LinkedIn Comment Bot API running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

