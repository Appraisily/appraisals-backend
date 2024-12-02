const fetch = require('node-fetch');

// Verify if an image URL is accessible
async function verifyImageUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch (error) {
    console.warn(`Failed to verify image URL ${url}:`, error.message);
    return false;
  }
}

async function insertGalleryGrid(docs, documentId, galleryIndex, gallery) {
  try {
    console.log(`Verifying ${gallery.length} images before insertion`);

    // Verify all images first
    const verificationPromises = gallery.map(url => verifyImageUrl(url));
    const verificationResults = await Promise.all(verificationPromises);
    const validImages = gallery.filter((_, index) => verificationResults[index]);

    console.log(`Found ${validImages.length} valid images out of ${gallery.length}`);

    if (validImages.length === 0) {
      console.warn('No valid images found for gallery');
      return 0;
    }

    // Delete gallery placeholder
    const requests = [{
      deleteContentRange: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + '{{gallery}}'.length
        }
      }
    }];

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
    
    for (const imageUrl of validImages) {
      try {
        // Add image
        requests.push({
          insertInlineImage: {
            location: { index: currentIndex },
            uri: imageUrl,
            objectSize: {
              height: { magnitude: 150, unit: 'PT' },
              width: { magnitude: 150, unit: 'PT' }
            }
          }
        });

        // Add spacing after image
        requests.push({
          insertText: {
            location: { index: currentIndex + 1 },
            text: '   '  // 3 spaces for horizontal spacing
          }
        });

        insertedCount++;

        // Add line break after every 3 images
        if (insertedCount % 3 === 0) {
          requests.push({
            insertText: {
              location: { index: currentIndex + 4 },
              text: '\n\n'  // Double line break for vertical spacing
            }
          });
          currentIndex += 6;  // Account for image + spaces + line breaks
        } else {
          currentIndex += 4;  // Account for image + spaces
        }
      } catch (error) {
        console.warn(`Failed to add image ${imageUrl}:`, error.message);
        continue;
      }
    }

    // Execute all requests
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      });
      console.log(`Successfully inserted ${insertedCount} images in grid layout`);
    }

    return insertedCount;
  } catch (error) {
    console.error('Error inserting gallery grid:', error);
    throw error;
  }
}

module.exports = { insertGalleryGrid };