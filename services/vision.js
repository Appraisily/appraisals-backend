const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const vision = require('@google-cloud/vision');
const { getImageUrl } = require('./wordpress');

let visionClient;

function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: 'civil-forge-403609'
    });
    console.log('Google Vision client initialized successfully.');
  } catch (error) {
    console.error('Error initializing Vision client:', error);
    throw error;
  }
}

async function processMainImageWithGoogleVision(postId) {
  try {
    if (!visionClient) {
      initializeVisionClient();
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
      console.log('Gallery already populated, skipping Vision analysis');
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

    console.log('Analyzing main image:', mainImageUrl);

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

    // Upload similar images to WordPress
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

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
    };
  } catch (error) {
    console.error('Error in Vision analysis:', error);
    return {
      success: false,
      message: error.message,
      similarImagesCount: 0
    };
  }
}

async function uploadImageToWordPress(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image from ${imageUrl}`);
      return null;
    }

    const buffer = await response.buffer();
    const filename = `similar-image-${uuidv4()}.jpg`;

    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: 'image/jpeg'
    });

    const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: form
    });

    if (!uploadResponse.ok) {
      console.warn(`Failed to upload image to WordPress: ${await uploadResponse.text()}`);
      return null;
    }

    const mediaData = await uploadResponse.json();
    return mediaData.id;
  } catch (error) {
    console.error('Error uploading image to WordPress:', error);
    return null;
  }
}

async function updateWordPressGallery(postId, imageIds) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          googlevision: imageIds,
          _gallery_populated: '1'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error updating gallery: ${await response.text()}`);
    }

    console.log(`Gallery updated for post ${postId} with ${imageIds.length} images`);
    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

module.exports = {
  processMainImageWithGoogleVision,
  initializeVisionClient
};