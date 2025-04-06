const { getPost, getMedia, updatePost } = require('./client');
const { fetchPostData, getImageUrl } = require('./dataFetching');
const { updatePostACFFields, updateNotes, updatePostMeta } = require('./updates');
const { updateHtmlFields, updateEnhancedAnalyticsHtml, updateAppraisalCardHtml, checkHtmlFields } = require('./htmlUpdates');
const { testWordPressConnection } = require('./connectionTest');
const { testWithCurl } = require('./curlTest');
const { runNetworkDiagnostics } = require('./networkDiagnostics');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config'); // Adjusted path

// Function moved from vision.js
async function uploadImageToWordPress(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image from ${imageUrl}: ${response.status} ${response.statusText}`);
      return null;
    }

    const buffer = await response.buffer();
    const filename = `similar-image-${uuidv4()}.jpg`;

    console.log(`Uploading to WordPress endpoint: ${config.WORDPRESS_API_URL}/media`);
    console.log('Auth header present:', !!config.WORDPRESS_USERNAME && !!config.WORDPRESS_APP_PASSWORD);

    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: response.headers.get('content-type') || 'image/jpeg'
    });

    let uploadResponseText;
    const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        'Accept': 'application/json'
      },
      body: form
    });

    uploadResponseText = await uploadResponse.text();

    if (!uploadResponse.ok) {

      console.warn(`Failed to upload image to WordPress (Status ${uploadResponse.status}):`, uploadResponseText);
      
      if (uploadResponse.status === 401 || uploadResponse.status === 403) {
        console.error('Authentication error - Please check WordPress credentials');
        console.error('Response:', uploadResponseText);
      }
      
      return null;
    }

    let mediaData;
    try {
      mediaData = JSON.parse(uploadResponseText);
    } catch (error) {
      console.error('Error parsing WordPress response:', error);
      console.log('Response text:', uploadResponseText);
      return null;
    }

    if (!mediaData || !mediaData.id) {
      console.error('Invalid media response from WordPress:', mediaData);
      console.log('Full response:', uploadResponseText);
      return null;
    }

    return mediaData.id;
  } catch (error) {
    console.error('Error uploading image to WordPress:', error);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Function moved from vision.js
async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating gallery for post ${postId} with image IDs:`, imageIds);

    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          googlevision: imageIds.map(id => id.toString()),
          _gallery_populated: '1'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get error text for logging
      console.error(`Error updating gallery: ${response.status} ${response.statusText}. Response: ${errorText}`); // Log detailed error
      throw new Error(`Error updating gallery: ${errorText}`);
    }

    console.log(`Gallery updated for post ${postId} with ${imageIds.length} images`);
    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

// Export all functions explicitly to avoid naming conflicts
module.exports = {
  // Client methods
  getPost,
  getMedia,
  getImageUrl,
  updatePost,
  // Data fetching
  fetchPostData,
  // Updates
  updatePostACFFields,
  updateNotes,
  updatePostMeta,
  // HTML updates
  updateHtmlFields,
  updateEnhancedAnalyticsHtml,
  updateAppraisalCardHtml,
  checkHtmlFields,
  // Image/Gallery updates (Moved from Vision)
  uploadImageToWordPress,
  updateWordPressGallery,
  // Testing and diagnostics
  testWordPressConnection,
  testWithCurl,
  runNetworkDiagnostics
};