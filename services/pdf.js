const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const config = require('../config');

// Initialize Google APIs client
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

// Calculate dimensions preserving aspect ratio
async function calculateDimensions(imageUrl, maxDimensions) {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Failed to fetch image metadata');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    const aspectRatio = maxDimensions.width / maxDimensions.height;
    
    let width = maxDimensions.width;
    let height = maxDimensions.height;

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  } catch (error) {
    console.warn('Error calculating image dimensions:', error);
    return maxDimensions;
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
              findAndReplace(cell.content);
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
    console.error('Error replacing placeholders in Google Docs:', error);
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
              return;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findPlaceholder(cell.content);
              if (placeholderFound) return;
            }
          }
        }
      }
    };

    findPlaceholder(content);

    if (!placeholderFound) {
      console.warn(`Placeholder "{{${placeholder}}}" not found in document.`);
      return;
    }

    // Delete placeholder
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
        ],
      },
    });

    // Parse and format table data
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

    // Insert formatted text
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              text: formattedText,
              location: {
                index: placeholderIndex,
              },
            },
          },
          ...rows.map((row, idx) => {
            const [key, ] = row.split(':').map(s => s.trim());
            if (key) {
              const beforeText = rows.slice(0, idx).join('- ').length + 2;
              const keyStartIndex = placeholderIndex + beforeText + 1;
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

// Clone template
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
    return {
      id: copiedFile.data.id,
      link: copiedFile.data.webViewLink
    };
  } catch (error) {
    console.error('Error cloning template:', error);
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

// Upload PDF to Drive
async function uploadPDFToDrive(pdfBuffer, pdfFilename, folderId) {
  try {
    const fileMetadata = {
      name: pdfFilename,
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

    console.log(`PDF uploaded to Drive with ID: ${file.data.id}`);
    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading PDF to Drive:', error);
    throw error;
  }
}

// Export document to PDF
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

// Adjust title font size
async function adjustTitleFontSize(documentId, titleText) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    let titleRange = null;
    const titleRegex = new RegExp(titleText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    for (const element of content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun && elem.textRun.content.trim().match(titleRegex)) {
            titleRange = {
              startIndex: elem.startIndex,
              endIndex: elem.endIndex,
            };
            break;
          }
        }
      }
      if (titleRange) break;
    }

    if (!titleRange) {
      console.warn('Title not found for font size adjustment.');
      return;
    }

    let fontSize = titleText.length <= 20 ? 18 : titleText.length <= 40 ? 16 : 14;

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

module.exports = {
  initializeGoogleApis,
  replacePlaceholdersInDocument,
  insertFormattedMetadata,
  cloneTemplate,
  moveFileToFolder,
  uploadPDFToDrive,
  exportToPDF,
  adjustTitleFontSize,
  calculateDimensions,
  docs: () => docs,
  drive: () => drive
};