const client = require('./client');

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    console.log(`Updating metadata for post ${postId}, field: ${metadataKey}`);
    
    await client.updatePost(postId, {
      acf: {
        [metadataKey]: metadataValue
      }
    });

    console.log(`Successfully updated metadata for post ${postId}, field: ${metadataKey}`);
    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    throw error;
  }
}

/**
 * Updates ACF fields for a WordPress post
 * @param {number|string} postId - The WordPress post ID
 * @param {Object} acfFields - Object containing the ACF fields to update
 * @returns {Promise<boolean>} Success status
 */
async function updatePostACFFields(postId, acfFields) {
  try {
    console.log(`Updating ACF fields for post ID ${postId}`);
    
    // Handle the legacy case (pdfLink, docLink as separate parameters)
    if (typeof acfFields === 'string' && arguments.length >= 3) {
      const pdfLink = arguments[1];
      const docLink = arguments[2];
      
      await client.updatePost(postId, {
        acf: {
          pdflink: pdfLink,
          doclink: docLink
        }
      });
      
      console.log(`Legacy ACF fields 'pdflink' and 'doclink' updated successfully for post ID ${postId}.`);
      return true;
    }
    
    // Modern usage with an object containing all fields
    await client.updatePost(postId, {
      acf: acfFields
    });

    console.log(`ACF fields updated successfully for post ID ${postId}.`);
    return true;
  } catch (error) {
    console.error(`Error updating ACF fields for post ID ${postId}:`, error);
    throw error;
  }
}

/**
 * No longer adds processing notes to WordPress posts
 * @param {number|string} postId - The WordPress post ID
 * @param {string} note - The note (ignored)
 * @returns {Promise<boolean>} Success status
 */
async function updateNotes(postId, note) {
  // Function has been disabled as processing notes are no longer needed
  console.log(`Processing notes disabled for post ID ${postId}`);
  return true;
}

/**
 * Updates a post's metadata (custom fields/meta)
 * @param {number|string} postId - The WordPress post ID
 * @param {string|object} metaKey - The metadata key or an object of key-value pairs
 * @param {any} metaValue - The metadata value (optional if metaKey is an object)
 * @returns {Promise<boolean>} Success status
 */
async function updatePostMeta(postId, metaKey, metaValue) {
  try {
    // Handle case where metaKey is an object containing multiple key/value pairs
    if (typeof metaKey === 'object' && metaKey !== null) {
      console.log(`Updating multiple post meta fields for post ID ${postId}`);
      
      // Create an object to hold all ACF fields to update
      const acfFields = {};
      
      // Process each key/value pair
      for (const [key, value] of Object.entries(metaKey)) {
        // Ensure proper stringification of objects and arrays
        if (typeof value === 'object' && value !== null) {
          acfFields[key] = JSON.stringify(value);
        } else {
          acfFields[key] = value;
        }
      }
      
      // Update the post with all fields at once
      await client.updatePost(postId, {
        acf: acfFields
      });
      
      return true;
    } else {
      // Original single key/value pair case
      console.log(`Updating post meta (via ACF) for post ID ${postId}, key: ${metaKey}`);
      
      // Ensure proper stringification of objects and arrays
      let finalValue = metaValue;
      if (typeof metaValue === 'object' && metaValue !== null) {
        finalValue = JSON.stringify(metaValue);
      }
      
      // Directly use the working ACF update function
      return await updateWordPressMetadata(postId, metaKey, finalValue);
    }
  } catch (error) {
    // Log the error, but the specific error from updateWordPressMetadata will be logged within that function
    console.error(`Error occurred in updatePostMeta for post ID ${postId}, key: ${typeof metaKey === 'object' ? 'multiple keys' : metaKey}:`, error.message);
    // Re-throw the error to indicate failure
    throw error; 
  }
}

module.exports = {
  updateWordPressMetadata,
  updatePostACFFields,
  updateNotes,
  updatePostMeta
};