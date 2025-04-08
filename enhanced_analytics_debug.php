<?php
/**
 * Enhanced Analytics Debugging Utility
 * 
 * This file provides a test endpoint to debug the enhanced analytics data flow
 * between valuer-agent and WordPress.
 * 
 * Usage: 
 * 1. Place this file in the appraisals-backend directory
 * 2. Call it via: /wp-content/plugins/your-plugin/appraisals-backend/enhanced_analytics_debug.php?post_id=123
 * 3. Optional parameters: ?post_id=123&debug=true&raw=true&rebuild=true
 */

// Include WordPress
define('WP_USE_THEMES', false);
require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

// Include the statistics decoder utilities
require_once(dirname(__FILE__) . '/statistics_decoder_utils_enhanced.php');

// Security check - only admin users can see this
if (!current_user_can('administrator')) {
    http_response_code(403);
    die('Access denied. Admin privileges required.');
}

// Get parameters
$post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
$debug = isset($_GET['debug']) && $_GET['debug'] === 'true';
$show_raw = isset($_GET['raw']) && $_GET['raw'] === 'true';
$rebuild = isset($_GET['rebuild']) && $_GET['rebuild'] === 'true';

// Helper function to output information
function output_section($title, $content, $is_code = false) {
    echo '<div style="margin-bottom: 20px;">';
    echo '<h3>' . esc_html($title) . '</h3>';
    
    if ($is_code) {
        echo '<pre style="background:#f5f5f5; padding:10px; overflow:auto; max-height:300px; font-size:12px; border:1px solid #ddd;">';
        echo htmlspecialchars($content);
        echo '</pre>';
    } else {
        echo '<div>' . $content . '</div>';
    }
    
    echo '</div>';
}

