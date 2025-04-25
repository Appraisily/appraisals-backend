// Enhanced Analytics Main Entry Point
// This file has been refactored to use a modular approach for maintenance and reliability

document.addEventListener("DOMContentLoaded", function() {
    console.log('[DEBUG EA] DOMContentLoaded event fired.');
    // Find all enhanced analytics containers on the page (usually just one)
    const eaContainers = document.querySelectorAll('.enhanced-analytics-container');
    console.log(`[DEBUG EA] Found ${eaContainers.length} enhanced analytics containers.`);

    eaContainers.forEach(container => {
        // Use a data attribute on the container to find the postId if needed
        // For now, assuming {{POST_ID}} is globally replaced or handled if multiple instances exist.
        const postId = '{{POST_ID}}'; // Keep using placeholder for now
        console.log(`[DEBUG EA Card ${postId}] Processing container.`);

        // Check if already initialized
        if (container.dataset.eaInitialized === 'true') {
            console.log(`[DEBUG EA Card ${postId}] Already initialized, skipping.`);
            return; 
        }
        container.dataset.eaInitialized = 'true'; // Mark as initialized

        // Initialize charts with robust loading mechanism
        initializeEnhancedAnalyticsChartsWithRetry(postId, container);
    });
});

// Robust chart initialization that handles race conditions
function initializeEnhancedAnalyticsChartsWithRetry(postId, container, attemptCount = 0) {
    console.log(`[DEBUG EA Card ${postId}] initializeEnhancedAnalyticsChartsWithRetry called (Attempt: ${attemptCount})`);
    const maxAttempts = 10;
    const retryDelay = 300; // milliseconds

    // Define Chart.js alias if not already globally defined
    if (!window.EnhancedAnalyticsChart) {
         if (typeof window.Chart !== 'undefined') {
            console.log('[DEBUG EA Card] Chart.js found globally, setting alias.');
            window.EnhancedAnalyticsChart = window.Chart;
        } else if (typeof wp !== 'undefined' && wp.charts && wp.charts.Chart) {
            console.log('[DEBUG EA Card] WordPress Chart.js found, setting alias.');
            window.EnhancedAnalyticsChart = wp.charts.Chart;
        }
    }
    
    // If Chart.js is available (via alias), initialize
    if (typeof window.EnhancedAnalyticsChart !== 'undefined') {
        console.log('[DEBUG EA Card] EnhancedAnalyticsChart alias found, initializing...');
        initEnhancedAnalyticsCharts(postId, container);
        return;
    }

    // Chart.js not available yet, retry
    if (attemptCount < maxAttempts) {
        console.log(`[DEBUG EA Card ${postId}] Chart library not ready, setting timeout for retry... (${attemptCount + 1}/${maxAttempts})`);
        setTimeout(function() {
            console.log(`[DEBUG EA Card ${postId}] Executing retry attempt ${attemptCount + 1}`);
            initializeEnhancedAnalyticsChartsWithRetry(postId, container, attemptCount + 1);
        }, retryDelay);
    } else {
        console.error(`[DEBUG EA Card ${postId}] Chart.js library not found after maximum attempts. Charts cannot be initialized.`);
    }
}

