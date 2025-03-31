# Statistics Data Handling Fixes

## Issues Identified

Based on the log messages and error reports, we identified the following issues:

1. **JSON Parsing Errors**: When parsing statistics data from WordPress, errors occurred with invalid JSON formats:
   ```
   Error parsing statistics data: SyntaxError: Unexpected token I in JSON at position 2291
   ```

2. **Undefined Error Variable**: In error handling code:
   ```
   [Appraisal] Error during statistics data cleaning: error is not defined
   ```

3. **Statistics Verification Failures**:
   ```
   Verification FAILED: Statistics data could not be parsed after storage
   ```

## Solutions Implemented

### 1. Created JSON Cleaner Utility

Added a robust JSON cleaner utility (`services/utils/jsonCleaner.js`) that provides:

- Deep cleaning of problematic JSON strings
- Multiple fallback parsing strategies
- Handling of special characters and escape sequences
- Fixing common JSON syntax issues
- Detailed error reporting

```javascript
function cleanAndParseJSON(data, doNotParse = false) {
  // Sophisticated cleaning logic to handle various JSON edge cases
  // ... (see full implementation)
}
```

### 2. Fixed Error Variable References

In `routes/appraisal.js`, fixed error variable references:

```javascript
// Changed:
console.warn('[Appraisal] Could not parse statistics data as JSON:', error.message);

// To:
console.warn('[Appraisal] Could not parse statistics data as JSON:', cleanedError.message);
```

### 3. Enhanced HTML Field Update Processing

Updated `services/wordpress/htmlUpdates.js` to use the JSON cleaner:

```javascript
// Clean and ensure statisticsData is a valid object
let cleanedStats = statisticsData;
if (typeof statisticsData === 'string') {
  try {
    cleanedStats = cleanAndParseJSON(statisticsData);
    console.log('Successfully cleaned and parsed statistics data');
  } catch (error) {
    console.error('Error cleaning statistics data:', error);
    cleanedStats = {}; // fallback
  }
}
```

### 4. Improved PDF Metadata Processing

Updated `services/pdf/metadata/processing.js` to use the robust JSON parser:

- When parsing statistics data:
  ```javascript
  statsData = cleanAndParseJSON(statsData);
  ```

- When handling valuer agent data:
  ```javascript
  valuerData = cleanAndParseJSON(postData.acf.valuer_agent_data);
  ```

- When handling auction results:
  ```javascript
  auctionResults = cleanAndParseJSON(postData.acf.auction_results);
  ```

## Key Benefits

1. **Robustness**: The system can now handle malformed JSON from WordPress.
2. **Detailed Errors**: Better error reporting helps pinpoint JSON parsing issues.
3. **Consistency**: All JSON processing uses the same cleaning routine.
4. **Fallbacks**: Multiple parsing strategies ensure data is recovered when possible.

## Testing

These changes have been designed to be non-invasive and only improve JSON parsing. The core functionality remains unchanged. The system should now handle JSON data from WordPress more reliably, particularly in cases where the data may be:

- Escaped multiple times
- Contains special characters
- Has PHP array notation
- Has trailing commas
- Contains invalid values like `undefined` or `NaN`