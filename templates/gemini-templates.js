/**
 * Templates for Gemini to use when generating visualizations
 * Structured as placeholders that Gemini will fill with real data
 */

// Extract enhanced analytics template with placeholders
const ENHANCED_ANALYTICS_TEMPLATE = `
<div class="enhanced-analytics-container">
  <div class="section-header">
    <h2 class="section-title">{{title}}</h2>
  </div>
  
  <!-- RADAR CHART SECTION -->
  <div class="analytics-section radar-chart-section">
    <div class="section-header">
      <h3>Item Metrics Analysis</h3>
      <p class="section-description">Multi-dimensional analysis of key value factors</p>
    </div>
    
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Value Metrics Radar</h4>
      </div>
      <div class="chart-content">
        <div class="radar-wrapper">
          <canvas id="{{chartIds.radar}}" width="400" height="400"></canvas>
        </div>
        <div class="radar-metrics-legend">
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgba(54, 162, 235, 0.6);"></span>
            <span class="legend-label">Item Metrics</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <h4>Condition</h4>
        </div>
        <div class="metric-value">{{condition_score}}%</div>
        <div class="metric-footer">
          <div class="metric-description">Physical state assessment</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Rarity</h4>
        </div>
        <div class="metric-value">{{rarity_score}}%</div>
        <div class="metric-footer">
          <div class="metric-description">Availability in the market</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Market Demand</h4>
        </div>
        <div class="metric-value">{{market_demand}}%</div>
        <div class="metric-footer">
          <div class="metric-description">Current collector interest</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Historical Significance</h4>
        </div>
        <div class="metric-value">{{historical_significance}}%</div>
        <div class="metric-footer">
          <div class="metric-description">Cultural and historical impact</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Investment Potential</h4>
        </div>
        <div class="metric-value">{{investment_potential}}%</div>
        <div class="metric-footer">
          <div class="metric-description">Projected value growth</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Provenance Strength</h4>
        </div>
        <div class="metric-value">{{provenance_strength}}%</div>
        <div class="metric-footer">
          <div class="metric-description">History of ownership quality</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PRICE HISTORY SECTION -->
  <div class="analytics-section price-history-section">
    <div class="section-header">
      <h3>Price History Analysis</h3>
      <p class="section-description">Historical price trends for comparable items</p>
    </div>
    
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Market Price History</h4>
        <div class="price-trend-badge {{trend_class}}">
          {{price_trend}} annual
        </div>
      </div>
      <div class="chart-content">
        <div class="price-chart-wrapper">
          <canvas id="{{chartIds.price}}" height="300"></canvas>
        </div>
        <div class="price-chart-legend">
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(75, 192, 192);"></span>
            <span class="legend-label">Comparable Items</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(255, 99, 132);"></span>
            <span class="legend-label">Your Item</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="price-highlights">
      <div class="highlight-card">
        <div class="highlight-header">Current Value</div>
        <div class="highlight-value">{{formatted_value}}</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-header">5-Year Change</div>
        <div class="highlight-value {{trend_class}}">{{price_trend}}</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-header">Market Prediction</div>
        <div class="highlight-value">
          {{market_prediction}}
          <span class="prediction-year">({{prediction_year}})</span>
        </div>
      </div>
    </div>
  </div>

  <!-- INTERACTIVE STATISTICS SECTION -->
  <div class="analytics-section statistics-section">
    <div class="section-header">
      <h3>Market Statistics Analysis</h3>
      <p class="section-description">Comprehensive statistical analysis of market data</p>
    </div>
    
    <!-- Statistics Summary Box -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Statistical Summary</h4>
      </div>
      <div class="chart-content">
        <div class="statistics-summary">
          <p>Market analysis reveals {{count}} comparable items with an average value of {{avg_price}}.</p>
          <p>Your item's value of {{value}} places it in the {{percentile}} percentile, with a {{price_trend}} average annual growth rate.</p>
          <p>Market confidence: <strong>{{confidence}}</strong></p>
        </div>
      </div>
    </div>
    
    <!-- Market Position Gauge -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Market Position Analysis</h4>
        <div class="chart-controls">
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-marker" style="background-color: #3182CE;"></span>
              <span>Value Position</span>
            </div>
            <div class="legend-item">
              <span class="legend-marker" style="background-color: #E53E3E;"></span>
              <span>Your Item</span>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-content">
        <div class="market-position-container">
          <div class="market-gauge-wrapper">
            <div class="gauge-container">
              <div class="gauge">
                <div class="gauge-fill" style="--percentage: {{percentile_number}};"></div>
                <div class="gauge-center"></div>
                <div class="gauge-needle" style="--rotation: {{gauge_rotation}}deg;"></div>
              </div>
              <div class="gauge-labels">
                <span class="gauge-label low">Low</span>
                <span class="gauge-label medium">Medium</span>
                <span class="gauge-label high">High</span>
                <span class="gauge-label premium">Premium</span>
              </div>
              <div class="gauge-value">{{percentile}} Percentile</div>
              <div class="gauge-description">Your item is in the {{market_segment}} market segment</div>
            </div>
          </div>
          
          <div class="market-position-highlights">
            <div class="position-highlight-card">
              <div class="highlight-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h5>Market Timing</h5>
              <div class="highlight-value {{trend_class}}">
                {{market_timing}}
              </div>
              <p>Based on current market conditions</p>
            </div>
            
            <div class="position-highlight-card">
              <div class="highlight-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h5>Market Demand</h5>
              <div class="highlight-value">
                {{market_demand}}%
              </div>
              <p>Current collector interest level</p>
            </div>
            
            <div class="position-highlight-card">
              <div class="highlight-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 7H7.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h5>Rarity Impact</h5>
              <div class="highlight-value">
                {{rarity_score}}%
              </div>
              <p>Effect of item scarcity on value</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-header item-metrics-header">
      <h3>Item Metrics Analysis</h3>
      <p class="section-description">Multi-dimensional analysis of key value factors</p>
    </div>

    <!-- Market Analysis Grid -->
    <div class="market-analysis-grid">
      <!-- Price Distribution Chart -->
      <div class="chart-card distribution-card">
        <div class="chart-card-header">
          <h4>Price Distribution</h4>
          <div class="chart-controls">
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-marker" style="background-color: #3182CE;"></span>
                <span>Market Prices</span>
              </div>
              <div class="legend-item">
                <span class="legend-marker" style="background-color: #E53E3E;"></span>
                <span>Your Item</span>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-content">
          <div class="modern-chart-container">
            <div class="modern-chart-bars">
              {{histogram_bars}}
            </div>
            <div class="chart-axis">
              {{axis_labels}}
            </div>
            <div class="your-value-marker" style="left: calc({{target_position}}% - 1px);">
              <div class="marker-line"></div>
              <div class="marker-label">{{value}}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Market Metrics Cards -->
      <div class="metrics-grid stats-metrics-grid">
        <div class="metric-card shadcn-card">
          <div class="metric-header">
            <h4>Market Averages</h4>
            <span class="trend-badge {{trend_class}}">{{price_trend}} annual</span>
          </div>
          <div class="metric-values">
            <div class="metric-value-row">
              <span class="metric-label">Mean</span>
              <span class="metric-value">{{avg_price}}</span>
            </div>
            <div class="metric-value-row">
              <span class="metric-label">Median</span>
              <span class="metric-value">{{median_price}}</span>
            </div>
          </div>
          <div class="metric-footer">
            <div class="metric-description">Based on {{count}} comparable items</div>
          </div>
        </div>
        
        <div class="metric-card shadcn-card">
          <div class="metric-header">
            <h4>Price Range & Variation</h4>
          </div>
          <div class="price-range-display">
            <div class="price-range-value">{{price_min}} - {{price_max}}</div>
            <div class="price-range-bar">
              <div class="range-track"></div>
              <div class="range-fill"></div>
              <div class="range-thumb min"></div>
              <div class="range-thumb max"></div>
              <div class="target-indicator" style="left: calc({{target_position}}% - 6px);"></div>
            </div>
          </div>
          <div class="metric-footer">
            <div class="badge">CV: {{coefficient_variation}}%</div>
            <div class="badge secondary">SD: {{std_dev}}</div>
          </div>
        </div>
        
        <div class="metric-card shadcn-card highlighted">
          <div class="metric-header">
            <h4>Investment Potential</h4>
          </div>
          <div class="investment-rating-display">
            <div class="investment-rating">
              <span class="rating-value">{{investment_potential}}%</span>
              <span class="rating-label">Potential</span>
            </div>
            <div class="investment-scale">
              <div class="scale-bar" style="--fill-width: {{investment_potential}}%"></div>
            </div>
          </div>
          <div class="metric-footer">
            <div class="metric-description">Based on market trends and item characteristics</div>
          </div>
        </div>
        
        <div class="metric-card shadcn-card">
          <div class="metric-header">
            <h4>Market Confidence</h4>
          </div>
          <div class="confidence-display">
            <div class="confidence-indicator {{confidence_class}}">
              {{confidence_dots}}
            </div>
            <div class="confidence-value">{{confidence}}</div>
          </div>
          <div class="metric-footer">
            <div class="metric-description">Based on sample size and data consistency</div>
          </div>
        </div>
      </div>
      
      <!-- Interactive Data Table -->
      <div class="chart-card advanced-data-table-card">
        <div class="chart-card-header">
          <h4>Comprehensive Market Data</h4>
          <div class="data-table-controls">
            <div class="search-filter">
              <input type="text" id="searchResults" placeholder="Search items..." class="search-input">
            </div>
            <div class="filter-controls">
              <button class="filter-btn active" data-filter="all">All Results</button>
            </div>
          </div>
        </div>
        <div class="sales-table-container">
          <table class="sales-table advanced-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="title">Item <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="house">Auction House <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="date">Date <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="price">Price <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="diff">Difference <span class="sort-icon">↕</span></th>
              </tr>
            </thead>
            <tbody>
              {{sales_table_rows}}
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <div class="table-pagination">
            <button class="pagination-btn">Previous</button>
            <span class="pagination-info">Showing 1-5 of {{sales_count}}</span>
            <button class="pagination-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{{styles}}

{{scripts}}`;

