/**
 * Step-by-step PDF generation process implementation
 * This module provides a modular approach to generating PDFs with explicit steps
 */

const { google } = require('googleapis');
const config = require('../../config');
const he = require('he');
const { v4: uuidv4 } = require('uuid');
const wordpress = require('../wordpress');
const { processMetadata } = require('./metadata/processing');
const { 
  cloneTemplate, 
  moveFileToFolder, 
  replacePlaceholdersInDocument, 
  adjustTitleFontSize,
  getTemplateId 
} = require('./documentUtils');
const { insertImageAtPlaceholder } = require('./imageUtils');
const { insertGalleryGrid } = require('./gallery');
const { exportToPDF, uploadPDFToDrive } = require('./exportUtils');

// Step definition constants
const PDF_STEPS = {
  FETCH_POST_DATA: 'STEP_FETCH_POST_DATA',
  PROCESS_METADATA: 'STEP_PROCESS_METADATA',
  GET_TEMPLATE: 'STEP_GET_TEMPLATE',
  CLONE_TEMPLATE: 'STEP_CLONE_TEMPLATE',
  MOVE_TO_FOLDER: 'STEP_MOVE_TO_FOLDER',
  REPLACE_PLACEHOLDERS: 'STEP_REPLACE_PLACEHOLDERS',
  ADJUST_TITLE: 'STEP_ADJUST_TITLE',
  INSERT_MAIN_IMAGE: 'STEP_INSERT_MAIN_IMAGE',
  INSERT_GALLERY: 'STEP_INSERT_GALLERY',
  INSERT_SPECIFIC_IMAGES: 'STEP_INSERT_SPECIFIC_IMAGES',
  EXPORT_PDF: 'STEP_EXPORT_PDF',
  UPLOAD_PDF: 'STEP_UPLOAD_PDF',
  UPDATE_WORDPRESS: 'STEP_UPDATE_WORDPRESS'
};

// The default step order
const DEFAULT_STEP_ORDER = [
  PDF_STEPS.FETCH_POST_DATA,
  PDF_STEPS.PROCESS_METADATA,
  PDF_STEPS.GET_TEMPLATE,
  PDF_STEPS.CLONE_TEMPLATE,
  PDF_STEPS.MOVE_TO_FOLDER,
  PDF_STEPS.REPLACE_PLACEHOLDERS,
  PDF_STEPS.ADJUST_TITLE,
  PDF_STEPS.INSERT_MAIN_IMAGE,
  PDF_STEPS.INSERT_GALLERY,
  PDF_STEPS.INSERT_SPECIFIC_IMAGES,
  PDF_STEPS.EXPORT_PDF,
  PDF_STEPS.UPLOAD_PDF,
  PDF_STEPS.UPDATE_WORDPRESS
];

/**
 * Generate a PDF document in a step-by-step approach
 * @param {number|string} postId - WordPress post ID
 * @param {string} [sessionId] - Optional session ID for filename
 * @param {string} [startStep] - Optional starting step name
 * @param {object} [options] - Additional options for PDF generation
 * @returns {Promise<object>} Result object with links
 */
async function generatePdfStepByStep(postId, sessionId, startStep = PDF_STEPS.FETCH_POST_DATA, options = {}) {
  // Initialize context object to store state between steps
  const context = {
    postId,
    sessionId,
    options,
    logs: []
  };

  try {
    // Add initial context log
    addLog(context, 'info', `Starting PDF generation for post ${postId}`);
    
    // Initialize Google APIs
    await initializeGoogleApis(context);
    
    // Find the starting step index
    const stepOrder = [...DEFAULT_STEP_ORDER];
    const startIndex = stepOrder.indexOf(startStep);
    
    if (startIndex === -1) {
      throw new Error(`Invalid starting step: ${startStep}`);
    }
    
    // Execute steps in sequence starting from the specified step
    for (let i = startIndex; i < stepOrder.length; i++) {
      const currentStep = stepOrder[i];
      addLog(context, 'info', `Executing step: ${currentStep}`);
      
      try {
        await executeStep(context, currentStep);
      } catch (stepError) {
        addLog(context, 'error', `Error in step ${currentStep}: ${stepError.message}`);
        
        // Depending on which step failed, we might need to handle cleanup
        await handleStepError(context, currentStep, stepError);
        
        // Re-throw to stop the process
        throw stepError;
      }
    }
    
    addLog(context, 'info', 'PDF generation completed successfully');
    
    // Return the results
    return {
      success: true,
      pdfLink: context.pdfLink,
      docLink: context.docLink,
      logs: context.logs
    };
  } catch (error) {
    addLog(context, 'error', `PDF generation failed: ${error.message}`);
    
    // Try to record the error in WordPress
    try {
      await wordpress.updateNotes(postId, `PDF generation error: ${error.message}`);
    } catch (notesError) {
      addLog(context, 'error', `Failed to update error notes: ${notesError.message}`);
    }
    
    return {
      success: false,
      error: error.message,
      logs: context.logs
    };
  }
}

