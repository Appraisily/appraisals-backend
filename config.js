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
  }
});