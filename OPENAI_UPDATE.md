# OpenAI Service Update Documentation

## Overview

The OpenAI service integration has been updated to use the latest OpenAI Node.js SDK (v4.97.0) and improve image handling to prevent timeout errors. This update focuses on:

1. Using the official OpenAI SDK with modern API patterns
2. Downloading and converting images to base64 before sending to OpenAI
3. Improving error handling and retry mechanisms
4. Streamlining message construction for the API
5. Enhanced debugging capabilities with detailed logging

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
- Fallback metadata in production environment to prevent complete failures

```javascript
if (error instanceof OpenAI.APIError) {
  console.error(`API error (${error.status}): ${error.message}`);
  console.error(`Request ID: ${error.request_id}`);
  // Handle specific error
}
```

### 5. Advanced Debugging & Logging (NEW)

- Added unique request IDs to track each API call through logs
- Detailed logging of request and response payloads to file system
- Improved error messages with specific validation errors
- Production fallback metadata when errors occur to prevent process failure
- Log directory for storing full request/response data for troubleshooting

```javascript
// Example of enhanced logging
const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
console.log(`[OpenAI Service][${requestId}] Processing request...`);

// Writing debug logs
await fs.writeFile(
  path.join(__dirname, '../logs', `openai_request_${requestId}.json`), 
  JSON.stringify(requestPayload, null, 2)
);
```

## Testing

Two test scripts are provided:

1. Basic functionality test: `test-openai.js`
   ```bash
   node test-openai.js
   ```

2. Enhanced debugging test: `test-openai-debug.js`
   ```bash
   # Normal test with detailed logging
   node test-openai-debug.js
   
   # Test with production fallback mode
   node test-openai-debug.js --production
   
   # Test error handling (requires additional setup)
   node test-openai-debug.js --test-errors
   ```

These scripts test:
1. Basic text generation with GPT-4o
2. Structured metadata generation with image analysis
3. Error handling with detailed logs
4. Fallback logic in production environments

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

1. **Examine Log Files**: Check the `/logs` directory for detailed request/response data
   - `openai_request_[request_id].json`: The request payload
   - `openai_response_[request_id].json`: The complete API response
   - `openai_invalid_json_[request_id].txt`: Invalid JSON responses for debugging

2. **Common Issues**:
   - **Invalid API Key**: Check your OpenAI API key in the environment/config
   - **Rate Limiting**: The service is configured to retry on rate limits, but persistent issues may require reducing concurrent requests
   - **Image Processing**: If image processing fails, the service will continue without the image
   - **Model Availability**: Ensure the selected model is available to your API key
   - **Invalid JSON**: If OpenAI returns invalid JSON, it will be logged for inspection

3. **Production Fallbacks**: In production, if an API error occurs, the service will return basic fallback metadata rather than failing completely. This ensures the appraisal process can continue even if metadata generation has issues. 