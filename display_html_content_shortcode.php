<?php
/**
 * Snippet Name: Display HTML Content Shortcode
 * Description: Displays HTML content from metadata fields without escaping
 * Snippet Type: Function
 */

function display_html_content_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => '',
    'default' => ''
  ), $atts);
  
  $field_name = $atts['field_name'];
  $default = $atts['default'];
  
  if (empty($field_name)) {
    return $default;
  }
  
  $value = get_field($field_name);
  if (empty($value)) {
    return $default;
  }
  
  // Return HTML content unescaped
  return $value;
}
add_shortcode('display_html_content', 'display_html_content_shortcode');