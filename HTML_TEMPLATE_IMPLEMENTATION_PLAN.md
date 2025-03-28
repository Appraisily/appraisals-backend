# HTML Template Implementation Plan: Adding Metadata Statistics and Appraisal Summary

## Current State Analysis

The template is now available as HTML (`MasterTemplate.html`) exported from Google Docs. This presents a new opportunity for implementation that can be more flexible than the Google Docs API approach.

### Benefits of Using HTML Template:

1. **Direct Manipulation**: HTML is easier to modify programmatically than Google Docs
2. **CSS Styling Control**: Full control over styling with CSS
3. **Simpler Placeholder System**: Can use any templating system we prefer
4. **Custom Layouts**: More flexibility for layout of statistics and summary card
5. **No API Limitations**: No need to work around Google Docs API restrictions

## Implementation Strategy

### 1. HTML Template Processing Approach

Instead of modifying the original DOCX and using the Google Docs API, we can:

1. Use the HTML template as the base
2. Process it with a templating engine
3. Convert the filled template to PDF

This gives us more control and flexibility with the formatting.

### 2. Technology Stack Recommendations

1. **Templating Engine**: 
   - **Handlebars.js**: Already used in the codebase (in `appraisals-backend/node_modules/handlebars`)
   - Supports conditional logic, loops, and partials
   - Allows for `{{placeholder}}` style replacement that matches existing code

2. **HTML to PDF Conversion**:
   - **Puppeteer**: Headless Chrome for high-quality PDF rendering
   - **html-pdf**: Lighter alternative using PhantomJS
   - **wkhtmltopdf**: Command-line tool with Node.js wrapper

### 3. Implementation Steps

#### Phase 1: Prepare the HTML Template

1. **Add Identifier Attributes to Template**:
   ```html
   <!-- Beginning of document -->
   <div id="appraisal-summary-placeholder"></div>
   
   <!-- Where statistics should go -->
   <div id="statistics-summary-placeholder"></div>
   ```

2. **Create HTML Partials for New Components**:
   
   **Appraisal Summary Card** (`summary-card.html`):
   ```html
   <div class="appraisal-summary-card">
     <div class="summary-header">
       <h2>Appraisal Summary</h2>
       <div class="value-badge">${appraisal_value}</div>
     </div>
     <div class="summary-content">
       <div class="item-details">
         <div class="item-title">${title}</div>
         <div class="item-creator">${creator}</div>
       </div>
       <div class="details-grid">
         <div class="detail-item">
           <div class="detail-label">Object Type</div>
           <div class="detail-value">${object_type}</div>
         </div>
         <div class="detail-item">
           <div class="detail-label">Period/Age</div>
           <div class="detail-value">${estimated_age}</div>
         </div>
         <div class="detail-item">
           <div class="detail-label">Medium</div>
           <div class="detail-value">${medium}</div>
         </div>
         <div class="detail-item">
           <div class="detail-label">Condition</div>
           <div class="detail-value">${condition_summary}</div>
         </div>
       </div>
       <div class="metrics-grid">
         <div class="metric-item">
           <div class="metric-chart">${market_demand}%</div>
           <div class="metric-label">Market Demand</div>
         </div>
         <div class="metric-item">
           <div class="metric-chart">${rarity}%</div>
           <div class="metric-label">Rarity</div>
         </div>
         <div class="metric-item">
           <div class="metric-chart">${condition_score}%</div>
           <div class="metric-label">Condition</div>
         </div>
       </div>
     </div>
   </div>
   ```

   **Statistics Summary** (`statistics-summary.html`):
   ```html
   <div class="statistics-section">
     <h3>Market Analysis</h3>
     <div class="statistics-content">
       <div class="stats-table">
         <table>
           <tr>
             <th>Sample Size:</th>
             <td>${stats_count}</td>
             <th>Mean Price:</th>
             <td>${stats_mean}</td>
           </tr>
           <tr>
             <th>Your Value Percentile:</th>
             <td>${stats_percentile}</td>
             <th>Confidence Level:</th>
             <td>${confidence_level}</td>
           </tr>
         </table>
       </div>
       <div class="stats-description">
         ${statistics_summary_text}
       </div>
     </div>
   </div>
   ```

