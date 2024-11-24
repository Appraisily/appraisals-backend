const fetch = require('node-fetch');
const config = require('../config');

async function generateContent(prompt, postTitle, images) {
  try {
    console.log('Generating content with OpenAI...');
    console.log('Title:', postTitle);

    const messages = [
      {
        role: "system",
        content: "You are a professional art expert specializing in appraisals and artwork analysis."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Title: ${postTitle}\n\n${prompt}` }
        ]
      }
    ];

    // Add images to the message if they exist and are valid URLs
    if (images) {
      if (images.main) {
        messages[1].content.push({
          type: "image_url",
          image_url: { url: images.main }
        });
      }
      if (images.age) {
        messages[1].content.push({
          type: "image_url",
          image_url: { url: images.age }
        });
      }
      if (images.signature) {
        messages[1].content.push({
          type: "image_url",
          image_url: { url: images.signature }
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
        model: 'gpt-4-vision-preview',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
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