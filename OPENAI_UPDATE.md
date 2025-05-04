# OpenAI Service Update Documentation

## Overview

The OpenAI service integration has been updated to use the latest OpenAI Node.js SDK (v4.97.0) and improve image handling to prevent timeout errors. This update focuses on:

1. Using the official OpenAI SDK with modern API patterns
2. Downloading and converting images to base64 before sending to OpenAI
3. Improving error handling and retry mechanisms
4. Streamlining message construction for the API

## Key Changes

### 1. OpenAI SDK Integration

- Updated from direct fetch API calls to the official OpenAI SDK
- Configured retries and timeout settings for better reliability
- Implemented proper error handling with the SDK's error classes

```javascript
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60000 // 60 seconds timeout
});
```

### 2. Image Handling

- Added `downloadImageAsBase64()` function to convert image URLs to base64
- Implemented pre-processing of all images before sending to OpenAI
- Images are now embedded directly in the requests rather than relying on OpenAI to fetch them

```javascript
// Example of downloading and encoding image
const base64Image = await downloadImageAsBase64(imageUrl);
```

### 3. API Request Formatting

- Updated message structure to match the latest OpenAI API format
- Improved content organization for multi-modal requests (text and images)
- Consolidated message preparation for better readability

```javascript
// Example of modern message formatting
messages.push({
  role: "user",
  content: [
    { type: "text", text: "Analyzing image:" },
    { type: "image_url", image_url: { url: base64ImageData } }
  ]
});
```

### 4. Error Handling

- Enhanced error detection with OpenAI.APIError instances
- Better logging of request IDs and status codes
- Structured error responses for easier debugging

```javascript
if (error instanceof OpenAI.APIError) {
  console.error(`API error (${error.status}): ${error.message}`);
  console.error(`Request ID: ${error.request_id}`);
  // Handle specific error
}
```

## Testing

A test script (`test-openai.js`) is provided to verify the functionality:

```bash
node test-openai.js
```

This script tests:
1. Basic text generation with GPT-4o
2. Structured metadata generation with image analysis
3. Error handling for various scenarios

## Dependencies

Make sure your `package.json` includes:

```json
"openai": "4.97.0"
```

## API Model Support

This implementation supports:
- GPT-4o (default for metadata generation)
- Any other OpenAI model accessible with your API key

## Troubleshooting

If you encounter errors:

1. **Invalid API Key**: Check your OpenAI API key in the environment/config
2. **Rate Limiting**: The service is configured to retry on rate limits, but persistent issues may require reducing concurrent requests
3. **Image Processing**: If image processing fails, the service will continue without the image
4. **Model Availability**: Ensure the selected model is available to your API key 