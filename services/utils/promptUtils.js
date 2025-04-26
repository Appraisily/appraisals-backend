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

  // Incorporate detailed title if available
  if (context.detailedTitle) {
    // Only add the detailed title at the beginning of the prompt
    // if it's not already being handled by the calling function
    if (!contextualPrompt.includes('Detailed Description:')) {
      contextualPrompt = `Detailed Description: ${context.detailedTitle}\n\n${contextualPrompt}`;
      console.log('PromptUtils: Added detailed title to prompt');
    }
  }

  // Add appraisal type context if available
  if (context.appraisalType && context.appraisalType !== 'regular') {
    contextualPrompt = `This is a ${context.appraisalType.toUpperCase()} appraisal.\n\n${contextualPrompt}`;
    console.log(`PromptUtils: Added appraisal type (${context.appraisalType.toUpperCase()}) to prompt`);
  }

  // Add previous generated content (filtered to exclude detailedTitle and appraisalType)
  const contentEntries = Object.entries(context)
    .filter(([key]) => !['detailedTitle', 'appraisalType'].includes(key));
    
  if (contentEntries.length > 0) {
    console.log(`PromptUtils: Adding ${contentEntries.length} previous content fields to prompt: ${contentEntries.map(([field]) => field).join(', ')}`);
    contextualPrompt = `Previous content generated for this report:\n\n${
      contentEntries
        .map(([field, content]) => `${field}:\n${content}\n`)
        .join('\n')
    }\n\nUsing the context above and maintaining consistency, ${prompt}`;
  }
  
  // Add search results if available
  if (searchResults && searchResults.formattedContext) {
    contextualPrompt = `${contextualPrompt}\n\nWeb Search Results:\n${searchResults.formattedContext}\n\nUsing the search results above to inform your content where relevant, please generate the requested section.`;
    
    console.log('PromptUtils: Added search results to prompt');
    // Log the query that generated these results
    if (searchResults.searchQuery) {
      console.log('PromptUtils: Search query used:', searchResults.searchQuery);
    }

    // Log a sample of the search results (first 500 chars)
    const searchSample = searchResults.formattedContext.substring(0, 500) + (searchResults.formattedContext.length > 500 ? '...' : '');
    console.log(`PromptUtils: Search results sample: ${searchSample}`);
  }

  // Log the first 500 chars of the final prompt
  const promptSample = contextualPrompt.substring(0, 500) + (contextualPrompt.length > 500 ? '...' : '');
  console.log(`PromptUtils: Final prompt (first 500 chars): ${promptSample}`);
  console.log(`PromptUtils: Total prompt length: ${contextualPrompt.length} characters`);

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