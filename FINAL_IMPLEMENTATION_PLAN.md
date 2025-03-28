# Final Implementation Plan: Statistics & Appraisal Card Integration

## Overview
This document outlines the complete implementation plan for integrating the appraisal summary card and statistics section into the appraisal generation process. The approach uses placeholder containers in the Google Docs template with dynamic content generation in code.

## Phase 1: Template Preparation

### Template Modifications
1. Create a backup copy of the current production template
2. Add container placeholders at strategic locations:
   - `{{appraisal_card}}` - After the title section
   - `{{statistics_section}}` - After the "Final Appraisal Value" section
3. Update the Table of Contents to include a new entry:
   - "Market Statistics Analysis" - After "Final Appraisal Value"
4. Save the updated template and note the new template ID

### Template Testing
1. Verify that the template loads correctly with the new placeholders
2. Ensure the Table of Contents links to the correct section (even though empty)
3. Save the final template ID for configuration

## Phase 2: Code Implementation

### 1. Create Formatter Utilities

Create a new file: `services/pdf/formatters.js`

```javascript
// formatters.js - Utility functions for generating formatted content

/**
 * Builds a formatted appraisal summary card
 * @param {Object} metadata - Appraisal metadata
 * @returns {string} - Formatted HTML for Google Docs
 */
function buildAppraisalCard(metadata) {
  // Default values and data validation
  const title = metadata.title || 'Untitled';
  const creator = metadata.creator || 'Unknown Artist';
  const objectType = metadata.object_type || 'Art Object';
  const estimatedAge = metadata.estimated_age || 'Unknown';
  const medium = metadata.medium || 'Unknown';
  const condition = metadata.condition_summary || 'Not assessed';
  const value = metadata.appraisal_value || 'Not determined';
  
  // Format percentages with % symbol if needed
  const marketDemand = formatPercentage(metadata.market_demand);
  const rarity = formatPercentage(metadata.rarity);
  const conditionScore = formatPercentage(metadata.condition_score);
  
  // Build the HTML structure
  return `
    <table style="width:100%; border-collapse:collapse; margin-bottom:20pt; border:1pt solid #CCCCCC;">
      <tr>
        <td colspan="4" style="background-color:#3182CE; color:white; padding:8pt; font-weight:bold; font-size:14pt; text-align:center;">
          APPRAISAL SUMMARY
        </td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Item Title:</td>
        <td colspan="3" style="padding:8pt; border:1pt solid #DDDDDD;">${title}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Artist/Creator:</td>
        <td colspan="3" style="padding:8pt; border:1pt solid #DDDDDD;">${creator}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Object Type:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${objectType}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Period/Age:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${estimatedAge}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Medium:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${medium}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Condition:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${condition}</td>
      </tr>
      <tr>
        <td colspan="4" style="background-color:#F0F7FF; padding:10pt; text-align:center; border:1pt solid #DDDDDD;">
          <div style="font-weight:bold; font-size:12pt; margin-bottom:5pt;">APPRAISED VALUE</div>
          <div style="font-weight:bold; font-size:16pt; color:#2C5282;">${value}</div>
        </td>
      </tr>
    </table>
    
    <table style="width:100%; border-collapse:collapse; margin-bottom:15pt;">
      <tr>
        <td colspan="3" style="padding:8pt; font-weight:bold; font-size:12pt; border-bottom:1pt solid #DDDDDD;">
          MARKET METRICS
        </td>
      </tr>
      <tr>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Market Demand</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F0F7FF; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #3182CE; text-align:center;">
            ${marketDemand}
          </div>
        </td>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Rarity</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F5F0FF; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #805AD5; text-align:center;">
            ${rarity}
          </div>
        </td>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Condition Score</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F0FFF4; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #38A169; text-align:center;">
            ${conditionScore}
          </div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Builds a formatted statistics section
 * @param {Object} statistics - Statistics data
 * @returns {string} - Formatted HTML for Google Docs
 */
