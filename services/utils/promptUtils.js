const fs = require('fs').promises;
const path = require('path');

async function getPrompt(custom_post_type_name) {
  const promptsDir = path.join(__dirname, '..', '..', 'prompts');
  const promptFilePath = path.join(promptsDir, `${custom_post_type_name}.txt`);
  
  console.log(`Attempting to load prompt from: ${promptFilePath}`);
  
  try {
    const promptContent = await fs.readFile(promptFilePath, 'utf8');
    if (!promptContent) {
      throw new Error('Empty prompt file');
    }
    console.log(`Successfully loaded prompt for ${custom_post_type_name}`);
    return promptContent;
  } catch (error) {
    console.error(`Error reading prompt file for ${custom_post_type_name}:`, {
      error: error.message,
      path: promptFilePath,
      exists: await fs.access(promptFilePath).then(() => true).catch(() => false)
    });
    throw error;
  }
}

function buildContextualPrompt(prompt, context, searchResults = null) {
  let contextualPrompt = prompt;

  // Add previous generated content
  if (Object.keys(context).length > 0) {
    contextualPrompt = `Previous content generated for this report:\n\n${
      Object.entries(context)
        .map(([field, content]) => `${field}:\n${content}\n`)
        .join('\n')
    }\n\nUsing the context above and maintaining consistency, ${prompt}`;
  }
  
  // Add search results if available
  if (searchResults && searchResults.formattedContext) {
    contextualPrompt = `${contextualPrompt}\n\n${searchResults.formattedContext}\n\nUsing the search results above to inform your content where relevant, please generate the requested section.`;
    
    console.log('PromptUtils: Added search results to prompt');
    // Log the query that generated these results
    if (searchResults.searchQuery) {
      console.log('PromptUtils: Search query used:', searchResults.searchQuery);
    }
  }

  return contextualPrompt;
}

// Helper to enhance prompt with only search context
function addSearchContextToPrompt(prompt, searchResults) {
  if (!searchResults || !searchResults.formattedContext) {
    return prompt;
  }
  
  return `${prompt}\n\n${searchResults.formattedContext}\n\nConsider the search results above when generating content where relevant.`;
}

module.exports = {
  getPrompt,
  buildContextualPrompt,
  addSearchContextToPrompt
};