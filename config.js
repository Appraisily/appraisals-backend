// config.js
const config = {};

// Export empty config object initially
module.exports = config;

// These will be populated by loadSecrets() in index.js
Object.defineProperties(config, {
  'WORDPRESS_API_URL': {
    enumerable: true,
    get() {
      if (!process.env.WORDPRESS_API_URL) {
        throw new Error('WORDPRESS_API_URL not loaded from secrets');
      }
      return process.env.WORDPRESS_API_URL;
    }
  },
  'WORDPRESS_USERNAME': {
    enumerable: true,
    get() {
      if (!process.env.wp_username) {
        throw new Error('wp_username not loaded from secrets');
      }
      return process.env.wp_username;
    }
  },
  'WORDPRESS_APP_PASSWORD': {
    enumerable: true,
    get() {
      if (!process.env.wp_app_password) {
        throw new Error('wp_app_password not loaded from secrets');
      }
      return process.env.wp_app_password;
    }
  },
  'OPENAI_API_KEY': {
    enumerable: true,
    get() {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not loaded from secrets');
      }
      return process.env.OPENAI_API_KEY;
    }
  },
  'GOOGLE_VISION_CREDENTIALS': {
    enumerable: true,
    get() {
      if (!process.env.GOOGLE_VISION_CREDENTIALS) {
        throw new Error('GOOGLE_VISION_CREDENTIALS not loaded from secrets');
      }
      return process.env.GOOGLE_VISION_CREDENTIALS;
    }
  },
  'GOOGLE_DOCS_CREDENTIALS': {
    enumerable: true,
    get() {
      if (!process.env.GOOGLE_DOCS_CREDENTIALS) {
        throw new Error('GOOGLE_DOCS_CREDENTIALS not loaded from secrets');
      }
      return process.env.GOOGLE_DOCS_CREDENTIALS;
    }
  },
  'SERPER_API': {
    enumerable: true,
    get() {
      return process.env.SERPER_API || null; // Return null if not available, making it optional
    }
  },
  // Add Valuer Agent URL
  'VALUER_AGENT_API_URL': {
    enumerable: true,
    get() {
      if (!process.env.VALUER_AGENT_API_URL) {
        // Optionally provide a default or throw error if critical
        console.warn('VALUER_AGENT_API_URL not found in environment variables. Using default or potentially failing.');
        // You might want to throw an error instead if this service is mandatory:
        // throw new Error('VALUER_AGENT_API_URL not loaded from environment');
        return 'https://valuer-agent-856401495068.us-central1.run.app'; // Fallback or default
      }
      return process.env.VALUER_AGENT_API_URL;
    }
  }
});