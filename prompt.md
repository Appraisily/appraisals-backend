# Appraisals Backend Service - Project Structure

## Overview

Backend service for automating art appraisal reports using:
- Google Vision AI for image analysis
- OpenAI GPT-4 Vision for content generation
- Google Docs/Drive for PDF generation

## Project Structure

```
├── index.js                # Main application entry point
├── config.js              # Configuration management
├── routes/
│   ├── appraisal.js      # Appraisal endpoints
│   └── pdf.js            # PDF generation endpoints
├── services/
│   ├── metadata.js       # Metadata processing service
│   ├── openai.js         # OpenAI GPT-4 integration
│   ├── pdf.js           # PDF generation service
│   ├── vision.js         # Google Vision AI integration
│   └── wordpress.js      # WordPress API integration
└── prompts/              # GPT-4 prompts for different report sections
    ├── ad_copy.txt       # Marketing description
    ├── age1.txt          # Age analysis part 1
    ├── age2.txt          # Age analysis part 2
    ├── age_text.txt      # Age description
    ├── authorship.txt    # Authorship analysis
    ├── condition.txt     # Condition assessment
    ├── conclusion1.txt   # Report conclusion part 1
    ├── conclusion2.txt   # Report conclusion part 2
    ├── glossary.txt      # Art terms glossary
    ├── signature1.txt    # Signature analysis part 1
    ├── signature2.txt    # Signature analysis part 2
    ├── style.txt         # Style analysis
    ├── table.txt         # Artwork specifications
    ├── test.txt         # Initial artwork type analysis
    └── valuation_method.txt  # Valuation methodology
```

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

Process:
1. Retrieves post title and images from WordPress
2. Processes main image with Google Vision AI to find similar images
3. Generates metadata content using OpenAI GPT-4 Vision
4. Updates WordPress post with generated content

### POST /generate-pdf

Generates a PDF report from the appraisal data.

```json
Request:
{
  "postId": "string",      // WordPress post ID
  "session_ID": "string"   // Optional session ID for custom filename
}

Response:
{
  "success": boolean,
  "message": "string",
  "pdfLink": "string",     // Google Drive link to PDF
  "docLink": "string"      // Google Drive link to source Doc
}
```

Process:
1. Clones template from Google Docs
2. Replaces placeholders with content and images
3. Exports to PDF and uploads to Google Drive
4. Returns links to both PDF and source Doc

## Requirements

### Environment Variables

Required secrets in Google Cloud Secret Manager:
- `WORDPRESS_API_URL`: WordPress REST API endpoint
- `wp_username`: WordPress username
- `wp_app_password`: WordPress application password
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_VISION_CREDENTIALS`: Google Vision AI service account credentials
- `GOOGLE_DOCS_CREDENTIALS`: Google Docs API service account credentials

Additional environment variables:
- `GOOGLE_DOCS_TEMPLATE_ID`: ID of the template Google Doc
- `GOOGLE_DRIVE_FOLDER_ID`: ID of the Google Drive folder for PDFs

### WordPress Configuration

Required ACF fields:
- `main`: Main artwork image
- `age`: Age-related image
- `signature`: Signature image
- `googlevision`: Gallery field for similar images
- Various text fields for metadata (e.g., `age1`, `age2`, `style`, etc.)

### Image Requirements

Maximum dimensions (preserving aspect ratio):
- Main image: 400x300 pts
- Signature image: 200x150 pts
- Age image: 300x200 pts

### Content Generation

Each prompt file should:
1. Analyze provided images (main, age, signature)
2. Consider report title information
3. Generate specific content based on prompt type
4. Return well-structured, professional content

### Response Format

All generated content should be:
- Professional and formal in tone
- Well-structured and coherent
- Free of technical jargon unless necessary
- Focused on the specific aspect being analyzed

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