const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');

// Moved from appraisal.js
/**
 * Update WordPress post with additional metadata and optionally insert shortcodes
 * POST /update-wordpress
 */
router.post('/update-wordpress', async (req, res) => {
  console.log('[Util Route] Starting WordPress update');
  
  const { postId, acfFields, insertShortcodes, appraisalType } = req.body;
   // --- Input Validation --- 
  if (!postId || typeof postId !== 'string' && typeof postId !== 'number') {
     return res.status(400).json({ 
      success: false, 
      message: 'Malformed request. Missing or invalid required parameter: postId.', 
      usage: {
          method: 'POST',
          endpoint: '/update-wordpress',
          required_body_params: {
            postId: "string | number"
          },
          optional_body_params: {
            acfFields: "object",
            insertShortcodes: "boolean",
            appraisalType: "string (used if insertShortcodes is true and type not in post ACF)"
          },
          example: { 
            postId: "123", 
            acfFields: { "notes": "Updated note." }, 
            insertShortcodes: true,
            appraisalType: "RegularArt"
           }
      },
      error_details: "postId (string or number) is required."
    });
  }
  // Add validation for acfFields if it should be an object?
  if (acfFields && typeof acfFields !== 'object') {
      return res.status(400).json({ 
          success: false, 
          message: 'Malformed request. Invalid type for optional parameter: acfFields.',
          error_details: "Optional parameter 'acfFields' must be an object if provided."
       });
  }
   // --- End Input Validation ---
  
  try {
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
       return res.status(404).json({ 
          success: false, 
          message: 'Post not found or title is missing',
          error_details: `Post with ID ${postId} could not be found or lacks a title.`
       });
    }
    
    console.log(`[Util Route] Updating WordPress post: "${postTitle}"`);
    
    // Update ACF fields from request body
    const updatedFields = {
      ...acfFields,
      last_updated: new Date().toISOString(),
      appraisal_status: acfFields.appraisal_status || 'completed' // Keep status or default to completed
    };
    
    await wordpress.updatePostACFFields(postId, updatedFields);
    
    // Insert shortcodes if requested
    let contentUpdated = false;
    if (req.body.insertShortcodes === true) {
      console.log('[Util Route] Checking/Inserting shortcodes');
      const currentContent = postData.content?.rendered || '';
      let newContent = currentContent;
      const appraisalType = postData.acf?.appraisal_type || req.body.appraisalType || 'RegularArt'; // Use type from post or request
      
      // Add shortcodes idempotently
      if (!newContent.includes('[pdf_download]')) {
        newContent += '\n[pdf_download]';
      }
      if (!newContent.includes('[AppraisalTemplates')) { // Check for opening bracket only
        newContent += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }
      
      if (newContent !== currentContent) {
        console.log('[Util Route] Updating post content with shortcodes');
        // Ensure wordpress.client.updatePost exists or adjust call
         if (wordpress.client && wordpress.client.updatePost) {
            await wordpress.client.updatePost(postId, { content: newContent });
            contentUpdated = true;
         } else {
             console.warn('[Util Route] wordpress.client.updatePost not available.')
         }
      }
    }
    
    console.log('[Util Route] WordPress update complete');
    await wordpress.updatePostMeta(postId, 'processing_history', [{
      step: 'update_wordpress', timestamp: new Date().toISOString(), status: 'completed'
    }]);
    
    return res.json({
      success: true,
      message: 'WordPress post updated successfully',
      details: { postId, title: postTitle, contentUpdated, fieldsUpdated: Object.keys(updatedFields) }
    });

  } catch (error) {
    console.error(`[Util Route] Error updating WordPress for post ${postId}:`, error);
    const statusCode = error.message?.includes('Post not found') ? 404 : 500;
     const userMessage = statusCode === 404 
        ? 'Post not found or title is missing' 
        : 'Error updating WordPress';
        
    res.status(statusCode).json({
      success: false, 
      message: userMessage, 
      error_details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router; 