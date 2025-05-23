const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');
const { cleanAndParseJSON } = require('../../utils/jsonCleaner');
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
    // Skip fields populated later with special handling
    if ([
        'valuation_method', 'authorship', 'condition_report', 'provenance_summary',
        'market_summary', 'conclusion', 'statistics_summary_text', 'top_auction_results',
        'Introduction', 'ImageAnalysisText', 'SignatureText', 'AppraiserText',
        'LiabilityText', 'SellingGuideText', 'condition', 'conclusion1', 'conclusion2',
        'age_text', 'age1', 'signature1', 'signature2', 'style', 'estimated_age',
        'creator', 'customer_name', 'customer_address', 'table', 'ad_copy', 'test', 'condition_summary'
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
  console.log('[PDF Meta] Handling statistics data...');
  if (acfData.statistics) {
    // Store the raw statistics data directly without parsing
    metadata.raw_statistics = acfData.statistics;
    console.log('[PDF Meta] Raw statistics data stored directly.');
    
    // For backward compatibility, still create an empty parsedStats object
    let parsedStats = {};
    
    // Only try to parse if we need derived fields and only for logging
    try {
      if (typeof acfData.statistics === 'string') {
        // Just attempt a very basic parse for logging purposes
        try {
          parsedStats = JSON.parse(acfData.statistics);
          console.log('[PDF Meta] Statistics data format appears valid.');
        } catch (basicError) {
          console.warn('[PDF Meta] Statistics data is not valid JSON, but will use as-is:', basicError.message);
        }
      } else if (typeof acfData.statistics === 'object' && acfData.statistics !== null) {
        parsedStats = acfData.statistics;
        console.log('[PDF Meta] Using statistics object directly.');
      }
    } catch (error) {
      console.warn('[PDF Meta] Error checking statistics format:', error.message);
      // This doesn't affect functionality - we're using raw_statistics anyway
    }
    
    // --- 4. Populate top_auction_results from stats --- 
    console.log('[PDF Meta] Formatting top auction results...');
    if (parsedStats.comparable_sales) {
      metadata.top_auction_results = formatTopAuctionResults(parsedStats.comparable_sales);
    } else {
      metadata.top_auction_results = "No comparable auction results available.";
      console.log('[PDF Meta] No comparable sales data found for top_auction_results.');
    }
  } else {
    console.log('[PDF Meta] No statistics data found in ACF.');
    metadata.raw_statistics = "{}";
    metadata.top_auction_results = "No comparable auction results available.";
  }

  // --- 5. Populate Text Fields Directly from ACF Data ---
  console.log('[PDF Meta] Populating text fields from ACF data...');
  
  // Basic text fields
  metadata.valuation_method = stripHtml(acfData.valuation_method || '');
  metadata.authorship = stripHtml(acfData.authorship || '');
  metadata.condition = stripHtml(acfData.condition || acfData.condition_report || '');
  metadata.condition_report = metadata.condition; // Duplicate for template consistency
  metadata.condition_summary = stripHtml(acfData.condition_summary || '');
  metadata.provenance_summary = stripHtml(acfData.provenance || acfData.provenance_summary || '');
  metadata.statistics_summary_text = stripHtml(acfData.statistics_summary_text || acfData.market_summary || '');
  
  // Content sections that may be split into multiple parts
  metadata.conclusion = stripHtml(acfData.conclusion || '');
  metadata.conclusion1 = stripHtml(acfData.conclusion1 || acfData.conclusion || '');
  metadata.conclusion2 = stripHtml(acfData.conclusion2 || '');
  
  // Age-related fields
  metadata.age_text = stripHtml(acfData.age_text || acfData.age_methodology || '');
  metadata.age1 = stripHtml(acfData.age1 || acfData.age_findings || '');
  metadata.estimated_age = stripHtml(acfData.estimated_age || acfData.age || '');
  
  // Signature fields
  metadata.signature1 = stripHtml(acfData.signature1 || acfData.signature_analysis || '');
  metadata.signature2 = stripHtml(acfData.signature2 || '');
  
  // Style and content analysis
  metadata.style = stripHtml(acfData.style || acfData.style_analysis || '');
  metadata.test = stripHtml(acfData.test || acfData.item_type_determination || '');
  
  // Creator/artist information
  metadata.creator = stripHtml(acfData.creator || acfData.artist_creator_name || acfData.artist || '');
  
  // Client information
  metadata.customer_name = stripHtml(acfData.customer_name || postData.customer_name || '');
  metadata.customer_address = stripHtml(acfData.customer_address || postData.customer_address || '');
  
  // Additional content blocks
  metadata.table = acfData.table || '';
  metadata.ad_copy = stripHtml(acfData.ad_copy || acfData.selling_copy || '');

  // --- 6. Ensure all required fields are present with fallbacks ---
  // Artwork details that might be used in placeholders
  metadata.object_type = stripHtml(acfData.object_type || acfData.type || acfData.artwork_type || 'Artwork');
  metadata.medium = stripHtml(acfData.medium || acfData.artwork_medium || 'Mixed Media');
  metadata.dimensions = stripHtml(acfData.dimensions || acfData.size || acfData.measurements || '');
  metadata.date_created = stripHtml(acfData.date_created || acfData.artwork_date || acfData.created || '');
  metadata.artwork_title = stripHtml(acfData.artwork_title || acfData.title || '');
  
  // Check if there is a structured appraisal_summary field
  if (acfData.appraisal_summary) {
    // Use it directly
    metadata.appraisal_summary = stripHtml(acfData.appraisal_summary);
  } else {
    // Try to build one from individual fields if available
    try {
      const summaryParts = [];
      if (metadata.creator) summaryParts.push(`Artists_Name: ${metadata.creator}`);
      if (metadata.estimated_age) summaryParts.push(`Period_Age: ${metadata.estimated_age}`);
      if (metadata.artwork_title) summaryParts.push(`Title_of_Artwork: ${metadata.artwork_title}`);
      if (metadata.medium) summaryParts.push(`Medium: ${metadata.medium}`);
      if (metadata.dimensions) summaryParts.push(`Dimensions: ${metadata.dimensions}`);
      if (metadata.object_type) summaryParts.push(`Object_Type: ${metadata.object_type}`);
      
      if (summaryParts.length > 0) {
        metadata.appraisal_summary = summaryParts.join("\n");
      }
    } catch (error) {
      console.warn('[PDF Meta] Error building appraisal summary:', error);
    }
  }

  console.log('[PDF Meta] Populated text fields from ACF.');

  // --- 7. Format appraisal_value --- 
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

  // --- 8. Validate final metadata object --- 
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