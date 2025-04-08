/**
 * Enhanced utility functions for safely decoding and handling statistics metadata
 * with improved debugging and robust error handling for malformed JSON
 */

function safe_decode_statistics($statistics_data, $context = '') {
  $stats = [];
  
  // If already an array, return it directly
  if (is_array($statistics_data)) {
    return $statistics_data;
  }
  
  // Skip empty data
  if (empty($statistics_data)) {
    error_log("Statistics decoder ({$context}): Empty statistics data provided");
    return $stats;
  }
  
  // Log the raw input type and a sample for debugging
  error_log("Statistics decoder ({$context}): Raw data type: " . gettype($statistics_data));
  $sample = substr($statistics_data, 0, 150);
  error_log("Statistics decoder ({$context}): Sample data: " . addslashes($sample) . "...");
  
  try {
    // Keep original for debugging
    $original_data = $statistics_data;
    
    // SPECIAL HANDLING: Convert PHP array notation to JSON if detected
    if (strpos($statistics_data, '=>') !== false) {
      error_log("Statistics decoder ({$context}): Detected PHP array notation, attempting conversion");
      $statistics_data = preg_replace('/(\w+)\s*=>\s*/i', '"$1":', $statistics_data);
      $statistics_data = preg_replace('/\'(.*?)\':/i', '"$1":', $statistics_data);
    }
    
    // Try direct JSON decoding first
    $stats = @json_decode($statistics_data, true);
    
    // If direct decode fails, try with stripslashes (WordPress standard)
    if (json_last_error() !== JSON_ERROR_NONE) {
      error_log("Statistics decoder ({$context}): Initial JSON decode failed, trying stripslashes: " . json_last_error_msg());
      $stripped_data = stripslashes($statistics_data);
      $stats = @json_decode($stripped_data, true);
      
      // If still failing, try more aggressive cleaning
      if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Statistics decoder ({$context}): JSON decode with stripslashes failed: " . json_last_error_msg());
        
        // Try with a series of data cleaning operations
        $cleaned_string = $stripped_data;
        
        // 1. Remove unwanted control characters
        $cleaned_string = preg_replace('/[\x00-\x1F\x7F]/', '', $cleaned_string);
        
        // 2. Fix common JSON syntax issues
        $cleaned_string = str_replace(['\"', "\\'", "\r", "\n", "\t"], ['"', "'", '', '', ' '], $cleaned_string);
        
        // 3. Fix common WordPress-specific escaping issues
        $cleaned_string = str_replace(['\\\\/', '\\"'], ['/', '"'], $cleaned_string);
        
        // 4. Attempt to balance quotes by adding any missing closing quotes
        $quote_count = substr_count($cleaned_string, '"');
        if ($quote_count % 2 !== 0) {
            $cleaned_string .= '"';
            error_log("Statistics decoder ({$context}): Added missing quote to balance JSON structure");
        }
        
        // Try parsing the cleaned string
        $stats = @json_decode($cleaned_string, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
          error_log("Statistics decoder ({$context}): JSON decode with cleaned string failed: " . json_last_error_msg());
          
          // Try with PHP 7.2+ JSON_INVALID_UTF8_IGNORE flag
          if (defined('JSON_INVALID_UTF8_IGNORE')) {
            $stats = @json_decode($cleaned_string, true, 512, JSON_INVALID_UTF8_IGNORE);
            if (json_last_error() !== JSON_ERROR_NONE) {
              error_log("Statistics decoder ({$context}): JSON decode with JSON_INVALID_UTF8_IGNORE failed: " . json_last_error_msg());
            } else {
              error_log("Statistics decoder ({$context}): Successfully decoded with JSON_INVALID_UTF8_IGNORE!");
            }
          }
          
          // If still failing, try aggressive ASCII-only approach
          if (json_last_error() !== JSON_ERROR_NONE) {
            $ascii_only = preg_replace('/[^\x00-\x7F]/', '', $cleaned_string);
            $stats = @json_decode($ascii_only, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
              error_log("Statistics decoder ({$context}): ASCII-only JSON decode failed: " . json_last_error_msg());
            } else {
              error_log("Statistics decoder ({$context}): Successfully decoded with ASCII-only approach!");
            }
          }
          
          // Last resort: Try to manually parse the structure
          if (json_last_error() !== JSON_ERROR_NONE) {
            $stats = manual_parse_statistics($original_data, $context);
          }
        } else {
          error_log("Statistics decoder ({$context}): Successfully decoded with cleaned string!");
        }
      } else {
        error_log("Statistics decoder ({$context}): Successfully decoded with stripslashes!");
      }
    } else {
      error_log("Statistics decoder ({$context}): Successfully decoded on first attempt!");
    }
    
    // Log the successful result
    if (is_array($stats)) {
      $key_count = count($stats);
      error_log("Statistics decoder ({$context}): Final result is an array with {$key_count} elements");
      
      // Log key metrics if available
      $key_metrics = ['average_price', 'median_price', 'count', 'price_min', 'price_max', 'value'];
      $found_metrics = [];
      foreach ($key_metrics as $metric) {
        if (isset($stats[$metric])) {
          $found_metrics[] = "{$metric}:" . $stats[$metric];
        }
      }
      
      if (!empty($found_metrics)) {
        error_log("Statistics decoder ({$context}): Found key metrics: " . implode(', ', $found_metrics));
      }
      
      // Check for essential array data needed for charts
      $chart_data = ['histogram', 'price_history', 'comparable_sales'];
      foreach ($chart_data as $key) {
        if (isset($stats[$key]) && is_array($stats[$key])) {
          error_log("Statistics decoder ({$context}): Found {$key} with " . count($stats[$key]) . " items");
        } else {
          error_log("Statistics decoder ({$context}): Missing or invalid {$key} data");
        }
      }
      
      return $stats;
    }
    
    // If we reach here, something went wrong
    error_log("Statistics decoder ({$context}): Failed to decode statistics. All methods exhausted.");
    return [];
  } catch (Exception $e) {
    error_log("Statistics decoder ({$context}) exception: " . $e->getMessage());
    return [];
  }
}

