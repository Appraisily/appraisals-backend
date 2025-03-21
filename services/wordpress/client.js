const https = require('https');
const fetch = require('node-fetch');
const config = require('../../config');

const agent = new https.Agent({
  rejectUnauthorized: false,
  timeout: 30000
});

// Create authorization headers at runtime instead of during module load
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
    'Accept': 'application/json'
  };
}

// Base options without headers
const BASE_OPTIONS = {
  method: 'GET',
  agent,
  timeout: 30000
};

async function fetchWordPress(endpoint, options = {}) {
  const url = `${config.WORDPRESS_API_URL}${endpoint}`;
  console.log(`[WordPress] Fetching: ${url}`);
  
  try {
    // Add auth headers at runtime
    const headers = { ...getAuthHeaders(), ...options.headers };
    
    const response = await fetch(url, {
      ...BASE_OPTIONS,
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', {
        status: response.status,
        body: errorText
      });
      throw new Error(`WordPress API error: ${errorText}`);
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