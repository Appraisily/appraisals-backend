const https = require('https');
const fetch = require('node-fetch');
const config = require('../../config');

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
};

async function fetchWordPress(endpoint, options = {}) {
  const url = `${config.WORDPRESS_API_URL}${endpoint}`;
  console.log(`Fetching WordPress endpoint: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error getting post from WordPress:`, errorText);
      throw new Error('Error getting post from WordPress.');
    }

    return response;
  } catch (error) {
    console.error('Error in WordPress request:', error);
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