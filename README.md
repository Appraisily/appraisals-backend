# Appraisals Backend

A specialized backend service for the APPRAISERS system that handles WordPress integration, OpenAI and Google Vision API interactions, PDF generation, and content analysis and enhancement for art appraisals.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Functionality](#core-functionality)
- [File Structure](#file-structure)
- [API Endpoints](#api-endpoints)
- [Classes and Functions](#classes-and-functions)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Dependencies](#dependencies)
- [Deployment](#deployment)
- [Development Setup](#development-setup)

## Overview

The Appraisals Backend is a Node.js Express application that provides specialized functionality for processing art appraisals, including:

- Integration with WordPress for content storage and retrieval
- Image analysis using Google Vision API
- Content enhancement via OpenAI and Google Gemini
- PDF report generation using Google Docs templates
- Visualization and statistics generation for appraisals
- Data processing and metadata management

## System Architecture

This service is part of the larger APPRAISERS system and primarily interacts with:

- WordPress CMS (for content storage)
- Google Cloud services (Secret Manager, Vision API, Docs/Drive)
- OpenAI API (for content enhancement)
- Google Gemini (for visualizations and advanced AI features)
- Valuer Agent service (for appraisal valuations)

## Core Functionality

### Report Generation
Handles the complete appraisal report generation process including image analysis, metadata processing, and statistics generation.

### PDF Generation
Creates professional PDF reports from appraisal data using Google Docs templates and the Google Drive API.

### Visualization Generation
Produces visual analytics and statistics for appraisals to support valuation justifications.

### Description Enhancement
Uses AI to enhance and improve appraisal descriptions.

### Content Processing
Processes images, extracts metadata, and enhances content quality.

## File Structure

```
appraisals-backend/
├── index.js                        # Entry point and server initialization
├── config.js                       # Configuration management and secrets
├── Dockerfile                      # Container configuration for Cloud Run
├── service.yaml                    # Cloud Run service configuration
├── package.json                    # Dependencies and scripts
├── ROUTE_MAPPING.md                # API route documentation
├── STATISTICS_REGENERATION_PROCESS.md # Documentation for statistics process
├── APPRAISAL_PROCESS_DIAGRAM.md    # Detailed process flow documentation
│
├── routes/                         # API route handlers
│   ├── description.js              # Description enhancement endpoints
│   ├── html.js                     # HTML generation endpoints
│   ├── pdf.js                      # PDF generation endpoints (step-based)
│   ├── pdf-legacy.js               # Legacy PDF generation endpoints
│   ├── report.js                   # Appraisal report generation endpoints
│   ├── utility.js                  # Utility endpoints
│   └── visualizations.js           # Visualization generation endpoints
│
├── services/                       # Business logic components
│   ├── constants/                  # Shared constants
│   ├── gemini-visualization.js     # Google Gemini integration for visualizations
│   ├── geminiService.js            # Google Gemini API service
│   ├── metadataProcessor.js        # Processes metadata for appraisals
│   ├── openai.js                   # OpenAI API service
│   ├── pdf/                        # PDF generation services
│   │   ├── index.js                # Main PDF service entry point
│   │   ├── documentGenerator.js    # Google Docs document generation
│   │   ├── pdfSteps.js             # Step-based PDF generation process
│   │   └── utils.js                # PDF utility functions
│   ├── regenerationService.js      # Statistics and visualization regeneration
│   ├── serper.js                   # Web search service
│   ├── utils/                      # Shared utility functions
│   │   ├── formatting.js           # Text and data formatting utilities
│   │   ├── imageProcessing.js      # Image processing helpers
│   │   └── validation.js           # Input validation utilities
│   ├── valuerAgentClient.js        # Client for valuer agent service
│   ├── vision.js                   # Google Vision API service
│   └── wordpress/                  # WordPress API integration
│       ├── index.js                # Main WordPress service
│       ├── mediaUtils.js           # Media handling utilities
│       └── postUtils.js            # Post management utilities
│
├── build-scripts/                  # Build automation scripts
├── bundles/                        # Frontend bundles/assets
├── static/                         # Static assets
├── templates/                      # HTML and report templates
│   ├── skeletons/                  # HTML skeleton templates
│   └── partials/                   # Reusable template components
├── css/                            # CSS stylesheets
└── prompts/                        # AI prompt templates
```

## API Endpoints

### Report Endpoints (`/` and `/api/report/`)
- `POST /complete-appraisal-report` - Generates a complete appraisal report
  - Parameters: `postId` (string/number), `justificationOnly` (boolean, optional)
  - Processes a WordPress post to generate a complete appraisal report with Google Vision analysis, metadata processing, and statistics generation

### Visualization Endpoints (`/api/visualizations/`)
- `POST /api/visualizations/generate-visualizations` - Generates visualizations for an appraisal
  - Parameters: `postId` (string/number), `value` (number)
  - Generates enhanced analytics and appraisal card visualizations using Gemini
- `POST /api/visualizations/regenerate-statistics-and-visualizations` - Regenerates statistics and visualizations
  - Parameters: `postId` (string/number), `value` (number)
  - Fetches new statistics from the Valuer Agent and regenerates visualizations
- `GET /api/visualizations/debug` - Visualization debugging endpoint
  - Interactive debugging interface for visualization generation
- `POST /api/visualizations/fix-statistics` - Fixes malformed statistics data
  - Parameters: `postId` (string/number)
  - Repairs malformed statistics data in the WordPress post

### Description Endpoints (`/api/description/`)
- `POST /api/description/enhance-description` - Enhances appraisal descriptions using AI
  - Parameters: `postId` (string/number), `description` (string)
  - Uses OpenAI to enhance the appraisal description with additional details

### PDF Endpoints (`/api/pdf/` and `/api/pdf-legacy/`)
- `POST /api/pdf/generate-pdf-steps` - Generates PDF using step-based approach
  - Parameters: `postId` (string/number), `startStep` (string, optional)
  - Generates a PDF report using a step-by-step process with Google Docs
- `GET /api/pdf/steps` - Gets PDF generation steps
  - Returns the available steps in the PDF generation process
- `POST /api/pdf-legacy/generate-pdf` - Legacy PDF generation endpoint
  - Parameters: `postId` (string/number)
  - Original PDF generation implementation (maintained for backward compatibility)

### HTML Endpoints (`/api/html/`)
- `POST /api/html/generate` - Generates HTML for a specific visualization type
  - Parameters: `postId` (string/number), `type` (string)
  - Generates HTML content for the specified visualization type
- `POST /api/html/process-statistics` - Processes statistics data and adds generated HTML
  - Parameters: `postId` (string/number), `statistics` (object)
  - Processes statistics data and updates the WordPress post with generated HTML

### Utility Endpoints (`/api/utility/`)
- `POST /api/utility/decode-html-entities` - Decodes HTML entities in text
  - Parameters: `content` (string)
  - Decodes HTML entities in the provided content
- `GET /api/utility/health` - Health check endpoint
  - Returns the service status and version

## Classes and Functions

### Main Application (`index.js`)
- `startServer()` - Initializes and starts the Express server
- `loadSecrets()` - Loads secrets from Google Secret Manager
- `getSecret(secretName)` - Fetches a specific secret from Secret Manager

### Configuration (`config.js`)
- Configuration object with environment variables and settings
- `getSecret(secretName)` - Fetches a secret from Secret Manager
- `initSecrets()` - Initializes all required secrets for the application

### WordPress Service (`services/wordpress/index.js`)
- `fetchPostData(postId)` - Fetches post data from WordPress
- `updatePost(postId, data)` - Updates a WordPress post
- `updatePostMeta(postId, metaKey, metaValue)` - Updates post metadata
- `uploadMedia(buffer, filename)` - Uploads media to WordPress

### Google Vision Service (`services/vision.js`)
- `initializeVisionClient()` - Initializes the Google Vision client
- `processMainImageWithGoogleVision(postId)` - Processes an image with Google Vision
- `analyzeSimilarImages(imageUrl)` - Finds similar images using Vision API
- `detectLabels(imageUrl)` - Detects objects and labels in an image
- `detectTextInImage(imageUrl)` - Extracts text from an image

### Metadata Processor (`services/metadataProcessor.js`)
- `processAllMetadata(postId, postTitle, data)` - Processes all metadata fields
- `processJustificationMetadata(postId, postTitle, value)` - Processes justification metadata
- `processProvenanceField(postId, provenanceText)` - Enhances provenance information
- `processMediumField(postId, mediumText)` - Enhances medium description
- `processConditionField(postId, conditionText)` - Enhances condition information

### PDF Generation Service (`services/pdf/index.js`)
- `initializeGoogleApis()` - Initializes Google APIs for PDF generation
- `generatePDFReport(postId)` - Generates a PDF report
- `generateDocFromTemplate(templateId, replacements)` - Creates a Google Doc from template
- `convertToPDF(docId)` - Converts a Google Doc to PDF
- `downloadFile(fileId)` - Downloads a file from Google Drive

### OpenAI Service (`services/openai.js`)
- `enhanceDescription(prompt, description)` - Enhances a description using OpenAI
- `generateCompletion(prompt, maxTokens)` - Generates text completion

### Gemini Service (`services/geminiService.js` and `services/gemini-visualization.js`)
- `initializeGeminiClient()` - Initializes the Gemini client
- `generateContent(prompt)` - Generates content using Gemini
- `generateVisualization(statistics, type)` - Generates visualizations
- `enhanceVisualizationWithImages(html, imageUrls)` - Enhances visualizations with images

### Regeneration Service (`services/regenerationService.js`)
- `regenerateStatisticsAndVisualizations(postId, value)` - Regenerates statistics and visualizations
- `fetchStatisticsFromValuerAgent(value)` - Fetches statistics from the Valuer Agent
- `updateWordpressWithStatistics(postId, statistics)` - Updates WordPress with new statistics

### Valuer Agent Client (`services/valuerAgentClient.js`)
- `getStatistics(value)` - Gets statistics for a specific value
- `getMarketTrends(category)` - Gets market trends for a category
- `getConfidenceLevel(value, data)` - Gets confidence level for a valuation

## Environment Variables and Secrets

The application uses Google Cloud Secret Manager for secure credential storage in production and environment variables for local development.

### Required Secrets (in Secret Manager)
- `wp_username` - WordPress API username
- `wp_app_password` - WordPress API application password
- `WORDPRESS_API_URL` - WordPress API URL
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_VISION_CREDENTIALS` - Google Vision API credentials (JSON)
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_DOCS_CREDENTIALS` - Google Docs API credentials (JSON)
- `SERPER_API` - Optional Serper API key for web search

### Environment Variables
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment mode (development/production)
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `SKIP_SECRET_MANAGER` - Set to 'true' to use env vars directly (for local dev)
- `GOOGLE_DOCS_TEMPLATE_ID` - ID of the Google Docs template
- `GOOGLE_DRIVE_FOLDER_ID` - ID of the Google Drive folder for PDF storage
- `VALUER_AGENT_API_URL` - URL of the Valuer Agent service

## Dependencies

Main dependencies include:

```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^3.0.0",
    "@google-cloud/vision": "^4.0.0",
    "@google/generative-ai": "^0.24.0",
    "cors": "^2.8.5",
    "date-fns": "^2.29.3",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "form-data": "^4.0.0",
    "googleapis": "^105.0.0",
    "handlebars": "^4.7.7",
    "he": "^1.2.0",
    "image-size": "^1.0.2",
    "node-fetch": "^2.6.7",
    "request-ip": "^3.3.0",
    "uuid": "^9.0.0"
  }
}
```

## Deployment

The service is deployed as a containerized application on Google Cloud Run using the included Dockerfile and service.yaml configuration.

### Dockerfile
```dockerfile
# Use Node.js LTS version
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies with production-only flag
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Create a non-root user for security
RUN groupadd -r appuser && \
    useradd -r -g appuser -d /usr/src/app appuser && \
    chown -R appuser:appuser /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8080

# Command to run the app
CMD [ "npm", "start" ]
```

### Cloud Run Configuration (`service.yaml`)
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: appraisals-backend
  namespace: civil-forge-403609
spec:
  template:
    spec:
      containers:
        - image: gcr.io/civil-forge-403609/appraisals-backend
          ports:
            - containerPort: 8080
          env:
            - name: GOOGLE_CLOUD_PROJECT_ID
              value: civil-forge-403609
            - name: CORS_ALLOWED_ORIGINS
              value: "https://appraisily.com,https://app.appraisily.com,https://dev.appraisily.com"
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
            requests:
              cpu: "1"
              memory: "1Gi"
          serviceAccountName: appraisals-backend-sa
```

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required environment variables:
   ```
   SKIP_SECRET_MANAGER=true
   WORDPRESS_API_URL=https://your-wordpress-site.com/wp-json
   wp_username=your_wordpress_username
   wp_app_password=your_wordpress_app_password
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Routes Documentation

For detailed route mapping information, refer to [ROUTE_MAPPING.md](./ROUTE_MAPPING.md).

## Statistics Regeneration Process

For details on how statistics regeneration works, refer to [STATISTICS_REGENERATION_PROCESS.md](./STATISTICS_REGENERATION_PROCESS.md).

## Appraisal Process Diagram

For a complete visual representation of the appraisal process, refer to [APPRAISAL_PROCESS_DIAGRAM.md](./APPRAISAL_PROCESS_DIAGRAM.md).