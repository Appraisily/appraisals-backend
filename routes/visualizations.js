const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const wordpress = require('../services/wordpress');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const { jsonCleaner } = require('../services/utils/jsonCleaner');
const { populateHtmlTemplate } = require('../services/geminiService');
const { updateHtmlFields } = require('../services/wordpress');
const { generateEnhancedAnalyticsWithGemini, generateAppraisalCardWithGemini } = require('../services/gemini-visualization');
const { prepareDataContextForEnhancedAnalytics, prepareDataContextForAppraisalCard } = require('../services/utils/templateContextUtils');
const valuerAgentClient = require('../services/valuerAgentClient');
const templatesModule = require('../templates/index');
const { regenerateStatisticsAndVisualizations } = require('../services/regenerationService');

// Define isObject function directly
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/********************************************
 * PRIMARY VISUALIZATION GENERATION ROUTES  *
 ********************************************/

/**
 * Generate visualizations with Gemini
 * POST /api/visualizations/generate-visualizations
 */
router.post('/generate-visualizations', async (req, res) => {
  console.log('[Viz Route] Starting HTML visualization generation using Gemini');

  const { postId } = req.body;
  // --- Input Validation (as added previously) --- 
  if (!postId || typeof postId !== 'string' && typeof postId !== 'number') {
    return res.status(400).json({ 
      success: false, 
      message: 'Malformed request. Missing or invalid required parameter: postId.' 
    });
  }
  // --- End Input Validation ---

  try {
    // Step 1: Fetch post data, including existing statistics
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
       return res.status(404).json({ 
         success: false, 
         message: 'Post not found or title is missing' 
       });
    }

    console.log(`[Viz Route] Checking for existing HTML visualizations for: "${postTitle}"`);
    const htmlFields = await wordpress.checkHtmlFields(postId);
    
    if (htmlFields.exists) {
      console.log('[Viz Route] HTML visualizations already exist, skipping generation');
      return res.status(200).json({ 
        success: true, 
        message: 'HTML visualizations already exist, skipping generation',
        skipped: true
      });
    }
    
    console.log(`[Viz Route] Generating HTML visualizations for: "${postTitle}" using existing stats and Gemini`);

    // Step 2: Extract statistics directly without sanitization
    let statisticsObj = {};
    const statisticsData = postData.acf?.statistics;
    if (typeof statisticsData === 'string' && statisticsData.trim() !== '') {
      try {
        // Basic JSON parse for string data (minimum required)
        statisticsObj = JSON.parse(statisticsData);
        console.log('[Viz Route] Successfully parsed existing statistics data from post');
      } catch (error) {
        console.error('[Viz Route] Error parsing statistics data:', error);
        throw new Error(`Failed to parse statistics data: ${error.message}`);
      }
    } else if (typeof statisticsData === 'object' && statisticsData !== null) {
      statisticsObj = statisticsData;
    } else {
        console.warn('[Viz Route] No valid existing statistics data found. Proceeding with empty stats.');
        statisticsObj = {}; // Proceed with empty stats object
    }
    
    // Use statistics directly without additional sanitization
    const sanitizedStats = statisticsObj;

    // Step 3: Prepare Data Contexts
    console.log('[Viz Route] Preparing data contexts for templates');
    const appraisalData = {
      postId,
      title: postTitle,
      featured_image: images.main?.url || '',
      value: postData.acf?.value,
      creator: postData.acf?.creator,
      object_type: postData.acf?.object_type,
      estimated_age: postData.acf?.estimated_age,
      medium: postData.acf?.medium,
      condition_summary: postData.acf?.condition_summary,
      appraiser_name: postData.acf?.appraiser_name,
      // Add other fields needed by context functions...
      dimensions: postData.acf?.dimensions, 
      signed: postData.acf?.signed,
      framed: postData.acf?.framed,
      provenance: postData.acf?.provenance,
      coa: postData.acf?.coa, 
    };
    const enhancedAnalyticsContext = prepareDataContextForEnhancedAnalytics(sanitizedStats, appraisalData, postId);
    const appraisalCardContext = prepareDataContextForAppraisalCard(sanitizedStats, appraisalData);

    // Step 4: Read Skeleton HTML Files
    console.log('[Viz Route] Reading skeleton HTML files');
    const skeletonPathAnalytics = path.join(__dirname, '../templates/skeletons/enhanced-analytics.html');
    const skeletonPathCard = path.join(__dirname, '../templates/skeletons/appraisal-card.html');
    const skeletonHtmlAnalytics = await fs.readFile(skeletonPathAnalytics, 'utf8');
    const skeletonHtmlCard = await fs.readFile(skeletonPathCard, 'utf8');

    // Step 5: Call Gemini Service to Populate Templates
    console.log('[Viz Route] Populating templates using Gemini Service');
    
    // Create a combined data object with all necessary information
    const rawDataForAI = {
      statistics: sanitizedStats,
      appraisal: {
        ...appraisalData,
        postId,
        title: postTitle,
        value: postData.acf?.value,
        ...postData.acf // Include all ACF fields directly
      },
      images,
      // Optional but helpful metadata
      metaInfo: {
        currentDate: new Date().toISOString(),
        generationTimestamp: Date.now()
      }
    };
    
    // Pass the complete data directly to the AI without specialized preparation
    const populatedAnalyticsHtml = await populateHtmlTemplate(skeletonHtmlAnalytics, rawDataForAI);
    const populatedCardHtml = await populateHtmlTemplate(skeletonHtmlCard, rawDataForAI);

    // Step 6: Embed CSS and JavaScript into the populated HTML templates
    console.log('[Viz Route] Embedding CSS and JavaScript into HTML templates');
    const completeAnalyticsHtml = templatesModule.embedStylesAndScripts('enhanced-analytics', populatedAnalyticsHtml);
    const completeCardHtml = templatesModule.embedStylesAndScripts('appraisal-card', populatedCardHtml);

    // Step 7: Save Populated HTML and ACF fields to WordPress
    console.log('[Viz Route] Saving populated HTML and ACF fields to WordPress');
    try {
      // Prepare fields, ensuring strings and handling nulls/undefined
      const statisticsString = sanitizedStats ? JSON.stringify(sanitizedStats) : '{}'; // Stringify or use empty object JSON
      const analyticsHtmlString = completeAnalyticsHtml || ''; // Default to empty string if null/undefined
      const cardHtmlString = completeCardHtml || ''; // Default to empty string if null/undefined

      // Extract key metrics from sanitizedStats to update as individual ACF fields
      const acfFields = {
        'statistics': statisticsString,
        'enhanced_analytics_html': analyticsHtmlString, 
        'appraisal_card_html': cardHtmlString
      };
      
      // Extract individual metrics if they exist in sanitizedStats
      if (sanitizedStats) {
        // Store key metrics as individual ACF fields
        if (typeof sanitizedStats.historical_significance === 'number') {
          acfFields.historical_significance = sanitizedStats.historical_significance;
        }
        if (typeof sanitizedStats.investment_potential === 'number') {
          acfFields.investment_potential = sanitizedStats.investment_potential;
        }
        if (typeof sanitizedStats.provenance_strength === 'number') {
          acfFields.provenance_strength = sanitizedStats.provenance_strength;
        }
        
        // Store top auction results separately if available
        if (Array.isArray(sanitizedStats.comparable_sales) && sanitizedStats.comparable_sales.length > 0) {
          acfFields.top_auction_results = JSON.stringify(sanitizedStats.comparable_sales);
        }
        
        // Generate and store statistics summary text if it doesn't already exist
        if (!postData.acf?.statistics_summary_text) {
          try {
            console.log('[Viz Route] Generating comprehensive statistics summary for PDF');
            
            // Get the raw statistics data from WordPress
            let rawStatisticsData = postData.acf?.statistics || '{}';
            
            // If the statistics data is a string, ensure it's valid JSON but don't modify the structure
            let statisticsObject;
            if (typeof rawStatisticsData === 'string') {
              try {
                statisticsObject = JSON.parse(rawStatisticsData);
                console.log('[Viz Route] Successfully parsed existing statistics JSON data');
              } catch (parseError) {
                console.error('[Viz Route] Error parsing statistics JSON data:', parseError);
                statisticsObject = {};
              }
            } else if (typeof rawStatisticsData === 'object' && rawStatisticsData !== null) {
              statisticsObject = rawStatisticsData;
            } else {
              statisticsObject = {};
            }
            
            // Get the statistical summary prompt 
            const promptsDir = path.join(__dirname, '..', 'prompts');
            const promptFilePath = path.join(promptsDir, 'statistics_summary.txt');
            let summaryPrompt = '';
            try {
              summaryPrompt = await fs.readFile(promptFilePath, 'utf8');
            } catch (err) {
              console.warn('[Viz Route] Could not read statistics_summary prompt, using default');
              summaryPrompt = 'Provide a comprehensive statistical market analysis based on the data.';
            }
            
            // Generate the comprehensive summary using OpenAI
            // Pass the raw statistics data directly to the prompt
            const rawStatisticsJson = JSON.stringify(statisticsObject, null, 2);
            
            // Create the prompt with the raw data
            const fullPrompt = `${summaryPrompt}\n\n## RAW STATISTICAL DATA ##\n${rawStatisticsJson}\n\nGenerate a comprehensive statistical market analysis for PDF based on this data.`;
            
            // Import the OpenAI service
            const openai = require('../services/openai');
            
            try {
              // Generate content with OpenAI using the statistics data
              const summaryContent = await openai.generateContent(
                fullPrompt,
                postData.title?.rendered || 'Appraisal Item',
                {},  // No images needed for statistics
                'gpt-4o',  // Use the latest model
                "You are an expert statistics analyst for art and collectibles appraisals. Generate formal PDF-ready content.",
                800,  // Max tokens - enough for 2-3 paragraphs
                0.7   // Temperature
              );
              
              // Store the AI-generated comprehensive summary
              acfFields.statistics_summary_text = summaryContent;
              console.log('[Viz Route] Generated comprehensive statistics summary using AI');
            } catch (aiError) {
              console.error('[Viz Route] AI generation failed, falling back to basic summary:', aiError);
              // Fall back to simple summary if AI generation fails
              const summaryParts = [];
              
              if (statisticsObject.count) {
                summaryParts.push(`Analysis based on ${statisticsObject.count} comparable items.`);
              }
              
              if (statisticsObject.price_min && statisticsObject.price_max) {
                summaryParts.push(`Market range: $${Math.round(statisticsObject.price_min).toLocaleString()} to $${Math.round(statisticsObject.price_max).toLocaleString()}.`);
              }
              
              if (statisticsObject.price_trend_percentage) {
                const trend = statisticsObject.price_trend_percentage;
                const trendDirection = trend.includes('+') ? 'increasing' : 'decreasing';
                summaryParts.push(`Market prices ${trendDirection} at ${trend}.`);
              }
              
              if (statisticsObject.confidence_level) {
                summaryParts.push(`${statisticsObject.confidence_level} confidence in valuation.`);
              }
              
              if (summaryParts.length > 0) {
                acfFields.statistics_summary_text = summaryParts.join(' ');
              }
            }
          } catch (statsSummaryError) {
            console.error('[Viz Route] Error generating statistics summary:', statsSummaryError);
            // Create a minimal fallback
            acfFields.statistics_summary_text = `Statistical analysis supports the valuation of $${sanitizedStats.value ? Math.round(sanitizedStats.value).toLocaleString() : ''}.`;
          }
        }
        
        // If a detailed title doesn't already exist, generate one based on the data
        if (postData && (!postData.acf?.detailed_title || postData.acf.detailed_title === '')) {
          const detailedTitle = `${postTitle}. Valued at $${sanitizedStats.value ? Math.round(sanitizedStats.value).toLocaleString() : ''}. ${acfFields.statistics_summary_text || ''}`;
          acfFields.detailed_title = detailedTitle;
        }
      }

      await wordpress.updatePostACFFields(postId, acfFields);
      console.log('[Viz Route] ACF fields updated successfully.');
    } catch (acfUpdateError) {
        // Log the error but continue execution
        console.error(`[Viz Route] Error updating ACF fields for post ${postId}:`, acfUpdateError.message);
        console.warn('[Viz Route] Continuing process despite ACF update error.');
        // Optionally, record this specific failure somewhere if needed
    }
    
    // Step 8: Update Post Meta History (Will run even if ACF update failed)
    console.log('[Viz Route] Updating post meta history...');
    await wordpress.updatePostMeta(postId, 'processing_history', [{
      step: 'generate_visualizations_gemini', // Updated step name
      timestamp: new Date().toISOString(), 
      status: 'completed'
    }]);

    // Step 9: Return Success Response
    res.status(200).json({
      success: true,
      message: 'HTML visualizations generated successfully using Gemini.',
      details: { postId, title: postTitle }
    });

  } catch (error) {
    // Consistent error handling
    console.error(`[Viz Route] /generate-visualizations error for post ${postId}: ${error.message}`);
    const statusCode = error.message?.includes('Post not found') ? 404 : 500;
    const userMessage = statusCode === 404 ? 'Post not found' : 'Error generating visualizations.';
    // Ensure response is sent only once
    if (!res.headersSent) { 
        res.status(statusCode).json({ 
            success: false, 
            message: userMessage,
            error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
  }
});

/**
 * Regenerate statistics and visualizations
 * POST /api/visualizations/regenerate-statistics-and-visualizations
 */
router.post('/regenerate-statistics-and-visualizations', async (req, res) => {
  console.log('[Viz Route] Received request for statistics and visualizations regeneration');
  
  const { postId, newValue, enableDebug, appraisalId, options } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: postId'
    });
  }
  
  try {
    // Call the centralized regeneration service function
    const result = await regenerateStatisticsAndVisualizations(postId, newValue, { appraisalId, ...options });

    if (result.success) {
      // Prepare response, potentially including debug info
      const responsePayload = {
        success: true,
        message: result.message,
        postId: postId,
        appraisalId: appraisalId || undefined,
        debug: enableDebug ? result.data : undefined
      };
      return res.json(responsePayload);
    } else {
      // Determine appropriate status code based on error if possible
      let statusCode = 500;
      if (result.error?.includes('Post not found')) {
          statusCode = 404;
      }
      if (result.message?.includes('Failed to fetch statistics')) {
          statusCode = 502; // Bad Gateway might be appropriate if valuer-agent fails
      }
      
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error // Include error details
      });
    }
  } catch (error) {
    // Catch unexpected errors from the service call itself
    console.error('[Viz Route] Unexpected error calling regeneration service:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during the regeneration process',
      error: error.message
    });
  }
});

