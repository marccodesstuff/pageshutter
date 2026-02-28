# Development Guide

Guide for modifying and extending the Screenshot Capture Tool.

---

## Overview

This guide covers:
- Understanding the codebase
- Making common modifications
- Testing changes locally
- Following best practices
- Extending functionality

---

## Project Structure

```
src/
└── index.ts              # All tool code (types, helpers, tool definition)
```

The entire tool is in one file for simplicity. As it grows, you might split it:

```
src/
├── index.ts              # Tool definition and exports
├── types.ts              # Type definitions
├── browserstack.ts       # BrowserStack API client
├── helpers.ts            # Utility functions
└── tools/
    └── captureScreenshot.ts  # Tool implementation
```

---

## Understanding the Code

### 1. Imports & Setup

```typescript
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;
```

Initializes the Notion Worker and exports it for Notion's runtime.

### 2. Type Definitions

```typescript
type CaptureScreenshotInput = { url: string };

interface BrowserStackJobResponse {
  job_id: string;
}

interface BrowserStackScreenshot {
  image_url: string;
  state: string;
}

interface BrowserStackPollResponse {
  state: string;
  screenshots: BrowserStackScreenshot[];
}
```

Define all types at the top for type safety.

### 3. Helper Functions

```typescript
function getAuthHeaders(): HeadersInit { ... }
function sleep(ms: number): Promise<void> { ... }
```

Reusable utility functions for auth and async operations.

### 4. Tool Definition

```typescript
worker.tool<CaptureScreenshotInput, string>("captureScreenshot", {
  title: "Capture Screenshot",
  description: "...",
  schema: { ... },
  execute: async ({ url }) => { ... }
});
```

The tool definition: name, UI text, schema validation, and execution logic.

---

## Common Modifications

### Modify Tool Metadata

**Where:** Lines 51–60 in `src/index.ts`

```typescript
worker.tool<CaptureScreenshotInput, string>("captureScreenshot", {
  title: "Capture Screenshot",          // ← UI title
  description: "Takes a URL, captures...",  // ← UI description
  // ...
});
```

Change these to customize how the tool appears to users and agents.

### Modify Input Schema

**Where:** Lines 61–75 in `src/index.ts`

```typescript
schema: {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL of the website to capture a screenshot of.",
    },
  },
  required: ["url"],
  additionalProperties: false,
},
```

To add a new parameter (e.g., `width`):

```typescript
type CaptureScreenshotInput = { 
  url: string;
  width?: number;  // New optional parameter
};

schema: {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL of the website to capture a screenshot of.",
    },
    width: {
      type: "number",
      description: "Optional width in pixels (default: 1920)",
    },
  },
  required: ["url"],
  additionalProperties: false,
},
```

And update the execute function:

```typescript
execute: async ({ url, width = 1920 }) => {
  // Use width in your BrowserStack request
};
```

### Change Browser Configuration

**Where:** Lines 88–94 in `src/index.ts`

Current:
```typescript
browsers: [{
  os: "Windows",
  os_version: "11",
  browser: "chrome",
  browser_version": "latest",
}]
```

**To capture Safari on macOS:**
```typescript
browsers: [{
  os: "OS X",
  os_version: "Sequoia",
  browser: "safari",
  browser_version": "latest",
}]
```

**To capture multiple browsers (requires iterating results):**
```typescript
browsers: [
  {
    os: "Windows",
    os_version: "11",
    browser: "chrome",
    browser_version": "latest",
  },
  {
    os: "OS X",
    os_version: "Sequoia",
    browser: "safari",
    browser_version": "latest",
  }
]
```

Then parse `response.screenshots[0]` for the first one or loop through all.

### Adjust Polling Timeout

**Where:** Lines 106–107 in `src/index.ts`

```typescript
const POLL_INTERVAL_MS = 2000;  // 2 seconds
const MAX_ATTEMPTS = 60;         // 120 seconds total
```

