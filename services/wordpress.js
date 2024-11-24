// services/wordpress.js
const fetch = require('node-fetch');
const config = require('../config');

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          [metadataKey]: metadataValue
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error updating WordPress metadata: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    throw error;
  }
}

module.exports = {
  updateWordPressMetadata
};