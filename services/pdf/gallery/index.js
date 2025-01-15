const fetch = require('node-fetch');
const sizeOf = require('image-size');
const {
  MAX_IMAGES_PER_ROW,
  DEFAULT_IMAGE_DIMENSIONS,
  GALLERY_TITLE,
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
    
    // First, remove the gallery placeholder
    try {
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
    } catch (error) {
      console.error('Error removing gallery placeholder:', error);
      return 0;
    }

    // If no gallery images, replace placeholder with message
    if (gallery.length === 0) {
      console.log('No gallery images found, replacing with message');
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              insertText: {
                location: { index: galleryIndex },
                text: 'No similar images were found during the analysis of this artwork.'
              }
            }]
          }
        });
        console.log('Gallery placeholder replaced with message');
      } catch (error) {
        console.error('Error replacing gallery placeholder:', error);
      }
      return 0;
    }

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
    // Add paragraph break before gallery
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '\n\n'
      }
    });
    currentIndex += 2;

    // Add title with proper paragraph styling
    const titleText = GALLERY_TITLE + '\n\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: titleText
      }
    }, {
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + GALLERY_TITLE.length
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_3',
          alignment: 'CENTER',
          spaceAbove: { magnitude: 20, unit: 'PT' },
          spaceBelow: { magnitude: 20, unit: 'PT' }
        },
        fields: 'namedStyleType,alignment,spaceAbove,spaceBelow'
      }
    });
    currentIndex += titleText.length;

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

          // Update paragraph style to ensure proper spacing
          batchRequests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + 1
              },
              paragraphStyle: {
                alignment: 'CENTER',
                lineSpacing: 150,
                spaceAbove: { magnitude: 10, unit: 'PT' },
                spaceBelow: { magnitude: 10, unit: 'PT' }
              },
              fields: 'alignment,lineSpacing,spaceAbove,spaceBelow'
            }
          });

          insertedCount++;
          currentIndex += isEndOfRow ? 6 : 4; // Adjust index based on spacing
        } catch (error) {
          console.warn(`Failed to prepare image request:`, error.message);
          continue;
        }

      // Execute batch requests
      if (batchRequests.length > 0) {
        try {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: { requests: batchRequests }
          });
          console.log(`Successfully inserted batch of ${batch.length} images at index ${currentIndex}`);
        } catch (error) {
          console.error(`Error inserting batch at index ${currentIndex}:`, error.message);
          // If image is not accessible, replace with placeholder text
          try {
            await docs.documents.batchUpdate({
              documentId,
              requestBody: {
                requests: [{
                  insertText: {
                    location: { index: currentIndex },
                    text: '[Image not available]'
                  }
                }]
              }
            });
            console.log('Replaced failed image with placeholder text');
          } catch (innerError) {
            console.error('Error adding placeholder text:', innerError);
          }
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