## WordPress ACF Metadata Fields (appraisals-backend)

This file lists the ACF (Advanced Custom Fields) used by the `appraisals-backend` service for the 'appraisals' post type in WordPress.

| # | Label                | Name                      | Type        | Notes                                                                 |
|---|----------------------|---------------------------|-------------|-----------------------------------------------------------------------|
| 1 | value                | `value`                   | Number      | The appraised value.                                                  |
| 2 | main                 | `main`                    | Image       | Main featured image for the appraisal.                                |
| 3 | signature            | `signature`               | Image       | Image of the signature, if available.                                 |
| 4 | age                  | `age`                     | Image       | Image related to age/period details, if available.                    |
| 5 | similar              | `similar`                 | Gallery     | Gallery of similar items (Usage unclear, potentially legacy).         |
| 6 | customer_email       | `customer_email`          | Email       | Primary customer email address.                                       |
| 7 | secondary_email      | `secondary_email`         | Email       | Secondary customer email address.                                     |
| 8 | customer_name        | `customer_name`           | Text        | Customer's full name.                                                 |
| 9 | customer_address     | `customer_address`        | Text        | Customer's address.                                                   |
| 10| session_id           | `session_id`              | Text        | Session identifier, possibly from a form submission.                  |
| 11| GoogleVision         | `googlevision`            | Gallery     | Gallery populated by Google Vision results (Likely legacy).           |
| 12| _gallery_populated   | `_gallery_populated`      | Text        | Internal flag, likely related to `googlevision` (Likely legacy).      |
| 13| table                | `table`                   | Text        | Usage unclear, possibly for simple HTML table data (Legacy?).         |
| 14| ad_copy              | `ad_copy`                 | Text        | Text used for advertising/marketing copy.                             |
| 15| age_text             | `age_text`                | Text        | Descriptive text about the item's age/period.                         |
| 16| age1                 | `age1`                    | Text        | Unclear, possibly redundant age text (Legacy?).                       |
| 17| condition            | `condition`               | Text        | Detailed description of the item's condition.                         |
| 18| signature1           | `signature1`              | Text        | Descriptive text about the signature (Legacy?).                       |
| 19| signature2           | `signature2`              | Text        | More descriptive text about the signature (Legacy?).                  |
| 20| style                | `style`                   | Text        | Description of the item's artistic style.                             |
| 21| valuation_method   | `valuation_method`        | Text        | Text explaining the method used for valuation.                        |
| 22| authorship           | `authorship`              | Text        | Text discussing the item's authorship/attribution.                    |
| 23| conclusion1          | `conclusion1`             | Text        | First part of the appraisal conclusion.                               |
| 24| conclusion2          | `conclusion2`             | Text        | Second part of the appraisal conclusion.                              |
| 25| test                 | `test`                    | Text        | Field likely used for testing purposes.                               |
| 26| pdflink              | `pdflink`                 | URL         | Link to the generated PDF report in Google Drive.                     |
| 27| doclink              | `doclink`                 | URL         | Link to the generated Google Doc source file.                       |
| 28| glossary             | `glossary`                | Text        | Glossary of terms relevant to the appraisal.                          |
| 29| shortcodes_inserted  | `shortcodes_inserted`     | True / False| Flag indicating if shortcodes were processed/inserted.                |
| 30| appraisaltype        | `appraisaltype`           | Text        | Type of appraisal (e.g., 'regular', 'irs', 'insurance').                |
| 31| justification_html   | `justification_html`      | Text Area   | HTML content for the value justification section.                     |
| 32| statistics           | `statistics`              | Text Area   | JSON string containing detailed statistics from `valuer-agent`.         |
| 33| object_type          | `object_type`             | Text        | Type of object being appraised (e.g., 'Painting', 'Sculpture').       |
| 34| creator              | `creator`                 | Text        | The artist or creator of the item.                                  |
| 35| estimated_age        | `estimated_age`           | Text        | Estimated age or period of the item (e.g., 'c. 1880', '19th Century'). |
| 36| condition_summary    | `condition_summary`       | Text        | Brief summary of the item's condition.                              |
| 37| medium               | `medium`                  | Text        | Materials used (e.g., 'Oil on canvas', 'Bronze').                   |
| 38| market_demand        | `market_demand`           | Number      | Numerical score representing market demand.                           |
| 39| rarity               | `rarity`                  | Number      | Numerical score representing rarity.                                  |
| 40| condition_score      | `condition_score`         | Number      | Numerical score representing condition.                               |
| 41| statistics_summary   | `statistics_summary`      | Text        | Potentially legacy summary text (See `statistics_summary_text`).      |
| 42| enhanced_analytics_html| `enhanced_analytics_html` | Text Area   | HTML content for the enhanced analytics visualization.                |
| 43| appraisal_card_html  | `appraisal_card_html`     | Text Area   | HTML content for the appraisal card visualization.                    |
| 44| valuer_agent_data    | `valuer_agent_data`       | Text Area   | Raw JSON string response from the `valuer-agent` service.             |
| 45| top_auction_results  | `top_auction_results`     | Text Area   | Text/JSON containing top comparable auction results for PDF.          |
| 46| statistics_summary_text| `statistics_summary_text` | Text Area   | Descriptive text summarizing statistics for PDF.                      |
| 47| enhanced_description | `enhanced_description`    | Text Area   | AI-enhanced description of the item.                                |
| 48| last_updated         | `last_updated`            | Text        | ISO timestamp of the last backend update.                           |
| 49| appraisal_status     | `appraisal_status`        | Text        | Status of the appraisal process (e.g., 'pending', 'completed').       | 