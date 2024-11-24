// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function getImageUrl(mediaId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching media: ${await response.text()}`);
    }

    const mediaData = await response.json();
    return mediaData.source_url || null;
  } catch (error) {
    console.error(`Error getting image URL for media ID ${mediaId}:`, error);
    return null;
  }
}

async function uploadImageToWordPress(imageUrl) {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error downloading image: ${await response.text()}`);
    }
    const buffer = await response.buffer();

    const filename = `similar-image-${uuidv4()}.jpg`;
    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: 'image/jpeg'
    });

    console.log(`Uploading image to WordPress: ${filename}`);
    const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error uploading image: ${await uploadResponse.text()}`);
    }

    const uploadData = await uploadResponse.json();
    console.log(`Image uploaded successfully with ID: ${uploadData.id}`);
    return uploadData.id;
  } catch (error) {
    console.error('Error uploading image to WordPress:', error);
    return null;
  }
}

async function isGalleryPopulated(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const post = await response.json();
    console.log('Gallery population check:', {
      _gallery_populated: post.acf?._gallery_populated,
      GoogleVision: post.acf?.GoogleVision?.length
    });
    
    // Only return true if _gallery_populated is explicitly '1'
    return post.acf?._gallery_populated === '1';
  } catch (error) {
    console.error('Error checking gallery status:', error);
    return false;
  }
}

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating WordPress gallery for post ${postId} with ${imageIds.length} images`);
    
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          GoogleVision: imageIds,
          _gallery_populated: '1'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from WordPress:', errorText);
      throw new Error(`Error updating WordPress gallery: ${errorText}`);
    }

    const result = await response.json();
    console.log('Gallery update response:', result);
    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

async function processMainImageWithGoogleVision(visionClient, postId) {
  try {
    // Check if gallery is already populated
    const galleryPopulated = await isGalleryPopulated(postId);
    if (galleryPopulated) {
      console.log('Gallery already populated, skipping Vision API processing');
      return {
        success: true,
        skipped: true,
        message: 'Gallery already populated'
      };
    }

    // Get post details
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const post = await response.json();
    const mainImageId = post.acf?.main;

    if (!mainImageId) {
      throw new Error('No main image found in post');
    }

    // Get main image URL
    const mainImageUrl = await getImageUrl(mainImageId);
    if (!mainImageUrl) {
      throw new Error('Could not get main image URL');
    }

    console.log(`Main image URL obtained: ${mainImageUrl}`);

    // Analyze with Vision API
    const [result] = await visionClient.webDetection(mainImageUrl);
    const webDetection = result.webDetection;

    if (!webDetection) {
      throw new Error('No web detection results available');
    }

    // Process similar images
    const similarImageUrls = webDetection.visuallySimilarImages
      ?.map(image => image.url)
      .filter(url => url) || [];

    console.log(`Found ${similarImageUrls.length} similar images`);

    // Upload similar images to WordPress
    const uploadedImageIds = [];
    for (const url of similarImageUrls) {
      try {
        const imageId = await uploadImageToWordPress(url);
        if (imageId) {
          uploadedImageIds.push(imageId);
        }
      } catch (uploadError) {
        console.error(`Error uploading similar image: ${uploadError.message}`);
        continue;
      }
    }

    // Update WordPress gallery if we have uploaded images
    if (uploadedImageIds.length > 0) {
      try {
        console.log(`Updating WordPress gallery with ${uploadedImageIds.length} images:`, uploadedImageIds);
        await updateWordPressGallery(postId, uploadedImageIds);
        console.log('Gallery updated successfully');
      } catch (updateError) {
        console.error('Error updating gallery:', updateError);
        throw updateError;
      }
    } else {
      console.warn('No images were successfully uploaded to update the gallery');
    }

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
    };
  } catch (error) {
    console.error('Error processing image with Google Vision:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processMainImageWithGoogleVision,
  getImageUrl
};