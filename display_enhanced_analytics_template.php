<div class="enhanced-analytics-container">
  <div class="section-header">
    <h2 class="section-title"><?php echo esc_html($atts['title']); ?></h2>
  </div>
  
  <?php if ($show_radar): ?>
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
          <canvas id="<?php echo $radar_chart_id; ?>" width="400" height="400"></canvas>
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
        <div class="metric-value"><?php echo $condition_score; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">Physical state assessment</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Rarity</h4>
        </div>
        <div class="metric-value"><?php echo $rarity_score; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">Availability in the market</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Market Demand</h4>
        </div>
        <div class="metric-value"><?php echo $market_demand; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">Current collector interest</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Historical Significance</h4>
        </div>
        <div class="metric-value"><?php echo $historical_significance; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">Cultural and historical impact</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Investment Potential</h4>
        </div>
        <div class="metric-value"><?php echo $investment_potential; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">Projected value growth</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Provenance Strength</h4>
        </div>
        <div class="metric-value"><?php echo $provenance_strength; ?>%</div>
        <div class="metric-footer">
          <div class="metric-description">History of ownership quality</div>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <?php if ($show_history): ?>
  <!-- PRICE HISTORY SECTION -->
  <div class="analytics-section price-history-section">
    <div class="section-header">
      <h3>Price History Analysis</h3>
      <p class="section-description">Historical price trends for comparable items</p>
    </div>
    
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Market Price History</h4>
        <div class="price-trend-badge <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>">
          <?php echo $price_trend; ?> annual
        </div>
      </div>
      <div class="chart-content">
        <div class="price-chart-wrapper">
          <canvas id="<?php echo $price_chart_id; ?>" height="300"></canvas>
        </div>
        <div class="price-chart-legend">
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(75, 192, 192);"></span>
            <span class="legend-label">Comparable Items</span>
          </div>
          <?php if ($has_indices): ?>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(153, 102, 255);"></span>
            <span class="legend-label">Market Index</span>
          </div>
          <?php endif; ?>
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
        <div class="highlight-value">$<?php echo number_format($current_price); ?></div>
      </div>
      <div class="highlight-card">
        <div class="highlight-header">5-Year Change</div>
        <div class="highlight-value <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>"><?php echo $price_trend; ?></div>
      </div>
      <div class="highlight-card">
        <div class="highlight-header">Market Prediction</div>
        <div class="highlight-value">
          $<?php echo number_format(round($current_price * (1 + (floatval(str_replace(['%', '+', '-'], '', $price_trend)) / 100)))); ?>
          <span class="prediction-year">(<?php echo date('Y') + 1; ?>)</span>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <?php if ($show_stats): ?>
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
          <?php 
          // Generate the summary dynamically from statistics data instead of using statistics_summary field
          $summary_total_count = isset($stats['total_count']) ? $stats['total_count'] : $count;
          ?>
          <p>Market analysis reveals <?php echo $summary_total_count; ?> comparable items with an average value of <?php echo $avg_price; ?>.</p>
          <p>Your item's value of <?php echo $value; ?> places it in the <?php echo $percentile; ?> percentile, with a <?php echo $price_trend; ?> average annual growth rate.</p>
          <p>Market confidence: <strong><?php echo $confidence; ?></strong></p>
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
                <div class="gauge-fill" style="--percentage: <?php echo $percentile_number; ?>;"></div>
                <div class="gauge-center"></div>
                <div class="gauge-needle" style="--rotation: <?php echo $percentile_number / 100 * 180; ?>deg;"></div>
              </div>
              <div class="gauge-labels">
                <span class="gauge-label low">Low</span>
                <span class="gauge-label medium">Medium</span>
                <span class="gauge-label high">High</span>
                <span class="gauge-label premium">Premium</span>
              </div>
              <div class="gauge-value"><?php echo $percentile; ?> Percentile</div>
              <div class="gauge-description">Your item is in the <?php echo $is_trend_positive ? 'appreciating' : 'depreciating'; ?> market segment</div>
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
              <div class="highlight-value <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>">
                <?php echo $is_trend_positive ? 'Favorable' : 'Challenging'; ?>
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
                <?php echo $market_demand; ?>%
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
                <?php echo $rarity_score; ?>%
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
              <?php echo $bars_html; ?>
            </div>
            <div class="chart-axis">
              <?php echo $axis_labels_html; ?>
            </div>
            <div class="your-value-marker" style="left: calc(<?php echo $target_position; ?>% - 1px);">
              <div class="marker-line"></div>
              <div class="marker-label"><?php echo $value; ?></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Market Metrics Cards -->
      <div class="metrics-grid stats-metrics-grid">
        <div class="metric-card shadcn-card">
          <div class="metric-header">
            <h4>Market Averages</h4>
            <span class="trend-badge <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>"><?php echo $price_trend; ?> annual</span>
          </div>
          <div class="metric-values">
            <div class="metric-value-row">
              <span class="metric-label">Mean</span>
              <span class="metric-value"><?php echo $avg_price; ?></span>
            </div>
            <div class="metric-value-row">
              <span class="metric-label">Median</span>
              <span class="metric-value"><?php echo $median_price; ?></span>
            </div>
          </div>
          <div class="metric-footer">
            <div class="metric-description">Based on <?php echo $count; ?> comparable items</div>
          </div>
        </div>
        
        <div class="metric-card shadcn-card">
          <div class="metric-header">
            <h4>Price Range & Variation</h4>
          </div>
          <div class="price-range-display">
            <div class="price-range-value"><?php echo $price_min; ?> - <?php echo $price_max; ?></div>
            <div class="price-range-bar">
              <div class="range-track"></div>
              <div class="range-fill"></div>
              <div class="range-thumb min"></div>
              <div class="range-thumb max"></div>
              <div class="target-indicator" style="left: calc(<?php echo $target_position; ?>% - 6px);"></div>
            </div>
          </div>
          <div class="metric-footer">
            <div class="badge">CV: <?php echo $coefficient_variation; ?>%</div>
            <div class="badge secondary">SD: <?php echo $std_dev; ?></div>
          </div>
        </div>
        
        <div class="metric-card shadcn-card highlighted">
          <div class="metric-header">
            <h4>Investment Potential</h4>
          </div>
          <div class="investment-rating-display">
            <div class="investment-rating">
              <span class="rating-value"><?php echo $investment_potential; ?>%</span>
              <span class="rating-label">Potential</span>
            </div>
            <div class="investment-scale">
              <div class="scale-bar" style="--fill-width: <?php echo $investment_potential; ?>%"></div>
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
            <div class="confidence-indicator <?php echo strtolower($confidence); ?>">
              <?php echo $confidence_html; ?>
            </div>
            <div class="confidence-value"><?php echo $confidence; ?></div>
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
              <?php echo $sales_html; ?>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <div class="table-pagination">
            <button class="pagination-btn">Previous</button>
            <span class="pagination-info">Showing 1-5 of <?php echo $count; ?></span>
            <button class="pagination-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>
