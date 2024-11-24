const { google } = require('googleapis');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

let docs;
let drive;

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
      console.log('Placeholders replaced in document ID:', documentId);
    }
  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw error;
  }
}

async function insertFormattedMetadata(documentId, placeholder, tableData) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let placeholderIndex = -1;

    const findPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes(`{{${placeholder}}}`)) {
              placeholderIndex = elem.startIndex;
              return;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findPlaceholder(cell.content);
            }
          }
        }
      }
    };

    findPlaceholder(content);

    if (placeholderIndex === -1) {
      console.warn(`Placeholder "{{${placeholder}}}" not found in document.`);
      return;
    }

    const rows = tableData.split('-').map(item => item.trim()).filter(item => item);
    const formattedText = rows.map(row => {
      const [key, value] = row.split(':').map(s => s.trim());
      return key && value ? `**${key}:** ${value}` : key ? `**${key}:**` : value;
    }).join('\n');

    const requests = [
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
          location: { index: placeholderIndex },
        },
      },
      ...rows.map((row, idx) => {
        const [key] = row.split(':').map(s => s.trim());
        if (!key) return null;
        
        const beforeText = rows.slice(0, idx).join('- ').length + 2;
        const keyStartIndex = placeholderIndex + beforeText + 1;
        
        return {
          updateTextStyle: {
            range: {
              startIndex: keyStartIndex,
              endIndex: keyStartIndex + key.length + 1,
            },
            textStyle: { bold: true },
            fields: 'bold',
          },
        };
      }).filter(Boolean)
    ];

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  } catch (error) {
    console.error('Error inserting formatted metadata:', error);
    throw error;
  }
}

async function adjustTitleFontSize(documentId, titleText) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let titleRange = null;

    const titleRegex = new RegExp(titleText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.trim().match(titleRegex)) {
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

    const fontSize = titleText.length <= 20 ? 18 : titleText.length <= 40 ? 16 : 14;

    await docs.documents.batchUpdate({
      documentId,
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
  } catch (error) {
    console.error('Error adjusting title font size:', error);
    throw error;
  }
}

async function addGalleryImages(documentId, gallery) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let galleryIndex = -1;

    const findGalleryPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes('{{gallery}}')) {
              galleryIndex = elem.startIndex;
              return;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findGalleryPlaceholder(cell.content);
            }
          }
        }
      }
    };

    findGalleryPlaceholder(content);

    if (galleryIndex === -1) {
      console.warn('Gallery placeholder not found.');
      return;
    }

    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);

    const requests = [
      {
        deleteContentRange: {
          range: {
            startIndex: galleryIndex,
            endIndex: galleryIndex + '{{gallery}}'.length,
          },
        },
      },
      {
        insertTable: {
          rows,
          columns,
          location: { index: galleryIndex },
        },
      },
    ];

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    // Add placeholders for images
    const updatedDoc = await docs.documents.get({ documentId });
    const tableElement = updatedDoc.data.body.content.find(
      element => element.table && element.startIndex >= galleryIndex
    );

    if (!tableElement) {
      console.warn('Gallery table not found after creation.');
      return;
    }

    let imageIndex = 1;
    const placeholderRequests = [];

    for (const row of tableElement.table.tableRows) {
      for (const cell of row.tableCells) {
        if (imageIndex <= gallery.length) {
          placeholderRequests.push({
            insertText: {
              text: `{{googlevision${imageIndex}}}`,
              location: { index: cell.endIndex - 1 },
            },
          });
          imageIndex++;
        }
      }
    }

    if (placeholderRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: placeholderRequests },
      });
    }
  } catch (error) {
    console.error('Error adding gallery images:', error);
    throw error;
  }
}

async function replacePlaceholdersWithImages(documentId, gallery) {
  try {
    for (let i = 0; i < gallery.length; i++) {
      const placeholder = `googlevision${i + 1}`;
      const imageUrl = gallery[i];

      if (imageUrl) {
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' });
          if (response.ok) {
            await insertImageAtPlaceholder(documentId, placeholder, imageUrl);
          } else {
            console.warn(`Image not accessible: ${imageUrl}`);
          }
        } catch (error) {
          console.warn(`Error checking image: ${imageUrl}`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error replacing image placeholders:', error);
    throw error;
  }
}

async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  try {
    const maxDimensions = {
      main_image: { width: 400, height: 300 },
      signature_image: { width: 200, height: 150 },
      age_image: { width: 300, height: 200 },
      default: { width: 150, height: 150 }
    };

    const dimensions = await calculateDimensions(
      imageUrl,
      maxDimensions[placeholder] || maxDimensions.default
    );

    await insertImageAtAllPlaceholders(documentId, placeholder, imageUrl, dimensions);
  } catch (error) {
    console.warn(`Error inserting image for ${placeholder}:`, error);
  }
}

async function insertImageAtAllPlaceholders(documentId, placeholder, imageUrl, dimensions) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const placeholderText = `{{${placeholder}}}`;
    const requests = [];

    const findPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes(placeholderText)) {
              const startIndex = elem.startIndex + elem.textRun.content.indexOf(placeholderText);
              requests.push(
                {
                  deleteContentRange: {
                    range: {
                      startIndex,
                      endIndex: startIndex + placeholderText.length,
                    },
                  },
                },
                {
                  insertInlineImage: {
                    uri: imageUrl,
                    location: { index: startIndex },
                    objectSize: {
                      height: { magnitude: dimensions.height, unit: 'PT' },
                      width: { magnitude: dimensions.width, unit: 'PT' },
                    },
                  },
                }
              );
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findPlaceholders(cell.content);
            }
          }
        }
      }
    };

    findPlaceholders(content);

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
    }
  } catch (error) {
    console.error('Error inserting images:', error);
    throw error;
  }
}

async function cloneTemplate(templateId) {
  try {
    const copiedFile = await drive.files.copy({
      fileId: templateId.trim(),
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    return {
      id: copiedFile.data.id,
      link: copiedFile.data.webViewLink
    };
  } catch (error) {
    console.error('Error cloning template:', error);
    throw error;
  }
}

async function moveFileToFolder(fileId, folderId) {
  try {
    const file = await drive.files.get({
      fileId,
      fields: 'parents',
      supportsAllDrives: true,
    });

    await drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: file.data.parents.join(','),
      supportsAllDrives: true,
      fields: 'id, parents',
    });
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
}

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

async function uploadPDFToDrive(pdfBuffer, filename, folderId) {
  try {
    const file = await drive.files.create({
      resource: {
        name: filename,
        parents: [folderId],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(pdfBuffer),
      },
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
  replacePlaceholdersInDocument,
  insertFormattedMetadata,
  adjustTitleFontSize,
  addGalleryImages,
  replacePlaceholdersWithImages,
  insertImageAtPlaceholder,
  cloneTemplate,
  moveFileToFolder,
  exportToPDF,
  uploadPDFToDrive,
  calculateDimensions,
};