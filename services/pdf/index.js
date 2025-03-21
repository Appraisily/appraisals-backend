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
const { createLogger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const he = require('he');
const wordpress = require('../wordpress');

const logger = createLogger('PDFService');

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

/**
 * Generate a PDF for an appraisal
 * @param {string} postId - WordPress post ID
 * @param {string} sessionId - Session ID for logging
 * @returns {Promise<Object>} - PDF generation result
 */
async function generateAppraisalPdf(postId, sessionId) {
  try {
    logger.info('Initializing Google APIs for PDF generation', sessionId);
    await initializeGoogleApis();

    // Get Google Drive folder ID
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables');
    }

    // Fetch post data from WordPress
    logger.info('Fetching post data from WordPress', sessionId, { postId });
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);

    // Get template ID based on appraisal type
    const appraisalType = postData.acf?.appraisal_type || 'Regular';
    logger.info('Getting template ID for PDF', sessionId, { appraisalType });
    const templateId = await getTemplateIdWrapper(appraisalType);
    
    // Decode HTML entities in title
    const decodedTitle = he.decode(postTitle);
    
    // Create metadata for PDF
    const metadata = {
      customer_name: postData.acf?.customer_name || '',
      customer_email: postData.acf?.customer_email || '',
      appraiser_name: postData.acf?.appraiser_name || 'Appraisily Expert',
      appraisal_value: postData.acf?.appraisal_value || '0',
      appraisal_description: postData.acf?.appraisal_description || '',
      justification_html: postData.acf?.justification_html || '',
      material: postData.acf?.material || '',
      condition: postData.acf?.condition || '',
      age: postData.acf?.age || '',
      origin: postData.acf?.origin || '',
      dimensions: postData.acf?.dimensions || '',
      weight: postData.acf?.weight || '',
      appraisal_title: decodedTitle,
      appraisal_date: postDate,
    };
    
    // Clone the template document
    logger.info('Cloning template document', sessionId, { templateId });
    const clonedDoc = await cloneTemplateWrapper(templateId);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;
    
    // Move to target folder
    logger.info('Moving document to target folder', sessionId, { docId: clonedDocId, folderId });
    await moveFileToFolderWrapper(clonedDocId, folderId);
    
    // Replace placeholders with actual data
    logger.info('Replacing placeholders in document', sessionId, { docId: clonedDocId });
    await replacePlaceholdersInDocumentWrapper(clonedDocId, metadata);
    
    // Adjust title font size
    logger.info('Adjusting title font size', sessionId);
    await adjustTitleFontSizeWrapper(clonedDocId, postTitle);
    
    // Add gallery images
    logger.info('Adding gallery images', sessionId, { imageCount: images.gallery?.length || 0 });
    try {
      if (images.gallery && images.gallery.length > 0) {
        await addGalleryImages(clonedDocId, images.gallery);
      } else {
        logger.warn('No gallery images found', sessionId);
      }
    } catch (error) {
      logger.error('Error adding gallery images', sessionId, error);
      // Continue despite gallery error
    }
    
    // Insert specific images
    if (images.age) {
      logger.info('Inserting age image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'age_image', images.age);
    }
    
    if (images.signature) {
      logger.info('Inserting signature image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'signature_image', images.signature);
    }
    
    if (images.main) {
      logger.info('Inserting main image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'main_image', images.main);
    }
    
    // Export to PDF
    logger.info('Exporting document to PDF', sessionId);
    const pdfBuffer = await exportToPDFWrapper(clonedDocId);
    
    // Generate filename
    const pdfFilename = sessionId 
      ? `${sessionId}.pdf` 
      : `Appraisal_Report_Post_${postId}_${uuidv4()}.pdf`;
    
    // Upload PDF to Drive
    logger.info('Uploading PDF to Drive', sessionId, { filename: pdfFilename });
    const pdfLink = await uploadPDFToDriveWrapper(pdfBuffer, pdfFilename, folderId);
    
    // Update WordPress
    logger.info('Updating WordPress with PDF and Doc links', sessionId);
    await wordpress.updatePostACFFields(postId, pdfLink, clonedDocLink);
    
    logger.info('PDF generation completed successfully', sessionId, { 
      pdfUrl: pdfLink,
      docUrl: clonedDocLink
    });
    
    return {
      success: true,
      pdfUrl: pdfLink,
      pdfId: pdfFilename,
      docUrl: clonedDocLink,
      docId: clonedDocId
    };
  } catch (error) {
    logger.error('Error in PDF generation', sessionId, error);
    throw error;
  }
}

/**
 * Generate a Google Doc for an appraisal
 * @param {string} postId - WordPress post ID
 * @param {string} sessionId - Session ID for logging
 * @returns {Promise<Object>} - Doc generation result
 */
async function generateAppraisalDoc(postId, sessionId) {
  try {
    logger.info('Initializing Google APIs for Doc generation', sessionId);
    await initializeGoogleApis();

    // Get Google Drive folder ID
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables');
    }

    // Fetch post data from WordPress
    logger.info('Fetching post data from WordPress', sessionId, { postId });
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);

    // Get template ID based on appraisal type
    const appraisalType = postData.acf?.appraisal_type || 'Regular';
    logger.info('Getting template ID for Doc', sessionId, { appraisalType });
    const templateId = await getTemplateIdWrapper(appraisalType);
    
    // Decode HTML entities in title
    const decodedTitle = he.decode(postTitle);
    
    // Create metadata for Doc
    const metadata = {
      customer_name: postData.acf?.customer_name || '',
      customer_email: postData.acf?.customer_email || '',
      appraiser_name: postData.acf?.appraiser_name || 'Appraisily Expert',
      appraisal_value: postData.acf?.appraisal_value || '0',
      appraisal_description: postData.acf?.appraisal_description || '',
      justification_html: postData.acf?.justification_html || '',
      material: postData.acf?.material || '',
      condition: postData.acf?.condition || '',
      age: postData.acf?.age || '',
      origin: postData.acf?.origin || '',
      dimensions: postData.acf?.dimensions || '',
      weight: postData.acf?.weight || '',
      appraisal_title: decodedTitle,
      appraisal_date: postDate,
    };
    
    // Clone the template document
    logger.info('Cloning template document', sessionId, { templateId });
    const clonedDoc = await cloneTemplateWrapper(templateId);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;
    
    // Move to target folder
    logger.info('Moving document to target folder', sessionId, { docId: clonedDocId, folderId });
    await moveFileToFolderWrapper(clonedDocId, folderId);
    
    // Replace placeholders with actual data
    logger.info('Replacing placeholders in document', sessionId, { docId: clonedDocId });
    await replacePlaceholdersInDocumentWrapper(clonedDocId, metadata);
    
    // Adjust title font size
    logger.info('Adjusting title font size', sessionId);
    await adjustTitleFontSizeWrapper(clonedDocId, postTitle);
    
    // Add gallery images
    logger.info('Adding gallery images', sessionId, { imageCount: images.gallery?.length || 0 });
    try {
      if (images.gallery && images.gallery.length > 0) {
        await addGalleryImages(clonedDocId, images.gallery);
      } else {
        logger.warn('No gallery images found', sessionId);
      }
    } catch (error) {
      logger.error('Error adding gallery images', sessionId, error);
      // Continue despite gallery error
    }
    
    // Insert specific images
    if (images.age) {
      logger.info('Inserting age image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'age_image', images.age);
    }
    
    if (images.signature) {
      logger.info('Inserting signature image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'signature_image', images.signature);
    }
    
    if (images.main) {
      logger.info('Inserting main image', sessionId);
      await insertImageAtPlaceholderWrapper(clonedDocId, 'main_image', images.main);
    }
    
    // Update WordPress with Doc link
    logger.info('Updating WordPress with Doc link', sessionId);
    await wordpress.updatePostACFField(postId, 'google_doc_link', clonedDocLink);
    
    logger.info('Doc generation completed successfully', sessionId, { 
      docUrl: clonedDocLink
    });
    
    return {
      success: true,
      docUrl: clonedDocLink,
      docId: clonedDocId
    };
  } catch (error) {
    logger.error('Error in Doc generation', sessionId, error);
    throw error;
  }
}

module.exports = {
  initializeGoogleApis,
  addGalleryImages,
  getTemplateId: getTemplateIdWrapper,
  cloneTemplate: cloneTemplateWrapper,
  moveFileToFolder: moveFileToFolderWrapper,
  replacePlaceholdersInDocument: replacePlaceholdersInDocumentWrapper,
  adjustTitleFontSize: adjustTitleFontSizeWrapper,
  insertImageAtPlaceholder: insertImageAtPlaceholderWrapper,
  exportToPDF: exportToPDFWrapper,
  uploadPDFToDrive: uploadPDFToDriveWrapper,
  generateAppraisalPdf,
  generateAppraisalDoc
};