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

/**
 * Generates numeric scores for appraisal factors using Gemini based on provided data.
 * 
 * @param {object} appraisalData - The ACF data for the appraisal (e.g., description, condition, provenance).
 * @param {object} statisticsData - Calculated statistics (e.g., market trend, comparable counts, price range).
 * @returns {Promise<object>} - An object containing the generated scores (e.g., { condition_score: 75, rarity_score: 60, ... }).
 * @throws {Error} If the Gemini API call fails or returns an unexpected response, or if not initialized.
 */
async function generateScores(appraisalData, statisticsData) {
    if (!isGeminiInitialized || !model) {
        throw new Error("Gemini Service is not initialized (check API key and initialization logs).");
    }
    if (!appraisalData || typeof appraisalData !== 'object') {
        throw new Error("Appraisal data object is required for score generation.");
    }
    if (!statisticsData || typeof statisticsData !== 'object') {
        throw new Error("Statistics data object is required for score generation.");
    }

    console.log('[Gemini Service] Generating scores via SDK...');

    // --- Prepare Data for Prompt ---
    // Select relevant fields to avoid overwhelming the model
    const relevantAppraisalInfo = {
        title: appraisalData.title || 'N/A',
        description: appraisalData.description || 'N/A',
        object_type: appraisalData.object_type || 'N/A',
        medium: appraisalData.medium || 'N/A',
        dimensions: appraisalData.dimensions || 'N/A',
        period_age: appraisalData.age || 'N/A', // Assuming 'age' field exists
        condition_description: appraisalData.condition || 'N/A', // Assuming 'condition' field is descriptive text
        provenance_details: appraisalData.provenance || 'N/A', // Assuming 'provenance' field is descriptive text
        artist_creator: appraisalData.artist_creator_name || 'N/A',
        appraised_value: appraisalData.appraisal_value || 'N/A', // Use the actual value field
    };

    const relevantStatsInfo = {
        comparable_item_count: statisticsData.count || 0,
        average_comparable_price: statisticsData.average_price || 0,
        price_range: statisticsData.price_range ? `${statisticsData.price_range.min} - ${statisticsData.price_range.max}` : 'N/A',
        price_trend_percentage: statisticsData.annual_change_percent ? `${statisticsData.annual_change_percent.toFixed(1)}%` : 'N/A',
        market_segment: statisticsData.market_segment || 'N/A',
        coefficient_of_variation: statisticsData.coefficient_of_variation ? `${statisticsData.coefficient_of_variation.toFixed(1)}%` : 'N/A',
        // Add other relevant stats as needed
    };

    const appraisalString = JSON.stringify(relevantAppraisalInfo, null, 2);
    const statsString = JSON.stringify(relevantStatsInfo, null, 2);

    // --- Construct Prompt ---
    const prompt = `
    Analyze the following Art Appraisal information and associated Market Statistics to determine scores for key valuation factors. 

    **Appraisal Details:**
    \`\`\`json
    ${appraisalString}
    \`\`\`

    **Market Statistics (for comparable items):**
    \`\`\`json
    ${statsString}
    \`\`\`

    **Your Task:**
    Based *only* on the provided information, estimate scores for the following six factors on a scale of 0 to 100, where 100 represents the highest/best possible assessment for that factor. Consider the description, materials, age, artist, provenance, condition description, and the market context (comparable prices, trends, variation). Output *only* a valid JSON object containing these six scores.

    **Output Format (Strict JSON):**
    Provide *only* a single JSON object with the following keys and integer values between 0 and 100:
    {
      "condition_score": <0-100>,
      "rarity_score": <0-100>,
      "market_demand_score": <0-100>,
      "historical_significance_score": <0-100>,
      "investment_potential_score": <0-100>,
      "provenance_strength_score": <0-100>
    }

    **Example Output:**
    {
      "condition_score": 85,
      "rarity_score": 70,
      "market_demand_score": 65,
      "historical_significance_score": 75,
      "investment_potential_score": 60,
      "provenance_strength_score": 90
    }

    Generate the JSON output now.
    `;

    // --- Call Gemini API ---
    try {
        console.log(`[Gemini Service] Calling model.generateContent for scores with model: ${MODEL_NAME}`);
        // Use a slightly different config if needed, maybe lower temperature for consistent JSON?
        const scoreGenerationConfig = { ...generationConfig, responseMimeType: "application/json", temperature: 0.5 }; 
        
        const result = await model.generateContent(
            prompt,
            scoreGenerationConfig
        );
        const response = result.response;
        const scoresJsonText = response.text();

        if (!scoresJsonText) {
            const responseText = JSON.stringify(response, null, 2); 
            console.error("[Gemini Service] Invalid or empty text content in score generation response:", responseText);
            throw new Error(`Invalid or empty JSON content from Gemini API for scores. Response: ${responseText}`);
        }

        console.log("[Gemini Service] Raw scores JSON received:", scoresJsonText);

        // --- Parse and Validate Response ---
        let scores;
        try {
            scores = JSON.parse(scoresJsonText);
        } catch (parseError) {
            console.error("[Gemini Service] Failed to parse JSON response for scores:", parseError);
            console.error("[Gemini Service] Raw non-JSON response:", scoresJsonText); // Log the raw response
            throw new Error(`Failed to parse scores JSON from Gemini: ${parseError.message}. Raw response: ${scoresJsonText}`);
        }

        // Basic validation of the structure and values
        const requiredKeys = [
            'condition_score', 'rarity_score', 'market_demand_score',
            'historical_significance_score', 'investment_potential_score', 'provenance_strength_score'
        ];
        const missingKeys = requiredKeys.filter(key => !(key in scores));
        if (missingKeys.length > 0) {
            throw new Error(`Generated scores object is missing required keys: ${missingKeys.join(', ')}`);
        }

        for (const key of requiredKeys) {
            const value = scores[key];
            if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
                throw new Error(`Invalid value for score '${key}': ${value}. Must be an integer between 0 and 100.`);
            }
        }

        console.log('[Gemini Service] Scores generated and validated successfully:', scores);
        return scores;

    } catch (error) {
        console.error('[Gemini Service] Error during score generation:', error);
        const errorMessage = error.message || 'Unknown Gemini SDK error during score generation';
        throw new Error(`Gemini SDK error: ${errorMessage}`);
    }
}