**For faster timeout (60 seconds):**
```typescript
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30;  // 60 seconds total
```

**For slower timeout (300 seconds):**
```typescript
const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 60;  // 300 seconds total
```

### Add URL Validation

**Insert after line 77 (after `execute: async ({ url }) => {`):**

```typescript
// Validate URL format
try {
  const urlObj = new URL(url);
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }
} catch (error) {
  if (error instanceof TypeError) {
    throw new Error(`Invalid URL format: ${url}`);
  }
  throw error;
}
```

Now the tool will validate URLs before sending to BrowserStack.

---

## Testing Changes Locally

### 1. Make Your Changes

Edit `src/index.ts`.

### 2. Type-Check

```shell
npm run check
```

I find errors before building.

### 3. Build

```shell
npm run build
```

Compiles to `dist/index.js`.

### 4. Test Locally

Requires `.env` with credentials (see [Installation Guide](INSTALLATION.md#step-4-set-up-environment-variables-local-development)):

```shell
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

### 5. Check Output

**Success:**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/...
```

**Error:**
```
Screenshot capture failed: [error message]
```

### 6. View Logs

```shell
# Latest logs (usually what you just ran)
ntn workers runs list | head -5

# Get specific run logs
ntn workers runs logs <runId>
```

---

## Adding New Tools

The tool is a Notion Worker, so it can have **multiple tools**. Here's how to add another one:

### Example: Add a `captureScreenshotMobile` Tool

```typescript
type CaptureScreenshotMobileInput = { url: string };

worker.tool<CaptureScreenshotMobileInput, string>("captureScreenshotMobile", {
  title: "Capture Mobile Screenshot",
  description: "Capture a website in mobile view",
  schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to capture in mobile view",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
  execute: async ({ url }) => {
    try {
      const headers = getAuthHeaders();

      // Create job with mobile browser config
      const createResponse = await fetch("https://www.browserstack.com/screenshots", {
        method: "POST",
        headers,
        body: JSON.stringify({
          url,
          browsers: [{
            os: "Android",
            browser: "chrome",
            browser_version: "latest",
          }],
        }),
      });

      // ... rest of polling logic same as above
    } catch (error) {
      // ... error handling
    }
  },
});
```

Now agents have both `captureScreenshot` and `captureScreenshotMobile` available.

---

## Refactoring & Code Organization

### Current (Single File)

```typescript
// src/index.ts
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

// All types, helpers, and tools in one file
```

### Suggested (Multi-File)

```typescript
// src/types.ts
export type CaptureScreenshotInput = { url: string };
export interface BrowserStackJobResponse { ... }
export interface BrowserStackPollResponse { ... }

// src/helpers.ts
export function getAuthHeaders(): HeadersInit { ... }
export function sleep(ms: number): Promise<void> { ... }

// src/tools/captureScreenshot.ts
export function registerCaptureScreenshot(worker: Worker): void {
  worker.tool<CaptureScreenshotInput, string>("captureScreenshot", { ... });
}

// src/index.ts
import { Worker } from "@notionhq/workers";
import { registerCaptureScreenshot } from "./tools/captureScreenshot";

const worker = new Worker();
registerCaptureScreenshot(worker);
export default worker;
```

Benefits:
- ✅ Easier to navigate
- ✅ Reusable helpers across tools
- ✅ Better for team collaboration
- ❌ Slightly more build complexity

---

## Error Handling Best Practices

### Current Error Handling

```typescript
try {
  // ... execution code
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[captureScreenshot] Error: ${message}`);
  throw new Error(`Screenshot capture failed: ${message}`);
}
```

### Enhanced Error Handling with Types

```typescript
class BrowserStackError extends Error {
  constructor(public statusCode: number, public body: string) {
    super(`BrowserStack error (${statusCode}): ${body}`);
  }
}

