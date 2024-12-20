const { validateMetadata, REQUIRED_METADATA_FIELDS } = require('./validation');

async function processMetadata(postData) {
  console.log('Processing metadata fields...');
  
  // Extract metadata fields
  const metadata = REQUIRED_METADATA_FIELDS.reduce((acc, key) => {
    acc[key] = postData.acf?.[key] || '';
    console.log(`Field ${key}:`, acc[key] ? 'Present' : 'Empty');
    return acc;
  }, {});

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