3. **Add CSS for New Components**:
   ```css
   <style>
   /* Appraisal Summary Card Styles */
   .appraisal-summary-card {
     border: 1px solid #e0e0e0;
     border-radius: 8px;
     box-shadow: 0 2px 4px rgba(0,0,0,0.1);
     margin-bottom: 25px;
     font-family: Arial, sans-serif;
   }
   
   .summary-header {
     background: linear-gradient(to right, #3182CE, #2C5282);
     color: white;
     padding: 15px;
     border-radius: 8px 8px 0 0;
     display: flex;
     justify-content: space-between;
     align-items: center;
   }
   
   .value-badge {
     background: rgba(255,255,255,0.2);
     padding: 8px 15px;
     border-radius: 5px;
     font-weight: bold;
   }
   
   .summary-content {
     padding: 20px;
   }
   
   .item-title {
     font-size: 18px;
     font-weight: bold;
     margin-bottom: 5px;
   }
   
   .item-creator {
     font-size: 16px;
     color: #666;
     margin-bottom: 15px;
   }
   
   .details-grid {
     display: grid;
     grid-template-columns: repeat(2, 1fr);
     gap: 15px;
     margin-bottom: 20px;
   }
   
   .detail-item {
     border: 1px solid #eee;
     padding: 10px;
     border-radius: 5px;
   }
   
   .detail-label {
     font-size: 12px;
     color: #666;
     margin-bottom: 5px;
   }
   
   .detail-value {
     font-weight: bold;
   }
   
   .metrics-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 15px;
   }
   
   .metric-item {
     text-align: center;
   }
   
   .metric-chart {
     width: 70px;
     height: 70px;
     border-radius: 50%;
     background: #f0f0f0;
     margin: 0 auto;
     line-height: 70px;
     font-weight: bold;
     font-size: 18px;
   }
   
   .metric-label {
     margin-top: 8px;
     font-size: 14px;
   }
   
   /* Statistics Section Styles */
   .statistics-section {
     margin-bottom: 25px;
   }
   
   .statistics-section h3 {
     border-bottom: 2px solid #3182CE;
     padding-bottom: 5px;
     margin-bottom: 15px;
   }
   
   .stats-table table {
     width: 100%;
     border-collapse: collapse;
     margin-bottom: 15px;
   }
   
   .stats-table th, .stats-table td {
     padding: 8px;
     border: 1px solid #ddd;
   }
   
   .stats-table th {
     background-color: #f9f9f9;
     text-align: left;
     font-weight: bold;
     width: 25%;
   }
   
   .stats-description {
     font-size: 14px;
     line-height: 1.6;
     color: #333;
   }
   </style>
   ```

#### Phase 2: Create Template Processing Service

Create a new service to handle HTML template processing:

```javascript
// services/pdf/htmlTemplateProcessor.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer'); // Add as a dependency

// Load the main template and partials
const loadTemplate = () => {
  const templatePath = path.join(__dirname, '../../MasterTemplateDocs/MasterTemplate.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Register partials
  const summaryCardPath = path.join(__dirname, '../../MasterTemplateDocs/partials/summary-card.html');
  const statisticsSummaryPath = path.join(__dirname, '../../MasterTemplateDocs/partials/statistics-summary.html');
  
  if (fs.existsSync(summaryCardPath)) {
    Handlebars.registerPartial('summaryCard', fs.readFileSync(summaryCardPath, 'utf8'));
  }
  
  if (fs.existsSync(statisticsSummaryPath)) {
    Handlebars.registerPartial('statisticsSummary', fs.readFileSync(statisticsSummaryPath, 'utf8'));
  }
  
  return Handlebars.compile(template);
};

// Process template with data
const processTemplate = (data) => {
  const template = loadTemplate();
  return template(data);
};

// Generate PDF from processed HTML
const generatePDF = async (html, options = {}) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in'
    },
    ...options
  });
  
  await browser.close();
  return pdfBuffer;
};

module.exports = {
  processTemplate,
  generatePDF
};
```

#### Phase 3: Enhance Metadata Processing

Update the metadata processing to prepare data for the HTML template:

```javascript
// Add to services/pdf/metadata/processing.js

function prepareMetadataForHtmlTemplate(metadata, statisticsData) {
  // Format all existing metadata fields
  const templateData = { ...metadata };
  
  // Add or format value for currency
  if (metadata.value) {
    const numericValue = parseFloat(metadata.value);
    if (!isNaN(numericValue)) {
      templateData.appraisal_value = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numericValue);
    }
  }
  
  // Process statistics data if available
  if (statisticsData) {
    // Format statistics data for tables
    templateData.stats_count = statisticsData.count || 'N/A';
    templateData.stats_mean = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(statisticsData.average_price || 0);
    templateData.stats_percentile = statisticsData.percentile || 'N/A';
    templateData.confidence_level = statisticsData.confidence_level || 'N/A';
    
    // Statistics summary text
    templateData.statistics_summary_text = metadata.statistics_summary || 
      'Market analysis data is not available for this item.';
    
    // Ensure percentage values have proper formatting
    ['market_demand', 'rarity', 'condition_score'].forEach(key => {
      if (templateData[key] && !templateData[key].includes('%')) {
        templateData[key] = parseInt(templateData[key], 10) || 0;
      } else if (!templateData[key]) {
        templateData[key] = 0;
      }
    });
  } else {
    // Default values when no statistics are available
    const defaults = {
      stats_count: 'N/A',
      stats_mean: 'N/A',
      stats_percentile: 'N/A',
      confidence_level: 'Low',
      statistics_summary_text: 'Market analysis data is not available for this item.',
      market_demand: 0,
      rarity: 0,
      condition_score: 0
    };
    
    Object.assign(templateData, defaults);
  }
  
  return templateData;
}
```

