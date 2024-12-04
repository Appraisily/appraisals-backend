const fetch = require('node-fetch');
const sizeOf = require('image-size');
const {
  MAX_IMAGES_PER_ROW,
  DEFAULT_IMAGE_DIMENSIONS,
  createGalleryTitle,
  createImageRequest,
  createSpacingRequest,
  calculateBatchSize
} = require('./formatUtils');

async function calculateImageDimensions(url, maxWidth = 200, maxHeight = 150) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const buffer = await response.buffer();
    const dimensions = sizeOf(buffer);

    let width = dimensions.width;
    let height = dimensions.height;

    const widthScale = maxWidth / width;
    const heightScale = maxHeight / height;
    const scale = Math.min(widthScale, heightScale);

    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      buffer // Return buffer to avoid downloading twice
    };
  } catch (error) {
    console.warn(`Error calculating image dimensions for ${url}:`, error.message);
    return null;
  }
}

async function verifyAndProcessImage(url) {
  try {
    console.log(`Processing image: ${url}`);
    const imageData = await calculateImageDimensions(url);
    
    if (!imageData) {
      console.warn(`Failed to process image: ${url}`);
      return null;
    }

    return imageData;
  } catch (error) {
    console.warn(`Failed to verify image ${url}:`, error.message);
    return null;
  }
}

async function insertGalleryGrid(docs, documentId, galleryIndex, gallery) {
  try {
    console.log(`Processing ${gallery.length} images for gallery`);

    // Process all images first
    const processedImages = await Promise.all(
      gallery.map(url => verifyAndProcessImage(url))
    );

    // Filter out failed images
    const validImages = processedImages.filter(img => img !== null);

    console.log(`Successfully processed ${validImages.length} out of ${gallery.length} images`);
    
    if (validImages.length === 0) {
      console.warn('No valid images found for gallery');
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            deleteContentRange: {
              range: {
                startIndex: galleryIndex,
                endIndex: galleryIndex + '{{gallery}}'.length
              }
            }
          }]
        }
      });
      return 0;
    }

    let currentIndex = galleryIndex;
    const requests = [];

    // Add gallery title
    requests.push(...createGalleryTitle(currentIndex));
    currentIndex += requests[0].insertText.text.length;

    // Remove original placeholder
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + '{{gallery}}'.length
        }
      }
    });

    let insertedCount = 0;
    const batchSize = calculateBatchSize(validImages.length);
    
    // Process images in batches
    for (let i = 0; i < validImages.length; i += batchSize) {
      const batch = validImages.slice(i, i + batchSize);
      const batchRequests = [];

      for (let j = 0; j < batch.length; j++) {
        const imageData = batch[j];
        const isEndOfRow = (insertedCount + 1) % MAX_IMAGES_PER_ROW === 0;
        
        try {
          // Add image with proper dimensions
          batchRequests.push(createImageRequest(
            currentIndex,
            gallery[i + j],
            imageData || DEFAULT_IMAGE_DIMENSIONS
          ));

          // Add appropriate spacing
          batchRequests.push(createSpacingRequest(currentIndex + 1, isEndOfRow));

          insertedCount++;
          currentIndex += isEndOfRow ? 6 : 4; // Adjust index based on spacing
        } catch (error) {
          console.warn(`Failed to prepare image request:`, error.message);
          continue;
        }
      }

      // Execute batch requests
      if (batchRequests.length > 0) {
        try {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: { requests: batchRequests }
          });
          console.log(`Successfully inserted batch of ${batch.length} images`);
        } catch (error) {
          console.error(`Error inserting batch:`, error.message);
          // Continue with next batch
        }
      }
    }

    console.log(`Gallery insertion complete. Inserted ${insertedCount} images`);
    return insertedCount;
  } catch (error) {
    console.error('Error inserting gallery grid:', error);
    throw error;
  }
}

module.exports = { insertGalleryGrid };