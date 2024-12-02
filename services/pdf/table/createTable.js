const { google } = require('googleapis');

async function createTable(docs, documentId, galleryIndex, rows, columns) {
  console.log(`Creating table with ${rows} rows and ${columns} columns at index ${galleryIndex}`);

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

  // Add delay to ensure table creation is complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get updated document to find table
  const updatedDoc = await docs.documents.get({ documentId });
    
  // Find inserted table
  const tableElement = updatedDoc.data.body.content.find(
    element => element.table && element.startIndex >= galleryIndex
  );

  if (!tableElement) {
    throw new Error('Table not found after insertion');
  }

  console.log('Table created successfully');
  return tableElement;
}

module.exports = { createTable };