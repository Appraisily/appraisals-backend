# Appraisals Backend Service

Backend service for automating art appraisal reports using Google Vision AI and OpenAI GPT-4.

## Overview

This service automates the process of generating comprehensive art appraisal reports by:
1. Analyzing artwork images using Google Vision AI
2. Finding and storing similar images
3. Generating expert art descriptions using GPT-4
4. Managing PDF report generation

## API Endpoints

### POST /complete-appraisal-report

Generates metadata and analyzes images for an artwork appraisal.

```json
Request:
{
  "postId": "string" // WordPress post ID
}

Response:
{
  "success": boolean,
  "message": "string",
  "details": {
    "postId": "string",
    "title": "string",
    "visionAnalysis": {
      "success": boolean,
      "similarImagesCount": number,
      "uploadedImageIds": string[]
    },
    "processedFields": [
      {
        "field": "string",
        "status": "success" | "error",
        "error?": "string"
      }
    ]
  }
}
```

### POST /generate-pdf

Generates a PDF report from the appraisal data.

```json
Request:
{
  "postId": "string",
  "session_ID": "string"
}

Response:
{
  "success": boolean,
  "message": "string",
  "pdfLink": "string",
  "docLink": "string"
}
```

## Requirements

### Environment Variables

The following secrets must be configured in Google Cloud Secret Manager:

- `WORDPRESS_API_URL`: WordPress REST API endpoint
- `wp_username`: WordPress username
- `wp_app_password`: WordPress application password
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_VISION_CREDENTIALS`: Google Vision AI service account credentials
- `GOOGLE_DOCS_CREDENTIALS`: Google Docs API service account credentials

### WordPress Configuration

The WordPress site must have:

1. Custom post type: `appraisals`
2. ACF fields:
   - `main`: Main artwork image
   - `age`: Age-related image
   - `signature`: Signature image
   - `googlevision`: Gallery field for similar images
   - Various text fields for metadata (e.g., `age1`, `age2`, `style`, etc.)

### Image Requirements

- Main image: Max dimensions 400x300 pts
- Signature image: Max dimensions 200x150 pts
- Age image: Max dimensions 300x200 pts
- All images are automatically resized preserving aspect ratio

## Testing

Test the endpoints using curl:

```bash
# Test metadata generation
curl -X POST https://appraisals-backend-856401495068.us-central1.run.app/complete-appraisal-report \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID"}'

# Test PDF generation
curl -X POST https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID", "session_ID": "OPTIONAL_SESSION_ID"}'
```

## Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

The server runs on port 8080 by default or `PORT` environment variable if set.

## CORS Configuration

Allows requests from:
- `https://appraisers-frontend-856401495068.us-central1.run.app`
- `https://appraisers-task-queue-856401495068.us-central1.run.app`
- `https://appraisers-backend-856401495068.us-central1.run.app`