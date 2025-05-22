const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress/index');
const { processMainImageWithGoogleVision, initializeVisionClient } = require('../services/vision');
const metadataService = require('../services/metadata');
const { regenerateStatisticsAndVisualizations } = require('../services/regenerationService');

// Moved from appraisal.js
router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Report Route] Starting report generation');

  // Extract parameters including the new optional detailedDescription
  const { postId, justificationOnly, detailedDescription } = req.body;

  // --- Input Validation --- 
  if (!postId || typeof postId !== 'string' && typeof postId !== 'number') { // Check for presence and basic type
    return res.status(400).json({ 
      success: false, 
      message: 'Malformed request. Missing or invalid required parameter: postId.', 
      usage: {
          method: 'POST',
          endpoint: '/complete-appraisal-report',
          required_body_params: {
            postId: "string | number",
            justificationOnly: "boolean (optional, defaults to false)",
            detailedDescription: "string (optional)"
          },
          example: {
            postId: "123",
            justificationOnly: false,
            detailedDescription: "This is a detailed description"
          }
      },
      error_details: "postId (string or number) is required."
    });
  }
  // --- End Input Validation ---
  
  const isJustificationOnly = justificationOnly === true;

  if (isJustificationOnly) {
    console.log('[Report Route] Justification-only request received. Using processJustificationMetadata (consider migrating to regenerationService).');
    try {
      const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
      if (!postTitle) throw new Error('Post not found or title missing');
      
      const justificationResult = await metadataService.processJustificationMetadata(postId, postTitle, postData.acf?.value);
      return res.status(200).json({
        success: true,
        message: 'Justification process completed successfully.',
        details: { postId, title: postTitle, processedFields: [justificationResult] }
      });
    } catch (error) {
      console.error(`[Report Route] Justification-only error for post ${postId}: ${error.message}`);
      const statusCode = error.message?.includes('Post not found') ? 404 : 500;
      return res.status(statusCode).json({ 
          success: false, 
          message: statusCode === 404 ? error.message : 'Error processing justification.', 
          error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  // --- Full Report Generation Logic --- 
  let postTitle = '';
  let allProcessedResults = [];

  try {
    console.log(`[Report Route] Fetching data for post ${postId}`);
    const { postData, images, title } = await wordpress.fetchPostData(postId);
    postTitle = title;

    if (!postTitle) {
      console.warn(`[Report Route] Post ${postId} title not found`);
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        error_details: `Post with ID ${postId} could not be found or lacks a title.`
      });
    }

    console.log(`[Report Route] Processing: "${postTitle}"`);

    const acfDetailedTitle = postData?.acf?.detailed_title || postData?.acf?.detailedDescription || postData?.acf?.detailed_description;

    if (detailedDescription && typeof detailedDescription === 'string') {
      postData.detailedDescription = detailedDescription;
    } else if (acfDetailedTitle && typeof acfDetailedTitle === 'string') {
      // Fallback: use detailed_title from ACF if available
      postData.detailedDescription = acfDetailedTitle;
    }

    let visionResult = { success: false, message: 'Skipped', similarImagesCount: 0 };
    try {
      await initializeVisionClient();
      console.log('[Report Route] Processing main image with Vision');
      visionResult = await processMainImageWithGoogleVision(postId);
      allProcessedResults.push({ step: 'vision', success: visionResult.success, message: visionResult.message });
    } catch (error) {
      console.error(`[Report Route] Vision error: ${error.message}`);
      visionResult = { success: false, message: error.message, similarImagesCount: 0 };
      allProcessedResults.push({ step: 'vision', success: false, error: error.message });
    }

    // --- Step 2: Fetch statistics from valuer agent ---
    let statsResult = null;
    let statistics = null;
    try {
      console.log('[Report Route] Generating statistics and visualizations to get statistics data');
      const currentValue = postData?.acf?.value;
      if (currentValue === undefined) {
        throw new Error('Cannot generate statistics: Missing value in post data.');
      }
      
      statsResult = await regenerateStatisticsAndVisualizations(postId, currentValue, { metadataProcessing: false, htmlGeneration: false });
      
      if (statsResult.success) {
        console.log('[Report Route] Statistics generated successfully');
        statistics = statsResult.data.stats;
        allProcessedResults.push({ step: 'statistics', success: true });
      } else {
        console.error(`[Report Route] Statistics generation failed: ${statsResult.message}`);
        return res.status(500).json({
          success: false,
          message: 'Statistics generation failed. Cannot complete appraisal report.',
          error_details: statsResult.message || statsResult.error || 'Unknown error',
          details: {
            postId,
            title: postTitle,
            processedSteps: [...allProcessedResults, { 
              step: 'statistics', 
              success: false, 
              error: statsResult.message
            }]
          }
        });
      }
    } catch (error) {
      console.error(`[Report Route] Error generating statistics: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Statistics generation failed with an error. Cannot complete appraisal report.',
        error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        details: {
          postId,
          title: postTitle,
          processedSteps: [...allProcessedResults, { step: 'statistics', success: false, error: error.message }]
        }
      });
    }

    // --- Step 3: Process all metadata in a single batch ---
    let metadataResults = null;
    try {
      console.log('[Report Route] Processing all metadata fields in a single batch');
      metadataResults = await metadataService.processBatchMetadata(
        postId, 
        postTitle, 
        postData, 
        images, 
        statistics
      );
      
      if (metadataResults.success) {
        console.log('[Report Route] All metadata fields successfully updated');
        allProcessedResults.push({ 
          step: 'metadata_processing', 
          success: true, 
          message: 'All metadata processed successfully' 
        });
        
        // Update postData with new metadata for HTML generation
        if (metadataResults.metadata) {
          postData.acf = { ...postData.acf, ...metadataResults.metadata };
        }
      } else {
        console.warn(`[Report Route] Metadata batch processing warning: ${metadataResults.message}`);
        allProcessedResults.push({ 
          step: 'metadata_processing', 
          success: false, 
          message: metadataResults.message 
        });
        // Continue with HTML generation even if metadata had issues
      }
    } catch (error) {
      console.error(`[Report Route] Error processing metadata: ${error.message}`);
      allProcessedResults.push({ 
        step: 'metadata_processing', 
        success: false, 
        error: error.message 
      });
      // Continue with HTML generation even if metadata failed
    }

    // --- Step 4: Generate HTML visualizations ---
    let visualizationResult = null;
    try {
      console.log('[Report Route] Generating HTML visualizations');
      console.log('[Report Route] System info - Memory usage:', process.memoryUsage());
      console.log('[Report Route] System info - Process uptime:', process.uptime(), 'seconds');
      console.log('[Report Route] System environment check - NODE_ENV:', process.env.NODE_ENV);
      
      // Log connectivity information before making external API calls
      try {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        console.log('[Report Route] Network interfaces:', JSON.stringify(nets));
      } catch (netError) {
        console.log('[Report Route] Could not determine network interfaces:', netError.message);
      }
      
      // We need to call regenerateStatisticsAndVisualizations again but
      // with updated postData that includes the new metadata and skip metadata processing
      console.log('[Report Route] Calling regenerateStatisticsAndVisualizations for HTML generation');
      visualizationResult = await regenerateStatisticsAndVisualizations(
        postId,
        postData.acf?.value,
        {
          metadataProcessing: false, // Skip metadata processing as we already did it
          statistics,               // Re-use the statistics we already generated to avoid duplicate API calls
        }
      );
      
      if (visualizationResult.success) {
        console.log('[Report Route] HTML visualizations generated successfully');
        allProcessedResults.push({ 
          step: 'html_visualizations', 
          success: true, 
          details: {
            enhancedAnalyticsHtml: visualizationResult.data.enhancedAnalyticsHtml ? 'Generated' : 'Not generated',
            appraisalCardHtml: visualizationResult.data.appraisalCardHtml ? 'Generated' : 'Not generated'
          }
        });
      } else {
        console.error(`[Report Route] HTML visualizations generation failed: ${visualizationResult.message}`);
        // Detailed error logging
        if (visualizationResult.error) {
          console.error('[Report Route] Visualization error details:', visualizationResult.error);
        }
        if (visualizationResult.data) {
          console.error('[Report Route] Partial visualization data:', JSON.stringify(visualizationResult.data));
        }
        
        console.log('[Report Route] Will attempt to return a meaningful response despite visualization failure');
        // Continue with a meaningful response despite the error
        allProcessedResults.push({ 
          step: 'html_visualizations', 
          success: false, 
          error: visualizationResult.message,
          recoverable: true // Mark as recoverable to continue
        });
        
        // Instead of returning error, we'll continue with as much as we have
        return res.status(200).json({
          success: false, // Mark overall success as false
          message: 'Appraisal report completed but visualizations failed. Data was processed.',
          error_details: visualizationResult.message || visualizationResult.error || 'Unknown error in visualization',
          details: {
            postId,
            title: postTitle,
            processedSteps: allProcessedResults,
            partialSuccess: true // Indicate we did complete some steps
          }
        });
      }
    } catch (error) {
      console.error(`[Report Route] Error generating HTML visualizations: ${error.message}`);
      console.error('[Report Route] Error stack trace:', error.stack);
      
      // Log more diagnostic info
      console.log('[Report Route] Error occurred at:', new Date().toISOString());
      
      // Check if it's a network error
      const isNetworkError = error.message.includes('fetch') || 
                            error.message.includes('network') || 
                            error.message.includes('socket') ||
                            error.message.includes('ENOTFOUND') ||
                            error.message.includes('ETIMEDOUT');
                            
      if (isNetworkError) {
        console.error('[Report Route] DETECTED NETWORK ERROR - likely connectivity issues');
      }
      
      return res.status(500).json({
        success: false,
        message: 'HTML visualizations generation failed with an error. Cannot complete appraisal report.',
        error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        error_type: isNetworkError ? 'network_connectivity' : 'general_error',
        details: {
          postId,
          title: postTitle,
          processedSteps: [...allProcessedResults, { step: 'html_visualizations', success: false, error: error.message }]
        }
      });
    }

    console.log('[Report Route] Report generation process complete');

    const overallSuccess = allProcessedResults.every(r => r.success !== false);
    
    res.status(200).json({
      success: overallSuccess,
      message: overallSuccess ? 'Appraisal report completed.' : 'Appraisal report completed with some errors.',
      details: {
        postId,
        title: postTitle,
        processedSteps: allProcessedResults 
      }
    });

  } catch (error) {
    console.error(`[Report Route] Overall error for post ${postId}: ${error.message}`);
    const statusCode = error.message?.includes('Post not found') ? 404 : 500;
    const userMessage = statusCode === 404 
        ? 'Post not found or title is missing' 
        : 'Error completing appraisal report.';
        
    res.status(statusCode).json({
      success: false,
      message: userMessage,
      error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router; 