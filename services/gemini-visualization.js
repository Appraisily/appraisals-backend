/**
 * Gemini Visualization Service
 * Uses Google's Gemini AI to generate visualization HTML
 * based on statistical data and templates
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretClient = new SecretManagerServiceClient();
const {
  ENHANCED_ANALYTICS_TEMPLATE,
  APPRAISAL_CARD_TEMPLATE
} = require('../templates/gemini-templates');

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
    
    // Extract options
    const opts = {
      showRadar: options.showRadar !== false,
      showHistory: options.showHistory !== false,
      showStats: options.showStats !== false,
      title: options.title || 'Enhanced Market Analytics',
      ...options
    };
    
    // Generate unique chart IDs
    const chartIds = {
      radar: 'radar-chart-' + generateUniqueId(),
      price: 'price-chart-' + generateUniqueId(),
      gauge: 'gauge-chart-' + generateUniqueId()
    };
    
    // Prepare data values with defaults
    const data = prepareEnhancedAnalyticsData(statisticsData, chartIds);
    
    // Create prompt for Gemini
    const prompt = `
You are a highly skilled HTML/JavaScript developer. Your task is to create interactive data visualizations 
for an art appraisal application. I'll provide you with a template and data values.

Please replace all placeholders in the template (indicated by {{name}}) with the corresponding values from the data.
Your response should include ONLY the fully realized HTML with CSS and JavaScript, no explanations.

Important guidelines:
1. If data is missing, use sensible defaults rather than showing empty values
2. Keep all CSS and JavaScript functionality intact
3. Format currency values appropriately with $ and commas
4. Generate unique IDs for chart elements to avoid DOM conflicts
5. Handle all edge cases gracefully

Here's the template:
\`\`\`html
${ENHANCED_ANALYTICS_TEMPLATE}
\`\`\`

And here's the data to insert (some values may be missing):
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

For histogram bars, generate proper HTML from the histogram data. For each histogram bucket, create:
\`<div class="modern-bar-wrap">
  <div class="modern-bar ${bucket.contains_target ? \'highlighted\' : \'\'}" style="height: ${bucket.height}%;"> // eslint-disable-line no-undef
  </div>
  <div class="bar-tooltip">Price range and count info</div>
</div>\`

For the sales table, generate rows from comparable_sales data. Each row should follow:
\`<tr class="${sale.is_current ? \'highlight-row\' : \'\'}"> // eslint-disable-line no-undef
  <td>${sale.title}</td> // eslint-disable-line no-undef
  <td>${sale.house}</td> // eslint-disable-line no-undef
  <td>${sale.date}</td> // eslint-disable-line no-undef
  <td>${formatPrice(sale.price)}</td> // eslint-disable-line no-undef
  <td class="${diffClass}">${sale.diff}</td> // eslint-disable-line no-undef
</tr>\`

For confidence dots, generate spans with appropriate classes.

Final output should be the complete, working HTML visualization.
    `;
    
    // Request completion from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedHtml = response.text();
    
    if (!generatedHtml || generatedHtml.length < 100) {
      throw new Error('Generated HTML is too short or empty');
    }
    
    console.log('Successfully generated enhanced analytics HTML with Gemini');
    return generatedHtml;
  } catch (error) {
    console.error('Error generating enhanced analytics with Gemini:', error);
    
    // Fallback to basic HTML generation with templates
    console.log('Using fallback enhanced analytics HTML generation');
    return fallbackEnhancedAnalyticsGeneration(statisticsData, options);
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
      console.warn('No appraisal data provided');
      appraisalData = {}; // Use empty object, Gemini will handle fallbacks
    }
    
    if (!statisticsData) {
      console.warn('No statistics data provided for appraisal card');
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
      gauge: 'gauge-chart-' + generateUniqueId(),
      metrics: 'metrics-chart-' + generateUniqueId(),
      market: 'market-chart-' + generateUniqueId()
    };
    
    // Prepare data values with defaults
    const data = prepareAppraisalCardData(appraisalData, statisticsData, chartIds);
    
    // Create prompt for Gemini
    const prompt = `
You are a highly skilled HTML/JavaScript developer. Your task is to create an interactive appraisal card 
for an art appraisal application. I'll provide you with a template and data values.

Please replace all placeholders in the template (indicated by {{name}}) with the corresponding values from the data.
Your response should include ONLY the fully realized HTML with CSS and JavaScript, no explanations.

Important guidelines:
1. If data is missing, use sensible defaults rather than showing empty values
2. Keep all CSS and JavaScript functionality intact
3. Format currency values appropriately with $ and commas
4. Generate unique IDs for chart elements to avoid DOM conflicts
5. Handle all edge cases gracefully

Here's the template:
\`\`\`html
${APPRAISAL_CARD_TEMPLATE}
\`\`\`

And here's the data to insert (some values may be missing):
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

For the details table, generate rows from the artwork fields. For example:
\`<tr><th>Creator</th><td>Pablo Picasso</td></tr>\`

For featured image, use the provided HTML or fallback to placeholder.

For styling classes, apply 'positive' class when values are increasing, 'negative' when decreasing.

Final output should be the complete, working HTML visualization.
    `;
    
    // Request completion from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedHtml = response.text();
    
    if (!generatedHtml || generatedHtml.length < 100) {
      throw new Error('Generated HTML is too short or empty');
    }
    
    console.log('Successfully generated appraisal card HTML with Gemini');
    return generatedHtml;
  } catch (error) {
    console.error('Error generating appraisal card with Gemini:', error);
    
    // Fallback to basic HTML generation with templates
    console.log('Using fallback appraisal card HTML generation');
    return fallbackAppraisalCardGeneration(appraisalData, statisticsData, options);
  }
}

/**
 * Prepares data for enhanced analytics visualization
 * @param {Object} statsData - Statistics data from the backend
 * @param {Object} chartIds - Unique chart IDs
 * @returns {Object} - Prepared data for template
 */
