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
 * Updates or appends to the processing_notes field in WordPress
 * @param {number|string} postId - The WordPress post ID
 * @param {string} note - The note to add
 * @returns {Promise<boolean>} Success status
 */
async function updateNotes(postId, note) {
  try {
    // First, try to get the current notes
    let currentNotes = '';
    try {
      const post = await client.getPost(postId, ['acf.processing_notes']);
      if (post && post.acf && post.acf.processing_notes) {
        currentNotes = post.acf.processing_notes;
      }
    } catch (getError) {
      console.warn('Could not retrieve existing notes, will create new ones:', getError.message);
    }

    // Add timestamp to the note
    const timestamp = new Date().toISOString();
    const formattedNote = `[${timestamp}] ${note}`;
    
    // Append to existing notes or create new ones
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${formattedNote}`
      : formattedNote;
    
    // Update the post
    await client.updatePost(postId, {
      acf: {
        processing_notes: updatedNotes
      }
    });
    
    console.log(`Processing notes updated for post ID ${postId}`);
    return true;
  } catch (error) {
    console.error(`Error updating notes for post ID ${postId}:`, error);
    // Don't throw, as this might be used in error handlers
    return false;
  }
}

/**
 * Updates a post's metadata (custom fields/meta)
 * @param {number|string} postId - The WordPress post ID
 * @param {string} metaKey - The metadata key
 * @param {any} metaValue - The metadata value
 * @returns {Promise<boolean>} Success status
 */
async function updatePostMeta(postId, metaKey, metaValue) {
  try {
    console.log(`Updating post meta (via ACF) for post ID ${postId}, key: ${metaKey}`);
    // Directly use the working ACF update function
    return await updateWordPressMetadata(postId, metaKey, metaValue);
  } catch (error) {
    // Log the error, but the specific error from updateWordPressMetadata will be logged within that function
    console.error(`Error occurred in updatePostMeta while calling updateWordPressMetadata for post ID ${postId}, key: ${metaKey}:`, error.message);
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