</div>

<style>
/* Enhanced Analytics Container Styles */
.enhanced-analytics-container {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  color: #1A202C;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 1rem 0;
  max-width: 100%;
  margin-bottom: 3rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #1A202C;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 0.75rem;
}

.section-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #1A202C;
}

.section-description {
  color: #4A5568;
  margin: 0;
  font-size: 0.95rem;
}

.analytics-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Chart Card Styles */
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
  border: 1px solid #E2E8F0;
  transition: all 0.2s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.chart-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid #E2E8F0;
}

.chart-card-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #1A202C;
}

.chart-content {
  padding: 1.5rem;
  min-height: 250px;
}

/* Radar Chart Styles */
.radar-wrapper {
  width: 100%;
  max-width: 400px;
  height: 400px;
  margin: 0 auto;
}

.radar-metrics-legend {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}

/* Metrics Grid Styles */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.stats-metrics-grid {
  grid-template-columns: repeat(4, 1fr);
}

.metric-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateY(-3px);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #4A5568;
  margin: 0;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1A202C;
  text-align: center;
  display: inline-block;
  width: 100%;
  white-space: nowrap;
  overflow: visible;
}

.metric-footer {
  margin-top: auto;
}

.metric-description {
  font-size: 0.8125rem;
  color: #718096;
  line-height: 1.4;
  text-align: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color, .legend-marker {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  font-size: 0.85rem;
  color: #4A5568;
}

/* Statistics Summary Styling */
.statistics-summary {
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 8px;
}

/* Price Highlights Section */
.price-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: space-between;
}

.highlight-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  padding: 1.25rem;
  flex: 1;
  min-width: 200px;
  text-align: center;
}

.highlight-header {
  font-size: 0.85rem;
  color: #718096;
  margin-bottom: 0.5rem;
}

