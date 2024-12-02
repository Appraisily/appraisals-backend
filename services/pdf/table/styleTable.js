// services/pdf/table/styleTable.js
async function applyTableStyles(docs, documentId, tableElement) {
  const requests = [];
  const tableRows = tableElement.table.tableRows;

  if (!tableRows || tableRows.length === 0) {
    throw new Error('The table has no rows.');
  }

  console.log(`Applying text alignment to table with ${tableRows.length} rows`);

  for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
    const tableRow = tableRows[rowIndex];
    const tableCells = tableRow.tableCells;

    if (!tableCells || tableCells.length === 0) {
      console.warn(`Row ${rowIndex} has no cells.`);
      continue;
    }

    for (let colIndex = 0; colIndex < tableCells.length; colIndex++) {
      const cell = tableCells[colIndex];

      if (cell) {
        // Only apply paragraph alignment
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

        console.log(`Applied text alignment to cell at row ${rowIndex}, column ${colIndex}`);
      } else {
        console.warn(`Cell at row ${rowIndex}, column ${colIndex} is undefined.`);
      }
    }
  }

  if (requests.length > 0) {
    try {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      });
      console.log(`Applied ${requests.length} text alignment updates to table`);
    } catch (error) {
      console.error('Error applying text alignment:', error);
      throw new Error(`Failed to apply text alignment: ${error.message}`);
    }
  }
}

module.exports = { applyTableStyles };
