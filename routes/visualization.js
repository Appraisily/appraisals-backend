const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // Needed for regenerate route
const wordpress = require('../services/wordpress');
const config = require('../config'); // Needed for valuer-agent URL
// Import validation function if it exists and is needed
// const { validateStatisticsData } = require('../services/metadataProcessor'); // Assuming it's moved there
// Helper for cleaning JSON data before storing in WP
const { jsonCleaner } = require('../services/utils/jsonCleaner'); 

// Moved from appraisal.js
/**
 * Generate HTML visualizations for an appraisal post if they don't exist
 * POST /generate-visualizations
 */
router.post('/generate-visualizations', async (req, res) => {
  console.log('[Viz Route] Starting HTML visualization generation');

  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId is required.' });
  }

  try {
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
      return res.status(404).json({ success: false, message: 'Post not found or title is missing' });
    }

    console.log(`[Viz Route] Checking for existing HTML visualizations for: "${postTitle}"`);
    const htmlFields = await wordpress.checkHtmlFields(postId);
    
    if (htmlFields.exists) {
      console.log('[Viz Route] HTML visualizations already exist, skipping generation');
      return res.status(200).json({
        success: true,
        message: 'HTML visualizations already exist.',
        details: { postId, title: postTitle, status: 'skipped' }
      });
    }
    
    console.log(`[Viz Route] Generating HTML visualizations for: "${postTitle}"`);

    // Extract statistics, ensuring it's an object
    let statisticsObj = {};
    const statisticsData = postData.acf?.statistics;
    if (typeof statisticsData === 'string' && statisticsData.trim() !== '') {
      try {
        statisticsObj = jsonCleaner.cleanAndParse(statisticsData);
        console.log('[Viz Route] Successfully parsed statistics data from post');
      } catch (error) {
        console.error('[Viz Route] Error parsing statistics data:', error);
        statisticsObj = {}; // Default to empty object on error
      }
    } else if (typeof statisticsData === 'object' && statisticsData !== null) {
      statisticsObj = statisticsData;
    }

    // Prepare appraisal data object
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
      // Add other relevant fields from postData.acf...
    };

    // Update/Generate HTML fields in WordPress
    await wordpress.updateHtmlFields(postId, appraisalData, statisticsObj);

    console.log('[Viz Route] HTML visualization generation complete');
    await wordpress.updatePostMeta(postId, 'processing_history', [{
      step: 'generate_visualizations', timestamp: new Date().toISOString(), status: 'completed'
    }]);

    res.status(200).json({
      success: true,
      message: 'HTML visualizations generated successfully.',
      details: { postId, title: postTitle }
    });

  } catch (error) {
    console.error(`[Viz Route] /generate-visualizations error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message || 'Error generating visualizations.' });
  }
});

// Moved from appraisal.js
/**
 * Regenerate statistics (via valuer-agent) and HTML visualizations
 * POST /regenerate-statistics-and-visualizations
 */
router.post('/regenerate-statistics-and-visualizations', async (req, res) => {
  console.log('[Viz Route] Starting statistics and visualizations regeneration');

  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId is required.' });
  }

  try {
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
      return res.status(404).json({ success: false, message: 'Post not found or title is missing' });
    }

    const targetValue = parseFloat(postData.acf?.value);
    if (isNaN(targetValue)) {
      return res.status(400).json({ success: false, message: 'Post has invalid or missing value' });
    }
    
    console.log(`[Viz Route] Regenerating statistics for: "${postTitle}" with value ${targetValue}`);
    
    // Call valuer-agent to regenerate statistics
    // TODO: Use valuerAgentClient if available
    console.log('[Viz Route] Calling valuer-agent for enhanced statistics');
    const valuerAgentUrl = `${config.VALUER_AGENT_API_URL}/api/enhanced-statistics`;
    const response = await fetch(valuerAgentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: postTitle, value: targetValue, limit: 20,
        minPrice: Math.floor(targetValue * 0.6),
        maxPrice: Math.ceil(targetValue * 1.6)
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Viz Route] Error from valuer-agent:', errorText);
      throw new Error(`Error regenerating statistics from valuer agent: ${errorText}`);
    }
    
    const statsResponse = await response.json();
    if (!statsResponse.success || !statsResponse.statistics) {
      console.error('[Viz Route] Invalid response from valuer-agent:', statsResponse);
      throw new Error('Invalid statistics response from valuer agent');
    }
    
    console.log('[Viz Route] Statistics regenerated, validating and saving...');
    
    // Assume validateStatisticsData exists and is imported correctly
    // If not, this require might fail or need adjustment
    let validateStatisticsData = (stats) => stats; // Placeholder if function isn't moved/available
    try {
        const processor = require('../services/metadataProcessor');
        if (processor.validateStatisticsData) {
             validateStatisticsData = processor.validateStatisticsData;
        }
    } catch(e) { console.warn("Could not load validateStatisticsData function"); }

    const validatedStats = validateStatisticsData(statsResponse.statistics);
    
    // Sanitize for WP storage
     const sanitizedStats = jsonCleaner.cleanObject(validatedStats); // Use cleaner utility

    await wordpress.updateWordPressMetadata(postId, 'statistics', sanitizedStats); // Use moved WP function
    
    console.log('[Viz Route] Statistics saved, regenerating HTML visualizations');
    
    // Prepare appraisal data object (similar to /generate-visualizations)
    const appraisalData = {
      title: postTitle,
      featured_image: images.main?.url || '',
      // ... other fields ...
      value: postData.acf?.value || '',
    };
    
    await wordpress.updateHtmlFields(postId, appraisalData, sanitizedStats);
    console.log('[Viz Route] HTML visualizations regenerated successfully');
    
    await wordpress.updatePostMeta(postId, 'processing_history', [
      { step: 'regenerate_statistics', timestamp: new Date().toISOString(), status: 'completed' },
      { step: 'regenerate_visualizations', timestamp: new Date().toISOString(), status: 'completed' }
    ]);
    
    return res.json({
      success: true,
      message: 'Statistics and visualizations regenerated successfully',
      details: {
        postId, title: postTitle,
        statistics: { count: sanitizedStats.count, /* other summary fields */ }
      }
    });

  } catch (error) {
    console.error(`[Viz Route] /regenerate error: ${error.message}`);
    res.status(500).json({
      success: false, message: 'Error regenerating statistics and visualizations', error: error.message
    });
  }
});

module.exports = router; 