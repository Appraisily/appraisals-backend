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
    console.log('=== LOADED PROMPT ===');
    console.log(`Type: ${custom_post_type_name}`);
    console.log('Content:');
    console.log(promptContent);
    console.log('===================');
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
const STYLE_GUIDANCE = `Style: Provide concise, confident, and well-structured text without self-referential disclaimers (e.g., "I cannot see the image" or "I'm unable to determine…"). If direct evidence is not provided, logically infer or leave it out succinctly.
No Apologies or Personal Inability: Do not state disclaimers about lacking data or being unable to analyze images. Simply produce the best possible text under the assumption that enough context was provided.
No Extra Headings: Avoid adding headings or subtitles beyond what the user's prompt explicitly requires.
Stay on Topic: Write text as if you have full authority on the matter, focusing on the content requested.
Structure: Output in well-formed paragraphs without extraneous labeling like "Introduction," "Conclusion," or "Analysis of the Collectible."
Length: Keep the text within the length or paragraph constraints specified by the user's prompt.
Objective: Provide thorough but succinct text that adheres to the context (e.g., analyzing age, style, or condition) while omitting disclaimers about missing info.\n\n`;

function buildContextualPrompt(prompt, context) {
  if (Object.keys(context).length === 0) {
    return STYLE_GUIDANCE + prompt;
  }

  return `Previous content generated for this report:\n\n${
    Object.entries(context)
      .map(([field, content]) => `${field}:\n${content}\n`)
      .join('\n')
  }\n\n${STYLE_GUIDANCE}Using the context above and maintaining consistency, ${prompt}`;
}

module.exports = {
  getPrompt,
  buildContextualPrompt
};