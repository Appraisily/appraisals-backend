<?php
/**
 * Metadata Cleanup Script
 * 
 * This script removes redundant metadata fields from existing posts based on
 * the optimization strategy defined in METADATA_OPTIMIZATION.md.
 * 
 * IMPORTANT: Make a complete database backup before running this script.
 * Run this script directly through WordPress WP-CLI or place it in the WordPress
 * root directory and access it through the browser with proper authentication.
 */

// Bootstrap WordPress
require_once('wp-load.php');

// Check for admin capabilities or CLI
if (!defined('WP_CLI') && !current_user_can('manage_options')) {
    die('Unauthorized access.');
}

// Fields to remove as per optimization strategy
$fields_to_remove = array(
    'auction_results',
    'auction_table_html',
    'justification_explanation',
    'justification_introduction',
    'statistics_summary',
    'serper_search_results',
    'justification_search_results'
);

// Get all appraisal posts
$posts = get_posts(array(
    'post_type' => 'appraisal', // Adjust to your actual post type
    'numberposts' => -1,
    'post_status' => 'any'
));

// Stats tracking
$total_posts = count($posts);
$total_fields_removed = 0;
$bytes_saved = 0;
$processed_posts = 0;
$errors = array();

echo "Starting metadata cleanup process...\n";
echo "Found {$total_posts} posts to process.\n";

foreach ($posts as $post) {
    try {
        echo "Processing post ID: {$post->ID} - {$post->post_title}\n";
        
        // Collect stats on data size before removal for reporting
        $original_size = 0;
        foreach ($fields_to_remove as $field) {
            $meta_value = get_post_meta($post->ID, $field, true);
            if (!empty($meta_value)) {
                if (is_string($meta_value)) {
                    $original_size += strlen($meta_value);
                } else if (is_array($meta_value)) {
                    $original_size += strlen(json_encode($meta_value));
                }
                
                // Remove the metadata
                $result = delete_post_meta($post->ID, $field);
                if ($result) {
                    $total_fields_removed++;
                    echo "  - Removed field: {$field}\n";
                } else {
                    echo "  - Failed to remove field: {$field}\n";
                }
            }
        }
        
        $bytes_saved += $original_size;
        $processed_posts++;
        
        // Progress report
        if ($processed_posts % 10 === 0) {
            echo "Progress: {$processed_posts}/{$total_posts} posts processed.\n";
        }
    } catch (Exception $e) {
        $errors[] = "Error processing post ID {$post->ID}: " . $e->getMessage();
        echo "Error processing post ID {$post->ID}: " . $e->getMessage() . "\n";
    }
}

// Final report
echo "\n=== CLEANUP COMPLETE ===\n";
echo "Total posts processed: {$processed_posts}\n";
echo "Total fields removed: {$total_fields_removed}\n";
echo "Total bytes saved: " . number_format($bytes_saved) . " bytes (" . number_format($bytes_saved / 1024 / 1024, 2) . " MB)\n";

if (count($errors) > 0) {
    echo "\nErrors encountered:\n";
    foreach ($errors as $error) {
        echo "- {$error}\n";
    }
}

echo "\nMetadata optimization complete. The following fields have been removed:\n";
foreach ($fields_to_remove as $field) {
    echo "- {$field}\n";
}

echo "\nThe essential fields have been preserved:\n";
echo "- statistics (contains all statistical data)\n";
echo "- justification_html (final HTML display)\n";
echo "- valuer_agent_data (original source data for debugging)\n";

?>