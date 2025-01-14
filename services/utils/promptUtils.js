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

function buildContextualPrompt(prompt, context) {
  if (Object.keys(context).length === 0) {
    return prompt;
  }

  return `Previous content generated for this report:\n\n${
    Object.entries(context)
      .map(([field, content]) => `${field}:\n${content}\n`)
      .join('\n')
  }\n\nUsing the context above and maintaining consistency, ${prompt}`;
}

module.exports = {
  getPrompt,
  buildContextualPrompt
};