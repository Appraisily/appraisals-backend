// Basic Tab switching logic (can be moved to a separate JS file later)
document.addEventListener('DOMContentLoaded', function() {
    // Find all appraisal cards on the page
    const appraisalCards = document.querySelectorAll('.appraisal-card[data-post-id]');
    console.log(`[DEBUG AC] Found ${appraisalCards.length} appraisal cards.`);

    appraisalCards.forEach(card => {
        const postId = card.getAttribute('data-post-id');
        console.log(`[DEBUG AC Card ${postId}] Processing card.`);

        // Check if already initialized
        if (card.dataset.acInitialized === 'true') {
            console.log(`[DEBUG AC Card ${postId}] Already initialized, skipping.`);
            return; // Skip if already processed
        }
        card.dataset.acInitialized = 'true'; // Mark as initialized

        // Set up tab switching for this card
        const tabButtons = card.querySelectorAll('.tabs-navigation .tab-button');
        const tabPanels = card.querySelectorAll('.tabs-content .tab-panel');
        if (tabButtons.length > 0 && tabPanels.length > 0) {
            console.log(`[DEBUG AC Card ${postId}] Setting up tab switching...`);
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    tabPanels.forEach(panel => {
                        panel.classList.toggle('active', panel.getAttribute('id') === tabId);
                    });
                });
            });
        } else {
            console.warn(`[DEBUG AC Card ${postId}] Tab buttons or panels not found.`);
        }

        // Add description expand/collapse functionality for this card
        const descriptionToggle = card.querySelector(`#description-toggle-${postId}`); 
        const description = card.querySelector(`#artwork-description-${postId}`); 
        if (descriptionToggle && description) {
             console.log(`[DEBUG AC Card ${postId}] Setting up description toggle...`);
            // Check if description needs toggle initially
            if (description.scrollHeight > description.clientHeight) {
                descriptionToggle.style.display = 'inline-block';
            } else {
                descriptionToggle.style.display = 'none';
            }
            
            descriptionToggle.addEventListener('click', function(e) {
                e.preventDefault();
                description.classList.toggle('expanded');
                this.textContent = description.classList.contains('expanded') ? 'Read less' : 'Read more';
            });
        } else {
            console.warn(`[DEBUG AC Card ${postId}] Description toggle or description element not found.`);
        }

        // Initialize charts for this card with robust loading
        console.log(`[DEBUG AC Card ${postId}] Calling initializeAppraisalCardChartsWithRetry()...`);
        initializeAppraisalCardChartsWithRetry(postId);
    });
});

// Robust chart initialization that handles race conditions
function initializeAppraisalCardChartsWithRetry(postId, attemptCount = 0) {
    console.log(`[DEBUG AC Card ${postId}] initializeAppraisalCardChartsWithRetry called (Attempt: ${attemptCount})`);
    const maxAttempts = 10;
    const retryDelay = 300; // milliseconds
    
    // Define Chart.js alias specific to this card type if not already defined globally
    if (!window.AppraisalCardChart) {
         if (typeof window.Chart !== 'undefined') {
            console.log('[DEBUG AC Card] Chart.js found globally, setting alias.');
            window.AppraisalCardChart = window.Chart;
        } else if (typeof wp !== 'undefined' && wp.charts && wp.charts.Chart) {
            console.log('[DEBUG AC Card] WordPress Chart.js found, setting alias.');
            window.AppraisalCardChart = wp.charts.Chart;
        }
    }

    // If Chart.js is available (via alias), initialize
    if (typeof window.AppraisalCardChart !== 'undefined') {
        console.log('[DEBUG AC Card] AppraisalCardChart alias found, initializing...');
        initAppraisalCardCharts(postId); 
        return;
    }
    
    // Chart.js not available yet, retry if under max attempts
    if (attemptCount < maxAttempts) {
        console.log(`[DEBUG AC Card ${postId}] Chart library not ready, setting timeout for retry... (${attemptCount + 1}/${maxAttempts})`);
        setTimeout(function() {
            console.log(`[DEBUG AC Card ${postId}] Executing retry attempt ${attemptCount + 1}`);
            initializeAppraisalCardChartsWithRetry(postId, attemptCount + 1);
        }, retryDelay);
    } else {
        console.error(`[DEBUG AC Card ${postId}] Chart.js library not found after maximum attempts. Charts cannot be initialized.`);
         // Optionally try loading directly as a last resort (consider removing if WP handles it)
        // console.warn('[DEBUG AC Card] Trying to load Chart.js directly via CDN...');
        // const script = document.createElement('script');
        // script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        // script.onload = function() {
        //     console.log('[DEBUG AC Card] Chart.js loaded directly via CDN, setting alias and initializing...');
        //     window.AppraisalCardChart = window.Chart;
        //     initAppraisalCardCharts(postId);
        // };
        // script.onerror = function() { console.error('[DEBUG AC Card] Failed to load Chart.js directly via CDN'); };
        // document.head.appendChild(script);
    }
}

