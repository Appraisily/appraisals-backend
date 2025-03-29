<?php
/**
 * Snippet Name: Display Appraisal Card Shortcode
 * Description: Modern, elegant appraisal card with contemporary visualizations
 * Snippet Type: Shortcode
 */

function display_appraisal_card_shortcode($atts) {
  $atts = shortcode_atts(array(
    'title_field' => 'title',
    'creator_field' => 'creator', 
    'object_type_field' => 'object_type',
    'age_field' => 'estimated_age',
    'medium_field' => 'medium',
    'condition_field' => 'condition_summary',
    'market_demand_field' => 'market_demand',
    'rarity_field' => 'rarity',
    'condition_score_field' => 'condition_score',
    'value_field' => 'value',
    'statistics_field' => 'statistics',
  ), $atts);
  
  // Get basic item information
  $title = get_field($atts['title_field']) ?: 'Untitled Artwork';
  $creator = get_field($atts['creator_field']) ?: 'Unknown Artist';
  $object_type = get_field($atts['object_type_field']) ?: 'Art Object';
  $age = get_field($atts['age_field']) ?: '20th Century';
  $medium = get_field($atts['medium_field']) ?: 'Mixed Media';
  $condition = get_field($atts['condition_field']) ?: 'Good';
  
  // Get metrics
  $market_demand = intval(get_field($atts['market_demand_field'])) ?: 75;
  $rarity = intval(get_field($atts['rarity_field'])) ?: 70;
  $condition_score = intval(get_field($atts['condition_score_field'])) ?: 80;
  
  // Get value
  $value = intval(get_field($atts['value_field'])) ?: 4500;
  $formatted_value = '$' . number_format($value) . ' USD';
  
  // Get statistics if available
  $statistics_data = get_field($atts['statistics_field']);
  $stats = [];
  
  // Check if statistics data is valid and attempt to decode
  if (!empty($statistics_data) && is_string($statistics_data)) {
    $decoded = json_decode($statistics_data, true);
    if (is_array($decoded)) {
      $stats = $decoded;
    }
  }
  
  // Extract key stats if available
  $percentile = isset($stats['percentile']) && !empty($stats['percentile']) ? $stats['percentile'] : '75th';
  $percentile_num = intval(preg_replace('/[^0-9]/', '', $percentile));
  $price_trend = isset($stats['price_trend_percentage']) && !empty($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '+8.5%';
  $confidence = isset($stats['confidence_level']) && !empty($stats['confidence_level']) ? $stats['confidence_level'] : 'High';
  $is_trend_positive = strpos($price_trend, '+') !== false;
  $trend_value = floatval(str_replace(['%', '+', '-'], '', $price_trend));
  
  // Generate unique IDs for charts
  $market_chart_id = 'market-chart-' . uniqid();
  $metrics_chart_id = 'metrics-chart-' . uniqid();
  $gauge_chart_id = 'gauge-chart-' . uniqid();
  
  // Get current date for the report
  $current_date = date('F j, Y');
  
  // Start output buffering to capture HTML
  ob_start();
?>
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
          <p class="report-date"><?php echo $current_date; ?></p>
        </div>
      </div>
      <div class="value-display">
        <div class="value-content">
          <span class="value-label">APPRAISED VALUE</span>
          <span class="value-amount"><?php echo $formatted_value; ?></span>
        </div>
      </div>
    </div>
  </header>
  
  <div class="card-body">
    <div class="dual-layout">
      <div class="artwork-showcase">
        <div class="artwork-image">
          <?php 
          // Get the featured image from the post
          if (has_post_thumbnail()) {
            // Get the featured image
            $thumbnail_id = get_post_thumbnail_id();
            $thumbnail = wp_get_attachment_image_src($thumbnail_id, 'medium');
            if ($thumbnail) {
              echo '<img src="' . esc_url($thumbnail[0]) . '" alt="' . esc_attr($title) . '" class="featured-artwork">';
            } else {
              echo '<div class="placeholder-image"><span>No Image Available</span></div>';
            }
          } 
          // Fallback to ACF image if available and featured image not found
          else {
            $image = get_field('main');
            if (is_array($image) && isset($image['url'])) {
              echo '<img src="' . esc_url($image['url']) . '" alt="' . esc_attr($title) . '" class="featured-artwork">';
            } else {
              echo '<div class="placeholder-image"><span>No Image Available</span></div>';
            }
          }
          ?>
        </div>
        
        <div class="artwork-info">
          <h2 class="artwork-title"><?php echo esc_html($title); ?></h2>
          <p class="artwork-creator"><?php echo esc_html($creator); ?></p>
          
          <div class="artwork-details">
            <div class="detail-item">
              <span class="detail-label">Object Type</span>
              <span class="detail-value"><?php echo esc_html($object_type); ?></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Period/Age</span>
              <span class="detail-value"><?php echo esc_html($age); ?></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Medium</span>
              <span class="detail-value"><?php echo esc_html($medium); ?></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Condition</span>
              <span class="detail-value"><?php echo esc_html($condition); ?></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="market-position-container">
        <h3>Market Position</h3>
        <div class="gauge-container">
          <canvas id="<?php echo $gauge_chart_id; ?>" height="170"></canvas>
          <div class="gauge-indicator">
            <span class="percentile-value"><?php echo $percentile; ?></span>
            <span class="percentile-label">Percentile</span>
          </div>
        </div>
        <div class="position-trend">
          <span class="trend-label">Market Trend</span>
          <span class="trend-value <?php echo $is_trend_positive ? 'positive' : 'negative'; ?>">
            <?php echo $price_trend; ?> Annual Change
          </span>
        </div>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metrics-chart-container">
        <h3>Item Value Assessment</h3>
        <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
          <canvas id="<?php echo $metrics_chart_id; ?>"></canvas>
        </div>
      </div>
      
      <div class="price-distribution-container">
        <h3>Market Price Distribution</h3>
        <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
          <canvas id="<?php echo $market_chart_id; ?>"></canvas>
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
              <?php
              // Define detail fields and their labels
              $artwork_fields = array(
                'artist' => array('label' => 'Artist\'s Name', 'field' => 'creator'),
                'birth_death' => array('label' => 'Artist\'s Date of Birth and Death', 'field' => 'artist_dates'),
                'title' => array('label' => 'Title of Artwork', 'field' => 'title'),
                'period' => array('label' => 'Period/Age', 'field' => 'estimated_age'),
                'color_palette' => array('label' => 'Color Palette', 'field' => 'color_palette'),
                'style' => array('label' => 'Art Style/Period', 'field' => 'style'),
                'medium' => array('label' => 'Medium', 'field' => 'medium'),
                'dimensions' => array('label' => 'Dimensions', 'field' => 'dimensions'),
                'framed' => array('label' => 'Is it Framed?', 'field' => 'framed'),
                'edition' => array('label' => 'Edition Information', 'field' => 'edition'),
                'publisher' => array('label' => 'Printer/Publisher', 'field' => 'publisher'),
                'composition' => array('label' => 'Composition Description', 'field' => 'composition_description'),
                'condition' => array('label' => 'Condition', 'field' => 'condition_summary'),
                'signed' => array('label' => 'Is it signed?', 'field' => 'signed'),
                'provenance' => array('label' => 'Provenance Information', 'field' => 'provenance'),
                'registration' => array('label' => 'Registration Number', 'field' => 'registration_number'),
                'notes' => array('label' => 'Additional Notes', 'field' => 'notes'),
                'coa' => array('label' => 'COA?', 'field' => 'coa'),
                'meaning' => array('label' => 'Possible Meaning of the composition', 'field' => 'meaning')
              );
              
              // Output table rows
              foreach ($artwork_fields as $key => $details) {
                $value = get_field($details['field']);
                // Skip empty fields
                if (!empty($value)) {
                  echo '<tr>';
                  echo '<th>' . esc_html($details['label']) . '</th>';
                  echo '<td>' . esc_html($value) . '</td>';
                  echo '</tr>';
                }
              }
              
              // Fallback for essential fields if we have no data
              if (empty(get_field('creator')) && empty(get_field('medium')) && empty(get_field('condition_summary'))) {
                echo '<tr><th>Object Type</th><td>' . esc_html($object_type) . '</td></tr>';
                echo '<tr><th>Creator</th><td>' . esc_html($creator) . '</td></tr>';
                echo '<tr><th>Period/Age</th><td>' . esc_html($age) . '</td></tr>';
                echo '<tr><th>Medium</th><td>' . esc_html($medium) . '</td></tr>';
                echo '<tr><th>Condition</th><td>' . esc_html($condition) . '</td></tr>';
                echo '<tr><th>Appraised Value</th><td>' . esc_html($formatted_value) . '</td></tr>';
              }
              ?>
            </tbody>
          </table>
        </div>
      </div>
      
      <div id="details" class="tab-panel">
        <div class="market-analysis">
          <p class="analysis-text">
            <?php 
            $market_text = get_field('statistics_summary');
            if (empty($market_text)) {
              echo 'Market analysis reveals ' . ($is_trend_positive ? 'strong' : 'moderate') . ' demand for similar items with ' . 
                   ($is_trend_positive ? 'consistent price appreciation' : 'stable pricing') . ' over the past 5 years.';
            } else {
              echo esc_html($market_text);
            }
            ?>
          </p>
          
          <div class="metrics-details">
            <div class="metric-detail-item">
              <h4>Market Demand</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: <?php echo $market_demand; ?>%;">
                  <span class="metric-value"><?php echo $market_demand; ?>%</span>
                </div>
              </div>
              <p>Current collector interest level</p>
            </div>
            
            <div class="metric-detail-item">
              <h4>Rarity</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: <?php echo $rarity; ?>%;">
                  <span class="metric-value"><?php echo $rarity; ?>%</span>
                </div>
              </div>
              <p>Scarcity in the marketplace</p>
            </div>
            
            <div class="metric-detail-item">
              <h4>Condition</h4>
              <div class="metric-bar-container">
                <div class="metric-bar" style="width: <?php echo $condition_score; ?>%;">
                  <span class="metric-value"><?php echo $condition_score; ?>%</span>
                </div>
              </div>
              <p>Physical state assessment</p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="similar" class="tab-panel">
        <div class="similar-items">
          <?php 
          // Check if similar_gallery shortcode exists
          if (shortcode_exists('similar_gallery') && get_field('googlevision')) {
            echo do_shortcode('[similar_gallery field_name="googlevision" limit="4" class="similar-gallery"]');
          } else {
            echo '<p class="no-similar-items">No similar items available at this time.</p>';
          }
          ?>
        </div>
      </div>
    </div>
  </div>
  
  <footer class="card-footer">
    <div class="footer-info">
      <p>Appraised by: <strong><?php echo get_field('appraiser_name') ?: 'Andrés Gómez'; ?></strong>, Accredited Art Appraiser</p>
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

<style>
/* Modern Appraisal Card Styles */
:root {
  /* Primary colors */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;
  
  /* Neutral colors */
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;
  
  /* Semantic colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --purple: #8b5cf6;
  --teal: #0d9488;
  
  /* Fonts */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.3);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
}

.modern-appraisal-card {
  font-family: var(--font-sans);
  color: var(--neutral-900);
  background-color: white;
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  max-width: 1200px;
  width: 100%;
  margin: 2rem auto;
  border: 1px solid var(--neutral-200);
}

/* Header Section */
.card-header {
  position: relative;
  background: linear-gradient(135deg, #2563eb, #1e3a8a);
  color: white;
  padding: 1.5rem;
}


.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.report-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
}

.report-info h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.report-date {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  opacity: 0.8;
}

.value-display {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
  padding: 1rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.value-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  opacity: 0.9;
}

.value-amount {
  font-size: 1.75rem;
  font-weight: 700;
}

/* Body Section */
.card-body {
  padding: 1.5rem;
}

.dual-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Artwork Showcase */
.artwork-showcase {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--neutral-50);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--neutral-200);
}

