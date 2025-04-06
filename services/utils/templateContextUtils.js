// services/utils/templateContextUtils.js

// --- Helper Functions (Moved from visualization.js / Original Templates) ---

function numberWithCommas(x) {
    if (x === null || x === undefined || isNaN(x)) return '0'; // Default to 0 if invalid
    // Ensure it's a number before formatting
    const num = Number(x);
    return num.toLocaleString('en-US'); // Use localeString for better formatting
}

function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function confidenceToNumeric(level) {
    const conf = String(level).toLowerCase();
    if (conf.includes('very high')) return 5;
    if (conf.includes('high')) return 4;
    if (conf.includes('medium') || conf.includes('moderate')) return 3;
    if (conf.includes('low')) return 2;
    if (conf.includes('very low')) return 1;
    return 0; // Default for unknown or very low
}

function generateConfidenceDotsHtml(level) {
    let html = '';
    const numLevel = typeof level === 'number' ? level : confidenceToNumeric(level);
    for (let i = 1; i <= 5; i++) {
        const active = i <= numLevel ? '' : 'inactive';
        html += `<span class="dot ${active}"></span>`;
    }
    return html;
}

// Simplified analysis text - can be expanded based on original template logic
function generateAnalysisText(stats) {
    if (!stats || stats.count === 0) {
        return 'Insufficient data for detailed market analysis.';
    }
    const trendText = (stats.price_trend_percentage || '').includes('+') ? 'positive' : 'negative';
    return `Market analysis based on ${stats.total_count || stats.count} comparable items suggests a ${trendText} trend (${stats.price_trend_percentage || 'N/A'}). Your item is positioned in the ${stats.percentile || 'N/A'} percentile with ${stats.confidence_level || 'N/A'} confidence.`;
}

