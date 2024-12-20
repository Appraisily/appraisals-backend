const client = require('./client');

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
  updatePostACFFields
};