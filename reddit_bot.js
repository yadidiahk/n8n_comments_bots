import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postRedditComment(postUrl, commentText) {
  const username = process.env.REDDIT_USER;
  const password = process.env.REDDIT_PASS;

  if (!username || !password) {
    throw new Error("Reddit credentials not found in environment variables");
  }

  if (!postUrl || !commentText) {
    throw new Error("Both postUrl and commentText are required");
  }

  let browser;
  let page;

  try {
    console.log("Launching browser in headful mode...");
    
    const launchOptions = {
      headless: false,
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

    // Only set executablePath if explicitly provided or on Linux
    if (process.env.CHROME_BIN) {
      launchOptions.executablePath = process.env.CHROME_BIN;
    } else if (process.platform === 'linux') {
      launchOptions.executablePath = '/usr/bin/chromium';
    }
    // On macOS and Windows, let Puppeteer find Chrome automatically

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
      await page.goto("https://www.reddit.com", {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (navError) {
      console.log("Initial navigation timeout, but continuing to check login status...");
    }

    await delay(3000);
    let currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if we're logged in by looking for user menu
    const isLoggedIn = await page.evaluate(() => {
      // Check for user menu button (new Reddit)
      const userButton = document.querySelector('[id*="user-dropdown"], [aria-label*="User Menu"], #USER_DROPDOWN_ID');
      if (userButton) return true;

      // Check for username display (old Reddit)
      const userLink = document.querySelector('.user a');
      if (userLink && !userLink.href.includes('/login')) return true;

      // Check if login button exists
      const loginButton = document.querySelector('a[href*="login"]');
      return !loginButton;
    });

    if (!isLoggedIn) {
      console.log("Not logged in. Proceeding with login...");

      console.log("Navigating to Reddit login page...");
      try {
        await page.goto("https://www.reddit.com/login", {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      } catch (navError) {
        console.log("Login page navigation timeout, but continuing...");
      }

      await delay(3000);

      console.log("Looking for username field...");
      const possibleUsernameSelectors = [
        'input[name="username"]',
        'input[type="text"]',
        'input[autocomplete="username"]',
        '#loginUsername',
        'input[placeholder*="Username"]',
        'input[placeholder*="username"]'
      ];

      const possiblePasswordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]',
        '#loginPassword',
        'input[placeholder*="Password"]',
        'input[placeholder*="password"]'
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
        await page.screenshot({ path: 'reddit-login-page-debug.png', fullPage: true });

        const pageContent = await page.content();
        console.log("Page title:", await page.title());

        throw new Error(`Login fields not found. Username: ${!!usernameSelector}, Password: ${!!passwordSelector}. Screenshot saved.`);
      }

      console.log("Entering credentials...");
      await page.type(usernameSelector, username, { delay: 100 });
      await delay(500);
      await page.type(passwordSelector, password, { delay: 100 });
      await delay(1000);

      console.log("Clicking submit button...");
      const submitButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Log In")',
        'button:has-text("Sign In")',
        '.AnimatedForm__submitButton',
        '[type=submit]'
      ];

      let submitClicked = false;
      for (const selector of submitButtonSelectors) {
        try {
          await page.click(selector);
          submitClicked = true;
          console.log(`Clicked submit with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!submitClicked) {
        // Try pressing Enter as fallback
        await page.keyboard.press('Enter');
        console.log("Pressed Enter to submit login form");
      }

      console.log("Waiting for login to complete...");
      try {
        await page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      } catch (navError) {
        console.log("Navigation timeout - checking if we're logged in anyway...");
      }

      await delay(2000);

      currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);

      if (currentUrl.includes("/login")) {
        throw new Error("Login failed - still on login page. Check your credentials.");
      }
    } else {
      console.log("Already logged in! Skipping login process.");
    }

    console.log("Logged in successfully! Navigating to post...");
    try {
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    } catch (navError) {
      console.log("Navigation to post timed out, but continuing to attempt interaction...");
    }

    console.log("Waiting for page to load completely...");
    await delay(5000);

    console.log("Scrolling down to comments section...");
    await page.evaluate(() => {
      window.scrollBy(0, 400);
    });
    await delay(2000);

    // Additional scroll to ensure comments section is in view
    await page.evaluate(() => {
      const commentsSection = document.querySelector('[data-test-id="comment-submission-form-richtext"], .commentArea, [class*="Comment"]');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await delay(2000);

    // Wait for comment-related elements to appear
    console.log("Waiting for comments section to fully load...");
    try {
      await page.waitForSelector('[data-test-id="comment-submission-form-richtext"], .usertext-edit, textarea', {
        timeout: 10000,
        visible: true
      });
      console.log("Comments section detected!");
    } catch (e) {
      console.log("Could not detect comments section container, but continuing...");
    }
    await delay(1000);

    // Step 1: Click on comment box trigger to activate it
    console.log("Looking for comment box trigger...");
    const commentTriggerSelectors = [
      '[data-test-id="comment-submission-form-richtext"]',
      'div[contenteditable="true"]',
      '.public-DraftEditor-content',
      'textarea[name="text"]',
      '.usertext-edit textarea',
      'div[role="textbox"]',
      '[data-click-id="text"]',
      '.CommentBox',
      '[placeholder*="What are your thoughts"]',
      '[placeholder*="Add a comment"]'
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
            await delay(1500);
            commentBoxActivated = true;
            
            // Check if comment box is now active
            const isActive = await page.evaluate(() => {
              const editables = document.querySelectorAll('[contenteditable="true"], textarea');
              for (const el of editables) {
                if (el.offsetParent !== null && (el === document.activeElement || el.closest('[class*="Comment"]'))) {
                  return true;
                }
              }
              return editables.length > 0;
            });
            
            if (isActive) {
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
      await delay(1000);
    }

    // Step 2: Find the actual editable field with retry logic
    console.log("Looking for comment box...");
    const possibleSelectors = [
      '[data-test-id="comment-submission-form-richtext"]',
      'div[contenteditable="true"][role="textbox"]',
      '.public-DraftEditor-content[contenteditable="true"]',
      'div[contenteditable="true"]',
      'textarea[name="text"]',
      '.usertext-edit textarea',
      '[contenteditable="true"]',
      'textarea[placeholder*="What are your thoughts"]',
      'div[role="textbox"]'
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
                  let maxDepth = 15;
                  while (parent && maxDepth > 0) {
                    const className = parent.className || '';
                    const id = parent.id || '';
                    if (typeof className === 'string' &&
                        (className.includes('comment') ||
                         className.includes('Comment') ||
                         className.includes('submission') ||
                         id.includes('comment'))) {
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
          const commentBoxContainers = document.querySelectorAll('[data-test-id*="comment"], [class*="Comment"], .usertext-edit');
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
        const editables = document.querySelectorAll('[contenteditable="true"], textarea, div[role="textbox"]');
        return Array.from(editables).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          placeholder: el.getAttribute('placeholder') || el.getAttribute('aria-label'),
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
              if (parent.className && typeof parent.className === 'string' && (parent.className.includes('comment') || parent.className.includes('Comment'))) {
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
        const comments = document.querySelectorAll('[class*="comment"], [class*="Comment"]');
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
      await page.screenshot({ path: 'reddit-comment-box-not-found.png', fullPage: true });
      console.log("Screenshot saved as reddit-comment-box-not-found.png");

      throw new Error("Comment box not found with any known selector. Check reddit-comment-box-not-found.png for debugging.");
    }

    console.log("Clicking on comment box...");
    try {
      await commentBoxElement.click();
    } catch (e) {
      await page.click(commentBoxSelector);
    }
    await delay(1000);

    console.log(`Typing comment: "${commentText}"`);
    
    // Check if it's a textarea or contenteditable
    const isTextarea = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element && element.tagName === 'TEXTAREA';
    }, commentBoxSelector);

    if (isTextarea) {
      // For textarea, clear it first then type
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) element.value = '';
      }, commentBoxSelector);
      await page.type(commentBoxSelector, commentText, { delay: 50 });
    } else {
      // For contenteditable, type directly
      await page.type(commentBoxSelector, commentText, { delay: 50 });
    }

    // Verify the text was actually entered
    const typedText = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return '';
      return element.value || element.innerText || element.textContent || '';
    }, commentBoxSelector);
    console.log(`Text in comment box: "${typedText}"`);

    if (!typedText || !typedText.includes(commentText.trim())) {
      throw new Error(`Comment text mismatch! Expected: "${commentText}", Got: "${typedText}"`);
    }

    console.log("Waiting for submit button to be enabled...");
    await delay(1500);

    console.log("Looking for submit button...");
    const possibleButtonSelectors = [
      'button:has-text("Comment")',
      'button[type="submit"]',
      '[data-test-id="comment-submission-form-submit"]',
      '.save button',
      'button.save',
      'button[aria-label*="Comment"]',
      'button[class*="submit"]',
      '.usertext-buttons button'
    ];

    let submitButtonSelector = null;
    let submitButtonElement = null;

    for (const selector of possibleButtonSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const isVisible = await el.isVisible().catch(() => false);
            const isEnabled = await el.evaluate(node => !node.disabled && node.offsetParent !== null).catch(() => false);
            const text = await el.evaluate(node => node.textContent?.trim().toLowerCase()).catch(() => '');
            
            if (isVisible && isEnabled && (text.includes('comment') || text.includes('submit') || text.includes('save'))) {
              submitButtonSelector = selector;
              submitButtonElement = el;
              console.log(`Found submit button with selector: ${selector} (text: ${text})`);
              break;
            }
          }
          if (submitButtonSelector) break;
        }
      } catch (e) {
        continue;
      }
    }

    // If still not found, try a more general approach
    if (!submitButtonSelector) {
      console.log("Trying to find submit button by text content...");
      submitButtonElement = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const button of buttons) {
          const text = button.textContent?.trim().toLowerCase() || '';
          if ((text === 'comment' || text === 'save' || text === 'reply') && 
              button.offsetParent !== null && 
              !button.disabled) {
            return button;
          }
        }
        return null;
      });

      if (submitButtonElement && await submitButtonElement.evaluate(el => el !== null)) {
        console.log("Found submit button by text content");
        submitButtonSelector = 'button'; // placeholder
      }
    }

    if (!submitButtonSelector && !submitButtonElement) {
      console.log("Could not find submit button. Available buttons on page:");
      const availableButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        return Array.from(buttons).map((el, i) => ({
          index: i,
          className: el.className,
          ariaLabel: el.getAttribute('aria-label'),
          disabled: el.disabled,
          text: el.textContent?.trim().substring(0, 50),
          visible: el.offsetParent !== null
        })).filter(b => b.visible && (b.text?.toLowerCase().includes('comment') || b.text?.toLowerCase().includes('save') || b.text?.toLowerCase().includes('reply')));
      });
      console.log(JSON.stringify(availableButtons, null, 2));
      
      await page.screenshot({ path: 'reddit-submit-button-not-found.png', fullPage: true });
      throw new Error("Submit button not found or not enabled");
    }

    console.log("Scrolling button into view...");
    if (submitButtonSelector && submitButtonSelector !== 'button') {
      await page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, submitButtonSelector);
    } else if (submitButtonElement) {
      await submitButtonElement.evaluate(el => {
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    await delay(500);

    // Check button state before clicking
    const buttonState = submitButtonElement ? await submitButtonElement.evaluate(node => {
      if (!node) return { found: false };
      return {
        found: true,
        disabled: node.disabled,
        visible: node.offsetParent !== null,
        text: node.textContent?.trim(),
        ariaLabel: node.getAttribute('aria-label')
      };
    }).catch(() => ({ found: false })) : { found: false };

    console.log("Button state before click:", JSON.stringify(buttonState, null, 2));

    if (buttonState.disabled) {
      throw new Error("Submit button is still disabled! The comment might not be ready to post.");
    }

    console.log("Submitting comment...");
    let clickSuccess = false;

    try {
      if (submitButtonElement) {
        await submitButtonElement.click();
        console.log("Element click executed");
        clickSuccess = true;
      }
    } catch (clickError) {
      console.log("Element click failed, trying page.click...");
      try {
        if (submitButtonSelector && submitButtonSelector !== 'button') {
          await page.click(submitButtonSelector);
          console.log("Page click executed");
          clickSuccess = true;
        } else {
          throw new Error("No valid selector for page.click");
        }
      } catch (clickError2) {
        console.log("Page click failed, trying JavaScript click...");
        try {
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const button of buttons) {
              const text = button.textContent?.trim().toLowerCase() || '';
              if ((text === 'comment' || text === 'save') && button.offsetParent !== null && !button.disabled) {
                button.click();
                return true;
              }
            }
            return false;
          });
          console.log("JavaScript click executed");
          clickSuccess = true;
        } catch (jsClickError) {
          console.error("All click methods failed:", jsClickError.message);
          throw new Error("Failed to click submit button with any method");
        }
      }
    }

    console.log("Waiting for comment to be posted...");
    await delay(3000);

    // Verify the comment was posted by checking if the comment box is now empty
    const commentBoxAfterSubmit = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return element.value || element.innerText || element.textContent || null;
    }, commentBoxSelector);

    console.log(`Comment box after submit: "${commentBoxAfterSubmit}"`);

    // Check if our comment appears in the comments list
    const commentAppeared = await page.evaluate((commentTextParam) => {
      const comments = Array.from(document.querySelectorAll('[data-testid="comment"], .Comment, [class*="comment-content"]'));
      return comments.some(comment => {
        const text = comment.innerText || comment.textContent;
        return text && text.includes(commentTextParam);
      });
    }, commentText);

    if (commentAppeared) {
      console.log("SUCCESS! Comment verified to appear in the comments section!");
    } else if (!commentBoxAfterSubmit || commentBoxAfterSubmit.trim() === '' || commentBoxAfterSubmit.trim().length < 5) {
      console.log("Comment box is empty - comment likely posted successfully!");
    } else {
      console.log("WARNING: Comment box still contains text. Comment may not have been posted.");
      console.log("Taking screenshot for debugging...");
      await page.screenshot({ path: 'reddit-post-submit-screenshot.png', fullPage: true });
      throw new Error("Comment submission may have failed - comment box not cleared");
    }

    console.log("Comment posted successfully!");
    await delay(1500);

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
        await page.screenshot({ path: 'reddit-error-screenshot.png', fullPage: true });
        console.log("Screenshot saved as reddit-error-screenshot.png");
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

