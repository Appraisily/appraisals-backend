/**
 * Formatting Utilities for Enhanced Analytics
 * 
 * Common formatting functions used across chart modules
 */

/**
 * Format currency value with proper symbol
 * 
 * @param {number} value - The currency value to format
 * @param {string} currency - The currency code (USD, EUR, GBP, etc.)
 * @param {string} locale - The locale to use for formatting (default: en-US)
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, currency = 'USD', locale = 'en-US') {
    if (typeof value !== 'number' || isNaN(value)) return value;
    
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    } catch (e) {
        // Fallback for invalid currency codes
        const prefix = currency === 'EUR' ? '€' : 
                      currency === 'GBP' ? '£' : 
                      currency === 'CAD' ? 'CA$' : 
                      currency === 'AUD' ? 'A$' : 
                      currency === 'PHP' ? '₱' : '$';
        return prefix + Math.round(value).toLocaleString(locale);
    }
}

/**
 * Format date into localized string
 * 
 * @param {string} dateString - The date string to format
 * @param {string} locale - The locale to use for formatting (default: en-US)
 * @returns {string} Formatted date string
 */
function formatDate(dateString, locale = 'en-US') {
    if (!dateString || dateString === 'Current') return 'Current';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString(locale, { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString; // Return original on error
    }
}

/**
 * Format percentage values
 * 
 * @param {number} value - The percentage value to format
 * @param {boolean} includeSign - Whether to include +/- sign
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, includeSign = true) {
    if (typeof value !== 'number' || isNaN(value)) return value;
    
    const formatted = value.toFixed(1) + '%';
    if (includeSign && value > 0) return '+' + formatted;
    return formatted;
}

/**
 * Truncate text with ellipsis if too long
 * 
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 30) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Export the functions if using module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDate,
        formatPercentage,
        truncateText
    };
} 