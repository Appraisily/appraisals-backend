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
            // Add class for title row to handle differently
            const rowClass = label === 'Title' ? 'class="title-row"' : '';
            // Add special formatting for Provenance field which might be multi-line
            const valueClass = label === 'Provenance' ? 'class="multi-line-value"' : '';
            html += `<tr ${rowClass}><td>${escapeHtml(label)}</td><td ${valueClass}>${escapeHtml(value)}</td></tr>`;
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
 * Formats search keywords into HTML for display
 * @param {Array} keywords - Array of keyword objects with keyword and count properties
 * @returns {string} - HTML string of keyword badges
 */
function formatKeywordsAsHtml(keywords) {
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return '';
    }
    
    let html = '';
    keywords.forEach(item => {
        if (item.keyword) {
            const hasCount = typeof item.count === 'number';
            const count = hasCount ? item.count : 0;
            const displayCount = hasCount && count > 0 ? `<span class="keyword-match-count">${count}</span>` : '';
            html += `<div class="keyword-badge">${escapeHtml(item.keyword)}${displayCount}</div>`;
        }
    });
    
    return html;
}

/**
 * Calculates total keyword matches from search_keywords data
 * @param {object} searchKeywords - The search_keywords object from statistics
 * @returns {number} - Total count of matches across all keyword categories
 */
function calculateTotalKeywordMatches(searchKeywords) {
    if (!searchKeywords) return 0;
    
    let total = 0;
    const categories = ['very_specific', 'specific', 'moderate', 'broad'];
    
    categories.forEach(category => {
        if (searchKeywords[category] && Array.isArray(searchKeywords[category])) {
            searchKeywords[category].forEach(item => {
                if (typeof item.count === 'number') {
                    total += item.count;
                }
            });
        }
    });
    
    // If there's a total_count directly provided, use that instead
    if (typeof searchKeywords.total_count === 'number') {
        return searchKeywords.total_count;
    }
    
    return total;
}

/**
 * Prepares the data context for the appraisal card template
 * @param {Object} stats - Statistics data
 * @param {Object} appraisal - Appraisal data
 * @returns {Object} - Data context for the template
 */
