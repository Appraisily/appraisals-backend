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
  
  // Get the appraisal type to use appropriate static metadata
  let appraisalType = 'regular';
  try {
    if (postData && postData.acf && postData.acf.appraisaltype) {
      // Normalize appraisal type
      const rawType = postData.acf.appraisaltype.toLowerCase();
      if (rawType === 'irs' || rawType === 'insurance') {
        appraisalType = rawType;
      }
      console.log(`Using appraisal type: ${appraisalType} (from WordPress ACF)`);
    } else {
      console.log(`Using default appraisal type: ${appraisalType}`);
    }
    
    // Add appraisal type to context for use in prompts
    context.appraisalType = appraisalType;
    
  } catch (typeError) {
    console.error('Error determining appraisal type:', typeError);
    // Default to regular if there's an error
    context.appraisalType = 'regular';
  }
  
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

  // Process main content fields first
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

  // Add the static metadata fields based on appraisal type
  try {
    console.log(`Adding static metadata content for appraisal type: ${appraisalType}`);
    const staticMetadata = require('./constants/staticMetadata');
    
    if (staticMetadata[appraisalType]) {
      const typeMetadata = staticMetadata[appraisalType];
      
      // Update WordPress with each static metadata field
      for (const [key, value] of Object.entries(typeMetadata)) {
        console.log(`Adding static metadata: ${key}`);
        await updateWordPressMetadata(postId, key, value);
        
        results.push({
          field: key,
          status: 'success (static)'
        });
      }
    } else {
      console.warn(`No static metadata found for type: ${appraisalType}`);
    }
  } catch (staticError) {
    console.error('Error adding static metadata:', staticError);
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
    
    // Validate inputs
    if (!postId) {
      throw new Error('Post ID is required');
    }
    
    if (!metadataKey) {
      throw new Error('Metadata key is required');
    }
    
    // Force convert postId to number if possible
    const numericPostId = parseInt(postId, 10);
    if (isNaN(numericPostId)) {
      throw new Error(`Invalid post ID: ${postId}`);
    }
    
    // Special handling for large metadata values
    let processedValue = metadataValue;
    const isString = typeof metadataValue === 'string';
    const isObject = typeof metadataValue === 'object' && metadataValue !== null;
    
    // Log value type and size for debugging
    if (isString) {
      console.log(`Metadata value for ${metadataKey} is string, length: ${metadataValue.length}`);
      // If string is too large, truncate it (WP API might have limits)
      if (metadataValue.length > 100000) {
        console.warn(`Truncating very large string value for ${metadataKey} (${metadataValue.length} chars)`);
        processedValue = metadataValue.substring(0, 100000) + '... [truncated]';
      }
    } else if (isObject) {
      const jsonString = JSON.stringify(metadataValue);
      console.log(`Metadata value for ${metadataKey} is object, JSON size: ${jsonString.length}`);
      
      // If JSON is too large, truncate it
      if (jsonString.length > 100000) {
        console.warn(`Object too large for ${metadataKey}, reducing to essential data`);
        // Try to extract essential data or truncate as needed
        if (Array.isArray(metadataValue)) {
          // For arrays, limit number of items
          processedValue = metadataValue.slice(0, 10);
          if (metadataValue.length > 10) {
            console.log(`Array truncated from ${metadataValue.length} to 10 items`);
          }
        } else {
          // For objects, limit to a few key properties
          const simpleObj = {};
          let count = 0;
          for (const key in metadataValue) {
            if (count < 20) {
              simpleObj[key] = metadataValue[key];
              count++;
            } else {
              break;
            }
          }
          processedValue = simpleObj;
          console.log(`Object properties truncated to ${count} items`);
        }
      }
    }
    
    console.log(`Making WordPress API request for ${metadataKey}`);
    const requestBody = {
      acf: {
        [metadataKey]: processedValue
      }
    };
    
    const apiUrl = `${config.WORDPRESS_API_URL}/appraisals/${numericPostId}`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WordPress API error (${response.status}): ${errorText}`);
      throw new Error(`Error updating metadata: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`Successfully updated metadata for post ${postId}, field: ${metadataKey}`);
    
    // Verify the update was successful
    if (responseData && responseData.acf && responseData.acf[metadataKey] !== undefined) {
      console.log(`WordPress confirmed field ${metadataKey} was updated`);
    } else {
      console.warn(`WordPress response does not confirm field ${metadataKey} was updated`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating WordPress metadata for ${metadataKey}:`, error);
    console.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}

async function processJustificationMetadata(postId, postTitle, value) {
  try {
    // Add detailed tracing for better debugging
    console.log(`=== JUSTIFICATION PROCESS START ===`);
    console.log(`Post ID: ${postId}`);
    console.log(`Post Title: ${postTitle}`);
    console.log(`Appraisal Value: ${value}`);
    
    // Validate value
    if (!value) {
      throw new Error('Cannot process justification metadata: Value is required');
    }
    
    let numericValue;
    try {
      numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        throw new Error('Invalid numeric value');
      }
    } catch (valueError) {
      throw new Error(`Cannot process value: ${valueError.message}`);
    }
    
    console.log(`Processing justification for value: ${numericValue}`);
    
    // Make request to valuer agent
    console.log('Sending request to valuer agent');
    const response = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/justify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: postTitle,
        value: numericValue
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from valuer agent:', errorText);
      throw new Error(`Valuer agent error: ${errorText}`);
    }

    const valuerResponse = await response.json();
    
    // Enhanced logging for valuer agent response
    console.log(`=== VALUER AGENT RESPONSE ===`);
    console.log(`Success: ${valuerResponse.success}`);
    
    // Extract explanation and auction results from the response
    const { explanation, auctionResults, success } = valuerResponse;
    
    if (!success) {
      throw new Error('Valuer agent returned unsuccessful response');
    }
    
    console.log(`Explanation Length: ${explanation.length} chars`);
    console.log(`Auction Results Count: ${auctionResults ? auctionResults.length : 0}`);
    if (auctionResults && auctionResults.length > 0) {
      console.log(`First Result: ${JSON.stringify(auctionResults[0]).substring(0, 200)}...`);
    }
    
    // Check consistency between post title and auction results
    const isConsistent = verifyResultsConsistency(postTitle, auctionResults);
    console.log(`Results consistency check: ${isConsistent ? 'PASSED' : 'FAILED'}`);
    
    if (!isConsistent) {
      console.warn(`Warning: Auction results may not be consistent with item "${postTitle}"`);
      await updateWordPressMetadata(postId, 'consistency_warning', `The auction results may not be relevant to the item "${postTitle}". Please verify the appraisal data.`);
    }
    
    // Save raw auction data first - this is critical for debugging
    console.log('Storing raw valuer agent data');
    try {
      await updateWordPressMetadata(postId, 'valuer_agent_data', JSON.stringify(valuerResponse));
      console.log('Raw valuer agent data stored successfully');
    } catch (rawDataError) {
      console.error('Error storing raw valuer agent data:', rawDataError);
      // Continue processing even if storing raw data fails
    }
    
    // Validate auction results
    if (!auctionResults || !Array.isArray(auctionResults) || auctionResults.length === 0) {
      console.warn('No auction results returned from valuer agent');
    } else {
      console.log(`Received ${auctionResults.length} auction results`);
      
      // Store auction results separately for better access
      try {
        await updateWordPressMetadata(postId, 'auction_results', JSON.stringify(auctionResults));
        console.log('Auction results stored separately for easier access');
      } catch (auctionDataError) {
        console.error('Error storing auction results:', auctionDataError);
      }
    }
    
    // Generate HTML table from auction results
    console.log('Generating auction results HTML table');
    
    // First, try to get enhanced statistics from the valuer-agent directly
    let statistics;
    let enhancedStats = null;
    let auctionTableHtml;
    
    try {
      console.log('Requesting enhanced statistics from valuer-agent service');
      const enhancedStatsResponse = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/enhanced-statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: postTitle,
          value: numericValue,
          limit: 20, // Limit to 20 comparable sales for UI display, but calculations use all available data
          minPrice: Math.floor(numericValue * 0.6), // Set minimum price to 60% of appraisal value
          maxPrice: Math.ceil(numericValue * 1.6)   // Set maximum price to 160% of appraisal value
        })
      });
      
      if (enhancedStatsResponse.ok) {
        const responseData = await enhancedStatsResponse.json();
        if (responseData.success && responseData.statistics) {
          console.log('Successfully retrieved enhanced statistics from valuer-agent');
          enhancedStats = responseData.statistics;
          
          // Generate table HTML using the enhanced stats
          auctionTableHtml = generateEnhancedAuctionTableHtml(enhancedStats);
          statistics = { enhancedStats };
        } else {
          console.warn('Enhanced statistics response was not successful:', responseData.message || 'Unknown error');
          // Fall back to local generation
          const tableResult = generateAuctionTableHtml(auctionResults, numericValue);
          auctionTableHtml = tableResult.tableHtml;
          statistics = tableResult.statistics;
        }
      } else {
        console.warn('Failed to fetch enhanced statistics:', await enhancedStatsResponse.text());
        // Fall back to local generation
        const tableResult = generateAuctionTableHtml(auctionResults, numericValue);
        auctionTableHtml = tableResult.tableHtml;
        statistics = tableResult.statistics;
      }
    } catch (enhancedStatsError) {
      console.error('Error fetching enhanced statistics:', enhancedStatsError);
      // Fall back to local generation
      const tableResult = generateAuctionTableHtml(auctionResults, numericValue);
      auctionTableHtml = tableResult.tableHtml;
      statistics = tableResult.statistics;
    }
    
    // Enhanced logging for statistics
    console.log(`=== STATISTICS PROCESSING ===`);
    if (statistics && statistics.enhancedStats) {
      console.log(`Generated Statistics: ${JSON.stringify(statistics.enhancedStats).substring(0, 200)}...`);
    } else {
      console.log(`No statistics generated`);
    }
    
    // Store auction table HTML separately
    try {
      await updateWordPressMetadata(postId, 'auction_table_html', auctionTableHtml);
      console.log('Auction table HTML stored separately');
    } catch (tableError) {
      console.error('Error storing auction table HTML:', tableError);
    }
    
    // Get justification prompt
    const prompt = await getPrompt('justification');
    
    // Perform contextual search specifically for justification
    let searchResults = null;
    try {
      // Create a more targeted search specifically for valuation
      const searchQuery = `${postTitle} auction value ${numericValue}`;
      console.log('Performing targeted search for valuation data:', searchQuery);
      
      // Call SERPER API directly since we have a specific query
      const { searchGoogle, formatSearchResults } = require('./serper');
      const googleResults = await searchGoogle(searchQuery);
      searchResults = {
        success: true,
        searchQuery,
        formattedContext: formatSearchResults(googleResults)
      };
      
      console.log('Search results received');
      
      // Store search results
      try {
        await updateWordPressMetadata(postId, 'justification_search_results', JSON.stringify({
          query: searchQuery,
          results: googleResults
        }));
      } catch (searchStoreError) {
        console.error('Error storing search results:', searchStoreError);
      }
    } catch (searchError) {
      console.error('Error during search:', searchError);
      searchResults = null;
    }
    
    // Store explanation text directly
    try {
      await updateWordPressMetadata(postId, 'justification_explanation', explanation);
      console.log('Explanation text stored successfully');
    } catch (explanationError) {
      console.error('Error storing explanation:', explanationError);
    }
    
    // Build the final prompt - include the explanation from valuer agent with improved instructions
    let finalPrompt = `${prompt}

IMPORTANT: The item being appraised is specifically "${postTitle}". This is the source of truth.

Valuer Agent Explanation: ${explanation}

Auction Data for "${postTitle}": ${JSON.stringify(auctionResults, null, 2)}`;
    
    if (searchResults && searchResults.formattedContext) {
      finalPrompt += `\n\nAdditional search results found:
${searchResults.formattedContext}

INSTRUCTIONS:
1. ONLY use the search results if they are directly relevant to "${postTitle}"
2. If search results refer to different items, DISREGARD them entirely
3. The justification must be about "${postTitle}" and nothing else
4. Base your analysis primarily on the auction data provided for "${postTitle}"
5. Your response should be a detailed explanation for why the value of $${numericValue} is justified for "${postTitle}"
`;
      console.log('Using search results to enhance justification with improved prompt');
    } else {
      finalPrompt += `\n\nGenerate a detailed justification for the valuation of "${postTitle}" at $${numericValue} based on the auction data provided.`;
    }
    
    // Generate only the introduction text using OpenAI
    // We'll append the auction table later
    finalPrompt += '\n\nYour response should be a detailed explanation that will be followed by a table of auction results, so please do not describe the specific auction results in detail, as they will be displayed in the table.';
    
    console.log('Generating introduction text...');
    const introductionText = await generateContent(
      finalPrompt,
      postTitle,
      {},
      'o3-mini'
    );
    
    // Store introduction text separately
    try {
      await updateWordPressMetadata(postId, 'justification_introduction', introductionText);
      console.log('Introduction text stored separately');
    } catch (introError) {
      console.error('Error storing introduction text:', introError);
    }
    
    // Combine the introduction text with the auction table
    // Format the value as currency
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
    
    const formattedValue = currencyFormatter.format(numericValue);
    
    const completeContent = `
      ${introductionText}
      
      <h3>Comparable Auction Results</h3>
      ${auctionTableHtml}
      
      <p><em>The valuation of ${formattedValue} is supported by the above auction results of similar items.</em></p>
    `;
    
    console.log('Complete content created with auction table');
    
    // Update WordPress with the combined content
    console.log('Updating WordPress with complete justification content');
    try {
      await updateWordPressMetadata(postId, 'justification_html', completeContent);
      console.log('Complete justification HTML stored successfully');
      
      // Store enhanced statistics for interactive charts with validation
      try {
        if (statistics && statistics.enhancedStats) {
          // Validate statistics data before storing
          const validatedStats = validateStatisticsData(statistics.enhancedStats);
          
          // Create a subset with the top 20 most relevant sales for UI display
          // But keep the full set for statistical calculations
          const displaySubset = { ...validatedStats };
          
          // Store full sales count and only display up to 20 most relevant sales in UI
          const fullSalesCount = validatedStats.comparable_sales.length;
          
          if (fullSalesCount > 20) {
            console.log(`Limiting UI display to 20 most relevant sales out of ${fullSalesCount}`);
            // Store only the top 20 comparable sales for UI display to avoid performance issues
            displaySubset.comparable_sales = validatedStats.comparable_sales.slice(0, 20);
            // Add a note about the total number of sales used for calculations
            displaySubset.total_sales_count = fullSalesCount;
          }
          
          // Ensure proper JSON encoding by strictly controlling the encoding process
          // This prevents issues with smart quotes and other problematic characters
          const safeJsonEncode = (obj) => {
            // Use a replacer function to handle problematic characters
            return JSON.stringify(obj, (key, value) => {
              // Handle string values specifically to prevent smart quotes issues
              if (typeof value === 'string') {
                // Replace smart quotes and other problematic characters
                return value.replace(/[\u2018\u2019\u201C\u201D]/g, match => {
                  // Map smart quotes to their ASCII equivalents
                  const replacements = {
                    '\u201C': '"', // Left double quote
                    '\u201D': '"', // Right double quote
                    '\u2018': "'", // Left single quote
                    '\u2019': "'"  // Right single quote
                  };
                  return replacements[match] || match;
                });
              }
              return value;
            });
          };
          
          const enhancedStatsJson = safeJsonEncode(displaySubset);
          
          // Log validation results
          console.log('Validating statistics data before storage');
          console.log('Original sales count:', statistics.enhancedStats.comparable_sales?.length || 0);
          console.log('Validated sales count:', validatedStats.comparable_sales.length);
          console.log('Display subset sales count:', displaySubset.comparable_sales.length);
          console.log('Using safe JSON encoding to prevent smart quotes issues');
          
          await updateWordPressMetadata(postId, 'statistics', enhancedStatsJson);
          console.log('Enhanced statistics data stored for interactive charts');
          
          // Use validated data for summary
          // Total count is either the full sales count or what's shown on the UI
          const totalItemsCount = validatedStats.total_count || fullSalesCount;
          
          const statsSummary = `
            <div class="statistics-summary">
              <p>Market analysis reveals ${totalItemsCount} comparable items with an average value of $${validatedStats.average_price.toLocaleString()}.</p>
              <p>Your item's value of $${validatedStats.value.toLocaleString()} places it in the ${validatedStats.percentile} percentile, with a ${validatedStats.price_trend_percentage} average annual growth rate.</p>
              <p>Market confidence: <strong>${validatedStats.confidence_level}</strong></p>
            </div>
          `;
          await updateWordPressMetadata(postId, 'statistics_summary', statsSummary);
          console.log('Statistics summary stored for market panel');
          
          // Test retrieval to verify data integrity
          try {
            const testResponse = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
              headers: {
                'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
              }
            });
            
            if (testResponse.ok) {
              const testData = await testResponse.json();
              if (testData.acf && testData.acf.statistics) {
                try {
                  const parsedStats = JSON.parse(testData.acf.statistics);
                  console.log('Verification: Statistics data successfully retrieved and parsed');
                } catch (parseError) {
                  console.error('Verification FAILED: Statistics data could not be parsed after storage');
                }
              } else {
                console.error('Verification FAILED: Statistics field not found in retrieved data');
              }
            } else {
              console.error('Verification FAILED: Could not retrieve post data');
            }
          } catch (verificationError) {
            console.error('Verification error:', verificationError);
          }
        }
      } catch (statsError) {
        console.error('Error storing enhanced statistics:', statsError);
        // Non-critical error, continue execution
      }
      
    } catch (completeContentError) {
      console.error('Error storing complete content:', completeContentError);
      throw completeContentError; // This is critical, so rethrow
    }
    
    console.log(`=== JUSTIFICATION PROCESS COMPLETE ===`);
    
    return {
      field: 'justification_html',
      status: 'success'
    };
  } catch (error) {
    console.error('Error processing justification:', error);
    // Try to store the error in WordPress for debugging
    try {
      await updateWordPressMetadata(postId, 'justification_error', JSON.stringify({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }));
    } catch (errorStoreError) {
      console.error('Error storing justification error:', errorStoreError);
    }
    
    return {
      field: 'justification_html',
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Generates an HTML table from enhanced statistics
 * @param {Object} enhancedStats - Enhanced statistics object from valuer-agent
 * @returns {string} HTML string containing the formatted table
 */
function generateEnhancedAuctionTableHtml(enhancedStats) {
  if (!enhancedStats || !enhancedStats.comparable_sales || enhancedStats.comparable_sales.length === 0) {
    return '<p>No comparable auction results found.</p>';
  }
  
  // Format the date in a readable format
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr || 'N/A';
    }
  };
  
  // Get top results for the display table (up to 5)
  const topResults = enhancedStats.comparable_sales.slice(0, 5);
  
  // Generate the HTML table
  const tableHtml = `
    <div class="auction-results-table">
      <table class="auction-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Auction House</th>
            <th>Date</th>
            <th>Price</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          ${topResults.map(result => `
            <tr class="${result.is_current ? 'current-item' : ''}">
              <td>${result.title || 'Unknown Item'}</td>
              <td>${result.house || 'N/A'}</td>
              <td>${formatDate(result.date)}</td>
              <td>USD ${result.price ? result.price.toLocaleString() : 'N/A'}</td>
              <td class="${result.diff && result.diff.startsWith('+') ? 'higher' : 'lower'}">${result.diff || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h4>Statistical Analysis</h4>
      <div class="statistics-container">
        <div class="statistics-box">
          <table class="statistics-table">
            <tbody>
              <tr>
                <th>Sample Size:</th>
                <td>${enhancedStats.count}</td>
                <th>Mean Price:</th>
                <td>$${enhancedStats.average_price.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Median Price:</th>
                <td>$${enhancedStats.median_price.toLocaleString()}</td>
                <th>Price Range:</th>
                <td>$${enhancedStats.price_min.toLocaleString()} - $${enhancedStats.price_max.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Standard Deviation:</th>
                <td>$${enhancedStats.standard_deviation.toLocaleString()}</td>
                <th>Coefficient of Variation:</th>
                <td>${enhancedStats.coefficient_of_variation.toFixed(2)}%</td>
              </tr>
              <tr>
                <th>Your Value Percentile:</th>
                <td>${enhancedStats.percentile}</td>
                <th>Confidence Level:</th>
                <td>${enhancedStats.confidence_level}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="price-distribution">
          <div class="histogram-container">
            <div class="histogram-bar">
              ${enhancedStats.histogram.map(bar => `
                <div class="bar-segment ${bar.contains_target ? 'contains-target' : ''}" 
                     style="height: ${bar.height}%; left: ${bar.position}%;"
                     title="$${bar.min.toLocaleString()} - $${bar.max.toLocaleString()}: ${bar.count} items">
                  <span class="bar-label">${bar.count}</span>
                </div>
              `).join('')}
            </div>
            <div class="histogram-baseline">
              <span class="min-value">$${enhancedStats.price_min.toLocaleString()}</span>
              <span class="target-marker" style="left: ${enhancedStats.target_marker_position}%;">
                ▲<br>Your Value<br>$${enhancedStats.value.toLocaleString()}
              </span>
              <span class="max-value">$${enhancedStats.price_max.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .auction-results-table {
          margin: 20px 0;
          overflow-x: auto;
        }
        .auction-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
          margin-bottom: 20px;
        }
        .auction-table th, .auction-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .auction-table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .auction-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .auction-table .higher {
          color: #28a745;
        }
        .auction-table .lower {
          color: #dc3545;
        }
        .auction-table tr.current-item {
          background-color: #e6f7ff;
          font-weight: bold;
        }
        
        /* Statistics Styling */
        .statistics-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }
        .statistics-box {
          flex: 1;
          min-width: 300px;
        }
        .statistics-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
        }
        .statistics-table th, .statistics-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .statistics-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          width: 25%;
        }
        
        /* Histogram Styling */
        .price-distribution {
          flex: 1;
          min-width: 300px;
          height: 200px;
          position: relative;
        }
        .histogram-container {
          height: 100%;
          position: relative;
          padding-bottom: 30px;
        }
        .histogram-bar {
          display: flex;
          height: 100%;
          width: 100%;
          align-items: flex-end;
          border-left: 1px solid #333;
          border-bottom: 1px solid #333;
          position: relative;
        }
        .bar-segment {
          flex: 1;
          background-color: #6c757d;
          position: relative;
          margin: 0 2px;
        }
        .bar-segment.contains-target {
          background-color: #007bff;
        }
        .bar-label {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
        }
        .histogram-baseline {
          position: relative;
          width: 100%;
          height: 30px;
        }
        .min-value {
          position: absolute;
          left: 0;
          top: 5px;
          font-size: 12px;
        }
        .max-value {
          position: absolute;
          right: 0;
          top: 5px;
          font-size: 12px;
        }
        .target-marker {
          position: absolute;
          text-align: center;
          font-size: 10px;
          color: #dc3545;
          transform: translateX(-50%);
        }
      </style>
    </div>
  `;
  
  return tableHtml;
}

/**
 * Generates an HTML table from auction results
 * @param {Array} auctionResults - Array of auction result objects
 * @param {number} targetValue - The appraisal value for comparison
 * @returns {Object} Object containing the HTML table and statistics
 * @returns {string} Object.tableHtml - HTML string containing the formatted table
 * @returns {Object} Object.statistics - Statistics object with analysis data
 */
function generateAuctionTableHtml(auctionResults, targetValue) {
  if (!auctionResults || !Array.isArray(auctionResults) || auctionResults.length === 0) {
    return { 
      tableHtml: '<p>No comparable auction results found.</p>',
      statistics: null
    };
  }
  
  // Sort by closest price to target value
  const sortedResults = [...auctionResults].sort((a, b) => {
    const diffA = Math.abs(a.price - targetValue);
    const diffB = Math.abs(b.price - targetValue);
    return diffA - diffB;
  });
  
  // Limit to top 5 most relevant results for the table display
  const topResults = sortedResults.slice(0, 5);
  
  // Format the date in a readable format
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr || 'N/A';
    }
  };
  
  // Calculate price difference percentage from target value
  const calculateDiffPercent = (price) => {
    if (!price) return 'N/A';
    const diff = ((price - targetValue) / targetValue) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };
  
  // Generate statistics for all auction results
  const statistics = calculateAuctionStatistics(auctionResults, targetValue);
  
  // Generate the HTML table
  const tableHtml = `
    <div class="auction-results-table">
      <table class="auction-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Auction House</th>
            <th>Date</th>
            <th>Price</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          ${topResults.map(result => `
            <tr>
              <td>${result.title || 'Unknown Item'}</td>
              <td>${result.house || 'N/A'}</td>
              <td>${formatDate(result.date)}</td>
              <td>${result.currency || 'USD'} ${result.price ? result.price.toLocaleString() : 'N/A'}</td>
              <td class="${result.price > targetValue ? 'higher' : 'lower'}">${calculateDiffPercent(result.price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h4>Statistical Analysis</h4>
      <div class="statistics-container">
        <div class="statistics-box">
          <table class="statistics-table">
            <tbody>
              <tr>
                <th>Sample Size:</th>
                <td>${statistics.count}</td>
                <th>Mean Price:</th>
                <td>$${statistics.mean.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Median Price:</th>
                <td>$${statistics.median.toLocaleString()}</td>
                <th>Price Range:</th>
                <td>$${statistics.min.toLocaleString()} - $${statistics.max.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Standard Deviation:</th>
                <td>$${statistics.standardDeviation.toLocaleString()}</td>
                <th>Coefficient of Variation:</th>
                <td>${statistics.coefficientOfVariation.toFixed(2)}%</td>
              </tr>
              <tr>
                <th>Your Value Percentile:</th>
                <td>${statistics.targetPercentile.toFixed(0)}%</td>
                <th>Confidence Level:</th>
                <td>${statistics.confidenceLevel}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="price-distribution">
          <div class="histogram-container">
            <div class="histogram-bar" style="height: ${statistics.histogram.map(bar => `${bar.heightPercentage}%`).join('; height: ')};">
              ${statistics.histogram.map(bar => `
                <div class="bar-segment ${bar.containsTarget ? 'contains-target' : ''}" 
                     style="height: ${bar.heightPercentage}%; left: ${bar.position}%;"
                     title="$${bar.min.toLocaleString()} - $${bar.max.toLocaleString()}: ${bar.count} items">
                  <span class="bar-label">${bar.count}</span>
                </div>
              `).join('')}
            </div>
            <div class="histogram-baseline">
              <span class="min-value">$${statistics.min.toLocaleString()}</span>
              <span class="target-marker" style="left: ${statistics.targetMarkerPosition}%;">
                ▲<br>Your Value<br>$${targetValue.toLocaleString()}
              </span>
              <span class="max-value">$${statistics.max.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .auction-results-table {
          margin: 20px 0;
          overflow-x: auto;
        }
        .auction-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
          margin-bottom: 20px;
        }
        .auction-table th, .auction-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .auction-table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .auction-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .auction-table .higher {
          color: #28a745;
        }
        .auction-table .lower {
          color: #dc3545;
        }
        
        /* Statistics Styling */
        .statistics-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }
        .statistics-box {
          flex: 1;
          min-width: 300px;
        }
        .statistics-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
        }
        .statistics-table th, .statistics-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .statistics-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          width: 25%;
        }
        
        /* Histogram Styling */
        .price-distribution {
          flex: 1;
          min-width: 300px;
          height: 200px;
          position: relative;
        }
        .histogram-container {
          height: 100%;
          position: relative;
          padding-bottom: 30px;
        }
        .histogram-bar {
          display: flex;
          height: 100%;
          width: 100%;
          align-items: flex-end;
          border-left: 1px solid #333;
          border-bottom: 1px solid #333;
          position: relative;
        }
        .bar-segment {
          flex: 1;
          background-color: #6c757d;
          position: relative;
          margin: 0 2px;
        }
        .bar-segment.contains-target {
          background-color: #007bff;
        }
        .bar-label {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
        }
        .histogram-baseline {
          position: relative;
          width: 100%;
          height: 30px;
        }
        .min-value {
          position: absolute;
          left: 0;
          top: 5px;
          font-size: 12px;
        }
        .max-value {
          position: absolute;
          right: 0;
          top: 5px;
          font-size: 12px;
        }
        .target-marker {
          position: absolute;
          text-align: center;
          font-size: 10px;
          color: #dc3545;
          transform: translateX(-50%);
        }
      </style>
    </div>
  `;
  
  return { tableHtml, statistics };
}

/**
 * Calculates various statistics from auction results
 * @param {Array} auctionResults - Array of auction result objects
 * @param {number} targetValue - The appraisal value for comparison
 * @returns {Object} Statistics object with various metrics
 */
function calculateAuctionStatistics(auctionResults, targetValue) {
  // Filter out results with invalid prices
  const validResults = auctionResults.filter(result => result.price && !isNaN(result.price));
  
  if (validResults.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      targetPercentile: 0,
      confidenceLevel: 'Insufficient Data',
      histogram: [],
      targetMarkerPosition: 50
    };
  }
  
  // Ensure we're not using more than 100 results to avoid performance issues
  const maxResults = 100;
  const resultSubset = validResults.length > maxResults 
    ? validResults.slice(0, maxResults) 
    : validResults;
  
  console.log(`Using ${resultSubset.length} out of ${validResults.length} valid auction results for statistics`);
  
  // Extract prices for calculations
  const prices = resultSubset.map(result => result.price);
  
  // Sort prices for various calculations
  const sortedPrices = [...prices].sort((a, b) => a - b);
  
  // Basic statistics
  const count = prices.length;
  const sum = prices.reduce((acc, price) => acc + price, 0);
  const mean = sum / count;
  const min = sortedPrices[0];
  const max = sortedPrices[count - 1];
  
  // Median calculation
  let median;
  if (count % 2 === 0) {
    // Even number of items
    const midIndex = count / 2;
    median = (sortedPrices[midIndex - 1] + sortedPrices[midIndex]) / 2;
  } else {
    // Odd number of items
    median = sortedPrices[Math.floor(count / 2)];
  }
  
  // Standard deviation calculation
  const sumSquaredDiff = prices.reduce((acc, price) => {
    const diff = price - mean;
    return acc + (diff * diff);
  }, 0);
  const variance = sumSquaredDiff / count;
  const standardDeviation = Math.sqrt(variance);
  
  // Coefficient of variation (standardized measure of dispersion)
  const coefficientOfVariation = (standardDeviation / mean) * 100;
  
  // Calculate target value percentile
  const belowTarget = sortedPrices.filter(price => price <= targetValue).length;
  const targetPercentile = (belowTarget / count) * 100;
  
  // Determine confidence level based on proximity to mean and data spread
  let confidenceLevel;
  const zScore = Math.abs(targetValue - mean) / standardDeviation;
  
  if (count < 3) {
    confidenceLevel = 'Low (Limited Data)';
  } else if (zScore <= 0.5) {
    confidenceLevel = 'Very High';
  } else if (zScore <= 1.0) {
    confidenceLevel = 'High';
  } else if (zScore <= 1.5) {
    confidenceLevel = 'Moderate';
  } else if (zScore <= 2.0) {
    confidenceLevel = 'Low';
  } else {
    confidenceLevel = 'Very Low';
  }
  
  // Create histogram data (5 buckets) using all auction results
  const bucketCount = Math.min(5, count);
  const bucketSize = (max - min) / bucketCount;
  
  const histogram = Array(bucketCount).fill().map((_, i) => {
    const bucketMin = min + (i * bucketSize);
    const bucketMax = i === bucketCount - 1 ? max : min + ((i + 1) * bucketSize);
    
    const bucketPrices = prices.filter(price => 
      price >= bucketMin && (i === bucketCount - 1 ? price <= bucketMax : price < bucketMax)
    );
    
    const containsTarget = targetValue >= bucketMin && 
                          (i === bucketCount - 1 ? targetValue <= bucketMax : targetValue < bucketMax);
    
    return {
      min: bucketMin,
      max: bucketMax,
      count: bucketPrices.length,
      position: (i / bucketCount) * 100,
      height: bucketPrices.length > 0 ? (bucketPrices.length / count) * 100 : 0,
      contains_target: containsTarget
    };
  });
  
  // Calculate target marker position for the histogram (percentage from left)
  const range = max - min;
  const targetMarkerPosition = range > 0 ? ((targetValue - min) / range) * 100 : 50;
  
  // Sort results by relevance (closeness to target value)
  const sortedResults = [...resultSubset].sort((a, b) => {
    const diffA = Math.abs(a.price - targetValue);
    const diffB = Math.abs(b.price - targetValue);
    return diffA - diffB;
  });
  
  // Format all comparable sales for display
  const formattedSales = sortedResults.map(result => {
    // Calculate percentage difference from target value
    const priceDiff = ((result.price - targetValue) / targetValue) * 100;
    const diffFormatted = priceDiff > 0 ? `+${priceDiff.toFixed(1)}%` : `${priceDiff.toFixed(1)}%`;
    
    return {
      title: result.title || 'Similar Item',
      house: result.house || 'Unknown',
      date: result.date || 'Unknown',
      price: result.price,
      diff: diffFormatted
    };
  });
  
  // Add current item to sales comparison (near the beginning but not first)
  const currentItem = {
    title: 'Your Item',
    house: '-',
    date: 'Current',
    price: targetValue,
    diff: '-',
    is_current: true
  };
  
  // Insert current item after the first most relevant item
  if (formattedSales.length > 0) {
    formattedSales.splice(1, 0, currentItem);
  } else {
    formattedSales.push(currentItem);
  }
  
  // Format percentile as ordinal number (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };
  
  // Calculate year-over-year price trend with more data if available
  // Try to use date information if available
  let priceTrend;
  try {
    // Sort by date if available to calculate trend
    const datedResults = resultSubset.filter(result => result.date && new Date(result.date).getTime());
    if (datedResults.length >= 3) {
      const sortedByDate = [...datedResults].sort((a, b) => new Date(a.date) - new Date(b.date));
      const oldestPrice = sortedByDate[0].price;
      const newestPrice = sortedByDate[sortedByDate.length - 1].price;
      const yearDiff = (new Date(sortedByDate[sortedByDate.length - 1].date).getFullYear() - 
                        new Date(sortedByDate[0].date).getFullYear()) || 1;
      priceTrend = ((newestPrice - oldestPrice) / oldestPrice) * 100 / yearDiff;
    } else {
      // Fallback to basic calculation
      priceTrend = ((max - min) / min) * 100 / 5; // Assume 5 years of data
    }
  } catch (e) {
    console.error('Error calculating price trend:', e);
    priceTrend = ((max - min) / min) * 100 / 5; // Fallback to simple calculation
  }
  
  const priceTrendFormatted = priceTrend > 0 ? `+${priceTrend.toFixed(1)}%` : `${priceTrend.toFixed(1)}%`;
  
  // Enhanced statistics object for interactive charts
  const enhancedStats = {
    count: resultSubset.length,
    average_price: Math.round(mean),
    median_price: Math.round(median),
    price_min: Math.round(min),
    price_max: Math.round(max),
    standard_deviation: Math.round(standardDeviation),
    coefficient_of_variation: Math.round(coefficientOfVariation * 100) / 100,
    percentile: getOrdinalSuffix(Math.round(targetPercentile)),
    confidence_level: confidenceLevel,
    price_trend_percentage: priceTrendFormatted,
    histogram,
    // Store full comparable sales dataset (up to 100 items)
    comparable_sales: formattedSales,
    value: targetValue,
    target_marker_position: targetMarkerPosition,
    // Include total count if we limited the results
    total_count: validResults.length > maxResults ? validResults.length : undefined
  };
  
  // Store the original statistics and enhanced statistics
  return {
    // Original statistics
    count,
    mean,
    median,
    min,
    max,
    standardDeviation,
    coefficientOfVariation,
    targetPercentile,
    confidenceLevel,
    histogram,
    targetMarkerPosition,
    
    // Enhanced statistics for interactive charts
    enhancedStats
  };
}

/**
 * Validates statistics data against expected schema
 * @param {Object} statsData - The statistics data object to validate
 * @returns {Object} Validated and sanitized data object with defaults applied
 */
function validateStatisticsData(statsData) {
  // Define required fields with defaults
  const schema = {
    count: { default: 0, type: 'number' },
    average_price: { default: 0, type: 'number' },
    median_price: { default: 0, type: 'number' },
    price_min: { default: 0, type: 'number' },
    price_max: { default: 0, type: 'number' },
    standard_deviation: { default: 0, type: 'number' },
    coefficient_of_variation: { default: 0, type: 'number' },
    percentile: { default: '50th', type: 'string' },
    confidence_level: { default: 'Low', type: 'string' },
    price_trend_percentage: { default: '+0.0%', type: 'string' },
    histogram: { default: [], type: 'array' },
    comparable_sales: { default: [], type: 'array' },
    value: { default: 0, type: 'number' },
    target_marker_position: { default: 50, type: 'number' },
    // New fields for enhanced visualization
    price_history: { default: [], type: 'array' },
    historical_significance: { default: 75, type: 'number' },
    investment_potential: { default: 68, type: 'number' },
    provenance_strength: { default: 72, type: 'number' }
  };
  
  const validated = {};
  
  // Validate each field
  for (const [field, rules] of Object.entries(schema)) {
    if (statsData && statsData[field] !== undefined) {
      // Type checking
      if (rules.type === 'number' && typeof statsData[field] === 'string') {
        validated[field] = parseFloat(statsData[field]) || rules.default;
      } else if (rules.type === 'array' && !Array.isArray(statsData[field])) {
        validated[field] = rules.default;
      } else {
        validated[field] = statsData[field];
      }
    } else {
      // Use default if field is missing
      validated[field] = rules.default;
    }
  }
  
  // Ensure specific nested structures
  if (!Array.isArray(validated.histogram) || validated.histogram.length === 0) {
    validated.histogram = [
      {min: 0, max: 0, count: 0, position: 0, height: 0, contains_target: false},
      {min: 0, max: 0, count: 0, position: 20, height: 0, contains_target: false},
      {min: 0, max: 0, count: 0, position: 40, height: 0, contains_target: false},
      {min: 0, max: 0, count: 0, position: 60, height: 0, contains_target: true},
      {min: 0, max: 0, count: 0, position: 80, height: 0, contains_target: false}
    ];
  }
  
  // Ensure price history data is available
  if (!Array.isArray(validated.price_history) || validated.price_history.length === 0) {
    // Create default price history (6 years of data)
    const currentYear = new Date().getFullYear();
    validated.price_history = [
      {year: (currentYear - 5).toString(), price: Math.round(validated.value * 0.8), index: 1000},
      {year: (currentYear - 4).toString(), price: Math.round(validated.value * 0.84), index: 1050},
      {year: (currentYear - 3).toString(), price: Math.round(validated.value * 0.88), index: 1100},
      {year: (currentYear - 2).toString(), price: Math.round(validated.value * 0.92), index: 1150},
      {year: (currentYear - 1).toString(), price: Math.round(validated.value * 0.96), index: 1200},
      {year: currentYear.toString(), price: validated.value, index: 1250}
    ];
  }
  
  return validated;
}

/**
 * Performs basic consistency check between post title and auction results
 * @param {string} postTitle - The title of the post being appraised
 * @param {Array} auctionResults - Array of auction results
 * @returns {boolean} True if results appear consistent, false otherwise
 */
function verifyResultsConsistency(postTitle, auctionResults) {
  if (!auctionResults || !Array.isArray(auctionResults) || auctionResults.length === 0) {
    return false;
  }
  
  // Extract key terms from post title
  const titleTerms = postTitle.toLowerCase().split(/\s+/)
    .filter(term => term.length > 3) // Only consider significant terms
    .map(term => term.replace(/[^a-z0-9]/g, '')); // Clean terms
  
  // Check if auction results have similar items
  let matchCount = 0;
  
  for (const result of auctionResults) {
    if (!result.title) continue;
    
    const resultTitle = result.title.toLowerCase();
    for (const term of titleTerms) {
      if (resultTitle.includes(term)) {
        matchCount++;
        break; // Count each result only once
      }
    }
  }
  
  // If at least 30% of results have some match with the title, consider it consistent
  return (matchCount / auctionResults.length) >= 0.3;
}

module.exports = {
  processMainImageWithGoogleVision,
  processAllMetadata,
  processJustificationMetadata,
  initializeVisionClient,
  validateStatisticsData,
  verifyResultsConsistency,
  generateEnhancedAuctionTableHtml
};