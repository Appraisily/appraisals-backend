const fetch = require('node-fetch');
const config = require('../config');

async function generateContent(prompt, postTitle, images = {}) {
  try {
    console.log('Generating content with OpenAI...');
    
    // Filter out invalid image URLs
    const validImages = Object.entries(images)
      .filter(([_, url]) => url && typeof url === 'string' && url.startsWith('http'))
      .map(([type, url]) => ({ type, url }));
    
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
        content: [ 
          { type: "text", text: `Title: ${postTitle}\n\n${prompt}` }
        ]
      }
    ];

    if (validImages.length > 0) {
      validImages.forEach(({ type, url }) => {
        messages[1].content.push({
          type: "image_url",
          image_url: { url }
        });
      });
      console.log(`Added ${validImages.length} images to OpenAI request`);
    } else {
      console.log('No valid images available for content generation');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', //gpt-4o is a new model advanced, that is more powerfull it is used as gpt-4-vision
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