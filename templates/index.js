/**
 * Templates index file - exports all templates
 */
const { generateEnhancedAnalytics } = require('./enhanced-analytics');
const { generateAppraisalCard } = require('./appraisal-card');

module.exports = {
  'enhanced-analytics': generateEnhancedAnalytics,
  'appraisal-card': generateAppraisalCard
};