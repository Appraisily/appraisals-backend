# TODO: Implement Step-Specific Appraisal Processing

## Overview
Currently, the appraisal processing pipeline runs from start to finish without the ability to start from a specific step. This enhancement will allow us to restart failed processes from specific steps, skip unnecessary steps for special cases, and provide more flexibility in the workflow.

## Implementation Tasks

### 1. Backend API Modification (Main Backend)
- [ ] Update the `completeProcess` endpoint in `appraisal.controller.js` to accept a `startStep` parameter
- [ ] Add parameter validation to ensure only valid step names are accepted
- [ ] Modify the Pub/Sub message payload to include the `startStep` field
- [ ] Update API documentation to reflect the new parameter
- [ ] Add unit tests for the modified endpoint

### 2. Task Queue Processor Enhancement (Task Queue)
- [ ] Refactor `processAppraisal` in `appraisal.service.js` to use a step dictionary pattern
- [ ] Define constants for all step names (STEP_SET_VALUE, STEP_MERGE_DESCRIPTIONS, etc.)
- [ ] Update message parsing to extract the `startStep` parameter
- [ ] Implement logic to start execution from the specified step
- [ ] Add validation to ensure the step name is valid
- [ ] Enhance status updates to include current step information
- [ ] Add unit tests for step-specific processing

### 3. Error Handling Improvements
- [ ] Update error handling to store the failed step name
- [ ] Add recovery strategy for each step type
- [ ] Create a step dependency graph to validate step skipping
- [ ] Add logging for step transitions and failures

### 4. Frontend Integration (Optional)
- [ ] Add UI controls for administrators to restart processes from specific steps
- [ ] Create a process monitoring view showing current step status
- [ ] Add historical view of step execution times and failure rates

## Step Reference

Here's the complete list of steps in the appraisal process:

### Initial Steps (Frontend & Main Backend)
1. `STEP_SUBMIT_APPRAISAL`: User submits initial appraisal request with item details
2. `STEP_CREATE_RECORDS`: System creates initial records in Google Sheets and WordPress
3. `STEP_UPLOAD_IMAGES`: User uploads images of the item to be appraised
4. `STEP_PROCESS_IMAGES`: System analyzes images using Vision AI to identify item characteristics
5. `STEP_HUMAN_VALUATION`: Appraiser reviews item details and sets the appraisal value

### Task Queue Processing Steps
6. `STEP_TRIGGER_PROCESS`: Backend triggers the complete process by sending message to Pub/Sub
7. `STEP_SET_VALUE`: Task queue updates the appraisal value in Google Sheets
8. `STEP_MERGE_DESCRIPTIONS`: Task queue combines customer and AI descriptions using OpenAI
9. `STEP_GET_TYPE`: Task queue determines appraisal type (Regular, IRS, Insurance)
10. `STEP_UPDATE_WORDPRESS`: Task queue updates WordPress post with title, value, and type
11. `STEP_BUILD_REPORT`: Task queue generates the complete appraisal report in WordPress
12. `STEP_GENERATE_PDF`: Task queue creates PDF document from the appraisal report
13. `STEP_SEND_EMAIL`: Task queue sends notification email to customer
14. `STEP_COMPLETE`: Task queue marks appraisal as completed and moves record to completed sheet

## Sample Implementation Code

### Message Format for Task Queue
```json
{
  "type": "COMPLETE_APPRAISAL",
  "data": {
    "id": "123",
    "appraisalValue": "1500",
    "description": "Antique vase",
    "startStep": "STEP_BUILD_REPORT"  // Start from this step
  }
}
```

