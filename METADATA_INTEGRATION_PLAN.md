# Integration Plan: Adding Metadata Statistics and Appraisal Summary Card to Google Docs Template

## Current Process Overview

Based on the code audit, the current Google Docs integration works as follows:

1. The system uses a template document in Google Docs (`GOOGLE_DOCS_TEMPLATE_ID` env variable)
2. When a PDF is requested, the template is cloned
3. Metadata is collected from WordPress fields (ACF)
4. Placeholders in the document (format: `{{placeholder_name}}`) are replaced with actual content
5. Images are inserted at specific placeholder locations
6. A gallery is added if there are similar images from Google Vision
7. The document is exported to PDF

## Metadata Statistics and Appraisal Summary Integration Plan

### 1. Template Preparation

1. **Add Placeholder Sections in Template**: 
   - Add a `{{statistics_summary}}` placeholder in the Google Docs template
   - Add a `{{appraisal_summary}}` placeholder for the summary card
   - Place these at the beginning of the document for visibility

### 2. Data Collection and Formatting

1. **Statistics Data Processing**: 
   - The system already collects statistics in `processJustificationMetadata()` function (metadata.js, Line 575-625)
   - This function already creates `statistics_summary` with HTML structure
   - No change needed to data collection, already handled

2. **Appraisal Summary Panel**:
   - Create a function to generate an appraisal summary from the existing HTML template:

```javascript
// New function in services/pdf/metadata/processing.js

function generateAppraisalSummary(metadata) {
  // Create a simplified, text-only version of the summary panel
  const summary = `
APPRAISAL SUMMARY

Title: ${metadata.title || 'Untitled'}
Creator: ${metadata.creator || 'Unknown Artist'}
Object Type: ${metadata.object_type || 'Art Object'}
Period/Age: ${metadata.estimated_age || '20th Century'}
Medium: ${metadata.medium || 'Mixed Media'}
Condition: ${metadata.condition_summary || 'Good'}

Appraised Value: ${metadata.appraisal_value || 'Not Provided'}

Market Analysis:
- Market Demand: ${metadata.market_demand || 'N/A'}%
- Rarity: ${metadata.rarity || 'N/A'}%
- Condition Score: ${metadata.condition_score || 'N/A'}%

${metadata.statistics_summary ? metadata.statistics_summary.replace(/<[^>]*>/g, '') : ''}
  `;
  
  return summary;
}
```

### 3. Integration into Document Generation Process

1. **Update Metadata Processing**:
   - Modify `processMetadata` function in `services/pdf/metadata/processing.js` to add the summary:

```javascript
// Add to processMetadata function
metadata.appraisal_summary = generateAppraisalSummary(metadata);
```

2. **Ensure Statistics Summary is Available**:
   - In `routes/pdf.js`, after the metadata is processed, check if statistics data is available:

```javascript
// Add to generate-pdf route after metadata processing
if (!metadata.statistics_summary && postData.acf?.statistics_summary) {
  metadata.statistics_summary = stripHtml(postData.acf.statistics_summary);
}
```

### 4. Update Placeholder Replacement

The current placeholder replacement system already handles the replacement process, so no changes needed to this mechanism. However, we should:

1. **Format Statistics for Document**:
   - Strip HTML from statistics summary for Google Docs:

```javascript
// In processMetadata, modify how statistics_summary is handled:
if (postData.acf?.statistics_summary) {
  const rawStatisticsSummary = postData.acf.statistics_summary;
  // For web display (HTML)
  metadata.statistics_summary_html = rawStatisticsSummary;
  // For Google Docs (plain text)
  metadata.statistics_summary = stripHtml(rawStatisticsSummary);
}
```

### 5. Testing Implementation

1. **Test Statistics Integration**:
   - Update a test document template with the new placeholders
   - Run a test appraisal with real data
   - Verify the statistics summary appears correctly
   - Ensure proper formatting without HTML artifacts

2. **Test Appraisal Summary Card**:
   - Verify the summary card appears at the intended location
   - Check that all fields are populated correctly
   - Test with various data combinations (missing fields, long content)

### 6. Fallbacks and Error Handling

1. **Handle Missing Statistics**:
   - If statistics data is not available, provide a fallback message:

```javascript
// In routes/pdf.js
if (!metadata.statistics_summary) {
  metadata.statistics_summary = 'Market statistics data not available for this item.';
}
```

2. **Handle Formatting Issues**:
   - Ensure the summary is properly formatted even with missing data:

```javascript
// Safe accessors in generateAppraisalSummary
const marketDemand = metadata.market_demand ? `${metadata.market_demand}%` : 'Not Available';
```

## Implementation Sequence

1. Update the Google Docs template with new placeholders
2. Add the `generateAppraisalSummary` function
3. Modify the metadata processing to include statistics and summary
4. Test with various real-world scenarios
5. Deploy the updated code

## Benefits of This Approach

1. **Minimal Code Changes**: Leverages existing placeholder replacement mechanism
2. **Reuses Existing Data**: The statistics data is already generated and stored
3. **Text-Based Solution**: Avoids complex HTML-to-Docs formatting issues
4. **Consistent Experience**: Summary in PDF matches web display
5. **Graceful Fallbacks**: Works even with incomplete data

## Future Enhancements

1. **Rich Formatting**: Investigate adding styled tables to the Google Docs template
2. **Charts and Visualizations**: Create image-based charts for the statistics section
3. **Interactive Elements**: Consider exporting interactive elements as static images
4. **Template Variations**: Create different templates based on appraisal type