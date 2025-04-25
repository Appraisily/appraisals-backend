/**
 * HTML generation routes
 * Handles server-side generation of HTML components using Gemini AI
 */

const express = require('express');
const router = express.Router();
const { 
  generateEnhancedAnalyticsWithGemini,
  generateAppraisalCardWithGemini
} = require('../services/gemini-visualization');

/**
 * Generate HTML for a specific visualization type using Gemini AI
 * 
 * @route POST /api/html/generate
 * @param {string} visualizationType - Type of visualization (enhanced-analytics or appraisal-card)
 * @param {Object} statistics - The statistics data for the visualization
 * @param {Object} [appraisal] - The appraisal data (required for appraisal-card)
 * @param {Object} [options] - Additional options for customization
 * @returns {Object} Success status and generated HTML
 */
router.post('/generate', async (req, res) => {
  try {
    const { visualizationType, statistics, appraisal, options } = req.body;
    
    if (!visualizationType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: visualizationType'
      });
    }
    
    let htmlContent = '';
    
    switch(visualizationType.toLowerCase()) {
      case 'enhanced-analytics':
        if (!statistics) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameter: statistics'
          });
        }
        
        // Use Gemini-based function for enhanced analytics
        htmlContent = await generateEnhancedAnalyticsWithGemini(statistics, options || {});
        break;
        
      case 'appraisal-card':
        if (!appraisal) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameter: appraisal'
          });
        }
        
        // Use Gemini-based function for appraisal card
        htmlContent = await generateAppraisalCardWithGemini(appraisal, statistics || {}, options || {});
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid visualization type. Supported types: enhanced-analytics, appraisal-card'
        });
    }
    
    return res.json({
      success: true,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error generating HTML:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate HTML',
      error: error.message
    });
  }
});

/**
 * Process statistics data and add generated HTML using Gemini AI
 * 
 * @route POST /api/html/process-statistics
 * @param {Object} statistics - The statistics data to process
 * @param {Object} [appraisal] - Optional appraisal data
 * @returns {Object} Success status and processed data with HTML
 */
router.post('/process-statistics', async (req, res) => {
  try {
    const { statistics, appraisal } = req.body;
    
    if (!statistics) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: statistics'
      });
    }
    
    // Create a deep copy of the statistics to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(statistics));
    
    // Use Gemini to generate HTML for enhanced analytics
    processedData.enhanced_analytics_html = await generateEnhancedAnalyticsWithGemini(statistics);
    
    // Use Gemini to generate HTML for appraisal card if appraisal data is provided
    if (appraisal) {
      processedData.appraisal_card_html = await generateAppraisalCardWithGemini(appraisal, statistics);
    }
    
    return res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error processing statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process statistics',
      error: error.message
    });
  }
});

module.exports = router;