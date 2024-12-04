const MAX_IMAGES_PER_ROW = 3;
const IMAGE_SPACING = '   '; // 3 spaces for horizontal spacing
const ROW_SPACING = '\n\n';  // Double line break for vertical spacing
const GALLERY_TITLE = 'Visual Comparisons: Similar Artworks Identified by Google Vision';
const GALLERY_TITLE_STYLE = {
  alignment: 'CENTER',
  namedStyleType: 'HEADING_3'
};

const DEFAULT_IMAGE_DIMENSIONS = {
  width: 200,
  height: 150
};

function createGalleryTitle(index) {
  return [{
    insertText: {
      location: { index },
      text: `${GALLERY_TITLE}\n`
    }
  }, {
    updateParagraphStyle: {
      range: {
        startIndex: index,
        endIndex: index + GALLERY_TITLE.length + 1
      },
      paragraphStyle: GALLERY_TITLE_STYLE,
      fields: 'alignment,namedStyleType'
    }
  }];
}

function createImageRequest(index, imageUrl, dimensions) {
  return {
    insertInlineImage: {
      location: { index },
      uri: imageUrl,
      objectSize: {
        height: { magnitude: dimensions.height, unit: 'PT' },
        width: { magnitude: dimensions.width, unit: 'PT' }
      }
    }
  };
}

function createSpacingRequest(index, isEndOfRow) {
  return {
    insertText: {
      location: { index },
      text: isEndOfRow ? ROW_SPACING : IMAGE_SPACING
    }
  };
}

function calculateBatchSize(totalImages) {
  // Process images in smaller batches to avoid API limits
  return Math.min(10, Math.ceil(totalImages / 2));
}

module.exports = {
  MAX_IMAGES_PER_ROW,
  IMAGE_SPACING,
  ROW_SPACING,
  DEFAULT_IMAGE_DIMENSIONS,
  createGalleryTitle,
  createImageRequest,
  createSpacingRequest,
  calculateBatchSize
};