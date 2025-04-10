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

// Refactored /generate-visualizations route
router.post('/generate-visualizations', async (req, res) => {
  console.log('[Viz Route] Starting HTML visualization generation using Gemini');

  const { postId } = req.body;
  // --- Input Validation (as added previously) --- 
  if (!postId || typeof postId !== 'string' && typeof postId !== 'number') {
    return res.status(400).json({ /* ... 400 error ... */ });
  }
  // --- End Input Validation ---

  try {
    // Step 1: Fetch post data, including existing statistics
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
       return res.status(404).json({ /* ... 404 error ... */ });
    }

    console.log(`[Viz Route] Checking for existing HTML visualizations for: "${postTitle}"`);
    const htmlFields = await wordpress.checkHtmlFields(postId);
    
    if (htmlFields.exists) {
      console.log('[Viz Route] HTML visualizations already exist, skipping generation');
      return res.status(200).json({ /* ... skipped response ... */ });
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
    // Let the global error handler in index.js create the GitHub issue
    /* try { 
            await githubService.createGithubIssue(error, req); 
    } catch(e){ console.error("Error calling createGithubIssue:", e); } */
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

// Modified /regenerate-statistics-and-visualizations route
router.post('/regenerate-statistics-and-visualizations', async (req, res) => {
  console.log('[Viz Route] Starting statistics and visualizations regeneration');
  
  const { postId, newValue, enableDebug } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: postId'
    });
  }
  
  try {
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
    const images = await wordpress.getPostImages(postId);
    
    // Step 3: Get or Generate Statistics
    console.log('[Viz Route] Fetching statistics from valuer-agent');
    const valuerAgentUrl = `${config.VALUER_AGENT_URL}/stats/${postId}`;
    
    let stats;
    try {
      const statsResponse = await fetch(valuerAgentUrl, { method: 'GET' });
      if (!statsResponse.ok) {
        throw new Error(`Valuer-agent response not OK: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      
      const statsData = await statsResponse.json();
      if (!statsData.success) {
        throw new Error(`Valuer-agent returned error: ${statsData.message}`);
      }
      
      stats = statsData.data;
      console.log('[Viz Route] Statistics fetched successfully');
    } catch (statsError) {
      console.error('[Viz Route] Error fetching statistics:', statsError);
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
        statistics_data: JSON.stringify(sanitizedStats)
      });
      
      console.log('[Viz Route] WordPress post updated successfully');
      
      return res.json({
        success: true,
        message: 'Statistics regenerated and visualizations updated successfully',
        postId: postId,
        debug: enableDebug ? {
          stats: sanitizedStats,
          enhancedAnalyticsHtml: populatedAnalyticsHtml,
          appraisalCardHtml: populatedCardHtml
        } : undefined
      });
    } catch (updateError) {
      console.error('[Viz Route] Error updating WordPress post:', updateError);
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

module.exports = router; // Export the router directly again
// }; 