/**
 * Manual fallback parser for cases where all JSON decode attempts fail
 * Attempts to extract key-value pairs from malformed JSON or PHP array strings
 * @param string $data The original data string
 * @param string $context Debug context
 * @return array Extracted statistics
 */
function manual_parse_statistics($data, $context = '') {
  error_log("Statistics decoder ({$context}): Attempting manual parsing as last resort");
  $stats = [];
  
  // Try to extract key-value pairs using a regex pattern
  $pattern = '/[\'"]?([a-zA-Z_][a-zA-Z0-9_]*)[\'"]?\s*[=:]>?\s*(?:[\'"](.*?)[\'"]|(-?\d+\.?\d*))/';
  if (preg_match_all($pattern, $data, $matches, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
      $key = $match[1];
      $value = isset($match[3]) && is_numeric($match[3]) ? floatval($match[3]) : (isset($match[2]) ? $match[2] : '');
      $stats[$key] = $value;
    }
  }
  
  // Check specifically for histogram, price_history, comparable_sales pattern
  $complex_patterns = [
    'histogram' => '/[\'"]?histogram[\'"]?\s*[=:]>?\s*\[(.*?)\]/s',
    'price_history' => '/[\'"]?price_history[\'"]?\s*[=:]>?\s*\[(.*?)\]/s',
    'comparable_sales' => '/[\'"]?comparable_sales[\'"]?\s*[=:]>?\s*\[(.*?)\]/s'
  ];
  
  foreach ($complex_patterns as $key => $pattern) {
    if (preg_match($pattern, $data, $matches)) {
      // Found a complex structure, try to parse it
      $content = $matches[1];
      
      // For simplicity in this fallback, just create a placeholder array
      $stats[$key] = [];
      
      // Try to count items based on object open braces
      $item_count = substr_count($content, '{');
      error_log("Statistics decoder ({$context}): Manual parsing found {$item_count} potential items in {$key}");
      
      // If we can extract numeric values for histogram, do it
      if ($key === 'histogram' && preg_match_all('/min[\'"]?\s*[=:]>?\s*(\d+).*?max[\'"]?\s*[=:]>?\s*(\d+).*?count[\'"]?\s*[=:]>?\s*(\d+)/s', $content, $hist_matches, PREG_SET_ORDER)) {
        foreach ($hist_matches as $idx => $hist_match) {
          $stats[$key][] = [
            'min' => intval($hist_match[1]),
            'max' => intval($hist_match[2]),
            'count' => intval($hist_match[3]),
            'height' => intval($hist_match[3]) * 10,  // Simple fallback formula
            'contains_target' => $idx === 2 // Assume middle bucket contains target (fallback)
          ];
        }
      }
    }
  }
  
  // Try to synthesize missing critical values
  if (!isset($stats['value']) && isset($stats['average_price'])) {
    $stats['value'] = $stats['average_price'];
  }
  
  if (empty($stats['percentile']) && isset($stats['value'])) {
    $stats['percentile'] = '50th'; // Default fallback
  }
  
  error_log("Statistics decoder ({$context}): Manual parsing extracted " . count($stats) . " fields");
  
  return $stats;
}

