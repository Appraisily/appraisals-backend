const https = require('https');
const fetch = require('node-fetch');
const config = require('../../config');

const agent = new https.Agent({
  rejectUnauthorized: false,
  timeout: 30000
});

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
};

const DEFAULT_OPTIONS = {
  method: 'GET',
  headers: DEFAULT_HEADERS,
  agent,
  timeout: 30000
};

async function fetchWordPress(endpoint, options = {}) {
  const url = `${config.WORDPRESS_API_URL}${endpoint}`;
  console.log(`Fetching WordPress endpoint: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...DEFAULT_OPTIONS,
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', {
        url,
        status: response.status,
        headers: response.headers.raw(),
        body: errorText
      });
      throw new Error(`WordPress API error: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', {
      url,
      error: error.message,
      code: error.code,
      type: error.type
    });
    throw error;
  }
}

async function getPost(postId, fields = ['acf']) {
  const response = await fetchWordPress(`/appraisals/${postId}?_fields=${fields.join(',')}`);
  return response.json();
}

async function getMedia(mediaId, fields = ['source_url']) {
  const response = await fetchWordPress(`/media/${mediaId}?_fields=${fields.join(',')}`);
  return response.json();
}

async function updatePost(postId, data) {
  const response = await fetchWordPress(`/appraisals/${postId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}

module.exports = {
  fetchWordPress,
  getPost,
  getMedia,
  updatePost
};