<?php
/**
 * Snippet Name: Format Table Shortcode
 * Description: Formats the glossary data in the appraisal summary panel
 * Snippet Type: Function
 */

function format_table_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'table',
  ), $atts);
  
  $field_name = $atts['field_name'];
  $content = get_post_meta(get_the_ID(), $field_name, true);
  
  if (empty($content)) return '';
  
  // Format the content into a structured HTML with definition list
  $items = explode('-', $content);
  $formatted = '<div class="nutshell-details">';
  $formatted .= '<h3>Artwork Details</h3>';
  $formatted .= '<dl>';
  
  foreach ($items as $item) {
    $item = trim($item);
    if (empty($item)) continue;
    
    $parts = explode(':', $item, 2);
    if (count($parts) === 2) {
      $key = trim($parts[0]);
      $value = trim($parts[1]);
      
      $formatted .= '<dt>' . esc_html($key) . '</dt>';
      $formatted .= '<dd>' . esc_html($value) . '</dd>';
    }
  }
  
  $formatted .= '</dl>';
  $formatted .= '</div>';
  return $formatted;
}
add_shortcode('format_table', 'format_table_shortcode');