// Initialize charts for a specific appraisal card
function initAppraisalCardCharts(postId) {
    console.log(`[DEBUG AC Card ${postId}] initAppraisalCardCharts called.`);
    const card = document.querySelector(`.appraisal-card[data-post-id="${postId}"]`); 
    if (!card) {
        console.error(`[DEBUG AC Card ${postId}] Could not find card element during chart initialization.`);
        return;
    }

    // Destroy existing chart instances before creating new ones
    function destroyExistingChart(canvasId) {
         if (window.AppraisalCardChart && window.AppraisalCardChart.getChart(canvasId)) {
             console.log(`[DEBUG AC Card ${postId}] Destroying existing chart on canvas: ${canvasId}`);
             window.AppraisalCardChart.getChart(canvasId).destroy();
         }
    }

    try {
        // Get DOM elements using unique IDs
        const gaugeCanvasId = `ac-gauge-chart-${postId}`;
        const metricsCanvasId = `ac-metrics-chart-${postId}`;
        const marketCanvasId = `ac-market-chart-${postId}`;

        const gaugeCanvas = document.getElementById(gaugeCanvasId);
        const metricsCanvas = document.getElementById(metricsCanvasId);
        const marketCanvas = document.getElementById(marketCanvasId);
        
        // Get chart data containers
        const metricsContainer = card.querySelector('.metrics-chart-container');
        const marketContainer = card.querySelector('.price-distribution-container');
        
        // Initialize charts after slight delay to help with potential race conditions
        setTimeout(function() {
            console.log(`[DEBUG AC Card ${postId}] Initializing charts after slight delay...`);
            
            // Destroy existing charts if they exist
            destroyExistingChart(gaugeCanvasId);
            destroyExistingChart(metricsCanvasId);
            destroyExistingChart(marketCanvasId);

            // Initialize gauge chart
            if (gaugeCanvas) {
                console.log(`[DEBUG AC Card ${postId}] Attempting to initialize Gauge Chart...`);
                try {
                    initializeAppraisalCardGaugeChart(gaugeCanvas);
                } catch (error) {
                    console.error(`[DEBUG AC Card ${postId}] Error initializing gauge chart:`, error);
                }
            } else {
                console.warn(`[DEBUG AC Card ${postId}] Gauge canvas not found (${gaugeCanvasId})`);
            }
            
            // Initialize metrics chart
            if (metricsCanvas && metricsContainer) {
                console.log(`[DEBUG AC Card ${postId}] Attempting to initialize Metrics Chart...`);
                let metricsData;
                const metricsDataRaw = metricsContainer.dataset.chartDataMetrics;
                try {
                    if (metricsDataRaw && metricsDataRaw !== '{}' && metricsDataRaw.trim() !== '') {
                         metricsData = JSON.parse(metricsDataRaw);
                         initializeAppraisalCardMetricsChart(metricsCanvas, metricsData);
                    } else {
                         console.warn(`[DEBUG AC Card ${postId}] Metrics chart data attribute is missing, empty, or invalid JSON.`);
                         initializeAppraisalCardMetricsChart(metricsCanvas, null); // Use null to trigger default data
                    }
                } catch (e) {
                     console.error(`[DEBUG AC Card ${postId}] Error parsing metrics data:`, e, metricsDataRaw);
                     initializeAppraisalCardMetricsChart(metricsCanvas, null); // Use null to trigger default data
                }
            } else {
                console.warn(`[DEBUG AC Card ${postId}] Metrics canvas or container not found.`);
            }
            
            // Initialize market chart
            if (marketCanvas && marketContainer) {
                console.log(`[DEBUG AC Card ${postId}] Attempting to initialize Market Chart...`);
                let marketData;
                const marketDataRaw = marketContainer.dataset.chartDataMarket;
                 try {
                    if (marketDataRaw && marketDataRaw !== '{}' && marketDataRaw.trim() !== '') {
                         marketData = JSON.parse(marketDataRaw);
                         initializeAppraisalCardMarketChart(marketCanvas, marketData);
                    } else {
                         console.warn(`[DEBUG AC Card ${postId}] Market chart data attribute is missing, empty, or invalid JSON.`);
                         initializeAppraisalCardMarketChart(marketCanvas, null); // Use null to trigger default data
                    }
                } catch (e) {
                     console.error(`[DEBUG AC Card ${postId}] Error parsing market data:`, e, marketDataRaw);
                     initializeAppraisalCardMarketChart(marketCanvas, null); // Use null to trigger default data
                }
            } else {
                console.warn(`[DEBUG AC Card ${postId}] Market canvas or container not found.`);
            }
            
            console.log(`[DEBUG AC Card ${postId}] Chart initialization process completed within initAppraisalCardCharts().`);
        }, 50); 
    } catch (e) {
        console.error(`[DEBUG AC Card ${postId}] Error during the main initAppraisalCardCharts function:`, e);
    }
}

