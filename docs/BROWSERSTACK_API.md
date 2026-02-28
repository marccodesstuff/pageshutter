# BrowserStack Screenshots API Integration

Complete technical documentation for how this tool integrates with the BrowserStack Screenshots API.

---

## Overview

The BrowserStack Screenshots API allows rendering websites in real browsers and capturing screenshots. This tool uses the **asynchronous job-based API** which consists of two phases:

1. **Create Job:** Submit a URL for screenshot rendering
2. **Poll Status:** Check job progress and retrieve results

---

## API Endpoints

### Create Job (POST)

**Endpoint:**
```
POST https://www.browserstack.com/screenshots
```

**Authentication:**
```
Authorization: Basic <base64(username:accessKey)>
```

**Content Type:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:**

```json
{
  "url": "https://example.com",
  "browsers": [
    {
      "os": "Windows",
      "os_version": "11",
      "browser": "chrome",
      "browser_version": "latest"
    }
  ]
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | **Yes** | The website URL to screenshot (must be HTTP/HTTPS) |
| `browsers` | array | **Yes** | Array of browser configs (see below) |

#### Browser Configuration

Each browser object specifies the environment:

| Field | Value | Notes |
|-------|-------|-------|
| `os` | `"Windows"` | Operating system (hardcoded) |
| `os_version` | `"11"` | OS version (hardcoded) |
| `browser` | `"chrome"` | Browser engine (hardcoded) |
| `browser_version` | `"latest"` | Latest Chrome version available |

**Example Response (HTTP 200 OK):**

```json
{
  "job_id": "ab1234cd5678ef90ghij"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `job_id` | string | Unique identifier for this screenshot job; used for polling |

#### Error Responses

**HTTP 400 Bad Request:**
```json
{
  "error": "Invalid URL format"
}
```

Common causes:
- URL is not valid HTTP/HTTPS
- URL is malformed
- URL is blocked by BrowserStack

**HTTP 401 Unauthorized:**
```json
{
  "error": "Invalid credentials"
}
```

Causes:
- Username or access key is incorrect
- Credentials are reversed (key in username field, etc.)

**HTTP 403 Forbidden:**
```json
{
  "error": "Plan limitation exceeded"
}
```

Causes:
- Screenshot quota exhausted for the current billing period
- Concurrent screenshot limit reached

**HTTP 429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded"
}
```

Causes:
- Too many requests in short time span
- API throttling triggered

---

### Poll Job Status (GET)

**Endpoint:**
```
GET https://www.browserstack.com/screenshots/<job_id>.json
```

**Authentication:**
```
Authorization: Basic <base64(username:accessKey)>
Content-Type: application/json
Accept: application/json
```

**Example Response (HTTP 200 OK):**

```json
{
  "state": "done",
  "screenshots": [
    {
      "image_url": "https://cdn.browserstack.com/screenshots/ab1234cd5678ef90/screenshot.jpg",
      "state": "done",
      "browser": "chrome",
      "os": "Windows",
      "os_version": "11"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `state` | string | Overall job state: `"pending"`, `"processing"`, `"done"`, `"error"`, `"timeout"` |
| `screenshots` | array | Array of screenshot results (one per browser config) |

#### Screenshot Object

| Field | Type | Description |
|-------|------|-------------|
| `image_url` | string | Public HTTPS URL to the screenshot image; valid for BrowserStack retention period |
| `state` | string | Status of this specific screenshot: `"done"`, `"error"`, `"timeout"` |
| `browser` | string | Browser used (e.g., `"chrome"`) |
| `os` | string | Operating system used (e.g., `"Windows"`) |
| `os_version` | string | OS version used (e.g., `"11"`) |

#### Job State Transitions

```
┌─────────┐
│ pending │ ─────────────┐
└─────────┘              │
                         ▼
                   ┌──────────────┐
                   │ processing   │
                   └──────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
        ┌─────┐    ┌────────┐    ┌────────┐
        │done │    │ error  │    │timeout │
        └─────┘    └────────┘    └────────┘
```

**State Descriptions:**

| State | Meaning | Action |
|-------|---------|--------|
| `pending` | Job queued, waiting to start rendering | Poll again in 2 seconds |
| `processing` | Browser is rendering and capturing | Poll again in 2 seconds |
| `done` | Screenshot ready; `image_url` is valid | Extract `image_url` and return |
| `error` | Website could not be rendered | Throw error |
| `timeout` | Job exceeded BrowserStack timeout | Throw error |

**Response - Pending State:**

```json
{
  "state": "pending",
  "screenshots": [
    {
      "state": "pending",
      "browser": "chrome",
      "os": "Windows",
      "os_version": "11"
    }
  ]
}
```

**Response - Error State:**

```json
{
  "state": "error",
  "screenshots": [
    {
      "state": "error",
      "browser": "chrome",
      "os": "Windows",
      "os_version": "11",
      "error": "Website unreachable"
    }
  ]
}
```

**Response - Timeout State:**

```json
{
  "state": "timeout",
  "screenshots": [
    {
      "state": "timeout",
      "browser": "chrome",
      "os": "Windows",
      "os_version": "11"
    }
  ]
}
```

#### Error Responses

**HTTP 401 Unauthorized:**
```
Credentials invalid during polling
```

**HTTP 404 Not Found:**
```
Job ID does not exist or has expired
```

---

## Implementation Details in This Tool

### Authentication Encoding

```typescript
function getAuthHeaders(): HeadersInit {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  
  // Create Basic Auth header: "Authorization: Basic <base64>"
  const encoded = Buffer.from(`${username}:${accessKey}`).toString("base64");
  
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
```

**Example:**
- `username`: `"john_doe"`
- `accessKey`: `"abc123xyz"`
- Combined: `"john_doe:abc123xyz"`
- Base64 encoded: `"am9obl9kb2U6YWJjMTIzeHl6"`
- Header: `"Authorization: Basic am9obl9kb2U6YWJjMTIzeHl6"`

### Create Job Implementation

```typescript
const createResponse = await fetch("https://www.browserstack.com/screenshots", {
  method: "POST",
  headers,
  body: JSON.stringify({
    url,
    browsers: [{
      os: "Windows",
      os_version: "11",
      browser: "chrome",
      browser_version": "latest",
    }],
  }),
});

if (!createResponse.ok) {
  const errorBody = await createResponse.text();
  throw new Error(`Failed to create BrowserStack job (HTTP ${createResponse.status}): ${errorBody}`);
}

const jobData = await createResponse.json() as BrowserStackJobResponse;
const jobId = jobData.job_id;
```

### Polling Implementation

```typescript
const POLL_INTERVAL_MS = 2000;  // 2 seconds
const MAX_ATTEMPTS = 60;         // 2 minutes max

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[captureScreenshot] Polling attempt ${attempt}/${MAX_ATTEMPTS}...`);
  
  await sleep(POLL_INTERVAL_MS);  // Wait before polling
  
  const pollResponse = await fetch(
    `https://www.browserstack.com/screenshots/${jobId}.json`,
    { method: "GET", headers },
  );
  
  if (!pollResponse.ok) {
    const errorBody = await pollResponse.text();
    throw new Error(`Failed to poll BrowserStack job (HTTP ${pollResponse.status}): ${errorBody}`);
  }
  
  const pollData = await pollResponse.json() as BrowserStackPollResponse;
  const state = pollData.state;
  
  if (state === "done") {
    const imageUrl = pollData.screenshots?.[0]?.image_url;
    return `Successfully captured screenshot. You can view it here: ${imageUrl}`;
  }
  
  if (state === "error" || state === "timeout") {
    throw new Error(`BrowserStack job failed with state: ${state}`);
  }
  
  // state is "pending" or "processing", continue loop
}

throw new Error(`BrowserStack job did not complete within ${MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds.`);
```

---

## Configuration Options

### Polling Interval

Currently hardcoded to **2 seconds**:

```typescript
const POLL_INTERVAL_MS = 2000;
```

**Trade-offs:**
- **Shorter (1s):** Faster response, but more API calls and higher cost
- **Longer (5s):** Fewer API calls, but slower response time
- **Current (2s):** Good balance for most use cases

### Maximum Attempts

Currently hardcoded to **60 attempts** (2 minutes total):

```typescript
const MAX_ATTEMPTS = 60;
```

**Trade-offs:**
- **Fewer (30 = 60s):** Fails faster if BrowserStack is slow
- **More (120 = 240s):** Waits longer for complex sites
- **Current (60 = 120s):** Notional limit; most sites render in <15 seconds

### Browser Configuration

Currently hardcoded to Windows 11 + Chrome:

```typescript
browsers: [{
  os: "Windows",
  os_version: "11",
  browser: "chrome",
  browser_version": "latest",
}]
```

**Options for other browsers:**

| Browser | Config |
|---------|--------|
| Firefox on Windows | `{ "os": "Windows", "os_version": "11", "browser": "firefox", "browser_version": "latest" }` |
| Safari on macOS | `{ "os": "OS X", "os_version": "Sequoia", "browser": "safari", "browser_version": "latest" }` |
| Chrome on macOS | `{ "os": "OS X", "os_version": "Sequoia", "browser": "chrome", "browser_version": "latest" }` |
| Mobile Chrome | `{ "os": "Android", "browser": "chrome", "browser_version": "latest" }` |

---

## Rate Limiting & Quota

### API Rate Limits

BrowserStack enforces rate limits based on your plan:

- **Free Plan:** Limited calls/day
- **Paid Plan:** Typically 1,000–10,000 calls/day
- **Enterprise:** Custom limits

### Per-Job Cost

Each screenshot incurs a cost in terms of:
- **API calls:** ~3–10 calls (1 create + 1–8 polls)
- **Bandwidth:** Image download size (typically 100–500 KB)

### Estimated Monthly Usage

| Scenario | Calls/Month | Est. Cost |
|----------|-------------|-----------|
| 10 screenshots/day | ~3,000 API calls | Low tier sufficient |
| 50 screenshots/day | ~15,000 API calls | Standard tier (~$50–100) |
| 500 screenshots/day | ~150,000 API calls | High tier (~$500+) |

Check your [BrowserStack pricing](https://www.browserstack.com/pricing) for exact rates.

---

## Known Limitations

### Websites BrowserStack Cannot Capture

- **Geo-blocked sites** — Sites that restrict access by IP
- **Authentication-required sites** — Pages behind login (unless using cookies)
- **Local/internal URLs** — `http://localhost`, `192.168.x.x`
- **Blocked sites** — Some networks block BrowserStack IPs (corporate firewalls)
- **JavaScript-heavy SPAs** — Sites requiring long JavaScript execution time

### Browser Limitations

- **Viewport:** Fixed to desktop size (1920×1080 typical)
- **Extensions:** No browser extensions available
- **Storage:** No persistent cookies/localStorage between runs
- **Flash/Plugins:** Outdated browser plugins not supported

### Timing Limitations

- **Load timeout:** BrowserStack ~30 seconds before giving up
- **JavaScript execution:** Limited to ~30 seconds
- **Overall job timeout:** 120 seconds (enforced by this tool)

---

## Optimizing for Performance

### Tips for Faster Screenshots

1. **Use static content** — Avoid sites with large media files
2. **Provide specific URLs** — Link to specific pages, not just the homepage
3. **Avoid redirect chains** — Direct URLs render faster than redirect sequences
4. **Consider viewport** — The default 1920×1080 may be wider than needed

### Tips for Lower Costs

1. **Batch requests** — Group multiple screenshots together
2. **Cache images** — Don't re-screenshot the same URL repeatedly
3. **Monitor usage** — Track API calls with `ntn workers runs logs`

---

## Debugging BrowserStack Issues

### Enable Verbose Logging

The tool already logs all steps:

```shell
ntn workers runs logs <runId>
```

Look for patterns in the logs to diagnose issues.

### Test Credentials

```shell
curl -X POST https://www.browserstack.com/screenshots \
  -u "username:accesskey" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "browsers": [{
      "os": "Windows",
      "os_version": "11",
      "browser": "chrome",
      "browser_version": "latest"
    }]
  }'
```

If this works, credentials are valid.

### Check Account Status

Visit [BrowserStack Dashboard](https://www.browserstack.com/dashboard) to verify:
- ✅ Account is active
- ✅ Credits/quota available
- ✅ No rate limiting active

---

## Related Documentation

- [API Reference](API_REFERENCE.md) — Tool input/output specification
- [Architecture](ARCHITECTURE.md) — System design
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues and fixes
- [BrowserStack Docs](https://www.browserstack.com/docs/screenshots/api) — Official API documentation
