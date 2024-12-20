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

module.exports = {
  updateWordPressMetadata,
  updatePostACFFields
};