// Initialize all charts and components for Enhanced Analytics
function initEnhancedAnalyticsCharts(postId, container) {
    console.log(`[DEBUG EA Card ${postId}] Initializing Enhanced Analytics charts and components...`);
    if (!container) {
        console.error(`[DEBUG EA Card ${postId}] Container not found in initEnhancedAnalyticsCharts.`);
        return;
    }

    // Add section visibility handling based on data attributes
    function checkSectionVisibility(selector) {
        var section = container.querySelector(selector);
        if (section && section.hasAttribute('style') && section.getAttribute('style').includes('display:none')) {
            console.log(`[DEBUG EA Card ${postId}] ${selector} section is hidden by template condition`);
            return false;
        }
        return !!section; // Return true only if section exists and is visible
    }
    
    var isRadarVisible = checkSectionVisibility('.radar-chart-section');
    var isPriceHistoryVisible = checkSectionVisibility('.price-history-section');
    var isStatsVisible = checkSectionVisibility('.statistics-section');
    var isItemMetricsVisible = checkSectionVisibility('.item-metrics-distribution-section');
    var isTableVisible = checkSectionVisibility('.data-table-section');

    // Create an object to store chart instances
    const chartInstances = {};

    // Initialize Radar Chart (using modular component)
    if (isRadarVisible) {
        const radarCanvasId = `ea-radar-chart-${postId}`;
        // Use the modular chart initialization function
        try {
            // This would normally be imported from the module
            chartInstances.radar = initRadarChart(radarCanvasId, container, postId);
        } catch (error) {
            console.error(`[DEBUG EA Card ${postId}] Error initializing radar chart:`, error);
        }
    }

    // Initialize Price History Chart (using modular component)
    if (isPriceHistoryVisible) {
        const priceCanvasId = `ea-price-chart-${postId}`;
        // Use the modular chart initialization function
        try {
            // This would normally be imported from the module
            // Get currency from the page data if possible
            const currencyElement = container.querySelector('.price-highlights .highlight-value');
            const currency = currencyElement ? 
                (currencyElement.textContent.trim().charAt(0) === '€' ? 'EUR' : 
                 currencyElement.textContent.trim().charAt(0) === '£' ? 'GBP' : 'USD') : 'EUR';
            
            chartInstances.priceHistory = initPriceHistoryChart(priceCanvasId, container, postId, currency);
        } catch (error) {
            console.error(`[DEBUG EA Card ${postId}] Error initializing price history chart:`, error);
        }
    }

    // Initialize Statistics components
    if (isStatsVisible || isItemMetricsVisible || isTableVisible) {
        // Delay initialization slightly
        setTimeout(function() {
            console.log(`[DEBUG EA Card ${postId}] Initializing statistics components after delay...`);
            try {
                if (isItemMetricsVisible) initEaHistogramTooltips(postId, container); 
                if (isTableVisible) setupEaSalesTable(postId, container);
                if (isStatsVisible) initEaConfidenceIndicator(postId, container);
            } catch (error) {
                console.error(`[DEBUG EA Card ${postId}] Error initializing statistics components:`, error);
            }
        }, 100); 
    } else {
        console.log(`[DEBUG EA Card ${postId}] Statistics/Table sections hidden, skipping component initialization.`);
    }

    // Run non-interruptive validation after a delay to allow all charts to render
    setTimeout(function() {
        try {
            // This would normally be imported from the module
            const validationReport = validateCharts(container);
            
            // Store validation report on the container for future reference
            container.eaValidationReport = validationReport;
            
            // Add a small indicator in the corner that shows validation status
            if (validationReport.issues.length > 0) {
                const errorCount = validationReport.issues.filter(i => i.severity === 'error').length;
                const warningCount = validationReport.issues.filter(i => i.severity === 'warning').length;
                
                if (errorCount > 0 || warningCount > 0) {
                    const statusIndicator = document.createElement('div');
                    statusIndicator.style.position = 'absolute';
                    statusIndicator.style.top = '5px';
                    statusIndicator.style.right = '5px';
                    statusIndicator.style.padding = '3px 6px';
                    statusIndicator.style.borderRadius = '3px';
                    statusIndicator.style.fontSize = '10px';
                    statusIndicator.style.fontWeight = 'bold';
                    statusIndicator.style.cursor = 'pointer';
                    statusIndicator.style.zIndex = '100';
                    
                    if (errorCount > 0) {
                        statusIndicator.style.backgroundColor = '#fee2e2';
                        statusIndicator.style.color = '#b91c1c';
                        statusIndicator.textContent = `${errorCount} Error${errorCount > 1 ? 's' : ''}`;
                    } else {
                        statusIndicator.style.backgroundColor = '#fef3c7';
                        statusIndicator.style.color = '#92400e';
                        statusIndicator.textContent = `${warningCount} Warning${warningCount > 1 ? 's' : ''}`;
                    }
                    
                    statusIndicator.title = 'Click to see validation report';
                    statusIndicator.onclick = function() {
                        console.group('Chart Validation Issues');
                        validationReport.logToConsole(true);
                        console.groupEnd();
                        alert(`Chart Validation Report: ${errorCount} errors, ${warningCount} warnings. See console for details.`);
                    };
                    
                    container.style.position = 'relative';
                    container.appendChild(statusIndicator);
                }
            }
        } catch (error) {
            console.error(`[DEBUG EA Card ${postId}] Error running chart validation:`, error);
            // Validation errors don't interrupt the process
        }
    }, 1000);
}

