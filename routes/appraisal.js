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

    // Get service type from column B
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post data: ${await response.text()}`);
    }

    const data = await response.json();
    // Ensure exact "TaxArt" string if that's the service type
    const rawServiceType = data.acf?.service_type?.trim() || '';
    const serviceType = rawServiceType === ' TaxArt' ? 'TaxArt' : rawServiceType;
    
    // Update WordPress with the service type
    await updateWordPressMetadata(postId, 'appraisaltype', serviceType);
    console.log(`Updated appraisaltype to: ${serviceType}`);

    // Get post title and images in parallel
    const [postTitle, images] = await Promise.all([
      getPostTitle(postId),
      getPostImages(postId)
    ]);

    if (!postTitle) {
      throw new Error('Post title not found');
    }

    console.log('Post title:', postTitle);
    console.log('Available images:', Object.keys(images).filter(key => images[key]));

    // Process Google Vision analysis
    const visionResult = await processMainImageWithGoogleVision(postId);
    console.log('Vision analysis result:', visionResult);

    // Process metadata fields
    const metadataResults = await processAllMetadata(postId, postTitle, images);
    console.log('Metadata processing results:', metadataResults);

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
      message: error.message || 'Error completing appraisal report.',
      error: error.stack
    });
  }
});

module.exports = router;