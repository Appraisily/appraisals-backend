const https = require('https');
const fetch = require('node-fetch');
const config = require('../../config');

// Add debug logging for WordPress credentials
console.log('WordPress credentials check:', {
  apiUrl: config.WORDPRESS_API_URL,
  usernameExists: !!config.WORDPRESS_USERNAME,
  passwordExists: !!config.WORDPRESS_APP_PASSWORD,
  passwordLength: config.WORDPRESS_APP_PASSWORD ? config.WORDPRESS_APP_PASSWORD.length : 0
});

const agent = new https.Agent({
  rejectUnauthorized: false,
  timeout: 30000
});

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

// Only add Authorization if credentials exist
if (config.WORDPRESS_USERNAME && config.WORDPRESS_APP_PASSWORD) {
  DEFAULT_HEADERS.Authorization = `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`;
  console.log('WordPress authorization header added');
} else {
  console.error('WordPress credentials missing - authorization will fail!');
}

const DEFAULT_OPTIONS = {
  method: 'GET',
  headers: DEFAULT_HEADERS,
  agent,
  timeout: 30000
};

// Function to create new headers with updated credentials if they've changed
function getUpdatedHeaders() {
  // Make a copy of the default headers
  const updatedHeaders = { ...DEFAULT_HEADERS };
  
  // Update authorization if credentials exist and are different from what was used initially
  if (config.WORDPRESS_USERNAME && config.WORDPRESS_APP_PASSWORD) {
    const newAuthValue = `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`;
    updatedHeaders.Authorization = newAuthValue;
  }
  
  return updatedHeaders;
}

async function fetchWordPress(endpoint, options = {}) {
  const url = `${config.WORDPRESS_API_URL}${endpoint}`;
  console.log(`[WordPress] Fetching: ${url}`);
  
  // Add detailed credential debugging if enabled
  if (config.DEBUG_WORDPRESS_CREDS) {
    const masked = value => value ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : 'undefined';
    console.log('[WordPress DEBUG] Credentials:', {
      username: config.WORDPRESS_USERNAME,
      password: masked(config.WORDPRESS_APP_PASSWORD),
      authHeader: options.headers?.Authorization ? 'present' : 'missing'
    });
  }
  
  try {
    // Check if authentication credentials are present
    if (!config.WORDPRESS_USERNAME || !config.WORDPRESS_APP_PASSWORD) {
      console.error('[WordPress] Authentication credentials missing! This will cause 401 errors.');
    }
    
    // Always get updated headers to ensure we have the latest credentials
    const updatedHeaders = getUpdatedHeaders();
    
    const response = await fetch(url, {
      ...DEFAULT_OPTIONS,
      ...options,
      headers: {
        ...updatedHeaders,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // More detailed error handling for common cases
      if (response.status === 401) {
        console.error('WordPress API authentication error (401):', {
          status: response.status,
          body: errorText,
          credentials: {
            usernameExists: !!config.WORDPRESS_USERNAME,
            passwordExists: !!config.WORDPRESS_APP_PASSWORD,
            headerExists: !!updatedHeaders.Authorization
          }
        });
        throw new Error(`WordPress API authentication failed (401): ${errorText}`);
      } else {
        console.error('WordPress API error:', {
          status: response.status,
          body: errorText
        });
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
      }
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', {
      error: error.message,
      code: error.code,
      type: error.type
    });
    throw error;
  }
}

async function getPost(postId, fields = ['acf'], params = {}) {
  const queryParams = new URLSearchParams({
    _fields: fields.join(','),
    ...params
  });
  
  const response = await fetchWordPress(`/appraisals/${postId}?${queryParams}`);
  return response.json();
}

async function getMedia(mediaId, fields = ['source_url']) {
  const response = await fetchWordPress(`/media/${mediaId}?_fields=${fields.join(',')}`);
  return response.json();
}

async function updatePost(postId, data) {
  console.log(`Updating post ${postId} with data:`, JSON.stringify(data, null, 2));
  
  const response = await fetchWordPress(`/appraisals/${postId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  console.log(`Update response status: ${response.status}`);
  return response.json();
}

module.exports = {
  fetchWordPress,
  getPost,
  getMedia,
  updatePost
};