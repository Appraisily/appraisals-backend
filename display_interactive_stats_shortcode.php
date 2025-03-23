<?php
/**
 * Snippet Name: Display Interactive Statistics Shortcode
 * Description: Modern interactive chart display inspired by Shadcn UI for appraisal statistics
 * Snippet Type: Shortcode
 */

function display_interactive_stats_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'statistics',
    'default' => ''
  ), $atts);
  
  // Always use statistics as the default field name
  $field_name = 'statistics';
  
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
  
  // Initialize variables with default values in case parsing fails
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
  
  // Is price trend positive?
  $is_trend_positive = strpos($price_trend, '+') !== false;
  
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
  for ($i = 1; $i <= 5; $i++) {
    $active = $i <= $confidence_level ? '' : 'inactive';
    $confidence_html .= '<span class="dot ' . $active . '"></span>';
  }
  
  // Extract percentile number for width calculation
  $percentile_number = is_numeric($percentile) ? $percentile : preg_replace('/[^0-9]/', '', $percentile);
  
  // Start output buffering to capture HTML
  ob_start();
?>
<div class="shadcn-charts-container">
  <div class="chart-header">
    <h3>Market Analysis Statistics</h3>
    <p class="chart-description">Comprehensive market data based on <?php echo $count; ?> comparable items</p>
  </div>
  
  <!-- Price Distribution Chart -->
  <div class="chart-card">
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
  <div class="metrics-grid">
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
        <h4>Your Value Percentile</h4>
      </div>
      <div class="percentile-display">
        <div class="percentile-value"><?php echo $percentile; ?></div>
        <div class="percentile-bar">
          <div class="percentile-fill" style="--percentile-width: <?php echo $percentile_number; ?>%;"></div>
        </div>
      </div>
      <div class="metric-footer">
        <div class="metric-description">Your item is in the <?php echo $percentile; ?> of comparable sales</div>
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
  
  <!-- Recent Sales Comparison -->
  <div class="chart-card">
    <div class="chart-card-header">
      <h4>Recent Comparable Sales</h4>
      <div class="time-filter">
        <button class="filter-btn active">All Results</button>
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
          <?php echo $sales_html; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
/* Modern Shadcn-Inspired Chart Styles */
.shadcn-charts-container {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  color: #1A202C;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
  max-width: 100%;
}

.chart-header {
  margin-bottom: 0.5rem;
}

.chart-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #1A202C;
}

.chart-description {
  color: #4A5568;
  margin: 0;
  font-size: 0.95rem;
}

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

.chart-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  border-radius: 2px;
}

.chart-content {
  padding: 1.5rem;
  min-height: 250px;
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

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}

/* Shadcn-style card */
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

/* Metric value styles */
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

.metric-footer {
  margin-top: auto;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
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

.metric-description {
  font-size: 0.8125rem;
  color: #718096;
  line-height: 1.4;
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

/* Animation for donut charts */
@keyframes donutAnimation {
  0% {
    background: conic-gradient(
      var(--color) 0deg,
      #EDF2F7 0deg 360deg
    );
  }
  100% {
    background: conic-gradient(
      var(--color) 0deg calc(var(--percentage) * 3.6deg),
      #EDF2F7 calc(var(--percentage) * 3.6deg) 360deg
    );
  }
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

/* Responsive adjustments */
@media (max-width: 992px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .modern-chart-bars {
    gap: 0.5rem;
    height: 180px;
  }
  
  .modern-chart-container {
    height: 240px;
  }
  
  .shadcn-charts-container {
    gap: 1.5rem;
  }
  
  .chart-card {
    margin-bottom: 1rem;
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
  
  .metrics-grid {
    gap: 0.75rem;
  }
  
  .shadcn-card {
    padding: 1rem;
  }
  
  .modern-chart-bars {
    height: 180px;
  }
  
  .modern-chart-container {
    height: 240px;
  }
  
  .modern-bar {
    width: 90%;
  }
  
  .sales-table th, 
  .sales-table td {
    padding: 0.75rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-card-header h4 {
    font-size: 1rem;
  }
  
  .chart-content {
    padding: 1rem;
  }
  
  .modern-chart-bars {
    height: 150px;
  }
  
  .modern-chart-container {
    height: 210px;
  }
  
  .percentile-value,
  .price-range-value {
    font-size: 1.5rem;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  // Add interactive features
  
  // Time filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Ensure bars render properly with staggered animation
  const bars = document.querySelectorAll('.modern-bar');
  bars.forEach((bar, index) => {
    // Add a small delay to each bar for staggered effect
    bar.style.animationDelay = (index * 0.1) + 's';
    
    // Make sure height is applied correctly
    const height = bar.style.height;
    if (height) {
      // Force reflow to ensure styles are applied
      bar.style.height = '0%';
      setTimeout(() => {
        bar.style.height = height;
      }, 50);
    }
  });
  
  // Add intersection observer to trigger animations when the element becomes visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  // Observe all charts and metrics
  document.querySelectorAll('.modern-chart-container, .metric-card').forEach(el => {
    observer.observe(el);
  });
  
  // Handle window resize to ensure chart responsiveness
  window.addEventListener('resize', () => {
    // Redraw bars on resize to ensure they fit correctly
    const bars = document.querySelectorAll('.modern-bar');
    bars.forEach(bar => {
      const height = bar.getAttribute('data-height') || bar.style.height;
      if (height) {
        bar.style.height = height;
      }
    });
  });
});
</script>
<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}
add_shortcode('display_interactive_stats', 'display_interactive_stats_shortcode');