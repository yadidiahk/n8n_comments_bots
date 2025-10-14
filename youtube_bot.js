import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function postYouTubeComment(videoUrl, commentText) {
  const username = process.env.YOUTUBE_USER;
  const password = process.env.YOUTUBE_PASS;

  if (!username || !password) {
    throw new Error("YouTube credentials not found in environment variables");
  }

  if (!videoUrl || !commentText) {
    throw new Error("Both videoUrl and commentText are required");
  }

  // Extract video ID from any YouTube URL format and normalize
  let videoId = null;
  let isShort = false;
  
  try {
    // Handle different YouTube URL formats
    if (videoUrl.includes('youtu.be/')) {
      // Shortened URL: https://youtu.be/VIDEO_ID
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (videoUrl.includes('/shorts/')) {
      // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
      videoId = videoUrl.split('/shorts/')[1].split('?')[0].split('&')[0];
      isShort = true;
    } else if (videoUrl.includes('watch?v=')) {
      // Standard URL: https://www.youtube.com/watch?v=VIDEO_ID
      videoId = videoUrl.split('watch?v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtube.com/embed/')) {
      // Embed URL: https://www.youtube.com/embed/VIDEO_ID
      videoId = videoUrl.split('embed/')[1].split('?')[0].split('&')[0];
    } else if (videoUrl.includes('youtube.com/v/')) {
      // Old format: https://www.youtube.com/v/VIDEO_ID
      videoId = videoUrl.split('/v/')[1].split('?')[0].split('&')[0];
    } else {
      throw new Error(`Unsupported YouTube URL format: ${videoUrl}`);
    }
    
    if (!videoId || videoId.length < 10) {
      throw new Error(`Could not extract valid video ID from URL: ${videoUrl}`);
    }
    
    // Normalize to standard YouTube URL format
    const originalUrl = videoUrl;
    if (isShort) {
      videoUrl = `https://www.youtube.com/shorts/${videoId}`;
    } else {
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    if (originalUrl !== videoUrl) {
      console.log(`Normalized URL: ${originalUrl} -> ${videoUrl}`);
    }
  } catch (error) {
    throw new Error(`Invalid YouTube URL: ${error.message}`);
  }

  let browser;
  let page;

  try {
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for deployment
      userDataDir: './youtube_profile',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    console.log("Navigating directly to video...");
    try {
      await page.goto(videoUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
    } catch (navError) {
      console.log("Navigation timeout, but page may have loaded - continuing...");
    }
    
    await delay(1000);
    
    // Stop video playback immediately to save time
    console.log("Stopping video playback...");
    try {
      await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          video.pause();
          video.muted = true;
          console.log('Video paused');
        }
      });
    } catch (e) {
      console.log("Could not pause video, continuing...");
    }
    
    await delay(500);
    
    // Scroll down immediately to trigger comments to render
    console.log("Scrolling down to trigger comments rendering...");
    for (let i = 0; i < 5; i++) {
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 1000);
        });
        await delay(400);
      } catch (e) {
        console.log(`Initial scroll ${i+1} failed, continuing anyway...`);
      }
    }
    
    await delay(1000);
    
    // Check if we're already logged in by looking for the user avatar or sign-in button
    const isLoggedIn = await page.evaluate(() => {
      // If there's a sign-in button visible, we're not logged in
      const signInButton = document.querySelector('a[aria-label="Sign in"]');
      if (signInButton && signInButton.offsetParent !== null) {
        return false;
      }
      
      // If we can find the user avatar/menu, we're logged in
      const avatar = document.querySelector('#avatar-btn') || 
                     document.querySelector('button#avatar-btn') ||
                     document.querySelector('ytd-topbar-menu-button-renderer:last-child button') ||
                     document.querySelector('yt-img-shadow#avatar');
      return avatar !== null;
    });
    
    console.log(`Login status: ${isLoggedIn ? 'Logged in' : 'Not logged in'}`);
    
    if (!isLoggedIn) {
      console.log("Not logged in. Proceeding with login...");
      
      // Navigate directly to Google login page with the video URL as the continue parameter
      console.log("Navigating directly to Google login...");
      const loginUrl = `https://accounts.google.com/ServiceLogin?service=youtube&hl=en&continue=${encodeURIComponent(videoUrl)}`;
      
      console.log(`Login URL: ${loginUrl}`);
      
      try {
        await page.goto(loginUrl, { 
          waitUntil: 'load',
          timeout: 60000 
        });
        console.log("Successfully navigated to Google login page");
        await delay(2000);
      } catch (navErr) {
        console.log(`Navigation error: ${navErr.message}`);
        console.log("Trying again with networkidle0...");
        try {
          await page.goto(loginUrl, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
          });
        } catch (navErr2) {
          console.log(`Second navigation attempt failed: ${navErr2.message}`);
        }
      }
      
      await delay(2000);
      
      // Only proceed with login if we're on Google login page
      let currentUrl = page.url();
      console.log(`Current URL after navigation: ${currentUrl}`);
      
      if (currentUrl.includes('accounts.google.com')) {
        console.log("On Google login page, waiting for page to stabilize...");
        await delay(2000);
        
        // Check for "Before you continue" or cookie consent page
        console.log("Checking for cookie consent or 'Before you continue' page...");
        try {
          const acceptButtons = await page.$$('button');
          for (const button of acceptButtons) {
            const text = await button.evaluate(el => el.textContent);
            if (text && (text.includes('Accept') || text.includes('I agree') || text.includes('Continue'))) {
              console.log(`Found and clicking: "${text}"`);
              await button.click();
              await delay(2000);
              break;
            }
          }
        } catch (e) {
          console.log("No consent page found, continuing...");
        }
        
        console.log("Waiting for email field...");
        let emailSelector = null;
        const emailSelectors = [
          'input[type="email"]',
          '#identifierId', 
          'input[name="identifier"]',
          'input[name="Email"]',
          'input[aria-label*="email"]',
          'input[aria-label*="Email"]'
        ];
        
        for (const selector of emailSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            emailSelector = selector;
            console.log(`Found email field with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Email selector ${selector} not found, trying next...`);
          }
        }
        
        if (!emailSelector) {
          console.log("Taking screenshot for debugging...");
          await page.screenshot({ path: 'youtube-login-error.png', fullPage: true });
          
          // Get page HTML for debugging
          const pageHTML = await page.content();
          console.log("Page title:", await page.title());
          console.log("Page has input fields:", (await page.$$('input')).length);
          
          throw new Error("Could not find email input field on Google login page. Check youtube-login-error.png for details.");
        }
        
        await delay(500);
        
        console.log("Entering email...");
        await page.type(emailSelector, username, { delay: 30 });
        await delay(200);
        
        console.log("Clicking next button...");
        await page.click('#identifierNext button');
        
        console.log("Waiting for password field...");
        let passwordSelector = null;
        const passwordSelectors = ['input[type="password"]', 'input[name="Passwd"]', '#password input', '[name="password"]'];
        
        for (const selector of passwordSelectors) {
          try {
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            passwordSelector = selector;
            console.log(`Found password field with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Password selector ${selector} not found, trying next...`);
          }
        }
        
        if (!passwordSelector) {
          console.log("Taking screenshot for debugging...");
          await page.screenshot({ path: 'youtube-password-error.png', fullPage: true });
          throw new Error("Could not find password input field on Google login page. Check youtube-password-error.png for details.");
        }
        
        await delay(700);
        
        console.log("Entering password...");
        await page.type(passwordSelector, password, { delay: 30 });
        await delay(200);
        
        console.log("Clicking next button to login...");
        await page.click('#passwordNext button');
        
        console.log("Waiting for login to complete...");
        try {
          await page.waitForNavigation({ 
            waitUntil: 'networkidle2', 
            timeout: 20000 
          });
        } catch (navError) {
          console.log("Navigation timeout - checking if we're logged in anyway...");
        }
        
        await delay(3000);
        
        // Check if 2FA or verification is required
        const afterLoginUrl = page.url();
        console.log(`Current URL after login: ${afterLoginUrl}`);
        
        if (afterLoginUrl.includes("challenge") || afterLoginUrl.includes("verify")) {
          console.log("Google is asking for verification. Please complete it manually.");
          console.log("The browser will remain open for 60 seconds...");
          await delay(60000);
        }
        
        // Check if we're at the correct video page after login
        currentUrl = page.url();
        console.log(`Current URL after login: ${currentUrl}`);
        
        // Wait for page to stabilize after login
        console.log("Waiting for page to stabilize after login...");
        await delay(3000);
        
        // Check if we need to navigate to the video
        currentUrl = page.url();
        if (!currentUrl.includes(videoUrl.split('?')[0].split('#')[0])) {
          console.log("Navigating to video...");
          try {
            await page.goto(videoUrl, { 
              waitUntil: 'networkidle2',
              timeout: 30000 
            });
          } catch (navError) {
            console.log("Navigation timeout, but page may have loaded...");
          }
          await delay(3000);
        }
        
        // Stop video playback after login
        console.log("Stopping video playback...");
        try {
          await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video) {
              video.pause();
              video.muted = true;
            }
          });
          await delay(500);
        } catch (e) {
          console.log("Could not pause video:", e.message);
        }
        
        // Scroll down to trigger comments rendering after login
        console.log("Scrolling down to trigger comments rendering...");
        for (let i = 0; i < 5; i++) {
          try {
            await page.evaluate(() => {
              window.scrollBy(0, 1000);
            });
            await delay(500);
          } catch (e) {
            console.log(`Scroll after login ${i+1} failed: ${e.message}`);
          }
        }
        
        await delay(2000);
      } else {
        console.log("WARNING: Not on Google login page after navigation. Trying to proceed anyway...");
        console.log("The youtube_profile might have an invalid session. Consider deleting the youtube_profile directory.");
        
        // Try to navigate back to the video page and hope we get logged in somehow
        console.log("Navigating back to video page...");
        try {
          await page.goto(videoUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
        } catch (e) {
          console.log("Could not navigate to video");
        }
        await delay(2000);
      }
    } else {
      console.log("Already logged in! Skipping login process.");
    }
    
    console.log("Ready to post comment...");
    await delay(500);
    
    // Close any popups/dialogs/overlays
    console.log("Closing any popups or overlays...");
    try {
      // Make sure the page is still valid
      if (!page.isClosed()) {
        const closeSelectors = [
          'button[aria-label="Cancel"]',
          'button[aria-label="Close"]',
          '[aria-label="Dismiss"]',
          '.style-scope.tp-yt-paper-dialog button',
          'tp-yt-paper-dialog button[aria-label="No thanks"]',
          'ytd-button-renderer button[aria-label="Dismiss"]'
        ];
        
        for (const selector of closeSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              const isVisible = await button.isVisible();
              if (isVisible) {
                await button.click();
                console.log(`Closed popup with selector: ${selector}`);
                await delay(300);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        try {
          await page.keyboard.press('Escape');
          await delay(300);
        } catch (e) {
          console.log("Could not press Escape key");
        }
      }
    } catch (e) {
      console.log("No popup to close or error closing:", e.message);
    }
    
    // Check if this is a YouTube Short
    const isShort = videoUrl.includes('/shorts/') || await page.evaluate(() => {
      return window.location.pathname.includes('/shorts/');
    });
    
    if (isShort) {
      console.log("Detected YouTube Short - using Short-specific selectors");
    } else {
      console.log("Detected regular YouTube video");
    }
    
    console.log("Scrolling more to fully load comments section...");
    
    // Scroll down more aggressively to ensure comments are fully loaded
    for (let i = 0; i < 4; i++) {
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 800);
        });
        await delay(400);
      } catch (e) {
        console.log(`Additional scroll ${i+1} failed, continuing anyway...`);
      }
    }
    
    // Wait for comments to load
    console.log("Waiting for comments section to load...");
    try {
      await page.waitForSelector('ytd-comments#comments, #comments', { timeout: 10000 });
      console.log("Comments section found!");
    } catch (e) {
      console.log("Comments section not found yet, scrolling more and waiting...");
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 600);
        });
        await delay(2000);
        await page.waitForSelector('ytd-comments#comments, #comments', { timeout: 5000 });
      } catch (e2) {
        console.log("Still can't find comments, but continuing...");
      }
    }
    
    console.log("Looking for comment box...");
    
    // For Shorts, we need to click on the comments icon first
    if (isShort) {
      console.log("Opening comments panel for Short...");
      try {
        const commentsButton = await page.$('[aria-label*="Comment"], [aria-label*="comment"], #comments-button');
        if (commentsButton) {
          await commentsButton.click();
          console.log("Clicked comments button for Short");
          await delay(1000);
        }
      } catch (e) {
        console.log("Could not find comments button for Short, continuing...");
      }
    }
    
    // Step 1: Click on comment box trigger to activate it
    console.log("Looking for comment box trigger...");
    const commentTriggerSelectors = [
      '#placeholder-area',
      '#simplebox-placeholder',
      'ytd-comment-simplebox-renderer',
      '#simple-box',
      'ytd-comments-entry-point-header-renderer',
      '#comments-button ~ #comment-teaser',
      'div[id="placeholder-area"]',
      '[id*="simplebox"]'
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
            
            // Check if contenteditable appeared after click
            const hasContentEditable = await page.evaluate(() => {
              const editables = document.querySelectorAll('[contenteditable="true"], #contenteditable-root');
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
      console.log("Comment trigger not needed or not found, looking directly for comment field...");
    } else {
      await delay(1000);
    }
    
    // Step 2: Find the actual editable field with retry logic
    console.log("Looking for editable comment field...");
    const possibleEditableSelectors = [
      '#contenteditable-root',
      'div[contenteditable="true"]#contenteditable-root',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      '#simplebox-placeholder',
      'ytd-commentbox #contenteditable-root'
    ];
    
    let editableSelector = null;
    let editableElement = null;
    
    // Try multiple times with delays
    for (let attempt = 0; attempt < 4; attempt++) {
      if (editableSelector) break;
      
      console.log(`Attempt ${attempt + 1} to find comment field...`);
      
      for (const selector of possibleEditableSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} element(s) matching: ${selector}`);
            
            for (const el of elements) {
              try {
                const isVisible = await el.isVisible();
                const boundingBox = await el.boundingBox();
                
                if (isVisible && boundingBox) {
                  editableSelector = selector;
                  editableElement = el;
                  console.log(`Found valid comment field with selector: ${selector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            if (editableSelector) break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!editableSelector && attempt < 3) {
        console.log("Comment field not found yet, trying to activate it...");
        
        // Try clicking on comment box area with JavaScript
        const clicked = await page.evaluate(() => {
          const triggers = [
            document.querySelector('#placeholder-area'),
            document.querySelector('ytd-comment-simplebox-renderer'),
            document.querySelector('#simplebox-placeholder')
          ];
          
          for (const trigger of triggers) {
            if (trigger) {
              trigger.click();
              return true;
            }
          }
          return false;
        });
        
        if (clicked) {
          console.log("Clicked on comment box container, waiting for editor...");
        }
        
        await delay(1500);
      }
    }
    
    if (!editableSelector) {
      console.log("Could not find comment field. Debugging information:");
      console.log("Current URL:", page.url());
      
      // Get all contenteditable elements
      const availableElements = await page.evaluate(() => {
        const editables = document.querySelectorAll('[contenteditable="true"], #contenteditable-root, [id*="simplebox"]');
        return Array.from(editables).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          id: el.id,
          visible: el.offsetParent !== null,
          boundingBox: el.getBoundingClientRect ? {
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
            top: el.getBoundingClientRect().top
          } : null
        }));
      });
      console.log("Available editable elements:", JSON.stringify(availableElements, null, 2));
      
      await page.screenshot({ path: 'youtube-comment-field-not-found.png', fullPage: true });
      console.log("Screenshot saved as youtube-comment-field-not-found.png");
      
      throw new Error("Comment field not found with any known selector. Check youtube-comment-field-not-found.png for debugging.");
    }
    
    console.log("Clicking on the editable field...");
    try {
      await editableElement.click();
    } catch (e) {
      await page.click(editableSelector);
    }
    await delay(500);
    
    console.log(`Typing comment: "${commentText}"`);
    await page.type(editableSelector, commentText, { delay: 30 });
    await delay(500);
    
    // Verify the text was actually entered
    const typedText = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText || element.textContent : '';
    }, editableSelector);
    console.log(`Text in comment box: "${typedText}"`);
    
    if (!typedText || !typedText.includes(commentText.trim())) {
      throw new Error(`Comment text mismatch! Expected: "${commentText}", Got: "${typedText}"`);
    }
    
    console.log("Waiting for submit button to be enabled...");
    await delay(1000);
    
    console.log("Looking for submit button...");
    const possibleButtonSelectors = [
      '#submit-button button',
      'ytd-button-renderer#submit-button button',
      '#submit-button > ytd-button-renderer button',
      'button[aria-label*="Comment"]',
      'ytd-commentbox #submit-button button',
      '[id="submit-button"] button'
    ];
    
    let submitButtonSelector = null;
    let submitButtonElement = null;
    
    for (const selector of possibleButtonSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const isVisible = await el.isVisible().catch(() => false);
            const isEnabled = await el.evaluate(node => 
              !node.disabled && 
              node.getAttribute('aria-disabled') !== 'true' && 
              node.offsetParent !== null
            ).catch(() => false);
            
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
    
    if (!submitButtonSelector) {
      console.log("Could not find submit button. Available buttons on page:");
      const availableButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        return Array.from(buttons).map((el, i) => ({
          index: i,
          id: el.id,
          ariaLabel: el.getAttribute('aria-label'),
          disabled: el.disabled,
          ariaDisabled: el.getAttribute('aria-disabled'),
          text: el.textContent?.trim().substring(0, 50),
          visible: el.offsetParent !== null
        })).filter(b => 
          b.text?.toLowerCase().includes('comment') || 
          b.ariaLabel?.toLowerCase().includes('comment') ||
          b.id?.includes('submit')
        );
      });
      console.log(JSON.stringify(availableButtons, null, 2));
      
      await page.screenshot({ path: 'youtube-no-button.png', fullPage: true });
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
        ariaDisabled: button.getAttribute('aria-disabled'),
        visible: button.offsetParent !== null,
        text: button.textContent?.trim(),
        ariaLabel: button.getAttribute('aria-label')
      };
    }, submitButtonSelector);
    
    console.log("Button state before click:", JSON.stringify(buttonState, null, 2));
    
    if (buttonState.disabled || buttonState.ariaDisabled === 'true') {
      throw new Error("Submit button is still disabled! The comment might not be ready to post.");
    }
    
    console.log("Submitting comment...");
    let clickSuccess = false;
    
    try {
      await submitButtonElement.click();
      console.log("Element click executed");
      clickSuccess = true;
    } catch (clickError) {
      console.log("Element click failed, trying page.click...");
      try {
        await page.click(submitButtonSelector);
        console.log("Page click executed");
        clickSuccess = true;
      } catch (clickError2) {
        console.log("Page click failed, trying JavaScript click...");
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
      return element ? element.innerText || element.textContent : null;
    }, editableSelector);
    
    console.log(`Comment box after submit: "${commentBoxAfterSubmit}"`);
    
    // Check if our comment appears in the comments list
    const commentAppeared = await page.evaluate((commentTextParam) => {
      const comments = Array.from(document.querySelectorAll('ytd-comment-renderer #content-text, ytd-comment-renderer yt-attributed-string'));
      return comments.some(comment => {
        const text = comment.innerText || comment.textContent;
        return text && text.trim().includes(commentTextParam.trim());
      });
    }, commentText);
    
    if (commentAppeared) {
      console.log("SUCCESS! Comment verified to appear in the comments section!");
    } else if (!commentBoxAfterSubmit || commentBoxAfterSubmit.trim() === '' || commentBoxAfterSubmit.trim().length < 5) {
      console.log("Comment box is empty - comment likely posted successfully!");
    } else {
      console.log("WARNING: Comment box still contains text. Comment may not have been posted.");
      console.log("Taking screenshot for debugging...");
      await page.screenshot({ path: 'youtube-post-submit-screenshot.png', fullPage: true });
      throw new Error("Comment submission may have failed - comment box not cleared");
    }
    
    console.log("Comment posted successfully!");
    await delay(1500);
    
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
        await page.screenshot({ path: 'youtube-error-screenshot.png', fullPage: true });
        console.log("Screenshot saved as youtube-error-screenshot.png");
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


