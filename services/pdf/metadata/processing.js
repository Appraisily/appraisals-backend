const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');

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

  // Add static metadata fields
  console.log('\nProcessing static metadata fields');
  metadata.Introduction = staticContent.Introduction || '';
  metadata.ImageAnalysisText = staticContent.ImageAnalysisText || '';
  metadata.SignatureText = staticContent.SignatureText || '';
  metadata.ValuationText = staticContent.ValuationText || '';
  metadata.AppraiserText = staticContent.AppraiserText || '';
  metadata.LiabilityText = staticContent.LiabilityText || '';
  metadata.SellingGuideText = staticContent.SellingGuideText || '';
  
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
    console.log(value.substring(0, 100) + (value.length > 100 ? '...' : ''));
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