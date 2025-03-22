# Interactive Charts Implementation Guide

This document explains how to implement and use the modern, interactive charts in the appraisal system.

## Overview

The interactive charts provide a visually appealing, modern way to display market statistics and data comparisons for appraised items. Inspired by the Shadcn UI design system, these charts offer a clean, professional appearance with interactive elements.

## Implementation Components

### 1. Data Format

The statistics data is stored in WordPress as a JSON string with the following structure:

```json
{
  "count": 27,
  "average_price": 4250,
  "median_price": 4100,
  "price_min": 2100,
  "price_max": 6800,
  "standard_deviation": 1200,
  "coefficient_of_variation": 28.2,
  "percentile": "68th",
  "confidence_level": "High",
  "price_trend_percentage": "+5.2%",
  "histogram": [
    {
      "min": 2000,
      "max": 3000,
      "count": 4,
      "height": 40,
      "position": 0,
      "contains_target": false
    },
    // More histogram bars...
  ],
  "comparable_sales": [
    {
      "title": "Similar Artwork #1",
      "house": "Christie's",
      "date": "May 12, 2024",
      "price": 4800,
      "diff": "+6.7%"
    },
    // More sales data...
  ],
  "value": 4500,
  "target_marker_position": 68
}
```

### 2. Backend Data Processing

The `calculateAuctionStatistics` function in `services/metadata.js` has been enhanced to generate this data structure from auction results.

Key changes:
- Added formatted sales data with price difference calculations
- Added percentile with ordinal suffix formatting
- Created a yearly price trend calculation
- Structured histogram data for visual display
- Assembled the enhanced statistics object

### 3. WordPress Shortcode

A custom WordPress shortcode `[display_interactive_stats]` renders the interactive charts:

```php
// In functions.php or as a custom plugin
function display_interactive_stats_shortcode($atts) {
  $atts = shortcode_atts(array(
    'field_name' => 'statistics',
    'default' => ''
  ), $atts);
  
  $field_name = $atts['field_name'];
  $statistics_data = get_field($field_name);
  
  // ... processing and rendering code ...
}
add_shortcode('display_interactive_stats', 'display_interactive_stats_shortcode');
```

### 4. Chart Components

The implementation includes several chart types:

1. **Distribution Chart** - Shows price distribution with highlighted bar for the current item
2. **Metrics Cards** - Display key statistics with visual indicators
3. **Comparable Sales Table** - Interactive table of similar items with price comparison
4. **Price Trend Chart** - SVG-based visualization of historical price trends

### 5. Interactive Features

The charts include several interactive elements:
- Hover effects on bars showing detailed tooltips
- Time filter buttons for different date ranges
- Highlighting of the appraised item's position
- Visual confidence indicators

## Usage

To use these charts in a WordPress template:

1. Add the shortcode to your template:
   ```
   [display_interactive_stats field_name="statistics"]
   ```

2. The shortcode will load the data from the specified field and render the interactive charts.

## Installation

1. Copy the `display_interactive_stats_shortcode.php` file to your WordPress theme directory
2. Include it in your `functions.php`:
   ```php
   require_once(get_template_directory() . '/display_interactive_stats_shortcode.php');
   ```

3. Update your appraisal templates to use the shortcode in place of standard statistics display

## Customization

The charts can be customized through CSS variables. Key design elements:

- Primary color: `#4f46e5` (Indigo)
- Highlight color: `#f43f5e` (Rose)
- Success color: `#10b981` (Emerald)
- Error color: `#ef4444` (Red)
- Warning color: `#f59e0b` (Amber)

Border radius, shadows, animations, and other styling can be adjusted in the CSS section of the shortcode.

## Browser Compatibility

The interactive charts work in all modern browsers (Chrome, Firefox, Safari, Edge). Some animations and effects may not appear in older browsers, but the data will still be displayed.

## Performance Considerations

The charts use client-side JavaScript for interactivity, which may impact performance on very low-end devices. The code has been optimized to minimize this impact by:

1. Using efficient CSS transitions instead of JavaScript animations where possible
2. Loading SVG elements only when needed
3. Limiting the number of comparable sales displayed
4. Using efficient DOM manipulation techniques

## Troubleshooting

If the charts do not display correctly:

1. Verify the statistics data is properly formatted in the WordPress metadata
2. Check browser console for JavaScript errors
3. Ensure the shortcode is properly registered and loaded
4. Test with a simplified data structure to isolate rendering issues