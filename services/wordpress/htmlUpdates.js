/**
 * WordPress integration for HTML field updates
 * Handles updating the HTML visualization fields in WordPress
 */

const client = require('./client');
const { generateEnhancedAnalytics } = require('../../templates/enhanced-analytics');
const { generateAppraisalCard } = require('../../templates/appraisal-card');
const { updateNotes } = require('./updates');
const { cleanAndParseJSON } = require('../utils/jsonCleaner');
const { 
  generateEnhancedAnalyticsWithGemini,
  generateAppraisalCardWithGemini 
} = require('../gemini-visualization');

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
    
    // Clean and ensure statisticsData is a valid object
    let cleanedStats = statisticsData;
    if (typeof statisticsData === 'string') {
      try {
        cleanedStats = cleanAndParseJSON(statisticsData);
        console.log('Successfully cleaned and parsed statistics data');
      } catch (error) {
        console.error('Error cleaning statistics data:', error);
        cleanedStats = {}; // fallback
      }
    }
    
    // Generate the HTML content using Gemini
    let enhancedAnalyticsHtml, appraisalCardHtml;
    
    try {
      // Try generating with Gemini first
      console.log('Generating enhanced analytics with Gemini');
      enhancedAnalyticsHtml = await generateEnhancedAnalyticsWithGemini(cleanedStats);
    } catch (error) {
      console.error('Error generating enhanced analytics with Gemini, falling back to template:', error);
      enhancedAnalyticsHtml = generateEnhancedAnalytics(cleanedStats);
    }
    
    try {
      // Try generating with Gemini first
      console.log('Generating appraisal card with Gemini');
      appraisalCardHtml = await generateAppraisalCardWithGemini(appraisalData, cleanedStats);
    } catch (error) {
      console.error('Error generating appraisal card with Gemini, falling back to template:', error);
      appraisalCardHtml = generateAppraisalCard(appraisalData, cleanedStats);
    }
    
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
    
    // Generate the HTML content using Gemini
    let enhancedAnalyticsHtml;
    
    try {
      // Try generating with Gemini first
      console.log('Generating enhanced analytics with Gemini');
      enhancedAnalyticsHtml = await generateEnhancedAnalyticsWithGemini(statisticsData);
    } catch (error) {
      console.error('Error generating enhanced analytics with Gemini, falling back to template:', error);
      enhancedAnalyticsHtml = generateEnhancedAnalytics(statisticsData);
    }
    
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
    
    // Generate the HTML content using Gemini
    let appraisalCardHtml;
    
    try {
      // Try generating with Gemini first
      console.log('Generating appraisal card with Gemini');
      appraisalCardHtml = await generateAppraisalCardWithGemini(appraisalData, statisticsData);
    } catch (error) {
      console.error('Error generating appraisal card with Gemini, falling back to template:', error);
      appraisalCardHtml = generateAppraisalCard(appraisalData, statisticsData);
    }
    
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

/**
 * Checks if HTML visualization fields already exist and have content
 * 
 * @param {number|string} postId - WordPress post ID
 * @returns {Promise<Object>} - Object with exists flag and field details
 */
async function checkHtmlFields(postId) {
  try {
    console.log(`Checking if HTML visualization fields exist for post ${postId}`);
    
    const response = await client.getPost(postId, {
      _fields: 'acf.enhanced_analytics_html,acf.appraisal_card_html'
    });
    
    const enhancedAnalyticsExists = response.acf?.enhanced_analytics_html && 
                                   response.acf.enhanced_analytics_html.length > 100;
    
    const appraisalCardExists = response.acf?.appraisal_card_html && 
                               response.acf.appraisal_card_html.length > 100;
    
    // Both need to exist and have sufficient content
    const exists = enhancedAnalyticsExists && appraisalCardExists;
    
    console.log(`HTML visualization fields: ${exists ? 'exist' : 'do not exist'} for post ${postId}`);
    console.log(`- Enhanced analytics: ${enhancedAnalyticsExists ? 'exists' : 'missing'}`);
    console.log(`- Appraisal card: ${appraisalCardExists ? 'exists' : 'missing'}`);
    
    return {
      exists,
      enhancedAnalytics: enhancedAnalyticsExists,
      appraisalCard: appraisalCardExists
    };
  } catch (error) {
    console.error(`Error checking HTML fields for post ${postId}:`, error);
    return { exists: false, enhancedAnalytics: false, appraisalCard: false };
  }
}

module.exports = {
  updateHtmlFields,
  updateEnhancedAnalyticsHtml,
  updateAppraisalCardHtml,
  checkHtmlFields
};