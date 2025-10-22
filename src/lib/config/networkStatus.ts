/**
 * Network status for Uniswap V4
 * Updated: January 2025
 */

export interface NetworkStatus {
  chainId: number;
  name: string;
  v4Deployed: boolean;
  poolsAvailable: 'good' | 'limited' | 'none' | 'unknown';
  recommendation: string;
}

export const NETWORK_STATUS: Record<number, NetworkStatus> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    v4Deployed: true,
    poolsAvailable: 'good',
    recommendation: 'Best network for V4 swaps. Most pools available.',
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    v4Deployed: true,
    poolsAvailable: 'none',
    recommendation: 'V4 contracts deployed but NO default pools. You need to create test pools manually or use Mainnet for testing.',
  },

  // Base
  8453: {
    chainId: 8453,
    name: 'Base',
    v4Deployed: true,
    poolsAvailable: 'none', // Updated: Even ETH/USDC fails - no working pools
    recommendation: 'V4 contracts deployed but NO pools available yet. Transaction will fail. Use Ethereum Mainnet instead.',
  },

  // Arbitrum One
  42161: {
    chainId: 42161,
    name: 'Arbitrum',
    v4Deployed: true,
    poolsAvailable: 'limited',
    recommendation: 'V4 deployed with some pools. May have low liquidity. Try common pairs or use Mainnet.',
  },
};

/**
 * Get network status
 */
export function getNetworkStatus(chainId: number): NetworkStatus | null {
  return NETWORK_STATUS[chainId] || null;
}

/**
 * Check if network is recommended for V4 swaps
 */
export function isRecommendedNetwork(chainId: number): boolean {
  const status = getNetworkStatus(chainId);
  return status?.poolsAvailable === 'good';
}

/**
 * Get network warning message if applicable
 */
export function getNetworkWarning(chainId: number): string | null {
  const status = getNetworkStatus(chainId);

  if (!status) {
    return 'This network is not supported for Uniswap V4.';
  }

  if (status.poolsAvailable === 'none') {
    return `⚠️ ${status.name}: ${status.recommendation}`;
  }

  if (status.poolsAvailable === 'limited') {
    return `ℹ️ ${status.name}: ${status.recommendation}`;
  }

  return null;
}

/**
 * Get recommended network for testing
 */
export function getRecommendedNetwork(): number {
  return 1; // Ethereum Mainnet
}