// Start the debugging output
?>
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced Analytics Debug</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 { border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        h2 { margin-top: 30px; color: #333; }
        h3 { margin-top: 20px; color: #555; }
        .error { color: red; font-weight: bold; }
        .success { color: green; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        .data-flow { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
        .step { padding: 15px; border: 1px solid #ddd; border-radius: 4px; position: relative; }
        .step h4 { margin-top: 0; }
        .step:after { content: "↓"; position: absolute; bottom: -20px; left: 50%; font-size: 20px; }
        .step:last-child:after { display: none; }
        .tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 15px; }
        .tab { padding: 8px 15px; cursor: pointer; background: #f5f5f5; margin-right: 5px; border-radius: 4px 4px 0 0; }
        .tab.active { background: #fff; border: 1px solid #ddd; border-bottom: none; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
    </style>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Hide all content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Deactivate all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Activate clicked tab and its content
                this.classList.add('active');
                document.getElementById(this.dataset.target).classList.add('active');
            });
        });
        
        // Activate first tab by default
        if (tabs.length > 0) {
            tabs[0].click();
        }
    });
    </script>
</head>
<body>
    <h1>Enhanced Analytics Debugging Tool</h1>
    
    <?php if ($post_id === 0): ?>
        <div class="error">
            <p>No post ID specified. Please add a post_id parameter to the URL.</p>
            <p>Example: <?php echo esc_url($_SERVER['PHP_SELF'] . '?post_id=123'); ?></p>
        </div>
    <?php else: ?>
        <h2>Post Information</h2>
        <?php
        $post = get_post($post_id);
        if (!$post) {
            echo '<div class="error">Post ID ' . esc_html($post_id) . ' not found.</div>';
        } else {
            echo '<p><strong>Title:</strong> ' . esc_html($post->post_title) . '</p>';
            echo '<p><strong>Type:</strong> ' . esc_html($post->post_type) . '</p>';
            echo '<p><strong>Status:</strong> ' . esc_html($post->post_status) . '</p>';
            
            // Debugging steps
            echo '<h2>Data Flow Analysis</h2>';
            echo '<div class="data-flow">';
            
            // Step 1: Check for raw statistics data
            echo '<div class="step">';
            echo '<h4>Step 1: Raw Statistics Data</h4>';
            
            $stats_field = 'statistics';
            $statistics_data = get_post_meta($post_id, $stats_field, true);
            if (empty($statistics_data)) {
                $statistics_data = get_field($stats_field, $post_id);
            }
            
            if (empty($statistics_data)) {
                echo '<div class="error">No statistics data found in field "' . esc_html($stats_field) . '"</div>';
                
                // Check for alternative fields
                $alternative_fields = ['enhanced_stats', 'valuer_statistics', 'market_data'];
                $found_alt = false;
                
                foreach ($alternative_fields as $alt_field) {
                    $alt_data = get_field($alt_field, $post_id);
                    if (!empty($alt_data)) {
                        echo '<div class="warning">Found alternative data in field "' . esc_html($alt_field) . '"</div>';
                        $found_alt = true;
                        $stats_field = $alt_field;
                        $statistics_data = $alt_data;
                        break;
                    }
                }
                
                if (!$found_alt) {
                    echo '<div class="warning">No statistics data found in any expected field</div>';
                }
            } else {
                echo '<div class="success">Statistics data found in field "' . esc_html($stats_field) . '"</div>';
                echo '<p>Data type: ' . gettype($statistics_data) . ', length: ' . 
                      (is_string($statistics_data) ? strlen($statistics_data) : 'N/A') . '</p>';
            }
            
            if ($show_raw && !empty($statistics_data)) {
                if (is_string($statistics_data)) {
                    output_section('Raw Statistics Data', $statistics_data, true);
                } else {
                    output_section('Raw Statistics Data', print_r($statistics_data, true), true);
                }
            }
            echo '</div>'; // End step 1
            
            // Step 2: Decode statistics
            echo '<div class="step">';
            echo '<h4>Step 2: Decode Statistics Data</h4>';
            
            if (empty($statistics_data)) {
                echo '<div class="error">Cannot proceed without statistics data</div>';
                $decoded_stats = [];
            } else {
                try {
                    $decoded_stats = safe_decode_statistics($statistics_data, 'Debug Tool');
                    
                    if (is_array($decoded_stats) && !empty($decoded_stats)) {
                        echo '<div class="success">Successfully decoded statistics with ' . count($decoded_stats) . ' elements</div>';
                        
                        // Check for required fields
                        $required_fields = ['value', 'average_price', 'histogram', 'comparable_sales', 'price_history'];
                        $missing_fields = [];
                        
                        foreach ($required_fields as $field) {
                            if (!isset($decoded_stats[$field])) {
                                $missing_fields[] = $field;
                            }
                        }
                        
                        if (!empty($missing_fields)) {
                            echo '<div class="warning">Missing required fields: ' . implode(', ', $missing_fields) . '</div>';
                        } else {
                            echo '<div class="success">All required fields present</div>';
                        }
                        
                        // Check array fields
                        $array_fields = ['histogram', 'comparable_sales', 'price_history'];
                        foreach ($array_fields as $field) {
                            if (isset($decoded_stats[$field])) {
                                if (is_array($decoded_stats[$field])) {
                                    $count = count($decoded_stats[$field]);
                                    echo '<p><strong>' . esc_html($field) . ':</strong> ' . $count . ' items</p>';
                                    
                                    if ($count === 0) {
                                        echo '<div class="warning">' . esc_html($field) . ' array is empty</div>';
                                    }
                                } else {
                                    echo '<div class="error">' . esc_html($field) . ' is not an array</div>';
                                }
                            }
                        }
                    } else {
                        echo '<div class="error">Failed to decode statistics data</div>';
                    }
                    
                    if ($debug) {
                        output_section('Decoded Statistics Structure', print_r($decoded_stats, true), true);
                    }
                } catch (Exception $e) {
                    echo '<div class="error">Error decoding statistics: ' . esc_html($e->getMessage()) . '</div>';
                    $decoded_stats = [];
                }
            }
            echo '</div>'; // End step 2
            
            // Step 3: Check Enhanced Analytics HTML
            echo '<div class="step">';
            echo '<h4>Step 3: Check Enhanced Analytics HTML</h4>';
            
            $html_field = 'enhanced_analytics_html';
            $html_data = get_post_meta($post_id, $html_field, true);
            if (empty($html_data)) {
                $html_data = get_field($html_field, $post_id);
            }
            
            if (empty($html_data)) {
                echo '<div class="error">No HTML data found in field "' . esc_html($html_field) . '"</div>';
                echo '<p>This indicates the HTML generation process failed or the field is not being populated.</p>';
            } else {
                echo '<div class="success">HTML data found (length: ' . strlen($html_data) . ' characters)</div>';
                
                // Check for key HTML elements
                $key_elements = [
                    'radar-wrapper' => 'Radar Chart',
                    'price-chart-wrapper' => 'Price History Chart',
                    'modern-chart-container' => 'Histogram Chart',
                    'sales-table' => 'Sales Table',
                    'data-chart-data-radar' => 'Radar Chart Data Attribute',
                    'data-chart-data-history' => 'Price History Data Attribute',
                    'data-histogram-data' => 'Histogram Data Attribute',
                    'data-sales-data' => 'Sales Table Data Attribute'
                ];
                
                $missing_elements = [];
                foreach ($key_elements as $element => $label) {
                    $found = strpos($html_data, $element) !== false;
                    if (!$found) {
                        $missing_elements[] = $label;
                    }
                }
                
                if (!empty($missing_elements)) {
                    echo '<div class="warning">Missing HTML elements: ' . implode(', ', $missing_elements) . '</div>';
                } else {
                    echo '<div class="success">All key HTML elements found</div>';
                }
                
                // Check for escaped HTML entities in title
                if (strpos($html_data, '&amp;') !== false) {
                    echo '<div class="warning">Found double-escaped HTML entities (e.g., &amp;amp;)</div>';
                }
                
                if ($debug) {
                    // Extract JSON data from HTML to see if it's valid
                    preg_match('/data-chart-data-radar="(.*?)"/s', $html_data, $radar_matches);
                    preg_match('/data-chart-data-history="(.*?)"/s', $html_data, $history_matches);
                    preg_match('/data-histogram-data="(.*?)"/s', $html_data, $histogram_matches);
                    preg_match('/data-sales-data="(.*?)"/s', $html_data, $sales_matches);
                    
                    $data_samples = [];
                    
                    if (!empty($radar_matches[1])) {
                        $data_samples['Radar Chart Data'] = html_entity_decode($radar_matches[1]);
                    }
                    
                    if (!empty($history_matches[1])) {
                        $data_samples['Price History Data'] = html_entity_decode($history_matches[1]);
                    }
                    
                    if (!empty($histogram_matches[1])) {
                        $data_samples['Histogram Data'] = html_entity_decode($histogram_matches[1]);
                    }
                    
                    if (!empty($sales_matches[1])) {
                        $data_samples['Sales Table Data'] = html_entity_decode($sales_matches[1]);
                    }
                    
                    foreach ($data_samples as $title => $sample) {
                        $json_valid = json_decode($sample) !== null;
                        output_section(
                            $title . ($json_valid ? ' (Valid JSON)' : ' (Invalid JSON)'),
                            $sample,
                            true
                        );
                    }
                }
                
                if ($show_raw) {
                    output_section('HTML Content', $html_data, true);
                }
            }
            echo '</div>'; // End step 3
            
            // Step 4: View rendered HTML with scripts
            echo '<div class="step">';
            echo '<h4>Step 4: View Rendered Output</h4>';
            
            if (empty($html_data)) {
                echo '<div class="error">Cannot preview HTML - no data available</div>';
            } else {
                echo '<div class="success">HTML data available for preview</div>';
                echo '<p><a href="' . esc_url($_SERVER['PHP_SELF'] . '?post_id=' . $post_id . '&preview=true') . '" target="_blank" class="button">Preview Enhanced Analytics</a></p>';
            }
            
            // Check for Chart.js
            echo '<p>Chart.js Status: ';
            if (wp_script_is('chart-js', 'registered') || wp_script_is('chartjs', 'registered')) {
                echo '<span class="success">Registered</span>';
            } else {
                echo '<span class="warning">Not Registered - charts may not render</span>';
            }
            echo '</p>';
            
            echo '</div>'; // End step 4
            
            if ($rebuild) {
                // Step 5: Rebuild Enhanced Analytics HTML
                echo '<div class="step">';
                echo '<h4>Step 5: Rebuild Enhanced Analytics HTML</h4>';
                
                if (empty($decoded_stats)) {
                    echo '<div class="error">Cannot rebuild HTML - no valid statistics data</div>';
                } else {
                    // Simulate the rebuild process - this would require implementing a version of
                    // the function that generates the HTML based on the statistics
                    echo '<div class="warning">Rebuild functionality not implemented in this debug tool</div>';
                    echo '<p>Rebuilding would require including the specific template generation functions from your plugin.</p>';
                }
                
                echo '</div>'; // End step 5
            }
            
            echo '</div>'; // End data flow
            
            // Add data viewer
            if (!empty($decoded_stats)) {
                echo '<h2>Data Viewer</h2>';
                
                echo '<div class="tabs">';
                echo '<div class="tab active" data-target="tab-general">General</div>';
                echo '<div class="tab" data-target="tab-histogram">Histogram</div>';
                echo '<div class="tab" data-target="tab-price-history">Price History</div>';
                echo '<div class="tab" data-target="tab-sales">Comparable Sales</div>';
                echo '</div>';
                
                // General Tab
                echo '<div id="tab-general" class="tab-content active">';
                echo '<table>';
                echo '<tr><th>Field</th><th>Value</th></tr>';
                
                $general_fields = [
                    'value' => 'Item Value',
                    'average_price' => 'Average Price',
                    'median_price' => 'Median Price',
                    'price_min' => 'Minimum Price',
                    'price_max' => 'Maximum Price',
                    'count' => 'Count',
                    'standard_deviation' => 'Standard Deviation',
                    'coefficient_of_variation' => 'Coefficient of Variation',
                    'percentile' => 'Percentile',
                    'price_trend_percentage' => 'Price Trend',
                    'confidence_level' => 'Confidence Level',
                    'target_marker_position' => 'Target Marker Position',
                    'historical_significance' => 'Historical Significance',
                    'investment_potential' => 'Investment Potential',
                    'provenance_strength' => 'Provenance Strength'
                ];
                
                foreach ($general_fields as $field => $label) {
                    echo '<tr>';
                    echo '<td>' . esc_html($label) . '</td>';
                    echo '<td>' . (isset($decoded_stats[$field]) ? esc_html($decoded_stats[$field]) : '-') . '</td>';
                    echo '</tr>';
                }
                
                echo '</table>';
                echo '</div>';
                
                // Histogram Tab
                echo '<div id="tab-histogram" class="tab-content">';
                if (isset($decoded_stats['histogram']) && is_array($decoded_stats['histogram'])) {
                    echo '<table>';
                    echo '<tr><th>Min</th><th>Max</th><th>Count</th><th>Height</th><th>Contains Target</th></tr>';
                    
                    foreach ($decoded_stats['histogram'] as $bar) {
                        echo '<tr>';
                        echo '<td>' . (isset($bar['min']) ? esc_html($bar['min']) : '-') . '</td>';
                        echo '<td>' . (isset($bar['max']) ? esc_html($bar['max']) : '-') . '</td>';
                        echo '<td>' . (isset($bar['count']) ? esc_html($bar['count']) : '-') . '</td>';
                        echo '<td>' . (isset($bar['height']) ? esc_html($bar['height']) : '-') . '</td>';
                        echo '<td>' . (isset($bar['contains_target']) && $bar['contains_target'] ? 'Yes' : 'No') . '</td>';
                        echo '</tr>';
                    }
                    
                    echo '</table>';
                } else {
                    echo '<div class="error">No histogram data available</div>';
                }
                echo '</div>';
                
                // Price History Tab
                echo '<div id="tab-price-history" class="tab-content">';
                if (isset($decoded_stats['price_history']) && is_array($decoded_stats['price_history'])) {
                    echo '<table>';
                    echo '<tr><th>Year</th><th>Price</th><th>Index</th></tr>';
                    
                    foreach ($decoded_stats['price_history'] as $point) {
                        echo '<tr>';
                        echo '<td>' . (isset($point['year']) ? esc_html($point['year']) : '-') . '</td>';
                        echo '<td>' . (isset($point['price']) ? esc_html($point['price']) : '-') . '</td>';
                        echo '<td>' . (isset($point['index']) ? esc_html($point['index']) : '-') . '</td>';
                        echo '</tr>';
                    }
                    
                    echo '</table>';
                } else {
                    echo '<div class="error">No price history data available</div>';
                }
                echo '</div>';
                
                // Comparable Sales Tab
                echo '<div id="tab-sales" class="tab-content">';
                if (isset($decoded_stats['comparable_sales']) && is_array($decoded_stats['comparable_sales'])) {
                    echo '<table>';
                    echo '<tr><th>Title</th><th>House</th><th>Date</th><th>Price</th><th>Diff</th><th>Current</th></tr>';
                    
                    foreach ($decoded_stats['comparable_sales'] as $sale) {
                        echo '<tr>';
                        echo '<td>' . (isset($sale['title']) ? esc_html($sale['title']) : '-') . '</td>';
                        echo '<td>' . (isset($sale['house']) ? esc_html($sale['house']) : '-') . '</td>';
                        echo '<td>' . (isset($sale['date']) ? esc_html($sale['date']) : '-') . '</td>';
                        echo '<td>' . (isset($sale['price']) ? esc_html($sale['price']) : '-') . '</td>';
                        echo '<td>' . (isset($sale['diff']) ? esc_html($sale['diff']) : '-') . '</td>';
                        echo '<td>' . (isset($sale['is_current']) && $sale['is_current'] ? 'Yes' : 'No') . '</td>';
                        echo '</tr>';
                    }
                    
                    echo '</table>';
                } else {
                    echo '<div class="error">No comparable sales data available</div>';
                }
                echo '</div>';
            }
        }
        ?>
    <?php endif; ?>
    
    <?php
    // If preview mode is requested, just show the HTML
    if (isset($_GET['preview']) && $_GET['preview'] === 'true' && !empty($html_data)) {
        // Add Chart.js if not already available
        if (!wp_script_is('chart-js', 'registered') && !wp_script_is('chartjs', 'registered')) {
            echo '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
        }
        
        // Fix any double-encoded entities
        $html_data = str_replace('&amp;', '&', $html_data);
        
        // Output the HTML directly
        echo $html_data;
        
        // Add debug styles to highlight containers
        echo '<style>
            .enhanced-analytics-container { border: 2px solid #0073aa !important; }
            .radar-wrapper, .price-chart-wrapper, .modern-chart-container, .sales-table-container {
                border: 1px dashed #0073aa !important;
                position: relative;
            }
            .radar-wrapper:before, .price-chart-wrapper:before, .modern-chart-container:before, .sales-table-container:before {
                content: attr(class);
                position: absolute;
                top: 0;
                left: 0;
                background: #0073aa;
                color: white;
                font-size: 10px;
                padding: 2px 5px;
                z-index: 999;
            }
        </style>';
        
        // Exit early to prevent additional HTML
        exit;
    }
    ?>
    
    <h2>Debug Tools</h2>
    <p>
        <a href="<?php echo esc_url(get_permalink($post_id)); ?>" target="_blank">View Post</a> |
        <a href="<?php echo esc_url(admin_url('post.php?post=' . $post_id . '&action=edit')); ?>" target="_blank">Edit Post</a> |
        <a href="<?php echo esc_url($_SERVER['PHP_SELF'] . '?post_id=' . $post_id . '&debug=true'); ?>">Show Debug Details</a> |
        <a href="<?php echo esc_url($_SERVER['PHP_SELF'] . '?post_id=' . $post_id . '&raw=true'); ?>">Show Raw Data</a>
    </p>
</body>
</html> 