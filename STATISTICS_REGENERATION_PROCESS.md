# Statistics Regeneration Process Analysis

## Process Overview

The following diagram shows the complete process flow for statistics regeneration in the appraisal system:

```mermaid
graph TD
    A[Client Request] -->|POST| B[/api/visualization/regenerate-statistics-and-visualizations]
    B -->|Extract| C[Post Data & Target Value]
    C -->|Call| D[Valuer Agent /api/enhanced-statistics]
    D -->|Send Item Data| E[Valuer Agent StatisticsService]
    E -->|Extract Keywords| F[KeywordExtractionService]
    F -->|Group Queries| G[MarketDataAggregatorService]
    G -->|Gather Data| H[Progressive Data Search]
    H -->|Process| I[Calculate Statistics]
    I -->|Format| J[Generate Final Statistics Object]
    J -->|Return| K[Valuer Agent Response]
    K -->|Process| L[Validate/Sanitize Statistics]
    L -->|Transform| M[Prepare Data Contexts]
    M -->|Generate HTML| N[Gemini Visualization Generation]
    N -->|Update| O[WordPress Post]
    O -->|Return| P[Response to Client]
    
    subgraph "Valuer Agent"
    E --> F --> G --> H --> I --> J
    end
    
    subgraph "Appraisals Backend"
    B --> C --> D
    K --> L --> M --> N --> O --> P
    end
```

## Key Components

1. **Client Request**: Initiates the process by sending a POST request to regenerate statistics
2. **Appraisals Backend**: Orchestrates the process, prepares data, calls Valuer Agent, and handles visualization generation
3. **Valuer Agent**: External service that handles:
   - Keyword extraction from item description
   - Progressive data gathering strategy (searching for auction data)
   - Statistical analysis (calculating averages, medians, percentiles, etc.)
   - Generating comprehensive statistics object

## Data Flow

1. The client sends a request with a WordPress post ID
2. The appraisals-backend service extracts post data, including title and value
3. A request is sent to Valuer Agent with the title (text) and value
4. Valuer Agent:
   - Extracts keywords from the text
   - Searches for comparable auction items based on those keywords
   - Analyzes the gathered data to generate statistics
   - Returns a comprehensive statistics object
5. The statistics are validated and sanitized
6. Data contexts are prepared for visualization templates
7. HTML visualizations are generated (using Gemini)
8. The WordPress post is updated with statistics and visualizations
9. A response is sent back to the client

## Valuer Agent Response Data

The Valuer Agent `/api/enhanced-statistics` endpoint returns a rich JSON object containing:

- **Core statistics**: count, average_price, median_price, price range, standard_deviation, etc.
- **Price trend data**: percentage change over time
- **Histogram data**: distribution of prices in buckets
- **Comparable sales data**: list of similar items that have sold
- **Price history data**: how prices have changed over time
- **Additional metrics**: historical_significance, investment_potential, provenance_strength
- **Quality indicators**: confidence_level, data_quality

## Where to Add Logging

To see the full payload returned by the Valuer Agent, you can add a logging statement in the `routes/visualization.js` file, immediately after receiving the response from the Valuer Agent.

The ideal location is on line 233, right after the statistics are received but before they are processed:

```javascript
// In appraisals-backend/routes/visualization.js, around line 200-233
// After this block:
try {
    console.log('[Viz Route] Calling valuer-agent for enhanced statistics');
    const valuerAgentUrl = `${config.VALUER_AGENT_API_URL}/api/enhanced-statistics`;
    // Restore correct fetch options for POST request
    const response = await fetch(valuerAgentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: postTitle, 
        value: targetValue,
        limit: 20, // Example limit
        minPrice: Math.floor(targetValue * 0.6),
        maxPrice: Math.ceil(targetValue * 1.6)
      })
    });
    // ... error handling ...
    statsResponse = await response.json();
    // ... more error handling ...
} catch (agentError) {
    // ... error handling ...
}

// ADD YOUR LOG HERE, around line 233:
console.log('[Viz Route] FULL VALUER AGENT RESPONSE:', JSON.stringify(statsResponse, null, 2));
console.log('[Viz Route] Statistics received, validating and sanitizing...');
```

This will log the complete statistics object to the console, allowing you to inspect all data fields returned by the Valuer Agent. 