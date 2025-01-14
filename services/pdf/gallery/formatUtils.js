const MAX_IMAGES_PER_ROW = 3;
const HORIZONTAL_SPACING = 20; // Points between images horizontally
const VERTICAL_SPACING = 30;   // Points between rows vertically
const GALLERY_TITLE = 'Visual Comparisons: Similar Artworks Identified by Google Vision';
const GALLERY_TITLE_STYLE = {
  alignment: 'CENTER',
  namedStyleType: 'HEADING_3'
};

const DEFAULT_IMAGE_DIMENSIONS = {
  width: 180,  // Slightly smaller to fit 3 columns with spacing
  height: 135  // Maintain aspect ratio
};

function createGalleryTitle(startIndex, endIndex) {
  return [{
    insertText: {
      location: { index: startIndex },
      text: `${GALLERY_TITLE}\n`
    }
  }, {
    updateParagraphStyle: {
      range: {
        startIndex,
        endIndex
      },
      paragraphStyle: GALLERY_TITLE_STYLE,
      fields: 'alignment,namedStyleType'
    }
  }];
}

function createImageRequest(index, imageUrl, dimensions, columnIndex) {
  return {
    insertInlineImage: {
      location: { index },
      uri: imageUrl,
      objectSize: {
        height: { magnitude: dimensions.height, unit: 'PT' },
        width: { magnitude: dimensions.width, unit: 'PT' }
      },
      positioning: {
        leftOffset: { magnitude: columnIndex * (dimensions.width + HORIZONTAL_SPACING), unit: 'PT' },
        topOffset: { magnitude: 0, unit: 'PT' }
      }
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