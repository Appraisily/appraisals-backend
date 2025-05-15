/**
 * Document Generator Service
 * 
 * This module provides functionality for creating Google Documents from templates
 * and exporting them as PDFs.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

// Initialize Google Docs and Drive APIs
let docs;
let drive;

/**
 * Creates a Google Doc from a template or content
 * @param {Object} options - Options for document creation
 * @param {string} options.title - The document title
 * @param {string} options.content - The markdown content (if no template is used)
 * @param {Object} options.data - Data for template placeholders (if using template)
 * @returns {Promise<string>} - The ID of the created document
 */
async function createDocumentFromTemplate(options) {
  try {
    if (!docs || !drive) {
      await initializeGoogleApis();
    }

    const { title, content } = options;
    
    // Create a new document
    console.log(`[DocumentGenerator] Creating new document: ${title}`);
    const document = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    const documentId = document.data.documentId;
    
    // If content is provided, insert it into the document
    if (content) {
      // For markdown content, we convert to Google Docs format
      // This is a simplified implementation - in production, you'd want to use
      // a proper markdown to Google Docs converter
      await insertMarkdownContent(documentId, content);
    }
    
    // Move the document to the designated folder if configured
    if (config.GOOGLE_DRIVE_FOLDER_ID) {
      await moveToFolder(documentId, config.GOOGLE_DRIVE_FOLDER_ID);
    }
    
    console.log(`[DocumentGenerator] Document created with ID: ${documentId}`);
    return documentId;
  } catch (error) {
    console.error('[DocumentGenerator] Error creating document:', error);
    throw error;
  }
}

/**
 * Insert markdown content into a Google Doc
 * @param {string} documentId - The Google Doc ID
 * @param {string} markdownContent - The markdown content to insert
 */
async function insertMarkdownContent(documentId, markdownContent) {
  try {
    // This is a simple implementation - just inserting the text
    // A full implementation would parse the markdown and convert to Google Docs formatting
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: markdownContent,
            },
          },
        ],
      },
    });
    
    console.log(`[DocumentGenerator] Content inserted into document ${documentId}`);
  } catch (error) {
    console.error('[DocumentGenerator] Error inserting markdown content:', error);
    throw error;
  }
}

/**
 * Move a document to a specific folder in Google Drive
 * @param {string} fileId - The file ID to move
 * @param {string} folderId - The destination folder ID
 */
async function moveToFolder(fileId, folderId) {
  try {
    console.log(`[DocumentGenerator] Moving document ${fileId} to folder ${folderId}`);
    
    // Add the file to the destination folder
    await drive.files.update({
      fileId: fileId,
      addParents: folderId,
      fields: 'id, parents',
    });
    
    console.log(`[DocumentGenerator] Document moved successfully`);
  } catch (error) {
    console.error('[DocumentGenerator] Error moving document to folder:', error);
    throw error;
  }
}

/**
 * Export a Google Doc as PDF
 * @param {string} documentId - The Google Doc ID
 * @param {string} filename - The filename for the PDF
 * @returns {Promise<string>} - The URL of the exported PDF
 */
async function exportDocumentAsPdf(documentId, filename) {
  try {
    if (!drive) {
      await initializeGoogleApis();
    }
    
    console.log(`[DocumentGenerator] Exporting document ${documentId} as PDF`);
    
    // Export the document as PDF
    const response = await drive.files.export({
      fileId: documentId,
      mimeType: 'application/pdf',
    }, { responseType: 'arraybuffer' });
    
    const pdfBuffer = Buffer.from(response.data);
    
    // Upload the PDF to Google Drive
    const pdfFile = await drive.files.create({
      requestBody: {
        name: `${filename}.pdf`,
        mimeType: 'application/pdf',
        parents: config.GOOGLE_DRIVE_FOLDER_ID ? [config.GOOGLE_DRIVE_FOLDER_ID] : [],
      },
      media: {
        mimeType: 'application/pdf',
        body: pdfBuffer,
      },
    });
    
    // Make the PDF publicly accessible
    await drive.permissions.create({
      fileId: pdfFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    // Get the PDF URL
    const pdfMetadata = await drive.files.get({
      fileId: pdfFile.data.id,
      fields: 'webViewLink',
    });
    
    console.log(`[DocumentGenerator] PDF exported successfully: ${pdfMetadata.data.webViewLink}`);
    return pdfMetadata.data.webViewLink;
  } catch (error) {
    console.error('[DocumentGenerator] Error exporting document as PDF:', error);
    throw error;
  }
}

/**
 * Initialize Google Docs and Drive APIs
 */
async function initializeGoogleApis() {
  try {
    if (!config.GOOGLE_DOCS_CREDENTIALS) {
      throw new Error('Google Docs credentials not configured');
    }
    
    const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    
    const authClient = await auth.getClient();
    
    docs = google.docs({ version: 'v1', auth: authClient });
    drive = google.drive({ version: 'v3', auth: authClient });
    
    console.log('[DocumentGenerator] Google Docs and Drive APIs initialized');
  } catch (error) {
    console.error('[DocumentGenerator] Error initializing Google APIs:', error);
    throw error;
  }
}

module.exports = {
  createDocumentFromTemplate,
  exportDocumentAsPdf,
  initializeGoogleApis,
}; 