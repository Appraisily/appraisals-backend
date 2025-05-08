# Appraisals HTML Template System

This directory contains HTML templates with placeholders that are used by AI to generate dynamic content for appraisal cards and enhanced analytics displays.

## Directory Structure

- `/templates/skeletons/` - Contains clean HTML skeletons with placeholders
- `/static/css/` - Contains extracted CSS styles
- `/static/js/` - Contains extracted JavaScript code

## Workflow

1. **Backend → AI**:
   - Backend sends a clean HTML skeleton template (from `/skeletons/`) to the AI
   - These templates contain only the HTML structure with placeholders like `{{VARIABLE_NAME}}`
   - No CSS or JavaScript is included in what's sent to the AI

2. **AI → Backend**:
   - AI returns the filled HTML with real data values inserted
   - Still contains no CSS or JavaScript

3. **Backend Processing**:
   - Backend receives the filled HTML from AI
   - Uses `embedStylesAndScripts()` to re-embed CSS and JS into the HTML
   - Creates a complete, self-contained HTML chunk

4. **WordPress Storage**:
   - Backend uploads the complete HTML chunk to WordPress
   - Stored in ACF (Advanced Custom Fields) metadata fields
   - For enhanced analytics: use `enhanced_analytics_html` field
   - For appraisal cards: use `appraisal_card_html` field

## API Usage

```javascript
const templates = require('./templates/index');

// Get clean template to send to AI
const cleanTemplate = templates.getCleanTemplate('enhanced-analytics');
// ... send to AI service ...

// When AI returns data, re-embed CSS and JS
const aiFilledHtml = aiResponse.html;
const completeHtml = templates.embedStylesAndScripts('enhanced-analytics', aiFilledHtml);

// Save complete HTML to WordPress ACF field using your WordPress API
// wp.saveACF('enhanced_analytics_html', completeHtml);
```

## Important Notes

- The backend is responsible for composing back the whole HTML with styles and scripts
- The complete HTML is then uploaded to WordPress using ACF fields
- Direct embedding is used (instead of external CSS/JS links) to keep everything in one self-contained chunk
- This approach ensures the AI only needs to process the structural HTML, not styles or behavior
- When prompting the AI to fill templates (e.g., `appraisal-card.html`), explicitly instruct it that all monetary values, particularly for the `{{VALUE_FORMATTED}}` placeholder, must be displayed in USD. For example, include a directive in your prompt like: "Ensure the {{VALUE_FORMATTED}} placeholder includes the currency as USD (e.g., '$1,234 USD' or '1,234 USD')." This helps prevent accidental currency misrepresentation (e.g., AUD).

## Legacy JavaScript Files

The repository still contains the following JavaScript files that previously handled template generation:

- `enhanced-analytics.js` - Previously used for visualization template generation
- `appraisal-card.js` - Previously used for appraisal card template generation
- `gemini-templates.js` - Previously used for Gemini template generation

These files are kept for reference but are no longer actively used in the template handling process. 