/**
 * Creates default/fallback statistics data when none is available
 * This should be used when the valuer agent doesn't return data or the JSON is completely corrupt
 * @param float $targetValue The expected value for the item
 * @return array A minimal set of statistics
 */
function create_fallback_statistics($targetValue = 5000) {
  // Calculate reasonable value ranges
  $min = round($targetValue * 0.7);
  $max = round($targetValue * 1.3);
  $median = round($targetValue * 0.95);
  $average = round($targetValue * 1.05);
  
  // Create dummy histogram
  $histogram = [
    [
      'min' => $min,
      'max' => round($min + ($max - $min) * 0.25),
      'count' => 2,
      'height' => 30,
      'contains_target' => false
    ],
    [
      'min' => round($min + ($max - $min) * 0.25),
      'max' => round($min + ($max - $min) * 0.5),
      'count' => 3,
      'height' => 40,
      'contains_target' => false
    ],
    [
      'min' => round($min + ($max - $min) * 0.5),
      'max' => round($min + ($max - $min) * 0.75),
      'count' => 7,
      'height' => 80,
      'contains_target' => true
    ],
    [
      'min' => round($min + ($max - $min) * 0.75),
      'max' => $max,
      'count' => 4,
      'height' => 50,
      'contains_target' => false
    ],
  ];
  
  // Create dummy price history (5 years)
  $currentYear = date('Y');
  $price_history = [];
  for ($i = 5; $i >= 0; $i--) {
    $year = $currentYear - $i;
    $yearValue = round($targetValue * (0.9 + ($i * 0.02)));
    $price_history[] = [
      'year' => (string)$year,
      'price' => $yearValue
    ];
  }
  
  // Create minimal comparable sales (just 3 examples)
  $comparable_sales = [
    [
      'title' => 'Similar Item #1',
      'house' => 'Auction House 1',
      'date' => date('Y-m-d', strtotime('-3 months')),
      'price' => round($targetValue * 1.1),
      'currency' => 'USD',
      'diff' => '+10%',
      'is_current' => false
    ],
    [
      'title' => 'Your Item',
      'house' => '-',
      'date' => 'Current',
      'price' => $targetValue,
      'currency' => 'USD',
      'diff' => '0.0%',
      'is_current' => true
    ],
    [
      'title' => 'Similar Item #2',
      'house' => 'Auction House 2',
      'date' => date('Y-m-d', strtotime('-6 months')),
      'price' => round($targetValue * 0.9),
      'currency' => 'USD',
      'diff' => '-10%',
      'is_current' => false
    ]
  ];
  
  // Compile the fallback statistics
  return [
    'count' => 10,
    'average_price' => $average,
    'median_price' => $median,
    'price_min' => $min,
    'price_max' => $max,
    'standard_deviation' => round(($max - $min) / 4),
    'coefficient_of_variation' => 15,
    'percentile' => '55th',
    'confidence_level' => 'Medium',
    'value' => $targetValue,
    'price_trend_percentage' => '+2.5%',
    'histogram' => $histogram, 
    'comparable_sales' => $comparable_sales,
    'price_history' => $price_history,
    'target_marker_position' => 55,
    'historical_significance' => 65,
    'investment_potential' => 57,
    'provenance_strength' => 70,
    'data_quality' => 'Medium - Generated Fallback'
  ];
}

/**
 * Check if statistics data is valid and has required fields
 * @param array $stats The statistics array to validate
 * @return bool True if statistics are valid
 */
function is_valid_statistics($stats) {
  if (!is_array($stats) || empty($stats)) {
    return false;
  }
  
  // Check for required top-level fields
  $required_fields = ['value', 'average_price', 'histogram', 'comparable_sales', 'price_history'];
  foreach ($required_fields as $field) {
    if (!isset($stats[$field])) {
      return false;
    }
  }
  
  // Check array fields
  $array_fields = ['histogram', 'comparable_sales', 'price_history'];
  foreach ($array_fields as $field) {
    if (!is_array($stats[$field]) || empty($stats[$field])) {
      return false;
    }
  }
  
  return true;
}