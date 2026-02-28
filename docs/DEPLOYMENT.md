# Deployment Guide

Complete step-by-step guide to deploy the Screenshot Capture Tool to production.

---

## Pre-Deployment Checklist

- ✅ You have access to a Notion workspace with AI Agents enabled
- ✅ You have the `ntn` CLI installed (`npm i -g ntn`)
- ✅ You have a BrowserStack account with an active plan
- ✅ You have your BrowserStack username and access key
- ✅ You can access your workspace from the command line

---

## Step 1: Install the `ntn` CLI

The `ntn` CLI is Notion's command-line tool for managing workers.

```shell
npm install -g ntn
```

**Verify installation:**
```shell
ntn --version
```

You should see a version number like `0.x.x`.

---

## Step 2: Log in to Your Notion Workspace

```shell
ntn login
```

This will:
1. Open your browser to Notion's login page
2. Ask you to authorize the CLI
3. Store your access token locally (in `~/.ntn/credentials`)

**Verify login:**
```shell
ntn debug
```

Output should show your workspace info (Markdown format).

---

## Step 3: Store BrowserStack Credentials

BrowserStack credentials are stored in Notion's encrypted environment, **not** in your code.

### Get Your Credentials

1. Log in to [BrowserStack](https://www.browserstack.com/)
2. Go to [Settings → Account](https://www.browserstack.com/accounts/settings)
3. Find your **Username** (e.g., `john_doe`)
4. Find your **Access Key** (a long alphanumeric string; keep it secret!)

### Store Credentials with ntn

```shell
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key
```

**Example:**
```shell
ntn workers env set BROWSERSTACK_USERNAME=jane_smith_123
ntn workers env set BROWSERSTACK_ACCESS_KEY=a1b2c3d4e5f6g7h8i9j0
```

### Verify Credentials Stored

```shell
ntn workers env list
```

You should see:
```
BROWSERSTACK_USERNAME    [stored]
BROWSERSTACK_ACCESS_KEY  [stored]
```

> **⚠️ Important:** The actual values are hidden. They're encrypted on Notion's servers.

---

## Step 4: Build the Project

TypeScript needs to be compiled to JavaScript before deployment.

```shell
npm run build
```

This:
- Compiles `src/index.ts` to `dist/index.js`
- Type-checks the entire codebase
- Validates all TypeScript syntax

**Output:**
```
(no output = success)
```

If there are errors, fix them before proceeding.

### Alternative: Type-Check Only

To check types without building:

```shell
npm run check
```

---

## Step 5: Deploy to Notion

```shell
ntn workers deploy
```

This will:
1. Build the project (if not already built)
2. Package the code
3. Upload to Notion's infrastructure
4. Register the `captureScreenshot` tool
5. Display deployment info

**Expected output:**
```
✓ Built successfully
✓ Deployed to Notion
Tool 'captureScreenshot' is now available
Ready to use in agents
```

### Deployment Details

The deployment creates:
- **Worker ID:** Unique identifier for your worker
- **Tool Name:** `captureScreenshot` (callable by agents)
- **Environment:** Prod (production; not a staging environment)

---

## Step 6: Add Tool to Your Notion Agent

Now that the tool is deployed, you need to attach it to your AI Agent.

### In Notion Web App

1. Open your Notion workspace
2. Open an AI Agent (or create a new one)
3. Click the agent settings icon (⚙️)
4. Go to **Tools** section
5. Click **Add Tool**
6. Search for `captureScreenshot` (or find it in the list)
7. Click **Add**
8. Click **Save**

### Result

Your agent now has the `captureScreenshot` tool available and can call it during conversations.

---

## Step 7: Test the Deployment

### Option A: Test via Notion Web App

1. Open a conversation with your agent
2. Ask: *"Can you take a screenshot of https://www.github.com?"*
3. The agent should call your tool and return a screenshot URL

### Option B: Test via CLI

```shell
ntn workers exec captureScreenshot -d '{"url": "https://www.github.com"}'
```

This runs the tool directly against the deployed worker.

**Expected output:**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/ab1234cd5678ef90/screenshot.jpg
```

### Viewing Logs

```shell
# List recent runs
ntn workers runs list

# View logs for the latest run
ntn workers runs list --plain | head -n1 | cut -f1 | xargs -I{} ntn workers runs logs {}

# View logs for a specific run ID
ntn workers runs logs <runId>
```

---

## Common Deployment Issues

### Issue: `ntn command not found`

**Cause:** CLI not installed or not in PATH

**Solution:**
```shell
npm install -g ntn
```

Then restart your terminal.

### Issue: `Not logged in`

**Cause:** You haven't run `ntn login` yet

**Solution:**
```shell
ntn login
```

### Issue: `BrowserStack credentials not found`

**Cause:** You skipped Step 3

**Solution:**
```shell
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key
```

### Issue: Build fails with TypeScript errors

**Cause:** Code has syntax errors

**Solution:**
- Run `npm run check` to see detailed errors
- Fix the errors in `src/index.ts`
- Run `npm run build` again

### Issue: Deployment succeeds but tool doesn't appear in Notion

**Cause:** Tool wasn't attached to your agent, or you need to refresh

**Solution:**
1. Refresh your Notion page (Ctrl+R or Cmd+R)
2. Add the tool to your agent manually (see Step 6)

### Issue: Tool runs but returns error

**Cause:** Credentials incorrect or BrowserStack issue

**Solution:**
1. Verify credentials: `ntn workers env list`
2. Check logs: `ntn workers runs logs <runId>`
3. Test credentials manually at [BrowserStack Dashboard](https://www.browserstack.com/dashboard)

---

## Updating & Redeploying

### Making Changes

1. Edit `src/index.ts` with your changes
2. Run `npm run build` to verify
3. Run `ntn workers deploy` to redeploy

The new version is live immediately; no need to restart.

### Common Updates

**Update BrowserStack browser config (e.g., Firefox instead of Chrome):**

In `src/index.ts`, change:
```typescript
browsers: [{
  os: "Windows",
  os_version: "11",
  browser: "firefox",      // Changed from "chrome"
  browser_version: "latest",
}]
```

Then:
```shell
npm run build
ntn workers deploy
```

**Update polling timeout:**

In `src/index.ts`, change:
```typescript
const MAX_ATTEMPTS = 120;  // was 60, now 4 minutes instead of 2
```

Then redeploy.

---

## Monitoring & Maintenance

### View Recent Runs

```shell
ntn workers runs list
```

Shows:
- Run ID
- Timestamp
- Success/failure status
- Tool name

### Analyze Logs

```shell
ntn workers runs logs <runId>
```

Look for:
- ✅ `[captureScreenshot] Creating BrowserStack job...` — Successful start
- ✅ `[captureScreenshot] Job created successfully...` — Job queued
- ✅ `[captureScreenshot] Screenshot ready:...` — Success!
- ❌ `[captureScreenshot] Error:...` — What went wrong

### Track Usage

Use `ntn workers runs list --plain` to extract data:

```shell
# Count runs in the last 24 hours (today only)
ntn workers runs list --plain | wc -l

# Export to CSV for analysis
ntn workers runs list --plain | awk -F'\t' '{print $1","$2","$3}' > runs.csv
```

### Quota Management

Check your BrowserStack account regularly:

1. [BrowserStack Dashboard](https://www.browserstack.com/dashboard)
2. Look at **Usage** section
3. Compare against your plan's limits

---

## Rollback & Recovery

### If Deployment Breaks Your Agent

The tool is versioned; you can deploy a previous stable version.

**Option 1: Manual Rollback**

1. Edit `src/index.ts` to revert your changes
2. Run `ntn workers deploy`

**Option 2: Remove Tool from Agent**

If you can't fix it quickly:
1. Go to agent settings in Notion
2. Remove the `captureScreenshot` tool
3. Save

Your agent works without it; you can re-add it later once fixed.

---

## Security Considerations

### Credentials Security

- ✅ Credentials stored on Notion's encrypted servers
- ✅ Never logged or exposed in code
- ✅ Only sent to BrowserStack over HTTPS
- ❌ Never commit credentials to Git

### URL Handling

- Currently accepts any URL
- Sends to BrowserStack as-is (not validated locally)
- Consider adding URL validation if handling user input

### Screenshot Storage

- Images hosted on BrowserStack's CDN
- Retention depends on your BrowserStack plan (typically 7–30 days)
- Images are public URLs; anyone with the link can view
- No sensitive data should be in the URL

---

## Post-Deployment Best Practices

1. **Monitor logs:** Check `ntn workers runs logs` regularly for errors
2. **Test changes locally first:** Use `ntn workers exec captureScreenshot --local -d '...'` before deploying
3. **Keep credentials secure:** Rotate BrowserStack access key periodically
4. **Document changes:** Update your `CHANGELOG.md` if making modifications
5. **Track usage:** Monitor `ntn workers runs list` to catch unexpected spike in failures

---

## Related Documentation

- [Installation Guide](INSTALLATION.md) — Development environment setup
- [Development Guide](DEVELOPMENT.md) — Modifying the tool
- [API Reference](API_REFERENCE.md) — Tool specification
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
