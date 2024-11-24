const fetch = require('node-fetch');
const config = require('../config');

async function getPostTitle(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=title`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const post = await response.json();
    return post.title.rendered || '';
  } catch (error) {
    console.error(`Error getting post title:`, error);
    throw error;
  }
}

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

    const post = await response.json();
    const acf = post.acf || {};

    return {
      main: await getImageUrl(acf.main),
      age: await getImageUrl(acf.age),
      signature: await getImageUrl(acf.signature)
    };
  } catch (error) {
    console.error(`Error getting post images:`, error);
    throw error;
  }
}

async function getImageUrl(imageField) {
  if (!imageField) return null;

  // If it's a media ID
  if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
    try {
      const response = await fetch(`${config.WORDPRESS_API_URL}/media/${imageField}?_fields=source_url`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return null;

      const media = await response.json();
      return media.source_url || null;
    } catch (error) {
      console.error(`Error getting image URL:`, error);
      return null;
    }
  }

  // If it's a direct URL
  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  // If it's an object with a URL property
  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
}

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    console.log(`Updating WordPress metadata for post ${postId}, field: ${metadataKey}`);
    
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
      throw new Error(`Error updating WordPress metadata: ${await response.text()}`);
    }

    console.log(`Successfully updated ${metadataKey} for post ${postId}`);
    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    throw error;
  }
}

module.exports = {
  getPostTitle,
  getPostImages,
  getImageUrl,
  updateWordPressMetadata
};