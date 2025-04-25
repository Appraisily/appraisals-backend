/**
 * Templates index file - exports HTML templates and handles component composition
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
 * @param {Object} options - Additional options
 * @param {boolean} options.minify - Whether to minify the output (default: false)
 * @returns {string} Complete HTML with embedded CSS and JS
 */
function embedStylesAndScripts(templateName, filledHtml, options = {}) {
  try {
    // Read CSS and JS content
    const cssFilePath = path.join(CSS_PATH, `${templateName}.css`);
    const jsFilePath = path.join(JS_PATH, `${templateName}.js`);
    
    // Ensure the files exist
    if (!fs.existsSync(cssFilePath)) {
      throw new Error(`CSS file not found: ${cssFilePath}`);
    }
    if (!fs.existsSync(jsFilePath)) {
      throw new Error(`JS file not found: ${jsFilePath}`);
    }
    
    // Read the CSS and JS files
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    const jsContent = fs.readFileSync(jsFilePath, 'utf8');
    
    // For enhanced-analytics, verify that all chart modules are included in the main JS
    if (templateName === 'enhanced-analytics') {
      // Check for critical functions
      if (!jsContent.includes('initRadarChart') || 
          !jsContent.includes('initPriceHistoryChart') || 
          !jsContent.includes('validateCharts')) {
        console.warn('Warning: Some chart module functions may be missing from enhanced-analytics.js');
      }
    }
    
    // Optional: Apply simple minification if requested
    const processedCss = options.minify ? minifyCss(cssContent) : cssContent;
    const processedJs = options.minify ? minifyJs(jsContent) : jsContent;
    
    // Combine into final HTML
    const finalHtml = `<!-- Automatically generated complete HTML for ${templateName} -->
<style>
${processedCss}
</style>

${filledHtml}

<script>
${processedJs}
</script>`;

    return finalHtml;
  } catch (error) {
    console.error(`Error embedding styles and scripts for ${templateName}:`, error);
    // Return the original HTML rather than a fallback to avoid mockup data
    return filledHtml;
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
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
}

/**
 * Very simple CSS minifier (optional)
 * @param {string} css - CSS content to minify
 * @returns {string} Minified CSS
 */
function minifyCss(css) {
  if (!css) return '';
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')            // Reduce whitespace to single space
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around brackets, colons, etc
    .replace(/;\}/g, '}')             // Remove unnecessary semicolons
    .trim();
}

/**
 * Very simple JS minifier (optional)
 * @param {string} js - JS content to minify
 * @returns {string} Minified JS
 */
function minifyJs(js) {
  if (!js) return '';
  return js
    .replace(/\/\/.*$/gm, '')        // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/^\s*\n/gm, '')         // Remove empty lines
    .replace(/\s+/g, ' ')            // Reduce whitespace to single space
    .replace(/\s*([{}:;,=()])\s*/g, '$1') // Remove spaces around brackets, colons, etc
    .trim();
}

/**
 * Verify that all component dependencies are available
 * @returns {boolean} True if all components are available
 */
function verifyComponents() {
  const requiredFiles = [
    path.join(CSS_PATH, 'enhanced-analytics.css'),
    path.join(CSS_PATH, 'appraisal-card.css'),
    path.join(JS_PATH, 'enhanced-analytics.js'),
    path.join(JS_PATH, 'appraisal-card.js'),
    path.join(TEMPLATES_PATH, 'enhanced-analytics.html'),
    path.join(TEMPLATES_PATH, 'appraisal-card.html'),
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('Error: Some component files are missing:', missingFiles);
    return false;
  }
  
  return true;
}

// Run verification on module load
verifyComponents();

module.exports = {
  'appraisal-card': appraisalCardTemplate,
  'enhanced-analytics': enhancedAnalyticsTemplate,
  embedStylesAndScripts,
  getCleanTemplate
};