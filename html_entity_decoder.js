/**
 * Helper functions to properly decode HTML entities in dynamically
 * generated web content
 */

/**
 * Decode HTML entities in a text string
 * @param {string} text - Text containing HTML entities to decode
 * @returns {string} Decoded text with entities converted to characters
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Use textarea trick for basic entity decoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Handle common numeric entities
  decoded = decoded.replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  });
  
  // Handle specific entities that may not be properly decoded
  const replacements = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#215;': '×',
    '&times;': '×',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '•',
    '&hellip;': '…',
    '&#8216;': ''', // Left single quote
    '&#8217;': ''', // Right single quote
    '&#8220;': '"', // Left double quote
    '&#8221;': '"', // Right double quote
    '&#8226;': '•', // Bullet
    '&#8211;': '–', // En dash
    '&#8212;': '—', // Em dash
    '&#8230;': '…'  // Ellipsis
  };
  
  Object.keys(replacements).forEach(entity => {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacements[entity]);
  });
  
  return decoded;
}

/**
 * Find elements matching the specified selectors and decode HTML entities in their text content
 * @param {Array<string>} selectors - CSS selectors to match elements to decode
 */
function decodeHtmlInElements(selectors) {
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.textContent) {
        el.textContent = decodeHtmlEntities(el.textContent);
      }
    });
  });
}

// Automatically run decoder on common text elements after DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Common text elements to decode
  const commonTextElements = [
    '.artwork-title',
    '.artwork-info h2', // Specifically target the appraisal card title
    '.artwork-creator',
    '.artwork-description',
    '.detail-value',
    'h1', 'h2', 'h3', 'h4', 'h5',
    'p', 'span', 'div.text-content',
    'th', 'td'
  ];
  
  // Decode HTML entities in these elements
  decodeHtmlInElements(commonTextElements);
  
  console.log('HTML entity decoder initialized');
});

// Also handle cases where the DOM may have already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  const commonTextElements = [
    '.artwork-title',
    '.artwork-info h2', // Specifically target the appraisal card title
    '.artwork-creator',
    '.artwork-description',
    '.detail-value',
    'h1', 'h2', 'h3', 'h4', 'h5',
    'p', 'span', 'div.text-content',
    'th', 'td'
  ];
  
  // Decode HTML entities in these elements
  decodeHtmlInElements(commonTextElements);
  
  console.log('HTML entity decoder initialized (on already loaded DOM)');
}