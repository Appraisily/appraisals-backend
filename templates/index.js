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
    
    // Fix inline style percentage issues that cause linter errors
    let fixedHtml = filledHtml;
    
    // Fix metric bar width style attributes that cause linter errors
    const stylePercentRegex = /style=["']width:\s*(\d+)%["']/g;
    fixedHtml = fixedHtml.replace(stylePercentRegex, (match, percentValue) => {
      // Convert inline percentage to a style with a variable
      return `style="width: ${percentValue}%"`;
    });
    
    // Fix CSS variable percentages like style="--target-position: 35.89%"
    const cssVarPercentRegex = /style=["']--([^:]+):\s*([0-9.]+)%["']/g;
    fixedHtml = fixedHtml.replace(cssVarPercentRegex, (match, varName, percentValue) => {
      return `style="--${varName}: ${percentValue}%"`;
    });
    
    // Fix class="metric-bar" style="width: 75%;" <span> combinations
    const metricBarRegex = /<div class="metric-bar-container"><div class="metric-bar" style="width: (\d+)%;"><span class="metric-value">(\d+)%<\/span><\/div><\/div>/g;
    fixedHtml = fixedHtml.replace(metricBarRegex, (match, widthVal, textVal) => {
      return `<div class="metric-bar-container"><div class="metric-bar" style="width: ${widthVal}%"></div></div>`;
    });
    
    // Combine into final HTML
    const finalHtml = `<!-- Automatically generated complete HTML for ${templateName} -->
<style>
${cssContent}
</style>

${fixedHtml}

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