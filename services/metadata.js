const { generateContent } = require('./openai');
const { updateWordPressMetadata } = require('./wordpress');
const { getPrompt, buildContextualPrompt } = require('./utils/promptUtils');
const { PROMPT_PROCESSING_ORDER, REPORT_INTRODUCTION } = require('./constants/reportStructure');

async function processMetadataField(postId, fieldName, postTitle, images = {}, context = {}) {
  try {
    console.log(`Processing field: ${fieldName}`);
    
    console.log(`Available images for ${fieldName}:`, 
      Object.entries(images)
        .filter(([_, url]) => url)
        .map(([type]) => type)
    );

    const prompt = await getPrompt(fieldName);
    if (!prompt) {
      throw new Error(`Prompt file not found for ${fieldName}`);
    }

    // Add report introduction to context for the first field
    if (fieldName === PROMPT_PROCESSING_ORDER[0]) {
      context.introduction = REPORT_INTRODUCTION;
    }

    // Build contextual prompt with previous generations
    const contextualPrompt = buildContextualPrompt(prompt, context);

    const content = await generateContent(contextualPrompt, postTitle, images);
    if (!content) {
      throw new Error(`No content generated for ${fieldName}`);
    }

    await updateWordPressMetadata(postId, fieldName, content);
    
    return {
      field: fieldName,
      status: 'success',
      content
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

async function processAllMetadata(postId, postTitle, postData) {
  try {
    console.log(`Processing metadata fields for post ${postId} in specified order`);
    
    // Extract only the image URLs we need from postData
    const images = {
      main: postData.images?.main,
      age: postData.images?.age,
      signature: postData.images?.signature
    };
    
    console.log('Available images:', Object.keys(images).filter(key => images[key]));

    const context = {};
    const results = [];

    for (const fieldName of PROMPT_PROCESSING_ORDER) {
      const result = await processMetadataField(postId, fieldName, postTitle, images, context);
      results.push(result);

      // Add successful generations to context for next iterations
      if (result.status === 'success' && result.content) {
        context[fieldName] = result.content;
      }
    }

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