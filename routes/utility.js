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
  
  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId is required.' });
  }
  
  try {
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
      return res.status(404).json({ success: false, message: 'Post not found or title is missing' });
    }
    
    console.log(`[Util Route] Updating WordPress post: "${postTitle}"`);
    
    // Update ACF fields from request body
    const acfFields = req.body.acfFields || {};
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
    console.error('[Util Route] Error updating WordPress:', error);
    return res.status(500).json({
      success: false, message: 'Error updating WordPress', error: error.message
    });
  }
});

module.exports = router; 