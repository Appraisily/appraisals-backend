const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress/index');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadataProcessor');

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
    console.log('[Report Route] Justification-only request received.');
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
      // Determine status code based on error type if possible (e.g., 404 for 'Post not found')
      const statusCode = error.message?.includes('Post not found') ? 404 : 500;
      return res.status(statusCode).json({ 
          success: false, 
          message: statusCode === 404 ? error.message : 'Error processing justification.', 
          // Expose details only in non-production
          error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  // --- Full Report Generation Logic --- 
  try {
    console.log(`[Report Route] Fetching data for post ${postId}`);
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn(`[Report Route] Post ${postId} title not found`);
      // Return 404 specifically for not found
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        error_details: `Post with ID ${postId} could not be found or lacks a title.`
      });
    }

    console.log(`[Report Route] Processing: "${postTitle}"`);

    let visionResult = { success: false, message: 'Skipped', similarImagesCount: 0 };
    try {
      console.log('[Report Route] Processing main image with Vision');
      visionResult = await processMainImageWithGoogleVision(postId);
    } catch (error) {
      console.error(`[Report Route] Vision error: ${error.message}`);
      visionResult = { success: false, message: error.message, similarImagesCount: 0 };
    }

    let metadataResults = [];
    try {
      console.log('[Report Route] Processing all metadata fields');
      metadataResults = await processAllMetadata(postId, postTitle, { postData, images });
    } catch (error) {
      console.error(`[Report Route] Metadata processing error: ${error.message}`);
      // Add error indication if needed, but continue to justification
      metadataResults.push({ field: 'all_metadata', status: 'error', error: error.message });
    }

    // Process justification metadata as part of the complete report
    try {
      console.log('[Report Route] Processing justification metadata');
      const justificationResult = await processJustificationMetadata(
        postId,
        postTitle,
        postData.acf?.value
      );
      if (justificationResult) {
        metadataResults.push(justificationResult); // Add justification result to the list
      }
    } catch (error) {
      console.error(`[Report Route] Justification processing error: ${error.message}`);
      metadataResults.push({
        field: 'justification_html',
        status: 'error',
        error: error.message
      });
    }
    
    // Note: HTML generation is now triggered within processJustificationMetadata if stats are generated/updated.
    // We might not need the explicit HTML generation block here anymore unless it needs to run independently.
    /* 
    // (Optional: Keep explicit HTML check/generation if needed outside justification flow)
    try {
      console.log(`[Report Route] Checking/Generating HTML visualizations for: "${postTitle}"`);
      const htmlFields = await wordpress.checkHtmlFields(postId);
      if (htmlFields.exists) {
        console.log('[Report Route] HTML visualizations already exist, skipping generation');
        metadataResults.push({ field: 'html_visualizations', status: 'skipped' });
      } else {
        console.log(`[Report Route] Explicitly generating HTML visualizations for: "${postTitle}"`);
        const statisticsData = postData.acf?.statistics || {}; // Fetch potentially stale stats?
        let parsedStatistics = typeof statisticsData === 'string' ? JSON.parse(statisticsData) : statisticsData; // Basic parse
        const appraisalData = { title: postTitle, /* ... other fields ... *\/ }; 
        await wordpress.updateHtmlFields(postId, appraisalData, parsedStatistics);
        metadataResults.push({ field: 'html_visualizations', status: 'success' });
      }
    } catch (error) {
       console.error(`[Report Route] HTML generation error: ${error.message}`);
       metadataResults.push({ field: 'html_visualizations', status: 'error', error: error.message });
    }
    */

    console.log('[Report Route] Report generation complete');

    res.status(200).json({
      success: true,
      message: 'Appraisal report completed successfully.',
      details: {
        postId,
        title: postTitle,
        visionAnalysis: visionResult,
        processedFields: metadataResults
      }
    });

  } catch (error) {
    // Catch errors from fetchPostData or other unhandled issues in the main flow
    console.error(`[Report Route] Overall error for post ${postId}: ${error.message}`);
    // Check if it was a 'not found' error during initial fetch
    const statusCode = error.message?.includes('Post not found') ? 404 : 500;
    const userMessage = statusCode === 404 
        ? 'Post not found or title is missing' 
        : 'Error completing appraisal report.';
        
    res.status(statusCode).json({
      success: false,
      message: userMessage,
      // Expose details only in non-production
      error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router; 