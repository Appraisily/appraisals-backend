<?php
/**
 * Snippet Name: Display Enhanced Analytics Shortcode
 * Description: Comprehensive analytics dashboard with radar chart, price history, and interactive statistics
 * Snippet Type: Shortcode
 */

function display_enhanced_analytics_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'statistics',
    'default' => '',
    'show_radar' => 'true',
    'show_history' => 'true',
    'show_stats' => 'true',
    'title' => 'Enhanced Market Analytics'
  ), $atts);
  
  // Field name for statistics
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
  $stats = json_decode($statistics_data, true);
  
  // Get various item metrics either from statistics or custom fields
  $condition_score = get_field('condition_score');
  $condition_score = !empty($condition_score) ? intval($condition_score) : 70;
  
  $rarity_score = get_field('rarity');
  $rarity_score = !empty($rarity_score) ? intval($rarity_score) : 65;
  
  $market_demand = get_field('market_demand');
  $market_demand = !empty($market_demand) ? intval($market_demand) : 60;
  
  // Additional metrics - can be extracted from statistics or set as defaults
  $historical_significance = isset($stats['historical_significance']) ? intval($stats['historical_significance']) : 75;
  $investment_potential = isset($stats['investment_potential']) ? intval($stats['investment_potential']) : 68;
  $provenance_strength = isset($stats['provenance_strength']) ? intval($stats['provenance_strength']) : 72;
  
  // Stats for other visualizations
  $avg_price = isset($stats['average_price']) ? '$' . number_format($stats['average_price']) : '$4,250';
  $median_price = isset($stats['median_price']) ? '$' . number_format($stats['median_price']) : '$4,400';
  $price_trend = isset($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '+5.2%';
  $price_min = isset($stats['price_min']) ? '$' . number_format($stats['price_min']) : '$2,100';
  $price_max = isset($stats['price_max']) ? '$' . number_format($stats['price_max']) : '$6,800';
  $percentile = isset($stats['percentile']) ? $stats['percentile'] : '68th';
  $confidence = isset($stats['confidence_level']) ? $stats['confidence_level'] : 'High';
  $coefficient_variation = isset($stats['coefficient_of_variation']) ? $stats['coefficient_of_variation'] : 15.8;
  $count = isset($stats['count']) ? $stats['count'] : 5;
  $std_dev = isset($stats['standard_deviation']) ? '$' . number_format($stats['standard_deviation']) : '$650';
  $bars_data = isset($stats['histogram']) ? $stats['histogram'] : [];
  $comparable_sales = isset($stats['comparable_sales']) ? $stats['comparable_sales'] : [];
  $value = isset($stats['value']) ? '$' . number_format($stats['value']) : '$4,500';
  $target_position = isset($stats['target_marker_position']) ? $stats['target_marker_position'] : 50;
  $raw_value = isset($stats['value']) ? $stats['value'] : 4500;

  // Current value from ACF field if available
  $current_price = get_field('value') ? intval(get_field('value')) : (isset($stats['value']) ? intval($stats['value']) : 4500);
  $is_trend_positive = strpos($price_trend, '+') !== false;
  
  // Price history data - use defaults if not present
  $price_history = isset($stats['price_history']) ? $stats['price_history'] : [
    ['year' => '2018', 'price' => 5000, 'index' => 1000],
    ['year' => '2019', 'price' => 5200, 'index' => 1050],
    ['year' => '2020', 'price' => 5500, 'index' => 1100],
    ['year' => '2021', 'price' => 6000, 'index' => 1200],
    ['year' => '2022', 'price' => 6200, 'index' => 1250],
    ['year' => '2023', 'price' => 6800, 'index' => 1300]
  ];
  
  // Extract years, prices and index values 
  $years = array_map(function($item) { return $item['year']; }, $price_history);
  $prices = array_map(function($item) { return $item['price']; }, $price_history);
  $indices = array_map(function($item) { return isset($item['index']) ? $item['index'] : null; }, $price_history);
  
  // Filter out null values from indices
  $has_indices = !empty(array_filter($indices, function($val) { return $val !== null; }));
  
  // Generate unique IDs for the charts
  $radar_chart_id = 'radar-chart-' . uniqid();
  $price_chart_id = 'price-chart-' . uniqid();
  
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
  
  // Generate HTML for bars chart
  $bars_html = '';
  
  // Generate axis labels based on actual min and max prices
  $axis_labels_html = '';
  $raw_min = isset($stats['price_min']) ? $stats['price_min'] : 2000;
  $raw_max = isset($stats['price_max']) ? $stats['price_max'] : 7000;
  $step = ($raw_max - $raw_min) / 5;
  
  for ($i = 0; $i <= 5; $i++) {
    $label_value = $raw_min + ($step * $i);
    $axis_labels_html .= '<span>$' . number_format(round($label_value)) . '</span>';
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
    
    $bars_html .= '<div class="modern-bar-wrap">';
    $bars_html .= '<div class="modern-bar ' . $highlighted . '" style="height: ' . $height . '%;" data-value="$' . number_format($min) . '-' . number_format($max) . '" data-count="' . $count . '">';
    $bars_html .= '</div>';
    $bars_html .= '<div class="bar-tooltip">' . $tooltip . '</div>';
    $bars_html .= '</div>';
  }

  // Generate HTML for sales table
  $sales_html = '';
  
  // If no sales data, create example data
  if (empty($comparable_sales)) {
    $comparable_sales = [
      ['title' => 'Similar Item #1', 'house' => 'Christie\'s', 'date' => 'May 12, 2024', 'price' => 4800, 'diff' => '+6.7%'],
      ['title' => 'Your Item', 'house' => '-', 'date' => 'Current', 'price' => 4500, 'diff' => '-', 'is_current' => true],
      ['title' => 'Similar Item #2', 'house' => 'Sotheby\'s', 'date' => 'Apr 3, 2024', 'price' => 4200, 'diff' => '-6.7%'],
      ['title' => 'Similar Item #3', 'house' => 'Phillips', 'date' => 'Feb 27, 2024', 'price' => 5100, 'diff' => '+13.3%'],
      ['title' => 'Similar Item #4', 'house' => 'Bonhams', 'date' => 'Jan 15, 2024', 'price' => 3900, 'diff' => '-13.3%'],
    ];
  }
  
  foreach ($comparable_sales as $sale) {
    $title = isset($sale['title']) ? $sale['title'] : 'Unknown Item';
    $house = isset($sale['house']) ? $sale['house'] : 'Unknown';
    $date = isset($sale['date']) ? $sale['date'] : 'Unknown';
    if (strlen($date) > 10 && strtotime($date)) {
      $timestamp = strtotime($date);
      $date = date('M j, Y', $timestamp);
    }
    $price = isset($sale['price']) ? '$' . number_format($sale['price']) : 'Unknown';
    $diff = isset($sale['diff']) ? $sale['diff'] : '';
    $diff_class = (strpos($diff, '+') !== false) ? 'positive' : ((strpos($diff, '-') !== false) ? 'negative' : '');
    $highlight = isset($sale['is_current']) && $sale['is_current'] ? 'highlight-row' : '';
    
    $sales_html .= '<tr class="' . $highlight . '">';
    $sales_html .= '<td class="item-cell">';
    $sales_html .= '<div class="item-details"><span class="item-name">' . $title . '</span></div>';
    $sales_html .= '</td>';
    $sales_html .= '<td>' . $house . '</td>';
    $sales_html .= '<td>' . $date . '</td>';
    $sales_html .= '<td class="price-cell">' . $price . '</td>';
    $sales_html .= '<td class="diff-cell ' . $diff_class . '">' . $diff . '</td>';
    $sales_html .= '</tr>';
  }
  
  // Generate HTML for confidence indicator
  $confidence_html = '';
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
  
  for ($i = 1; $i <= 5; $i++) {
    $active = $i <= $confidence_level ? '' : 'inactive';
    $confidence_html .= '<span class="dot ' . $active . '"></span>';
  }
  
  // Extract percentile number for width calculation
  $percentile_number = is_numeric($percentile) ? $percentile : preg_replace('/[^0-9]/', '', $percentile);

  // Determine which components to show
  $show_radar = strtolower($atts['show_radar']) === 'true';
  $show_history = strtolower($atts['show_history']) === 'true';
  $show_stats = strtolower($atts['show_stats']) === 'true';
  
  // Start output buffering to capture HTML
  ob_start();
?>
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
      <h3>Price History Analysis</h3>
      <p class="section-description">Historical price trends for comparable items</p>
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
    
    <!-- Time-Based Value Map -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h4>Time-Based Value Map</h4>
        <div class="value-projection-badge">
          Projected Growth: <span class="<?php echo $is_trend_positive ? 'positive' : 'negative'; ?>"><?php echo $price_trend; ?> annual</span>
        </div>
      </div>
      <div class="chart-content">
        <div class="time-value-map-container">
          <canvas id="timeValueMap-<?php echo uniqid(); ?>" height="280"></canvas>
        </div>
        <div class="value-map-legend">
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgba(75, 192, 192, 0.6);"></span>
            <span class="legend-label">Past Comparable Sales</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgba(255, 99, 132, 0.6);"></span>
            <span class="legend-label">Your Item</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgba(99, 102, 241, 0.6);"></span>
            <span class="legend-label">Future Projection</span>
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

      <!-- Value Component Breakdown -->
      <div class="chart-card component-card">
        <div class="chart-card-header">
          <h4>Value Component Breakdown</h4>
        </div>
        <div class="chart-content">
          <div class="value-components-container">
            <canvas id="componentBreakdown-<?php echo uniqid(); ?>" height="250"></canvas>
          </div>
          <div class="components-description">
            <p>Analysis of specific factors contributing to the item's appraised value</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Market Competition Radar & Value-to-Rarity Curve -->
    <div class="market-analysis-grid">
      <!-- Market Competition Radar -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h4>Market Competition Radar</h4>
        </div>
        <div class="chart-content">
          <div class="competition-radar-container">
            <canvas id="competitionRadar-<?php echo uniqid(); ?>" height="250"></canvas>
          </div>
          <div class="radar-description">
            <p>Analysis of competitive market factors beyond price points</p>
          </div>
        </div>
      </div>
      
      <!-- Value-to-Rarity Curve -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h4>Value-to-Rarity Relationship</h4>
        </div>
        <div class="chart-content">
          <div class="value-rarity-container">
            <canvas id="valueRarityCurve-<?php echo uniqid(); ?>" height="250"></canvas>
          </div>
          <div class="curve-description">
            <p>Shows whether the item is appropriately valued given its rarity</p>
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
            <button class="filter-btn" data-filter="high">High Relevance</button>
            <button class="filter-btn" data-filter="medium">Medium Relevance</button>
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn">More Filters</button>
              <div class="filter-dropdown-content">
                <div class="filter-option">
                  <label for="priceRange">Price Range</label>
                  <div class="range-slider">
                    <input type="range" min="0" max="100" value="100" id="priceRange">
                  </div>
                </div>
                <div class="filter-option">
                  <label for="dateRange">Date Range</label>
                  <select id="dateRange">
                    <option value="all">All Time</option>
                    <option value="year">Past Year</option>
                    <option value="6months">Past 6 Months</option>
                  </select>
                </div>
                <div class="filter-option">
                  <label for="auctionHouse">Auction House</label>
                  <select id="auctionHouse">
                    <option value="all">All Houses</option>
                    <option value="sothebys">Sotheby's</option>
                    <option value="christies">Christie's</option>
                    <option value="phillips">Phillips</option>
                    <option value="bonhams">Bonhams</option>
                  </select>
                </div>
                <div class="filter-option">
                  <label for="relevanceFilter">Relevance</label>
                  <select id="relevanceFilter">
                    <option value="all">All Levels</option>
                    <option value="veryHigh">Very High</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="broad">Broad</option>
                  </select>
                </div>
              </div>
            </div>
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
              <th class="sortable" data-sort="relevance">Relevance <span class="sort-icon">↕</span></th>
              <th class="sortable" data-sort="adjustment">Adjustment <span class="sort-icon">↕</span></th>
            </tr>
          </thead>
          <tbody>
            <?php echo $sales_html; ?>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="table-pagination">
          <button class="pagination-btn" disabled>Previous</button>
          <span class="pagination-info">Showing 1-5 of <?php echo $count; ?></span>
          <button class="pagination-btn" disabled>Next</button>
        </div>
        <div class="export-options">
          <button class="export-btn" data-format="csv">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
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

/* Price History Styles */
.price-chart-wrapper {
  width: 100%;
  height: 300px;
}

.price-chart-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.price-trend-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.price-trend-badge.positive {
  background-color: rgba(56, 161, 105, 0.1);
  color: #38A169;
}

.price-trend-badge.negative {
  background-color: rgba(229, 62, 62, 0.1);
  color: #E53E3E;
}

/* Price Highlights */
.price-highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.highlight-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: all 0.3s ease;
  text-align: center;
}

