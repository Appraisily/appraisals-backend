const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const config = require('./config');
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

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Load secrets
async function loadSecrets() {
  try {
    // Load secrets into process.env
    process.env.WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    process.env.wp_username = await getSecret('wp_username');
    process.env.wp_app_password = await getSecret('wp_app_password');
    process.env.OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    process.env.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');
    process.env.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    
    // Load SERPER API key
    try {
      process.env.SERPER_API = await getSecret('SERPER_API');
      console.log('SERPER API key loaded successfully.');
    } catch (serperError) {
      console.warn('Warning: SERPER_API key not found in Secret Manager:', serperError.message);
      console.warn('SERPER search functionality will be disabled.');
    }
    
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
    // Load secrets first
    await loadSecrets();

    // Initialize Google APIs
    await initializeGoogleApis();

    // Load routers after secrets are available
    const appraisalRouter = require('./routes/appraisal');
    const pdfRouter = require('./routes/pdf');
    const htmlRouter = require('./routes/html');

    // Use routers
    app.use('/', appraisalRouter);
    app.use('/', pdfRouter);
    app.use('/api/html', htmlRouter);

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