/**
 * Generates descriptive text fields for the PDF appraisal report using Gemini.
 * 
 * @param {object} appraisalData - The ACF data for the appraisal (e.g., description, condition, provenance, artist).
 * @param {object} statisticsData - Calculated statistics (e.g., market trend, comparable counts, price range).
 * @param {object} generatedScores - The AI-generated numeric scores (0-100).
 * @returns {Promise<object>} - An object containing the generated text fields (e.g., { valuation_method: "...", authorship: "...", ... }).
 * @throws {Error} If the Gemini API call fails or returns an unexpected/invalid response, or if not initialized.
 */
async function generatePdfTextFields(appraisalData, statisticsData, generatedScores) {
    if (!isGeminiInitialized || !model) {
        throw new Error("Gemini Service is not initialized.");
    }
    // Basic validation of inputs
    if (!appraisalData || typeof appraisalData !== 'object') {
        throw new Error("Appraisal data object is required for PDF text generation.");
    }
     if (!statisticsData || typeof statisticsData !== 'object') {
        // Allow proceeding even if stats are minimal, but log it
        console.warn("[Gemini Service] Statistics data is missing or invalid for PDF text generation. Results may be less detailed.");
        statisticsData = {}; // Use empty object to avoid errors later
    }
    if (!generatedScores || typeof generatedScores !== 'object') {
        // Allow proceeding even if scores are missing, but log it
        console.warn("[Gemini Service] Generated scores are missing or invalid for PDF text generation. Results may be less detailed.");
        generatedScores = {}; // Use empty object
    }

    console.log('[Gemini Service] Generating PDF text fields via SDK...');

    // --- Prepare Data for Prompt ---
    // Select relevant fields, combine inputs for clarity
    const context = {
        item: {
            title: appraisalData.title || 'N/A',
            description: appraisalData.description || 'N/A',
            artist_creator: appraisalData.artist_creator_name || 'N/A',
            object_type: appraisalData.object_type || 'N/A',
            medium: appraisalData.medium || 'N/A',
            period_age: appraisalData.age || 'N/A',
            dimensions: appraisalData.dimensions || 'N/A',
            condition_description: appraisalData.condition || 'N/A',
            provenance_details: appraisalData.provenance || 'N/A',
            appraised_value: appraisalData.appraisal_value || 'N/A',
        },
        market_context: {
            comparable_item_count: statisticsData.count || 0,
            average_comparable_price: statisticsData.average_price || 0,
            price_range: statisticsData.price_range ? `$${statisticsData.price_range.min} - $${statisticsData.price_range.max}` : 'N/A',
            price_trend_percentage: statisticsData.price_trend_percentage || 'N/A',
            market_segment: statisticsData.market_segment || 'N/A',
        },
        valuation_factors: {
            condition_score: generatedScores.condition_score ?? 'N/A',
            rarity_score: generatedScores.rarity_score ?? 'N/A',
            market_demand_score: generatedScores.market_demand_score ?? 'N/A',
            historical_significance_score: generatedScores.historical_significance_score ?? 'N/A',
            investment_potential_score: generatedScores.investment_potential_score ?? 'N/A',
            provenance_strength_score: generatedScores.provenance_strength_score ?? 'N/A',
        }
    };

    const contextString = JSON.stringify(context, null, 2);

    // --- Construct Prompt ---
    const prompt = `
    You are an expert art appraiser compiling a formal appraisal report. Based *only* on the provided context data below, generate concise and professional text sections for the specified fields of the report.

    **Context Data:**
    \`\`\`json
    ${contextString}
    \`\`\`

    **Your Task:**
    Generate text for the following fields. Ensure the language is objective, formal, and directly relates to the provided context. Use the numeric scores (0-100) to inform the qualitative descriptions where appropriate (e.g., a high condition_score means excellent condition).
    
    **Required Fields (Output as JSON):**
    1.  **valuation_method:** Briefly explain the primary method used to arrive at the appraised value (e.g., market comparison approach, considering condition, rarity, market data).
    2.  **authorship:** Comment on the attribution or creator of the work based on the provided artist/creator name. If unknown, state that.
    3.  **condition_report:** Summarize the physical condition based on the description and score. Note any significant condition issues if mentioned.
    4.  **provenance_summary:** Briefly summarize the known ownership history based on the details and score.
    5.  **market_summary:** Provide a concise overview of the current market for comparable items, referencing the statistics (count, price range, trend) and market demand/investment scores.
    6.  **conclusion:** A brief concluding paragraph summarizing the key findings of the appraisal.

    **Output Format (Strict JSON):**
    Provide *only* a single, valid JSON object containing these six keys, with string values for each:
    {
      "valuation_method": "<Generated text>",
      "authorship": "<Generated text>",
      "condition_report": "<Generated text>",
      "provenance_summary": "<Generated text>",
      "market_summary": "<Generated text>",
      "conclusion": "<Generated text>"
    }

    **Example Snippet (Illustrative Only):**
    {
      "valuation_method": "The valuation primarily relies on the market comparison approach, analyzing recent sales of comparable works by the same artist, adjusted for factors such as condition, rarity (score: ${context.valuation_factors.rarity_score}), and current market demand (score: ${context.valuation_factors.market_demand_score}).",
      "authorship": "The work is attributed to ${context.item.artist_creator}.",
      ...
    }

    Generate the JSON output now.
    `;

    // --- Call Gemini API ---
    try {
        console.log(`[Gemini Service] Calling model.generateContent for PDF text fields with model: ${MODEL_NAME}`);
        // Ensure JSON output, potentially slightly higher temperature for more descriptive text?
        const textGenerationConfig = { ...generationConfig, responseMimeType: "application/json", temperature: 0.7 };

        const result = await model.generateContent(
            prompt,
            textGenerationConfig
        );
        const response = result.response;
        const generatedJsonText = response.text();

        if (!generatedJsonText) {
            const responseText = JSON.stringify(response, null, 2);
            console.error("[Gemini Service] Invalid or empty text content in PDF text generation response:", responseText);
            throw new Error(`Invalid or empty JSON content from Gemini API for PDF text fields. Response: ${responseText}`);
        }

        console.log("[Gemini Service] Raw PDF text JSON received:", generatedJsonText);

        // --- Parse and Validate Response ---
        let generatedTexts;
        try {
            generatedTexts = JSON.parse(generatedJsonText);
        } catch (parseError) {
            console.error("[Gemini Service] Failed to parse JSON response for PDF text fields:", parseError);
            console.error("[Gemini Service] Raw non-JSON response:", generatedJsonText);
            throw new Error(`Failed to parse PDF text fields JSON from Gemini: ${parseError.message}. Raw response: ${generatedJsonText}`);
        }

        // Basic validation of structure and types
        const requiredKeys = [
            'valuation_method', 'authorship', 'condition_report',
            'provenance_summary', 'market_summary', 'conclusion'
        ];
        const missingKeys = requiredKeys.filter(key => !(key in generatedTexts));
        if (missingKeys.length > 0) {
            throw new Error(`Generated PDF text object is missing required keys: ${missingKeys.join(', ')}`);
        }

        for (const key of requiredKeys) {
            if (typeof generatedTexts[key] !== 'string') {
                // Attempt to convert non-strings, log warning
                console.warn(`[Gemini Service] PDF text field '${key}' was not a string, attempting conversion. Value:`, generatedTexts[key]);
                generatedTexts[key] = String(generatedTexts[key]); 
                // Or throw: throw new Error(`Invalid type for PDF text field '${key}': Expected string.`);
            }
        }

        console.log('[Gemini Service] PDF text fields generated and validated successfully.');
        return generatedTexts;

    } catch (error) {
        console.error('[Gemini Service] Error during PDF text field generation:', error);
        const errorMessage = error.message || 'Unknown Gemini SDK error during PDF text generation';
        throw new Error(`Gemini SDK error: ${errorMessage}`);
    }
}

module.exports = {
    populateHtmlTemplate,
    generateScores,
    generatePdfTextFields
}; 