const path = require('path');
const fs = require('fs').promises;
const wordpress = require('./wordpress/index');
const valuerAgentClient = require('./valuerAgentClient');
const templatesModule = require('../templates'); // Changed from './templates' to '../templates'
const { populateHtmlTemplate } = require('./geminiService'); // Assuming Gemini service exists
const { updateHtmlFields } = require('./wordpress/htmlUpdates');

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
  console.log(`[Regeneration Service] Starting regeneration for Post ID: ${postId}`);
  const { appraisalId } = options;

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

    // --- Step 2: Get Enhanced Statistics from Valuer Agent ---
    console.log('[Regeneration Service] Fetching statistics from valuer-agent');
    let stats;
    try {
      const value = postData.acf?.value;
      let cleanTitle = postTitle;

      // Decode and strip HTML tags from title
      cleanTitle = decodeEntities(cleanTitle).replace(/<[^>]*>?/gm, '');

      console.log(`[Regeneration Service] Search parameters for valuer-agent:`, {
        title: cleanTitle,
        value: value
      });

      const statsResponse = await valuerAgentClient.getEnhancedStatistics(cleanTitle, value);

      if (!statsResponse.success || !statsResponse.statistics) {
        throw new Error(`Valuer-agent returned error or no stats: ${statsResponse.message || 'Unknown error'}`);
      }

      stats = statsResponse.statistics;
      console.log('[Regeneration Service] Statistics fetched successfully');
    } catch (statsError) {
      console.error('[Regeneration Service] Error fetching statistics:', statsError);
      return {
          success: false,
          message: 'Failed to fetch statistics from valuer-agent',
          error: statsError.message
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

    // Assuming populateHtmlTemplate handles the AI call
    const [populatedAnalyticsHtmlRaw, populatedCardHtmlRaw] = await Promise.all([
        populateHtmlTemplate(skeletonHtmlAnalytics, rawDataForAI),
        populateHtmlTemplate(skeletonHtmlCard, rawDataForAI)
    ]);

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