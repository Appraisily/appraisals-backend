// index.js
const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const vision = require('@google-cloud/vision');
const config = require('./config');
const { processMainImageWithGoogleVision } = require('./services/vision');
const { generateContent } = require('./services/openai');
const { updateWordPressMetadata } = require('./services/wordpress');
const { router: pdfRouter, initializeGoogleApis } = require('./pdfGenerator');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://appraisers-frontend-856401495068.us-central1.run.app',
    'https://appraisers-task-queue-856401495068.us-central1.run.app',
    'https://appraisers-backend-856401495068.us-central1.run.app'
  ],
  credentials: true
}));

// Use PDF router
app.use('/', pdfRouter);

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Load secrets
async function loadSecrets() {
  try {
    config.WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    config.WORDPRESS_USERNAME = await getSecret('wp_username');
    config.WORDPRESS_APP_PASSWORD = await getSecret('wp_app_password');
    config.OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    config.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');
    config.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    console.log('All secrets loaded successfully.');
  } catch (error) {
    console.error('Error loading secrets:', error);
    process.exit(1);
  }
}

// Get secret from Secret Manager
async function getSecret(secretName) {
  try {
    const projectId = 'civil-forge-403609';
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await secretClient.accessSecretVersion({ name: secretPath });
    return version.payload.data.toString('utf8');
  } catch (error) {
    console.error(`Error getting secret '${secretName}':`, error);
    throw error;
  }
}

// Initialize Vision client
let visionClient;
function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: 'civil-forge-403609'
    });
    console.log('Google Vision client initialized successfully.');
  } catch (error) {
    console.error('Error initializing Vision client:', error);
    process.exit(1);
  }
}

// Get prompt from file
async function getPrompt(custom_post_type_name) {
  const promptsDir = path.join(__dirname, 'prompts');
  const promptFilePath = path.join(promptsDir, `${custom_post_type_name}.txt`);
  try {
    return await fs.readFile(promptFilePath, 'utf8');
  } catch (error) {
    console.error(`Error reading prompt file for ${custom_post_type_name}:`, error);
    throw error;
  }
}

// Complete appraisal report endpoint
app.post('/complete-appraisal-report', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId is required.' });
  }

  try {
    console.log(`Processing appraisal report for post: ${postId}`);

    // Process Google Vision analysis
    const visionResult = await processMainImageWithGoogleVision(visionClient, postId);
    
    if (!visionResult.success) {
      console.log('Gallery already populated, skipping Vision analysis');
    }

    // Get list of prompt files
    const promptsDir = path.join(__dirname, 'prompts');
    const files = await fs.readdir(promptsDir);
    const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');

    // Process each prompt file
    for (const file of txtFiles) {
      const fieldName = path.basename(file, '.txt');
      console.log(`Processing field: ${fieldName}`);

      try {
        const prompt = await getPrompt(fieldName);
        const content = await generateContent(prompt, postId);
        await updateWordPressMetadata(postId, fieldName, content);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    res.json({
      success: true,
      message: 'Appraisal report completed successfully.',
      details: {
        postId,
        visionAnalysis: visionResult
      }
    });
  } catch (error) {
    console.error('Error in /complete-appraisal-report:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error completing appraisal report.'
    });
  }
});

// Initialize and start server
async function startServer() {
  try {
    await loadSecrets();
    initializeVisionClient();
    await initializeGoogleApis();

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();