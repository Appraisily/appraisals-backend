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
    console.log(`Inserting image at placeholder {{${placeholder}}}`);
    
    if (!imageUrl) {
      console.warn(`No image URL provided for placeholder ${placeholder}`);
      return;
    }
    
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
      
      // Insert the image in place of the placeholder
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertInlineImage: {
              location: {
                index: occurrence.startIndex
              },
              uri: imageUrl,
              objectSize: {
                height: {
                  magnitude: 300,
                  unit: 'PT'
                },
                width: {
                  magnitude: 400,
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
  insertImageAtPlaceholder,
  calculateImageDimensions
};