/**
 * Initialize Google APIs
 * @param {object} context - The context object
 */
async function initializeGoogleApis(context) {
  try {
    // Skip if already initialized in context
    if (context.docs && context.drive) {
      return;
    }
    
    const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    
    const authClient = await auth.getClient();
    
    context.docs = google.docs({ version: 'v1', auth: authClient });
    context.drive = google.drive({ version: 'v3', auth: authClient });
    
    addLog(context, 'info', 'Google Docs and Drive clients initialized successfully');
  } catch (error) {
    addLog(context, 'error', `Error initializing Google APIs: ${error.message}`);
    throw error;
  }
}

/**
 * Execute a specific step
 * @param {object} context - The context object
 * @param {string} step - The step to execute
 */
async function executeStep(context, step) {
  switch (step) {
    case PDF_STEPS.FETCH_POST_DATA:
      await fetchPostData(context);
      break;
      
    case PDF_STEPS.PROCESS_METADATA:
      await processMetadataStep(context);
      break;
      
    case PDF_STEPS.GET_TEMPLATE:
      await getTemplateStep(context);
      break;
      
    case PDF_STEPS.CLONE_TEMPLATE:
      await cloneTemplateStep(context);
      break;
      
    case PDF_STEPS.MOVE_TO_FOLDER:
      await moveToFolderStep(context);
      break;
      
    case PDF_STEPS.REPLACE_PLACEHOLDERS:
      await replacePlaceholdersStep(context);
      break;
      
    case PDF_STEPS.ADJUST_TITLE:
      await adjustTitleStep(context);
      break;
      
    case PDF_STEPS.INSERT_MAIN_IMAGE:
      await insertMainImageStep(context);
      break;
      
    case PDF_STEPS.INSERT_GALLERY:
      await insertGalleryStep(context);
      break;
      
    case PDF_STEPS.INSERT_SPECIFIC_IMAGES:
      await insertSpecificImagesStep(context);
      break;
      
    case PDF_STEPS.EXPORT_PDF:
      await exportPdfStep(context);
      break;
      
    case PDF_STEPS.UPLOAD_PDF:
      await uploadPdfStep(context);
      break;
      
    case PDF_STEPS.UPDATE_WORDPRESS:
      await updateWordpressStep(context);
      break;
      
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

/**
 * Handle errors that occur during step execution
 * @param {object} context - The context object
 * @param {string} step - The step that failed
 * @param {Error} error - The error that occurred
 */
async function handleStepError(context, step, error) {
  // If we've created a document but failed, try to add an error note to it
  if (context.documentId && context.docs) {
    try {
      addLog(context, 'info', 'Adding error note to document');
      
      await context.docs.documents.batchUpdate({
        documentId: context.documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: `ERROR GENERATING PDF: ${error.message}\n\n`
            }
          }]
        }
      });
      
      addLog(context, 'info', 'Error note added to document');
    } catch (docError) {
      addLog(context, 'error', `Failed to add error note to document: ${docError.message}`);
    }
  }
}

/**
 * Add a log entry to the context
 * @param {object} context - The context object
 * @param {string} level - The log level (info, warn, error)
 * @param {string} message - The log message
 */
