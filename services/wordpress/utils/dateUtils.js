/**
 * Safely parses a date string and returns it in YYYY-MM-DD format
 * Falls back to current date if parsing fails
 */
function parseDate(dateString) {
  try {
    if (!dateString) {
      throw new Error('No date provided');
    }

    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Error parsing date "${dateString}":`, error.message);
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = {
  parseDate
};