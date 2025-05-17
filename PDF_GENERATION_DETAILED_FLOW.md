# PDF Generation Detailed Process Flow

This document provides a detailed technical flow of the PDF generation process, showing the interaction between different components and services.

## System Component Interaction

```mermaid
graph TB
    subgraph "Client Side"
        A[Client/Admin Request]
        Z[Download PDF]
    end
    
    subgraph "API Layer"
        B[Express API Endpoints]
        B1[/api/pdf/generate-pdf]
        B2[/api/pdf/generate-pdf-steps]
        B3[/api/pdf/steps]
        
        B --> B1
        B --> B2
        B --> B3
    end
    
    subgraph "WordPress Integration"
        C[WordPress API]
        C1[Post Data Retrieval]
        C2[ACF Field Updates]
        C3[Notes Updates]
        
        C --> C1
        C --> C2
        C --> C3
    end
    
    subgraph "Metadata Processing"
        D[Process Metadata]
        D1[Extract ACF Fields]
        D2[Decode HTML Entities]
        D3[Format Content]
        D4[Validate Required Fields]
        
        D --> D1
        D --> D2
        D --> D3
        D --> D4
    end
    
    subgraph "Google Integration"
        E[Google APIs]
        E1[Google Docs]
        E2[Google Drive]
        
        E --> E1
        E --> E2
        
        E1 --> E11[Create Document]
        E1 --> E12[Edit Content]
        E1 --> E13[Insert Images]
        
        E2 --> E21[Clone Template]
        E2 --> E22[Organize Files]
        E2 --> E23[Export PDF]
        E2 --> E24[Upload PDF]
    end
    
    subgraph "PDF Generation Steps"
        F[PDF Generation Process]
        F1[Fetch Post Data]
        F2[Process Metadata]
        F3[Get Template]
        F4[Clone Template]
        F5[Move to Folder]
        F6[Replace Placeholders]
        F7[Adjust Title]
        F8[Insert Main Image]
        F9[Insert Gallery]
        F10[Insert Specific Images]
        F11[Export PDF]
        F12[Upload PDF]
        F13[Update WordPress]
        
        F --> F1 --> F2 --> F3 --> F4 --> F5 --> F6 --> F7 --> F8 --> F9 --> F10 --> F11 --> F12 --> F13
    end
    
    subgraph "Error Handling"
        G[Error Mechanisms]
        G1[Step Logging]
        G2[Error Capture]
        G3[WordPress Error Notes]
        G4[Recovery Options]
        
        G --> G1
        G --> G2
        G --> G3
        G --> G4
    end
    
    A --> B
    B1 --> F
    C1 --> F1
    F2 --> D
    F3 --> E21
    F6 --> E12
    F8 --> E13
    F9 --> E13
    F10 --> E13
    F11 --> E23
    F12 --> E24
    F13 --> C2
    F13 --> C3
    F --> G
    F13 --> Z
```

## Detailed Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Endpoints
    participant Process as PDF Generator
    participant WP as WordPress API
    participant Docs as Google Docs
    participant Drive as Google Drive
    
    Client->>API: Request PDF generation
    API->>Process: Start PDF generation
    Process->>WP: Fetch post data
    WP-->>Process: Return post data, ACF fields, images
    
    Process->>Process: Process metadata
    Process->>Process: Validate fields
    
    Process->>Drive: Get template ID
    Drive-->>Process: Template ID
    
    Process->>Drive: Clone template
    Drive-->>Process: New document ID
    
    Process->>Drive: Move to folder
    
    Process->>Docs: Replace placeholders
    Process->>Docs: Adjust title format
    
    Process->>Docs: Insert main image
    Process->>Docs: Insert gallery images
    Process->>Docs: Insert signature, age images
    
    Process->>Drive: Export to PDF
    Drive-->>Process: PDF file content
    
    Process->>Drive: Upload PDF
    Drive-->>Process: Public link
    
    Process->>WP: Update ACF fields with links
    Process->>WP: Add processing notes
    
    Process-->>API: Return success with links
    API-->>Client: PDF generation complete
    
    Client->>Drive: Access PDF via link
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Start PDF Generation] --> B{Critical Error?}
    
    B -->|Yes| C[Log Error]
    B -->|No| D[Continue Process]
    
    C --> E[Add Error to Document]
    E --> F[Update WordPress with Error]
    F --> G[Return Error Response]
    
    D --> H{Step Complete?}
    H -->|Yes| I[Log Success]
    H -->|No| J[Retry Step]
    
    J --> K{Max Retries?}
    K -->|Yes| C
    K -->|No| D
    
    I --> L{More Steps?}
    L -->|Yes| M[Next Step]
    L -->|No| N[Process Complete]
    
    M --> B
    N --> O[Return Success Response]
```

## System Components Map

```mermaid
mindmap
  root((PDF Generation))
    API Layer
      Express Endpoints
      Route Handlers
      Authentication
    WordPress Integration
      REST API Client
      ACF Fields Handling
      Media Processing
    Google Integration
      Authentication
      Docs API
        Document Creation
        Content Editing
        Formatting
      Drive API
        Storage
        Permissions
        Export
    PDF Processing
      Templates
        Master Templates
        Dynamic Placeholders
        Format Rules
      Content Processing
        Metadata Extraction
        Content Formatting
        HTML Handling
      Image Handling
        Main Image
        Gallery
        Special Images
    Error Handling
      Logging
      Recovery
      Notifications
```

This detailed flow provides a comprehensive visualization of the entire PDF generation process in the appraisals backend system. 