.highlight-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateY(-3px);
}

.highlight-header {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4A5568;
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
  font-size: 0.8rem;
  color: #718096;
  font-weight: normal;
}

/* Stats Section Styles */
.shadcn-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.4s ease;
  font-family: "Inter", sans-serif;
  opacity: 0.8;
  transform: translateY(10px);
}

.shadcn-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.shadcn-card.highlighted {
  border-left: 4px solid #3182CE;
  padding-left: 1rem;
}

.metric-values {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-value-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  border-bottom: 1px solid #EDF2F7;
}

.metric-value-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 0.875rem;
  color: #4A5568;
  font-weight: 500;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1A202C;
}

.badge {
  display: inline-block;
  background: rgba(49, 130, 206, 0.1);
  color: #3182CE;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.secondary {
  background: rgba(99, 102, 241, 0.1);
  color: #4F46E5;
}

.trend-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.trend-badge.positive {
  background-color: rgba(56, 161, 105, 0.1);
  color: #38A169;
}

.trend-badge.negative {
  background-color: rgba(229, 62, 62, 0.1);
  color: #E53E3E;
}

/* Price range display */
.price-range-display {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.price-range-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1A202C;
  text-align: center;
}

.price-range-bar {
  height: 8px;
  position: relative;
  margin: 0.5rem 0.25rem;
}

