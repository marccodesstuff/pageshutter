import { Worker } from "@notionhq/workers";
import sharp from "sharp";

const worker = new Worker();
export default worker;

// --- Types ---

type CaptureScreenshotInput = { url: string };

type CropImageInput = {
	imageUrl: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

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

// --- Helpers ---

function getAuthHeaders(): HeadersInit {
	const username = process.env.BROWSERSTACK_USERNAME;
	const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

	if (!username || !accessKey) {
		throw new Error(
			"Missing BrowserStack credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables.",
		);
	}

	const encoded = Buffer.from(`${username}:${accessKey}`).toString("base64");

	return {
		Authorization: `Basic ${encoded}`,
		"Content-Type": "application/json",
		Accept: "application/json",
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Tool ---

worker.tool<CaptureScreenshotInput, string>("captureScreenshot", {
	title: "Capture Screenshot",
	description:
		"Takes a URL, captures a screenshot of the website using BrowserStack, and returns the public image URL.",
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
	execute: async ({ url }) => {
		try {
			const headers = getAuthHeaders();

			// Step 1: Create the screenshot job
			console.log(`[captureScreenshot] Creating BrowserStack job for URL: ${url}`);

			const createResponse = await fetch("https://www.browserstack.com/screenshots", {
				method: "POST",
				headers,
				body: JSON.stringify({
					url,
					browsers: [
						{
							os: "Windows",
							os_version: "11",
							browser: "chrome",
							browser_version: "latest",
						},
					],
				}),
			});

			if (!createResponse.ok) {
				const errorBody = await createResponse.text();
				throw new Error(
					`Failed to create BrowserStack job (HTTP ${createResponse.status}): ${errorBody}`,
				);
			}

			const jobData = (await createResponse.json()) as BrowserStackJobResponse;
			const jobId = jobData.job_id;
			console.log(`[captureScreenshot] Job created successfully. job_id: ${jobId}`);

			// Step 2: Poll for the result
			const POLL_INTERVAL_MS = 2000;
			const MAX_ATTEMPTS = 60; // 2 minutes max

			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
				console.log(`[captureScreenshot] Polling attempt ${attempt}/${MAX_ATTEMPTS}...`);

				await sleep(POLL_INTERVAL_MS);

				const pollResponse = await fetch(
					`https://www.browserstack.com/screenshots/${jobId}.json`,
					{ method: "GET", headers },
				);

				if (!pollResponse.ok) {
					const errorBody = await pollResponse.text();
					throw new Error(
						`Failed to poll BrowserStack job (HTTP ${pollResponse.status}): ${errorBody}`,
					);
				}

				const pollData = (await pollResponse.json()) as BrowserStackPollResponse;
				const state = pollData.state;
				console.log(`[captureScreenshot] Job state: ${state}`);

				if (state === "done") {
					const imageUrl = pollData.screenshots?.[0]?.image_url;

					if (!imageUrl) {
						throw new Error(
							"Job completed but no image_url found in the screenshots array.",
						);
					}

					console.log(`[captureScreenshot] Screenshot ready: ${imageUrl}`);
					return `Successfully captured screenshot. You can view it here: ${imageUrl}`;
				}

				if (state === "error" || state === "timeout") {
					throw new Error(`BrowserStack job failed with state: ${state}`);
				}

				// state is "pending" or "processing" — continue polling
			}

			throw new Error(
				`BrowserStack job did not complete within ${MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds.`,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[captureScreenshot] Error: ${message}`);
			throw new Error(`Screenshot capture failed: ${message}`);
		}
	},
});

// --- Crop Tool ---

worker.tool<CropImageInput, string>("cropImage", {
	title: "Crop Image",
	description:
		"Crops an image to the specified region by coordinates. Accepts an image URL and crop dimensions (x, y, width, height) to extract the desired portion of the image.",
	schema: {
		type: "object",
		properties: {
			imageUrl: {
				type: "string",
				description: "The URL of the image to crop.",
			},
			x: {
				type: "number",
				description: "The x-coordinate (left offset) in pixels where the crop region starts.",
			},
			y: {
				type: "number",
				description: "The y-coordinate (top offset) in pixels where the crop region starts.",
			},
			width: {
				type: "number",
				description: "The width in pixels of the crop region.",
			},
			height: {
				type: "number",
				description: "The height in pixels of the crop region.",
			},
		},
		required: ["imageUrl", "x", "y", "width", "height"],
		additionalProperties: false,
	},
	execute: async ({ imageUrl, x, y, width, height }) => {
		try {
			console.log(
				`[cropImage] Cropping image from URL. Region: x=${x}, y=${y}, width=${width}, height=${height}`,
			);

			// Fetch the image
			const imageResponse = await fetch(imageUrl);
			if (!imageResponse.ok) {
				throw new Error(`Failed to fetch image (HTTP ${imageResponse.status})`);
			}

			const imageBuffer = await imageResponse.arrayBuffer();
			console.log(`[cropImage] Image fetched successfully. Size: ${imageBuffer.byteLength} bytes`);

			// Crop the image using sharp
			const croppedBuffer = await sharp(Buffer.from(imageBuffer))
				.extract({
					left: Math.round(x),
					top: Math.round(y),
					width: Math.round(width),
					height: Math.round(height),
				})
				.toBuffer();

			// Convert to base64 data URL
			const base64Image = croppedBuffer.toString("base64");
			const dataUrl = `data:image/png;base64,${base64Image}`;

			console.log(`[cropImage] Image cropped successfully. Output size: ${croppedBuffer.byteLength} bytes`);
			return `Successfully cropped image. The cropped image (base64 encoded) is ready for use: ${dataUrl}`;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[cropImage] Error: ${message}`);
			throw new Error(`Image crop failed: ${message}`);
		}
	},
});
