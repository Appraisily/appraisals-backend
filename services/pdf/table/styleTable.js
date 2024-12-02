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

      if (cell) {
        // Cell padding and alignment
        requests.push({
          updateTableCellStyle: {
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: tableElement.startIndex },
                rowIndex,
                columnIndex: colIndex
              },
              rowSpan: 1,
              columnSpan: 1
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

        console.log(`Styled cell at row ${rowIndex}, column ${colIndex}`);
      } else {
        console.warn(`Cell at row ${rowIndex}, column ${colIndex} is undefined.`);
      }
    }
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
    console.log(`Applied ${requests.length} style updates to table`);
  }
}

module.exports = { applyTableStyles };