.range-track {
  position: absolute;
  height: 4px;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #EDF2F7;
  border-radius: 2px;
}

.range-fill {
  position: absolute;
  height: 4px;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #3182CE;
  border-radius: 2px;
}

.range-thumb {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3182CE;
  border: 2px solid white;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.range-thumb.min {
  left: 0;
}

.range-thumb.max {
  left: 100%;
}

.target-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #E53E3E;
  border: 2px solid white;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* Percentile display */
.percentile-display {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.percentile-value {
  font-size: 2rem;
  font-weight: 800;
  color: #1A202C;
  text-align: center;
}

.percentile-bar {
  height: 8px;
  background: #EDF2F7;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.percentile-fill {
  height: 100%;
  background: #3182CE;
  border-radius: 4px;
  width: 0%; /* Start from 0 and animate to the correct width */
  animation: percentileFill 1.2s ease-out forwards;
}

@keyframes percentileFill {
  from { width: 0%; }
  to { width: var(--percentile-width, 70%); }
}

/* Confidence display */
.confidence-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.confidence-indicator {
  display: flex;
  gap: 4px;
}

.confidence-indicator .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38A169;
  transition: all 0.2s ease;
}

.confidence-indicator .dot.inactive {
  background: #E2E8F0;
}

.confidence-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1A202C;
}

