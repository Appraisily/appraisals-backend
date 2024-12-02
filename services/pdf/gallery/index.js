const fetch = require('node-fetch');
const sizeOf = require('image-size');

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
      // Remove gallery placeholder and exit
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

    const requests = [];

    // Delete gallery placeholder
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + '{{gallery}}'.length
        }
      }
    });

    // Insert section title
    requests.push({
      insertText: {
        location: { index: galleryIndex },
        text: "Similar Artworks\n"
      }
    });

    // Style section title
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + "Similar Artworks\n".length
        },
        paragraphStyle: {
          alignment: 'CENTER',
          namedStyleType: 'HEADING_3'
        },
        fields: 'alignment,namedStyleType'
      }
    });

    // Insert images with spacing
    let currentIndex = galleryIndex + "Similar Artworks\n".length;
    let insertedCount = 0;
    const batchSize = 10; // Process images in smaller batches
    
    // Process images in batches
    for (let i = 0; i < validImages.length; i += batchSize) {
      const batch = validImages.slice(i, i + batchSize);
      const batchRequests = [];

      for (const imageData of batch) {
        try {
          // Add image
          batchRequests.push({
            insertInlineImage: {
              location: { index: currentIndex },
              uri: gallery[i], // Original URL
              objectSize: {
                height: { magnitude: imageData.height, unit: 'PT' },
                width: { magnitude: imageData.width, unit: 'PT' }
              }
            }
          });

          // Add spacing after image
          batchRequests.push({
            insertText: {
              location: { index: currentIndex + 1 },
              text: '   ' // 3 spaces for horizontal spacing
            }
          });

          insertedCount++;

          // Add line break after every 3 images
          if (insertedCount % 3 === 0) {
            batchRequests.push({
              insertText: {
                location: { index: currentIndex + 4 },
                text: '\n\n' // Double line break for vertical spacing
              }
            });
            currentIndex += 6; // Account for image + spaces + line breaks
          } else {
            currentIndex += 4; // Account for image + spaces
          }
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
          console.log(`Successfully inserted batch of ${batchRequests.length / 2} images`);
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