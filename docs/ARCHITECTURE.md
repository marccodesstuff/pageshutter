# Architecture

## Overview

The Screenshot Capture Tool is a **Notion Worker** — a specialized TypeScript application that runs in Notion's infrastructure and provides AI Agents with the ability to capture website screenshots.

This document describes the system design, component interactions, and data flow.

---

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Notion Workspace                            │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │   Notion Agent   │◄────────►│  This Worker     │            │
│  │  (AI Chat)       │   Tool   │ (captureScreenshot)          │
│  └──────────────────┘  Calls   └────────┬─────────┘            │
│                                         │                      │
│                                         │ HTTP API Calls       │
└─────────────────────────────────────────┼──────────────────────┘
                                          │
                    ┌─────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  BrowserStack API    │
         │  (Screenshots V2)     │
         │                      │
         │ • Create Job (POST)  │
         │ • Poll Job (GET)     │
         │ • Retrieve Image     │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Screenshot Image    │
         │  (Hosted on CDN)     │
         └──────────────────────┘
```

---

## Key Components

### 1. Notion Worker Instance

**File:** `src/index.ts`

The root of the application. Initializes the Notion Worker SDK and registers the `captureScreenshot` tool.

```typescript
const worker = new Worker();
export default worker;
```

**Responsibilities:**
- Export the worker as the default module
- Register the tool with the SDK
- Serve as the entry point for Notion's runtime

---

### 2. Tool Definition: `captureScreenshot`

**File:** `src/index.ts` (lines 51–155)

Defines the agent-callable tool with:

- **Title:** "Capture Screenshot"
- **Description:** Clear explanation for the agent
- **Schema:** JSON Schema requiring a single `url` string
- **Execute Function:** Async handler that orchestrates the screenshot process

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The URL of the website to capture a screenshot of."
    }
  },
  "required": ["url"],
  "additionalProperties": false
}
```

**Output:** String message with the public image URL or error description.

---

### 3. Authentication Helper

**Function:** `getAuthHeaders()`

Handles BrowserStack credential management:

- Reads `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` from environment
- Encodes credentials in Base64 format
- Constructs HTTP headers with Basic Authentication

```typescript
function getAuthHeaders(): HeadersInit {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  
  if (!username || !accessKey) {
    throw new Error("Missing BrowserStack credentials...");
  }
  
  const encoded = Buffer.from(`${username}:${accessKey}`).toString("base64");
  
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
```

---

### 4. Polling Helper

**Function:** `sleep(ms: number)`

Utility to pause execution between BrowserStack status checks.

```typescript
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

Used to implement exponential backoff without blocking other operations.

---

## Data Flow

### Step 1: Agent Invokes Tool

```
Notion Agent ──► TOOL CALL (JSON) ──► execute({ url: "..." })
```

The agent sends a tool invocation with the parsed `url` argument.

### Step 2: Authentication Check

```
execute() ──► getAuthHeaders() ──► Validates env variables
                                  ──► Returns auth headers
```

The execute function immediately validates that BrowserStack credentials are available.

**Possible Outcomes:**
- ✅ Credentials found → proceed to Step 3
- ❌ Missing credentials → throw error (Agent sees failure message)

### Step 3: Create Job

```
POST https://www.browserstack.com/screenshots
Headers: { Authorization: "Basic <base64>", "Content-Type": "application/json" }
Body: { url, browsers: [...] }
             ↓
Response: { job_id: "abc123" }
             ↓
```

BrowserStack receives the request and queues the screenshot job, returning a unique `job_id`.

**Possible Outcomes:**
- ✅ HTTP 2xx → Extract `job_id` → proceed to Step 4
- ❌ HTTP 4xx/5xx → Log error → throw error

### Step 4: Poll for Completion

```
Loop (max 60 attempts, every 2 seconds):
  ├─ GET https://www.browserstack.com/screenshots/<job_id>.json
  ├─ Check response.state
  ├─ If "pending" or "processing" → sleep 2s → retry
  ├─ If "done" → extract image_url → go to Step 5
  └─ If "error" or "timeout" → throw error
