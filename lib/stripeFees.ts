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

export interface CommissionSettings {
  /** Platform commission percentage taken from coach earnings (0-30%) - uses existing platform_fee_percentage */
  platformCommissionPercentage: number;
  /** Type of athlete service fee: 'none', 'percentage', or 'flat' */
  athleteServiceFeeType: 'none' | 'percentage' | 'flat';
  /** Athlete service fee percentage (0-30%) */
  athleteServiceFeePercentage: number;
  /** Athlete service fee flat amount in cents (0-2000) */
  athleteServiceFeeFlatCents: number;
}

export interface ExtendedFeeBreakdown extends FeeBreakdown {
  /** Amount added to total for athlete service fee */
  athleteServiceFee: number;
  /** Total amount charged to athlete (original + service fee) */
  totalChargedToAthlete: number;
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
 * Minimum booking amount in cents to ensure viable transactions
 * Stripe minimum is $0.50, but we need to cover fees and ensure coach gets something
 * $5.00 minimum ensures reasonable payout after platform fees and Stripe processing
 */
export const MINIMUM_BOOKING_AMOUNT_CENTS = 500; // $5.00

/**
 * Validate that a fee amount is reasonable
 *
 * @param amountCents - Original amount
 * @param feeCents - Calculated fee
 * @param logDetails - Whether to log validation details (default: false)
 * @returns True if fee is within reasonable bounds
 */
export function validateFeeAmount(amountCents: number, feeCents: number, logDetails = false): boolean {
  const coachReceives = amountCents - feeCents;
  const feePercentage = (feeCents / amountCents) * 100;

  if (logDetails) {
    console.log('💰 [validateFeeAmount] Validation details:', {
      amountCents,
      feeCents,
      coachReceives,
      feePercentage: feePercentage.toFixed(2) + '%',
      minimumRequired: MINIMUM_BOOKING_AMOUNT_CENTS
    });
  }

  // Amount must meet minimum threshold
  if (amountCents < MINIMUM_BOOKING_AMOUNT_CENTS) {
    if (logDetails) {
      console.error(`❌ [validateFeeAmount] Amount ${amountCents} cents is below minimum ${MINIMUM_BOOKING_AMOUNT_CENTS} cents`);
    }
    return false;
  }

  // Fee should be positive (but can be 0 for no-fee scenarios)
  if (feeCents < 0) {
    if (logDetails) {
      console.error(`❌ [validateFeeAmount] Negative fee: ${feeCents} cents`);
    }
    return false;
  }

  // Fee shouldn't exceed 50% of the original amount (safety check)
  if (feeCents > amountCents * 0.5) {
    if (logDetails) {
      console.error(`❌ [validateFeeAmount] Fee ${feeCents} exceeds 50% of amount ${amountCents}`);
    }
    return false;
  }

  // Coach should receive at least 50 cents (Stripe's minimum payout)
  if (coachReceives < 50) {
    if (logDetails) {
      console.error(`❌ [validateFeeAmount] Coach would only receive ${coachReceives} cents (minimum 50)`);
    }
    return false;
  }

  return true;
}

/**
 * Default commission settings for TeachTape
 */
export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  platformCommissionPercentage: 10.0, // 10%
  athleteServiceFeeType: 'none',
  athleteServiceFeePercentage: 0.0,
  athleteServiceFeeFlatCents: 0,
};

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

// Cache for commission settings to avoid DB spam
let settingsCache: { settings: CommissionSettings; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds

/**
 * Get active commission settings with in-memory caching
 * Cached for 60 seconds to avoid database spam
 */
export async function getActiveCommissionSettings(): Promise<CommissionSettings> {
  if (typeof window !== 'undefined') {
    throw new Error('getActiveCommissionSettings() can only be called server-side');
  }

  const now = Date.now();
  
  // Return cached settings if still valid
  if (settingsCache && (now - settingsCache.timestamp) < CACHE_DURATION_MS) {
    return settingsCache.settings;
  }

  try {
    // Import settings service to reuse the new centralized service
    const { getCommissionSettings: getSettings } = await import('@/lib/settingsService');
    const settings = await getSettings();
    
    const commissionSettings: CommissionSettings = {
      platformCommissionPercentage: settings.platform_fee_percentage,
      athleteServiceFeeType: determineAthleteServiceFeeType(
        settings.athlete_service_fee_percent,
        settings.athlete_service_fee_flat_cents
      ),
      athleteServiceFeePercentage: settings.athlete_service_fee_percent,
      athleteServiceFeeFlatCents: settings.athlete_service_fee_flat_cents,
    };

    // Cache the settings
    settingsCache = {
      settings: commissionSettings,
      timestamp: now
    };

    return commissionSettings;
  } catch (error) {
    console.warn('Error fetching commission settings, using defaults:', error);
    return DEFAULT_COMMISSION_SETTINGS;
  }
}

/**
 * Get commission settings from database or fallback to defaults
 * This function should be called from server-side code only
 * @deprecated Use getActiveCommissionSettings() instead for caching
 */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  return getActiveCommissionSettings();
}

/**
 * Determine athlete service fee type based on settings
 */
