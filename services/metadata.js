const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { generateContent } = require('./openai');
const config = require('../config');
const vision = require('@google-cloud/vision');
const { getImageUrl } = require('./wordpress');
const { getPrompt, buildContextualPrompt } = require('./utils/promptUtils');
const { PROMPT_PROCESSING_ORDER } = require('./constants/reportStructure');
const { performContextualSearch } = require('./serper');

let visionClient;

function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: 'civil-forge-403609'
    });
  } catch (error) {
    throw error;
  }
}

async function processMainImageWithGoogleVision(postId) {
  try {
    if (!visionClient) {
      initializeVisionClient();
    }

    // Check if gallery is already populated
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const postData = await response.json();
    
    // Check gallery population status
    if (postData.acf?._gallery_populated === '1' && Array.isArray(postData.acf?.googlevision)) {
      console.log('Vision: Gallery already populated');
      return {
        success: true,
        message: 'Gallery already populated',
        similarImagesCount: postData.acf.googlevision.length
      };
    }

    // Get main image URL
    const mainImageUrl = await getImageUrl(postData.acf?.main);
    if (!mainImageUrl) {
      console.log('Vision: Main image not found');
      throw new Error('Main image not found in post');
    }

    console.log('Vision: Analyzing main image');

    // Analyze image with Vision API
    const [result] = await visionClient.webDetection(mainImageUrl);
    const webDetection = result.webDetection;

    if (!webDetection?.visuallySimilarImages?.length) {
      console.log('Vision: No similar images found');
      return {
        success: true,
        message: 'No similar images found',
        similarImagesCount: 0
      };
    }

    // Upload similar images to WordPress
    const uploadedImageIds = [];
    for (const image of webDetection.visuallySimilarImages) {
      console.log('Vision: Processing similar image');
      const imageId = await uploadImageToWordPress(image.url);
      if (imageId) {
        uploadedImageIds.push(imageId);
      }
    }

    if (uploadedImageIds.length > 0) {
      console.log(`Vision: Uploading ${uploadedImageIds.length} images to gallery`);
      await updateWordPressGallery(postId, uploadedImageIds);
    }

    return {
      success: true,
      similarImagesCount: uploadedImageIds.length,
      uploadedImageIds
    };
  } catch (error) {
    console.log('Vision analysis error:', error.message);
    return {
      success: false,
      message: error.message,
      similarImagesCount: 0
    };
  }
}

async function processAllMetadata(postId, postTitle, { postData, images }) {
  console.log('Processing all metadata fields for post:', postId);
  const results = [];
  const context = {};
  
  // Perform contextual search using SERPER at the beginning
  // This will be used for all field generations
  let searchResults = null;
  try {
    console.log('Initiating contextual search for title:', postTitle);
    searchResults = await performContextualSearch(postTitle);
    if (searchResults.success) {
      console.log('Contextual search completed successfully');
      // Store search results in WordPress for reference/debugging
      await updateWordPressMetadata(postId, 'serper_search_results', JSON.stringify({
        query: searchResults.searchQuery,
        timestamp: new Date().toISOString(),
        success: true,
        results: searchResults.searchResults
      }));
    } else {
      console.warn('Contextual search failed:', searchResults.error);
      // Still store the error for reference
      await updateWordPressMetadata(postId, 'serper_search_results', JSON.stringify({
        timestamp: new Date().toISOString(),
        success: false,
        error: searchResults.error
      }));
    }
  } catch (searchError) {
    console.error('Error during contextual search:', searchError);
    searchResults = null;
  }

  for (const field of PROMPT_PROCESSING_ORDER) {
    try {
      console.log(`Processing field: ${field}`);
      // Get the base prompt 
      const basePrompt = await getPrompt(field);
      
      // Build the full contextual prompt with previous content and search results
      const prompt = buildContextualPrompt(basePrompt, context, searchResults);
      
      // Log if we're using search results for this field
      if (searchResults && searchResults.success) {
        console.log(`Using search results for field: ${field}`);
      }
      
      // Generate content using OpenAI
      const content = await generateContent(prompt, postTitle, images);
      
      // Store generated content in context for next fields
      context[field] = content;
      
      // Update WordPress with generated content
      await updateWordPressMetadata(postId, field, content);
      
      results.push({
        field,
        status: 'success'
      });
    } catch (error) {
      console.error(`Error processing field ${field}:`, error);
      results.push({
        field,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

async function uploadImageToWordPress(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = await response.buffer();
    const filename = `similar-image-${uuidv4()}.jpg`;

    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: response.headers.get('content-type') || 'image/jpeg'
    });

    let uploadResponseText;
    const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        'Accept': 'application/json'
      },
      body: form
    });

    uploadResponseText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      return null;
    }

    let mediaData;
    try {
      mediaData = JSON.parse(uploadResponseText);
    } catch (error) {
      return null;
    }

    if (!mediaData || !mediaData.id) {
      return null;
    }

    return mediaData.id;
  } catch (error) {
    console.error('Stack:', error.stack);
    return null;
  }
}

