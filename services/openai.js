const fetch = require('node-fetch');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const { Readable } = require('stream');

// Initialize OpenAI client with the latest version
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  maxRetries: 3, // Configure retries for reliability
  timeout: 60000 // 60 seconds timeout
});

/**
 * Download image and convert to base64
 * @param {string} url - URL of the image to download
 * @returns {Promise<string|null>} - Base64 encoded image or null if failed
 */
async function downloadImageAsBase64(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    console.warn(`[OpenAI Service] Invalid image URL format: ${url}`);
    return null;
  }
  
  try {
    console.log(`[OpenAI Service] Downloading image from ${url}`);
    const response = await fetch(url, { 
      timeout: 10000 // 10 second timeout for image download
    });
    
    if (!response.ok) {
      console.warn(`[OpenAI Service] Failed to download image: URL returned status ${response.status}`);
      return null;
    }
    
    // Check content type to confirm it's an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`[OpenAI Service] URL does not point to an image (${contentType})`);
      return null;
    }
    
    // Get the image data as a buffer
    const buffer = await response.buffer();
    
    // Convert buffer to base64 and return with data URI format
    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`[OpenAI Service] Error downloading image: ${error.message}`);
    return null;
  }
}

/**
 * Process image URLs by downloading them and converting to base64
 * @param {Object} images - Object containing image URLs (main, age, signature)
 * @returns {Promise<Object>} - Object with processed base64 images
 */
async function processImages(images = {}) {
  const processedImages = {};
  const imageTypes = ['main', 'age', 'signature'];
  
  await Promise.all(
    imageTypes.map(async (type) => {
      if (images[type] && typeof images[type] === 'string' && images[type].startsWith('http')) {
        const base64Image = await downloadImageAsBase64(images[type]);
        if (base64Image) {
          processedImages[type] = base64Image;
        }
      }
    })
  );
  
  return processedImages;
}

/**
 * Generate structured metadata content for an appraisal using a single OpenAI API call
 * 
 * @param {string} postTitle - Title of the appraisal
 * @param {Object} postData - Post data including ACF fields
 * @param {Object} images - Object containing image URLs (main, age, signature)
 * @param {Object} statistics - Statistics data from valuer agent
 * @returns {Promise<Object>} - Structured metadata as JSON object
 */
async function generateStructuredMetadata(postTitle, postData, images = {}, statistics = {}) {
  try {
    console.log('[OpenAI Service] Generating structured metadata content with OpenAI...');
    
    // Read the consolidated metadata prompt
    const promptPath = path.join(__dirname, '../prompts/new_consolidated_metadata.txt');
    let prompt = await fs.readFile(promptPath, 'utf8');
    
    // Process images first - download and convert to base64
    const processedImages = await processImages(images);
    const includedImages = Object.keys(processedImages);
    
    // Prepare messages array with updated format
    const messages = [
      {
        role: "system",
        content: "I am a professional art and antiques appraiser. I will analyze the provided information and generate detailed metadata for this appraisal item."
      },
      {
        role: "user",
        content: `# Appraisal Metadata Request\n\nTitle: ${postTitle}\nValue: $${postData.acf?.value || 'Unknown'}\n\n${prompt}`
      }
    ];
    
    // Add statistics data if available
    if (statistics && Object.keys(statistics).length > 0) {
      const statisticsStr = typeof statistics === 'string' ? statistics : JSON.stringify(statistics, null, 2);
      messages.push({
        role: "user",
        content: `# Valuer Agent Statistics\n\n${statisticsStr}`
      });
    }
    
    // Add each image as a separate message
    for (const type of includedImages) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `# ${type.charAt(0).toUpperCase() + type.slice(1)} Image:`
          },
          {
            type: "image_url",
            image_url: {
              url: processedImages[type]
            }
          }
        ]
      });
    }
    
    // Log request details
    console.log(`[OpenAI Service] Post title: "${postTitle}"`);
    console.log(`[OpenAI Service] Including ${includedImages.length} images: ${includedImages.join(', ')}`);
    console.log(`[OpenAI Service] Statistics data included: ${Boolean(statistics && Object.keys(statistics).length > 0)}`);
    console.log(`[OpenAI Service] Sending request with ${messages.length} message blocks for structured metadata`);
    
    try {
      // Call OpenAI API using the latest SDK patterns
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: "json_object" }
      });
      
      // Process response
      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API for structured metadata');
      }
      
      const content = response.choices[0].message.content.trim();
      
      // Parse the JSON response
      let metadataObj;
      try {
        metadataObj = JSON.parse(content);
        console.log('[OpenAI Service] Successfully parsed structured metadata JSON response');
      } catch (parseError) {
        console.error('[OpenAI Service] Error parsing JSON response:', parseError);
        throw new Error('Failed to parse JSON response from OpenAI API');
      }
      
      // Log usage information
      console.log(`[OpenAI Service] Tokens used - prompt: ${response.usage?.prompt_tokens || 'unknown'}, completion: ${response.usage?.completion_tokens || 'unknown'}, total: ${response.usage?.total_tokens || 'unknown'}`);
      
      return metadataObj;
    } catch (error) {
      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        console.error(`[OpenAI Service] API error (${error.status}): ${error.message}`);
        console.error(`[OpenAI Service] Request ID: ${error.request_id}`);
        
        throw new Error(`OpenAI API error: ${JSON.stringify({
          error: {
            message: error.message,
            type: error.type || 'api_error',
            param: error.param,
            code: error.code
          }
        })}`);
      }
      
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error('[OpenAI Service] Error generating structured metadata:', error);
    throw error;
  }
}

