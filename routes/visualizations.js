const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const templates = require('../templates');
const { jsonCleaner } = require('../services/utils/jsonCleaner');
const geminiService = require('../services/geminiService');
const { calculateStatistics } = require('../services/utils/statisticsCalculator');
const { fetchSalesData } = require('../services/comparablesService');
const { prepareDataContextForEnhancedAnalytics, prepareDataContextForAppraisalCard } = require('../services/utils/templateContextUtils');
const { isObject, sanitizeText } = require('../services/utils/validationUtils');

/**
 * Main endpoint to regenerate statistics and visualizations for a post.
 * POST /api/visualizations/regenerate
 */
router.post('/regenerate', async (req, res, next) => {
    const { postId } = req.body;
    console.log(`[Visualizations Regenerate] Received request for postId: ${postId}`);

    if (!postId) {
        return res.status(400).json({ success: false, message: 'Post ID is required.' });
    }

    try {
        // 1. Fetch Fresh Data from WordPress
        console.log(`[Visualizations Regenerate] Fetching data for postId: ${postId}`);
        const { postData, images, title } = await wordpress.fetchPostData(postId);

        if (!postData || !title) {
            console.warn(`[Visualizations Regenerate] Post not found or basic data missing for postId: ${postId}`);
            return res.status(404).json({ success: false, message: 'Post not found or essential data missing.' });
        }
        const appraisal = postData;

        // 2. Fetch Comparables/Sales Data (using a separate service)
        console.log(`[Visualizations Regenerate] Fetching comparables for postId: ${postId}`);
        const salesData = await fetchSalesData(appraisal);

        // 3. Calculate Statistics
        console.log(`[Visualizations Regenerate] Calculating statistics for postId: ${postId}`);
        const statistics = calculateStatistics(appraisal, salesData);
        console.log(`[Visualizations Regenerate] Calculated statistics:`, JSON.stringify(statistics).substring(0, 200) + '...');

        // 4. Generate Scores using AI (New Step)
        let generatedScores = {};
        try {
            console.log(`[Visualizations Regenerate] Generating AI scores for postId: ${postId}`);
            generatedScores = await geminiService.generateScores(appraisal.acf || {}, statistics || {});
            console.log(`[Visualizations Regenerate] AI Scores generated:`, generatedScores);
        } catch (scoreError) {
            console.error(`[Visualizations Regenerate] Error generating AI scores for postId ${postId}:`, scoreError);
        }

        // 5. Update WordPress Post with Statistics AND Scores
        console.log(`[Visualizations Regenerate] Updating WordPress ACF fields for postId: ${postId}`);
        const fieldsToUpdate = {
            statistics: JSON.stringify(statistics || {}),
            ...generatedScores
        };

        try {
            await wordpress.updatePostACFFields(postId, fieldsToUpdate);
            console.log(`[Visualizations Regenerate] Successfully updated stats and scores in ACF for postId: ${postId}`);
            console.log(`[Visualizations Regenerate] Refetching post data after ACF update for postId: ${postId}`);
            const { postData: updatedPostData } = await wordpress.fetchPostData(postId);
            if (updatedPostData) {
                appraisal.acf = { ...appraisal.acf, ...updatedPostData.acf };
                console.log(`[Visualizations Regenerate] Merged updated ACF data for postId: ${postId}`);
            } else {
                 console.warn(`[Visualizations Regenerate] Could not refetch updated post data for postId: ${postId}. Visualizations might use stale scores.`);
            }
        } catch (updateError) {
            console.error(`[Visualizations Regenerate] Failed to update ACF fields for postId ${postId}:`, updateError);
        }

        // 6. Prepare Data Contexts for Templates (using updated appraisal data)
        console.log(`[Visualizations Regenerate] Preparing template contexts for postId: ${postId}`);
        const analyticsContext = prepareDataContextForEnhancedAnalytics(appraisal, statistics, images);
        const cardContext = prepareDataContextForAppraisalCard(appraisal, statistics, images);

        // 7. Generate HTML using Gemini and Skeletons
        console.log(`[Visualizations Regenerate] Generating Enhanced Analytics HTML for postId: ${postId}`);
        const enhancedAnalyticsHtml = await templates.populateWithGemini('enhanced-analytics.html', analyticsContext);
        
        console.log(`[Visualizations Regenerate] Generating Appraisal Card HTML for postId: ${postId}`);
        const appraisalCardHtml = await templates.populateWithGemini('appraisal-card.html', cardContext);

        // 8. Update WordPress with Generated HTML
        console.log(`[Visualizations Regenerate] Updating WordPress with generated HTML for postId: ${postId}`);
        await wordpress.updateHtmlFields(postId, { 
            enhanced_analytics_html: enhancedAnalyticsHtml, 
            appraisal_card_html: appraisalCardHtml 
        });

        console.log(`[Visualizations Regenerate] Process completed successfully for postId: ${postId}`);
        res.status(200).json({
            success: true,
            message: 'Statistics, AI scores, and visualizations regenerated and saved successfully.',
            postId: postId,
        });

    } catch (error) {
        console.error(`[Visualizations Regenerate] Critical error during regeneration for postId ${postId}:`, error);
        next(error);
    }
});

