const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { generateContent } = require('../services/openai'); // Requires openai service

// Moved from appraisal.js
/**
 * Enhance description for an appraisal
 * POST /enhance-description
 */
router.post('/enhance-description', async (req, res) => {
  console.log('[Desc Route] Starting description enhancement');
  
  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId is required.' });
  }
  
  try {
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
    if (!postTitle) {
      return res.status(404).json({ success: false, message: 'Post not found or title is missing' });
    }
    
    console.log(`[Desc Route] Enhancing description for: "${postTitle}"`);
    const originalContent = postData.content?.rendered || '';
    
    console.log('[Desc Route] Generating enhanced description with OpenAI');
    const prompt = `
    You are a professional art expert specializing in appraisals. 
    Enhance the following description for "${postTitle}" to make it more detailed, professional and accurate:
    
    Original Description (optional):
    ${originalContent.substring(0, 500)}...
    
    Make it more eloquent and descriptive. Keep the core information intact but add art-specific details.
    Your enhanced description should be appropriate for a formal appraisal document.
    Keep the response under 400 words.
    Focus on the artwork itself based on the title. If original description is provided, use it for context.
    Output ONLY the enhanced description text.
    `;
    
    const enhancedDescription = await generateContent(prompt, postTitle);
    
    // Update WP ACF field
    await wordpress.updatePostACFFields(postId, {
      enhanced_description: enhancedDescription
    });
    
    // Optionally update main post content
    let contentUpdated = false;
    if (req.body.updateContent === true) {
      console.log('[Desc Route] Updating main post content with enhanced description');
      // Assuming wordpress.client exists and has updatePost method
      // Might need adjustment based on actual wordpress service structure
      if (wordpress.client && wordpress.client.updatePost) { 
        await wordpress.client.updatePost(postId, { content: enhancedDescription });
        contentUpdated = true;
      } else {
        console.warn('[Desc Route] wordpress.client.updatePost not available, cannot update main content.');
      }
    }
    
    console.log('[Desc Route] Description enhancement complete');
    await wordpress.updatePostMeta(postId, 'processing_history', [{
        step: 'enhance_description',
        timestamp: new Date().toISOString(),
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'Description enhanced successfully',
      details: {
        postId,
        title: postTitle,
        contentUpdated,
        original_length: originalContent.length,
        enhanced_length: enhancedDescription.length
      }
    });

  } catch (error) {
    console.error('[Desc Route] Error enhancing description:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enhancing description',
      error: error.message
    });
  }
});

module.exports = router; 