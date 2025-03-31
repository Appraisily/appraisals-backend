/**
 * Snippet Name: Display Appraisal Card Shortcode
 * Description: Modern, elegant appraisal card with contemporary visualizations
 * Snippet Type: Shortcode
 */

// Include the enhanced statistics decoder utility functions
require_once(dirname(__FILE__) . '/statistics_decoder_utils_enhanced.php');

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
  
  // Debug the raw statistics data
  if (!empty($statistics_data)) {
    error_log("Appraisal Card Debug: Attempting to decode statistics data (first 100 chars): " . substr($statistics_data, 0, 100));
  }
  
  // Use the enhanced utility function to safely decode the statistics data
  $stats = safe_decode_statistics($statistics_data, 'Appraisal Card');
  
  // Debug the decoded statistics
  if (!empty($stats)) {
    error_log("Appraisal Card Debug: Successfully decoded statistics with " . count($stats) . " fields");
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
  
  // Include the HTML template
  include('display_appraisal_card_template.php');
  
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}

// Register the shortcode
add_shortcode('display_appraisal_card', 'display_appraisal_card_shortcode');