/**
 * Debug endpoint for visualization generation
 * POST /api/visualizations/debug
 */
router.post('/debug', async (req, res, next) => {
    console.log('[Visualizations Debug] Starting debug visualization generation');

    const { postId, statisticsData, appraisalData: inputAppraisalData, skipSaving } = req.body;

    if (!postId && !statisticsData && !inputAppraisalData) {
        return res.status(400).json({
            success: false,
            message: 'Either postId, statisticsData, or appraisalData is required for debug.'
        });
    }

    try {
        let appraisal = {};
        let stats = {};
        let fetchedImages = {};

        // If postId is provided, fetch data from WordPress
        if (postId) {
            console.log(`[Visualizations Debug] Fetching data for postId: ${postId}`);
            const { postData: fetchedPostData, images, title } = await wordpress.fetchPostData(postId);
            if (!fetchedPostData || !title) {
                return res.status(404).json({ success: false, message: 'Post not found or essential data missing.' });
            }
            appraisal = fetchedPostData;
            fetchedImages = images;
            const rawStats = statisticsData || appraisal.acf?.statistics;
            if (rawStats) {
                if (typeof rawStats === 'string') {
                    try {
                        stats = jsonCleaner.cleanAndParse(rawStats);
                        console.log('[Visualizations Debug] Parsed statistics data from input/ACF');
                    } catch (parseError) {
                        console.error('[Visualizations Debug] Failed to parse provided/ACF statistics data:', parseError.message);
                        stats = {};
                    }
                } else if (isObject(rawStats)) {
                    stats = rawStats;
                } else {
                     stats = {};
                }
            } else {
                 stats = {};
            }
            if (inputAppraisalData && isObject(inputAppraisalData)) {
                 console.log('[Visualizations Debug] Merging provided appraisalData over fetched data.');
                 appraisal.acf = { ...appraisal.acf, ...inputAppraisalData };
                 if (inputAppraisalData.title) appraisal.title.rendered = inputAppraisalData.title;
            }

        } else {
            console.log('[Visualizations Debug] Using provided appraisalData and statisticsData.');
            appraisal = {
                ID: postId || 0,
                title: { rendered: inputAppraisalData?.title || 'Debug Appraisal' }, 
                acf: isObject(inputAppraisalData) ? inputAppraisalData : { title: 'Debug Appraisal', value: 1000 },
            };
            if (statisticsData) {
                if (typeof statisticsData === 'string') {
                    try {
                        stats = jsonCleaner.cleanAndParse(statisticsData);
                    } catch (parseError) {
                         console.error('[Visualizations Debug] Failed to parse provided statistics data:', parseError.message);
                         stats = {}; 
                    }
                } else if (isObject(statisticsData)) {
                    stats = statisticsData;
                } else {
                    stats = {};
                }
            } else {
                 stats = {};
            }
            fetchedImages = { main: { url: inputAppraisalData?.featured_image || '' } }; 
        }

        const analyticsContext = prepareDataContextForEnhancedAnalytics(appraisal, stats, fetchedImages);
        const cardContext = prepareDataContextForAppraisalCard(appraisal, stats, fetchedImages);

        console.log('[Visualizations Debug] Generating Enhanced Analytics HTML');
        const enhancedAnalyticsHtml = await templates.populateWithGemini('enhanced-analytics.html', analyticsContext);

        console.log('[Visualizations Debug] Generating Appraisal Card HTML');
        const appraisalCardHtml = await templates.populateWithGemini('appraisal-card.html', cardContext);

        let savedToWordPress = false;
        if (!skipSaving && postId) {
            try {
                 console.log(`[Visualizations Debug] Updating WordPress HTML fields for postId: ${postId}`);
                 await wordpress.updateHtmlFields(postId, { 
                     enhanced_analytics_html: enhancedAnalyticsHtml, 
                     appraisal_card_html: appraisalCardHtml 
                 });
                 savedToWordPress = true;
                 console.log(`[Visualizations Debug] WordPress HTML update complete for postId: ${postId}`);
            } catch (updateError) {
                 console.error(`[Visualizations Debug] Failed to update HTML fields for postId ${postId}:`, updateError);
            }
        }

        console.log('[Visualizations Debug] Process completed.');
        res.status(200).json({
            success: true,
            message: 'Debug visualizations generated successfully.',
            data: {
                enhancedAnalyticsHtml: enhancedAnalyticsHtml.substring(0, 500) + '... (truncated)',
                appraisalCardHtml: appraisalCardHtml.substring(0, 500) + '... (truncated)',
                postId: postId || null,
                statisticsUsed: JSON.stringify(stats).substring(0, 200) + '... (truncated)',
                analyticsContextUsed: JSON.stringify(analyticsContext).substring(0, 200) + '... (truncated)',
                cardContextUsed: JSON.stringify(cardContext).substring(0, 200) + '... (truncated)',
            },
            savedToWordPress: savedToWordPress
        });
    } catch (error) {
        console.error(`[Visualizations Debug] Error: ${error.message}`);
        next(error);
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