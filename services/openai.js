const fetch = require('node-fetch');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

async function buildMessageContent(prompt, imageUrl) {
  const content = [];
  
  // Add text content first
  content.push({
    type: "text",
    text: prompt
  });

  // Add image if available
  if (imageUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    });
  }

  return content;
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
    const promptPath = path.join(__dirname, '../prompts/consolidated_metadata.txt');
    let prompt = await fs.readFile(promptPath, 'utf8');
    
    // Prepare messages with system instruction and data
    const messages = [];
    
    // Add instruction as assistant message (not system)
    messages.push({
      role: "assistant",
      content: [{ 
        type: "text", 
        text: "I am a professional art and antiques appraiser. I will analyze the provided information and generate detailed metadata for this appraisal item."
      }]
    });
    
    // Add main prompt with title and value as user message
    const value = postData.acf?.value || 'Unknown';
    messages.push({
      role: "user",
      content: await buildMessageContent(`# Appraisal Metadata Request\n\nTitle: ${postTitle}\nValue: $${value}\n\n${prompt}`)
    });
    
    // Add data from valuer agent as another user message
    let statisticsStr = '';
    if (statistics && Object.keys(statistics).length > 0) {
      statisticsStr = typeof statistics === 'string' ? statistics : JSON.stringify(statistics, null, 2);
      messages.push({
        role: "user",
        content: [{ 
          type: "text", 
          text: `# Valuer Agent Statistics\n\n${statisticsStr}` 
        }]
      });
    }
    
    // Add images as separate messages with proper structure
    const includedImages = [];
    for (const type of ['main', 'age', 'signature']) {
      if (images[type] && typeof images[type] === 'string' && images[type].startsWith('http')) {
        messages.push({
          role: "user",
          content: await buildMessageContent(`# ${type.charAt(0).toUpperCase() + type.slice(1)} Image:`, images[type])
        });
        includedImages.push(type);
      }
    }
    
    // Log request details
    console.log(`[OpenAI Service] Post title: "${postTitle}"`);
    console.log(`[OpenAI Service] Including ${includedImages.length} images: ${includedImages.join(', ')}`);
    console.log(`[OpenAI Service] Statistics data included: ${Boolean(statisticsStr)}`);
    
    // Prepare request with response format specification for JSON
    const requestBody = {
      model: 'gpt-4o',
      messages,
      response_format: { type: "json_object" }
      // Note: max_tokens and temperature are not included as specified
    };
    
    console.log(`[OpenAI Service] Sending request with ${messages.length} message blocks for structured metadata`);
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API for structured metadata');
    }
    
    const content = data.choices[0].message.content.trim();
    
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
    console.log(`[OpenAI Service] Tokens used - prompt: ${data.usage?.prompt_tokens || 'unknown'}, completion: ${data.usage?.completion_tokens || 'unknown'}, total: ${data.usage?.total_tokens || 'unknown'}`);
    
    return metadataObj;
  } catch (error) {
    console.error('[OpenAI Service] Error generating structured metadata:', error);
    throw error;
  }
}

async function generateContent(prompt, postTitle, images = {}, model = 'gpt-4o', systemMessage = null, maxTokens = 1024, temperature = 0.7) {
  try {
    console.log('Generating content with OpenAI...');
    
    const messages = [{
      role: "system",
      content: [{
        type: "text",
        text: systemMessage || "You are a professional art expert specializing in appraisals and artwork analysis."
      }]
    }];

    console.log(`OpenAI: Using model ${model} with temperature ${temperature}`);
    console.log(`OpenAI: System message: "${systemMessage || "You are a professional art expert specializing in appraisals and artwork analysis."}" (${messages[0].content[0].text.length} chars)`);

    // Add title and prompt as first user message
    messages.push({
      role: "user",
      content: await buildMessageContent(`Title: ${postTitle}\n\n${prompt}`)
    });

    console.log(`OpenAI: Post title: "${postTitle}"`);
    // Show a sample of the prompt (first 500 characters)
    const promptSample = prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '');
    console.log(`OpenAI: Main prompt sample (first 500 chars): ${promptSample}`);
    console.log(`OpenAI: Main prompt length: ${prompt.length} characters`);

    // Add each image as a separate message with proper structure
    const includedImages = [];
    for (const type of ['main', 'age', 'signature']) {
      if (images[type] && typeof images[type] === 'string' && images[type].startsWith('http')) {
        messages.push({
          role: "user",
          content: await buildMessageContent(`Analyzing ${type} image:`, images[type])
        });
        includedImages.push(type);
      }
    }
    
    if (includedImages.length > 0) {
      console.log(`OpenAI: Including ${includedImages.length} images: ${includedImages.join(', ')}`);
    } else {
      console.log('OpenAI: No images included in this request');
    }

    const requestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    };

    console.log(`OpenAI: Sending request with ${messages.length} message blocks`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    const content = data.choices[0].message.content.trim();
    console.log('Content generated successfully');
    const responseSample = content.substring(0, 300) + (content.length > 300 ? '...' : '');
    console.log(`OpenAI: Response sample (first 300 chars): ${responseSample}`);
    console.log(`OpenAI: Response length: ${content.length} characters`);
    console.log(`OpenAI: Tokens used - prompt: ${data.usage?.prompt_tokens || 'unknown'}, completion: ${data.usage?.completion_tokens || 'unknown'}, total: ${data.usage?.total_tokens || 'unknown'}`);
    
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

module.exports = {
  generateContent,
  generateStructuredMetadata
};