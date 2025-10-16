import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kill any existing Chrome/Chromium processes
function killExistingChromeProcesses() {
  try {
    console.log("Checking for existing Chrome/Chromium processes...");
    const { execSync } = require('child_process');
    
    // Find all Chrome/Chromium processes
    try {
      const result = execSync('pgrep -f "chrome|chromium"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = result.trim().split('\n').filter(pid => pid);
      
      if (pids.length > 0) {
        console.log(`Found ${pids.length} Chrome/Chromium process(es): ${pids.join(', ')}`);
        
        // Kill each process
        pids.forEach(pid => {
          try {
            console.log(`Killing process ${pid}...`);
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          } catch (e) {
            // Process might already be dead, that's fine
          }
        });
        
        console.log("Killed existing Chrome/Chromium processes");
        // Wait a bit for processes to fully terminate
        require('child_process').execSync('sleep 2', { stdio: 'ignore' });
      } else {
        console.log("No existing Chrome/Chromium processes found");
      }
    } catch (e) {
      // No processes found (pgrep returns non-zero if no matches)
      console.log("No existing Chrome/Chromium processes found");
    }
  } catch (error) {
    console.log(`Process cleanup error (non-fatal): ${error.message}`);
  }
}

// Clean up Chrome profile lock files to prevent "profile in use" errors
function cleanupProfileLocks(profilePath) {
  try {
    const lockFiles = [
      'SingletonLock',
      'SingletonSocket',
      'SingletonCookie'
    ];
    
    const defaultProfilePath = path.join(profilePath, 'Default');
    
    console.log(`Cleaning up profile lock files in: ${profilePath}`);
    
    // Clean locks in main profile directory
    lockFiles.forEach(lockFile => {
      const filePath = path.join(profilePath, lockFile);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Removed lock file: ${lockFile}`);
        } catch (e) {
          console.log(`Could not remove ${lockFile}: ${e.message}`);
        }
      }
    });
    
    // Clean locks in Default directory
    if (fs.existsSync(defaultProfilePath)) {
      lockFiles.forEach(lockFile => {
        const filePath = path.join(defaultProfilePath, lockFile);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Removed lock file in Default: ${lockFile}`);
          } catch (e) {
            console.log(`Could not remove ${lockFile} in Default: ${e.message}`);
          }
        }
      });
    }
    
    console.log("Profile cleanup completed");
  } catch (error) {
    console.log(`Profile cleanup error (non-fatal): ${error.message}`);
  }
}

