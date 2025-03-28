# Simplified Enhanced Analytics Implementation Guide

This guide explains how to implement the enhanced data visualizations for appraisal reports in WordPress using a single shortcode.

## Overview

We've created a comprehensive analytics shortcode that combines three powerful visualizations:

1. **Radar Chart** - Multi-dimensional analysis showing key metrics (condition, rarity, market demand, etc.)
2. **Price History Chart** - Historical price trends with future projections
3. **Interactive Statistics** - Market distribution, metrics, and comparable sales

All three visualizations are now combined into a single shortcode for easier implementation.

## Quick Start

### 1. Install the Shortcode

Copy the following file to your WordPress theme's functions directory or use a custom plugin:

- `display_enhanced_analytics_shortcode.php`

Make sure the file is included in your theme's `functions.php` or plugin file:

```php
require_once('path/to/display_enhanced_analytics_shortcode.php');
```

### 2. Add to WordPress Pages

Add the visualization to any WordPress post or page using the shortcode:

```
[display_enhanced_analytics]
```

That's it! The shortcode will automatically display all three visualizations in a professionally styled layout.

## Customization Options

The shortcode supports the following parameters for customization:

```
[display_enhanced_analytics 
  field_name="statistics" 
  show_radar="true" 
  show_history="true" 
  show_stats="true"
  title="Enhanced Market Analytics"]
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| field_name | "statistics" | The ACF field name containing the JSON data |
| show_radar | "true" | Whether to show the radar chart section |
| show_history | "true" | Whether to show the price history section |
| show_stats | "true" | Whether to show the detailed statistics section |
| title | "Enhanced Market Analytics" | The main title for the analytics section |
| default | "" | Default message if no statistics are available |

## Data Structure

The visualizations use data from the ACF `statistics` field, which should contain a JSON object with the following structure:

```json
{
  "average_price": 4250,
  "median_price": 4400,
  "price_trend_percentage": "+5.2%",
  "price_min": 2100,
  "price_max": 6800,
  "percentile": "68th",
  "confidence_level": "High",
  "coefficient_of_variation": 15.8,
  "count": 5,
  "standard_deviation": 650,
  "value": 4500,
  "target_marker_position": 50,
  "histogram": [
    {"min": 2000, "max": 3000, "count": 4, "height": 40},
    {"min": 3000, "max": 4000, "count": 7, "height": 65},
    {"min": 4000, "max": 5000, "count": 9, "height": 85, "contains_target": true},
    {"min": 5000, "max": 6000, "count": 5, "height": 50},
    {"min": 6000, "max": 7000, "count": 2, "height": 20}
  ],
  "comparable_sales": [
    {"title": "Similar Artwork #1", "house": "Christie's", "date": "May 12, 2024", "price": 4800, "diff": "+6.7%"},
    {"title": "Similar Artwork #2", "house": "Sotheby's", "date": "Apr 3, 2024", "price": 4200, "diff": "-6.7%"},
    {"title": "Similar Artwork #3", "house": "Phillips", "date": "Feb 27, 2024", "price": 5100, "diff": "+13.3%"},
    {"title": "Similar Artwork #4", "house": "Bonhams", "date": "Jan 15, 2024", "price": 3900, "diff": "-13.3%"}
  ],
  "price_history": [
    {"year": "2018", "price": 5000, "index": 1000},
    {"year": "2019", "price": 5200, "index": 1050},
    {"year": "2020", "price": 5500, "index": 1100},
    {"year": "2021", "price": 6000, "index": 1200},
    {"year": "2022", "price": 6200, "index": 1250},
    {"year": "2023", "price": 6800, "index": 1300}
  ],
  "historical_significance": 75,
  "investment_potential": 68,
  "provenance_strength": 72
}
```

Additionally, you can use these ACF fields for specific metrics:

- `condition_score` (Number): Physical condition score (0-100)
- `rarity` (Number): Rarity score (0-100)
- `market_demand` (Number): Market demand score (0-100)
- `value` (Number): Appraised value in USD

## Technical Requirements

The visualizations require:

1. **Chart.js** - Loaded from CDN in the shortcode
2. A modern browser that supports ES6
3. The "Inter" font family (optional, falls back to system fonts)

## Example Usage

### Basic Usage

```
[display_enhanced_analytics]
```

### Show Only Radar Chart and Price History

```
[display_enhanced_analytics show_stats="false" title="Item Value Analysis"]
```

### Custom Default Message

```
[display_enhanced_analytics default="No market data is currently available for this item."]
```

## Data Integration Options

The shortcode can be used with manually entered data or data from external sources:

### Manual Data Entry

For manual entry, enter the JSON data structure into the ACF `statistics` field.

### Automated Data Collection

For automated collection, consider integrating with:

1. **Auction House APIs**:
   - Sotheby's, Christie's, Phillips, Bonhams

2. **Museum Collection APIs**:
   - The Met, Victoria and Albert Museum, Getty Museum, Smithsonian

3. **Art Market Analytics Platforms**:
   - Artnet, Artprice, MutualArt

## Troubleshooting

If you encounter issues with the visualizations:

1. **Charts not appearing**: Ensure Chart.js is loading correctly. Try adding the script manually to your theme.
2. **Data not showing**: Verify your JSON structure in the ACF field is correct and properly formatted.
3. **Style conflicts**: If your theme has style conflicts, you can wrap the shortcode output in a class to isolate styles.

## Additional Resources

For more advanced customizations or to create your own versions of these visualizations, refer to:

1. [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
2. [WordPress Shortcode API](https://developer.wordpress.org/plugins/shortcodes/)
3. [Advanced Custom Fields Documentation](https://www.advancedcustomfields.com/resources/)