### Task Queue Service Enhancement
```javascript
// Constants for step names
const STEPS = {
  SET_VALUE: 'STEP_SET_VALUE',
  MERGE_DESCRIPTIONS: 'STEP_MERGE_DESCRIPTIONS',
  GET_TYPE: 'STEP_GET_TYPE',
  UPDATE_WORDPRESS: 'STEP_UPDATE_WORDPRESS',
  BUILD_REPORT: 'STEP_BUILD_REPORT',
  GENERATE_PDF: 'STEP_GENERATE_PDF',
  SEND_EMAIL: 'STEP_SEND_EMAIL',
  COMPLETE: 'STEP_COMPLETE'
};

// Step implementation mapping
async processAppraisal(id, value, description, userProvidedType = null, startStep = STEPS.SET_VALUE) {
  try {
    // Update initial status
    await this.updateStatus(id, 'Processing', `Starting appraisal workflow from step: ${startStep}`);

    // Define all processing steps
    const steps = {
      [STEPS.SET_VALUE]: async () => {
        await this.updateStatus(id, 'Processing', 'Setting appraisal value');
        await this.setAppraisalValue(id, value, description);
      },
      
      [STEPS.MERGE_DESCRIPTIONS]: async () => {
        await this.updateStatus(id, 'Analyzing', 'Merging customer and AI descriptions');
        return await this.mergeDescriptions(id, description);
      },
      
      [STEPS.GET_TYPE]: async () => {
        await this.updateStatus(id, 'Analyzing', 'Determining appraisal type');
        const spreadsheetType = await this.getAppraisalType(id);
        return userProvidedType || spreadsheetType;
      },
      
      [STEPS.UPDATE_WORDPRESS]: async (mergedDescription, appraisalType) => {
        await this.updateStatus(id, 'Updating', 'Setting title and metadata in WordPress');
        const result = await this.updateWordPress(id, value, mergedDescription, appraisalType);
        await this.sheetsService.updateValues(`P${id}`, [[result.publicUrl]]);
        return result;
      },
      
      [STEPS.BUILD_REPORT]: async (postId) => {
        await this.updateStatus(id, 'Generating', 'Building full appraisal report');
        await this.wordpressService.completeAppraisalReport(postId);
      },
      
      [STEPS.GENERATE_PDF]: async (postId, publicUrl) => {
        await this.updateStatus(id, 'Finalizing', 'Creating PDF document');
        const pdfResult = await this.finalize(id, postId, publicUrl);
        await this.updateStatus(id, 'Finalizing', `PDF created: ${pdfResult.pdfLink}`);
        return pdfResult;
      },
      
      [STEPS.SEND_EMAIL]: async (pdfLink, publicUrl) => {
        await this.updateStatus(id, 'Finalizing', 'Sending notification email');
        const customerData = await this.getCustomerData(id);
        return await this.emailService.sendAppraisalCompletedEmail(
          customerData.email,
          customerData.name,
          { pdfLink, appraisalUrl: publicUrl }
        );
      },
      
      [STEPS.COMPLETE]: async () => {
        await this.updateStatus(id, 'Completed', 'Appraisal process completed successfully');
        await this.complete(id);
      }
    };
    
    // Get the ordered list of steps
    const stepOrder = [
      STEPS.SET_VALUE,
      STEPS.MERGE_DESCRIPTIONS,
      STEPS.GET_TYPE,
      STEPS.UPDATE_WORDPRESS,
      STEPS.BUILD_REPORT,
      STEPS.GENERATE_PDF,
      STEPS.SEND_EMAIL,
      STEPS.COMPLETE
    ];
    
    // Find the starting index
    const startIndex = stepOrder.indexOf(startStep);
    if (startIndex === -1) {
      throw new Error(`Invalid step name: ${startStep}`);
    }
    
    // Execute the steps in sequence starting from the specified step
    let mergedDescription, appraisalType, wpResult, pdfResult;
    
    for (let i = startIndex; i < stepOrder.length; i++) {
      const currentStep = stepOrder[i];
      this.logger.info(`Executing step ${i+1}/${stepOrder.length}: ${currentStep}`);
      
      switch (currentStep) {
        case STEPS.SET_VALUE:
          await steps[currentStep]();
          break;
          
        case STEPS.MERGE_DESCRIPTIONS:
          mergedDescription = await steps[currentStep]();
          break;
          
        case STEPS.GET_TYPE:
          appraisalType = await steps[currentStep]();
          break;
          
        case STEPS.UPDATE_WORDPRESS:
          // If we're starting from this step, we need to ensure we have the required data
          if (startIndex === i && (!mergedDescription || !appraisalType)) {
            // Fetch the merged description if we don't have it
            if (!mergedDescription) {
              mergedDescription = await this.getMergedDescription(id);
            }
            // Fetch the appraisal type if we don't have it
            if (!appraisalType) {
              appraisalType = await this.getAppraisalType(id);
            }
          }
          wpResult = await steps[currentStep](mergedDescription, appraisalType);
          break;
          
        case STEPS.BUILD_REPORT:
          // If we're starting from this step, we need to ensure we have the post ID
          if (startIndex === i && !wpResult) {
            const postId = await this.getWordPressPostId(id);
            await steps[currentStep](postId);
          } else {
            await steps[currentStep](wpResult.postId);
          }
          break;
          
        case STEPS.GENERATE_PDF:
          // If we're starting from this step, ensure we have the required data
          if (startIndex === i && !wpResult) {
            const { postId, publicUrl } = await this.getWordPressDetails(id);
            pdfResult = await steps[currentStep](postId, publicUrl);
          } else {
            pdfResult = await steps[currentStep](wpResult.postId, wpResult.publicUrl);
          }
          break;
          
        case STEPS.SEND_EMAIL:
          // If we're starting from this step, ensure we have the required data
          if (startIndex === i && (!pdfResult || !wpResult)) {
            const { pdfLink } = pdfResult || await this.getPdfLink(id);
            const { publicUrl } = wpResult || await this.getWordPressDetails(id);
            await steps[currentStep](pdfLink, publicUrl);
          } else {
            await steps[currentStep](pdfResult.pdfLink, wpResult.publicUrl);
          }
          break;
          
        case STEPS.COMPLETE:
          await steps[currentStep]();
          break;
      }
    }
    
    this.logger.info(`Successfully processed appraisal ${id}`);
  } catch (error) {
    this.logger.error(`Error processing appraisal ${id}:`, error);
    await this.updateStatus(id, 'Failed', `Error: ${error.message}`);
    throw error;
  }
}
```

## Benefits
- Improved error recovery - allows restarting from failed steps
- Enhanced flexibility - skip steps that aren't needed for specific use cases
- Better observability - clear tracking of current process stage
- Reduced processing time - avoid reprocessing successful steps
- Simplified troubleshooting - isolate specific steps for debugging