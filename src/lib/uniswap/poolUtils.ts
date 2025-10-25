import { Token, PoolKey, PathKey, FEE_AMOUNTS, TICK_SPACINGS } from '@/types/swap';
import { Address, keccak256, encodePacked } from 'viem';
import { isNativeToken, getWETHAddress } from '../config/tokens';

// Zero address for hooks (no custom hooks)
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

/**
 * Sort two token addresses (currency0 must be < currency1)
 */
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
  return tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
}

/**
 * Determine if the swap is zeroForOne (selling currency0 for currency1)
 */
export function getZeroForOne(tokenIn: Address, tokenOut: Address): boolean {
  const [currency0] = sortTokens(tokenIn, tokenOut);
  return tokenIn.toLowerCase() === currency0.toLowerCase();
}

/**
 * Get the appropriate token address for pool operations
 * (converts native ETH to WETH address)
 */
export function getPoolTokenAddress(token: Token): Address {
  if (isNativeToken(token.address)) {
    return getWETHAddress(token.chainId);
  }
  return token.address;
}

/**
 * Create a PoolKey for Uniswap V4
 */
export function createPoolKey(
  tokenIn: Token,
  tokenOut: Token,
  fee: number = FEE_AMOUNTS.MEDIUM,
  hooks: Address = ZERO_ADDRESS
): PoolKey {
  // Get pool token addresses (convert ETH to WETH if needed)
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Sort tokens
  const [currency0, currency1] = sortTokens(tokenInAddress, tokenOutAddress);

  // Get tick spacing for fee tier
  const tickSpacing = getTickSpacing(fee);

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };
}

/**
 * Get tick spacing for a fee amount
 */
export function getTickSpacing(fee: number): number {
  if (fee === FEE_AMOUNTS.LOWEST) return TICK_SPACINGS[100];
  if (fee === FEE_AMOUNTS.LOW) return TICK_SPACINGS[500];
  if (fee === FEE_AMOUNTS.MEDIUM) return TICK_SPACINGS[3000];
  if (fee === FEE_AMOUNTS.HIGH) return TICK_SPACINGS[10000];

  // Default to MEDIUM tier
  return TICK_SPACINGS[3000];
}

/**
 * Create PathKey for multi-hop swaps
 */
export function createPathKey(
  intermediateCurrency: Token,
  fee: number = FEE_AMOUNTS.MEDIUM,
  hooks: Address = ZERO_ADDRESS,
  hookData: `0x${string}` = '0x'
): PathKey {
  const tickSpacing = getTickSpacing(fee);
  const currencyAddress = getPoolTokenAddress(intermediateCurrency);

  return {
    intermediateCurrency: currencyAddress,
    fee,
    tickSpacing,
    hooks,
    hookData,
  };
}

/**
 * Calculate pool ID (hash of pool key)
 */
export function calculatePoolId(poolKey: PoolKey): `0x${string}` {
  const encoded = encodePacked(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );

  return keccak256(encoded);
}

/**
 * Check if two pool keys are equal
 */
export function isPoolKeyEqual(a: PoolKey, b: PoolKey): boolean {
  return (
    a.currency0.toLowerCase() === b.currency0.toLowerCase() &&
    a.currency1.toLowerCase() === b.currency1.toLowerCase() &&
    a.fee === b.fee &&
    a.tickSpacing === b.tickSpacing &&
    a.hooks.toLowerCase() === b.hooks.toLowerCase()
  );
}

/**
 * Format pool key for display
 */
export function formatPoolKey(poolKey: PoolKey): string {
  return `${poolKey.currency0.slice(0, 6)}.../${poolKey.currency1.slice(0, 6)}... Fee: ${poolKey.fee / 10000}%`;
}

/**
 * Get all possible fee tiers for trying to find a pool
 */
export function getAllFeeTiers(): number[] {
  return [FEE_AMOUNTS.LOW, FEE_AMOUNTS.MEDIUM, FEE_AMOUNTS.LOWEST, FEE_AMOUNTS.HIGH];
}

/**
 * Create multiple pool keys with different fee tiers
 * (useful for finding the best pool)
 */
