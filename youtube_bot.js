import puppeteer from "puppeteer";

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
      headless: true, // Set to true for deployment
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
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 800);
        });
        await delay(300);
      } catch (e) {
        console.log(`Initial scroll ${i+1} failed, continuing anyway...`);
      }
    }
    
    await delay(500);
    
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
      
      console.log("Clicking sign in button...");
      const signInButton = await page.$('a[aria-label="Sign in"]') || 
                            await page.$('ytd-button-renderer a[href*="ServiceLogin"]');
      
      if (signInButton) {
        await signInButton.click();
        await delay(2000);
        
        // Check if we're now on Google login page
        let currentUrl;
        try {
          currentUrl = page.url();
          console.log(`Current URL: ${currentUrl}`);
        } catch (e) {
          console.log("Could not get URL after click, waiting...");
          await delay(2000);
          currentUrl = page.url();
        }
        
        if (!currentUrl.includes('accounts.google.com')) {
          console.log("Not redirected to login page. Checking login status again...");
          try {
            const recheckLogin = await page.evaluate(() => {
              const avatar = document.querySelector('#avatar-btn') || 
                             document.querySelector('yt-img-shadow#avatar');
              return avatar !== null;
            });
            
            if (recheckLogin) {
              console.log("Actually already logged in! Continuing...");
            } else {
              console.log("Navigating directly to Google login...");
              await page.goto("https://accounts.google.com/ServiceLogin?service=youtube", { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
              });
            }
          } catch (evalError) {
            console.log("Error checking login status, navigating to login page...");
            await page.goto("https://accounts.google.com/ServiceLogin?service=youtube&hl=en&continue=https://www.youtube.com/", { 
              waitUntil: 'domcontentloaded',
              timeout: 30000 
            });
          }
        }
      } else {
        console.log("Navigating directly to Google login...");
        try {
          // Use youtube.com in the continue URL, not the video URL directly
          await page.goto("https://accounts.google.com/ServiceLogin?service=youtube&hl=en&continue=https://www.youtube.com/", { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
          });
        } catch (navErr) {
          console.log("Navigation to login timed out, but continuing...");
        }
      }
      
      // Only proceed with login if we're on Google login page
      let currentUrl = page.url();
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
            waitUntil: 'domcontentloaded', 
            timeout: 15000 
          });
        } catch (navError) {
          console.log("Navigation timeout - checking if we're logged in anyway...");
        }
        
        await delay(1000);
        
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
        
        if (!currentUrl.includes(videoUrl.split('?')[0].split('#')[0])) {
          console.log("Navigating to video...");
          try {
            await page.goto(videoUrl, { 
              waitUntil: 'domcontentloaded',
              timeout: 30000 
            });
          } catch (navError) {
            console.log("Navigation timeout, but page may have loaded...");
          }
          await delay(2000);
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
        } catch (e) {
          console.log("Could not pause video");
        }
        
        // Scroll down to trigger comments rendering after login
        console.log("Scrolling down to trigger comments rendering...");
        for (let i = 0; i < 3; i++) {
          try {
            await page.evaluate(() => {
              window.scrollBy(0, 800);
            });
            await delay(300);
          } catch (e) {
            console.log(`Scroll after login ${i+1} failed, continuing anyway...`);
          }
        }
      } else {
        console.log("Login process complete, checking current page...");
        // Make sure we're on the video page
        currentUrl = page.url();
        if (!currentUrl.includes(videoUrl.split('?')[0].split('#')[0])) {
          console.log("Not on video page, navigating there...");
          try {
            await page.goto(videoUrl, { 
              waitUntil: 'domcontentloaded',
              timeout: 30000 
            });
          } catch (navError) {
            console.log("Navigation timeout, but continuing...");
          }
          await delay(2000);
          
          // Stop video playback
          console.log("Stopping video playback...");
          try {
            await page.evaluate(() => {
              const video = document.querySelector('video');
              if (video) {
                video.pause();
                video.muted = true;
              }
            });
          } catch (e) {
            console.log("Could not pause video");
          }
          
          // Scroll down to trigger comments rendering
          console.log("Scrolling down to trigger comments rendering...");
          for (let i = 0; i < 3; i++) {
            try {
              await page.evaluate(() => {
                window.scrollBy(0, 800);
              });
              await delay(300);
            } catch (e) {
              console.log(`Scroll ${i+1} failed, continuing anyway...`);
            }
          }
        }
      }
    } else {
      console.log("Already logged in! Skipping login process.");
    }
    
    console.log("Ready to post comment...");
    await delay(500);
    
    // Close any popups/dialogs/overlays
    console.log("Closing any popups or overlays...");
    try {
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
      
      await page.keyboard.press('Escape');
      await delay(300);
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
    
    // Scroll down a bit more to ensure comments are fully loaded
    for (let i = 0; i < 2; i++) {
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 600);
        });
        await delay(250);
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
    
    const possibleSelectors = [
      '#placeholder-area',
      '#simple-box',
      'ytd-comment-simplebox-renderer',
      '#simplebox-placeholder',
      '#comments-button ~ #comment-teaser',
      'ytd-comments-entry-point-header-renderer'
    ];
    
    let commentBoxSelector = null;
    
    for (const selector of possibleSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            commentBoxSelector = selector;
            console.log(`Found comment box area with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!commentBoxSelector) {
      console.log("Could not find comment box area. Taking screenshot...");
      await page.screenshot({ path: 'youtube-before-click.png', fullPage: true });
    }
    
    console.log("Clicking on comment box to activate it...");
    try {
      await page.click('#placeholder-area');
    } catch (e) {
      try {
        await page.click('ytd-comment-simplebox-renderer');
      } catch (e2) {
        console.log("Trying to click comment input area...");
        await page.click('#comments-button, ytd-comments-entry-point-header-renderer');
      }
    }
    await delay(800);
    
    console.log("Waiting for the editable comment field...");
    
    // Try multiple selectors for the comment input field
    let editableSelector = '#contenteditable-root';
    try {
      await page.waitForSelector(editableSelector, { visible: true, timeout: 3000 });
    } catch (e) {
      try {
        editableSelector = 'div[contenteditable="true"]';
        await page.waitForSelector(editableSelector, { visible: true, timeout: 3000 });
      } catch (e2) {
        try {
          editableSelector = '#simplebox-placeholder';
          await page.waitForSelector(editableSelector, { visible: true, timeout: 3000 });
        } catch (e3) {
          console.log("Could not find editable field with any selector, trying default...");
          editableSelector = '#contenteditable-root';
        }
      }
    }
    
    console.log(`Using selector: ${editableSelector}`);
    
    console.log("Clicking on the editable field...");
    await page.click(editableSelector);
    await delay(300);
    
    console.log(`Typing comment: "${commentText}"`);
    await page.type(editableSelector, commentText, { delay: 30 });
    await delay(300);
    
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
    await delay(500);
    
    console.log("Looking for submit button...");
    const submitButtonSelector = '#submit-button button';
    
    try {
      await page.waitForSelector(submitButtonSelector, { visible: true, timeout: 4000 });
    } catch (e) {
      console.log("Could not find submit button with default selector, trying alternatives...");
      await page.screenshot({ path: 'youtube-no-button.png', fullPage: true });
      throw new Error("Submit button not found");
    }
    
    // Check if button is enabled
    const buttonEnabled = await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
    }, submitButtonSelector);
    
    console.log(`Button enabled: ${buttonEnabled}`);
    
    if (!buttonEnabled) {
      console.log("Submit button is disabled, waiting a bit longer...");
      await delay(1000);
    }
    
    console.log("Submitting comment...");
    try {
      await page.click(submitButtonSelector);
      console.log("Click executed");
    } catch (clickError) {
      console.log("Regular click failed, trying JavaScript click...");
      await page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
        }
      }, submitButtonSelector);
      console.log("JavaScript click executed");
    }
    
    console.log("Waiting for comment to be posted...");
    await delay(2000);
    
    // Verify the comment was posted by checking if it appears in the comments
    const commentAppeared = await page.evaluate((commentTextParam) => {
      const comments = Array.from(document.querySelectorAll('ytd-comment-renderer #content-text'));
      return comments.some(comment => {
        const text = comment.innerText || comment.textContent;
        return text && text.trim().includes(commentTextParam.trim());
      });
    }, commentText);
    
    if (commentAppeared) {
      console.log("SUCCESS! Comment verified to appear in the comments section!");
    } else {
      console.log("WARNING: Could not verify comment in the page. It may still have been posted.");
      console.log("Taking screenshot for debugging...");
      await page.screenshot({ path: 'youtube-post-submit.png', fullPage: true });
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


