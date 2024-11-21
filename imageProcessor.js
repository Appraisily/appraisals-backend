const sharp = require('sharp');
const sizeOf = require('image-size');
const fetch = require('node-fetch');

// Maximum dimensions for images
const MAX_WIDTH = 600; // Reduced from 800
const MAX_HEIGHT = 600; // Reduced from 800
const QUALITY = 60; // Reduced from 80

async function fetchImageBuffer(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.buffer();
  } catch (error) {
    console.error(`Error fetching image from ${imageUrl}:`, error);
    throw error;
  }
}

async function compressImage(imageBuffer) {
  try {
    // Get original dimensions
    const dimensions = sizeOf(imageBuffer);
    
    // Calculate new dimensions maintaining aspect ratio
    let width = dimensions.width;
    let height = dimensions.height;
    
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    
    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height);
      height = MAX_HEIGHT;
    }

    // Process image with sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: QUALITY,
        chromaSubsampling: '4:2:0' // Additional compression
      })
      .toBuffer();

    console.log(`Image compressed: ${imageBuffer.length} bytes -> ${processedBuffer.length} bytes`);
    return processedBuffer;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

async function processImageUrl(imageUrl) {
  try {
    console.log(`Processing image: ${imageUrl}`);
    const imageBuffer = await fetchImageBuffer(imageUrl);
    const compressedBuffer = await compressImage(imageBuffer);
    return compressedBuffer;
  } catch (error) {
    console.error(`Error processing image ${imageUrl}:`, error);
    throw error;
  }
}

module.exports = {
  processImageUrl,
  MAX_WIDTH,
  MAX_HEIGHT,
  QUALITY
};