# Chrome Profile Lock Fix

## Problem
The deployment was failing with this error:
```
The profile appears to be in use by another Chromium process (1458) on another computer (5062f44ecd55). 
Chromium has locked the profile so that it doesn't get corrupted.
```

## Root Cause
When Chrome/Chromium doesn't shut down cleanly in a Docker container (e.g., container restart, crash, or force stop), it leaves lock files in the profile directory:
- `SingletonLock`
- `SingletonSocket`  
- `SingletonCookie`

These lock files prevent new Chrome instances from launching because Chrome thinks another instance is using the profile.

## Solution
Added automatic profile lock cleanup before launching the browser in all Puppeteer-based bots. The cleanup function:

1. Removes lock files from the profile directory
2. Removes lock files from the `Default` subdirectory
3. Runs before every browser launch
4. Non-fatal - if cleanup fails, it logs a warning but continues

## Files Modified
1. **twitter_puppeteer_bot.js** - Twitter bot using Puppeteer
2. **bot.js** - LinkedIn bot
3. **tiktok_bot.js** - TikTok bot
4. **tiktok-manual-login.js** - TikTok manual login helper

## Implementation
Each file now includes:

```javascript
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
```

And calls it before launching:
```javascript
// Clean up profile locks before launching browser
cleanupProfileLocks(profilePath);

browser = await puppeteer.launch(launchOptions);
```

## Testing
After rebuilding and redeploying the Docker container, the bots should:
1. Automatically clean up stale lock files
2. Launch successfully even after container restarts
3. Log cleanup actions for debugging

## Deployment Steps
1. Rebuild the Docker image: `docker-compose build`
2. Restart the container: `docker-compose up -d`
3. Test by making a request to the Twitter bot endpoint

## Additional Notes
- This fix is non-breaking and backward compatible
- The cleanup is fast (milliseconds) and doesn't impact performance
- Bots using APIs (Reddit, YouTube, Twitter OAuth) were not affected and don't need this fix

