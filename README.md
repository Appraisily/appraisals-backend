# Appraisals Backend Service

Backend service for automating art appraisal reports using Google Vision AI, OpenAI GPT-4 Vision, and Google Docs/Drive.

## Overview

This service automates the process of generating comprehensive art appraisal reports by:
1. Analyzing artwork images using Google Vision AI
2. Finding and storing similar images
3. Generating expert art descriptions using GPT-4 Vision
4. Managing PDF report generation

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

## PDF Generation Steps

The `/generate-pdf` endpoint follows these specific steps:

1. Initialize Google APIs
   - Sets up authentication and clients for Google Docs and Drive

2. Validate Environment Variables
   - Checks for required template ID and folder ID
   - Validates configuration settings

3. Retrieve Metadata Fields
   - Fetches all required metadata fields:
     ```javascript
     [
       'test', 'ad_copy', 'age_text', 'age1', 'condition',
       'signature1', 'signature2', 'style', 'valuation_method',
       'conclusion1', 'conclusion2', 'authorship', 'table',
       'glossary', 'value'
     ]
     ```
   - Formats numeric values (e.g., appraisal value in USD)

4. Fetch Post Information
   - Gets post title and publication date
   - Retrieves URLs for age, signature, and main images

5. Get Gallery Images
   - Fetches all similar images found by Vision AI

6. Clone Template Document
   - Creates a copy of the template in Google Docs
   - Generates unique document ID and link

7. Move Document to Designated Folder
   - Transfers the cloned document to the specified Drive folder

8. Replace Content Placeholders
   - Updates all metadata placeholders with actual content
   - Maintains formatting and structure

9. Adjust Title Font Size
   - Dynamically sizes title based on length:
     - ≤20 chars: 18pt
     - ≤40 chars: 16pt
     - >40 chars: 14pt

10. Insert Table Metadata
    - Formats and inserts structured data
    - Maintains table formatting and alignment

11. Add Gallery Images
    - Creates image grid layout
    - Prepares placeholders for similar images

12. Replace Gallery Placeholders
    - Inserts all similar images found by Vision AI
    - Maintains consistent spacing and layout

13. Insert Specific Images
    - Places age, signature, and main images
    - Resizes images while preserving aspect ratio:
      - Main image: max 400x300 pts
      - Signature: max 200x150 pts
      - Age image: max 300x200 pts

14. Export to PDF
    - Converts Google Doc to PDF format
    - Maintains all formatting and images

15. Generate Filename
    - Uses session_ID if provided
    - Creates unique filename with UUID otherwise

16. Upload PDF
    - Saves PDF to specified Drive folder
    - Generates shareable link

17. Update WordPress
    - Stores PDF and Doc links in ACF fields
    - Updates post metadata

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

### Dependencies

```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^3.0.0",
    "@google-cloud/vision": "^4.0.0",
    "cors": "^2.8.5",
    "date-fns": "^2.29.3",
    "express": "^4.18.2",
    "form-data": "^4.0.0",
    "googleapis": "^105.0.0",
    "handlebars": "^4.7.7",
    "he": "^1.2.0",
    "node-fetch": "^2.6.7",
    "uuid": "^9.0.0"
  }
}
```

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

## Error Handling

The service implements comprehensive error handling:
- Retries for content generation (3 attempts)
- Detailed error logging
- Graceful fallbacks for missing images
- Validation of all input parameters
- Proper HTTP status codes for different error types

## Security

- All API endpoints require proper authentication
- Secrets are managed through Google Cloud Secret Manager
- CORS restrictions limit access to approved domains
- Input validation prevents injection attacks
- File access is restricted to authorized users

## Deployment

The service is deployed on Google Cloud Run:
- Automatic scaling based on load
- HTTPS encryption
- Container-based deployment
- Environment variable management
- Logging and monitoring included

### Processing Steps for /complete-appraisal-report

The endpoint follows these steps when processing a request:

1. Input Validation
   - Verifies postId is provided in request body
   - Returns 400 error if postId is missing

2. Fetch Post Data
   - Retrieves post data from WordPress in a single request
   - Gets title, ACF fields, and images
   - Returns 404 if post not found or title missing

3. Google Vision Analysis
   - Checks if gallery is already populated
   - If not populated:
     - Retrieves main image URL
     - Analyzes image with Vision API
     - Finds visually similar images
     - Uploads similar images to WordPress media library
     - Updates post's gallery field with new image IDs

4. Metadata Processing
   - Processes each metadata field in order:
     ```javascript
     [
       'test', 'age1', 'age2', 'age_text', 'authorship',
       'condition', 'signature1', 'signature2', 'style',
       'valuation_method', 'conclusion1', 'conclusion2',
       'ad_copy', 'table', 'glossary'
     ]
     ```
   - For each field:
     - Loads appropriate prompt template
     - Generates content using OpenAI GPT-4
     - Updates WordPress post with generated content
     - Updates static metadata based on appraisal type:
       - Introduction text
       - Image analysis description
       - Signature analysis details
       - Valuation method explanation
       - Appraiser information
       - Liability and conflict statements
       - Selling guide information
     - Tracks success/failure status

5. Response Generation
   - Returns JSON response with:
     - Success status
     - Post ID and title
     - Vision analysis results
     - Processed fields status
   - Includes error details if any step fails

### POST /generate-pdf

Generates a PDF report from the appraisal data.