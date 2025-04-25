const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const vision = require('@google-cloud/vision');
const { getImageUrl } = require('./wordpress');
const { uploadImageToWordPress, updateWordPressGallery } = require('../services/wordpress');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

let visionClient;

async function initializeVisionClient() {
  try {
    let credentials;
    
    // Check if credentials are already available in config
    if (config.GOOGLE_VISION_CREDENTIALS) {
      try {
        credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
      } catch (parseError) {
        console.error('Error parsing GOOGLE_VISION_CREDENTIALS from config:', parseError);
        // If parsing fails, try to get from Secret Manager directly
      }
    }
    
    // If credentials are not available or parsing failed, try Secret Manager directly
    if (!credentials) {
      console.log('Fetching Google Vision credentials directly from Secret Manager');
      const secretClient = new SecretManagerServiceClient();
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set.');
      }
      
      const secretPath = `projects/${projectId}/secrets/GOOGLE_VISION_CREDENTIALS/versions/latest`;
      const [version] = await secretClient.accessSecretVersion({ name: secretPath });
      const secretValue = version.payload.data.toString('utf8');
      credentials = JSON.parse(secretValue);
    }
    
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'civil-forge-403609'
    });
    
    console.log('Google Vision client initialized successfully.');
    return visionClient;
  } catch (error) {
    console.error('Error initializing Vision client:', error);
    throw error;
  }
}

async function processMainImageWithGoogleVision(postId) {
  try {
    if (!visionClient) {
      await initializeVisionClient();
    }

    // Check if gallery is already populated
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const postData = await response.json();
    
    // Check gallery population status
    if (postData.acf?._gallery_populated === '1' && Array.isArray(postData.acf?.googlevision)) {
      console.log('[Vision] Gallery exists, skipping analysis');
      return {
        success: true,
        message: 'Gallery already populated',
        similarImagesCount: postData.acf.googlevision.length
      };
    }

    // Get main image URL
    const mainImageUrl = await getImageUrl(postData.acf?.main);
    if (!mainImageUrl) {
      throw new Error('Main image not found in post');
    }

    console.log('[Vision] Analyzing main image');

    // Analyze image with Vision API
    const [result] = await visionClient.webDetection(mainImageUrl);
    const webDetection = result.webDetection;

    if (!webDetection?.visuallySimilarImages?.length) {
      return {
        success: true,
        message: 'No similar images found',
        similarImagesCount: 0
      };
    }

    // Upload similar images to WordPress using the imported functions
    const uploadedImageIds = [];
    for (const image of webDetection.visuallySimilarImages) {
      const imageId = await uploadImageToWordPress(image.url);
      if (imageId) {
        uploadedImageIds.push(imageId);
      }
    }

    if (uploadedImageIds.length > 0) {
      await updateWordPressGallery(postId, uploadedImageIds);
    }
    console.log(`[Vision] Found and processed ${uploadedImageIds.length} similar images`);

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
    };
  } catch (error) {
    console.error(`[Vision] Error: ${error.message}`);
    return {
      success: false,
      message: error.message,
      similarImagesCount: 0
    };
  }
}

module.exports = {
  processMainImageWithGoogleVision,
  initializeVisionClient
};