export function createPoolKeysForAllFees(tokenIn: Token, tokenOut: Token): PoolKey[] {
  return getAllFeeTiers().map((fee) => createPoolKey(tokenIn, tokenOut, fee));
}

/**
 * Encode route path for multi-hop swap
 * Based on official Uniswap V4 documentation
 *
 * Converts an array of tokens into PathKey[] format by:
 * 1. Creating a pool key for each consecutive pair
 * 2. Determining the output currency for each hop
 * 3. Building PathKey with intermediateCurrency = output of that hop
 */
export function encodeRoutePath(route: Token[], fees?: number[]): PathKey[] {
  if (route.length < 3) {
    throw new Error('Route must have at least 3 tokens for multi-hop');
  }

  const pathKeys: PathKey[] = [];
  const defaultFees = fees || route.slice(0, route.length - 1).map(() => FEE_AMOUNTS.MEDIUM);

  // Build pool keys for each hop
  const poolKeys: PoolKey[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const fee = defaultFees[i] || FEE_AMOUNTS.MEDIUM;
    poolKeys.push(createPoolKey(route[i], route[i + 1], fee));
  }

  // Start with the first token's address (convert ETH to WETH for pool keys)
  let currentCurrencyIn = getPoolTokenAddress(route[0]);

  // For each pool, determine the output currency
  for (let i = 0; i < poolKeys.length; i++) {
    const poolKey = poolKeys[i];

    // Determine the output currency for this hop
    const currencyOut = currentCurrencyIn.toLowerCase() === poolKey.currency0.toLowerCase()
      ? poolKey.currency1
      : poolKey.currency0;

    // For V4, native ETH should be represented as address(0) in the path
    // Check if the output token is native ETH
    const outputToken = route[i + 1];
    const pathCurrency = isNativeToken(outputToken.address)
      ? '0x0000000000000000000000000000000000000000' as Address
      : currencyOut;

    // Create path key for this hop
    const pathKey: PathKey = {
      intermediateCurrency: pathCurrency,
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks,
      hookData: '0x',
    };

    pathKeys.push(pathKey);
    currentCurrencyIn = currencyOut; // Output becomes input for next hop (keep as WETH for pool matching)
  }

  return pathKeys;
}

/**
 * Validate if a token pair can form a valid pool
 */
export function isValidTokenPair(tokenA: Token, tokenB: Token): boolean {
  // Tokens must be on the same chain
  if (tokenA.chainId !== tokenB.chainId) {
    return false;
  }

  // Tokens must be different
  const addressA = getPoolTokenAddress(tokenA);
  const addressB = getPoolTokenAddress(tokenB);

  return addressA.toLowerCase() !== addressB.toLowerCase();
}

/**
 * Check if a route is valid
 */
export function isValidRoute(route: Token[]): boolean {
  if (route.length < 2) {
    return false;
  }

  const chainId = route[0].chainId;

  for (let i = 0; i < route.length; i++) {
    // All tokens must be on same chain
    if (route[i].chainId !== chainId) {
      return false;
    }

    // Adjacent tokens must be different
    if (i > 0 && !isValidTokenPair(route[i - 1], route[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Get the intermediate token address for a route at a specific index
 */
export function getIntermediateToken(route: Token[], index: number): Token {
  if (index < 0 || index >= route.length) {
    throw new Error('Invalid route index');
  }
  return route[index];
}

/**
 * Format route for display
 */
export function formatRoute(route: Token[]): string {
  return route.map((token) => token.symbol).join(' → ');
}

/**
 * Get fee tier name
 */
export function getFeeTierName(fee: number): string {
  switch (fee) {
    case FEE_AMOUNTS.LOWEST:
      return '0.01% (Lowest)';
    case FEE_AMOUNTS.LOW:
      return '0.05% (Low)';
    case FEE_AMOUNTS.MEDIUM:
      return '0.3% (Medium)';
    case FEE_AMOUNTS.HIGH:
      return '1% (High)';
    default:
      return `${fee / 10000}%`;
  }
}
