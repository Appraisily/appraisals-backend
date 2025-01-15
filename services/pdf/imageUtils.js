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
      buffer
    };
  } catch (error) {
    console.warn(`Error calculating image dimensions for ${url}:`, error.message);
    return null;
  }
}

async function insertImageAtPlaceholder(docs, documentId, placeholder, imageUrl) {
  try {
    if (!imageUrl) {
      console.warn(`No image URL provided for placeholder {{${placeholder}_image}}`);
      return;
    }

    const imageData = await calculateImageDimensions(imageUrl);
    if (!imageData) {
      console.warn(`Failed to process image for placeholder {{${placeholder}_image}}`);
      return;
    }

    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const placeholderFull = `{{${placeholder}_image}}`;
    let occurrences = [];

    const findPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content) {
              let content = elem.textRun.content;
              let position = 0;
              
              while (true) {
                const index = content.indexOf(placeholderFull, position);
                if (index === -1) break;
                
                occurrences.push({
                  startIndex: elem.startIndex + index,
                  endIndex: elem.startIndex + index + placeholderFull.length,
                  element: elem
                });
                
                position = index + placeholderFull.length;
              }
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (cell.content) {
                findPlaceholders(cell.content);
              }
            }
          }
        }
      }
    };

    findPlaceholders(content);

    if (occurrences.length === 0) {
      console.warn(`No occurrences found for placeholder {{${placeholder}_image}}`);
      return;
    }

    console.log(`Found ${occurrences.length} occurrences of {{${placeholder}_image}}`);

    const requests = [];
    // Sort occurrences by startIndex in descending order
    occurrences.sort((a, b) => b.startIndex - a.startIndex);

    for (const occurrence of occurrences) {
      // First delete the placeholder text
      requests.push(
        {
          deleteContentRange: {
            range: {
              startIndex: occurrence.startIndex,
              endIndex: occurrence.endIndex
            }
          }
        },
        // Then insert the image at the same position
        {
          insertInlineImage: {
            location: {
              index: occurrence.startIndex
            },
            uri: imageUrl, 
            objectSize: {
              height: { magnitude: imageData.height, unit: 'PT' },
              width: { magnitude: imageData.width, unit: 'PT' }
            }
          }
        }
      );
    }

    // Execute requests in batches of 10 to avoid rate limits
    for (let i = 0; i < requests.length; i += 10) {
      const batchRequests = requests.slice(i, i + 10);
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: { requests: batchRequests }
        });
        console.log(`Processed batch ${Math.floor(i/10) + 1} of ${Math.ceil(requests.length/10)}`);
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i/10) + 1}:`, error);
        throw error;
      }
    }

    console.log(`Replaced ${occurrences.length} occurrence(s) of {{${placeholder}_image}} with image`);
  } catch (error) {
    console.error(`Error inserting image for placeholder {{${placeholder}_image}}:`, error);
  }
}

module.exports = {
  insertImageAtPlaceholder,
  calculateImageDimensions
};