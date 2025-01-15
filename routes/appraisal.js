const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');

router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Appraisal] Starting report generation');

  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('[Appraisal] Post title not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        details: {
          postId,
          title: null,
          visionAnalysis: null,
          processedFields: []
        }
      });
    }

    console.log(`[Appraisal] Processing: "${postTitle}"`);

    let visionResult;
    try {
      visionResult = await processMainImageWithGoogleVision(postId);
    } catch (error) {
      console.error(`[Appraisal] Vision error: ${error.message}`);
      visionResult = {
        success: false,
        message: error.message,
        similarImagesCount: 0
      };
    }

    let metadataResults;
    try {
      metadataResults = await processAllMetadata(postId, postTitle, { postData, images });
    } catch (error) {
      console.error(`[Appraisal] Metadata error: ${error.message}`);
      metadataResults = [];
    }

    console.log('[Appraisal] Report generation complete');

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
    console.error(`[Appraisal] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completing appraisal report.',
      details: {
        postId,
        error: error.message,
        visionAnalysis: null,
        processedFields: []
      }
    });
  }
});

module.exports = router;