const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const config = require('./config');
const appraisalRouter = require('./routes/appraisal');
const pdfRouter = require('./routes/pdf');
const { initializeGoogleApis } = require('./services/pdf');

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

// Use routers
app.use('/', appraisalRouter);
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

// Initialize and start server
async function startServer() {
  try {
    await loadSecrets();
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