function prepareEnhancedAnalyticsData(statsData, chartIds) {
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
    confidence_class: 'high',
    coefficient_variation: 15.8,
    count: 5,
    std_dev: '$650',
    current_price: 4500,
    value: '$4,500',
    target_position: 50,
    raw_value: 4500,
    is_trend_positive: true,
    trend_class: 'positive',
    market_timing: 'Favorable',
    market_segment: 'appreciating'
  };
  
  // Extract data from statistics or use defaults
  const data = {
    chartIds,
    title: 'Enhanced Market Analytics',
    
    // Core statistics
    condition_score: statsData.condition_score || defaults.condition_score,
    rarity_score: statsData.rarity || defaults.rarity_score,
    market_demand: statsData.market_demand || defaults.market_demand,
    historical_significance: statsData.historical_significance || defaults.historical_significance,
    investment_potential: statsData.investment_potential || defaults.investment_potential,
    provenance_strength: statsData.provenance_strength || defaults.provenance_strength,
    
    // Price statistics
    avg_price: statsData.average_price ? '$' + numberWithCommas(statsData.average_price) : defaults.avg_price,
    median_price: statsData.median_price ? '$' + numberWithCommas(statsData.median_price) : defaults.median_price,
    price_trend: statsData.price_trend_percentage || defaults.price_trend,
    price_min: statsData.price_min ? '$' + numberWithCommas(statsData.price_min) : defaults.price_min,
    price_max: statsData.price_max ? '$' + numberWithCommas(statsData.price_max) : defaults.price_max,
    
    // Position and confidence
    percentile: statsData.percentile || defaults.percentile,
    confidence: statsData.confidence_level || defaults.confidence,
    coefficient_variation: statsData.coefficient_of_variation || defaults.coefficient_variation,
    count: statsData.count || defaults.count,
    std_dev: statsData.standard_deviation ? '$' + numberWithCommas(statsData.standard_deviation) : defaults.std_dev,
    
    // Value data
    current_price: statsData.value || defaults.current_price,
    value: statsData.value ? '$' + numberWithCommas(statsData.value) : defaults.value,
    formatted_value: statsData.value ? '$' + numberWithCommas(statsData.value) : defaults.value,
    target_position: statsData.target_marker_position || defaults.target_position,
    raw_value: statsData.value || defaults.raw_value,
    
    // Trend calculations
    is_trend_positive: (statsData.price_trend_percentage || '').includes('+'),
    trend_class: (statsData.price_trend_percentage || '').includes('+') ? 'positive' : 'negative',
    market_timing: (statsData.price_trend_percentage || '').includes('+') ? 'Favorable' : 'Challenging',
    market_segment: (statsData.price_trend_percentage || '').includes('+') ? 'appreciating' : 'depreciating',
    
    // Market prediction
    market_prediction: calculateMarketPrediction(statsData.value, statsData.price_trend_percentage),
    prediction_year: new Date().getFullYear() + 1,
    
    // Percentile calculations
    percentile_number: parseInt(String(statsData.percentile || '').replace(/\D/g, '')) || 75,
    gauge_rotation: (parseInt(String(statsData.percentile || '').replace(/\D/g, '')) || 75) / 100 * 180,
    
    // Chart data
    histogram: statsData.histogram || [],
    comparable_sales: statsData.comparable_sales || [],
    sales_count: (statsData.comparable_sales || []).length,
    
    // Confidence indicator dots
    confidence_dots: generateConfidenceDots(statsData.confidence_level)
  };
  
  return data;
}

/**
 * Prepares data for appraisal card visualization
 * @param {Object} appraisalData - Appraisal data from the backend
 * @param {Object} statsData - Statistics data from the backend
 * @param {Object} chartIds - Unique chart IDs
 * @returns {Object} - Prepared data for template
 */
function prepareAppraisalCardData(appraisalData, statsData, chartIds) {
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
    console.log('Using fallback enhanced analytics HTML generation');
    
    // Import original generation function
    const { generateEnhancedAnalytics } = require('../templates/enhanced-analytics');
    
    // Generate HTML using the original function
    return generateEnhancedAnalytics(statisticsData, options);
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
    console.log('Using fallback appraisal card HTML generation');
    
    // Import original generation function
    const { generateAppraisalCard } = require('../templates/appraisal-card');
    
    // Generate HTML using the original function
    return generateAppraisalCard(appraisalData, statisticsData, options);
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
  return Math.random().toString(36).substring(2, 15);
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
 * Generate HTML for confidence level indicator dots
 * @param {string} confidenceLevel - Confidence level string
 * @returns {string} - HTML for confidence indicator dots
 */
function generateConfidenceDots(confidenceLevel) {
  let confidenceValue = 4; // Default: High (4 dots)
  
  if (confidenceLevel === 'Very High') {
    confidenceValue = 5;
  } else if (confidenceLevel === 'High') {
    confidenceValue = 4;
  } else if (confidenceLevel === 'Medium' || confidenceLevel === 'Moderate') {
    confidenceValue = 3;
  } else if (confidenceLevel === 'Low') {
    confidenceValue = 2;
  } else if (confidenceLevel === 'Very Low') {
    confidenceValue = 1;
  }
  
  let dotsHtml = '';
  for (let i = 1; i <= 5; i++) {
    const active = i <= confidenceValue ? '' : 'inactive';
    dotsHtml += `<span class="dot ${active}"></span>`;
  }
  
  return dotsHtml;
}

module.exports = {
  initializeGeminiClient,
  generateEnhancedAnalyticsWithGemini,
  generateAppraisalCardWithGemini
};