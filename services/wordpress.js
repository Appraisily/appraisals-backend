const fetch = require('node-fetch');
const client = require('./wordpress/client');
const he = require('he');
const util = require('util');

async function getPostMetadata(postId, metadataKey) {
  try {
    console.log(`Getting metadata '${metadataKey}' for post ID ${postId}`);
    const postData = await client.getPost(postId, ['acf']);

    console.log('Response status:', postData.status);
    console.log('Full request details:', {
      url: `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`,
      timeout: 10000
    });

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
    console.error('Detailed fetch error:', {
      message: error.message,
      code: error.code,
      type: error.type,
      errno: error.errno,
      url: `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`,
      stack: error.stack,
      fullError: util.inspect(error, { depth: null, colors: true })
    });
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