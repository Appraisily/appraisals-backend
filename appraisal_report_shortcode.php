<?php
/**
 * Snippet Name: Appraisal Report Shortcode
 * Description: Display appraisal report metadata
 * Snippet Type: Function
 */

function appraisal_report_shortcode($atts) {
  $atts = shortcode_atts(array(
    'meta_key' => '',
  ), $atts);

  $meta_key = $atts['meta_key'];

  if (empty($meta_key)) {
    return '';
  }

  $value = get_field($meta_key);
  if (empty($value)) {
    return '';
  }

  return $value;
}
add_shortcode('appraisal_report', 'appraisal_report_shortcode');