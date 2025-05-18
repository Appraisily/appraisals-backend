# Implementing WeasyPrint PDF Service on Cloud Run

## Overview

This guide provides step-by-step instructions for implementing a WeasyPrint-based PDF generation microservice on Google Cloud Run. This service will fetch WordPress data from appraisal posts and transform them into professionally formatted PDF documents using WeasyPrint's HTML/CSS to PDF rendering capabilities.

## Project Setup

### 1. Create Project Structure

```
weasyprint-pdf-service/
├── .gcloudignore
├── Dockerfile
├── requirements.txt
├── cloudbuild.yaml
├── src/
│   ├── service.py
│   ├── wp_client.py
│   └── pdf_builder.py
├── templates/
│   ├── appraisal.html
│   └── partials/
│       ├── header.html
│       ├── appraisal_card.html
│       └── footer.html
├── static/
│   ├── fonts/
│   │   ├── Roboto-Regular.ttf
│   │   └── Roboto-Bold.ttf
│   └── pdf/
│       ├── default.css
│       ├── luxury.css
│       └── print.css
└── tests/
    ├── test_service.py
    └── test_pdf_builder.py
```

### 2. Create Requirements File

Create a `requirements.txt` file with the following dependencies:

```
weasyprint==60.*
fastapi==0.111.*
uvicorn[standard]==0.29.*
requests==2.32.*
jinja2==3.1.*
python-dotenv==1.0.*
google-cloud-storage==2.13.*
google-cloud-secret-manager==2.16.*
pydantic==2.5.*
```

### 3. Create Dockerfile

```dockerfile
FROM python:3.11-slim

# Native dependencies for WeasyPrint
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    mime-support \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY templates/ ./templates/
COPY static/ ./static/

# Run as non-root user for better security
RUN useradd -m appuser
USER appuser

# Command to run the service
CMD ["uvicorn", "src.service:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Service Implementation

### 1. Main Service (`src/service.py`)

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import weasyprint
import os
from dotenv import load_dotenv
from .wp_client import WordPressClient
from .pdf_builder import PDFBuilder
import logging

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Appraisal PDF Generator",
    description="Microservice for generating PDFs from WordPress appraisals",
    version="1.0.0"
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize WordPress client
wp_client = WordPressClient(
    base_url=os.getenv("WORDPRESS_API_URL"),
    username=os.getenv("WORDPRESS_USERNAME"),
    password=os.getenv("WORDPRESS_APP_PASSWORD")
)

# Initialize templates
templates = Jinja2Templates(directory="templates")

# Initialize PDF builder
pdf_builder = PDFBuilder(templates)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "appraisal-pdf-generator"}

@app.post("/render-pdf")
async def render_pdf(request: Request):
    """Generate a PDF from WordPress post data"""
    try:
        data = await request.json()
        post_id = data.get("postId")
        html_content = data.get("html")
        css_variant = data.get("cssVariant", "default")
        
        if not post_id and not html_content:
            raise HTTPException(400, "Either postId or html content must be provided")
        
        # Log the request
        logger.info(f"PDF generation request received for post ID: {post_id}")
        
        # Fetch WordPress data if no HTML is provided
        if not html_content:
            post_data = wp_client.fetch_post(post_id)
            if not post_data:
                raise HTTPException(404, f"Post ID {post_id} not found")
        else:
            # Use provided HTML with minimal post structure
            post_data = {"content": {"rendered": html_content}}
        
        # Generate the PDF
        pdf_content = pdf_builder.build_pdf(post_data, css_variant)
        
        # Return the PDF
        filename = f"appraisal-{post_id or 'custom'}.pdf"
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(500, f"Error generating PDF: {str(e)}")
```

### 2. WordPress Client (`src/wp_client.py`)

```python
import requests
import os
import logging
from requests.auth import HTTPBasicAuth

class WordPressClient:
    """Client for interacting with WordPress REST API"""
    
    def __init__(self, base_url, username=None, password=None):
        self.base_url = base_url
        self.auth = None
        if username and password:
            self.auth = HTTPBasicAuth(username, password)
        self.logger = logging.getLogger(__name__)
    
    def fetch_post(self, post_id):
        """Fetch a post from WordPress by ID"""
        try:
            url = f"{self.base_url}/posts/{post_id}"
            params = {
                "_embed": "true",  # Include featured media and ACF data
                "_fields": "id,title,content,date,acf,_embedded"  # Only fetch fields we need
            }
            
            response = requests.get(
                url,
                params=params,
                auth=self.auth,
                timeout=10
            )
            
            if response.status_code == 404:
                self.logger.error(f"Post {post_id} not found")
                return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            self.logger.error(f"Error fetching WordPress post {post_id}: {str(e)}")
            raise Exception(f"WordPress API error: {str(e)}")
```