// Initialize Gauge Chart
function initializeAppraisalCardGaugeChart(canvas) {
    const postId = canvas.id.split('-').pop(); // Get postId from canvas ID
    console.log(`[DEBUG AC Card ${postId}] Creating gauge chart.`);

    const container = canvas.closest('.gauge-container');
    const percentileEl = container ? container.querySelector('.percentile-value') : null;
    let percentile = 50; // Default

    if (percentileEl) {
        const percentileText = percentileEl.textContent.trim();
        const matches = percentileText.match(/\d+/); 
        if (matches && matches[0]) { 
            percentile = parseInt(matches[0]);
            console.log(`[DEBUG AC Card ${postId}] Parsed percentile: ${percentile}`);
        } else {
            console.warn(`[DEBUG AC Card ${postId}] Could not parse percentile number from text:`, percentileText);
        }
    } else {
        console.warn(`[DEBUG AC Card ${postId}] Percentile element not found in gauge container.`);
    }

    const ctx = canvas.getContext('2d');

    function createGradient(ctx, colors) { 
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 170); 
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        return gradient;
     }

    try {
        if (!window.AppraisalCardChart) throw new Error('Chart library not available');
        new window.AppraisalCardChart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentile, 100 - percentile],
                    backgroundColor: [
                        createGradient(ctx, ['#3b82f6', '#1d4ed8']), // Blue gradient
                        '#e5e7eb' // Light gray (empty part)
                    ],
                    borderWidth: 0,
                    circumference: 180, // Half circle
                    rotation: 270 // Start from bottom
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow canvas to fill container height
                cutout: '75%', // Adjust thickness
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: {
                    animateRotate: true,
                    animateScale: false,
                    duration: 1200, // Slightly faster animation
                    easing: 'easeOutQuart'
                }
            }
         });
        console.log(`[DEBUG AC Card ${postId}] Gauge chart instance created successfully.`);
    } catch (error) {
        console.error(`[DEBUG AC Card ${postId}] Error creating gauge chart instance:`, error);
    }
}

