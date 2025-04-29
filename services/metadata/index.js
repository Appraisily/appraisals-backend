/**
 * Metadata Services Index
 * Exports all metadata-related functions for processing appraisal metadata
 */

const processor = require('./processor');
const batchProcessor = require('./batchProcessor');

module.exports = {
  // Legacy individual field processing
  processAllMetadata: processor.processAllMetadata,
  processJustificationMetadata: processor.processJustificationMetadata,
  processProvenanceField: processor.processProvenanceField,
  processMediumField: processor.processMediumField,
  processConditionField: processor.processConditionField,
  
  // New batch processing
  processBatchMetadata: batchProcessor.processBatchMetadata,
  validateMetadataStructure: batchProcessor.validateMetadataStructure
}; 