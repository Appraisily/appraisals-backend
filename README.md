# Appraisals Backend

Backend service for the Appraisers platform, providing API endpoints for appraisal data processing, visualization generation, and PDF report generation.

## API Routes Structure

The API is organized into distinct domains, each handled by a dedicated router:

### Visualizations (`/api/visualizations`)

Handles generation and management of HTML visualizations for appraisals.

- `POST /api/visualizations/generate-visualizations` - Generate enhanced analytics and appraisal card visualizations using Gemini
- `POST /api/visualizations/regenerate-statistics-and-visualizations` - Fetch new statistics and regenerate visualizations
- `POST /api/visualizations/debug` - Debug endpoint for visualization generation
- `POST /api/visualizations/fix-statistics` - Fix malformed statistics data

### PDF Generation (`/api/pdf`)

Handles PDF report generation using Google Docs integration.

- `POST /api/pdf/generate-pdf` - Generate PDF report using step-by-step approach
- `POST /api/pdf/generate-pdf-steps` - Generate PDF report starting from a specific step
- `GET /api/pdf/steps` - List available PDF generation steps
- `POST /api/pdf/generate-pdf-legacy` - Legacy endpoint for PDF generation (deprecated)

### HTML Content (`/api/html`)

Handles direct HTML content generation for appraisals.

- `POST /api/html/generate` - Generate HTML for a specific visualization type
- `POST /api/html/process-statistics` - Process statistics data and add generated HTML

### Description (`/api/description`)

Handles appraisal description enhancements.

- `POST /api/description/enhance-description` - Enhance appraisal description using AI

### Utility (`/api/utility`)

Handles utility functions for the appraisal platform.

- Various utility endpoints for system operations

### Report (`/api/report`)

Handles appraisal report management.

- Various endpoints for managing appraisal reports

## File Structure

The routes are organized into separate files by domain:

```
appraisals-backend/
├── routes/
│   ├── visualizations.js  - Visualization generation routes
│   ├── pdf.js            - PDF generation routes (step-based)
│   ├── pdf-legacy.js     - Legacy PDF generation (deprecated)
│   ├── html.js           - HTML content generation routes
│   ├── description.js    - Description enhancement routes
│   ├── utility.js        - Utility routes
│   └── report.js         - Report management routes
├── services/
│   ├── pdf/              - PDF generation services
│   ├── wordpress.js      - WordPress integration service
│   ├── geminiService.js  - Gemini AI integration
│   ├── openai.js         - OpenAI integration
│   └── utils/            - Utility functions
└── templates/
    ├── skeletons/        - HTML skeleton templates
    └── ...               - Other template-related files
```

## Environment Variables

The application requires several environment variables to function properly. These can be set directly in a `.env` file for local development, or stored in Google Secret Manager for production deployments.

Key environment variables include:

- `WORDPRESS_API_URL` - WordPress API endpoint
- `wp_username` - WordPress username
- `wp_app_password` - WordPress application password
- `OPENAI_API_KEY` - OpenAI API key for AI integrations
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_DOCS_CREDENTIALS` - Google Docs API credentials (JSON)
- `GOOGLE_DRIVE_FOLDER_ID` - Google Drive folder ID for storing PDFs
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with required environment variables
4. Start the development server: `npm run dev`

## Deployment

The application is deployed on Google Cloud Run. Secrets are accessed through Google Secret Manager during runtime.

## License

Proprietary - All rights reserved.