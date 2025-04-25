/**
 * Price History Chart Module
 * 
 * Handles the initialization and configuration of price history line charts
 */

/**
 * Format currency value with proper symbol
 * 
 * @param {number} value - The currency value to format
 * @param {string} currency - The currency code (USD, EUR, GBP, etc.)
 * @returns {string} Formatted currency string
 */
function formatCurrencyValue(value, currency = 'USD') {
    if (typeof value !== 'number') return value;
    try {
        const formatter = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: currency,
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        });
        
        // Handle currency symbol replacements
        if (currency === 'EUR') return formatter.format(value).replace('$', '€');
        if (currency === 'GBP') return formatter.format(value).replace('$', '£');
        if (currency === 'AUD') return formatter.format(value).replace('$', 'A$');
        if (currency === 'CAD') return formatter.format(value).replace('$', 'CA$');
        if (currency === 'PHP') return formatter.format(value).replace('$', '₱');
        
        return formatter.format(value);
    } catch (e) {
        // Fallback for invalid currency codes
        return currency + value.toLocaleString();
    }
}

/**
 * Initialize a price history chart with the given data
 * 
 * @param {string} canvasId - The HTML ID of the canvas element
 * @param {HTMLElement} container - The container element for the chart
 * @param {string} postId - The post ID for logging purposes
 * @param {string} currency - The default currency for formatting (defaults to EUR)
 * @returns {Object|null} The chart instance or null if initialization failed
 */
function initPriceHistoryChart(canvasId, container, postId, currency = 'EUR') {
    console.log(`[DEBUG EA Card ${postId}] Initializing price history chart: ${canvasId}`);
    
    // Input validation
    if (!canvasId || !container) {
        console.error(`[DEBUG EA Card ${postId}] Missing required parameters for price history chart`);
        return null;
    }
    
    const priceCanvas = document.getElementById(canvasId);
    const wrapper = container.querySelector(".price-chart-wrapper");
    
    if (!priceCanvas) {
        console.error(`[DEBUG EA Card ${postId}] Price history chart canvas not found: ${canvasId}`);
        return null;
    }
    
    if (!wrapper || !wrapper.dataset.chartDataHistory) {
        console.error(`[DEBUG EA Card ${postId}] Price history chart data not found`);
        return null;
    }
    
    // Destroy existing chart if any
    if (window.EnhancedAnalyticsChart && window.EnhancedAnalyticsChart.getChart(canvasId)) {
        console.log(`[DEBUG EA Card ${postId}] Destroying existing price history chart`);
        window.EnhancedAnalyticsChart.getChart(canvasId).destroy();
    }
    
    try {
        // Parse chart data
        const chartData = JSON.parse(wrapper.dataset.chartDataHistory);
        
        // Create chart with optimal configuration
        const chart = new window.EnhancedAnalyticsChart(priceCanvas, { 
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                            callback: function(value) {
                                return formatCurrencyValue(value, currency);
                            }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }, // Legend handled manually
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    if (context.dataset.label === 'Market Index') {
                                        label += context.parsed.y;
                                    } else {
                                        label += formatCurrencyValue(context.parsed.y, currency);
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        
        console.log(`[DEBUG EA Card ${postId}] Price history chart initialized successfully`);
        return chart;
    } catch (error) {
        console.error(`[DEBUG EA Card ${postId}] Error initializing price history chart:`, error);
        return null;
    }
}

// Export the function if using module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initPriceHistoryChart,
        formatCurrencyValue
    };
} 