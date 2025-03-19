# Appraisals Backend Service

A scalable, serverless API service built with Node.js that automates the generation of professional art appraisal reports using AI vision analysis and natural language processing.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

- **Purpose:** Automates the creation of comprehensive art appraisal reports by analyzing artwork images and generating expert descriptions.
- **Scope:** Handles image analysis, content generation, and PDF report creation for art appraisals.
- **Tech Stack:**
  - Node.js
  - Express.js
  - Google Cloud Run
  - Google Vision AI
  - OpenAI GPT-4
  - Google Docs/Drive APIs
  - WordPress REST API

---

## Features

- Automated image analysis using Google Vision AI
- Similar artwork detection and comparison
- Expert content generation using GPT-4
- Automated PDF report generation
- WordPress integration for content management
- Secure credential handling via Google Secret Manager
- Scalable serverless architecture
- Real-time processing and updates
- Professional PDF report formatting
- Comprehensive error handling and logging

---

## Architecture

### Components

- **API Layer:** Express.js REST API
- **Image Analysis:** Google Vision AI
- **Content Generation:** OpenAI GPT-4
- **Document Processing:** Google Docs/Drive APIs
- **Content Storage:** WordPress REST API
- **Secret Management:** Google Cloud Secret Manager

### Flow

1. Client submits appraisal request with artwork images
2. System analyzes images using Google Vision AI
3. GPT-4 generates expert descriptions and analysis
4. Content is stored in WordPress
5. PDF report is generated using Google Docs
6. Final report is uploaded to Google Drive
7. Links are returned to the client

### Detailed Process Flow Diagrams

#### System Architecture Overview

```mermaid
graph TD
    %% Entry points and initialization
    subgraph "System Initialization"
        A[Start Service] --> B[Load Secrets from Secret Manager]
        B --> C[Initialize Vision Client]
        B --> D[Initialize Google Docs/Drive]
        C --> E[Register API Routes]
        D --> E
        E --> F[Start Express Server]
        
        %% Source file references
        A -.-> AFile["/index.js: Main entry point"]
        B -.-> BFile["/index.js: loadSecrets()"]
        C -.-> CFile["/services/vision.js: initializeVisionClient()"]
        D -.-> DFile["/services/pdf/index.js: initializeGoogleApis()"]
        E -.-> EFile["/index.js: Route registration"]
    end
    
    %% Core endpoints
    subgraph "API Endpoints"
        F --> G["/complete-appraisal-report"]
        F --> H["/generate-pdf"]
        
        %% Source file references
        G -.-> GFile["/routes/appraisal.js"]
        H -.-> HFile["/routes/pdf.js"]
    end
    
    %% External services
    subgraph "External Services"
        I1[WordPress CMS]
        I2[Google Vision API]
        I3[OpenAI GPT-4]
        I4[Google Docs/Drive]
        I5[Valuer Agent API]
        
        %% Integration connections
        G --> I1
        G --> I2
        G --> I3
        G --> I5
        H --> I1
        H --> I4
    end
    
    %% Data flows
    subgraph "Data Processing Flows"
        %% Content flow
        J1[WordPress Post Data]
        J2[AI-Generated Content]
        J3[Similar Artwork Images]
        J4[PDF Document]
        
        I1 --> J1
        I2 --> J3
        I3 --> J2
        I4 --> J4
        
        %% Data connections
        J1 --> G
        J1 --> H
        J2 --> I1
        J3 --> I1
        J4 --> I1
        
        %% Source file references
        J1 -.-> J1File["/services/wordpress.js: fetchPostData()"]
        J2 -.-> J2File["/services/openai.js: generateContent()"]
        J3 -.-> J3File["/services/vision.js: processMainImageWithGoogleVision()"]
        J4 -.-> J4File["/services/pdf/index.js: export and document functions"]
    end
    
    %% Performance metrics
    Time1["~2-3s: WordPress data fetch"] -.-> J1
    Time2["~5-10s: Vision API analysis"] -.-> I2
    Time3["~3-5s: OpenAI content generation (per field)"] -.-> I3
    Time4["~40-60s: PDF generation complete process"] -.-> J4
    
    %% Styling
    classDef api fill:#d4f0d0,stroke:#333,stroke-width:1px
    classDef external fill:#ffd700,stroke:#333,stroke-width:1px
    classDef file fill:#f9f9f9,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5
    classDef time fill:none,stroke:none
    
    class G,H api
    class I1,I2,I3,I4,I5 external
    class AFile,BFile,CFile,DFile,EFile,GFile,HFile,J1File,J2File,J3File,J4File file
    class Time1,Time2,Time3,Time4 time
```

