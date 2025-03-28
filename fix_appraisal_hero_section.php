<?php
/**
 * Plugin Name: Fix Appraisal Hero Section
 * Description: Fixes the oversized hero section for Appraisal CPT without adding external elements
 * Version: 1.0
 * Author: Claude
 */

// Add custom CSS to fix the hero section for Appraisal CPT
function fix_appraisal_hero_section() {
  // Only apply to single CPT appraisals
  if (!is_singular('appraisals')) {
    return;
  }
  
  ?>
  <style>
    /* Fix oversized hero section */
    body.single-appraisals .nv-post-cover {
      max-height: 420px;
      overflow: hidden;
    }
    
    /* Fix title display */
    body.single-appraisals .nv-post-cover h1.title.entry-title {
      font-size: 28px;
      line-height: 1.4;
      max-height: 200px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
      margin-bottom: 15px;
    }
    
    /* Add gradient overlay to make text more readable */
    body.single-appraisals .nv-post-cover .nv-overlay {
      background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)) !important;
      opacity: 1 !important;
    }
    
    /* Enhance breadcrumb styling */
    body.single-appraisals .nv-post-cover .nv--yoast-breadcrumb {
      opacity: 0.8;
      margin-bottom: 15px;
      font-size: 13px;
    }
    
    /* Better meta information styling */
    body.single-appraisals .nv-post-cover .nv-meta-list {
      margin-top: 10px;
      opacity: 0.8;
    }
    
    /* Responsive adjustments */
    @media (max-width: 767px) {
      body.single-appraisals .nv-post-cover {
        max-height: 300px;
      }
      
      body.single-appraisals .nv-post-cover h1.title.entry-title {
        font-size: 20px;
        -webkit-line-clamp: 3;
        max-height: 130px;
      }
    }
  </style>
  <?php
}
add_action('wp_head', 'fix_appraisal_hero_section');

/**
 * Add JavaScript to further control the title length
 */
function truncate_hero_title_script() {
  // Only apply to single CPT appraisals
  if (!is_singular('appraisals')) {
    return;
  }
  ?>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Find the hero title
      const heroTitle = document.querySelector('.nv-post-cover h1.title.entry-title');
      
      if (heroTitle) {
        // Get current title text
        const fullTitle = heroTitle.textContent;
        
        // Create shorter title (first sentence or up to 150 chars)
        let shortTitle = fullTitle.split('.')[0];
        if (shortTitle.length > 150) {
          shortTitle = shortTitle.substring(0, 150) + '...';
        } else {
          shortTitle += '.';
        }
        
        // Replace with shorter title
        heroTitle.textContent = shortTitle;
        
        // Store full title as data attribute for reference if needed
        heroTitle.setAttribute('data-full-title', fullTitle);
      }
    });
  </script>
  <?php
}
add_action('wp_footer', 'truncate_hero_title_script');