#### Phase 4: Update PDF Generation Route

Update the PDF generation route to use the HTML template processor:

```javascript
// In routes/pdf.js

const { processTemplate, generatePDF } = require('../services/pdf/htmlTemplateProcessor');

// Update the route handler
router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Fetch all data in a single request
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);

    // Get statistics data if available
    let statisticsData = null;
    if (postData.acf?.statistics) {
      try {
        statisticsData = JSON.parse(postData.acf.statistics);
      } catch (error) {
        console.error('Error parsing statistics data:', error);
      }
    }

    // Process and validate metadata
    const { metadata, validation } = await processMetadata(postData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Missing required metadata fields: ${validation.missingFields.join(', ')}`,
        validation
      });
    }

    // Prepare data for HTML template
    const templateData = prepareMetadataForHtmlTemplate(metadata, statisticsData);
    
    // Add title and date
    templateData.appraisal_title = he.decode(postTitle);
    templateData.appraisal_date = postDate;
    
    // Add image URLs
    templateData.mainImageUrl = images.main;
    templateData.signatureImageUrl = images.signature;
    templateData.ageImageUrl = images.age;
    templateData.galleryImages = images.gallery;

    // Process template with data
    const processedHtml = processTemplate(templateData);
    
    // Generate PDF
    const pdfBuffer = await generatePDF(processedHtml);
    
    // Generate filename
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Appraisal_Report_Post_${postId}_${uuidv4()}.pdf`;
    
    // Save to file system (optional) or upload to cloud storage
    const pdfPath = path.join(__dirname, '../temp', pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    // Upload to Google Drive if needed
    const driveLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, process.env.GOOGLE_DRIVE_FOLDER_ID);
    
    // Update WordPress with the link
    await wordpress.updatePostACFFields(postId, driveLink, null);

    // Return response
    res.json({
      success: true,
      message: 'PDF generated successfully.',
      pdfLink: driveLink
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating PDF'
    });
  }
});
```

## Directory Structure for Templates

Set up the following directory structure:

```
/mnt/c/Users/Andres/Documents/Github/APPRAISERS/appraisals-backend/
  ├── MasterTemplateDocs/
  │   ├── MasterTemplate.html
  │   ├── partials/
  │   │   ├── summary-card.html
  │   │   └── statistics-summary.html
  │   └── styles/
  │       └── template-styles.css
  └── services/
      └── pdf/
          ├── htmlTemplateProcessor.js
          └── ...
```

## Implementation Benefits

Using this HTML template-based approach offers several advantages over the Google Docs API approach:

1. **Performance**: Faster processing without making API calls
2. **Customization**: Complete control over formatting and styling
3. **Simplicity**: Direct template manipulation without API complexities
4. **Flexibility**: Easy to update templates without modifying Google Docs
5. **Modern Stack**: Use industry-standard tools for template processing
6. **Better Error Handling**: More control over the PDF generation process

## Implementation Roadmap

1. **Setup (Day 1)**
   - Install dependencies (Handlebars, Puppeteer)
   - Create directory structure
   - Create partial templates

2. **HTML Template Enhancement (Day 2)**
   - Add placeholders for new sections
   - Add CSS styles for new components
   - Test template rendering with sample data

3. **Metadata Processing (Day 3)**
   - Implement enhanced metadata processing
   - Create template data preparation functions
   - Test with real metadata

4. **PDF Generation (Day 4)**
   - Implement HTML-to-PDF conversion
   - Test PDF quality and formatting
   - Ensure image handling works correctly

5. **Integration & Testing (Day 5)**
   - Complete route integration
   - Add error handling and fallbacks
   - End-to-end testing

## Fallback Strategy

If there are issues with the HTML template approach:

1. **PhantomJS Alternative**: Use html-pdf instead of Puppeteer if Chrome is problematic
2. **wkhtmltopdf Option**: Use wkhtmltopdf command-line tool with Node.js wrapper
3. **API Service Option**: Use a PDF generation API service like PDFShift or DocRaptor

## Maintenance Considerations

1. **Template Versioning**: Keep track of template versions
2. **CSS Maintenance**: Separate CSS into its own file for better maintainability
3. **Testing Framework**: Add automated tests for template rendering and PDF generation
4. **Documentation**: Document template structure and placeholders
5. **Backup Strategy**: Store templates in version control and provide backup mechanisms