/**
 * Generate content using OpenAI
 */
async function generateContent(prompt, postTitle, images = {}, model = 'gpt-4o', systemMessage = null, maxTokens = 1024, temperature = 0.7) {
  try {
    console.log('Generating content with OpenAI...');
    
    // Process images first - download and convert to base64
    const processedImages = await processImages(images);
    const includedImages = Object.keys(processedImages);
    
    // Prepare messages for the API
    const messages = [
      {
        role: "system",
        content: systemMessage || "You are a professional art expert specializing in appraisals and artwork analysis."
      },
      {
        role: "user",
        content: `Title: ${postTitle}\n\n${prompt}`
      }
    ];
    
    // Log details
    console.log(`OpenAI: Using model ${model} with temperature ${temperature}`);
    console.log(`OpenAI: Post title: "${postTitle}"`);
    
    // Show a sample of the prompt (first 500 characters)
    const promptSample = prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '');
    console.log(`OpenAI: Main prompt sample (first 500 chars): ${promptSample}`);
    console.log(`OpenAI: Main prompt length: ${prompt.length} characters`);
    
    // Add each image as a separate message with proper content structure
    for (const type of includedImages) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyzing ${type} image:`
          },
          {
            type: "image_url",
            image_url: {
              url: processedImages[type]
            }
          }
        ]
      });
    }
    
    if (includedImages.length > 0) {
      console.log(`OpenAI: Including ${includedImages.length} images: ${includedImages.join(', ')}`);
    } else {
      console.log('OpenAI: No images included in this request');
    }
    
    try {
      // Call OpenAI API using the latest SDK patterns
      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      });
      
      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }
      
      const content = response.choices[0].message.content.trim();
      console.log('Content generated successfully');
      
      // Log sample of response
      const responseSample = content.substring(0, 300) + (content.length > 300 ? '...' : '');
      console.log(`OpenAI: Response sample (first 300 chars): ${responseSample}`);
      console.log(`OpenAI: Response length: ${content.length} characters`);
      console.log(`OpenAI: Tokens used - prompt: ${response.usage?.prompt_tokens || 'unknown'}, completion: ${response.usage?.completion_tokens || 'unknown'}, total: ${response.usage?.total_tokens || 'unknown'}`);
      
      return content;
    } catch (error) {
      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI: API error (${error.status}): ${error.message}`);
        console.error(`OpenAI: Request ID: ${error.request_id}`);
        
        throw new Error(`OpenAI API error: ${JSON.stringify({
          error: {
            message: error.message,
            type: error.type || 'api_error',
            param: error.param,
            code: error.code
          }
        })}`);
      }
      
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

module.exports = {
  generateContent,
  generateStructuredMetadata
};