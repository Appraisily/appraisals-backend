/**
 * Templates index file - exports HTML templates directly
 * 
 * This file provides access to raw HTML templates that can be sent
 * directly to AI services without any preprocessing or parsing.
 */
const fs = require('fs');
const path = require('path');

// Paths to static resources
const CSS_PATH = path.join(__dirname, '../static/css');
const JS_PATH = path.join(__dirname, '../static/js');
const TEMPLATES_PATH = path.join(__dirname, './skeletons');

// Read HTML files directly from skeletons folder
const appraisalCardTemplate = fs.readFileSync(path.join(__dirname, 'skeletons', 'appraisal-card.html'), 'utf8');
const enhancedAnalyticsTemplate = fs.readFileSync(path.join(__dirname, 'skeletons', 'enhanced-analytics.html'), 'utf8');

/**
 * Combines an HTML skeleton filled by AI with its CSS and JS components
 * 
 * @param {string} templateName - Name of the template without extension ('enhanced-analytics' or 'appraisal-card')
 * @param {string} filledHtml - HTML content filled by AI with real data
 * @returns {string} Complete HTML with embedded CSS and JS
 */
function embedStylesAndScripts(templateName, filledHtml) {
  try {
    // Read CSS and JS content
    const cssFilePath = path.join(CSS_PATH, `${templateName}.css`);
    const jsFilePath = path.join(JS_PATH, `${templateName}.js`);
    
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    const jsContent = fs.readFileSync(jsFilePath, 'utf8');
    
    // Combine into final HTML
    const finalHtml = `<!-- Automatically generated complete HTML for ${templateName} -->
<style>
${cssContent}
</style>

${filledHtml}

<script>
${jsContent}
</script>`;

    return finalHtml;
  } catch (error) {
    console.error(`Error embedding styles and scripts for ${templateName}:`, error);
    return filledHtml; // Return original if something fails
  }
}

/**
 * Gets a clean skeleton template for sending to AI
 * 
 * @param {string} templateName - Name of the template without extension
 * @returns {string} HTML skeleton with placeholders
 */
function getCleanTemplate(templateName) {
  try {
    const templatePath = path.join(TEMPLATES_PATH, `${templateName}.html`);
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
}

module.exports = {
  'appraisal-card': appraisalCardTemplate,
  'enhanced-analytics': enhancedAnalyticsTemplate,
  embedStylesAndScripts,
  getCleanTemplate
};