.highlight-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A202C;
}

.highlight-value.positive {
  color: #38A169;
}

.highlight-value.negative {
  color: #E53E3E;
}

.prediction-year {
  font-size: 0.75rem;
  color: #718096;
}

/* Market Position Gauge Styles */
.market-position-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.market-gauge-wrapper {
  flex: 1;
  min-width: 300px;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.gauge {
  width: 200px;
  height: 100px;
  position: relative;
  overflow: hidden;
  margin-bottom: 1rem;
}

.gauge:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 20px solid #E2E8F0;
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
}

.gauge-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 20px solid #3182CE;
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
  clip-path: path('M 100 100 L 0 100 A 100 100 0 0 1 calc(100 - 100 * cos(3.14159 * var(--percentage) / 100)) calc(100 - 100 * sin(3.14159 * var(--percentage) / 100)) Z');
}

.gauge-center {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background-color: #4A5568;
  border-radius: 50%;
  z-index: 2;
}

.gauge-needle {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 100px;
  height: 4px;
  background-color: #E53E3E;
  transform-origin: left center;
  transform: translateX(-1px) rotate(var(--rotation, 0deg));
  z-index: 1;
  border-radius: 4px;
}

.gauge-labels {
  width: 200px;
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.gauge-label {
  font-size: 0.75rem;
  color: #718096;
}

.gauge-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1A202C;
  margin-top: 0.5rem;
}

.gauge-description {
  font-size: 0.875rem;
  color: #718096;
  text-align: center;
}

/* Market Position Highlights */
.market-position-highlights {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.position-highlight-card {
  flex: 1;
  min-width: 140px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.highlight-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #EBF8FF;
  color: #3182CE;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.position-highlight-card h5 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4A5568;
}

.position-highlight-card .highlight-value {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.position-highlight-card p {
  font-size: 0.8125rem;
  color: #718096;
  margin: 0;
}

/* Price Trend Badge */
.price-trend-badge {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: #F0FFF4;
  color: #38A169;
}

.price-trend-badge.negative {
  background: #FFF5F5;
  color: #E53E3E;
}

/* Distribution Chart Styling */
.market-analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.modern-chart-container {
  position: relative;
  height: 250px;
  padding-bottom: 30px;
}

.modern-chart-bars {
  display: flex;
  height: 200px;
  align-items: flex-end;
  gap: 0.5rem;
  position: relative;
  margin-bottom: 30px;
  margin-left: 2.5%;
  width: 95%;
}

.modern-bar-wrap {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.modern-bar {
  width: 100%;
  background-color: #CBD5E0;
  position: relative;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  transition: height 0.5s ease;
}

.modern-bar.highlighted {
  background-color: #3182CE;
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #1A202C;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
  z-index: 10;
  width: max-content;
}

.bar-tooltip:after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: #1A202C transparent transparent transparent;
}

.modern-bar-wrap:hover .bar-tooltip {
  opacity: 1;
  visibility: visible;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  width: 95%;
  margin-left: 2.5%;
}

.chart-axis span {
  font-size: 0.75rem;
  color: #718096;
}

.your-value-marker {
  position: absolute;
  bottom: 5%;
  top: 0;
  width: 2px;
  z-index: 5;
}

.marker-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #E53E3E;
  z-index: 2;
}

.marker-label {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 600;
  color: #E53E3E;
  z-index: 3;
}

/* Sales Table Styling */
.sales-table-container {
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
}

.sales-table th, .sales-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #E2E8F0;
}

.sales-table th {
  font-weight: 600;
  color: #4A5568;
  border-bottom: 2px solid #CBD5E0;
}

.sortable {
  cursor: pointer;
}

.sort-icon {
  font-size: 0.625rem;
  margin-left: 0.25rem;
  color: #A0AEC0;
}

.item-cell {
  max-width: 200px;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.price-cell {
  font-weight: 600;
}

.currency-symbol {
  font-size: 0.75em;
  color: #718096;
  margin-left: 0.25rem;
}

.diff-cell {
  font-weight: 600;
}

.diff-cell.positive {
  color: #38A169;
}

.diff-cell.negative {
  color: #E53E3E;
}

.highlight-row {
  background-color: #EBF8FF;
}

/* Search and Filters */
.data-table-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.search-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 180px;
}

.filter-btn {
  background: #EDF2F7;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4A5568;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: #3182CE;
  color: white;
}

