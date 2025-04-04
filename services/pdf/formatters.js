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
 * Builds a comprehensive statistics and justification section
 * @param {Object} statistics - Statistics data
 * @param {Object} justification - Justification data including explanation and auction results
 * @param {Object} metadata - Full metadata object containing any additional fields
 * @returns {string} - Formatted HTML for Google Docs
 */
function buildStatisticsSection(statistics, justification = {}, metadata = {}) {
  // Default values and data validation
  const count = statistics?.count || 'N/A';
  const mean = statistics?.average_price 
    ? formatCurrency(statistics.average_price) 
    : (statistics?.mean ? formatCurrency(statistics.mean) : 'N/A');
  const median = statistics?.median_price ? formatCurrency(statistics.median_price) : 'N/A';
  const percentile = statistics?.percentile || 'N/A';
  const confidenceLevel = statistics?.confidence_level || 'Low';
  const priceRange = statistics?.price_min && statistics?.price_max 
    ? `${formatCurrency(statistics.price_min)} - ${formatCurrency(statistics.price_max)}`
    : 'Not available';
  
  // Get enhanced statistics summary from metadata or fallback to basic summary
  const statisticsSummaryText = metadata?.statistics_summary_text || statistics?.summary_text || 
    'Market statistics analysis is based on comparable items.';
  
  // Justification text - from justification object or default message
  const justificationText = justification?.explanation || 'No detailed justification available for this appraisal.';
  
  // Get comparable auction results - preferring the top_auction_results if available
  const auctionResults = metadata?.top_auction_results || justification?.auctionResults || [];
  let auctionTableRows = '';
  
  // Build auction results table rows (limit to 10 most relevant)
  const topResults = auctionResults.slice(0, 10);
  for (const result of topResults) {
    const title = result.title || 'Unknown Item';
    const price = result.price ? formatCurrency(result.price) : 'N/A';
    const house = result.house || 'Unknown';
    const date = result.date 
      ? new Date(result.date).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})
      : 'Unknown';
    // Add percentage difference if available
    const diffString = result.diff ? ` (${result.diff})` : '';
    
    auctionTableRows += `
      <tr${result.is_current ? ' style="background-color:#F0F7FF; font-weight:bold;"' : ''}>
        <td style="padding:6pt; border:1pt solid #DDDDDD;">${title}</td>
        <td style="padding:6pt; border:1pt solid #DDDDDD;">${house}</td>
        <td style="padding:6pt; border:1pt solid #DDDDDD;">${date}</td>
        <td style="padding:6pt; border:1pt solid #DDDDDD;">${price}${diffString}</td>
      </tr>
    `;
  }
  
  // Build the complete HTML structure
  return `
    <h1 style="color:#2C5282; font-size:16pt; margin-top:24pt; margin-bottom:12pt;">Market Statistics & Valuation Analysis</h1>
    
    <table style="width:100%; border-collapse:collapse; border:1pt solid #DDDDDD; margin-bottom:15pt;">
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Sample Size:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${count}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Average Price:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${mean}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Median Price:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${median}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Price Range:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${priceRange}</td>
      </tr>
      <tr>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Value Percentile:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${percentile}</td>
        <td style="width:25%; font-weight:bold; padding:8pt; background-color:#F8F8F8; border:1pt solid #DDDDDD;">Market Confidence:</td>
        <td style="width:25%; padding:8pt; border:1pt solid #DDDDDD;">${confidenceLevel}</td>
      </tr>
    </table>
    
    <h2 style="color:#2C5282; font-size:14pt; margin-top:18pt; margin-bottom:10pt;">Statistical Market Analysis</h2>
    <p style="line-height:1.5; text-align:justify; margin-bottom:15pt;">${statisticsSummaryText}</p>
    
    <h2 style="color:#2C5282; font-size:14pt; margin-top:18pt; margin-bottom:10pt;">Valuation Justification</h2>
    <p style="line-height:1.5; text-align:justify; margin-bottom:15pt;">${justificationText}</p>
    
    ${auctionResults.length > 0 ? `
    <h2 style="color:#2C5282; font-size:14pt; margin-top:18pt; margin-bottom:10pt;">Comparable Market Results</h2>
    
    <table style="width:100%; border-collapse:collapse; border:1pt solid #DDDDDD; margin-bottom:15pt;">
      <tr style="background-color:#F8F8F8; font-weight:bold;">
        <td style="padding:8pt; border:1pt solid #DDDDDD;">Item</td>
        <td style="padding:8pt; border:1pt solid #DDDDDD;">Auction House</td>
        <td style="padding:8pt; border:1pt solid #DDDDDD;">Date</td>
        <td style="padding:8pt; border:1pt solid #DDDDDD;">Price</td>
      </tr>
      ${auctionTableRows}
    </table>
    ` : ''}
    
    <p style="font-size:10pt; color:#718096; margin-top:30pt; border-top:1pt solid #DDDDDD; padding-top:8pt;">
      Note: Statistics based on ${count} comparable items from auction records and market data. 
      The appraisal value represents the fair market value as determined by expert analysis and 
      comparable sales data at the time of appraisal.
    </p>
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