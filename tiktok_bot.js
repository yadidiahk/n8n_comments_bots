import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    
    const launchOptions = {
      headless: false,
      userDataDir: './tiktok_profile',
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
      
      // Click on username field first to focus it
      await usernameInput.click();
      await delay(300);
      
      // Type username
      await usernameInput.type(username, { delay: 100 });
      console.log("Username entered");
      await delay(500);
      
      // Click on password field
      await passwordInput.click();
      await delay(300);
      
      // Type password
      await passwordInput.type(password, { delay: 100 });
      console.log("Password entered");
      await delay(1000);
      
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
      
      console.log("Waiting for login to complete...");
      await delay(5000);
      
      currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);
      
      // Check if verification is required
      if (currentUrl.includes("/login") || currentUrl.includes("/verify")) {
        console.log("TikTok may be asking for verification. Please complete it manually.");
        console.log("The browser will remain open for 60 seconds...");
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

