const fetch = require('node-fetch');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const { Readable } = require('stream');

let openai;

try {
  // Try to initialize with the API key
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey && process.env.SKIP_SECRET_MANAGER === 'true') {
    console.log('OpenAI API key not found. Using mock client for local development.');
    // Create a mock client for local development
    openai = {
      chat: {
        completions: {
          create: async () => {
            return {
              choices: [{
                message: {
                  content: "This is a mock response from OpenAI for local development.",
                  function_call: null,
                  tool_calls: null,
                }
              }]
            };
          }
        }
      }
    };
  } else if (!apiKey) {
    throw new Error('The OPENAI_API_KEY environment variable is missing or empty');
  } else {
    // Initialize the real client
    openai = new OpenAI({
      apiKey: apiKey
    });
  }
} catch (error) {
  if (process.env.SKIP_SECRET_MANAGER === 'true') {
    console.warn('Warning: OpenAI client initialization failed but continuing with mock client for local development.');
    // Create a mock client for local development
    openai = {
      chat: {
        completions: {
          create: async () => {
            return {
              choices: [{
                message: {
                  content: "This is a mock response from OpenAI for local development.",
                  function_call: null,
                  tool_calls: null,
                }
              }]
            };
          }
        }
      }
    };
  } else {
    // Re-throw the error in production
    throw error;
  }
}

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
      timeout: 30000 // 30 second timeout for image download
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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  try {
    console.log(`[OpenAI Service][${requestId}] Generating structured metadata content with OpenAI...`);
    
    // Read the consolidated metadata prompt
    const promptPath = path.join(__dirname, '../prompts/new_consolidated_metadata.txt');
    let prompt = await fs.readFile(promptPath, 'utf8');
    
    // Process images first - download and convert to base64
    const processedImages = await processImages(images);
    const includedImages = Object.keys(processedImages);
    
    console.log(`[OpenAI Service][${requestId}] Completed processing ${includedImages.length} images, preparing message blocks`);
    
    // Prepare messages array with updated format
    const messages = [
      {
        role: "user",
        content: `# Appraisal Metadata Request

Title: ${postTitle}
Value: $${postData.acf?.value || 'Unknown'}

${prompt}`
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
    console.log(`[OpenAI Service][${requestId}] Post title: "${postTitle}"`);
    console.log(`[OpenAI Service][${requestId}] Including ${includedImages.length} images: ${includedImages.join(', ')}`);
    console.log(`[OpenAI Service][${requestId}] Statistics data included: ${Boolean(statistics && Object.keys(statistics).length > 0)}`);
    console.log(`[OpenAI Service][${requestId}] Sending request with ${messages.length} message blocks for structured metadata`);
    
    // Create a sanitized copy of the request for logging - exclude base64 image data
    const sanitizedMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map(item => {
            if (item.type === 'image_url') {
              return { type: 'image_url', image_url: { url: 'BASE64_IMAGE_DATA_REMOVED_FOR_LOGGING' } };
            }
            return item;
          })
        };
      }
      return msg;
    });
    
    // Log the sanitized request payload for debugging
    const requestPayload = {
      model: 'o3', // Using o3 model which doesn't require temperature or max_tokens params
      messages: sanitizedMessages,
      response_format: { type: "json_object" }
    };
    
    // Write request to debug log file
    try {
      const debugLogDir = path.join(__dirname, '../logs');
      // Create logs directory if it doesn't exist
      try {
        await fs.mkdir(debugLogDir, { recursive: true });
      } catch (dirErr) {
        console.warn(`[OpenAI Service][${requestId}] Could not create logs directory: ${dirErr.message}`);
      }
      
      await fs.writeFile(
        path.join(debugLogDir, `openai_request_${requestId}.json`), 
        JSON.stringify(requestPayload, null, 2)
      );
    } catch (logErr) {
      console.warn(`[OpenAI Service][${requestId}] Failed to write debug log: ${logErr.message}`);
    }
    
    try {
      // Call OpenAI API using the latest SDK patterns
      // Note: o3 is a newer model that doesn't require temperature or max_tokens params
      console.log(`[OpenAI Service][${requestId}] Starting OpenAI API call with o3 model at ${new Date().toISOString()}`);
      const response = await openai.chat.completions.create({
        model: 'o3',
        messages,
        response_format: { type: "json_object" }
      });
      console.log(`[OpenAI Service][${requestId}] OpenAI API call completed at ${new Date().toISOString()}`);
      
      // Write raw response to debug log file
      try {
        await fs.writeFile(
          path.join(__dirname, '../logs', `openai_response_${requestId}.json`), 
          JSON.stringify(response, null, 2)
        );
      } catch (logErr) {
        console.warn(`[OpenAI Service][${requestId}] Failed to write response log: ${logErr.message}`);
      }
      
      // Process response
      if (!response.choices?.[0]?.message?.content) {
        console.error(`[OpenAI Service][${requestId}] Invalid response structure:`);
        console.error(JSON.stringify(response, null, 2));
        throw new Error('Invalid response from OpenAI API for structured metadata: Missing choices[0].message.content');
      }
      
      const content = response.choices[0].message.content.trim();
      
      // Parse the JSON response
      let metadataObj;
      try {
        metadataObj = JSON.parse(content);
        console.log(`[OpenAI Service][${requestId}] Successfully parsed structured metadata JSON response`);
        
        // Validate required metadata structure
        if (!metadataObj.metadata) {
          console.error(`[OpenAI Service][${requestId}] Response missing required 'metadata' object:`);
          console.error(JSON.stringify(metadataObj, null, 2));
          throw new Error('OpenAI response missing required metadata structure');
        }
      } catch (parseError) {
        console.error(`[OpenAI Service][${requestId}] Error parsing JSON response:`, parseError);
        console.error(`[OpenAI Service][${requestId}] Raw content received: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
        
        // Try to write the invalid content to a file for debugging
        try {
          await fs.writeFile(
            path.join(__dirname, '../logs', `openai_invalid_json_${requestId}.txt`), 
            content
          );
          console.error(`[OpenAI Service][${requestId}] Full invalid response written to logs/openai_invalid_json_${requestId}.txt`);
        } catch (writeErr) {
          console.warn(`[OpenAI Service][${requestId}] Could not write invalid JSON to file: ${writeErr.message}`);
        }
        
        throw new Error(`Failed to parse JSON response from OpenAI API: ${parseError.message}`);
      }
      
      // Log usage information
      console.log(`[OpenAI Service][${requestId}] Tokens used - prompt: ${response.usage?.prompt_tokens || 'unknown'}, completion: ${response.usage?.completion_tokens || 'unknown'}, total: ${response.usage?.total_tokens || 'unknown'}`);
      
      return metadataObj;
    } catch (error) {
      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        console.error(`[OpenAI Service][${requestId}] API error (${error.status}): ${error.message}`);
        console.error(`[OpenAI Service][${requestId}] Request ID: ${error.request_id}`);
        
        // Log full error details
        try {
          await fs.writeFile(
            path.join(__dirname, '../logs', `openai_api_error_${requestId}.json`), 
            JSON.stringify({
              status: error.status,
              message: error.message,
              request_id: error.request_id,
              code: error.code,
              type: error.type,
              param: error.param,
              stack: error.stack
            }, null, 2)
          );
        } catch (logErr) {
          console.warn(`[OpenAI Service][${requestId}] Failed to write error log: ${logErr.message}`);
        }
        
        throw new Error(`OpenAI API error: ${JSON.stringify({
          error: {
            message: error.message,
            type: error.type || 'api_error',
            param: error.param,
            code: error.code
          }
        })}`);
      }
      
      // If we got this far, it's not an OpenAI API error but something else
      console.error(`[OpenAI Service][${requestId}] Non-API error during OpenAI request: ${error.message}`);
      console.error(error.stack);
      
      // Re-throw other errors with RequestID for tracking
      error.message = `${error.message} (RequestID: ${requestId})`;
      throw error;
    }
  } catch (error) {
    console.error(`[OpenAI Service][${requestId}] Error generating structured metadata:`, error);
    
    // Add fallback handling - if this is in production, return minimal metadata to allow the process to continue
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[OpenAI Service][${requestId}] Running in production, returning fallback metadata to avoid full failure`);
      
      return {
        metadata: {
          creator: postData.acf?.creator || "Unknown",
          medium: postData.acf?.medium || "Unknown",
          object_type: postData.acf?.object_type || "Artwork",
          condition_summary: postData.acf?.condition_summary || "Unknown",
          estimated_age: postData.acf?.estimated_age || "Unknown",
          condition_score: 70,
          rarity: 50,
          market_demand: 50,
          historical_significance: 50,
          investment_potential: 50,
          provenance_strength: 50,
          data_quality_assessment: "Metadata generation failed. Using fallback data.",
          _error: `${error.message}`,
          _request_id: requestId
        }
      };
    }
    
    // In non-production, throw the error to be handled upstream
    throw error;
  }
}

/**
 * Generate content using OpenAI
 */
async function generateContent(prompt, postTitle, images = {}, model = 'o3', systemMessage = null) {
  try {
    console.log('Generating content with OpenAI...');
    
    // Process images first - download and convert to base64
    const processedImages = await processImages(images);
    const includedImages = Object.keys(processedImages);
    
    // Prepare messages for the API
    const messages = [];
    
    // Add system message if provided
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    // Add user message with post title and prompt
    messages.push({
      role: "user",
      content: `Title: ${postTitle}\n\n${prompt}`
    });
    
    // Log details
    console.log(`OpenAI: Using model ${model}`);
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
      // Note: o3 is a newer model that doesn't require temperature or max_tokens params
      const response = await openai.chat.completions.create({
        model,
        messages
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