.artwork-image {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  min-height: 200px;
}

.featured-artwork {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.placeholder-image {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neutral-100);
  color: var(--neutral-500);
  font-size: 1rem;
}

.artwork-info {
  text-align: center;
}

.artwork-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.artwork-creator {
  font-size: 1rem;
  color: var(--neutral-600);
  margin: 0 0 1.25rem;
}

.artwork-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  text-align: left;
}

.detail-item {
  background: white;
  border-radius: var(--radius-md);
  padding: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--neutral-200);
  transition: all 0.2s ease;
}

.detail-item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--primary-200);
  transform: translateY(-2px);
}

.detail-label {
  display: block;
  font-size: 0.75rem;
  color: var(--neutral-500);
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 600;
  color: var(--neutral-800);
}

/* Market Position */
.market-position-container {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--neutral-200);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.market-position-container h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
  text-align: center;
  color: var(--neutral-800);
}

.gauge-container {
  position: relative;
  margin: 0.5rem 0 1.5rem;
  height: 170px;
}

.gauge-indicator {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.percentile-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--neutral-900);
}

.percentile-label {
  display: block;
  font-size: 0.875rem;
  color: var(--neutral-500);
  margin-top: 0.25rem;
}

.position-trend {
  text-align: center;
  margin-top: auto;
  background: var(--neutral-50);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.trend-label {
  display: block;
  color: var(--neutral-600);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.trend-value {
  font-weight: 600;
  font-size: 1rem;
}

.trend-value.positive {
  color: var(--success);
}

.trend-value.negative {
  color: var(--error);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.metrics-chart-container,
.price-distribution-container {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--neutral-200);
  padding: 1.5rem;
}

.metrics-chart-container h3,
.price-distribution-container h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
  text-align: center;
  color: var(--neutral-800);
}

.chart-container {
  overflow: hidden;
}

.distribution-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--neutral-600);
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

