# Step-by-Step PDF Generation

## PDF Generation Process Flow

```
Main Backend                 Google Services               WordPress
    |                              |                            |
    | 1. FETCH_POST_DATA          |                            |
    |------------------------------------------------------------>|
    |<------------------------------------------------------------|
    |                              |                            |
    | 2. PROCESS_METADATA         |                            |
    |                              |                            |
    | 3. GET_TEMPLATE              |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 4. CLONE_TEMPLATE           |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 5. MOVE_TO_FOLDER           |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 6. REPLACE_PLACEHOLDERS     |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 7. ADJUST_TITLE             |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 8. INSERT_MAIN_IMAGE        |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 9. INSERT_GALLERY           |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 10. INSERT_SPECIFIC_IMAGES   |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 11. EXPORT_PDF              |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 12. UPLOAD_PDF              |                            |
    |----------------------------->|                            |
    |<-----------------------------|                            |
    |                              |                            |
    | 13. UPDATE_WORDPRESS        |                            |
    |------------------------------------------------------------>|
    |<------------------------------------------------------------|
    |                              |                            |
```

## Step Descriptions

### 1. FETCH_POST_DATA
- **Description**: Retrieves all necessary data about the appraisal from WordPress.
- **Inputs**: WordPress post ID
- **Outputs**: Post title, content, metadata, and image URLs
- **Potential Issues**: WordPress API connectivity, post not found

### 2. PROCESS_METADATA
- **Description**: Processes and validates the raw metadata from WordPress for use in the PDF.
- **Inputs**: Raw post data
- **Outputs**: Structured metadata object, validation results
- **Potential Issues**: Missing required fields, malformed data

### 3. GET_TEMPLATE
- **Description**: Determines the appropriate template based on appraisal type.
- **Inputs**: Appraisal type
- **Outputs**: Google Docs template ID
- **Potential Issues**: Template not found for specified type

### 4. CLONE_TEMPLATE
- **Description**: Creates a new Google Doc from the template.
- **Inputs**: Template ID
- **Outputs**: New document ID and link
- **Potential Issues**: Google API permissions, rate limits

### 5. MOVE_TO_FOLDER
- **Description**: Moves the cloned document to the appropriate Google Drive folder.
- **Inputs**: Document ID, folder ID
- **Outputs**: Updated document location
- **Potential Issues**: Folder permissions, folder not found

### 6. REPLACE_PLACEHOLDERS
- **Description**: Replaces all placeholders in the document with actual data.
- **Inputs**: Document ID, structured metadata
- **Outputs**: Updated document with placeholders replaced
- **Potential Issues**: Missing placeholders, text formatting issues

### 7. ADJUST_TITLE
- **Description**: Adjusts the title font size based on title length.
- **Inputs**: Document ID, title text
- **Outputs**: Document with appropriately sized title
- **Potential Issues**: Title formatting, special characters

### 8. INSERT_MAIN_IMAGE
- **Description**: Inserts the main appraisal image into the document.
- **Inputs**: Document ID, main image URL
- **Outputs**: Document with main image
- **Potential Issues**: Image access, placeholder not found, image too large

### 9. INSERT_GALLERY
- **Description**: Inserts multiple gallery images in a grid layout.
- **Inputs**: Document ID, gallery image URLs
- **Outputs**: Document with gallery section
- **Potential Issues**: Too many images, gallery placeholder not found

### 10. INSERT_SPECIFIC_IMAGES
- **Description**: Inserts specialized images like age evidence or signature.
- **Inputs**: Document ID, specialized image URLs
- **Outputs**: Document with specialized images
- **Potential Issues**: Image placeholders not found, missing images

### 11. EXPORT_PDF
- **Description**: Exports the Google Doc as a PDF file.
- **Inputs**: Document ID
- **Outputs**: PDF buffer
- **Potential Issues**: Large documents, Google API timeouts

### 12. UPLOAD_PDF
- **Description**: Uploads the PDF to Google Drive and creates a shareable link.
- **Inputs**: PDF buffer, filename, folder ID
- **Outputs**: Shareable PDF link
- **Potential Issues**: Storage limits, permission issues

### 13. UPDATE_WORDPRESS
- **Description**: Updates WordPress with the PDF and document links.
- **Inputs**: Post ID, PDF link, document link
- **Outputs**: Updated WordPress post
- **Potential Issues**: WordPress API connectivity, ACF field access

## Using the Step-by-Step API

### Getting Available Steps
```
GET /api/pdf/steps
```

Response:
```json
{
  "success": true,
  "steps": [
    "STEP_FETCH_POST_DATA",
    "STEP_PROCESS_METADATA",
    "STEP_GET_TEMPLATE",
    "STEP_CLONE_TEMPLATE",
    "STEP_MOVE_TO_FOLDER",
    "STEP_REPLACE_PLACEHOLDERS",
    "STEP_ADJUST_TITLE",
    "STEP_INSERT_MAIN_IMAGE",
    "STEP_INSERT_GALLERY",
    "STEP_INSERT_SPECIFIC_IMAGES",
    "STEP_EXPORT_PDF",
    "STEP_UPLOAD_PDF",
    "STEP_UPDATE_WORDPRESS"
  ],
  "defaultOrder": [
    "STEP_FETCH_POST_DATA",
    "STEP_PROCESS_METADATA",
    "STEP_GET_TEMPLATE",
    "STEP_CLONE_TEMPLATE",
    "STEP_MOVE_TO_FOLDER",
    "STEP_REPLACE_PLACEHOLDERS",
    "STEP_ADJUST_TITLE",
    "STEP_INSERT_MAIN_IMAGE",
    "STEP_INSERT_GALLERY",
    "STEP_INSERT_SPECIFIC_IMAGES",
    "STEP_EXPORT_PDF",
    "STEP_UPLOAD_PDF",
    "STEP_UPDATE_WORDPRESS"
  ]
}
```

### Generating PDF Starting at a Specific Step
```
POST /api/pdf/generate-pdf-steps
Content-Type: application/json

{
  "postId": "123456",
  "session_ID": "optional-session-id",
  "startStep": "STEP_REPLACE_PLACEHOLDERS",
  "options": {
    "skipImageInserts": false
  }
}
```

Response:
```json
{
  "success": true,
  "message": "PDF generated successfully.",
  "pdfLink": "https://drive.google.com/file/d/1234/view",
  "docLink": "https://docs.google.com/document/d/5678/edit",
  "steps": [
    {
      "time": "2025-04-01T17:10:05.123Z",
      "level": "info",
      "message": "Starting PDF generation for post 123456"
    },
    {
      "time": "2025-04-01T17:10:06.234Z",
      "level": "info",
      "message": "Executing step: STEP_REPLACE_PLACEHOLDERS"
    },
    ...
  ]
}
```

## Common Use Cases

### Regenerating Just the PDF from an Existing Document
```json
{
  "postId": "123456",
  "startStep": "STEP_EXPORT_PDF"
}
```

### Updating Only the Placeholders in an Existing Document
```json
{
  "postId": "123456",
  "startStep": "STEP_REPLACE_PLACEHOLDERS",
  "options": {
    "skipImageInserts": true
  }
}
```

### Creating a Completely New Document from Scratch
```json
{
  "postId": "123456",
  "startStep": "STEP_FETCH_POST_DATA"
}
```