const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const he = require('he');
const wordpress = require('../services/wordpress');
const { processMetadata } = require('../services/pdf/metadata/processing');
const { 
  getTemplateId,
  initializeGoogleApis,
  cloneTemplate,
  moveFileToFolder,
  insertImageAtPlaceholder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  addGalleryImages,
  exportToPDF,
  uploadPDFToDrive,
  generateAppraisalPdf,
  generateAppraisalDoc
} = require('../services/pdf');
const { createLogger } = require('../services/utils/logger');

const logger = createLogger('PDFRoutes');

router.post('/generate', async (req, res) => {
  const { postId, sessionId } = req.body;
  
  logger.info('Received PDF generation request', sessionId, { postId });

  if (!postId) {
    logger.warn('Missing postId in request', sessionId);
    return res.status(400).json({
      success: false,
      message: 'postId is required'
    });
  }

  try {
    logger.info(`Generating PDF for post: ${postId}`, sessionId);
    const pdfResult = await generateAppraisalPdf(postId, sessionId);
    
    logger.info(`PDF generation successful for post: ${postId}`, sessionId, { pdfUrl: pdfResult.pdfUrl });
    
    return res.json({
      success: true,
      message: 'PDF generated successfully',
      data: {
        pdfUrl: pdfResult.pdfUrl,
        pdfId: pdfResult.pdfId
      }
    });
  } catch (error) {
    logger.error(`Error generating PDF for post: ${postId}`, sessionId, error);
    return res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
});

router.post('/generate-doc', async (req, res) => {
  const { postId, sessionId } = req.body;
  
  logger.info('Received Google Doc generation request', sessionId, { postId });

  if (!postId) {
    logger.warn('Missing postId in request', sessionId);
    return res.status(400).json({
      success: false,
      message: 'postId is required'
    });
  }

  try {
    logger.info(`Generating Google Doc for post: ${postId}`, sessionId);
    const docResult = await generateAppraisalDoc(postId, sessionId);
    
    logger.info(`Google Doc generation successful for post: ${postId}`, sessionId, { docUrl: docResult.docUrl });
    
    return res.json({
      success: true,
      message: 'Google Doc generated successfully',
      data: {
        docUrl: docResult.docUrl,
        docId: docResult.docId
      }
    });
  } catch (error) {
    logger.error(`Error generating Google Doc for post: ${postId}`, sessionId, error);
    return res.status(500).json({
      success: false,
      message: 'Error generating Google Doc',
      error: error.message
    });
  }
});

module.exports = router;