import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const { execSync } = require('child_process');
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

export async function postTikTokComment(videoUrl, commentText) {
  const username = process.env.TIKTOK_USER;
  const password = process.env.TIKTOK_PASS;

  if (!username || !password) {
    throw new Error("TikTok credentials not found in environment variables");
  }

  if (!videoUrl || !commentText) {
    throw new Error("Both videoUrl and commentText are required");
  }

  let browser;
  let page;

  try {
    console.log("Launching local Chrome in headful mode...");
    
    const profilePath = './tiktok_profile';
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

    // Kill any existing Chrome processes first
    killExistingChromeProcesses();
    
    // Clean up profile locks before launching browser
    cleanupProfileLocks(profilePath);
    
    // Wait a bit to ensure all cleanup is complete
    console.log("Waiting for cleanup to complete...");
    await delay(3000);

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => { 
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log("Checking if already logged in...");
    try {
      await page.goto("https://www.tiktok.com/", { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    } catch (navError) {
      console.log("Initial navigation timeout, but continuing to check login status...");
    }
  
    await delay(3000);
    let currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
  
    // Check if logged in by looking for profile/login elements
    const isLoggedIn = await page.evaluate(() => {
      // Check for profile avatar or user menu (indicates logged in)
      const profileElements = document.querySelectorAll('[data-e2e="profile-icon"], [data-e2e="user-avatar"], .avatar-anchor');
      return profileElements.length > 0;
    });

    if (!isLoggedIn) {
      console.log("Not logged in. Proceeding with login...");
      
      // Navigate directly to the email login page
      console.log("Navigating directly to email login page...");
      try {
        await page.goto("https://www.tiktok.com/login/phone-or-email/email", { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        console.log("Reached email login page");
      } catch (navError) {
        console.log("Navigation to login page timeout, but continuing...");
      }
      
      await delay(3000);

      console.log("Looking for username and password fields...");
      
      // First, let's debug what inputs are available
      const availableInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className,
          autocomplete: input.autocomplete,
          visible: input.offsetParent !== null
        }));
      });
      console.log("Available input fields:", JSON.stringify(availableInputs, null, 2));
      
      const possibleUsernameSelectors = [
        'input[placeholder="Email or username"]',
        'input[placeholder*="Email" i][placeholder*="username" i]',
        'input[autocomplete="username"]',
        'input[name="username"]',
        'input[type="text"]:not([type="password"])',
        'input:not([type="password"]):not([type="hidden"]):not([type="submit"])',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]'
      ];
      
      const possiblePasswordSelectors = [
        'input[type="password"]',
        'input[placeholder*="password" i]',
        'input[autocomplete="current-password"]',
        'input[name="password"]'
      ];
      
      let usernameSelector = null;
      let passwordSelector = null;
      let usernameInput = null;
      let passwordInput = null;
      
      // Try to find username field
      for (const selector of possibleUsernameSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            // Check each element for visibility
            for (const el of elements) {
              const isVisible = await el.isVisible();
              if (isVisible) {
                usernameSelector = selector;
                usernameInput = el;
                console.log(`Found username field with selector: ${selector}`);
                break;
              }
            }
            if (usernameSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Try to find password field
      for (const selector of possiblePasswordSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            for (const el of elements) {
              const isVisible = await el.isVisible();
              if (isVisible) {
                passwordSelector = selector;
                passwordInput = el;
                console.log(`Found password field with selector: ${selector}`);
                break;
              }
            }
            if (passwordSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!usernameSelector || !passwordSelector) {
        console.log("Could not find login fields, taking screenshot...");
        await page.screenshot({ path: 'tiktok-login-page-debug.png', fullPage: true });
        
        // Get more detailed debugging info
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            inputCount: document.querySelectorAll('input').length,
            visibleInputCount: Array.from(document.querySelectorAll('input')).filter(i => i.offsetParent !== null).length
          };
        });
        console.log("Page info:", pageInfo);
        
        throw new Error(`Login fields not found. Username: ${!!usernameSelector}, Password: ${!!passwordSelector}. Screenshot saved.`);
      }
      
      console.log("Entering credentials...");
      
      // Clear and type username with more robust method
      await usernameInput.click({ clickCount: 3 });
      await delay(300);
      
      // Clear any existing text (use Meta/Command on Mac, Control on others)
      const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.down(modifierKey);
      await page.keyboard.press('KeyA');
      await page.keyboard.up(modifierKey);
      await page.keyboard.press('Backspace');
      await delay(200);
      
      // Type username character by character to ensure proper events
      console.log(`Typing username: ${username}`);
      await page.keyboard.type(username, { delay: 100 });
      console.log("Username entered");
      await delay(500);
      
      // Verify username was entered
      const usernameValue = await page.evaluate((selector) => {
        const inputs = document.querySelectorAll(selector);
        for (const input of inputs) {
          if (input.offsetParent !== null) {
            return input.value;
          }
        }
        return '';
      }, usernameSelector);
      console.log(`Username in field: "${usernameValue}"`);
      
      // Click on password field
      await passwordInput.click({ clickCount: 3 });
      await delay(300);
      
      // Clear any existing text (use Meta/Command on Mac, Control on others)
      await page.keyboard.down(modifierKey);
      await page.keyboard.press('KeyA');
      await page.keyboard.up(modifierKey);
      await page.keyboard.press('Backspace');
      await delay(200);
      
      // Type password character by character to ensure proper events
      console.log(`Typing password (length: ${password.length})`);
      await page.keyboard.type(password, { delay: 120 });
      console.log("Password entered");
      await delay(1000);
      
      // Verify password was entered (check length since we can't see the actual value)
      const passwordValue = await page.evaluate((selector) => {
        const inputs = document.querySelectorAll(selector);
        for (const input of inputs) {
          if (input.offsetParent !== null) {
            return input.value;
          }
        }
        return '';
      }, passwordSelector);
      console.log(`Password field length: ${passwordValue.length} (expected: ${password.length})`);
      
      console.log("Looking for submit button...");
      
      // Debug available buttons
      const availableButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          disabled: btn.disabled,
          className: btn.className,
          visible: btn.offsetParent !== null
        }));
      });
      console.log("Available buttons:", JSON.stringify(availableButtons, null, 2));
      
      const submitSelectors = [
        'button[type="submit"]',
        'button[data-e2e="login-button"]'
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          const buttons = await page.$$(selector);
          for (const btn of buttons) {
            const isVisible = await btn.isVisible();
            if (isVisible) {
              submitButton = btn;
              console.log(`Found submit button with selector: ${selector}`);
              break;
            }
          }
          if (submitButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!submitButton) {
        // Try finding by text "Log in"
        console.log("Trying to find submit button by text...");
        const buttonFound = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent?.trim();
            if (text === 'Log in' && btn.offsetParent !== null) {
              btn.setAttribute('data-tiktok-submit', 'true');
              return true;
            }
          }
          return false;
        });
        
        if (buttonFound) {
          submitButton = await page.$('button[data-tiktok-submit="true"]');
          console.log("Found submit button by text");
        }
      }

      if (!submitButton) {
        await page.screenshot({ path: 'tiktok-submit-button-not-found.png', fullPage: true });
        throw new Error("Could not find submit button. Screenshot saved as tiktok-submit-button-not-found.png");
      }

      console.log("Clicking submit button...");
      await submitButton.click();
      
      console.log("Waiting for login response...");
      await delay(3000);
      
      // Check for error messages immediately
      const errorInfo = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[class*="error" i], [class*="Error" i], [data-e2e*="error"], .tiktok-error, [role="alert"]');
        const messages = [];
        errorElements.forEach(el => {
          if (el.offsetParent !== null && el.textContent.trim()) {
            messages.push(el.textContent.trim());
          }
        });
        
        // Also check for any red text or warning indicators
        const redText = document.querySelectorAll('[style*="color: rgb(254, 44, 85)"], [style*="color: red" i], [class*="invalid" i]');
        redText.forEach(el => {
          if (el.offsetParent !== null && el.textContent.trim() && !messages.includes(el.textContent.trim())) {
            messages.push(el.textContent.trim());
          }
        });
        
        // Check the entire page text for specific error messages
        const bodyText = document.body.innerText || '';
        const rateLimitPattern = /maximum number of attempts|try again later|too many attempts/i;
        const wrongPasswordPattern = /wrong password|incorrect password|password is incorrect/i;
        const accountLockedPattern = /account (is )?locked|temporarily (suspended|blocked)/i;
        
        return {
          messages,
          bodyText: bodyText.toLowerCase(),
          isRateLimited: rateLimitPattern.test(bodyText),
          isWrongPassword: wrongPasswordPattern.test(bodyText),
          isAccountLocked: accountLockedPattern.test(bodyText)
        };
      });
      
      if (errorInfo.messages.length > 0 || errorInfo.isRateLimited || errorInfo.isWrongPassword || errorInfo.isAccountLocked) {
        console.log("⚠️  ERROR DETECTED ON PAGE:");
        
        if (errorInfo.messages.length > 0) {
          errorInfo.messages.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
        }
        
        await page.screenshot({ path: 'tiktok-login-error-detected.png', fullPage: true });
        
        if (errorInfo.isRateLimited) {
          console.log("\n🚫 RATE LIMITED: TikTok has blocked login attempts temporarily.");
          console.log("\n💡 Solutions:");
          console.log("   1. Wait 15-30 minutes before trying again");
          console.log("   2. Try from a different network (different IP address)");
          console.log("   3. Use a VPN to change your IP address");
          console.log("   4. Clear the tiktok_profile folder and try again");
          console.log("   5. Complete a manual login first to reset the rate limit");
          throw new Error("TikTok rate limit: Maximum number of attempts reached. Try again later.");
        }
        
        if (errorInfo.isWrongPassword) {
          console.log("\n❌ WRONG PASSWORD detected");
          console.log("   Please verify your TIKTOK_PASS in .env file");
          throw new Error("TikTok login error: Wrong password");
        }
        
        if (errorInfo.isAccountLocked) {
          console.log("\n🔒 ACCOUNT LOCKED");
          console.log("   Your TikTok account may be temporarily locked");
          throw new Error("TikTok login error: Account locked");
        }
        
        throw new Error(`TikTok login error: ${errorInfo.messages.join('; ')}`);
      }
      
      console.log("No immediate errors detected. Waiting for navigation...");
      await delay(2000);
      
      currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);
      
      // Take a screenshot to see what's on screen
      await page.screenshot({ path: 'tiktok-after-login-click.png', fullPage: true });
      console.log("Screenshot saved: tiktok-after-login-click.png");
      
      // Check if verification is required
      if (currentUrl.includes("/login") || currentUrl.includes("/verify")) {
        console.log("Still on login/verify page. Checking what's displayed...");
        
        // Get more info about what's on the page
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            visibleText: document.body.innerText.substring(0, 500),
            hasVerificationForm: !!document.querySelector('[data-e2e*="verify"], [data-e2e*="verification"]'),
            hasCaptcha: !!document.querySelector('[class*="captcha" i], #captcha, iframe[src*="captcha"]'),
            hasLoginForm: !!document.querySelector('input[type="password"]')
          };
        });
        console.log("Page state:", JSON.stringify(pageContent, null, 2));
        
        if (pageContent.hasCaptcha) {
          console.log("⚠️  CAPTCHA detected! Please solve it manually.");
        }
        
        if (pageContent.hasVerificationForm) {
          console.log("⚠️  Email/SMS verification required. Please complete it manually.");
        }
        
        console.log("The browser will remain open for 60 seconds for you to complete any verification...");
        await delay(60000);
      }
      
      // Verify login success
      const loginSuccess = await page.evaluate(() => {
        const profileElements = document.querySelectorAll('[data-e2e="profile-icon"], [data-e2e="user-avatar"], .avatar-anchor');
        return profileElements.length > 0;
      });

      if (!loginSuccess) {
        console.log("Login may have failed. Taking screenshot...");
        await page.screenshot({ path: 'tiktok-login-failed.png', fullPage: true });
        throw new Error("Login failed - could not verify login success. Check tiktok-login-failed.png");
      }
    } else {
      console.log("Already logged in! Skipping login process.");
    }
    
    console.log("Logged in successfully! Navigating to video...");
    try {
      await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    } catch (navError) {
      console.log("Navigation to video timed out, but continuing to attempt interaction...");
    }
    
    console.log("Waiting for video to load...");
    await delay(5000);
    
    console.log("Scrolling to comments section...");
    await page.evaluate(() => {
      window.scrollBy(0, 400);
    });
    await delay(2000);
    
    // Look for comment box
    console.log("Looking for comment box...");
    const possibleCommentSelectors = [
      '[data-e2e="comment-input"]',
      'div[data-e2e="comment-input"]',
      '[placeholder*="Add comment" i]',
      '[placeholder*="comment" i]',
      'div[contenteditable="true"]',
      '[data-e2e="browse-comment-input"]',
      '.DivCommentInputContainer',
      '[class*="CommentInput"]'
    ];
    
    let commentBoxSelector = null;
    let commentBoxElement = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      if (commentBoxSelector) break;
      
      console.log(`Attempt ${attempt + 1} to find comment box...`);
      
      for (const selector of possibleCommentSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} element(s) matching: ${selector}`);
            
            for (const el of elements) {
              try {
                const isVisible = await el.isVisible();
                const boundingBox = await el.boundingBox();
                
                if (isVisible && boundingBox) {
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
      
      if (!commentBoxSelector && attempt < 2) {
        console.log("Comment box not found yet, scrolling and waiting...");
        await page.evaluate(() => window.scrollBy(0, 200));
        await delay(2000);
      }
    }
    
    if (!commentBoxSelector) {
      console.log("Could not find comment box. Debugging information:");
      console.log("Current URL:", page.url());
      
      const availableElements = await page.evaluate(() => {
        const editables = document.querySelectorAll('[contenteditable="true"], input, textarea, [data-e2e*="comment"]');
        return Array.from(editables).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          dataE2e: el.getAttribute('data-e2e'),
          placeholder: el.getAttribute('placeholder'),
          visible: el.offsetParent !== null
        }));
      });
      console.log("Available editable elements:", JSON.stringify(availableElements, null, 2));
      
      await page.screenshot({ path: 'tiktok-comment-box-not-found.png', fullPage: true });
      console.log("Screenshot saved as tiktok-comment-box-not-found.png");
      
      throw new Error("Comment box not found with any known selector. Check tiktok-comment-box-not-found.png for debugging.");
    }
    
    console.log("Clicking on comment box...");
    try {
      await commentBoxElement.click();
    } catch (e) {
      await page.click(commentBoxSelector);
    }
    await delay(1000);
    
    console.log(`Typing comment: "${commentText}"`);
    
    // Check if it's an input/textarea or contenteditable
    const isInput = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
    }, commentBoxSelector);

    if (isInput) {
      await page.type(commentBoxSelector, commentText, { delay: 50 });
    } else {
      // For contenteditable, we might need to use a different approach
      await page.evaluate((selector, text) => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, commentBoxSelector, commentText);
    }
    
    await delay(1000);
    
    // Verify the text was entered
    const typedText = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? (element.value || element.innerText || element.textContent) : '';
    }, commentBoxSelector);
    console.log(`Text in comment box: "${typedText}"`);
    
    if (!typedText || typedText.trim() !== commentText.trim()) {
      console.log("Warning: Comment text might not match exactly");
    }
    
    console.log("Looking for post/submit button...");
    await delay(1000);
    
    const possibleButtonSelectors = [
      '[data-e2e="comment-post"]',
      'button[data-e2e="comment-post"]',
      'div[data-e2e="comment-post"]',
      'button:has-text("Post")',
      '[class*="PostButton"]',
      'button[type="submit"]'
    ];
    
    let submitButtonSelector = null;
    for (const selector of possibleButtonSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const isVisible = await el.isVisible();
            if (isVisible) {
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
    
    if (!submitButtonSelector) {
      // Try finding by text
      const foundByText = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        for (const btn of buttons) {
          if (btn.textContent.trim().toLowerCase() === 'post') {
            btn.setAttribute('data-found-submit', 'true');
            return true;
          }
        }
        return false;
      });

      if (foundByText) {
        submitButtonSelector = '[data-found-submit="true"]';
        console.log("Found submit button by text content");
      } else {
        console.log("Could not find submit button. Available buttons:");
        const availableButtons = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          return Array.from(buttons).map((el, i) => ({
            index: i,
            className: el.className,
            dataE2e: el.getAttribute('data-e2e'),
            text: el.textContent?.trim().substring(0, 50)
          }));
        });
        console.log(JSON.stringify(availableButtons, null, 2));
        
        await page.screenshot({ path: 'tiktok-submit-button-not-found.png', fullPage: true });
        throw new Error("Submit button not found or not enabled");
      }
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
    await delay(4000);
    
    // Verify comment was posted
    const commentBoxAfterSubmit = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? (element.value || element.innerText || element.textContent) : null;
    }, commentBoxSelector);
    
    console.log(`Comment box after submit: "${commentBoxAfterSubmit}"`);
    
    if (!commentBoxAfterSubmit || commentBoxAfterSubmit.trim() === '' || commentBoxAfterSubmit.trim() === 'Add comment...') {
      console.log("Comment box is empty - comment likely posted successfully!");
    } else {
      console.log("Warning: Comment box still contains text. Comment may not have been posted.");
      console.log("Taking screenshot for debugging...");
      await page.screenshot({ path: 'tiktok-post-submit-screenshot.png', fullPage: true });
    }
    
    console.log("Comment posted successfully!");
    await delay(2000);
    
    return {
      success: true,
      message: "Comment posted successfully!",
      videoUrl: videoUrl,
      comment: commentText
    };
    
  } catch (error) {
    console.error("Error occurred:", error.message);
    if (page) {
      console.log("Current URL:", page.url());
      console.log("Taking screenshot for debugging...");
      try {
        await page.screenshot({ path: 'tiktok-error-screenshot.png', fullPage: true });
        console.log("Screenshot saved as tiktok-error-screenshot.png");
      } catch (screenshotError) {
        console.log("Could not take screenshot:", screenshotError.message);
      }
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
}

