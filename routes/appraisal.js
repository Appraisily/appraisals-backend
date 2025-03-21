const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');
const { createLogger } = require('../services/utils/logger');

const logger = createLogger('AppraisalRoutes');

router.post('/complete-appraisal-report', async (req, res) => {
  const { postId, sessionId } = req.body;

  logger.info('Starting appraisal report generation', sessionId, { postId });

  if (!postId) {
    logger.warn('Missing postId in request', sessionId, { body: req.body });
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    logger.info(`Fetching post data for postId: ${postId}`, sessionId);
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      logger.warn(`Post title not found for postId: ${postId}`, sessionId);
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        details: {
          postId,
          title: null,
          visionAnalysis: null,
        }
      });
    }

    logger.info(`Processing main image with Google Vision for post: ${postId}`, sessionId);
    const mainImage = images.length > 0 ? images[0] : null;
    const visionAnalysis = mainImage 
      ? await processMainImageWithGoogleVision(mainImage.url, sessionId)
      : { error: 'No images found' };

    logger.info(`Generating complete appraisal metadata for post: ${postId}`, sessionId, { 
      imageCount: images.length,
      hasVisionResults: !!visionAnalysis 
    });
    
    const metadata = await processAllMetadata(postData, visionAnalysis, sessionId);
    const justification = await processJustificationMetadata(
      postData.acf.appraisal_value || '0',
      metadata,
      sessionId
    );

    logger.info(`Updating WordPress post with generated metadata: ${postId}`, sessionId);
    
    // Update the post with justification content
    if (justification.status === 'success') {
      logger.info(`Successfully generated justification for post: ${postId}`, sessionId);
      // WordPress ACF updates were already performed in the metadata processing
    } else {
      logger.error(`Failed to generate justification for post: ${postId}`, sessionId, {
        error: justification.error
      });
    }

    logger.info(`Successfully completed appraisal report for post: ${postId}`, sessionId);

    return res.json({
      success: true,
      message: 'Appraisal report completed successfully',
      details: {
        postId,
        title: postTitle,
        metadata,
        justification: {
          status: justification.status,
          error: justification.error
        }
      }
    });

  } catch (error) {
    logger.error(`Error completing appraisal report for post: ${postId}`, sessionId, error);
    return res.status(500).json({
      success: false,
      message: 'Error completing appraisal report',
      error: error.message
    });
  }
});

module.exports = router;