// formatters.js - Utility functions for generating formatted content

/**
 * Builds a formatted appraisal summary card
 * @param {Object} metadata - Appraisal metadata
 * @returns {string} - Formatted HTML for Google Docs
 */
function buildAppraisalCard(metadata) {
  // Default values and data validation
  const title = metadata.title || 'Untitled';
  const creator = metadata.creator || 'Unknown Artist';
  const objectType = metadata.object_type || 'Art Object';
  const estimatedAge = metadata.estimated_age || 'Unknown';
  const medium = metadata.medium || 'Unknown';
  const condition = metadata.condition_summary || 'Not assessed';
  const value = metadata.appraisal_value || 'Not determined';
  
  // Format percentages with % symbol if needed
  const marketDemand = formatPercentage(metadata.market_demand);
  const rarity = formatPercentage(metadata.rarity);
  const conditionScore = formatPercentage(metadata.condition_score);
  
  // Build the HTML structure
  return `
    <table style="width:100%; border-collapse:collapse; margin-bottom:20pt; border:1pt solid #CCCCCC;">
      <tr>
        <td colspan="4" style="background-color:#3182CE; color:white; padding:8pt; font-weight:bold; font-size:14pt; text-align:center;">
          APPRAISAL SUMMARY
        </td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Item Title:</td>
        <td colspan="3" style="padding:8pt; border:1pt solid #DDDDDD;">${title}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Artist/Creator:</td>
        <td colspan="3" style="padding:8pt; border:1pt solid #DDDDDD;">${creator}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Object Type:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${objectType}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Period/Age:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${estimatedAge}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Medium:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${medium}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; border:1pt solid #DDDDDD; background-color:#F8F8F8;">Condition:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${condition}</td>
      </tr>
      <tr>
        <td colspan="4" style="background-color:#F0F7FF; padding:10pt; text-align:center; border:1pt solid #DDDDDD;">
          <div style="font-weight:bold; font-size:12pt; margin-bottom:5pt;">APPRAISED VALUE</div>
          <div style="font-weight:bold; font-size:16pt; color:#2C5282;">${value}</div>
        </td>
      </tr>
    </table>
    
    <table style="width:100%; border-collapse:collapse; margin-bottom:15pt;">
      <tr>
        <td colspan="3" style="padding:8pt; font-weight:bold; font-size:12pt; border-bottom:1pt solid #DDDDDD;">
          MARKET METRICS
        </td>
      </tr>
      <tr>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Market Demand</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F0F7FF; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #3182CE; text-align:center;">
            ${marketDemand}
          </div>
        </td>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Rarity</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F5F0FF; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #805AD5; text-align:center;">
            ${rarity}
          </div>
        </td>
        <td style="width:33%; padding:10pt; text-align:center; vertical-align:top;">
          <div style="font-weight:bold; margin-bottom:5pt;">Condition Score</div>
          <div style="width:80pt; height:80pt; border-radius:40pt; background-color:#F0FFF4; margin:0 auto; line-height:80pt; font-weight:bold; border:3pt solid #38A169; text-align:center;">
            ${conditionScore}
          </div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Builds a formatted statistics section
 * @param {Object} statistics - Statistics data
 * @returns {string} - Formatted HTML for Google Docs
 */
function buildStatisticsSection(statistics) {
  // Default values and data validation
  const count = statistics?.count || 'N/A';
  const mean = statistics?.mean ? formatCurrency(statistics.mean) : 'N/A';
  const percentile = statistics?.percentile || 'N/A';
  const confidenceLevel = statistics?.confidence_level || 'Low';
  const summaryText = statistics?.summary_text || 'No market statistics are available for this item.';
  
  return `
    <h1 style="color:#2C5282; font-size:16pt; margin-top:24pt; margin-bottom:12pt;">Market Statistics Analysis</h1>
    
    <table style="width:100%; border-collapse:collapse; border:1pt solid #DDDDDD; margin-bottom:15pt;">
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Sample Size:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${count}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Average Price:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${mean}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Your Value Percentile:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${percentile}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Market Confidence:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${confidenceLevel}</td>
      </tr>
    </table>
    
    <p style="line-height:1.5; text-align:justify; margin-bottom:15pt;">${summaryText}</p>
  `;
}

/**
 * Format a value as a percentage, adding % if needed
 * @param {string|number} value - The percentage value
 * @returns {string} - Formatted percentage
 */
function formatPercentage(value) {
  if (!value && value !== 0) return 'N/A';
  
  // Convert to string and trim
  const strValue = String(value).trim();
  
  // Check if it already has a % symbol
  if (strValue.endsWith('%')) {
    return strValue;
  }
  
  // Try to parse as a number
  const numValue = parseFloat(strValue);
  if (isNaN(numValue)) {
    return 'N/A';
  }
  
  // Return with % symbol
  return `${numValue}%`;
}

/**
 * Format a value as currency
 * @param {string|number} value - The monetary value
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  if (!value && value !== 0) return 'N/A';
  
  // Try to parse as a number
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
  
  if (isNaN(numValue)) {
    return 'N/A';
  }
  
  // Format as USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

module.exports = {
  buildAppraisalCard,
  buildStatisticsSection,
  formatPercentage,
  formatCurrency
};