// Setup histogram hover interactions
function initEaHistogramTooltips(postId, container) {
     const bars = container.querySelectorAll('.modern-bar-wrap');
     bars.forEach(function(bar) {
        bar.addEventListener('mouseenter', function() { 
            const tooltip = this.querySelector('.bar-tooltip');
            if(tooltip) tooltip.style.opacity = '1';
         });
        bar.addEventListener('mouseleave', function() { 
            const tooltip = this.querySelector('.bar-tooltip');
            if(tooltip) tooltip.style.opacity = '0';
         });
    });
    console.log(`[DEBUG EA Card ${postId}] Histogram tooltip interactions setup complete`);
}

// Initialize confidence indicator visuals
function initEaConfidenceIndicator(postId, container) {
    const confidenceDisplays = container.querySelectorAll(".confidence-display");
    confidenceDisplays.forEach(function(display) { 
        const indicator = display.querySelector(".confidence-indicator");
        const value = display.querySelector(".confidence-value");
        if (indicator && value) {
            const confidenceText = value.textContent.trim().toLowerCase();
            let className = '';
            if (confidenceText.includes('very high')) className = 'very-high';
            else if (confidenceText.includes('high')) className = 'high';
            else if (confidenceText.includes('medium')) className = 'medium';
            else if (confidenceText.includes('low')) className = 'low';
            if (className) indicator.className = 'confidence-indicator ' + className;
        }
    });
    console.log(`[DEBUG EA Card ${postId}] Confidence indicators initialized.`);
}

// INCLUDE MODULES: These module functions would normally be imported from separate files
// For this implementation we include them directly to avoid changing the build system

// Function to format currency (from formatting.js)
function formatCurrency(value, currency = 'USD', locale = 'en-US') {
    if (typeof value !== 'number' || isNaN(value)) return value;
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    } catch (e) {
        // Fallback for invalid currency codes
        const prefix = currency === 'EUR' ? '€' : 
                      currency === 'GBP' ? '£' : 
                      currency === 'CAD' ? 'CA$' : 
                      currency === 'AUD' ? 'A$' : 
                      currency === 'PHP' ? '₱' : '$';
        return prefix + Math.round(value).toLocaleString(locale);
    }
}

