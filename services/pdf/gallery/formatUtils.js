const MAX_IMAGES_PER_ROW = 3;
const HORIZONTAL_SPACING = 40; // Points between images horizontally
const VERTICAL_SPACING = 40;   // Points between rows vertically
const GALLERY_TITLE = 'Visual Comparisons: Similar Artworks Identified by Google Vision';
const GALLERY_TITLE_STYLE = {
  alignment: 'CENTER',
  namedStyleType: 'HEADING_3',
  spaceAbove: { magnitude: 20, unit: 'PT' },
  spaceBelow: { magnitude: 20, unit: 'PT' }
};

const DEFAULT_IMAGE_DIMENSIONS = {
  width: 200,  // Increased width for better visibility
  height: 150  // Maintain aspect ratio
};

function createGalleryTitle(startIndex, endIndex) {
  return [{
    insertText: {
      location: { index: startIndex },
      text: `\n\n${GALLERY_TITLE}\n\n`
    }
  }, {
    updateParagraphStyle: {
      range: {
        startIndex,
        endIndex
      },
      paragraphStyle: {
        ...GALLERY_TITLE_STYLE,
        lineSpacing: 150
      },
      fields: 'alignment,namedStyleType,spaceAbove,spaceBelow,lineSpacing'
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
  const horizontalSpacing = '      '; // 6 spaces for horizontal spacing
  const verticalSpacing = '\n\n\n';   // 3 newlines for vertical spacing

  return {
    insertText: {
      location: { index },
      text: isEndOfRow ? verticalSpacing : horizontalSpacing
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