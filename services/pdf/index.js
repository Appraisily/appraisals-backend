const { google } = require('googleapis');
const config = require('../../config');
const { insertGalleryGrid } = require('./gallery');
const { insertImageAtPlaceholder } = require('./imageUtils');
const { 
  cloneTemplate: cloneTemplateBase, 
  moveFileToFolder, 
  replacePlaceholdersInDocument, 
  adjustTitleFontSize,
  getTemplateId: getTemplateIdBase 
} = require('./documentUtils');
const { exportToPDF, uploadPDFToDrive } = require('./exportUtils');

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
        }
      }
      return false;
    };

    findGalleryPlaceholder(content);

    if (galleryIndex === -1) {
      console.warn('Gallery placeholder not found');
      return;
    }

    // Insert gallery grid
    try {
      await insertGalleryGrid(docs, documentId, galleryIndex, gallery);
    } catch (error) {
      console.error('Error in gallery grid insertion:', error);
      // Try to add a message instead
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              insertText: {
                location: { index: galleryIndex },
                text: 'Similar images section could not be generated.'
              }
            }]
          }
        });
      } catch (fallbackError) {
        console.error('Error adding fallback message:', fallbackError);
      }
    }
    console.log('Gallery insertion complete');
  } catch (error) {
    console.error('Error adding gallery images:', error);
    // Don't throw the error, let the process continue
  }
}

// Wrapper functions that provide initialized clients
async function getTemplateIdWrapper(appraisalType) {
  return getTemplateIdBase(appraisalType);
}

async function cloneTemplateWrapper(templateId) {
  return cloneTemplateBase(drive, templateId);
}

function moveFileToFolderWrapper(fileId, folderId) {
  return moveFileToFolder(drive, fileId, folderId);
}

function replacePlaceholdersInDocumentWrapper(documentId, data) {
  return replacePlaceholdersInDocument(docs, documentId, data);
}

function adjustTitleFontSizeWrapper(documentId, titleText) {
  return adjustTitleFontSize(docs, documentId, titleText);
}

function insertImageAtPlaceholderWrapper(documentId, placeholder, imageUrl) {
  // Remove _image suffix if present in placeholder name
  const cleanPlaceholder = placeholder.replace(/_image$/, '');
  return insertImageAtPlaceholder(docs, documentId, cleanPlaceholder, imageUrl);
}

function exportToPDFWrapper(documentId) {
  return exportToPDF(drive, documentId);
}

function uploadPDFToDriveWrapper(pdfBuffer, filename, folderId) {
  return uploadPDFToDrive(drive, pdfBuffer, filename, folderId);
}

module.exports = {
  initializeGoogleApis,
  cloneTemplate: cloneTemplateWrapper,
  getTemplateId: getTemplateIdWrapper,
  moveFileToFolder: moveFileToFolderWrapper,
  replacePlaceholdersInDocument: replacePlaceholdersInDocumentWrapper,
  adjustTitleFontSize: adjustTitleFontSizeWrapper,
  insertImageAtPlaceholder: insertImageAtPlaceholderWrapper,
  addGalleryImages,
  exportToPDF: exportToPDFWrapper,
  uploadPDFToDrive: uploadPDFToDriveWrapper
};