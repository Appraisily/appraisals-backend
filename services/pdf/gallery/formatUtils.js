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

function createImageRequest(index, imageUrl, dimensions, columnIndex = 0) {
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
      text: isEndOfRow ? '\n\n' : '   ' // Three spaces for horizontal spacing, double newline for row end
    }
  };
}

function calculateBatchSize(totalImages) {
  return Math.min(10, Math.ceil(totalImages / 2));
}

module.exports = {
  MAX_IMAGES_PER_ROW,
  HORIZONTAL_SPACING,
  VERTICAL_SPACING,
  GALLERY_TITLE,
  GALLERY_TITLE_STYLE,
  DEFAULT_IMAGE_DIMENSIONS,
  createGalleryTitle,
  createImageRequest,
  createSpacingRequest,
  calculateBatchSize
};