// Script section specifically for enhanced analytics
const ENHANCED_ANALYTICS_SCRIPTS = `
<script>
document.addEventListener("DOMContentLoaded", function() {
    // Ensure Chart.js is loaded
    if (typeof Chart === "undefined") {
        console.log("Loading Chart.js");
        var script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = initCharts;
        document.head.appendChild(script);
    } else {
        initCharts();
    }
    
    // Initialize all charts
    function initCharts() {
        // Check if sections are visible before initializing
        const isPriceHistoryVisible = !document.querySelector(".price-history-section").hasAttribute("style") ||
                                      !document.querySelector(".price-history-section").style.display === "none";
        
        initRadarChart();
        if (isPriceHistoryVisible) {
            initPriceHistoryChart();
        }
        initGaugeChart();
        setupHistogram();
        setupSalesTable();
    }
    
    // Initialize radar chart
    function initRadarChart() {
        var wrapper = document.querySelector(".radar-wrapper");
        if (wrapper) {
            var canvas = wrapper.querySelector("canvas");
            if (canvas) {
                var data = {
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
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(1) .metric-value').textContent),
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(2) .metric-value').textContent),
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(3) .metric-value').textContent),
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(4) .metric-value').textContent),
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(5) .metric-value').textContent),
                            parseInt(document.querySelector('.metrics-grid .metric-card:nth-child(6) .metric-value').textContent)
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
                
                new Chart(canvas, {
                    type: 'radar',
                    data: data,
                    options: {
                        elements: {
                            line: {
                                borderWidth: 3
                            }
                        },
                        scales: {
                            r: {
                                angleLines: {
                                    display: true
                                },
                                suggestedMin: 0,
                                suggestedMax: 100
                            }
                        }
                    }
                });
                console.log("Radar chart initialized");
            }
        }
    }
    
    // Initialize price history chart
    function initPriceHistoryChart() {
        var wrapper = document.querySelector(".price-chart-wrapper");
        if (wrapper) {
            try {
                var canvas = wrapper.querySelector("canvas");
                if (canvas && wrapper.dataset.chartDataHistory) {
                    var chartData = JSON.parse(wrapper.dataset.chartDataHistory);
                    new Chart(canvas, {
                        type: 'line',
                        data: chartData,
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.1)'
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'bottom'
                                }
                            }
                        }
                    });
                    console.log("Price history chart initialized successfully");
                } else {
                    console.log("No price history data found");
                }
            } catch (e) {
                console.error("Error initializing price history chart:", e);
            }
        }
    }
    
    // Initialize gauge chart
    function initGaugeChart() {
        // This would be implemented if using a gauge chart library
        // For now, using CSS-based gauge
        console.log("Gauge visualization initialized");
    }
    
    // Setup histogram interaction
    function setupHistogram() {
        var bars = document.querySelectorAll('.modern-bar-wrap');
        bars.forEach(function(bar) {
            bar.addEventListener('mouseenter', function() {
                var tooltip = this.querySelector('.bar-tooltip');
                if (tooltip) tooltip.style.display = 'block';
            });
            
            bar.addEventListener('mouseleave', function() {
                var tooltip = this.querySelector('.bar-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
        });
        console.log("Histogram interaction setup complete");
    }
    
    // Setup sales table sorting and filtering
    function setupSalesTable() {
        var salesTable = document.querySelector('.sales-table');
        if (salesTable) {
            var sortableHeaders = salesTable.querySelectorAll('th.sortable');
            sortableHeaders.forEach(function(header) {
                header.addEventListener('click', function() {
                    var sortBy = this.getAttribute('data-sort');
                    sortTable(salesTable, sortBy);
                });
            });
            
            var searchInput = document.getElementById('searchResults');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    filterTable(salesTable, this.value);
                });
            }
            
            var filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(function(button) {
                button.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    var filter = this.getAttribute('data-filter');
                    filterTableByCategory(salesTable, filter);
                });
            });
            console.log("Sales table interaction setup complete");
        }
    }
    
    // Table sorting function
    function sortTable(table, sortBy) {
        var rows = Array.from(table.querySelector('tbody').querySelectorAll('tr'));
        var headerIdx = Array.from(table.querySelectorAll('th')).findIndex(th => th.getAttribute('data-sort') === sortBy);
        
        if (headerIdx > -1) {
            rows.sort(function(a, b) {
                var textA = a.querySelectorAll('td')[headerIdx].textContent.trim();
                var textB = b.querySelectorAll('td')[headerIdx].textContent.trim();
                
                // Check if sorting prices
                if (sortBy === 'price' || sortBy === 'diff') {
                    // Extract numeric value
                    var numA = parseFloat(textA.replace(/[^0-9.-]+/g, ""));
                    var numB = parseFloat(textB.replace(/[^0-9.-]+/g, ""));
                    return numA - numB;
                }
                
                return textA.localeCompare(textB);
            });
            
            // Re-append sorted rows
            var tbody = table.querySelector('tbody');
            rows.forEach(function(row) {
                tbody.appendChild(row);
            });
        }
    }
    
    // Table filtering function
    function filterTable(table, query) {
        var rows = table.querySelector('tbody').querySelectorAll('tr');
        query = query.toLowerCase();
        
        rows.forEach(function(row) {
            var text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }
    
    // Filter table by category
    function filterTableByCategory(table, category) {
        var rows = table.querySelector('tbody').querySelectorAll('tr');
        
        if (category === 'all') {
            rows.forEach(function(row) {
                row.style.display = '';
            });
        } else {
            rows.forEach(function(row) {
                var categoryValue = row.getAttribute('data-category');
                row.style.display = categoryValue === category ? '' : 'none';
            });
        }
    }
});
</script>
`;

