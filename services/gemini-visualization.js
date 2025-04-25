/**
 * Gemini Visualization Service
 * Uses Google's Gemini AI to generate visualization HTML
 * based on statistical data and templates
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretClient = new SecretManagerServiceClient();
const fs = require('fs');
const path = require('path');

// Import the skeleton templates directly instead of using the templates module
const skeletonDir = path.join(__dirname, '..', 'templates', 'skeletons');
let enhancedAnalyticsTemplate, appraisalCardTemplate;

try {
  enhancedAnalyticsTemplate = fs.readFileSync(path.join(skeletonDir, 'enhanced-analytics.html'), 'utf8');
  appraisalCardTemplate = fs.readFileSync(path.join(skeletonDir, 'appraisal-card.html'), 'utf8');
  console.log('Loaded skeleton templates successfully');
} catch (error) {
  console.error('Error loading skeleton templates:', error);
  // Create minimal fallback templates if the files don't exist
  enhancedAnalyticsTemplate = `
    <div class="enhanced-analytics">
      <h2>Enhanced Analytics</h2>
      <p>Template file not found. This is a fallback template.</p>
    </div>
  `;
  appraisalCardTemplate = `
    <div class="appraisal-card">
      <h2>Appraisal Card</h2>
      <p>Template file not found. This is a fallback template.</p>
    </div>
  `;
}

// Will store the API key once retrieved
let geminiApiKey = null;
let geminiClient = null;

/**
 * Initializes the Gemini client with API key from Secret Manager
 * @returns {Promise<GoogleGenerativeAI>} Initialized Gemini client
 */