.market-marker {
  background-color: rgba(59, 130, 246, 0.7);
}

.your-marker {
  background-color: rgba(239, 68, 68, 0.7);
}

/* Tabs Section */
.card-tabs {
  margin-top: 2rem;
  border-top: 1px solid var(--neutral-200);
}

.tabs-navigation {
  display: flex;
  border-bottom: 1px solid var(--neutral-200);
  background: var(--neutral-50);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs-navigation::-webkit-scrollbar {
  display: none;
}

.tab-button {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--neutral-600);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-button.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-600);
}

.tab-button:hover:not(.active) {
  color: var(--neutral-900);
  background: var(--neutral-100);
}

.tabs-content {
  padding: 1.5rem;
}

.tab-panel {
  display: none;
  animation: fadeIn 0.3s ease;
}

.tab-panel.active {
  display: block;
}

/* Summary Tab */
.tab-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--neutral-800);
  margin: 0 0 1.25rem;
}

.artwork-details-table {
  width: 100%;
  overflow-x: auto;
}

.artwork-details-table table {
  width: 100%;
  border-collapse: collapse;
}

.artwork-details-table th,
.artwork-details-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--neutral-200);
}

.artwork-details-table th {
  width: 35%;
  font-weight: 600;
  color: var(--neutral-700);
  background-color: var(--neutral-50);
}