// Initialize Metrics Chart
function initializeAppraisalCardMetricsChart(canvas, chartData) {
     const postId = canvas.id.split('-').pop();
     console.log(`[DEBUG AC Card ${postId}] Creating metrics chart.`);

    // Default data if not provided or invalid
    if (!chartData || !chartData.datasets || !chartData.datasets[0] || !chartData.datasets[0].data || chartData.datasets[0].data.length === 0) {
        console.warn(`[DEBUG AC Card ${postId}] Using default data for metrics chart.`);
        chartData = {
            labels: ['Market Demand', 'Rarity', 'Condition'], // Default labels
            datasets: [{
                data: [75, 80, 85], // Default values
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // Blue
                    'rgba(139, 92, 246, 0.8)', // Purple
                    'rgba(16, 185, 129, 0.8)'  // Green
                ],
                borderRadius: 6,
                maxBarThickness: 50 // Limit bar width
            }]
        };
    }

     const ctx = canvas.getContext('2d');
     try {
        if (!window.AppraisalCardChart) throw new Error('Chart library not available');
        new window.AppraisalCardChart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                indexAxis: 'y', // Horizontal bars
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5, // Adjust aspect ratio for better fit
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { callback: function(value) { return value + '%'; } }
                    },
                    y: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: function(context) { return context.parsed.x + '%'; } }
                    }
                }
            }
        });
        console.log(`[DEBUG AC Card ${postId}] Metrics chart instance created successfully.`);
    } catch (error) {
        console.error(`[DEBUG AC Card ${postId}] Error creating metrics chart instance:`, error);
    }
}

// Initialize Market Chart
function initializeAppraisalCardMarketChart(canvas, chartData) {
    const postId = canvas.id.split('-').pop();
    console.log(`[DEBUG AC Card ${postId}] Creating market chart.`);

    // Default data if not provided or invalid
    if (!chartData || !chartData.datasets || chartData.datasets.length < 2 || !chartData.datasets[0] || !chartData.datasets[1]) {
        console.warn(`[DEBUG AC Card ${postId}] Using default data for market chart.`);
        chartData = {
            labels: ["€40k-€52k", "€52k-€64k", "€64k-€76k", "€76k-€88k", "€88k-€100k"], // Use default labels
            datasets: [{
                label: 'Market Distribution',
                data: [28, 19, 19, 17, 14], // Default market data
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)'
            }, {
                label: 'Your Item',
                data: [0, 0, 19, 0, 0], // Default item data (assuming it falls in the middle bin)
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgba(239, 68, 68, 1)'
            }]
        };
    }

     const ctx = canvas.getContext('2d');
     try {
        if (!window.AppraisalCardChart) throw new Error('Chart library not available');
        new window.AppraisalCardChart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { callback: function(value) { return value + ' items'; } }
                    }
                },
                plugins: {
                    legend: { display: false }, 
                    tooltip: {
                        mode: 'index', 
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.label === 'Your Item' && context.parsed.y > 0) {
                                        // Find the market count for the same bin
                                        let marketCount = 0;
                                        const marketDataset = chartData.datasets.find(ds => ds.label === 'Market Distribution');
                                        if (marketDataset && marketDataset.data[context.dataIndex]){
                                            marketCount = marketDataset.data[context.dataIndex];
                                        }
                                        // Since stacking is visual, the tooltip should represent the item itself
                                        // within the context of the market bin.
                                        label = `Your Item (in bin with ${marketCount} total items)`;
                                    } else if (context.dataset.label === 'Your Item') {
                                        return null; // Hide 'Your Item' tooltip if value is 0
                                    } else {
                                        // For the market distribution dataset
                                        label += context.parsed.y + ' items';
                                    }
                                } else { label += 'N/A'; }
                                return label;
                            }
                        }
                    }
                }
            }
         });
        console.log(`[DEBUG AC Card ${postId}] Market chart instance created successfully.`);
    } catch (error) {
        console.error(`[DEBUG AC Card ${postId}] Error creating market chart instance:`, error);
    }
} 