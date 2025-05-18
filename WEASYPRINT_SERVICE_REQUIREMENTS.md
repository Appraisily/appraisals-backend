# WeasyPrint PDF Service Requirements

## Service Overview

The WeasyPrint PDF Service is a specialized microservice designed to generate high-quality PDF documents from WordPress appraisal content. It leverages WeasyPrint, a Python library that renders HTML/CSS to PDF with superior page layout capabilities, running headers/footers, and precise pagination control.

## Technical Requirements

### 1. System Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| Python | Runtime environment | 3.10+ |
| WeasyPrint | HTML/CSS to PDF rendering | 60.x |
| FastAPI | Web framework | 0.111.x |
| Uvicorn | ASGI server | 0.29.x |
| Jinja2 | Template rendering | 3.1.x |
| Requests | HTTP client for WordPress API | 2.32.x |
| Cairo | Graphics library (required by WeasyPrint) | 1.16+ |
| Pango | Text layout library (required by WeasyPrint) | 1.44+ |
| GDK-PixBuf | Image handling (required by WeasyPrint) | 2.38+ |
| HarfBuzz | Text shaping (required by WeasyPrint) | 2.6+ |

### 2. Compute Resources

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| Memory | 512 MB | 1 GB |
| Storage | 500 MB | 1 GB |
| Network Egress | 100 MB/day | 1 GB/day |
| Concurrent Requests | 10 | 50 |

### 3. External API Dependencies

| API | Purpose | Authentication |
|-----|---------|---------------|
| WordPress REST API | Fetch appraisal content | Basic Auth with application password |
| Google Cloud Storage (optional) | Store generated PDFs | Service Account |

### 4. Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| WORDPRESS_API_URL | WordPress REST API base URL | Yes | None |
| WORDPRESS_USERNAME | WordPress API username | Yes | None |
| WORDPRESS_APP_PASSWORD | WordPress application password | Yes | None |
| PORT | Service HTTP port | No | 8080 |
| LOG_LEVEL | Logging verbosity | No | INFO |
| GOOGLE_CLOUD_PROJECT | GCP project ID | No | None |
| GCS_BUCKET | Storage bucket for PDFs (optional) | No | None |

### 5. Security Requirements

- **API Authentication**: The service should require authentication for all endpoints
- **Secret Management**: Credentials stored in Google Secret Manager, not environment variables
- **HTTPS**: All communication must be over HTTPS
- **Input Validation**: Strict validation of all request parameters
- **Resource Limits**: Rate limiting to prevent DoS attacks

### 6. Performance Requirements

| Metric | Target |
|--------|--------|
| Cold Start Time | <5 seconds |
| Response Time (p95) | <10 seconds for typical appraisal |
| Throughput | 10+ requests/minute |
| Timeout | 300 seconds (5 minutes) |
| Concurrent Requests | 30+ |

### 7. Reliability Requirements

| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| Error Rate | <0.1% |
| Mean Time to Recovery | <5 minutes |

### 8. Observability Requirements

- **Logging**: Structured JSON logs with correlation IDs
- **Metrics**: Request count, latency, error rate, PDF size
- **Tracing**: OpenTelemetry integration for request tracing
- **Alerting**: Notification on high error rates or latency

### 9. Container Requirements

| Aspect | Specification |
|--------|---------------|
| Base Image | python:3.11-slim |
| Container Size | <700 MB |
| User | Non-root user (appuser) |
| Exposed Port | 8080 |
| Health Check | GET /health |
| Graceful Shutdown | Support SIGTERM |

### 10. PDF Output Requirements

| Feature | Requirement |
|---------|-------------|
| Page Size | A4 (210 x 297 mm) |
| Margins | 25mm (adjustable per template) |
| Headers/Footers | Running headers with title, page numbers |
| Pagination | Automatic with controlled page breaks |
| Images | Properly scaled, no overflow |
| Fonts | Embedded, no system dependencies |
| Hyperlinks | Preserved and functional |
| File Size | Optimized (<5 MB for typical appraisal) |
| PDF/A Compliance | Optional but supported |

## Service API Contract

### 1. Render PDF Endpoint

**Request:**
```
POST /render-pdf
Content-Type: application/json

{
  "postId": 12345,                     // WordPress post ID
  "html": "<optional direct html>",    // Optional: direct HTML instead of fetching from WordPress
  "cssVariant": "default",             // Optional: style variant to apply
  "includeAnalytics": true,            // Optional: include analytics section
  "outputFormat": "pdf"                // Optional: "pdf" (default) or "html" for debugging
}
```

**Response:**
```
200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="appraisal-12345.pdf"

[Binary PDF data]
```

**Error Response:**
```
400 Bad Request
Content-Type: application/json

{
  "error": "Missing required parameter: postId",
  "details": "..."
}
```

### 2. Health Check Endpoint

**Request:**
```
GET /health
```

**Response:**
```
200 OK
Content-Type: application/json

{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

## Integration Requirements

### 1. Node.js Backend Integration

The service must integrate with the existing Node.js backend through:

- REST API calls from the PDF generation step engine
- Support for the existing context object to maintain compatibility
- Compatible error reporting format

### 2. WordPress Integration

The service must properly handle:

- WordPress REST API authentication
- ACF (Advanced Custom Fields) data extraction
- WordPress media URL resolution
- WordPress shortcode rendering (or have fallbacks)

### 3. Google Cloud Integration

The service must work with:

- Cloud Run for hosting
- Secret Manager for credentials
- Cloud Storage for PDF storage (optional)
- Cloud Logging for structured logs
- Cloud Monitoring for metrics

## Development and Deployment Requirements

### 1. Local Development

- Docker Compose setup for local testing
- Environment variable templates
- Mock WordPress API for testing

### 2. CI/CD Pipeline

- Automated testing on push
- Container vulnerability scanning
- Version tagging
- Automated deployment to staging

### 3. Documentation

- API documentation (OpenAPI/Swagger)
- Developer setup guide
- Template customization guide
- CSS reference for PDF styling

## Service Constraints

- PDF generation timeout must be set to 300 seconds to accommodate large appraisals
- Memory allocation must be sufficient for WeasyPrint rendering (min 512 MB)
- WeasyPrint lacks JavaScript execution, so all dynamic content must be pre-rendered
- Cloud Run cold starts may affect the first request latency

## Future Considerations

- Support for multiple template designs beyond default/luxury
- PDF/A compliance for archival purposes
- Pre-fetching and caching WordPress data
- PDF compression options for size optimization
- Multiple language support
- Batch processing of multiple PDFs

---

This requirements document outlines the essential technical specifications for implementing the WeasyPrint PDF Service as a standalone microservice on Google Cloud Run. The service is designed to replace the current Google Docs-based PDF generation with a more controllable, consistent, and higher-quality alternative. 