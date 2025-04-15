# Templates Directory

This directory contains the templates used in the appraisal generation process.

## Directory Structure

- `skeletons/` - Base templates used by AI to generate content
  - Template files used for AI prompting to ensure consistent output structure

- `enhanced-analytics.js` - Visualization template generator for enhanced analytics
- `appraisal-card.js` - Template generator for appraisal card display
- `index.js` - Re-exports template generators for use by the application

## Template Usage

The templates in the `skeletons/` directory are used as prompts for AI services to ensure consistent formatting of the generated content. The JavaScript files in this directory convert the data from the API into properly formatted HTML.

### Accessing Templates

Templates should be accessed through the centralized interface in `src/templates/index.js` rather than directly. This provides a cleaner interface and better organization.

```javascript
// Recommended way to import templates
const templates = require('./src/templates');

// Then use specific templates
const htmlContent = templates['enhanced-analytics'](data);
```

## DEPRECATED Folder

The `DEPRECATED/` folder contains old template files that are no longer actively used but are kept for reference. These files should not be used in new development. 