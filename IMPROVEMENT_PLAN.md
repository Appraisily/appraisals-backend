# Audit and Improvement Plan for ACF Metadata Usage

## Introduction

This document audits the usage of WordPress Advanced Custom Fields (ACF) metadata across the various endpoints of the `appraisals-backend` service. It identifies discrepancies, potential issues, and areas for improvement based on the defined fields in `ACF_METADATA.md` and analysis of the codebase.

## Endpoint Analysis

### 1. Core Appraisal Processing (`POST /complete-appraisal-report`)

*   **Relevant ACF Fields:**
    *   *Reads (Implicitly via `fetchPostData`):* `value`, `creator`, `object_type`, `estimated_age`, `medium`, `condition_summary`, `appraisaltype`, etc.
    *   *Writes (via `metadataProcessor.js` & `updatePostACFFields`):* `justification_html`, `statistics`, `valuer_agent_data`, `enhanced_analytics_html`, `appraisal_card_html`, potentially others from OpenAI.
*   **Issues/Observations:**
    *   **PDF Fields Missing:** Does not currently generate or populate PDF-specific text fields (e.g., `ad_copy`, `valuation_method`, `conclusion1/2`, `glossary`, `top_auction_results`, `statistics_summary_text`). Their origin (manual vs. AI) is unclear.
    *   **OpenAI Field Scope:** Needs verification of exactly which text fields `processAllMetadata` (using OpenAI) is designed to populate.
    *   **Stringification:** `valuer_agent_data` needs explicit stringification before saving.
    *   **Endpoint Clarity:** `justificationOnly` flag combines two distinct logical operations.
*   **Improvements/Actions:**
    *   **Action:** Modify `metadataProcessor.js` to `JSON.stringify` the `valuerResponse` before saving to `valuer_agent_data`.
    *   **Action:** Audit `processAllMetadata` calls to `updateWordPressMetadata` (now `updatePostACFFields`) to confirm target fields.
    *   **Decision:** Determine source (manual/AI) for PDF-specific text fields and implement generation/update logic (likely extending `metadataProcessor.js`).
    *   **Suggestion:** Consider splitting justification-only logic into a new `/generate-justification` endpoint.

### 2. Visualization Generation (`POST /generate-visualizations`, `POST /regenerate-statistics-and-visualizations`)

*   **Relevant ACF Fields:**
    *   *Reads:* `value`, `statistics` (parsed JSON).
    *   *Writes:* `enhanced_analytics_html`, `appraisal_card_html`, `statistics` (stringified JSON).
*   **Issues/Observations:**
    *   **Score Mismatch:** Relies on scores (`condition_score`, `rarity_score`, `market_demand_score`, etc.) and `price_history` within the `statistics` object for `templateContextUtils.js`. There's a potential mismatch between scores defined in ACF (`market_demand`, `rarity`, `condition_score` - Numbers), scores logged from `valuer-agent` (`historical_significance`, etc.), and scores actually used in templates. The origin/population mechanism for the WP Number fields is unclear.
    *   **Data Structure:** Consistency needed for the `statistics` object structure.
*   **Improvements/Actions:**
    *   **Action:** Define and document the canonical structure for the `statistics` object used by `templateContextUtils.js`.
    *   **Action:** Align data sources: Ensure `valuer-agent` provides all needed fields, or modify `templateContextUtils.js` to use only available data/defaults.
    *   **Decision:** Clarify how Number fields (`market_demand`, `rarity`, `condition_score`) are populated (manual vs. derived from `valuer-agent`) and implement logic if needed.

### 3. Content Enhancement (`POST /enhance-description`)

*   **Relevant ACF Fields:**
    *   *Writes:* `enhanced_description`.
*   **Issues/Observations:**
    *   The target field `enhanced_description` is not listed in `ACF_METADATA.md`.
*   **Improvements/Actions:**
    *   **Action:** Add `enhanced_description` (Type: Text Area) to `ACF_METADATA.md`.
    *   **Action:** Verify field exists in WordPress ACF configuration.

### 4. Utility (`POST /update-wordpress`)

*   **Relevant ACF Fields:**
    *   *Reads:* `appraisaltype`.
    *   *Writes:* Fields specified in `acfFields` body param, `last_updated`, `appraisal_status`.
*   **Issues/Observations:**
    *   Writes `last_updated` and `appraisal_status`, which are not listed in `ACF_METADATA.md`.
    *   Allows arbitrary ACF updates via API body, potentially risky.
*   **Improvements/Actions:**
    *   **Action:** Add `last_updated` (Type: Text or DateTime) and `appraisal_status` (Type: Text) to `ACF_METADATA.md`. Verify in WP.
    *   **Suggestion:** Consider adding server-side validation to restrict updates via `acfFields` to only known/allowed fields based on `ACF_METADATA.md`.

### 5. PDF Generation (`POST /generate-pdf`, `POST /api/pdf/*`)

*   **Relevant ACF Fields:**
    *   *Reads (implicitly via `fetchPostData` and `processMetadata`):* Many fields potentially used as template placeholders (`customer_name`, `value`, `creator`, `object_type`, `condition`, `style`, `valuation_method`, `authorship`, `conclusion1/2`, `glossary`, `top_auction_results`, `statistics_summary_text`, etc.).
    *   *Writes:* `pdflink`, `doclink`.
