// Initialization guard for Enhanced Analytics
/*
if (!window.enhancedAnalyticsInitialized) {
    window.enhancedAnalyticsInitialized = {};
}

if (!window.enhancedAnalyticsInitialized['{{POST_ID}}']) {
    window.enhancedAnalyticsInitialized['{{POST_ID}}'] = true;
*/

document.addEventListener("DOMContentLoaded", function() {
    console.log('[DEBUG EA] DOMContentLoaded event fired.');
    // Find all enhanced analytics containers on the page (usually just one)
    const eaContainers = document.querySelectorAll('.enhanced-analytics-container');
    console.log(`[DEBUG EA] Found ${eaContainers.length} enhanced analytics containers.`);

    eaContainers.forEach(container => {
        // Use a data attribute on the container to find the postId if needed
        const postId = container.getAttribute('data-post-id'); // Read from data-* attribute
        
        if (!postId) {
            console.error('[DEBUG EA] Container is missing the data-post-id attribute. Cannot initialize.', container);
            return; // Skip this container if ID is missing
        }
        
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
         // Optional: Last resort loading (consider removing)
        // console.warn('[DEBUG EA Card] Trying to load Chart.js directly via CDN...');
        // const script = document.createElement('script');
        // script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        // script.onload = function() {
        //     console.log('[DEBUG EA Card] Chart.js loaded directly via CDN, initializing...');
        //     window.EnhancedAnalyticsChart = window.Chart;
        //     initEnhancedAnalyticsCharts(postId, container);
        // };
        // script.onerror = function() { console.error('[DEBUG EA Card] Failed to load Chart.js directly via CDN'); };
        // document.head.appendChild(script);
    }
}

// Initialize all charts and components for Enhanced Analytics
function initEnhancedAnalyticsCharts(postId, container) {
    console.log(`[DEBUG EA Card ${postId}] Initializing Enhanced Analytics charts and components...`);
    if (!container) {
        console.error(`[DEBUG EA Card ${postId}] Container not found in initEnhancedAnalyticsCharts.`);
        return;
    }

    // Destroy existing charts before creating new ones
    function destroyEaChart(canvasId) {
         if (window.EnhancedAnalyticsChart && window.EnhancedAnalyticsChart.getChart(canvasId)) {
             console.log(`[DEBUG EA Card ${postId}] Destroying existing chart on canvas: ${canvasId}`);
             window.EnhancedAnalyticsChart.getChart(canvasId).destroy();
         }
    }

    // Add section visibility handling based on data attributes
    function checkSectionVisibility(selector) {
        var section = container.querySelector(selector);
        if (section && section.hasAttribute('style') && section.getAttribute('style').includes('display:none')) {
            console.log(`[DEBUG EA Card ${postId}] ${selector} section is hidden by template condition`);
            return false;
        }
        return true;
    }
    
    var isRadarVisible = checkSectionVisibility('.radar-chart-section');
    var isPriceHistoryVisible = checkSectionVisibility('.price-history-section');
    var isStatsVisible = checkSectionVisibility('.statistics-section');
    var isItemMetricsVisible = checkSectionVisibility('.item-metrics-distribution-section');
    var isTableVisible = checkSectionVisibility('.data-table-section');

    // Initialize Radar Chart
    if (isRadarVisible) {
        const radarCanvasId = `ea-radar-chart-${postId}`;
        const radarCanvas = document.getElementById(radarCanvasId);
        const radarWrapper = container.querySelector(".radar-wrapper");
        if (radarCanvas && radarWrapper && radarWrapper.dataset.chartDataRadar) {
            destroyEaChart(radarCanvasId); // Destroy before creating
            try {
                const radarData = JSON.parse(radarWrapper.dataset.chartDataRadar);
                new window.EnhancedAnalyticsChart(radarCanvas, { 
                    type: "radar",
                    data: radarData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { backdropColor: 'rgba(255,255,255,0.7)' }
                            }
                        },
                         plugins: { legend: { display: false } } // Hide default legend
                    }
                 });
                console.log(`[DEBUG EA Card ${postId}] Radar chart initialized successfully`);
            } catch (error) {
                console.error(`[DEBUG EA Card ${postId}] Error initializing radar chart:`, error);
            }
        } else {
             console.warn(`[DEBUG EA Card ${postId}] Radar chart canvas/wrapper/data not found.`);
        }
    }

    // Initialize Price History Chart
    if (isPriceHistoryVisible) {
        const priceCanvasId = `ea-price-chart-${postId}`;
        const priceCanvas = document.getElementById(priceCanvasId);
        const wrapper = container.querySelector(".price-chart-wrapper");
        if (priceCanvas && wrapper && wrapper.dataset.chartDataHistory) {
             destroyEaChart(priceCanvasId);
            try {
                const chartData = JSON.parse(wrapper.dataset.chartDataHistory);
                new window.EnhancedAnalyticsChart(priceCanvas, { 
                    type: 'line',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: false,
                                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                                ticks: { callback: function(value) { return '$' + value.toLocaleString(); } }
                            },
                            x: {
                                grid: { display: false }
                            }
                        },
                        plugins: {
                            legend: { display: false }, // Manual legend exists
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) label += ': ';
                                        if (context.parsed.y !== null) {
                                            if (context.dataset.label === 'Market Index') label += context.parsed.y;
                                            else label += '$' + context.parsed.y.toLocaleString();
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                 });
                console.log(`[DEBUG EA Card ${postId}] Price history chart initialized successfully`);
            } catch (error) {
                console.error(`[DEBUG EA Card ${postId}] Error initializing price history chart:`, error);
            }
        } else {
             console.warn(`[DEBUG EA Card ${postId}] Price history chart canvas/wrapper/data not found.`);
        }
    }

    // Initialize Statistics components (Histogram, Table, Confidence)
    if (isStatsVisible || isItemMetricsVisible || isTableVisible) {
        // Delay initialization slightly
        setTimeout(function() {
            console.log(`[DEBUG EA Card ${postId}] Initializing statistics components after delay...`);
            try {
                if (isItemMetricsVisible) initEaHistogramTooltips(postId, container); // Renamed & scoped
                if (isTableVisible) setupEaSalesTable(postId, container); // Renamed & scoped
                if (isStatsVisible) initEaConfidenceIndicator(postId, container); // Renamed & scoped
            } catch (error) {
                console.error(`[DEBUG EA Card ${postId}] Error initializing statistics components:`, error);
            }
        }, 100); 
    } else {
        console.log(`[DEBUG EA Card ${postId}] Statistics/Table sections hidden, skipping component initialization.`);
    }
}

// Setup histogram hover interactions (Renamed)
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

// Initialize confidence indicator visuals (Renamed)
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

// Function to format currency (local scope)
function formatCurrency(value, currency = 'USD') {
    if (typeof value !== 'number') return value;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (currency === 'GBP') return formatter.format(value).replace('$', '£');
    if (currency === 'EUR') return formatter.format(value).replace('$', '€');
    if (currency === 'AUD') return formatter.format(value).replace('$', 'A$');
    if (currency === 'PHP') return formatter.format(value).replace('$', '₱');
    return formatter.format(value);
}

// Function to format date (local scope)
function formatDate(dateString) {
    if (!dateString || dateString === 'Current') return 'Current';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch (e) { return dateString; }
}

// Setup sales table sorting and filtering (Renamed)
function setupEaSalesTable(postId, container) {
    const salesTable = document.getElementById(`ea-salesTable-${postId}`); // Use renamed ID
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
    const paginationControls = document.getElementById(`ea-pagination-${postId}`); // Use renamed ID
    const searchInput = document.getElementById(`ea-searchResults-${postId}`); // Use renamed ID
    
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

// End of initialization guard - REMOVED
//} 