function buildStatisticsSection(statistics) {
  // Default values and data validation
  const count = statistics?.count || 'N/A';
  const mean = statistics?.mean ? formatCurrency(statistics.mean) : 'N/A';
  const percentile = statistics?.percentile || 'N/A';
  const confidenceLevel = statistics?.confidence_level || 'Low';
  const summaryText = statistics?.summary_text || 'No market statistics are available for this item.';
  
  return `
    <h1 style="color:#2C5282; font-size:16pt; margin-top:24pt; margin-bottom:12pt;">Market Statistics Analysis</h1>
    
    <table style="width:100%; border-collapse:collapse; border:1pt solid #DDDDDD; margin-bottom:15pt;">
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Sample Size:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${count}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Average Price:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${mean}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Your Value Percentile:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${percentile}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Market Confidence:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${confidenceLevel}</td>
      </tr>
    </table>
    
    <p style="line-height:1.5; text-align:justify; margin-bottom:15pt;">${summaryText}</p>
  `;
}

/**
 * Format a value as a percentage, adding % if needed
 * @param {string|number} value - The percentage value
 * @returns {string} - Formatted percentage
 */
function formatPercentage(value) {
  if (!value && value !== 0) return 'N/A';
  
  // Convert to string and trim
  const strValue = String(value).trim();
  
  // Check if it already has a % symbol
  if (strValue.endsWith('%')) {
    return strValue;
  }
  
  // Try to parse as a number
  const numValue = parseFloat(strValue);
  if (isNaN(numValue)) {
    return 'N/A';
  }
  
  // Return with % symbol
  return `${numValue}%`;
}

/**
 * Format a value as currency
 * @param {string|number} value - The monetary value
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  if (!value && value !== 0) return 'N/A';
  
  // Try to parse as a number
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
  
  if (isNaN(numValue)) {
    return 'N/A';
  }
  
  // Format as USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

module.exports = {
  buildAppraisalCard,
  buildStatisticsSection,
  formatPercentage,
  formatCurrency
};
```

### 2. Extend Metadata Processing

Update `services/pdf/metadata/processing.js` to prepare data for the new sections:

```javascript
// Add to the existing metadata processing function
function prepareMetadataForTemplate(metadata, statisticsData) {
  // Process existing metadata
  const enhancedMetadata = { ...metadata };
  
  // Format statistics data if available
  if (statisticsData) {
    enhancedMetadata.statistics = {
      count: statisticsData.count || 0,
      mean: statisticsData.average_price || 0,
      percentile: statisticsData.percentile || 'N/A',
      confidence_level: statisticsData.confidence_level || 'Low',
      summary_text: metadata.statistics_summary || 
        'Market analysis data is not available for this item.'
    };
  } else {
    enhancedMetadata.statistics = {
      count: 'N/A',
      mean: 'N/A',
      percentile: 'N/A',
      confidence_level: 'Low',
      summary_text: 'No market statistics are available for this item.'
    };
  }
  
  return enhancedMetadata;
}
```

### 3. Update Placeholder Replacement Logic

Modify `services/pdf/documentUtils.js` to handle the special container placeholders:

```javascript
// Import the formatters
const { 
  buildAppraisalCard, 
  buildStatisticsSection 
} = require('./formatters');

// Modify the existing replacePlaceholdersInDocument function
async function replacePlaceholdersInDocument(docs, documentId, data) {
  try {
    console.log('Starting placeholder replacement');
    
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const requests = [];
    
    // Process special container placeholders
    await handleContainerPlaceholders(docs, documentId, data);
    
    // Process regular placeholders (existing code)
    // ...
    
    // Execute batch update for regular placeholders
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: { requests },
      });
      console.log(`${requests.length} placeholders replaced in document ID: ${documentId}`);
    }
  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw error;
  }
}

/**
 * Handle special container placeholders that require custom HTML content
 */
