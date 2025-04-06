const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');
const { cleanAndParseJSON } = require('../../utils/jsonCleaner');
const geminiService = require('../../geminiService');
const { formatTopAuctionResults } = require('../formatters');

/**
 * Strips HTML tags and decodes entities from a string.
 * @param {string|null|undefined} html The input string.
 * @returns {string} The cleaned plain text.
 */
function stripHtml(html) {
  // Handle non-string values
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') return String(html);
  
  // console.log('Original HTML content:', html); // Debugging
  
  // First decode HTML entities
  let text = he.decode(html);
  // console.log('After HTML entity decoding:', text); // Debugging
  
  // Remove HTML tags using a more robust regex
  text = text.replace(/<[^>]*>/g, ' '); // Replace tags with space to avoid merging words
  // console.log('After removing HTML tags:', text); // Debugging
  
  // Replace multiple whitespace characters (including newlines, tabs) with a single space
  text = text.replace(/\s+/g, ' ').trim();
  // console.log('After normalizing whitespace:', text); // Debugging
  
  // Note: Adding paragraph spacing might not be desired if the PDF handles paragraphs
  // text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n'); 

  return text;
}

/**
 * Processes ACF data and external sources to create the final metadata object for PDF generation.
 * Includes AI generation for specific text fields.
 * @param {object} postData The full post object from WordPress, containing ACF fields.
 * @returns {Promise<{metadata: object, validation: {isValid: boolean, missingFields: string[], emptyFields: string[]}}>}
 */
