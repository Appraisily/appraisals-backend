<?php
/**
 * Snippet Name: Working Statistics Shortcode
 * Description: Displays statistics data with smart quotes handling
 * Snippet Type: Shortcode
 */

function working_statistics_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'statistics',
    'post_id' => null,
    'debug' => 'false'
  ), $atts);
  
  // Start output buffer
  ob_start();
  
  $debug_mode = filter_var($atts['debug'], FILTER_VALIDATE_BOOLEAN);
  $post_id = $atts['post_id'];
  
  // If no post ID provided, use current post
  if (!$post_id) {
    global $post;
    $post_id = $post ? $post->ID : null;
  }
  
  // Get the field name
  $field_name = $atts['field_name'];
  
  // Get statistics data
  $statistics_data = null;
  if (function_exists('get_field')) {
    // Try ACF first
    $statistics_data = get_field($field_name, $post_id);
  }
  
  if (empty($statistics_data) && $post_id) {
    // Fallback to post meta
    $statistics_data = get_post_meta($post_id, $field_name, true);
  }
  
  // Debug information
  if ($debug_mode) {
    echo "<div style='background:#f8f9fa;padding:10px;border:1px solid #ddd;margin-bottom:20px;'>";
    echo "<h4>Debug Information</h4>";
    echo "<p>Using field name: <code>" . esc_html($field_name) . "</code></p>";
    echo "<p>Post ID: <code>" . esc_html($post_id) . "</code></p>";
    echo "<p>Data type: <code>" . gettype($statistics_data) . "</code></p>";
    
    if (is_string($statistics_data)) {
      echo "<p>String length: " . strlen($statistics_data) . " characters</p>";
      echo "<p>First 50 chars: <code>" . esc_html(substr($statistics_data, 0, 50)) . "...</code></p>";
    } elseif (is_array($statistics_data)) {
      echo "<p>Array with " . count($statistics_data) . " items</p>";
    }
  }
  
  // Parse the statistics data
  $stats = null;
  
  if (is_string($statistics_data)) {
    if ($debug_mode) {
      echo "<p>Processing string data...</p>";
    }
    
    // Replace smart quotes with regular quotes
    $replacements = array(
      "\xE2\x80\x9C" => '"', // Left double quote
      "\xE2\x80\x9D" => '"', // Right double quote
      "\xE2\x80\x98" => "'", // Left single quote
      "\xE2\x80\x99" => "'"  // Right single quote
    );
    
    $fixed_string = str_replace(array_keys($replacements), array_values($replacements), $statistics_data);
    
    // Try to decode the JSON
    $stats = json_decode($fixed_string, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
      if ($debug_mode) {
        echo "<p>JSON decode error: " . json_last_error_msg() . "</p>";
        echo "<p>Trying alternative approach...</p>";
      }
      
      // Try a different approach for smart quotes
      $alt_replacements = array(
        '"' => '"',
        '"' => '"',
        ''' => "'",
        ''' => "'"
      );
      
      // Apply alternative replacements - use pure text representations
      $fixed_string = preg_replace('/[\x{201C}\x{201D}\x{2018}\x{2019}]/u', '"', $fixed_string);
      
      // Try to decode again
      $stats = json_decode($fixed_string, true);
      
      if (json_last_error() !== JSON_ERROR_NONE && $debug_mode) {
        echo "<p>Alternative approach failed. Error: " . json_last_error_msg() . "</p>";
      }
    }
  } elseif (is_array($statistics_data)) {
    // Already an array, use as is
    $stats = $statistics_data;
    if ($debug_mode) {
      echo "<p>Using array data directly.</p>";
    }
  }
  
  if ($debug_mode) {
    if (empty($stats) || !is_array($stats)) {
      echo "<p>Failed to parse statistics data.</p>";
    } else {
      echo "<p>Successfully parsed statistics data.</p>";
      echo "<p>Available fields: " . implode(", ", array_keys($stats)) . "</p>";
    }
    echo "</div>";
  }
  
  // If no valid statistics data, show a message
  if (empty($stats) || !is_array($stats)) {
    return "<div class='statistics-error'>Unable to load statistics data.</div>";
  }
  
  // Extract key data points
  $count = isset($stats['count']) ? intval($stats['count']) : 0;
  $avg_price = isset($stats['average_price']) ? intval($stats['average_price']) : 0;
  $median_price = isset($stats['median_price']) ? intval($stats['median_price']) : 0;
  $price_min = isset($stats['price_min']) ? intval($stats['price_min']) : 0;
  $price_max = isset($stats['price_max']) ? intval($stats['price_max']) : 0;
  $percentile = isset($stats['percentile']) ? $stats['percentile'] : '0th';
  $price_trend = isset($stats['price_trend_percentage']) ? $stats['price_trend_percentage'] : '0%';
  $confidence = isset($stats['confidence_level']) ? $stats['confidence_level'] : 'Low';
  $value = isset($stats['value']) ? intval($stats['value']) : 0;
  
  // Get comparable sales if available
  $comparable_sales = isset($stats['comparable_sales']) && is_array($stats['comparable_sales']) 
    ? array_slice($stats['comparable_sales'], 0, 5) 
    : array();
  
  // Get histogram data if available
  $histogram = isset($stats['histogram']) && is_array($stats['histogram']) 
    ? $stats['histogram'] 
    : array();
  
  // Determine if trend is positive
  $is_trend_positive = strpos($price_trend, '+') !== false;
  
  // Generate HTML
  ?>
  <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;max-width:100%;margin-bottom:2rem;">
    <h3 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;color:#1A202C;">Market Statistics</h3>
    
    <!-- Statistics Summary -->
    <div style="background:#f8fafc;border-radius:8px;padding:1rem;margin-bottom:1.5rem;">
      <p style="margin:0.5rem 0;">Market analysis reveals <?php echo $count; ?> comparable items with an average value of $<?php echo number_format($avg_price); ?>.</p>
      <p style="margin:0.5rem 0;">Your item's value of $<?php echo number_format($value); ?> places it in the <?php echo $percentile; ?> percentile, with a <?php echo $price_trend; ?> average annual growth rate.</p>
      <p style="margin:0.5rem 0;">Market confidence: <strong><?php echo $confidence; ?></strong></p>
    </div>
    
    <!-- Statistics Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;margin-bottom:1.5rem;">
      <div style="background:white;border-radius:8px;border:1px solid #E2E8F0;padding:1rem;">
        <div style="font-size:0.875rem;color:#718096;margin-bottom:0.5rem;">Average Price</div>
        <div style="font-size:1.25rem;font-weight:700;color:#1A202C;">$<?php echo number_format($avg_price); ?></div>
      </div>
      
      <div style="background:white;border-radius:8px;border:1px solid #E2E8F0;padding:1rem;">
        <div style="font-size:0.875rem;color:#718096;margin-bottom:0.5rem;">Median Price</div>
        <div style="font-size:1.25rem;font-weight:700;color:#1A202C;">$<?php echo number_format($median_price); ?></div>
      </div>
      
      <div style="background:white;border-radius:8px;border:1px solid #E2E8F0;padding:1rem;">
        <div style="font-size:0.875rem;color:#718096;margin-bottom:0.5rem;">Price Range</div>
        <div style="font-size:1.25rem;font-weight:700;color:#1A202C;">$<?php echo number_format($price_min); ?> - $<?php echo number_format($price_max); ?></div>
      </div>
      
      <div style="background:white;border-radius:8px;border:1px solid #E2E8F0;padding:1rem;">
        <div style="font-size:0.875rem;color:#718096;margin-bottom:0.5rem;">Market Trend</div>
        <div style="font-size:1.25rem;font-weight:700;color:<?php echo $is_trend_positive ? '#38A169' : '#E53E3E'; ?>;"><?php echo $price_trend; ?></div>
      </div>
    </div>
    
    <?php if (!empty($comparable_sales)): ?>
    <!-- Comparable Sales Table -->
    <h3 style="font-size:1.25rem;font-weight:700;margin-top:1.5rem;margin-bottom:1rem;color:#1A202C;">Comparable Sales</h3>
    <div style="overflow-x:auto;margin-bottom:1.5rem;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;">
        <thead>
          <tr style="background:#F7FAFC;">
            <th style="text-align:left;padding:0.75rem;border-bottom:2px solid #E2E8F0;font-weight:600;">Item</th>
            <th style="text-align:left;padding:0.75rem;border-bottom:2px solid #E2E8F0;font-weight:600;">Source</th>
            <th style="text-align:left;padding:0.75rem;border-bottom:2px solid #E2E8F0;font-weight:600;">Date</th>
            <th style="text-align:right;padding:0.75rem;border-bottom:2px solid #E2E8F0;font-weight:600;">Price</th>
            <th style="text-align:right;padding:0.75rem;border-bottom:2px solid #E2E8F0;font-weight:600;">Difference</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($comparable_sales as $i => $sale): 
            $title = isset($sale['title']) ? $sale['title'] : 'Unknown Item';
            $house = isset($sale['house']) ? $sale['house'] : 'Unknown';
            $date = isset($sale['date']) ? $sale['date'] : 'Unknown';
            $price = isset($sale['price']) ? '$' . number_format($sale['price']) : 'Unknown';
            $diff = isset($sale['diff']) ? $sale['diff'] : '';
            $is_current = isset($sale['is_current']) && $sale['is_current'];
            $diff_color = (strpos($diff, '+') !== false) ? '#38A169' : ((strpos($diff, '-') !== false) ? '#E53E3E' : '');
            $row_style = $is_current ? 'background:#EBF8FF;font-weight:600;' : ($i % 2 == 0 ? 'background:#F7FAFC;' : '');
          ?>
          <tr style="<?php echo $row_style; ?>">
            <td style="padding:0.75rem;border-bottom:1px solid #E2E8F0;"><?php echo esc_html($title); ?></td>
            <td style="padding:0.75rem;border-bottom:1px solid #E2E8F0;"><?php echo esc_html($house); ?></td>
            <td style="padding:0.75rem;border-bottom:1px solid #E2E8F0;"><?php echo esc_html($date); ?></td>
            <td style="padding:0.75rem;border-bottom:1px solid #E2E8F0;text-align:right;"><?php echo esc_html($price); ?></td>
            <td style="padding:0.75rem;border-bottom:1px solid #E2E8F0;text-align:right;color:<?php echo $diff_color; ?>;"><?php echo esc_html($diff); ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
    
    <p style="font-style:italic;color:#718096;text-align:center;margin-top:2rem;">
      Market analysis completed on <?php echo date('F j, Y'); ?>
    </p>
  </div>
  <?php
  
  // Return the buffered output
  return ob_get_clean();
}
add_shortcode('working_statistics', 'working_statistics_shortcode');