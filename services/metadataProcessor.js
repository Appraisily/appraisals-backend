// const fetch = require('node-fetch'); // Removed - fetch is globally available in Node 18+
const { GoogleGenerativeAI } = require("@google/generative-ai");
// const config = require('../config'); // Remove unused config
const { getSecret } = require('../config'); // Assuming getSecret is used to get API keys
const { jsonCleaner } = require('./utils/jsonCleaner');
const { generateContent } = require('./openai');
const wordpress = require('./wordpress/index'); // Import directly from WordPress folder
const { getPrompt, buildContextualPrompt } = require('./utils/promptUtils');
const { PROMPT_PROCESSING_ORDER } = require('./constants/reportStructure');
const { performContextualSearch, searchGoogle, formatSearchResults } = require('./serper');
const { justifyValue, getEnhancedStatistics } = require('./valuerAgentClient');

// --- Helper Functions Moved from metadata.js ---

function numberWithCommas(x) {
  if (x === null || x === undefined) return '';
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchAppraisalData(postId) {
  try {
    const { postData, title } = await wordpress.fetchPostData(postId);
    if (!title) {
      throw new Error('Post not found or title is missing');
    }
    // Construct appraisalData object - simplified example
    const appraisalData = {
      title: title,
      creator: postData.acf?.creator,
      value: postData.acf?.value,
      // Add other fields as needed from postData.acf
    };
    return appraisalData;
  } catch (error) {
    console.error(`Error fetching appraisal data for post ${postId}:`, error);
    throw error; // Re-throw to be handled by caller
  }
}

function calculateStatistics(salesData, targetValue) {
  if (!salesData || salesData.length === 0) {
    return {
      count: 0,
      average_price: 0,
      median_price: 0,
      price_min: 0,
      price_max: 0,
      standard_deviation: 0,
      percentile: '0th',
      price_trend_percentage: '0.0%',
      confidence_level: 'Low',
      coefficient_of_variation: 0,
      comparable_sales: [],
      histogram: [],
      target_marker_position: 50, // Default position
      value: targetValue // Include the original target value
    };
  }

  // Filter out invalid entries and parse prices
  const validSales = salesData
    .map(sale => ({ ...sale, price: parseFloat(String(sale.price).replace(/[^0-9.]/g, '')) }))
    .filter(sale => sale && !isNaN(sale.price) && sale.price > 0);

  if (validSales.length === 0) return calculateStatistics([], targetValue); // Return empty stats if no valid sales

  const prices = validSales.map(s => s.price).sort((a, b) => a - b);
  const count = prices.length;

  // Basic Stats
  const sum = prices.reduce((acc, price) => acc + price, 0);
  const average_price = sum / count;
  const price_min = prices[0];
  const price_max = prices[count - 1];

  // Median
  const mid = Math.floor(count / 2);
  const median_price = count % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

  // Standard Deviation & Coefficient of Variation
  const mean = average_price;
  const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / count;
  const standard_deviation = Math.sqrt(variance);
  const coefficient_of_variation = mean > 0 ? (standard_deviation / mean) * 100 : 0;

  // Percentile of targetValue
  const position = prices.findIndex(p => p >= targetValue);
  const percentile_raw = position === -1 ? 100 : (position / count) * 100;
  const percentile = `${Math.round(percentile_raw)}th`;

  // Target Marker Position (simple percentage based on min/max)
  let target_marker_position = 50;
  if (price_max > price_min) {
    target_marker_position = ((targetValue - price_min) / (price_max - price_min)) * 100;
    target_marker_position = Math.max(0, Math.min(100, target_marker_position)); // Clamp between 0-100
  }

  // Price Trend (Simplified - needs historical data)
  // Placeholder: requires more data or logic
  const price_trend_percentage = '+0.0%';

  // Confidence Level (Simplified - based on count)
  let confidence_level = 'Low';
  if (count >= 10) confidence_level = 'High';
  else if (count >= 5) confidence_level = 'Medium';

  // Histogram (Simplified Example)
  const numBins = 5;
  const binSize = (price_max - price_min) / numBins;
  const histogram = [];
  for (let i = 0; i < numBins; i++) {
    const binMin = price_min + i * binSize;
    const binMax = binMin + binSize;
    const binCount = prices.filter(p => p >= binMin && (i === numBins - 1 ? p <= binMax : p < binMax)).length;
    const maxHeight = Math.max(...prices.map((_, idx, arr) => arr.filter(p => p >= price_min + idx * binSize && (idx === numBins - 1 ? p <= price_min + (idx + 1) * binSize : p < price_min + (idx + 1) * binSize)).length));
    const height = maxHeight > 0 ? (binCount / maxHeight) * 100 : 0;
    histogram.push({
      min: Math.round(binMin),
      max: Math.round(binMax),
      count: binCount,
      height: Math.round(height),
      contains_target: targetValue >= binMin && targetValue <= binMax
    });
  }

  return {
    count,
    total_count: count, // Add total_count for consistency
    average_price: Math.round(average_price),
    median_price: Math.round(median_price),
    price_min: Math.round(price_min),
    price_max: Math.round(price_max),
    standard_deviation: Math.round(standard_deviation),
    percentile,
    price_trend_percentage, // Needs actual calculation
    confidence_level,
    coefficient_of_variation: parseFloat(coefficient_of_variation.toFixed(1)),
    comparable_sales: validSales.map(s => ({ ...s, price: Math.round(s.price) })), // Return cleaned sales data
    histogram,
    target_marker_position: parseFloat(target_marker_position.toFixed(1)),
    value: targetValue
  };
}

function generateAuctionTableHtml(auctionResults, targetValue) {
  if (!auctionResults || !Array.isArray(auctionResults) || auctionResults.length === 0) {
    return { tableHtml: '<p>No comparable auction results found.</p>', statistics: calculateStatistics([], targetValue) };
  }

  const statistics = calculateStatistics(auctionResults, targetValue);

  let tableHtml = '<table class="auction-results-table"><thead><tr><th>Item</th><th>House</th><th>Date</th><th>Price</th><th>Difference</th></tr></thead><tbody>';

  // Limit display to 5-10 results for brevity in basic table
  const displayResults = statistics.comparable_sales.slice(0, 10);

  // Find index to insert target value if not present
  let insertIndex = displayResults.findIndex(item => item.price >= targetValue);
  if (insertIndex === -1) insertIndex = displayResults.length; // Append at the end if target is highest

  // Add target value row
  const targetRow = {
    title: 'Your Item (Estimated)',
    house: '-',
    date: 'Current',
    price: targetValue,
    diff_raw: 0,
    is_current: true
  };
  // Avoid inserting if it makes the list too long or if targetValue is invalid
  if (!isNaN(targetValue)) {
      displayResults.splice(insertIndex, 0, targetRow);
  }

  displayResults.forEach(sale => {
    const price = sale.price ? parseFloat(String(sale.price).replace(/[^0-9.]/g, '')) : 0;
    let diff = '-';
    let diff_class = '';
    if (!isNaN(targetValue) && targetValue !== 0 && price !== 0) {
        const diff_raw = ((price - targetValue) / targetValue) * 100;
        diff = `${diff_raw > 0 ? '+' : ''}${diff_raw.toFixed(1)}%`;
        diff_class = diff_raw > 0 ? 'positive' : (diff_raw < 0 ? 'negative' : '');
    }
    const highlight = sale.is_current ? 'highlight-row' : '';

    tableHtml += `<tr class="${highlight}">`;
    tableHtml += `<td>${escapeHtml(sale.title)}</td>`;
    tableHtml += `<td>${escapeHtml(sale.house)}</td>`;
    tableHtml += `<td>${escapeHtml(sale.date)}</td>`;
    tableHtml += `<td>$${numberWithCommas(Math.round(price))}</td>`;
    tableHtml += `<td class="${diff_class}">${diff}</td>`;
    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table>';
  return { tableHtml, statistics };
}

function generateEnhancedAuctionTableHtml(enhancedStats) {
  if (!enhancedStats || !enhancedStats.comparable_sales || enhancedStats.comparable_sales.length === 0) {
    return '<p>No comparable auction results found.</p>';
  }
  
  const formatDate = (dateStr) => {
    try {
      // Add robust date parsing
      if (!dateStr || typeof dateStr !== 'string') return 'N/A';
      const date = new Date(dateStr.replace(/-/g, '/')); // Try replacing dashes for broader compatibility
      if (isNaN(date.getTime())) return dateStr; // Return original if parsing failed
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      console.warn("Date formatting error:", e);
      return dateStr || 'N/A';
    }
  };
  
  // Use the sales data directly from enhancedStats
  const displayResults = enhancedStats.comparable_sales; // Already sorted/filtered potentially
  const targetValue = enhancedStats.value; // Get target value from stats

  let tableHtml = '<table class="enhanced-auction-results-table"><thead><tr><th>Item</th><th>House</th><th>Date</th><th>Price</th><th>Difference</th></tr></thead><tbody>';

  displayResults.forEach(sale => {
    const price = sale.price ? parseFloat(String(sale.price).replace(/[^0-9.]/g, '')) : 0;
    let diff = '-';
    let diff_class = '';
     if (!isNaN(targetValue) && targetValue !== 0 && price !== 0) {
        const diff_raw = ((price - targetValue) / targetValue) * 100;
        diff = `${diff_raw > 0 ? '+' : ''}${diff_raw.toFixed(1)}%`;
        diff_class = diff_raw > 0 ? 'positive' : (diff_raw < 0 ? 'negative' : '');
    }
    const highlight = sale.is_current ? 'highlight-row' : '';

    tableHtml += `<tr class="${highlight}">`;
    tableHtml += `<td>${escapeHtml(sale.title)}</td>`;
    tableHtml += `<td>${escapeHtml(sale.house)}</td>`;
    tableHtml += `<td>${formatDate(sale.date)}</td>`;
    tableHtml += `<td>$${numberWithCommas(Math.round(price))}</td>`;
    tableHtml += `<td class="${diff_class}">${diff}</td>`;
    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

function verifyResultsConsistency(postTitle, auctionResults) {
  if (!auctionResults || auctionResults.length === 0 || !postTitle) {
    return true; // No results to check against, assume consistent
  }
  // Improved check: look for keywords from the title in result titles
  const titleKeywords = postTitle.toLowerCase().split(' ').filter(word => word.length > 3); // Get significant words
  let matchScore = 0;
  const checkLimit = Math.min(auctionResults.length, 5);
  
  for (let i = 0; i < checkLimit; i++) {
    const resultTitleLower = auctionResults[i].title?.toLowerCase() || '';
    if (titleKeywords.some(keyword => resultTitleLower.includes(keyword))) {
      matchScore++;
    }
  }
  // Consider consistent if at least one title seems related based on keywords
  console.log(`[Consistency Check] Score: ${matchScore} for "${postTitle}"`);
  return matchScore > 0; 
}

function validateStatisticsData(stats) {
  console.log("Validating statistics data...");
  if (!stats) return {};
  
  const validated = { ...stats };

  // Ensure numeric fields are numbers, default to 0 if not
  const numericFields = ['average_price', 'median_price', 'price_min', 'price_max', 'standard_deviation', 'coefficient_of_variation', 'value', 'count', 'total_count'];
  numericFields.forEach(field => {
    const parsedValue = parseFloat(stats[field]);
    validated[field] = isNaN(parsedValue) ? 0 : parsedValue;
  });

  // Ensure comparable_sales is an array
  if (!Array.isArray(validated.comparable_sales)) {
    console.warn("Comparable sales is not an array, resetting.");
    validated.comparable_sales = [];
  }

  // Validate individual sales entries
  validated.comparable_sales = validated.comparable_sales.map(sale => {
    if (!sale || typeof sale !== 'object') return null;
    const validSale = { ...sale };
    validSale.price = parseFloat(String(validSale.price).replace(/[^0-9.]/g, '')) || 0;
    validSale.title = String(validSale.title || 'Unknown Item');
    validSale.house = String(validSale.house || 'Unknown House');
    validSale.date = String(validSale.date || 'Unknown Date');
    // Ensure diff is a string or calculate if possible
    if (validated.value && validSale.price) {
        const diff_raw = ((validSale.price - validated.value) / validated.value) * 100;
        validSale.diff = `${diff_raw > 0 ? '+' : ''}${diff_raw.toFixed(1)}%`;
    } else {
        validSale.diff = sale.diff ? String(sale.diff) : '-';
    }
    return validSale;
  }).filter(sale => sale !== null && sale.price > 0); // Filter out invalid entries

  // Re-sort by relevance (price difference) after validation
  if (validated.value) {
      validated.comparable_sales.sort((a, b) => Math.abs(a.price - validated.value) - Math.abs(b.price - validated.value));
  }

  // Ensure histogram is an array
  if (!Array.isArray(validated.histogram)) {
    validated.histogram = [];
  }
  // Basic validation for histogram entries
  validated.histogram = validated.histogram.map(bin => ({
      min: parseFloat(bin.min) || 0,
      max: parseFloat(bin.max) || 0,
      count: parseInt(bin.count) || 0,
      height: parseFloat(bin.height) || 0,
      contains_target: bin.contains_target === true
  })).filter(bin => bin.max > bin.min && !isNaN(bin.min) && !isNaN(bin.max));

  // Ensure other fields have reasonable defaults
  validated.percentile = String(stats.percentile || 'N/A');
  validated.price_trend_percentage = String(stats.price_trend_percentage || '+0.0%');
  validated.confidence_level = String(stats.confidence_level || 'Low');
  const parsedMarkerPos = parseFloat(stats.target_marker_position);
  validated.target_marker_position = isNaN(parsedMarkerPos) ? 50 : parsedMarkerPos;

  console.log(`Validation complete. ${validated.comparable_sales.length} valid sales.`);
  return validated;
}

// --- Core Processing Functions Moved from metadata.js ---

async function processAllMetadata(postId, postTitle, { postData, images }) {
  console.log('[Processor] Processing all metadata fields for post:', postId);
  const results = [];
  const context = {};
  
  // Get the detailed title if available
  try {
    if (postData?.acf?.detailedtitle) {
      const detailedTitle = postData.acf.detailedtitle;
      console.log(`[Processor] Found detailed title: "${detailedTitle}"`);
      context.detailedTitle = detailedTitle;
    } else {
      console.log('[Processor] No detailed title found, using standard title');
      context.detailedTitle = postTitle; // Fallback to regular title
    }
  } catch (titleError) {
    console.error('[Processor] Error retrieving detailed title:', titleError);
    context.detailedTitle = postTitle; // Fallback to regular title
  }
  
  let appraisalType = 'regular';
  try {
    if (postData?.acf?.appraisaltype) {
      const rawType = postData.acf.appraisaltype.toLowerCase();
      if (['irs', 'insurance'].includes(rawType)) {
        appraisalType = rawType;
      }
    }
    console.log(`[Processor] Using appraisal type: ${appraisalType}`);
    context.appraisalType = appraisalType;
  } catch (typeError) {
    console.error('[Processor] Error determining appraisal type:', typeError);
    context.appraisalType = 'regular';
  }
  
  let searchResults = null;
  try {
    console.log('[Processor] Initiating contextual search for title:', postTitle);
    searchResults = await performContextualSearch(postTitle);
    if (searchResults.success) {
      console.log('[Processor] Contextual search completed successfully');
      // Remove WordPress update for search results as requested
      // Skip updating WordPress metadata for contextual search results
    } else {
      console.warn('[Processor] Contextual search failed:', searchResults.error);
      // Skip updating WordPress metadata for contextual search results
    }
  } catch (searchError) {
    console.error('[Processor] Error during contextual search:', searchError);
    searchResults = null;
  }

  for (const field of PROMPT_PROCESSING_ORDER) {
    try {
      console.log(`[Processor] Processing field: ${field}`);
      const basePrompt = await getPrompt(field);
      
      // Log context summary for debugging
      console.log(`[Processor] Context for ${field} contains ${Object.keys(context).length} fields`);
      if (context.detailedTitle) {
        const titleSample = context.detailedTitle.substring(0, 150) + (context.detailedTitle.length > 150 ? '...' : '');
        console.log(`[Processor] Context has detailedTitle (${context.detailedTitle.length} chars): ${titleSample}`);
      }
      
      // Build context-enhanced prompt with search results and detailed title
      // The buildContextualPrompt function now handles detailed title automatically
      const finalPrompt = buildContextualPrompt(basePrompt, context, searchResults);
      
      if (searchResults?.success) {
        console.log(`[Processor] Using search results for field: ${field}`);
        if (searchResults.searchQuery) {
          console.log(`[Processor] Search query for ${field}: ${searchResults.searchQuery}`);
        }
      }
      
      const content = await generateContent(finalPrompt, postTitle, images);
      context[field] = content;
      await wordpress.updateWordPressMetadata(postId, field, content);
      
      results.push({ field, status: 'success' });
    } catch (error) {
      console.error(`[Processor] Error processing field ${field}:`, error);
      results.push({ field, status: 'error', error: error.message });
    }
  }

  try {
    console.log(`[Processor] Adding static metadata for type: ${appraisalType}`);
    const staticMetadata = require('./constants/staticMetadata'); // Ensure path is correct
    
    if (staticMetadata[appraisalType]) {
      for (const [key, value] of Object.entries(staticMetadata[appraisalType])) {
        console.log(`[Processor] Adding static metadata: ${key}`);
        await wordpress.updateWordPressMetadata(postId, key, value);
        results.push({ field: key, status: 'success (static)' });
      }
    } else {
      console.warn(`[Processor] No static metadata found for type: ${appraisalType}`);
    }
  } catch (staticError) {
    console.error('[Processor] Error adding static metadata:', staticError);
  }

  console.log(`[Processor] Metadata processing finished for post ${postId}`);
  return results;
}

async function processJustificationMetadata(postId, postTitle, value, skipMetadataGeneration = false) {
  try {
    console.log(`[Processor] === JUSTIFICATION PROCESS START ===`);
    console.log(`[Processor] Post ID: ${postId}, Title: ${postTitle}, Value: ${value}`);
    
    if (!value) throw new Error('Value is required');
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) throw new Error('Invalid numeric value');

    // Fetch post data to get detailed title if available
    let detailedTitle = null;
    try {
      const { postData } = await wordpress.fetchPostData(postId);
      if (postData?.acf?.detailedtitle) {
        detailedTitle = postData.acf.detailedtitle;
        console.log(`[Processor] Using detailed title for justification: "${detailedTitle}"`);
      }
    } catch (detailedTitleError) {
      console.warn('[Processor] Could not retrieve detailed title, using standard title:', detailedTitleError.message);
    }
    
    // Use the detailed title for valuation if available
    const titleForValuation = detailedTitle || postTitle;

    // Get the raw statistics data from WordPress
    console.log('[Processor] Fetching statistics from WordPress');
    let rawStatistics = null;
    try {
      if (postData?.acf?.statistics) {
        rawStatistics = postData.acf.statistics;
        console.log('[Processor] Successfully retrieved statistics data from WordPress');
      } else {
        console.log('[Processor] No existing statistics found in WordPress, will fetch from valuer-agent');
      }
    } catch (statsError) {
      console.warn('[Processor] Error fetching statistics from WordPress:', statsError.message);
    }
    
    // If we don't have statistics from WordPress, fetch them from valuer-agent
    if (!rawStatistics) {
      console.log('[Processor] Requesting enhanced statistics from valuer-agent');
      try {
        const statsResponse = await getEnhancedStatistics(
          titleForValuation, 
          numericValue, 
          20,
          Math.floor(numericValue * 0.6),
          Math.ceil(numericValue * 1.6)
        );
        
        if (statsResponse.success && statsResponse.statistics) {
          console.log('[Processor] Successfully received statistics from valuer-agent');
          rawStatistics = JSON.stringify(statsResponse.statistics);
          
          // Store the raw statistics in WordPress for future use
          await wordpress.updateWordPressMetadata(postId, 'statistics', rawStatistics);
          console.log('[Processor] Updated WordPress with new statistics data');
        } else {
          console.warn('[Processor] Failed to get statistics from valuer-agent:', statsResponse.message);
        }
      } catch (statsError) {
        console.error('[Processor] Error getting enhanced statistics from valuer-agent:', statsError);
      }
    }
    
    // If we still don't have statistics, create a minimal object
    if (!rawStatistics) {
      console.warn('[Processor] No statistics available, using minimal placeholder data');
      const minimalStats = {
        count: 0,
        value: numericValue,
        average_price: numericValue,
        median_price: numericValue,
        confidence_level: 'Low',
        comparable_sales: []
      };
      rawStatistics = JSON.stringify(minimalStats);
    }
    
    // Parse the raw statistics if it's a string
    let statisticsObject;
    if (typeof rawStatistics === 'string') {
      try {
        statisticsObject = JSON.parse(rawStatistics);
      } catch (parseError) {
        console.error('[Processor] Error parsing statistics JSON:', parseError);
        statisticsObject = { value: numericValue };
      }
    } else {
      statisticsObject = rawStatistics;
    }
    
    if (skipMetadataGeneration) {
      console.log('[Processor] Skipping full metadata generation (testing mode)');
      return { field: 'justification_html', status: 'success', testing: true /* ... other test data */ };
    }

    // Update the prompt to include the detailed title if available
    const justificationPrompt = await getPrompt('justification');
    let searchContext = '';
    try {
      console.log('[Processor] Performing targeted search for justification');
      // Use detailed title in search query if available
      const searchQuery = `${titleForValuation} auction value ${numericValue}`;
      const googleResults = await searchGoogle(searchQuery);
      searchContext = formatSearchResults(googleResults);
    } catch (searchError) {
      console.error('[Processor] Error during justification search:', searchError);
    }

    let finalPrompt = `${justificationPrompt}\n\n`;
    // Add both standard and detailed title if they differ
    if (detailedTitle && detailedTitle !== postTitle) {
      finalPrompt += `Item Title: "${postTitle}"\nDetailed Description: "${detailedTitle}"\n`;
    } else {
      finalPrompt += `Item: "${postTitle}"\n`;
    }
    
    finalPrompt += `Value: ${numericValue}\n\n`;
    
    // Add raw statistics data to the prompt
    finalPrompt += `## FOR PDF APPRAISAL DOCUMENT ##\n`;
    finalPrompt += `This content will be included directly in a PDF appraisal document.\n\n`;
    
    // Pass the full raw statistics object to the AI
    finalPrompt += `## RAW STATISTICAL DATA ##\n`;
    finalPrompt += `${JSON.stringify(statisticsObject, null, 2)}\n\n`;
    
    // Add search context if available
    if (searchContext) {
      finalPrompt += `## ADDITIONAL MARKET CONTEXT ##\n${searchContext}\n\n`;
    }
    
    finalPrompt += `## INSTRUCTIONS ##\n`;
    finalPrompt += `Generate a professionally written justification for a PDF appraisal document. Analyze the statistical data above and use it to support the valuation of $${numberWithCommas(numericValue)}.`;
    finalPrompt += `\n\nGenerate ONLY the justification text (plain text, no HTML). The auction table will be added separately.`;

    console.log('[Processor] Generating justification intro text...');
    const systemMessage = "You are a professional art and appraisal expert writing content for a formal PDF appraisal document. Produce clean, well-structured text suitable for print.";
    let introductionText = await generateContent(finalPrompt, postTitle, {}, 'gpt-4o', systemMessage);
    introductionText = introductionText.replace(/<[^>]*>/g, ''); // Safety strip

    // Generate auction table HTML from the statisticsObject
    let auctionTableHtml = '';
    if (statisticsObject.comparable_sales && statisticsObject.comparable_sales.length > 0) {
      auctionTableHtml = generateEnhancedAuctionTableHtml(statisticsObject);
    } else {
      auctionTableHtml = '<p>No comparable auction results available.</p>';
    }

    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const formattedValue = currencyFormatter.format(numericValue);
    
    const completeContent = `
      ${introductionText}
      <h3>Comparable Auction Results</h3>
      ${auctionTableHtml}
      <p><em>Valuation of ${formattedValue} supported by analysis.</em></p>
    `;

    try {
      console.log('[Processor] Updating justification_html');
      await wordpress.updateWordPressMetadata(postId, 'justification_html', completeContent);
      
      // Ensure the raw statistics are stored in WordPress
      if (typeof rawStatistics === 'string' && rawStatistics !== postData?.acf?.statistics) {
        console.log('[Processor] Updating statistics in WordPress');
        await wordpress.updateWordPressMetadata(postId, 'statistics', rawStatistics);
      }
      
      // Trigger HTML generation with the fresh stats
      try {
          console.log('[Processor] Triggering WP HTML field update');
          const appraisalData = await fetchAppraisalData(postId); // Fetch latest post data
          await wordpress.updateHtmlFields(postId, appraisalData, statisticsObject); 
          console.log('[Processor] HTML visualization update triggered');
      } catch (htmlError) {
          console.error('[Processor] Error triggering HTML update:', htmlError);
      }

    } catch (updateError) {
      console.error('[Processor] Error updating WP metadata:', updateError);
      throw updateError; // Re-throw critical update error
    }

    console.log(`[Processor] === JUSTIFICATION PROCESS COMPLETE ===`);
    return { field: 'justification_html', status: 'success' };

  } catch (error) {
    console.error(`[Processor] Critical error during justification process for post ${postId}:`, error);
    try {
      // Ensure error object is stringified before saving
      const errorDataString = JSON.stringify({ message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
      await wordpress.updateWordPressMetadata(postId, 'justification_error', errorDataString); 
    } catch (errorStoreError) {
      console.error('[Processor] Error storing justification error:', errorStoreError);
    }
    throw new Error(`Justification process failed: ${error.message}`); // Re-throw to route
  }
}

module.exports = {
  processAllMetadata,
  processJustificationMetadata,
  validateStatisticsData
}; 