.artwork-details-table td {
  color: var(--neutral-900);
}

.artwork-details-table tr:hover {
  background-color: var(--neutral-50);
}

/* Details Tab */
.analysis-text {
  color: var(--neutral-700);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.metrics-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.metric-detail-item {
  background: var(--neutral-50);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  border: 1px solid var(--neutral-200);
}

.metric-detail-item h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--neutral-700);
}

.metric-bar-container {
  height: 12px;
  background: var(--neutral-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 1rem;
  position: relative;
}

.metric-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
  border-radius: var(--radius-full);
  position: relative;
  transform-origin: left;
  animation: barGrow 1.5s ease-out forwards;
}

.metric-value {
  position: absolute;
  top: -20px;
  right: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-700);
}

.metric-detail-item p {
  font-size: 0.875rem;
  color: var(--neutral-500);
  margin: 0.5rem 0 0;
  text-align: right;
}

/* Similar Items Tab */
.similar-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
}

.similar-gallery img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-lg);
  border: 1px solid var(--neutral-200);
  transition: all 0.25s ease;
}

.similar-gallery img:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-300);
}

.no-similar-items {
  text-align: center;
  color: var(--neutral-500);
  padding: 2rem;
  background: var(--neutral-50);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--neutral-300);
}

/* Footer Section */
.card-footer {
  padding: 1.25rem 1.5rem;
  background: var(--neutral-50);
  border-top: 1px solid var(--neutral-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer-info {
  font-size: 0.875rem;
  color: var(--neutral-600);
}

.footer-info p {
  margin: 0;
}

.detail-report-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--primary-600);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.detail-report-button:hover {
  background: var(--primary-700);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.detail-report-button svg {
  transition: transform var(--transition-fast);
}

.detail-report-button:hover svg {
  transform: translateX(3px);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes barGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .dual-layout {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .value-display {
    width: 100%;
  }
  
  .artwork-details {
    grid-template-columns: 1fr;
  }
  
  .nutshell-data dl {
    grid-template-columns: 1fr;
  }
  
  .nutshell-data dt {
    border-top: 1px solid var(--neutral-200);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .nutshell-data dt:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
}


@media (max-width: 480px) {
  .card-header,
  .card-body,
  .tabs-content {
    padding: 1rem;
  }
  
  .artwork-showcase,
  .market-position-container,
  .metrics-chart-container,
  .price-distribution-container {
    padding: 1rem;
  }
  
  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }
  
  .detail-report-button {
    width: 100%;
    justify-content: center;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  initAppraisalCard();
});

function initAppraisalCard() {
  // Initialize tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Detailed report button functionality
  const detailReportButton = document.querySelector('.detail-report-button');
  if (detailReportButton) {
    detailReportButton.addEventListener('click', (e) => {
      e.preventDefault();
      // This would typically navigate to a detailed report page
      // For now, let's just toggle a class for demonstration
      const card = document.querySelector('.modern-appraisal-card');
      
      // You can implement the actual navigation or modal display here
      // For example:
      // window.location.href = '/detailed-report?id=' + postId;
      
      // Or, for demonstration purposes:
      alert('Navigating to detailed report view');
    });
  }
  
  // Initialize charts if Chart.js is available
  if (typeof Chart === 'undefined') {
    loadScript('https://cdn.jsdelivr.net/npm/chart.js', initCharts);
  } else {
    initCharts();
  }
}

function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  document.head.appendChild(script);
}

function initCharts() {
  if (typeof Chart === 'undefined') return;
  
  // Set default font
  Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  Chart.defaults.font.size = 12;
  
  // Initialize gauge chart
  const gaugeCharts = document.querySelectorAll('[id^="gauge-chart-"]');
  gaugeCharts.forEach(canvas => {
    // Get percentile from nearest indicator
    const container = canvas.closest('.gauge-container');
    const percentileEl = container?.querySelector('.percentile-value');
    const percentile = percentileEl ? parseInt(percentileEl.textContent) : 75;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [percentile, 100 - percentile],
          backgroundColor: [
            createGradient(ctx, ['#3b82f6', '#1d4ed8']),
            '#e5e7eb'
          ],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        animation: {
          animateRotate: true,
          animateScale: false,
          duration: 2000,
          easing: 'easeOutQuart'
        }
      }
    });
  });
  
  // Initialize metrics chart (bar chart)
  const metricsCharts = document.querySelectorAll('[id^="metrics-chart-"]');
  metricsCharts.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    
    // Get metrics from the page
    let marketDemand = 75;
    let rarity = 70;
    let condition = 80;
    
    // Try to get the actual values if available
    document.querySelectorAll('.metric-bar').forEach(bar => {
      const width = bar.style.width;
      const value = parseInt(width);
      const metricName = bar.closest('.metric-detail-item').querySelector('h4').textContent.toLowerCase();
      
      if (metricName.includes('market') || metricName.includes('demand')) {
        marketDemand = value;
      } else if (metricName.includes('rarity')) {
        rarity = value;
      } else if (metricName.includes('condition')) {
        condition = value;
      }
    });
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Market Demand', 'Rarity', 'Condition'],
        datasets: [{
          data: [marketDemand, rarity, condition],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderRadius: 6,
          maxBarThickness: 50
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2, // Control the aspect ratio
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          },
          y: {
            grid: {
              display: false
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
                return context.parsed.x + '%';
              }
            }
          }
        },
        animation: {
          delay: function(context) {
            return context.dataIndex * 200;
          },
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  });
  
  // Initialize market chart (price distribution)
  const marketCharts = document.querySelectorAll('[id^="market-chart-"]');
  marketCharts.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    
    // Generate dynamic price distribution based on actual value
    const currentValue = <?php echo $value; ?>;
    
    // Get actual histogram data if available in statistics
    let prices = [];
    let counts = [];
    
    <?php if (!empty($statistics_data)): ?>
    try {
      const stats = <?php echo $statistics_data; ?>;
      if (stats && stats.histogram && Array.isArray(stats.histogram)) {
        // Use the real histogram data from the enhanced statistics
        prices = stats.histogram.map(bucket => Math.floor((bucket.min + bucket.max) / 2));
        counts = stats.histogram.map(bucket => bucket.count);
        console.log("Using real histogram data from enhanced statistics");
      } else {
        throw new Error("No histogram data found in statistics");
      }
    } catch (e) {
      console.log("Error parsing statistics data:", e);
      // Fallback to generated distribution data
      generateFallbackDistribution();
    }
    <?php else: ?>
    // Fallback to generated distribution data when statistics aren't available
    generateFallbackDistribution();
    <?php endif; ?>
    
    // Fallback function to generate a reasonable price distribution when real data isn't available
    function generateFallbackDistribution() {
      console.log("Using fallback price distribution");
      // Create a distribution around the current value
      const range = currentValue * 0.5; // 50% of the current value for range
      const step = range / 3;
      
      prices = [
        Math.floor(currentValue - range),
        Math.floor(currentValue - step * 2),
        Math.floor(currentValue - step),
        Math.floor(currentValue),
        Math.floor(currentValue + step),
        Math.floor(currentValue + step * 2)
      ];
      
      // Create a bell curve distribution centered around the current value
      counts = [1, 3, 6, 7, 4, 2];
    }
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: prices.map(p => '$' + p.toLocaleString()),
        datasets: [{
          data: counts,
          backgroundColor: prices.map(p => {
            const price = parseInt(p);
            return (price >= currentValue - 250 && price <= currentValue + 250) 
              ? 'rgba(239, 68, 68, 0.7)' 
              : 'rgba(59, 130, 246, 0.7)';
          }),
          borderRadius: 4,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2, // Control the aspect ratio
        layout: {
          padding: {
            top: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              precision: 0
            },
            suggestedMax: 10, // Limit max height
            title: {
              display: true,
              text: 'Number of Items',
              color: '#6b7280',
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            title: {
              display: true,
              text: 'Price Range',
              color: '#6b7280',
              font: {
                size: 12,
                weight: '500'
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
              title: function(context) {
                return 'Price: ' + context[0].label;
              },
              label: function(context) {
                return context.parsed.y + ' items';
              }
            }
          }
        },
        animation: {
          delay: function(context) {
            return context.dataIndex * 100;
          },
          duration: 800,
          easing: 'easeOutQuad'
        }
      }
    });
  });
}

function createGradient(ctx, colors) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  return gradient;
}
</script>

<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}

// Register the shortcode
add_shortcode('display_appraisal_card', 'display_appraisal_card_shortcode');