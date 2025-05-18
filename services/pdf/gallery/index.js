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
const { optimizeImage } = require('../imageUtils');

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
    
    // Optimize the gallery image
    const optimizedUrl = await optimizeImage(url, 300, 200);
    
    const imageData = await calculateImageDimensions(optimizedUrl);
    
    if (!imageData) {
      console.warn(`Failed to process image: ${optimizedUrl}`);
      return null;
    }

    return {
      ...imageData,
      originalUrl: url,
      optimizedUrl
    };
  } catch (error) {
    console.warn(`Failed to verify image ${url}:`, error.message);
    return null;
  }
}

async function insertGalleryGrid(docs, documentId, galleryIndex, gallery) {
  try {
    console.log(`Inserting gallery grid with ${gallery.length} images`);
    
    if (!gallery || !Array.isArray(gallery) || gallery.length === 0) {
      console.warn('No gallery images to insert');
      return false;
    }
    
    // Process all image URLs to ensure they're valid and calculate dimensions
    const processingResults = await Promise.all(
      gallery.map(url => verifyAndProcessImage(url))
    );
    
    // Filter out null results (failed processing)
    const validImages = processingResults.filter(result => result !== null);
    const validUrls = validImages.map(img => img.optimizedUrl || img.originalUrl);
    
    if (validImages.length === 0) {
      console.warn('No valid images after processing');
      return false;
    }
    
    console.log(`Processed ${validImages.length} valid gallery images (out of ${gallery.length})`);
    
    // Create gallery title
    const titleText = createGalleryTitle(galleryIndex);
    
    // Get current document to find where to insert gallery
    const document = await docs.documents.get({ documentId });
    
    // Find gallery placeholder
    const content = document.data.body.content;
    let currentIndex = -1;
    
    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.includes('{{gallery}}')) {
            currentIndex = elem.startIndex + elem.textRun.content.indexOf('{{gallery}}');
            break;
          }
        }
      }
      if (currentIndex !== -1) break;
    }
    
    if (currentIndex === -1) {
      console.warn('Gallery placeholder not found');
      return false;
    }
    
    // Create batch requests for the document update
    const requests = [];
    
    // Delete the placeholder
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + 10 // '{{gallery}}' is 10 characters
        }
      }
    });
    
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
        const imageUrl = validUrls[i + j];
        
        try {
          // Add image with proper dimensions
          batchRequests.push(createImageRequest(
            currentIndex,
            imageUrl,
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
                spaceAbove: { magnitude: 20, unit: 'PT' },
                spaceBelow: { magnitude: 20, unit: 'PT' }
              },
              fields: 'alignment,lineSpacing,spaceAbove,spaceBelow'
            }
          });

          insertedCount++;
          currentIndex += isEndOfRow ? 4 : 2; // Fixed spacing increments
        } catch (error) {
          console.warn(`Failed to prepare image request:`, error.message);
          continue;
        }
      }
      
      if (batchRequests.length > 0) {
        try {
          // Execute all requests in this batch
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: batchRequests
            }
          });
          
          console.log(`Inserted batch of ${batchRequests.length} requests`);
        } catch (error) {
          console.error(`Error inserting gallery batch:`, error);
          // Continue with other batches despite errors
        }
      }
    }
    
    console.log(`Gallery grid inserted successfully with ${insertedCount} images`);
    return true;
  } catch (error) {
    console.error(`Error inserting gallery grid:`, error);
    return false;
  }
}

module.exports = {
  insertGalleryGrid
};