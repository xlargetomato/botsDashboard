/**
 * Utility function to create a delay/sleep
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random string
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
export const generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Check if a value is a valid JSON string
 * @param {string} str - String to check
 * @returns {boolean} - True if valid JSON string
 */
export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safely parse JSON with a fallback
 * @param {string} str - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} - Parsed JSON or fallback
 */
export const safeJSONParse = (str, fallback = {}) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

/**
 * Truncate a string to a specified length and add ellipsis if needed
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
export const truncateString = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Format a date in a user-friendly way
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} - Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Extract error message from various error objects
 * @param {Error|object|string} error - Error to extract message from
 * @returns {string} - Error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return getErrorMessage(error.error);
  return 'Unknown error';
};

export default {
  delay,
  generateRandomString,
  isValidJSON,
  safeJSONParse,
  truncateString,
  formatDate,
  deepClone,
  getErrorMessage
}; 