# Appraisals Backend Service

A scalable, serverless API service built with Node.js that automates the generation of professional art appraisal reports by analyzing artwork images, fetching market data, generating AI-driven content, and providing data for rich visualizations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [HTML Skeleton Files Usage](#html-skeleton-files-usage)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Code Organization](#code-organization)

## Overview

- **Purpose:** Automates the creation of comprehensive art appraisal reports by fetching post data, analyzing images, generating metadata and justifications using AI (OpenAI/Gemini), retrieving market statistics, and preparing data/HTML for frontend display.
- **Scope:** Handles data fetching from WordPress, image analysis, AI content generation, market data retrieval (via valuer-agent), statistics calculation, justification generation, and HTML template population for visualizations.
- **Tech Stack:**
  - Node.js / Express.js
  - Google Cloud Run (or similar serverless environment)
  - Google Vision AI
  - OpenAI API (GPT-4 / GPT-4o)
  - Google Gemini API (Gemini Pro)
  - Custom "Valuer Agent" Service (External)
  - Serper API (Optional web search)
  - Google Docs/Drive APIs (for PDF generation, handled by separate endpoints)
  - WordPress REST API
  - Google Secret Manager

## Features

- WordPress Integration: Fetches appraisal data, updates metadata and ACF fields.
- Automated Image Analysis: Google Vision AI for finding visually similar images.
- AI Content Generation: Uses OpenAI (GPT-4o) for generating descriptive metadata fields (e.g., description, condition analysis, artist bio).
- Market Analysis & Statistics: Interacts with a custom "Valuer Agent" service to get comparable sales data, market statistics, and initial justifications.
- Justification Generation: Combines Valuer Agent output, web search results (optional), and OpenAI to generate detailed valuation justifications.
- HTML Visualization Generation (via Gemini): Populates skeleton HTML templates with dynamic data using the Gemini API to generate embeddable HTML components.
- PDF Report Generation: Dedicated endpoints handle generating PDF reports from Google Docs templates (details in `./routes/pdf.js` and `./routes/pdf-steps.js`).
- Secure Credential Handling via Google Secret Manager.
- Modular & Refactored Structure: Services are broken down by concern (WordPress, Vision, OpenAI, Gemini, Serper, ValuerAgent, Metadata Processing, etc.).
- Improved Error Handling: Provides usage instructions for bad requests (400) and detailed errors in non-production environments (500).

## Architecture

### Core Components & Services

- **API Layer:** Express.js REST API, structured into modular route files (`routes/`).
- **Configuration:** `config.js` loading secrets/variables from environment/Secret Manager.
- **WordPress Service (`services/wordpress/`):** Handles all communication with the WordPress REST API (fetching posts, updating ACF/meta, uploading media).
- **Vision Service (`services/vision.js`):** Interfaces with Google Vision AI for image analysis.
- **OpenAI Service (`services/openai.js`):** Handles content generation calls to OpenAI API.
- **Gemini Service (`services/geminiService.js`):** Populates HTML templates using the Gemini API.
- **Serper Service (`services/serper.js`):** (Optional) Performs web searches via Serper API to provide context.
- **Valuer Agent Client (`services/valuerAgentClient.js`):** Interacts with the external Valuer Agent service for statistics and justification data.
- **Metadata Processor (`services/metadataProcessor.js`):** Orchestrates the generation of metadata fields (using OpenAI, Serper) and justification content (using Valuer Agent, OpenAI, Serper). Includes helper functions for data validation and manipulation.
- **Template Utilities (`services/utils/templateContextUtils.js`):** Prepares data context objects needed by the Gemini service to populate HTML skeletons.
- **HTML Skeletons (`templates/skeletons/`):** Bare HTML structure files with `{{PLACEHOLDERS}}` for visualizations.
- **PDF Services (`services/pdf/`):** Logic related to Google Docs/Drive API for PDF generation.

### Workflow Example: Regenerate Statistics & Visualizations

1.  **Request:** `POST /regenerate-statistics-and-visualizations` with `postId`.
2.  **Route (`routes/visualization.js`):** Validates input.
3.  **WordPress Service:** Fetches post data (`fetchPostData`).
4.  **Valuer Agent Client:** Calls external `/api/enhanced-statistics` to get fresh stats.
5.  **Metadata Processor:** Validates the received statistics (`validateStatisticsData`).
6.  **Template Utilities:** Prepares data contexts for HTML templates (`prepareDataContext...`).
7.  **File System:** Reads skeleton HTML files (`fs.readFile`).
8.  **Gemini Service:** Populates both HTML skeletons using data contexts (`populateHtmlTemplate`).
9.  **WordPress Service:** Saves updated statistics and the two populated HTML strings to ACF fields (`updateWordPressMetadata`). Updates post meta history (`updatePostMeta`).
10. **Route:** Returns success response.

## Project Structure

```
/appraisals-backend
├── routes/                 # Express route handlers
│   ├── report.js           # Handles /complete-appraisal-report
│   ├── visualization.js    # Handles /generate-visualizations, /regenerate-...
│   ├── description.js      # Handles /enhance-description
│   ├── utility.js          # Handles /update-wordpress
│   ├── pdf.js              # PDF generation routes
│   ├── pdf-steps.js        # Step-by-step PDF generation routes
│   └── html.js             # Deprecated? (Legacy HTML routes?)
├── services/
│   ├── wordpress/          # WordPress interaction logic
│   │   ├── index.js        # Main WP service exporter
│   │   ├── client.js       # Basic WP API client setup
│   │   ├── dataFetching.js # Functions for getting WP data
│   │   ├── updates.js      # Functions for updating WP data (ACF, Meta)
│   │   ├── htmlUpdates.js  # Functions specific to HTML field updates
│   │   └── utils/          # WP specific utilities
│   ├── pdf/                # PDF generation logic (Google Docs/Drive)
│   ├── utils/              # General utility functions
│   │   ├── jsonCleaner.js  # Utility for cleaning/parsing JSON
│   │   ├── promptUtils.js  # Utilities for building AI prompts
│   │   └── templateContextUtils.js # Prepares data for Gemini templating
│   ├── constants/          # Constant values (e.g., report structure)
│   ├── metadataProcessor.js # Core logic for metadata/justification generation
│   ├── metadata.js         # Thin layer, re-exports from metadataProcessor
│   ├── vision.js           # Google Vision AI service
│   ├── openai.js           # OpenAI API interaction service
│   ├── geminiService.js    # Gemini API interaction for HTML templating
│   ├── serper.js           # Serper API interaction service
│   └── valuerAgentClient.js # Client for the external Valuer Agent service
├── templates/
│   ├── skeletons/          # Skeleton HTML files for Gemini
│   │   ├── enhanced-analytics.html
│   │   └── appraisal-card.html
│   ├── enhanced-analytics.js # OLD JS-based template generator (Deprecated?)
│   └── appraisal-card.js   # OLD JS-based template generator (Deprecated?)
├── .env.example            # Example environment variables
├── config.js               # Loads configuration and secrets
├── index.js                # Main application entry point (Express setup)
├── package.json
├── Dockerfile
└── README.md               # This file
```

## HTML Skeleton Files Usage

The system uses a skeleton-based approach for generating the visualization HTML. This is critical to understand because:

### Skeletons and Gemini

1. **Only the skeleton files are used**: The system exclusively uses the HTML templates in the `templates/skeletons/` directory. The main ones are:
   - `appraisal-card.html` - The appraisal summary card that shows at the top of posts
   - `enhanced-analytics.html` - The detailed analytics section
   - `appraisal-card-fix.html` - Contains CSS and JavaScript fixes applied to the card
   - `appraisal-card-head.html` - Additional fixes for entity decoding/styling

2. **Important Guidelines**:
   - When making changes to visualization layouts, you must modify these skeleton files directly.
   - The skeletons contain placeholders (e.g., `{{VARIABLE_NAME}}`) that Gemini replaces with actual data.
   - The skeleton files include both structure (HTML) and styling (CSS).
   - Any changes to tabs, formatting, or layout must be done in these skeleton files.

3. **File Cleanup Recommendation**:
   - **Other HTML/PHP files in the repository (outside the skeleton directory) should be considered legacy/obsolete and can be safely deleted.**
   - Files like `APPRAISAL_SUMMARY_PANEL.html`, old versions of `display_appraisal_card_shortcode.php` and others are no longer used.
   - The JS-based template generators in `templates/` directory (`appraisal-card.js` and `enhanced-analytics.js`) are deprecated and can be safely removed.

### Workflow for Visual Changes

When making visual changes to the appraisal displays:

1. Edit the appropriate skeleton file in `templates/skeletons/` directory.
2. If changing tab structures (e.g., removing the "Similar Items" tab), ensure you:
   - Remove the button/tab from the HTML structure
   - Remove the corresponding content panel
   - Adjust the CSS to handle the new layout (e.g., making remaining tabs take full width)
3. For text alignment issues, add appropriate CSS rules with `!important` to override any conflicting styles.
4. For fixing entity encoding issues (like strange characters in titles), ensure proper entity decoding is applied in the JavaScript sections of the skeleton files.

### Testing Changes

After making changes to skeleton files:
1. Use the `POST /api/visualizations/debug` endpoint to generate HTML based on your changes without saving to WordPress.
2. Once verified, use `POST /regenerate-statistics-and-visualizations` to update actual posts with the new designs.

## Requirements

- Node.js 18+
- npm or yarn
- Access to dependent services (WordPress, OpenAI, Google Cloud APIs, Gemini, Valuer Agent, Serper)
- Configured Google Cloud Project (Cloud Run, Secret Manager, Vision AI, Docs, Drive)
- Docker (optional, for containerization)

## Installation

1.  **Clone:** `git clone [repository-url] && cd appraisals-backend`
2.  **Install:** `npm install`
3.  **Configure:** Create a `.env` file (or configure environment variables/secrets) based on `.env.example` and the [Configuration](#configuration) section.

## Configuration

### Secrets / Environment Variables

The following need to be configured via environment variables or Google Cloud Secret Manager (loaded by `index.js`):

- **WordPress:**
    - `WORDPRESS_API_URL`: Base URL for the WordPress REST API.
    - `wp_username`: WordPress user with API access.
    - `wp_app_password`: WordPress Application Password for the user.
- **AI Services:**
    - `OPENAI_API_KEY`: API key for OpenAI.
    - `GEMINI_API_KEY`: API key for Google Gemini.
    - `GEMINI_API_ENDPOINT`: (Optional) Gemini API endpoint URL.
    - `GOOGLE_VISION_CREDENTIALS`: JSON credentials string for Google Vision AI.
- **External Services:**
    - `VALUER_AGENT_API_URL`: Base URL for the external Valuer Agent service.
    - `SERPER_API`: (Optional) API key for Serper.dev web search.
- **PDF Generation (Google):**
    - `GOOGLE_DOCS_CREDENTIALS`: JSON credentials string for Google Docs/Drive API.
    - `GOOGLE_DOCS_TEMPLATE_ID`: ID of the Google Doc template for PDFs.
    - `GOOGLE_DRIVE_FOLDER_ID`: ID of the Google Drive folder to save PDFs.
- **Server:**
    - `PORT`: Port for the server (defaults to 8080).
    - `NODE_ENV`: Set to `production` in production environments to hide detailed errors.

### WordPress Configuration

Ensure the target WordPress site has the necessary Custom Post Type (`appraisals`) and Advanced Custom Fields (ACF) configured. Key fields used by this backend include:

- `acf.value`: The appraised value.
- `acf.statistics`: Stores calculated market statistics (JSON string).
- `acf.enhanced_analytics_html`: Stores generated HTML for analytics visualization.
- `acf.appraisal_card_html`: Stores generated HTML for the summary card.
- `acf.justification_html`: Stores the generated valuation justification text/HTML.
- `acf.serper_search_results`: Stores context from web searches.
- `acf.valuer_agent_data`: Stores raw response from the Valuer Agent.
- `acf.main`: Main image field.
- Various other metadata fields used in `metadataProcessor.js` (e.g., `creator`, `object_type`, `condition_summary`, etc.).

## Deployment

Deployment typically involves building a Docker container and deploying it to a serverless platform like Google Cloud Run.

1.  **Build:** `docker build -t gcr.io/[PROJECT_ID]/appraisals-backend .`
2.  **Push:** `docker push gcr.io/[PROJECT_ID]/appraisals-backend`
3.  **Deploy:**
    ```bash
    gcloud run deploy appraisals-backend \
      --image gcr.io/[PROJECT_ID]/appraisals-backend \
      --platform managed \
      --region [REGION] \
      --allow-unauthenticated \
      # Add --set-secrets flags for all required secrets
      # Example: --set-secrets=WORDPRESS_API_URL=WORDPRESS_API_URL:latest,...
      # Add --set-env-vars for non-secret env vars like PORT, NODE_ENV, etc.
    ```

## API Endpoints

The following endpoints are available on the service:

### Core Appraisal Processing

*   `POST /complete-appraisal-report`
    *   **Body:** `{ "postId": "<ID>", "justificationOnly": <boolean> (optional) }`
    *   **Description:** Triggers the full metadata generation process (Vision, OpenAI metadata, Justification, Statistics, Gemini HTML) for the specified WordPress post ID. If `justificationOnly` is true, only processes the justification metadata.

### Visualization Generation

*   `POST /generate-visualizations`
    *   **Body:** `{ "postId": "<ID>" }`
    *   **Description:** Generates HTML visualizations (`enhanced_analytics_html`, `appraisal_card_html`) using *existing* statistics data stored in WordPress and the Gemini templating service. Skips if HTML fields already contain content.
*   `POST /regenerate-statistics-and-visualizations`
    *   **Body:** `{ "postId": "<ID>" }`
    *   **Description:** Fetches *fresh* statistics from the Valuer Agent, saves them to the `statistics` ACF field (as a JSON string), and then generates/updates HTML visualizations (`enhanced_analytics_html`, `appraisal_card_html`) using the Gemini templating service.

### Content Enhancement

*   `POST /enhance-description`
    *   **Body:** `{ "postId": "<ID>", "updateContent": <boolean> (optional) }`
    *   **Description:** Uses OpenAI to enhance the description based on the post title. Saves result to `enhanced_description` ACF field. If `updateContent` is true, attempts to update the main WordPress post content.

### Utility

*   `POST /update-wordpress`
    *   **Body:** `{ "postId": "<ID>", "acfFields": <object> (optional), "insertShortcodes": <boolean> (optional), "appraisalType": <string> (optional) }`
    *   **Description:** Applies updates to specified ACF fields and optionally ensures standard shortcodes (e.g., `[pdf_download]`, `[AppraisalTemplates]`) are present in the post content.

### PDF Generation

*   `POST /generate-pdf`
    *   **Body:** `{ "postId": "<ID>", "session_ID": <string> (optional) }`
    *   **Description:** Generates a complete PDF report based on a Google Docs template, saves it to Google Drive, and updates the `pdflink` and `doclink` ACF fields in WordPress.
*   `POST /api/pdf/generate-pdf-steps`
    *   **Body:** `{ "postId": "<ID>", "session_ID": <string> (optional), "startStep": <string> (optional), "options": <object> (optional) }`
    *   **Description:** Executes the PDF generation process step-by-step, potentially starting from a specified step. Returns detailed logs.
*   `GET /api/pdf/steps`
    *   **Description:** Returns a list of available steps for the step-by-step PDF generation.

### HTML Generation (Standalone)

*   `POST /api/html/generate`
    *   **Body:** `{ "visualizationType": "<type>", "statistics": <object>, "appraisal": <object> (optional), "options": <object> (optional) }`
    *   **Description:** Generates HTML for a specified visualization type (`enhanced-analytics` or `appraisal-card`) based on provided data. Does *not* interact with WordPress.
*   `POST /api/html/process-statistics`
    *   **Body:** `{ "statistics": <object>, "appraisal": <object> (optional) }`
    *   **Description:** Takes statistics data and adds generated HTML for visualizations (`enhanced_analytics_html`, `appraisal_card_html`) directly to the returned object. Does *not* interact with WordPress.

### Debugging & Health

*   `POST /api/visualizations/debug`
    *   **Body:** `{ "postId": "<ID>" (optional), "statisticsData": <object|string> (optional), "appraisalData": <object> (optional), "skipSaving": <boolean> (optional) }`
    *   **Description:** Debug endpoint to generate visualization HTML based on provided data or data fetched from a `postId`, optionally skipping the save-to-WordPress step.
*   `POST /api/visualizations/fix-statistics`
    *   **Body:** `{ "postId": "<ID>" (optional), "statisticsData": <string> (optional) }`
    *   **Description:** Attempts to clean and parse potentially malformed JSON strings from the `statistics` field.
*   `GET /health`
    *   **Description:** Standard health check endpoint.

### Error Responses

*   `400 Bad Request`: Returned for missing/invalid required parameters. Body includes `success: false`, `message`, `usage`, `error_details`.
*   `404 Not Found`: Returned if the specified `postId` cannot be found in WordPress. Body includes `success: false`, `message`, `error_details`.
*   `500 Internal Server Error`: Returned for other server-side errors. Body includes `success: false`, `message`, and `error_details` (only if `NODE_ENV !== 'production'`).

## Development

-   **Run Locally:** `npm start` (ensure all required env vars/secrets are available)
-   **Lint:** `npm run lint`
-   **Test:** `npm test` (if tests are configured)

## Troubleshooting

-   **WordPress Connection:** Check API URL, user, application password. Ensure REST API is enabled and accessible. Check CORS settings on WordPress if calling from a different origin frontend.
-   **API Key Errors:** Verify keys for OpenAI, Gemini, Google Cloud services, Serper, Valuer Agent.
-   **Gemini Templating:** Ensure skeleton files exist and paths are correct. Check the prompt in `geminiService.js` and the Gemini API response structure if errors occur. Verify the `dataContext` object matches placeholders.
-   **400 Errors:** Check the `usage` instructions returned in the error response body.
-   **500 Errors (Dev):** Check the `error_details` field in the response and server logs.

## License

MIT License - See LICENSE file for details (if one exists).

## Code Organization

The codebase has been restructured to eliminate duplications and improve organization:

### Directory Structure

- `src/` - Organized source code
  - `services/` - Core backend services 
  - `templates/` - Template management

- `templates/` - HTML/text templates and skeletons
  - `skeletons/` - Base templates for AI text generation

- `services/` - Service implementations
  - `openai.js` - OpenAI API client
  - `wordpress/` - WordPress API integration
  - `constants/` - Configuration constants
  - `utils/` - Shared utility functions
  - `metadataProcessor.js` - Core metadata processing

- `routes/` - Express route handlers

### Key Changes

1. Removed duplicate service files:
   - `services/openaiService.js` (use `openai.js` directly)
   - `services/wordpress.js` (use `wordpress/index.js` directly)
   - `services/metadata.js` (use `metadataProcessor.js` directly)

2. Centralized template management in `src/templates/`

3. Improved code organization with clear responsibilities for each file

See `src/README.md` for detailed information about the code organization.