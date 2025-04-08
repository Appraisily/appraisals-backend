# Appraisal Process Diagrams

## Complete Appraisal Process Flow

The appraisal process involves multiple steps across different systems and services. This diagram shows the complete flow from submission to completion:

```
Frontend                Main Backend                    Task Queue                    External Services
  |                          |                              |                                |
  | 1. SUBMIT_APPRAISAL      |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 2. CREATE_RECORDS           |                                |
  |                          |-------------------------------------------->| Google Sheets  |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  |                          |-------------------------------------------->| WordPress API  |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  | 3. UPLOAD_IMAGES         |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 4. PROCESS_IMAGES           |                                |
  |                          |-------------------------------------------->| Vision AI      |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  | 5. HUMAN_VALUATION       |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 6. TRIGGER_PROCESS          |                                |
  |                          |----------------------------->|                                |
  |                          |                              |                                |
  |                          |                              | 7. SET_VALUE                   |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 8. MERGE_DESCRIPTIONS          |
  |                          |                              |-------------------------------->| OpenAI API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 9. GET_TYPE                    |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 10. UPDATE_WORDPRESS           |
  |                          |                              |-------------------------------->| WordPress API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 11. FETCH_VALUER_DATA          |
  |                          |                              |-------------------------------->| Valuer Agent
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 12. GENERATE_VISUALIZATION     |
  |                          |                              |-------------------------------->| Templates
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 13. BUILD_REPORT               |
  |                          |                              |-------------------------------->| WordPress API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 14. GENERATE_PDF               |
  |                          |                              |-------------------------------->| Google Docs API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 15. SEND_EMAIL                 |
  |                          |                              |-------------------------------->| SendGrid API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 16. COMPLETE                   |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  | 17. VIEW_RESULT          |                              |                                |
  |<-------------------------|                              |                                |
  |                          |                              |                                |
```

## Step Description

| Step | Name | Description |
|------|------|-------------|
| 1 | SUBMIT_APPRAISAL | User submits initial appraisal request with item details |
| 2 | CREATE_RECORDS | System creates initial records in Google Sheets and WordPress |
| 3 | UPLOAD_IMAGES | User uploads images of the item to be appraised |
| 4 | PROCESS_IMAGES | System analyzes images using Vision AI to identify item characteristics |
| 5 | HUMAN_VALUATION | Appraiser reviews item details and sets the appraisal value |
| 6 | TRIGGER_PROCESS | Backend triggers the complete process by sending message to Task Queue |
| 7 | SET_VALUE | Task queue updates the appraisal value in Google Sheets |
| 8 | MERGE_DESCRIPTIONS | Task queue combines customer and AI descriptions using OpenAI |
| 9 | GET_TYPE | Task queue determines appraisal type (Regular, IRS, Insurance) |
| 10 | UPDATE_WORDPRESS | Task queue updates WordPress post with title, value, and type |
| 11 | FETCH_VALUER_DATA | Task queue retrieves specialized valuation data |
| 12 | GENERATE_VISUALIZATION | Task queue creates visualization of appraisal data |
| 13 | BUILD_REPORT | Task queue generates the complete appraisal report in WordPress |
| 14 | GENERATE_PDF | Task queue creates PDF document from the appraisal report |
| 15 | SEND_EMAIL | Task queue sends notification email to customer |
| 16 | COMPLETE | Task queue marks appraisal as completed and finalizes record |
| 17 | VIEW_RESULT | User views the completed appraisal report |

## PDF Generation Process Flow

The PDF generation step (14) is itself a multi-step process:

```
Main Backend                 Google Services               WordPress
    |                              |                            |
    | 1. FETCH_POST_DATA          |                            |
    |------------------------------------------------------------>|
    |<------------------------------------------------------------|
    |                              |                            |
    | 2. PROCESS_METADATA         |                            |
    |                              |                            |
    | 3. GET_TEMPLATE             |                            |
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
    | 10. INSERT_SPECIFIC_IMAGES  |                            |
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

## Reprocessing Flow

The system allows for selective reprocessing of specific steps if issues are identified. The reprocessing flow works as follows:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Completed Appraisal Dashboard                          │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Processing Steps Panel                             │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │  enhance_description │  │  update_wordpress  │  │  generate_html     │     │
│  │                     │  │                    │  │                    │     │
│  │  Last run: 04/02/23 │  │  Last run: 04/02/23│  │  Last run: 04/02/23│     │
│  │                     │  │                    │  │                    │     │
│  │  [Reprocess]        │  │  [Reprocess]       │  │  [Reprocess]       │     │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘     │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐                             │
│  │  generate_pdf       │  │  regenerate_stats  │                             │
│  │                     │  │                    │                             │
│  │  Last run: 04/02/23 │  │  Last run: 04/02/23│                             │
│  │                     │  │                    │                             │
│  │  [Reprocess]        │  │  [Reprocess]       │                             │
│  └────────────────────┘  └────────────────────┘                             │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Reprocess Confirmation Modal                          │
│                                                                              │
│  Are you sure you want to reprocess "generate_pdf"?                          │
│                                                                              │
│  This will regenerate the PDF document based on the current                  │
│  HTML content. The old PDF will be replaced.                                 │
│                                                                              │
│  [Cancel]                            [Confirm]                               │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Processing Step Request                             │
│                                                                              │
│  POST /api/appraisals/123/reprocess-step                                     │
│  { "stepName": "generate_pdf" }                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Backend Processing                                 │
│                                                                              │
│  1. Retrieve WordPress post ID from appraisal ID                             │
│  2. Execute step-specific function                                           │
│  3. Log reprocessing history with user, timestamp, status                    │
│  4. Return updated status and result                                         │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             Success Notification                              │
│                                                                              │
│ ✓ Successfully reprocessed: Generate PDF                                     │
│   New PDF: https://drive.google.com/file/d/1234/view                         │
│                                                                              │
│ [View PDF]                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Step Dependencies and Reprocessing Logic

When reprocessing steps, the system needs to handle dependencies correctly. Here's how each reprocessable step works:

| Step Name | Action | Dependencies | Output |
|-----------|--------|--------------|--------|
| enhance_description | Merges customer and AI descriptions | None | Updated description |
| update_wordpress | Updates WordPress metadata/content | enhance_description | Updated WP post |
| generate_html | Creates HTML report content | update_wordpress | HTML content |
| generate_pdf | Creates PDF document | generate_html | PDF document |
| regenerate_stats | Updates statistics and visualizations | update_wordpress | Visualization data |

### Reprocessing Examples

1. **Regenerate PDF Only**
   - Only creates a new PDF from existing HTML content
   - Useful when PDF template has been updated

2. **Regenerate HTML and PDF**
   - Regenerates HTML content and then creates new PDF
   - Useful when HTML template has been updated

3. **Full Reprocessing**
   - Starts from enhance_description
   - Regenerates every step in sequence
   - Useful when significant changes are needed

This architecture allows for flexible reprocessing of any step in the appraisal workflow while maintaining data integrity and dependencies. 