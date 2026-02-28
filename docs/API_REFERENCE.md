# API Reference

Complete technical specification for the `captureScreenshot` tool.

---

## Tool Definition

### Tool Name

```
captureScreenshot
```

### Title

```
Capture Screenshot
```

Used in Notion UI and agent descriptions.

### Description

```
Takes a URL, captures a screenshot of the website using BrowserStack, 
and returns the public image URL.
```

---

## Input Schema

The tool accepts a single input object with the following structure:

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

### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `url` | `string` | **Yes** | A valid HTTP or HTTPS URL to capture | `"https://example.com"` |

### Input Examples

#### Example 1: Simple Website

```json
{
  "url": "https://github.com"
}
```

**Response (Success):**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/...
```

#### Example 2: Website with Path

```json
{
  "url": "https://www.notion.so/docs/guides/working-with-databases"
}
```

**Response (Success):**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/...
```

#### Example 3: Website with Query Parameters

```json
{
  "url": "https://www.google.com/search?q=notion+workers"
}
```

**Response (Success):**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/...
```

---

## Output Schema

The tool returns a **string** response.

### Success Response Format

```
Successfully captured screenshot. You can view it here: <image_url>
```

Where `<image_url>` is a public HTTPS URL hosted on BrowserStack's CDN.

**Example:**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/ab1234cd5678/screenshot.jpg
```

The image URL is:
- **Public:** No authentication required to view
- **Direct:** Can be clicked immediately in Notion
- **Persistent:** Hosted on BrowserStack's CDN (retention depends on your BrowserStack plan)

### Error Response Format

Errors are thrown as Error objects with descriptive messages. The agent receives them as failure notifications.

**Possible Error Messages:**

