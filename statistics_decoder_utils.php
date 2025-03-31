/**
 * Utility functions for safely decoding and handling statistics metadata
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
  
  try {
    // Keep original for debugging
    $original_data = $statistics_data;
    
    // Try direct JSON decoding first
    $stats = @json_decode($statistics_data, true);
    
    // If direct decode fails, try with stripslashes (WordPress standard)
    if (json_last_error() !== JSON_ERROR_NONE) {
      $stripped_data = stripslashes($statistics_data);
      $stats = @json_decode($stripped_data, true);
      
      // If still failing, apply comprehensive character replacement
      if (json_last_error() !== JSON_ERROR_NONE) {
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
        
        // Last resort methods if still failing
        if (json_last_error() !== JSON_ERROR_NONE) {
          // Try with PHP 7.2+ JSON_INVALID_UTF8_IGNORE flag
          if (defined('JSON_INVALID_UTF8_IGNORE')) {
            $stats = @json_decode($cleaned_string, true, 512, JSON_INVALID_UTF8_IGNORE);
          }
          
          // If still failing, try aggressive ASCII-only approach
          if (json_last_error() !== JSON_ERROR_NONE) {
            $ascii_only = preg_replace('/[^\x00-\x7F]/', '', $cleaned_string);
            $stats = @json_decode($ascii_only, true);
          }
        }
      }
    }
    
    // Log any errors for debugging
    if (json_last_error() !== JSON_ERROR_NONE) {
      $error_msg = json_last_error_msg();
      error_log("Statistics decoder ({$context}) error: {$error_msg}");
      error_log("Statistics decoder ({$context}) sample: " . substr($original_data, 0, 100) . "...");
    }
    
  } catch (Exception $e) {
    error_log("Statistics decoder ({$context}) exception: " . $e->getMessage());
    return [];
  }
  
  // Return decoded statistics, which will be an empty array if decoding failed
  return $stats;
}