.confidence-indicator.high .dot:not(.inactive) {
  background: #38A169;
}

.confidence-indicator.medium .dot:not(.inactive),
.confidence-indicator.moderate .dot:not(.inactive) {
  background: #ECC94B;
}

.confidence-indicator.low .dot:not(.inactive) {
  background: #E53E3E;
}

/* Modern Chart Styles */
.modern-chart-container {
  height: 280px;
  position: relative;
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  opacity: 0.8;
  transform: translateY(10px);
  transition: all 0.5s ease-out;
}

.modern-chart-container.animated,
.metric-card.animated {
  opacity: 1;
  transform: translateY(0);
}

.modern-chart-bars {
  display: flex;
  height: 220px;
  align-items: flex-end;
  gap: 0.75rem;
  position: relative;
  padding: 0 0.5rem;
  border-left: 1px solid #E2E8F0;
  border-bottom: 1px solid #E2E8F0;
  margin-bottom: 30px; /* Space for axis labels */
}

.modern-bar-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
}

.modern-bar {
  width: 75%;
  background: #3182CE;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s ease;
  min-height: 5px; /* Ensure bars have a minimum height */
  animation: barGrow 1s forwards;
  transform-origin: bottom;
}

@keyframes barGrow {
  0% { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}

.modern-bar.highlighted {
  background: #E53E3E;
}

.modern-bar:hover {
  opacity: 0.85;
  transform: scaleY(1.03);
}

.bar-tooltip {
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 32, 44, 0.95);
  color: white;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  text-align: center;
  z-index: 10;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(26, 32, 44, 0.95);
}

.modern-bar-wrap:hover .bar-tooltip {
  opacity: 1;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0.5rem 0;
  font-size: 0.85rem;
  color: #718096;
}

.your-value-marker {
  position: absolute;
  bottom: 30px;
  height: 220px;
  z-index: 5;
}

.marker-line {
  position: absolute;
  height: 190px;
  width: 2px;
  background: rgba(229, 62, 62, 0.75);
  bottom: 0;
  left: 0;
}

.marker-label {
  position: absolute;
  top: -25px;
  left: -30px;
  background: #E53E3E;
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  font-weight: 500;
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
  color: #4A5568;
}

.sales-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #EDF2F7;
}

.sales-table tr:last-child td {
  border-bottom: none;
}

.sales-table .highlight-row {
  background: rgba(49, 130, 206, 0.05);
}

.sales-table .highlight-row td {
  font-weight: 600;
}

.item-cell {
  display: flex;
  align-items: center;
}

.item-name {
  font-weight: 500;
}

.price-cell {
  font-weight: 600;
  color: #1A202C;
}

.diff-cell {
  font-weight: 500;
}

.diff-cell.positive {
  color: #38A169;
}

.diff-cell.negative {
  color: #E53E3E;
}

/* Time filter */
.time-filter {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  background: rgba(226, 232, 240, 0.5);
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #4A5568;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #E2E8F0;
}

.filter-btn.active {
  background: rgba(49, 130, 206, 0.1);
  color: #3182CE;
}

/* Market Position Gauge */
.market-position-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.market-gauge-wrapper {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.gauge-container {
  width: 300px;
  position: relative;
  text-align: center;
}

.gauge {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.gauge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #EDF2F7;
  border-radius: 160px 160px 0 0;
}

.gauge-fill {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: conic-gradient(
    #38A169 0%, 
    #3182CE 30%, 
    #805AD5 60%, 
    #E53E3E 100%
  );
  border-radius: 160px 160px 0 0;
  clip-path: path('M 0,160 A 160,160 0 1,1 320,160 L 160,160 Z');
  transform-origin: bottom center;
  transform: rotate(calc((var(--percentage, 50) / 100 * 180) * 1deg));
  transition: transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gauge-center {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  z-index: 2;
}

.gauge-needle {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 3px;
  height: 140px;
  background: #4A5568;
  transform-origin: bottom center;
  transform: translateX(-50%) rotate(var(--rotation, 90deg));
  z-index: 1;
  transition: transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gauge-needle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: #4A5568;
  border-radius: 50%;
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: 0 0.5rem;
}

.gauge-label {
  font-size: 0.75rem;
  color: #718096;
  flex: 1;
  text-align: center;
}

.gauge-label.low {
  text-align: left;
}

.gauge-label.premium {
  text-align: right;
}

.gauge-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.75rem;
}

.gauge-description {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 0.25rem;
}

.market-position-highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 1rem;
}

.position-highlight-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #E2E8F0;
  transition: all 0.3s ease;
}

.position-highlight-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.highlight-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(49, 130, 206, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  color: #3182CE;
}

.position-highlight-card h5 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #4A5568;
}