function determineAthleteServiceFeeType(
  percentFee: number,
  flatCents: number
): 'none' | 'percentage' | 'flat' {
  if (percentFee > 0 && flatCents > 0) {
    // If both are set, percentage takes precedence
    return 'percentage';
  } else if (percentFee > 0) {
    return 'percentage';
  } else if (flatCents > 0) {
    return 'flat';
  }
  return 'none';
}

/**
 * Calculate platform cut in cents using integer math
 * @param subtotalCents - Subtotal amount in cents
 * @param platformPct - Platform percentage (0-30)
 * @returns Platform cut amount in cents
 */
export function calcPlatformCutCents(subtotalCents: number, platformPct: number): number {
  if (subtotalCents <= 0) {
    throw new Error('Subtotal must be greater than 0');
  }
  
  // Clamp platform percentage between 0 and 30
  const clampedPct = Math.max(0, Math.min(30, platformPct));
  
  // Calculate using integer math and round to nearest cent
  return Math.round(subtotalCents * (clampedPct / 100));
}

/**
 * Calculate athlete fee line items
 * @param feeConfig - Fee configuration with percent and/or flat amounts
 * @param subtotalCents - Subtotal amount in cents
 * @returns Object with potential percent and flat fee line items
 */
export function calcAthleteFeeLineItems(
  feeConfig: { percent: number; flatCents: number },
  subtotalCents: number
): {
  percentItem?: { name: string; amount_cents: number };
  flatItem?: { name: string; amount_cents: number };
} {
  const result: {
    percentItem?: { name: string; amount_cents: number };
    flatItem?: { name: string; amount_cents: number };
  } = {};

  // Clamp percentage between 0 and 30
  const clampedPercent = Math.max(0, Math.min(30, feeConfig.percent));
  
  // Clamp flat fee between 0 and 2000 cents ($20.00)
  const clampedFlatCents = Math.max(0, Math.min(2000, feeConfig.flatCents));

  // Add percentage-based fee if applicable
  if (clampedPercent > 0) {
    const percentAmount = Math.round(subtotalCents * (clampedPercent / 100));
    if (percentAmount > 0) {
      result.percentItem = {
        name: `Service fee (${clampedPercent}%)`,
        amount_cents: percentAmount
      };
    }
  }

  // Add flat fee if applicable
  if (clampedFlatCents > 0) {
    result.flatItem = {
      name: 'Service fee',
      amount_cents: clampedFlatCents
    };
  }

  return result;
}

/**
 * Calculate athlete service fee based on commission settings
 * @deprecated Use calcAthleteFeeLineItems for more detailed breakdown
 */
export function calculateAthleteServiceFee(
  basePriceCents: number,
  commissionSettings: CommissionSettings
): number {
  if (commissionSettings.athleteServiceFeeType === 'none') {
    return 0;
  }
  
  if (commissionSettings.athleteServiceFeeType === 'flat') {
    // Apply clamping for safety
    return Math.max(0, Math.min(2000, commissionSettings.athleteServiceFeeFlatCents));
  }
  
  if (commissionSettings.athleteServiceFeeType === 'percentage') {
    // Apply clamping for safety
    const clampedPercent = Math.max(0, Math.min(30, commissionSettings.athleteServiceFeePercentage));
    return Math.round(basePriceCents * (clampedPercent / 100));
  }
  
  return 0;
}

/**
 * Get detailed fee breakdown including athlete service fees
 */
export function getExtendedFeeBreakdown(
  basePriceCents: number,
  commissionSettings: CommissionSettings
): ExtendedFeeBreakdown {
  // Calculate athlete service fee
  const athleteServiceFee = calculateAthleteServiceFee(basePriceCents, commissionSettings);
  const totalChargedToAthlete = basePriceCents + athleteServiceFee;
  
  // Calculate platform commission from base price (not including service fee)
  const platformCommissionAmount = calcPlatformCutCents(basePriceCents, commissionSettings.platformCommissionPercentage);
  const coachAmount = basePriceCents - platformCommissionAmount;
  
  return {
    originalAmount: basePriceCents,
    platformFee: platformCommissionAmount,
    coachAmount,
    feePercentage: commissionSettings.platformCommissionPercentage / 100,
    fixedFeeCents: 0, // Commission is percentage-based, not fixed
    athleteServiceFee,
    totalChargedToAthlete,
  };
}

/**
 * Validate commission settings
 */
export function validateCommissionSettings(settings: Partial<CommissionSettings>): string[] {
  const errors: string[] = [];
  
  if (settings.platformCommissionPercentage !== undefined) {
    if (settings.platformCommissionPercentage < 0 || settings.platformCommissionPercentage > 30) {
      errors.push('Platform commission must be between 0% and 30%');
    }
  }
  
  if (settings.athleteServiceFeePercentage !== undefined) {
    if (settings.athleteServiceFeePercentage < 0 || settings.athleteServiceFeePercentage > 30) {
      errors.push('Athlete service fee percentage must be between 0% and 30%');
    }
  }
  
  if (settings.athleteServiceFeeFlatCents !== undefined) {
    if (settings.athleteServiceFeeFlatCents < 0 || settings.athleteServiceFeeFlatCents > 2000) {
      errors.push('Athlete service fee must be between $0.00 and $20.00');
    }
  }
  
  return errors;
}

// Export commonly used fee calculation for convenience
export { calculateApplicationFee as getApplicationFee };