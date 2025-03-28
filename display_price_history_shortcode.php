<?php
/**
 * Snippet Name: Display Price History Chart Shortcode
 * Description: Modern line chart visualization for price history data
 * Snippet Type: Shortcode
 */

function display_price_history_shortcode($atts) {
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
    return '<div class="no-stats-message">Price history data is not available for this item.</div>';
  }
  
  // Parse statistics data to extract key metrics
  $stats = json_decode($statistics_data, true);
  
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
  
  // Current item price and trend
  $current_price = get_field('value') ? intval(get_field('value')) : 6800;
  $price_trend = isset($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '+5.2%';
  $is_trend_positive = strpos($price_trend, '+') !== false;
  
  // Generate a unique ID for this chart instance
  $chart_id = 'price-chart-' . uniqid();
  
  // Start output buffering to capture HTML
  ob_start();
?>
<div class="price-history-container">
  <div class="chart-header">
    <h3>Price History Analysis</h3>
    <p class="chart-description">Historical price trends for comparable items</p>
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
        <canvas id="<?php echo $chart_id; ?>" height="300"></canvas>
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

<style>
/* Price History Chart Styles */
.price-history-container {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  color: #1A202C;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
  max-width: 100%;
  margin-bottom: 3rem;
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

.chart-content {
  padding: 1.5rem;
  min-height: 250px;
}

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

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  font-size: 0.85rem;
  color: #4A5568;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .price-highlights {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const ctx = document.getElementById('<?php echo $chart_id; ?>').getContext('2d');
  
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
  const config = {
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
    config.options.scales.y1 = {
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
  
  // Create chart
  new Chart(ctx, config);
});
</script>
<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}
add_shortcode('display_price_history', 'display_price_history_shortcode');