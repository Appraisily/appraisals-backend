/**
 * Utility for cleaning and fixing problematic JSON from WordPress
 */

/**
 * Attempts to deep clean and parse JSON data that may contain invalid characters or special formats
 * @param {string|Object} data - JSON string or object to clean
 * @param {boolean} doNotParse - If true, returns the cleaned string without parsing
 * @returns {Object|string} Parsed JSON object or cleaned string if doNotParse is true
 */
function cleanAndParseJSON(data, doNotParse = false) {
  // If already an object, nothing to parse
  if (typeof data !== 'string') {
    return data;
  }

  // Check if empty or null-like
  if (!data || data.trim() === '' || data === 'null' || data === 'undefined') {
    return doNotParse ? '' : {};
  }

  try {
    // Step 1: Basic JSON parse attempt
    return JSON.parse(data);
  } catch (initialError) {
    console.log('Initial JSON parse failed, attempting deep cleaning');
    
    try {
      // Step 2: Clean input data
      let cleanedData = data;
      
      // Replace PHP-style array notation
      if (cleanedData.includes('=>')) {
        console.log('Detected PHP array notation, attempting conversion');
        cleanedData = cleanedData.replace(/(\w+)\s*=>\s*/gi, '"$1":');
        cleanedData = cleanedData.replace(/'([^']+)':/gi, '"$1":');
      }
      
      // Replace escape sequences and slashes
      cleanedData = cleanedData
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      
      // Replace Unicode / Special Characters
      cleanedData = cleanedData
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/\u00A0/g, ' ')         // Replace non-breaking spaces
        .replace(/\u2022/g, '-')         // Replace bullet points
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
        
      // Fix common JSON syntax issues
      cleanedData = cleanedData
        .replace(/,\s*}/g, '}')           // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']')          // Remove trailing commas in arrays
        .replace(/\bNaN\b/g, 'null')      // Replace NaN with null
        .replace(/\bInfinity\b/g, 'null') // Replace Infinity with null
        .replace(/\bundefined\b/g, 'null'); // Replace undefined with null
      
      // Look for known problem patterns and fix them
      // Example: Clean up incorrectly escaped unicode characters
      if (cleanedData.includes('\\u')) {
        cleanedData = cleanedData.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
      }
      
      // Fix incomplete objects or arrays
      const openBraces = (cleanedData.match(/\{/g) || []).length;
      const closeBraces = (cleanedData.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        cleanedData += '}'.repeat(openBraces - closeBraces);
      }
      
      const openBrackets = (cleanedData.match(/\[/g) || []).length;
      const closeBrackets = (cleanedData.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        cleanedData += ']'.repeat(openBrackets - closeBrackets);
      }
      
      // If we're not supposed to parse, return the cleaned string
      if (doNotParse) {
        return cleanedData;
      }
      
      // Step 3: Try to parse the cleaned data
      try {
        return JSON.parse(cleanedData);
      } catch (cleanedError) {
        // Step 4: Try with more aggressive cleaning - strip all backslashes
        try {
          const strippedData = cleanedData.replace(/\\/g, '');
          return JSON.parse(strippedData);
        } catch (strippedError) {
          // Log helpful debugging information about the JSON
          console.error('JSON parse error after cleaning attempts:', strippedError.message);
          
          // Try to identify the problematic position
          if (strippedError.message.includes('position')) {
            const posMatch = strippedError.message.match(/position (\d+)/);
            if (posMatch && posMatch[1]) {
              const pos = parseInt(posMatch[1]);
              const startPos = Math.max(0, pos - 20);
              const endPos = Math.min(cleanedData.length, pos + 20);
              console.error(`JSON error context: ...${cleanedData.substring(startPos, pos)}[ERROR]${cleanedData.substring(pos, endPos)}...`);
            }
          }
          
          // Return an empty object as a fallback
          return {};
        }
      }
    } catch (error) {
      console.error('Error during JSON cleaning process:', error);
      return {}; // Return empty object as ultimate fallback
    }
  }
}

/**
 * Safely stringifies an object to JSON with additional checks
 * @param {Object} data - The data to stringify
 * @returns {string} JSON string or empty object string if failed
 */
function safeStringify(data) {
  try {
    // Check for circular references
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return '{}';
  }
}

module.exports = {
  cleanAndParseJSON,
  safeStringify
};