// Generates table rows for appraisal details - requires appraisal object structure
function generateDetailsTableHtml(appraisal) {
    let html = '';
    const detailsMap = {
        'Title': appraisal.title,
        'Creator': appraisal.creator,
        'Object Type': appraisal.object_type,
        'Estimated Age': appraisal.estimated_age,
        'Medium': appraisal.medium,
        'Dimensions': appraisal.dimensions,
        'Condition Summary': appraisal.condition_summary,
        'Signed': appraisal.signed,
        'Framed': appraisal.framed,
        'Provenance': appraisal.provenance,
        'COA': appraisal.coa,
        // Add more fields from appraisalData as needed
    };

    for (const [label, value] of Object.entries(detailsMap)) {
        if (value) { // Only show rows with values
            html += `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
        }
    }
    return html || '<tr><td colspan="2">No details available.</td></tr>';
}

// Canonical Statistics Object Structure (Expected Input for Context Prep)
/**
 * interface Statistics {
 *   value: number;                  // Target appraisal value
 *   count: number;                  // Number of comparable sales used
 *   total_count?: number;           // Total comparable sales found before filtering
 *   average_price?: number;
 *   median_price?: number;
 *   price_min?: number;
 *   price_max?: number;
 *   standard_deviation?: number;
 *   coefficient_of_variation?: number;
 *   percentile?: string;             // e.g., "75th"
 *   price_trend_percentage?: string; // e.g., "+5.2%"
 *   confidence_level?: string;       // e.g., "High", "Medium", "Low"
 *   target_marker_position?: number; // 0-100 percentage
 *   histogram?: Array<{ min: number; max: number; count: number; height: number; contains_target: boolean }>;
 *   comparable_sales?: Array<{ title: string; house: string; date: string; price: number; diff?: string; is_current?: boolean }>;
 *   price_history?: Array<{ year: string; price: number; index?: number }>; // Optional
 *   // Scores (Optional - Default to 0 if missing in stats object)
 *   historical_significance?: number;
 *   investment_potential?: number;
 *   provenance_strength?: number;
 *   // Note: condition_score, rarity, market_demand are read directly from appraisal object below
 * }
 */

// --- Data Context Preparation Functions ---

/**
 * Prepares the data context object for the enhanced-analytics skeleton.
 * @param {Statistics} stats - The sanitized statistics object.
 * @param {object} appraisal - The appraisal data object (should include ACF fields).
 * @param {string} postId - The WordPress post ID.
 * @returns {object} - A flat object mapping placeholders to values.
 */
function prepareDataContextForEnhancedAnalytics(stats, appraisal, postId) {
    stats = stats || {};
    appraisal = appraisal || {};
    const value = parseFloat(stats.value || appraisal.value || 0);
    const percentileNum = parseInt(String(stats.percentile || '0').replace(/\D/g, '')) || 0;
    const priceTrend = stats.price_trend_percentage || '+0.0%';
    const isTrendPositive = priceTrend.includes('+');

    // Prepare data needed for charts
    const radarData = {
        labels: ['Condition', 'Rarity', 'Market Demand', 'Hist. Significance', 'Invest. Potential', 'Provenance'],
        datasets: [{
            label: 'Item Metrics',
            data: [
                // Use scores directly from appraisal ACF if available, else default to 0
                parseFloat(appraisal.condition_score || 0),
                parseFloat(appraisal.rarity || 0),
                parseFloat(appraisal.market_demand || 0),
                // Use scores from stats (valuer-agent) if available, else default to 0
                stats.historical_significance || 0,
                stats.investment_potential || 0,
                stats.provenance_strength || 0
            ],
            // Styling options...
        }]
    };
    const historyData = {
        // Use stats.price_history if available
        labels: stats.price_history?.map(p => p.year) || [],
        datasets: [
            { label: 'Comparable Items', data: stats.price_history?.map(p => p.price) || [] },
        ]
    };

    return {
        TITLE: appraisal.title ? `Enhanced Market Analytics for ${escapeHtml(appraisal.title)}` : 'Enhanced Market Analytics',
        SHOW_RADAR: true, 
        SHOW_HISTORY: true,
        SHOW_STATS: true,
        // Use ACF scores directly
        CONDITION_SCORE: parseFloat(appraisal.condition_score || 0),
        RARITY_SCORE: parseFloat(appraisal.rarity || 0),
        MARKET_DEMAND_SCORE: parseFloat(appraisal.market_demand || 0),
        // Use stats scores (from valuer-agent) or default
        HISTORICAL_SIGNIFICANCE: stats.historical_significance || 0, 
        INVESTMENT_POTENTIAL: stats.investment_potential || 0,
        PROVENANCE_STRENGTH: stats.provenance_strength || 0,
        // ... (rest of the fields remain mostly the same, using defaults from stats object) ...
        AVG_PRICE_FORMATTED: `$${numberWithCommas(stats.average_price)}`,
        MEDIAN_PRICE_FORMATTED: `$${numberWithCommas(stats.median_price)}`,
        PRICE_TREND: priceTrend,
        PRICE_MIN_FORMATTED: `$${numberWithCommas(stats.price_min)}`,
        PRICE_MAX_FORMATTED: `$${numberWithCommas(stats.price_max)}`,
        PERCENTILE: stats.percentile || 'N/A',
        CONFIDENCE_LEVEL: stats.confidence_level || 'Low',
        COEFFICIENT_VARIATION: stats.coefficient_of_variation || 0,
        COUNT: stats.count || 0,
        TOTAL_COUNT: stats.total_count || stats.count || 0,
        STD_DEV_FORMATTED: `$${numberWithCommas(stats.standard_deviation)}`,
        VALUE_FORMATTED: `$${numberWithCommas(value)}`,
        TARGET_POSITION: stats.target_marker_position || 50,
        TREND_CLASS: isTrendPositive ? 'positive' : 'negative',
        IS_TREND_POSITIVE: isTrendPositive,
        PERCENTILE_NUMBER: percentileNum,
        PERCENTILE_ROTATION: percentileNum / 100 * 180,
        APPRECIATION_STATUS: isTrendPositive ? 'appreciating' : 'depreciating',
        MARKET_TIMING: isTrendPositive ? 'Favorable' : 'Challenging',
        CONFIDENCE_LEVEL_NUMERIC: confidenceToNumeric(stats.confidence_level),
        CONFIDENCE_LEVEL_CLASS: (stats.confidence_level || 'low').toLowerCase().replace(/\s+/g, '-'),
        NEXT_YEAR: new Date().getFullYear() + 1,
        PREDICTED_VALUE_FORMATTED: `$${numberWithCommas(Math.round(value * (1 + (parseFloat(String(priceTrend).replace(/[^0-9.-]/g, '')) / 100))))}`,
        RADAR_CHART_DATA_JSON: escapeHtml(JSON.stringify(radarData)),
        HISTORY_CHART_DATA_JSON: escapeHtml(JSON.stringify(historyData)),
        HISTOGRAM_DATA_JSON: escapeHtml(JSON.stringify(stats.histogram || [])),
        SALES_DATA_JSON: escapeHtml(JSON.stringify(stats.comparable_sales || [])),
        CONFIDENCE_DOTS_HTML: generateConfidenceDotsHtml(stats.confidence_level),
        HISTOGRAM_BARS_HTML: '<!-- Placeholder: Gemini/Client JS to generate -->',
        HISTOGRAM_AXIS_HTML: '<!-- Placeholder: Gemini/Client JS to generate -->',
        SALES_TABLE_ROWS_HTML: '<!-- Placeholder: Gemini/Client JS to generate -->',
        CHART_ID_RADAR: `radar-chart-${postId}`,
        CHART_ID_PRICE: `price-chart-${postId}`,
    };
}

/**
 * Prepares the data context object for the appraisal-card skeleton.
 * @param {Statistics} stats - The sanitized statistics object.
 * @param {object} appraisal - The appraisal data object (requires postId, condition_score, rarity, market_demand).
 * @returns {object} - A flat object mapping placeholders to values.
 */
function prepareDataContextForAppraisalCard(stats, appraisal) {
    stats = stats || {};
    appraisal = appraisal || {};
    const postId = appraisal.postId;
    if (!postId) console.warn("Post ID missing in appraisal data for context prep.");
    const value = parseFloat(stats.value || appraisal.value || 0);
    const priceTrend = stats.price_trend_percentage || '+0.0%';
    const isTrendPositive = priceTrend.includes('+');

    const metricsData = {
        labels: ['Condition', 'Rarity', 'Market Demand'],
        datasets: [{
            label: 'Assessment',
            data: [
                // Use scores directly from appraisal ACF
                parseFloat(appraisal.condition_score || 0),
                parseFloat(appraisal.rarity || 0),
                parseFloat(appraisal.market_demand || 0)
            ],
        }]
    };
    const marketData = { /* Data for price distribution chart - Needs data from stats */ };

    return {
        POST_ID: postId,
        CURRENT_DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        VALUE_FORMATTED: `$${numberWithCommas(value)}`,
        FEATURED_IMAGE_HTML: appraisal.featured_image ? `<img src="${escapeHtml(appraisal.featured_image)}" alt="${escapeHtml(appraisal.title)}" class="featured-artwork">` : '<div class="placeholder-image"><span>No Image Available</span></div>',
        TITLE: escapeHtml(appraisal.title || 'Untitled'),
        CREATOR: escapeHtml(appraisal.creator || 'Unknown'),
        OBJECT_TYPE: escapeHtml(appraisal.object_type || 'N/A'),
        AGE: escapeHtml(appraisal.estimated_age || 'N/A'),
        MEDIUM: escapeHtml(appraisal.medium || 'N/A'),
        CONDITION: escapeHtml(appraisal.condition_summary || 'N/A'), // Use condition_summary here?
        PERCENTILE: stats.percentile || 'N/A',
        PERCENTILE_NUMBER: parseInt(String(stats.percentile || '0').replace(/\D/g, '')) || 0,
        PRICE_TREND: priceTrend,
        TREND_CLASS: isTrendPositive ? 'positive' : 'negative',
        // Use ACF scores directly
        MARKET_DEMAND_SCORE: parseFloat(appraisal.market_demand || 0),
        RARITY_SCORE: parseFloat(appraisal.rarity || 0),
        CONDITION_SCORE: parseFloat(appraisal.condition_score || 0),
        APPRAISER_NAME: escapeHtml(appraisal.appraiser_name || 'Andrés Gómez'),
        ANALYSIS_TEXT: escapeHtml(generateAnalysisText(stats)),
        DETAILS_TABLE_HTML: generateDetailsTableHtml(appraisal),
        CHART_ID_GAUGE: `gauge-chart-${postId}`,
        CHART_ID_METRICS: `metrics-chart-${postId}`,
        CHART_ID_MARKET: `market-chart-${postId}`,
        METRICS_CHART_DATA_JSON: escapeHtml(JSON.stringify(metricsData)),
        MARKET_CHART_DATA_JSON: escapeHtml(JSON.stringify(marketData)),
    };
}

module.exports = {
    prepareDataContextForEnhancedAnalytics,
    prepareDataContextForAppraisalCard,
    // Export helpers only if needed elsewhere
    numberWithCommas, 
    escapeHtml
}; 