async function updateWordPressGallery(postId, imageIds) {
  try {
    console.log(`Updating gallery for post ${postId} with image IDs:`, imageIds);

    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          googlevision: imageIds.map(id => id.toString()),
          _gallery_populated: '1'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error updating gallery: ${await response.text()}`);
    }

    console.log(`Gallery updated for post ${postId} with ${imageIds.length} images`);
    return true;
  } catch (error) {
    console.error('Error updating WordPress gallery:', error);
    throw error;
  }
}

async function updateWordPressMetadata(postId, metadataKey, metadataValue) {
  try {
    console.log(`Updating metadata for post ${postId}, field: ${metadataKey}`);
    
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        acf: {
          [metadataKey]: metadataValue
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error updating metadata: ${await response.text()}`);
    }

    console.log(`Successfully updated metadata for post ${postId}, field: ${metadataKey}`);
    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    throw error;
  }
}

async function processJustificationMetadata(postId, postTitle, value) {
  try {
    console.log('Processing justification metadata for post:', postId);
    
    // Make request to valuer agent
    const response = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/justify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: postTitle,
        value: parseFloat(value)
      })
    });

    if (!response.ok) {
      throw new Error(`Valuer agent error: ${await response.text()}`);
    }

    const auctionData = await response.json();
    
    // Get justification prompt
    const prompt = await getPrompt('justification');
    
    // Perform contextual search specifically for justification
    let searchResults = null;
    try {
      // Create a more targeted search specifically for valuation
      const searchQuery = `${postTitle} auction value ${value}`;
      console.log('Justification - Performing targeted search for valuation data:', searchQuery);
      
      // Call SERPER API directly since we have a specific query
      const { searchGoogle, formatSearchResults } = require('./serper');
      const googleResults = await searchGoogle(searchQuery);
      searchResults = {
        success: true,
        searchQuery,
        formattedContext: formatSearchResults(googleResults)
      };
      
      console.log('Justification - Search results received');
    } catch (searchError) {
      console.error('Justification - Error during search:', searchError);
      searchResults = null;
    }
    
    // Build the final prompt with auction data and search results
    let finalPrompt = `${prompt}\n\nAuction Data: ${JSON.stringify(auctionData, null, 2)}`;
    
    if (searchResults && searchResults.formattedContext) {
      finalPrompt += `\n\n${searchResults.formattedContext}\n\nUsing both the auction data and search results above, please generate a detailed justification for the valuation.`;
      console.log('Justification - Using search results to enhance justification');
    }
    
    // Debug log the full prompt and auction data
    console.log('Justification - Full Prompt:', prompt);
    console.log('Justification - Auction Data:', JSON.stringify(auctionData, null, 2));
    console.log('Justification - Search Query:', searchResults?.searchQuery || 'None');
    
    // Generate content using GPT-4o with auction data and search results
    const content = await generateContent(
      finalPrompt,
      postTitle,
      {},
      'o3-mini'
    );
    
    // Update WordPress with generated content
    await updateWordPressMetadata(postId, 'justification_html', content);
    
    // Also store the search results used for justification separately
    if (searchResults && searchResults.success) {
      await updateWordPressMetadata(postId, 'justification_search_results', JSON.stringify({
        query: searchResults.searchQuery,
        timestamp: new Date().toISOString()
      }));
    }
    
    return {
      field: 'justification_html',
      status: 'success'
    };
  } catch (error) {
    console.error('Error processing justification:', error);
    return {
      field: 'justification_html',
      status: 'error',
      error: error.message
    };
  }
}

module.exports = {
  processMainImageWithGoogleVision,
  processAllMetadata,
  processJustificationMetadata,
  initializeVisionClient
};