const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const templates = require('../templates');
const { jsonCleaner } = require('../services/utils/jsonCleaner');

/**
 * Debug endpoint for visualization generation
 * POST /api/visualizations/debug
 */
router.post('/debug', async (req, res) => {
  console.log('[Visualizations] Starting debug visualization generation');

  const { postId, statisticsData, skipSaving } = req.body;

  if (!postId && !statisticsData) {
    return res.status(400).json({ 
      success: false, 
      message: 'Either postId or statisticsData is required' 
    });
  }

  try {
    let appraisalData, parsedStatistics;

    // If postId is provided, fetch data from WordPress
    if (postId) {
      const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

      if (!postTitle) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or title is missing',
        });
      }

      // Prepare the appraisal data object
      appraisalData = {
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
        artist_dates: postData.acf?.artist_dates || '',
        style: postData.acf?.style || '',
        dimensions: postData.acf?.dimensions || ''
      };

      // Use provided statistics data or fetch from WordPress
      parsedStatistics = statisticsData || postData.acf?.statistics || {};
    } else {
      // Use provided statistics data and minimal appraisal data
      appraisalData = req.body.appraisalData || {
        title: 'Debug Visualization',
        value: '1000',
        creator: 'Test Artist',
        object_type: 'Painting',
        condition_score: '9'
      };
      parsedStatistics = statisticsData;
    }

    // If statistics data is a string, try to parse it
    if (typeof parsedStatistics === 'string') {
      try {
        // Use the jsonCleaner utility to handle problematic JSON
        parsedStatistics = jsonCleaner.cleanAndParse(parsedStatistics);
        console.log('[Visualizations] Successfully parsed statistics data');
      } catch (error) {
        console.error('[Visualizations] Failed to parse statistics data:', error.message);
        console.log('[Visualizations] First 100 chars:', parsedStatistics.substring(0, 100));
        console.log('[Visualizations] Error context around position:', 
          error.position > 20 ? 
            parsedStatistics.substring(error.position - 20, error.position + 20) : 
            parsedStatistics.substring(0, 40)
        );
        
        return res.status(400).json({
          success: false,
          message: 'Invalid statistics data format',
          error: error.message,
          errorPosition: error.position,
          errorContext: error.position > 20 ? 
            parsedStatistics.substring(error.position - 20, error.position + 20) : 
            parsedStatistics.substring(0, 40)
        });
      }
    }

    // Generate visualizations without updating WordPress
    console.log('[Visualizations] Generating Enhanced Analytics HTML');
    const enhancedAnalyticsHtml = templates['enhanced-analytics'](appraisalData, parsedStatistics);
    
    console.log('[Visualizations] Generating Appraisal Card HTML');
    const appraisalCardHtml = templates['appraisal-card'](appraisalData, parsedStatistics);

    // If we should save to WordPress (and we have a postId)
    if (!skipSaving && postId) {
      console.log('[Visualizations] Updating WordPress with generated HTML');
      await wordpress.updateHtmlFields(postId, appraisalData, parsedStatistics);
      console.log('[Visualizations] WordPress update complete');
    }

    // Return the generated HTML
    res.status(200).json({
      success: true,
      message: 'Visualizations generated successfully',
      data: {
        enhancedAnalyticsHtml: enhancedAnalyticsHtml.substring(0, 500) + '... (truncated)',
        appraisalCardHtml: appraisalCardHtml.substring(0, 500) + '... (truncated)',
        postId,
        // Include statistics used for debugging
        statisticsFormat: typeof parsedStatistics,
        statisticsSample: JSON.stringify(parsedStatistics).substring(0, 200) + '... (truncated)'
      },
      savedToWordPress: !skipSaving && !!postId
    });
  } catch (error) {
    console.error(`[Visualizations] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error generating visualizations',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Process statistics data for fixing
 * POST /api/visualizations/fix-statistics
 */
router.post('/fix-statistics', async (req, res) => {
  console.log('[Visualizations] Starting statistics data fixing');

  const { postId, statisticsData } = req.body;

  if (!postId && !statisticsData) {
    return res.status(400).json({ 
      success: false, 
      message: 'Either postId or statisticsData is required' 
    });
  }

  try {
    let originalData, cleanedData, parsedData;

    // If postId is provided, fetch statistics from WordPress
    if (postId) {
      const { postData } = await wordpress.fetchPostData(postId);
      originalData = postData.acf?.statistics || '{}';
    } else {
      originalData = statisticsData;
    }

    // Fix steps for the statistics data
    const fixSteps = [];
    
    // Attempt various cleaning steps and track progress
    try {
      // Step 1: Basic cleaning
      cleanedData = originalData
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/\u00A0/g, ' ')         // Replace non-breaking spaces
        .replace(/\u2022/g, '-')         // Replace bullet points
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
      
      fixSteps.push({
        step: 'Basic character replacement',
        status: 'completed'
      });

      // Step 2: Fix PHP array notation
      if (cleanedData.includes('=>')) {
        cleanedData = cleanedData
          .replace(/(\w+)\s*=>\s*/gi, '"$1":')
          .replace(/'([^']+)':/gi, '"$1":');
        
        fixSteps.push({
          step: 'PHP array notation conversion',
          status: 'completed'
        });
      }

      // Step 3: Fix common JSON syntax issues
      cleanedData = cleanedData
        .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
      
      fixSteps.push({
        step: 'JSON syntax fixes',
        status: 'completed'
      });

      // Step 4: Try parsing
      try {
        parsedData = JSON.parse(cleanedData);
        fixSteps.push({
          step: 'JSON parsing',
          status: 'success'
        });
      } catch (error) {
        fixSteps.push({
          step: 'JSON parsing',
          status: 'failed',
          error: error.message,
          position: error.position,
          context: error.position > 20 ? 
            cleanedData.substring(error.position - 20, error.position + 20) : 
            cleanedData.substring(0, 40)
        });

        // Step 5: Deep cleaning with jsonCleaner
        try {
          parsedData = jsonCleaner.cleanAndParse(cleanedData);
          fixSteps.push({
            step: 'Deep JSON cleaning',
            status: 'success'
          });
        } catch (deepError) {
          fixSteps.push({
            step: 'Deep JSON cleaning',
            status: 'failed',
            error: deepError.message,
            position: deepError.position,
            context: deepError.position > 20 ? 
              cleanedData.substring(deepError.position - 20, deepError.position + 20) : 
              cleanedData.substring(0, 40)
          });
        }
      }
    } catch (error) {
      fixSteps.push({
        step: 'Unexpected error',
        status: 'failed',
        error: error.message
      });
    }

    // If we successfully parsed the data and have a postId, update WordPress
    if (parsedData && postId) {
      try {
        await wordpress.updatePostACFFields(postId, {
          statistics: JSON.stringify(parsedData)
        });
        
        fixSteps.push({
          step: 'WordPress update',
          status: 'success'
        });
      } catch (error) {
        fixSteps.push({
          step: 'WordPress update',
          status: 'failed',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: parsedData !== undefined,
      message: parsedData ? 'Statistics data fixed successfully' : 'Failed to fix statistics data',
      fixSteps,
      originalLength: originalData.length,
      cleanedLength: cleanedData ? cleanedData.length : 0,
      originalSample: originalData.substring(0, 200) + '... (truncated)',
      cleanedSample: cleanedData ? cleanedData.substring(0, 200) + '... (truncated)' : null,
      parsed: parsedData !== undefined,
      postId
    });
  } catch (error) {
    console.error(`[Visualizations] Error fixing statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fixing statistics data',
      error: error.message
    });
  }
});

module.exports = router;