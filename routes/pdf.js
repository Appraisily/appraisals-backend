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
  uploadPDFToDrive
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
    // Step 1: Initialize Google APIs
    await initializeGoogleApis();

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
    }

    // Fetch all data in a single request
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);

    // Process and validate metadata
    const { metadata, validation } = await processMetadata(postData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Missing required metadata fields: ${validation.missingFields.join(', ')}`,
        validation
      });
    }

    // Get template ID based on appraisal type
    const templateId = await getTemplateId();
    console.log('Using template ID:', templateId);

    // Decode HTML entities in title
    const decodedTitle = he.decode(postTitle);

    // Log all retrieved data
    console.log('Metadata:', metadata);
    console.log('Post title:', decodedTitle);
    console.log('Post date:', postDate);
    console.log('Images:', images);

    // Step 6: Clone template
    const clonedDoc = await cloneTemplate(templateId);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;

    // Step 7: Move to folder
    await moveFileToFolder(clonedDocId, folderId);

    // Step 8: Replace placeholders
    const data = {
      ...metadata,
      appraisal_title: decodedTitle,
      appraisal_date: postDate,
    };
    await replacePlaceholdersInDocument(clonedDocId, data);

    // Step 9: Adjust title font size
    await adjustTitleFontSize(clonedDocId, postTitle);

    // Step 10: Add gallery images
    try {
      await addGalleryImages(clonedDocId, images.gallery);
    } catch (error) {
      console.error('Error adding gallery images:', error);
      console.log('Continuing with PDF generation despite gallery error');
    }

    // Step 11: Insert specific images
    if (images.age) {
      await insertImageAtPlaceholder(clonedDocId, 'age_image', images.age);
    }
    if (images.signature) {
      await insertImageAtPlaceholder(clonedDocId, 'signature_image', images.signature);
    }
    if (images.main) {
      await insertImageAtPlaceholder(clonedDocId, 'main_image', images.main);
    }

    // Step 12: Export to PDF
    const pdfBuffer = await exportToPDF(clonedDocId);

    // Step 13: Generate filename
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Appraisal_Report_Post_${postId}_${uuidv4()}.pdf`;

    // Step 14: Upload PDF
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, folderId);

    // Step 15: Update WordPress
    await wordpress.updatePostACFFields(postId, pdfLink, clonedDocLink);

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