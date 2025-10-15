import dotenv from "dotenv";
dotenv.config();

// Extract post ID from Reddit URL
function extractPostId(url) {
  // Supports formats:
  // https://www.reddit.com/r/subreddit/comments/POST_ID/title/
  // https://old.reddit.com/r/subreddit/comments/POST_ID/title/
  const patterns = [
    /reddit\.com\/r\/[^\/]+\/comments\/([a-z0-9]+)/i,
    /^t3_([a-z0-9]+)$/i, // Direct thing_id format
    /^([a-z0-9]+)$/ // Just the post ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const postId = match[1];
      // Reddit API requires "t3_" prefix
      return postId.startsWith('t3_') ? postId : `t3_${postId}`;
    }
  }

  throw new Error('Invalid Reddit URL format. Expected: https://www.reddit.com/r/subreddit/comments/POST_ID/...');
}

// Function to refresh Reddit access token
async function refreshAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID || "ox_IpudOacNTrC68D7yZkw";
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || "ouetFZNFOeiMNqmT0NNQnqmR3IAgXA";
  const username = process.env.REDDIT_USERNAME || "Commercial_Term_8918";
  const password = process.env.REDDIT_PASSWORD || "Yadidiah@Humai.30";

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "User-Agent": "MyRedditBot/1.0 by u/Commercial_Term_8918",
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username,
        password,
      }),
    });

    const data = await response.json();
    
    if (data.access_token) {
      // Update the environment variable for the current session
      process.env.REDDIT_ACCESS_TOKEN = data.access_token;
      console.log('Reddit access token refreshed successfully');
      return data.access_token;
    } else {
      throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    throw error;
  }
}

// Internal function to post comment
async function postComment({ thingId, text, isRetry = false }) {
  const url = "https://oauth.reddit.com/api/comment";

  const formData = new URLSearchParams({
    api_type: "json",
    thing_id: thingId,
    text: text,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `bearer ${process.env.REDDIT_ACCESS_TOKEN}`,
      "User-Agent": "MyRedditBot/1.0 by u/Commercial_Term_8918",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  // Check if response is HTML (indicates auth error)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    // Token likely expired, try to refresh and retry once
    if (!isRetry) {
      console.log('Token appears to be expired or invalid. Attempting to refresh...');
      await refreshAccessToken();
      return postComment({ thingId, text, isRetry: true });
    } else {
      throw new Error('Authentication failed after token refresh. Please check your Reddit credentials.');
    }
  }

  const result = await response.json();
  return result;
}

// Main export function for server.js
export async function postRedditComment(postUrl, comment) {
  try {
    console.log('Processing Reddit comment request...');
    console.log('Post URL:', postUrl);

    // Check if access token is configured
    if (!process.env.REDDIT_ACCESS_TOKEN) {
      throw new Error('REDDIT_ACCESS_TOKEN not found in environment variables. Please configure Reddit OAuth first.');
    }

    // Extract post ID from URL
    const postId = extractPostId(postUrl);
    console.log('Extracted Post ID:', postId);

    // Post comment
    const result = await postComment({
      thingId: postId,
      text: comment,
    });

    console.log('Reddit API Response:', result);

    // Check for errors in Reddit API response
    if (result.json?.errors && result.json.errors.length > 0) {
      const errorMsg = result.json.errors[0].join(': ');
      return {
        success: false,
        error: errorMsg,
        postUrl: postUrl,
        comment: comment,
        details: result
      };
    }

    // Check if comment was successfully posted
    if (result.json?.data?.things && result.json.data.things.length > 0) {
      return {
        success: true,
        message: 'Comment posted successfully!',
        postUrl: postUrl,
        comment: comment,
        commentId: result.json.data.things[0].data.id,
        data: result
      };
    }

    // Unexpected response format
    return {
      success: false,
      error: 'Unexpected response format from Reddit API',
      postUrl: postUrl,
      comment: comment,
      details: result
    };

  } catch (error) {
    console.error('Error posting Reddit comment:', error);
    return {
      success: false,
      error: error.message,
      postUrl: postUrl,
      comment: comment
    };
  }
}

// Example usage - only runs when file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const postUrl = "https://www.reddit.com/r/test/comments/abc123/title/"; // Replace with real URL
    const commentText = "This is a test comment via the Reddit API!";

    try {
      const res = await postRedditComment(postUrl, commentText);
      console.log("Result:", JSON.stringify(res, null, 2));
    } catch (err) {
      console.error("Error:", err);
    }
  })();
}
