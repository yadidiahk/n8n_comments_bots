// x_comment_bot.js
import express from "express";
import open from "open";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const TOKENS_PATH = path.join(__dirname, "x_tokens.json");
const PKCE_PATH = path.join(__dirname, "x_pkce.json");

const OAUTH_PORT = 4000; // Unified OAuth port for all services
const CLIENT_ID = process.env.X_CLIENT_ID;          // from developer portal
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;  // optional, for confidential clients
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/twitter/callback`;

// Scopes needed to post + keep refresh token
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

const AUTH_URL  = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWEET_URL = "https://api.twitter.com/2/tweets";

// --- Helpers: file I/O ---
const readJSON = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const writeJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2));

// --- Helpers: base64url ---
function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- PKCE generation ---
function createPkce() {
  const codeVerifier = base64url(crypto.randomBytes(64)); // 86 chars
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = "xbot-" + base64url(crypto.randomBytes(24));
  const pkce = { codeVerifier, codeChallenge, state, created_at: Date.now() };
  writeJSON(PKCE_PATH, pkce);
  return pkce;
}

// --- OAuth URLs ---
function buildAuthUrl({ codeChallenge, state }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// --- Token Exchange & Refresh ---
async function exchangeCodeForTokens(code) {
  const pkce = readJSON(PKCE_PATH);
  if (!pkce) throw new Error("Missing PKCE file; start the auth server again.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: pkce.codeVerifier,
  });

  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  
  // Add Basic auth if client secret is available (for confidential clients)
  if (CLIENT_SECRET) {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(data)}`);
  }

  // Compute expires_at if expires_in provided
  if (data.expires_in) data.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
  writeJSON(TOKENS_PATH, data);
  return data;
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  
  // Add Basic auth if client secret is available (for confidential clients)
  if (CLIENT_SECRET) {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Refresh failed: ${res.status} ${JSON.stringify(data)}`);
  }

  if (data.expires_in) data.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
  writeJSON(TOKENS_PATH, data);
  return data;
}

// --- Get valid access token (auto-refresh) ---
async function getAccessToken() {
  let tokens = readJSON(TOKENS_PATH);
  if (!tokens) throw new Error("No tokens saved. Run: node x_comment_bot.js auth");

  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = !tokens.expires_at || (now > tokens.expires_at - 60);

  if (needsRefresh) {
    if (!tokens.refresh_token) {
      throw new Error("No refresh_token available. Re-run auth with 'offline.access' scope.");
    }
    tokens = await refreshAccessToken(tokens.refresh_token);
  }
  return tokens.access_token;
}

// --- Extract tweet ID from URL ---
function extractTweetId(tweetUrl) {
  // Support formats:
  // https://twitter.com/username/status/TWEET_ID
  // https://x.com/username/status/TWEET_ID
  const match = tweetUrl.match(/status\/(\d+)/);
  if (!match) {
    throw new Error("Invalid tweet URL. Expected format: https://twitter.com/username/status/TWEET_ID");
  }
  return match[1];
}

// --- Post a reply (comment) ---
export async function postTweetComment(tweetId, text) {
  const accessToken = await getAccessToken();

  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Tweet failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

// --- Wrapper for server.js API (takes URL instead of ID) ---
export async function postTwitterComment(tweetUrl, comment) {
  try {
    console.log('Processing Twitter comment request...');
    console.log('Tweet URL:', tweetUrl);

    // Extract tweet ID from URL
    const tweetId = extractTweetId(tweetUrl);
    console.log('Extracted Tweet ID:', tweetId);

    // Post the reply
    const result = await postTweetComment(tweetId, comment);
    
    return {
      success: true,
      platform: 'twitter',
      tweetUrl,
      tweetId,
      comment,
      response: result
    };
  } catch (error) {
    console.error('Error posting Twitter comment:', error.message);
    return {
      success: false,
      platform: 'twitter',
      error: error.message
    };
  }
}

// --- Auth server (one-time) ---
export function startAuthServer() {
  if (!CLIENT_ID) {
    console.error("Missing X_CLIENT_ID in .env");
    process.exit(1);
  }
  if (!REDIRECT_URI.startsWith("http://localhost")) {
    console.warn("TIP: For local testing, use a localhost redirect URI registered in your app settings.");
  }

  const app = express();
  const pkce = createPkce();
  const authUrl = buildAuthUrl(pkce);

  app.get("/", (_req, res) => {
    res.send(`
      <h1>OAuth Authentication Server</h1>
      <h2>Twitter/X OAuth</h2>
      <p><a href="${authUrl}">Authorize with Twitter/X</a></p>
      <p>Or access: <a href="/twitter">/twitter</a></p>
    `);
  });

  app.get("/twitter", (_req, res) => {
    res.send(`<a href="${authUrl}">Authorize with Twitter/X</a>`);
  });

  app.get("/twitter/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const saved = readJSON(PKCE_PATH);
      if (!saved || saved.state !== state) throw new Error("Invalid or mismatched state.");

      const tokens = await exchangeCodeForTokens(code);
      console.log("✅ Twitter Access token saved. Has refresh_token:", !!tokens.refresh_token);
      res.send("✅ Twitter/X Authorization complete! Tokens saved to x_tokens.json. You can close this tab.");
    } catch (e) {
      console.error(e);
      res.status(500).send(`❌ OAuth error: ${e.message}`);
    }
  });

  app.listen(OAUTH_PORT, async () => {
    console.log(`\n========================================`);
    console.log(`🔐 OAuth Server running on port ${OAUTH_PORT}`);
    console.log(`========================================`);
    console.log(`Twitter/X OAuth: http://localhost:${OAUTH_PORT}/twitter`);
    console.log(`Or from browser: http://YOUR_VM_IP:${OAUTH_PORT}/twitter`);
    console.log(`========================================\n`);
    // Don't auto-open on server (no browser available)
    // await open(`http://localhost:${OAUTH_PORT}`);
  });
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg1, ...rest] = process.argv.slice(2);
  if (cmd === "auth") {
    startAuthServer();
  } else if (cmd === "post") {
    const tweetId = arg1;
    const text = rest.join(" ") || "Hello from an auto-refreshing X bot!";
    if (!tweetId) {
      console.log("Usage: node x_comment_bot.js post <tweetId> \"your reply text\"");
      process.exit(1);
    }
    postTweetComment(tweetId, text)
      .then((r) => console.log("Success:", JSON.stringify(r, null, 2)))
      .catch((e) => console.error(e));
  } else {
    console.log(`
Usage:
  node x_comment_bot.js auth                          # authorize & save tokens
  node x_comment_bot.js post <tweetId> "reply text"   # post a reply
Env (.env):
  X_CLIENT_ID=your_twitter_client_id
  X_CLIENT_SECRET=your_twitter_client_secret         # required for confidential clients
  X_REDIRECT_URI=http://localhost:3000/oauth2callback
Notes:
  • Register ${REDIRECT_URI} exactly in your Twitter app settings.
  • App MUST have Read+Write and OAuth 2.0 user context enabled.
  • Scopes include offline.access for refresh_token.
`);
  }
}
