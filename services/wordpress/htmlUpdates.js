/**
 * WordPress integration for HTML field updates
 * Handles updating the HTML visualization fields in WordPress
 */

const client = require('./client');
const { generateEnhancedAnalytics } = require('../../templates/enhanced-analytics');
const { generateAppraisalCard } = require('../../templates/appraisal-card');
const { updateNotes } = require('./updates');

/**
 * Updates the HTML visualization fields in WordPress
 * 
 * @param {number|string} postId - WordPress post ID
 * @param {Object} appraisalData - The appraisal data
 * @param {Object} statisticsData - The statistics data
 * @returns {Promise<boolean>} - Success status
 */
async function updateHtmlFields(postId, appraisalData, statisticsData) {
  try {
    console.log(`Generating and updating HTML fields for post ${postId}`);
    
    // Generate the HTML content
    const enhancedAnalyticsHtml = generateEnhancedAnalytics(statisticsData);
    const appraisalCardHtml = generateAppraisalCard(appraisalData, statisticsData);
    
    // Update the WordPress post
    await client.updatePost(postId, {
      acf: {
        enhanced_analytics_html: enhancedAnalyticsHtml,
        appraisal_card_html: appraisalCardHtml
      }
    });
    
    console.log(`Successfully updated HTML fields for post ${postId}`);
    
    // Add notes about the update
    await updateNotes(postId, 'Updated enhanced_analytics_html and appraisal_card_html fields with pre-rendered HTML');
    
    return true;
  } catch (error) {
    console.error(`Error updating HTML fields for post ${postId}:`, error);
    
    // Log error to WordPress notes
    await updateNotes(postId, `Error updating HTML fields: ${error.message}`);
    
    throw error;
  }
}

/**
 * Updates just the enhanced analytics HTML field
 * 
 * @param {number|string} postId - WordPress post ID
 * @param {Object} statisticsData - The statistics data
 * @returns {Promise<boolean>} - Success status
 */
async function updateEnhancedAnalyticsHtml(postId, statisticsData) {
  try {
    console.log(`Generating and updating enhanced analytics HTML for post ${postId}`);
    
    // Generate the HTML content
    const enhancedAnalyticsHtml = generateEnhancedAnalytics(statisticsData);
    
    // Update the WordPress post
    await client.updatePost(postId, {
      acf: {
        enhanced_analytics_html: enhancedAnalyticsHtml
      }
    });
    
    console.log(`Successfully updated enhanced analytics HTML for post ${postId}`);
    
    // Add notes about the update
    await updateNotes(postId, 'Updated enhanced_analytics_html field with pre-rendered HTML');
    
    return true;
  } catch (error) {
    console.error(`Error updating enhanced analytics HTML for post ${postId}:`, error);
    
    // Log error to WordPress notes
    await updateNotes(postId, `Error updating enhanced analytics HTML: ${error.message}`);
    
    throw error;
  }
}

/**
 * Updates just the appraisal card HTML field
 * 
 * @param {number|string} postId - WordPress post ID
 * @param {Object} appraisalData - The appraisal data
 * @param {Object} statisticsData - The statistics data
 * @returns {Promise<boolean>} - Success status
 */
async function updateAppraisalCardHtml(postId, appraisalData, statisticsData) {
  try {
    console.log(`Generating and updating appraisal card HTML for post ${postId}`);
    
    // Generate the HTML content
    const appraisalCardHtml = generateAppraisalCard(appraisalData, statisticsData);
    
    // Update the WordPress post
    await client.updatePost(postId, {
      acf: {
        appraisal_card_html: appraisalCardHtml
      }
    });
    
    console.log(`Successfully updated appraisal card HTML for post ${postId}`);
    
    // Add notes about the update
    await updateNotes(postId, 'Updated appraisal_card_html field with pre-rendered HTML');
    
    return true;
  } catch (error) {
    console.error(`Error updating appraisal card HTML for post ${postId}:`, error);
    
    // Log error to WordPress notes
    await updateNotes(postId, `Error updating appraisal card HTML: ${error.message}`);
    
    throw error;
  }
}

module.exports = {
  updateHtmlFields,
  updateEnhancedAnalyticsHtml,
  updateAppraisalCardHtml
};