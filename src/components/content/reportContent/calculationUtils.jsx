// src/utils/calculationUtils.js

/**
 * Calculates the accuracy percentage.
 * @param {number} total - The total number of items.
 * @param {number} incomplete - The number of incomplete items.
 * @returns {string} The accuracy percentage, formatted to two decimal places.
 */
export const calculateAccuracy = (total, incomplete) => {
  console.log("Calculating accuracy...");
  console.log(`Total: ${total}`);
  console.log(`Incomplete: ${incomplete}`);

  const accuracy = total > 0 ? ((total - incomplete) / total) * 100 : 0;

  console.log(`Calculated Accuracy: ${accuracy}%`);

  return accuracy.toFixed(2);
};