// Function to format date (from formatting.js) 
function formatDate(dateString, locale = 'en-US') {
    if (!dateString || dateString === 'Current') return 'Current';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString(locale, { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString; // Return original on error
    }
}

// Initialize radar chart (from radar-chart.js)
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

// Initialize price history chart (from price-history-chart.js)
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
                                return formatCurrency(value, currency);
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
                                        label += formatCurrency(context.parsed.y, currency);
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

// Setup sales table sorting and filtering
function setupEaSalesTable(postId, container) {
    const salesTable = document.getElementById(`ea-salesTable-${postId}`);
    if (!salesTable) {
        console.warn(`[DEBUG EA Card ${postId}] Sales table not found`);
        return;
    }
    
    const tableCard = salesTable.closest('.advanced-data-table-card');
    const salesDataJson = tableCard ? tableCard.dataset.salesData : null;
    let salesData = [];

    if (salesDataJson) { 
        try { salesData = JSON.parse(salesDataJson); } catch (e) { console.error('JSON parse error', e); return; }
    } else { console.warn('Sales data attribute not found'); return; }

    const tbody = salesTable.querySelector('tbody');
    const paginationControls = document.getElementById(`ea-pagination-${postId}`);
    const searchInput = document.getElementById(`ea-searchResults-${postId}`);
    
    if (!tbody || !paginationControls || !searchInput) { console.warn('Table components missing'); return; }
    
    tbody.innerHTML = ''; // Clear server rows
    
    const rowsPerPage = 5;
    let currentPage = 1;
    let filteredData = [...salesData];
    let sortColumn = null;
    let sortDirection = 'asc';

    // Table display function
    function displayTablePage() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);
        tbody.innerHTML = '';
        paginatedData.forEach(sale => {
            const row = document.createElement("tr");
            if (sale.is_current) row.classList.add("highlight-row");
            const formattedPrice = formatCurrency(sale.price, sale.currency || 'USD');
            const formattedDate = formatDate(sale.date);
            let diffClass = '';
            if (sale.diff && typeof sale.diff === 'string') {
                 if (sale.diff.startsWith('+') && parseFloat(sale.diff) !== 0) diffClass = 'diff-positive';
                 else if (sale.diff.startsWith('-')) diffClass = 'diff-negative';
            }
            row.innerHTML = 
                `<td>${sale.title || "-"}</td>
                 <td>${sale.house || "-"}</td>
                 <td>${formattedDate}</td>
                 <td>${formattedPrice}</td>
                 <td class="${diffClass}">${sale.diff || "-"}</td>`;
            tbody.appendChild(row);
        });
        const pageStartSpan = paginationControls.querySelector('.page-start');
        const pageEndSpan = paginationControls.querySelector('.page-end');
        const totalItemsSpan = paginationControls.querySelector('.total-items');
        if (pageStartSpan && pageEndSpan && totalItemsSpan) {
            pageStartSpan.textContent = filteredData.length > 0 ? start + 1 : 0;
            pageEndSpan.textContent = Math.min(end, filteredData.length);
            totalItemsSpan.textContent = filteredData.length;
        }
        paginationControls.querySelector('[data-page="prev"]').disabled = currentPage === 1;
        paginationControls.querySelector('[data-page="next"]').disabled = end >= filteredData.length;
    }
    
    // Table filtering function
    function filterTable() {
        const searchTerm = searchInput.value.toLowerCase();
        filteredData = salesData.filter(sale => 
            Object.values(sale).some(value => String(value).toLowerCase().includes(searchTerm))
        );
        currentPage = 1;
        sortTable(); 
    }
    
    // Table sorting function
    function sortTable() {
        if (sortColumn) {
            const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
            filteredData.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];
                let comparison = 0;
                switch (sortColumn) {
                    case 'price':
                        valA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, '')) || 0;
                        valB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, '')) || 0;
                        comparison = valA - valB;
                        break;
                    case 'date':
                        valA = valA === 'Current' ? new Date(8640000000000000) : new Date(valA);
                        valB = valB === 'Current' ? new Date(8640000000000000) : new Date(valB);
                        if (!isNaN(valA) && !isNaN(valB)) comparison = valA - valB;
                        else if (!isNaN(valA)) comparison = -1; // Valid dates first
                        else if (!isNaN(valB)) comparison = 1;
                        else comparison = String(a[sortColumn]).localeCompare(String(b[sortColumn]));
                        break;
                    case 'diff':
                        valA = parseFloat(String(valA).replace(/[+%]/g, '')) || (valA === '-' ? Infinity : 0); // Treat '-' distinctly
                        valB = parseFloat(String(valB).replace(/[+%]/g, '')) || (valB === '-' ? Infinity : 0);
                        comparison = valA - valB;
                        if (isNaN(comparison)) comparison = String(a[sortColumn]).localeCompare(String(b[sortColumn]));
                        break;
                    default: comparison = String(valA).localeCompare(String(valB));
                }
                return comparison * sortMultiplier;
            });
        }
        // Always put 'Your Item' first if present
        const yourItemIndex = filteredData.findIndex(item => item.is_current);
        if (yourItemIndex > -1) {
            const yourItem = filteredData.splice(yourItemIndex, 1)[0];
            filteredData.unshift(yourItem);
        }
        // Update header classes
        const sortableHeaders = salesTable.querySelectorAll('th.sortable');
        sortableHeaders.forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.getAttribute('data-sort') === sortColumn) {
                th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
        displayTablePage();
    }

    // Add event listeners only once
    if (!salesTable.dataset.listenersAttached) {
        const sortableHeaders = salesTable.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const newSortColumn = this.getAttribute('data-sort');
                if (sortColumn === newSortColumn) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = newSortColumn;
                    sortDirection = 'asc';
                }
                currentPage = 1;
                sortTable();
            });
        });
        searchInput.addEventListener('input', filterTable);
        paginationControls.querySelector('[data-page="prev"]').addEventListener('click', () => { if (currentPage > 1) { currentPage--; sortTable(); } });
        paginationControls.querySelector('[data-page="next"]').addEventListener('click', () => { const totalPages = Math.ceil(filteredData.length / rowsPerPage); if (currentPage < totalPages) { currentPage++; sortTable(); } });
        salesTable.dataset.listenersAttached = 'true';
        console.log(`[DEBUG EA Card ${postId}] Sales table listeners attached.`);
    }
    
    // Initial table display
    sortTable(); // Apply default sort (Your Item first) then display
}

