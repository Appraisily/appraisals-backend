// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const requestIp = require('request-ip');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { initializeGoogleApis } = require('./services/pdf');
const { initializeGeminiClient } = require('./services/gemini-visualization');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Read CORS origins from environment variable, default to empty array if not set
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim()) // Trim whitespace
  .filter(origin => origin); // Remove empty entries

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow if the origin is in the allowed list
    if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Load secrets
async function loadSecrets() {
  try {
    // Skip Secret Manager when running locally
    if (process.env.SKIP_SECRET_MANAGER === 'true') {
      console.log('Skipping Secret Manager, using environment variables directly.');
      // Use existing environment variables loaded from .env
      return;
    }

    // Load secrets into process.env
    process.env.WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    process.env.wp_username = await getSecret('wp_username');
    process.env.wp_app_password = await getSecret('wp_app_password');
    process.env.OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    process.env.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');
    process.env.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    process.env.GEMINI_API_KEY = await getSecret('GEMINI_API_KEY');
    
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
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID; // Read from env var
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set.');
    }
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

    // Skip Google APIs initialization when running locally
    if (process.env.SKIP_SECRET_MANAGER !== 'true') {
      try {
        // Initialize Google APIs
        await initializeGoogleApis();
      } catch (googleApisError) {
        console.error('Error during Google APIs initialization:', googleApisError.message);
        console.log('Continuing server startup without Google APIs.');
      }
    } else {
      console.log('Skipping Google APIs initialization for local development.');
    }

    // Try to initialize Gemini client, but don't block server startup if it fails
    try {
      await initializeGeminiClient();
    } catch (geminiError) {
      console.error('Error initializing Gemini client:', geminiError.message);
      console.log('Continuing server startup without Gemini client.');
    }

    // Load routers after secrets are available
    const reportRouter = require('./routes/report');
    const visualizationRouter = require('./routes/visualization');
    const descriptionRouter = require('./routes/description');
    const utilityRouter = require('./routes/utility');
    const pdfRouter = require('./routes/pdf');
    const pdfStepsRouter = require('./routes/pdf-steps');
    const htmlRouter = require('./routes/html');
    const debugVisualizationsRouter = require('./routes/visualizations'); 

    // Use routers - Mount new routers at base path '/'
    app.use('/', reportRouter); 
    app.use('/', visualizationRouter); 
    app.use('/', descriptionRouter);
    app.use('/', utilityRouter);
    // Mount existing routers
    app.use('/', pdfRouter); 
    app.use('/api/pdf', pdfStepsRouter);
    app.use('/api/html', htmlRouter);
    app.use('/api/visualizations', debugVisualizationsRouter);

    // Error handling middleware (must be after routers)
    app.use(async (err, req, res, next) => {
      console.error('Unhandled error:', err);

      if (err) {
        try {
          await createGithubIssue(err, req);
        } catch (githubError) {
          console.error("Failed to create GitHub issue during error handling:", githubError);
        }
      }

      const statusCode = err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message
      });
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/health`);
      console.log(`Visualization debugging available at: http://localhost:${PORT}/api/visualizations/debug`);
      console.log(`Step-by-step PDF generation available at: http://localhost:${PORT}/api/pdf/generate-pdf-steps`);
      console.log(`Get PDF steps available at: http://localhost:${PORT}/api/pdf/steps`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();