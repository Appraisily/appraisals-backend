async function insertTableImages(docs, documentId, tableElement, gallery) {
  const requests = [];
  let imageIndex = 0;
  const tableRows = tableElement.table.tableRows;

  console.log(`Inserting ${gallery.length} images into table`);

  for (let rowIndex = 0; rowIndex < tableRows.length && imageIndex < gallery.length; rowIndex++) {
    const tableRow = tableRows[rowIndex];
    const tableCells = tableRow.tableCells;

    if (!tableCells || tableCells.length === 0) {
      console.warn(`Row ${rowIndex} has no cells.`);
      continue;
    }

    for (let colIndex = 0; colIndex < tableCells.length && imageIndex < gallery.length; colIndex++) {
      const cell = tableCells[colIndex];
      const imageUrl = gallery[imageIndex];

      if (cell && imageUrl) {
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
        console.log(`Added image ${imageIndex + 1} to cell at row ${rowIndex}, column ${colIndex}`);
      } else {
        console.warn(`Skipping cell at row ${rowIndex}, column ${colIndex} due to missing cell or image.`);
      }

      imageIndex++;
    }
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
    console.log(`Inserted ${requests.length} images into table`);
  }

  return imageIndex;
}

module.exports = { insertTableImages };