const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata } = require('../services/metadata');

router.post('/complete-appraisal-report', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Fetch all post data in a single request
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('Post title not found');
      return res.status(404).json({
        success: false,
        message: 'Post title not found, but processing completed',
        details: {
          postId,
          title: null,
          visionAnalysis: null,
          processedFields: []
        }
      });
    }

    console.log('Post title:', postTitle);
    console.log('Available images:', images);

    // Process Google Vision analysis
    let visionResult;
    try {
      visionResult = await processMainImageWithGoogleVision(postId);
    } catch (error) {
      console.error('Vision analysis error:', error);
      visionResult = {
        success: false,
        message: error.message,
        similarImagesCount: 0
      };
    }
    console.log('Vision analysis result:', visionResult);

    // Process metadata fields
    let metadataResults;
    try {
      metadataResults = await processAllMetadata(postId, postTitle, { postData, images });
    } catch (error) {
      console.error('Metadata processing error:', error);
      metadataResults = [];
    }
    console.log('Metadata processing results:', metadataResults);

    // Return response
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
    console.error('Error in /complete-appraisal-report:', error);
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