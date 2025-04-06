const express = require('express');
// const router = express.Router(); // Use function export instead
const fetch = require('node-fetch'); // Needed for regenerate route
const wordpress = require('../services/wordpress');
const config = require('../config'); // Needed for valuer-agent URL
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');
// Import validation function if it exists and is needed
// const { validateStatisticsData } = require('../services/metadataProcessor'); // Assuming it's moved there
// Helper for cleaning JSON data before storing in WP
const { jsonCleaner } = require('../services/utils/jsonCleaner'); 
const { populateHtmlTemplate } = require('../services/geminiService'); // Import the new service
// Import the context preparation functions
const { 
    prepareDataContextForEnhancedAnalytics, 
    prepareDataContextForAppraisalCard 
} = require('../services/utils/templateContextUtils');
// Restore local require for githubService
// const githubService = require('../src/services/utils/githubService'); // Remove unused githubService
// const { updateHtmlFields } = require('../services/wordpress'); // Remove unused updateHtmlFields
// const { generateEnhancedAnalyticsWithGemini, generateAppraisalCardWithGemini } = require('../services/gemini-visualization'); // Remove unused Gemini viz functions

// Revert to standard router export
// module.exports = function(githubService) {
const router = express.Router();

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
    const populatedAnalyticsHtml = await populateHtmlTemplate(skeletonHtmlAnalytics, enhancedAnalyticsContext);
    const populatedCardHtml = await populateHtmlTemplate(skeletonHtmlCard, appraisalCardContext);

    // Step 6: Save Populated HTML and Statistics to WordPress
    console.log('[Viz Route] Saving populated HTML and statistics to WordPress');
    try {
      // Prepare fields, ensuring strings and handling nulls/undefined
      const statisticsString = sanitizedStats ? JSON.stringify(sanitizedStats) : '{}'; // Stringify or use empty object JSON
      const analyticsHtmlString = populatedAnalyticsHtml || ''; // Default to empty string if null/undefined
      const cardHtmlString = populatedCardHtml || ''; // Default to empty string if null/undefined

      await wordpress.updatePostACFFields(postId, { 
        'statistics': statisticsString,
        'enhanced_analytics_html': analyticsHtmlString, 
        'appraisal_card_html': cardHtmlString 
      });
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

  const { postId } = req.body;
  // --- Input Validation (as added previously) --- 
  if (!postId || typeof postId !== 'string' && typeof postId !== 'number') {
    // ... return 400 error with usage ...
    return res.status(400).json({ /* ... */ }); 
  }
  // --- End Input Validation ---

  try {
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
       return res.status(404).json({ /* ... post not found error ... */ });
    }

    const targetValue = parseFloat(postData.acf?.value);
    if (isNaN(targetValue)) {
       return res.status(400).json({ /* ... invalid value error ... */ });
    }
    
    console.log(`[Viz Route] Regenerating statistics for: "${postTitle}" with value ${targetValue}`);
    
    // Step 1: Call valuer-agent for fresh statistics
    // TODO: Replace direct fetch with valuerAgentClient.getEnhancedStatistics if available & tested
    let statsResponse;
    try {
        console.log('[Viz Route] Calling valuer-agent for enhanced statistics');
        const valuerAgentUrl = `${config.VALUER_AGENT_API_URL}/api/enhanced-statistics`;
        // Restore correct fetch options for POST request
        const response = await fetch(valuerAgentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: postTitle, 
            value: targetValue,
            limit: 20, // Example limit
            minPrice: Math.floor(targetValue * 0.6),
            maxPrice: Math.ceil(targetValue * 1.6)
          })
        });
        if (!response.ok) {
           // Try to get more detail from the error response
           let errorBody = await response.text(); 
           try { errorBody = JSON.parse(errorBody); } catch(e) { /* Keep as text */ }
           console.error('[Viz Route] Valuer agent responded with error:', { status: response.status, body: errorBody });
           // Throw a more specific error including status if possible
           throw new Error(`Valuer agent error (${response.status}): ${typeof errorBody === 'object' ? errorBody.message || JSON.stringify(errorBody) : errorBody}`);
        }
        statsResponse = await response.json();
        if (!statsResponse.success || !statsResponse.statistics) {
            console.error('[Viz Route] Invalid success/statistics structure from valuer-agent:', statsResponse);
            throw new Error('Invalid statistics response structure from valuer agent');
        }
    } catch (agentError) {
        console.error('[Viz Route] Error calling/processing valuer-agent:', agentError);
        // Ensure the error message passed up is informative
        throw new Error(`Error calling valuer agent: ${agentError.message}`);
    }
    
    console.log('[Viz Route] Statistics received, validating and sanitizing...');
    
    // Step 2: Validate and Sanitize Statistics
    let validateStatisticsData = (stats) => stats; // Placeholder
    try {
        const processor = require('../services/metadataProcessor'); // Path to processor
        if (processor.validateStatisticsData) {
             validateStatisticsData = processor.validateStatisticsData;
        } else { console.warn("validateStatisticsData function not found in processor."); }
    } catch(e) { console.warn("Could not load metadataProcessor for validation."); }
    
    const validatedStats = validateStatisticsData(statsResponse.statistics);
    const sanitizedStats = validatedStats; // Use the validated stats directly

    // Step 3: Prepare Data Contexts using imported functions
    console.log('[Viz Route] Preparing data contexts for templates');
    const appraisalData = {
      postId,
      title: postTitle,
      featured_image: images.main?.url || '',
      value: postData.acf?.value,
      // Add all other fields needed by prepareDataContext... functions
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
      // etc...
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
    const populatedAnalyticsHtml = await populateHtmlTemplate(skeletonHtmlAnalytics, enhancedAnalyticsContext);
    const populatedCardHtml = await populateHtmlTemplate(skeletonHtmlCard, appraisalCardContext);

    // Step 6: Save Populated HTML and Statistics to WordPress
    console.log('[Viz Route] Saving populated HTML and statistics to WordPress');
    try {
      // Prepare fields, ensuring strings and handling nulls/undefined
      const statisticsString = sanitizedStats ? JSON.stringify(sanitizedStats) : '{}'; // Stringify or use empty object JSON
      const analyticsHtmlString = populatedAnalyticsHtml || ''; // Default to empty string if null/undefined
      const cardHtmlString = populatedCardHtml || ''; // Default to empty string if null/undefined

      await wordpress.updatePostACFFields(postId, { 
        'statistics': statisticsString,
        'enhanced_analytics_html': analyticsHtmlString, 
        'appraisal_card_html': cardHtmlString 
      });
      console.log('[Viz Route] ACF fields updated successfully.');
    } catch (acfUpdateError) {
        // Log the error but continue execution
        console.error(`[Viz Route] Error updating ACF fields for post ${postId}:`, acfUpdateError.message);
        console.warn('[Viz Route] Continuing process despite ACF update error.');
        // Optionally, record this specific failure somewhere if needed
    }
    
    // Step 7: Update Post Meta History (Will run even if ACF update failed)
    console.log('[Viz Route] Updating post meta history...');
    await wordpress.updatePostMeta(postId, 'processing_history', [
      { step: 'regenerate_statistics', timestamp: new Date().toISOString(), status: 'completed' },
      { step: 'regenerate_visualizations', timestamp: new Date().toISOString(), status: 'completed' }
    ]);
    
    // Step 8: Return Success Response
    return res.json({
      success: true,
      message: 'Statistics and visualizations regenerated successfully using Gemini.',
      details: {
        postId, title: postTitle,
        // Include some summary stats if useful
        statistics_summary: { count: sanitizedStats.count }
      }
    });

  } catch (error) {
     // Consistent error handling (as added previously)
    console.error(`[Viz Route] /regenerate error for post ${postId}: ${error.message}`);
    // Let the global error handler in index.js create the GitHub issue
    /* try { 
            await githubService.createGithubIssue(error, req); 
    } catch(e){ console.error("Error calling createGithubIssue:", e); } */
    const statusCode = error.message?.includes('Post not found') ? 404 : 500;
    const userMessage = statusCode === 404 ? 'Post not found' : 'Error regenerating statistics/visualizations';
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

module.exports = router; // Export the router directly again
// }; 