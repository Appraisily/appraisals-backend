const { google } = require('googleapis');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

let docs;
let drive;

// Initialize Google APIs
async function initializeGoogleApis() {
  try {
    const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const authClient = await auth.getClient();

    docs = google.docs({ version: 'v1', auth: authClient });
    drive = google.drive({ version: 'v3', auth: authClient });

    console.log('Google Docs and Drive clients initialized successfully.');
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
}

// Insert image at placeholder
async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  try {
    if (!imageUrl) {
      console.warn(`No image URL provided for placeholder {{${placeholder}}}`);
      return;
    }

    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const placeholderFull = `{{${placeholder}}}`;
    const occurrences = [];

    const findPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes(placeholderFull)) {
              const startIndex = elem.startIndex + elem.textRun.content.indexOf(placeholderFull);
              occurrences.push({
                startIndex,
                endIndex: startIndex + placeholderFull.length
              });
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
      console.warn(`No occurrences found for placeholder {{${placeholder}}}`);
      return;
    }

    const requests = [];
    for (const occurrence of occurrences) {
      requests.push(
        {
          deleteContentRange: {
            range: {
              startIndex: occurrence.startIndex,
              endIndex: occurrence.endIndex
            }
          }
        },
        {
          insertInlineImage: {
            location: {
              index: occurrence.startIndex
            },
            uri: imageUrl,
            objectSize: {
              height: { magnitude: 150, unit: 'PT' },
              width: { magnitude: 150, unit: 'PT' }
            }
          }
        }
      );
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    console.log(`Replaced ${occurrences.length} occurrences of {{${placeholder}}} with image`);
  } catch (error) {
    console.error(`Error inserting image for placeholder {{${placeholder}}}:`, error);
    throw error;
  }
}

// Add gallery images
async function addGalleryImages(documentId, gallery) {
  try {
    console.log('Starting gallery image insertion:', gallery.length, 'images');
    
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let galleryIndex = -1;

    // Find gallery placeholder
    const findGalleryPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes('{{gallery}}')) {
              galleryIndex = elem.startIndex;
              return true;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (cell.content && findGalleryPlaceholder(cell.content)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    findGalleryPlaceholder(content);

    if (galleryIndex === -1) {
      console.warn('Gallery placeholder not found');
      return;
    }

    // Calculate table dimensions
    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);
    console.log(`Creating table with ${rows} rows and ${columns} columns`);

    // Create table and apply initial styling
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

    // Get updated document to find table
    const updatedDoc = await docs.documents.get({ documentId });
    
    // Find inserted table
    const tableElement = updatedDoc.data.body.content.find(
      element => element.table && element.startIndex >= galleryIndex
    );

    if (!tableElement) {
      throw new Error('Table not found after insertion');
    }

    // Prepare style requests for table cells
    const styleRequests = [];

    // Add cell padding and alignment styles
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < columns; colIndex++) {
        styleRequests.push({
          updateTableCellStyle: {
            tableCellStyle: {
              paddingTop: { magnitude: 5, unit: 'PT' },
              paddingBottom: { magnitude: 5, unit: 'PT' },
              paddingLeft: { magnitude: 5, unit: 'PT' },
              paddingRight: { magnitude: 5, unit: 'PT' },
              contentAlignment: 'MIDDLE'
            },
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: tableElement.startIndex },
                rowIndex,
                columnIndex: colIndex
              }
            },
            fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight,contentAlignment'
          }
        });

        // Add paragraph alignment for horizontal centering
        const cell = tableElement.table.tableRows[rowIndex].tableCells[colIndex];
        styleRequests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: 'CENTER'
            },
            range: {
              startIndex: cell.startIndex,
              endIndex: cell.endIndex
            },
            fields: 'alignment'
          }
        });
      }
    }

    // Apply styles
    if (styleRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: styleRequests }
      });
    }

    // Insert images into cells
    const imageRequests = [];
    let imageIndex = 0;

    for (let rowIndex = 0; rowIndex < rows && imageIndex < gallery.length; rowIndex++) {
      for (let colIndex = 0; colIndex < columns && imageIndex < gallery.length; colIndex++) {
        const cell = tableElement.table.tableRows[rowIndex].tableCells[colIndex];
        const imageUrl = gallery[imageIndex];

        if (imageUrl && cell) {
          imageRequests.push({
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

    // Execute image insertion if we have any images
    if (imageRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: imageRequests }
      });
    }

    console.log(`Added ${imageIndex} images to gallery`);
  } catch (error) {
    console.error('Error adding gallery images:', error);
    throw error;
  }
}

