import dotenv from "dotenv";
dotenv.config();

// Initialize access token on module load
let accessToken = process.env.REDDIT_ACCESS_TOKEN || null;

// Automatically get access token on startup if not present
async function initializeAccessToken() {
  if (!accessToken) {
    console.log('🔄 Reddit access token not found. Fetching new token...');
    try {
      accessToken = await refreshAccessToken();
      console.log('✅ Reddit access token initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Reddit access token:', error.message);
    }
  }
}

// Call initialization (will execute when module is imported)
initializeAccessToken().catch(err => console.error('Token initialization error:', err));

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
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  // Debug: Check if credentials are present
  console.log('=== Reddit Token Refresh Debug ===');
  console.log('Client ID present:', !!clientId, clientId ? `(${clientId.substring(0, 6)}...)` : 'MISSING');
  console.log('Client Secret present:', !!clientSecret, clientSecret ? `(${clientSecret.substring(0, 6)}...)` : 'MISSING');
  console.log('Username present:', !!username, username ? `(${username})` : 'MISSING');
  console.log('Password present:', !!password, password ? '(*****)' : 'MISSING');

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Missing required Reddit credentials. Check your .env file for REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const requestBody = new URLSearchParams({
      grant_type: "password",
      username,
      password,
    });

    console.log('Request URL: https://www.reddit.com/api/v1/access_token');
    console.log('Request Method: POST');
    console.log('Grant Type: password');
    console.log('Request Body Keys:', Array.from(requestBody.keys()));

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "User-Agent": `RedditBot/2.0 (by /u/${username})`,
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response Body (raw):', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError.message);
      throw new Error(`Invalid JSON response from Reddit API: ${responseText.substring(0, 200)}`);
    }

    console.log('Response Data (parsed):', JSON.stringify(data, null, 2));
    
    if (data.access_token) {
      // Update both the module variable and environment variable
      accessToken = data.access_token;
      process.env.REDDIT_ACCESS_TOKEN = data.access_token;
      console.log('Reddit access token refreshed successfully');
      console.log('Token expires in:', data.expires_in, 'seconds');
      console.log('=== End Debug ===');
      return data.access_token;
    } else {
      console.log('=== Error Response Details ===');
      console.log('Error:', data.error);
      console.log('Error Description:', data.error_description || 'Not provided');
      console.log('Message:', data.message || 'Not provided');
      console.log('=== End Debug ===');
      throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    console.log('=== End Debug (with error) ===');
    throw error;
  }
}

// Internal function to post comment
async function postComment({ thingId, text, isRetry = false }) {
  const url = "https://oauth.reddit.com/api/comment";

  console.log('=== Reddit Comment Post Debug ===');
  console.log('Attempt:', isRetry ? 'RETRY' : 'INITIAL');
  console.log('Thing ID:', thingId);
  console.log('Comment length:', text.length, 'characters');
  console.log('Access Token present:', !!accessToken);
  if (accessToken) {
    console.log('Access Token preview:', accessToken.substring(0, 20) + '...');
  }

  const formData = new URLSearchParams({
    api_type: "json",
    thing_id: thingId,
    text: text,
  });

  console.log('Posting to:', url);
  console.log('Form data keys:', Array.from(formData.keys()));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `bearer ${accessToken}`,
      "User-Agent": `RedditBot/2.0 (by /u/${process.env.REDDIT_USERNAME})`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  console.log('Post Response Status:', response.status, response.statusText);
  console.log('Post Response Headers:', Object.fromEntries(response.headers.entries()));

  // Check if response is HTML (indicates auth error)
  const contentType = response.headers.get("content-type");
  console.log('Content-Type:', contentType);
  
  if (contentType && contentType.includes("text/html")) {
    // Token likely expired, try to refresh and retry once
    if (!isRetry) {
      console.log('Received HTML response - Token appears to be expired or invalid. Attempting to refresh...');
      await refreshAccessToken();
      console.log('Token refreshed, retrying comment post...');
      return postComment({ thingId, text, isRetry: true });
    } else {
      console.log('=== End Debug (auth failed after retry) ===');
      throw new Error('Authentication failed after token refresh. Please check your Reddit credentials.');
    }
  }

  const resultText = await response.text();
  console.log('Response body (raw):', resultText);

  let result;
  try {
    result = JSON.parse(resultText);
    console.log('Response body (parsed):', JSON.stringify(result, null, 2));
  } catch (parseError) {
    console.error('Failed to parse response as JSON:', parseError.message);
    console.log('=== End Debug (parse error) ===');
    throw new Error(`Invalid JSON response: ${resultText.substring(0, 200)}`);
  }

  console.log('=== End Debug ===');
  return result;
}

// Main export function for server.js
export async function postRedditComment(postUrl, comment) {
  try {
    console.log('\n========================================');
    console.log('REDDIT COMMENT POST REQUEST');
    console.log('========================================');
    console.log('Processing Reddit comment request...');
    console.log('Post URL:', postUrl);
    console.log('Comment preview:', comment.substring(0, 50) + (comment.length > 50 ? '...' : ''));

    // Check if access token is available, fetch if not
    if (!accessToken) {
      console.log('Access token not found, fetching new token...');
      accessToken = await refreshAccessToken();
    }

    console.log('Access token is available');

    // Extract post ID from URL
    const postId = extractPostId(postUrl);
    console.log('Extracted Post ID:', postId);

    // Post comment
    const result = await postComment({
      thingId: postId,
      text: comment,
    });

    console.log('\n--- Final Reddit API Response ---');
    console.log(JSON.stringify(result, null, 2));

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
      console.log('\n✓ SUCCESS: Comment posted successfully!');
      console.log('Comment ID:', result.json.data.things[0].data.id);
      console.log('========================================\n');
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
    console.log('\n✗ FAILED: Unexpected response format from Reddit API');
    console.log('========================================\n');
    return {
      success: false,
      error: 'Unexpected response format from Reddit API',
      postUrl: postUrl,
      comment: comment,
      details: result
    };

  } catch (error) {
    console.error('\n✗ ERROR posting Reddit comment:', error);
    console.error('Error stack:', error.stack);
    console.log('========================================\n');
    return {
      success: false,
      error: error.message,
      postUrl: postUrl,
      comment: comment,
      stack: error.stack
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

