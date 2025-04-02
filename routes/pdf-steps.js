/**
 * Enhanced PDF generation routes with step-by-step processing
 */

const express = require('express');
const router = express.Router();
const { PDF_STEPS, generatePdfStepByStep } = require('../services/pdf/pdf-steps');

/**
 * Generate PDF with step-by-step processing
 * POST /api/pdf/generate-pdf-steps
 */
router.post('/generate-pdf-steps', async (req, res) => {
  const { postId, session_ID, startStep, options } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId is required.'
    });
  }
  
  try {
    // Validate step name if provided
    if (startStep && !Object.values(PDF_STEPS).includes(startStep)) {
      return res.status(400).json({
        success: false,
        message: `Invalid step name: ${startStep}. Valid steps are: ${Object.values(PDF_STEPS).join(', ')}`
      });
    }

    // Log the request
    console.log(`Starting step-by-step PDF generation for post ${postId}${startStep ? ` from step ${startStep}` : ''}`);
    
    // Generate PDF with the requested starting step
    const result = await generatePdfStepByStep(
      postId,
      session_ID,
      startStep || PDF_STEPS.FETCH_POST_DATA,
      options || {}
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'PDF generated successfully.',
        pdfLink: result.pdfLink,
        docLink: result.docLink,
        steps: result.logs.map(log => ({
          time: log.timestamp,
          level: log.level,
          message: log.message
        }))
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Error generating PDF',
        steps: result.logs.map(log => ({
          time: log.timestamp,
          level: log.level,
          message: log.message
        }))
      });
    }
  } catch (error) {
    console.error('Unexpected error in PDF step-by-step generation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unexpected error in PDF generation'
    });
  }
});

/**
 * Get available PDF steps
 * GET /api/pdf/steps
 */
router.get('/steps', (req, res) => {
  res.json({
    success: true,
    steps: Object.values(PDF_STEPS),
    defaultOrder: [
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
    ]
  });
});

module.exports = router;