const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
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
  uploadPDFToDrive
} = require('../services/pdf');
const { 
  getPostMetadata, 
  getPostTitle, 
  getPostDate, 
  getImageFieldUrlFromPost, 
  getPostGallery, 
  updatePostACFFields 
} = require('../services/wordpress');

router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Step 1: Initialize Google APIs
    await initializeGoogleApis();

    // Step 2: Get template ID based on appraisal type
    const appraisalType = await getPostMetadata(postId, 'appraisaltype');
    console.log('Retrieved appraisaltype:', appraisalType);
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const templateId = await getTemplateId(appraisalType);

    console.log(`GOOGLE_DOCS_TEMPLATE_ID: '${templateId}'`);

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
    }

    // Step 3: Get metadata fields
    const metadataKeys = [
      'test', 'ad_copy', 'age_text', 'age1', 'condition',
      'signature1', 'signature2', 'style', 'valuation_method',
      'conclusion1', 'conclusion2', 'authorship', 'table',
      'glossary', 'value'
    ];

    // Get all ACF data in one request
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf,title,date`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post data: ${await response.text()}`);
    }

    const postData = await response.json();
    const acfData = postData.acf || {};

    // Extract metadata from ACF data
    const metadata = metadataKeys.reduce((acc, key) => {
      acc[key] = acfData[key] || '';
      return acc;
    }, {});

    // Format value if present
    if (metadata.value) {
      const numericValue = parseFloat(metadata.value);
      if (!isNaN(numericValue)) {
        metadata.appraisal_value = numericValue.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'USD',
        });
      } else {
        metadata.appraisal_value = metadata.value;
      }
    } else {
      metadata.appraisal_value = '';
    }

    // Extract title and date from response
    const postTitle = postData.title?.rendered || '';
    const postDate = new Date(postData.date).toISOString().split('T')[0];

    // Get image URLs from ACF data
    const [ageImageUrl, signatureImageUrl, mainImageUrl] = await Promise.all([
      acfData.age ? getImageUrl(acfData.age) : null,
      acfData.signature ? getImageUrl(acfData.signature) : null,
      acfData.main ? getImageUrl(acfData.main) : null
    ]);

    // Step 5: Get gallery images
    const gallery = await getPostGallery(postId);

    // Log all retrieved data
    console.log('Metadata:', metadata);
    console.log('Post title:', postTitle);
    console.log('Post date:', postDate);
    console.log('Gallery images:', gallery);
    console.log('Age image URL:', ageImageUrl);
    console.log('Signature image URL:', signatureImageUrl);
    console.log('Main image URL:', mainImageUrl);

    // Step 6: Clone template
    const clonedDoc = await cloneTemplate(templateId);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;

    // Step 7: Move to folder
    await moveFileToFolder(clonedDocId, folderId);

    // Step 8: Replace placeholders
    const data = {
      ...metadata,
      appraisal_title: postTitle,
      appraisal_date: postDate,
    };
    await replacePlaceholdersInDocument(clonedDocId, data);

    // Step 9: Adjust title font size
    await adjustTitleFontSize(clonedDocId, postTitle);

    // Step 10: Add gallery images
    if (gallery.length > 0) {
      await addGalleryImages(clonedDocId, gallery);
    }

    // Step 11: Insert specific images
    if (ageImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'age_image', ageImageUrl);
    }
    if (signatureImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'signature_image', signatureImageUrl);
    }
    if (mainImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'main_image', mainImageUrl);
    }

    // Step 12: Export to PDF
    const pdfBuffer = await exportToPDF(clonedDocId);

    // Step 13: Generate filename
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;

    // Step 14: Upload PDF
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, folderId);

    // Step 15: Update WordPress
    await updatePostACFFields(postId, pdfLink, clonedDocLink);

    // Return response
    console.log('PDF Link:', pdfLink);
    console.log('Doc Link:', clonedDocLink);

    res.json({
      success: true,
      message: 'PDF generated successfully.',
      pdfLink,
      docLink: clonedDocLink
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating PDF'
    });
  }
});

module.exports = router;