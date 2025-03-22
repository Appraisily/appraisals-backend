<?php
/**
 * Snippet Name: Get Percentage Shortcode
 * Description: Converts ACF field to simple percentage value for visualization
 * Snippet Type: Function
 */

function get_percentage_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => '',
    'default' => '75'
  ), $atts);

  $field_name = $atts['field_name'];
  $default = $atts['default'];

  if (empty($field_name)) {
    return $default;
  }

  $value = get_field($field_name);
  if (empty($value) || !is_numeric($value)) {
    return $default;
  }

  // Ensure it's a valid number between 0-100
  $percentage = max(0, min(100, intval($value)));
  return $percentage;
}
add_shortcode('get_percentage', 'get_percentage_shortcode');