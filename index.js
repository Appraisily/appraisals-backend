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
    console.log('Loading secrets from Secret Manager...');
    
    // Define required secrets and load them
    const requiredSecrets = [
      'WORDPRESS_API_URL',
      'wp_username',
      'wp_app_password',
      'OPENAI_API_KEY',
      'GOOGLE_VISION_CREDENTIALS',
      'GOOGLE_DOCS_CREDENTIALS'
    ];
    
    // Optional secrets
    const optionalSecrets = [
      'SERPER_API'
    ];
    
    // Load all required secrets
    for (const secretName of requiredSecrets) {
      try {
        console.log(`Loading required secret: ${secretName}`);
        process.env[secretName] = await getSecret(secretName);
        console.log(`✓ Successfully loaded secret: ${secretName}`);
      } catch (error) {
        console.error(`✗ Error loading required secret '${secretName}':`, error.message);
        throw new Error(`Failed to load required secret '${secretName}': ${error.message}`);
      }
    }
    
    // Load optional secrets
    for (const secretName of optionalSecrets) {
      try {
        console.log(`Loading optional secret: ${secretName}`);
        process.env[secretName] = await getSecret(secretName);
        console.log(`✓ Successfully loaded optional secret: ${secretName}`);
      } catch (error) {
        console.warn(`⚠ Optional secret '${secretName}' not available:`, error.message);
        console.warn(`Functionality requiring ${secretName} will be disabled.`);
      }
    }
    
    // Verify all required secrets are loaded
    const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
    if (missingSecrets.length > 0) {
      throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}`);
    }
    
    console.log('✅ All required secrets loaded successfully.');
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
    throw error;
  }
}

// Get secret from Secret Manager with retries
async function getSecret(secretName, maxRetries = 3) {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      const projectId = 'civil-forge-403609';
      const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      
      console.log(`Fetching secret ${secretName} (attempt ${retries + 1}/${maxRetries})...`);
      const [version] = await secretClient.accessSecretVersion({ name: secretPath });
      
      const secretValue = version.payload.data.toString('utf8');
      if (!secretValue) {
        throw new Error(`Secret ${secretName} is empty`);
      }
      
      return secretValue;
    } catch (error) {
      lastError = error;
      
      if (error.code === 5) {
        console.error(`Secret ${secretName} not found (code 5/NOT_FOUND)`);
        // No need to retry if the secret doesn't exist
        break;
      } else if (error.code === 7) {
        console.error(`Permission denied accessing secret ${secretName} (code 7/PERMISSION_DENIED)`);
        // No need to retry permission issues
        break;
      }
      
      console.error(`Error fetching secret ${secretName} (attempt ${retries + 1}/${maxRetries}):`, error.message);
      
      // Increase retry count
      retries++;
      
      if (retries < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we got here, all retries failed
  throw new Error(`Failed to fetch secret ${secretName} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Initialize and start server
async function startServer() {
  try {
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  Starting Appraisals Backend Service    │');
    console.log('└─────────────────────────────────────────┘');
    
    // Load secrets first
    console.log('Step 1: Loading secrets...');
    await loadSecrets();
    
    // Initialize Google APIs
    console.log('Step 2: Initializing Google APIs...');
    try {
      await initializeGoogleApis();
      console.log('✓ Google APIs initialized successfully');
    } catch (error) {
      console.error('✗ Error initializing Google APIs:', error.message);
      console.warn('⚠ Continuing startup, but PDF functionality may be limited');
    }

    // Load routers after secrets are available
    console.log('Step 3: Loading application routes...');
    const appraisalRouter = require('./routes/appraisal');
    const pdfRouter = require('./routes/pdf');

    // Use routers
    app.use('/', appraisalRouter);
    app.use('/', pdfRouter);

    // Health check route
    app.get('/', (req, res) => {
      res.status(200).send('Appraisals Backend Service is running');
    });

    // Test route for S3 logging
    app.post('/test-s3-log', async (req, res) => {
      const { sessionId, message } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'sessionId is required'
        });
      }
      
      try {
        const { createLogger } = require('./services/utils/logger');
        const logger = createLogger('TestS3Log');
        
        logger.info(`Test message: ${message || 'Hello S3 logging!'}`, sessionId);
        
        return res.json({
          success: true,
          message: 'S3 logging test executed successfully'
        });
      } catch (error) {
        console.error('Error in S3 logging test:', error);
        return res.status(500).json({
          success: false,
          message: 'Error in S3 logging test',
          error: error.message
        });
      }
    });

    console.log('Step 4: Starting HTTP server...');
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log('Appraisals Backend Service is ready to handle requests');
    });
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error.message);
    console.error(error.stack);
    
    // Exit with error code
    console.log('Exiting process due to startup failure');
    process.exit(1);
  }
}

startServer();