// services/openai.js
const fetch = require('node-fetch');
const config = require('../config');

async function generateContent(prompt, postTitle, images) {
  try {
    console.log('Generating content with OpenAI...');
    console.log('Title:', postTitle);
    console.log('Images:', JSON.stringify(images));

    const messages = [
      {
        role: "system",
        content: "You are a professional art expert."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Title: ${postTitle}` }
        ]
      }
    ];

    // Add images to the message if they exist and are valid URLs
    if (images.main) messages[1].content.push({ type: "image_url", image_url: { url: images.main } });
    if (images.age) messages[1].content.push({ type: "image_url", image_url: { url: images.age } });
    if (images.signature) messages[1].content.push({ type: "image_url", image_url: { url: images.signature } });

    // Add the prompt as the final text content
    messages[1].content.push({ type: "text", text: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Content generated successfully');
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

module.exports = {
  generateContent
};