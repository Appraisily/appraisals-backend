<?php
/**
 * Plugin Name: Simple Hero Section Fix
 * Description: Makes the hero section smaller with smaller font, without any additional elements
 * Version: 1.0
 * Author: Claude
 */

// Add custom CSS to fix only the hero section size and font
function simple_hero_section_fix() {
  // Only apply to single appraisals CPT
  if (!is_singular('appraisals')) {
    return;
  }
  
  ?>
  <style>
    /* Fix hero section height */
    body.single-appraisals .nv-post-cover {
      max-height: 350px !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }
    
    /* Make title font smaller */
    body.single-appraisals .nv-post-cover h1.title.entry-title {
      font-size: 20px !important;
      line-height: 1.4 !important;
      max-width: 100% !important;
    }
    
    /* Improve background gradient */
    body.single-appraisals .nv-post-cover .nv-overlay {
      background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)) !important;
      opacity: 1 !important;
    }
    
    /* Responsive adjustments */
    @media (max-width: 767px) {
      body.single-appraisals .nv-post-cover {
        max-height: 250px !important;
      }
      
      body.single-appraisals .nv-post-cover h1.title.entry-title {
        font-size: 16px !important;
      }
    }
  </style>
  <?php
}
add_action('wp_head', 'simple_hero_section_fix', 100); // High priority to override theme styles