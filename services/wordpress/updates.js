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

async function updatePostACFFields(postId, pdfLink, docLink) {
  try {
    await client.updatePost(postId, {
      acf: {
        pdflink: pdfLink,
        doclink: docLink
      }
    });

    console.log(`ACF fields 'pdflink' and 'doclink' updated successfully for post ID ${postId}.`);
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

module.exports = {
  updateWordPressMetadata,
  updatePostACFFields,
  updateNotes
};