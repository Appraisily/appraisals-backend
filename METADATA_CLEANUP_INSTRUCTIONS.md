# Metadata Cleanup Instructions

## Background

The appraisal system has been optimized to reduce metadata redundancy. The following changes have been implemented:

1. Updated `metadata.js` to stop creating redundant metadata fields
2. Modified shortcodes to generate content dynamically from essential data
3. Created a cleanup script to remove redundant fields from existing posts

## Retained Metadata Fields

The optimization preserves only these essential fields:

- `statistics` - Core data structure for visualizations
- `justification_html` - Complete HTML for justification section
- `valuer_agent_data` - Original source data (kept for debugging)

## Removed Metadata Fields

The following redundant fields are no longer created or used:

- `auction_results` - Redundant with `statistics.comparable_sales`
- `auction_table_html` - Now generated dynamically from `statistics`
- `justification_explanation` - Redundant with content in `justification_html`
- `justification_introduction` - Redundant with content in `justification_html`
- `statistics_summary` - Now generated dynamically from `statistics`
- `serper_search_results` - Not needed for display purposes
- `justification_search_results` - Not needed for display purposes

## Running the Cleanup Script

The cleanup script will remove the redundant metadata fields from existing posts to free up database space.

### Important Pre-Cleanup Steps

1. **Create a full database backup before proceeding**
2. **Test on a staging environment first**
3. **Verify that display is working correctly with the updated code**

### Option 1: Run via WP-CLI (Recommended)

```bash
# Copy the script to your WordPress root directory first
cd /path/to/wordpress
wp eval-file cleanup_metadata.php
```

### Option 2: Run via Web Browser

1. Copy `cleanup_metadata.php` to your WordPress root directory
2. Access it via browser: `https://your-domain.com/cleanup_metadata.php`
3. You must be logged in as an administrator

### Option 3: Manual Database Cleanup

If you prefer direct database access, run this SQL (adjust the table prefix as needed):

```sql
DELETE FROM wp_postmeta 
WHERE meta_key IN (
  'auction_results',
  'auction_table_html',
  'justification_explanation',
  'justification_introduction',
  'statistics_summary',
  'serper_search_results',
  'justification_search_results'
);
```

## Verification

After running the cleanup:

1. Check several appraisal pages to ensure they display correctly
2. Confirm that charts and visualizations are working
3. Verify that justification text appears correctly

## Rollback Plan

If issues occur, you can:

1. Restore from your backup
2. Roll back the code changes in `metadata.js` and the shortcode files
3. For emergency display fixes without restoring data, modify the shortcodes to use fallback values

## Benefits

This optimization:

- Reduces database size
- Improves performance 
- Increases maintainability
- Ensures consistency between data and display
- Makes design updates easier

## Questions or Issues

If you encounter any problems, contact the development team for assistance.