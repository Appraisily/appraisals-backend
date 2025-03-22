<?php
/**
 * Snippet Name: Display Publish Date Shortcode
 * Description: Display formatted publish date for appraisals
 * Snippet Type: Function
 */

function display_publish_date_shortcode() {
  $post_date = get_the_date('F j, Y');
  return '<p class="publish-date">Effective date: ' . $post_date . '</p>';
}
add_shortcode('display_publish_date', 'display_publish_date_shortcode');