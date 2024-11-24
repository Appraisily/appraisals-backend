// index.js
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const vision = require('@google-cloud/vision');
const config = require('./config');
const cors = require('cors');

const { router: pdfRouter, initializeGoogleApis } = require('./pdfGenerator');
const { processMainImageWithGoogleVision, getImageUrl } = require('./services/vision');
const { updateWordPressMetadata } = require('./services/wordpress');
const { generateContent } = require('./services/openai');

const app = express();

app.use(express.json());

// Simplified CORS configuration
app.use(cors({
  origin: '*', // Allow all origins temporarily to debug
  credentials: true
}));

app.use('/', pdfRouter);

const client = new SecretManagerServiceClient();
let visionClient;

async function getSecret(secretName) {
  try {
    const projectId = 'civil-forge-403609';
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name: secretPath });
    const payload = version.payload.data.toString('utf8');
    console.log(`Secreto '${secretName}' obtenido exitosamente.`);
    return payload;
  } catch (error) {
    console.error(`Error obteniendo el secreto '${secretName}':`, error);
    throw new Error(`No se pudo obtener el secreto '${secretName}'.`);
  }
}

async function loadSecrets() {
  try {
    config.WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    config.WORDPRESS_USERNAME = await getSecret('wp_username');
    config.WORDPRESS_APP_PASSWORD = await getSecret('wp_app_password');
    config.OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    config.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');
    config.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    console.log('Todos los secretos han sido cargados exitosamente.');
  } catch (error) {
    console.error('Error cargando los secretos:', error);
    process.exit(1);
  }
}

function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: 'civil-forge-403609',
    });
    console.log('Cliente de Google Vision inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando el cliente de Google Vision:', error);
    process.exit(1);
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
      const errorText = await response.text();
      throw new Error(`Error fetching post: ${errorText}`);
    }

    const post = await response.json();
    const images = {
      main: await getImageUrl(post.acf?.main),
      age: await getImageUrl(post.acf?.age),
      signature: await getImageUrl(post.acf?.signature)
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
        const visionResults = await processMainImageWithGoogleVision(visionClient, postId);
        console.log('Google Vision analysis completed');
      } catch (visionError) {
        console.error('Error in Vision analysis:', visionError);
        // Continue with content generation even if Vision fails
      }
    } else {
      console.log('Gallery already populated, skipping Vision analysis');
    }

    // Get all prompt files
    const promptsDir = path.join(__dirname, 'prompts');
    const files = await fs.readdir(promptsDir);
    const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');

    // Process each prompt
    const results = [];
    for (const file of txtFiles) {
      const fieldName = path.basename(file, '.txt');
      console.log(`Processing field: ${fieldName}`);

      try {
        // Read prompt
        const promptContent = await fs.readFile(path.join(promptsDir, file), 'utf8');
        
        // Generate content
        const generatedContent = await generateContent(
          promptContent,
          postDetails.title,
          postDetails.images
        );

        // Update WordPress
        await updateWordPressMetadata(postId, fieldName, generatedContent);

        results.push({
          field: fieldName,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error processing ${fieldName}:`, error);
        results.push({
          field: fieldName,
          status: 'error',
          error: error.message
        });
        // Continue with next field even if this one fails
      }
    }

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

// Start server
loadSecrets().then(async () => {
  initializeVisionClient();
  await initializeGoogleApis();
  
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;