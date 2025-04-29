const fetch = require('node-fetch');
const config = require('../config');

/**
 * Calls the valuer agent's /api/justify endpoint.
 * @param {string} text - The text (e.g., post title) to justify.
 * @param {number} value - The numeric value to justify.
 * @returns {Promise<object>} - The response from the valuer agent.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 */
async function justifyValue(text, value) {
  const apiUrl = `${config.VALUER_AGENT_API_URL}/api/justify`;
  console.log(`Calling Valuer Agent: POST ${apiUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, value }),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // Clear the timeout

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from valuer agent (${apiUrl}):`, errorText);
      throw new Error(`Valuer agent error (${response.status}): ${errorText}`);
    }

    const valuerResponse = await response.json();
    console.log('Valuer agent /api/justify response received.');
    
    if (!valuerResponse.success) {
       console.warn('Valuer agent /api/justify call returned success: false');
       // Decide if this should be an error or handled by the caller
       // throw new Error('Valuer agent returned unsuccessful response for /api/justify');
    }
    
    return valuerResponse;
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error
    console.error(`Error calling valuer agent (${apiUrl}):`, error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Calls the valuer agent's /api/enhanced-statistics endpoint.
 * @param {string} text - The text (e.g., post title).
 * @param {number} value - The numeric value.
 * @param {number} limit - Max number of comparable sales for UI.
 * @param {number} minPrice - Min price filter.
 * @param {number} maxPrice - Max price filter.
 * @returns {Promise<object>} - The response containing statistics.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 */
async function getEnhancedStatistics(text, value, limit = 20, minPrice, maxPrice) {
  const apiUrl = `${config.VALUER_AGENT_API_URL}/api/enhanced-statistics`;
  console.log(`Calling Valuer Agent: POST ${apiUrl}`);
  
  const payload = { text, value, limit, minPrice, maxPrice };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minute timeout
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // Clear the timeout

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from valuer agent (${apiUrl}):`, errorText);
      throw new Error(`Valuer agent error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Valuer agent /api/enhanced-statistics response received.');
    
    if (!responseData.success || !responseData.statistics) {
      console.warn('Valuer agent /api/enhanced-statistics did not return successful statistics:', responseData.message || 'Unknown reason');
      // Return a structure indicating failure or partial success
      return { success: false, statistics: null, message: responseData.message || 'Statistics retrieval failed' };
    }

    return responseData; // Contains { success: true, statistics: {...} }
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error
    console.error(`Error calling valuer agent (${apiUrl}):`, error);
    // Re-throw the error or return a standardized error structure
    throw error; 
  }
}

module.exports = {
  justifyValue,
  getEnhancedStatistics
}; 