| Error Message | Cause | Resolution |
|---------------|-------|-----------|
| `"Missing BrowserStack credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables."` | Environment variables not configured | Run `ntn workers env set` before deploying |
| `"Failed to create BrowserStack job (HTTP 401): ..."` | Invalid BrowserStack credentials | Verify username and access key at [browserstack.com/accounts/settings](https://www.browserstack.com/accounts/settings) |
| `"Failed to create BrowserStack job (HTTP 400): ..."` | Malformed request (invalid URL format) | Ensure URL is a valid HTTP/HTTPS URL |
| `"Failed to poll BrowserStack job (HTTP 401): ..."` | Credentials invalid during polling | Likely auth token expired; re-deploy |
| `"BrowserStack job failed with state: error"` | BrowserStack failed to render the page | Website may be inaccessible; try a different URL |
| `"BrowserStack job failed with state: timeout"` | BrowserStack job exceeded internal timeout | Website took too long to load; try a simpler URL |
| `"BrowserStack job did not complete within 120 seconds."` | Polling loop timed out (60 attempts × 2 seconds) | Website is very slow; try again or try a different URL |
| `"Screenshot capture failed: [original error]"` | Catch-all for unexpected errors | Check logs with `ntn workers runs logs` |

---

## TypeScript Type Definitions

### Input Type

```typescript
type CaptureScreenshotInput = { url: string };
```

### Return Type

```typescript
type CaptureScreenshotOutput = string;
```

### Tool Generic Type

```typescript
worker.tool<CaptureScreenshotInput, string>("captureScreenshot", { ... })
```

---

## Browser & Environment Specifications

The tool always captures screenshots in the same environment:

| Specification | Value |
|---|---|
| **Operating System** | Windows 11 |
| **Browser** | Google Chrome (latest version) |
| **Browser Version** | Latest available on BrowserStack |
| **Resolution** | BrowserStack default (typically 1920×1080) |
| **User Agent** | Chrome on Windows 11 (standard) |
| **Viewport** | Desktop (not mobile) |
| **Cookies & Session** | None (fresh session each time) |

**Note:** These settings are hardcoded in the tool. To capture different browsers, OS, or mobile devices, modify the `browsers` array in `src/index.ts`.

---

## Execution Flow

### Call Flow Diagram

```
Agent Call
    ↓
[1] Parse input { url: "..." }
    ↓
[2] Validate credentials (getAuthHeaders)
    ├─ If missing → throw error → return to Agent
    ├─ If present → continue
    ↓
[3] POST to BrowserStack Create Job endpoint
    ├─ If HTTP error → throw error → return to Agent
    ├─ If success → extract job_id → continue
    ↓
[4] Poll GET BrowserStack Job Status (up to 60 times, 2-second intervals)
    ├─ If state == "done" → extract image_url → go to [5]
    ├─ If state == "error" or "timeout" → throw error → return to Agent
    ├─ If state == "pending" or "processing" → wait 2 seconds → retry
    ├─ If max attempts exceeded → throw error → return to Agent
    ↓
[5] Return success message with public image_url
    ↓
Agent receives response
```

---

## Performance Characteristics

### Typical Timing

| Phase | Time | Notes |
|-------|------|-------|
| Credential validation | 1–5 ms | Local operation |
| Create job API call | 100–500 ms | Network latency + BrowserStack |
| Waiting for job (polling) | 3–10 seconds | Depends on website load time |
| Total | 3–15 seconds | Typical website |

### Slow Website Example

For a website that takes 8 seconds to load:
- Create job: ~200ms
- Polling loops: 8 × (200ms API call + 2s wait) ≈ 18 seconds
- **Total: ~18 seconds**

### Timeout Example

- Max attempts: 60
- Interval: 2 seconds
- Maximum possible time: 120 seconds (2 minutes)
- If a job doesn't complete by then, it times out

---

## Rate Limits & Quotas

This tool does **not** enforce rate limits; instead, it respects BrowserStack's API limits:

### BrowserStack API Limits

Varies by plan. Common limits:

| Plan | Concurrent Screenshots | API Calls/Day | Monthly Limit |
|---|---|---|---|
| Free | 1 | Limited | Limited |
| Pro | 5 | 1,000+ | Varies |
| Enterprise | Custom | Custom | Custom |

Check your [BrowserStack account](https://www.browserstack.com/accounts/billing) for your specific limits.

### This Tool's Overhead

Per screenshot:
- **API calls:** 2 (create job + first successful poll; additional calls if retrying)
- **Typical:** 3–10 API calls due to polling (2 calls + up to 8 polls for a slow website)

---

## Logging & Observability

All execution steps are logged with timestamps and context.

### Log Format

```
[captureScreenshot] <operation>: <detail>
```

### Example Log Output

```
[captureScreenshot] Creating BrowserStack job for URL: https://example.com
[captureScreenshot] Job created successfully. job_id: ab1234cd5678ef90
[captureScreenshot] Polling attempt 1/60...
[captureScreenshot] Job state: processing
[captureScreenshot] Polling attempt 2/60...
[captureScreenshot] Job state: done
[captureScreenshot] Screenshot ready: https://cdn.browserstack.com/screenshots/...
```

### Viewing Logs

```shell
# Get logs for the latest run
ntn workers runs list --plain | head -n1 | cut -f1 | xargs -I{} ntn workers runs logs {}

# Or get logs for a specific run ID
ntn workers runs logs <runId>
```

---

## Error Handling

All errors are caught and re-thrown with context:

```typescript
try {
  // ... execution code ...
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[captureScreenshot] Error: ${message}`);
  throw new Error(`Screenshot capture failed: ${message}`);
}
```

**Result:** Agent receives a detailed error message describing what went wrong.

---

## Backward Compatibility

### Current Version

- **Tool Name:** `captureScreenshot`
- **Input:** `{ url: string }`
- **Output:** `string`

### Future Changes

If breaking changes are introduced (e.g., new required parameters), the major version will be bumped in `package.json`.

---

## Related Documentation

- [Architecture](ARCHITECTURE.md) — System design and data flow
- [BrowserStack Integration](BROWSERSTACK_API.md) — API details
- [Development Guide](DEVELOPMENT.md) — Extending the tool
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
