const fs = require('fs').promises;
const path = require('path');

async function getPrompt(custom_post_type_name) {
  const promptsDir = path.join(__dirname, '..', '..', 'prompts');
  const promptFilePath = path.join(promptsDir, `${custom_post_type_name}.txt`);
  try {
    return await fs.readFile(promptFilePath, 'utf8');
  } catch (error) {
    console.error(`Error reading prompt file for ${custom_post_type_name}:`, error);
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