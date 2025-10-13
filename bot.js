import puppeteer from "puppeteer";


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    browser = await puppeteer.launch({ 
      headless: true, // Set to true for Docker deployment
      userDataDir: './linkedin_profile',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });

    page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
  console.log("Checking if already logged in...");
  await page.goto("https://www.linkedin.com/feed", { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await delay(2000);
  let currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  if (currentUrl.includes("/login") || currentUrl.includes("/uas/login")) {
    console.log("Not logged in. Proceeding with login...");
    
    console.log("Navigating to LinkedIn login page...");
    await page.goto("https://www.linkedin.com/login", { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await delay(2000);
    
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
      
      // Get page content for debugging
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
    
    currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes("/checkpoint/") || currentUrl.includes("/challenge/")) {
      console.log("LinkedIn is asking for verification. Please complete it manually.");
      console.log("The browser will remain open for 60 seconds...");
      await delay(60000);
    }
    
    if (currentUrl.includes("/login")) {
      throw new Error("Login failed - still on login page. Check your credentials.");
    }
  } else {
    console.log("Already logged in! Skipping login process.");
  }
  
  console.log("Logged in successfully! Navigating to post...");
  try {
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (navError) {
    console.log("Navigation timeout, trying with domcontentloaded...");
    try {
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (secondError) {
      console.log("Second navigation attempt timed out, continuing anyway...");
    }
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
    // Updated 2024-2025 selectors
    '.comments-comment-box__form-trigger',
    '.comments-comment-box-comment__form-trigger',
    '.comments-comment-box__comment-text-trigger',
    'button.comment-button',
    'div[data-test-id="comment-button"]',
    
    // Older selectors
    '.comments-comment-box-comment__text-editor',
    'button[aria-label*="Add a comment"]',
    '[data-control-name*="comment"]',
    '.comments-comment-box__container',
    '.comment-button'
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
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!commentBoxActivated) {
    console.log("Comment trigger not needed or not found, looking directly for comment box...");
  }
  
  console.log("Looking for comment box...");
  const possibleSelectors = [
    // Updated 2024-2025 selectors
    '.comments-comment-box-comment__text-editor .ql-editor',
    '.comments-comment-box__form .ql-editor',
    '.ql-editor[contenteditable="true"]:not(.ql-clipboard)',
    'div[data-test-id="comment-box-text-editor"]',
    '.comments-comment-texteditor .ql-editor',
    
    // Older selectors (keeping for backward compatibility)
    '.ql-editor:not(.ql-clipboard)',
    '.comments-comment-box__editor',
    'div[role="textbox"]',
    '[data-placeholder*="comment"]',
    '.comments-comment-texteditor',
    '.comments-comment-box__text-editor',
    'div.ql-editor.ql-blank',
    'div[data-placeholder="Add a comment…"]',
    '[aria-label*="Add a comment"]',
    '.editor-content[contenteditable="true"]',
    
    // Generic contenteditable as last resort
    '[contenteditable="true"]'
  ];
  
  let commentBoxSelector = null;
  let commentBoxElement = null;
  
  // Try multiple times with delays
  for (let attempt = 0; attempt < 3; attempt++) {
    if (commentBoxSelector) break;
    
    console.log(`Attempt ${attempt + 1} to find comment box...`);
    
    for (const selector of possibleSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            try {
              const isVisible = await el.isVisible();
              const boundingBox = await el.boundingBox();
              
              if (isVisible && boundingBox) {
                commentBoxSelector = selector;
                commentBoxElement = el;
                console.log(`Found comment box with selector: ${selector}`);
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
      console.log("Comment box not found yet, waiting and scrolling...");
      await page.evaluate(() => window.scrollBy(0, 200));
      await delay(2000);
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
        text: el.textContent?.trim().substring(0, 50)
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
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
}