function addLog(context, level, message) {
  if (!context.logs) {
    context.logs = [];
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  
  context.logs.push(logEntry);
  
  // Also log to console
  switch (level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    default:
      console.log(message);
  }
}

/**
 * Step implementation: Fetch post data
 * @param {object} context - The context object
 */
async function fetchPostData(context) {
  addLog(context, 'info', `Fetching post data for ${context.postId}`);
  
  const { postData, images, title, date } = await wordpress.fetchPostData(context.postId);
  
  // Store in context
  context.postData = postData;
  context.images = images;
  context.title = title;
  context.date = date;
  
  // Decode HTML entities in title
  context.decodedTitle = title ? he.decode(title) : 'Untitled Appraisal';
  
  addLog(context, 'info', `Post data fetched: ${context.decodedTitle}`);
}

/**
 * Step implementation: Process metadata
 * @param {object} context - The context object
 */
async function processMetadataStep(context) {
  if (!context.postData) {
    throw new Error('Post data not available. Please run FETCH_POST_DATA step first.');
  }
  
  addLog(context, 'info', 'Processing metadata');
  
  const { metadata, validation } = await processMetadata(context.postData);
  
  // Store in context
  context.metadata = metadata;
  context.validation = validation;
  
  // If invalid, log warning but continue with what we have
  if (!validation.isValid) {
    const missingFields = validation.missingFields.join(', ');
    addLog(context, 'warn', `Missing metadata fields: ${missingFields}, but continuing anyway`);
    
    // Add a note to WordPress about the missing fields
    try {
      await wordpress.updateNotes(context.postId, `PDF generation warning: Missing fields: ${missingFields}`);
    } catch (notesError) {
      addLog(context, 'error', `Failed to update notes: ${notesError.message}`);
    }
  }
}

/**
 * Step implementation: Get template ID
 * @param {object} context - The context object
 */
async function getTemplateStep(context) {
  addLog(context, 'info', 'Getting template ID');
  
  // Check for folder ID
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
  }
  
  // Store in context
  context.folderId = folderId;
  
  // Get template ID based on appraisal type (if available in metadata)
  const appraisalType = context.metadata?.appraisalType || 'regular';
  const templateId = await getTemplateId(appraisalType);
  
  // Store in context
  context.templateId = templateId;
  
  addLog(context, 'info', `Using template ID: ${templateId}`);
}

/**
 * Step implementation: Clone template
 * @param {object} context - The context object
 */
async function cloneTemplateStep(context) {
  if (!context.templateId) {
    throw new Error('Template ID not available. Please run GET_TEMPLATE step first.');
  }
  
  addLog(context, 'info', 'Cloning document template');
  
  const clonedDoc = await cloneTemplate(context.drive, context.templateId);
  
  // Store in context
  context.documentId = clonedDoc.id;
  context.docLink = clonedDoc.link;
  
  addLog(context, 'info', `Template cloned successfully: ${context.documentId}`);
}

/**
 * Step implementation: Move to folder
 * @param {object} context - The context object
 */
async function moveToFolderStep(context) {
  if (!context.documentId || !context.folderId) {
    throw new Error('Document ID or folder ID not available.');
  }
  
  addLog(context, 'info', 'Moving document to folder');
  
  await moveFileToFolder(context.drive, context.documentId, context.folderId);
  
  addLog(context, 'info', 'Document moved to folder successfully');
}

/**
 * Step implementation: Replace placeholders
 * @param {object} context - The context object
 */
async function replacePlaceholdersStep(context) {
  if (!context.documentId || !context.metadata) {
    throw new Error('Document ID or metadata not available.');
  }
  
  addLog(context, 'info', 'Replacing placeholders in document');
  
  const data = {
    ...context.metadata,
    appraisal_title: context.decodedTitle,
    appraisal_date: context.date || new Date().toISOString().split('T')[0],
  };
  
  await replacePlaceholdersInDocument(context.docs, context.documentId, data);
  
  addLog(context, 'info', 'Placeholders replaced successfully');
}

/**
 * Step implementation: Adjust title font size
 * @param {object} context - The context object
 */
async function adjustTitleStep(context) {
  if (!context.documentId || !context.title) {
    throw new Error('Document ID or title not available.');
  }
  
  addLog(context, 'info', 'Adjusting title font size');
  
  try {
    await adjustTitleFontSize(context.docs, context.documentId, context.title);
    addLog(context, 'info', 'Title font size adjusted successfully');
  } catch (titleError) {
    addLog(context, 'warn', `Error adjusting title font size: ${titleError.message}`);
    addLog(context, 'warn', 'Continuing despite title adjustment error');
    // Don't throw error - non-critical step
  }
}

/**
 * Step implementation: Insert main image
 * @param {object} context - The context object
 */
