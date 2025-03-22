/**
 * This file contains the shortcode definitions that will be added to WordPress
 * through the functions.php file. These are not registered programmatically
 * but should be manually copied to the WordPress theme's functions.php file.
 */

const SHORTCODE_DEFINITIONS = [
  {
    name: 'get_percentage',
    description: 'Renders a percentage value for use in circular charts',
    php_code: `
    // Convert ACF field to simple percentage value
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
    `
  },
  {
    name: 'appraisal_report',
    description: 'Displays formatted metadata fields for the appraisal report',
    php_code: `
    // Display appraisal report metadata
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
    `
  },
  {
    name: 'display_publish_date',
    description: 'Displays the formatted publication date',
    php_code: `
    // Display formatted publish date
    function display_publish_date_shortcode() {
      $post_date = get_the_date('F j, Y');
      return '<p class="publish-date">Effective date: ' . $post_date . '</p>';
    }
    add_shortcode('display_publish_date', 'display_publish_date_shortcode');
    `
  },
  {
    name: 'display_html_content',
    description: 'Displays HTML content from metadata fields without escaping',
    php_code: `
    // Display HTML content from metadata fields without escaping
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
    `
  }
];

// Export shortcode definitions for documentation purposes
module.exports = {
  SHORTCODE_DEFINITIONS
};