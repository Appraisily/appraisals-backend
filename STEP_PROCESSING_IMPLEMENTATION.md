# Step-by-Step Processing Implementation

## Complete Appraisal Process Flow

```
Frontend                Main Backend                    Task Queue                    External Services
  |                          |                              |                                |
  | 1. STEP_SUBMIT_APPRAISAL |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 2. STEP_CREATE_RECORDS      |                                |
  |                          |-------------------------------------------->| Google Sheets  |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  |                          |-------------------------------------------->| WordPress API  |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  | 3. STEP_UPLOAD_IMAGES    |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 4. STEP_PROCESS_IMAGES      |                                |
  |                          |-------------------------------------------->| Vision AI      |
  |                          |<--------------------------------------------|                |
  |                          |                              |                                |
  | 5. STEP_HUMAN_VALUATION  |                              |                                |
  |------------------------->|                              |                                |
  |                          |                              |                                |
  |                          | 6. STEP_TRIGGER_PROCESS     |                                |
  |                          |----------------------------->|                                |
  |                          |                              |                                |
  |                          |                              | 7. STEP_SET_VALUE             |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 8. STEP_MERGE_DESCRIPTIONS    |
  |                          |                              |-------------------------------->| OpenAI API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 9. STEP_GET_TYPE              |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 10. STEP_UPDATE_WORDPRESS     |
  |                          |                              |-------------------------------->| WordPress API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 11. STEP_FETCH_VALUER_DATA    |
  |                          |                              |-------------------------------->| Valuer Agent
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 12. STEP_GENERATE_VISUALIZATION|
  |                          |                              |-------------------------------->| Templates
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 13. STEP_BUILD_REPORT         |
  |                          |                              |-------------------------------->| WordPress API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 14. STEP_GENERATE_PDF         |
  |                          |                              |-------------------------------->| Google Docs API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 15. STEP_SEND_EMAIL           |
  |                          |                              |-------------------------------->| SendGrid API
  |                          |                              |<--------------------------------|
  |                          |                              |                                |
  |                          |                              | 16. STEP_COMPLETE             |
  |                          |                              |-------------------------------->| Google Sheets
  |                          |                              |<--------------------------------|
  | 17. STEP_VIEW_RESULT     |                              |                                |
  |<-------------------------|                              |                                |
  |                          |                              |                                |
```

## Step-by-Step Implementation

### 1. Step Definition Constants

```javascript
const STEPS = {
  SUBMIT_APPRAISAL: 'STEP_SUBMIT_APPRAISAL',
  CREATE_RECORDS: 'STEP_CREATE_RECORDS',
  UPLOAD_IMAGES: 'STEP_UPLOAD_IMAGES',
  PROCESS_IMAGES: 'STEP_PROCESS_IMAGES',
  HUMAN_VALUATION: 'STEP_HUMAN_VALUATION',
  TRIGGER_PROCESS: 'STEP_TRIGGER_PROCESS',
  SET_VALUE: 'STEP_SET_VALUE',
  MERGE_DESCRIPTIONS: 'STEP_MERGE_DESCRIPTIONS',
  GET_TYPE: 'STEP_GET_TYPE',
  UPDATE_WORDPRESS: 'STEP_UPDATE_WORDPRESS',
  FETCH_VALUER_DATA: 'STEP_FETCH_VALUER_DATA',
  GENERATE_VISUALIZATION: 'STEP_GENERATE_VISUALIZATION',
  BUILD_REPORT: 'STEP_BUILD_REPORT',
  GENERATE_PDF: 'STEP_GENERATE_PDF',
  SEND_EMAIL: 'STEP_SEND_EMAIL',
  COMPLETE: 'STEP_COMPLETE',
  VIEW_RESULT: 'STEP_VIEW_RESULT'
};
```

### 2. Process Flow Control

```javascript
async processAppraisal(id, value, description, startStep = STEPS.SET_VALUE) {
  // Define the ordered steps
  const stepOrder = [
    STEPS.SET_VALUE,
    STEPS.MERGE_DESCRIPTIONS,
    STEPS.GET_TYPE,
    STEPS.UPDATE_WORDPRESS,
    STEPS.FETCH_VALUER_DATA,
    STEPS.GENERATE_VISUALIZATION,
    STEPS.BUILD_REPORT,
    STEPS.GENERATE_PDF,
    STEPS.SEND_EMAIL,
    STEPS.COMPLETE
  ];
  
  // Find starting index
  const startIndex = stepOrder.indexOf(startStep);
  if (startIndex === -1) {
    throw new Error(`Invalid step name: ${startStep}`);
  }
  
  // Execute steps in sequence starting from specified step
  for (let i = startIndex; i < stepOrder.length; i++) {
    const currentStep = stepOrder[i];
    await this.updateStatus(id, 'Processing', `Executing step: ${currentStep}`);
    await this.executeStep(currentStep, id, value, description);
  }
}
```