function prepareDataContextForAppraisalCard(stats, appraisal) {
    stats = stats || {};
    appraisal = appraisal || {};
    
    const postId = appraisal.ID || Date.now(); // Fallback to timestamp
    const value = parseInt(appraisal.acf?.value || 0);
    
    // Extract trends data
    let priceTrend = stats.price_trend_percentage || '+0.0%';
    const isTrendPositive = priceTrend.startsWith('+');
    
    // Get score values from appraisal ACF data if available
    const marketDemand = parseFloat(appraisal.acf?.market_demand || 0);
    const rarity = parseFloat(appraisal.acf?.rarity || 0);
    const conditionScore = parseFloat(appraisal.acf?.condition_score || 0);
    const historicalSignificance = parseFloat(appraisal.acf?.historical_significance || 0);
    const provenance = parseFloat(appraisal.acf?.provenance || 0);
    const investmentPotential = parseFloat(appraisal.acf?.investment_potential || 0);
    
    // Prepare chart data for metrics chart
    const metricsChartData = {
        labels: ['Condition', 'Rarity', 'Market Demand', 'Historical Significance', 'Provenance', 'Investment Potential'],
        datasets: [{
            label: 'Item Metrics',
            data: [conditionScore, rarity, marketDemand, historicalSignificance, provenance, investmentPotential],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
        }]
    };
    
    // Prepare chart data for market distribution chart
    const marketChartData = {
        labels: stats.price_ranges || [],
        datasets: [{
            label: 'Market Distribution',
            data: stats.frequency_distribution || [],
            backgroundColor: 'rgba(255, 206, 86, 0.5)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
        }]
    };
    
    // Function to create HTML table rows from object properties
    function generateDetailsTableHtml(item) {
        if (!item || !item.acf) return '';
        
        let html = '';
        const skipFields = ['_', 'image', 'featured_image', 'value', 'market_demand', 'rarity', 'condition_score',
                           'historical_significance', 'provenance', 'investment_potential'];
        
        Object.entries(item.acf).forEach(([key, value]) => {
            // Skip internal fields and score metrics
            if (key.startsWith('_') || skipFields.includes(key)) return;
            
            // Format the key as a readable title
            const formattedKey = key.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Format the value as HTML
            let formattedValue = '';
            if (value === null || value === undefined) {
                formattedValue = 'Not provided';
            } else if (typeof value === 'object') {
                formattedValue = 'Complex data';
            } else {
                formattedValue = String(value);
            }
            
            html += `<tr><td>${formattedKey}</td><td>${formattedValue}</td></tr>`;
        });
        
        return html;
    }
    
    // Create a text analysis from the stats
    function generateAnalysisText(stats) {
        const defaultText = "This item has been professionally analyzed based on market trends, historical data, and the specific characteristics of the item itself. The analysis considers factors such as condition, rarity, historical significance, provenance, and current market demand.";
        
        if (!stats || Object.keys(stats).length === 0) {
            return defaultText;
        }
        
        // Try to generate a more specific analysis if we have stats data
        let analysis = "Based on our analysis, ";
        
        if (stats.percentile) {
            analysis += `this item ranks in the ${stats.percentile} percentile of comparable items on the market, `;
        }
        
        if (stats.price_trend_percentage) {
            const trendDirection = stats.price_trend_percentage.includes('+') ? "positive" : "negative";
            analysis += `showing a ${trendDirection} annual price trend of ${stats.price_trend_percentage}. `;
        } else {
            analysis += "with stable pricing in the current market. ";
        }
        
        // Add information about key metrics if available
        if (marketDemand > 0 || rarity > 0 || conditionScore > 0) {
            analysis += "Key factors contributing to this valuation include ";
            
            const factors = [];
            if (marketDemand > 75) factors.push("strong market demand");
            else if (marketDemand > 50) factors.push("moderate market demand");
            
            if (rarity > 75) factors.push("high rarity");
            else if (rarity > 50) factors.push("moderate rarity");
            
            if (conditionScore > 75) factors.push("excellent condition");
            else if (conditionScore > 50) factors.push("good condition");
            
            if (factors.length > 0) {
                analysis += factors.join(", ") + ". ";
            } else {
                analysis += "the item's overall characteristics and market positioning. ";
            }
        }
        
        return analysis;
    }

    return {
        POST_ID: postId,
        CURRENT_DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        VALUE_FORMATTED: `$${numberWithCommas(value)}`,
        ARTWORK_IMAGE_URL: appraisal.acf?.featured_image || "",
        ARTWORK_TITLE: escapeHtml(appraisal.acf?.title || appraisal.title?.rendered || 'Untitled'),
        ARTWORK_CREATOR: escapeHtml(appraisal.acf?.creator || 'Unknown'),
        OBJECT_TYPE: escapeHtml(appraisal.acf?.object_type || 'N/A'),
        PERIOD_AGE: escapeHtml(appraisal.acf?.estimated_age || 'N/A'),
        MEDIUM: escapeHtml(appraisal.acf?.medium || 'N/A'),
        CONDITION: escapeHtml(appraisal.acf?.condition_summary || 'N/A'),
        PERCENTILE: stats.percentile || 'N/A',
        PERCENTILE_NUMBER: parseInt(String(stats.percentile || '0').replace(/\D/g, '')) || 0,
        PRICE_TREND: priceTrend,
        TREND_CLASS: isTrendPositive ? 'positive' : 'negative',
        // Use ACF scores directly
        MARKET_DEMAND_SCORE: parseFloat(appraisal.acf?.market_demand || 0),
        RARITY_SCORE: parseFloat(appraisal.acf?.rarity || 0),
        CONDITION_SCORE: parseFloat(appraisal.acf?.condition_score || 0),
        // Add missing metrics for the detail tab
        HISTORICAL_SIGNIFICANCE: parseFloat(appraisal.acf?.historical_significance || appraisal.acf?.historical_value || 65),
        PROVENANCE_STRENGTH: parseFloat(appraisal.acf?.provenance_strength || appraisal.acf?.provenance || 70),
        INVESTMENT_POTENTIAL: parseFloat(appraisal.acf?.investment_potential || appraisal.acf?.future_value || 60),
        APPRAISER_NAME: escapeHtml(appraisal.acf?.appraiser_name || 'Andrés Gómez'),
        ANALYSIS_TEXT: escapeHtml(generateAnalysisText(stats)),
        DETAILS_TABLE_HTML: generateDetailsTableHtml(appraisal),
        ARTWORK_DESCRIPTION: escapeHtml(appraisal.acf?.description || 'No detailed description available.'),
        FULL_REPORT_URL: appraisal.link || '#',
        // Chart data as JSON strings for data attributes
        METRICS_CHART_DATA_JSON: JSON.stringify(metricsChartData),
        MARKET_CHART_DATA_JSON: JSON.stringify(marketChartData),
    };
}

/**
 * Prepares the data context for the enhanced analytics template
 * @param {Object} stats - Statistics data
 * @param {Object} appraisal - Appraisal data
 * @returns {Object} - Data context for the template
 */