// Extract appraisal card template with placeholders
const APPRAISAL_CARD_TEMPLATE = `
<div class="modern-appraisal-card">
  <header class="card-header">
    <div class="header-content">
      <div class="report-info">
        <div class="report-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <h1>Art Analysis Report</h1>
          <p class="report-date">{{current_date}}</p>
        </div>
      </div>
      <div class="value-display">
        <div class="value-content">
          <span class="value-label">APPRAISED VALUE</span>
          <span class="value-amount">{{formatted_value}}</span>
        </div>
      </div>
    </div>
  </header>
  
  <div class="card-body">
    <div class="dual-layout">
      <div class="artwork-showcase">
        <div class="artwork-image">
          {{featured_image_html}}
        </div>
        
        <div class="artwork-info">
          <h2 class="artwork-title">{{title}}</h2>
          <p class="artwork-creator">{{creator}}</p>
          
          <div class="artwork-details">
            <div class="detail-item">
              <span class="detail-label">Object Type</span>
              <span class="detail-value">{{object_type}}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Period/Age</span>
              <span class="detail-value">{{age}}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Medium</span>
              <span class="detail-value">{{medium}}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Condition</span>
              <span class="detail-value">{{condition}}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="market-position-container">
        <h3>Market Position</h3>
        <div class="gauge-container">
          <canvas id="{{gauge_chart_id}}" height="170"></canvas>
          <div class="gauge-indicator">
            <span class="percentile-value">{{percentile}}</span>
            <span class="percentile-label">Percentile</span>
          </div>
        </div>
        <div class="position-trend">
          <span class="trend-label">Market Trend</span>
          <span class="trend-value {{trend_class}}">
            {{price_trend}} Annual Change
          </span>
        </div>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metrics-chart-container">
        <h3>Item Value Assessment</h3>
        <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
          <canvas id="{{metrics_chart_id}}"></canvas>
        </div>
      </div>
      
      <div class="price-distribution-container">
        <h3>Market Price Distribution</h3>
        <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
          <canvas id="{{market_chart_id}}"></canvas>
        </div>
        <div class="distribution-legend">
          <span class="legend-item">
            <span class="legend-marker market-marker"></span>
            Market Prices
          </span>
          <span class="legend-item">
            <span class="legend-marker your-marker"></span>
            Your Item
          </span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="card-tabs">
    <div class="tabs-navigation">
      <button class="tab-button active" data-tab="summary">Summary</button>
      <button class="tab-button" data-tab="details">Details</button>
      <button class="tab-button" data-tab="similar">Similar Items</button>
    </div>
    
    <div class="tabs-content">
      <div id="summary" class="tab-panel active">
        <h2 class="tab-title">Artwork Details</h2>
        <div class="artwork-details-table">
          <table>
            <tbody>
              {{details_table}}
            </tbody>
          </table>
        </div>
      </div>
      
      <div id="details" class="tab-panel">
        <div class="market-analysis">
          <p class="analysis-text">
            {{analysis_text}}
          </p>
          
          <div class="metrics-details">
            <div class="metric-detail-item">
              <h4>Market Demand</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: {{market_demand}}%;">
                  <span class="metric-value">{{market_demand}}%</span>
                </div>
              </div>
              <p>Current collector interest level</p>
            </div>
            
            <div class="metric-detail-item">
              <h4>Rarity</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: {{rarity}}%;">
                  <span class="metric-value">{{rarity}}%</span>
                </div>
              </div>
              <p>Scarcity in the marketplace</p>
            </div>
            
            <div class="metric-detail-item">
              <h4>Condition</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: {{condition_score}}%;">
                  <span class="metric-value">{{condition_score}}%</span>
                </div>
              </div>
              <p>Physical state assessment</p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="similar" class="tab-panel">
        <div class="similar-items">
          <p class="no-similar-items">Similar items can be viewed on the full webpage.</p>
        </div>
      </div>
    </div>
  </div>
  
  <footer class="card-footer">
    <div class="footer-info">
      <p>Appraised by: <strong>{{appraiser_name}}</strong>, Accredited Art Appraiser</p>
    </div>
    <a href="#" class="detail-report-button">
      <span>View Detailed Report</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
  </footer>
</div>

{{styles}}

{{scripts}}
`;

// Export templates
module.exports = {
  ENHANCED_ANALYTICS_TEMPLATE,
  ENHANCED_ANALYTICS_SCRIPTS,
  APPRAISAL_CARD_TEMPLATE
};