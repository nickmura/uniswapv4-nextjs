import { Token } from '@/types/swap';
import { Address } from 'viem';

// Native ETH placeholder
export const NATIVE_ADDRESS: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Ethereum Mainnet Tokens
export const MAINNET_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ADDRESS,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ether',
    chainId: 1,
  },
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 1,
  },
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1,
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 1,
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 1,
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    chainId: 1,
  },
};

// Sepolia Testnet Tokens
// Note: These are mock tokens for testing - you may need to deploy your own
// or verify these addresses match available test tokens
export const SEPOLIA_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ADDRESS,
    decimals: 18,
    symbol: 'ETH',
    name: 'Sepolia Ether',
    chainId: 11155111,
  },
  WETH: {
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 11155111,
  },
  // Note: These USDC/DAI addresses may not have V4 pools
  // Check Uniswap interface or create test pools
  USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 11155111,
  },
  DAI: {
    address: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 11155111,
  },
};

// Optimism Mainnet Tokens
export const OPTIMISM_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ADDRESS,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ether',
    chainId: 10,
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 10,
  },
  USDC: {
    address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 10,
  },
  USDT: {
    address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 10,
  },
  DAI: {
    address: '0xda10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 10,
  },
  OP: {
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    symbol: 'OP',
    name: 'Optimism',
    chainId: 10,
  },
};

// Base Mainnet Tokens
export const BASE_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ADDRESS,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ether',
    chainId: 8453,
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 8453,
  },
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 8453,
  },
  USDbC: {
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    decimals: 6,
    symbol: 'USDbC',
    name: 'USD Base Coin',
    chainId: 8453,
  },
  DAI: {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 8453,
  },
};

// Arbitrum One Tokens
export const ARBITRUM_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ADDRESS,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ether',
    chainId: 42161,
  },
  WETH: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 42161,
  },
  USDC: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 42161,
  },
  USDT: {
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 42161,
  },
  DAI: {
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 42161,
  },
  WBTC: {
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    chainId: 42161,
  },
  ARB: {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    symbol: 'ARB',
    name: 'Arbitrum',
    chainId: 42161,
  },
};

// Get tokens by chain ID
export function getTokensByChainId(chainId: number): Record<string, Token> {
  switch (chainId) {
    case 1:
      return MAINNET_TOKENS;
    case 11155111:
      return SEPOLIA_TOKENS;
    case 10:
      return OPTIMISM_TOKENS;
    case 8453:
      return BASE_TOKENS;
    case 42161:
      return ARBITRUM_TOKENS;
    default:
      return MAINNET_TOKENS;
  }
}

// Get token by address and chain ID
export function getTokenByAddress(address: Address, chainId: number): Token | undefined {
  const tokens = getTokensByChainId(chainId);
  return Object.values(tokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

// Get common token list for UI
export function getCommonTokens(chainId: number): Token[] {
  const tokens = getTokensByChainId(chainId);
  return Object.values(tokens);
}

// Check if address is native ETH
export function isNativeToken(address: Address): boolean {
  return address.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
}

// Get WETH address for a chain
export function getWETHAddress(chainId: number): Address {
  const tokens = getTokensByChainId(chainId);
  return tokens.WETH.address;
}
