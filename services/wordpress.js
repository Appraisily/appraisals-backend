const fetch = require('node-fetch');
const he = require('he');
const { format } = require('date-fns');
const config = require('../config');

// ... (previous functions remain the same)

async function getPostImages(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const postData = await response.json();
    const acf = postData.acf || {};

    // Get URLs for main image fields
    const [mainUrl, ageUrl, signatureUrl] = await Promise.all([
      getImageFieldUrlFromPost(postId, 'main'),
      getImageFieldUrlFromPost(postId, 'age'),
      getImageFieldUrlFromPost(postId, 'signature')
    ]);

    return {
      main: mainUrl,
      age: ageUrl,
      signature: signatureUrl
    };
  } catch (error) {
    console.error('Error getting post images:', error);
    throw error;
  }
}

// ... (rest of the file remains the same)

module.exports = {
  // ... (previous exports)
  getPostImages
};