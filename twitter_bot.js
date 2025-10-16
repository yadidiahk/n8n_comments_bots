// x_comment_bot.js
import express from "express";
import open from "open";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fetch from "node-fetch";
import dotenv from "dotenv";
import puppeteer from "puppeteer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const TOKENS_PATH = path.join(__dirname, "x_tokens.json");
const PKCE_PATH = path.join(__dirname, "x_pkce.json");
const TWITTER_PROFILE_PATH = path.join(__dirname, "twitter_profile");

// Track if we're currently re-authenticating to prevent infinite loops
let isReauthenticating = false;

const OAUTH_PORT = 4000; // Unified OAuth port for all services
const CLIENT_ID = process.env.X_CLIENT_ID;          // from developer portal
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;  // optional, for confidential clients
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/twitter/callback`;

// Twitter login credentials for automated login
const TWITTER_USERNAME = process.env.TWITTER_USER || process.env.X_USER;
const TWITTER_PASSWORD = process.env.TWITTER_PASS || process.env.X_PASS;
const TWITTER_HANDLE = process.env.TWITTER_USERNAME || process.env.X_USERNAME;

// Scopes needed to post + keep refresh token
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

const AUTH_URL  = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWEET_URL = "https://api.twitter.com/2/tweets";

// --- Helpers: file I/O ---
const readJSON = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const writeJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// --- Automated Twitter Login ---
async function automateTwitterLogin(page) {
  console.log("🔐 Starting automated Twitter login...");
  
  if (!TWITTER_USERNAME || !TWITTER_PASSWORD) {
    console.log("⚠️  Twitter credentials not found in environment variables.");
    console.log("Set TWITTER_USER (or X_USER) and TWITTER_PASS (or X_PASS)");
    throw new Error("Twitter credentials required for automated login");
  }
  
  const username = TWITTER_USERNAME;
  const password = TWITTER_PASSWORD;
  const twitterHandle = TWITTER_HANDLE;
  
  console.log("Navigating to Twitter login page...");
  await page.goto("https://twitter.com/i/flow/login", { 
    waitUntil: 'networkidle2',
    timeout: 40000 
  });
  
  await delay(5000);
  
  // Step 1: Enter username/email
  console.log("Looking for username field...");
  const usernameSelectors = [
    'input[autocomplete="username"]',
    'input[name="text"]',
    'input[type="text"]',
    'input[type="email"]',
    'input[autocomplete="email"]'
  ];
  
  let usernameElement = null;
  for (const selector of usernameSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        for (const el of elements) {
          const isVisible = await el.isVisible();
          if (isVisible) {
            usernameElement = el;
            console.log(`Found username field with selector: ${selector}`);
            break;
          }
        }
        if (usernameElement) break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!usernameElement) {
    throw new Error('Username field not found');
  }
  
  console.log("Entering username...");
  await usernameElement.click();
  await delay(500);
  await usernameElement.type(username, { delay: 100 });
  console.log("Username entered successfully");
  
  await delay(1000);
  
  // Click "Next" button
  console.log("Looking for Next button...");
  const nextClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const nextButton = buttons.find(btn => {
      const text = btn.textContent?.toLowerCase();
      return text && text.includes('next');
    });
    if (nextButton && nextButton.offsetParent !== null) {
      nextButton.click();
      return true;
    }
    return false;
  });
  
  if (nextClicked) {
    console.log("Next button clicked successfully");
  } else {
    console.log("⚠️ Could not find Next button");
  }
  
  await delay(3000);
  
  // Handle potential verification screen
  const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
  const isVerificationScreen = pageText.includes('unusual') || 
                                pageText.includes('Enter your phone number or username') ||
                                pageText.includes('confirmation') || 
                                pageText.includes('Verify');
  
  if (isVerificationScreen) {
    console.log("🔍 Verification screen detected");
    
    const verificationSelectors = [
      'input[data-testid="ocfEnterTextTextInput"]',
      'input[name="text"]',
      'input[type="text"]'
    ];
    
    let verificationField = null;
    for (const selector of verificationSelectors) {
      try {
        const field = await page.$(selector);
        if (field) {
          const isVisible = await field.isVisible();
          if (isVisible) {
            verificationField = field;
            console.log(`Found verification field: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (verificationField) {
      console.log("Entering verification info...");
      const valueToEnter = twitterHandle || (username.includes('@') ? username.split('@')[0] : username);
      
      await verificationField.click({ clickCount: 3 });
      await delay(300);
      await page.keyboard.press('Backspace');
      await delay(500);
      await verificationField.type(valueToEnter, { delay: 100 });
      console.log("Verification value entered");
      await delay(1500);
      
      // Click next/verify button
      const verifyClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const nextBtn = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase();
          return text && (text.includes('next') || text.includes('verify') || text.includes('confirm'));
        });
        if (nextBtn && nextBtn.offsetParent !== null) {
          nextBtn.click();
          return true;
        }
        return false;
      });
      
      if (verifyClicked) {
        console.log("Verification Next button clicked");
      }
      
      await delay(5000);
    }
  }
  
  // Step 2: Enter password
  console.log("Looking for password field...");
  await delay(2000);
  
  const passwordSelectors = [
    'input[name="password"]',
    'input[type="password"]',
    'input[autocomplete="current-password"]'
  ];
  
  let passwordElement = null;
  for (const selector of passwordSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        for (const el of elements) {
          const isVisible = await el.isVisible();
          const isPassword = await el.evaluate(node => node.type === 'password');
          if (isVisible && isPassword) {
            passwordElement = el;
            console.log(`Found password field with selector: ${selector}`);
            break;
          }
        }
        if (passwordElement) break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!passwordElement) {
    throw new Error('Password field not found');
  }
  
  console.log("Entering password...");
  await passwordElement.click();
  await delay(500);
  await passwordElement.type(password, { delay: 100 });
  console.log("Password entered successfully");
  
  await delay(1000);
  
  // Click "Log in" button
  console.log("Looking for Log in button...");
  const loginClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const loginButton = buttons.find(btn => {
      const text = btn.textContent?.toLowerCase();
      return text && (text.includes('log in') || text === 'next');
    });
    if (loginButton && loginButton.offsetParent !== null) {
      loginButton.click();
      return true;
    }
    return false;
  });
  
  if (loginClicked) {
    console.log("Login button clicked successfully");
  }
  
  await delay(5000);
  
  // Verify login succeeded
  const isLoggedIn = await page.evaluate(() => {
    const tweetButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
    const homeTimeline = document.querySelector('[data-testid="primaryColumn"]');
    const profileButton = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
    return !!(tweetButton || homeTimeline || profileButton);
  });
  
  if (isLoggedIn) {
    console.log("✅ Login successful!");
    return true;
  } else {
    console.log("⚠️ Login may not have completed. Check browser window.");
    return false;
  }
}

