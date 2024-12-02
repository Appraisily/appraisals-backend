const { google } = require('googleapis');
const config = require('../../config');
const { createTable, applyTableStyles, insertTableImages } = require('./tableUtils');
const { insertImageAtPlaceholder } = require('./imageUtils');
const { cloneTemplate, moveFileToFolder, replacePlaceholdersInDocument, adjustTitleFontSize } = require('./documentUtils');
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

    // Create table
    await createTable(docs, documentId, galleryIndex, rows, columns);

    // Get updated document to find table
    const updatedDoc = await docs.documents.get({ documentId });
    
    // Find inserted table
    const tableElement = updatedDoc.data.body.content.find(
      element => element.table && element.startIndex >= galleryIndex
    );

    if (!tableElement) {
      throw new Error('Table not found after insertion');
    }

    // Apply styles to table cells
    await applyTableStyles(docs, documentId, tableElement, rows, columns);

    // Insert images into cells
    const insertedImages = await insertTableImages(docs, documentId, tableElement, gallery, rows, columns);

    console.log(`Added ${insertedImages} images to gallery`);
  } catch (error) {
    console.error('Error adding gallery images:', error);
    throw error;
  }
}

module.exports = {
  initializeGoogleApis,
  cloneTemplate: (...args) => cloneTemplate(drive, ...args),
  moveFileToFolder: (...args) => moveFileToFolder(drive, ...args),
  replacePlaceholdersInDocument: (...args) => replacePlaceholdersInDocument(docs, ...args),
  adjustTitleFontSize: (...args) => adjustTitleFontSize(docs, ...args),
  addGalleryImages,
  insertImageAtPlaceholder: (...args) => insertImageAtPlaceholder(docs, ...args),
  exportToPDF: (...args) => exportToPDF(drive, ...args),
  uploadPDFToDrive: (...args) => uploadPDFToDrive(drive, ...args)
};