// Chart validator (from chart-validator.js)
// ValidationReport class (simplified version)
class ValidationReport {
    constructor() {
        this.issues = [];
        this.chartStatuses = {};
        this.startTime = Date.now();
        this.finishTime = null;
        this.totalCharts = 0;
        this.successfulCharts = 0;
    }

    addIssue(chartId, chartType, severity, message, details = {}) {
        this.issues.push({ chartId, chartType, severity, message, details });
    }

    setChartStatus(chartId, status, metadata = {}) {
        this.chartStatuses[chartId] = { status, metadata };
        this.totalCharts++;
        if (status === 'success') this.successfulCharts++;
    }

    finalize() {
        this.finishTime = Date.now();
        this.duration = this.finishTime - this.startTime;
        this.successRate = this.totalCharts ? (this.successfulCharts / this.totalCharts) * 100 : 0;
    }

    getSummary() {
        if (!this.finishTime) this.finalize();
        return {
            totalCharts: this.totalCharts,
            successfulCharts: this.successfulCharts,
            issueCount: this.issues.length,
            successRate: this.successRate.toFixed(1) + '%',
            duration: this.duration + 'ms',
            hasCriticalIssues: this.issues.some(issue => issue.severity === 'error'),
            topIssues: this.issues.slice(0, 3).map(issue => issue.message)
        };
    }

    logToConsole(verbose = false) {
        const summary = this.getSummary();
        console.group('Chart Validation Report');
        console.log(`Success Rate: ${summary.successRate} (${summary.successfulCharts}/${summary.totalCharts})`);
        console.log(`Duration: ${summary.duration}`);
        if (summary.issueCount > 0) {
            console.group(`Issues Found: ${summary.issueCount}`);
            if (verbose) {
                this.issues.forEach((issue, index) => {
                    console.group(`Issue #${index + 1}: ${issue.chartId} (${issue.chartType})`);
                    console.log(`Severity: ${issue.severity}`);
                    console.log(`Message: ${issue.message}`);
                    if (Object.keys(issue.details).length > 0) console.log('Details:', issue.details);
                    console.groupEnd();
                });
            } else {
                const errorCount = this.issues.filter(i => i.severity === 'error').length;
                const warningCount = this.issues.filter(i => i.severity === 'warning').length;
                const infoCount = this.issues.filter(i => i.severity === 'info').length;
                console.log(`Errors: ${errorCount}, Warnings: ${warningCount}, Info: ${infoCount}`);
                console.log('Top Issues:');
                summary.topIssues.forEach(issue => console.log(`- ${issue}`));
            }
            console.groupEnd();
        } else {
            console.log('No issues found!');
        }
        console.groupEnd();
    }
}

