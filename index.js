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
const { processMainImageWithGoogleVision } = require('./services/vision');
const { updateWordPressMetadata } = require('./services/wordpress');

const app = express();

app.use(express.json());

const allowedOrigins = [
  'https://appraisers-frontend-856401495068.us-central1.run.app',
  'https://appraisers-task-queue-856401495068.us-central1.run.app',
  'https://appraisers-backend-856401495068.us-central1.run.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
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
      throw new Error(`Error fetching post: ${response.statusText}`);
    }

    const post = await response.json();
    return {
      title: post.title.rendered,
      acf: post.acf || {},
      images: {
        main: post.acf?.main,
        age: post.acf?.age,
        signature: post.acf?.signature
      }
    };
  } catch (error) {
    console.error('Error getting post details:', error);
    throw error;
  }
}

async function generateContent(prompt, postTitle, images) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: "system",
            content: "You are a professional art expert."
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Title: ${postTitle}` },
              ...(images.main ? [{ type: "image_url", image_url: { url: images.main } }] : []),
              ...(images.age ? [{ type: "image_url", image_url: { url: images.age } }] : []),
              ...(images.signature ? [{ type: "image_url", image_url: { url: images.signature } }] : []),
              { type: "text", text: prompt }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

app.post('/complete-appraisal-report', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId es requerido.',
      details: {
        required: ["postId"],
        received: req.body
      }
    });
  }

  try {
    // Get post details
    const postDetails = await getPostDetails(postId);
    console.log(`Processing appraisal report for post: ${postDetails.title}`);

    // Process with Google Vision
    const visionResults = await processMainImageWithGoogleVision(visionClient, postId);
    console.log('Google Vision analysis completed');

    // Get all prompt files
    const promptsDir = path.join(__dirname, 'prompts');
    const files = await fs.readdir(promptsDir);
    const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');

    // Process each prompt
    const results = [];
    for (const file of txtFiles) {
      try {
        const fieldName = path.basename(file, '.txt');
        console.log(`Processing field: ${fieldName}`);

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
        console.error(`Error processing ${file}:`, error);
        results.push({
          field: path.basename(file, '.txt'),
          status: 'error',
          error: error.message
        });
      }
    }

    // Return detailed response
    res.json({
      success: true,
      message: 'Informe de tasación completado exitosamente.',
      details: {
        postId,
        title: postDetails.title,
        visionAnalysis: visionResults,
        processedFields: results
      }
    });

  } catch (error) {
    console.error('Error en /complete-appraisal-report:', error);
    res.status(500).json({
      success: false,
      message: 'Error completando el informe de tasación.',
      error: error.message,
      details: {
        postId,
        timestamp: new Date().toISOString()
      }
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
});

module.exports = app;