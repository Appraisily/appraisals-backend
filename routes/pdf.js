const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { format } = require('date-fns');
const { getPostMetadata, getPostTitle, getPostDate, getImageFieldUrlFromPost, getPostGallery, updatePostACFFields } = require('../services/wordpress');
const {
  initializeGoogleApis,
  cloneTemplate,
  moveFileToFolder,
  exportDocumentToPDF,
  uploadPDFToDrive,
  insertImageAtPlaceholder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  insertFormattedMetadata,
  addGalleryImages,
  replacePlaceholdersWithImages
} = require('../services/pdf');

router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Get environment variables
    const GOOGLE_DOCS_TEMPLATE_ID = process.env.GOOGLE_DOCS_TEMPLATE_ID;
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!GOOGLE_DOCS_TEMPLATE_ID || !GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('Required environment variables are not set');
    }

    // Get metadata fields
    const metadataKeys = [
      'test', 'ad_copy', 'age_text', 'age1', 'condition',
      'signature1', 'signature2', 'style', 'valuation_method',
      'conclusion1', 'conclusion2', 'authorship', 'table',
      'glossary', 'value'
    ];

    // Get all required data in parallel
    const [
      metadataValues,
      postTitle,
      postDate,
      ageImageUrl,
      signatureImageUrl,
      mainImageUrl,
      gallery
    ] = await Promise.all([
      Promise.all(metadataKeys.map(key => getPostMetadata(postId, key))),
      getPostTitle(postId),
      getPostDate(postId),
      getImageFieldUrlFromPost(postId, 'age'),
      getImageFieldUrlFromPost(postId, 'signature'),
      getImageFieldUrlFromPost(postId, 'main'),
      getPostGallery(postId)
    ]);

    // Process metadata
    const metadata = {};
    metadataKeys.forEach((key, index) => {
      metadata[key] = metadataValues[index];
    });

    // Format value if present
    if (metadata.value) {
      const numericValue = parseFloat(metadata.value);
      metadata.appraisal_value = !isNaN(numericValue) 
        ? numericValue.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })
        : metadata.value;
    } else {
      metadata.appraisal_value = '';
    }

    // Clone template and move to folder
    const clonedDoc = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);
    const { id: docId, link: docLink } = clonedDoc;
    await moveFileToFolder(docId, GOOGLE_DRIVE_FOLDER_ID);

    // Replace content
    const data = {
      ...metadata,
      appraisal_title: postTitle,
      appraisal_date: postDate,
    };
    await replacePlaceholdersInDocument(docId, data);
    await adjustTitleFontSize(docId, postTitle);

    // Insert table if present
    if (metadata.table) {
      await insertFormattedMetadata(docId, 'table', metadata.table);
    }

    // Process gallery
    if (gallery.length > 0) {
      await addGalleryImages(docId, gallery);
      await replacePlaceholdersWithImages(docId, gallery);
    }

    // Insert images
    const imagePromises = [
      insertImageAtPlaceholder(docId, 'main_image', mainImageUrl),
      insertImageAtPlaceholder(docId, 'age_image', ageImageUrl),
      insertImageAtPlaceholder(docId, 'signature_image', signatureImageUrl)
    ];
    await Promise.all(imagePromises);

    // Generate and upload PDF
    const pdfBuffer = await exportDocumentToPDF(docId);
    const pdfFilename = session_ID?.trim() 
      ? `${session_ID}.pdf` 
      : `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    // Update WordPress
    await updatePostACFFields(postId, pdfLink, docLink);

    // Return response
    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfLink,
      docLink
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