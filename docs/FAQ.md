# Frequently Asked Questions (FAQ)

Common questions about the Screenshot Capture Tool.

---

## General Questions

### What is this tool?

A **Notion Worker** — a small TypeScript program that runs in Notion's infrastructure. It gives your Notion AI Agent the ability to take screenshots of websites and return the image URLs.

### How much does it cost?

This tool is **free**. Costs come only from BrowserStack:

- **Free tier:** Limited screenshots (3-5/month)
- **Pro tier:** ~$99/month, includes thousands of screenshots
- **Enterprise:** Custom pricing

[View BrowserStack pricing](https://www.browserstack.com/pricing).

### Can I use it for free?

Yes, if you:
1. Have a free BrowserStack account (limited to ~3 screenshots/month)
2. Have a Notion workspace with AI Agents enabled

But most production use requires a paid BrowserStack plan.

### Do I need any special software?

- Node.js 22+ and npm 10.9.2+
- The `ntn` CLI (installed via npm)
- A Notion workspace

Everything is free to install and use.

### How do I get started?

1. [Install dependencies](INSTALLATION.md)
2. [Deploy the tool](DEPLOYMENT.md)
3. [Add it to your Notion Agent](DEPLOYMENT.md#step-6-add-tool-to-your-notion-agent)

Takes about 10–15 minutes.

---

## Technical Questions

### How does it work?

1. You ask your Notion Agent to take a screenshot
2. Agent calls this tool with a URL
3. Tool sends URL to BrowserStack API
4. BrowserStack renders the page in Chrome on Windows 11
5. Tool polls BrowserStack until screenshot is ready
6. Returns public image URL to agent

[Read the full flow](ARCHITECTURE.md#data-flow).

### What browser does it use?

**Default:** Chrome on Windows 11 (latest version)

You can configure it to use:
- Different browsers (Firefox, Safari)
- Different OS (macOS, Linux, Android, iOS)
- Mobile devices

[See configuration options](BROWSERSTACK_API.md#browser-configuration).

### Can I capture mobile screenshots?

Yes, but it requires code changes. See [Adding New Tools](DEVELOPMENT.md#adding-new-tools) for an example.

### How long does a screenshot take?

**Typical:** 4–15 seconds

**Breakdown:**
- API call to create job: 200ms
- Browser render time: 3–10 seconds (depends on website)
- Polling: 1–2 seconds
- **Total:** 4–15 seconds for most websites

[See performance details](API_REFERENCE.md#performance-characteristics).

### What if a website takes longer than 2 minutes?

The tool times out after 120 seconds (2 minutes). You can increase this by modifying `MAX_ATTEMPTS` in the code. [See how](DEVELOPMENT.md#adjust-polling-timeout).

### Is there a size limit for screenshots?

No enforced limit. Most screenshots are 100–500 KB. Images stay on BrowserStack's CDN for 7–30 days depending on your plan.

### Can I screenshot video content?

No. Notion captures a static screenshot of the page as it appears when loaded. Video content won't be captured.

### Can I authenticate to login-protected sites?

Not directly with current implementation. BrowserStack doesn't have browser session persistence. You'd need to modify the code to:

1. Generate a login URL with token
2. Pass that URL to BrowserStack
3. Or use BrowserStack's advanced features

Advanced use case; not trivial.

---

## Usage Questions

### How do I use this in Notion?

After deploying and attaching to your agent:

```
You: "Take a screenshot of https://github.com"
Agent: *calls the tool*
Agent: "Here's the screenshot: [image URL]"
```

You can also be more specific:

```
"What does https://news.ycombinator.com look like?"
"Screenshot the Notion AI landing page"
"Capture https://example.com for me"
```

### Can I batch multiple screenshots?

The agent only calls one tool at a time. If you ask for multiple screenshots:

```
"Screenshot https://github.com and https://github.com/features"
```

The agent will make two **sequential** tool calls (one after the other), not parallel.

### Can I save screenshots?

Screenshots are hosted on BrowserStack's public CDN. You can:

1. **Right-click the image** in Notion and save it
2. **Download from the CDN URL** directly
3. **Save the URL** in Notion for later access

Note: Images expire after your BrowserStack plan's retention period (typically 7–30 days).

### Can I see screenshot history?

Yes, all screenshots taken are in `ntn workers runs`:

```shell
ntn workers runs list
ntn workers runs logs <runId>
```

Shows timestamps, URLs, and results.

### What URLs can I screenshot?

HTTP and HTTPS URLs:
- ✅ `https://example.com`
- ✅ `https://example.com/path?query=value`
- ✅ `https://example.com:8080`
- ❌ `example.com` (missing protocol)
- ❌ `http://localhost:3000` (local)
- ❌ `ftp://example.com` (wrong protocol)

If a website is geo-blocked or blocks BrowserStack, it can't be captured.

---

## Deployment Questions

### How do I deploy?

```shell
# 1. Log in
ntn login

# 2. Set BrowserStack credentials
ntn workers env set BROWSERSTACK_USERNAME=...
ntn workers env set BROWSERSTACK_ACCESS_KEY=...

# 3. Deploy
ntn workers deploy

# 4. Attach to agent in Notion UI
```

[Detailed deployment guide](DEPLOYMENT.md).

### Do I need to redeploy after making changes?

Yes. Changes to `src/index.ts` require:

```shell
npm run build
ntn workers deploy
```

### Can I deploy to multiple Notion workspaces?

Yes, log out and log into a different workspace:

```shell
ntn logout
ntn login  # Logs into different workspace
ntn workers deploy
```

Each workspace gets its own instance of the tool.

### Can I rollback to a previous version?

Not automatically. To rollback:

1. Revert your changes in `src/index.ts`
2. Rebuild and redeploy

Consider using Git for version control:

```shell
git log --oneline  # See previous versions
git checkout <commit>  # Go back to old version
npm run build
ntn workers deploy
```

---

## Troubleshooting Questions

### Tool runs locally but fails when deployed

**Cause:** Credentials not set on Notion's servers

**Solution:**
```shell
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key
ntn workers deploy
```

[See troubleshooting guide](TROUBLESHOOTING.md#runtime-issues).

### Getting "Missing BrowserStack credentials" error

Means the environment variables aren't set.

**For local testing:** Create `.env` file with credentials

**For deployed:** Use `ntn workers env set` to store credentials on Notion's servers

See [Setting up credentials](DEPLOYMENT.md#step-3-store-browserstack-credentials).

### Screenshot URL returns 404

The image expired. BrowserStack CDN only keeps images for 7–30 days. Take a new screenshot.

### Tool takes forever and times out

Likely a very slow website. The tool waits up to 2 minutes by default.

**Solution:** Try a different website or increase timeout. [See how](DEVELOPMENT.md#adjust-polling-timeout).

### Getting "HTTP 403: Plan limitation exceeded"

You've used your monthly quota. Either:
- Wait until next billing period
- Upgrade your BrowserStack plan

---

## Development Questions

### How do I modify the tool?

Edit `src/index.ts`:

```shell
# Make changes
nano src/index.ts

# Type-check
npm run check

# Build
npm run build

# Test locally
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'

# Deploy
ntn workers deploy
```

[Development guide](DEVELOPMENT.md).

### Can I add more tools?

Yes! The worker can have multiple tools. Each agent tool is a separate `worker.tool()` call.

[See example](DEVELOPMENT.md#adding-new-tools).

### How do I capture Firefox instead of Chrome?

Edit the browser config in `src/index.ts`:

```typescript
browsers: [{
  os: "Windows",
  os_version: "11",
  browser: "firefox",  // Changed from "chrome"
  browser_version": "latest",
}]
```

Then rebuild and redeploy. [See all options](BROWSERSTACK_API.md#browser-configuration).

### Can I use this locally without deploying?

Yes! Use the `--local` flag:

```shell
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

Requires `.env` file with credentials.

### How do I debug failing runs?

Check logs:

```shell
# List recent runs
ntn workers runs list

# Get logs for a specific run
ntn workers runs logs <runId>

# Or get logs for the latest run
ntn workers runs list --plain | head -n1 | cut -f1 | xargs -I{} ntn workers runs logs {}
```

Logs show each step and any errors.

---

## Integration Questions

### Do I need Notion AI to use this?

Yes, this tool is only useful if you have:
- Notion workspace with AI Agents enabled
- An AI Agent configured in your workspace

The tool itself is just code; the agent is what makes it useful.

### Can I use this with my own custom agent?

Only if your agent is a **Notion Agent**. If you're building your own agent using a different platform (OpenAI, Anthropic, etc.), you'd need to:

1. Modify the code to remove Notion Worker SDK dependencies
2. Host it yourself (e.g., AWS Lambda, Vercel)
3. Call it via its own HTTP API

Not currently compatible with non-Notion agents.

### Can I share this tool with other Notion workspaces?

Not directly. Each workspace deployment is separate. However:

1. **Share the code:** Publish this repository; others can clone and deploy themselves
2. **Premium integration:** If Notion supported shared tools, that would be possible (feature request!)

---

## Security & Privacy Questions

### Are my screenshots private?

Screenshots are hosted on public BrowserStack CDN URLs. Anyone with the URL can view the image.

**Recommendation:** Don't screenshot sensitive data (personal info, passwords, etc.).

### Where are screenshots stored?

On **BrowserStack's CDN servers** (not Notion's, not your computer). They're retained for 7–30 days depending on your plan, then deleted.

### Is my BrowserStack credential secure?

**Yes.** Credentials are:
- Encrypted on Notion's servers
- Never logged or exposed in code
- Only sent to BrowserStack over HTTPS
- Never committed to Git

[Security details](ARCHITECTURE.md#security-considerations).

### What data is logged?

Tool logs include:
- Timestamps
- URLs being captured
- Job IDs from BrowserStack
- Success/failure messages

**Not logged:**
- BrowserStack credentials
- Sensitive data in URLs (stripped before logging)
- Screenshot contents

---

## Cost & Quota Questions

### How much does this cost per screenshot?

Depends on your BrowserStack plan:

| Plan | Cost | Includes |
|---|---|---|
| Free | $0 | ~3 screenshots/month |
| Pro | ~$99/month | ~1,000+ screenshots/month |
| Enterprise | Custom | Unlimited |

[BrowserStack pricing](https://www.browserstack.com/pricing).

### How do I track usage?

```shell
# List all runs (shows count)
ntn workers runs list | wc -l

# Export to CSV for analysis
ntn workers runs list --plain | awk -F'\t' '{print $1","$2","$3}' > runs.csv

# Check BrowserStack dashboard
# https://www.browserstack.com/dashboard
```

### Can I set a spending limit?

BrowserStack allows you to set a monthly spend limit in account settings. Requests are rejected once limit is reached.

### Are there rate limits?

Yes:
- **API rate limit:** Depends on plan (typically 100+ requests/sec)
- **Concurrent limit:** Usually 5–10 concurrent jobs
- **Daily limit:** Per your plan (varies)

Hitting limits results in HTTP 429 (Too Many Requests).

---

## Feature Requests & Limitations

### Can I capture PDF instead of images?

Not with current implementation. BrowserStack Screenshots API only returns image files (JPG, PNG).

To get PDF, you'd need to:
- Use a different service (e.g., Puppeteer)
- Or post-process the image (complex)

Feature request for Notion Workers?

### Can I capture responsive/responsive screenshots?

Current implementation captures desktop view only (1920×1080).

To capture mobile:
- Create a second tool instance with mobile browser config
- Or modify the browsers array

[See how](DEVELOPMENT.md#change-browser-configuration).

### Can I add custom headers/cookies?

Current implementation doesn't support this. BrowserStack API supports it, but would require code changes to pass through.

Feature request? [Open an issue](https://github.com/your-repo/issues).

### Can I script interactions (click, scroll, type)?

Not with current implementation. Screenshots are static captures only.

BrowserStack offers advanced features for interaction, but requires different API calls. Complex feature to add.

---

## Getting Help

### Can't find an answer?

1. **Read the docs:** [ARCHITECTURE.md](ARCHITECTURE.md), [Development Guide](DEVELOPMENT.md)
2. **Check troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. **Search issues:** [GitHub Issues](https://github.com/your-repo/issues)
4. **Ask in comments:** Open a GitHub Discussion or Issue

### Where should I report bugs?

[GitHub Issues](https://github.com/your-repo/issues) — include:
- Error message
- Steps to reproduce
- Your Node.js/npm versions
- Full logs from `ntn workers runs logs`

### How do I request features?

[GitHub Issues](https://github.com/your-repo/issues) with label `[feature-request]`

---

## Related Documentation

- [Installation Guide](INSTALLATION.md) — Setup
- [Deployment Guide](DEPLOYMENT.md) — Deploy
- [Development Guide](DEVELOPMENT.md) — Modify code
- [Troubleshooting](TROUBLESHOOTING.md) — Debug issues
- [API Reference](API_REFERENCE.md) — More details
