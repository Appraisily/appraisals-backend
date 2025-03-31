/**
 * Template generator for appraisal card visualization
 * Generates a complete, self-contained HTML component
 */

/**
 * Helper function to decode HTML entities in text
 * @param {string} text - Text that may contain HTML entities
 * @returns {string} Decoded text with HTML entities converted to characters
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Create a textarea element to decode entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  const decoded = textarea.value;
  
  // Handle common entities that might not be decoded correctly
  return decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#215;/g, '×');
}

/**
 * Generate HTML for appraisal card visualization
 * @param {Object} appraisal - The appraisal data object
 * @param {Object} stats - The statistics data object
 * @param {Object} options - Additional options for customization
 * @returns {string} Complete HTML with embedded CSS and JavaScript
 */
exports.generateAppraisalCard = function(appraisal, stats, options = {}) {
  // Default values
  const appraisalData = appraisal || {};
  const statsData = stats || {};
  
  // Extract data from the appraisal and stats objects or use defaults
  let title = appraisalData.title || 'Untitled Artwork';
  const creator = appraisalData.creator || 'Unknown Artist';
  
  // Decode HTML entities in the title and other text fields
  title = title.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#039;/g, "'")
               .replace(/&#215;/g, '×');
  const object_type = appraisalData.object_type || 'Art Object';
  const age = appraisalData.estimated_age || '20th Century';
  const medium = appraisalData.medium || 'Mixed Media';
  const condition = appraisalData.condition_summary || 'Good';
  
  // Get metrics
  const market_demand = parseInt(appraisalData.market_demand || 75);
  const rarity = parseInt(appraisalData.rarity || 70);
  const condition_score = parseInt(appraisalData.condition_score || 80);
  
  // Get value
  const value = parseInt(appraisalData.value || 4500);
  const formatted_value = '$' + numberWithCommas(value) + ' USD';
  
  // Extract key stats if available
  const percentile = statsData.percentile || '75th';
  const percentile_num = parseInt(String(percentile).replace(/\D/g, '')) || 75;
  const price_trend = statsData.price_trend_percentage || '+8.5%';
  const confidence = statsData.confidence_level || 'High';
  const is_trend_positive = String(price_trend).includes('+');
  const trend_value = parseFloat(String(price_trend).replace(/[^0-9.-]/g, '')) || 8.5;
  
  // Generate unique IDs for charts
  const market_chart_id = 'market-chart-' + generateUniqueId();
  const metrics_chart_id = 'metrics-chart-' + generateUniqueId();
  const gauge_chart_id = 'gauge-chart-' + generateUniqueId();
  
  // Get current date for the report
  const current_date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Get appraiser name
  const appraiser_name = appraisalData.appraiser_name || 'Andrés Gómez';
  
  // Generate featured image HTML
  let featured_image_html = '<div class="placeholder-image"><span>No Image Available</span></div>';
  
  if (appraisalData.featured_image) {
    featured_image_html = '<img src="' + appraisalData.featured_image + '" alt="' + title + '" class="featured-artwork">';
  }

  // Generate the HTML content
  return `
  <div class="modern-appraisal-card">
    <header class="card-header">
      <div class="header-content">
        <div class="report-info">
          <div class="report-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <h1>Art Analysis Report</h1>
            <p class="report-date">${current_date}</p>
          </div>
        </div>
        <div class="value-display">
          <div class="value-content">
            <span class="value-label">APPRAISED VALUE</span>
            <span class="value-amount">${formatted_value}</span>
          </div>
        </div>
      </div>
    </header>
    
    <div class="card-body">
      <div class="dual-layout">
        <div class="artwork-showcase">
          <div class="artwork-image">
            ${featured_image_html}
          </div>
          
          <div class="artwork-info">
            <h2 class="artwork-title">${escapeHtml(title)}</h2>
            <p class="artwork-creator">${escapeHtml(creator)}</p>
            
            <div class="artwork-details">
              <div class="detail-item">
                <span class="detail-label">Object Type</span>
                <span class="detail-value">${escapeHtml(object_type)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Period/Age</span>
                <span class="detail-value">${escapeHtml(age)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Medium</span>
                <span class="detail-value">${escapeHtml(medium)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Condition</span>
                <span class="detail-value">${escapeHtml(condition)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="market-position-container">
          <h3>Market Position</h3>
          <div class="gauge-container">
            <canvas id="${gauge_chart_id}" height="170"></canvas>
            <div class="gauge-indicator">
              <span class="percentile-value">${percentile}</span>
              <span class="percentile-label">Percentile</span>
            </div>
          </div>
          <div class="position-trend">
            <span class="trend-label">Market Trend</span>
            <span class="trend-value ${is_trend_positive ? 'positive' : 'negative'}">
              ${price_trend} Annual Change
            </span>
          </div>
        </div>
      </div>
      
      <div class="metrics-grid">
        <div class="metrics-chart-container">
          <h3>Item Value Assessment</h3>
          <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
            <canvas id="${metrics_chart_id}"></canvas>
          </div>
        </div>
        
        <div class="price-distribution-container">
          <h3>Market Price Distribution</h3>
          <div class="chart-container" style="position: relative; height: 240px; max-height: 240px;">
            <canvas id="${market_chart_id}"></canvas>
          </div>
          <div class="distribution-legend">
            <span class="legend-item">
              <span class="legend-marker market-marker"></span>
              Market Prices
            </span>
            <span class="legend-item">
              <span class="legend-marker your-marker"></span>
              Your Item
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-tabs">
      <div class="tabs-navigation">
        <button class="tab-button active" data-tab="summary">Summary</button>
        <button class="tab-button" data-tab="details">Details</button>
        <button class="tab-button" data-tab="similar">Similar Items</button>
      </div>
      
      <div class="tabs-content">
        <div id="summary" class="tab-panel active">
          <h2 class="tab-title">Artwork Details</h2>
          <div class="artwork-details-table">
            <table>
              <tbody>
                ${generateDetailsTable(appraisalData)}
              </tbody>
            </table>
          </div>
        </div>
        
        <div id="details" class="tab-panel">
          <div class="market-analysis">
            <p class="analysis-text">
              ${generateAnalysisText(statsData, is_trend_positive)}
            </p>
            
            <div class="metrics-details">
              <div class="metric-detail-item">
                <h4>Market Demand</h4>
                <div class="metric-bar-container">
                  <div class="metric-bar" style="width: ${market_demand}%;">
                    <span class="metric-value">${market_demand}%</span>
                  </div>
                </div>
                <p>Current collector interest level</p>
              </div>
              
              <div class="metric-detail-item">
                <h4>Rarity</h4>
                <div class="metric-bar-container">
                  <div class="metric-bar" style="width: ${rarity}%;">
                    <span class="metric-value">${rarity}%</span>
                  </div>
                </div>
                <p>Scarcity in the marketplace</p>
              </div>
              
              <div class="metric-detail-item">
                <h4>Condition</h4>
                <div class="metric-bar-container">
                  <div class="metric-bar" style="width: ${condition_score}%;">
                    <span class="metric-value">${condition_score}%</span>
                  </div>
                </div>
                <p>Physical state assessment</p>
              </div>
            </div>
          </div>
        </div>
        
        <div id="similar" class="tab-panel">
          <div class="similar-items">
            <p class="no-similar-items">Similar items can be viewed on the full webpage.</p>
          </div>
        </div>
      </div>
    </div>
    
    <footer class="card-footer">
      <div class="footer-info">
        <p>Appraised by: <strong>${escapeHtml(appraiser_name)}</strong>, Accredited Art Appraiser</p>
      </div>
      <a href="#" class="detail-report-button">
        <span>View Detailed Report</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </footer>
  </div>

  <style>
  /* Modern Appraisal Card Styles */
  :root {
    /* Primary colors */
    --primary-50: #eff6ff;
    --primary-100: #dbeafe;
    --primary-200: #bfdbfe;
    --primary-300: #93c5fd;
    --primary-400: #60a5fa;
    --primary-500: #3b82f6;
    --primary-600: #2563eb;
    --primary-700: #1d4ed8;
    --primary-800: #1e40af;
    --primary-900: #1e3a8a;
    
    /* Neutral colors */
    --neutral-50: #f9fafb;
    --neutral-100: #f3f4f6;
    --neutral-200: #e5e7eb;
    --neutral-300: #d1d5db;
    --neutral-400: #9ca3af;
    --neutral-500: #6b7280;
    --neutral-600: #4b5563;
    --neutral-700: #374151;
    --neutral-800: #1f2937;
    --neutral-900: #111827;
    
    /* Semantic colors */
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --purple: #8b5cf6;
    --teal: #0d9488;
    
    /* Fonts */
    --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    
    /* Border radius */
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-full: 9999px;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.3);
    
    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.3s ease;
  }

  .modern-appraisal-card {
    font-family: var(--font-sans);
    color: var(--neutral-900);
    background-color: white;
    border-radius: var(--radius-xl);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    max-width: 1200px;
    width: 100%;
    margin: 2rem auto;
    border: 1px solid var(--neutral-200);
  }

  /* Header Section */
  .modern-appraisal-card .card-header {
    position: relative;
    background: linear-gradient(135deg, #2563eb, #1e3a8a);
    color: white;
    padding: 1.5rem;
  }

  .modern-appraisal-card .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .modern-appraisal-card .report-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .modern-appraisal-card .report-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-full);
  }

  .modern-appraisal-card .report-info h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .modern-appraisal-card .report-date {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .modern-appraisal-card .value-display {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-lg);
    padding: 1rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .modern-appraisal-card .value-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
    opacity: 0.9;
  }

  .modern-appraisal-card .value-amount {
    font-size: 1.75rem;
    font-weight: 700;
  }

  /* Body Section */
  .modern-appraisal-card .card-body {
    padding: 1.5rem;
  }

  .modern-appraisal-card .dual-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  /* Artwork Showcase */
  .modern-appraisal-card .artwork-showcase {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: var(--neutral-50);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    border: 1px solid var(--neutral-200);
  }

  .modern-appraisal-card .artwork-image {
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    min-height: 200px;
  }

  .modern-appraisal-card .featured-artwork {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
  }

  .modern-appraisal-card .placeholder-image {
    width: 100%;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--neutral-100);
    color: var(--neutral-500);
    font-size: 1rem;
  }

  .modern-appraisal-card .artwork-info {
    text-align: center;
  }

  .modern-appraisal-card .artwork-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .modern-appraisal-card .artwork-creator {
    font-size: 1rem;
    color: var(--neutral-600);
    margin: 0 0 1.25rem;
  }

  .modern-appraisal-card .artwork-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    text-align: left;
  }

  .modern-appraisal-card .detail-item {
    background: white;
    border-radius: var(--radius-md);
    padding: 0.75rem;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--neutral-200);
    transition: all 0.2s ease;
  }

  .modern-appraisal-card .detail-item:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--primary-200);
    transform: translateY(-2px);
  }

  .modern-appraisal-card .detail-label {
    display: block;
    font-size: 0.75rem;
    color: var(--neutral-500);
    margin-bottom: 0.25rem;
  }

  .modern-appraisal-card .detail-value {
    font-weight: 600;
    color: var(--neutral-800);
  }

  /* Market Position */
  .modern-appraisal-card .market-position-container {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--neutral-200);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
  }

  .modern-appraisal-card .market-position-container h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem;
    text-align: center;
    color: var(--neutral-800);
  }

  .modern-appraisal-card .gauge-container {
    position: relative;
    margin: 0.5rem 0 1.5rem;
    height: 170px;
  }

  .modern-appraisal-card .gauge-indicator {
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .modern-appraisal-card .percentile-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--neutral-900);
  }

  .modern-appraisal-card .percentile-label {
    display: block;
    font-size: 0.875rem;
    color: var(--neutral-500);
    margin-top: 0.25rem;
  }

  .modern-appraisal-card .position-trend {
    text-align: center;
    margin-top: auto;
    background: var(--neutral-50);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
  }

  .modern-appraisal-card .trend-label {
    display: block;
    color: var(--neutral-600);
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .modern-appraisal-card .trend-value {
    font-weight: 600;
    font-size: 1rem;
  }

  .modern-appraisal-card .trend-value.positive {
    color: var(--success);
  }

  .modern-appraisal-card .trend-value.negative {
    color: var(--error);
  }

  /* Metrics Grid */
  .modern-appraisal-card .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .modern-appraisal-card .metrics-chart-container,
  .modern-appraisal-card .price-distribution-container {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--neutral-200);
    padding: 1.5rem;
  }

  .modern-appraisal-card .metrics-chart-container h3,
  .modern-appraisal-card .price-distribution-container h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem;
    text-align: center;
    color: var(--neutral-800);
  }

  .modern-appraisal-card .chart-container {
    overflow: hidden;
  }

  .modern-appraisal-card .distribution-legend {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--neutral-600);
  }

  .modern-appraisal-card .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .modern-appraisal-card .legend-marker {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .modern-appraisal-card .market-marker {
    background-color: rgba(59, 130, 246, 0.7);
  }

  .modern-appraisal-card .your-marker {
    background-color: rgba(239, 68, 68, 0.7);
  }

  /* Tabs Section */
  .modern-appraisal-card .card-tabs {
    margin-top: 2rem;
    border-top: 1px solid var(--neutral-200);
  }

  .modern-appraisal-card .tabs-navigation {
    display: flex;
    border-bottom: 1px solid var(--neutral-200);
    background: var(--neutral-50);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .modern-appraisal-card .tabs-navigation::-webkit-scrollbar {
    display: none;
  }

  .modern-appraisal-card .tab-button {
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--neutral-600);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }

  .modern-appraisal-card .tab-button.active {
    color: var(--primary-600);
    border-bottom-color: var(--primary-600);
  }

  .modern-appraisal-card .tab-button:hover:not(.active) {
    color: var(--neutral-900);
    background: var(--neutral-100);
  }

  .modern-appraisal-card .tabs-content {
    padding: 1.5rem;
  }

  .modern-appraisal-card .tab-panel {
    display: none;
    animation: fadeIn 0.3s ease;
  }

  .modern-appraisal-card .tab-panel.active {
    display: block;
  }

  /* Summary Tab */
  .modern-appraisal-card .tab-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--neutral-800);
    margin: 0 0 1.25rem;
  }

  .modern-appraisal-card .artwork-details-table {
    width: 100%;
    overflow-x: auto;
  }

  .modern-appraisal-card .artwork-details-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .modern-appraisal-card .artwork-details-table th,
  .modern-appraisal-card .artwork-details-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--neutral-200);
  }

  .modern-appraisal-card .artwork-details-table th {
    width: 35%;
    font-weight: 600;
    color: var(--neutral-700);
    background-color: var(--neutral-50);
  }

  .modern-appraisal-card .artwork-details-table td {
    color: var(--neutral-900);
  }

  .modern-appraisal-card .artwork-details-table tr:hover {
    background-color: var(--neutral-50);
  }

  /* Details Tab */
  .modern-appraisal-card .analysis-text {
    color: var(--neutral-700);
    line-height: 1.6;
    margin: 0 0 1.5rem;
  }

  .modern-appraisal-card .metrics-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .modern-appraisal-card .metric-detail-item {
    background: var(--neutral-50);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    border: 1px solid var(--neutral-200);
  }

  .modern-appraisal-card .metric-detail-item h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1rem;
    color: var(--neutral-700);
  }

  .modern-appraisal-card .metric-bar-container {
    height: 12px;
    background: var(--neutral-200);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: 1rem;
    position: relative;
  }

  .modern-appraisal-card .metric-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
    border-radius: var(--radius-full);
    position: relative;
    transform-origin: left;
    animation: barGrow 1.5s ease-out forwards;
  }

  .modern-appraisal-card .metric-value {
    position: absolute;
    top: -20px;
    right: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary-700);
  }

  .modern-appraisal-card .metric-detail-item p {
    font-size: 0.875rem;
    color: var(--neutral-500);
    margin: 0.5rem 0 0;
    text-align: right;
  }

  /* Similar Items Tab */
  .modern-appraisal-card .similar-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.25rem;
  }

  .modern-appraisal-card .similar-gallery img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--radius-lg);
    border: 1px solid var(--neutral-200);
    transition: all 0.25s ease;
  }

  .modern-appraisal-card .similar-gallery img:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-300);
  }

  .modern-appraisal-card .no-similar-items {
    text-align: center;
    color: var(--neutral-500);
    padding: 2rem;
    background: var(--neutral-50);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--neutral-300);
  }

  /* Footer Section */
  .modern-appraisal-card .card-footer {
    padding: 1.25rem 1.5rem;
    background: var(--neutral-50);
    border-top: 1px solid var(--neutral-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .modern-appraisal-card .footer-info {
    font-size: 0.875rem;
    color: var(--neutral-600);
  }

  .modern-appraisal-card .footer-info p {
    margin: 0;
  }

  .modern-appraisal-card .detail-report-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    background: var(--primary-600);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    text-decoration: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .modern-appraisal-card .detail-report-button:hover {
    background: var(--primary-700);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .modern-appraisal-card .detail-report-button svg {
    transition: transform var(--transition-fast);
  }

  .modern-appraisal-card .detail-report-button:hover svg {
    transform: translateX(3px);
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes barGrow {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  /* Responsive adjustments */
  @media (max-width: 992px) {
    .modern-appraisal-card .dual-layout {
      grid-template-columns: 1fr;
    }
    
    .modern-appraisal-card .metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .modern-appraisal-card .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .modern-appraisal-card .value-display {
      width: 100%;
    }
    
    .modern-appraisal-card .artwork-details {
      grid-template-columns: 1fr;
    }
    
    .modern-appraisal-card .tab-button {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }
  }

  @media (max-width: 480px) {
    .modern-appraisal-card .card-header,
    .modern-appraisal-card .card-body,
    .modern-appraisal-card .tabs-content {
      padding: 1rem;
    }
    
    .modern-appraisal-card .artwork-showcase,
    .modern-appraisal-card .market-position-container,
    .modern-appraisal-card .metrics-chart-container,
    .modern-appraisal-card .price-distribution-container {
      padding: 1rem;
    }
    
    .modern-appraisal-card .card-footer {
      flex-direction: column;
      align-items: stretch;
    }
    
    .modern-appraisal-card .detail-report-button {
      width: 100%;
      justify-content: center;
    }
  }
  </style>

  <script>
  // Use a true isolated initialization approach with delayed execution
  (function() {
    var initializeCharts = function() {
      console.log("Appraisal Card: Starting initialization");
      
      try {
        // Only proceed if the card element exists on the page
        if (document.querySelector('.modern-appraisal-card')) {
          // Set up tabs without jQuery
          setupTabs();
          
          // Set up details button
          setupDetailsButton();
          
          // Load Chart.js if needed for visualization
          if (typeof window.AppraisalCardChart === 'undefined') {
            var chartScript = document.createElement('script');
            chartScript.onload = function() {
              // Create our own instance to avoid conflicts
              window.AppraisalCardChart = window.Chart;
              initAppraisalCharts();
            };
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            document.head.appendChild(chartScript);
          } else {
            // Chart already available
            initAppraisalCharts();
          }
        }
      } catch (e) {
        console.error("Error during appraisal card initialization:", e);
      }
    };
    
    // Set up the tabs
    function setupTabs() {
      var tabButtons = document.querySelectorAll('.tab-button');
      var tabPanels = document.querySelectorAll('.tab-panel');
      
      tabButtons.forEach(function(button) {
        button.addEventListener('click', function() {
          // Remove active class from all buttons and panels
          tabButtons.forEach(function(btn) { 
            btn.classList.remove('active');
          });
          tabPanels.forEach(function(panel) {
            panel.classList.remove('active');
          });
          
          // Add active class to clicked button and panel
          button.classList.add('active');
          var tabId = button.getAttribute('data-tab');
          var panel = document.getElementById(tabId);
          if (panel) {
            panel.classList.add('active');
          }
        });
      });
    }
    
    // Set up the details button
    function setupDetailsButton() {
      var detailsButton = document.querySelector('.detail-report-button');
      if (detailsButton) {
        detailsButton.addEventListener('click', function(e) {
          e.preventDefault();
          
          // Get current URL and add a query parameter
          var currentUrl = window.location.href;
          var separator = currentUrl.includes('?') ? '&' : '?';
          var reportUrl = currentUrl + separator + 'view=detailed';
          
          // Navigate to detailed report
          window.location.href = reportUrl;
        });
      }
    }
    
    // Delay execution to avoid jQuery conflicts
    window.setTimeout(initializeCharts, 1000);
  })();

  // Initialize chart display
  function initAppraisalCharts() {
    // Use our isolated Chart instance
    if (typeof window.AppraisalCardChart === 'undefined') {
      console.error("Chart.js not available in AppraisalCardChart");
      return;
    }
    
    try {
      console.log("Initializing appraisal charts");
      
      // Set default font
      window.AppraisalCardChart.defaults.font = {
        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        size: 12
      };
      
      // Initialize gauge chart
      initGaugeCharts();
      
      // Initialize metrics chart
      initMetricsCharts();
      
      // Initialize market chart
      initMarketCharts();
      
      console.log("Appraisal charts initialized successfully");
    } catch (e) {
      console.error("Error in chart initialization:", e);
    }
    
    // Initialize gauge charts
    function initGaugeCharts() {
      const gaugeCharts = document.querySelectorAll('[id^="gauge-chart-"]');
      if (!gaugeCharts.length) {
        console.log("No gauge charts found");
        return;
      }
      
      gaugeCharts.forEach(canvas => {
        try {
          // Get percentile from nearest indicator
          const container = canvas.closest('.gauge-container');
          const percentileEl = container ? container.querySelector('.percentile-value') : null;
          let percentile = 75; // Default
          
          if (percentileEl) {
            // Extract numeric value from text like "58th"
            const matches = percentileEl.textContent.match(/(\d+)/);
            if (matches && matches[1]) {
              percentile = parseInt(matches[1]);
            }
          }
          
          const ctx = canvas.getContext('2d');
          new window.AppraisalCardChart(ctx, {
            type: 'doughnut',
            data: {
              datasets: [{
                data: [percentile, 100 - percentile],
                backgroundColor: [
                  createGradient(ctx, ['#3b82f6', '#1d4ed8']),
                  '#e5e7eb'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '75%',
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
              },
              animation: {
                animateRotate: true,
                animateScale: false,
                duration: 2000,
                easing: 'easeOutQuart'
              }
            }
          });
        } catch (e) {
          console.error("Error initializing gauge chart:", e);
        }
      });
    }
    
    // Initialize metrics charts
    function initMetricsCharts() {
      const metricsCharts = document.querySelectorAll('[id^="metrics-chart-"]');
      if (!metricsCharts.length) {
        console.log("No metrics charts found");
        return;
      }
      
      metricsCharts.forEach(canvas => {
        try {
          const ctx = canvas.getContext('2d');
          
          // Get metrics from the page
          let marketDemand = ${market_demand};
          let rarity = ${rarity};
          let condition = ${condition_score};
          
          new window.AppraisalCardChart(ctx, {
            type: 'bar',
            data: {
              labels: ['Market Demand', 'Rarity', 'Condition'],
              datasets: [{
                data: [marketDemand, rarity, condition],
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)'
                ],
                borderRadius: 6,
                maxBarThickness: 50
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 2,
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                  grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                  },
                  ticks: {
                    callback: function(value) {
                      return value + '%';
                    }
                  }
                },
                y: {
                  grid: {
                    display: false
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return context.parsed.x + '%';
                    }
                  }
                }
              }
            }
          });
        } catch (e) {
          console.error("Error initializing metrics chart:", e);
        }
      });
    }
    
    // Initialize market charts
    function initMarketCharts() {
      const marketCharts = document.querySelectorAll('[id^="market-chart-"]');
      if (!marketCharts.length) {
        console.log("No market charts found");
        return;
      }
      
      marketCharts.forEach(canvas => {
        try {
          const ctx = canvas.getContext('2d');
          
          // Generate dynamic price distribution based on actual value
          const currentValue = ${value};
          let prices = [];
          let counts = [];
          
          // Process statistics data
          ${statsData.histogram ? `
          try {
            // Try to use real histogram data
            const histogramData = ${JSON.stringify(statsData.histogram)};
            
            if (Array.isArray(histogramData) && histogramData.length > 0) {
              prices = histogramData.map(bucket => Math.floor((bucket.min + bucket.max) / 2));
              counts = histogramData.map(bucket => bucket.count);
              console.log("Using real histogram data from statistics");
            } else {
              throw new Error("Invalid histogram data structure");
            }
          } catch (e) {
            console.error("Error processing histogram data:", e);
            generateFallbackDistribution();
          }
          ` : `
          // No statistics data available, use fallback
          generateFallbackDistribution();
          `}
          
          // Fallback distribution generator
          function generateFallbackDistribution() {
            console.log("Using fallback price distribution");
            // Create distribution around current value
            const range = currentValue * 0.5;
            const step = range / 3;
            
            prices = [
              Math.floor(currentValue - range),
              Math.floor(currentValue - step * 2),
              Math.floor(currentValue - step),
              Math.floor(currentValue),
              Math.floor(currentValue + step),
              Math.floor(currentValue + step * 2)
            ];
            
            counts = [1, 3, 6, 7, 4, 2]; // Bell curve
          }
          
          // Create chart
          new window.AppraisalCardChart(ctx, {
            type: 'bar',
            data: {
              labels: prices.map(p => '$' + p.toLocaleString()),
              datasets: [{
                data: counts,
                backgroundColor: prices.map(p => {
                  const price = parseInt(p);
                  return (price >= currentValue - 250 && price <= currentValue + 250) 
                    ? 'rgba(239, 68, 68, 0.7)' 
                    : 'rgba(59, 130, 246, 0.7)';
                }),
                borderRadius: 4,
                maxBarThickness: 40
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 2,
              layout: {
                padding: {
                  top: 10
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  },
                  ticks: {
                    precision: 0
                  },
                  suggestedMax: 10,
                  title: {
                    display: true,
                    text: 'Number of Items',
                    color: '#6b7280',
                    font: {
                      size: 12,
                      weight: '500'
                    }
                  }
                },
                x: {
                  grid: {
                    display: false
                  },
                  title: {
                    display: true,
                    text: 'Price Range',
                    color: '#6b7280',
                    font: {
                      size: 12,
                      weight: '500'
                    }
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    title: function(context) {
                      return 'Price: ' + context[0].label;
                    },
                    label: function(context) {
                      return context.parsed.y + ' items';
                    }
                  }
                }
              }
            }
          });
        } catch (e) {
          console.error("Error initializing market chart:", e);
        }
      });
    }
  }

  function createGradient(ctx, colors) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    return gradient;
  }
  </script>
  `;
};

/**
 * Helper function to escape HTML
 */
function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate details table from appraisal data
 */
function generateDetailsTable(appraisalData) {
  // Define detail fields and their labels
  const artwork_fields = [
    {key: 'creator', label: 'Artist\'s Name'},
    {key: 'artist_dates', label: 'Artist\'s Date of Birth and Death'},
    {key: 'title', label: 'Title of Artwork'},
    {key: 'estimated_age', label: 'Period/Age'},
    {key: 'color_palette', label: 'Color Palette'},
    {key: 'style', label: 'Art Style/Period'},
    {key: 'medium', label: 'Medium'},
    {key: 'dimensions', label: 'Dimensions'},
    {key: 'framed', label: 'Is it Framed?'},
    {key: 'edition', label: 'Edition Information'},
    {key: 'publisher', label: 'Printer/Publisher'},
    {key: 'composition_description', label: 'Composition Description'},
    {key: 'condition_summary', label: 'Condition'},
    {key: 'signed', label: 'Is it signed?'},
    {key: 'provenance', label: 'Provenance Information'},
    {key: 'registration_number', label: 'Registration Number'},
    {key: 'notes', label: 'Additional Notes'},
    {key: 'coa', label: 'COA?'},
    {key: 'meaning', label: 'Possible Meaning of the composition'}
  ];
  
  let tableHtml = '';
  
  // Output table rows for fields that have data
  for (const field of artwork_fields) {
    if (appraisalData[field.key]) {
      tableHtml += '<tr>';
      tableHtml += '<th>' + escapeHtml(field.label) + '</th>';
      tableHtml += '<td>' + escapeHtml(appraisalData[field.key]) + '</td>';
      tableHtml += '</tr>';
    }
  }
  
  // Fallback for essential fields if we have no data
  if (tableHtml === '') {
    tableHtml += '<tr><th>Object Type</th><td>' + escapeHtml(appraisalData.object_type || 'Art Object') + '</td></tr>';
    tableHtml += '<tr><th>Creator</th><td>' + escapeHtml(appraisalData.creator || 'Unknown Artist') + '</td></tr>';
    tableHtml += '<tr><th>Period/Age</th><td>' + escapeHtml(appraisalData.estimated_age || '20th Century') + '</td></tr>';
    tableHtml += '<tr><th>Medium</th><td>' + escapeHtml(appraisalData.medium || 'Mixed Media') + '</td></tr>';
    tableHtml += '<tr><th>Condition</th><td>' + escapeHtml(appraisalData.condition_summary || 'Good') + '</td></tr>';
    tableHtml += '<tr><th>Appraised Value</th><td>$' + numberWithCommas(appraisalData.value || 4500) + ' USD</td></tr>';
  }
  
  return tableHtml;
}

/**
 * Generate analysis text from statistics data
 */
function generateAnalysisText(statsData, is_trend_positive) {
  if (!statsData || Object.keys(statsData).length === 0) {
    return 'Market analysis reveals ' + (is_trend_positive ? 'strong' : 'moderate') + 
           ' demand for similar items with ' + (is_trend_positive ? 'consistent price appreciation' : 'stable pricing') + 
           ' over the past 5 years.';
  }
  
  if (statsData.count && statsData.average_price && statsData.value) {
    const summary_total_count = statsData.total_count || statsData.count;
    let text = 'Market analysis reveals ' + summary_total_count + ' comparable items with an average value of $' + 
               numberWithCommas(statsData.average_price) + '. ';
    
    text += 'Your item\'s value of $' + numberWithCommas(statsData.value) + ' places it in the ' + 
            (statsData.percentile || '60th') + ' percentile, with a ' + 
            (statsData.price_trend_percentage || (is_trend_positive ? '+5.2%' : '-1.8%')) + 
            ' average annual growth rate. ';
    
    text += 'Market confidence: ' + (statsData.confidence_level || 'Moderate');
    
    return text;
  }
  
  // Default text if missing key statistics
  return 'Market analysis reveals ' + (is_trend_positive ? 'strong' : 'moderate') + 
         ' demand for similar items with ' + (is_trend_positive ? 'consistent price appreciation' : 'stable pricing') + 
         ' over the past 5 years.';
}

/**
 * Helper function to format numbers with commas
 */
function numberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generate a unique ID for chart elements
 */
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15);
}