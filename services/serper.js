const fetch = require('node-fetch');
// const { generateContent } = require('./openai'); // Remove unused generateContent
// const { getSecret } = require('../config'); // Remove unused getSecret

// Function to generate a search query (max 5 words) using OpenAI
async function generateSearchQuery(title) {
  try {
    console.log('SERPER: Generating search query from title:', title);
    
    const prompt = `
    Based on this artwork title, generate a concise search query (maximum 5 words) that would 
    help find similar artworks or relevant information about this type of art on Google:
    
    "${title}"
    
    Provide ONLY the search query with no additional text, punctuation, or explanation.
    The query should identify the most distinctive elements of the artwork.
    `;
    
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant that converts art titles into concise search queries. Respond with ONLY the search query (max 5 words). No explanation or additional text."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 20,
        temperature: 0.3
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
    
    const query = data.choices[0].message.content.trim();
    console.log('SERPER: Generated search query:', query);
    return query;
  } catch (error) {
    console.error('SERPER: Error generating search query:', error);
    // Fallback to title if error occurs, limited to 5 words
    const fallbackQuery = title.split(' ').slice(0, 5).join(' ');
    console.log('SERPER: Using fallback query:', fallbackQuery);
    return fallbackQuery;
  }
}

// Function to search Google using SERPER API
async function searchGoogle(query) {
  try {
    console.log('SERPER: Searching Google for:', query);
    
    if (!process.env.SERPER_API) {
      throw new Error('SERPER_API key not loaded from secrets');
    }
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: 5 // Limit to top 5 results
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SERPER API error: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('SERPER: Search results:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('SERPER: Error searching Google:', error);
    // Return empty results object if search fails
    return { organic: [], knowledgeGraph: {} };
  }
}

// Function to format search results into a context string
function formatSearchResults(results) {
  try {
    console.log('SERPER: Formatting search results');
    
    if (!results || (!results.organic && !results.knowledgeGraph)) {
      return '';
    }
    
    let formattedResults = 'Related information from web search:\n\n';
    
    // Add knowledge graph if available
    if (results.knowledgeGraph && Object.keys(results.knowledgeGraph).length > 0) {
      const kg = results.knowledgeGraph;
      formattedResults += 'Knowledge Graph:\n';
      if (kg.title) formattedResults += `- Title: ${kg.title}\n`;
      if (kg.type) formattedResults += `- Type: ${kg.type}\n`;
      if (kg.description) formattedResults += `- Description: ${kg.description}\n`;
      if (kg.attributes && Object.keys(kg.attributes).length > 0) {
        formattedResults += '- Attributes:\n';
        for (const [key, value] of Object.entries(kg.attributes)) {
          formattedResults += `  - ${key}: ${value}\n`;
        }
      }
      formattedResults += '\n';
    }
    
    // Add organic results
    if (results.organic && results.organic.length > 0) {
      formattedResults += 'Top search results:\n';
      for (let i = 0; i < Math.min(results.organic.length, 3); i++) {
        const result = results.organic[i];
        formattedResults += `- ${result.title}\n`;
        if (result.snippet) formattedResults += `  ${result.snippet}\n`;
        formattedResults += '\n';
      }
    }
    
    console.log('SERPER: Formatted results length:', formattedResults.length);
    return formattedResults;
  } catch (error) {
    console.error('SERPER: Error formatting search results:', error);
    return '';
  }
}

// Main function to perform the entire search workflow
async function performContextualSearch(title) {
  console.log('SERPER: Starting contextual search for:', title);
  
  try {
    // Step 1: Generate search query from title
    const searchQuery = await generateSearchQuery(title);
    
    // Step 2: Search Google using the generated query
    const searchResults = await searchGoogle(searchQuery);
    
    // Step 3: Format search results into context
    const formattedContext = formatSearchResults(searchResults);
    
    return {
      success: true,
      searchQuery,
      searchResults,
      formattedContext
    };
  } catch (error) {
    console.error('SERPER: Error in contextual search workflow:', error);
    return {
      success: false,
      error: error.message,
      searchQuery: '',
      searchResults: {},
      formattedContext: ''
    };
  }
}

module.exports = {
  generateSearchQuery,
  searchGoogle,
  formatSearchResults,
  performContextualSearch
};