async function initializeGeminiClient() {
  try {
    if (!geminiApiKey) {
      const projectId = await secretClient.getProjectId();
      const name = `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;
      
      console.log('Fetching Gemini API key from Secret Manager');
      const [version] = await secretClient.accessSecretVersion({ name });
      geminiApiKey = version.payload.data.toString('utf8');
      
      if (!geminiApiKey) {
        throw new Error('Failed to retrieve GEMINI_API_KEY from Secret Manager');
      }
      
      console.log('Successfully retrieved Gemini API key');
      geminiClient = new GoogleGenerativeAI(geminiApiKey);
    }
    
    return geminiClient;
  } catch (error) {
    console.error('Error initializing Gemini client:', error);
    throw new Error('Failed to initialize Gemini client: ' + error.message);
  }
}

/**
 * Generates enhanced analytics HTML using Gemini
 * @param {Object} statisticsData - Statistics data for visualization
 * @param {Object} options - Optional parameters for customization
 * @returns {Promise<string>} - HTML content for enhanced analytics
 */
async function generateEnhancedAnalyticsWithGemini(statisticsData, options = {}) {
  try {
    console.log('Generating enhanced analytics with Gemini');
    
    // Validate statistics data
    if (!statisticsData) {
      console.warn('No statistics data provided for enhanced analytics');
      statisticsData = {}; // Use empty object, Gemini will handle fallbacks
    }
    
    // Initialize Gemini client if needed
    if (!geminiClient) {
      await initializeGeminiClient();
    }
    
    // Get the generative model
    const model = geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Generate unique chart IDs
    const chartIds = {
      radar: 'radar-chart-' + generateUniqueId(),
      price: 'price-chart-' + generateUniqueId(),
      gauge: 'gauge-chart-' + generateUniqueId()
    };
    
    // Prepare data values with defaults
    const data = prepareEnhancedAnalyticsData(statisticsData, chartIds, options);
    
    // Get the skeleton template from the templates module
    const skeletonTemplate = enhancedAnalyticsTemplate;
    if (!skeletonTemplate) {
      throw new Error('Enhanced analytics skeleton template not found');
    }
    
    console.log(`Successfully loaded skeleton template (${skeletonTemplate.length} bytes)`);
    
    // Create prompt for Gemini
    const prompt = `
You are a highly skilled HTML/JavaScript developer. Your task is to create interactive data visualizations 
for an art appraisal application. I'll provide you with a skeleton template and data values.

Please replace all placeholders in the template (indicated by {{VARIABLE_NAME}}) with the corresponding values from the data.
Your response should include ONLY the fully realized HTML with CSS and JavaScript, no explanations.

IMPORTANT TASK DETAILS:
1. The skeleton template contains conditional placeholders like {{SHOW_HISTORY ? '' : 'style="display:none;"'}}
2. You must evaluate these conditionals based on the data values
3. If data.show_history is TRUE, the div.price-history-section should NOT have a style attribute
4. If data.show_history is FALSE, the div.price-history-section should have style="display:none;"
5. The price history chart data is in data.price_history_chart_data_json, which should be added as a data attribute named 'data-chart-data-history'

Here's the EXACT skeleton template to use:
\`\`\`html
${skeletonTemplate}
\`\`\`

Here's the data to insert (map data properties to template variables):
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

DATA MAPPING GUIDE (convert these data properties to template variables):
- data.title → {{TITLE}}
- data.show_radar → {{SHOW_RADAR}}
- data.show_history → {{SHOW_HISTORY}}
- data.show_stats → {{SHOW_STATS}}
- data.condition_score → {{CONDITION_SCORE}}
- data.rarity_score → {{RARITY_SCORE}}
- data.market_demand → {{MARKET_DEMAND_SCORE}}
- data.historical_significance → {{HISTORICAL_SIGNIFICANCE}}
- data.investment_potential → {{INVESTMENT_POTENTIAL}}
- data.provenance_strength → {{PROVENANCE_STRENGTH}}
- data.trend_class → {{TREND_CLASS}}
- data.price_trend → {{PRICE_TREND}}
- data.price_history_chart_data_json → {{HISTORY_CHART_DATA_JSON}}
- data.chartIds.price → {{CHART_ID_PRICE}}
- data.chartIds.radar → {{CHART_ID_RADAR}}
- (and so on for all variables in the template)

Pay very careful attention to the price history section. You should:
1. Properly evaluate {{SHOW_HISTORY ? '' : 'style="display:none;"'}} based on data.show_history
2. Add the attribute data-chart-data-history='{{HISTORY_CHART_DATA_JSON}}' to the price-chart-wrapper div
3. Make sure the chart will initialize properly with the data from this attribute

Final output should be the complete, working HTML visualization with all placeholders replaced.
    `;
    
    // Generate content with Gemini
    const genResult = await model.generateContent(prompt);
    const response = await genResult.response;
    const generatedHtml = response.text();
    
    // Check if generation was successful
    if (!generatedHtml || generatedHtml.length < 100) {
      console.error('Invalid or empty response from Gemini:', generatedHtml);
      throw new Error('Failed to generate enhanced analytics HTML: Empty or invalid response');
    }
    
    console.log(`Generated enhanced analytics HTML (${generatedHtml.length} bytes)`);
    return generatedHtml;
  } catch (error) {
    console.error('Error generating enhanced analytics with Gemini:', error);
    throw error;
  }
}

/**
 * Generates appraisal card HTML using Gemini
 * @param {Object} appraisalData - Appraisal data for visualization
 * @param {Object} statisticsData - Statistics data for visualization
 * @param {Object} options - Optional parameters for customization
 * @returns {Promise<string>} - HTML content for appraisal card
 */
async function generateAppraisalCardWithGemini(appraisalData, statisticsData, options = {}) {
  try {
    console.log('Generating appraisal card with Gemini');
    
    // Validate input data
    if (!appraisalData) {
      console.warn('No appraisal data provided for appraisal card');
      return '';
    }
    
    // Initialize Gemini client if needed
    if (!geminiClient) {
      await initializeGeminiClient();
    }
    
    // Get the generative model
    const model = geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Generate unique chart IDs
    const chartIds = {
      gauge: 'gauge-chart-' + generateUniqueId(),
      metrics: 'metrics-chart-' + generateUniqueId(),
      market: 'market-chart-' + generateUniqueId()
    };
    
    // Prepare data context for the appraisal card
    const data = prepareAppraisalCardData(appraisalData, statisticsData, chartIds, options);
    
    // Get the skeleton template from the templates module
    const skeletonTemplate = appraisalCardTemplate;
    if (!skeletonTemplate) {
      throw new Error('Appraisal card skeleton template not found');
    }
    
    console.log(`Successfully loaded skeleton template (${skeletonTemplate.length} bytes)`);
    
    // Create prompt for Gemini
    const prompt = `
You are a skilled HTML/JavaScript developer specializing in data visualization.
Your task is to create an appraisal card for an artwork or collectible item.

Please replace all placeholders in the template (indicated by {{VARIABLE_NAME}}) with the corresponding values from the data.
Your response should include ONLY the fully realized HTML with CSS and JavaScript, no explanations.

IMPORTANT GUIDELINES:
1. Maintain the exact HTML structure of the template
2. Replace all {{PLACEHOLDER}} variables with values from the data object
3. For any missing data points, use appropriate fallbacks or placeholders
4. Pay special attention to chart data attributes which must be correctly formatted JSON
5. Make sure the tab structure and interactions work correctly
6. Ensure all IDs are unique by using the provided chart IDs

Here's the EXACT skeleton template to use:
\`\`\`html
${skeletonTemplate}
\`\`\`

Here's the data to insert (map data properties to template variables):
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

DATA MAPPING GUIDE (convert these data properties to template variables):
- data.post_id → {{POST_ID}}
- data.current_date → {{CURRENT_DATE}}
- data.formatted_value → {{VALUE_FORMATTED}}
- data.artwork_image_url → {{ARTWORK_IMAGE_URL}}
- data.artwork_title → {{ARTWORK_TITLE}}
- data.artwork_creator → {{ARTWORK_CREATOR}}
- data.object_type → {{OBJECT_TYPE}}
- data.period_age → {{PERIOD_AGE}}
- data.medium → {{MEDIUM}}
- data.condition → {{CONDITION}}
- data.percentile → {{PERCENTILE}}
- data.price_trend → {{PRICE_TREND}}
- data.trend_class → {{TREND_CLASS}}
- data.metrics_chart_data_json → {{METRICS_CHART_DATA_JSON}}
- data.market_chart_data_json → {{MARKET_CHART_DATA_JSON}}
- data.analysis_text → {{ANALYSIS_TEXT}}
- data.market_demand_score → {{MARKET_DEMAND_SCORE}}
- data.rarity_score → {{RARITY_SCORE}}
- data.condition_score → {{CONDITION_SCORE}}
- data.historical_significance → {{HISTORICAL_SIGNIFICANCE}}
- data.provenance_strength → {{PROVENANCE_STRENGTH}}
- data.investment_potential → {{INVESTMENT_POTENTIAL}}
- data.chart_id_gauge → {{CHART_ID_GAUGE}}
- data.chart_id_metrics → {{CHART_ID_METRICS}}
- data.chart_id_market → {{CHART_ID_MARKET}}
- data.details_table_html → {{DETAILS_TABLE_HTML}}
- data.appraiser_name → {{APPRAISER_NAME}}
- data.full_report_url → {{FULL_REPORT_URL}}
- data.artwork_description → {{ARTWORK_DESCRIPTION}}

Pay special attention to the tab navigation system. Ensure that all data-tab attributes and corresponding panel IDs match correctly.
Verify that all chart canvas elements have the correct IDs.

Final output should be the complete, working HTML visualization with all placeholders replaced.
    `;
    
    // Generate content with Gemini
    const genResult = await model.generateContent(prompt);
    const response = await genResult.response;
    const generatedHtml = response.text();
    
    // Check if generation was successful
    if (!generatedHtml || generatedHtml.length < 100) {
      console.error('Invalid or empty response from Gemini:', generatedHtml);
      throw new Error('Failed to generate appraisal card HTML: Empty or invalid response');
    }
    
    console.log(`Generated appraisal card HTML (${generatedHtml.length} bytes)`);
    return generatedHtml;
  } catch (error) {
    console.error('Error generating appraisal card with Gemini:', error);
    // Fall back to the original appraisal card generation
    return fallbackAppraisalCardGeneration(appraisalData, statisticsData, options);
  }
}

/**
 * Prepares data for enhanced analytics visualization
 * @param {Object} statsData - Statistics data
 * @param {Object} chartIds - Unique IDs for charts
 * @param {Object} options - Optional parameters
 * @returns {Object} - Prepared data for visualization
 */
function prepareEnhancedAnalyticsData(statsData, chartIds, options = {}) {
  // Default values for when data is missing
  const defaults = {
    condition_score: 70,
    rarity_score: 65,
    market_demand: 60,
    historical_significance: 75,
    investment_potential: 68,
    provenance_strength: 72,
    avg_price: '$4,250',
    median_price: '$4,400',
    price_trend: '+5.2%',
    price_min: '$2,100',
    price_max: '$6,800',
    percentile: '68th',
    confidence: 'High',
    coefficient_variation: 15.8,
    count: 5,
    std_dev: '$650',
    current_price: 4500,
    value: '$4,500',
    formatted_value: '$4,500',
    target_position: 50,
    raw_value: 4500
  };
  
  // Specifically handle price history data
  let hasPriceHistory = false;
  let priceHistory = [];
  
  if (statsData.price_history && Array.isArray(statsData.price_history) && statsData.price_history.length > 1) {
    priceHistory = statsData.price_history;
    hasPriceHistory = true;
    console.log(`Found valid price history data with ${priceHistory.length} points`);
  } else {
    console.log('No valid price history data found or insufficient data points');
    
    // Check if we have price history data in a different format
    if (statsData.historical_prices && Array.isArray(statsData.historical_prices) && statsData.historical_prices.length > 1) {
      priceHistory = statsData.historical_prices.map(item => ({
        year: item.year || item.date,
        price: item.price || item.value
      }));
      hasPriceHistory = true;
      console.log(`Found alternative price history data with ${priceHistory.length} points`);
    } else {
      console.log('No alternative price history data found');
      priceHistory = [];
    }
  }
  
  // Handle override from options
  if (options.showHistory === false) {
    console.log('Price history display explicitly disabled via options');
    hasPriceHistory = false;
  } else if (options.showHistory === true && priceHistory.length <= 1) {
    console.log('Price history display forced via options, but not enough data points');
    // Create minimal dummy data to satisfy the chart
    if (priceHistory.length === 0) {
      const currentYear = new Date().getFullYear();
      priceHistory = [
        { year: currentYear - 1, price: 0 },
        { year: currentYear, price: 0 }
      ];
    }
    hasPriceHistory = true;
  }
  
  // Extract data from statistics or use defaults
  const data = {
    // Chart IDs matching the template variables
    CHART_ID_RADAR: chartIds.radar,
    CHART_ID_PRICE: chartIds.price,
    CHART_ID_GAUGE: chartIds.gauge,
    
    // Template title
    TITLE: options.title || 'Enhanced Market Analytics',
    
    // Section visibility flags - uppercase to match template variables
    SHOW_RADAR: options.showRadar !== false,
    SHOW_HISTORY: hasPriceHistory,
    SHOW_STATS: options.showStats !== false,
    
    // Core statistics - uppercase to match template variables
    CONDITION_SCORE: statsData.condition_score || defaults.condition_score,
    RARITY_SCORE: statsData.rarity || defaults.rarity_score,
    MARKET_DEMAND_SCORE: statsData.market_demand || defaults.market_demand,
    HISTORICAL_SIGNIFICANCE: statsData.historical_significance || defaults.historical_significance,
    INVESTMENT_POTENTIAL: statsData.investment_potential || defaults.investment_potential,
    PROVENANCE_STRENGTH: statsData.provenance_strength || defaults.provenance_strength,
    
    // Price statistics
    AVG_PRICE_FORMATTED: statsData.average_price ? '$' + numberWithCommas(statsData.average_price) : defaults.avg_price,
    MEDIAN_PRICE_FORMATTED: statsData.median_price ? '$' + numberWithCommas(statsData.median_price) : defaults.median_price,
    PRICE_TREND: statsData.price_trend_percentage || defaults.price_trend,
    PRICE_MIN_FORMATTED: statsData.price_min ? '$' + numberWithCommas(statsData.price_min) : defaults.price_min,
    PRICE_MAX_FORMATTED: statsData.price_max ? '$' + numberWithCommas(statsData.price_max) : defaults.price_max,
    
    // Position and confidence
    PERCENTILE: statsData.percentile || defaults.percentile,
    CONFIDENCE_LEVEL: statsData.confidence_level || defaults.confidence,
    COEFFICIENT_VARIATION: statsData.coefficient_of_variation || defaults.coefficient_variation,
    TOTAL_COUNT: statsData.count || defaults.count,
    STD_DEV_FORMATTED: statsData.standard_deviation ? '$' + numberWithCommas(statsData.standard_deviation) : defaults.std_dev,
    
    // Value data
    VALUE: statsData.value || defaults.current_price,
    VALUE_FORMATTED: statsData.value ? '$' + numberWithCommas(statsData.value) : defaults.value,
    TARGET_POSITION: statsData.target_marker_position || defaults.target_position,
    
    // Trend calculations
    TREND_CLASS: (statsData.price_trend_percentage || '').includes('+') ? 'positive' : 'negative',
    APPRECIATION_STATUS: (statsData.price_trend_percentage || '').includes('+') ? 'appreciating' : 'depreciating',
    MARKET_TIMING: (statsData.price_trend_percentage || '').includes('+') ? 'Favorable' : 'Challenging',
    
    // Market prediction
    PREDICTED_VALUE_FORMATTED: calculateMarketPrediction(statsData.value, statsData.price_trend_percentage),
    NEXT_YEAR: new Date().getFullYear() + 1,
    
    // Percentile calculations
    PERCENTILE_NUMBER: parseInt(String(statsData.percentile || '').replace(/\D/g, '')) || 75,
    PERCENTILE_ROTATION: (parseInt(String(statsData.percentile || '').replace(/\D/g, '')) || 75) / 100 * 180,
    
    // Chart data
    histogram: statsData.histogram || [],
    comparable_sales: statsData.comparable_sales || [],
    COUNT: statsData.count || defaults.count,
    POST_ID: options.postId || 'default',
    
    // Price history data
    price_history: priceHistory,
    
    // Confidence level class
    CONFIDENCE_LEVEL_CLASS: getConfidenceClass(statsData.confidence_level)
  };
  
  // Prepare histogram HTML if data exists
  if (statsData.histogram && Array.isArray(statsData.histogram) && statsData.histogram.length > 0) {
    let histogramBarsHtml = '';
    let histogramAxisHtml = '';
    
    statsData.histogram.forEach(bucket => {
      histogramBarsHtml += `<div class="modern-bar-wrap">
        <div class="modern-bar ${bucket.contains_target ? 'highlighted' : ''}" style="height: ${bucket.height}%;"></div>
        <div class="bar-tooltip">$${numberWithCommas(bucket.min)}-$${numberWithCommas(bucket.max)}<br>${bucket.count} items</div>
      </div>`;
    });
    
    // Generate axis labels
    const firstBucket = statsData.histogram[0];
    const lastBucket = statsData.histogram[statsData.histogram.length - 1];
    if (firstBucket && lastBucket) {
      histogramAxisHtml = `<span>$${numberWithCommas(firstBucket.min)}</span><span>$${numberWithCommas(lastBucket.max)}</span>`;
    }
    
    data.HISTOGRAM_BARS_HTML = histogramBarsHtml;
    data.HISTOGRAM_AXIS_HTML = histogramAxisHtml;
    data.HISTOGRAM_DATA_JSON = JSON.stringify(statsData.histogram);
  }
  
  // Prepare sales table rows if data exists
  if (statsData.comparable_sales && Array.isArray(statsData.comparable_sales) && statsData.comparable_sales.length > 0) {
    let salesTableRowsHtml = '';
    
    statsData.comparable_sales.forEach(sale => {
      const diffClass = sale.diff && sale.diff.includes('+') ? 'diff-positive' : 
                       (sale.diff && sale.diff.includes('-') ? 'diff-negative' : '');
      
      salesTableRowsHtml += `<tr class="${sale.is_current ? 'highlight-row' : ''}">
        <td>${sale.title || 'Unknown Item'}</td>
        <td>${sale.house || '-'}</td>
        <td>${sale.date || '-'}</td>
        <td>${typeof sale.price === 'number' ? '$' + numberWithCommas(sale.price) : (sale.price || '-')}</td>
        <td class="${diffClass}">${sale.diff || '-'}</td>
      </tr>`;
    });
    
    data.SALES_TABLE_ROWS_HTML = salesTableRowsHtml;
    data.SALES_DATA_JSON = JSON.stringify(statsData.comparable_sales);
  }
  
  // Prepare radar chart data
  const radarData = {
    labels: [
      'Condition',
      'Rarity',
      'Market Demand',
      'Historical Significance',
      'Investment Potential',
      'Provenance'
    ],
    datasets: [{
      label: 'Item Metrics',
      data: [
        data.CONDITION_SCORE,
        data.RARITY_SCORE,
        data.MARKET_DEMAND_SCORE,
        data.HISTORICAL_SIGNIFICANCE,
        data.INVESTMENT_POTENTIAL,
        data.PROVENANCE_STRENGTH
      ],
      fill: true,
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgb(54, 162, 235)',
      pointBackgroundColor: 'rgb(54, 162, 235)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(54, 162, 235)'
    }]
  };
  data.RADAR_CHART_DATA_JSON = JSON.stringify(radarData);
  
  // Prepare chart data for price history
  if (hasPriceHistory && priceHistory.length > 0) {
    console.log(`Preparing price history chart data with ${priceHistory.length} points`);
    
    // Sort price history by year
    priceHistory.sort((a, b) => {
      // Handle different year formats (string or number)
      const yearA = typeof a.year === 'string' ? parseInt(a.year, 10) : a.year;
      const yearB = typeof b.year === 'string' ? parseInt(b.year, 10) : b.year;
      return yearA - yearB;
    });
    
    const historyChartData = {
      labels: priceHistory.map(p => p.year),
      datasets: [{
        label: 'Comparable Items',
        data: priceHistory.map(p => p.price),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
    
    // Add the current item's data point if available
    if (statsData.value) {
      const currentYear = new Date().getFullYear();
      historyChartData.datasets.push({
        label: 'Your Item',
        data: priceHistory.map(p => p.year == currentYear ? statsData.value : null).filter(v => v !== null),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        pointRadius: 6,
        pointHoverRadius: 8
      });
    }
    
    // Store the chart data as JSON string
    data.HISTORY_CHART_DATA_JSON = JSON.stringify(historyChartData);
  } else {
    console.log('Not preparing price history chart data due to insufficient data');
    data.SHOW_HISTORY = false;
  }
  
  return data;
}

/**
 * Prepares data for appraisal card visualization
 * @param {Object} appraisalData - Appraisal data from the backend
 * @param {Object} statsData - Statistics data from the backend
 * @param {Object} chartIds - Unique chart IDs
 * @returns {Object} - Prepared data for template
 */
function prepareAppraisalCardData(appraisalData, statsData, chartIds, options = {}) {
  // Default values for when data is missing
  const defaults = {
    title: 'Untitled Artwork',
    creator: 'Unknown Artist',
    object_type: 'Art Object',
    age: '20th Century',
    medium: 'Mixed Media',
    condition: 'Good',
    market_demand: 75,
    rarity: 70,
    condition_score: 80,
    value: 4500,
    formatted_value: '$4,500 USD',
    percentile: '75th',
    price_trend: '+8.5%',
    confidence: 'High',
    featured_image_html: '<div class="placeholder-image"><span>No Image Available</span></div>',
    appraiser_name: 'Andrés Gómez'
  };
  
  // Generate current date
  const current_date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Extract featured image HTML
  let featured_image_html = defaults.featured_image_html;
  if (appraisalData.featured_image) {
    featured_image_html = `<img src="${appraisalData.featured_image}" alt="${appraisalData.title || defaults.title}" class="featured-artwork">`;
  }
  
  // Extract data from the appraisal and stats objects or use defaults
  const data = {
    // Chart IDs
    gauge_chart_id: chartIds.gauge,
    metrics_chart_id: chartIds.metrics,
    market_chart_id: chartIds.market,
    
    // Core appraisal data
    title: appraisalData.title || defaults.title,
    creator: appraisalData.creator || defaults.creator,
    object_type: appraisalData.object_type || defaults.object_type,
    age: appraisalData.estimated_age || defaults.age,
    medium: appraisalData.medium || defaults.medium,
    condition: appraisalData.condition_summary || defaults.condition,
    
    // Metrics
    market_demand: parseInt(appraisalData.market_demand || defaults.market_demand),
    rarity: parseInt(appraisalData.rarity || defaults.rarity),
    condition_score: parseInt(appraisalData.condition_score || defaults.condition_score),
    
    // Value
    value: parseInt(appraisalData.value || defaults.value),
    formatted_value: '$' + numberWithCommas(parseInt(appraisalData.value || defaults.value)) + ' USD',
    
    // Stats data
    percentile: statsData.percentile || defaults.percentile,
    price_trend: statsData.price_trend_percentage || defaults.price_trend,
    confidence: statsData.confidence_level || defaults.confidence,
    
    // UI elements
    featured_image_html,
    current_date,
    appraiser_name: appraisalData.appraiser_name || defaults.appraiser_name,
    
    // Styling classes
    trend_class: (statsData.price_trend_percentage || '').includes('+') ? 'positive' : 'negative',
    is_trend_positive: (statsData.price_trend_percentage || '').includes('+'),
    
    // Details table data (for template generation)
    artwork_fields: [
      {key: 'creator', label: 'Artist\'s Name'},
      {key: 'artist_dates', label: 'Artist\'s Date of Birth and Death'},
      {key: 'title', label: 'Title of Artwork'},
      {key: 'estimated_age', label: 'Period/Age'},
      {key: 'color_palette', label: 'Color Palette'},
      {key: 'style', label: 'Art Style/Period'},
      {key: 'medium', label: 'Medium'},
      {key: 'dimensions', label: 'Dimensions'},
      {key: 'framed', label: 'Is it Framed?'},
      {key: 'edition', label: 'Edition Information'},
      {key: 'publisher', label: 'Printer/Publisher'},
      {key: 'composition_description', label: 'Composition Description'},
      {key: 'condition_summary', label: 'Condition'},
      {key: 'signed', label: 'Is it signed?'},
      {key: 'provenance', label: 'Provenance Information'},
      {key: 'registration_number', label: 'Registration Number'},
      {key: 'notes', label: 'Additional Notes'},
      {key: 'coa', label: 'COA?'},
      {key: 'meaning', label: 'Possible Meaning of the composition'}
    ],
    
    // Complete appraisal data for details table generation
    appraisalData
  };
  
  // Generate analysis text
  if (statsData && Object.keys(statsData).length > 0) {
    // Use stats data to create analysis text
    if (statsData.count && statsData.average_price && statsData.value) {
      const summary_total_count = statsData.total_count || statsData.count;
      let text = `Market analysis reveals ${summary_total_count} comparable items with an average value of $${numberWithCommas(statsData.average_price)}. `;
      
      text += `Your item's value of $${numberWithCommas(statsData.value)} places it in the ${statsData.percentile || '60th'} percentile, with a ${statsData.price_trend_percentage || (data.is_trend_positive ? '+5.2%' : '-1.8%')} average annual growth rate. `;
      
      text += `Market confidence: ${statsData.confidence_level || 'Moderate'}`;
      
      data.analysis_text = text;
    } else {
      // Fallback text
      data.analysis_text = `Market analysis reveals ${data.is_trend_positive ? 'strong' : 'moderate'} demand for similar items with ${data.is_trend_positive ? 'consistent price appreciation' : 'stable pricing'} over the past 5 years.`;
    }
  } else {
    // Default analysis text
    data.analysis_text = `Market analysis reveals ${data.is_trend_positive ? 'strong' : 'moderate'} demand for similar items with ${data.is_trend_positive ? 'consistent price appreciation' : 'stable pricing'} over the past 5 years.`;
  }
  
  return data;
}

/**
 * Fallback function to generate enhanced analytics HTML without Gemini
 * @param {Object} statisticsData - Statistics data for visualization
 * @param {Object} options - Optional parameters for customization
 * @returns {string} - HTML content for enhanced analytics
 */
function fallbackEnhancedAnalyticsGeneration(statisticsData, options = {}) {
  try {
    console.log('Fallback enhanced analytics generation requested but not available');
    throw new Error('Fallback enhanced analytics generation not implemented - old template files have been removed');
  } catch (error) {
    console.error('Error in fallback enhanced analytics generation:', error);
    throw error;
  }
}

/**
 * Fallback function to generate appraisal card HTML without Gemini
 * @param {Object} appraisalData - Appraisal data for visualization
 * @param {Object} statisticsData - Statistics data for visualization
 * @param {Object} options - Optional parameters for customization
 * @returns {string} - HTML content for appraisal card
 */
function fallbackAppraisalCardGeneration(appraisalData, statisticsData, options = {}) {
  try {
    console.log('Fallback appraisal card generation requested but not available');
    throw new Error('Fallback appraisal card generation not implemented - old template files have been removed');
  } catch (error) {
    console.error('Error in fallback appraisal card generation:', error);
    throw error;
  }
}

/**
 * Helper function to format numbers with commas
 * @param {number} number - Number to format
 * @returns {string} - Formatted number string
 */
function numberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generate a unique ID for chart elements
 * @returns {string} - Random ID string
 */
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate market prediction based on current value and trend
 * @param {number} value - Current value
 * @param {string} trendPercentage - Price trend percentage
 * @returns {string} - Formatted market prediction
 */
function calculateMarketPrediction(value, trendPercentage) {
  const currentValue = value || 4500;
  let trendValue = 5.2; // Default to 5.2% if not provided
  
  if (trendPercentage) {
    // Extract numeric value from string like '+5.2%' or '-1.8%'
    trendValue = parseFloat(trendPercentage.replace(/[^0-9.-]/g, '')) || 5.2;
    if (trendPercentage.includes('-')) {
      trendValue = -trendValue; // Ensure negative values are handled correctly
    }
  }
  
  const futureValue = Math.round(currentValue * (1 + (trendValue / 100)));
  return '$' + numberWithCommas(futureValue);
}

/**
 * Get confidence class based on confidence level
 * @param {string} confidenceLevel - Confidence level string
 * @returns {string} - CSS class for confidence
 */
function getConfidenceClass(confidenceLevel) {
  if (!confidenceLevel) return 'medium';
  
  const level = confidenceLevel.toLowerCase();
  if (level.includes('very high')) return 'very-high';
  if (level.includes('high')) return 'high';
  if (level.includes('medium') || level.includes('moderate')) return 'medium';
  if (level.includes('low')) return 'low';
  if (level.includes('very low')) return 'very-low';
  
  return 'medium'; // Default
}

module.exports = {
  initializeGeminiClient,
  generateEnhancedAnalyticsWithGemini,
  generateAppraisalCardWithGemini
};