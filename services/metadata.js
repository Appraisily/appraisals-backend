const { generateContent } = require('./openai');
const { updateWordPressMetadata } = require('./wordpress');
const fs = require('fs').promises;
const path = require('path');

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

async function processMetadataField(postId, fieldName, postTitle, images = {}) {
  try {
    console.log(`Processing field: ${fieldName}`);
    console.log(`Available images for ${fieldName}:`, Object.keys(images).filter(key => images[key]));

    const prompt = await getPrompt(fieldName);
    if (!prompt) {
      throw new Error(`Prompt file not found for ${fieldName}`);
    }

    const content = await generateContent(prompt, postTitle, images);
    if (!content) {
      throw new Error(`No content generated for ${fieldName}`);
    }

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

async function processAllMetadata(postId, postTitle, images = {}) {
  try {
    const availablePrompts = await getAvailablePrompts();
    console.log(`Processing ${availablePrompts.length} metadata fields for post ${postId}`);
    console.log('Available images:', Object.keys(images).filter(key => images[key]));

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