*   **Issues/Observations:**
    *   **Data Source:** Unclear how many PDF-specific text fields (`valuation_method`, `conclusion1/2`, `glossary`, `top_auction_results`, `statistics_summary_text`) are populated before PDF generation.
    *   **Mapping:** Needs verification that `services/pdf/metadata/processing.js` correctly extracts and maps *all* required ACF fields to the data used by `replacePlaceholdersInDocument`.
    *   **Template Sync:** Google Docs template placeholders must align with the data provided by the backend.
*   **Improvements/Actions:**
    *   **Action:** Audit the Google Docs template to create a definitive list of required placeholders.
    *   **Action:** Audit `services/pdf/metadata/processing.js` and `replacePlaceholdersInDocument` data preparation against the template placeholders and `ACF_METADATA.md`.
    *   **Action:** Implement generation/population logic for PDF-specific text fields (`top_auction_results`, `statistics_summary_text`, potentially others) if they aren't manually entered. This might involve expanding `metadataProcessor.js`.
    *   **Action:** Ensure customer info fields (`customer_name`, `customer_address`, etc.) are mapped and used.

### 6. Debugging/Standalone Endpoints (`/api/visualizations/*`, `/api/html/*`)

*   **Relevant ACF Fields:**
    *   `/fix-statistics` writes to `statistics`.
*   **Issues/Observations:** Primarily operate on request data, lower risk to stored ACF.
*   **Improvements/Actions:**
    *   **Action:** Ensure `/fix-statistics` stringifies the data correctly before calling `updatePostACFFields`.

## General Observations & Recommendations

1.  **Legacy Fields:** Fields like `similar`, `googlevision`, `_gallery_populated`, `table`, `age1`, `signature1/2`, `statistics_summary` appear potentially unused or legacy. Investigate their usage and consider removing them from ACF and code if obsolete.
2.  **Missing Fields:** `enhanced_description`, `last_updated`, `appraisal_status` are used in code but missing from `ACF_METADATA.md`. Add them.
3.  **Data Flow for PDF:** The biggest uncertainty is the population of numerous text fields required for the PDF report. Define and implement this workflow clearly.
4.  **Score Alignment:** Resolve the discrepancy between scores needed by visualization templates, scores defined in ACF, and scores provided by `valuer-agent`.
5.  **Stringification:** Double-check that all saves of complex objects (like `statistics`, `valuer_agent_data`) to `Text Area` ACF fields use `JSON.stringify()`.
6.  **Null Handling:** Ensure updates handle `null`/`undefined` values gracefully, sending empty strings (`''`) for Text/Text Area fields as needed, to avoid WP API errors.
7.  **Error Reporting:** Confirm the global error handler in `index.js` is reliably creating GitHub issues after the removal of route-level calls.
8.  **Centralized ACF Logic:** Consider consolidating ACF update logic or at least using constants for field names to improve maintainability.

## Implementation Plan (Prioritized)

1.  **Phase 1: Critical Fixes & Verification**
    *   Add missing fields (`enhanced_description`, `last_updated`, `appraisal_status`) to `ACF_METADATA.md`. (Code Change - Low effort)
    *   Ensure `valuer_agent_data` is stringified before saving in `metadataProcessor.js`. (Code Change - Low effort)
    *   Verify `/fix-statistics` stringifies data. (Code Change - Low effort)
    *   Test error handling thoroughly: Trigger errors (e.g., bad API key, WP error) in different routes and confirm GitHub issues are created by the global handler. (Testing - Medium effort)

2.  **Phase 2: Core Functionality Alignment (PDF & Scores)**
    *   Audit Google Docs template placeholders vs. `ACF_METADATA.md`. (Analysis - Medium effort)
    *   Audit/Refactor `services/pdf/metadata/processing.js` to map all required fields. (Code Change - Medium/High effort)
    *   Define/Implement population strategy for PDF-specific text fields (`top_auction_results`, `statistics_summary_text`, `conclusion1/2`, etc.). (Design & Code Change - High effort)
    *   Define/Implement population strategy for Number scores (`market_demand`, `rarity`, `condition_score`). (Design & Code Change - Medium effort)
    *   Align `valuer-agent` output / `templateContextUtils.js` usage for scores and `price_history`. (Code Change/API Coord. - Medium effort)

3.  **Phase 3: Refinement & Cleanup**
    *   Investigate and remove confirmed legacy ACF fields from WordPress and code. (Analysis & Code Change - Medium effort)
    *   Add validation to `/update-wordpress` endpoint if desired. (Code Change - Low/Medium effort)
    *   Review code for consistent null handling when reading ACF fields. (Code Review - Medium effort)

4.  **Phase 4: Documentation**
    *   Update `README.md` and `ACF_METADATA.md` based on implemented changes. (Doc Change - Low effort)

This plan prioritizes fixing known errors and ensuring core PDF/Visualization functionality aligns with the defined metadata before moving to cleanup and further refinements. 