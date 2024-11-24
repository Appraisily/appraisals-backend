// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// ... (previous code remains the same until updateWordPressGallery function)

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating WordPress gallery for post ${postId} with ${imageIds.length} images:`, imageIds);
    
    // First, get current post data to preserve other ACF fields
    const getResponse = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Error fetching post: ${await getResponse.text()}`);
    }

    const post = await getResponse.json();
    const currentAcf = post.acf || {};

    // Prepare update data
    const updateData = {
      acf: {
        ...currentAcf, // Preserve existing ACF fields
        GoogleVision: imageIds, // Update gallery
        _gallery_populated: '1' // Set flag
      }
    };

    console.log('Sending update to WordPress with data:', JSON.stringify(updateData));

    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from WordPress:', errorText);
      throw new Error(`Error updating WordPress gallery: ${errorText}`);
    }

    const result = await response.json();
    console.log('Gallery update response:', JSON.stringify(result.acf?.GoogleVision));
    
    // Verify the update
    if (!result.acf?.GoogleVision || !Array.isArray(result.acf.GoogleVision)) {
      throw new Error('Gallery update failed: No GoogleVision array in response');
    }

    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

// ... (rest of the code remains the same)