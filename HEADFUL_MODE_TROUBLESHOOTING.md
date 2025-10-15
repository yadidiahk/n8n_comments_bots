# Headful Mode & noVNC Troubleshooting Guide

## Understanding the Setup

When running headful browsers in GCP (which has no physical display), you need:

1. **Xvfb** - Virtual framebuffer (fake display)
2. **x11vnc** - VNC server to access the display
3. **noVNC** - Web-based VNC client
4. **DISPLAY variable** - Tell Chrome which display to use

Your `start.sh` already configures all of this! ✅

---

## Step-by-Step Verification

### 1. Check if Container is Running

```bash
# SSH to your VM
cd ~/leadgen-comment-bot

# Check container status
docker-compose ps

# Should show:
# leadgen-comment-bot   Up   0.0.0.0:3000->3000/tcp, 0.0.0.0:6080->6080/tcp
```

### 2. Check if Xvfb is Running

```bash
# Check inside container
docker-compose exec leadgen-bot ps aux | grep Xvfb

# Should show something like:
# Xvfb :99 -screen 0 1280x800x24
```

### 3. Check if x11vnc is Running

```bash
# Check inside container
docker-compose exec leadgen-bot ps aux | grep x11vnc

# Should show x11vnc process
```

### 4. Check if noVNC is Running

```bash
# Check inside container
docker-compose exec leadgen-bot ps aux | grep websockify

# Should show websockify process (noVNC uses this)
```

### 5. Check DISPLAY Environment Variable

```bash
# Check inside container
docker-compose exec leadgen-bot echo $DISPLAY

# Should show: :99
```

### 6. Test noVNC Access

Open in your browser:
```
http://YOUR_VM_IP:6080/vnc.html
```

You should see:
- noVNC connection screen
- Click "Connect"
- See a desktop with window manager (fluxbox)

---

## Common Issues & Solutions

### Issue 1: "Cannot open display :99"

**Problem:** Chromium can't find the display

**Solution:**
```bash
# Check if Xvfb started
docker-compose logs | grep Xvfb

# Restart container
docker-compose restart

# Check logs again
docker-compose logs -f
```

### Issue 2: noVNC Shows Black Screen

**Problem:** x11vnc not connected properly

**Solution:**
```bash
# Check if x11vnc is running
docker-compose exec leadgen-bot ps aux | grep x11vnc

# If not running, restart
docker-compose restart
```

### Issue 3: Cannot Connect to noVNC

**Problem:** Port 6080 not accessible or firewall blocked

**Solution:**

**Check if port is listening:**
```bash
# On VM
sudo netstat -tulpn | grep 6080

# Should show:
# tcp6  0  0 :::6080  :::*  LISTEN  <pid>/docker-proxy
```

**Check GCP Firewall:**
1. Go to GCP Console → VPC Network → Firewall
2. Verify rule exists: `allow-novnc`
   - Target: All instances
   - Source IP: 0.0.0.0/0
   - Protocol: tcp:6080

**Check local firewall on VM:**
```bash
# Check if UFW is active
sudo ufw status

# If active and blocking
sudo ufw allow 6080
```

### Issue 4: Chrome Crashes Immediately

**Problem:** Not enough shared memory

**Solution:**

Add to `docker-compose.yml`:
```yaml
services:
  leadgen-bot:
    shm_size: '2gb'
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Issue 5: "Browser closed unexpectedly"

**Problem:** Chrome needs more resources or display

**Check logs:**
```bash
docker-compose logs | grep -i "chrome\|display\|error"
```

**Solution:**
```bash
# Verify DISPLAY is set
docker-compose exec leadgen-bot bash -c 'echo $DISPLAY'

# Test if X server is accessible
docker-compose exec leadgen-bot bash -c 'DISPLAY=:99 xdpyinfo'
```

---

## Manual Testing

### Test 1: Run Chrome Manually in Container

```bash
# Enter container
docker-compose exec leadgen-bot bash

# Check DISPLAY
echo $DISPLAY
# Should show: :99

# Try to run chromium
DISPLAY=:99 chromium --version
# Should show version number

# Exit container
exit
```

### Test 2: Test API Call and Watch in noVNC

1. Open noVNC in browser: `http://YOUR_VM_IP:6080/vnc.html`
2. Click "Connect"
3. In another terminal, make API call:
   ```bash
   curl -X POST http://YOUR_VM_IP:3000/api/linkedin/comment \
     -H "Content-Type: application/json" \
     -d '{"postUrl":"LINKEDIN_URL","comment":"Test"}'
   ```
4. Watch Chrome open in the noVNC window!

---

## Debugging Commands

### View All Logs
```bash
docker-compose logs -f
```

### View Startup Logs
```bash
docker-compose logs | head -50
```

### Check What's Running
```bash
docker-compose exec leadgen-bot ps aux
```