#### Appraisal Report Generation Flow

```mermaid
graph TD
    subgraph "Initialization"
        A[Start Service] --> B[Load Secrets from Secret Manager]
        B --> C[Initialize Google APIs]
        C --> D[Register API Routes]
        D --> E[Start Express Server]
    end

    subgraph "Appraisal Report Generation"
        F[Receive POST /complete-appraisal-report] --> G[Validate postId]
        G -->|Invalid| H[Return 400 Bad Request]
        G -->|Valid| I[Fetch WordPress Post Data]
        I --> J[Process Main Image with Google Vision]
        
        I --> K[Process All Metadata]
        K --> L[Process Title]
        K --> M[Process Age]
        K --> N[Process Condition]
        K --> O[Process Style]
        K --> P[Process Other Fields]
        
        I --> Q[Process Justification Metadata]
        Q --> R[Calculate Justification based on Value]
        
        J --> S[Return Complete Response]
        L --> S
        M --> S
        N --> S
        O --> S
        P --> S
        R --> S
    end

    subgraph "Error Handling"
        I -->|Error| T[Log Error]
        J -->|Error| T
        K -->|Error| T
        Q -->|Error| T
        
        T --> U[Return Error Response]
    end

    subgraph "Resource Files"
        Z1["/index.js: Main entry point & server setup"]
        Z2["/routes/appraisal.js: Appraisal endpoints"]
        Z3["/services/wordpress.js: WordPress API client"]
        Z4["/services/vision.js: Google Vision integration"]
        Z5["/services/metadata.js: Metadata processing"]
        Z6["/services/openai.js: OpenAI integration"]
    end
    
    style Z1 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Z2 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Z3 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Z4 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Z5 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Z6 fill:#f9f9f9,stroke:#666,stroke-width:1px
```

#### PDF Generation Flow

```mermaid
graph TD
    subgraph "PDF Generation Process"
        A1[Receive POST /generate-pdf] --> B1[Validate postId]
        B1 -->|Invalid| C1[Return 400 Bad Request]
        B1 -->|Valid| D1[Initialize Google APIs]
        
        D1 --> E1[Fetch WordPress Post Data]
        E1 --> F1[Process & Validate Metadata]
        F1 -->|Invalid| G1[Return 400 Validation Error]
        
        F1 -->|Valid| H1[Get Template ID]
        H1 --> I1[Clone Template Document]
        I1 --> J1[Move Document to Folder]
        
        J1 --> K1[Replace Placeholders with Metadata]
        K1 --> L1[Adjust Title Font Size]
        L1 --> M1[Add Gallery Images]
        M1 --> N1[Insert Age Image]
        N1 --> O1[Insert Signature Image]
        O1 --> P1[Insert Main Image]
        
        P1 --> Q1[Export to PDF]
        Q1 --> R1[Generate Filename]
        R1 --> S1[Upload PDF to Drive]
        S1 --> T1[Update WordPress ACF Fields]
        
        T1 --> U1[Return Success Response]
    end

    subgraph "Error Handling"
        E1 -->|Error| V1[Log Error]
        F1 -->|Error| V1
        I1 -->|Error| V1
        M1 -->|Non-fatal Error| W1[Log Warning & Continue]
        Q1 -->|Error| V1
        S1 -->|Error| V1
        T1 -->|Error| V1
        
        V1 --> X1[Return Error Response]
    end

    subgraph "Resource Files"
        Y1["/routes/pdf.js: PDF generation endpoint"]
        Y2["/services/pdf/index.js: Google Docs operations"]
        Y3["/services/pdf/documentUtils.js: Document manipulation"]
        Y4["/services/pdf/exportUtils.js: PDF export"]
        Y5["/services/pdf/gallery/index.js: Gallery handling"]
        Y6["/services/pdf/metadata/processing.js: Metadata processing"]
        Y7["/services/pdf/metadata/validation.js: Metadata validation"]
    end
    
    style Y1 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y2 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y3 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y4 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y5 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y6 fill:#f9f9f9,stroke:#666,stroke-width:1px
    style Y7 fill:#f9f9f9,stroke:#666,stroke-width:1px
```

