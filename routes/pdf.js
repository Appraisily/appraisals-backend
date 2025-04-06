const express = require('express');
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

// Export a function that accepts githubService and returns the router
module.exports = function(githubService) {
  const router = express.Router();

  router.post('/generate-pdf', async (req, res) => {
    const { postId, session_ID } = req.body;

    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: 'postId is required.' 
      });
    }

    console.log(`Starting PDF generation for post ${postId}`);
    let clonedDocId = null;

    try {
      // Step 1: Initialize Google APIs
      await initializeGoogleApis();

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
      }

      // Fetch all data in a single request
      console.log(`Fetching post data for ${postId}`);
      const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);
      console.log(`Post data fetched: ${postTitle}`);

      // Process and validate metadata
      console.log('Processing metadata...');
      const { metadata, validation } = await processMetadata(postData);
      
      // If invalid, log warning but continue with what we have
      if (!validation.isValid) {
        console.warn(`Missing metadata fields: ${validation.missingFields.join(', ')}, but continuing anyway`);
        // Add a note to WordPress about the missing fields
        try {
          await wordpress.updateNotes(postId, `PDF generation warning: Missing fields: ${validation.missingFields.join(', ')}`);
        } catch (notesError) {
          console.error('Failed to update notes:', notesError);
        }
      }

      // Get template ID based on appraisal type
      const templateId = await getTemplateId();
      console.log('Using template ID:', templateId);

      // Decode HTML entities in title
      const decodedTitle = postTitle ? he.decode(postTitle) : 'Untitled Appraisal';

      // Log all retrieved data (limit to avoid console overload)
      console.log('Post title:', decodedTitle);
      console.log('Post date:', postDate || 'No date');
      console.log('Images found:', Object.keys(images || {}).join(', ') || 'None');

      // Step 6: Clone template
      console.log('Cloning document template...');
      const clonedDoc = await cloneTemplate(templateId);
      clonedDocId = clonedDoc.id;
      const clonedDocLink = clonedDoc.link;
      console.log('Template cloned successfully:', clonedDocId);

      // Step 7: Move to folder
      console.log('Moving document to folder...');
      await moveFileToFolder(clonedDocId, folderId);

      // Step 8: Replace placeholders
      console.log('Replacing placeholders in document...');
      const data = {
        ...metadata,
        appraisal_title: decodedTitle,
        appraisal_date: postDate || new Date().toISOString().split('T')[0],
      };
      await replacePlaceholdersInDocument(clonedDocId, data);

      // Step 9: Adjust title font size
      console.log('Adjusting title font size...');
      try {
        await adjustTitleFontSize(clonedDocId, postTitle);
      } catch (titleError) {
        console.error('Error adjusting title font size:', titleError);
        console.log('Continuing despite title adjustment error');
      }

      // Step 10: Add gallery images
      console.log('Adding gallery images...');
      try {
        if (images && images.gallery && images.gallery.length > 0) {
          await addGalleryImages(clonedDocId, images.gallery);
        } else {
          console.log('No gallery images to add');
        }
      } catch (error) {
        console.error('Error adding gallery images:', error);
        console.log('Continuing with PDF generation despite gallery error');
      }

      // Step 11: Insert specific images
      console.log('Inserting specific images...');
      try {
        if (images && images.age) {
          await insertImageAtPlaceholder(clonedDocId, 'age_image', images.age);
        }
        if (images && images.signature) {
          await insertImageAtPlaceholder(clonedDocId, 'signature_image', images.signature);
        }
        if (images && images.main) {
          await insertImageAtPlaceholder(clonedDocId, 'main_image', images.main);
        }
      } catch (imagesError) {
        console.error('Error inserting specific images:', imagesError);
        console.log('Continuing despite image insertion error');
      }

      // Step 12: Export to PDF
      console.log('Exporting document to PDF...');
      const pdfBuffer = await exportToPDF(clonedDocId);
      console.log('PDF generated successfully, size:', pdfBuffer.length);

      // Step 13: Generate filename
      const pdfFilename = session_ID?.trim()
        ? `${session_ID}.pdf`
        : `Appraisal_Report_Post_${postId}_${uuidv4()}.pdf`;
      console.log('PDF filename:', pdfFilename);

      // Step 14: Upload PDF
      console.log('Uploading PDF to Google Drive...');
      const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, folderId);
      console.log('PDF uploaded successfully');

      // Step 15: Update WordPress
      console.log('Updating WordPress with PDF link...');
      await wordpress.updatePostACFFields(postId, pdfLink, clonedDocLink);
      console.log('WordPress updated successfully');

      // Return response
      console.log('PDF generation completed successfully');
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
      try { 
          if (githubService?.createGithubIssue) { // Check if service and function exist
              await githubService.createGithubIssue(error, req); 
          } else {
              console.error("githubService.createGithubIssue not available in PDF route");
          }
      } catch(e){ console.error("Error calling createGithubIssue:", e); } // Add await and basic catch
      
      // Try to record the error in WordPress
      try {
        await wordpress.updateNotes(postId, `PDF generation error: ${error.message}`);
      } catch (notesError) {
        console.error('Failed to update error notes:', notesError);
      }
      
      // If we've created a document but failed, try to add an error note to it
      if (clonedDocId) {
        try {
          console.log('Adding error note to document...');
          const docs = google.docs({ version: 'v1' });
          await docs.documents.batchUpdate({
            documentId: clonedDocId,
            requestBody: {
              requests: [{
                insertText: {
                  location: { index: 1 },
                  text: `ERROR GENERATING PDF: ${error.message}\n\n`
                }
              }]
            }
          });
        } catch (docError) {
          console.error('Failed to add error note to document:', docError);
        }
      }
      
      // Ensure response is sent only once
      if (!res.headersSent) {
          res.status(500).json({
              success: false,
              message: error.message || 'Error generating PDF'
          });
      }
    }
  });

  return router; // Return the configured router
};