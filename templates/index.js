/**
 * Templates index file - exports HTML templates directly
 * 
 * This file provides access to raw HTML templates that can be sent
 * directly to AI services without any preprocessing or parsing.
 */
const fs = require('fs');
const path = require('path');

// Read HTML files directly from skeletons folder
const appraisalCardTemplate = fs.readFileSync(path.join(__dirname, 'skeletons', 'appraisal-card.html'), 'utf8');
const enhancedAnalyticsTemplate = fs.readFileSync(path.join(__dirname, 'skeletons', 'enhanced-analytics.html'), 'utf8');

module.exports = {
  'appraisal-card': appraisalCardTemplate,
  'enhanced-analytics': enhancedAnalyticsTemplate
};