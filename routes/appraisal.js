const express = require('express');
const router = express.Router();
const { processAllMetadata } = require('../services/metadata');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { getPostTitle, getPostImages } = require('../services/wordpress');

// Complete appraisal report endpoint
router.post('/complete-appraisal-report', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    console.log(`Processing appraisal report for post: ${postId}`);

    // Get post title and images
    const [postTitle, images] = await Promise.all([
      getPostTitle(postId),
      getPostImages(postId)
    ]);

    // Process Google Vision analysis
    const visionResult = await processMainImageWithGoogleVision(postId);
    
    if (!visionResult.success) {
      console.log('Gallery already populated, skipping Vision analysis');
    }

    // Process metadata fields
    const metadataResults = await processAllMetadata(postId, postTitle, images);

    // Return response
    res.json({
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
      message: error.message || 'Error completing appraisal report.'
    });
  }
});

module.exports = router;