// Clone template document
async function cloneTemplate(templateId) {
  try {
    const sanitizedTemplateId = templateId.trim();
    console.log(`Cloning template with ID: '${sanitizedTemplateId}'`);

    const copiedFile = await drive.files.copy({
      fileId: sanitizedTemplateId,
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    console.log(`Template cloned with ID: ${copiedFile.data.id}`);
    return { id: copiedFile.data.id, link: copiedFile.data.webViewLink };
  } catch (error) {
    console.error('Error cloning Google Docs template:', error);
    throw error;
  }
}

// Move file to folder
async function moveFileToFolder(fileId, folderId) {
  try {
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents',
      supportsAllDrives: true,
    });

    const previousParents = file.data.parents.join(',');

    await drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      supportsAllDrives: true,
      fields: 'id, parents',
    });

    console.log(`File ${fileId} moved to folder ${folderId}`);
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
}

// Replace placeholders in document
async function replacePlaceholdersInDocument(documentId, data) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const requests = [];

    const findAndReplace = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              for (const [key, value] of Object.entries(data)) {
                const placeholder = `{{${key}}}`;
                if (textElement.textRun.content.includes(placeholder)) {
                  requests.push({
                    replaceAllText: {
                      containsText: {
                        text: placeholder,
                        matchCase: true,
                      },
                      replaceText: value !== undefined && value !== null ? String(value) : '',
                    },
                  });
                }
              }
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (cell.content) {
                findAndReplace(cell.content);
              }
            }
          }
        }
      }
    };

    findAndReplace(content);

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests,
        },
      });
      console.log(`Placeholders replaced in document ID: ${documentId}`);
    } else {
      console.log('No placeholders found to replace.');
    }
  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw error;
  }
}

// Adjust title font size
async function adjustTitleFontSize(documentId, titleText) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let titleRange = null;

    const titleRegex = new RegExp(titleText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const findTitleInElements = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun && elem.textRun.content.trim().match(titleRegex)) {
              titleRange = {
                startIndex: elem.startIndex,
                endIndex: elem.endIndex,
              };
              return true;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (findTitleInElements(cell.content)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    findTitleInElements(content);

    if (!titleRange) {
      console.warn('Title not found for font size adjustment.');
      return;
    }

    let fontSize;
    if (titleText.length <= 20) {
      fontSize = 18;
    } else if (titleText.length <= 40) {
      fontSize = 16;
    } else {
      fontSize = 14;
    }

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [{
          updateTextStyle: {
            range: titleRange,
            textStyle: {
              fontSize: {
                magnitude: fontSize,
                unit: 'PT',
              },
            },
            fields: 'fontSize',
          },
        }],
      },
    });

    console.log(`Title font size adjusted to ${fontSize}pt`);
  } catch (error) {
    console.error('Error adjusting title font size:', error);
    throw error;
  }
}

// Insert formatted metadata
async function insertFormattedMetadata(documentId, placeholder, tableData) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let placeholderFound = false;
    let placeholderIndex = -1;

    const findPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun && elem.textRun.content.includes(`{{${placeholder}}}`)) {
              placeholderFound = true;
              placeholderIndex = elem.startIndex;
              return true;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (cell.content && findPlaceholder(cell.content)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    findPlaceholder(content);

    if (!placeholderFound) {
      console.warn(`Placeholder "{{${placeholder}}}" not found in document.`);
      return;
    }

    const rows = tableData.split('-').map(item => item.trim()).filter(item => item);
    const formattedText = rows.map(row => {
      const [key, value] = row.split(':').map(s => s.trim());
      if (key && value) {
        return `**${key}:** ${value}`;
      } else if (key) {
        return `**${key}:**`;
      } else {
        return value;
      }
    }).join('\n');

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: placeholderIndex,
                endIndex: placeholderIndex + `{{${placeholder}}}`.length,
              },
            },
          },
          {
            insertText: {
              text: formattedText,
              location: {
                index: placeholderIndex,
              },
            },
          },
          ...rows.map((row, idx) => {
            const [key] = row.split(':').map(s => s.trim());
            if (key) {
              const beforeText = rows.slice(0, idx).join('\n').length;
              const keyStartIndex = placeholderIndex + beforeText + (idx > 0 ? 1 : 0);
              return {
                updateTextStyle: {
                  range: {
                    startIndex: keyStartIndex,
                    endIndex: keyStartIndex + key.length + 1,
                  },
                  textStyle: {
                    bold: true,
                  },
                  fields: 'bold',
                },
              };
            }
            return null;
          }).filter(req => req !== null)
        ],
      },
    });
  } catch (error) {
    console.error('Error inserting formatted metadata:', error);
    throw error;
  }
}

// Export to PDF
async function exportToPDF(documentId) {
  try {
    const response = await drive.files.export(
      {
        fileId: documentId,
        mimeType: 'application/pdf',
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

// Upload PDF to Drive
async function uploadPDFToDrive(pdfBuffer, filename, folderId) {
  try {
    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: 'application/pdf',
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

module.exports = {
  initializeGoogleApis,
  cloneTemplate,
  moveFileToFolder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  insertFormattedMetadata,
  addGalleryImages,
  insertImageAtPlaceholder,
  exportToPDF,
  uploadPDFToDrive
};