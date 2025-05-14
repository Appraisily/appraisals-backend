/**
 * Service for converting appraisal data to formatted markdown using Gemini 2.5 Pro
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class GeminiDocsService {
  constructor() {
    this.client = null;
    this.model = null;
    this.initialized = false;
    this.templatePath = path.join(__dirname, '../master-template.md');
    this.googleDocsService = null;
  }

  /**
   * Initialize the Gemini Docs service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('[GeminiDocs] Initializing Gemini Docs service...');
      
      // Use config to get the API key
      const apiKey = config.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }
      
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
      
      // Import the documentGenerator from PDF service
      const { exportDocumentAsPdf, createDocumentFromTemplate } = require('./pdf/documentGenerator');
      this.googleDocsService = {
        exportDocumentAsPdf,
        createDocumentFromTemplate
      };
      
      this.initialized = true;
      console.log('[GeminiDocs] Gemini Docs service initialized successfully');
    } catch (error) {
      console.error('[GeminiDocs] Failed to initialize Gemini Docs service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} - Whether the service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get the master template content
   * @returns {Promise<string>} - The template content
   */
  async getTemplate() {
    try {
      return await fs.promises.readFile(this.templatePath, 'utf8');
    } catch (error) {
      console.error('[GeminiDocs] Error reading template file:', error);
      throw error;
    }
  }

  /**
   * Create a formatted prompt for Gemini
   * @param {string} template - The template content
   * @param {Object} data - The appraisal data
   * @returns {string} - The formatted prompt
   */
  createPrompt(template, data) {
    return `
You are a document formatter. Your task is to fill the provided template with the appraisal data.
DO NOT modify, change, or add to the appraisal content - only format it according to the template.

TEMPLATE:
${template}

APPRAISAL DATA:
${JSON.stringify(data, null, 2)}

FORMAT INSTRUCTIONS:
1. Replace each placeholder (e.g. {{placeholder_name}}) with its corresponding value from the data
2. Maintain all markdown formatting in the template
3. If a placeholder has no corresponding data, leave it empty (do not remove it)
4. Do not add any commentary or additional content
5. Return ONLY the filled template with no additional text before or after
`;
  }

  /**
   * Generate a document from WordPress post using Gemini
   * @param {string} postId - The WordPress post ID
   * @param {Object} wordpressService - The WordPress service instance
   * @param {Object} options - Options for conversion
   * @returns {Promise<Object>} - The result with docUrl and optional fileContent
   */
  async generateDocFromWordPressPost(postId, wordpressService, options = {}) {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    try {
      console.log(`[GeminiDocs] Generating Gemini-powered document for WordPress post ${postId}`);
      
      // Get WordPress data with all metadata
      const { postData, images, title } = await wordpressService.fetchPostData(postId);
      
      if (!postData) {
        throw new Error(`Post with ID ${postId} not found`);
      }
      
      // Get the master template
      const template = await this.getTemplate();
      
      // Create the prompt for Gemini
      const prompt = this.createPrompt(template, { 
        postData, 
        images,
        title,
        ...postData.acf // Include all ACF fields
      });
      
      // Call Gemini to fill the template
      console.log('[GeminiDocs] Calling Gemini to fill template with appraisal data');
      const result = await this.model.generateContent(prompt);
      const filledMarkdown = result.response.text();
      
      // Create Google Doc from the filled markdown
      const docTitle = `Appraisal-${postId}-${Date.now()}`;
      console.log('[GeminiDocs] Creating Google Doc from markdown');
      const docId = await this.createGoogleDocFromMarkdown(filledMarkdown, docTitle);
      
      let pdfUrl = null;
      // Export as PDF if requested
      if (options.outputFormat === 'pdf') {
        console.log('[GeminiDocs] Exporting as PDF');
        pdfUrl = await this.exportAsPdf(docId, docTitle);
      }
      
      // Update WordPress with document links
      if (!options.testMode) {
        await this.updateWordPressWithLinks(postId, 
          `https://docs.google.com/document/d/${docId}/edit`, 
          pdfUrl);
      }
      
      return {
        success: true,
        docId,
        docUrl: `https://docs.google.com/document/d/${docId}/edit`,
        pdfUrl,
        testMode: !!options.testMode
      };
    } catch (error) {
      console.error(`[GeminiDocs] Error generating Gemini document for post ${postId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a Google Doc from markdown
   * @param {string} markdown - The markdown content
   * @param {string} filename - The filename
   * @returns {Promise<string>} - The document ID
   */
  async createGoogleDocFromMarkdown(markdown, filename) {
    try {
      // For now, create a simple document with the markdown content
      // In a real implementation, this would use a more sophisticated 
      // markdown-to-Google-Doc conversion
      const document = {
        title: filename,
        content: markdown
      };
      
      // Use the Google Docs API via the existing service
      const documentId = await this.googleDocsService.createDocumentFromTemplate({
        title: filename,
        content: markdown
      });
      
      return documentId;
    } catch (error) {
      console.error('[GeminiDocs] Error creating Google Doc from markdown:', error);
      throw error;
    }
  }
  
  /**
   * Export the document as PDF
   * @param {string} docId - Google Doc ID
   * @param {string} filename - Filename for the PDF
   * @returns {Promise<string>} - The PDF URL
   */
  async exportAsPdf(docId, filename) {
    try {
      // Use existing PDF export functionality from services/pdf
      const pdfUrl = await this.googleDocsService.exportDocumentAsPdf(docId, filename);
      return pdfUrl;
    } catch (error) {
      console.error(`[GeminiDocs] Error exporting document as PDF:`, error);
      throw error;
    }
  }

  /**
   * Update WordPress post with document links
   * @param {string} postId - WordPress post ID
   * @param {string} docUrl - Google Doc URL
   * @param {string} pdfUrl - PDF URL (optional)
   * @returns {Promise<void>}
   */
  async updateWordPressWithLinks(postId, docUrl, pdfUrl = null) {
    try {
      const wordpress = require('./wordpress/index');
      const metaFields = {
        'gemini_doc_url': docUrl
      };
      
      if (pdfUrl) {
        metaFields['gemini_pdf_url'] = pdfUrl;
      }
      
      await wordpress.updatePostMeta(postId, metaFields);
      console.log(`[GeminiDocs] Updated WordPress post ${postId} with document links`);
    } catch (error) {
      console.error(`[GeminiDocs] Error updating WordPress with document links:`, error);
      throw error;
    }
  }
}

module.exports = new GeminiDocsService(); 