function prepareDataContextForEnhancedAnalytics(stats, appraisal) {
    stats = stats || {};
    appraisal = appraisal || {};
    
    const postId = appraisal.ID || Date.now(); // Fallback to timestamp
    const value = parseInt(appraisal.acf?.value || 0);
    
    // Extract trends data
    let priceTrend = stats.price_trend_percentage || '+0.0%';
    const isTrendPositive = priceTrend.startsWith('+');
    
    // Date formatting
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Calculate predicted value
    let predictedValue = value;
    if (stats.price_trend_percentage) {
        const trendPercentage = parseFloat(stats.price_trend_percentage.replace(/[^-\d.]/g, ''));
        if (!isNaN(trendPercentage)) {
            predictedValue = Math.round(value * (1 + trendPercentage / 100));
        }
    }
    
    // Prepare radar chart data
    const radarChartData = {
        labels: ['Condition', 'Rarity', 'Market Demand', 'Historical Significance', 'Provenance', 'Investment Potential'],
        datasets: [{
            label: 'Item Metrics',
            data: [
                parseFloat(appraisal.acf?.condition_score || 0),
                parseFloat(appraisal.acf?.rarity || 0),
                parseFloat(appraisal.acf?.market_demand || 0),
                parseFloat(appraisal.acf?.historical_significance || appraisal.acf?.historical_value || 0),
                parseFloat(appraisal.acf?.provenance_strength || appraisal.acf?.provenance || 0),
                parseFloat(appraisal.acf?.investment_potential || appraisal.acf?.future_value || 0)
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
        }]
    };
    
    // Prepare price history chart data
    const priceHistoryChartData = {
        labels: stats.history_years || Array.from({length: 5}, (_, i) => currentYear - 4 + i),
        datasets: [{
            label: 'Comparable Items',
            data: stats.history_values || [value * 0.8, value * 0.85, value * 0.9, value * 0.95, value],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.3
        }, {
            label: 'Your Item',
            data: stats.item_history || [null, null, null, null, value],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderDash: [5, 5],
            tension: 0.3
        }]
    };
    
    // Prepare histogram data
    const histogramLabels = stats.price_ranges || ['$0-$1K', '$1K-$2K', '$2K-$5K', '$5K-$10K', '$10K-$20K'];
    const histogramValues = stats.frequency_distribution || [10, 15, 25, 20, 10];
    
    // Create histogram bars HTML
    let histogramBarsHtml = '';
    let histogramAxisHtml = '';
    let targetPosition = 50; // Default to middle if unknown
    
    histogramValues.forEach((count, index) => {
        const percentage = Math.round((count / Math.max(...histogramValues)) * 100);
        histogramBarsHtml += `<div class="chart-bar" style="height: ${percentage}%;" data-tooltip="${histogramLabels[index]}: ${count} items"></div>`;
        histogramAxisHtml += `<div class="axis-label">${histogramLabels[index]}</div>`;
        
        // Try to estimate where the current item value falls in the histogram
        if (stats.price_ranges && stats.target_range_index === index) {
            targetPosition = (index / (histogramLabels.length - 1)) * 100;
        }
    });
    
    // Prepare sales table data
    const salesData = stats.comparable_sales || [];
    let salesTableRowsHtml = '';
    
    if (salesData.length > 0) {
        salesData.forEach(sale => {
            const priceDiff = sale.price && value ? ((sale.price - value) / value * 100).toFixed(1) + '%' : 'N/A';
            const diffClass = priceDiff.startsWith('-') ? 'negative' : priceDiff === 'N/A' ? '' : 'positive';
            
            salesTableRowsHtml += `
                <tr>
                    <td class="title-cell">${escapeHtml(sale.title || 'Untitled')}</td>
                    <td>${escapeHtml(sale.auction_house || 'N/A')}</td>
                    <td>${escapeHtml(sale.date || 'N/A')}</td>
                    <td>$${numberWithCommas(sale.price || 0)}</td>
                    <td class="${diffClass}">${priceDiff}</td>
                </tr>
            `;
        });
    } else {
        salesTableRowsHtml = '<tr><td colspan="5">No comparable sales data available</td></tr>';
    }
    
    // Determine confidence level and class
    const confidenceLevel = stats.confidence_level || 'Moderate';
    let confidenceLevelClass = 'moderate';
    
    if (confidenceLevel.toLowerCase().includes('high')) {
        confidenceLevelClass = 'high';
    } else if (confidenceLevel.toLowerCase().includes('low')) {
        confidenceLevelClass = 'low';
    }
    
    // Determine market timing
    let marketTiming = 'Stable';
    if (priceTrend.includes('+')) {
        const trendValue = parseFloat(priceTrend.replace(/[^-\d.]/g, ''));
        if (trendValue > 5) {
            marketTiming = 'Strong Upward';
        } else if (trendValue > 0) {
            marketTiming = 'Slight Upward';
        }
    } else if (priceTrend.includes('-')) {
        const trendValue = Math.abs(parseFloat(priceTrend.replace(/[^-\d.]/g, '')));
        if (trendValue > 5) {
            marketTiming = 'Strong Downward';
        } else if (trendValue > 0) {
            marketTiming = 'Slight Downward';
        }
    }
    
    // Determine the percentile rotation for gauge (from -90 to 90 degrees based on percentile 0-100)
    const percentileNumber = parseInt(String(stats.percentile || '0').replace(/\D/g, '')) || 0;
    const percentileRotation = -90 + (180 * percentileNumber / 100);
    
    // Determine appreciation status based on percentile
    let appreciationStatus = 'average';
    if (percentileNumber >= 75) {
        appreciationStatus = 'premium';
    } else if (percentileNumber >= 50) {
        appreciationStatus = 'high';
    } else if (percentileNumber < 25) {
        appreciationStatus = 'low';
    }
    
    return {
        // Basic information
        POST_ID: postId,
        VALUE_FORMATTED: `$${numberWithCommas(value)}`,
        PREDICTED_VALUE_FORMATTED: `$${numberWithCommas(predictedValue)}`,
        NEXT_YEAR: nextYear,
        
        // Show/hide sections
        SHOW_RADAR: true,
        SHOW_HISTORY: true,
        SHOW_STATS: true,
        
        // Price trend information
        PRICE_TREND: priceTrend,
        TREND_CLASS: isTrendPositive ? 'positive' : 'negative',
        
        // Metrics scores
        CONDITION_SCORE: parseFloat(appraisal.acf?.condition_score || 0),
        RARITY_SCORE: parseFloat(appraisal.acf?.rarity || 0),
        MARKET_DEMAND_SCORE: parseFloat(appraisal.acf?.market_demand || 0),
        HISTORICAL_SIGNIFICANCE: parseFloat(appraisal.acf?.historical_significance || appraisal.acf?.historical_value || 65),
        PROVENANCE_STRENGTH: parseFloat(appraisal.acf?.provenance_strength || appraisal.acf?.provenance || 70),
        INVESTMENT_POTENTIAL: parseFloat(appraisal.acf?.investment_potential || appraisal.acf?.future_value || 60),
        
        // Statistics information
        AVG_PRICE_FORMATTED: `$${numberWithCommas(stats.avg_price || value)}`,
        MEDIAN_PRICE_FORMATTED: `$${numberWithCommas(stats.median_price || value)}`,
        PRICE_MIN_FORMATTED: `$${numberWithCommas(stats.min_price || (value * 0.5))}`,
        PRICE_MAX_FORMATTED: `$${numberWithCommas(stats.max_price || (value * 1.5))}`,
        STD_DEV_FORMATTED: `$${numberWithCommas(stats.std_dev || 0)}`,
        COEFFICIENT_VARIATION: stats.coefficient_variation || '15',
        CONFIDENCE_LEVEL: confidenceLevel,
        CONFIDENCE_LEVEL_CLASS: confidenceLevelClass,
        
        // Percentile information
        PERCENTILE: stats.percentile || 'N/A',
        PERCENTILE_NUMBER: percentileNumber,
        PERCENTILE_ROTATION: percentileRotation,
        APPRECIATION_STATUS: appreciationStatus,
        
        // Market information
        TOTAL_COUNT: stats.count || 0,
        COUNT: stats.count || 0,
        MARKET_TIMING: marketTiming,
        
        // Target position in histogram
        TARGET_POSITION: targetPosition,
        
        // HTML content
        HISTOGRAM_BARS_HTML: histogramBarsHtml,
        HISTOGRAM_AXIS_HTML: histogramAxisHtml,
        SALES_TABLE_ROWS_HTML: salesTableRowsHtml,
        
        // Chart data as JSON strings
        RADAR_CHART_DATA_JSON: JSON.stringify(radarChartData),
        HISTORY_CHART_DATA_JSON: JSON.stringify(priceHistoryChartData),
        HISTOGRAM_DATA_JSON: JSON.stringify({
            labels: histogramLabels,
            values: histogramValues
        }),
        SALES_DATA_JSON: JSON.stringify(salesData),
        
        // Search keywords information
        HAS_SEARCH_KEYWORDS: false, // Set to true if you have search keywords data
    };
}

module.exports = {
    prepareDataContextForEnhancedAnalytics,
    prepareDataContextForAppraisalCard,
    // Export helpers only if needed elsewhere
    numberWithCommas, 
    escapeHtml,
    formatKeywordsAsHtml,
    calculateTotalKeywordMatches
}; 