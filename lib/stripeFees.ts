/**
 * Stripe fee calculation utilities for TeachTape platform
 */

export interface FeeBreakdown {
  /** Original amount in cents */
  originalAmount: number;
  /** Platform fee in cents (percentage + fixed fee) */
  platformFee: number;
  /** Amount coach receives in cents (original - platform fee) */
  coachAmount: number;
  /** Fee percentage applied */
  feePercentage: number;
  /** Fixed fee component in cents */
  fixedFeeCents: number;
}

export interface FeePolicy {
  /** Platform fee percentage (e.g., 0.10 for 10%) */
  platformFeePercentage: number;
  /** Fixed fee in cents (e.g., 30 for $0.30) */
  fixedFeeCents: number;
  /** Minimum fee in cents (to ensure we cover costs) */
  minimumFeeCents: number;
}

/**
 * Default fee policy for TeachTape
 * - 10% platform fee
 * - $0.30 fixed fee
 * - Minimum $0.50 fee
 */
export const DEFAULT_FEE_POLICY: FeePolicy = {
  platformFeePercentage: 0.10, // 10%
  fixedFeeCents: 30, // $0.30
  minimumFeeCents: 50, // $0.50 minimum
};

/**
 * Calculate platform application fee for Stripe Connect
 * 
 * @param amountCents - Total amount in cents
 * @param policy - Fee policy to apply (uses default if not provided)
 * @returns Application fee amount in cents for Stripe
 */
export function calculateApplicationFee(
  amountCents: number, 
  policy: FeePolicy = DEFAULT_FEE_POLICY
): number {
  if (amountCents <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Calculate percentage-based fee
  const percentageFee = Math.round(amountCents * policy.platformFeePercentage);
  
  // Add fixed fee
  const totalFee = percentageFee + policy.fixedFeeCents;
  
  // Apply minimum fee
  const finalFee = Math.max(totalFee, policy.minimumFeeCents);
  
  // Ensure fee doesn't exceed the original amount (safety check)
  return Math.min(finalFee, amountCents - 1); // Leave at least 1 cent for the coach
}

/**
 * Get detailed fee breakdown for transparency
 * 
 * @param amountCents - Total amount in cents
 * @param policy - Fee policy to apply (uses default if not provided)
 * @returns Detailed breakdown of fees and amounts
 */
export function getFeeBreakdown(
  amountCents: number, 
  policy: FeePolicy = DEFAULT_FEE_POLICY
): FeeBreakdown {
  const platformFee = calculateApplicationFee(amountCents, policy);
  const coachAmount = amountCents - platformFee;

  return {
    originalAmount: amountCents,
    platformFee,
    coachAmount,
    feePercentage: policy.platformFeePercentage,
    fixedFeeCents: policy.fixedFeeCents
  };
}

/**
 * Format fee breakdown for display to users
 * 
 * @param breakdown - Fee breakdown object
 * @returns Human-readable fee breakdown
 */
export function formatFeeBreakdown(breakdown: FeeBreakdown): {
  total: string;
  platformFee: string;
  coachReceives: string;
  feeDescription: string;
} {
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  return {
    total: formatCents(breakdown.originalAmount),
    platformFee: formatCents(breakdown.platformFee),
    coachReceives: formatCents(breakdown.coachAmount),
    feeDescription: `${(breakdown.feePercentage * 100).toFixed(1)}% + $${(breakdown.fixedFeeCents / 100).toFixed(2)} platform fee`
  };
}

/**
 * Validate that a fee amount is reasonable
 * 
 * @param amountCents - Original amount
 * @param feeCents - Calculated fee
 * @returns True if fee is within reasonable bounds
 */
export function validateFeeAmount(amountCents: number, feeCents: number): boolean {
  // Fee should be positive
  if (feeCents <= 0) return false;
  
  // Fee shouldn't exceed 50% of the original amount (safety check)
  if (feeCents > amountCents * 0.5) return false;
  
  // Coach should receive at least $1 (100 cents)
  if (amountCents - feeCents < 100) return false;
  
  return true;
}

/**
 * Get fee policy from environment variables or use defaults
 * This allows for easy configuration in different environments
 */
export function getFeePolicy(): FeePolicy {
  const envPercentage = process.env.PLATFORM_FEE_PERCENTAGE;
  const envFixedFee = process.env.PLATFORM_FIXED_FEE_CENTS;
  const envMinFee = process.env.PLATFORM_MIN_FEE_CENTS;

  return {
    platformFeePercentage: envPercentage ? parseFloat(envPercentage) : DEFAULT_FEE_POLICY.platformFeePercentage,
    fixedFeeCents: envFixedFee ? parseInt(envFixedFee, 10) : DEFAULT_FEE_POLICY.fixedFeeCents,
    minimumFeeCents: envMinFee ? parseInt(envMinFee, 10) : DEFAULT_FEE_POLICY.minimumFeeCents,
  };
}

// Export commonly used fee calculation for convenience
export { calculateApplicationFee as getApplicationFee };