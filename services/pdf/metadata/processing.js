const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');
const { cleanAndParseJSON } = require('../../utils/jsonCleaner');

function stripHtml(html) {
  // Handle non-string values
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') return String(html);
  
  console.log('Original HTML content:', html);
  
  // First decode HTML entities
  let text = he.decode(html);
  console.log('After HTML entity decoding:', text);
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  console.log('After removing HTML tags:', text);
  
  // Replace multiple newlines/spaces with single ones
  text = text.replace(/\s+/g, ' ');
  console.log('After normalizing whitespace:', text);
  
  // Add proper paragraph spacing
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  console.log('After adding paragraph spacing:', text);
  
  // Trim extra whitespace
  text = text.trim();
  console.log('Final cleaned text:', text);
  
  return text;
}

async function processMetadata(postData) {
  console.log('Processing metadata fields...');
  
  // Determine appraisal type and get corresponding static metadata
  const appraisalType = postData.acf?.appraisaltype?.toLowerCase() || 'regular';
  console.log('Appraisal type:', appraisalType);
  
  const staticContent = staticMetadata[appraisalType] || staticMetadata.regular;
  console.log('Using static metadata for type:', appraisalType);

  // Extract metadata fields
  const metadata = REQUIRED_METADATA_FIELDS.reduce((acc, key) => {
    console.log(`\nProcessing field: ${key}`);
    console.log('Raw content:', postData.acf?.[key]);
    acc[key] = stripHtml(postData.acf?.[key] || '');
    console.log(`Field ${key} after cleaning:`, acc[key] ? 'Present' : 'Empty');
    return acc;
  }, {});
  
  // Parse statistics data if available
  console.log('\nProcessing statistics data...');
  if (postData.acf?.statistics) {
    try {
      let statsData = postData.acf.statistics;
      
      // If it's a string, try to parse it as JSON with our robust cleaner
      if (typeof statsData === 'string') {
        statsData = cleanAndParseJSON(statsData);
        console.log('Statistics data cleaned and parsed successfully');
      }
      
      metadata.statistics = {
        count: statsData.count || statsData.sample_size || 0,
        mean: statsData.average_price || statsData.mean || 0,
        median_price: statsData.median_price || 0,
        price_min: statsData.price_min || 0,
        price_max: statsData.price_max || 0,
        percentile: statsData.percentile || 'N/A',
        confidence_level: statsData.confidence_level || 'Low',
        summary_text: postData.acf?.statistics_summary || 
          'Market analysis shows this item is positioned favorably compared to similar items in the marketplace.'
      };
      
      console.log('Statistics data processed successfully');
    } catch (error) {
      console.error('Error parsing statistics data:', error);
      metadata.statistics = null;
    }
  } else {
    console.log('No statistics data found');
    metadata.statistics = null;
  }

  // Process justification and valuer agent data
  console.log('\nProcessing justification data...');
  try {
    // 1. Check for valuer_agent_data first (contains full data including auction results)
    if (postData.acf?.valuer_agent_data) {
      console.log('Found valuer_agent_data, extracting justification');
      let valuerData;
      
      // Parse if it's a string using our robust cleaner
      if (typeof postData.acf.valuer_agent_data === 'string') {
        valuerData = cleanAndParseJSON(postData.acf.valuer_agent_data);
      } else {
        valuerData = postData.acf.valuer_agent_data;
      }
      
      // Extract key components from valuer data
      metadata.justification = {
        explanation: valuerData.explanation || '',
        auctionResults: valuerData.auctionResults || []
      };
      
      console.log(`Extracted justification explanation (${metadata.justification.explanation.length} chars) and ${metadata.justification.auctionResults.length} auction results`);
    } 
    // 2. Check for separate auction results field
    else if (postData.acf?.auction_results) {
      console.log('Found auction_results field');
      let auctionResults;
      
      // Parse if it's a string using our robust cleaner
      if (typeof postData.acf.auction_results === 'string') {
        auctionResults = cleanAndParseJSON(postData.acf.auction_results);
      } else {
        auctionResults = postData.acf.auction_results;
      }
      
      // Get explanation from separate field if available
      const explanation = postData.acf?.justification_text || 
                          postData.acf?.explanation || 
                          'This appraisal value is based on comparable auction results and market data.';
      
      metadata.justification = {
        explanation: explanation,
        auctionResults: Array.isArray(auctionResults) ? auctionResults : []
      };
      
      console.log(`Created justification with separate explanation and ${metadata.justification.auctionResults.length} auction results`);
    }
    // 3. Use justification HTML if available 
    else if (postData.acf?.justification_html || postData.acf?.justification_text) {
      console.log('Using justification HTML/text field');
      const justificationText = stripHtml(postData.acf.justification_html || postData.acf.justification_text || '');
      
      metadata.justification = {
        explanation: justificationText,
        auctionResults: []
      };
      
      console.log('Created justification from HTML/text content');
    }
    // 4. No justification data found
    else {
      console.log('No justification data found, using default explanation');
      metadata.justification = {
        explanation: 'This appraisal is based on market research and expert valuation.',
        auctionResults: []
      };
    }
  } catch (error) {
    console.error('Error processing justification data:', error);
    // Create default justification if error occurs
    metadata.justification = {
      explanation: 'An error occurred while processing justification data. This appraisal is based on expert opinion.',
      auctionResults: []
    };
  }

  // Add static metadata fields
  console.log('\nProcessing static metadata fields');
  // Ensure static content exists before accessing
  if (!staticContent) {
    console.warn('Static content is missing, initializing empty fields');
    metadata.Introduction = '';
    metadata.ImageAnalysisText = '';
    metadata.SignatureText = '';
    metadata.ValuationText = '';
    metadata.AppraiserText = '';
    metadata.LiabilityText = '';
    metadata.SellingGuideText = '';
  } else {
    console.log('Using static content for metadata fields');
    metadata.Introduction = staticContent.Introduction || '';
    metadata.ImageAnalysisText = staticContent.ImageAnalysisText || '';
    metadata.SignatureText = staticContent.SignatureText || '';
    metadata.ValuationText = staticContent.ValuationText || '';
    metadata.AppraiserText = staticContent.AppraiserText || '';
    metadata.LiabilityText = staticContent.LiabilityText || '';
    metadata.SellingGuideText = staticContent.SellingGuideText || '';
  }
  
  console.log('\nCleaning static metadata fields');
  // Clean HTML from static metadata
  console.log('\nProcessing Introduction');
  metadata.Introduction = stripHtml(metadata.Introduction);
  console.log('\nProcessing ImageAnalysisText');
  metadata.ImageAnalysisText = stripHtml(metadata.ImageAnalysisText);
  console.log('\nProcessing SignatureText');
  metadata.SignatureText = stripHtml(metadata.SignatureText);
  console.log('\nProcessing ValuationText');
  metadata.ValuationText = stripHtml(metadata.ValuationText);
  console.log('\nProcessing AppraiserText');
  metadata.AppraiserText = stripHtml(metadata.AppraiserText);
  console.log('\nProcessing LiabilityText');
  metadata.LiabilityText = stripHtml(metadata.LiabilityText);
  console.log('\nProcessing SellingGuideText');
  metadata.SellingGuideText = stripHtml(metadata.SellingGuideText);

  console.log('\nFinal metadata content:');
  Object.entries(metadata).forEach(([key, value]) => {
    console.log(`\n${key}:`);
    if (value === null || value === undefined) {
      console.log('[null or undefined]');
    } else if (typeof value === 'string') {
      console.log(value.substring(0, 100) + (value.length > 100 ? '...' : ''));
    } else if (typeof value === 'object') {
      console.log(JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : ''));
    } else {
      console.log(String(value));
    }
  });

  // Format value if present
  if (metadata.value) {
    const numericValue = parseFloat(metadata.value);
    if (!isNaN(numericValue)) {
      metadata.appraisal_value = numericValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      metadata.appraisal_value = metadata.value;
    }
  } else {
    metadata.appraisal_value = 'Value not provided';
  }

  console.log('Formatted appraisal value:', metadata.appraisal_value);

  // Validate metadata
  const validation = validateMetadata(metadata);
  if (!validation.isValid) {
    console.warn('Missing required metadata fields:', validation.missingFields);
  }
  if (validation.emptyFields.length > 0) {
    console.warn('Empty metadata fields:', validation.emptyFields);
  }

  return {
    metadata,
    validation
  };
}

module.exports = {
  processMetadata
};