/********************************************
 * DEBUGGING AND UTILITY ROUTES            *
 ********************************************/

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
                        stats = JSON.parse(rawStats);
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
                        stats = JSON.parse(statisticsData);
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

        // Read Skeleton HTML Files directly for the debug route
        console.log('[Visualizations Debug] Reading skeleton HTML files');
        const skeletonPathAnalytics = path.join(__dirname, '../templates/skeletons/enhanced-analytics.html');
        const skeletonPathCard = path.join(__dirname, '../templates/skeletons/appraisal-card.html');
        const skeletonHtmlAnalytics = await fs.readFile(skeletonPathAnalytics, 'utf8');
        const skeletonHtmlCard = await fs.readFile(skeletonPathCard, 'utf8');

        // Prepare the data for Gemini
        const analyticsContext = prepareDataContextForEnhancedAnalytics(stats, appraisal, fetchedImages);
        const cardContext = prepareDataContextForAppraisalCard(stats, appraisal, fetchedImages);

        // Create a combined data object with all necessary information for AI
        const rawDataForAI = {
          statistics: stats,
          appraisal: {
            ...appraisal.acf,
            postId: postId || 0,
            title: appraisal.title?.rendered || 'Debug Appraisal',
            value: appraisal.acf?.value || 1000
          },
          images: fetchedImages,
          metaInfo: {
            currentDate: new Date().toISOString(),
            generationTimestamp: Date.now()
          }
        };

        // Generate templates using Gemini
        console.log('[Visualizations Debug] Generating Enhanced Analytics HTML');
        const enhancedAnalyticsHtml = await populateHtmlTemplate(skeletonHtmlAnalytics, rawDataForAI);

        console.log('[Visualizations Debug] Generating Appraisal Card HTML');
        const appraisalCardHtml = await populateHtmlTemplate(skeletonHtmlCard, rawDataForAI);

        // Embed CSS and JavaScript into the populated HTML templates
        console.log('[Visualizations Debug] Embedding CSS and JavaScript into HTML templates');
        const completeAnalyticsHtml = templatesModule.embedStylesAndScripts('enhanced-analytics', enhancedAnalyticsHtml);
        const completeCardHtml = templatesModule.embedStylesAndScripts('appraisal-card', appraisalCardHtml);

        let savedToWordPress = false;
        if (!skipSaving && postId) {
            try {
                 console.log(`[Visualizations Debug] Updating WordPress HTML fields for postId: ${postId}`);
                 await wordpress.updateHtmlFields(postId, { 
                     enhanced_analytics_html: completeAnalyticsHtml, 
                     appraisal_card_html: completeCardHtml 
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
                enhancedAnalyticsHtml: completeAnalyticsHtml.substring(0, 500) + '... (truncated)',
                appraisalCardHtml: completeCardHtml.substring(0, 500) + '... (truncated)',
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
        .replace(/[\x00-\x1F\x7F]/g, ''); // eslint-disable-line no-control-regex -- Allow matching control characters
      
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