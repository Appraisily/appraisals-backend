const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pdfService = require('../services/pdf');
const { getPostMetadata, getPostTitle, getPostDate, getImageFieldUrlFromPost, getPostGallery, updatePostACFFields } = require('../services/wordpress');

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
    const clonedDoc = await pdfService.cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);
    await pdfService.moveFileToFolder(clonedDoc.id, GOOGLE_DRIVE_FOLDER_ID);

    // Insert images
    if (mainImageUrl) {
      await pdfService.insertImageAtPlaceholder(clonedDoc.id, 'main_image', mainImageUrl);
    }
    if (signatureImageUrl) {
      await pdfService.insertImageAtPlaceholder(clonedDoc.id, 'signature_image', signatureImageUrl);
    }
    if (ageImageUrl) {
      await pdfService.insertImageAtPlaceholder(clonedDoc.id, 'age_image', ageImageUrl);
    }

    // Process gallery images if present
    if (gallery?.length > 0) {
      for (let i = 0; i < gallery.length; i++) {
        const imageUrl = gallery[i];
        if (imageUrl) {
          await pdfService.insertImageAtPlaceholder(clonedDoc.id, `googlevision${i + 1}`, imageUrl);
        }
      }
    }

    // Export to PDF
    const pdfBuffer = await pdfService.exportToPDF(clonedDoc.id);

    // Generate filename
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;

    // Upload PDF
    const pdfLink = await pdfService.uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    // Update WordPress
    await updatePostACFFields(postId, pdfLink, clonedDoc.link);

    // Return response
    res.json({
      success: true,
      message: 'PDF generated successfully.',
      pdfLink,
      docLink: clonedDoc.link
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