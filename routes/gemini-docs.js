/**
 * Routes for Gemini-powered document generation
 */
const express = require('express');
const router = express.Router();
const geminiDocsService = require('../services/gemini-docs');
const wordpress = require('../services/wordpress/index');
const { generatePdf } = require('../services/pdf');

/**
 * Generate a Google Doc using Gemini
 * 
 * @route POST /api/gemini-docs/generate
 * @param {string} postId - WordPress post ID
 * @param {string} format - Output format (docs or pdf)
 * @param {boolean} test - Test mode flag
 */
router.post('/generate', async (req, res) => {
  console.log('[Gemini Docs Route] Received request to generate document');
  
  try {
    const { postId, format = 'docs', test = false } = req.body;
    
    // Input validation
    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: postId',
        usage: {
          method: 'POST',
          endpoint: '/api/gemini-docs/generate',
          required_body_params: {
            postId: "string | number",
            format: "string (optional, 'docs' or 'pdf', defaults to 'docs')",
            test: "boolean (optional, defaults to false)"
          },
          example: {
            postId: "123",
            format: "pdf",
            test: false
          }
        }
      });
    }
    
    console.log(`[Gemini Docs Route] Generating ${format} for post ${postId}, test mode: ${test}`);
    
    // Try Gemini document generation
    try {
      // Generate document using Gemini
      const result = await geminiDocsService.generateDocFromWordPressPost(
        postId, 
        wordpress, 
        { outputFormat: format, testMode: test }
      );
      
      // Return results
      return res.status(200).json({
        success: true,
        message: 'Document generated successfully with Gemini',
        data: {
          documentUrl: result.docUrl,
          pdfUrl: format === 'pdf' ? result.pdfUrl : null,
          testMode: test
        }
      });
    } catch (geminiError) {
      // Log Gemini error
      console.error(`[Gemini Docs Route] Gemini generation failed, falling back to traditional method:`, geminiError.message);
      
      // Only fall back for PDF format
      if (format === 'pdf') {
        console.log('[Gemini Docs Route] Falling back to traditional PDF generation');
        // Fall back to traditional method
        const pdfResult = await generatePdf(postId);
        
        return res.status(200).json({
          success: true,
          message: 'Document generated using traditional method (Gemini fallback)',
          data: {
            pdfUrl: pdfResult.pdfUrl,
            fallback: true,
            error: process.env.NODE_ENV === 'production' ? 'Gemini generation failed' : geminiError.message
          }
        });
      } else {
        // For non-PDF formats, return the error
        throw geminiError;
      }
    }
  } catch (error) {
    console.error(`[Gemini Docs Route] Error generating document:`, error);
    res.status(500).json({
      success: false,
      message: 'Error generating document',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * Generate a Google Doc using Gemini (GET version)
 * 
 * @route GET /api/gemini-docs/generate/:postId
 * @param {string} postId - WordPress post ID
 * @query {string} format - Output format (docs or pdf)
 * @query {boolean} test - Test mode flag
 */
router.get('/generate/:postId', async (req, res) => {
  console.log('[Gemini Docs Route] Received GET request to generate document');
  
  try {
    const { postId } = req.params;
    const format = req.query.format || 'docs';
    const test = req.query.test === 'true';
    
    console.log(`[Gemini Docs Route] Generating ${format} for post ${postId}, test mode: ${test}`);
    
    // Try Gemini document generation
    try {
      // Generate document using Gemini
      const result = await geminiDocsService.generateDocFromWordPressPost(
        postId, 
        wordpress, 
        { outputFormat: format, testMode: test }
      );
      
      // Return results
      return res.status(200).json({
        success: true,
        message: 'Document generated successfully with Gemini',
        data: {
          documentUrl: result.docUrl,
          pdfUrl: format === 'pdf' ? result.pdfUrl : null,
          testMode: test
        }
      });
    } catch (geminiError) {
      // Log Gemini error
      console.error(`[Gemini Docs Route] Gemini generation failed, falling back to traditional method:`, geminiError.message);
      
      // Only fall back for PDF format
      if (format === 'pdf') {
        console.log('[Gemini Docs Route] Falling back to traditional PDF generation');
        // Fall back to traditional method
        const pdfResult = await generatePdf(postId);
        
        return res.status(200).json({
          success: true,
          message: 'Document generated using traditional method (Gemini fallback)',
          data: {
            pdfUrl: pdfResult.pdfUrl,
            fallback: true,
            error: process.env.NODE_ENV === 'production' ? 'Gemini generation failed' : geminiError.message
          }
        });
      } else {
        // For non-PDF formats, return the error
        throw geminiError;
      }
    }
  } catch (error) {
    console.error(`[Gemini Docs Route] Error generating document:`, error);
    res.status(500).json({
      success: false,
      message: 'Error generating document',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

module.exports = router; 