async function handleContainerPlaceholders(docs, documentId, data) {
  try {
    // Find and replace the appraisal card placeholder
    const appraisalCardResult = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          replaceAllText: {
            containsText: {
              text: '{{appraisal_card}}',
              matchCase: true,
            },
            replaceText: buildAppraisalCard(data),
          },
        }],
      },
    });
    
    // Find and replace the statistics section placeholder
    const statisticsSectionResult = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          replaceAllText: {
            containsText: {
              text: '{{statistics_section}}',
              matchCase: true,
            },
            replaceText: buildStatisticsSection(data.statistics),
          },
        }],
      },
    });
    
    console.log('Container placeholders processed');
    return true;
  } catch (error) {
    console.error('Error handling container placeholders:', error);
    throw error;
  }
}
```

### 4. Update PDF Generation Route

Modify `routes/pdf.js` to process statistics data:

```javascript
// In the PDF generation route handler
router.post('/generate-pdf', async (req, res) => {
  // Existing code...
  
  try {
    // Get post data and statistics data
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);
    
    // Parse statistics data if available
    let statisticsData = null;
    if (postData.acf?.statistics) {
      try {
        statisticsData = JSON.parse(postData.acf.statistics);
        console.log('Statistics data retrieved:', statisticsData);
      } catch (error) {
        console.error('Error parsing statistics data:', error);
      }
    }
    
    // Process metadata with statistics
    const { metadata, validation } = await processMetadata(postData);
    const enhancedMetadata = prepareMetadataForTemplate(metadata, statisticsData);
    
    // Continue with existing PDF generation process
    // ...
  } catch (error) {
    // Error handling
  }
});
```

## Phase 3: Testing & Iteration

### 1. Initial Testing with Sample Data

Set up a test appraisal with the following characteristics:
- Comprehensive metadata including all fields
- Statistics data with various values
- Edge cases like very long titles or missing fields

### 2. Visual Debugging Process

1. Create a debug function to capture PDF screenshots:

```javascript
// In a debug utility file
async function generateTestPDF(postId) {
  // Generate the PDF as normal
  const pdfBuffer = await exportToPDF(documentId);
  
  // Save to debug directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugDir = path.join(__dirname, '../debug/pdfs', timestamp);
  fs.mkdirSync(debugDir, { recursive: true });
  
  // Save PDF
  const pdfPath = path.join(debugDir, 'appraisal.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  
  // Convert to images for easy viewing
  // This requires pdf-img or a similar library
  const images = await convertPdfToImages(pdfPath, debugDir);
  
  console.log(`Debug PDF generated at ${pdfPath}`);
  console.log(`Debug images saved to ${debugDir}`);
  
  return {
    pdfPath,
    imageDir: debugDir,
    images
  };
}
```

### 3. Iteration Process

For each iteration:
1. Generate test PDF
2. Review screenshots
3. Identify formatting issues
4. Adjust formatter code
5. Regenerate and verify fixes

## Phase 4: Deployment

### 1. Update Configuration
- Update the Google Docs template ID in configuration
- Verify all environment variables and permissions

### 2. Deployment Steps
1. Back up existing code
2. Deploy new code with formatters
3. Run integration tests
4. Monitor initial usage

### 3. Documentation
- Document the new placeholders and their usage
- Update the formatting functions documentation
- Create examples of how statistics data should be formatted

## Additional Considerations

### 1. Error Handling
- Implement graceful degradation for missing data
- Add detailed logging for formatting errors
- Create fallback designs for edge cases

### 2. Performance Optimization
- Consider caching formatted HTML for common patterns
- Optimize API calls to minimize Google Docs API usage
- Add timeouts and retries for API operations

### 3. Future Enhancements
- Support for interactive charts (if Google Docs supports them)
- Additional statistics visualizations
- Custom theme options for different appraisal types