// Main validation function
function validateCharts(container = document, verbose = false) {
    console.log('Starting chart validation (non-interruptive)...');
    const report = new ValidationReport();
    
    // Get all canvases
    const canvases = container.querySelectorAll('canvas[id]');
    
    // Validate each canvas
    canvases.forEach(canvas => {
        const canvasId = canvas.id;
        if (!canvasId.includes('chart')) return; // Skip non-chart canvases

        // Get chart instance
        const chart = window.EnhancedAnalyticsChart && 
                     window.EnhancedAnalyticsChart.getChart ? 
                     window.EnhancedAnalyticsChart.getChart(canvasId) : null;
        
        // Determine chart type
        let chartType = chart ? chart.config.type : 'unknown';
        if (!chart || chartType === 'unknown') {
            if (canvasId.includes('radar')) chartType = 'radar';
            else if (canvasId.includes('price')) chartType = 'line';
            else if (canvasId.includes('histogram') || canvasId.includes('distribution')) chartType = 'bar';
        }
        
        // Validate based on chart type
        try {
            if (chartType === 'radar') {
                validateRadarChart(canvasId, chart, report);
            } else if (chartType === 'line') {
                validateLineChart(canvasId, chart, report);
            } else {
                report.addIssue(canvasId, chartType, 'info', `Validation not implemented for chart type: ${chartType}`);
                report.setChartStatus(canvasId, 'unknown', { chartType });
            }
        } catch (error) {
            // Make sure validation errors don't interrupt the process
            report.addIssue(canvasId, chartType, 'error', 'Error during chart validation', 
                { error: error.message });
            report.setChartStatus(canvasId, 'error', { reason: 'validation-error' });
        }
    });
    
    // Generate and log report
    report.finalize();
    if (verbose) report.logToConsole(true);
    else report.logToConsole(false);
    
    return report;
}

// Chart-specific validators (simplified versions)
function validateRadarChart(canvasId, chart, report) {
    if (!chart) {
        report.addIssue(canvasId, 'radar', 'error', 'Chart instance not found');
        report.setChartStatus(canvasId, 'error', { reason: 'missing-instance' });
        return;
    }

    const issues = [];
    
    // Basic validation checks
    if (!chart.data.datasets || chart.data.datasets.length === 0) {
        issues.push({ severity: 'error', message: 'No datasets found in chart' });
    }
    
    if (!chart.data.labels || chart.data.labels.length === 0) {
        issues.push({ severity: 'error', message: 'No labels found in chart' });
    }
    
    // Add all issues to the report
    issues.forEach(issue => {
        report.addIssue(canvasId, 'radar', issue.severity, issue.message);
    });

    // Set chart status
    if (issues.some(i => i.severity === 'error')) {
        report.setChartStatus(canvasId, 'error');
    } else if (issues.some(i => i.severity === 'warning')) {
        report.setChartStatus(canvasId, 'partial');
    } else {
        report.setChartStatus(canvasId, 'success');
    }
}

function validateLineChart(canvasId, chart, report) {
    if (!chart) {
        report.addIssue(canvasId, 'line', 'error', 'Chart instance not found');
        report.setChartStatus(canvasId, 'error', { reason: 'missing-instance' });
        return;
    }

    const issues = [];
    
    // Basic validation checks
    if (!chart.data.datasets || chart.data.datasets.length === 0) {
        issues.push({ severity: 'error', message: 'No datasets found in chart' });
    }
    
    if (!chart.data.labels || chart.data.labels.length === 0) {
        issues.push({ severity: 'error', message: 'No labels found in chart' });
    }
    
    // Add all issues to the report
    issues.forEach(issue => {
        report.addIssue(canvasId, 'line', issue.severity, issue.message);
    });

    // Set chart status
    if (issues.some(i => i.severity === 'error')) {
        report.setChartStatus(canvasId, 'error');
    } else if (issues.some(i => i.severity === 'warning')) {
        report.setChartStatus(canvasId, 'partial');
    } else {
        report.setChartStatus(canvasId, 'success');
    }
} 