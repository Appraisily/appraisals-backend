const fetch = require('node-fetch');
const https = require('https');
const config = require('../../config');

const agent = new https.Agent({
  rejectUnauthorized: false,
  timeout: 30000
});

async function testWordPressConnection(postId) {
  const endpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf,title,date`;
  const startTime = Date.now();

  try {
    console.log('Testing connection to:', endpoint);
    
    const response = await fetch(endpoint, {
      timeout: 30000,
      agent,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const endTime = Date.now();
    const responseText = await response.text();
    
    return {
      success: response.ok,
      timing: {
        total: endTime - startTime,
        unit: 'ms'
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        size: responseText.length,
        body: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : '')
      },
      dns: await resolveDns(new URL(endpoint).hostname)
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        type: error.type,
        stack: error.stack
      }
    };
  }
}

async function resolveDns(hostname) {
  return new Promise((resolve) => {
    require('dns').lookup(hostname, (err, address) => {
      resolve({ error: err?.message, address });
    });
  });
}

module.exports = { testWordPressConnection };