### 3. PDF Builder (`src/pdf_builder.py`)

```python
import weasyprint
import os
import tempfile
from fastapi.templating import Jinja2Templates
import logging

class PDFBuilder:
    """Builds PDF documents from HTML templates and WordPress data"""
    
    def __init__(self, templates):
        self.templates = templates
        self.logger = logging.getLogger(__name__)
        
        # Pre-cache CSS files
        self.css_cache = {
            "default": weasyprint.CSS(filename="static/pdf/default.css"),
            "luxury": weasyprint.CSS(filename="static/pdf/luxury.css")
        }
        
        # Always include print CSS
        self.print_css = weasyprint.CSS(filename="static/pdf/print.css")
    
    def build_pdf(self, post_data, css_variant="default"):
        """Build PDF from post data and template"""
        try:
            # Process metadata
            metadata = self._extract_metadata(post_data)
            
            # Render HTML template
            html_content = self._render_template(post_data, metadata)
            
            # Select CSS variant
            css = self.css_cache.get(css_variant, self.css_cache["default"])
            
            # Generate PDF with WeasyPrint
            html = weasyprint.HTML(
                string=html_content,
                base_url="static/"  # For resolving relative URLs
            )
            
            pdf_content = html.write_pdf(
                stylesheets=[css, self.print_css]
            )
            
            return pdf_content
            
        except Exception as e:
            self.logger.error(f"Error building PDF: {str(e)}")
            raise
    
    def _extract_metadata(self, post_data):
        """Extract and process metadata from post data"""
        metadata = {
            "title": post_data.get("title", {}).get("rendered", "Untitled Appraisal"),
            "date": post_data.get("date", ""),
            # Extract ACF fields if available
            **(post_data.get("acf") or {})
        }
        
        return metadata
    
    def _render_template(self, post_data, metadata):
        """Render the HTML template with post data and metadata"""
        context = {
            "post": post_data,
            "metadata": metadata,
            "content": post_data.get("content", {}).get("rendered", "")
        }
        
        # Use a StringIO buffer to render the template
        return self.templates.get_template("appraisal.html").render(context)
```

### 4. HTML Template (`templates/appraisal.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ metadata.title }}</title>
</head>
<body>
    <header>
        <h1 class="art-title">{{ metadata.title }}</h1>
        <div class="appraisal-info">
            <p class="date">{{ metadata.date }}</p>
            <p class="reference">Reference: {{ post.id }}</p>
        </div>
    </header>
    
    <main>
        <section class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="value-statement">
                <p class="estimated-value">Estimated Value: ${{ metadata.value }}</p>
            </div>
            <p>This appraisal report has been prepared for insurance, estate planning, or general valuation purposes.</p>
        </section>
        
        <!-- Insert the WordPress content -->
        <div class="wp-content">
            {{ content|safe }}
        </div>
    </main>
    
    <footer>
        <p>© Appraisily. This document was generated on {{ metadata.date }}</p>
    </footer>
</body>
</html>
```

### 5. CSS Files

**Default CSS (`static/pdf/default.css`)**:
```css
/* Base styling for appraisal PDF */
body {
    font-family: 'Roboto', sans-serif;
    line-height: 1.5;
    color: #333;
}

h1, h2, h3, h4 {
    color: #000;
    font-weight: bold;
}

.art-title {
    font-size: 24pt;
    margin-bottom: 0.5cm;
}

.executive-summary {
    border: 1px solid #ddd;
    padding: 1cm;
    margin: 1cm 0;
    background-color: #f9f9f9;
}

.value-statement {
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    margin: 1cm 0;
}

.appraisal-info {
    margin-top: 0.5cm;
    font-size: 10pt;
    color: #666;
}

img {
    max-width: 100%;
    height: auto;
    margin: 0.5cm 0;
}

footer {
    border-top: 1pt solid #ddd;
    padding-top: 0.5cm;
    font-size: 9pt;
    color: #999;
}
```

**Print CSS (`static/pdf/print.css`)**:
```css
/* Page setup and print-specific styles */
@page {
    size: A4;
    margin: 2.5cm 2cm;
    
    @top-center {
        content: string(title);
        font-size: 9pt;
        color: #666;
    }
    
    @bottom-center {
        content: counter(page) " / " counter(pages);
        font-size: 9pt;
    }
}

/* First page has different styling */
@page :first {
    @top-center {
        content: none;
    }
}

/* Set running title */
h1.art-title {
    string-set: title content();
}

/* Page breaks */
h2 {
    break-before: page;
}

.executive-summary {
    break-after: avoid;
}

table, figure, img {
    break-inside: avoid;
}

/* Print optimization */
a {
    text-decoration: none;
    color: black;
}

