const express = require('express');
const router = express.Router();
const { processAllMetadata } = require('../services/metadata');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { getPostTitle, getPostImages, updateWordPressMetadata } = require('../services/wordpress');
const config = require('../config');
const fetch = require('node-fetch');

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

    console.log('WordPress API URL:', config.WORDPRESS_API_URL);
    const endpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`;
    console.log('Fetching from endpoint:', endpoint);

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      throw new Error(`Failed to fetch post data: ${await response.text()}`);
    }

    const data = await response.json();
    console.log('ACF data:', data.acf);

    // Get post title and images in parallel
    const [postTitle, images] = await Promise.all([
      getPostTitle(postId),
      getPostImages(postId)
    ]);

    if (!postTitle) {
      console.warn('Post title not found');
      return res.status(200).json({
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
    console.log('Available images:', Object.keys(images).filter(key => images[key]));

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
      metadataResults = await processAllMetadata(postId, postTitle, images);
    } catch (error) {
      console.error('Metadata processing error:', error);
      metadataResults = [];
    }
    console.log('Metadata processing results:', metadataResults);

    // Return response
    return res.status(200).json({
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
    return res.status(200).json({
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