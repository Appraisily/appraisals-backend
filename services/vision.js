// services/vision.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// ... (mantener las funciones getImageUrl y uploadImageToWordPress igual)

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating WordPress gallery for post ${postId} with ${imageIds.length} images:`, imageIds);

    // Actualizar usando la estructura correcta para ACF
    const updateData = {
      acf: {
        googlevision: imageIds, // Nombre del campo en minúsculas como en WordPress
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
    
    // Verificar la actualización
    if (!result.acf || !Array.isArray(result.acf.googlevision)) {
      console.warn('Warning: Gallery update response does not contain expected array');
      // No lanzar error, solo registrar advertencia
    }

    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

// ... (mantener el resto del archivo igual)

module.exports = {
  getImageUrl,
  processMainImageWithGoogleVision
};