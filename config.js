/**
 * Configuration module that loads environment variables and secrets
 */

// Import required modules for Secret Manager access
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Create a Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Environment variables (with defaults)
const config = {
  // WordPress API
  WORDPRESS_API_URL: process.env.WORDPRESS_API_URL,
  WORDPRESS_USERNAME: process.env.wp_username,
  WORDPRESS_APP_PASSWORD: process.env.wp_app_password,
  
  // Debug logging for credentials
  DEBUG_WORDPRESS_CREDS: !!process.env.DEBUG_WORDPRESS_CREDS || false,
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, 
  GEMINI_API_ENDPOINT: process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com',
  GOOGLE_VISION_CREDENTIALS: process.env.GOOGLE_VISION_CREDENTIALS,
  
  // PDF Generation
  GOOGLE_DOCS_CREDENTIALS: process.env.GOOGLE_DOCS_CREDENTIALS,
  GOOGLE_DOCS_TEMPLATE_ID: process.env.GOOGLE_DOCS_TEMPLATE_ID,
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
  
  // External APIs
  VALUER_AGENT_API_URL: process.env.VALUER_AGENT_API_URL || 'https://valuer-agent-yqytg4sqmq-uc.a.run.app',
  SERPER_API: process.env.SERPER_API,
  
  // Server configuration
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  
  // CORS configuration
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || '',
  
  // Helper function to get a secret from Secret Manager
  getSecret: async function(secretName) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
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
};

// Export the config object
module.exports = config; 