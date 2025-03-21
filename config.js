// config.js
const config = {};

// Export empty config object initially
module.exports = config;

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function for environment variables
function getEnvVar(key, required = true, defaultValue = null) {
  if (process.env[key]) {
    return process.env[key];
  }
  
  if (required) {
    const errorMessage = `${key} not loaded from secrets`;
    console.error(`Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  return defaultValue;
}

// These will be populated by loadSecrets() in index.js
Object.defineProperties(config, {
  'WORDPRESS_API_URL': {
    enumerable: true,
    get() {
      return getEnvVar('WORDPRESS_API_URL', true);
    }
  },
  'WORDPRESS_USERNAME': {
    enumerable: true,
    get() {
      return getEnvVar('wp_username', true);
    }
  },
  'WORDPRESS_APP_PASSWORD': {
    enumerable: true,
    get() {
      return getEnvVar('wp_app_password', true);
    }
  },
  'OPENAI_API_KEY': {
    enumerable: true,
    get() {
      return getEnvVar('OPENAI_API_KEY', true);
    }
  },
  'GOOGLE_VISION_CREDENTIALS': {
    enumerable: true,
    get() {
      return getEnvVar('GOOGLE_VISION_CREDENTIALS', true);
    }
  },
  'GOOGLE_DOCS_CREDENTIALS': {
    enumerable: true,
    get() {
      return getEnvVar('GOOGLE_DOCS_CREDENTIALS', true);
    }
  },
  'SERPER_API': {
    enumerable: true,
    get() {
      return getEnvVar('SERPER_API', false, null); // Return null if not available, making it optional
    }
  }
});