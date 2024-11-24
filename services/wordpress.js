const fetch = require('node-fetch');
const he = require('he');
const { format } = require('date-fns');
const config = require('../config');

async function getPostMetadata(postId, metadataKey) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    const acfFields = postData.acf || {};
    let metadataValue = acfFields[metadataKey] || '';

    // Size validation (max 5000 characters)
    const MAX_LENGTH = 5000;
    if (metadataValue.length > MAX_LENGTH) {
      metadataValue = metadataValue.substring(0, MAX_LENGTH) + '...';
      console.warn(`Metadata '${metadataKey}' exceeds ${MAX_LENGTH} characters and has been truncated.`);
    }

    return metadataValue;
  } catch (error) {
    console.error(`Error getting metadata '${metadataKey}' for post ID ${postId}:`, error);
    throw error;
  }
}

async function getPostTitle(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=title`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    return he.decode(postData.title.rendered || '');
  } catch (error) {
    console.error(`Error getting post title for ID ${postId}:`, error);
    throw error;
  }
}

async function getPostDate(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=date`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    return format(new Date(postData.date), 'yyyy-MM-dd');
  } catch (error) {
    console.error(`Error getting post date for ID ${postId}:`, error);
    throw error;
  }
}

async function getImageFieldUrlFromPost(postId, fieldName) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    const acfFields = postData.acf || {};
    const imageField = acfFields[fieldName];

    if (imageField) {
      if (typeof imageField === 'string' && imageField.startsWith('http')) {
        return imageField;
      } else if (typeof imageField === 'number') {
        return await getImageUrl(imageField);
      } else if (typeof imageField === 'object' && imageField.url) {
        return imageField.url;
      }
      console.warn(`Unrecognized image field format for '${fieldName}'`);
      return null;
    }
    
    console.warn(`Image field '${fieldName}' not found or empty`);
    return null;
  } catch (error) {
    console.error(`Error getting image URL for field '${fieldName}' in post ${postId}:`, error);
    throw error;
  }
}

async function getImageUrl(mediaId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}?_fields=source_url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error(`Error getting media ${mediaId}:`, await response.text());
      return null;
    }

    const mediaData = await response.json();
    return mediaData.source_url || null;
  } catch (error) {
    console.error(`Error getting URL for media ${mediaId}:`, error);
    return null;
  }
}

async function getPostGallery(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error getting post: ${await response.text()}`);
    }

    const postData = await response.json();
    const galleryField = postData.acf?.googlevision || [];

    if (Array.isArray(galleryField) && galleryField.length > 0) {
      const imageUrls = await Promise.all(
        galleryField.map(mediaId => getImageUrl(mediaId))
      );
      return imageUrls.filter(url => url !== null);
    }

    return [];
  } catch (error) {
    console.error(`Error getting gallery for post ${postId}:`, error);
    throw error;
  }
}

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
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

    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    throw error;
  }
}

async function updatePostACFFields(postId, pdfLink, docLink) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          pdflink: pdfLink,
          doclink: docLink
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error updating ACF fields: ${await response.text()}`);
    }

    console.log(`ACF fields updated for post ${postId}`);
  } catch (error) {
    console.error(`Error updating ACF fields for post ${postId}:`, error);
    throw error;
  }
}

module.exports = {
  getPostMetadata,
  getPostTitle,
  getPostDate,
  getImageFieldUrlFromPost,
  getImageUrl,
  getPostGallery,
  updateWordPressMetadata,
  updatePostACFFields
};