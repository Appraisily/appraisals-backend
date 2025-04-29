/**
 * Metadata Batch Processor Service
 * Processes all metadata fields for an appraisal in a single AI call
 */

const openai = require('./openai');
const wordpress = require('./wordpress/index');

/**
 * Process all metadata fields for an appraisal in a single batch
 * @param {string|number} postId - The ID of the post
 * @param {string} postTitle - The title of the post  
 * @param {Object} postData - Post data with metadata
 * @param {Object} images - Object containing image URLs (main, age, signature)
 * @param {Object} statistics - Statistics data from valuer agent
 * @returns {Promise<Object>} Result object with all metadata
 */
async function processBatchMetadata(postId, postTitle, postData, images = {}, statistics = {}) {
  console.log(`[Metadata Batch Processor] Processing all metadata for post ${postId}: "${postTitle}"`);
  
  try {
    // Single OpenAI call to generate all metadata at once
    const metadataResponse = await openai.generateStructuredMetadata(
      postTitle,
      postData,
      images,
      statistics
    );
    
    // Validate response
    if (!metadataResponse || !metadataResponse.metadata) {
      throw new Error('Invalid metadata response structure');
    }
    
    const metadata = metadataResponse.metadata;
    console.log(`[Metadata Batch Processor] Successfully generated metadata for post ${postId}`);
    
    // Convert numeric fields to integers
    const numericFields = ['condition_score', 'rarity', 'market_demand', 
                          'historical_significance', 'investment_potential', 'provenance_strength'];
    
    // Process metadata directly before sending to WordPress
    const processedMetadata = Object.fromEntries(
      Object.entries(metadata)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [
          key, 
          numericFields.includes(key) ? parseInt(value, 10) : value
        ])
    );
    
    // Update WordPress with processed metadata in a single call
    await wordpress.updatePostMeta(postId, processedMetadata);
    
    console.log(`[Metadata Batch Processor] Successfully updated WordPress with ${Object.keys(processedMetadata).length} metadata fields`);
    
    return {
      success: true,
      message: 'All metadata processed successfully',
      metadata: processedMetadata
    };
  } catch (error) {
    console.error(`[Metadata Batch Processor] Error processing metadata batch:`, error);
    return {
      success: false,
      message: `Failed to process metadata batch: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Validate the structured metadata response
 * @param {Object} metadata - The metadata object to validate
 * @returns {Object} Validation result with success flag and errors array
 */
function validateMetadataStructure(metadata) {
  if (!metadata) return { success: false, errors: ['Metadata object is missing'] };
  
  const requiredFields = [
    'creator', 'medium', 'object_type', 'condition_summary', 'estimated_age'
  ];
  
  const numericFields = [
    'condition_score', 'rarity', 'market_demand', 
    'historical_significance', 'investment_potential', 'provenance_strength'
  ];
  
  const errors = [];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (!metadata[field]) {
      errors.push(`Required field '${field}' is missing`);
    }
  });
  
  // Check numeric fields are numbers
  numericFields.forEach(field => {
    if (metadata[field] !== undefined && !Number.isFinite(Number(metadata[field]))) {
      errors.push(`Field '${field}' should be a number`);
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  processBatchMetadata,
  validateMetadataStructure
}; 