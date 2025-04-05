// services/metadata.js

// Import and re-export the processor functions
const { 
  processAllMetadata, 
  processJustificationMetadata 
} = require('./metadataProcessor');

// This file now only re-exports the processing logic.
// updateWordPressMetadata has been moved to services/wordpress/index.js

module.exports = {
  processAllMetadata,
  processJustificationMetadata,
};