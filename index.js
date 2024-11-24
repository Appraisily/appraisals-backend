// index.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const vision = require('@google-cloud/vision');
const { processMainImageWithGoogleVision } = require('./services/vision');
const { generateContent } = require('./services/openai');
const { updateWordPressMetadata } = require('./services/wordpress');
const config = require('./config');

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

// Initialize Vision client
let visionClient;

async function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: 'civil-forge-403609'
    });
    console.log('Vision client initialized successfully');
  } catch (error) {
    console.error('Error initializing Vision client:', error);
    throw error;
  }
}

async function getPostDetails(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const post = await response.json();
    const images = {
      main: post.acf?.main ? `${config.WORDPRESS_API_URL}/media/${post.acf.main}` : null,
      age: post.acf?.age ? `${config.WORDPRESS_API_URL}/media/${post.acf.age}` : null,
      signature: post.acf?.signature ? `${config.WORDPRESS_API_URL}/media/${post.acf.signature}` : null
    };

    return {
      title: post.title.rendered,
      acf: post.acf || {},
      images
    };
  } catch (error) {
    console.error('Error getting post details:', error);
    throw error;
  }
}

app.post('/complete-appraisal-report', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId es requerido.'
    });
  }

  try {
    // Get post details
    const postDetails = await getPostDetails(postId);
    console.log(`Processing appraisal report for post: ${postDetails.title}`);

    // Process with Google Vision only if gallery is not populated
    if (postDetails.acf._gallery_populated !== '1') {
      try {
        await processMainImageWithGoogleVision(visionClient, postId);
        console.log('Google Vision analysis completed');
      } catch (visionError) {
        console.error('Error in Vision analysis:', visionError);
      }
    } else {
      console.log('Gallery already populated, skipping Vision analysis');
    }

    // Get all prompt files
    const promptsDir = path.join(__dirname, 'prompts');
    const files = await fs.readdir(promptsDir);
    const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');

    // Process each prompt once
    const results = [];
    for (const file of txtFiles) {
      const fieldName = path.basename(file, '.txt');
      console.log(`Processing field: ${fieldName}`);

      try {
        const promptContent = await fs.readFile(path.join(promptsDir, file), 'utf8');
        const generatedContent = await generateContent(
          promptContent,
          postDetails.title,
          postDetails.images
        );
        await updateWordPressMetadata(postId, fieldName, generatedContent);
        results.push({ field: fieldName, status: 'success' });
      } catch (error) {
        console.error(`Error processing ${fieldName}:`, error);
        results.push({
          field: fieldName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Send final response
    res.json({
      success: true,
      message: 'Informe de tasación completado exitosamente.',
      details: {
        postId,
        title: postDetails.title,
        processedFields: results
      }
    });

  } catch (error) {
    console.error('Error en /complete-appraisal-report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completando el informe de tasación.'
    });
  }
});

// Initialize secrets and start server
async function start() {
  try {
    const client = new SecretManagerServiceClient();
    const projectId = 'civil-forge-403609';

    // Load secrets
    const secrets = [
      'WORDPRESS_API_URL',
      'wp_username',
      'wp_app_password',
      'OPENAI_API_KEY',
      'GOOGLE_VISION_CREDENTIALS'
    ];

    for (const secretName of secrets) {
      const [version] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${secretName}/versions/latest`
      });
      config[secretName] = version.payload.data.toString('utf8');
      console.log(`Secret '${secretName}' loaded successfully`);
    }

    // Initialize Vision client
    await initializeVisionClient();

    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();