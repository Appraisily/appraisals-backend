// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function getImageUrl(imageField) {
  if (!imageField) return null;

  // Si es un ID de media (número o cadena numérica)
  if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
    const mediaId = imageField;
    try {
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
    } catch (error) {
      console.error(`Error fetching image with ID ${mediaId}:`, error);
      return null;
    }
  }

  // Si es una URL directa
  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  // Si es un objeto con una propiedad 'url'
  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
}

async function uploadImageToWordPress(imageUrl) {
  try {
    // Descargar la imagen
    console.log(`Downloading image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Error downloading image from ${imageUrl}:`, await response.text());
      return null;
    }
    const buffer = await response.buffer();

    // Crear un nombre de archivo único
    const filename = `similar-image-${uuidv4()}.jpg`;

    // Preparar el formulario para subir la imagen
    const form = new FormData();
    form.append('file', buffer, filename);

    // Subir la imagen a WordPress
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
      console.error(`Error uploading image to WordPress from ${imageUrl}:`, await uploadResponse.text());
      return null;
    }

    const uploadData = await uploadResponse.json();
    console.log(`Image uploaded successfully with ID: ${uploadData.id}`);
    return uploadData.id;
  } catch (error) {
    console.error(`Error uploading image to WordPress:`, error);
    return null;
  }
}

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating WordPress gallery for post ${postId} with ${imageIds.length} images:`, imageIds);

    const updateData = {
      acf: {
        googlevision: imageIds,
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
    console.log('Gallery update response:', JSON.stringify(result.acf?.googlevision));
    
    if (!result.acf || !Array.isArray(result.acf.googlevision)) {
      console.warn('Warning: Gallery update response does not contain expected array');
    }

    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

async function processMainImageWithGoogleVision(visionClient, postId) {
  try {
    // Verificar si la galería ya está poblada
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const postData = await response.json();
    const galleryStatus = {
      _gallery_populated: postData.acf?._gallery_populated,
      GoogleVision: postData.acf?.googlevision
    };
    console.log('Gallery population check:', galleryStatus);

    if (galleryStatus._gallery_populated === '1' && Array.isArray(galleryStatus.GoogleVision)) {
      console.log('Gallery already populated, skipping Vision analysis');
      return {
        success: true,
        message: 'Gallery already populated',
        similarImagesCount: galleryStatus.GoogleVision.length
      };
    }

    // Obtener la URL de la imagen principal
    const mainImageUrl = await getImageUrl(postData.acf?.main);
    if (!mainImageUrl) {
      throw new Error('Main image not found in post');
    }
    console.log('Main image URL obtained:', mainImageUrl);

    // Analizar la imagen con Google Vision
    const [result] = await visionClient.webDetection(mainImageUrl);
    const webDetection = result.webDetection;

    if (!webDetection || !webDetection.visuallySimilarImages) {
      throw new Error('No similar images found in Vision API response');
    }

    const similarImages = webDetection.visuallySimilarImages;
    console.log(`Found ${similarImages.length} similar images`);

    // Subir imágenes similares a WordPress
    const uploadedImageIds = [];
    for (const image of similarImages) {
      console.log('Downloading image from:', image.url);
      const imageId = await uploadImageToWordPress(image.url);
      if (imageId) {
        uploadedImageIds.push(imageId);
      }
    }

    if (uploadedImageIds.length > 0) {
      console.log(`Updating WordPress with ${uploadedImageIds.length} similar images`);
      console.log('Updating WordPress gallery for post', postId, 'with', uploadedImageIds.length, 'images:', uploadedImageIds);
      await updateWordPressGallery(postId, uploadedImageIds);
    }

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
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