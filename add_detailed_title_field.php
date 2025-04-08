<?php
/**
 * Add detailed_title field to WordPress ACF
 * 
 * Instructions:
 * 1. Log in to WordPress admin
 * 2. Navigate to Custom Fields > Field Groups
 * 3. Edit the field group for Appraisals (likely called "Appraisal Fields")
 * 4. Add a new field with the following configuration:
 *    - Field Label: Detailed Title
 *    - Field Name: detailed_title
 *    - Field Type: Text Area
 *    - Required: No
 *    - Default Value: (leave empty)
 *    - Placeholder: Comprehensive description with rich metadata for AI processing
 *    - Character Limit: 5000
 *    - Rows: 8
 *    - New Lines: Automatically add <br>
 *    - Formatting: Convert HTML into tags
 * 5. Save the field group
 * 
 * OR
 * 
 * Use the code below to programmatically add the field via functions.php:
 */

/**
 * Programmatically add detailed_title ACF field
 * Add this to your theme's functions.php file
 */
function add_detailed_title_acf_field() {
    if (function_exists('acf_add_local_field_group')) {
        // First check if the field group exists
        $field_group = acf_get_field_group('group_appraisal_fields'); // Replace with your actual field group key
        
        if ($field_group) {
            // Now add the field to the existing group
            acf_add_local_field(array(
                'key' => 'field_detailed_title',
                'label' => 'Detailed Title',
                'name' => 'detailed_title',
                'type' => 'textarea',
                'parent' => $field_group['key'],
                'instructions' => 'Comprehensive metadata-rich description of the artwork used by AI agents',
                'required' => 0,
                'conditional_logic' => 0,
                'wrapper' => array(
                    'width' => '',
                    'class' => '',
                    'id' => '',
                ),
                'default_value' => '',
                'placeholder' => 'Comprehensive description with rich metadata for AI processing',
                'maxlength' => 5000,
                'rows' => 8,
                'new_lines' => 'br',
            ));
        }
    }
}
add_action('acf/init', 'add_detailed_title_acf_field'); 