async function insertMainImageStep(context) {
  if (!context.documentId || !context.images) {
    throw new Error('Document ID or images not available.');
  }
  
  addLog(context, 'info', 'Inserting main image');
  
  try {
    if (context.images.main) {
      await insertImageAtPlaceholder(context.docs, context.documentId, 'main_image', context.images.main);
      addLog(context, 'info', 'Main image inserted successfully');
    } else {
      addLog(context, 'warn', 'No main image available to insert');
    }
  } catch (error) {
    addLog(context, 'warn', `Error inserting main image: ${error.message}`);
    addLog(context, 'warn', 'Continuing despite image insertion error');
    // Don't throw error - non-critical step
  }
}

/**
 * Step implementation: Insert gallery
 * @param {object} context - The context object
 */
async function insertGalleryStep(context) {
  if (!context.documentId || !context.images) {
    throw new Error('Document ID or images not available.');
  }
  
  addLog(context, 'info', 'Adding gallery images');
  
  try {
    if (context.images.gallery && context.images.gallery.length > 0) {
      await insertGalleryGrid(context.docs, context.documentId, context.images.gallery);
      addLog(context, 'info', `Added ${context.images.gallery.length} gallery images`);
    } else {
      addLog(context, 'warn', 'No gallery images to add');
    }
  } catch (error) {
    addLog(context, 'warn', `Error adding gallery images: ${error.message}`);
    addLog(context, 'warn', 'Continuing with PDF generation despite gallery error');
    // Don't throw error - non-critical step
  }
}

/**
 * Step implementation: Insert specific images
 * @param {object} context - The context object
 */
async function insertSpecificImagesStep(context) {
  if (!context.documentId || !context.images) {
    throw new Error('Document ID or images not available.');
  }
  
  addLog(context, 'info', 'Inserting specific images');
  
  try {
    if (context.images.age) {
      await insertImageAtPlaceholder(context.docs, context.documentId, 'age_image', context.images.age);
      addLog(context, 'info', 'Age image inserted successfully');
    }
    
    if (context.images.signature) {
      await insertImageAtPlaceholder(context.docs, context.documentId, 'signature_image', context.images.signature);
      addLog(context, 'info', 'Signature image inserted successfully');
    }
  } catch (error) {
    addLog(context, 'warn', `Error inserting specific images: ${error.message}`);
    addLog(context, 'warn', 'Continuing despite image insertion error');
    // Don't throw error - non-critical step
  }
}

/**
 * Step implementation: Export PDF
 * @param {object} context - The context object
 */
async function exportPdfStep(context) {
  if (!context.documentId) {
    throw new Error('Document ID not available.');
  }
  
  addLog(context, 'info', 'Exporting document to PDF');
  
  const pdfBuffer = await exportToPDF(context.drive, context.documentId);
  
  // Store in context
  context.pdfBuffer = pdfBuffer;
  
  addLog(context, 'info', `PDF generated successfully, size: ${pdfBuffer.length} bytes`);
}

/**
 * Step implementation: Upload PDF
 * @param {object} context - The context object
 */
async function uploadPdfStep(context) {
  if (!context.pdfBuffer || !context.folderId) {
    throw new Error('PDF buffer or folder ID not available.');
  }
  
  // Generate filename
  const pdfFilename = context.sessionId?.trim()
    ? `${context.sessionId}.pdf`
    : `Appraisal_Report_Post_${context.postId}_${uuidv4()}.pdf`;
  
  addLog(context, 'info', `Uploading PDF to Google Drive with filename: ${pdfFilename}`);
  
  const pdfLink = await uploadPDFToDrive(context.drive, context.pdfBuffer, pdfFilename, context.folderId);
  
  // Store in context
  context.pdfLink = pdfLink;
  context.pdfFilename = pdfFilename;
  
  addLog(context, 'info', 'PDF uploaded successfully');
}

/**
 * Step implementation: Update WordPress
 * @param {object} context - The context object
 */
async function updateWordpressStep(context) {
  if (!context.pdfLink || !context.docLink) {
    throw new Error('PDF link or document link not available.');
  }
  
  addLog(context, 'info', 'Updating WordPress with PDF link');
  
  await wordpress.updatePostACFFields(context.postId, {
    pdf_link: context.pdfLink,
    doc_link: context.docLink
  });
  
  // Add a note about PDF generation
  await wordpress.updateNotes(context.postId, 
    `PDF generated successfully. PDF: ${context.pdfLink}, Doc: ${context.docLink}`
  );
  
  addLog(context, 'info', 'WordPress updated successfully');
}

module.exports = {
  PDF_STEPS,
  generatePdfStepByStep
};