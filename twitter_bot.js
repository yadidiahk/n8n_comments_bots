import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postTwitterComment(tweetUrl, commentText) {
  const username = process.env.TWITTER_USER;
  const password = process.env.TWITTER_PASS;

  if (!username || !password) {
    throw new Error("Twitter credentials not found in environment variables");
  }

  if (!tweetUrl || !commentText) {
    throw new Error("Both tweetUrl and commentText are required");
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

    console.log("=== STEP 1: Navigating directly to tweet ===");
    console.log(`Tweet URL: ${tweetUrl}`);
    
    try {
      await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    } catch (navError) {
      console.log("Navigation to tweet timed out, but continuing...");
    }

    console.log("Waiting for page to load...");
    await delay(5000);
    
    let currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check for login modal FIRST before doing anything else
    console.log("\n=== STEP 2: Checking for login modal ===");
    const loginModalAppeared = await page.evaluate(() => {
      const modalText = document.body.textContent || '';
      return modalText.includes('Reply to join the conversation') || 
             modalText.includes('Log in to X') ||
             (modalText.includes('Log in') && modalText.includes('Sign up'));
    });
    
    console.log(`Login modal present: ${loginModalAppeared}`);
    
    if (loginModalAppeared) {
      console.log("Login modal detected! Need to log in first...");
      await page.screenshot({ path: 'twitter-login-modal-detected.png', fullPage: true });
      
      // Click the "Log in" button in the modal
      const loginButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], a[role="link"]'));
        for (const button of buttons) {
          const text = button.textContent?.trim();
          if (text === 'Log in' || text === 'Login') {
            button.click();
            return true;
          }
        }
        return false;
      });
      
      if (loginButtonClicked) {
        console.log("Clicked 'Log in' button in modal");
        await delay(3000);
        
        // Now we should be on the login page
        currentUrl = page.url();
        console.log(`Current URL after clicking login: ${currentUrl}`);
        
        if (currentUrl.includes("/login") || currentUrl.includes("/i/flow")) {
          console.log("Successfully redirected to login page. Performing login...");
          
          // Perform login
          console.log("Looking for username field...");
          const possibleUsernameSelectors = [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]'
          ];

          let usernameSelector = null;
          for (const selector of possibleUsernameSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 5000, visible: true });
              usernameSelector = selector;
              console.log(`Found username field: ${selector}`);
              break;
            } catch (e) {
              continue;
            }
          }

          if (!usernameSelector) {
            await page.screenshot({ path: 'twitter-login-page-error.png', fullPage: true });
            throw new Error("Username field not found on login page");
          }

          console.log("Entering username...");
          await page.type(usernameSelector, username, { delay: 100 });
          await delay(500);
          await page.keyboard.press('Enter');
          await delay(2000);

          // Check for verification
          const needsVerification = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return text.includes('Enter your phone') || text.includes('Enter your email');
          });

          if (needsVerification) {
            console.log("Additional verification required. Entering username/email...");
            const verificationField = await page.$('input[type="text"]');
            if (verificationField) {
              await page.type('input[type="text"]', username, { delay: 100 });
              await delay(500);
              await page.keyboard.press('Enter');
              await delay(2000);
            }
          }

          console.log("Looking for password field...");
          const possiblePasswordSelectors = [
            'input[name="password"]',
            'input[type="password"]'
          ];

          let passwordSelector = null;
          for (const selector of possiblePasswordSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 5000, visible: true });
              passwordSelector = selector;
              console.log(`Found password field: ${selector}`);
              break;
            } catch (e) {
              continue;
            }
          }

          if (!passwordSelector) {
            await page.screenshot({ path: 'twitter-password-field-error.png', fullPage: true });
            throw new Error("Password field not found");
          }

          console.log("Entering password...");
          await page.type(passwordSelector, password, { delay: 100 });
          await delay(1000);
          
          console.log("Clicking login button...");
          await page.keyboard.press('Enter');
          await delay(5000);

          currentUrl = page.url();
          console.log(`Current URL after login: ${currentUrl}`);

          if (currentUrl.includes("/login") || currentUrl.includes("/i/flow")) {
            await page.screenshot({ path: 'twitter-login-failed.png', fullPage: true });
            throw new Error("Login failed. Check credentials.");
          }

          console.log("Login successful! Navigating back to tweet...");
          await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
          await delay(5000);
        }
      } else {
        throw new Error("Could not find 'Log in' button in modal");
      }
    } else {
      console.log("No login modal detected - already logged in or page loaded correctly");
    }

    // Wait for tweet to load
    console.log("Waiting for tweet to fully load...");
    try {
      await page.waitForSelector('[data-testid="tweet"], article', {
        timeout: 10000,
        visible: true
      });
      console.log("Tweet loaded!");
    } catch (e) {
      console.log("Could not detect tweet, but continuing...");
    }
    await delay(1000);

    // Scroll the tweet into view properly
    console.log("Scrolling tweet into view...");
    await page.evaluate(() => {
      const tweet = document.querySelector('[data-testid="tweet"]');
      if (tweet) {
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollBy(0, 300);
      }
    });
    await delay(2000);

    console.log("\n=== STEP 3: Finding and clicking reply button ===");
    
    // First, let's check what buttons are available
    const availableButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-testid]');
      return Array.from(buttons).map(btn => ({
        testId: btn.getAttribute('data-testid'),
        visible: btn.offsetParent !== null,
        ariaLabel: btn.getAttribute('aria-label')
      })).filter(b => b.testId && b.testId.includes('reply'));
    });
    console.log("Available reply-related buttons:", JSON.stringify(availableButtons, null, 2));

    const replyButtonSelectors = [
      '[data-testid="reply"]',
      'button[data-testid="reply"]',
      'div[data-testid="reply"]',
      '[aria-label*="Reply"]',
      '[aria-label*="reply"]',
      'div[role="button"][aria-label*="Reply"]'
    ];

    let replyButtonActivated = false;
    
    // Try each selector
    for (const selector of replyButtonSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`Found ${elements.length} element(s) with selector: ${selector}`);
        
        if (elements.length > 0) {
          for (const element of elements) {
            const isVisible = await element.isVisible().catch(() => false);
            const boundingBox = await element.boundingBox().catch(() => null);
            
            console.log(`  Element visible: ${isVisible}, boundingBox:`, boundingBox);
            
            if (isVisible && boundingBox) {
              console.log(`Clicking reply button: ${selector}`);
              
              // Scroll into view first
              await element.evaluate(el => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
              await delay(1000);
              
              await element.click();
              await delay(3000);
              replyButtonActivated = true;

              // Check if reply box appeared
              const hasReplyBox = await page.evaluate(() => {
                const editables = document.querySelectorAll('[data-testid="tweetTextarea_0"], div[contenteditable="true"][role="textbox"]');
                return editables.length > 0;
              });

              if (hasReplyBox) {
                console.log("Reply box activated successfully!");
                break;
              } else {
                console.log("Reply box did not appear after click, trying next selector...");
                replyButtonActivated = false;
              }
            }
          }
          if (replyButtonActivated) break;
        }
      } catch (e) {
        console.log(`Error with selector ${selector}: ${e.message}`);
        continue;
      }
    }

    if (!replyButtonActivated) {
      console.log("Reply button not found with selectors, trying JavaScript click...");
      
      // Try finding and clicking via JavaScript
      const jsClicked = await page.evaluate(() => {
        const replyButtons = document.querySelectorAll('[data-testid="reply"]');
        if (replyButtons.length > 0) {
          replyButtons[0].click();
          return true;
        }
        return false;
      });
      
      if (jsClicked) {
        console.log("Clicked reply button via JavaScript");
        await delay(3000);
        replyButtonActivated = true;
      }
    }
    
    if (!replyButtonActivated) {
      console.log("WARNING: Could not activate reply button. Taking screenshot...");
      await page.screenshot({ path: 'twitter-reply-button-not-found.png', fullPage: true });
    } else {
      await delay(2000);
    }

    console.log("\n=== STEP 4: Finding tweet compose box ===");
    const possibleSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[contenteditable="true"][role="textbox"]',
      '[data-testid="tweetTextarea_0"] div[contenteditable="true"]',
      'div[contenteditable="true"][data-text="true"]',
      '[contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]'
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

                // Check if element is in reply/compose section
                const isInReplySection = await el.evaluate(node => {
                  let parent = node.parentElement;
                  let maxDepth = 15;
                  while (parent && maxDepth > 0) {
                    const testId = parent.getAttribute('data-testid') || '';
                    const ariaLabel = parent.getAttribute('aria-label') || '';
                    if (testId.includes('tweet') || testId.includes('reply') ||
                        ariaLabel.toLowerCase().includes('tweet') ||
                        ariaLabel.toLowerCase().includes('reply')) {
                      return true;
                    }
                    parent = parent.parentElement;
                    maxDepth--;
                  }
                  return false;
                });

                if (isVisible && boundingBox && (isInReplySection || elements.length === 1)) {
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

        // Try clicking on reply button with JavaScript
        const clicked = await page.evaluate(() => {
          const replyButtons = document.querySelectorAll('[data-testid="reply"], [aria-label*="Reply"]');
          if (replyButtons.length > 0) {
            replyButtons[0].click();
            return true;
          }
          return false;
        });

        if (clicked) {
          console.log("Clicked on reply button, waiting for compose box...");
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
        const editables = document.querySelectorAll('[contenteditable="true"], div[role="textbox"], [data-testid*="tweet"]');
        return Array.from(editables).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          className: el.className,
          testId: el.getAttribute('data-testid'),
          role: el.getAttribute('role'),
          visible: el.offsetParent !== null,
          boundingBox: el.getBoundingClientRect ? {
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
            top: el.getBoundingClientRect().top
          } : null
        }));
      });
      console.log("Available editable elements:", JSON.stringify(availableElements, null, 2));

      // Take screenshot
      await page.screenshot({ path: 'twitter-comment-box-not-found.png', fullPage: true });
      console.log("Screenshot saved as twitter-comment-box-not-found.png");

      throw new Error("Comment box not found with any known selector. Check twitter-comment-box-not-found.png for debugging.");
    }

    console.log("Clicking on comment box...");
    try {
      await commentBoxElement.click();
    } catch (e) {
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

    if (!typedText || !typedText.includes(commentText.trim())) {
      throw new Error(`Comment text mismatch! Expected: "${commentText}", Got: "${typedText}"`);
    }

    console.log("Waiting for submit button to be enabled...");
    await delay(1500);

    console.log("Looking for submit button...");
    const possibleButtonSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
      'div[data-testid="tweetButtonInline"]',
      'button[role="button"]:has-text("Reply")',
      'div[role="button"]:has-text("Reply")',
      '[aria-label*="Reply"]'
    ];

    let submitButtonSelector = null;
    let submitButtonElement = null;

    for (const selector of possibleButtonSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const isVisible = await el.isVisible().catch(() => false);
            const isEnabled = await el.evaluate(node => {
              const ariaDisabled = node.getAttribute('aria-disabled');
              return ariaDisabled !== 'true' && node.offsetParent !== null;
            }).catch(() => false);

            if (isVisible && isEnabled) {
              submitButtonSelector = selector;
              submitButtonElement = el;
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

    // If still not found, try a more general approach
    if (!submitButtonSelector) {
      console.log("Trying to find submit button by text content...");
      submitButtonElement = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        for (const button of buttons) {
          const text = button.textContent?.trim().toLowerCase() || '';
          const testId = button.getAttribute('data-testid') || '';
          if ((text === 'reply' || text === 'tweet' || testId.includes('tweet')) &&
              button.offsetParent !== null &&
              button.getAttribute('aria-disabled') !== 'true') {
            return button;
          }
        }
        return null;
      });

      if (submitButtonElement && await submitButtonElement.evaluate(el => el !== null)) {
        console.log("Found submit button by text content");
        submitButtonSelector = 'button';
      }
    }

    if (!submitButtonSelector && !submitButtonElement) {
      console.log("Could not find submit button. Available buttons on page:");
      const availableButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        return Array.from(buttons).map((el, i) => ({
          index: i,
          testId: el.getAttribute('data-testid'),
          ariaLabel: el.getAttribute('aria-label'),
          ariaDisabled: el.getAttribute('aria-disabled'),
          text: el.textContent?.trim().substring(0, 50),
          visible: el.offsetParent !== null
        })).filter(b => b.visible && (b.text?.toLowerCase().includes('reply') || b.text?.toLowerCase().includes('tweet') || b.testId?.includes('tweet')));
      });
      console.log(JSON.stringify(availableButtons, null, 2));

      await page.screenshot({ path: 'twitter-submit-button-not-found.png', fullPage: true });
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
        ariaDisabled: node.getAttribute('aria-disabled'),
        visible: node.offsetParent !== null,
        text: node.textContent?.trim(),
        testId: node.getAttribute('data-testid')
      };
    }).catch(() => ({ found: false })) : { found: false };

    console.log("Button state before click:", JSON.stringify(buttonState, null, 2));

    if (buttonState.ariaDisabled === 'true') {
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
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const button of buttons) {
              const text = button.textContent?.trim().toLowerCase() || '';
              const testId = button.getAttribute('data-testid') || '';
              if ((text === 'reply' || text === 'tweet' || testId.includes('tweet')) &&
                  button.offsetParent !== null &&
                  button.getAttribute('aria-disabled') !== 'true') {
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

    // Verify the comment was posted by checking if the compose box is gone or cleared
    const commentBoxAfterSubmit = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText || element.textContent : null;
    }, commentBoxSelector);

    console.log(`Comment box after submit: "${commentBoxAfterSubmit}"`);

    // Check if our comment appears in the replies
    const commentAppeared = await page.evaluate((commentTextParam) => {
      const tweets = Array.from(document.querySelectorAll('[data-testid="tweetText"]'));
      return tweets.some(tweet => {
        const text = tweet.innerText || tweet.textContent;
        return text && text.includes(commentTextParam);
      });
    }, commentText);

    if (commentAppeared) {
      console.log("SUCCESS! Comment verified to appear in the replies!");
    } else if (!commentBoxAfterSubmit || commentBoxAfterSubmit.trim() === '' || commentBoxAfterSubmit.trim().length < 5) {
      console.log("Comment box is empty - comment likely posted successfully!");
    } else {
      console.log("WARNING: Comment box still contains text. Comment may not have been posted.");
      console.log("Taking screenshot for debugging...");
      await page.screenshot({ path: 'twitter-post-submit-screenshot.png', fullPage: true });
      throw new Error("Comment submission may have failed - comment box not cleared");
    }

    console.log("Comment posted successfully!");
    await delay(1500);

    return {
      success: true,
      message: "Comment posted successfully!",
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
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
}

