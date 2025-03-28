<?php
/**
 * Snippet Name: Display Compact Analytics Shortcode
 * Description: Compact radar chart visualization for the summary panel
 * Snippet Type: Shortcode
 */

function display_compact_analytics_shortcode($atts) {
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
  
  // Stats for display
  $avg_price = isset($stats['average_price']) ? '$' . number_format($stats['average_price']) : '$4,250';
  $price_trend = isset($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '+5.2%';
  $percentile = isset($stats['percentile']) ? $stats['percentile'] : '68th';
  $confidence = isset($stats['confidence_level']) ? $stats['confidence_level'] : 'High';
  $count = isset($stats['count']) ? $stats['count'] : 5;
  
  // Generate a unique ID for the chart
  $chart_id = 'compact-radar-' . uniqid();
  
  // Is price trend positive?
  $is_trend_positive = strpos($price_trend, '+') !== false;
  
  // Start output buffering to capture HTML
  ob_start();
?>
<div class="compact-analytics-container">
  <div class="compact-analytics-title">Market Position Analysis</div>
  
  <div class="compact-analytics-content">
    <div class="radar-container">
      <canvas id="<?php echo $chart_id; ?>" width="200" height="200"></canvas>
    </div>
    
    <div class="key-metrics">
      <div class="metric">
        <div class="metric-label">Market Position</div>
        <div class="metric-value"><?php echo $percentile; ?> Percentile</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Average Price</div>
        <div class="metric-value"><?php echo $avg_price; ?></div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Price Trend</div>
        <div class="metric-value <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>"><?php echo $price_trend; ?></div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Comparables</div>
        <div class="metric-value"><?php echo $count; ?> Items</div>
      </div>
    </div>
  </div>
  
  <div class="compact-analytics-footer">
    <button class="view-details-btn" onclick="scrollToSection('market-research')">View Complete Analysis</button>
  </div>
</div>

<style>
/* Compact Analytics Styles */
.compact-analytics-container {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
  border: 1px solid #E2E8F0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  margin: 1rem 0;
}

.compact-analytics-title {
  padding: 1rem;
  background: linear-gradient(135deg, #3182CE, #2C5282);
  color: white;
  font-weight: 600;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.compact-analytics-content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
  padding: 1rem;
}

.radar-container {
  width: 200px;
  height: 200px;
  position: relative;
}

.key-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
}

.metric {
  padding: 0.5rem;
  background: #F7FAFC;
  border-radius: 6px;
  transition: all 0.2s;
}

.metric:hover {
  background: #EBF8FF;
}

.metric-label {
  font-size: 0.8rem;
  color: #4A5568;
  margin-bottom: 0.3rem;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2D3748;
}

.metric-value.positive {
  color: #38A169;
}

.metric-value.negative {
  color: #E53E3E;
}

.compact-analytics-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #E2E8F0;
  text-align: right;
  background: #F7FAFC;
}

.view-details-btn {
  background: rgba(49, 130, 206, 0.1);
  color: #3182CE;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.view-details-btn:hover {
  background: rgba(49, 130, 206, 0.2);
  transform: translateY(-1px);
}

@media (max-width: 576px) {
  .compact-analytics-content {
    grid-template-columns: 1fr;
  }
  
  .radar-container {
    margin: 0 auto;
  }
  
  .key-metrics {
    margin-top: 0.5rem;
  }
}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const ctx = document.getElementById('<?php echo $chart_id; ?>').getContext('2d');
  
  // Create radar chart
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'Condition', 'Rarity', 'Demand',
        'Historical', 'Investment', 'Provenance'
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
        backgroundColor: 'rgba(49, 130, 206, 0.2)',
        borderColor: 'rgb(49, 130, 206)',
        pointBackgroundColor: 'rgb(49, 130, 206)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(49, 130, 206)',
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
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
      scales: {
        r: {
          angleLines: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
          },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            display: false
          },
          pointLabels: {
            font: {
              size: 9
            }
          }
        }
      }
    }
  });
  
  // Function to scroll to section
  window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };
});
</script>
<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}
add_shortcode('display_compact_analytics', 'display_compact_analytics_shortcode');