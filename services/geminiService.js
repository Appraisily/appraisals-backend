const fetch = require('node-fetch');
const config = require('../config'); // Assuming Gemini API key/endpoint might be in config

// Placeholder for actual Gemini API Key loading - adjust as needed
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Or load from config/secrets manager
const GEMINI_API_ENDPOINT = process.env.GEMINI_API_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"; // Example endpoint

/**
 * Populates an HTML skeleton template with data using the Gemini API.
 * 
 * @param {string} skeletonHtml - The HTML template content with {{PLACEHOLDERS}}.\n * @param {object} dataContext - A flat key-value object containing data for placeholders.\n * @returns {Promise<string>} - The populated HTML string.\n * @throws {Error} If the Gemini API call fails or returns an unexpected response.\n */
async function populateHtmlTemplate(skeletonHtml, dataContext) {
  if (!GEMINI_API_KEY) {
      throw new Error("Gemini API Key not configured.");
  }
  if (!skeletonHtml) {
      throw new Error("Skeleton HTML content is required.");
  }
  if (!dataContext || typeof dataContext !== 'object') {
      throw new Error("Data context object is required.");
  }

  console.log('[Gemini Service] Populating HTML template...');

  // Flatten the data context and prepare for the prompt
  const dataContextString = JSON.stringify(dataContext, null, 2);

  const prompt = `
    Given the following HTML skeleton template and JSON data object:

    HTML Skeleton:
    \`\`\`html
    ${skeletonHtml}
    \`\`\`

    JSON Data:
    \`\`\`json
    ${dataContextString}
    \`\`\`

    Your task is to replace *only* the placeholders in the HTML skeleton (formatted like {{PLACEHOLDER_NAME}}) with the corresponding values from the JSON data object. 
    
    **Strict Instructions:**
    1.  **Exact Placeholder Replacement:** Only replace the placeholders. Do NOT alter any other part of the HTML structure, tags, attributes (like id, class, data-*), or text.
    2.  **Match Placeholder Names:** Match the placeholder name (e.g., {{VALUE_FORMATTED}}) exactly with the key in the JSON data object (e.g., "VALUE_FORMATTED").
    3.  **Handle Missing Data:** If a key corresponding to a placeholder is missing or null in the JSON data, replace the placeholder with an empty string ('') or a sensible default (like 'N/A' or 0) if appropriate for the context, but do not leave the placeholder tag itself.
    4.  **Output Only HTML:** Your response must contain *only* the final, populated HTML string. Do NOT include any explanations, commentary, code fences (like \`\`\`html), or any text before or after the HTML content.

    Populate the template now.
    `;

  try {
    // Construct the Gemini API request payload
    // Reference: https://ai.google.dev/api/rest/v1beta/models/generateContent
    const requestPayload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      // Optional: Configure generation parameters (temperature, safety settings, etc.)
      // generationConfig: {
      //   temperature: 0.5,
      //   maxOutputTokens: 8192, // Adjust based on expected output size
      // },
      // safetySettings: [...],
    };

    console.log(`[Gemini Service] Calling Gemini API: ${GEMINI_API_ENDPOINT}`);
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini Service] API Error (${response.status}): ${errorText}`);
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();

    // Extract the generated text - adjust path based on actual Gemini API response structure
    // Example assumes responseData.candidates[0].content.parts[0].text
    const populatedHtml = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!populatedHtml) {
      console.error("[Gemini Service] Invalid or empty response structure:", JSON.stringify(responseData, null, 2));
      throw new Error('Invalid or empty response from Gemini API');
    }

    console.log('[Gemini Service] HTML template populated successfully.');
    // Basic cleanup: Remove potential leading/trailing code fences or whitespace
    return populatedHtml.replace(/^\\s*```html\\s*|\\s*```\\s*$/g, '').trim();

  } catch (error) {
    console.error('[Gemini Service] Error during template population:', error);
    throw error; // Re-throw for the route handler to catch
  }
}

module.exports = {
  populateHtmlTemplate
}; 