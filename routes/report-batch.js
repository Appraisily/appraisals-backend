const express = require('express');
const router = express.Router();

const wordpress = require('../services/wordpress/index');
const { processMainImageWithGoogleVision, initializeVisionClient } = require('../services/vision');
const metadataService = require('../services/metadata');
const { regenerateStatisticsAndVisualizations } = require('../services/regenerationService');

// POST /complete-appraisal-report-batch
// Accepts { postIds: [id1, id2, ... ] }
router.post('/complete-appraisal-report-batch', async (req, res) => {
  const { postIds: rawIds, detailedDescription } = req.body;

  // Validate input
  let ids = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds;
  } else if (typeof rawIds === 'string') {
    ids = rawIds.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: 'postIds array (or comma-separated string) is required.' });
  }

  const summary = [];

  for (const id of ids) {
    const single = { postId: id, success: false, steps: [] };
    try {
      // Fetch post data first
      const { postData, images, title } = await wordpress.fetchPostData(id);
      single.title = title;
      if (!title) throw new Error('Title not found');

      const value = postData?.acf?.value;
      if (value === undefined) throw new Error('ACF value missing');

      // STEP 1 – basic Vision (optional / skip errors)
      try {
        await initializeVisionClient();
        await processMainImageWithGoogleVision(id);
        single.steps.push({ step: 'vision', success: true });
      } catch (e) {
        single.steps.push({ step: 'vision', success: false, error: e.message });
      }

      // STEP 2 – statistics (no html)
      const statsResult = await regenerateStatisticsAndVisualizations(id, value, { metadataProcessing: false, htmlGeneration: false });
      if (!statsResult.success) throw new Error(statsResult.message || 'Stats generation failed');
      const statistics = statsResult.data.stats;
      single.steps.push({ step: 'statistics', success: true });

      // STEP 3 – metadata batch
      try {
        await metadataService.processBatchMetadata(id, title, postData, images, statistics);
        single.steps.push({ step: 'metadata', success: true });
      } catch (metaErr) {
        single.steps.push({ step: 'metadata', success: false, error: metaErr.message });
      }

      // STEP 4 – HTML visualizations (reuse statistics)
      const vizResult = await regenerateStatisticsAndVisualizations(id, value, { metadataProcessing: false, statistics });
      if (!vizResult.success) throw new Error(vizResult.message || 'Visualization generation failed');
      single.steps.push({ step: 'html', success: true });

      single.success = true;
    } catch (err) {
      single.error = err.message;
    }
    summary.push(single);
  }

  const overallSuccess = summary.every(s => s.success);
  res.status(overallSuccess ? 200 : 207).json({ success: overallSuccess, results: summary });
});

module.exports = router; 