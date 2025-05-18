# WordPress ACF Metadata Fields Used in PDF Generation

This document lists all the WordPress ACF (Advanced Custom Fields) metadata fields that are extracted and used in the PDF generation process via the `/api/pdf/generate-pdf` endpoint.

## Primary ACF Fields

These are the main fields directly retrieved from WordPress posts:

| Field Name | Description | Usage |
|------------|-------------|-------|
| `appraisaltype` | Type of appraisal (regular, etc.) | Used to determine which static content to include |
| `valuation_method` | Method used for valuation | Included in PDF document |
| `authorship` | Information about the authorship | Included in PDF document |
| `condition` | Condition information | Used as primary condition description |
| `condition_report` | Alternative field for condition info | Used as fallback for condition |
| `condition_summary` | Summary of condition | Included in PDF document |
| `provenance` | Provenance information | Included as provenance_summary |
| `provenance_summary` | Alternative field for provenance | Used as fallback for provenance |
| `statistics_summary_text` | Summary of statistics | Included in PDF document |
| `market_summary` | Alternative field for statistics summary | Used as fallback for statistics_summary_text |
| `conclusion` | Conclusion section | Included in PDF document |
| `conclusion1` | First part of conclusion | Takes precedence over conclusion |
| `conclusion2` | Second part of conclusion | Additional conclusion information |
| `justification_html` | Justification with HTML formatting | Included in PDF document with HTML preserved |
| `value` | Appraisal value | Formatted as currency for PDF |
| `googlevision` | Array of image IDs for gallery | Used to retrieve gallery images |

## Age-related Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `age_text` | Description of age methodology | Included in PDF document |
| `age_methodology` | Alternative field for age text | Used as fallback for age_text |
| `age1` | Age findings or analysis | Included in PDF document |
| `age_findings` | Alternative field for age findings | Used as fallback for age1 |
| `estimated_age` | Estimated age of the item | Included in PDF document |
| `age` | Alternative field for estimated age | Used as fallback for estimated_age |

## Signature-related Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `signature1` | Signature analysis | Included in PDF document |
| `signature_analysis` | Alternative field for signature analysis | Used as fallback for signature1 |
| `signature2` | Additional signature information | Included in PDF document |

## Style and Analysis Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `style` | Style analysis | Included in PDF document |
| `style_analysis` | Alternative field for style analysis | Used as fallback for style |
| `test` | Item type determination | Included in PDF document |
| `item_type_determination` | Alternative field for test | Used as fallback for test |

## Creator/Artist Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `creator` | Creator or artist name | Included in PDF document |
| `artist_creator_name` | Alternative field for creator | Used as fallback for creator |
| `artist` | Alternative field for artist name | Used as fallback for creator |

## Customer Information Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `customer_name` | Customer name | Included in PDF document |
| `customer_address` | Customer address | Included in PDF document |

## Artwork Details Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `object_type` | Type of object | Included in PDF document |
| `type` | Alternative field for object type | Used as fallback for object_type |
| `artwork_type` | Alternative field for object type | Used as fallback for object_type |
| `medium` | Medium of artwork | Included in PDF document |
| `artwork_medium` | Alternative field for medium | Used as fallback for medium |
| `dimensions` | Dimensions of artwork | Included in PDF document |
| `size` | Alternative field for dimensions | Used as fallback for dimensions |
| `measurements` | Alternative field for dimensions | Used as fallback for dimensions |
| `date_created` | Date artwork was created | Included in PDF document |
| `artwork_date` | Alternative field for date created | Used as fallback for date_created |
| `created` | Alternative field for date created | Used as fallback for date_created |
| `artwork_title` | Title of artwork | Included in PDF document |
| `title` | Alternative field for artwork title | Used as fallback for artwork_title |

## Content and Copy Fields

| Field Name | Description | Usage |
|------------|-------------|-------|
| `table` | Table content | Included in PDF document as-is |
| `ad_copy` | Advertisement copy | Included in PDF document |
| `selling_copy` | Alternative field for ad copy | Used as fallback for ad_copy |
| `appraisal_summary` | Summary of appraisal | Included in PDF document |
| `glossary` | Glossary terms | Included in PDF document |

## Statistics Data

| Field Name | Description | Usage |
|------------|-------------|-------|
| `statistics` | Raw statistics data (typically JSON) | Stored as raw_statistics and used to generate top_auction_results |

## Image References

| Field Name | Description | Usage |
|------------|-------------|-------|
| `main` | Main image ID/URL | Retrieved and inserted into the PDF |
| `age` | Age image ID/URL | Retrieved and inserted into the PDF |
| `signature` | Signature image ID/URL | Retrieved and inserted into the PDF |
| `googlevision` | Array of image IDs for gallery | Retrieved and inserted into the PDF gallery |

## Validation and Required Fields

The following fields are considered required for PDF generation, though the process will continue even if some are missing:

```
'test', 'ad_copy', 'age_text', 'age1', 'condition',
'signature1', 'signature2', 'style', 'valuation_method',
'conclusion1', 'conclusion2', 'authorship', 'table', 'justification_html',
'glossary', 'value'
```

## Compatibility and Fallbacks

The system is designed to handle multiple field naming conventions and will use fallbacks when primary fields are not available. This allows for backward compatibility with different WordPress configurations. 