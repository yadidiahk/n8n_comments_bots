// Required packages: npm install googleapis express open
import { google } from "googleapis";
import express from "express";
import open from "open";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store tokens
const TOKEN_PATH = path.join(__dirname, "youtube_tokens.json");

const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const redirectUri = "http://localhost:3000/oauth2callback";
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri
);

// ------------------- Helper functions -------------------

// Load saved tokens
function loadTokens() {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH));
  }
  return null;
}

// Save tokens
function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

// Get valid access token
async function getAccessToken() {
  let tokens = loadTokens();
  if (!tokens) {
    throw new Error("No tokens found. Please authorize first.");
  }

  oauth2Client.setCredentials(tokens);

  // Check if token expired
  if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
    console.log("Access token expired. Refreshing...");
    const newTokens = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(newTokens.credentials);
    saveTokens({
      ...tokens,
      ...newTokens.credentials,
    });
    tokens = newTokens.credentials;
  }

  return tokens.access_token;
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Invalid YouTube URL format');
}

// Post comment to YouTube (internal function)
async function postYoutubeComment(videoId, commentText) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: commentText,
            },
          },
        },
      }),
    }
  );

  const data = await response.json();
  console.log("Comment Response:", data);
  return data;
}

// Main export function for server.js
export async function postYouTubeComment(videoUrl, comment) {
  try {
    console.log('Processing YouTube comment request...');
    console.log('Video URL:', videoUrl);
    
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    console.log('Extracted Video ID:', videoId);
    
    // Post comment
    const result = await postYoutubeComment(videoId, comment);
    
    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Failed to post comment',
        videoUrl: videoUrl,
        comment: comment,
        details: result.error
      };
    }
    
    return {
      success: true,
      message: 'Comment posted successfully!',
      videoUrl: videoUrl,
      comment: comment,
      commentId: result.id,
      data: result
    };
  } catch (error) {
    console.error('Error posting YouTube comment:', error);
    return {
      success: false,
      error: error.message,
      videoUrl: videoUrl,
      comment: comment
    };
  }
}

// ------------------- OAuth Flow Server -------------------

export function startAuthServer() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  

  const app = express();

  app.get("/", (req, res) => {
    res.send(`<a href="${authUrl}">Authorize with YouTube</a>`);
  });

  app.get("/oauth2callback", async (req, res) => {
    try {
      const code = req.query.code;
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      saveTokens(tokens);

      console.log("Access Token:", tokens.access_token);
      console.log("Refresh Token:", tokens.refresh_token);

      res.send("Authorization complete! Tokens saved. You can close this tab.");
    } catch (err) {
      console.error(err);
      res.send("Error during authorization.");
    }
  });

  app.listen(3000, async () => {
    console.log("Open http://localhost:3000 to start YouTube OAuth flow");
    await open("http://localhost:3000");
  });
}

// ------------------- Example Usage -------------------

async function runExample() {
  try {
    const videoId = "VIDEO_ID_HERE"; // Replace with actual video ID
    const comment = "Hello from JS with auto-refresh!";
    await postYoutubeComment(videoId, comment);
  } catch (err) {
    console.error(err);
  }
}

// ------------------- Main -------------------

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === "auth") {
    startAuthServer(); // Run once to authorize and get tokens
  } else if (args[0] === "post") {
    runExample(); // Use saved tokens to post comment
  } else {
    console.log(
      "Usage:\n  node youtube_bot.js auth   -> to authorize and get tokens\n  node youtube_bot.js post   -> to post a comment"
    );
  }
}
