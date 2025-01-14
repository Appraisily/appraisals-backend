const REQUIRED_METADATA_FIELDS = [
  'test', 'ad_copy', 'age_text', 'age1', 'condition',
  'signature1', 'signature2', 'style', 'valuation_method',
  'conclusion1', 'conclusion2', 'authorship', 'table',
  'glossary', 'value',
  // Static metadata fields
  'Introduction', 'ImageAnalysisText', 'SignatureText',
  'ValuationText', 'AppraiserText', 'LiabilityText',
  'SellingGuideText'
];

function validateMetadata(metadata) {
  const missingFields = [];
  const emptyFields = [];

  for (const field of REQUIRED_METADATA_FIELDS) {
    if (!(field in metadata)) {
      missingFields.push(field);
    } else if (!metadata[field] && metadata[field] !== 0) {
      emptyFields.push(field);
    }
  }

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