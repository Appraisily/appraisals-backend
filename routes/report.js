const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');

// Moved from appraisal.js
router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Report Route] Starting report generation');

  const { postId, justificationOnly } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  // If justificationOnly is true, handle justification separately (or redirect/call other service)
  // For simplicity here, we assume this route handles the *complete* report generation.
  // If justificationOnly is common, it might belong in its own route/controller.
  if (justificationOnly === true) {
    console.log('[Report Route] Justification-only request received. Delegating...');
    // Option 1: Call the justification service directly
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
      console.error(`[Report Route] Justification-only error: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message, details: { postId, error: error.message } });
    }
    // Option 2: Return an error/suggestion to use the dedicated justification route
    // return res.status(400).json({ success: false, message: 'Please use the /process-justification endpoint for justification-only requests.' });
  }

  // --- Full Report Generation Logic --- 
  try {
    console.log(`[Report Route] Fetching data for post ${postId}`);
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('[Report Route] Post title not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        details: { postId, title: null, visionAnalysis: null, processedFields: [] }
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
    // Catch errors from fetchPostData or other unhandled issues
    console.error(`[Report Route] Overall error for post ${postId}: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completing appraisal report.',
      details: { postId, error: error.message }
    });
  }
});

module.exports = router; 