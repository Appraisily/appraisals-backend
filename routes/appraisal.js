const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

// All specific routes moved to report.js, visualization.js, description.js, utility.js

// Route /html-content removed as its logic is likely covered by visualization routes
// router.post('/html-content', async (req, res) => { ... });

// This router might be empty now or contain other non-appraisal routes.
// If empty, it could be removed entirely from index.js.

module.exports = router;