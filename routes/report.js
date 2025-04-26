const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress/index');
const { processMainImageWithGoogleVision, initializeVisionClient } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadataProcessor');
const { regenerateStatisticsAndVisualizations } = require('../services/regenerationService');

// Moved from appraisal.js
router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Report Route] Starting report generation');

  const { postId, justificationOnly } = req.body;

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
            justificationOnly: "boolean (optional, defaults to false)"
          },
          example: {
            postId: "123",
            justificationOnly: false
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
      
      const justificationResult = await processJustificationMetadata(postId, postTitle, postData.acf?.value);
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

    let metadataResults = [];
    try {
      console.log('[Report Route] Processing all metadata fields');
      metadataResults = await processAllMetadata(postId, postTitle, { postData, images });
      allProcessedResults.push({ step: 'metadata', success: true, details: metadataResults });
    } catch (error) {
      console.error(`[Report Route] Metadata processing error: ${error.message}`);
      allProcessedResults.push({ step: 'metadata', success: false, error: error.message });
    }

    let regenerationResult = null;
    try {
      console.log('[Report Route] Generating statistics and visualizations');
      const currentValue = postData?.acf?.value;
      if (currentValue === undefined) {
        throw new Error('Cannot regenerate statistics: Missing value in post data.');
      }
      
      regenerationResult = await regenerateStatisticsAndVisualizations(postId, currentValue);
      
      if (regenerationResult.success) {
        console.log('[Report Route] Statistics and visualizations generated successfully.');
        allProcessedResults.push({ step: 'statistics_visualizations', success: true, details: regenerationResult.data });
      } else {
        console.error(`[Report Route] Statistics/Visualization generation failed: ${regenerationResult.message}`);
        allProcessedResults.push({ step: 'statistics_visualizations', success: false, error: regenerationResult.message, details: regenerationResult.error });
      }
    } catch (error) {
      console.error(`[Report Route] Error calling regeneration service: ${error.message}`);
      allProcessedResults.push({ step: 'statistics_visualizations', success: false, error: error.message });
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