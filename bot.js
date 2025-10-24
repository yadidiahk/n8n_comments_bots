import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
dotenv.config();


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Browser instance management
let linkedinBrowser = null;
let linkedinBrowserLock = false;
let linkedinPage = null; // Reuse the same page across requests
let linkedinPageLock = false;

// Function to get or create browser instance
async function getLinkedInBrowser() {
  // Wait if another request is launching the browser
  let waitCount = 0;
  while (linkedinBrowserLock && waitCount < 30) {
    console.log("Waiting for another browser launch to complete...");
    await delay(1000);
    waitCount++;
  }
  
  // Check if existing browser is still connected
  if (linkedinBrowser && linkedinBrowser.isConnected()) {
    console.log("Reusing existing browser instance");
    return linkedinBrowser;
  }
  
  // Lock to prevent concurrent launches
  linkedinBrowserLock = true;
  
  try {
    console.log("Launching new browser instance...");
    
    const profilePath = './linkedin_profile';
    
    // Only kill processes if we don't have a working browser
    if (!linkedinBrowser || !linkedinBrowser.isConnected()) {
      killExistingChromeProcesses();
      cleanupProfileLocks(profilePath);
      await delay(2000);
    }
    
    const launchOptions = {
      headless: false,
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

    if (process.env.CHROME_BIN) {
      launchOptions.executablePath = process.env.CHROME_BIN;
    } else if (process.platform === 'linux') {
      launchOptions.executablePath = '/usr/bin/chromium';
    }

    linkedinBrowser = await puppeteer.launch(launchOptions);
    
    // Handle browser disconnection
    linkedinBrowser.on('disconnected', () => {
      console.log("Browser disconnected, clearing instance");
      linkedinBrowser = null;
      linkedinPage = null; // Clear page reference too
    });
    
    console.log("Browser launched successfully");
    return linkedinBrowser;
    
  } finally {
    linkedinBrowserLock = false;
  }
}

// Function to get or create a reusable page
async function getLinkedInPage(browser) {
  // Wait if another request is setting up the page
  let waitCount = 0;
  while (linkedinPageLock && waitCount < 30) {
    console.log("Waiting for page setup to complete...");
    await delay(1000);
    waitCount++;
  }
  
  // Check if we have a valid existing page
  if (linkedinPage && !linkedinPage.isClosed()) {
    console.log("Reusing existing page instance");
    return linkedinPage;
  }
  
  // Lock to prevent concurrent page creation
  linkedinPageLock = true;
  
  try {
    console.log("Creating new page instance...");
    linkedinPage = await browser.newPage();
    
    await linkedinPage.setViewport({ width: 1280, height: 800 });
    
    await linkedinPage.evaluateOnNewDocument(() => { 
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    console.log("Page created successfully");
    return linkedinPage;
    
  } finally {
    linkedinPageLock = false;
  }
}

// Check if we're already logged in by checking both URL and cookies
async function isLoggedInToLinkedIn(page) {
  try {
    console.log("Checking LinkedIn login status...");
    
    // Method 1: Check for LinkedIn session cookies
    const cookies = await page.cookies();
    const hasSessionCookie = cookies.some(cookie => 
      (cookie.name === 'li_at' || cookie.name === 'JSESSIONID') && cookie.value
    );
    
    if (hasSessionCookie) {
      console.log("✓ Session cookies found");
    } else {
      console.log("✗ No session cookies found (but will check other methods)");
    }
    
    // Method 2: Navigate to feed and check URL
    console.log("Verifying login by navigating to feed...");
    try {
      await page.goto("https://www.linkedin.com/feed", { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    } catch (navError) {
      console.log("Navigation timeout, but continuing to check...");
    }
    
    await delay(3000);
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Method 3: Check if we're on a logged-in page
    const isOnLoginPage = currentUrl.includes("/login") || currentUrl.includes("/uas/login");
    
    if (isOnLoginPage) {
      console.log("✗ On login page - not logged in");
      return false;
    }
    
    // Method 4: Check for logged-in elements on the page
    const hasProfileElement = await page.evaluate(() => {
      // Check for common logged-in indicators
      const indicators = [
        '.global-nav__me',
        '[data-control-name="identity_welcome_message"]',
        '.feed-identity-module',
        'img[alt*="profile"]'
      ];
      
      for (const selector of indicators) {
        if (document.querySelector(selector)) {
          return true;
        }
      }
      return false;
    });
    
    if (hasProfileElement) {
      console.log("✓ Logged-in UI elements detected");
      console.log("✅ Confirmed: User is logged in");
      return true;
    }
    
    console.log("✗ No logged-in UI elements found");
    return false;
    
  } catch (error) {
    console.log("Login check error:", error.message);
    return false;
  }
}

// Kill any existing Chrome/Chromium processes
function killExistingChromeProcesses() {
  try {
    console.log("Checking for existing Chrome/Chromium processes...");
    
    // Try multiple times to ensure all processes are killed
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Process cleanup attempt ${attempt}/3...`);
      
      // Find all Chrome/Chromium processes
      try {
        const result = execSync('pgrep -f "chrome|chromium"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const pids = result.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
          console.log(`Found ${pids.length} Chrome/Chromium process(es): ${pids.join(', ')}`);
          
          // Kill each process with SIGKILL
          pids.forEach(pid => {
            try {
              console.log(`Killing process ${pid}...`);
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            } catch (e) {
              // Process might already be dead, that's fine
            }
          });
          
          console.log("Sent kill signals to Chrome/Chromium processes");
          console.log("Waiting for processes to terminate...");
          execSync('sleep 3', { stdio: 'ignore' });
          
          // Check if any processes still exist
          try {
            const stillRunning = execSync('pgrep -f "chrome|chromium"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            if (stillRunning.trim()) {
              console.log(`Some processes still running, retrying...`);
              continue;
            }
          } catch (e) {
            // No processes found - good!
            console.log("✅ All Chrome/Chromium processes terminated");
            break;
          }
        } else {
          console.log("No existing Chrome/Chromium processes found");
          break;
        }
      } catch (e) {
        // No processes found (pgrep returns non-zero if no matches)
        console.log("No existing Chrome/Chromium processes found");
        break;
      }
    }
  } catch (error) {
    console.log(`Process cleanup error (non-fatal): ${error.message}`);
  }
}

// Clean up Chrome profile lock files to prevent "profile in use" errors
function cleanupProfileLocks(profilePath) {
  try {
    // execSync is already imported at the top of the file
    const lockFiles = [
      'SingletonLock',
      'SingletonSocket',
      'SingletonCookie'
    ];
    
    const defaultProfilePath = path.join(profilePath, 'Default');
    
    console.log(`Cleaning up profile lock files in: ${profilePath}`);
    
    // Try multiple times to ensure locks are removed
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Lock cleanup attempt ${attempt}/3...`);
      
      // Clean locks in main profile directory
      lockFiles.forEach(lockFile => {
        const filePath = path.join(profilePath, lockFile);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Removed lock file: ${lockFile}`);
          } catch (e) {
            console.log(`Could not remove ${lockFile}: ${e.message}, trying force remove...`);
            try {
              execSync(`rm -f "${filePath}"`, { stdio: 'ignore' });
            } catch (e2) {
              console.log(`Force remove also failed for ${lockFile}`);
            }
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
              console.log(`Could not remove ${lockFile} in Default: ${e.message}, trying force remove...`);
              try {
                execSync(`rm -f "${filePath}"`, { stdio: 'ignore' });
              } catch (e2) {
                console.log(`Force remove also failed for ${lockFile} in Default`);
              }
            }
          }
        });
      }
      
      // Verify all locks are gone
      let anyLocksRemain = false;
      lockFiles.forEach(lockFile => {
        if (fs.existsSync(path.join(profilePath, lockFile)) || 
            fs.existsSync(path.join(defaultProfilePath, lockFile))) {
          anyLocksRemain = true;
        }
      });
      
      if (!anyLocksRemain) {
        console.log("✅ All profile lock files removed successfully");
        break;
      } else if (attempt < 3) {
        console.log("Some locks still present, waiting and retrying...");
        execSync('sleep 2', { stdio: 'ignore' });
      } else {
        console.log("⚠️ Warning: Some lock files may still be present");
      }
    }
    
    console.log("Profile cleanup completed");
  } catch (error) {
    console.log(`Profile cleanup error (non-fatal): ${error.message}`);
  }
}

export async function postLinkedInComment(postUrl, commentText) {
  const username = process.env.LINKEDIN_USER;
  const password = process.env.LINKEDIN_PASS;

  if (!username || !password) {
    throw new Error("LinkedIn credentials not found in environment variables");
  }

  if (!postUrl || !commentText) {
    throw new Error("Both postUrl and commentText are required");
  }

  let browser;
  let page;

  try {
    // Get or create browser instance (reuse existing if available)
    browser = await getLinkedInBrowser();
    
    // Get or create a reusable page
    page = await getLinkedInPage(browser);
    
    // Check if we're already logged in (with multiple verification methods)
    const isLoggedIn = await isLoggedInToLinkedIn(page);
    
    if (!isLoggedIn) {
      console.log("Not logged in. Proceeding with login...");
      
      console.log("Navigating to LinkedIn login page...");
      try {
        await page.goto("https://www.linkedin.com/login", { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      } catch (navError) {
        console.log("Login page navigation timeout, but continuing...");
      }
      
      await delay(3000);
    
    console.log("Looking for username field...");
    const possibleUsernameSelectors = [
      '#username',
      'input[name="session_key"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
      '#session_key'
    ];
    
    const possiblePasswordSelectors = [
      '#password',
      'input[name="session_password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      '#session_password'
    ];
    
    let usernameSelector = null;
    let passwordSelector = null;
    
    // Try to find username field
    for (const selector of possibleUsernameSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        usernameSelector = selector;
        console.log(`Found username field with selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    // Try to find password field
    for (const selector of possiblePasswordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        passwordSelector = selector;
        console.log(`Found password field with selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!usernameSelector || !passwordSelector) {
      console.log("Could not find login fields, taking screenshot...");
      await page.screenshot({ path: 'login-page-debug.png', fullPage: true });
      console.log("Page title:", await page.title());
      
      throw new Error(`Login fields not found. Username: ${!!usernameSelector}, Password: ${!!passwordSelector}. Screenshot saved.`);
    }
    
    console.log("Entering credentials...");
    await page.type(usernameSelector, username, { delay: 100 });
    await delay(500);
    await page.type(passwordSelector, password, { delay: 100 });
    await delay(1000);
    
    console.log("Clicking submit button...");
    await page.click("[type=submit]");
    
    console.log("Waiting for login to complete...");
    try {
      await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
    } catch (navError) {
      console.log("Navigation timeout - checking if we're logged in anyway...");
    }
    
    await delay(1500);
    
    const currentUrlAfterLogin = page.url();
    console.log(`Current URL after login: ${currentUrlAfterLogin}`);
    
    if (currentUrlAfterLogin.includes("/checkpoint/") || currentUrlAfterLogin.includes("/challenge/")) {
      console.log("LinkedIn is asking for verification. Please complete it manually.");
      console.log("The browser will remain open for 60 seconds...");
      await delay(60000);
    }
      
      if (currentUrlAfterLogin.includes("/login")) {
        throw new Error("Login failed - still on login page. Check your credentials.");
      }
      
      console.log("✅ Login successful!");
    } else {
      console.log("✅ Already logged in! Skipping login process.");
    }
    
    console.log("Navigating to post...");
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
  } catch (navError) {
    console.log("Navigation to post timed out, but continuing to attempt interaction...");
  }
  
  console.log("Waiting for page to load completely...");
  await delay(5000); // Increased from 3000 to 5000ms
  
  console.log("Scrolling down to comments section...");
  await page.evaluate(() => {
    window.scrollBy(0, 600);
  });
  await delay(3000); // Increased from 2000 to 3000ms
  
  // Additional scroll to ensure comments section is in view
  await page.evaluate(() => {
    const commentsSection = document.querySelector('.comments-section, .comments-container, [class*="comment"]');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await delay(2000);
  
  // Wait for comment-related elements to appear
  console.log("Waiting for comments section to fully load...");
  try {
    await page.waitForSelector('.comments-comment-box, .comments-section, [class*="comments"]', { 
      timeout: 10000,
      visible: true 
    });
    console.log("Comments section detected!");
  } catch (e) {
    console.log("Could not detect comments section container, but continuing...");
  }
  await delay(1000);
  
  // First, try to click the "Add a comment" button to activate the comment box
  console.log("Looking for 'Add a comment' button...");
  const commentTriggerSelectors = [
    // 2025 Updated selectors - try clicking the comment input area
    '.comments-comment-box',
    '.comments-comment-box__form',
    '.comments-comment-box-comment__form',
    '.comments-comment-texteditor',
    '.comments-comment-box__form-trigger',
    '.comments-comment-box-comment__form-trigger',
    '.comments-comment-box__comment-text-trigger',
    'button.comment-button',
    'div[data-test-id="comment-button"]',
    
    // Older selectors
    '.comments-comment-box-comment__text-editor',
    'button[aria-label*="Add a comment"]',
    'button[aria-label*="Comment"]',
    '[data-control-name*="comment"]',
    '.comments-comment-box__container',
    '.comment-button',
    
    // Try clicking anywhere in the comment area
    '[class*="comments-comment-box"]'
  ];
  
  let commentBoxActivated = false;
  for (const selector of commentTriggerSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`Clicking comment trigger: ${selector}`);
          await element.click();
          await delay(2000);
          commentBoxActivated = true;
          
          // Check if contenteditable appeared after click
          const hasContentEditable = await page.evaluate(() => {
            const editables = document.querySelectorAll('[contenteditable="true"]');
            return editables.length > 0;
          });
          
          if (hasContentEditable) {
            console.log("Comment box activated successfully!");
            break;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!commentBoxActivated) {
    console.log("Comment trigger not needed or not found, looking directly for comment box...");
  } else {
    // Give extra time for the editor to fully load
    await delay(1000);
  }
  
  console.log("Looking for comment box...");
  const possibleSelectors = [
    // 2025 Most common selectors first
    '.ql-editor[contenteditable="true"]:not(.ql-clipboard)',
    '.comments-comment-box-comment__text-editor .ql-editor',
    '.comments-comment-box__form .ql-editor',
    '.comments-comment-texteditor .ql-editor',
    'div[data-test-id="comment-box-text-editor"]',
    
    // Try finding by placeholder text
    'div[data-placeholder="Add a comment…"]',
    'div[data-placeholder*="comment" i]',
    '[aria-label*="Add a comment" i]',
    
    // Generic ql-editor
    '.ql-editor:not(.ql-clipboard)',
    'div.ql-editor',
    
    // By role
    'div[role="textbox"]',
    '[role="textbox"][contenteditable="true"]',
    
    // Class-based searches
    '.comments-comment-box__editor',
    '.comments-comment-texteditor',
    '.comments-comment-box__text-editor',
    'div.ql-editor.ql-blank',
    '.editor-content[contenteditable="true"]',
    
    // Generic contenteditable (will match ANY contenteditable - filter later)
    '[contenteditable="true"]:not(.ql-clipboard)'
  ];
  
  let commentBoxSelector = null;
  let commentBoxElement = null;
  
  // Try multiple times with delays
  for (let attempt = 0; attempt < 4; attempt++) {
    if (commentBoxSelector) break;
    
    console.log(`Attempt ${attempt + 1} to find comment box...`);
    
    for (const selector of possibleSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} element(s) matching: ${selector}`);
          
          for (const el of elements) {
            try {
              const isVisible = await el.isVisible();
              const boundingBox = await el.boundingBox();
              
              // Check if element is in comments section
              const isInCommentsSection = await el.evaluate(node => {
                let parent = node.parentElement;
                let maxDepth = 10;
                while (parent && maxDepth > 0) {
                  const className = parent.className || '';
                  if (typeof className === 'string' && 
                      (className.includes('comments-comment-box') || 
                       className.includes('comment-texteditor'))) {
                    return true;
                  }
                  parent = parent.parentElement;
                  maxDepth--;
                }
                return false;
              });
              
              if (isVisible && boundingBox && (isInCommentsSection || elements.length === 1)) {
                commentBoxSelector = selector;
                commentBoxElement = el;
                console.log(`Found valid comment box with selector: ${selector}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (commentBoxSelector) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!commentBoxSelector && attempt < 3) {
      console.log("Comment box not found yet, trying to activate it...");
      
      // Try clicking on comment box area with JavaScript
      const clicked = await page.evaluate(() => {
        const commentBoxContainers = document.querySelectorAll('[class*="comments-comment-box"]');
        if (commentBoxContainers.length > 0) {
          commentBoxContainers[0].click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        console.log("Clicked on comment box container, waiting for editor...");
      }
      
      await delay(2000);
      await page.evaluate(() => window.scrollBy(0, 100));
      await delay(1000);
    }
  }
  
  if (!commentBoxSelector) {
    console.log("Could not find comment box. Debugging information:");
    console.log("Current URL:", page.url());
    
    // Get all contenteditable elements
    const availableElements = await page.evaluate(() => {
      const editables = document.querySelectorAll('[contenteditable="true"], div[role="textbox"], .ql-editor');
      return Array.from(editables).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        placeholder: el.getAttribute('data-placeholder') || el.getAttribute('aria-label') || el.getAttribute('placeholder'),
        visible: el.offsetParent !== null,
        boundingBox: el.getBoundingClientRect ? {
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          top: el.getBoundingClientRect().top
        } : null,
        text: el.textContent?.trim().substring(0, 50),
        hasParentWithComment: (() => {
          let parent = el.parentElement;
          let depth = 0;
          while (parent && depth < 10) {
            if (parent.className && typeof parent.className === 'string' && parent.className.includes('comment')) {
              return true;
            }
            parent = parent.parentElement;
            depth++;
          }
          return false;
        })()
      }));
    });
    console.log("Available editable elements:", JSON.stringify(availableElements, null, 2));
    
    // Check for comment-related elements
    const commentElements = await page.evaluate(() => {
      const comments = document.querySelectorAll('[class*="comment"]');
      return {
        total: comments.length,
        samples: Array.from(comments).slice(0, 5).map(el => ({
          className: el.className,
          tagName: el.tagName,
          visible: el.offsetParent !== null
        }))
      };
    });
    console.log("Comment-related elements on page:", JSON.stringify(commentElements, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'comment-box-not-found.png', fullPage: true });
    console.log("Screenshot saved as comment-box-not-found.png");
    
    throw new Error("Comment box not found with any known selector. Check comment-box-not-found.png for debugging.");
  }
  
  console.log("Clicking on comment box...");
  try {
    await commentBoxElement.click();
  } catch (e) {
    // Try clicking with page.click as fallback
    await page.click(commentBoxSelector);
  }
  await delay(1000);
  
  console.log(`Typing comment: "${commentText}"`);
  await page.type(commentBoxSelector, commentText, { delay: 50 });
  
  // Verify the text was actually entered
  const typedText = await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    return element ? element.innerText || element.textContent : '';
  }, commentBoxSelector);
  console.log(`Text in comment box: "${typedText}"`);
  
  if (!typedText || typedText.trim() !== commentText.trim()) {
    throw new Error(`Comment text mismatch! Expected: "${commentText}", Got: "${typedText}"`);
  }
  
  console.log("Waiting for submit button to be enabled...");
  await delay(1500);
  
  console.log("Looking for submit button...");
  const possibleButtonSelectors = [
    '.comments-comment-box__submit-button',
    'button[aria-label*="Post"]',
    '.comments-comment-box button',
    'button[type="submit"]',
    '.comments-comment-box-comment__submit-button',
    'button.comments-comment-box__submit-button--cr'
  ];
  
  let submitButtonSelector = null;
  for (const selector of possibleButtonSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        for (const el of elements) {
          const isVisible = await el.isVisible();
          const isEnabled = await el.evaluate(node => !node.disabled && node.offsetParent !== null);
          if (isVisible && isEnabled) {
            submitButtonSelector = selector;
            console.log(`Found submit button with selector: ${selector}`);
            break;
          }
        }
        if (submitButtonSelector) break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (submitButtonSelector) {
    await page.waitForSelector(submitButtonSelector, { visible: true, timeout: 3000 });
  }
  
  if (!submitButtonSelector) {
    console.log("Could not find submit button. Available buttons on page:");
    const availableButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      return Array.from(buttons).map((el, i) => ({
        index: i,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        disabled: el.disabled,
        text: el.textContent?.trim().substring(0, 50)
      })).filter(b => b.text?.toLowerCase().includes('post') || b.text?.toLowerCase().includes('comment') || b.ariaLabel?.toLowerCase().includes('post'));
    });
    console.log(JSON.stringify(availableButtons, null, 2));
    throw new Error("Submit button not found or not enabled");
  }
  
  console.log("Scrolling button into view...");
  await page.evaluate((selector) => {
    const button = document.querySelector(selector);
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, submitButtonSelector);
  
  await delay(500);
  
  // Check button state before clicking
  const buttonState = await page.evaluate((selector) => {
    const button = document.querySelector(selector);
    if (!button) return { found: false };
    return {
      found: true,
      disabled: button.disabled,
      visible: button.offsetParent !== null,
      text: button.textContent?.trim(),
      ariaLabel: button.getAttribute('aria-label')
    };
  }, submitButtonSelector);
  
  console.log("Button state before click:", JSON.stringify(buttonState, null, 2));
  
  if (buttonState.disabled) {
    throw new Error("Submit button is still disabled! The comment might not be ready to post.");
  }
  
  console.log("Submitting comment...");
  let clickSuccess = false;
  
  try {
    await page.click(submitButtonSelector);
    console.log("Regular click executed");
    clickSuccess = true;
  } catch (clickError) {
    console.log("Regular click failed, trying JavaScript click...");
    try {
      await page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          return true;
        }
        return false;
      }, submitButtonSelector);
      console.log("JavaScript click executed");
      clickSuccess = true;
    } catch (jsClickError) {
      console.error("Both click methods failed:", jsClickError.message);
      throw new Error("Failed to click submit button with both methods");
    }
  }
  
  console.log("Waiting for comment to be posted...");
  await delay(3000);
  
  // Verify the comment was posted by checking if the comment box is now empty
  const commentBoxAfterSubmit = await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    return element ? element.innerText || element.textContent : null;
  }, commentBoxSelector);
  
  console.log(`Comment box after submit: "${commentBoxAfterSubmit}"`);
  
  // Check if our comment appears in the comments list
  const commentAppeared = await page.evaluate((commentTextParam) => {
    const comments = Array.from(document.querySelectorAll('.comments-comment-item, [class*="comment"]'));
    return comments.some(comment => {
      const text = comment.innerText || comment.textContent;
      return text && text.includes(commentTextParam);
    });
  }, commentText);
  
  if (commentAppeared) {
    console.log("✓ SUCCESS! Comment verified to appear in the comments section!");
  } else if (!commentBoxAfterSubmit || commentBoxAfterSubmit.trim() === '' || commentBoxAfterSubmit.trim() === 'Add a comment…') {
    console.log("✓ Comment box is empty - comment likely posted successfully!");
  } else {
    console.log("⚠ WARNING: Comment box still contains text. Comment may not have been posted.");
    console.log("Taking screenshot for debugging...");
    await page.screenshot({ path: 'post-submit-screenshot.png', fullPage: true });
    throw new Error("Comment submission may have failed - comment box not cleared");
  }
  
    console.log("Comment posted successfully!");
    await delay(1500);
    
    // Note: We don't close other tabs here anymore since the browser is shared
    // Each request's page will be closed in the finally block
    
    return {
      success: true,
      message: "Comment posted successfully!",
      postUrl: postUrl,
      comment: commentText
    };
    
  } catch (error) {
    console.error("Error occurred:", error.message);
    if (page) {
      console.log("Current URL:", page.url());
      console.log("Taking screenshot for debugging...");
      try {
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        console.log("Screenshot saved as error-screenshot.png");
      } catch (screenshotError) {
        console.log("Could not take screenshot:", screenshotError.message);
      }
    }
    throw error;
  } finally {
    // Keep BOTH browser and page alive for reuse across requests
    // This prevents re-login on every request
    console.log("✓ Request complete. Browser and page kept alive for reuse.");
    // Note: Browser and page are NOT closed here - they're reused for the next request
  }
}