.position-highlight-card p {
  font-size: 0.8125rem;
  color: #718096;
  margin: 0.5rem 0 0;
}

.position-highlight-card .highlight-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.position-highlight-card .highlight-value.positive {
  color: #38A169;
}

.position-highlight-card .highlight-value.negative {
  color: #E53E3E;
}

/* Time-Based Value Map */
.time-value-map-container {
  width: 100%;
  height: 280px;
}

.value-map-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 1rem;
}

.value-projection-badge {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.value-projection-badge span {
  font-weight: 600;
}

.value-projection-badge span.positive {
  color: #38A169;
}

.value-projection-badge span.negative {
  color: #E53E3E;
}

/* Market Analysis Grid */
.market-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.distribution-card,
.component-card {
  height: 100%;
}

.value-components-container {
  width: 100%;
  height: 250px;
}

.components-description {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #718096;
}

/* Investment Rating */
.investment-rating-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
}

.investment-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.rating-value {
  font-size: 2rem;
  font-weight: 800;
  color: #1A202C;
}

.rating-label {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 0.25rem;
}

.investment-scale {
  width: 100%;
  height: 8px;
  background: #EDF2F7;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.scale-bar {
  height: 100%;
  width: var(--fill-width, 0%);
  background: linear-gradient(to right, #3182CE, #805AD5);
  border-radius: 4px;
  transition: width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Advanced Data Table */
.advanced-data-table-card {
  margin-top: 2rem;
}

.data-table-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-filter {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #3182CE;
  box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.1);
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-dropdown {
  position: relative;
}

.filter-dropdown-btn {
  background: rgba(226, 232, 240, 0.5);
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #4A5568;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.filter-dropdown-btn:hover {
  background: #E2E8F0;
}

.filter-dropdown-content {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 1rem;
  width: 250px;
  z-index: 10;
  display: none;
}

.filter-dropdown:hover .filter-dropdown-content {
  display: block;
}

.filter-option {
  margin-bottom: 1rem;
}

.filter-option:last-child {
  margin-bottom: 0;
}

.filter-option label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #4A5568;
}

.range-slider {
  width: 100%;
}

.range-slider input {
  width: 100%;
}

.filter-option select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  background-color: white;
  outline: none;
}

.advanced-table th.sortable {
  cursor: pointer;
  position: relative;
}

.sort-icon {
  font-size: 0.75rem;
  margin-left: 0.25rem;
  opacity: 0.5;
}

.sortable:hover .sort-icon {
  opacity: 1;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #EDF2F7;
}

