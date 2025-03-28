<?php
/**
 * Plugin Name: Enhanced Appraisal Post Styling
 * Description: Adds professional styling to appraisal posts without changing the Neve theme structure
 * Version: 1.0
 * Author: Claude
 */

// Add custom CSS to the site header
function enhanced_appraisal_post_styles() {
  // Only apply to single appraisals CPT
  if (!is_singular('appraisals')) {
    return;
  }
  
  ?>
  <style>
    /* Enhanced Post Layout for Appraisals */
    .single-appraisals article.post {
      max-width: 1200px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      overflow: hidden;
      padding: 0;
    }
    
    /* Post Header Section */
    .single-appraisals .entry-header {
      background: linear-gradient(135deg, #2c5282, #3182ce);
      color: white;
      padding: 40px 50px;
      margin-bottom: 40px;
      position: relative;
    }
    
    .single-appraisals .entry-title {
      font-size: 32px;
      line-height: 1.3;
      margin-bottom: 15px;
      max-width: 80%;
      color: white;
    }
    
    .single-appraisals .nv-meta-list {
      margin-top: 20px;
      opacity: 0.8;
      color: white;
    }
    
    .single-appraisals .nv-meta-list a {
      color: white;
    }
    
    /* Post Content */
    .single-appraisals .entry-content {
      padding: 0 50px 50px;
      font-size: 16px;
      line-height: 1.7;
    }
    
    /* Improved Typography */
    .single-appraisals .entry-content p {
      margin-bottom: 1.5em;
      font-size: 16px;
      line-height: 1.7;
      color: #333;
    }
    
    .single-appraisals .entry-content h2 {
      font-size: 28px;
      margin-top: 40px;
      margin-bottom: 20px;
      color: #2c5282;
    }
    
    .single-appraisals .entry-content h3 {
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #2c5282;
    }
    
    .single-appraisals .entry-content h4 {
      font-size: 20px;
      margin-top: 25px;
      margin-bottom: 15px;
      color: #3182ce;
    }
    
    /* Author Box Styling */
    .single-appraisals .nv-author-bio {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 30px;
      margin: 50px 0;
    }
    
    .single-appraisals .nv-author-bio .nv-author-bio-name {
      font-size: 20px;
      color: #2c5282;
    }
    
    .single-appraisals .nv-author-bio .nv-author-bio-text {
      font-size: 15px;
      line-height: 1.6;
    }
    
    .single-appraisals .nv-author-bio .nv-author-bio-img {
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    /* Value Display */
    .appraisal-value-overlay {
      position: absolute;
      top: 40px;
      right: 50px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(5px);
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .appraisal-value-label {
      display: block;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 1px;
      margin-bottom: 5px;
      opacity: 0.9;
    }
    
    .appraisal-value-amount {
      font-size: 24px;
      font-weight: 700;
    }
    
    /* Image Styling */
    .single-appraisals .wp-block-image img {
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .single-appraisals figure.wp-block-image figcaption {
      margin-top: 10px;
      font-size: 14px;
      text-align: center;
      color: #64748b;
    }
    
    /* PDF Download Button */
    .pdf-download-button {
      display: inline-flex;
      align-items: center;
      background-color: #3182ce;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      transition: all 0.2s ease;
      text-decoration: none;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .pdf-download-button:hover {
      background-color: #2c5282;
      transform: translateY(-2px);
      box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
      color: white;
    }
    
    .pdf-download-button svg {
      margin-right: 10px;
    }
    
    /* Summary Table at the End */
    .appraisal-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .appraisal-summary-table th {
      background: #f1f5f9;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      color: #2c5282;
      width: 30%;
    }
    
    .appraisal-summary-table td {
      padding: 12px 15px;
      border: 1px solid #e2e8f0;
    }
    
    .appraisal-summary-table tr:hover {
      background-color: #f8fafc;
    }
    
    /* Responsive Adjustments */
    @media (max-width: 767px) {
      .single-appraisals .entry-header {
        padding: 30px 20px;
      }
      
      .single-appraisals .entry-content {
        padding: 0 20px 30px;
      }
      
      .single-appraisals .entry-title {
        font-size: 24px;
        max-width: 100%;
      }
      
      .appraisal-value-overlay {
        position: relative;
        top: auto;
        right: auto;
        margin-top: 20px;
        width: 100%;
      }
    }
  </style>
  <?php
}
add_action('wp_head', 'enhanced_appraisal_post_styles');

/**
 * Add a value display overlay to the post header
 */
function add_appraisal_value_display($content) {
  // Only apply to single appraisals CPT
  if (!is_singular('appraisals')) {
    return $content;
  }
  
  // Get appraisal value from ACF field
  $value = get_field('value');
  if (!$value) {
    return $content;
  }
  
  // Format the value
  $formatted_value = '$' . number_format($value) . ' USD';
  
  // Add value overlay HTML
  $value_overlay = '<div class="appraisal-value-overlay">';
  $value_overlay .= '<span class="appraisal-value-label">Appraised Value</span>';
  $value_overlay .= '<span class="appraisal-value-amount">' . $formatted_value . '</span>';
  $value_overlay .= '</div>';
  
  // Add a script to move the value overlay into the header
  $script = '<script>
    document.addEventListener("DOMContentLoaded", function() {
      var valueOverlay = document.querySelector(".appraisal-value-overlay");
      var header = document.querySelector(".entry-header");
      
      if (valueOverlay && header) {
        header.appendChild(valueOverlay);
      }
    });
  </script>';
  
  return $value_overlay . $content . $script;
}
add_filter('the_content', 'add_appraisal_value_display', 10);

/**
 * Format the PDF download button with icon
 */
function enhance_pdf_download_shortcode($atts) {
  // Use the original function
  $original_output = pdf_download_shortcode($atts);
  
  // If empty output, return empty
  if (empty($original_output)) {
    return '';
  }
  
  // Get PDF link from ACF
  $pdf_link = get_field('pdflink');
  if (empty($pdf_link)) {
    return '';
  }
  
  // Create enhanced button
  $enhanced_button = '
  <a href="' . esc_url($pdf_link) . '" target="_blank" class="pdf-download-button">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
      <path d="M12 17v-6"></path>
      <path d="M9 14l3 3l3 -3"></path>
    </svg>
    Download Appraisal Report (PDF)
  </a>';
  
  return $enhanced_button;
}

// Make sure the original function exists before replacing it
add_action('init', function() {
  if (function_exists('pdf_download_shortcode')) {
    remove_shortcode('pdf_download');
    add_shortcode('pdf_download', 'enhance_pdf_download_shortcode');
  }
});

/**
 * Add a summary table at the end of the post
 */
function add_appraisal_summary_table($content) {
  // Only apply to single appraisals CPT
  if (!is_singular('appraisals')) {
    return $content;
  }
  
  // Define fields to display in the summary table
  $fields = [
    'creator' => 'Artist/Creator',
    'object_type' => 'Object Type',
    'estimated_age' => 'Period/Age',
    'medium' => 'Medium',
    'dimensions' => 'Dimensions',
    'condition_summary' => 'Condition',
    'value' => 'Appraised Value',
    'rarity' => 'Rarity',
    'market_demand' => 'Market Demand'
  ];
  
  // Start building the table
  $table = '<h3>Appraisal Summary</h3>';
  $table .= '<table class="appraisal-summary-table">';
  
  // Loop through fields and add rows
  foreach ($fields as $field_name => $label) {
    $value = get_field($field_name);
    
    // Skip empty values
    if (empty($value)) {
      continue;
    }
    
    // Format value for the Value field
    if ($field_name === 'value') {
      $value = '$' . number_format($value) . ' USD';
    }
    
    // Format percentages
    if (in_array($field_name, ['rarity', 'market_demand']) && is_numeric($value)) {
      $value = $value . '%';
    }
    
    $table .= '<tr>';
    $table .= '<th>' . $label . '</th>';
    $table .= '<td>' . $value . '</td>';
    $table .= '</tr>';
  }
  
  $table .= '</table>';
  
  // Add the table at the end of content
  return $content . $table;
}
add_filter('the_content', 'add_appraisal_summary_table', 20);

/**
 * Add smooth scrolling and other UI enhancements
 */
function add_ui_enhancements() {
  // Only apply to single appraisals CPT
  if (!is_singular('appraisals')) {
    return;
  }
  ?>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      // Smooth scrolling for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          
          const targetId = this.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 80,
              behavior: 'smooth'
            });
          }
        });
      });
      
      // Add sticky behavior to PDF download button on scroll
      const pdfButton = document.querySelector('.pdf-download-button');
      const originalPosition = pdfButton ? pdfButton.getBoundingClientRect().top + window.pageYOffset : 0;
      
      if (pdfButton) {
        window.addEventListener('scroll', function() {
          if (window.pageYOffset > originalPosition + 200) {
            pdfButton.classList.add('sticky');
            pdfButton.style.position = 'fixed';
            pdfButton.style.top = '20px';
            pdfButton.style.right = '20px';
            pdfButton.style.zIndex = '100';
          } else {
            pdfButton.classList.remove('sticky');
            pdfButton.style.position = '';
            pdfButton.style.top = '';
            pdfButton.style.right = '';
            pdfButton.style.zIndex = '';
          }
        });
      }
    });
  </script>
  <?php
}
add_action('wp_footer', 'add_ui_enhancements');