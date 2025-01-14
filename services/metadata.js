const { generateContent } = require('./openai');
const { updateWordPressMetadata, getPost } = require('./wordpress');
const { getPrompt, buildContextualPrompt } = require('./utils/promptUtils');
const { PROMPT_PROCESSING_ORDER, REPORT_INTRODUCTION } = require('./constants/reportStructure');
const staticMetadata = require('./constants/staticMetadata');

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

    // Update WordPress with generated content
    await updateWordPressMetadata(postId, fieldName, content);

    // After content generation, update static metadata if needed
    await updateStaticMetadata(postId, fieldName);
    
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

async function updateStaticMetadata(postId, fieldName) {
  try {
    // Get post data to check appraisal type
    const postData = await getPost(postId, ['acf']);
    const appraisalType = postData.acf?.appraisaltype?.toLowerCase() || 'regular';

    // Get metadata content for the appraisal type
    let metadataContent;
    switch (appraisalType) {
      case 'irs':
        metadataContent = staticMetadata.irs;
        break;
      case 'insurance':
        metadataContent = staticMetadata.insurance;
        break;
      default:
        metadataContent = staticMetadata.regular;
    }

    if (!metadataContent) {
      console.warn(`No static metadata found for appraisal type: ${appraisalType}`);
      return;
    }

    // Direct mapping between WordPress fields and static metadata fields
    const fieldMapping = {
      'introduction': {
        metadataField: 'Introduction',
        required: true
      },
      'image_analysis': {
        metadataField: 'ImageAnalysisText',
        required: true
      },
      'signature_analysis': {
        metadataField: 'SignatureText',
        required: true
      },
      'valuation_method': {
        metadataField: 'ValuationText',
        required: true
      },
      'appraiser_info': {
        metadataField: 'AppraiserText',
        required: true
      },
      'liability_conflict': {
        metadataField: 'LiabilityText',
        required: true
      },
      'selling_guide': {
        metadataField: 'SellingGuideText',
        required: true
      }
    };

    // Get the mapping for the current field
    const mapping = fieldMapping[fieldName];
    if (mapping) {
      const content = metadataContent[mapping.metadataField];
      if (content) {
        await updateWordPressMetadata(postId, fieldName, content);
        console.log(`Updated static metadata for ${fieldName} (${appraisalType} type)`);
      } else if (mapping.required) {
        console.error(`Required static metadata missing: ${mapping.metadataField} for ${appraisalType} type`);
      }
    }
  } catch (error) {
    console.error(`Error updating static metadata for ${fieldName}:`, error);
    throw error;
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