// ... (previous imports and functions remain the same)

async function calculateDimensions(imageUrl, maxDimensions) {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Failed to fetch image metadata');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    // Calculate dimensions preserving aspect ratio
    const aspectRatio = maxDimensions.width / maxDimensions.height;
    let { width, height } = maxDimensions;

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  } catch (error) {
    console.warn('Error calculating image dimensions:', error);
    return maxDimensions;
  }
}

async function getImageDimensions(placeholder, imageUrl) {
  const maxDimensions = {
    main_image: { width: 400, height: 300 },
    signature_image: { width: 200, height: 150 },
    age_image: { width: 300, height: 200 },
    googlevision: { width: 200, height: 150 }
  };

  const defaultDimensions = { width: 200, height: 150 };
  const dimensions = maxDimensions[placeholder] || defaultDimensions;

  return calculateDimensions(imageUrl, dimensions);
}

async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  if (!imageUrl) {
    console.warn(`No image URL provided for placeholder ${placeholder}`);
    return;
  }

  try {
    // Check if image is accessible
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Image not accessible');
    }

    // Calculate dimensions
    const dimensions = await getImageDimensions(placeholder, imageUrl);

    // Find and replace placeholder
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const placeholderText = `{{${placeholder}}}`;
    let placeholderIndex = -1;

    // Find placeholder in document
    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.includes(placeholderText)) {
            placeholderIndex = elem.startIndex;
            break;
          }
        }
      }
      if (placeholderIndex !== -1) break;
    }

    if (placeholderIndex === -1) {
      console.warn(`Placeholder ${placeholderText} not found`);
      return;
    }

    // Replace placeholder with image
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: placeholderIndex,
                endIndex: placeholderIndex + placeholderText.length,
              },
            },
          },
          {
            insertInlineImage: {
              location: { index: placeholderIndex },
              uri: imageUrl,
              objectSize: {
                height: { magnitude: dimensions.height, unit: 'PT' },
                width: { magnitude: dimensions.width, unit: 'PT' },
              },
            },
          },
        ],
      },
    });

    console.log(`Successfully inserted image for placeholder ${placeholder}`);
  } catch (error) {
    console.error(`Error inserting image for placeholder ${placeholder}:`, error);
    // Don't throw error to allow processing to continue
  }
}

// ... (rest of the file remains the same)

module.exports = {
  // ... (previous exports)
  calculateDimensions,
  getImageDimensions
};