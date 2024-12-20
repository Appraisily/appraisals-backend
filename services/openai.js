const fetch = require('node-fetch');
const config = require('../config');

async function generateContent(prompt, postTitle, images = {}) {
  try {
    console.log('Generating content with OpenAI...');
    
    // Extract valid image URLs (main, age, signature only)
    const validImages = ['main', 'age', 'signature']
      .filter(type => images[type] && typeof images[type] === 'string' && images[type].startsWith('http'))
      .map(type => ({ type, url: images[type] }));
    
    console.log('Valid images for content generation:', 
      validImages.map(img => img.type)
    );

    const messages = [
      {
        role: "system",
        content: "You are a professional art expert specializing in appraisals and artwork analysis."
      },
      { 
        role: "user",
        content: `Title: ${postTitle}\n\n${prompt}`
      }
    ];

    // Add image references as separate messages
    if (validImages.length > 0) {
      validImages.forEach(({ type, url }) => {
        messages.push({
          role: "user",
          content: `Image (${type}): ${url}`
        });
      });
      console.log(`Added ${validImages.length} images to OpenAI request`);
    } else {
      console.log('No valid images available for content generation');
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
        max_tokens: 1000,
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
