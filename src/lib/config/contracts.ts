import { UniswapContracts } from '@/types/swap';
import { Address, getAddress } from 'viem';

// Uniswap V4 Contract Addresses
// Official addresses from https://docs.uniswap.org/contracts/v4/deployments
// Deployed January 31, 2025

// Ethereum Mainnet (Chain ID: 1)
export const MAINNET_CONTRACTS: UniswapContracts = {
  poolManager: getAddress('0x000000000004444c5dc75cB358380D2e3dE08A90'),
  quoter: getAddress('0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203'),
  stateView: getAddress('0x7ffe42c4a5deea5b0fec41c94c136cf115597227'),
  universalRouter: getAddress('0x66a9893cc07d91d95644aedd05d03f95e1dba8af'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
};

// Sepolia Testnet (Chain ID: 11155111)
export const SEPOLIA_CONTRACTS: UniswapContracts = {
  poolManager: getAddress('0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'),
  quoter: getAddress('0x61b3f2011a92d183c7dbadbda940a7555ccf9227'),
  stateView: getAddress('0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c'),
  universalRouter: getAddress('0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
};

// Base Mainnet (Chain ID: 8453)
export const BASE_CONTRACTS: UniswapContracts = {
  poolManager: getAddress('0x498581ff718922c3f8e6a244956af099b2652b2b'),
  quoter: getAddress('0x0d5e0f971ed27fbff6c2837bf31316121532048d'),
  stateView: getAddress('0xa3c0c9b65bad0b08107aa264b0f3db444b867a71'),
  universalRouter: getAddress('0x6ff5693b99212da76ad316178a184ab56d299b43'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
};

// Arbitrum One (Chain ID: 42161)
export const ARBITRUM_CONTRACTS: UniswapContracts = {
  poolManager: getAddress('0x360e68faccca8ca495c1b759fd9eee466db9fb32'),
  quoter: getAddress('0x3972c00f7ed4885e145823eb7c655375d275a1c5'),
  stateView: getAddress('0x76fd297e2d437cd7f76d50f01afe6160f86e9990'),
  universalRouter: getAddress('0xa51afafe0263b40edaef0df8781ea9aa03e381a3'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
};

// Get contract addresses by chain ID
export function getContractsByChainId(chainId: number): UniswapContracts {
  switch (chainId) {
    case 1:
      return MAINNET_CONTRACTS;
    case 11155111:
      return SEPOLIA_CONTRACTS;
    case 8453:
      return BASE_CONTRACTS;
    case 42161:
      return ARBITRUM_CONTRACTS;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// Get specific contract address
export function getPoolManagerAddress(chainId: number): Address {
  return getContractsByChainId(chainId).poolManager;
}

export function getQuoterAddress(chainId: number): Address {
  return getContractsByChainId(chainId).quoter;
}

export function getStateViewAddress(chainId: number): Address {
  return getContractsByChainId(chainId).stateView;
}

export function getUniversalRouterAddress(chainId: number): Address {
  return getContractsByChainId(chainId).universalRouter;
}

export function getPermit2Address(chainId: number): Address {
  return getContractsByChainId(chainId).permit2;
}

// Quoter ABI (minimal - only methods we need)
export const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
            name: 'poolKey',
            type: 'tuple',
          },
          { name: 'zeroForOne', type: 'bool' },
          { name: 'exactAmount', type: 'uint128' },
          { name: 'hookData', type: 'bytes' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'exactCurrency', type: 'address' },
          {
            components: [
              { name: 'intermediateCurrency', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
              { name: 'hookData', type: 'bytes' },
            ],
            name: 'path',
            type: 'tuple[]',
          },
          { name: 'exactAmount', type: 'uint128' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInput',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI (minimal - only methods we need)
export const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Universal Router ABI (minimal)
export const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
