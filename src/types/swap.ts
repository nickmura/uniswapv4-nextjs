import { Currency } from '@uniswap/sdk-core';
import { SwapExactInSingle, SwapExactIn } from '@uniswap/v4-sdk';
import { Address } from 'viem';

export interface Token {
  address: Address;
  decimals: number;
  symbol: string;
  name: string;
  logoURI?: string;
  chainId: number;
}

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface QuoteParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  slippage?: number;
  chainId: number;
}

export interface QuoteResult {
  amountOut: bigint;
  amountOutFormatted: string;
  priceImpact: number;
  minAmountOut: bigint;
  minAmountOutFormatted: string;
  route: Token[];
  executionPrice: string;
  gasEstimate?: bigint;
}

export interface SingleHopSwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: Address;
  deadline: bigint;
  chainId: number;
}

export interface MultiHopSwapParams {
  route: Token[];
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: Address;
  deadline: bigint;
  chainId: number;
}

export interface SwapConfig {
  poolKey: PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  minAmountOut: bigint;
  hookData: `0x${string}`;
}

export interface PathKey {
  intermediateCurrency: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
  hookData: `0x${string}`;
}

export interface UniswapContracts {
  poolManager: Address;
  quoter: Address;
  stateView: Address;
  universalRouter: Address;
  permit2: Address;
}

export interface TokenBalance {
  token: Token;
  balance: bigint;
  formatted: string;
}

export enum SwapType {
  SINGLE_HOP = 'single-hop',
  MULTI_HOP = 'multi-hop',
}

export interface SlippageSettings {
  percentage: number;
  auto: boolean;
}

export type FeeAmount = 100 | 500 | 3000 | 10000;

export const FEE_AMOUNTS: Record<string, FeeAmount> = {
  LOWEST: 100, // 0.01%
  LOW: 500, // 0.05%
  MEDIUM: 3000, // 0.3%
  HIGH: 10000, // 1%
};

export const TICK_SPACINGS: Record<FeeAmount, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};
