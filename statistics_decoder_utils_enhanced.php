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
  $sample = substr($statistics_data, 0, 100);
  error_log("Statistics decoder ({$context}): Sample data: " . addslashes($sample) . "...");
  
  try {
    // Keep original for debugging
    $original_data = $statistics_data;
    
    // Fix PHP-style array notation that might have corrupted the JSON
    // Convert "key => value" to "key": "value"
    $php_array_pattern = '/([\'"]?\w+[\'"]?)\s*=>\s*([\'"]?\w+[\'"]?|true|false)/';
    $fixed_data = preg_replace($php_array_pattern, '"$1": $2', $statistics_data);
    
    // Fix array separator commas that might be missing
    $fixed_data = preg_replace('/}(\s*){/', '},{', $fixed_data);
    $fixed_data = preg_replace('/](\s*)\[/', '],[', $fixed_data);
    
    // Try direct JSON decoding first
    $stats = @json_decode($fixed_data, true);
    
    // If direct decode fails, try with stripslashes (WordPress standard)
    if (json_last_error() !== JSON_ERROR_NONE) {
      error_log("Statistics decoder ({$context}): Initial JSON decode failed, trying stripslashes: " . json_last_error_msg());
      
      $stripped_data = stripslashes($fixed_data);
      $stats = @json_decode($stripped_data, true);
      
      // If still failing, apply comprehensive character replacement
      if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Statistics decoder ({$context}): JSON decode with stripslashes failed: " . json_last_error_msg());
        
        // Hex UTF-8 multibyte sequences
        $hex_replacements = array(
          "\xE2\x80\x9C" => '"', // Left double quote
          "\xE2\x80\x9D" => '"', // Right double quote
          "\xE2\x80\x98" => "'", // Left single quote
          "\xE2\x80\x99" => "'", // Right single quote
          "\xE2\x80\xA2" => "-", // Bullet point
          "\xC2\xA0" => " "      // Non-breaking space
        );
        
        // Unicode codepoint syntax for PHP 7+
        $unicode_replacements = array(
          "\u{201C}" => '"', // Left double quote
          "\u{201D}" => '"', // Right double quote
          "\u{2018}" => "'", // Left single quote
          "\u{2019}" => "'", // Right single quote
          "\u{2022}" => "-", // Bullet point
          "\u{00A0}" => " "  // Non-breaking space
        );
        
        // HTML entities that might be in the data
        $html_replacements = array(
          '&quot;' => '"',
          '&apos;' => "'",
          '&lsquo;' => "'",
          '&rsquo;' => "'",
          '&ldquo;' => '"',
          '&rdquo;' => '"',
          '&nbsp;' => ' ',
          '&bull;' => '-'
        );
        
        // Apply all replacement approaches
        $cleaned_string = str_replace(array_keys($hex_replacements), array_values($hex_replacements), $stripped_data);
        $cleaned_string = str_replace(array_keys($unicode_replacements), array_values($unicode_replacements), $cleaned_string);
        $cleaned_string = str_replace(array_keys($html_replacements), array_values($html_replacements), $cleaned_string);
        
        // Remove all control characters and other problematic bytes
        $pattern = '/[\x00-\x1F\x7F-\x9F\xA0]/u';
        $cleaned_string = preg_replace($pattern, ' ', $cleaned_string);
        
        // Fix common JSON syntax issues
        $cleaned_string = preg_replace('/,\s*}/', '}', $cleaned_string);  // Remove trailing commas in objects
        $cleaned_string = preg_replace('/,\s*\]/', ']', $cleaned_string); // Remove trailing commas in arrays
        $cleaned_string = preg_replace('/(\\\)+\"/', '\\"', $cleaned_string); // Fix double-escaped quotes
        
        // Try to decode the cleaned string
        $stats = @json_decode($cleaned_string, true);
        
        // Log the results of JSON decoding with clean string
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
  } catch (Exception $e) {
    error_log("Statistics decoder ({$context}) exception: " . $e->getMessage());
    return [];
  }
  
  // Return decoded statistics, which will be an empty array if decoding failed
  return $stats;
}