#### Vision Processing and Content Generation Flow

```mermaid
graph TD
    subgraph "Main Image Vision Processing"
        V1[Start Vision Processing] --> V2{Gallery Populated?}
        V2 -->|Yes| V3[Skip Processing]
        V2 -->|No| V4[Get Main Image URL]
        V4 --> V5[Call Google Vision API]
        V5 --> V6{Similar Images Found?}
        V6 -->|No| V7[Return Empty Gallery]
        V6 -->|Yes| V8[Process Similar Images]
        V8 --> V9[Upload Images to WordPress]
        V9 --> V10[Update ACF Gallery Field]
        V10 --> V11[Return Gallery Data]
        V3 --> V11

        %% Source file references
        V1 -.-> VFile1["/services/vision.js: processMainImageWithGoogleVision()"]
        V5 -.-> VFile2["/services/vision.js: visionClient.webDetection()"]
        V9 -.-> VFile3["/services/vision.js: uploadImageToWordPress()"]
        V10 -.-> VFile4["/services/vision.js: updateWordPressGallery()"]
    end

    subgraph "Metadata Processing"
        M1[Start Metadata Processing] --> M2[Load Processing Order]
        M2 --> M3[Begin Processing Loop]
        M3 --> M4[Load Field Prompt]
        M4 --> M5[Generate Content with OpenAI]
        M5 --> M6[Update WordPress with Content]
        M6 --> M7{More Fields?}
        M7 -->|Yes| M3
        M7 -->|No| M8[Return Processed Fields]

        %% Source file references
        M1 -.-> MFile1["/services/metadata.js: processAllMetadata()"]
        M4 -.-> MFile2["/services/utils/promptUtils.js: getPrompt()"]
        M5 -.-> MFile3["/services/openai.js: generateContent()"]
        M6 -.-> MFile4["/services/metadata.js: updateWordPressMetadata()"]
    end

    subgraph "Justification Processing"
        J1[Start Justification Processing] --> J2[Get Artwork Value]
        J2 --> J3[Call Valuer Agent API]
        J3 --> J4[Format Auction Data]
        J4 --> J5[Load Justification Prompt]
        J5 --> J6[Generate Justification with OpenAI]
        J6 --> J7[Update WordPress with Justification]
        J7 --> J8[Return Justification Field]

        %% Source file references
        J1 -.-> JFile1["/services/metadata.js: processJustificationMetadata()"]
        J3 -.-> JFile2["External Valuer Agent API call"]
        J6 -.-> JFile3["/services/openai.js: generateContent()"]
        J7 -.-> JFile4["/services/metadata.js: updateWordPressMetadata()"]
    end

    %% Performance metrics
    TimeV1["~5-8s: Vision API processing"] -.-> V5
    TimeV2["~1-2s per image upload"] -.-> V9
    TimeM1["~3-5s per field generation"] -.-> M5
    TimeJ1["~5-7s: Valuer agent API"] -.-> J3
    TimeJ2["~3-4s: Justification generation"] -.-> J6

    %% Styling
    classDef api fill:#d4f0d0,stroke:#333,stroke-width:1px
    classDef external fill:#ffd700,stroke:#333,stroke-width:1px
    classDef file fill:#f9f9f9,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5
    classDef time fill:none,stroke:none

    class V5,J3 external
    class VFile1,VFile2,VFile3,VFile4,MFile1,MFile2,MFile3,MFile4,JFile1,JFile2,JFile3,JFile4 file
    class TimeV1,TimeV2,TimeM1,TimeJ1,TimeJ2 time
```

