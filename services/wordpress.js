const fetch = require('node-fetch');
const config = require('../config');

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
    return he.decode(post.title.rendered || '');
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

    // Get URLs for the three main images used in content generation
    const images = {
      main: await getImageUrl(acf.main),
      age: await getImageUrl(acf.age),
      signature: await getImageUrl(acf.signature)
    };

    console.log('Retrieved image URLs:', {
      main: images.main ? 'Found' : 'Not found',
      age: images.age ? 'Found' : 'Not found',
      signature: images.signature ? 'Found' : 'Not found'
    });

    return images;
  } catch (error) {
    console.error(`Error getting post images:`, error);
    throw error;
  }
}

async function getImageUrl(imageField) {
  if (!imageField) return null;

  try {
    // If it's a media ID
    if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
      const response = await fetch(`${config.WORDPRESS_API_URL}/media/${imageField}?_fields=source_url`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        console.warn(`Could not fetch media ID ${imageField}`);
        return null;
      }

      const media = await response.json();
      return media.source_url || null;
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
  } catch (error) {
    console.error(`Error getting image URL:`, error);
    return null;
  }
}

module.exports = {
  updateWordPressMetadata,
  getPostTitle,
  getPostImages,
  getImageUrl
};