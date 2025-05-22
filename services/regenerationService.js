const path = require('path');
const fs = require('fs').promises;
const wordpress = require('./wordpress/index');
const valuerAgentClient = require('./valuerAgentClient');
const templatesModule = require('../templates'); // Changed from './templates' to '../templates'
const { populateHtmlTemplate } = require('./geminiService'); // Assuming Gemini service exists
const { updateHtmlFields } = require('./wordpress/htmlUpdates');
const metadataBatchProcessor = require('./metadataBatchProcessor'); // Add the new metadata batch processor

// Helper function to decode HTML entities (consider moving to a utils file)
const decodeEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#215;/g, 'x')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
};

/**
 * Core logic for regenerating statistics and visualizations for a given post.
 * @param {string|number} postId - The WordPress post ID.
 * @param {number} [newValue] - Optional new value to use for statistics generation.
 * @param {object} [options] - Optional additional options (e.g., appraisalId).
 * @returns {Promise<{success: boolean, message: string, data: object, error?: string}>} - Result object.
 */
async function regenerateStatisticsAndVisualizations(postId, newValue, options = {}) {
  // Allow callers to disable expensive HTML generation if they only need stats
  const { htmlGeneration = true } = options;
  console.log(`[Regeneration Service] Starting regeneration for Post ID: ${postId}`);
  const { appraisalId, statistics: precomputedStatistics } = options;

  try {
    // --- Step 1: Fetch WP Post Data (including title and value) ---
    console.log('[Regeneration Service] Fetching WordPress post data for ID:', postId);
    let postData, images, postTitle;
    try {
      // Fetch combined data (post content, ACF, title, images)
      const fullPostData = await wordpress.fetchPostData(postId);
      if (!fullPostData || !fullPostData.postData || !fullPostData.title) {
          throw new Error('Post not found or essential data (title, acf) missing');
      }
      postData = fullPostData.postData;
      images = fullPostData.images;
      postTitle = fullPostData.title;

      // Apply new value if provided
      if (newValue !== undefined) {
        console.log(`[Regeneration Service] Using new value: ${newValue}`);
        if (!postData.acf) postData.acf = {}; // Ensure acf exists
        postData.acf.value = newValue;
      }

      if (!postData.acf || postData.acf.value === undefined) {
          throw new Error('Post ACF data or value is missing.');
      }

    } catch (wpError) {
      console.error('[Regeneration Service] Error fetching WordPress post:', wpError);
      return {
          success: false,
          message: 'Failed to fetch WordPress post data',
          error: wpError.message
      };
    }
    console.log(`[Regeneration Service] Processing ${postTitle} (ID: ${postId})`);

    // --- Step 2: Get Enhanced Statistics from Valuer Agent (or use precomputed) ---
    let stats;

    if (precomputedStatistics) {
      console.log('[Regeneration Service] Using precomputed statistics supplied via options. Skipping valuer-agent call.');
      stats = precomputedStatistics;
    } else {
      console.log('[Regeneration Service] Fetching statistics from valuer-agent');
      const value = postData.acf?.value;
      
      // Use detailed_title if available, otherwise fall back to postTitle
      let searchTitle = postData.acf?.detailed_title || postTitle;
      let cleanTitle = searchTitle;

      // Decode and strip HTML tags from title
      cleanTitle = decodeEntities(cleanTitle).replace(/<[^>]*>?/gm, '');

      console.log(`[Regeneration Service] Search parameters for valuer-agent:`, {
        title: cleanTitle,
        value: value,
        usingDetailedTitle: !!postData.acf?.detailed_title
      });

      const statsResponse = await valuerAgentClient.getEnhancedStatistics(cleanTitle, value);

      if (!statsResponse.success || !statsResponse.statistics) {
        throw new Error(`Valuer-agent returned error or no stats: ${statsResponse.message || 'Unknown error'}`);
      }

      stats = statsResponse.statistics;
      console.log('[Regeneration Service] Statistics fetched successfully');
      
      // --- New Step: Process All Metadata in a Single Batch ---
      const shouldProcessMetadata = options.metadataProcessing !== false; // default true
      if (shouldProcessMetadata) {
        console.log('[Regeneration Service] Processing all metadata in a single batch');
        try {
          const metadataResult = await metadataBatchProcessor.processBatchMetadata(
            postId,
            postTitle,
            postData,
            images,
            stats
          );
          
          if (!metadataResult.success) {
            console.warn(`[Regeneration Service] Metadata batch processing warning: ${metadataResult.message}`);
            // Continue with HTML generation even if metadata processing had issues
          } else {
            console.log('[Regeneration Service] All metadata fields successfully updated');
            // Update the postData with the new metadata for HTML generation
            if (metadataResult.metadata) {
              // Merge the new metadata with postData.acf for template generation
              postData.acf = { ...postData.acf, ...metadataResult.metadata };
            }
          }
        } catch (metadataError) {
          console.error('[Regeneration Service] Error processing metadata batch:', metadataError);
          // Continue with HTML generation even if metadata processing failed
        }
      } else {
        console.log('[Regeneration Service] metadataProcessing flag set to false – skipping metadata batch processing');
      }
      
    }

    // If caller requested only statistics, return early before heavy HTML work
    if (!htmlGeneration) {
      console.log('[Regeneration Service] htmlGeneration flag set to false – returning statistics only');
      return {
        success: true,
        message: 'Statistics generated successfully',
        data: {
          postId: postId,
          appraisalId: appraisalId || undefined,
          stats
        }
      };
    }

    // --- Step 3: Prepare Data & Read Skeletons ---
    const sanitizedStats = stats; // Use raw stats directly for now

    const appraisalDataForContext = {
      postId,
      title: postTitle,
      featured_image: images?.main?.url || '',
      value: postData.acf?.value,
      creator: postData.acf?.creator,
      object_type: postData.acf?.object_type,
      estimated_age: postData.acf?.estimated_age,
      medium: postData.acf?.medium,
      condition_summary: postData.acf?.condition_summary,
      appraiser_name: postData.acf?.appraiser_name,
      dimensions: postData.acf?.dimensions,
      signed: postData.acf?.signed,
      framed: postData.acf?.framed,
      provenance: postData.acf?.provenance,
      coa: postData.acf?.coa,
      ...postData.acf // Include all other ACF fields
    };

    console.log('[Regeneration Service] Reading skeleton HTML files');
    const skeletonPathAnalytics = path.join(__dirname, '../templates/skeletons/enhanced-analytics.html');
    const skeletonPathCard = path.join(__dirname, '../templates/skeletons/appraisal-card.html');
    const [skeletonHtmlAnalytics, skeletonHtmlCard] = await Promise.all([
        fs.readFile(skeletonPathAnalytics, 'utf8'),
        fs.readFile(skeletonPathCard, 'utf8')
    ]);

    // --- Step 4: Populate Templates ---
    console.log('[Regeneration Service] Populating templates');
    const rawDataForAI = {
      statistics: sanitizedStats,
      appraisal: appraisalDataForContext,
      images,
      metaInfo: {
        currentDate: new Date().toISOString(),
        generationTimestamp: Date.now()
      }
    };

    // Improved error handling and debugging for template population
    console.log('[Regeneration Service] Starting parallel template population with Gemini');
    let populatedAnalyticsHtmlRaw, populatedCardHtmlRaw;
    
    try {
      const [analyticsResult, cardResult] = await Promise.allSettled([
        populateHtmlTemplate(skeletonHtmlAnalytics, rawDataForAI),
        populateHtmlTemplate(skeletonHtmlCard, rawDataForAI)
      ]);

      // Handle enhanced analytics result
      if (analyticsResult.status === 'fulfilled') {
        populatedAnalyticsHtmlRaw = analyticsResult.value;
        console.log('[Regeneration Service] Enhanced analytics template populated successfully');
      } else {
        const analyticsError = analyticsResult.reason;
        console.error('[Regeneration Service] Error populating enhanced-analytics template:', analyticsError);
        console.error('[Regeneration Service] Enhanced analytics template population failed - will use fallback');
        populatedAnalyticsHtmlRaw = `<div class="error-placeholder">Analytics visualization unavailable. Error: ${analyticsError.message}</div>`;
      }
      
      // Handle appraisal card result
      if (cardResult.status === 'fulfilled') {
        populatedCardHtmlRaw = cardResult.value;
        console.log('[Regeneration Service] Appraisal card template populated successfully');
      } else {
        const cardError = cardResult.reason;
        console.error('[Regeneration Service] Error populating appraisal-card template:', cardError);
        console.error('[Regeneration Service] Appraisal card template population failed - will use fallback');
        populatedCardHtmlRaw = `<div class="error-placeholder">Appraisal card visualization unavailable. Error: ${cardError.message}</div>`;
      }

    } catch (templateError) {
      console.error('[Regeneration Service] Unexpected error during template population:', templateError);
      throw new Error(`Unexpected error during regeneration for post ${postId}: ${templateError.message}`);
    }

    // --- Step 5: Embed CSS/JS ---
    console.log('[Regeneration Service] Embedding CSS and JavaScript');
    // Use the raw HTML variables directly - AI handles {{POST_ID}} replacement now
    const completeAnalyticsHtml = templatesModule.embedStylesAndScripts('enhanced-analytics', populatedAnalyticsHtmlRaw);
    const completeCardHtml = templatesModule.embedStylesAndScripts('appraisal-card', populatedCardHtmlRaw);

    // --- Step 6: Save to WordPress ---
    console.log('[Regeneration Service] Saving populated HTML and statistics to WordPress');
    try {
      await updateHtmlFields(postId, {
        enhanced_analytics_html: completeAnalyticsHtml,
        appraisal_card_html: completeCardHtml,
        statistics: JSON.stringify(sanitizedStats) // Save the generated stats
      });

      console.log('[Regeneration Service] WordPress post updated successfully');
      return {
        success: true,
        message: 'Statistics regenerated and visualizations updated successfully',
        data: { // Return data for potential debugging or further use
            postId: postId,
            appraisalId: appraisalId || undefined,
            stats: sanitizedStats,
            enhancedAnalyticsHtml: completeAnalyticsHtml,
            appraisalCardHtml: completeCardHtml
        }
      };
    } catch (updateError) {
      console.error('[Regeneration Service] Error updating WordPress post:', updateError);
      return {
          success: false,
          message: 'Failed to update WordPress post with new HTML and statistics',
          error: updateError.message
      };
    }
  } catch (error) {
    console.error(`[Regeneration Service] Unexpected error during regeneration for post ${postId}:`, error);
    return {
        success: false,
        message: 'An unexpected error occurred during regeneration',
        error: error.message
    };
  }
}

module.exports = {
  regenerateStatisticsAndVisualizations
}; 