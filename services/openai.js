const fetch = require('node-fetch');
const config = require('../config');

async function buildMessageContent(prompt, imageUrl, type) {
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

async function generateContent(prompt, postTitle, images = {}) {
  try {
    console.log('Generating content with OpenAI...');
    
    const messages = [{
      role: "system",
      content: [{
        type: "text",
        text: "You are a professional art expert specializing in appraisals and artwork analysis."
      }]
    }];

    // Add title and prompt as first user message
    messages.push({
      role: "user",
      content: await buildMessageContent(`Title: ${postTitle}\n\n${prompt}`)
    });

    // Add each image as a separate message with proper structure
    for (const type of ['main', 'age', 'signature']) {
      if (images[type] && typeof images[type] === 'string' && images[type].startsWith('http')) {
        messages.push({
          role: "user",
          content: await buildMessageContent(`Analyzing ${type} image:`, images[type])
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7
      })
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
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

module.exports = {
  generateContent
};