try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new BrowserStackError(response.status, await response.text());
  }
} catch (error) {
  if (error instanceof BrowserStackError) {
    console.error(`[captureScreenshot] BrowserStack error: ${error.message}`);
    if (error.statusCode === 401) {
      throw new Error("Invalid BrowserStack credentials");
    }
  }
  throw error;
}
```

Benefits:
- ✅ More specific error handling
- ✅ Easier to debug
- ✅ Better error messages

---

## Logging Best Practices

### Current Logging

```typescript
console.log(`[captureScreenshot] Job created successfully. job_id: ${jobId}`);
console.error(`[captureScreenshot] Error: ${message}`);
```

### Enhanced Logging

Add timestamps and structured info:

```typescript
function log(level: 'info' | 'error', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[captureScreenshot] [${timestamp}] [${level.toUpperCase()}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Usage
log('info', 'Creating BrowserStack job', { url });
log('info', 'Job created successfully', { jobId });
log('error', 'BrowserStack error', { statusCode: 401, body: errorBody });
```

Benefits:
- ✅ Timestamps help debug timing issues
- ✅ Structured data easier to parse
- ✅ Consistent format across logs

---

## Performance Optimization

### Current Polling

```typescript
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[captureScreenshot] Polling attempt ${attempt}/${MAX_ATTEMPTS}...`);
  await sleep(POLL_INTERVAL_MS);
  // ... fetch and check state
}
```

### Exponential Backoff

For slower websites, poll less frequently over time:

```typescript
let pollInterval = POLL_INTERVAL_MS; // Start at 2 seconds

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[captureScreenshot] Polling attempt ${attempt}/${MAX_ATTEMPTS}...`);
  await sleep(pollInterval);
  
  const pollData = await pollResponse.json() as BrowserStackPollResponse;
  const state = pollData.state;
  
  if (state === "done") {
    // ... return success
  }
  
  // Increase interval: 2s → 3s → 4s → 5s (max)
  pollInterval = Math.min(pollInterval + 1000, 5000);
}
```

Benefits:
- ✅ Fewer wasted API calls for slow websites
- ✅ Faster response for quick websites
- ❌ Slightly more complex logic

---

## Testing Strategies

### Unit Tests (if adding a test framework later)

```typescript
// Example: tests/helpers.test.ts
import { sleep } from '../src/helpers';

describe('sleep', () => {
  it('should wait for the specified time', async () => {
    const start = Date.now();
    await sleep(1000);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });
});
```

### Integration Tests

```shell
# Test with real BrowserStack (requires credentials in .env)
ntn workers exec captureScreenshot --local -d '{"url": "https://github.com"}'
ntn workers exec captureScreenshot --local -d '{"url": "https://google.com"}'
ntn workers exec captureScreenshot --local -d '{"url": "https://invalid-url-xyz-404.com"}'
```

### Manual Testing Checklist

- ✅ Test with a fast website (GitHub)
- ✅ Test with a slow website (BBC, NYT)
- ✅ Test with invalid URL
- ✅ Test with unreachable URL
- ✅ Test with credentials missing
- ✅ Test with rate limit (if applicable)

---

## Deployment After Making Changes

### Workflow

1. Make changes to `src/index.ts`
2. Run `npm run check` — verify no errors
3. Run `npm run build` — compile TypeScript
4. Test locally: `ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'`
5. Deploy: `ntn workers deploy`

### Version Management

Edit `package.json` to bump version:

```json
{
  "version": "1.1.0"  // was 1.0.0
}
```

Common versioning:
- **1.0.0 → 1.0.1** — Bug fix
- **1.0.0 → 1.1.0** — New feature
- **1.0.0 → 2.0.0** — Breaking change

---

## Related Documentation

- [Architecture](ARCHITECTURE.md) — System design
- [API Reference](API_REFERENCE.md) — Tool specification
- [Installation Guide](INSTALLATION.md) — Setup environment
- [Deployment Guide](DEPLOYMENT.md) — Deploy changes
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
