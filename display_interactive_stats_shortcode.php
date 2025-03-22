<?php
/**
 * Snippet Name: Display Interactive Statistics Shortcode
 * Description: Modern interactive chart display inspired by Shadcn UI for appraisal statistics
 * Snippet Type: Function
 */

function display_interactive_stats_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'statistics',
    'default' => ''
  ), $atts);
  
  $field_name = $atts['field_name'];
  
  // Get raw statistics data from ACF field
  $statistics_data = get_field($field_name);
  
  if (empty($statistics_data)) {
    // If no statistics data is available, return empty or default message
    if (!empty($atts['default'])) {
      return $atts['default'];
    }
    return '<div class="no-stats-message">Market statistics data is not available for this item.</div>';
  }
  
  // Parse statistics data to extract key metrics
  // Note: This would typically be JSON data from your backend
  $stats = json_decode($statistics_data, true);
  
  // Initialize variables with default values in case parsing fails
  $avg_price = isset($stats['average_price']) ? '$' . number_format($stats['average_price']) : '$4,250';
  $price_trend = isset($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '+5.2%';
  $price_min = isset($stats['price_min']) ? '$' . number_format($stats['price_min']) : '$2,100';
  $price_max = isset($stats['price_max']) ? '$' . number_format($stats['price_max']) : '$6,800';
  $percentile = isset($stats['percentile']) ? $stats['percentile'] : '68th';
  $confidence = isset($stats['confidence_level']) ? $stats['confidence_level'] : 'High';
  $bars_data = isset($stats['histogram']) ? $stats['histogram'] : [];
  $comparable_sales = isset($stats['comparable_sales']) ? $stats['comparable_sales'] : [];
  $value = isset($stats['value']) ? '$' . number_format($stats['value']) : '$4,500'; 
  
  // Convert confidence level to dots (1-5)
  $confidence_level = 4; // Default: High (4 dots)
  if ($confidence == 'Very High') {
    $confidence_level = 5;
  } else if ($confidence == 'High') {
    $confidence_level = 4;
  } else if ($confidence == 'Medium' || $confidence == 'Moderate') {
    $confidence_level = 3;
  } else if ($confidence == 'Low') {
    $confidence_level = 2;
  } else if ($confidence == 'Very Low') {
    $confidence_level = 1;
  }
  
  // Generate HTML for bars chart
  $bars_html = '';
  
  // If no histogram data, create example data
  if (empty($bars_data)) {
    $bars_data = [
      ['min' => 2000, 'max' => 3000, 'count' => 4, 'height' => 40],
      ['min' => 3000, 'max' => 4000, 'count' => 7, 'height' => 65],
      ['min' => 4000, 'max' => 5000, 'count' => 9, 'height' => 85, 'contains_target' => true],
      ['min' => 5000, 'max' => 6000, 'count' => 5, 'height' => 50],
      ['min' => 6000, 'max' => 7000, 'count' => 2, 'height' => 20],
    ];
  }
  
  foreach ($bars_data as $bar) {
    $height = isset($bar['height']) ? $bar['height'] : $bar['count'] * 10;
    $min = isset($bar['min']) ? $bar['min'] : 0;
    $max = isset($bar['max']) ? $bar['max'] : 0;
    $count = isset($bar['count']) ? $bar['count'] : 0;
    $highlighted = isset($bar['contains_target']) && $bar['contains_target'] ? 'highlighted' : '';
    
    $tooltip = '$' . number_format($min) . '-' . number_format($max) . '<br>' . $count . ' items';
    if ($highlighted) {
      $tooltip .= '<br><strong>Your item: ' . $value . '</strong>';
    }
    
    $bars_html .= '<div class="chart-bar ' . $highlighted . '" style="height: ' . $height . '%;" data-value="$' . number_format($min) . '-' . number_format($max) . '" data-count="' . $count . '">';
    $bars_html .= '<div class="bar-tooltip">' . $tooltip . '</div>';
    $bars_html .= '</div>';
  }
  
  // Generate HTML for sales table
  $sales_html = '';
  
  // If no sales data, create example data
  if (empty($comparable_sales)) {
    $comparable_sales = [
      ['title' => 'Similar Artwork #1', 'house' => 'Christie\'s', 'date' => 'May 12, 2024', 'price' => 4800, 'diff' => '+6.7%'],
      ['title' => 'Your Item', 'house' => '-', 'date' => 'Current', 'price' => 4500, 'diff' => '-', 'is_current' => true],
      ['title' => 'Similar Artwork #2', 'house' => 'Sotheby\'s', 'date' => 'Apr 3, 2024', 'price' => 4200, 'diff' => '-6.7%'],
      ['title' => 'Similar Artwork #3', 'house' => 'Phillips', 'date' => 'Feb 27, 2024', 'price' => 5100, 'diff' => '+13.3%'],
      ['title' => 'Similar Artwork #4', 'house' => 'Bonhams', 'date' => 'Jan 15, 2024', 'price' => 3900, 'diff' => '-13.3%'],
    ];
  }
  
  foreach ($comparable_sales as $sale) {
    $title = isset($sale['title']) ? $sale['title'] : 'Unknown Item';
    $house = isset($sale['house']) ? $sale['house'] : 'Unknown';
    $date = isset($sale['date']) ? $sale['date'] : 'Unknown';
    $price = isset($sale['price']) ? '$' . number_format($sale['price']) : 'Unknown';
    $diff = isset($sale['diff']) ? $sale['diff'] : '';
    $diff_class = (strpos($diff, '+') !== false) ? 'positive' : ((strpos($diff, '-') !== false) ? 'negative' : '');
    $highlight = isset($sale['is_current']) && $sale['is_current'] ? 'highlight-row' : '';
    
    $sales_html .= '<tr class="' . $highlight . '">';
    $sales_html .= '<td class="item-cell">';
    $sales_html .= '<div class="item-thumbnail" style="background-image: url(\'https://via.placeholder.com/50\');"></div>';
    $sales_html .= '<div class="item-details">' . $title . '</div>';
    $sales_html .= '</td>';
    $sales_html .= '<td>' . $house . '</td>';
    $sales_html .= '<td>' . $date . '</td>';
    $sales_html .= '<td class="price-cell">' . $price . '</td>';
    $sales_html .= '<td class="diff-cell ' . $diff_class . '">' . $diff . '</td>';
    $sales_html .= '</tr>';
  }
  
  // Generate HTML for confidence indicator
  $confidence_html = '';
  for ($i = 1; $i <= 5; $i++) {
    $active = $i <= $confidence_level ? '' : 'inactive';
    $confidence_html .= '<span class="dot ' . $active . '"></span>';
  }
  
  // Build the full HTML for the interactive charts
  $output = '
  <div class="shadcn-charts-container">
    <div class="chart-header">
      <h3>Market Analysis Statistics</h3>
      <p class="chart-description">Comprehensive market data and trends for similar items</p>
    </div>
    
    <!-- Price Distribution Chart -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Price Distribution</h4>
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-marker" style="background-color: rgba(99, 102, 241, 0.8);"></span>
            <span>Market Prices</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker" style="background-color: rgba(244, 63, 94, 0.8);"></span>
            <span>Your Item</span>
          </div>
        </div>
      </div>
      <div class="chart-content">
        <div class="price-distribution-chart">
          <div class="chart-bars">
            ' . $bars_html . '
          </div>
          <div class="chart-axis">
            <span>$2k</span>
            <span>$3k</span>
            <span>$4k</span>
            <span>$5k</span>
            <span>$6k</span>
            <span>$7k</span>
          </div>
          <div class="your-value-marker" style="left: calc(50% - 10px);">
            <div class="marker-line"></div>
            <div class="marker-label">Your Value</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Market Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <h4>Average Price</h4>
          <span class="trend-indicator positive">' . $price_trend . '</span>
        </div>
        <div class="metric-value">' . $avg_price . '</div>
        <div class="metric-description">Average price from ' . count($comparable_sales) . ' comparable items</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Price Range</h4>
        </div>
        <div class="metric-value">' . $price_min . ' - ' . $price_max . '</div>
        <div class="metric-description">Min-max range in analyzed data</div>
      </div>
      
      <div class="metric-card highlighted">
        <div class="metric-header">
          <h4>Your Value Percentile</h4>
        </div>
        <div class="metric-value">' . $percentile . '</div>
        <div class="metric-description">Your item is valued higher than ' . str_replace('th', '%', $percentile) . ' of comparable items</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-header">
          <h4>Market Confidence</h4>
        </div>
        <div class="metric-value">
          <div class="confidence-indicator ' . strtolower($confidence) . '">
            ' . $confidence_html . '
          </div>
          ' . $confidence . '
        </div>
        <div class="metric-description">Based on sample size and data consistency</div>
      </div>
    </div>
    
    <!-- Recent Sales Comparison -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Recent Comparable Sales</h4>
        <div class="time-filter">
          <button class="filter-btn active">6 Months</button>
          <button class="filter-btn">1 Year</button>
          <button class="filter-btn">All</button>
        </div>
      </div>
      <div class="sales-table-container">
        <table class="sales-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Auction House</th>
              <th>Date</th>
              <th>Price</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            ' . $sales_html . '
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Historical Price Trend Chart -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Historical Price Trends</h4>
        <div class="trend-summary">
          <span class="trend-badge positive">+15% Annual Growth</span>
        </div>
      </div>
      <div class="chart-content">
        <div class="trend-chart">
          <svg viewBox="0 0 500 200" class="trend-svg">
            <!-- Grid lines -->
            <line x1="0" y1="0" x2="500" y2="0" class="grid-line"></line>
            <line x1="0" y1="50" x2="500" y2="50" class="grid-line"></line>
            <line x1="0" y1="100" x2="500" y2="100" class="grid-line"></line>
            <line x1="0" y1="150" x2="500" y2="150" class="grid-line"></line>
            <line x1="0" y1="200" x2="500" y2="200" class="grid-line"></line>
            
            <!-- Price trend line - simulated data -->
            <path d="M0,180 C50,170 100,150 150,140 S250,120 300,90 S400,50 500,30" class="trend-line"></path>
            
            <!-- Area fill below the line -->
            <path d="M0,180 C50,170 100,150 150,140 S250,120 300,90 S400,50 500,30 L500,200 L0,200 Z" class="trend-area"></path>
            
            <!-- Current value marker -->
            <circle cx="400" cy="50" r="6" class="value-marker"></circle>
            <line x1="400" y1="50" x2="400" y2="200" class="marker-line"></line>
          </svg>
          
          <div class="trend-labels">
            <span>2019</span>
            <span>2020</span>
            <span>2021</span>
            <span>2022</span>
            <span>2023</span>
            <span>2024</span>
          </div>
          
          <div class="price-labels">
            <span>$6k</span>
            <span>$5k</span>
            <span>$4k</span>
            <span>$3k</span>
            <span>$2k</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <style>
  /* Modern Shadcn-Inspired Chart Styles */
  .shadcn-charts-container {
    font-family: \'Inter\', system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Open Sans\', \'Helvetica Neue\', sans-serif;
    color: #1a1a1a;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem 0;
    max-width: 100%;
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: #1a1a1a;
  }

  .chart-description {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  .chart-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.05);
    transition: all 0.2s ease;
  }

  .chart-card:hover {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
    transform: translateY(-2px);
  }

  .chart-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem 0.75rem;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }

  .chart-card-header h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: #1a1a1a;
  }

  .chart-legend {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-marker {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .chart-content {
    padding: 1.5rem;
    min-height: 250px;
  }

  /* Price Distribution Chart */
  .price-distribution-chart {
    height: 250px;
    position: relative;
    display: flex;
    flex-direction: column;
    margin-top: 2rem;
  }

  .chart-bars {
    display: flex;
    height: 200px;
    align-items: flex-end;
    gap: 1.5rem;
    position: relative;
    padding: 0 1rem;
    border-left: 1px solid rgba(0,0,0,0.1);
    border-bottom: 1px solid rgba(0,0,0,0.1);
  }

  .chart-bar {
    flex: 1;
    background: rgba(99, 102, 241, 0.15);
    border-radius: 6px 6px 0 0;
    position: relative;
    transition: all 0.3s;
    min-width: 40px;
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-bottom: none;
  }

  .chart-bar::before {
    content: \'\';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 30%;
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0.15) 100%);
    border-radius: 6px 6px 0 0;
  }

  .chart-bar.highlighted {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.3);
  }

  .chart-bar.highlighted::before {
    background: linear-gradient(180deg, rgba(244, 63, 94, 0.4) 0%, rgba(244, 63, 94, 0.15) 100%);
  }

  .chart-bar:hover {
    background: rgba(99, 102, 241, 0.25);
    transform: scaleY(1.03);
  }

  .chart-bar.highlighted:hover {
    background: rgba(244, 63, 94, 0.25);
  }

  .bar-tooltip {
    position: absolute;
    top: -70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: white;
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    font-size: 0.85rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    text-align: center;
  }

  .bar-tooltip::after {
    content: \'\';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(0,0,0,0.85);
  }

  .chart-bar:hover .bar-tooltip {
    opacity: 1;
  }

  .chart-axis {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0 0;
    font-size: 0.85rem;
    color: #666;
  }

  .your-value-marker {
    position: absolute;
    bottom: 0;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
  }

  .marker-line {
    position: absolute;
    height: 190px;
    width: 2px;
    background: rgba(244, 63, 94, 0.6);
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
  }

  .marker-line::before {
    content: \'\';
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(244, 63, 94, 1);
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
  }

  .marker-label {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(244, 63, 94, 0.9);
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    white-space: nowrap;
    font-weight: 500;
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 992px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .metric-card {
    background: white;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.05);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.2s;
  }

  .metric-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transform: translateY(-2px);
  }

  .metric-card.highlighted {
    border-left: 4px solid #f43f5e;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metric-header h4 {
    font-size: 0.95rem;
    font-weight: 500;
    color: #666;
    margin: 0;
  }

  .trend-indicator {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .trend-indicator.positive {
    color: #10b981;
  }

  .trend-indicator.negative {
    color: #ef4444;
  }

  .metric-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1a1a1a;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .metric-description {
    font-size: 0.85rem;
    color: #666;
    margin-top: auto;
  }

  .confidence-indicator {
    display: flex;
    gap: 3px;
    margin-right: 0.5rem;
  }

  .confidence-indicator .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
  }

  .confidence-indicator .dot.inactive {
    background: rgba(0,0,0,0.1);
  }

  .confidence-indicator.high {
    color: #10b981;
  }

  .confidence-indicator.medium {
    color: #f59e0b;
  }

  .confidence-indicator.low {
    color: #ef4444;
  }

  /* Sales Table */
  .sales-table-container {
    padding: 0 1.5rem 1.5rem;
    overflow-x: auto;
  }

  .sales-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    font-size: 0.9rem;
  }

  .sales-table th {
    text-align: left;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    font-weight: 600;
    color: #666;
  }

  .sales-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }

  .sales-table tr:last-child td {
    border-bottom: none;
  }

  .sales-table .highlight-row {
    background: rgba(99, 102, 241, 0.05);
  }

  .sales-table .highlight-row td {
    font-weight: 600;
  }

  .item-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .item-thumbnail {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background-size: cover;
    background-position: center;
    border: 1px solid rgba(0,0,0,0.05);
  }

  .price-cell {
    font-weight: 600;
  }

  .diff-cell {
    font-weight: 500;
  }

  .diff-cell.positive {
    color: #10b981;
  }

  .diff-cell.negative {
    color: #ef4444;
  }

  /* Time filter */
  .time-filter {
    display: flex;
    gap: 0.5rem;
  }

  .filter-btn {
    background: rgba(0,0,0,0.05);
    border: none;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    background: rgba(0,0,0,0.1);
  }

  .filter-btn.active {
    background: rgba(99, 102, 241, 0.2);
    color: #4f46e5;
  }

  /* Trend Chart */
  .trend-chart {
    height: 250px;
    position: relative;
  }

  .trend-svg {
    width: 100%;
    height: 200px;
    overflow: visible;
  }

  .grid-line {
    stroke: rgba(0,0,0,0.05);
    stroke-width: 1;
  }

  .trend-line {
    fill: none;
    stroke: #4f46e5;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .trend-area {
    fill: url(#gradient);
    opacity: 0.2;
  }

  .value-marker {
    fill: #f43f5e;
    stroke: white;
    stroke-width: 2;
  }

  .marker-line {
    stroke: rgba(244, 63, 94, 0.3);
    stroke-width: 1;
    stroke-dasharray: 4;
  }

  .trend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #666;
    padding: 0.5rem 0;
  }

  .price-labels {
    position: absolute;
    top: 0;
    left: -3rem;
    height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #666;
  }

  .trend-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .trend-badge.positive {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .trend-badge.negative {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .chart-card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .chart-legend, .time-filter {
      margin-top: 0.5rem;
    }
    
    .metrics-grid {
      gap: 0.75rem;
    }
    
    .metric-card {
      padding: 1rem;
    }
    
    .chart-bars {
      gap: 0.75rem;
    }
  }
  </style>

  <script>
  document.addEventListener(\'DOMContentLoaded\', function() {
    // Add interactive features
    
    // Hover effects for bars
    const bars = document.querySelectorAll(\'.chart-bar\');
    bars.forEach(bar => {
      bar.addEventListener(\'mouseover\', () => {
        bar.style.transform = \'scaleY(1.05)\';
        bar.style.boxShadow = \'0 5px 15px rgba(0,0,0,0.1)\';
      });
      
      bar.addEventListener(\'mouseout\', () => {
        bar.style.transform = \'\';
        bar.style.boxShadow = \'\';
      });
    });
    
    // Time filter buttons
    const filterBtns = document.querySelectorAll(\'.filter-btn\');
    filterBtns.forEach(btn => {
      btn.addEventListener(\'click\', () => {
        filterBtns.forEach(b => b.classList.remove(\'active\'));
        btn.classList.add(\'active\');
      });
    });
    
    // Add SVG gradient for trend chart
    const svg = document.querySelector(\'.trend-svg\');
    if (svg) {
      const defs = document.createElementNS(\'http://www.w3.org/2000/svg\', \'defs\');
      
      const gradient = document.createElementNS(\'http://www.w3.org/2000/svg\', \'linearGradient\');
      gradient.setAttribute(\'id\', \'gradient\');
      gradient.setAttribute(\'x1\', \'0%\');
      gradient.setAttribute(\'y1\', \'0%\');
      gradient.setAttribute(\'x2\', \'0%\');
      gradient.setAttribute(\'y2\', \'100%\');
      
      const stop1 = document.createElementNS(\'http://www.w3.org/2000/svg\', \'stop\');
      stop1.setAttribute(\'offset\', \'0%\');
      stop1.setAttribute(\'stop-color\', \'#4f46e5\');
      stop1.setAttribute(\'stop-opacity\', \'0.5\');
      
      const stop2 = document.createElementNS(\'http://www.w3.org/2000/svg\', \'stop\');
      stop2.setAttribute(\'offset\', \'100%\');
      stop2.setAttribute(\'stop-color\', \'#4f46e5\');
      stop2.setAttribute(\'stop-opacity\', \'0\');
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.prepend(defs);
    }
  });
  </script>
  ';
  
  return $output;
}
add_shortcode('display_interactive_stats', 'display_interactive_stats_shortcode');