/* Table Pagination */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid #E2E8F0;
}

.pagination-btn {
  background: #EDF2F7;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #4A5568;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover {
  background: #E2E8F0;
}

.pagination-info {
  font-size: 0.75rem;
  color: #718096;
}

/* Confidence Indicator */
.confidence-indicator {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #38A169;
}

.dot.inactive {
  background-color: #E2E8F0;
}

.confidence-value {
  font-size: 1rem;
  font-weight: 600;
  color: #1A202C;
  text-align: center;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .metrics-grid, .stats-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .market-position-container {
    flex-direction: column;
  }
}

@media (max-width: 576px) {
  .metrics-grid, .stats-metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .item-details {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<script type="text/javascript">
// Create a standalone initialization function in an isolated scope
(function() {
  // Use a longer delay for initialization to ensure DOM and WordPress scripts are fully loaded
  window.setTimeout(function() {
    try {
      console.log("Enhanced Analytics: Starting initialization");
      
      // First, verify all required DOM elements exist
      var radarChartEl = document.getElementById('<?php echo $radar_chart_id; ?>');
      var priceChartEl = document.getElementById('<?php echo $price_chart_id; ?>');
      
      if (!radarChartEl && !priceChartEl) {
        console.warn("Enhanced Analytics: Chart canvas elements not found in DOM, skipping initialization");
        return;
      }
      
      // Create data objects before loading Chart.js to avoid jQuery conflicts
      var chartData = {
        radar: {
          labels: ['Condition', 'Rarity', 'Market Demand', 'Historical Significance', 'Investment Potential', 'Provenance'],
          data: [
            <?php echo $condition_score; ?>, 
            <?php echo $rarity_score; ?>, 
            <?php echo $market_demand; ?>, 
            <?php echo $historical_significance; ?>, 
            <?php echo $investment_potential; ?>, 
            <?php echo $provenance_strength; ?>
          ]
        },
        priceHistory: {
          labels: <?php echo json_encode($years); ?>,
          data: <?php echo json_encode($prices); ?>
        }
      };
      
      // Add error checking for chart data
      if (!chartData.radar.data.every(item => !isNaN(item))) {
        console.warn("Enhanced Analytics: Invalid radar chart data, using default values");
        chartData.radar.data = [70, 65, 60, 75, 68, 72]; // Default values
      }
      
      if (!Array.isArray(chartData.priceHistory.labels) || !chartData.priceHistory.labels.length || 
          !Array.isArray(chartData.priceHistory.data) || !chartData.priceHistory.data.length) {
        console.warn("Enhanced Analytics: Invalid price history data, using generated data");
        
        // Generate fallback data
        var currentYear = new Date().getFullYear();
        chartData.priceHistory.labels = [];
        chartData.priceHistory.data = [];
        
        for (var i = 5; i >= 0; i--) {
          chartData.priceHistory.labels.push((currentYear - i).toString());
          chartData.priceHistory.data.push(4500 * (0.8 + (i * 0.04)));
        }
      }
      
      console.log("Enhanced Analytics: Chart data prepared successfully");
      
      // Only load Chart.js once, with a distinct global variable
      if (typeof window.EnhancedAnalyticsChart === 'undefined') {
        console.log("Enhanced Analytics: Loading Chart.js library");
        var chartScript = document.createElement('script');
        
        // Add error handling for script loading
        chartScript.onerror = function() {
          console.error("Enhanced Analytics: Failed to load Chart.js library");
        };
        
        chartScript.onload = function() {
          console.log("Enhanced Analytics: Chart.js loaded successfully");
          // Store in our own variable to avoid conflicts
          window.EnhancedAnalyticsChart = window.Chart;
          
          // Initialize after a short delay to avoid jQuery errors
          window.setTimeout(function() {
            initializeCharts(chartData);
          }, 500);
        };
        
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        document.head.appendChild(chartScript);
      } else {
        // Charts already loaded, initialize directly
        console.log("Enhanced Analytics: Chart.js already available, initializing charts");
        window.setTimeout(function() {
          initializeCharts(chartData);
        }, 500);
      }
    } catch (e) {
      console.error("Enhanced Analytics error:", e);
    }
  }, 1500); // Using a longer delay to ensure WordPress is fully initialized
  
  // Function to initialize charts with isolated Chart.js instance
  function initializeCharts(chartData) {
    try {
      console.log("Enhanced Analytics: Beginning chart initialization");
      
      if (typeof window.EnhancedAnalyticsChart !== 'undefined') {
        // Set global defaults
        window.EnhancedAnalyticsChart.defaults.font = {
          family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          size: 12
        };
        
        // Ensure the canvas elements exist in DOM
        var radarChartEl = document.getElementById('<?php echo $radar_chart_id; ?>');
        var priceChartEl = document.getElementById('<?php echo $price_chart_id; ?>');
        
        // Track successful initializations
        var chartsInitialized = 0;
        
        // Initialize radar chart
        if (radarChartEl) {
          try {
            var radarCtx = radarChartEl.getContext('2d');
            if (!radarCtx) {
              console.warn("Enhanced Analytics: Could not get 2D context for radar chart");
            } else {
              console.log("Enhanced Analytics: Initializing radar chart");
              new window.EnhancedAnalyticsChart(radarCtx, {
                type: 'radar',
                data: {
                  labels: chartData.radar.labels,
                  datasets: [{
                    label: 'Item Metrics',
                    data: chartData.radar.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                  }]
                },
                options: {
                  scales: {
                    r: {
                      angleLines: { display: true },
                      suggestedMin: 0,
                      suggestedMax: 100
                    }
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom'
                    }
                  }
                }
              });
              chartsInitialized++;
              console.log("Enhanced Analytics: Radar chart initialized successfully");
            }
          } catch (radarError) {
            console.error("Enhanced Analytics: Error initializing radar chart:", radarError);
            // Try to show fallback content
            if (radarChartEl.parentNode) {
              var fallbackElement = document.createElement('div');
              fallbackElement.className = 'chart-fallback';
              fallbackElement.innerHTML = '<p>Item metrics visualization unavailable</p>';
              radarChartEl.parentNode.replaceChild(fallbackElement, radarChartEl);
            }
          }
        } else {
          console.warn("Enhanced Analytics: Radar chart element not found");
        }
        
        // Initialize price history chart
        if (priceChartEl) {
          try {
            var priceCtx = priceChartEl.getContext('2d');
            if (!priceCtx) {
              console.warn("Enhanced Analytics: Could not get 2D context for price chart");
            } else {
              console.log("Enhanced Analytics: Initializing price history chart");
              new window.EnhancedAnalyticsChart(priceCtx, {
                type: 'line',
                data: {
                  labels: chartData.priceHistory.labels,
                  datasets: [{
                    label: 'Price History',
                    data: chartData.priceHistory.data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1,
                    fill: true
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                    y: {
                      beginAtZero: false,
                      title: {
                        display: true,
                        text: 'Price (USD)'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Year'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          var value = context.parsed.y;
                          return '$' + value.toLocaleString();
                        }
                      }
                    }
                  }
                }
              });
              chartsInitialized++;
              console.log("Enhanced Analytics: Price history chart initialized successfully");
            }
          } catch (priceError) {
            console.error("Enhanced Analytics: Error initializing price history chart:", priceError);
            // Try to show fallback content
            if (priceChartEl.parentNode) {
              var fallbackElement = document.createElement('div');
              fallbackElement.className = 'chart-fallback';
              fallbackElement.innerHTML = '<p>Price history visualization unavailable</p>';
              priceChartEl.parentNode.replaceChild(fallbackElement, priceChartEl);
            }
          }
        } else {
          console.warn("Enhanced Analytics: Price chart element not found");
        }
        
        // Report final status
        console.log("Enhanced Analytics: Chart initialization complete. " + chartsInitialized + " charts successfully initialized.");
      } else {
        console.error("Enhanced Analytics: Chart.js not available for initialization");
        // Try to show fallback content for all charts
        document.querySelectorAll('canvas').forEach(function(canvas) {
          if (canvas.id.includes('chart')) {
            var fallbackElement = document.createElement('div');
            fallbackElement.className = 'chart-fallback';
            fallbackElement.innerHTML = '<p>Chart visualization unavailable</p>';
            canvas.parentNode.replaceChild(fallbackElement, canvas);
          }
        });
      }
    } catch (e) {
      console.error("Enhanced Analytics: Error during chart initialization:", e);
    }
  }
})();
</script>

<!-- Fallback for charts in case JavaScript fails -->
<noscript>
  <div class="chart-fallback">
    <p>Charts require JavaScript to be enabled in your browser.</p>
  </div>
</noscript>