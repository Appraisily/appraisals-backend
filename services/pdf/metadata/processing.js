const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');
const { cleanAndParseJSON } = require('../../utils/jsonCleaner');
const openai = require('../../openai');

/**
 * Generate an AI-enhanced statistics summary using OpenAI
 * @param {Object} statistics The statistics data object
 * @param {string} title The title or description of the item
 * @returns {Promise<string>} The generated summary text
 */
async function generateAIStatisticsSummary(statistics, title) {
  try {
    console.log('Generating AI-enhanced statistics summary');
    
    // Format the statistics data for the prompt
    const statsInfo = {
      count: statistics.count || statistics.sample_size || 0,
      average: statistics.average_price || statistics.mean || 0,
      median: statistics.median_price || 0,
      min: statistics.price_min || 0,
      max: statistics.price_max || 0,
      percentile: statistics.percentile || '50th',
      confidence: statistics.confidence_level || 'Moderate',
      trend: statistics.price_trend_percentage || '+0.0%'
    };
    
    // Create a prompt for the AI
    const prompt = `
Write a professional and insightful two-paragraph summary of the market statistics for "${title}".
Use the following data points in your analysis:

- Sample size: ${statsInfo.count} comparable items
- Average price: $${Math.round(statsInfo.average).toLocaleString()}
- Median price: $${Math.round(statsInfo.median).toLocaleString()}
- Price range: $${Math.round(statsInfo.min).toLocaleString()} to $${Math.round(statsInfo.max).toLocaleString()}
- Percentile position: ${statsInfo.percentile}
- Price trend: ${statsInfo.trend}
- Confidence level: ${statsInfo.confidence}

The first paragraph should describe the market context and overall position of this item.
The second paragraph should interpret what these statistics mean for the item's value and investment potential.
Keep the tone professional, precise, and credible. Avoid speculative language.
`;

    // Generate the summary using OpenAI
    const systemMessage = 'You are an expert art appraiser and market analyst specializing in art, antiques, and collectibles.';
    const response = await openai.generateContent(prompt, title, {}, 'gpt-4o', systemMessage);
    
    // Ensure we have a response
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from AI service');
    }
    
    console.log('Successfully generated AI statistics summary');
    return response.trim();
  } catch (error) {
    console.error('Error generating AI statistics summary:', error);
    return null;
  }
}

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

  const metadata = {};

  // Process ACF fields defined as required
  REQUIRED_METADATA_FIELDS.forEach(key => {
    if (['Introduction', 'ImageAnalysisText', 'SignatureText', 'AppraiserText', 'LiabilityText', 'SellingGuideText'].includes(key)) {
      return; // Skip static fields
    }
    const rawValue = postData.acf?.[key];
    if (key === 'justification_html') {
      metadata[key] = rawValue || ''; // Keep HTML
    } else if (key === 'value') {
        metadata[key] = rawValue; // Store raw value
    } else if (key === 'googlevision') {
        metadata[key] = rawValue; // Keep raw gallery IDs for later image processing
    } else if (key === 'top_auction_results' || key === 'statistics_summary_text') {
        // Skip these for now, will be populated from statistics data below
        metadata[key] = ''; 
    } else {
        metadata[key] = stripHtml(rawValue || ''); // Strip HTML for most text fields
    }
  });

  // Populate static fields (strip HTML)
  metadata.Introduction = stripHtml(staticContent.Introduction || '');
  metadata.ImageAnalysisText = stripHtml(staticContent.ImageAnalysisText || '');
  metadata.SignatureText = stripHtml(staticContent.SignatureText || '');
  metadata.AppraiserText = stripHtml(staticContent.AppraiserText || '');
  metadata.LiabilityText = stripHtml(staticContent.LiabilityText || '');
  metadata.SellingGuideText = stripHtml(staticContent.SellingGuideText || '');

  // Process statistics data if available
  let parsedStats = null;
  if (postData.acf?.statistics) {
    try {
      let statsData = postData.acf.statistics;
      if (typeof statsData === 'string') {
        parsedStats = cleanAndParseJSON(statsData);
      }
      console.log('Statistics data parsed successfully for PDF processing.');
    } catch (error) {
      console.error('Error parsing statistics data for PDF:', error);
    }
  }

  // Populate top_auction_results (now required)
  metadata.top_auction_results = formatTopAuctionResults(parsedStats?.comparable_sales);

  // Populate statistics_summary_text (now required)
  if (postData.acf?.statistics_summary_text) {
    metadata.statistics_summary_text = stripHtml(postData.acf.statistics_summary_text); // Ensure existing is stripped
    console.log('Using existing statistics summary text for PDF');
  } else if (parsedStats) {
      try {
          const generatedSummary = await generateAIStatisticsSummary(parsedStats, metadata.creator + ' ' + metadata.object_type);
          if (!generatedSummary) throw new Error('AI generation returned empty.');
          metadata.statistics_summary_text = stripHtml(generatedSummary); // Strip HTML from generated summary
          console.log('Generated AI statistics summary text for PDF');
      } catch(aiError) {
          console.log('AI summary failed, generating basic summary for PDF:', aiError.message);
          const summary = `Based on an analysis of ${parsedStats.count || 0} comparable items...`;
          metadata.statistics_summary_text = summary; // Basic summary is plain text
      }
  } else {
    metadata.statistics_summary_text = 'No statistical data available for this appraisal.';
  }
  
  // --- Placeholder for AI Generation of other PDF fields --- 
  // TODO: Implement logic (likely calling OpenAI/Gemini via metadataProcessor.js) 
  //       to populate fields like valuation_method, authorship, conclusion1/2, glossary 
  //       if they are not intended to be manual entries in WordPress.
  // Example:
  // if (!metadata.valuation_method) { 
  //     metadata.valuation_method = await generateValuationMethodText(postData.acf);
  // }
  // --- End Placeholder ---

  // Format appraisal_value
  if (metadata.value) {
    const numericValue = parseFloat(metadata.value);
    metadata.appraisal_value = !isNaN(numericValue) ? 
        numericValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 
        metadata.value;
  } else {
    metadata.appraisal_value = 'N/A';
  }

  console.log('Metadata processing for PDF complete.');

  // Validate final metadata object
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