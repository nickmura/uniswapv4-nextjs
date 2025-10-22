/**
 * Calculate minimum amount out based on slippage tolerance
 * @param amountOut - Expected output amount
 * @param slippagePercent - Slippage percentage (e.g., 0.5 for 0.5%)
 * @returns Minimum amount out after slippage
 */
export function calculateMinAmountOut(amountOut: bigint, slippagePercent: number): bigint {
  // Convert slippage percentage to basis points (1% = 100 bps)
  const slippageBps = Math.floor(slippagePercent * 100);

  // Calculate slippage amount
  const slippageAmount = (amountOut * BigInt(slippageBps)) / 10000n;

  // Return minimum amount (amountOut - slippageAmount)
  return amountOut - slippageAmount;
}

/**
 * Calculate maximum amount in based on slippage tolerance
 * @param amountIn - Expected input amount
 * @param slippagePercent - Slippage percentage (e.g., 0.5 for 0.5%)
 * @returns Maximum amount in after slippage
 */
export function calculateMaxAmountIn(amountIn: bigint, slippagePercent: number): bigint {
  // Convert slippage percentage to basis points
  const slippageBps = Math.floor(slippagePercent * 100);

  // Calculate slippage amount
  const slippageAmount = (amountIn * BigInt(slippageBps)) / 10000n;

  // Return maximum amount (amountIn + slippageAmount)
  return amountIn + slippageAmount;
}

/**
 * Calculate price impact percentage
 * @param amountIn - Input amount
 * @param amountOut - Output amount
 * @param expectedRate - Expected exchange rate
 * @returns Price impact as percentage
 */
export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  expectedRate: number
): number {
  if (amountIn === 0n || amountOut === 0n) {
    return 0;
  }

  // Calculate actual rate
  const actualRate = Number(amountOut) / Number(amountIn);

  // Calculate price impact
  const priceImpact = ((expectedRate - actualRate) / expectedRate) * 100;

  return Math.max(0, priceImpact);
}

/**
 * Get recommended slippage based on price impact
 * @param priceImpact - Price impact percentage
 * @returns Recommended slippage percentage
 */
export function getRecommendedSlippage(priceImpact: number): number {
  if (priceImpact < 0.1) {
    return 0.5; // 0.5% for low impact
  } else if (priceImpact < 1) {
    return 1.0; // 1% for medium impact
  } else if (priceImpact < 3) {
    return 2.0; // 2% for high impact
  } else {
    return 3.0; // 3% for very high impact
  }
}

/**
 * Validate slippage tolerance
 * @param slippage - Slippage percentage
 * @returns True if slippage is valid
 */
export function isValidSlippage(slippage: number): boolean {
  return slippage >= 0.01 && slippage <= 50;
}

/**
 * Get slippage warning level
 * @param slippage - Slippage percentage
 * @returns Warning level: 'none', 'warning', 'danger'
 */
export function getSlippageWarning(slippage: number): 'none' | 'warning' | 'danger' {
  if (slippage < 0.1) {
    return 'warning'; // Too low, transaction might fail
  } else if (slippage > 5) {
    return 'danger'; // Too high, risk of front-running
  } else if (slippage > 2) {
    return 'warning'; // High slippage
  }
  return 'none';
}

/**
 * Format slippage for display
 * @param slippage - Slippage percentage
 * @returns Formatted slippage string
 */
export function formatSlippage(slippage: number): string {
  return `${slippage.toFixed(2)}%`;
}

/**
 * Common slippage presets
 */
export const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0] as const;

/**
 * Default slippage tolerance
 */
export const DEFAULT_SLIPPAGE = 0.5;

/**
 * Calculate deadline timestamp (current time + minutes)
 * @param minutes - Number of minutes from now
 * @returns Deadline as Unix timestamp (in seconds)
 */
export function calculateDeadline(minutes: number = 20): bigint {
  const now = Math.floor(Date.now() / 1000);
  return BigInt(now + minutes * 60);
}
