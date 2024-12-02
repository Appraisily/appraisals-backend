async function applyTableStyles(docs, documentId, tableElement) {
  const requests = [];
  const tableRows = tableElement.table.tableRows;

  if (!tableRows || tableRows.length === 0) {
    throw new Error('The table has no rows.');
  }

  console.log(`Applying styles to table with ${tableRows.length} rows`);

  for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
    const tableRow = tableRows[rowIndex];
    const tableCells = tableRow.tableCells;

    if (!tableCells || tableCells.length === 0) {
      console.warn(`Row ${rowIndex} has no cells.`);
      continue;
    }

    for (let colIndex = 0; colIndex < tableCells.length; colIndex++) {
      const cell = tableCells[colIndex];

      if (cell && cell.startIndex && cell.endIndex) {
        // Cell padding using direct range instead of tableRange
        requests.push({
          updateTableCellStyle: {
            range: {
              startIndex: cell.startIndex,
              endIndex: cell.endIndex
            },
            tableCellStyle: {
              paddingTop: { magnitude: 5, unit: 'PT' },
              paddingBottom: { magnitude: 5, unit: 'PT' },
              paddingLeft: { magnitude: 5, unit: 'PT' },
              paddingRight: { magnitude: 5, unit: 'PT' },
              contentAlignment: 'MIDDLE'
            },
            fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight,contentAlignment'
          }
        });

        // Horizontal text alignment
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

        console.log(`Styled cell at row ${rowIndex}, column ${colIndex} (range: ${cell.startIndex}-${cell.endIndex})`);
      } else {
        console.warn(`Invalid cell at row ${rowIndex}, column ${colIndex}`);
      }
    }
  }

  if (requests.length > 0) {
    try {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      });
      console.log(`Applied ${requests.length} style updates to table`);
    } catch (error) {
      console.error('Error applying table styles:', error);
      throw new Error(`Failed to apply table styles: ${error.message}`);
    }
  }
}

module.exports = { applyTableStyles };