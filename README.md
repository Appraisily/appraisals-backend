# Appraisals Backend Service

Backend service for automating art appraisal reports using Google Vision AI and OpenAI GPT-4.

## Overview

This service automates the process of generating comprehensive art appraisal reports by:
1. Analyzing artwork images using Google Vision AI
2. Finding and storing similar images
3. Generating expert art descriptions using GPT-4
4. Managing PDF report generation

## Project Structure

```
├── index.js                # Main application entry point
├── config.js              # Configuration management
├── pdfGenerator.js        # PDF generation logic
├── services/
│   ├── vision.js         # Google Vision AI integration
│   ├── openai.js         # OpenAI GPT-4 integration
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
    └── valuation_method.txt  # Valuation methodology
```

## Required Secrets

The following secrets must be configured in Google Cloud Secret Manager:

- `WORDPRESS_API_URL`: WordPress REST API endpoint
- `wp_username`: WordPress username
- `wp_app_password`: WordPress application password
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_VISION_CREDENTIALS`: Google Vision AI service account credentials
- `GOOGLE_DOCS_CREDENTIALS`: Google Docs API service account credentials

## API Endpoints

### POST /complete-appraisal-report

Generates a complete appraisal report for an artwork.

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
        "error?: "string"
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

## Process Flow

1. **Image Analysis**:
   - Checks if gallery is already populated (`_gallery_populated` flag)
   - Analyzes main artwork image with Google Vision AI
   - Finds visually similar images
   - Uploads similar images to WordPress
   - Updates post's `GoogleVision` gallery field

2. **Content Generation**:
   - Processes each prompt file in `/prompts`
   - Sends images and prompts to GPT-4
   - Generates expert descriptions and analyses
   - Updates WordPress post with generated content

3. **PDF Generation**:
   - Creates Google Doc from template
   - Populates with generated content
   - Converts to PDF
   - Stores in Google Drive
   - Updates WordPress with document links

## Error Handling

- Implements retry mechanism (3 attempts) for content generation
- Logs detailed error information
- Continues processing remaining fields if one fails
- Returns comprehensive error details in response

## CORS Configuration

Allows requests from:
- `https://appraisers-frontend-856401495068.us-central1.run.app`
- `https://appraisers-task-queue-856401495068.us-central1.run.app`
- `https://appraisers-backend-856401495068.us-central1.run.app`

## Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

The server runs on port 8080 by default or `PORT` environment variable if set.