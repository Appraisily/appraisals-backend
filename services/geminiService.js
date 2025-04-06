const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load API Key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Initialization ---
let genAI;
let model;
const MODEL_NAME = 'gemini-2.5-pro-preview-03-25'; // Use the specified preview model

// Define generation configuration from user example
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 65536, // Note: Check if this requires specific API tier/quota
    responseMimeType: "text/plain",
};

function initializeGemini() {
    if (!GEMINI_API_KEY) {
        console.error('[Gemini Service] GEMINI_API_KEY environment variable is not set. Service disabled.');
        return false;
    }
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: MODEL_NAME });
        console.log(`[Gemini Service] Initialized with model: ${MODEL_NAME}`);
        return true;
    } catch (error) {
        console.error('[Gemini Service] Failed to initialize GoogleGenerativeAI:', error);
        return false;
    }
}

const isGeminiInitialized = initializeGemini();

/**
 * Populates an HTML skeleton template with data using the Gemini API via SDK.
 * 
 * @param {string} skeletonHtml - The HTML template content with {{PLACEHOLDERS}}.
 * @param {object} dataContext - A flat key-value object containing data for placeholders.
 * @returns {Promise<string>} - The populated HTML string.
 * @throws {Error} If the Gemini API call fails or returns an unexpected response, or if not initialized.
 */
async function populateHtmlTemplate(skeletonHtml, dataContext) {
    if (!isGeminiInitialized || !model) {
        throw new Error("Gemini Service is not initialized (check API key and initialization logs).");
    }
    if (!skeletonHtml) {
        throw new Error("Skeleton HTML content is required.");
    }
    if (!dataContext || typeof dataContext !== 'object') {
        throw new Error("Data context object is required.");
    }

    console.log('[Gemini Service] Populating HTML template via SDK...');

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
        console.log(`[Gemini Service] Calling model.generateContent with model: ${MODEL_NAME}`);
        const result = await model.generateContent(
            prompt,
            generationConfig // Pass the generation config here
        );
        const response = result.response; // Access the response object directly
        const populatedHtml = response.text(); // Use the text() method from the SDK

        if (!populatedHtml) {
            const responseText = JSON.stringify(response, null, 2); // Log the full response if text is missing
            console.error("[Gemini Service] Invalid or empty text content in response:", responseText);
            throw new Error(`Invalid or empty text content from Gemini API. Response: ${responseText}`);
        }

        console.log('[Gemini Service] HTML template populated successfully via SDK.');
        // Basic cleanup: Remove potential leading/trailing code fences or whitespace
        return populatedHtml.replace(/^\\s*```html\\s*|\\s*```\\s*$/g, '').trim();

    } catch (error) {
        console.error('[Gemini Service] Error during SDK template population:', error);
        // Extract more details if available from the SDK error
        const errorMessage = error.message || 'Unknown Gemini SDK error';
        throw new Error(`Gemini SDK error: ${errorMessage}`); // Re-throw for the route handler to catch
    }
}

module.exports = {
    populateHtmlTemplate
}; 