/**
 * Generates a random coupon code
 * @param {number} length - Length of the coupon code (default: 6)
 * @returns {string} - Generated coupon code
 */
export function generateCouponCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Ensure the first character is always a letter for better readability
  result += chars.charAt(Math.floor(Math.random() * 26));
  
  // Generate the rest of the code
  for (let i = 1; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generates a unique coupon code that doesn't exist in the database
 * @param {Object} options - Options for code generation
 * @param {number} [options.length=6] - Length of the coupon code
 * @param {Function} [options.checkExists] - Async function to check if code exists
 * @param {number} [options.maxAttempts=10] - Maximum number of generation attempts
 * @returns {Promise<string>} - Unique coupon code
 */
export async function generateUniqueCouponCode({
  length = 6,
  checkExists = null,
  maxAttempts = 10
} = {}) {
  let attempts = 0;
  let code;
  let isUnique = false;

  while (attempts < maxAttempts && !isUnique) {
    code = generateCouponCode(length);
    
    if (checkExists) {
      const exists = await checkExists(code);
      if (!exists) {
        isUnique = true;
      }
    } else {
      isUnique = true;
    }
    
    attempts++;
  }

  if (!isUnique) {
    throw new Error(`Failed to generate a unique coupon code after ${maxAttempts} attempts`);
  }

  return code;
}

export default {
  generateCouponCode,
  generateUniqueCouponCode
};