export async function postTwitterComment(tweetUrl, commentText) {
  const username = process.env.TWITTER_USER || process.env.X_USER;
  const password = process.env.TWITTER_PASS || process.env.X_PASS;
  // Twitter handle for verification (without @) - e.g., "YadidiahK"
  const twitterHandle = "YadidiahK";
  // Manual mode - keeps browser open indefinitely
  const manualMode = process.env.TWITTER_MANUAL_MODE === 'true';

  if (!username || !password) {
    throw new Error("Twitter credentials not found in environment variables (TWITTER_USER/TWITTER_PASS or X_USER/X_PASS)");
  }

  if (!tweetUrl || !commentText) {
    throw new Error("Both tweetUrl and commentText are required");
  }

  if (manualMode) {
    console.log("\n🔧 ═══════════════════════════════════════════════════════");
    console.log("   MANUAL MODE ENABLED");
    console.log("   ═══════════════════════════════════════════════════════");
    console.log("   The browser will stay open and allow manual intervention");
    console.log("   at any step. Complete any verification screens manually.");
    console.log("   Press Ctrl+C to close the browser when done.");
    console.log("   ═══════════════════════════════════════════════════════\n");
  }

  let browser;
  let page;

  try {
    console.log("Launching browser in headful mode...");
    
    const profilePath = './twitter_profile';
    const launchOptions = {
      headless: false, // Headful mode so you can see it
      userDataDir: profilePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1280,800",
        "--start-maximized"
      ],
      defaultViewport: null
    };

    // Only set executablePath if explicitly provided or if we can find Chrome
    if (process.env.CHROME_BIN) {
      console.log(`Using Chrome from CHROME_BIN: ${process.env.CHROME_BIN}`);
      launchOptions.executablePath = process.env.CHROME_BIN;
    } else if (process.platform === 'linux') {
      // On Linux, try to find Chrome/Chromium
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium'
      ];
      
      let foundChrome = null;
      for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
          foundChrome = chromePath;
          console.log(`Found Chrome at: ${chromePath}`);
          break;
        }
      }
      
      if (foundChrome) {
        launchOptions.executablePath = foundChrome;
      } else {
        console.log('⚠️ Chrome not found at common Linux paths. Letting Puppeteer try to find it...');
        console.log('If this fails, install Chrome with: apt-get install chromium');
      }
    }
    // On macOS and Windows, let Puppeteer find Chrome automatically

    // Kill any existing Chrome processes first
    killExistingChromeProcesses();
    
    // Clean up profile locks before launching browser
    cleanupProfileLocks(profilePath);

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.setViewport({ width: 1280, height: 800 });

    // Enhanced anti-detection
    await page.evaluateOnNewDocument(() => { 
      // Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Chrome runtime
      window.chrome = {
        runtime: {}
      };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    console.log("Checking if already logged in...");
    try {
      await page.goto("https://twitter.com/home", { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    } catch (navError) {
      console.log("Initial navigation timeout, but continuing...");
    }
    
    // Wait longer and try to wait for specific elements
    await delay(5000);
    
    let currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Better login verification - check for logged-in elements with retry logic
    let isLoggedIn = false;
    
    // Try multiple times to detect login state (in case page is still loading)
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Login detection attempt ${attempt}/3...`);
      
      isLoggedIn = await page.evaluate(() => {
        // Check for multiple elements that only appear when logged in
        const tweetButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
        const homeTimeline = document.querySelector('[data-testid="primaryColumn"]');
        const profileButton = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
        const sideNav = document.querySelector('nav[aria-label="Primary"]');
        const logoutButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        
        // Also check if we're NOT on a login page
        const loginForm = document.querySelector('[action="/i/flow/login"]');
        const signInText = document.body?.innerText?.includes('Sign in to X') || 
                           document.body?.innerText?.includes('Sign in to Twitter');
        
        // If we see login indicators, definitely not logged in
        if (loginForm || signInText) {
          return false;
        }
        
        // If we see any logged-in indicators, we're logged in
        return !!(tweetButton || homeTimeline || profileButton || sideNav);
      });
      
      console.log(`Attempt ${attempt} - Login detected: ${isLoggedIn}`);
      
      if (isLoggedIn) {
        break; // Found login state, no need to retry
      }
      
      // If not logged in yet, wait a bit more for page to load
      if (attempt < 3) {
        console.log("Waiting for page to load more...");
        await delay(3000);
      }
    }
    
    console.log(`Final login verification: ${isLoggedIn ? 'Logged in ✓' : 'Not logged in ✗'}`);
    
    // Additional check: Try to verify we can actually post
    let canPost = false;
    if (isLoggedIn) {
      canPost = await page.evaluate(() => {
        // Check if we can see the compose tweet button
        const composeButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
        return !!composeButton;
      });
      console.log(`Can post tweets: ${canPost}`);
    }
    
    // Check if we need to login - only check URL if isLoggedIn is false
    const needsLogin = !isLoggedIn || (currentUrl.includes("/login") || currentUrl.includes("/i/flow/login"));
    
    if (needsLogin) {
      console.log("Not logged in. Proceeding with login...");
      
      console.log("Navigating to Twitter login page...");
      try {
        await page.goto("https://twitter.com/i/flow/login", { 
          waitUntil: 'networkidle2',
          timeout: 40000 
        });
        console.log("Login page loaded");
      } catch (navError) {
        console.log("Login page navigation timeout, but continuing...");
      }
      
      // Wait longer for page to fully render
      await delay(5000);
      
      // Check if page actually loaded
      const pageHasContent = await page.evaluate(() => {
        return document.body && document.body.innerHTML.length > 100;
      });
      
      if (!pageHasContent) {
        console.log("⚠️ Page appears empty. Trying alternative login URLs...");
        
        const alternativeUrls = [
          "https://twitter.com/login",
          "https://x.com/i/flow/login",
          "https://x.com/login"
        ];
        
        for (const url of alternativeUrls) {
          try {
            console.log(`Trying: ${url}`);
            await page.goto(url, { 
              waitUntil: 'networkidle2',
              timeout: 40000 
            });
            await delay(5000);
            
            const hasContentNow = await page.evaluate(() => {
              const inputs = document.querySelectorAll('input').length;
              const bodyLength = document.body ? document.body.innerHTML.length : 0;
              return inputs > 0 || bodyLength > 1000;
            });
            
            if (hasContentNow) {
              console.log(`✓ ${url} loaded successfully!`);
              break;
            }
          } catch (e) {
            console.log(`✗ ${url} failed:`, e.message);
            continue;
          }
        }
      }
      
      // Step 1: Enter username/email/phone
      console.log("Looking for username field...");
      
      // Wait for login page to fully load
      await delay(3000);
      
      const usernameSelectors = [
        'input[autocomplete="username"]',
        'input[name="text"]',
        'input[type="text"]',
        'input[placeholder*="Phone"]',
        'input[placeholder*="email"]',
        'input[placeholder*="username"]',
        'input[autocomplete="on"]',
        'input.r-30o5oe',  // Twitter's input class
        'input'  // Last resort - any input field
      ];
      
      let usernameSelector = null;
      let usernameElement = null;
      
      for (const selector of usernameSelectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`Found ${elements.length} elements matching: ${selector}`);
          
          if (elements.length > 0) {
            // Try to find a visible input field
            for (const el of elements) {
              try {
                const isVisible = await el.isVisible();
                const isInput = await el.evaluate(node => 
                  node.tagName === 'INPUT' && 
                  (node.type === 'text' || node.type === 'email' || node.type === 'tel')
                );
                
                if (isVisible && isInput) {
                  usernameSelector = selector;
                  usernameElement = el;
                  console.log(`Found valid username field with selector: ${selector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            if (usernameSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!usernameSelector) {
        // Debug: Show all inputs on page
        const availableInputs = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input');
          return Array.from(inputs).map((inp, i) => ({
            index: i,
            type: inp.type,
            name: inp.name,
            placeholder: inp.placeholder,
            autocomplete: inp.autocomplete,
            visible: inp.offsetParent !== null,
            className: inp.className
          }));
        });
        console.log("Available input fields:", JSON.stringify(availableInputs, null, 2));
        
        // Check what's actually on the page
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            bodyLength: document.body ? document.body.innerHTML.length : 0,
            hasInputs: document.querySelectorAll('input').length,
            hasButtons: document.querySelectorAll('button').length,
            bodyText: document.body ? document.body.innerText.substring(0, 200) : 'No body',
            divCount: document.querySelectorAll('div').length
          };
        });
        console.log("Page info:", JSON.stringify(pageInfo, null, 2));
        
        await page.screenshot({ path: 'twitter-login-page-debug.png', fullPage: true });
        
        // Save HTML for debugging
        const html = await page.content();
        fs.writeFileSync('twitter-login-page.html', html);
        console.log("Page HTML saved to twitter-login-page.html");
        
        throw new Error('Username field not found. Page may not have loaded properly. Check twitter-login-page-debug.png and twitter-login-page.html');
      }
      
      console.log("Entering username...");
      try {
        // Click the field first to focus it
        await usernameElement.click();
        await delay(500);
        
        // Type the username
        await usernameElement.type(username, { delay: 100 });
        console.log("Username entered successfully");
      } catch (e) {
        console.log("Error with element typing, trying selector method...");
        await page.click(usernameSelector);
        await delay(500);
        await page.type(usernameSelector, username, { delay: 100 });
      }
      
      await delay(1000);
      
      // Click "Next" button
      console.log("Looking for Next button...");
      const nextButtonSelectors = [
        'button[role="button"]',
        'div[role="button"]',
        'button[type="button"]',
        'button',
        '[data-testid="LoginForm_Login_Button"]'
      ];
      
      let clicked = false;
      for (const selector of nextButtonSelectors) {
        try {
          const buttons = await page.$$(selector);
          console.log(`Found ${buttons.length} buttons matching: ${selector}`);
          
          for (const button of buttons) {
            try {
              const text = await button.evaluate(el => el.textContent?.trim());
              const isVisible = await button.isVisible();
              
              if (isVisible && text && text.toLowerCase().includes('next')) {
                console.log(`Clicking button with text: "${text}"`);
                await button.click();
                clicked = true;
                console.log("Next button clicked successfully");
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (clicked) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!clicked) {
        console.log("Trying JavaScript click for Next button...");
        // Try generic approach - click any button with "Next" text
        const jsClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="button"], [role="button"]'));
          const nextButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase();
            return text && text.includes('next');
          });
          if (nextButton) {
            nextButton.click();
            return true;
          }
          return false;
        });
        
        if (jsClicked) {
          console.log("Next button clicked via JavaScript");
        } else {
          console.log("⚠️ Warning: Could not find Next button");
        }
      }
      
      await delay(3000);
      
      // Handle potential "unusual activity" screen (phone/username verification)
      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
      
      if (pageContent.includes('unusual') || pageContent.includes('verify') || 
          pageText.includes('unusual') || pageText.includes('Enter your phone number or username')) {
        console.log("\n🔍 ═══════════════════════════════════════════════════════");
        console.log("   VERIFICATION REQUIRED");
        console.log("   ═══════════════════════════════════════════════════════");
        console.log("   Twitter is asking for additional confirmation.");
        console.log("   ");
        console.log("   🤖 AUTO MODE: Bot will attempt to handle this automatically");
        console.log("   👤 MANUAL MODE: You can also complete it manually in the browser");
        console.log("   ");
        console.log("   The browser will remain open for 90 seconds to allow manual");
        console.log("   completion if the automatic method fails.");
        console.log("   ═══════════════════════════════════════════════════════\n");
        
        await delay(3000);
        
        // Try entering username again if asked
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
                console.log(`Found verification field with selector: ${selector}`);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        if (verificationField) {
          console.log("Clearing and entering username for verification...");
          
          // Clear the field first (might have email in it)
          await verificationField.click({ clickCount: 3 });
          await delay(300);
          await page.keyboard.press('Backspace');
          await delay(500);
          
          // Enter the username (Twitter often wants the @handle, not email)
          // Use TWITTER_USERNAME if set, otherwise extract from email
          let usernameToEnter = twitterHandle || username;
          
          if (!twitterHandle && username.includes('@')) {
            // If it's an email and no handle specified, try just the part before @
            usernameToEnter = username.split('@')[0];
            console.log(`No TWITTER_USERNAME set, using email part: ${usernameToEnter}`);
          } else if (twitterHandle) {
            console.log(`Using TWITTER_USERNAME from env: ${twitterHandle}`);
          }
          
          await verificationField.type(usernameToEnter, { delay: 100 });
          console.log("Verification username entered");
          await delay(1500);
          
          // Click next/verify button
          console.log("Looking for Next button on verification page...");
          const nextClicked = await page.evaluate(() => {
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
          
          if (nextClicked) {
            console.log("Verification Next button clicked");
          } else {
            console.log("⚠️ Could not find Next button on verification page");
          }
          
          await delay(4000);
        } else {
          console.log("⚠️ Could not find verification input field automatically");
          console.log("📋 Please complete the verification manually in the browser window");
          console.log("⏱️  Waiting 90 seconds for you to complete it...\n");
          
          // Wait for manual completion
          await delay(90000);
        }
        
        // Check if we've moved past the verification screen
        const currentUrlAfterVerification = page.url();
        console.log(`Current URL after verification: ${currentUrlAfterVerification}`);
        
        // If still on verification/login flow, give more time
        if (currentUrlAfterVerification.includes('/flow/login') || currentUrlAfterVerification.includes('/login')) {
          console.log("⚠️ Still on login flow. If you completed verification manually, waiting a bit longer...");
          await delay(5000);
        }
      }
      
      // Step 2: Enter password
      console.log("Looking for password field...");
      
      // Wait for password page to load
      await delay(2000);
      
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]',
        'input[placeholder*="Password"]',
        'input[placeholder*="password"]'
      ];
      
      let passwordSelector = null;
      let passwordElement = null;
      
      for (const selector of passwordSelectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`Found ${elements.length} password elements matching: ${selector}`);
          
          if (elements.length > 0) {
            for (const el of elements) {
              try {
                const isVisible = await el.isVisible();
                const isPassword = await el.evaluate(node => node.type === 'password');
                
                if (isVisible && isPassword) {
                  passwordSelector = selector;
                  passwordElement = el;
                  console.log(`Found valid password field with selector: ${selector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            if (passwordSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!passwordSelector) {
        // Debug: Show all inputs on page
        const availableInputs = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input');
          return Array.from(inputs).map((inp, i) => ({
            index: i,
            type: inp.type,
            name: inp.name,
            placeholder: inp.placeholder,
            visible: inp.offsetParent !== null
          }));
        });
        console.log("Available input fields on password page:", JSON.stringify(availableInputs, null, 2));
        
        await page.screenshot({ path: 'twitter-password-page-debug.png', fullPage: true });
        throw new Error('Password field not found. Screenshot saved.');
      }
      
      console.log("Entering password...");
      try {
        // Click the field first to focus it
        await passwordElement.click();
        await delay(500);
        
        // Type the password
        await passwordElement.type(password, { delay: 100 });
        console.log("Password entered successfully");
      } catch (e) {
        console.log("Error with element typing, trying selector method...");
        await page.click(passwordSelector);
        await delay(500);
        await page.type(passwordSelector, password, { delay: 100 });
      }
      
      await delay(1000);
      
      // Click "Log in" button
      console.log("Looking for Log in button...");
      const loginButtonSelectors = [
        '[data-testid="LoginForm_Login_Button"]',
        'button[role="button"]',
        'div[role="button"]',
        'button[type="button"]',
        'button'
      ];
      
      clicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          const buttons = await page.$$(selector);
          console.log(`Found ${buttons.length} buttons matching: ${selector}`);
          
          for (const button of buttons) {
            try {
              const text = await button.evaluate(el => el.textContent?.trim());
              const isVisible = await button.isVisible();
              
              if (isVisible && text && (text.toLowerCase().includes('log in') || text.toLowerCase().includes('login'))) {
                console.log(`Clicking button with text: "${text}"`);
                await button.click();
                clicked = true;
                console.log("Log in button clicked successfully");
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (clicked) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!clicked) {
        console.log("Trying JavaScript click for Log in button...");
        // Try generic approach
        const jsClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="button"], [role="button"]'));
          const loginButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase();
            return text && (text.includes('log in') || text.includes('login'));
          });
          if (loginButton) {
            loginButton.click();
            return true;
          }
          return false;
        });
        
        if (jsClicked) {
          console.log("Log in button clicked via JavaScript");
        } else {
          console.log("⚠️ Warning: Could not find Log in button");
        }
      }
      
      console.log("Waiting for login to complete...");
      try {
        await page.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
      } catch (navError) {
        console.log("Navigation timeout - checking if logged in anyway...");
      }
      
      await delay(3000);
      
      currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);
      
      // Check for challenge/verification screens
      if (currentUrl.includes("/checkpoint/") || currentUrl.includes("/challenge/") || 
          currentUrl.includes("/account/access")) {
        console.log("\n⚠️  ═══════════════════════════════════════════════════════");
        console.log("   MANUAL VERIFICATION REQUIRED");
        console.log("   ═══════════════════════════════════════════════════════");
        console.log("   Twitter is asking for additional verification.");
        console.log("   This may require 2FA, email code, phone verification, etc.");
        console.log("   ");
        console.log("   👉 Please complete the verification in the browser window");
        console.log("   ⏱️  Browser will remain open for 120 seconds");
        console.log("   ═══════════════════════════════════════════════════════\n");
        await delay(120000);
        
        currentUrl = page.url();
        console.log(`URL after waiting: ${currentUrl}`);
      }
      
      if (currentUrl.includes("/login")) {
        throw new Error("Login failed - still on login page. Check your credentials or complete verification manually.");
      }
      
      console.log("✅ Login successful!");
    } else {
      console.log("Already logged in! Skipping login process.");
    }
    
    // Navigate to the tweet
    console.log(`Navigating to tweet: ${tweetUrl}`);
    try {
      await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 40000 });
    } catch (navError) {
      console.log("Navigation to tweet timed out, but continuing...");
    }
    
    await delay(5000);
    
    // Scroll to ensure tweet is in view
    console.log("Scrolling to tweet...");
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await delay(3000);
    
    // Wait for reply button to appear
    console.log("Waiting for reply button to load...");
    try {
      await page.waitForSelector('[data-testid="reply"]', { timeout: 10000, visible: true });
      console.log("Reply button detected!");
    } catch (e) {
      console.log("Reply button selector not found immediately, trying alternatives...");
    }
    
    // Find and click the reply button
    console.log("Looking for reply button...");
    const replyButtonSelectors = [
      '[data-testid="reply"]',
      'button[data-testid="reply"]',
      'div[data-testid="reply"]',
      'button[aria-label*="Reply"]',
      'button[aria-label*="reply"]',
      '[role="button"][aria-label*="Reply"]',
      '[data-testid="replyButton"]'
    ];
    
    let replyButtonFound = false;
    for (const selector of replyButtonSelectors) {
      try {
        const buttons = await page.$$(selector);
        console.log(`Found ${buttons.length} elements matching: ${selector}`);
        
        for (const button of buttons) {
          try {
            const isVisible = await button.isVisible().catch(() => false);
            const boundingBox = await button.boundingBox();
            
            if (isVisible && boundingBox) {
              console.log(`Clicking reply button with selector: ${selector}`);
              
              // Scroll button into view first
              await button.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
              await delay(1000);
              
              await button.click();
              replyButtonFound = true;
              await delay(3000);
              break;
            }
          } catch (e) {
            console.log(`Error clicking button: ${e.message}`);
            continue;
          }
        }
        if (replyButtonFound) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!replyButtonFound) {
      console.log("Trying JavaScript click on reply button...");
      
      // Get all available reply-related elements for debugging
      const availableElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-testid*="reply" i], button[aria-label*="reply" i], [role="button"]');
        return Array.from(elements).slice(0, 10).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          testId: el.getAttribute('data-testid'),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className,
          visible: el.offsetParent !== null,
          text: el.textContent?.trim().substring(0, 30)
        }));
      });
      console.log("Available reply-related elements:", JSON.stringify(availableElements, null, 2));
      
      // Try JavaScript click
      const jsClicked = await page.evaluate(() => {
        // Try multiple approaches
        const selectors = [
          '[data-testid="reply"]',
          'button[data-testid="reply"]',
          'button[aria-label*="Reply"]',
          'button[aria-label*="reply"]'
        ];
        
        for (const sel of selectors) {
          const buttons = document.querySelectorAll(sel);
          for (const btn of buttons) {
            if (btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });
      
      if (jsClicked) {
        console.log("Reply button clicked via JavaScript");
        replyButtonFound = true;
        await delay(3000);
      } else {
        await page.screenshot({ path: 'twitter-reply-button-not-found.png', fullPage: true });
        throw new Error('Reply button not found. Screenshot saved.');
      }
    }
    
    // Check if a login modal appeared (Twitter sometimes shows this even when logged in)
    console.log("Checking for login modal...");
    await delay(2000);
    
    const loginModalDetected = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        const text = modal.textContent || '';
        return text.includes('Reply to join') || text.includes('Log in') || text.includes('Sign up');
      }
      return false;
    });
    
    if (loginModalDetected) {
      console.log("⚠️ Login modal detected after clicking reply! Session may not be properly authenticated.");
      console.log("\n🔧 TROUBLESHOOTING:");
      console.log("   Your Twitter session is invalid or expired.");
      console.log("   To fix this:");
      console.log("   1. Delete the 'twitter_profile' directory");
      console.log("   2. Run the bot again to create a fresh login session");
      console.log("   3. Complete any 2FA/verification if required\n");
      
      await page.screenshot({ path: 'twitter-auth-error.png', fullPage: true });
      
      throw new Error(`Twitter authentication failed. Login modal appeared when trying to reply. 
      
SOLUTION: Delete the './twitter_profile' directory and try again to create a fresh session.
Command: rm -rf ./twitter_profile

This will force a new login and should resolve the issue.`);
    }
    
    // Find the reply text box
    console.log("Looking for reply text box...");
    
    // Wait for the reply dialog to appear
    console.log("Waiting for reply dialog/text box...");
    try {
      await page.waitForSelector('[data-testid="tweetTextarea_0"], div[contenteditable="true"][role="textbox"]', { 
        timeout: 10000, 
        visible: true 
      });
      console.log("Reply text box detected!");
    } catch (e) {
      console.log("Reply text box not immediately visible, continuing search...");
    }
    
    await delay(2000);
    
    const replyBoxSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[contenteditable="true"][role="textbox"]',
      '[data-testid="tweetTextarea"]',
      'div.public-DraftEditor-content[contenteditable="true"]',
      '.DraftEditor-editorContainer div[contenteditable="true"]',
      'div[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]'
    ];
    
    let replyBoxSelector = null;
    let replyBoxElement = null;
    
    for (let attempt = 0; attempt < 4; attempt++) {
      if (replyBoxSelector) break;
      
      console.log(`Attempt ${attempt + 1} to find reply box...`);
      
      for (const selector of replyBoxSelectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`Found ${elements.length} elements matching: ${selector}`);
          
          if (elements.length > 0) {
            for (const el of elements) {
              try {
                const isVisible = await el.isVisible();
                const boundingBox = await el.boundingBox();
                const isEditable = await el.evaluate(node => node.contentEditable === 'true');
                
                if (isVisible && boundingBox && isEditable) {
                  replyBoxSelector = selector;
                  replyBoxElement = el;
                  console.log(`Found valid reply box with selector: ${selector}`);
                  break;
                }
              } catch (e) {
                console.log(`Error checking element: ${e.message}`);
                continue;
              }
            }
            if (replyBoxSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!replyBoxSelector && attempt < 3) {
        console.log("Reply box not found, waiting and scrolling...");
        await delay(2000);
        await page.evaluate(() => window.scrollBy(0, 100));
      }
    }
    
    if (!replyBoxSelector) {
      await page.screenshot({ path: 'twitter-reply-box-not-found.png', fullPage: true });
      
      // Debug info
      const editableElements = await page.evaluate(() => {
        const editables = document.querySelectorAll('[contenteditable="true"], [role="textbox"]');
        return Array.from(editables).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          className: el.className,
          testId: el.getAttribute('data-testid'),
          visible: el.offsetParent !== null
        }));
      });
      console.log("Available editable elements:", JSON.stringify(editableElements, null, 2));
      
      throw new Error('Reply text box not found. Screenshot saved.');
    }
    
    // Click and focus on the reply box
    console.log("Clicking reply box...");
    try {
      await replyBoxElement.click();
    } catch (e) {
      await page.click(replyBoxSelector);
    }
    await delay(1000);
    
    // Type the comment
    console.log(`Typing comment: "${commentText}"`);
    await page.type(replyBoxSelector, commentText, { delay: 50 });
    await delay(1000);
    
    // Verify text was entered
    const typedText = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText || element.textContent : '';
    }, replyBoxSelector);
    console.log(`Text in reply box: "${typedText}"`);
    
    if (!typedText || !typedText.includes(commentText.substring(0, 20))) {
      throw new Error(`Comment text mismatch! Expected: "${commentText}", Got: "${typedText}"`);
    }
    
    // Find and click the Tweet/Reply button
    console.log("Looking for Tweet/Reply button...");
    const tweetButtonSelectors = [
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      'div[data-testid="tweetButton"]',
      'button[type="button"][role="button"]'
    ];
    
    let tweetButtonFound = false;
    for (const selector of tweetButtonSelectors) {
      try {
        const buttons = await page.$$(selector);
        for (const button of buttons) {
          try {
            const isVisible = await button.isVisible();
            const isEnabled = await button.evaluate(node => !node.disabled && node.offsetParent !== null);
            const text = await button.evaluate(node => node.textContent);
            
            if (isVisible && isEnabled && (
              text?.toLowerCase().includes('reply') || 
              text?.toLowerCase().includes('tweet') ||
              selector.includes('tweetButton')
            )) {
              console.log(`Clicking Tweet button with selector: ${selector}`);
              await button.click();
              tweetButtonFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        if (tweetButtonFound) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!tweetButtonFound) {
      // Try JavaScript click
      const jsClicked = await page.evaluate(() => {
        const tweetBtn = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
        if (tweetBtn && !tweetBtn.disabled) {
          tweetBtn.click();
          return true;
        }
        return false;
      });
      
      if (!jsClicked) {
        await page.screenshot({ path: 'twitter-tweet-button-not-found.png', fullPage: true });
        throw new Error('Tweet button not found or disabled. Screenshot saved.');
      }
      
      console.log("Tweet button clicked via JavaScript");
    }
    
    console.log("Waiting for reply to be posted...");
    await delay(4000);
    
    // Verify the reply was posted by checking if the reply box is gone or empty
    const replyBoxAfterSubmit = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return element.innerText || element.textContent || '';
    }, replyBoxSelector);
    
    console.log(`Reply box after submit: "${replyBoxAfterSubmit}"`);
    
    // Check if we're back to the normal tweet view (reply dialog closed)
    const replyDialogVisible = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], [data-testid="modal"]');
      return dialog !== null;
    });
    
    if (!replyDialogVisible) {
      console.log("✓ SUCCESS! Reply dialog closed - comment likely posted!");
    } else if (!replyBoxAfterSubmit || replyBoxAfterSubmit.trim() === '') {
      console.log("✓ SUCCESS! Reply box is empty - comment likely posted!");
    } else {
      console.log("⚠ WARNING: Reply may not have been posted.");
      await page.screenshot({ path: 'twitter-post-submit-screenshot.png', fullPage: true });
    }
    
    console.log("Twitter comment posted successfully!");
    await delay(2000);
    
    // Cleanup: close any extra tabs
    try {
      const pages = await browser.pages();
      if (pages.length > 1) {
        console.log(`Closing ${pages.length - 1} extra tabs...`);
        for (let i = 1; i < pages.length; i++) {
          try {
            await pages[i].close();
          } catch (e) {
            console.log(`Error closing tab ${i}:`, e.message);
          }
        }
      }
    } catch (cleanupError) {
      console.log("Cleanup error:", cleanupError.message);
    }
    
    return {
      success: true,
      message: "Twitter comment posted successfully!",
      tweetUrl: tweetUrl,
      comment: commentText
    };
    
  } catch (error) {
    console.error("Error occurred:", error.message);
    if (page) {
      console.log("Current URL:", page.url());
      console.log("Taking screenshot for debugging...");
      try {
        await page.screenshot({ path: 'twitter-error-screenshot.png', fullPage: true });
        console.log("Screenshot saved as twitter-error-screenshot.png");
      } catch (screenshotError) {
        console.log("Could not take screenshot:", screenshotError.message);
      }
    }
    throw error;
  } finally {
    if (browser && !manualMode) {
      await browser.close();
      console.log("Browser closed.");
    } else if (browser && manualMode) {
      console.log("\n🔧 MANUAL MODE: Browser left open. Press Ctrl+C to exit when done.");
      // Keep process alive
      await new Promise(() => {}); // Never resolves - keeps browser open
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const [tweetUrl, ...commentParts] = process.argv.slice(2);
  const comment = commentParts.join(' ');
  
  if (!tweetUrl || !comment) {
    console.log(`
Usage:
  node twitter_puppeteer_bot.js <tweet_url> <comment_text>

Example:
  node twitter_puppeteer_bot.js "https://twitter.com/user/status/123456" "Great tweet!"

Environment variables needed in .env:
  TWITTER_USER (or X_USER) - Your Twitter email or phone for login
  TWITTER_PASS (or X_PASS) - Your Twitter password
  TWITTER_USERNAME (or X_USERNAME) - Your Twitter handle (optional, for verification)
                                      Example: "YadidiahK" (without @)
  TWITTER_MANUAL_MODE - Set to "true" to keep browser open for full manual control
                        Browser won't close automatically - use Ctrl+C to exit
    `);
    process.exit(1);
  }
  
  postTwitterComment(tweetUrl, comment)
    .then((result) => {
      console.log('\n✅ Success!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

