const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPostTitle, getPostImages } = require('../services/wordpress');
const {
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

    // Get post data
    const [postTitle, postImages] = await Promise.all([
      getPostTitle(postId),
      getPostImages(postId)
    ]);

    // Clone template
    const clonedDoc = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);
    const { id: docId, link: docLink } = clonedDoc;

    // Move to folder
    await moveFileToFolder(docId, GOOGLE_DRIVE_FOLDER_ID);

    // Replace placeholders with images
    const imagePromises = [
      insertImageAtPlaceholder(docId, 'main_image', postImages.main),
      insertImageAtPlaceholder(docId, 'age_image', postImages.age),
      insertImageAtPlaceholder(docId, 'signature_image', postImages.signature)
    ];

    await Promise.all(imagePromises);

    // Generate PDF
    const pdfBuffer = await exportDocumentToPDF(docId);

    // Generate filename
    const pdfFilename = session_ID ? 
      `${session_ID}.pdf` : 
      `Informe_Tasacion_${postId}_${uuidv4()}.pdf`;

    // Upload PDF
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    // Return links
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