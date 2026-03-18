/**
 * Shared date utility functions for LUMA V1.
 *
 * Centralizes date calculations to avoid duplicate logic
 * across services and guards.
 */

/**
 * Calculate a person's age from their birth date.
 * Accounts for month/day boundaries (i.e., if the birthday
 * has not occurred yet this year, subtracts 1).
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}