@media print {
    a:after {
        content: " (" attr(href) ")";
        font-size: 0.8em;
        color: #666;
    }
}
```

## Cloud Run Deployment

### 1. Cloud Build Configuration

Create a `cloudbuild.yaml` file:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/weasyprint-pdf-service', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/weasyprint-pdf-service']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'weasyprint-pdf-service'
      - '--image'
      - 'gcr.io/$PROJECT_ID/weasyprint-pdf-service'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '512Mi'
      - '--timeout'
      - '300s'
      - '--set-env-vars'
      - 'WORDPRESS_API_URL=$$WORDPRESS_API_URL,GOOGLE_CLOUD_PROJECT=$$PROJECT_ID'
      - '--set-secrets'
      - 'WORDPRESS_USERNAME=wordpress-username:latest,WORDPRESS_APP_PASSWORD=wordpress-app-password:latest'

images:
  - 'gcr.io/$PROJECT_ID/weasyprint-pdf-service'
  
substitutions:
  _SERVICE_NAME: 'weasyprint-pdf-service'
  _REGION: 'us-central1'
```

### 2. Create Secrets in Secret Manager

Before deployment, create these secrets in Secret Manager:

1. `wordpress-username`: WordPress API username
2. `wordpress-app-password`: WordPress application password

### 3. Deployment Commands

```bash
# Set your Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Alternatively, build and deploy manually:
docker build -t gcr.io/YOUR_PROJECT_ID/weasyprint-pdf-service .
docker push gcr.io/YOUR_PROJECT_ID/weasyprint-pdf-service
gcloud run deploy weasyprint-pdf-service \
  --image gcr.io/YOUR_PROJECT_ID/weasyprint-pdf-service \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --timeout 300s \
  --allow-unauthenticated
```

## Integrating with Existing Node.js Backend

To integrate this service with your existing Node.js backend, add a new step to your PDF generation process:

```javascript
// In your PDF steps file (pdf-steps.js)
const PDF_STEPS = {
  // ... existing steps
  RENDER_WITH_WEASYPRINT: 'STEP_RENDER_WITH_WEASYPRINT',
  UPLOAD_PDF: 'STEP_UPLOAD_PDF',
  // ... remaining steps
};

// Handler implementation for the WeasyPrint step
async function renderWithWeasyPrint(context) {
  try {
    // Log the action
    addLog(context, 'info', `Rendering PDF with WeasyPrint for post ${context.postId}`);
    
    // Call the WeasyPrint service
    const response = await fetch(`${config.WEASYPRINT_URL}/render-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId: context.postId,
        cssVariant: context.options?.cssVariant || 'default'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WeasyPrint service error: ${response.status} - ${errorText}`);
    }
    
    // Get the PDF buffer
    const buffer = await response.arrayBuffer();
    context.pdfBuffer = Buffer.from(buffer);
    
    addLog(context, 'info', `PDF successfully rendered, size: ${context.pdfBuffer.length} bytes`);
    
  } catch (error) {
    addLog(context, 'error', `Error rendering PDF with WeasyPrint: ${error.message}`);
    throw error;
  }
}

// Update the step order to use WeasyPrint
const DEFAULT_STEP_ORDER = [
  PDF_STEPS.FETCH_POST_DATA,
  PDF_STEPS.PROCESS_METADATA,
  // Remove Google Docs steps and replace with WeasyPrint
  PDF_STEPS.RENDER_WITH_WEASYPRINT,
  PDF_STEPS.UPLOAD_PDF,
  PDF_STEPS.UPDATE_WORDPRESS
];
```

## Testing and Verification

### 1. Local Testing

```bash
# Build and run the container locally
docker build -t weasyprint-pdf-service .
docker run -p 8080:8080 -e WORDPRESS_API_URL=https://your-wordpress.com/wp-json/wp/v2 weasyprint-pdf-service

# Test with curl
curl -X POST -H "Content-Type: application/json" -d '{"postId": 12345}' http://localhost:8080/render-pdf -o test.pdf
```

### 2. Cloud Run Testing

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe weasyprint-pdf-service --platform managed --region us-central1 --format 'value(status.url)')

# Test the deployed service
curl -X POST -H "Content-Type: application/json" -d '{"postId": 12345}' $SERVICE_URL/render-pdf -o test.pdf
```

## Monitoring and Logging

- Set up Cloud Monitoring alerts for error rates and latency
- View logs in Cloud Logging
- Consider adding OpenTelemetry for more detailed tracing

## Next Steps

- Add more CSS variants for different appraisal types
- Implement caching of WordPress responses
- Add PDF metadata (title, author, keywords)
- Add PDF/A compliance for archival purposes
- Set up CI/CD pipeline for automated testing and deployment

---

This implementation guide provides a comprehensive approach to deploying a WeasyPrint-based PDF generation service on Google Cloud Run. The service is designed to integrate seamlessly with your existing Node.js backend while providing superior PDF layout quality and performance. 