.table-pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pagination-btn {
  background: rgba(226, 232, 240, 0.5);
  border: none;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #4A5568;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #E2E8F0;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: #718096;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(49, 130, 206, 0.1);
  border: none;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #3182CE;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: rgba(49, 130, 206, 0.2);
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .price-highlights {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .market-position-highlights {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .market-analysis-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .chart-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .chart-controls {
    margin-top: 0.5rem;
  }
  
  .price-highlights {
    grid-template-columns: repeat(1, 1fr);
  }
  
  .radar-wrapper {
    height: 350px;
  }
  
  .market-position-highlights {
    grid-template-columns: repeat(1, 1fr);
  }
  
  .data-table-controls {
    flex-direction: column;
  }
}

@media (max-width: 576px) {
  .metrics-grid,
  .stats-metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Register the annotation plugin
  if (typeof Chart.register === 'function' && typeof ChartAnnotation !== 'undefined') {
    Chart.register(ChartAnnotation);
  }
  <?php if ($show_radar): ?>
  // Initialize radar chart
  const radarCtx = document.getElementById('<?php echo $radar_chart_id; ?>').getContext('2d');
  
  // Data for radar chart
  const radarData = {
    labels: [
      'Condition', 
      'Rarity',
      'Market Demand',
      'Historical Significance',
      'Investment Potential',
      'Provenance Strength'
    ],
    datasets: [{
      label: 'Item Metrics',
      data: [
        <?php echo $condition_score; ?>,
        <?php echo $rarity_score; ?>,
        <?php echo $market_demand; ?>,
        <?php echo $historical_significance; ?>,
        <?php echo $investment_potential; ?>,
        <?php echo $provenance_strength; ?>
      ],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgb(54, 162, 235)',
      pointBackgroundColor: 'rgb(54, 162, 235)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(54, 162, 235)',
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
  
  // Config for radar chart
  const radarConfig = {
    type: 'radar',
    data: radarData,
    options: {
      elements: {
        line: {
          borderWidth: 3
        }
      },
      scales: {
        r: {
          angleLines: { 
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
          },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { 
            stepSize: 20,
            backdropColor: 'rgba(0, 0, 0, 0)',
            color: '#718096',
            font: {
              size: 10
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          pointLabels: {
            color: '#4A5568',
            font: {
              size: 12,
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed + '%';
            }
          }
        }
      },
      animation: {
        duration: 1500
      }
    }
  };
  
  // Create radar chart
  new Chart(radarCtx, radarConfig);
  <?php endif; ?>
  
  <?php if ($show_history): ?>
  // Initialize price history chart
  const priceCtx = document.getElementById('<?php echo $price_chart_id; ?>').getContext('2d');
  
  // Format years and prices for chart
  const years = <?php echo json_encode($years); ?>;
  const prices = <?php echo json_encode($prices); ?>;
  const indices = <?php echo json_encode($indices); ?>;
  const hasIndices = <?php echo json_encode($has_indices); ?>;
  const currentPrice = <?php echo $current_price; ?>;
  
  // Calculate year after last data point for prediction
  const lastYear = years[years.length - 1];
  const nextYear = String(parseInt(lastYear) + 1);
  
  // Calculate predicted price based on trend
  const trend = <?php echo floatval(str_replace(['%', '+', '-'], '', $price_trend)) / 100; ?>;
  const predictedPrice = currentPrice * (1 + trend);
  
  // Datasets configuration
  const datasets = [
    {
      label: 'Comparable Items',
      data: [...prices],
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ];
  
  // Add market index if available
  if (hasIndices) {
    datasets.push({
      label: 'Market Index',
      data: indices,
      backgroundColor: 'rgba(153, 102, 255, 0.2)',
      borderColor: 'rgb(153, 102, 255)',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1,
      pointRadius: 3,
      pointHoverRadius: 5,
      yAxisID: 'y1'
    });
  }
  
  // Add current item value and prediction
  datasets.push({
    label: 'Your Item',
    data: Array(years.length - 1).fill(null).concat([currentPrice, predictedPrice]),
    backgroundColor: 'rgba(255, 99, 132, 0.2)',
    borderColor: 'rgb(255, 99, 132)',
    borderWidth: 2,
    borderDash: [3, 3],
    tension: 0.1,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointStyle: 'rectRot',
    pointBackgroundColor: 'rgb(255, 99, 132)'
  });
  
  // Chart configuration
  const priceConfig = {
    type: 'line',
    data: {
      labels: [...years, nextYear],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 1 && hasIndices) {
                  label += 'Index ' + context.parsed.y.toLocaleString();
                } else {
                  label += '$' + context.parsed.y.toLocaleString();
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#718096'
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            },
            color: '#718096'
          }
        }
      }
    }
  };
  
  // Add secondary y-axis for market index if needed
  if (hasIndices) {
    priceConfig.options.scales.y1 = {
      type: 'linear',
      display: true,
      position: 'right',
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        callback: function(value) {
          return value.toLocaleString();
        },
        color: '#A78BFA'
      },
      title: {
        display: true,
        text: 'Market Index',
        color: '#A78BFA'
      }
    };
  }
  
  // Create price history chart
  new Chart(priceCtx, priceConfig);
  <?php endif; ?>
  
  <?php if ($show_stats): ?>
  // Add intersection observer to trigger animations when elements become visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  // Observe chart containers and metric cards
  document.querySelectorAll('.modern-chart-container, .shadcn-card, .market-position-container, .time-value-map-container, .value-components-container').forEach(el => {
    observer.observe(el);
  });
  
  // Add event listeners for filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.chart-card');
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Staggered animation for bars
  const bars = document.querySelectorAll('.modern-bar');
  bars.forEach((bar, index) => {
    bar.style.animationDelay = (index * 0.1) + 's';
  });
  
  // Initialize Time-Based Value Map
  const timeValueMapContainers = document.querySelectorAll('.time-value-map-container');
  timeValueMapContainers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Get actual data from PHP
    const years = <?php echo json_encode($years); ?>;
    const prices = <?php echo json_encode($prices); ?>;
    const currentPrice = <?php echo $current_price; ?>;
    const trend = <?php echo floatval(str_replace(['%', '+', '-'], '', $price_trend)) / 100; ?>;
    
    // Calculate future projections (3 years)
    const lastYear = parseInt(years[years.length - 1]);
    const futureYears = [lastYear + 1, lastYear + 3, lastYear + 5];
    const futureData = futureYears.map((year, index) => {
      const projectionYears = index + 1;
      return currentPrice * Math.pow(1 + trend, projectionYears);
    });
    
    // Create a custom point style for current item
    const pointStyle = {
      id: 'customPoint',
      beforeDraw: (chart) => {
        const { ctx } = chart;
        const yourItemData = chart.data.datasets[1];
        const meta = chart.getDatasetMeta(1);
        const currentPoint = meta.data[0];
        
        if (currentPoint && !isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
          ctx.save();
          
          // Draw a star or custom marker for the current item
          ctx.fillStyle = '#E53E3E';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          
          const x = currentPoint.x;
          const y = currentPoint.y;
          const radius = 8;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.restore();
        }
      }
    };
    
    // Chart configuration
    const timeValueMapConfig = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Comparable Items',
            data: years.map((year, index) => ({
              x: year,
              y: prices[index]
            })),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 8
          },
          {
            label: 'Your Item',
            data: [{
              x: lastYear,
              y: currentPrice
            }],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointStyle: 'rectRot'
          },
          {
            label: 'Future Projections',
            data: futureYears.map((year, index) => ({
              x: year,
              y: futureData[index]
            })),
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointStyle: 'triangle'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += '$' + Math.round(context.parsed.y).toLocaleString();
                return label;
              },
              title: function(context) {
                return 'Year: ' + context[0].label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Year'
            },
            ticks: {
              callback: function(value) {
                return value; // Display year as is
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Value (USD)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      },
      plugins: [pointStyle]
    };
    
    new Chart(ctx, timeValueMapConfig);
  });
  
  // Initialize Value Component Breakdown chart
  const valueComponentsContainers = document.querySelectorAll('.value-components-container');
  valueComponentsContainers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Component values based on the metrics we already have
    const componentData = [
      {
        label: 'Condition',
        value: <?php echo $condition_score; ?>,
        color: 'rgba(66, 153, 225, 0.8)'
      },
      {
        label: 'Rarity',
        value: <?php echo $rarity_score; ?>,
        color: 'rgba(49, 151, 149, 0.8)'
      },
      {
        label: 'Market Demand',
        value: <?php echo $market_demand; ?>,
        color: 'rgba(213, 63, 140, 0.8)'
      },
      {
        label: 'Provenance',
        value: <?php echo $provenance_strength; ?>,
        color: 'rgba(154, 230, 180, 0.8)'
      },
      {
        label: 'Historical Significance',
        value: <?php echo $historical_significance; ?>,
        color: 'rgba(236, 201, 75, 0.8)'
      }
    ];
    
    // Calculate proportions based on the component values
    const total = componentData.reduce((sum, item) => sum + item.value, 0);
    const valuePercentages = componentData.map(item => {
      return {
        ...item,
        percentage: (item.value / total) * 100
      };
    });
    
    // Sort by value (highest first)
    valuePercentages.sort((a, b) => b.value - a.value);
    
    // Chart configuration
    const componentChartConfig = {
      type: 'doughnut',
      data: {
        labels: valuePercentages.map(item => item.label),
        datasets: [{
          data: valuePercentages.map(item => item.percentage),
          backgroundColor: valuePercentages.map(item => item.color),
          borderColor: 'white',
          borderWidth: 2,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 15,
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    
                    return {
                      text: `${label}: ${valuePercentages[i].value}%`,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden: !chart.getDataVisibility(i),
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const item = valuePercentages[context.dataIndex];
                return `${item.label}: ${item.value}% contribution`;
              }
            }
          }
        },
        cutout: '60%'
      }
    };
    
    new Chart(ctx, componentChartConfig);
  });
  
  // Handle sortable columns in the advanced data table
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const table = header.closest('table');
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const sortKey = header.dataset.sort;
      const isCurrentlySorted = header.classList.contains('sorted');
      const sortDirection = isCurrentlySorted && header.classList.contains('sort-asc') ? 'desc' : 'asc';
      
      // Update header styling
      table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted', 'sort-asc', 'sort-desc');
      });
      
      header.classList.add('sorted', `sort-${sortDirection}`);
      
      // Sort the rows
      rows.sort((a, b) => {
        let aValue = a.querySelector(`td:nth-child(${header.cellIndex + 1})`).textContent;
        let bValue = b.querySelector(`td:nth-child(${header.cellIndex + 1})`).textContent;
        
        // Handle special cases like pricing or dates
        if (sortKey === 'price' || sortKey === 'diff') {
          aValue = parseFloat(aValue.replace(/[$,%]/g, '')) || 0;
          bValue = parseFloat(bValue.replace(/[$,%]/g, '')) || 0;
        } else if (sortKey === 'date') {
          aValue = new Date(aValue).getTime() || 0;
          bValue = new Date(bValue).getTime() || 0;
        }
        
        // Compare values
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Reorder the table rows
      const tbody = table.querySelector('tbody');
      rows.forEach(row => tbody.appendChild(row));
    });
  });
  
  // Initialize search functionality
  const searchInput = document.getElementById('searchResults');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const table = searchInput.closest('.chart-card').querySelector('table');
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const itemName = row.querySelector('.item-name').textContent.toLowerCase();
        const house = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        
        if (itemName.includes(searchTerm) || house.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }
  
  // Filter buttons functionality
  const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filterValue = button.getAttribute('data-filter');
      const table = button.closest('.chart-card').querySelector('table');
      const rows = table.querySelectorAll('tbody tr');
      
      if (filterValue === 'all') {
        rows.forEach(row => row.style.display = '');
      } else if (filterValue === 'high') {
        rows.forEach(row => {
          // Show only items with positive difference
          const diffCell = row.querySelector('.diff-cell');
          if (diffCell && diffCell.classList.contains('positive')) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      } else if (filterValue === 'medium') {
        rows.forEach(row => {
          // Show only items with minimal difference
          const diffCell = row.querySelector('.diff-cell');
          const diffText = diffCell ? diffCell.textContent.trim() : '';
          const diffValue = parseFloat(diffText.replace(/[^-0-9.]/g, '')) || 0;
          
          if (Math.abs(diffValue) < 10) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }
    });
  });
  
  // Initialize Market Competition Radar Chart
  const competitionRadarContainers = document.querySelectorAll('.competition-radar-container');
  competitionRadarContainers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Market competition factors
    const competitionData = {
      labels: [
        'Current Supply', 
        'Demand Trend',
        'Price Stability',
        'Auction Frequency',
        'Collection Popularity',
        'Geographic Spread'
      ],
      datasets: [{
        label: 'Market Average',
        data: [65, 70, 60, 75, 68, 72],
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(153, 102, 255, 1)',
        pointBorderColor: '#fff',
        pointRadius: 4
      }, {
        label: 'Your Item',
        data: [
          80, // Current supply
          <?php echo $market_demand; ?>, // Demand trend
          <?php echo $is_trend_positive ? 85 : 55; ?>, // Price stability
          70, // Auction frequency
          <?php echo $historical_significance; ?>, // Collection popularity
          60  // Geographic spread
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointRadius: 4
      }]
    };
    
    const competitionRadarConfig = {
      type: 'radar',
      data: competitionData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { 
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
            },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { 
              stepSize: 25,
              backdropColor: 'rgba(0, 0, 0, 0)',
              color: '#718096',
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            pointLabels: {
              color: '#4A5568',
              font: {
                size: 11,
                weight: '500'
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.r !== null) {
                  label += context.parsed.r + '%';
                }
                return label;
              }
            }
          }
        },
        animation: {
          duration: 1500
        }
      }
    };
    
    new Chart(ctx, competitionRadarConfig);
  });
  
  // Initialize Value-to-Rarity Curve Chart
  const valueRarityContainers = document.querySelectorAll('.value-rarity-container');
  valueRarityContainers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Generate curve data points
    const generateCurvePoints = () => {
      const points = [];
      for (let i = 0; i <= 100; i += 5) {
        // Exponential curve formula: y = a * e^(b*x)
        // Where higher rarity (x) leads to higher value (y)
        const rarity = i;
        const value = 1000 + 4000 * Math.pow(rarity/100, 2);
        points.push({x: rarity, y: value});
      }
      return points;
    };
    
    // Create comparable items data
    const comparables = [
      {rarity: 55, value: 4800},
      {rarity: 70, value: 5500},
      {rarity: 45, value: 4200},
      {rarity: 60, value: 5100},
      {rarity: 40, value: 3900}
    ];
    
    // Current item rarity and value
    const currentRarity = <?php echo $rarity_score; ?>;
    const currentValue = <?php echo $raw_value; ?>;
    
    const valueRarityConfig = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Market Curve',
            data: generateCurvePoints(),
            showLine: true,
            borderColor: 'rgba(75, 192, 192, 0.7)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: 'Comparable Items',
            data: comparables.map(item => ({x: item.rarity, y: item.value})),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Your Item',
            data: [{x: currentRarity, y: currentValue}],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointStyle: 'rectRot'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Rarity (%)',
              color: '#4A5568',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#718096'
            }
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: 'Value ($)',
              color: '#4A5568',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              },
              color: '#718096'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const datasetLabel = context.dataset.label || '';
                const rarity = context.parsed.x;
                const value = context.parsed.y;
                return `${datasetLabel}: Rarity ${rarity}%, Value $${value.toLocaleString()}`;
              }
            }
          },
          annotation: {
            annotations: {
              undervalued: {
                type: 'box',
                xMin: 60,
                xMax: 100,
                yMin: 0,
                yMax: 5000,
                backgroundColor: 'rgba(56, 161, 105, 0.1)',
                borderColor: 'rgba(56, 161, 105, 0.5)',
                borderWidth: 1,
                label: {
                  display: true,
                  content: 'Undervalued Zone',
                  position: 'center',
                  color: 'rgba(56, 161, 105, 0.8)',
                  font: {
                    size: 12
                  }
                }
              },
              overvalued: {
                type: 'box',
                xMin: 0,
                xMax: 40,
                yMin: 5000,
                yMax: 8000,
                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                borderColor: 'rgba(229, 62, 62, 0.5)',
                borderWidth: 1,
                label: {
                  display: true,
                  content: 'Overvalued Zone',
                  position: 'center',
                  color: 'rgba(229, 62, 62, 0.8)',
                  font: {
                    size: 12
                  }
                }
              }
            }
          }
        }
      }
    };
    
    new Chart(ctx, valueRarityConfig);
  });
  
  // Initialize relevance filtering
  const relevanceFilter = document.getElementById('relevanceFilter');
  if (relevanceFilter) {
    relevanceFilter.addEventListener('change', () => {
      const selectedRelevance = relevanceFilter.value;
      const table = relevanceFilter.closest('.chart-card').querySelector('table');
      const rows = table.querySelectorAll('tbody tr');
      
      if (selectedRelevance === 'all') {
        rows.forEach(row => row.style.display = '');
      } else {
        rows.forEach(row => {
          const relevanceCell = row.querySelector('td:nth-child(6)');
          const relevanceText = relevanceCell ? relevanceCell.textContent.trim().toLowerCase() : '';
          
          if (relevanceText.includes(selectedRelevance.toLowerCase())) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }
    });
  }
  <?php endif; ?>
});
</script>
<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}
add_shortcode('display_enhanced_analytics', 'display_enhanced_analytics_shortcode');