### Check Environment Variables
```bash
docker-compose exec leadgen-bot env | grep -E "DISPLAY|CHROME|PUPPETEER"
```

### Check noVNC Logs
```bash
docker-compose exec leadgen-bot cat /var/log/novnc.log
```

### Interactive Shell in Container
```bash
docker-compose exec leadgen-bot bash
```

---

## Complete Restart Procedure

If things aren't working, do a complete restart:

```bash
# Stop everything
docker-compose down

# Remove containers (keeps volumes/profiles)
docker-compose rm -f

# Rebuild (if you changed Dockerfile)
docker-compose build --no-cache

# Start fresh
docker-compose up -d

# Wait 10 seconds
sleep 10

# Check logs
docker-compose logs -f
```

---

## Verify Complete Setup

Run this checklist:

```bash
# 1. Container running?
docker-compose ps
# Should show "Up"

# 2. Xvfb running?
docker-compose exec leadgen-bot ps aux | grep Xvfb
# Should show process

# 3. x11vnc running?
docker-compose exec leadgen-bot ps aux | grep x11vnc
# Should show process

# 4. noVNC running?
docker-compose exec leadgen-bot ps aux | grep websockify
# Should show process

# 5. Display set?
docker-compose exec leadgen-bot echo $DISPLAY
# Should show :99

# 6. Node server running?
docker-compose exec leadgen-bot ps aux | grep node
# Should show node process

# 7. Port 6080 accessible?
curl -I http://localhost:6080/vnc.html
# Should return 200 OK

# 8. API working?
curl http://localhost:3000/health
# Should return {"status":"healthy"}
```

---

## Expected Startup Sequence

When you run `docker-compose up -d`, this should happen:

```
1. Container starts
2. start.sh executes
3. Xvfb starts on display :99 ✓
4. fluxbox window manager starts ✓
5. x11vnc connects to display :99 ✓
6. noVNC starts on port 6080 ✓
7. Node.js server starts on port 3000 ✓
8. Container keeps running ✓
```

Check logs to verify:
```bash
docker-compose logs
```

You should see:
```
Starting headful environment for Puppeteer
Display:        :99
Resolution:     1280x800x24
noVNC Port:     6080
App Port:       3000
Starting noVNC...
Starting Node.js server...
✅ All services started successfully!
Access API:   http://localhost:3000/
Access noVNC: http://localhost:6080/vnc.html
```

---

## Test Headful Mode Works

### Quick Test Script

Create a test file on the VM:

```bash
cd ~/leadgen-comment-bot
nano test-display.js
```

Paste this:
```javascript
import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing headful Chrome with display...');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  await page.goto('https://www.google.com');
  console.log('✅ Chrome opened successfully!');
  console.log('Check noVNC to see the browser window');
  
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  
  await browser.close();
  console.log('✅ Test complete!');
})();
```

Run it:
```bash
# Stop docker to free port 3000
docker-compose down

# Install deps if needed
npm install

# Set DISPLAY
export DISPLAY=:99

# Run test
node test-display.js
```

While it runs, open `http://YOUR_VM_IP:6080/vnc.html` and you should see Chrome!

---

## If Nothing Works

### Nuclear Option - Complete Rebuild

```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Start
docker-compose up -d

# Watch logs
docker-compose logs -f
```

---

## Still Having Issues?

### Collect Debug Info

```bash
# Create debug report
cd ~/leadgen-comment-bot

echo "=== Docker Status ===" > debug.log
docker-compose ps >> debug.log

echo -e "\n=== Container Logs ===" >> debug.log
docker-compose logs --tail=100 >> debug.log

echo -e "\n=== Processes ===" >> debug.log
docker-compose exec leadgen-bot ps aux >> debug.log

echo -e "\n=== Environment ===" >> debug.log
docker-compose exec leadgen-bot env >> debug.log

echo -e "\n=== Network ===" >> debug.log
sudo netstat -tulpn | grep -E "3000|6080" >> debug.log

# View report
cat debug.log
```

Share the `debug.log` for troubleshooting.

---

## Summary

**For headful mode to work in GCP:**

1. ✅ Xvfb creates virtual display (:99)
2. ✅ x11vnc exposes display via VNC (port 5900)
3. ✅ noVNC makes it web-accessible (port 6080)
4. ✅ DISPLAY=:99 environment variable set
5. ✅ Chrome launched with headless: false
6. ✅ Firewall allows port 6080

**Your setup has all of this configured!**

The most common issue is simply that services haven't started yet or ports aren't accessible. Use the verification steps above to diagnose.

**Quick Fix:** Just restart the container:
```bash
docker-compose restart
docker-compose logs -f
```

Then access: `http://YOUR_VM_IP:6080/vnc.html`

🎉 You should see your virtual desktop!

