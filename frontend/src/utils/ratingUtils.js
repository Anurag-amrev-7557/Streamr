/**
 * Converts a rating value to a numeric format
 * @param {number|string} rating - The rating value to convert
 * @param {number} defaultValue - Default value if rating is invalid (default: 0)
 * @returns {number} - The numeric rating value
 */
export const toNumericRating = (rating, defaultValue = 0) => {
  // Handle null, undefined, or empty values
  if (rating === null || rating === undefined || rating === '') {
    return defaultValue;
  }

  // Convert to number
  const numericRating = parseFloat(rating);

  // Check if the conversion was successful
  if (isNaN(numericRating)) {
    return defaultValue;
  }

  // Ensure rating is within valid range (0-10 for TMDB ratings)
  if (numericRating < 0) {
    return 0;
  }
  if (numericRating > 10) {
    return 10;
  }

  // Return the numeric rating rounded to 1 decimal place
  return Math.round(numericRating * 10) / 10;
};

/**
 * Formats a rating for display
 * @param {number|string} rating - The rating value to format
 * @param {number} defaultValue - Default value if rating is invalid (default: 0)
 * @returns {string} - The formatted rating string
 */
export const formatRating = (rating, defaultValue = 0) => {
  const numericRating = toNumericRating(rating, defaultValue);
  return numericRating.toFixed(1);
};

/**
 * Converts a rating to a percentage (0-100)
 * @param {number|string} rating - The rating value to convert
 * @param {number} maxRating - Maximum rating value (default: 10)
 * @returns {number} - The percentage value
 */
export const ratingToPercentage = (rating, maxRating = 10) => {
  const numericRating = toNumericRating(rating, 0);
  return Math.round((numericRating / maxRating) * 100);
};

/**
 * Validates if a rating is within acceptable range
 * @param {number|string} rating - The rating value to validate
 * @param {number} minRating - Minimum acceptable rating (default: 0)
 * @param {number} maxRating - Maximum acceptable rating (default: 10)
 * @returns {boolean} - Whether the rating is valid
 */
export const isValidRating = (rating, minRating = 0, maxRating = 10) => {
  const numericRating = toNumericRating(rating, null);
  return numericRating !== null && numericRating >= minRating && numericRating <= maxRating;
}; 