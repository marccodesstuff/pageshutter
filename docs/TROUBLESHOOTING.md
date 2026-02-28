# Troubleshooting Guide

Solutions for common issues encountered when developing, deploying, or using the Screenshot Capture Tool.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Development & Testing Issues](#development--testing-issues)
3. [Deployment Issues](#deployment-issues)
4. [Runtime Issues](#runtime-issues)
5. [BrowserStack Issues](#browserstack-issues)
6. [Notion Integration Issues](#notion-integration-issues)
7. [Performance Issues](#performance-issues)
8. [Getting Help](#getting-help)

---

## Installation Issues

### `npm ERR! code ERESOLVE`

**Symptom:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Cause:** Dependency version conflict

**Solution:**

Option 1: Use npm's legacy peer deps
```shell
npm install --legacy-peer-deps
```

Option 2: Clear cache and reinstall
```shell
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

Option 3: Use Node version 18 LTS instead of 22
```shell
nvm install 18
nvm use 18
npm install
```

---

### `node: command not found`

**Symptom:**
```
bash: node: command not found
```

**Cause:** Node.js not installed or not in PATH

**Solution:**

1. Install Node.js from [nodejs.org](https://nodejs.org/) (LTS version)
2. Restart your terminal
3. Verify: `node --version`

**On macOS with Homebrew:**
```shell
brew install node@22
```

**On Linux (Ubuntu/Debian):**
```shell
sudo apt update
sudo apt install nodejs npm
```

---

### `npm: command not found`

**Symptom:**
```
bash: npm: command not found
```

**Cause:** npm not installed (usually comes with Node.js)

**Solution:**

1. Reinstall Node.js from [nodejs.org](https://nodejs.org/)
2. Ensure you select npm in the installer
3. Restart your terminal
4. Verify: `npm --version`

---

### Permission denied errors during `npm install`

**Symptom:**
```
npm ERR! Error: EACCES: permission denied, access '/usr/local/lib/node_modules'
```

**Cause:** npm trying to write to system directories

**Solution (macOS/Linux):**

Fix npm permissions:
```shell
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

Then try again:
```shell
npm install
```

---

## Development & Testing Issues

### `npm run build` fails with TypeScript errors

**Symptom:**
```
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**Cause:** TypeScript type mismatch in your code

**Solution:**

1. Read the error message carefully — it shows the file and line number
2. Check the type definition on that line
3. Fix the type mismatch

**Example:**
```typescript
// ❌ Wrong
const message: string = maybeString;  // maybeString might be undefined

// ✅ Correct
const message = maybeString ?? "default";
```

Run the check again:
```shell
npm run check
npm run build
```

---

### `.env` file not loaded during local testing

**Symptom:**
```
Screenshot capture failed: Missing BrowserStack credentials. Set BROWSERSTACK_USERNAME...
```

Even though you have `.env` file.

**Cause:** `.env` file not in the project root, or ntn not reading it

**Solution:**

1. Verify `.env` exists in project root:
```shell
ls -la .env
```

2. Verify contents:
```shell
cat .env
```
Should show your credentials (not empty).

3. Clear local runs cache and try again:
```shell
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

Note: `--local` flag **requires** `.env` file with valid credentials.

---

### Local execution works, but deployed doesn't

**Symptom:**

```shell
# Local works:
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
# ✅ Success: Screenshot ready

# Deployed fails:
ntn workers exec captureScreenshot -d '{"url": "https://example.com"}'
# ❌ Error: Missing BrowserStack credentials
```

**Cause:** Didn't push credentials to Notion's environment

**Solution:**

Push credentials to Notion:
```shell
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key

# Verify they're set
ntn workers env list
```

Then try deployed execution again:
```shell
ntn workers exec captureScreenshot -d '{"url": "https://example.com"}'
```

---

### `ntn: command not found`

**Symptom:**
```
bash: ntn: command not found
```

**Cause:** Notion CLI not installed globally

**Solution:**

Install Notion CLI:
```shell
npm install -g ntn
```

Restart your terminal and verify:
```shell
ntn --version
```

---

### Tool execution hangs indefinitely

**Symptom:**

```shell
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
# ... waiting forever, no response
```

**Cause:** 
- Network issue
- BrowserStack API unreachable
- Very slow website causing timeout
- Credentials invalid (stuck retrying)

**Solution:**

**Option 1:** Press Ctrl+C to stop and check logs

```shell
ntn workers runs logs
```

Look for errors like:
```
[captureScreenshot] Error: Failed to poll BrowserStack job (HTTP 401)
```

**Option 2:** Verify credentials are correct

```shell
# Check your BrowserStack account
cat .env | grep BROWSERSTACK
```

**Option 3:** Test BrowserStack API manually with curl

```shell
curl -X POST https://www.browserstack.com/screenshots \
  -u "username:accesskey" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "browsers": [{"os": "Windows", "os_version": "11", "browser": "chrome", "browser_version": "latest"}]
  }'
```

If curl fails, BrowserStack is down or your credentials are wrong.

---

## Deployment Issues

### `ntn workers deploy` fails with "not logged in"

**Symptom:**
```
Error: You are not logged in. Run 'ntn login' to connect to a workspace.
```

**Cause:** Haven't authenticated with Notion workspace

**Solution:**

Log in to your workspace:
```shell
ntn login
```

This opens a browser; follow the prompts to authorize the CLI.

Then verify login:
```shell
ntn debug
```

Should show your workspace info.

---

### `ntn workers deploy` fails with build errors

**Symptom:**
```
error TS2345: Argument of type... is not assignable to...
```

**Cause:** TypeScript errors in your code

**Solution:**

Fix the TypeScript errors first:
```shell
npm run check  # See detailed errors
npm run build  # Try building
ntn workers deploy
```

---

### Deployment succeeds but tool doesn't appear in Notion

**Symptom:**

```shell
ntn workers deploy
# ✅ Deployed successfully

# But in Notion, tool not available
```

**Cause:**
- Tool wasn't attached to your agent
- Notion page needs refresh
- Tool is attached but agent settings not saved

**Solution:**

1. **Refresh Notion:** Ctrl+R (Windows/Linux) or Cmd+R (macOS)
2. **Manually attach tool:**
   - Open agent settings (⚙️)
   - Go to **Tools** section
   - Click **Add Tool**
   - Search for `captureScreenshot` or find in list
   - Click **Add**
   - **Save** agent settings
3. **Verify deployment:**
   ```shell
   ntn workers runs list
   ```
   Should show recent runs

---

### `ntn workers deploy` times out

**Symptom:**
```
Error: Deployment timed out after 300 seconds
```

**Cause:**
- Notion infrastructure slow
- Network connectivity issue
- Large project size

**Solution:**

**Option 1:** Try again
```shell
ntn workers deploy
```

**Option 2:** Check Notion status

Visit [status.notion.so](https://status.notion.so/) to see if there are ongoing incidents.

**Option 3:** Check your network

Try a different network or restart your router.

---

### Credentials stored on Notion but tool still fails

**Symptom:**

```shell
ntn workers env list
# BROWSERSTACK_USERNAME    [stored]
# BROWSERSTACK_ACCESS_KEY  [stored]

# But tool fails:
ntn workers exec captureScreenshot -d '{"url": "https://example.com"}'
# Error: Missing BrowserStack credentials
```

**Cause:**
- Credentials not properly saved
- Credentials string malformed
- Environment variable name typo

**Solution:**

Re-set the credentials:
```shell
# Delete old ones
ntn workers env unset BROWSERSTACK_USERNAME
ntn workers env unset BROWSERSTACK_ACCESS_KEY

# Set new ones
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key

# Verify
ntn workers env list
```

Note: These show `[stored]`, actual values are hidden.

---

## Runtime Issues

### Tool returns "Screenshot capture failed: Missing BrowserStack credentials"

**Symptom:**
```
Tool error: Screenshot capture failed: Missing BrowserStack credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables.
```

**Cause:** Environment variables not set in Notion's environment

**Solution:**

Set credentials with `ntn`:
```shell
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key

# Verify
ntn workers env list
```

Then redeploy:
```shell
ntn workers deploy
```

---

### Tool returns "Failed to create BrowserStack job (HTTP 401)"

**Symptom:**
```
Error: Failed to create BrowserStack job (HTTP 401)
```

**Cause:** Invalid BrowserStack credentials (wrong username or access key)

**Solution:**

1. Verify credentials at [BrowserStack Settings](https://www.browserstack.com/accounts/settings)
2. Get your correct **Username** and **Access Key**
3. Update credentials:
```shell
ntn workers env set BROWSERSTACK_USERNAME=correct_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=correct_access_key

# Verify by testing locally
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

---

### Tool returns "BrowserStack job failed with state: error"

**Symptom:**
```
Error: BrowserStack job failed with state: error
```

**Cause:** Website cannot be rendered (unreachable, blocks BrowserStack, etc.)

**Solution:**

**Option 1:** Try a different website
```
Agent: "Can you screenshot https://github.com?"
```

**Option 2:** The website might be:
- Temporarily down
- Blocking BrowserStack IPs
- Geo-restricted
- Requires authentication

Try a different URL or check if the website is accessible.

---

### Tool returns "BrowserStack job did not complete within 120 seconds"

**Symptom:**
```
Error: BrowserStack job did not complete within 120 seconds.
```

**Cause:** Website took too long to load (> 2 minutes)

**Solution:**

**Option 1:** Try a simpler/faster website
```
Agent: "Can you screenshot https://example.com?" (instead of complex site)
```

**Option 2:** Increase timeout in code

In `src/index.ts`, change:
```typescript
const MAX_ATTEMPTS = 60;  // was 60 (2 minutes)
```

To:
```typescript
const MAX_ATTEMPTS = 150; // now 5 minutes (150 × 2 seconds)
```

Then rebuild and redeploy:
```shell
npm run build
ntn workers deploy
```

---

### Agent says "No tool named captureScreenshot"

**Symptom:**
```
Agent: I don't have a tool called "captureScreenshot"
```

**Cause:** Tool not attached to agent

**Solution:**

1. In Notion, open your AI Agent
2. Click settings (⚙️)
3. Go to **Tools**
4. Click **Add Tool**
5. Search "captureScreenshot" or find in list
6. Click **Add**
7. **Save** your agent settings

The tool should now be available.

---

## BrowserStack Issues

### "Failed to create BrowserStack job (HTTP 403): Plan limitation exceeded"

**Symptom:**
```
Error: Failed to create BrowserStack job (HTTP 403): Plan limitation exceeded
```

**Cause:** 
- Screenshot quota exhausted for current billing period
- Concurrent screenshot limit reached
- Account suspended

**Solution:**

1. Check your [BrowserStack Dashboard](https://www.browserstack.com/dashboard)
2. Look at **Usage** section
3. See how many screenshots you've used this month
4. Either:
   - Wait until next billing period
   - Upgrade your plan
   - Contact BrowserStack support if account suspended

---

### "Failed to create BrowserStack job (HTTP 429): Rate limit exceeded"

**Symptom:**
```
Error: Failed to create BrowserStack job (HTTP 429): Rate limit exceeded
```

**Cause:** Too many requests to BrowserStack API in short time span

**Solution:**

**Option 1:** Wait a few seconds and try again
```shell
# Wait 5 seconds, then try
sleep 5
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

**Option 2:** Space out requests over time

Don't call the tool repeatedly in rapid succession.

**Option 3:** Upgrade BrowserStack plan

Higher-tier plans have higher rate limits.

---

### "Failed to create BrowserStack job (HTTP 400): Invalid URL format"

**Symptom:**
```
Error: Failed to create BrowserStack job (HTTP 400): Invalid URL format
```

**Cause:** URL is not valid HTTP/HTTPS

**Solution:**

Ensure URL is valid:
```
✅ https://example.com
✅ https://example.com/path
✅ https://example.com:8080
❌ example.com (missing https://)
❌ http:// (incomplete)
❌ ftp://example.com (wrong protocol)
```

Ask the agent with a proper URL:
```
"Screenshot https://example.com"
```

---

### Screenshot image URL returns 404

**Symptom:**

Screenshot URL generated but returns 404 when visited.

**Cause:**
- Image expired (BrowserStack CDN retention period passed)
- Job failed silently

**Solution:**

**Option 1:** Take a new screenshot
```
"Take another screenshot of that page"
```

**Option 2:** Check BrowserStack plan

Your plan might have a retention period of only 7 days. Older images are deleted.

---

## Notion Integration Issues

### Can't find tool in agent after deployment

**Symptom:**

Tool doesn't appear when adding tools to agent.

**Cause:**
- Tool never deployed
- Wrong Notion workspace
- Workspace doesn't have Agents enabled

**Solution:**

1. Verify deployment succeeded:
```shell
ntn workers runs list
# Should show recent runs
```

2. Verify agent has Agents feature enabled:
   - In Notion, click **AI** button (top-right)
   - Should see agent creation option

3. If not enabled, ask your workspace admin to enable Notion AI

---

### Tool appears but agent says it's unavailable

**Symptom:**

Tool in agent settings but agent refuses to call it.

**Cause:**
- Tool has broken execute function
- Agent schema not recognized
- Agent needs to be refreshed

**Solution:**

1. **Refresh agent:**
   - Reload Notion page (Ctrl+R)
   - Close and reopen agent

2. **Check tool schema:**
   - Is the schema valid JSON?
   - Does the tool define required inputs correctly?
   - Run locally: `ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'`

3. **Redeploy tool:**
```shell
ntn workers deploy
```

---

### Tool runs but agent doesn't receive response

**Symptom:**

UI shows tool loaded, but agent freezes after calling tool.

**Cause:**
- Tool times out
- Tool returns invalid response format
- Network error between Notion and tool

**Solution:**

1. Check tool logs:
```shell
ntn workers runs list
ntn workers runs logs <latest_runId>
```

2. Check for timeouts:
   - Look for "Polling attempt 60/60" in logs
   - Tool might need more time

3. Redeploy:
```shell
ntn workers deploy
```

---

## Performance Issues

### Tool takes very long to respond (> 30 seconds)

**Symptom:**

Agent is waiting, tool seems slow.

**Cause:**
- Website takes long to load
- Polling loop taking many cycles
- Network latency

**Solution:**

**Option 1:** Wait (normal for complex websites)

Most websites render in 5–15 seconds. Some take up to 60+ seconds.

**Option 2:** Try a faster website to confirm tool works

```
"Screenshot https://example.com"  # Fast website
```

**Option 3:** Increase timeout in code

In `src/index.ts`:
```typescript
const MAX_ATTEMPTS = 120;  // was 60, now 240 seconds
```

---

### Tool uses too many API calls / expensive

**Symptom:**

Using more BrowserStack API calls than expected.

**Cause:**
- Polling taking many cycles (slow websites)
- Each poll is an API call
- Taking many screenshots

**Example math:**
- Website takes 10 seconds to load
- Polling every 2 seconds
- 5 polls × 2 API calls (create + poll) = ~10 API calls per screenshot

**Solution:**

**Option 1:** Reduce polling frequency

In `src/index.ts`:
```typescript
const POLL_INTERVAL_MS = 5000;  // was 2000, now 5 seconds
```

Reduces polling calls but slower response time.

**Option 2:** Cache results

Don't re-screenshot the same URL multiple times.

**Option 3:** Upgrade BrowserStack plan

Higher plans have higher quotas.

---

## Getting Help

### Where to Get Help

| Issue | Resource |
|-------|----------|
| **Tool error** | Check [Deployment Guide](DEPLOYMENT.md) |
| **Code error** | Check [Development Guide](DEVELOPMENT.md) |
| **BrowserStack error** | Check [BrowserStack API docs](https://www.browserstack.com/docs/screenshots/api) |
| **Notion integration** | Check [Notion Workers SDK docs](https://www.notion.so/) |
| **TypeScript error** | Check [TypeScript Handbook](https://www.typescriptlang.org/docs/) |

### Debugging Steps

1. **Check logs:**
   ```shell
   ntn workers runs logs <runId>
   ```

2. **Check environment:**
   ```shell
   ntn workers env list
   ntn debug
   ```

3. **Test locally:**
   ```shell
   ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
   ```

4. **Verify credentials:**
   ```shell
   cat .env  # Local
   ntn workers env list  # Deployed
   ```

5. **Check code:**
   ```shell
   npm run check
   ```

---

## Related Documentation

- [Installation Guide](INSTALLATION.md) — Setup environment
- [Development Guide](DEVELOPMENT.md) — Making changes
- [Deployment Guide](DEPLOYMENT.md) — Deploying to production
- [API Reference](API_REFERENCE.md) — Tool specification
- [Architecture](ARCHITECTURE.md) — System design
