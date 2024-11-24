const { generateContent } = require('./openai');
const { updateWordPressMetadata } = require('./wordpress');
const fs = require('fs').promises;
const path = require('path');

// Get prompt from file
async function getPrompt(custom_post_type_name) {
  const promptsDir = path.join(__dirname, '..', 'prompts');
  const promptFilePath = path.join(promptsDir, `${custom_post_type_name}.txt`);
  try {
    return await fs.readFile(promptFilePath, 'utf8');
  } catch (error) {
    console.error(`Error reading prompt file for ${custom_post_type_name}:`, error);
    throw error;
  }
}

// Get all available prompts
async function getAvailablePrompts() {
  const promptsDir = path.join(__dirname, '..', 'prompts');
  try {
    const files = await fs.readdir(promptsDir);
    return files
      .filter(file => path.extname(file).toLowerCase() === '.txt')
      .map(file => path.basename(file, '.txt'));
  } catch (error) {
    console.error('Error reading prompts directory:', error);
    throw error;
  }
}

// Process single metadata field
async function processMetadataField(postId, fieldName, postTitle, images) {
  try {
    console.log(`Processing field: ${fieldName}`);
    const prompt = await getPrompt(fieldName);
    const content = await generateContent(prompt, postTitle, images);
    await updateWordPressMetadata(postId, fieldName, content);
    return {
      field: fieldName,
      status: 'success'
    };
  } catch (error) {
    console.error(`Error processing ${fieldName}:`, error);
    return {
      field: fieldName,
      status: 'error',
      error: error.message
    };
  }
}

// Process all metadata fields
async function processAllMetadata(postId, postTitle, images) {
  try {
    const availablePrompts = await getAvailablePrompts();
    console.log(`Processing ${availablePrompts.length} metadata fields for post ${postId}`);

    const results = await Promise.all(
      availablePrompts.map(fieldName => 
        processMetadataField(postId, fieldName, postTitle, images)
      )
    );

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log(`Metadata processing complete. Success: ${successful}, Failed: ${failed}`);
    return results;
  } catch (error) {
    console.error('Error processing metadata:', error);
    throw error;
  }
}

module.exports = {
  processAllMetadata,
  processMetadataField
};