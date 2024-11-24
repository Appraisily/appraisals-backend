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

    // Find placeholder
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

    // Replace placeholder with image
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

// Other functions from pdfGenerator.js...
// Include all other necessary functions that were in pdfGenerator.js

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