const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');
const { createLogger } = require('../services/utils/logger');

const logger = createLogger('AppraisalRoutes');

router.post('/complete-appraisal-report', async (req, res) => {
  const { postId, sessionId } = req.body;

  logger.info('Starting appraisal report generation', sessionId, { postId });

  if (!postId) {
    logger.warn('Missing postId in request', sessionId, { body: req.body });
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    logger.info(`Fetching post data for postId: ${postId}`, sessionId);
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      logger.warn(`Post title not found for postId: ${postId}`, sessionId);
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        details: {
          postId,
          title: null,
          visionAnalysis: null,
        }
      });
    }

    logger.info(`Processing main image with Google Vision for post: ${postId}`, sessionId);
    const mainImage = images.length > 0 ? images[0] : null;
    const visionAnalysis = mainImage 
      ? await processMainImageWithGoogleVision(mainImage.url, sessionId)
      : { error: 'No images found' };

    logger.info(`Generating complete appraisal metadata for post: ${postId}`, sessionId, { 
      imageCount: images.length,
      hasVisionResults: !!visionAnalysis 
    });
    
    const metadata = await processAllMetadata(postData, visionAnalysis, sessionId);
    const justification = await processJustificationMetadata(
      postData.acf.appraisal_value || '0',
      metadata,
      sessionId
    );

    logger.info(`Updating WordPress post with generated metadata: ${postId}`, sessionId);
    
    // Update the post with justification content
    if (justification.status === 'success') {
      logger.info(`Successfully generated justification for post: ${postId}`, sessionId);
      // WordPress ACF updates were already performed in the metadata processing
    } else {
      logger.error(`Failed to generate justification for post: ${postId}`, sessionId, {
        error: justification.error
      });
    }

    logger.info(`Successfully completed appraisal report for post: ${postId}`, sessionId);

    return res.json({
      success: true,
      message: 'Appraisal report completed successfully',
      details: {
        postId,
        title: postTitle,
        metadata,
        justification: {
          status: justification.status,
          error: justification.error
        }
      }
    });

  } catch (error) {
    logger.error(`Error completing appraisal report for post: ${postId}`, sessionId, error);
    return res.status(500).json({
      success: false,
      message: 'Error completing appraisal report',
      error: error.message
    });
  }
});

// Add a new route to fix statistics HTML in existing posts
router.post('/fix-statistics-html', async (req, res) => {
  const { postId, sessionId } = req.body;
  
  logger.info('Attempting to fix statistics HTML for post', sessionId, { postId });
  
  if (!postId) {
    logger.warn('Missing postId in fix-statistics request', sessionId);
    return res.status(400).json({
      success: false,
      message: 'postId is required'
    });
  }
  
  try {
    // Fetch the post data
    logger.info(`Fetching post data for postId: ${postId}`, sessionId);
    const { postData } = await wordpress.fetchPostData(postId);
    
    if (!postData || !postData.acf) {
      logger.warn(`Post data not found for postId: ${postId}`, sessionId);
      return res.status(404).json({
        success: false,
        message: 'Post not found or ACF data missing'
      });
    }
    
    // Get valuer agent data
    const valuerAgentData = postData.acf.valuer_agent_data;
    if (!valuerAgentData) {
      logger.warn(`No valuer agent data found for post: ${postId}`, sessionId);
      return res.status(404).json({
        success: false,
        message: 'No valuer agent data found'
      });
    }
    
    let valuerResponse;
    try {
      valuerResponse = JSON.parse(valuerAgentData);
    } catch (error) {
      logger.error(`Error parsing valuer agent data for post: ${postId}`, sessionId, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse valuer agent data',
        error: error.message
      });
    }
    
    // Extract the necessary data
    const { auctionResults, allSearchResults } = valuerResponse;
    
    if (!auctionResults || !allSearchResults) {
      logger.warn(`Missing required data in valuer agent response for post: ${postId}`, sessionId);
      return res.status(404).json({
        success: false,
        message: 'Missing auction results or search results in valuer agent data'
      });
    }
    
    // Get the appraisal value
    const appraisalValue = parseFloat(postData.acf.appraisal_value || '0');
    
    // Generate statistics data
    logger.info(`Regenerating statistics data for post: ${postId}`, sessionId);
    const { processAllSearchResultsStatistics, generateStatisticsHtml } = require('../services/metadata');
    const statisticsData = processAllSearchResultsStatistics(allSearchResults, appraisalValue);
    
    // Generate statistics HTML
    logger.info(`Regenerating statistics HTML for post: ${postId}`, sessionId);
    const postTitle = postData.title?.rendered || 'Item for Appraisal';
    const statisticsHtml = await generateStatisticsHtml(statisticsData, postTitle, appraisalValue);
    
    // Update the metadata in WordPress
    logger.info(`Updating statistics metadata for post: ${postId}`, sessionId);
    const { updateWordPressMetadata } = require('../services/metadata');
    
    // Store the statistics data
    await updateWordPressMetadata(postId, 'auction_statistics_data', JSON.stringify(statisticsData));
    
    // Store the statistics HTML in multiple places to ensure it's preserved
    await updateWordPressMetadata(postId, 'auction_statistics_html', statisticsHtml);
    await updateWordPressMetadata(postId, 'auction_statistics_html_raw', statisticsHtml);
    
    // Create a separate field with just the statistics content
    await updateWordPressMetadata(postId, 'statistics_content', `
      <div class="statistics-section">
        <h3>Market Analysis</h3>
        ${statisticsHtml}
      </div>
    `);
    
    // Update the justification HTML to include the statistics
    const justificationHtml = postData.acf.justification_html;
    if (justificationHtml) {
      const statisticsSection = `
        <hr>
        <h3>Market Analysis</h3>
        ${statisticsHtml}
      `;
      
      // Check if statistics section already exists
      if (!justificationHtml.includes('Market Analysis')) {
        // Add statistics section
        const updatedJustificationHtml = justificationHtml + statisticsSection;
        await updateWordPressMetadata(postId, 'justification_html', updatedJustificationHtml);
      }
    }
    
    logger.info(`Successfully fixed statistics HTML for post: ${postId}`, sessionId);
    
    return res.json({
      success: true,
      message: 'Statistics HTML fixed successfully',
      statisticsHtml: statisticsHtml ? true : false
    });
    
  } catch (error) {
    logger.error(`Error fixing statistics HTML for post: ${postId}`, sessionId, error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing statistics HTML',
      error: error.message
    });
  }
});

module.exports = router;