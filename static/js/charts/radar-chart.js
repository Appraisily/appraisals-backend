/**
 * Radar Chart Module
 * 
 * Handles the initialization and configuration of radar charts for Enhanced Analytics
 */

/**
 * Initialize a radar chart with the given data
 * 
 * @param {string} canvasId - The HTML ID of the canvas element
 * @param {HTMLElement} container - The container element for the chart
 * @param {string} postId - The post ID for logging purposes
 * @returns {Object|null} The chart instance or null if initialization failed
 */
function initRadarChart(canvasId, container, postId) {
    console.log(`[DEBUG EA Card ${postId}] Initializing radar chart: ${canvasId}`);
    
    // Input validation
    if (!canvasId || !container) {
        console.error(`[DEBUG EA Card ${postId}] Missing required parameters for radar chart`);
        return null;
    }

    const radarCanvas = document.getElementById(canvasId);
    const radarWrapper = container.querySelector(".radar-wrapper");
    
    if (!radarCanvas) {
        console.error(`[DEBUG EA Card ${postId}] Radar chart canvas not found: ${canvasId}`);
        return null;
    }
    
    if (!radarWrapper || !radarWrapper.dataset.chartDataRadar) {
        console.error(`[DEBUG EA Card ${postId}] Radar chart data not found`);
        return null;
    }
    
    // Destroy existing chart if any
    if (window.EnhancedAnalyticsChart && window.EnhancedAnalyticsChart.getChart(canvasId)) {
        console.log(`[DEBUG EA Card ${postId}] Destroying existing radar chart`);
        window.EnhancedAnalyticsChart.getChart(canvasId).destroy();
    }
    
    try {
        // Parse chart data
        const radarData = JSON.parse(radarWrapper.dataset.chartDataRadar);
        
        // Create chart with optimal configuration
        const chart = new window.EnhancedAnalyticsChart(radarCanvas, { 
            type: "radar",
            data: radarData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        pointLabels: { font: { size: 11 } },
                        ticks: { backdropColor: 'rgba(255,255,255,0.7)', stepSize: 20 }, // Adjust step size
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false }, // Hide default legend, using manual one
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.r + '%';
                            }
                        }
                    }
                }
            }
        });
        
        console.log(`[DEBUG EA Card ${postId}] Radar chart initialized successfully`);
        return chart;
    } catch (error) {
        console.error(`[DEBUG EA Card ${postId}] Error initializing radar chart:`, error);
        return null;
    }
}

// Export the function if using module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initRadarChart };
} 