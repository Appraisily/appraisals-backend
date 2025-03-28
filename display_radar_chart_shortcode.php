<?php
/**
 * Snippet Name: Display Radar Chart Shortcode
 * Description: Modern radar chart visualization for appraisal metrics
 * Snippet Type: Shortcode
 */

function display_radar_chart_shortcode($atts) {
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
  
  // Generate a unique ID for this chart instance
  $chart_id = 'radar-chart-' . uniqid();
  
  // Start output buffering to capture HTML
  ob_start();
?>
<div class="radar-chart-container">
  <div class="chart-header">
    <h3>Item Metrics Analysis</h3>
    <p class="chart-description">Multi-dimensional analysis of key value factors</p>
  </div>
  
  <div class="chart-card">
    <div class="chart-card-header">
      <h4>Value Metrics Radar</h4>
    </div>
    <div class="chart-content">
      <div class="radar-wrapper">
        <canvas id="<?php echo $chart_id; ?>" width="400" height="400"></canvas>
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

<style>
/* Radar Chart Styles */
.radar-chart-container {
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

.chart-content {
  padding: 1.5rem;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

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

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
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

/* Responsive adjustments */
@media (max-width: 992px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .radar-wrapper {
    height: 350px;
  }
}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const ctx = document.getElementById('<?php echo $chart_id; ?>').getContext('2d');
  
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
  new Chart(ctx, radarConfig);
});
</script>
<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}
add_shortcode('display_radar_chart', 'display_radar_chart_shortcode');