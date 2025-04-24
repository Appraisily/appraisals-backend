const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const wordpress = require('../services/wordpress');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const templates = require('../src/templates');
const { jsonCleaner } = require('../services/utils/jsonCleaner');
const { populateHtmlTemplate } = require('../services/geminiService');
const { updateHtmlFields } = require('../services/wordpress');
const { generateEnhancedAnalyticsWithGemini, generateAppraisalCardWithGemini } = require('../services/gemini-visualization');
const { prepareDataContextForEnhancedAnalytics, prepareDataContextForAppraisalCard } = require('../services/utils/templateContextUtils');
const valuerAgentClient = require('../services/valuerAgentClient');

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

    // Step 2: Extract and sanitize existing statistics
    let statisticsObj = {};
    const statisticsData = postData.acf?.statistics;
    if (typeof statisticsData === 'string' && statisticsData.trim() !== '') {
      try {
        statisticsObj = jsonCleaner.cleanAndParse(statisticsData);
        console.log('[Viz Route] Successfully parsed existing statistics data from post');
      } catch (error) {
        console.error('[Viz Route] Error parsing existing statistics data:', error);
        // Decide if we should proceed with empty stats or throw error
        // statisticsObj = {}; // Default to empty object on error
         throw new Error(`Failed to parse existing statistics data: ${error.message}`);
      }
    } else if (typeof statisticsData === 'object' && statisticsData !== null) {
      statisticsObj = statisticsData;
    } else {
        console.warn('[Viz Route] No valid existing statistics data found. Proceeding with empty stats.');
        statisticsObj = {}; // Proceed with empty stats object
    }
    // Optional: Validate the parsed statistics object
    let validateStatisticsData = (stats) => stats; // Placeholder
    try {
        const processor = require('../services/metadataProcessor');
        if (processor.validateStatisticsData) { validateStatisticsData = processor.validateStatisticsData; }
    } catch(e) { console.warn("Could not load validateStatisticsData"); }
    const sanitizedStats = jsonCleaner.cleanObject(validateStatisticsData(statisticsObj)); // Clean validated/parsed stats

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

    // Step 6: Save Populated HTML and ACF fields to WordPress
    console.log('[Viz Route] Saving populated HTML and ACF fields to WordPress');
    try {
      // Prepare fields, ensuring strings and handling nulls/undefined
      const statisticsString = sanitizedStats ? JSON.stringify(sanitizedStats) : '{}'; // Stringify or use empty object JSON
      const analyticsHtmlString = populatedAnalyticsHtml || ''; // Default to empty string if null/undefined
      const cardHtmlString = populatedCardHtml || ''; // Default to empty string if null/undefined

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
          const summaryParts = [];
          
          if (sanitizedStats.count) {
            summaryParts.push(`Analysis based on ${sanitizedStats.count} comparable items.`);
          }
          
          if (sanitizedStats.price_min && sanitizedStats.price_max) {
            summaryParts.push(`Market range: $${Math.round(sanitizedStats.price_min).toLocaleString()} to $${Math.round(sanitizedStats.price_max).toLocaleString()}.`);
          }
          
          if (sanitizedStats.price_trend_percentage) {
            const trend = sanitizedStats.price_trend_percentage;
            const trendDirection = trend.includes('+') ? 'increasing' : 'decreasing';
            summaryParts.push(`Market prices ${trendDirection} at ${trend}.`);
          }
          
          if (sanitizedStats.confidence_level) {
            summaryParts.push(`${sanitizedStats.confidence_level} confidence in valuation.`);
          }
          
          if (summaryParts.length > 0) {
            acfFields.statistics_summary_text = summaryParts.join(' ');
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
    
    // Step 7: Update Post Meta History (Will run even if ACF update failed)
    console.log('[Viz Route] Updating post meta history...');
    await wordpress.updatePostMeta(postId, 'processing_history', [{
      step: 'generate_visualizations_gemini', // Updated step name
      timestamp: new Date().toISOString(), 
      status: 'completed'
    }]);

    // Step 8: Return Success Response
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
  console.log('[Viz Route] Starting statistics and visualizations regeneration');
  
  const { postId, newValue, enableDebug, appraisalId, options } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: postId'
    });
  }
  
  try {
    // Log additional request info if provided (from appraisers-backend)
    if (appraisalId) {
      console.log(`[Viz Route] Processing regeneration for Appraisal ID: ${appraisalId}`);
    }
    if (options) {
      console.log(`[Viz Route] Request options:`, options);
    }
    
    // Update WordPress meta to indicate processing has started (if options provided)
    if (options) {
      try {
        await wordpress.updatePostMeta(postId, {
          'processing_status': 'Regenerating statistics and visualizations',
          'last_processed': new Date().toISOString(),
          'processing_history': JSON.stringify([
            ...(JSON.parse((await wordpress.getPost(postId)).meta?.processing_history || '[]')),
            {
              step: 'regenerate_statistics',
              status: 'processing',
              timestamp: new Date().toISOString(),
              user: options?.username || 'System',
              message: 'Statistics and visualizations regeneration started'
            }
          ])
        });
      } catch (metaError) {
        console.warn('[Viz Route] Warning: Could not update processing metadata:', metaError.message);
        // Continue processing - this is not a fatal error
      }
    }

    // Step 1: Fetch the WP Post Data
    console.log('[Viz Route] Fetching WordPress post data for ID:', postId);
    let postData;
    try {
      postData = await wordpress.getPost(postId); 
      if (!postData || !postData.acf) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or has no ACF fields'
        });
      }
    } catch (wpError) {
      console.error('[Viz Route] Error fetching WordPress post:', wpError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch WordPress post data',
        error: wpError.message
      });
    }
    
    const postTitle = postData.title?.rendered || 'Untitled Appraisal';
    console.log(`[Viz Route] Processing ${postTitle} (ID: ${postId})`);
    
    // Apply new value if provided
    if (newValue !== undefined) {
      console.log(`[Viz Route] Using new value: ${newValue}`);
      postData.acf.value = newValue;
    }
    
    // Step 2: Fetch Images
    console.log('[Viz Route] Fetching images for post');
    const postDataWithImages = await wordpress.fetchPostData(postId);
    const images = postDataWithImages.images;
    
    // Step 3: Get or Generate Statistics - UPDATED TO USE VALUER AGENT CLIENT
    console.log('[Viz Route] Fetching statistics from valuer-agent');
    
    let stats;
    try {
      // Use the enhanced-statistics endpoint instead of /stats/{postId}
      const value = postData.acf?.value;
      const title = postTitle;
      
      const statsResponse = await valuerAgentClient.getEnhancedStatistics(title, value);
      
      if (!statsResponse.success) {
        throw new Error(`Valuer-agent returned error: ${statsResponse.message || 'Unknown error'}`);
      }
      
      stats = statsResponse.statistics;
      console.log('[Viz Route] Statistics fetched successfully');
    } catch (statsError) {
      console.error('[Viz Route] Error fetching statistics:', statsError);
      
      // Update WordPress meta to indicate failure (if options provided)
      if (options) {
        try {
          await wordpress.updatePostMeta(postId, {
            'processing_status': 'Statistics regeneration failed',
            'processing_history': JSON.stringify([
              ...(JSON.parse(postData.meta?.processing_history || '[]')),
              {
                step: 'regenerate_statistics',
                status: 'failed',
                timestamp: new Date().toISOString(),
                user: options?.username || 'System',
                message: `Failed to fetch statistics: ${statsError.message}`
              }
            ])
          });
        } catch (metaError) {
          console.warn('[Viz Route] Warning: Could not update failure metadata:', metaError.message);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics from valuer-agent',
        error: statsError.message
      });
    }
    
    // Step 3a: Sanitize/Clean statistics data for storage
    console.log('[Viz Route] Sanitizing statistics data');
    const sanitizedStats = jsonCleaner.clean(stats);
    
    // Step 3b: Prepare appraisal data object
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
      dimensions: postData.acf?.dimensions, 
      signed: postData.acf?.signed,
      framed: postData.acf?.framed,
      provenance: postData.acf?.provenance,
      coa: postData.acf?.coa,
    };
    
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
    
    // Step 6: Save Populated HTML and Statistics to WordPress
    console.log('[Viz Route] Saving populated HTML and statistics to WordPress');
    
    try {
      // Update the WordPress post with the new HTML and stats
      await updateHtmlFields(postId, {
        enhanced_analytics_html: populatedAnalyticsHtml,
        appraisal_card_html: populatedCardHtml,
        statistics: JSON.stringify(sanitizedStats)
      });
      
      // Update metadata to indicate success (if options provided)
      if (options) {
        await wordpress.updatePostMeta(postId, {
          'processing_status': 'Statistics and visualizations regenerated successfully',
          'processing_history': JSON.stringify([
            ...(JSON.parse(postData.meta?.processing_history || '[]')),
            {
              step: 'regenerate_statistics',
              status: 'completed',
              timestamp: new Date().toISOString(),
              user: options?.username || 'System',
              message: 'Statistics and visualizations regenerated successfully'
            }
          ])
        });
      }
      
      console.log('[Viz Route] WordPress post updated successfully');
      
      return res.json({
        success: true,
        message: 'Statistics regenerated and visualizations updated successfully',
        postId: postId,
        appraisalId: appraisalId || undefined,
        debug: enableDebug ? {
          stats: sanitizedStats,
          enhancedAnalyticsHtml: populatedAnalyticsHtml,
          appraisalCardHtml: populatedCardHtml
        } : undefined
      });
    } catch (updateError) {
      console.error('[Viz Route] Error updating WordPress post:', updateError);
      
      // Update metadata to indicate failure (if options provided)
      if (options) {
        try {
          await wordpress.updatePostMeta(postId, {
            'processing_status': 'Statistics and visualizations update failed',
            'processing_history': JSON.stringify([
              ...(JSON.parse(postData.meta?.processing_history || '[]')),
              {
                step: 'regenerate_statistics',
                status: 'failed',
                timestamp: new Date().toISOString(),
                user: options?.username || 'System',
                message: `Failed to update WordPress: ${updateError.message}`
              }
            ])
          });
        } catch (metaError) {
          console.warn('[Viz Route] Warning: Could not update failure metadata:', metaError.message);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update WordPress post with new HTML',
        error: updateError.message
      });
    }
  } catch (error) {
    console.error('[Viz Route] Unexpected error in regeneration route:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during regeneration',
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

        const analyticsContext = prepareDataContextForEnhancedAnalytics(stats, appraisal, fetchedImages);
        const cardContext = prepareDataContextForAppraisalCard(stats, appraisal, fetchedImages);

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