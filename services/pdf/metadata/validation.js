const REQUIRED_METADATA_FIELDS = [
  'test', 'ad_copy', 'age_text', 'age1', 'condition',
  'signature1', 'signature2', 'style', 'valuation_method',
  'conclusion1', 'conclusion2', 'authorship', 'table', 'justification_html',
  'glossary', 'value',
  // PDF Content Fields (cont.)
  'top_auction_results', 'statistics_summary_text',
  // Optional/Legacy Fields to check
  'googlevision', // For {{gallery}} placeholder
  // Static placeholders (handled separately but listed for validation check)
  'Introduction', 'ImageAnalysisText', 'SignatureText',
  'AppraiserText', 'LiabilityText', 'SellingGuideText'
];

function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    console.error('Invalid metadata object provided:', metadata);
    return {
      isValid: false,
      missingFields: ['entire metadata object'],
      emptyFields: []
    };
  }

  const missingFields = [];
  const emptyFields = [];

  for (const field of REQUIRED_METADATA_FIELDS) {
    if (!(field in metadata)) {
      missingFields.push(field);
      // Initialize missing fields as empty strings to prevent further errors
      metadata[field] = '';
    } else if (!metadata[field] && metadata[field] !== 0) {
      emptyFields.push(field);
      // Ensure empty fields are at least empty strings, not undefined or null
      metadata[field] = '';
    }
  }

  // Only consider truly missing fields (not just empty) as validation failures
  return {
    isValid: missingFields.length === 0,
    missingFields,
    emptyFields
  };
}

module.exports = {
  REQUIRED_METADATA_FIELDS,
  validateMetadata
};