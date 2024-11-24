const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { 
  initializeGoogleApis,
  cloneTemplate,
  moveFileToFolder,
  insertImageAtPlaceholder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  insertFormattedMetadata,
  addGalleryImages,
  replacePlaceholdersWithImages,
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

    // Step 2: Get environment variables
    const GOOGLE_DOCS_TEMPLATE_ID = process.env.GOOGLE_DOCS_TEMPLATE_ID;
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log(`GOOGLE_DOCS_TEMPLATE_ID: '${GOOGLE_DOCS_TEMPLATE_ID}'`);
    console.log(`GOOGLE_DRIVE_FOLDER_ID: '${GOOGLE_DRIVE_FOLDER_ID}'`);

    if (!GOOGLE_DOCS_TEMPLATE_ID || !GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DOCS_TEMPLATE_ID and GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
    }

    // Step 3: Get metadata fields
    const metadataKeys = [
      'test', 'ad_copy', 'age_text', 'age1', 'condition',
      'signature1', 'signature2', 'style', 'valuation_method',
      'conclusion1', 'conclusion2', 'authorship', 'table',
      'glossary', 'value'
    ];

    const metadataPromises = metadataKeys.map(key => getPostMetadata(postId, key));
    const metadataValues = await Promise.all(metadataPromises);

    const metadata = {};
    metadataKeys.forEach((key, index) => {
      metadata[key] = metadataValues[index];
    });

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

    // Step 4: Get title, date, and image URLs
    const [postTitle, postDate, ageImageUrl, signatureImageUrl, mainImageUrl] = await Promise.all([
      getPostTitle(postId),
      getPostDate(postId),
      getImageFieldUrlFromPost(postId, 'age'),
      getImageFieldUrlFromPost(postId, 'signature'),
      getImageFieldUrlFromPost(postId, 'main'),
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
    const clonedDoc = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;

    // Step 7: Move to folder
    await moveFileToFolder(clonedDocId, GOOGLE_DRIVE_FOLDER_ID);

    // Step 8: Replace placeholders
    const data = {
      ...metadata,
      appraisal_title: postTitle,
      appraisal_date: postDate,
    };
    await replacePlaceholdersInDocument(clonedDocId, data);

    // Step 9: Adjust title font size
    await adjustTitleFontSize(clonedDocId, postTitle);

    // Step 10: Insert table metadata
    if (metadata.table) {
      await insertFormattedMetadata(clonedDocId, 'table', metadata.table);
    }

    // Step 11: Add gallery images
    if (gallery.length > 0) {
      await addGalleryImages(clonedDocId, gallery);
    }

    // Step 12: Replace gallery placeholders
    if (gallery.length > 0) {
      await replacePlaceholdersWithImages(clonedDocId, gallery);
    }

    // Step 13: Insert specific images
    if (ageImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'age_image', ageImageUrl);
    }
    if (signatureImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'signature_image', signatureImageUrl);
    }
    if (mainImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'main_image', mainImageUrl);
    }

    // Step 14: Export to PDF
    const pdfBuffer = await exportToPDF(clonedDocId);

    // Step 15: Generate filename
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;

    // Step 16: Upload PDF
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    // Step 17: Update WordPress
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