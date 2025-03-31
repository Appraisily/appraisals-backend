<?php
/**
 * Appraisal Card Shortcode for WordPress
 * 
 * Uses pre-rendered HTML stored in ACF fields to display the appraisal card visualization
 * 
 * Usage:
 * [display_appraisal_card field_name="appraisal_card_html" default="No data available"]
 */
function display_appraisal_card_shortcode($atts) {
    // Extract shortcode attributes
    $atts = shortcode_atts(array(
        'field_name' => 'appraisal_card_html',
        'default' => 'No appraisal card data available for this item.'
    ), $atts, 'display_appraisal_card');
    
    // Get the field value from ACF
    $field_name = sanitize_text_field($atts['field_name']);
    $default_text = sanitize_text_field($atts['default']);
    
    // Check if we're in a post
    if (!is_singular()) {
        return '<div class="appraisal-card-notice">' . $default_text . '</div>';
    }
    
    // Get the current post ID
    $post_id = get_the_ID();
    
    // Get the HTML content from ACF
    $html_content = get_field($field_name, $post_id);
    
    // Return the HTML content or default message
    if (!empty($html_content)) {
        return $html_content;
    } else {
        return '<div class="appraisal-card-notice">' . $default_text . '</div>';
    }
}
add_shortcode('display_appraisal_card', 'display_appraisal_card_shortcode');
?>