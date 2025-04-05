const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');

/**
 * Generate HTML content for an appraisal (duplicates /generate-visualizations?)
 * POST /html-content
 * TODO: Review if this route is still needed or if its logic is covered by visualization routes.
 */
router.post('/html-content', async (req, res) => {
  console.log('[Appraisal] Starting HTML content generation');
  
  const { postId, contentType } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  try {
    // Get post data from WordPress
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    
    if (!postTitle) {
      console.warn('[Appraisal] Post not found for HTML generation');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing'
      });
    }
    
    console.log(`[Appraisal] Generating HTML content for: "${postTitle}"`);
    
    // Prepare the appraisal data object
    const appraisalData = {
      title: postTitle,
      featured_image: images.main?.url || '',
      creator: postData.acf?.creator || '',
      object_type: postData.acf?.object_type || '',
      estimated_age: postData.acf?.estimated_age || '',
      medium: postData.acf?.medium || '',
      condition_summary: postData.acf?.condition_summary || '',
      market_demand: postData.acf?.market_demand || '',
      rarity: postData.acf?.rarity || '',
      condition_score: postData.acf?.condition_score || '',
      value: postData.acf?.value || '',
      appraiser_name: postData.acf?.appraiser_name || 'Andrés Gómez',
      // Additional fields
      artist_dates: postData.acf?.artist_dates || '',
      color_palette: postData.acf?.color_palette || '',
      style: postData.acf?.style || '',
      dimensions: postData.acf?.dimensions || '',
      framed: postData.acf?.framed || '',
      edition: postData.acf?.edition || '',
      publisher: postData.acf?.publisher || '',
      composition_description: postData.acf?.composition_description || '',
      signed: postData.acf?.signed || '',
      provenance: postData.acf?.provenance || '',
      registration_number: postData.acf?.registration_number || '',
      notes: postData.acf?.notes || '',
      coa: postData.acf?.coa || '',
      meaning: postData.acf?.meaning || ''
    };
    
    // Extract and parse statistics data
    let statisticsData = postData.acf?.statistics || '{}';
    let statisticsObj = {};
    
    if (typeof statisticsData === 'string') {
      try {
        const { jsonCleaner } = require('../services/utils/jsonCleaner');
        statisticsObj = jsonCleaner.cleanAndParse(statisticsData);
        console.log('[Appraisal] Successfully parsed statistics data from post');
      } catch (error) {
        console.error('[Appraisal] Error parsing statistics data:', error);
        statisticsObj = {}; // Default to empty object
      }
    } else if (typeof statisticsData === 'object') {
      statisticsObj = statisticsData;
    }
    
    // Generate both types of HTML content
    console.log('[Appraisal] Generating enhanced analytics HTML');
    const enhancedAnalyticsHtml = await wordpress.updateEnhancedAnalyticsHtml(postId, statisticsObj);
    
    console.log('[Appraisal] Generating appraisal card HTML');
    const appraisalCardHtml = await wordpress.updateAppraisalCardHtml(postId, appraisalData, statisticsObj);
    
    console.log('[Appraisal] HTML generation complete');
    
    // Update processing metadata to track the generation
    const timestamp = new Date().toISOString();
    await wordpress.updatePostMeta(postId, 'processing_history', [
      {
        step: 'generate_html',
        timestamp,
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'HTML content generated successfully',
      details: {
        postId,
        title: postTitle,
        htmlTypes: ['enhanced_analytics_html', 'appraisal_card_html']
      }
    });
  } catch (error) {
    console.error('[Appraisal] Error generating HTML content:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating HTML content',
      error: error.message
    });
  }
});

module.exports = router;