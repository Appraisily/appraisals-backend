/**
 * Templates index file - exports all templates
 * 
 * This file serves as a central point to access all template generation functions
 * from a more organized location in the src directory
 */

// Import the template generators from the root templates directory
const { generateEnhancedAnalytics } = require('../../templates/enhanced-analytics');
const { generateAppraisalCard } = require('../../templates/appraisal-card');

// Re-export them with clear naming
module.exports = {
  'enhanced-analytics': generateEnhancedAnalytics,
  'appraisal-card': generateAppraisalCard
}; 