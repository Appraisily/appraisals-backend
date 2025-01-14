const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');
const staticMetadata = require('../../constants/staticMetadata');
const he = require('he');

function stripHtml(html) {
  if (!html) return '';
  
  // First decode HTML entities
  let text = he.decode(html);
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Replace multiple newlines/spaces with single ones
  text = text.replace(/\s+/g, ' ');
  
  // Add proper paragraph spacing
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  
  // Trim extra whitespace
  text = text.trim();
  
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
    acc[key] = stripHtml(postData.acf?.[key] || '');
    console.log(`Field ${key}:`, acc[key] ? 'Present' : 'Empty');
    console.log(`Cleaned content for ${key}:`, acc[key].substring(0, 100) + '...');
    return acc;
  }, {});

  // Add static metadata fields
  metadata.Introduction = staticContent.Introduction || '';
  metadata.ImageAnalysisText = staticContent.ImageAnalysisText || '';
  metadata.SignatureText = staticContent.SignatureText || '';
  metadata.ValuationText = staticContent.ValuationText || '';
  metadata.AppraiserText = staticContent.AppraiserText || '';
  metadata.LiabilityText = staticContent.LiabilityText || '';
  metadata.SellingGuideText = staticContent.SellingGuideText || '';
  
  // Clean HTML from static metadata
  metadata.Introduction = stripHtml(metadata.Introduction);
  metadata.ImageAnalysisText = stripHtml(metadata.ImageAnalysisText);
  metadata.SignatureText = stripHtml(metadata.SignatureText);
  metadata.ValuationText = stripHtml(metadata.ValuationText);
  metadata.AppraiserText = stripHtml(metadata.AppraiserText);
  metadata.LiabilityText = stripHtml(metadata.LiabilityText);
  metadata.SellingGuideText = stripHtml(metadata.SellingGuideText);

  console.log('Static metadata fields added:', 
    Object.keys(staticContent).filter(key => metadata[key]));

  // Format value if present
  if (metadata.value) {
    const numericValue = parseFloat(metadata.value);
    if (!isNaN(numericValue)) {
      metadata.appraisal_value = numericValue.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'USD',
      });
    } else {
      metadata.appraisal_value = metadata.value;
    }
  } else {
    metadata.appraisal_value = '';
  }

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