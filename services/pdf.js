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

// Clone template
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
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
}

// Export to PDF
async function exportDocumentToPDF(documentId) {
  try {
    const response = await drive.files.export({
      fileId: documentId,
      mimeType: 'application/pdf',
    }, {
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

// Upload PDF
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

// Replace placeholders in document
async function replacePlaceholdersInDocument(documentId, data) {
  try {
    const requests = Object.entries(data).map(([key, value]) => ({
      replaceAllText: {
        containsText: {
          text: `{{${key}}}`,
          matchCase: true,
        },
        replaceText: value !== undefined && value !== null ? String(value) : '',
      },
    }));

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
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
      console.warn('Title not found for font size adjustment');
      return;
    }

    const fontSize = titleText.length <= 20 ? 18 : 
                    titleText.length <= 40 ? 16 : 14;

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

// Insert formatted metadata
async function insertFormattedMetadata(documentId, placeholder, tableData) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    let placeholderIndex = -1;
    const placeholderText = `{{${placeholder}}}`;

    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.includes(placeholderText)) {
            placeholderIndex = elem.startIndex;
            break;
          }
        }
      }
      if (placeholderIndex !== -1) break;
    }

    if (placeholderIndex === -1) {
      console.warn(`Placeholder ${placeholderText} not found`);
      return;
    }

    const rows = tableData.split('-')
      .map(item => item.trim())
      .filter(Boolean)
      .map(row => {
        const [key, value] = row.split(':').map(s => s.trim());
        return { key, value };
      });

    const requests = [];

    // Delete placeholder
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: placeholderIndex,
          endIndex: placeholderIndex + placeholderText.length,
        },
      },
    });

    // Insert formatted text
    let currentIndex = placeholderIndex;
    rows.forEach((row, idx) => {
      if (idx > 0) {
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex++;
      }

      if (row.key) {
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: `${row.key}: `,
          },
        });

        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + row.key.length,
            },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });

        currentIndex += row.key.length + 2;
      }

      if (row.value) {
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: row.value,
          },
        });
        currentIndex += row.value.length;
      }
    });

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  } catch (error) {
    console.error('Error inserting formatted metadata:', error);
    throw error;
  }
}

// Add gallery images
async function addGalleryImages(documentId, gallery) {
  try {
    if (!gallery?.length) {
      console.log('No gallery images to add');
      return;
    }

    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    let galleryPlaceholderIndex = -1;
    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.includes('{{gallery}}')) {
            galleryPlaceholderIndex = elem.startIndex;
            break;
          }
        }
      }
      if (galleryPlaceholderIndex !== -1) break;
    }

    if (galleryPlaceholderIndex === -1) {
      console.warn('Gallery placeholder not found');
      return;
    }

    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);

    const requests = [
      {
        deleteContentRange: {
          range: {
            startIndex: galleryPlaceholderIndex,
            endIndex: galleryPlaceholderIndex + '{{gallery}}'.length,
          },
        },
      },
      {
        insertTable: {
          rows,
          columns,
          location: {
            index: galleryPlaceholderIndex,
          },
        },
      },
    ];

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    // Add images to table
    let imageIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (imageIndex < gallery.length) {
          await insertImageAtPlaceholder(documentId, `googlevision${imageIndex + 1}`, gallery[imageIndex]);
          imageIndex++;
        }
      }
    }
  } catch (error) {
    console.error('Error adding gallery images:', error);
    throw error;
  }
}

// Replace gallery placeholders with images
async function replacePlaceholdersWithImages(documentId, gallery) {
  try {
    for (let i = 0; i < gallery.length; i++) {
      const placeholder = `googlevision${i + 1}`;
      const imageUrl = gallery[i];

      if (imageUrl) {
        await insertImageAtPlaceholder(documentId, placeholder, imageUrl);
      }
    }
  } catch (error) {
    console.error('Error replacing gallery placeholders:', error);
    throw error;
  }
}

// Calculate image dimensions
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

// Insert image at placeholder
async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  if (!imageUrl) return;

  try {
    const maxDimensions = {
      main_image: { width: 400, height: 300 },
      signature_image: { width: 200, height: 150 },
      age_image: { width: 300, height: 200 }
    };

    let dimensions = maxDimensions[placeholder] || { width: 200, height: 150 };
    dimensions = await calculateDimensions(imageUrl, dimensions);

    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    const placeholderText = `{{${placeholder}}}`;
    let placeholderIndex = -1;

    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content.includes(placeholderText)) {
            placeholderIndex = elem.startIndex;
            break;
          }
        }
      }
      if (placeholderIndex !== -1) break;
    }

    if (placeholderIndex === -1) {
      console.warn(`Placeholder ${placeholderText} not found`);
      return;
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: placeholderIndex,
                endIndex: placeholderIndex + placeholderText.length,
              },
            },
          },
          {
            insertInlineImage: {
              location: { index: placeholderIndex },
              uri: imageUrl,
              objectSize: {
                height: { magnitude: dimensions.height, unit: 'PT' },
                width: { magnitude: dimensions.width, unit: 'PT' },
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error inserting image:', error);
  }
}

module.exports = {
  initializeGoogleApis,
  cloneTemplate,
  moveFileToFolder,
  exportDocumentToPDF,
  uploadPDFToDrive,
  insertImageAtPlaceholder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  insertFormattedMetadata,
  addGalleryImages,
  replacePlaceholdersWithImages
};