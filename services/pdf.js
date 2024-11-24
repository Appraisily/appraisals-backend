const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const config = require('../config');

// Initialize Google APIs client
let docs;
let drive;

// Function to initialize Google APIs
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

// Function to calculate dimensions preserving aspect ratio
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

// Function to insert image at placeholder
async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  try {
    if (!imageUrl) {
      console.warn(`Invalid image URL for placeholder '{{${placeholder}}}'.`);
      return;
    }

    // Define maximum dimensions for different image types
    const maxDimensions = {
      main_image: { width: 400, height: 300 },
      signature_image: { width: 200, height: 150 },
      age_image: { width: 300, height: 200 }
    };

    // Determine dimensions based on placeholder type
    let dimensions = { width: 200, height: 150 }; // Default
    const placeholderType = placeholder.toLowerCase();
    
    if (placeholderType.includes('main')) {
      dimensions = await calculateDimensions(imageUrl, maxDimensions.main_image);
    } else if (placeholderType.includes('signature')) {
      dimensions = await calculateDimensions(imageUrl, maxDimensions.signature_image);
    } else if (placeholderType.includes('age')) {
      dimensions = await calculateDimensions(imageUrl, maxDimensions.age_image);
    } else {
      dimensions = await calculateDimensions(imageUrl, dimensions);
    }

    await insertImageAtAllPlaceholders(documentId, placeholder, imageUrl, dimensions);
    console.log(`Placeholder '{{${placeholder}}}' replaced with resized image: ${imageUrl}`);
  } catch (error) {
    console.warn(`Warning: Could not insert image for placeholder '{{${placeholder}}}'. Error: ${error.message}`);
  }
}

// Function to insert image at all occurrences of a placeholder
async function insertImageAtAllPlaceholders(documentId, placeholder, imageUrl, dimensions) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    const placeholderFull = `{{${placeholder}}}`;
    const placeholderLength = placeholderFull.length;
    const occurrences = [];

    // Find all placeholder occurrences
    const findAllPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content.includes(placeholderFull)) {
              const textContent = textElement.textRun.content;
              let startIndex = textElement.startIndex;
              let index = textContent.indexOf(placeholderFull);

              while (index !== -1) {
                occurrences.push({
                  startIndex: startIndex + index,
                  endIndex: startIndex + index + placeholderLength
                });
                index = textContent.indexOf(placeholderFull, index + placeholderLength);
              }
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findAllPlaceholders(cell.content);
            }
          }
        }
      }
    };

    findAllPlaceholders(content);

    if (occurrences.length === 0) {
      console.warn(`No occurrences found for placeholder '{{${placeholder}}}'.`);
      return;
    }

    // Sort occurrences in reverse order to avoid index conflicts
    occurrences.sort((a, b) => b.startIndex - a.startIndex);

    // Prepare batch update requests
    const requests = occurrences.flatMap(occ => [
      {
        deleteContentRange: {
          range: {
            startIndex: occ.startIndex,
            endIndex: occ.endIndex,
          },
        },
      },
      {
        insertInlineImage: {
          uri: imageUrl,
          location: {
            index: occ.startIndex,
          },
          objectSize: {
            height: { magnitude: dimensions.height, unit: 'PT' },
            width: { magnitude: dimensions.width, unit: 'PT' },
          },
        },
      }
    ]);

    // Execute batch update
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: { requests },
      });
      console.log(`All occurrences of placeholder '{{${placeholder}}}' replaced with the resized image.`);
    }
  } catch (error) {
    console.error(`Error processing placeholder '{{${placeholder}}}':`, error);
    throw error;
  }
}

// Function to clone template and get document link
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
    console.error('Error cloning Google Docs template:', error);
    throw error;
  }
}

// Function to move file to folder
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

// Function to upload PDF to Drive
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

// Function to export document to PDF
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

// Export all functions
module.exports = {
  initializeGoogleApis,
  insertImageAtPlaceholder,
  cloneTemplate,
  moveFileToFolder,
  uploadPDFToDrive,
  exportToPDF,
  docs: () => docs,
  drive: () => drive
};