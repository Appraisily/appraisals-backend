# Appraisal Document Generation Process

This document explains the complete flow for generating appraisal documents using the Gemini AI API.

## Overview

The appraisal document generation system converts WordPress post data into professionally formatted documents using the following process:

1. Fetch data from WordPress
2. Process and prepare the data
3. Use Gemini AI to fill an MD template with the data
4. Convert the filled markdown to a Google Doc
5. Optionally export as PDF
6. Return document URLs to the client

## Required Components

### 1. API Endpoints
- `POST /api/gemini-docs/generate` - Takes a postId and generates a document
- `GET /api/gemini-docs/generate/:postId` - Same functionality with URL parameter

### 2. Services
- `gemini-docs.js` - Main service for Gemini document generation
- `pdf/documentGenerator.js` - Service for creating Google Docs and PDFs

### 3. Templates
- `src/templates/appraisal/master-template.md` - Markdown template with placeholders

## Detailed Process Flow

### 1. Client Request
The client sends a request to generate a document with a WordPress post ID, specifying the desired format (docs or pdf).

```
POST /api/gemini-docs/generate
{
  "postId": "123456",
  "format": "pdf",
  "test": false
}
```

### 2. Fetch WordPress Data
The system fetches all data related to the appraisal from WordPress:
- Post content
- Post title
- ACF custom fields
- Image URLs
- Metadata

### 3. Prepare Template
The system loads the master template markdown file which contains placeholders in the format `{{placeholder_name}}`.

### 4. Generate Prompt for Gemini
A prompt is constructed for Gemini AI with:
- The master template
- All WordPress data in structured format
- Instructions for filling the template

### 5. Process with Gemini AI
The prompt is sent to Gemini 2.5 Pro, which fills all placeholders in the template with relevant data from the WordPress post.

### 6. Create Google Doc
The filled markdown is converted to a Google Doc using the Google Docs API:
- Create a new Google Doc
- Insert the markdown content
- Format appropriately
- Store in a designated Google Drive folder

### 7. Export as PDF (Optional)
If PDF format is requested:
- Export the Google Doc as PDF
- Upload to Google Drive
- Make publicly accessible
- Get the PDF URL

### 8. Update WordPress
Update the WordPress post with:
- Google Doc URL
- PDF URL (if generated)

### 9. Return Response
Return a success response with:
- Document URL
- PDF URL (if generated)
- Status information

## Error Handling

### Fallback Mechanism
If Gemini document generation fails and PDF format was requested, the system falls back to the traditional PDF generation method.

### Error Reporting
All errors are logged with detailed information for troubleshooting.

## Usage Examples

### Generate Document with POST Request
```bash
curl -X POST "https://appraisals-backend-856401495068.us-central1.run.app/api/gemini-docs/generate" \
  -H "Content-Type: application/json" \
  -d '{"postId": "123456", "format": "pdf"}'
```

### Generate Document with GET Request
```bash
curl -X GET "https://appraisals-backend-856401495068.us-central1.run.app/api/gemini-docs/generate/123456?format=pdf"
```

## Testing

The document generation can be tested with:
```bash
npm run test-gemini-doc -- --post-id <id> --format pdf --output test.pdf
```

## Implementation Notes

### Template Structure
The template uses markdown format with standard placeholder syntax `{{placeholder_name}}`. The Gemini AI understands this format and replaces each placeholder with corresponding data.

### Gemini AI Configuration
The system uses Gemini 2.5 Pro for generating the filled template, configured with appropriate parameters for document generation tasks.

### Google Docs Integration
The document generation uses Google Docs API for creating and formatting documents, and Google Drive API for storage and sharing. 