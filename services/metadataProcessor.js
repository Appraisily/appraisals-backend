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
    if (postData?.acf?.detailedTitle) {
      const detailedTitle = postData.acf.detailedTitle;
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
      
      // Build context-enhanced prompt with search results and detailed title
      // The buildContextualPrompt function now handles detailed title automatically
      const finalPrompt = buildContextualPrompt(basePrompt, context, searchResults);
      
      if (searchResults?.success) {
        console.log(`[Processor] Using search results for field: ${field}`);
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
      if (postData?.acf?.detailedTitle) {
        detailedTitle = postData.acf.detailedTitle;
        console.log(`[Processor] Using detailed title for justification: "${detailedTitle}"`);
      }
    } catch (detailedTitleError) {
      console.warn('[Processor] Could not retrieve detailed title, using standard title:', detailedTitleError.message);
    }
    
    // Use the detailed title for valuation if available
    const titleForValuation = detailedTitle || postTitle;
    
    // Skip the /api/justify call and go directly to the enhanced-statistics endpoint
    console.log('[Processor] Requesting enhanced statistics (skipping separate justify call)');
    let enhancedStats = null;
    let statistics = null;
    let auctionTableHtml = '';
    let auctionResults = [];
    let explanation = '';
    
    try {
      const statsResponse = await getEnhancedStatistics(
        titleForValuation, 
        numericValue, 
        20,
        Math.floor(numericValue * 0.6),
        Math.ceil(numericValue * 1.6)
      );
      
      if (statsResponse.success && statsResponse.statistics) {
        console.log('[Processor] Using enhanced statistics from valuer-agent');
        enhancedStats = statsResponse.statistics;
        auctionTableHtml = generateEnhancedAuctionTableHtml(enhancedStats);
        statistics = { enhancedStats }; 
        auctionResults = enhancedStats.comparable_sales || [];
        
        // Generate a basic explanation if available from the statistics
        if (enhancedStats.average_price && enhancedStats.median_price) {
          explanation = `This item has been valued based on ${enhancedStats.count || 0} comparable sales. ` +
            `The average price of similar items is $${numberWithCommas(enhancedStats.average_price)} ` +
            `and the median price is $${numberWithCommas(enhancedStats.median_price)}.`;
        } else {
          explanation = "This appraisal is based on an analysis of comparable auction results and market data.";
        }
      } else {
        console.warn('[Processor] Enhanced statistics failed, falling back to local calculation:', statsResponse.message);
        const fallbackResult = generateAuctionTableHtml([], numericValue);
        auctionTableHtml = fallbackResult.tableHtml;
        statistics = fallbackResult.statistics;
        explanation = "This appraisal is based on an analysis of comparable auction results and market data.";
      }
    } catch (statsError) {
      console.error('[Processor] Error getting enhanced statistics, falling back:', statsError);
      const fallbackResult = generateAuctionTableHtml([], numericValue);
      auctionTableHtml = fallbackResult.tableHtml;
      statistics = fallbackResult.statistics;
      explanation = "This appraisal is based on an analysis of comparable auction results and market data.";
    }
    
    if (skipMetadataGeneration) {
      console.log('[Processor] Skipping full metadata generation (testing mode)');
      return { field: 'justification_html', status: 'success', testing: true /* ... other test data */ };
    }

    const isConsistent = verifyResultsConsistency(postTitle, auctionResults);
    if (!isConsistent) {
      console.warn(`[Processor] Warning: Auction results inconsistent with "${postTitle}"`);
      await wordpress.updateWordPressMetadata(postId, 'consistency_warning', `Auction results may not be relevant.`);
    }

    // Use the stats object whether it came from enhanced endpoint or local calculation
    const currentStats = statistics.enhancedStats || statistics;
    const validatedStats = validateStatisticsData(currentStats);

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
    
    finalPrompt += `Value: ${numericValue}\n\nExplanation: ${explanation}\n\nAuction Data Summary: ${JSON.stringify(validatedStats, null, 2).substring(0, 1000)}...`; // Use validated stats summary
    
    if (searchContext) {
      finalPrompt += `\n\nWeb Context:\n${searchContext}\n\nInstructions: ... (as before) ...`;
    }
    finalPrompt += '\n\nGenerate ONLY the introductory justification text (plain text, no HTML). The auction table will be added separately.';

    console.log('[Processor] Generating justification intro text...');
    const systemMessage = "You are a professional art expert... IMPORTANT: Generate PLAIN TEXT only...";
    let introductionText = await generateContent(finalPrompt, postTitle, {}, 'o3-mini', systemMessage);
    introductionText = introductionText.replace(/<[^>]*>/g, ''); // Safety strip

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
      
      console.log('[Processor] Updating statistics');
      // Prepare stats for storage (limit display array, ensure clean JSON)
      const statsForStorage = { ...validatedStats };
      if (statsForStorage.comparable_sales && statsForStorage.comparable_sales.length > 20) {
          statsForStorage.total_sales_count = statsForStorage.comparable_sales.length;
          statsForStorage.comparable_sales = statsForStorage.comparable_sales.slice(0, 20);
      }
      
      // Apply sanitization before sending object to WP update function
      const sanitizeObjectStrings = (obj) => {
          if (!obj) return obj;
          Object.keys(obj).forEach(key => {
              if (typeof obj[key] === 'string') {
                  obj[key] = obj[key].replace(/[\u2018\u2019\u201C\u201D\u00A0\u2022]/g, ' ');
              } else if (typeof obj[key] === 'object') {
                  sanitizeObjectStrings(obj[key]); // Recurse for nested objects/arrays
              }
          });
          return obj;
      };
      const sanitizedStats = sanitizeObjectStrings(JSON.parse(JSON.stringify(statsForStorage)));

      // Stringify the sanitized statistics object before saving
      await wordpress.updateWordPressMetadata(postId, 'statistics', JSON.stringify(sanitizedStats)); 
      console.log('[Processor] Statistics data stored');

      // Trigger HTML generation with the fresh stats
      try {
          console.log('[Processor] Triggering WP HTML field update');
          const appraisalData = await fetchAppraisalData(postId); // Fetch latest post data
          await wordpress.updateHtmlFields(postId, appraisalData, sanitizedStats); 
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