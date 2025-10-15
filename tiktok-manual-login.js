import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function manualLogin() {
  console.log("🔧 TikTok Manual Login Helper");
  console.log("This will open a browser for you to login manually.");
  console.log("Your session will be saved for future automated use.\n");

  let browser;
  
  try {
    console.log("Launching browser...");
    
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
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => { 
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log("\n✅ Browser opened!");
    console.log("📝 Please follow these steps:");
    console.log("   1. The browser is now open and navigating to TikTok");
    console.log("   2. Login MANUALLY with your credentials");
    console.log("   3. Complete any verification (email/SMS/captcha)");
    console.log("   4. Wait until you're on the main TikTok feed");
    console.log("   5. Press Ctrl+C in this terminal when done\n");

    await page.goto("https://www.tiktok.com/login/phone-or-email/email", { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    console.log("⏳ Waiting for you to complete login...");
    console.log("   (The script will check every 5 seconds if you're logged in)\n");

    // Check every 5 seconds if logged in
    let isLoggedIn = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes

    while (!isLoggedIn && attempts < maxAttempts) {
      await delay(5000);
      attempts++;

      isLoggedIn = await page.evaluate(() => {
        const profileElements = document.querySelectorAll('[data-e2e="profile-icon"], [data-e2e="user-avatar"], .avatar-anchor');
        return profileElements.length > 0;
      });

      const currentUrl = page.url();
      
      if (isLoggedIn) {
        console.log("\n✅ LOGIN SUCCESSFUL!");
        console.log("   Your session has been saved in the tiktok_profile folder.");
        console.log("   The bot will now be able to post comments without logging in again.");
        break;
      }

      if (!currentUrl.includes('/login') && !currentUrl.includes('tiktok.com/@')) {
        // Might be on home page but profile not detected yet
        console.log(`   Still checking... (${attempts * 5}s) - Current URL: ${currentUrl}`);
      } else {
        console.log(`   Still on login page... (${attempts * 5}s)`);
      }
    }

    if (!isLoggedIn) {
      console.log("\n⏱️  Timeout reached. Please try again.");
      console.log("   Make sure you complete the login process.");
    }

    console.log("\n🎉 You can now close the browser.");
    console.log("   The bot should work without login issues now!");
    
    // Keep browser open for 10 more seconds
    await delay(10000);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n👋 Browser closed. Session saved!");
    }
  }
}

// Run the manual login
manualLogin().catch(console.error);

