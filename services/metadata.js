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

    const valuerResponse = await response.json();
    console.log('Justification - Valuer agent response:', JSON.stringify(valuerResponse, null, 2));
    
    // Extract explanation and auction results from the response
    const { explanation, auctionResults, success } = valuerResponse;
    
    if (!success) {
      throw new Error('Valuer agent returned unsuccessful response');
    }
    
    // Store the raw auction data for reference
    await updateWordPressMetadata(postId, 'valuer_agent_data', JSON.stringify(valuerResponse));
    
    // Generate HTML table from auction results
    const auctionTableHtml = generateAuctionTableHtml(auctionResults, parseFloat(value));
    
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
    
    // Build the final prompt - include the explanation from valuer agent
    let finalPrompt = `${prompt}\n\nValuer Agent Explanation: ${explanation}\n\nAuction Data: ${JSON.stringify(auctionResults, null, 2)}`;
    
    if (searchResults && searchResults.formattedContext) {
      finalPrompt += `\n\n${searchResults.formattedContext}\n\nUsing the valuer agent explanation, auction data, and search results above, please generate a detailed justification for the valuation.`;
      console.log('Justification - Using search results to enhance justification');
    }
    
    // Generate only the introduction text using OpenAI
    // We'll append the auction table later
    finalPrompt += '\n\nYour response should be a detailed explanation that will be followed by a table of auction results, so please do not describe the specific auction results in detail, as they will be displayed in the table.';
    
    console.log('Justification - Generating introduction text...');
    const introductionText = await generateContent(
      finalPrompt,
      postTitle,
      {},
      'o3-mini'
    );
    
    // Combine the introduction text with the auction table
    const completeContent = `
      ${introductionText}
      
      <h3>Comparable Auction Results</h3>
      ${auctionTableHtml}
      
      <p><em>The valuation of $${value.toLocaleString()} is supported by the above auction results of similar items.</em></p>
    `;
    
    console.log('Justification - Complete content created with auction table');
    
    // Update WordPress with the combined content
    await updateWordPressMetadata(postId, 'justification_html', completeContent);
    
    // Also store the explanation separately for possible use elsewhere
    await updateWordPressMetadata(postId, 'justification_explanation', explanation);
    
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

/**
 * Generates an HTML table from auction results
 * @param {Array} auctionResults - Array of auction result objects
 * @param {number} targetValue - The appraisal value for comparison
 * @returns {string} HTML string containing the formatted table
 */
function generateAuctionTableHtml(auctionResults, targetValue) {
  if (!auctionResults || !Array.isArray(auctionResults) || auctionResults.length === 0) {
    return '<p>No comparable auction results found.</p>';
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
  
  return tableHtml;
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
  
  // Extract prices for calculations
  const prices = validResults.map(result => result.price);
  
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
  
  // Create histogram data (5 buckets)
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
      heightPercentage: bucketPrices.length > 0 ? (bucketPrices.length / count) * 100 : 0,
      containsTarget
    };
  });
  
  // Calculate target marker position for the histogram (percentage from left)
  const range = max - min;
  const targetMarkerPosition = range > 0 ? ((targetValue - min) / range) * 100 : 50;
  
  return {
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
    targetMarkerPosition
  };
}

module.exports = {
  processMainImageWithGoogleVision,
  processAllMetadata,
  processJustificationMetadata,
  initializeVisionClient
};