// --- Automated OAuth Authorization with Puppeteer ---
async function automateOAuthAuthorization(authUrl, profilePath) {
  console.log("🤖 Starting automated OAuth authorization with Puppeteer...");
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true if you don't want to see the browser
    userDataDir: profilePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log("📱 Navigating to authorization URL...");
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait a bit for the page to fully load
    await delay(3000);
    
    // Check if already logged in or need to log in
    const currentUrl = page.url();
    console.log("Current URL:", currentUrl);
    
    // If redirected to login page, automate login
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      console.log("🔐 Login required. Starting automated login...");
      
      try {
        await automateTwitterLogin(page);
        console.log("✅ Automated login completed, continuing with authorization...");
        
        // Navigate back to authorization URL after login
        console.log("📱 Navigating back to authorization URL...");
        await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(3000);
      } catch (loginError) {
        console.error("❌ Automated login failed:", loginError.message);
        console.log("⚠️  Please log in manually in the browser window...");
        
        // Wait for manual login (max 5 minutes)
        await page.waitForFunction(
          () => !window.location.href.includes('/login') && !window.location.href.includes('/i/flow/login'),
          { timeout: 300000 }
        );
        
        console.log("✅ Login detected, continuing...");
        
        // Navigate back to authorization URL after manual login
        console.log("📱 Navigating back to authorization URL...");
        await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(3000);
      }
    }
    
    // Now we should be on the authorization page
    console.log("🔍 Looking for 'Authorize app' button...");
    
    // Try multiple selectors for the Authorize button
    const authorizeSelectors = [
      'input[type="submit"][value="Authorize app"]',
      'button:has-text("Authorize app")',
      'div[data-testid="OAuth_Consent_Button"]',
      'input[value="Authorize app"]',
      '[role="button"]:has-text("Authorize app")',
    ];
    
    let authorized = false;
    for (const selector of authorizeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Found authorize button with selector: ${selector}`);
        await page.click(selector);
        console.log("🖱️  Clicked 'Authorize app' button");
        authorized = true;
        break;
      } catch (e) {
        // Try next selector
        continue;
      }
    }
    
    if (!authorized) {
      console.log("⚠️  Could not find authorize button automatically.");
      console.log("Please click 'Authorize app' manually in the browser window.");
      
      // Wait for redirect to callback (which means authorization happened)
      await page.waitForFunction(
        (redirectUri) => window.location.href.includes(redirectUri),
        { timeout: 300000 },
        REDIRECT_URI
      );
    }
    
    // Wait for callback redirect
    console.log("⏳ Waiting for authorization callback...");
    await delay(5000);
    
    console.log("✅ Authorization completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during automated authorization:", error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// --- Automated Re-authentication ---
async function triggerAutomatedReauth() {
  if (isReauthenticating) {
    console.log("⚠️  Already re-authenticating, skipping duplicate attempt");
    return false;
  }

  isReauthenticating = true;
  console.log("🔄 Token is invalid. Starting automated re-authentication...");

  try {
    // Create new PKCE challenge
    const pkce = createPkce();
    const authUrl = buildAuthUrl(pkce);
    
    // Start auth server in background
    const server = await startAuthServerForReauth();
    
    // Wait a bit for server to be ready
    await delay(2000);
    
    // Automate OAuth authorization with Puppeteer
    await automateOAuthAuthorization(authUrl, TWITTER_PROFILE_PATH);
    
    // Wait for tokens to be saved (callback writes them)
    console.log("⏳ Waiting for tokens to be saved...");
    let attempts = 0;
    while (attempts < 30) {
      await delay(1000);
      const tokens = readJSON(TOKENS_PATH);
      if (tokens && tokens.access_token) {
        console.log("✅ New tokens obtained successfully!");
        server.close();
        isReauthenticating = false;
        return true;
      }
      attempts++;
    }
    
    throw new Error("Timeout waiting for tokens after authorization");
    
  } catch (error) {
    console.error("❌ Automated re-authentication failed:", error.message);
    isReauthenticating = false;
    throw error;
  }
}

// --- Start Auth Server for Re-authentication (non-blocking) ---
async function startAuthServerForReauth() {
  return new Promise((resolve) => {
    const app = express();
    
    app.get("/twitter/callback", async (req, res) => {
      try {
        const { code, state } = req.query;
        const saved = readJSON(PKCE_PATH);
        if (!saved || saved.state !== state) throw new Error("Invalid or mismatched state.");

        const tokens = await exchangeCodeForTokens(code);
        console.log("✅ Twitter Access token saved. Has refresh_token:", !!tokens.refresh_token);
        res.send("✅ Twitter/X Authorization complete! Tokens saved. You can close this tab.");
      } catch (e) {
        console.error(e);
        res.status(500).send(`❌ OAuth error: ${e.message}`);
      }
    });

    const server = app.listen(OAUTH_PORT, () => {
      console.log(`✅ OAuth callback server started on port ${OAUTH_PORT}`);
      resolve(server);
    });
  });
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

// --- Get valid access token (auto-refresh with automated re-auth) ---
async function getAccessToken() {
  let tokens = readJSON(TOKENS_PATH);
  
  // If no tokens at all, trigger automated re-auth
  if (!tokens) {
    console.log("⚠️  No tokens found. Triggering automated authentication...");
    await triggerAutomatedReauth();
    tokens = readJSON(TOKENS_PATH);
    if (!tokens) throw new Error("Failed to obtain tokens even after re-authentication");
  }

  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = !tokens.expires_at || (now > tokens.expires_at - 60);

  if (needsRefresh) {
    if (!tokens.refresh_token) {
      console.log("⚠️  No refresh_token available. Triggering automated re-authentication...");
      await triggerAutomatedReauth();
      tokens = readJSON(TOKENS_PATH);
      return tokens.access_token;
    }
    
    try {
      tokens = await refreshAccessToken(tokens.refresh_token);
    } catch (error) {
      // If refresh fails with invalid token, trigger automated re-auth
      if (error.message.includes('invalid') || error.message.includes('400')) {
        console.log("⚠️  Refresh token is invalid. Triggering automated re-authentication...");
        await triggerAutomatedReauth();
        tokens = readJSON(TOKENS_PATH);
        if (!tokens) throw new Error("Failed to obtain tokens even after re-authentication");
      } else {
        throw error;
      }
    }
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
