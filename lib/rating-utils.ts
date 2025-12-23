// =====================================================
// v0.71: RATING UTILITY FUNCTIONS
// =====================================================

/**
 * Minimum valid rating value
 */
export const MIN_RATING = 1.0;

/**
 * Maximum valid rating value
 */
export const MAX_RATING = 5.0;

/**
 * Validate that a rating is within the valid range (1.0 to 5.0)
 * Property 10: Rating Range Validation
 * 
 * @param rating - The rating value to validate
 * @returns true if rating is between 1.0 and 5.0 inclusive
 */
export function validateRating(rating: number): boolean {
  if (typeof rating !== 'number' || isNaN(rating)) {
    return false;
  }
  return rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * Calculate the new average rating after adding a new rating
 * Property 9: Rating Average Calculation
 * 
 * For any sequence of ratings submitted for an agent, the service_rating
 * SHALL equal the arithmetic mean of all submitted ratings, rounded to 2 decimal places.
 * 
 * @param currentRating - Current average rating (or null if no ratings yet)
 * @param currentCount - Number of ratings that make up the current average
 * @param newRating - The new rating to add
 * @returns New average rating rounded to 2 decimal places
 */
export function calculateAverageRating(
  currentRating: number | null | undefined,
  currentCount: number,
  newRating: number
): number {
  // Validate the new rating
  if (!validateRating(newRating)) {
    throw new Error(`Invalid rating: ${newRating}. Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
  }
  
  // If no previous ratings, the new rating is the average
  if (currentCount === 0 || currentRating === null || currentRating === undefined) {
    return Math.round(newRating * 100) / 100;
  }
  
  // Calculate new average
  const totalPrevious = currentRating * currentCount;
  const newTotal = totalPrevious + newRating;
  const newCount = currentCount + 1;
  const newAverage = newTotal / newCount;
  
  // Round to 2 decimal places
  return Math.round(newAverage * 100) / 100;
}

/**
 * Calculate average rating from an array of ratings
 * 
 * @param ratings - Array of rating values
 * @returns Average rating rounded to 2 decimal places, or 0 if empty
 */
export function calculateAverageFromArray(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0;
  }
  
  // Validate all ratings
  const validRatings = ratings.filter(r => validateRating(r));
  if (validRatings.length === 0) {
    return 0;
  }
  
  const sum = validRatings.reduce((acc, r) => acc + r, 0);
  const average = sum / validRatings.length;
  
  return Math.round(average * 100) / 100;
}

/**
 * Convert a numeric rating to star display
 * 
 * @param rating - The rating value (1-5)
 * @returns String with filled and empty stars
 */
export function ratingToStars(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return '☆☆☆☆☆';
  }
  
  const roundedRating = Math.round(rating);
  const clampedRating = Math.max(0, Math.min(5, roundedRating));
  
  const filledStars = '⭐'.repeat(clampedRating);
  const emptyStars = '☆'.repeat(5 - clampedRating);
  
  return filledStars + emptyStars;
}

/**
 * Get rating label based on value
 * 
 * @param rating - The rating value
 * @returns Human-readable label
 */
export function getRatingLabel(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return 'Not Rated';
  }
  
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Average';
  if (rating >= 2.0) return 'Below Average';
  return 'Poor';
}

/**
 * Format rating for display
 * 
 * @param rating - The rating value
 * @returns Formatted string like "4.5/5"
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) {
    return 'N/A';
  }
  
  return `${rating.toFixed(1)}/5`;
}

/**
 * Check if a rating is considered "good" (>= 4.0)
 * 
 * @param rating - The rating value
 * @returns true if rating is 4.0 or higher
 */
export function isGoodRating(rating: number | null | undefined): boolean {
  if (rating === null || rating === undefined) {
    return false;
  }
  return rating >= 4.0;
}

/**
 * Calculate the weighted average of multiple ratings with counts
 * 
 * @param ratingsWithCounts - Array of {rating, count} objects
 * @returns Weighted average rounded to 2 decimal places
 */
export function calculateWeightedAverage(
  ratingsWithCounts: Array<{ rating: number; count: number }>
): number {
  const totalCount = ratingsWithCounts.reduce((acc, r) => acc + r.count, 0);
  
  if (totalCount === 0) {
    return 0;
  }
  
  const weightedSum = ratingsWithCounts.reduce(
    (acc, r) => acc + r.rating * r.count,
    0
  );
  
  const average = weightedSum / totalCount;
  return Math.round(average * 100) / 100;
}

/**
 * Clamp a rating value to the valid range
 * 
 * @param rating - The rating value to clamp
 * @returns Rating clamped between MIN_RATING and MAX_RATING
 */
export function clampRating(rating: number): number {
  return Math.max(MIN_RATING, Math.min(MAX_RATING, rating));
}