```

This loop continues until:
- **Success:** `state === "done"` → retrieve the `image_url`
- **Failure:** `state === "error"` or `state === "timeout"` → throw error
- **Timeout:** Exceeded 60 attempts (2 minutes) → throw error

### Step 5: Return Result

```
image_url ──► Format message ──► Return to Agent
             "Successfully captured screenshot. 
              You can view it here: https://..."
```

The public CDN-hosted image URL is formatted into a user-friendly message and returned to the Notion Agent.

---

## Error Handling Flow

```
try {
  getAuthHeaders() ──► [Error: missing creds] ──► catch → re-throw
           ↓
  fetch() ──► [Network error] ──► catch → re-throw
           ↓
  JSON parse ──► [Malformed response] ──► catch → re-throw
           ↓
  polling loop ──► [Job failed] ──► catch → re-throw
}
catch (error) {
  console.error(`[captureScreenshot] Error: ${message}`);
  throw new Error(`Screenshot capture failed: ${message}`);
}
```

All errors are:
1. Logged to console (visible in `ntn workers runs logs`)
2. Re-thrown as a new Error with context
3. Returned to the Agent as a failure message

---

## Type System

### Input Type
```typescript
type CaptureScreenshotInput = { url: string };
```

### BrowserStack Response Types

**Job Creation Response:**
```typescript
interface BrowserStackJobResponse {
  job_id: string;
}
```

**Screenshot Metadata:**
```typescript
interface BrowserStackScreenshot {
  image_url: string;
  state: string;
}
```

**Polling Response:**
```typescript
interface BrowserStackPollResponse {
  state: string;
  screenshots: BrowserStackScreenshot[];
}
```

The tool is fully typed (`worker.tool<CaptureScreenshotInput, string>(...)`), where `string` is the return type.

---

## Timing & Performance

| Operation | Duration | Notes |
|-----------|----------|-------|
| Credentials validation | < 10ms | Local operation |
| Create job (API call) | 100–500ms | Network + BrowserStack processing |
| Average polling time | 3–10 seconds | Depends on website complexity |
| Each poll (API call) | 100–200ms | Network + BrowserStack lookup |
| Max total time | ~2 minutes | Limited by 60-attempt loop |

**Total expected time for a typical website:** 4–15 seconds

---

## Security Considerations

### Credential Management

- **Storage:** BrowserStack credentials are stored in Notion's encrypted environment (not in code or `.env`)
- **Transmission:** Credentials are sent via Basic Auth over HTTPS (only to BrowserStack)
- **Logging:** Credentials are never logged; only `[captureScreenshot]` timestamp markers appear in logs

### URL Validation

- **Current:** Minimal; any string is forwarded to BrowserStack
- **Recommendation:** Add URL format validation (must be valid HTTP/HTTPS URL)
- **Future:** Could add URL allowlisting for sensitive environments

### Timeout Protection

- **Polling timeout:** 2 minutes (60 × 2 seconds)
- **Prevents:** Runaway requests consuming credits
- **User experience:** Agent is notified if job doesn't complete within 2 minutes

---

## Scalability & Limits

### Concurrency

- **Model:** Stateless tool execution
- **Scalability:** Notion's infrastructure manages concurrency; no shared state in this tool
- **Limit:** None enforced by this tool; limited by BrowserStack API rate limits and user's plan

### Storage

- **This tool:** No persistent storage
- **Screenshot images:** Hosted on BrowserStack's CDN (expire based on BrowserStack retention policy)
- **No database:** Workers are stateless

---

## Development & Deployment

### Build Process

```
TypeScript (src/index.ts)
         ↓
   tsc (TypeScript Compiler)
         ↓
JavaScript (dist/index.js)
         ↓
   ntn deploy
         ↓
Notion Infrastructure
```

### Runtime Environment

- **Node.js version:** 22.0.0+
- **Runtime:** Notion's managed Node.js runtime
- **Timezone:** UTC
- **Memory:** Managed by Notion; typically sufficient for HTTP I/O operations

---

## Related Documentation

- [API Reference](API_REFERENCE.md) — Tool input/output specification
- [BrowserStack Integration](BROWSERSTACK_API.md) — Detailed API documentation
- [Deployment Guide](DEPLOYMENT.md) — How to deploy to production
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues and solutions
