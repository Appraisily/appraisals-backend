const fetch = require('node-fetch');
const sizeOf = require('image-size');
const sharp = require('sharp');

/**
 * Optimize an image by resizing and adjusting quality
 * @param {string} url - URL of the image to optimize
 * @param {number} maxWidth - Maximum width for the image
 * @param {number} maxHeight - Maximum height for the image
 * @returns {Promise<string>} - URL of the optimized image
 */
async function optimizeImage(url, maxWidth = 800, maxHeight = 600) {
  try {
    if (!url || typeof url !== 'string') {
      console.warn('Invalid image URL provided for optimization');
      return url;
    }

    console.log(`Optimizing image: ${url}`);
    
    // Fetch the image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch image for optimization');
    }

    const buffer = await response.buffer();
    
    try {
      const dimensions = sizeOf(buffer);
      
      // Skip optimization if the image is already small enough
      if (dimensions.width <= maxWidth && dimensions.height <= maxHeight) {
        console.log(`Image already within size limits (${dimensions.width}x${dimensions.height}), skipping optimization`);
        return url;
      }
      
      console.log(`Original image dimensions: ${dimensions.width}x${dimensions.height}`);
      
      // Process the image with sharp
      let sharpInstance = sharp(buffer);
      
      // Get metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize the image while maintaining aspect ratio
      sharpInstance = sharpInstance.resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
      
      // Convert to JPEG if it's not already, with quality reduction
      if (metadata.format !== 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality: 80 });
      } else {
        // If already JPEG, just adjust quality
        sharpInstance = sharpInstance.jpeg({ quality: 80 });
      }
      
      // Generate optimized buffer
      const optimizedBuffer = await sharpInstance.toBuffer();
      
      // Check the size difference
      const originalSize = buffer.length;
      const optimizedSize = optimizedBuffer.length;
      
      const percentReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
      
      console.log(`Image optimized: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentReduction}% reduction)`);
      
      // Since we're not uploading to a server in this implementation
      // we'll still return the original URL, but in a real implementation
      // you would upload the optimized buffer to storage and return that URL
      return url;
    } catch (error) {
      console.error('Error during image optimization:', error);
      return url;
    }
  } catch (error) {
    console.error(`Error optimizing image ${url}:`, error);
    return url; // Return original URL on error
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
      buffer
    };
  } catch (error) {
    console.warn(`Error calculating image dimensions for ${url}:`, error.message);
    return null;
  }
}

async function insertImageAtPlaceholder(docs, documentId, placeholder, imageUrl) {
  try {
    console.log(`Inserting image at placeholder {{${placeholder}}}`);
    
    if (!imageUrl) {
      console.warn(`No image URL provided for placeholder ${placeholder}`);
      return;
    }
    
    // Optimize the image before insertion
    const optimizedImageUrl = await optimizeImage(
      imageUrl, 
      placeholder === 'main_image' ? 800 : 400, // Main image can be larger
      placeholder === 'main_image' ? 600 : 300   // Adjust height accordingly
    );
    
    // Find the placeholder in the document
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    
    // The placeholder text exactly as it appears in the document
    const placeholderText = `{{${placeholder}}}`;
    
    // Find all occurrences of the placeholder
    let occurrences = [];
    
    const findPlaceholdersInElements = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const paragraphElement of element.paragraph.elements) {
            if (paragraphElement.textRun && paragraphElement.textRun.content.includes(placeholderText)) {
              const text = paragraphElement.textRun.content;
              let position = 0;
              
              while (true) {
                const startPos = text.indexOf(placeholderText, position);
                if (startPos === -1) break;
                
                occurrences.push({
                  startIndex: paragraphElement.startIndex + startPos,
                  endIndex: paragraphElement.startIndex + startPos + placeholderText.length
                });
                
                position = startPos + placeholderText.length;
              }
            }
          }
        } else if (element.table) {
          // Also search in tables
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              if (cell.content) {
                findPlaceholdersInElements(cell.content);
              }
            }
          }
        }
      }
    };
    
    findPlaceholdersInElements(content);
    
    if (occurrences.length === 0) {
      console.warn(`No occurrences found for placeholder ${placeholderText}`);
      return;
    }
    
    console.log(`Found ${occurrences.length} occurrences of placeholder ${placeholderText}`);
    
    // Sort occurrences in reverse order (to avoid index shifting)
    occurrences.sort((a, b) => b.startIndex - a.startIndex);
    
    // Process each occurrence
    for (const occurrence of occurrences) {
      // Delete the placeholder
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            deleteContentRange: {
              range: {
                startIndex: occurrence.startIndex,
                endIndex: occurrence.endIndex
              }
            }
          }]
        }
      });
      
      // Adjust image dimensions based on the type of image
      let height, width;
      if (placeholder === 'main_image') {
        // Main image can be larger
        height = 300;
        width = 400;
      } else if (placeholder === 'signature_image' || placeholder === 'age_image') {
        // Signature and age verification images should be smaller
        height = 150;
        width = 200;
      } else {
        // Default sizes for other images
        height = 200;
        width = 250;
      }
      
      // Insert the optimized image in place of the placeholder
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertInlineImage: {
              location: {
                index: occurrence.startIndex
              },
              uri: optimizedImageUrl,
              objectSize: {
                height: {
                  magnitude: height,
                  unit: 'PT'
                },
                width: {
                  magnitude: width,
                  unit: 'PT'
                }
              }
            }
          }]
        }
      });
    }

    console.log(`Image inserted successfully at ${occurrences.length} placeholders for ${placeholder}`);
    return true;
  } catch (error) {
    console.error(`Error inserting image at placeholder ${placeholder}:`, error);
    throw error;
  }
}

module.exports = {
  calculateImageDimensions,
  insertImageAtPlaceholder,
  optimizeImage
};