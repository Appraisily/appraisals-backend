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
  
  // Secret names for WordPress credentials
  WORDPRESS_USERNAME_SECRET: 'wp_username',
  WORDPRESS_PASSWORD_SECRET: 'wp_app_password',
  
  // Debug logging for credentials
  DEBUG_WORDPRESS_CREDS: !!process.env.DEBUG_WORDPRESS_CREDS || false,
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, 
  GEMINI_API_ENDPOINT: process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com',
  GOOGLE_VISION_CREDENTIALS: process.env.GOOGLE_VISION_CREDENTIALS,
  
  // PDF Generation
  // GOOGLE_DOCS_CREDENTIALS_SECRET_NAME: process.env.GOOGLE_DOCS_CREDENTIALS_SECRET_NAME || 'google-docs-credentials', // Removed - hardcoding secret name
  GOOGLE_DOCS_CREDENTIALS: null, // Will be loaded by initSecrets
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
  },

  // Function to initialize secrets from Secret Manager
  initSecrets: async function() {
    try {
      console.log('Loading credentials from Secret Manager...');

      // Get WordPress username from Secret Manager
      this.WORDPRESS_USERNAME = await this.getSecret(this.WORDPRESS_USERNAME_SECRET);
      console.log('WordPress username loaded from Secret Manager');

      // Get WordPress password from Secret Manager
      this.WORDPRESS_APP_PASSWORD = await this.getSecret(this.WORDPRESS_PASSWORD_SECRET);
      console.log('WordPress app password loaded from Secret Manager');

      // Get Google Docs credentials
      // Removed check for GOOGLE_DOCS_CREDENTIALS_SECRET_NAME
      const googleDocsSecretName = 'GOOGLE_DOCS_CREDENTIALS'; // Hardcoded secret name
      console.log(`Loading Google Docs credentials from secret: ${googleDocsSecretName}...`);
      this.GOOGLE_DOCS_CREDENTIALS = await this.getSecret(googleDocsSecretName);
      console.log('Google Docs credentials loaded from Secret Manager.');

      // Add fetching for other secrets here if needed...
      // Example: Fetch OpenAI API Key
      // if (process.env.OPENAI_API_KEY_SECRET_NAME) {
      //   this.OPENAI_API_KEY = await this.getSecret(process.env.OPENAI_API_KEY_SECRET_NAME);
      //   console.log('OpenAI API Key loaded from Secret Manager.');
      // } else if (!this.OPENAI_API_KEY) { // Check if already set via env var
      //   console.warn('OpenAI API Key not configured via environment variable or Secret Manager name.');
      // }


      console.log('Secret loading process finished.');
      return true;
    } catch (error) {
      console.error('Failed to load one or more secrets from Secret Manager:', error);
      // Decide how to handle failure - currently throwing will stop the app
      throw new Error(`Failed to initialize secrets: ${error.message}`);
      // Note: The previous fallback logic for WP creds using env vars is removed
      // by throwing the error here if any secret fails.
    }
  }
};

// Export the config object
module.exports = config; 