/**
 * Manual parser for heavily corrupted statistics data
 * This function attempts to extract key statistics when JSON parsing fails
 */
function manual_parse_statistics($data_string, $context = '') {
  error_log("Statistics decoder ({$context}): Attempting manual parsing as last resort");
  
  $stats = [];
  
  // Extract simple key-value pairs using regex
  $patterns = [
    'count' => '/[\'"]?count[\'"]?\s*[:=]>\s*(\d+)/',
    'average_price' => '/[\'"]?average_price[\'"]?\s*[:=]>\s*(\d+)/',
    'median_price' => '/[\'"]?median_price[\'"]?\s*[:=]>\s*(\d+)/',
    'price_min' => '/[\'"]?price_min[\'"]?\s*[:=]>\s*(\d+)/',
    'price_max' => '/[\'"]?price_max[\'"]?\s*[:=]>\s*(\d+)/',
    'standard_deviation' => '/[\'"]?standard_deviation[\'"]?\s*[:=]>\s*(\d+)/',
    'coefficient_of_variation' => '/[\'"]?coefficient_of_variation[\'"]?\s*[:=]>\s*([\d\.]+)/',
    'percentile' => '/[\'"]?percentile[\'"]?\s*[:=]>\s*[\'"]?([^\'",}]+)[\'"]?/',
    'confidence_level' => '/[\'"]?confidence_level[\'"]?\s*[:=]>\s*[\'"]?([^\'",}]+)[\'"]?/',
    'price_trend_percentage' => '/[\'"]?price_trend_percentage[\'"]?\s*[:=]>\s*[\'"]?([^\'",}]+)[\'"]?/',
    'value' => '/[\'"]?value[\'"]?\s*[:=]>\s*(\d+)/',
  ];
  
  foreach ($patterns as $key => $pattern) {
    if (preg_match($pattern, $data_string, $matches)) {
      if (is_numeric($matches[1])) {
        $stats[$key] = floatval($matches[1]);
      } else {
        $stats[$key] = $matches[1];
      }
    }
  }
  
  // Try to extract histogram data using a more complex approach
  if (preg_match('/[\'"]?histogram[\'"]?\s*[:=]>\s*\[(.*?)\]/s', $data_string, $histogram_matches)) {
    $histogram_text = $histogram_matches[1];
    $histograms = [];
    
    // Split by commas that are not within objects
    $depth = 0;
    $start = 0;
    $blocks = [];
    
    for ($i = 0; $i < strlen($histogram_text); $i++) {
      $char = $histogram_text[$i];
      if ($char === '{') {
        $depth++;
        if ($depth === 1) {
          $start = $i;
        }
      } elseif ($char === '}') {
        $depth--;
        if ($depth === 0) {
          $blocks[] = substr($histogram_text, $start, $i - $start + 1);
        }
      }
    }
    
    // Now try to extract values from each block
    foreach ($blocks as $block) {
      $item = [];
      
      if (preg_match('/min\s*[:=]>\s*(\d+)/', $block, $matches)) {
        $item['min'] = intval($matches[1]);
      }
      
      if (preg_match('/max\s*[:=]>\s*(\d+)/', $block, $matches)) {
        $item['max'] = intval($matches[1]);
      }
      
      if (preg_match('/count\s*[:=]>\s*(\d+)/', $block, $matches)) {
        $item['count'] = intval($matches[1]);
      }
      
      if (preg_match('/height\s*[:=]>\s*(\d+)/', $block, $matches)) {
        $item['height'] = intval($matches[1]);
      }
      
      if (preg_match('/contains_target\s*[:=]>\s*(true|false)/', $block, $matches)) {
        $item['contains_target'] = ($matches[1] === 'true');
      }
      
      if (!empty($item)) {
        $histograms[] = $item;
      }
    }
    
    if (!empty($histograms)) {
      $stats['histogram'] = $histograms;
    }
  }
  
  // Log the manual parsing results
  error_log("Statistics decoder ({$context}): Manual parsing extracted " . count($stats) . " fields");
  
  return $stats;
}