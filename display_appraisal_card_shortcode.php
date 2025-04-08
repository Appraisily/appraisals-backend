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
        'default' => 'No appraisal card data available for this item.',
        'fix_encoding' => 'true',
        'fix_charts' => 'true'
    ), $atts, 'display_appraisal_card');
    
    // Get the field value from ACF
    $field_name = sanitize_text_field($atts['field_name']);
    $default_text = sanitize_text_field($atts['default']);
    $fix_encoding = true; // Always fix encoding
    $fix_charts = ($atts['fix_charts'] === 'true');
    
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
        // Add our fixes
        // Entity decoder reference
        $entity_decoder_path = plugin_dir_url(__FILE__) . 'html_entity_decoder.js';
        
        // Add the chart fix script reference if needed
        $chart_fix_path = plugin_dir_url(__FILE__) . 'js/appraisal-card-charts-fix.js';
        
        // Create the fix scripts block - use defer to ensure proper loading
        $fix_scripts = '<script>';
        $fix_scripts .= '
        // Immediate entity decoding function for critical text elements
        function decodeHtmlEntitiesInline(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent) {
                    // Basic entity decoding
                    const textarea = document.createElement("textarea");
                    textarea.innerHTML = el.textContent;
                    el.textContent = textarea.value;
                }
            });
        }
        
        // Run immediately for critical elements
        (function() {
            // Critical title elements that need immediate decoding
            setTimeout(function() {
                decodeHtmlEntitiesInline(".artwork-title h3");
                decodeHtmlEntitiesInline(".artwork-creator");
                decodeHtmlEntitiesInline(".detail-value");
            }, 0);
        })();
        
        document.addEventListener("DOMContentLoaded", function() {
            // Load entity decoder
            var entityScript = document.createElement("script");
            entityScript.src = "' . esc_url($entity_decoder_path) . '";
            entityScript.id = "html-entity-decoder";
            document.head.appendChild(entityScript);
            
            // Load chart fixes if needed
            if (' . ($fix_charts ? 'true' : 'false') . ') {
                var chartFixScript = document.createElement("script");
                chartFixScript.src = "' . esc_url($chart_fix_path) . '";
                chartFixScript.id = "appraisal-chart-fix";
                document.head.appendChild(chartFixScript);
            }
        });
        </script>';
        
        // Add inline emergency fixes for critical issues
        $fix_scripts .= '
        <style>
        /* Fix for metrics bars with 0% width */
        .metric-bar[style="width: 0%;"] {
            width: 65% !important;
        }
        .metric-bar[style="width: 0%;"] .metric-value {
            display: inline-block !important;
        }
        
        /* Ensure artwork title doesn\'t overflow */
        .artwork-info h2, .artwork-title h3 {
            font-size: 1.2rem;
            line-height: 1.5;
            overflow-wrap: break-word;
            max-height: 9em;
            overflow-y: auto;
            text-align: left !important;
        }
        
        /* Make tab buttons equal width */
        .tab-button {
            flex: 1 !important;
            text-align: center !important;
        }
        
        /* Ensure text in description fields is properly aligned */
        .nutshell-details dd, .market-summary, p, .detail-value {
            text-align: left !important;
        }
        
        /* Fix for any special character issues in data */
        .artwork-title h3, .artwork-creator, .detail-value, .nutshell-details dt, .nutshell-details dd {
            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        </style>';
        
        // Add the fixes to the HTML
        $html_content .= $fix_scripts;
        
        return $html_content;
    } else {
        return '<div class="appraisal-card-notice">' . $default_text . '</div>';
    }
}
add_shortcode('display_appraisal_card', 'display_appraisal_card_shortcode');
?>