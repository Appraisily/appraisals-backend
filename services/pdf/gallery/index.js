async function insertGalleryGrid(docs, documentId, galleryIndex, gallery) {
  try {
    console.log(`Inserting gallery grid with ${gallery.length} images`);

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
    
    for (let i = 0; i < gallery.length; i++) {
      // Add image
      requests.push({
        insertInlineImage: {
          location: { index: currentIndex },
          uri: gallery[i],
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

      // Add line break after every 3 images
      if ((i + 1) % 3 === 0) {
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
    }

    // Execute all requests
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    console.log(`Successfully inserted ${gallery.length} images in grid layout`);
    return gallery.length;
  } catch (error) {
    console.error('Error inserting gallery grid:', error);
    throw error;
  }
}

module.exports = { insertGalleryGrid };