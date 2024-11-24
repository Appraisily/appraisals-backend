// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function getImageUrl(imageField) {
  if (!imageField) return null;

  try {
    // If it's a media ID (number or string number)
    if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
      const mediaId = imageField;
      const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        console.error(`Error fetching image with ID ${mediaId}:`, await response.text());
        return null;
      }

      const mediaData = await response.json();
      return mediaData.source_url || null;
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
    console.error('Error getting image URL:', error);
    return null;
  }
}

async function uploadImageToWordPress(imageUrl) {
  try {
    // Download the image
    console.log(`Downloading image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error downloading image: ${await response.text()}`);
    }
    const buffer = await response.buffer();

    // Create unique filename
    const filename = `similar-image-${uuidv4()}.jpg`;

    // Prepare form data
    const form = new FormData();
    form.append('file', buffer, filename);

    // Upload to WordPress
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

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating WordPress gallery for post ${postId} with ${imageIds.length} images:`, imageIds);

    // Update only the GoogleVision gallery field and _gallery_populated flag
    const updateData = {
      fields: {
        GoogleVision: imageIds,
        _gallery_populated: '1'
      }
    };

    console.log('Sending update to WordPress with data:', JSON.stringify(updateData));

    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from WordPress:', errorText);
      throw new Error(`Error updating WordPress gallery: ${errorText}`);
    }

    const result = await response.json();
    console.log('Gallery update response:', JSON.stringify(result.acf?.GoogleVision));
    
    if (!result.acf?.GoogleVision) {
      throw new Error('Gallery update failed: No GoogleVision array in response');
    }

    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

async function processMainImageWithGoogleVision(visionClient, postId) {
  try {
    // Check if gallery is already populated
    const checkResponse = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!checkResponse.ok) {
      throw new Error(`Error checking gallery status: ${await checkResponse.text()}`);
    }

    const postData = await checkResponse.json();
    const galleryStatus = {
      _gallery_populated: postData.acf?._gallery_populated,
      GoogleVision: postData.acf?.GoogleVision
    };
    console.log('Gallery population check:', galleryStatus);

    if (galleryStatus._gallery_populated === '1') {
      console.log('Gallery already populated, skipping Vision analysis');
      return {
        success: true,
        message: 'Gallery already populated',
        skipped: true
      };
    }

    // Get main image URL
    const mainImageUrl = await getImageUrl(postData.acf?.main);
    if (!mainImageUrl) {
      throw new Error('Main image not found');
    }
    console.log('Main image URL obtained:', mainImageUrl);

    // Analyze with Vision AI
    const [result] = await visionClient.webDetection(mainImageUrl);
    const webDetection = result.webDetection;

    if (!webDetection?.visuallySimilarImages?.length) {
      console.log('No similar images found');
      return {
        success: true,
        similarImagesCount: 0,
        uploadedImageIds: []
      };
    }

    console.log(`Found ${webDetection.visuallySimilarImages.length} similar images`);

    // Upload similar images to WordPress
    const uploadedIds = [];
    for (const similarImage of webDetection.visuallySimilarImages) {
      try {
        console.log(`Downloading image from: ${similarImage.url}`);
        const imageId = await uploadImageToWordPress(similarImage.url);
        if (imageId) {
          uploadedIds.push(imageId);
        }
      } catch (error) {
        console.error(`Error processing similar image: ${similarImage.url}`, error);
        // Continue with next image
      }
    }

    if (uploadedIds.length > 0) {
      console.log(`Updating WordPress with ${uploadedIds.length} similar images`);
      await updateWordPressGallery(postId, uploadedIds);
      console.log('Gallery updated successfully');
    }

    return {
      success: true,
      similarImagesCount: webDetection.visuallySimilarImages.length,
      uploadedImageIds: uploadedIds
    };

  } catch (error) {
    console.error('Error in Vision analysis:', error);
    throw error;
  }
}

module.exports = {
  getImageUrl,
  processMainImageWithGoogleVision
};