const { getPost, getMedia, updatePost } = require('./client');
const { fetchPostData, getImageUrl } = require('./dataFetching');
const { updatePostACFFields, updateWordPressMetadata, updateNotes, updatePostMeta } = require('./updates');
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

// Function moved from metadata.js
async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    console.log(`[WP Update] Updating metadata for post ${postId}, field: ${metadataKey}`);
    
    if (!postId || !metadataKey) throw new Error('Post ID and Metadata key are required');
    const numericPostId = parseInt(postId, 10);
    if (isNaN(numericPostId)) throw new Error(`Invalid post ID: ${postId}`);
    
    let processedValue = metadataValue;
    // Handle object stringification and potential truncation/sanitization if needed
    if (typeof metadataValue === 'object' && metadataValue !== null) {
      try {
          // Basic sanitization for quotes/special chars before stringifying
          const sanitizeObjectStrings = (obj) => {
              if (!obj) return obj;
              Object.keys(obj).forEach(key => {
                  if (typeof obj[key] === 'string') {
                      // Replace problematic characters
                      obj[key] = obj[key]
                          .replace(/[\u2018\u2019]/g, "'")
                          .replace(/[\u201C\u201D]/g, '"')
                          .replace(/\u00A0/g, ' ')
                          .replace(/\u2022/g, '-');
                          // Optionally strip non-ASCII if necessary: .replace(/[^\x00-\x7F]/g, '');
                  } else if (typeof obj[key] === 'object') {
                      sanitizeObjectStrings(obj[key]); // Recurse
                  }
              });
              return obj;
          };
          // Deep clone before sanitizing to avoid modifying original object
          const clonedValue = JSON.parse(JSON.stringify(metadataValue));
          const sanitizedObject = sanitizeObjectStrings(clonedValue); 
          processedValue = JSON.stringify(sanitizedObject);
      } catch (e) {
          console.error("Error sanitizing/stringifying object for WP:", e);
          // Fallback or rethrow
          processedValue = JSON.stringify(metadataValue); // Try basic stringify
      }
      
      // Optional: Truncate very large JSON strings (e.g., > 100KB)
      if (processedValue.length > 100000) {
        console.warn(`[WP Update] JSON string for ${metadataKey} is large (${processedValue.length} chars), potential issues.`);
        // Implement truncation if needed
      }
    } else if (typeof metadataValue === 'string' && metadataValue.length > 100000) {
      console.warn(`[WP Update] String value for ${metadataKey} is large (${metadataValue.length} chars), truncating.`);
      processedValue = metadataValue.substring(0, 100000) + '... [truncated]';
    }

    const requestBody = { acf: { [metadataKey]: processedValue } };
    const apiUrl = `${config.WORDPRESS_API_URL}/appraisals/${numericPostId}`;
    
    console.log(`[WP Update] Calling: POST ${apiUrl} for key: ${metadataKey}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WP Update] Error (${response.status}): ${errorText}`);
      throw new Error(`WP API Error updating ${metadataKey}: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`[WP Update] Success for post ${postId}, field: ${metadataKey}`);
    return true;
  } catch (error) {
    console.error(`[WP Update] Failure for ${metadataKey}:`, error);
    throw error; // Re-throw to be handled by caller
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
  updateWordPressMetadata,
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