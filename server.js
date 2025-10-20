import express from 'express';
import dotenv from 'dotenv';
import { postLinkedInComment } from './bot.js';
import { postYouTubeComment } from './youtube_bot.js';
import { postRedditComment } from './reddit_bot.js';
import { searchReddit, searchMultipleSubreddits } from './reddit_search.js';
import { postTwitterComment } from './twitter_bot.js';
import { postTwitterComment as postTwitterCommentPuppeteer } from './twitter_puppeteer_bot.js';
import { postTikTokComment } from './tiktok_bot.js';
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
          comment: 'Comment text to post',
          postID: '(optional) Custom post ID for mapping'
        }
      },
      youtube: {
        path: '/api/youtube/comment',
        method: 'POST',
        body: {
          videoUrl: 'YouTube video URL (supports all formats: standard, shorts, youtu.be, embed)',
          comment: 'Comment text to post',
          postID: '(optional) Custom post ID for mapping'
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
          comment: 'Comment text to post',
          postID: '(optional) Custom post ID for mapping'
        },
        supportedUrlFormats: [
          'https://www.reddit.com/r/subreddit/comments/POST_ID/...',
          'https://old.reddit.com/r/subreddit/comments/POST_ID/...'
        ]
      },
      redditSearch: {
        path: '/api/reddit/search',
        method: 'POST',
        body: {
          keyword: 'Search term/keyword (required)',
          sort: '(optional) Sort by: relevance, hot, top, new, comments (default: new)',
          time: '(optional) Time filter: all, year, month, week, day, hour (default: all)',
          limit: '(optional) Number of results (max 100, default: 25)',
          subreddit: '(optional) Search within specific subreddit (e.g., "technology")',
          includeNSFW: '(optional) Include NSFW content (default: false)'
        },
        note: 'Searches Reddit posts using native JSON API without external services'
      },
      redditMultiSearch: {
        path: '/api/reddit/search/multiple',
        method: 'POST',
        body: {
          keyword: 'Search term/keyword (required)',
          subreddits: '(required) Array of subreddit names without r/ prefix',
          sort: '(optional) Sort by: relevance, hot, top, new, comments (default: new)',
          time: '(optional) Time filter: all, year, month, week, day, hour (default: all)',
          limit: '(optional) Number of results per subreddit (max 100, default: 25)',
          includeNSFW: '(optional) Include NSFW content (default: false)'
        },
        note: 'Searches multiple subreddits for a keyword'
      },
      twitter: {
        path: '/api/twitter/comment',
        method: 'POST',
        body: {
          tweetUrl: 'Twitter/X tweet URL',
          comment: 'Reply text to post',
          postID: '(optional) Custom post ID for mapping'
        },
        supportedUrlFormats: [
          'https://twitter.com/username/status/TWEET_ID',
          'https://x.com/username/status/TWEET_ID'
        ],
        note: 'Uses Twitter API with OAuth (requires API tokens)'
      },
      twitter2: {
        path: '/api/twitter2/comment',
        method: 'POST',
        body: {
          tweetUrl: 'Twitter/X tweet URL',
          comment: 'Reply text to post',
          postID: '(optional) Custom post ID for mapping'
        },
        supportedUrlFormats: [
          'https://twitter.com/username/status/TWEET_ID',
          'https://x.com/username/status/TWEET_ID'
        ],
        note: 'Uses Puppeteer browser automation (requires TWITTER_USER/TWITTER_PASS)'
      },
      tiktok: {
        path: '/api/tiktok/comment',
        method: 'POST',
        body: {
          videoUrl: 'TikTok video URL',
          comment: 'Comment text to post',
          postID: '(optional) Custom post ID for mapping'
        },
        supportedUrlFormats: [
          'https://www.tiktok.com/@username/video/VIDEO_ID',
          'https://vm.tiktok.com/SHORT_CODE'
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
    const { postUrl, comment, postID } = req.body;

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
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
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
    const { videoUrl, comment, postID } = req.body;

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
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
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
    const { postUrl, comment, postID } = req.body;

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
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
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
    const { tweetUrl, comment, postID } = req.body;

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
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Twitter API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/twitter2/comment', async (req, res) => {
  try {
    const { tweetUrl, comment, postID } = req.body;

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

    console.log(`Received request to post Twitter reply (Puppeteer) on: ${tweetUrl}`);
    
    const result = await postTwitterCommentPuppeteer(tweetUrl, comment);
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Twitter Puppeteer API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/tiktok/comment', async (req, res) => {
  try {
    const { videoUrl, comment, postID } = req.body;

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

    console.log(`Received request to post TikTok comment on: ${videoUrl}`);
    
    const result = await postTikTokComment(videoUrl, comment);
    
    // Include postID in the response if provided
    if (postID) {
      result.postID = postID;
    }
    
    res.json(result);
  } catch (error) {
    console.error('TikTok API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/reddit/search', async (req, res) => {
  try {
    const { keyword, sort, time, limit, subreddit, includeNSFW } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword is required'
      });
    }

    console.log(`Received request to search Reddit for: ${keyword}`);
    
    const result = await searchReddit(keyword, {
      sort: sort || 'new',
      time: time || 'all',
      limit: limit || 25,
      subreddit: subreddit || null,
      includeNSFW: includeNSFW || false
    });
    
    res.json(result);
  } catch (error) {
    console.error('Reddit Search API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      keyword: req.body.keyword || '',
      count: 0,
      posts: []
    });
  }
});

app.post('/api/reddit/search/multiple', async (req, res) => {
  try {
    const { keyword, subreddits, sort, time, limit, includeNSFW } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword is required'
      });
    }

    if (!subreddits || !Array.isArray(subreddits) || subreddits.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'subreddits array is required and must contain at least one subreddit'
      });
    }

    console.log(`Received request to search Reddit in multiple subreddits for: ${keyword}`);
    
    const result = await searchMultipleSubreddits(keyword, subreddits, {
      sort: sort || 'new',
      time: time || 'all',
      limit: limit || 25,
      includeNSFW: includeNSFW || false
    });
    
    res.json(result);
  } catch (error) {
    console.error('Reddit Multi-Search API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      keyword: req.body.keyword || '',
      totalPosts: 0,
      subreddits: {}
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Social Media Comment Bot API running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

