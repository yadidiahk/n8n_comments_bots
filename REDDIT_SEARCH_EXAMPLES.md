# Reddit Search API Examples

This document provides examples for using the Reddit Search functionality.

## Endpoints

### 1. Basic Search - `/api/reddit/search`

Search Reddit for keywords using native JSON API (no Apify required).

**Request:**
```bash
curl -X POST http://localhost:3000/api/reddit/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "javascript",
    "sort": "new",
    "time": "week",
    "limit": 10
  }'
```

**Request Body Parameters:**
- `keyword` (required): Search term/keyword
- `sort` (optional): Sort by `relevance`, `hot`, `top`, `new`, `comments` (default: `new`)
- `time` (optional): Time filter `all`, `year`, `month`, `week`, `day`, `hour` (default: `all`)
- `limit` (optional): Number of results (max 100, default: 25)
- `subreddit` (optional): Search within specific subreddit (e.g., "technology")
- `includeNSFW` (optional): Include NSFW content (default: false)

**Response Example:**
```json
{
  "success": true,
  "keyword": "javascript",
  "count": 10,
  "posts": [
    {
      "id": "t3_1ob0xi3",
      "parsedId": "1ob0xi3",
      "url": "https://www.reddit.com/r/javascript/comments/1ob0xi3/title/",
      "username": "user123",
      "userId": "t2_abc123",
      "title": "Post Title Here",
      "communityName": "r/javascript",
      "parsedCommunityName": "javascript",
      "body": "Post content here...",
      "html": "<div>HTML content</div>",
      "link": "https://www.reddit.com/r/javascript/comments/1ob0xi3/title/",
      "numberOfComments": 5,
      "flair": "Discussion",
      "upVotes": 42,
      "upVoteRatio": 0.95,
      "isVideo": false,
      "isAd": false,
      "over18": false,
      "thumbnailUrl": "https://...",
      "imageUrls": [],
      "createdAt": "2025-10-19T20:57:31.000Z",
      "scrapedAt": "2025-10-19T21:02:45.602Z",
      "dataType": "post"
    }
  ]
}
```

### 2. Subreddit-Specific Search

Search within a specific subreddit:

**Request:**
```bash
curl -X POST http://localhost:3000/api/reddit/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "tutorial",
    "subreddit": "learnprogramming",
    "sort": "top",
    "time": "month",
    "limit": 5
  }'
```

### 3. Multiple Subreddit Search - `/api/reddit/search/multiple`

Search across multiple subreddits:

**Request:**
```bash
curl -X POST http://localhost:3000/api/reddit/search/multiple \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "nodejs",
    "subreddits": ["node", "javascript", "webdev"],
    "sort": "new",
    "time": "week",
    "limit": 5
  }'
```

**Response Example:**
```json
{
  "success": true,
  "keyword": "nodejs",
  "totalPosts": 15,
  "subreddits": {
    "node": {
      "success": true,
      "keyword": "nodejs",
      "count": 5,
      "posts": [...]
    },
    "javascript": {
      "success": true,
      "keyword": "nodejs",
      "count": 5,
      "posts": [...]
    },
    "webdev": {
      "success": true,
      "keyword": "nodejs",
      "count": 5,
      "posts": [...]
    }
  }
}
```

## Use Cases

### 1. Search for Recent Posts about "API Development"
```json
{
  "keyword": "API development",
  "sort": "new",
  "time": "day",
  "limit": 20
}
```

### 2. Find Top Posts about "Machine Learning" in r/MachineLearning
```json
{
  "keyword": "machine learning",
  "subreddit": "MachineLearning",
  "sort": "top",
  "time": "week",
  "limit": 10
}
```

### 3. Search for "React" in Multiple Development Subreddits
```json
{
  "keyword": "React",
  "subreddits": ["reactjs", "javascript", "webdev", "frontend"],
  "sort": "hot",
  "time": "week",
  "limit": 5
}
```

## Integration with n8n

You can use these endpoints in n8n workflows:

1. **HTTP Request Node** - POST to `/api/reddit/search`
2. **Set Variables** - Extract post URLs and details
3. **Loop Through Results** - Process each post
4. **Post Comments** - Use `/api/reddit/comment` to reply to found posts

## Notes

- Uses Reddit's native JSON API (no external services required)
- No API keys needed for searching (read-only)
- Rate limiting: ~1 request per second recommended
- Maximum 100 results per request
- Returns standardized data format matching Apify output