### 3. Step-Specific Implementation

```javascript
async executeStep(step, id, value, description) {
  switch (step) {
    case STEPS.SET_VALUE:
      await this.setAppraisalValue(id, value, description);
      break;
    
    case STEPS.MERGE_DESCRIPTIONS:
      const mergedDescription = await this.mergeDescriptions(id, description);
      return mergedDescription;
    
    case STEPS.GET_TYPE:
      const spreadsheetType = await this.getAppraisalType(id);
      return spreadsheetType;
    
    case STEPS.UPDATE_WORDPRESS:
      // Get merged description and type if not already available
      const mergedDesc = await this.getMergedDescription(id);
      const appraisalType = await this.getAppraisalType(id);
      
      const { postId, publicUrl } = await this.updateWordPress(id, value, mergedDesc, appraisalType);
      await this.sheetsService.updateValues(`P${id}`, [[publicUrl]]);
      return { postId, publicUrl };
      
    case STEPS.FETCH_VALUER_DATA:
      // Get merged description and value
      const mergedText = await this.getMergedDescription(id);
      const valuerData = await this.fetchValuerData(id, mergedText, value);
      await this.updateWordPressMetadata(id, 'valuer_agent_data', JSON.stringify(valuerData));
      return valuerData;
    
    case STEPS.GENERATE_VISUALIZATION:
      const valuerStats = await this.getValuerStats(id);
      const appraisalData = await this.getAppraisalData(id);
      try {
        await this.generateAndStoreVisualizations(id, appraisalData, valuerStats);
      } catch (error) {
        console.error('Visualization generation error:', error);
        // We can still continue to other steps even if visualization fails
      }
      break;
    
    case STEPS.BUILD_REPORT:
      const wpPostId = await this.getWordPressPostId(id);
      await this.wordpressService.completeAppraisalReport(wpPostId);
      break;
    
    case STEPS.GENERATE_PDF:
      const wpDetails = await this.getWordPressDetails(id);
      const pdfResult = await this.generatePDF(id, wpDetails.postId, wpDetails.publicUrl);
      return pdfResult;
    
    case STEPS.SEND_EMAIL:
      const pdfData = await this.getPdfData(id);
      const customerData = await this.getCustomerData(id);
      const emailResult = await this.sendEmail(customerData, pdfData);
      return emailResult;
    
    case STEPS.COMPLETE:
      await this.complete(id);
      break;
  }
}
```

### 4. API Endpoint for Step Selection

```javascript
router.post('/complete-process-from-step', async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description, appraisalType, startStep } = req.body;
  
  if (!appraisalValue || !description) {
    return res.status(400).json({ 
      success: false, 
      message: 'appraisalValue and description are required.' 
    });
  }
  
  try {
    const message = {
      type: 'COMPLETE_APPRAISAL',
      data: {
        id,
        appraisalValue,
        description,
        ...(appraisalType && { appraisalType }),
        ...(startStep && { startStep })
      }
    };
    
    await pubsubService.publishMessage('appraisal-tasks', message);
    
    res.json({ 
      success: true, 
      message: `Appraisal process started from step: ${startStep || 'STEP_SET_VALUE'}` 
    });
  } catch (error) {
    // Error handling...
  }
});
```

## PDF Generation Step-by-Step Process

The PDF generation process can also be broken down into steps to allow more granular control and better error handling:

### PDF Generation Steps

1. `STEP_FETCH_POST_DATA`: Retrieve WordPress post data including metadata and ACF fields
2. `STEP_CLONE_TEMPLATE`: Clone the appropriate template document based on appraisal type
3. `STEP_PROCESS_METADATA`: Process and format metadata for insertion into document
4. `STEP_INSERT_CONTENT`: Insert text content into the document
5. `STEP_INSERT_IMAGES`: Insert main image and gallery images into the document 
6. `STEP_FORMAT_DOCUMENT`: Apply formatting like font sizes, alignment, etc.
7. `STEP_EXPORT_PDF`: Export the document to PDF format
8. `STEP_UPLOAD_PDF`: Upload the PDF to storage and get a shareable link
9. `STEP_STORE_LINKS`: Store the PDF links in Google Sheets and WordPress

This approach provides the following benefits:
- The ability to restart at any step if one fails
- Better diagnostic information about which step is failing
- The option to skip steps for debugging or special cases
- Clearer separation of concerns in the code