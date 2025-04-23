# Templates Directory

This directory contains the HTML templates used in the appraisal generation process.

## Directory Structure

- `skeletons/` - HTML templates used by AI to generate content
  - `appraisal-card.html` - HTML template for appraisal card display
  - `enhanced-analytics.html` - HTML template for enhanced analytics visualization
- `index.js` - Exports raw HTML templates for use by the application

## Template Usage

The templates in the `skeletons/` directory are raw HTML files sent directly to AI services without any preprocessing or parsing. This approach eliminates potential errors that could be introduced during template manipulation.

### Accessing Templates

Templates should be accessed through the centralized interface in `templates/index.js`:

```javascript
// Recommended way to import templates
const templates = require('./templates');

// Then use specific templates directly with AI services
const htmlTemplate = templates['appraisal-card']; 
```

## Legacy JavaScript Files

The repository still contains the following JavaScript files that previously handled template generation:

- `enhanced-analytics.js` - Previously used for visualization template generation
- `appraisal-card.js` - Previously used for appraisal card template generation
- `gemini-templates.js` - Previously used for Gemini template generation

These files are kept for reference but are no longer actively used in the template handling process. 