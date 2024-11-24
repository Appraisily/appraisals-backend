// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Function to get image URL from WordPress media ID
async function getImageUrl(mediaId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error(`Error fetching media with ID ${mediaId}:`, await response.text());
      return null;
    }

    const mediaData = await response.json();
    return mediaData.source_url || null;
  } catch (error) {
    console.error(`Error getting image URL for media ID ${mediaId}:`, error);
    return null;
  }
}

// Function to upload image to WordPress
async function uploadImageToWordPress(imageUrl) {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error downloading image: ${response.statusText}`);
    }
    const buffer = await response.buffer();

    // Create unique filename
    const filename = `similar-image-${uuidv4()}.jpg`;

    // Prepare form data
    const form = new FormData();
    form.append('file', buffer, filename);

    // Upload to WordPress
    const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error uploading image: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    return uploadData.id;
  } catch (error) {
    console.error('Error uploading image to WordPress:', error);
    return null;
  }
}

// Function to analyze image with Google Vision
async function analyzeImageWithVision(visionClient, imageUrl) {
  try {
    const [result] = await visionClient.webDetection(imageUrl);
    const webDetection = result.webDetection;

    if (!webDetection) {
      throw new Error('No web detection results available');
    }

    return {
      fullMatchingImages: webDetection.fullMatchingImages || [],
      partialMatchingImages: webDetection.partialMatchingImages || [],
      webEntities: webDetection.webEntities || [],
      bestGuessLabels: webDetection.bestGuessLabels || [],
      pagesWithMatchingImages: webDetection.pagesWithMatchingImages || [],
      visuallySimilarImages: webDetection.visuallySimilarImages || []
    };
  } catch (error) {
    console.error('Error analyzing image with Vision API:', error);
    throw error;
  }
}

// Main function to process image with Google Vision
async function processMainImageWithGoogleVision(visionClient, postId) {
  try {
    // Get post details
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${response.statusText}`);
    }

    const post = await response.json();
    const mainImageId = post.acf?.main;

    if (!mainImageId) {
      throw new Error('No main image found in post');
    }

    // Get main image URL
    const mainImageUrl = await getImageUrl(mainImageId);
    if (!mainImageUrl) {
      throw new Error('Could not get main image URL');
    }

    // Analyze with Vision API
    const visionResults = await analyzeImageWithVision(visionClient, mainImageUrl);

    // Process similar images
    const similarImageUrls = visionResults.visuallySimilarImages
      .map(image => image.url)
      .filter(url => url);

    // Upload similar images to WordPress
    const uploadedImageIds = [];
    for (const url of similarImageUrls) {
      const imageId = await uploadImageToWordPress(url);
      if (imageId) {
        uploadedImageIds.push(imageId);
      }
    }

    // Update WordPress metadata
    if (uploadedImageIds.length > 0) {
      const updateResponse = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
        },
        body: JSON.stringify({
          acf: {
            GoogleVision: uploadedImageIds
          }
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Error updating WordPress metadata: ${updateResponse.statusText}`);
      }
    }

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
    };
  } catch (error) {
    console.error('Error processing image with Google Vision:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processMainImageWithGoogleVision
};