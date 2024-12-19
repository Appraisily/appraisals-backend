const fetch = require('node-fetch');
const config = require('../config');
const he = require('he');

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
};

async function getPostMetadata(postId, metadataKey) {
  try {
    console.log(`Getting metadata '${metadataKey}' for post ID ${postId}`);
    const endpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`;
    console.log('Fetching from endpoint:', endpoint);

    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error response:', errorText);
      console.error('WordPress API endpoint:', endpoint);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers.raw());
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let postData;
    try {
      postData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse WordPress response as JSON:', parseError);
      console.error('Raw response received:', responseText);
      throw new Error('Invalid JSON response from WordPress');
    }

    const acfFields = postData.acf || {};
    let metadataValue = acfFields[metadataKey];
    
    if (metadataKey === 'appraisaltype') {
      console.log('Raw appraisaltype value:', metadataValue);
      console.log('appraisaltype type:', typeof metadataValue);
    }

    // Handle different types of values
    if (metadataValue === null || metadataValue === undefined) {
      return '';
    }

    // Special handling for 'value' field which is numeric
    if (metadataKey === 'value' && typeof metadataValue === 'number') {
      return metadataValue.toString();
    }

    // Convert to string if it's a number
    if (typeof metadataValue === 'number') {
      return metadataValue.toString();
    }

    // Only decode if it's a string
    if (typeof metadataValue === 'string') {
      metadataValue = he.decode(metadataValue);

      // Size validation (max 5000 characters)
      const MAX_LENGTH = 5000;
      if (metadataValue.length > MAX_LENGTH) {
        metadataValue = metadataValue.substring(0, MAX_LENGTH) + '...';
        console.warn(`Metadata '${metadataKey}' exceeds ${MAX_LENGTH} characters and has been truncated.`);
      }
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
      headers: DEFAULT_HEADERS
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    // Decode HTML entities in the title
    return he.decode(postData.title.rendered || '');
  } catch (error) {
    console.error(`Error getting title for post ID ${postId}:`, error);
    throw error;
  }
}

async function getPostDate(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=date`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    const postData = await response.json();
    return new Date(postData.date).toISOString().split('T')[0];
  } catch (error) {
    console.error(`Error getting date for post ID ${postId}:`, error);
    throw error;
  }
}

async function getImageUrl(mediaId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}?_fields=source_url`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting media from WordPress:`, errorText);
      return null;
    }

    const mediaData = await response.json();
    return mediaData.source_url || null;
  } catch (error) {
    console.error(`Error getting URL for media ID ${mediaId}:`, error);
    return null;
  }
}

async function getImageFieldUrlFromPost(postId, fieldName) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
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
    }

    console.warn(`Image field '${fieldName}' not found or empty.`);
    return null;
  } catch (error) {
    console.error(`Error getting image URL for field '${fieldName}' from post ID ${postId}:`, error);
    throw error;
  }
}

async function getPostGallery(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting post from WordPress:', errorText);
      throw new Error('Error getting post from WordPress.');
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
    console.error(`Error getting gallery for post ID ${postId}:`, error);
    throw error;
  }
}

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
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
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        acf: {
          pdflink: pdfLink,
          doclink: docLink
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating ACF fields in WordPress:`, errorText);
      throw new Error('Error updating ACF fields in WordPress.');
    }

    console.log(`ACF fields 'pdflink' and 'doclink' updated successfully for post ID ${postId}.`);
    return true;
  } catch (error) {
    console.error(`Error updating ACF fields for post ID ${postId}:`, error);
    throw error;
  }
}

async function getPostImages(postId) {
  try {
    const [mainImage, ageImage, signatureImage] = await Promise.all([
      getImageFieldUrlFromPost(postId, 'main'),
      getImageFieldUrlFromPost(postId, 'age'),
      getImageFieldUrlFromPost(postId, 'signature')
    ]);

    return {
      main: mainImage,
      age: ageImage,
      signature: signatureImage
    };
  } catch (error) {
    console.error(`Error getting images for post ${postId}:`, error);
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
  updatePostACFFields,
  getPostImages
};