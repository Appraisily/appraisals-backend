const fetch = require('node-fetch');
const config = require('../config');

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
  generateContent
};