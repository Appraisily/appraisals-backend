const { google } = require('googleapis');

async function createTable(docs, documentId, galleryIndex, rows, columns) {
  const createTableRequest = {
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: {
              startIndex: galleryIndex,
              endIndex: galleryIndex + '{{gallery}}'.length
            }
          }
        },
        {
          insertTable: {
            rows,
            columns,
            location: { index: galleryIndex }
          }
        }
      ]
    }
  };

  await docs.documents.batchUpdate(createTableRequest);
  
  // Wait for table creation
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function applyTableStyles(docs, documentId, tableElement, rows, columns) {
  const requests = [];

  // Add cell styles
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    for (let colIndex = 0; colIndex < columns; colIndex++) {
      const cell = tableElement.table.tableRows[rowIndex]?.tableCells[colIndex];
      
      if (cell) {
        // Update table cell style
        requests.push({
          updateTableCellStyle: {
            tableCellStyle: {
              paddingTop: { magnitude: 5, unit: 'PT' },
              paddingBottom: { magnitude: 5, unit: 'PT' },
              paddingLeft: { magnitude: 5, unit: 'PT' },
              paddingRight: { magnitude: 5, unit: 'PT' }
            },
            tableStartLocation: {
              index: tableElement.startIndex
            },
            rowIndex: rowIndex,
            columnIndex: colIndex,
            fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight'
          }
        });

        // Update paragraph alignment for cell content
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: cell.startIndex,
              endIndex: cell.endIndex
            },
            paragraphStyle: {
              alignment: 'CENTER'
            },
            fields: 'alignment'
          }
        });

        // Update vertical alignment
        requests.push({
          updateTableCellStyle: {
            tableCellStyle: {
              contentAlignment: 'MIDDLE'
            },
            tableStartLocation: {
              index: tableElement.startIndex
            },
            rowIndex: rowIndex,
            columnIndex: colIndex,
            fields: 'contentAlignment'
          }
        });
      }
    }
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }
}

async function insertTableImages(docs, documentId, tableElement, gallery, rows, columns) {
  const requests = [];
  let imageIndex = 0;

  for (let rowIndex = 0; rowIndex < rows && imageIndex < gallery.length; rowIndex++) {
    for (let colIndex = 0; colIndex < columns && imageIndex < gallery.length; colIndex++) {
      const cell = tableElement.table.tableRows[rowIndex]?.tableCells[colIndex];
      const imageUrl = gallery[imageIndex];

      if (imageUrl && cell) {
        requests.push({
          insertInlineImage: {
            location: { index: cell.startIndex + 1 },
            uri: imageUrl,
            objectSize: {
              height: { magnitude: 150, unit: 'PT' },
              width: { magnitude: 150, unit: 'PT' }
            }
          }
        });
      }

      imageIndex++;
    }
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }

  return imageIndex;
}

module.exports = {
  createTable,
  applyTableStyles,
  insertTableImages
};