---

## Requirements

### Google Cloud Platform
- Active GCP Account
- Cloud Run enabled
- Secret Manager configured
- Vision AI API enabled
- Cloud Storage configured

### APIs and Services
- OpenAI API access
- WordPress installation with REST API
- Google Docs API access
- Google Drive API access

### Development Environment
- Node.js 18+
- npm or yarn
- Docker (for containerization)
- Google Cloud SDK

---

## Installation

1. **Clone the Repository:**
   ```bash
   git clone [repository-url]
   cd appraisals-backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**
   ```bash
   # Create .env file with required variables
   cp .env.example .env
   ```

---

## Configuration

### Environment Variables

Required secrets in Google Cloud Secret Manager:
- `WORDPRESS_API_URL`: WordPress REST API endpoint
- `wp_username`: WordPress username
- `wp_app_password`: WordPress application password
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_VISION_CREDENTIALS`: Google Vision AI credentials
- `GOOGLE_DOCS_CREDENTIALS`: Google Docs API credentials

Additional variables:
- `GOOGLE_DOCS_TEMPLATE_ID`: Template document ID
- `GOOGLE_DRIVE_FOLDER_ID`: Output folder ID
- `PORT`: Server port (default: 8080)

### WordPress Configuration

Required ACF fields:
- `main`: Main artwork image
- `age`: Age-related image
- `signature`: Signature image
- `googlevision`: Gallery field for similar images
- Various text fields for metadata

---

## Deployment

1. **Build the Container:**
   ```bash
   docker build -t gcr.io/[PROJECT_ID]/appraisals-backend .
   ```

2. **Push to Container Registry:**
   ```bash
   docker push gcr.io/[PROJECT_ID]/appraisals-backend
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy appraisals-backend \
     --image gcr.io/[PROJECT_ID]/appraisals-backend \
     --platform managed \
     --region [REGION] \
     --allow-unauthenticated
   ```

---

## Usage

### Complete Appraisal Report

```bash
curl -X POST https://[SERVICE_URL]/complete-appraisal-report \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID"}'
```

### Generate PDF Report

```bash
curl -X POST https://[SERVICE_URL]/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "YOUR_POST_ID",
    "session_ID": "OPTIONAL_SESSION_ID"
  }'
```

---

## Testing

```bash
# Run tests
npm test

# Test specific endpoints
curl -X POST https://[SERVICE_URL]/complete-appraisal-report \
  -H "Content-Type: application/json" \
  -d '{"postId": "TEST_POST_ID"}'
```

---

## CI/CD Integration

The service uses Google Cloud Build for continuous integration and deployment:

1. Automated testing on pull requests
2. Container building and pushing
3. Deployment to Cloud Run
4. Post-deployment verification

---

## Troubleshooting

Common issues and solutions:

1. **WordPress Connection Issues:**
   - Check API credentials
   - Verify CORS settings
   - Test network connectivity

2. **Vision AI Errors:**
   - Verify API credentials
   - Check image format and size
   - Review quota limits

3. **PDF Generation Issues:**
   - Verify template document access
   - Check Google Drive permissions
   - Review image dimensions

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## License

MIT License - See LICENSE file for details