/**
 * HTML generation routes
 * Handles server-side generation of HTML components
 */

const express = require('express');
const router = express.Router();
const { generateEnhancedAnalytics } = require('../templates/enhanced-analytics');
const { generateAppraisalCard } = require('../templates/appraisal-card');

/**
 * Generate HTML for a specific visualization type
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
        
        htmlContent = generateEnhancedAnalytics(statistics, options || {});
        break;
        
      case 'appraisal-card':
        if (!appraisal) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameter: appraisal'
          });
        }
        
        htmlContent = generateAppraisalCard(appraisal, statistics || {}, options || {});
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
 * Process statistics data and add generated HTML
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
    
    // Generate HTML for enhanced analytics
    processedData.enhanced_analytics_html = generateEnhancedAnalytics(statistics);
    
    // Generate HTML for appraisal card if appraisal data is provided
    if (appraisal) {
      processedData.appraisal_card_html = generateAppraisalCard(appraisal, statistics);
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