async function processMetadata(postData) {
  console.log('[PDF Meta] Starting metadata processing...');
  
  const appraisalType = postData.acf?.appraisaltype?.toLowerCase() || 'regular';
  const staticContent = staticMetadata[appraisalType] || staticMetadata.regular;
  const acfData = postData.acf || {}; // Safe reference to ACF data
  const metadata = {};

  // --- 1. Process specific ACF fields (excluding AI/Static/Stats derived) ---
  console.log('[PDF Meta] Processing direct ACF fields...');
  REQUIRED_METADATA_FIELDS.forEach(key => {
    // Skip fields populated later
    if ([
        'valuation_method', 'authorship', 'condition_report', 'provenance_summary',
        'market_summary', 'conclusion', 'statistics_summary_text', 'top_auction_results',
        'Introduction', 'ImageAnalysisText', 'SignatureText', 'AppraiserText',
        'LiabilityText', 'SellingGuideText'
       ].includes(key)) {
      return;
    }

    const rawValue = acfData[key];
    if (key === 'justification_html') {
      metadata[key] = rawValue || ''; // Keep HTML
    } else if (key === 'value') {
        metadata[key] = rawValue; // Store raw value for formatting
    } else if (key === 'googlevision') {
        metadata[key] = rawValue; // Keep raw gallery IDs
    } else {
        metadata[key] = stripHtml(rawValue || ''); // Strip HTML for most text
    }
    // console.log(`[PDF Meta] Processed ACF field '${key}'`); // Verbose logging
  });

  // --- 2. Populate static fields --- 
  console.log('[PDF Meta] Populating static fields...');
  metadata.Introduction = stripHtml(staticContent.Introduction || '');
  metadata.ImageAnalysisText = stripHtml(staticContent.ImageAnalysisText || '');
  metadata.SignatureText = stripHtml(staticContent.SignatureText || '');
  metadata.AppraiserText = stripHtml(staticContent.AppraiserText || '');
  metadata.LiabilityText = stripHtml(staticContent.LiabilityText || '');
  metadata.SellingGuideText = stripHtml(staticContent.SellingGuideText || '');

  // --- 3. Process statistics data --- 
  console.log('[PDF Meta] Parsing statistics data...');
  let parsedStats = {}; // Default to empty object
  if (acfData.statistics) {
    try {
      let statsData = acfData.statistics;
      if (typeof statsData === 'string') {
          try {
            parsedStats = cleanAndParseJSON(statsData); // Use robust parser
            console.log('[PDF Meta] Statistics string parsed successfully.');
          } catch (parseError) {
            console.error('[PDF Meta] Failed to parse statistics JSON string:', parseError.message);
            // Keep parsedStats as {}
          }
      } else if (typeof statsData === 'object' && statsData !== null) {
          parsedStats = statsData; // Assume it's already an object
          console.log('[PDF Meta] Using pre-parsed statistics object.');
      } else {
          console.warn('[PDF Meta] Statistics data has unexpected type, skipping parse.', typeof statsData);
      }
    } catch (error) {
      console.error('[PDF Meta] Error processing statistics data wrapper:', error);
      // Keep parsedStats as {}
    }
  } else {
      console.log('[PDF Meta] No statistics data found in ACF.');
  }

  // --- 4. Populate top_auction_results from stats --- 
  console.log('[PDF Meta] Formatting top auction results...');
  metadata.top_auction_results = formatTopAuctionResults(parsedStats?.comparable_sales);
  // console.log(`[PDF Meta] Populated 'top_auction_results':`, metadata.top_auction_results.substring(0, 100) + '...'); // Verbose

  // --- 5. Generate AI Text Fields using Gemini --- 
  console.log('[PDF Meta] Attempting AI generation for PDF text fields...');
  let generatedTexts = {};
  try {
    // Pass ACF data (contains item details AND the AI-generated scores) 
    // and the parsed statistics
    generatedTexts = await geminiService.generatePdfTextFields(acfData, parsedStats, acfData); 
    console.log('[PDF Meta] Successfully received generated text fields from Gemini.');

    // Populate metadata with stripped AI-generated text
    metadata.valuation_method = stripHtml(generatedTexts.valuation_method || '');
    metadata.authorship = stripHtml(generatedTexts.authorship || '');
    metadata.condition_report = stripHtml(generatedTexts.condition_report || '');
    metadata.provenance_summary = stripHtml(generatedTexts.provenance_summary || '');
    // Use market_summary for statistics_summary_text
    metadata.statistics_summary_text = stripHtml(generatedTexts.market_summary || 'Market data summary could not be generated.');
    metadata.conclusion = stripHtml(generatedTexts.conclusion || '');
    console.log('[PDF Meta] Populated metadata with AI-generated text.');

  } catch (aiError) {
    console.error('[PDF Meta] Error generating PDF text fields via Gemini:', aiError);
    // Populate with default error messages if AI fails
    metadata.valuation_method = '(Automated generation failed: Valuation method details unavailable)';
    metadata.authorship = '(Automated generation failed: Authorship details unavailable)';
    metadata.condition_report = '(Automated generation failed: Condition report unavailable)';
    metadata.provenance_summary = '(Automated generation failed: Provenance summary unavailable)';
    metadata.statistics_summary_text = '(Automated generation failed: Market data summary unavailable)';
    metadata.conclusion = '(Automated generation failed: Conclusion unavailable)';
  }

  // --- 6. Format appraisal_value --- 
  console.log('[PDF Meta] Formatting appraisal value...');
  if (metadata.value !== null && metadata.value !== undefined && metadata.value !== '') {
    const numericValue = parseFloat(String(metadata.value).replace(/[^0-9.-]+/g,"")); // Clean string before parsing
    metadata.appraisal_value = !isNaN(numericValue) ? 
        numericValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) :
        String(metadata.value); // Use original string if not a number after cleaning
  } else {
    metadata.appraisal_value = 'N/A';
  }
  // console.log(`[PDF Meta] Formatted 'appraisal_value': ${metadata.appraisal_value}`); // Verbose

  console.log('[PDF Meta] Metadata processing complete.');

  // --- 7. Validate final metadata object --- 
  const validation = validateMetadata(metadata);
  if (!validation.isValid) {
    console.warn('[PDF Meta] Validation Failed! Missing required fields:', validation.missingFields);
  }
  if (validation.emptyFields.length > 0) {
    console.warn('[PDF Meta] Validation Warning: Empty fields:', validation.emptyFields);
  }

  return {
    metadata, 
    validation
  };
}

module.exports = {
  processMetadata
};