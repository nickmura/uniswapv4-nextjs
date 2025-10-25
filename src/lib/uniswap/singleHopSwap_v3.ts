/**
 * @file singleHopSwap_v3.ts
 * @deprecated This file contains experimental implementations and is kept for reference only.
 *
 * DO NOT USE THIS FILE IN PRODUCTION CODE.
 * Use ./singleHopSwap.ts instead, which uses the official @uniswap/v4-sdk.
 *
 * This file was created during debugging to test different action types:
 * - Approach 4: Using SETTLE + TAKE (with explicit amounts and recipient)
 * - Approach 5: Simplified SETTLE_ALL + TAKE_ALL with minimal parameters
 *
 * Both approaches were replaced by the SDK-based implementation in singleHopSwap.ts
 */

import { SingleHopSwapParams } from '@/types/swap';
import { Address, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { createPoolKey, getZeroForOne, getPoolTokenAddress } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';

// V4 Action Constants from v4-periphery/src/libraries/Actions.sol
const V4_SWAP_EXACT_IN_SINGLE = 0x06;
const V4_SETTLE = 0x0b;  // Alternative to SETTLE_ALL
const V4_TAKE = 0x0e;    // Alternative to TAKE_ALL
const V4_SETTLE_ALL = 0x0c;
const V4_TAKE_ALL = 0x0f;

// Universal Router Command
const V4_SWAP = 0x10;

// MSG_SENDER constant (for recipient)
/**
 * APPROACH 4: Using SETTLE + TAKE instead of SETTLE_ALL + TAKE_ALL
 *
 * Some implementations work better with explicit SETTLE/TAKE actions
 * that specify exact amounts rather than using the _ALL variants.
 */
function encodeV4SwapWithSettleTake(params: SingleHopSwapParams): {
  commands: `0x${string}`;
  inputs: `0x${string}`[]
} {
  const { tokenIn, tokenOut, amountIn, minAmountOut, recipient } = params;

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  // Get V4 currencies (use address(0) for native ETH)
  const getV4Currency = (token: typeof tokenIn | typeof tokenOut): Address => {
    if (isNativeToken(token.address)) {
      return '0x0000000000000000000000000000000000000000';
    }
    return getPoolTokenAddress(token);
  };

  const currencyIn = getV4Currency(tokenIn);
  const currencyOut = getV4Currency(tokenOut);

  // Pool key currencies with native ETH handling
  const poolKeyCurrency0 = isNativeToken(tokenIn.address) && poolKey.currency0 === tokenInAddress
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency0 === tokenOutAddress
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency0;

  const poolKeyCurrency1 = isNativeToken(tokenIn.address) && poolKey.currency1 === tokenInAddress
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency1 === tokenOutAddress
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency1;

  console.log('=== V4 SETTLE+TAKE Encoding (Approach 4) ===');
  console.log('Using SETTLE (0x0b) and TAKE (0x0e) instead of *_ALL variants');
  console.log('Recipient:', recipient);

  // Encode actions: SWAP_EXACT_IN_SINGLE + SETTLE + TAKE
  const actions = `0x${V4_SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')}${V4_SETTLE.toString(16).padStart(2, '0')}${V4_TAKE.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Encode parameters
  const actionParams: `0x${string}`[] = [];

  // Action 0: SWAP_EXACT_IN_SINGLE
  actionParams[0] = encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [
      [poolKeyCurrency0, poolKeyCurrency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      minAmountOut,
      '0x',
    ]
  );

  // Action 1: SETTLE
  // SETTLE takes: (currency, amount, payerIsUser)
  // payerIsUser = true means the user pays directly
  actionParams[1] = encodeAbiParameters(
    parseAbiParameters('address,uint256,bool'),
    [currencyIn, amountIn, true]
  );

  // Action 2: TAKE
  // TAKE takes: (currency, recipient, amount)
  actionParams[2] = encodeAbiParameters(
    parseAbiParameters('address,address,uint256'),
    [currencyOut, recipient, minAmountOut]
  );

  // Combine into V4_SWAP input
  const v4Input = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actions, actionParams]
  );

  const commands = `0x${V4_SWAP.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs = [v4Input];

  console.log('Actions:', actions);
  console.log('Commands:', commands);

  return { commands, inputs };
}

/**
 * APPROACH 5: Simplified SETTLE_ALL + TAKE_ALL with recipient handling
 *
 * Try passing the recipient in the TAKE_ALL parameters
 */
function encodeV4SwapSimplified(params: SingleHopSwapParams): {
  commands: `0x${string}`;
  inputs: `0x${string}`[]
} {
  const { tokenIn, tokenOut, amountIn, minAmountOut, recipient } = params;

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  // Get V4 currencies
  const getV4Currency = (token: typeof tokenIn | typeof tokenOut): Address => {
    if (isNativeToken(token.address)) {
      return '0x0000000000000000000000000000000000000000';
    }
    return getPoolTokenAddress(token);
  };

  const currencyIn = getV4Currency(tokenIn);
  const currencyOut = getV4Currency(tokenOut);

  // Pool key currencies
  const poolKeyCurrency0 = isNativeToken(tokenIn.address) && poolKey.currency0 === tokenInAddress
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency0 === tokenOutAddress
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency0;

  const poolKeyCurrency1 = isNativeToken(tokenIn.address) && poolKey.currency1 === tokenInAddress
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency1 === tokenOutAddress
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency1;

  console.log('=== V4 Simplified Encoding (Approach 5) ===');
  console.log('Simplified parameter encoding with recipient');

  // Encode actions
  const actions = `0x${V4_SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')}${V4_SETTLE_ALL.toString(16).padStart(2, '0')}${V4_TAKE_ALL.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Encode parameters - try just currency for SETTLE_ALL and TAKE_ALL
  const actionParams: `0x${string}`[] = [];

  // Action 0: SWAP_EXACT_IN_SINGLE (same as always)
  actionParams[0] = encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [
      [poolKeyCurrency0, poolKeyCurrency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      minAmountOut,
      '0x',
    ]
  );

  // Action 1: SETTLE_ALL - try with just currency
  actionParams[1] = encodeAbiParameters(
    parseAbiParameters('address'),
    [currencyIn]
  );

  // Action 2: TAKE_ALL - try with currency and recipient
  actionParams[2] = encodeAbiParameters(
    parseAbiParameters('address,address'),
    [currencyOut, recipient]
  );

  // Combine into V4_SWAP input
  const v4Input = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actions, actionParams]
  );

  const commands = `0x${V4_SWAP.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs = [v4Input];

  console.log('Actions:', actions);
  console.log('Simplified params - SETTLE_ALL: just currency, TAKE_ALL: currency + recipient');

  return { commands, inputs };
}

/**
 * Prepare transaction data for single-hop swap (V3 implementation)
 *
 * @param approach - Which encoding approach to use ('settle-take' | 'simplified')
 */
export function prepareSingleHopSwap(
  params: SingleHopSwapParams,
  approach: 'settle-take' | 'simplified' = 'settle-take'
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const { tokenIn, amountIn, deadline, chainId } = params;

  // Get Universal Router address
  const universalRouterAddress = getUniversalRouterAddress(chainId);

  // Choose encoding approach
  const { commands, inputs } = approach === 'settle-take'
    ? encodeV4SwapWithSettleTake(params)
    : encodeV4SwapSimplified(params);

  // Encode the execute function call
  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [commands, inputs, deadline],
  });

  // Calculate value (only if swapping native ETH)
  const value = isNativeToken(tokenIn.address) ? amountIn : BigInt(0);

  console.log('=== Universal Router Transaction ===');
  console.log('To:', universalRouterAddress);
  console.log('Value:', value.toString(), 'wei');
  console.log('Data length:', data.length);

  return {
    to: universalRouterAddress,
    data,
    value,
  };
}

/**
 * Execute a single-hop swap (V3 implementation)
 */
export async function executeSingleHopSwap(
  params: SingleHopSwapParams,
  approach: 'settle-take' | 'simplified' = 'settle-take'
): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  try {
    // Validate parameters
    if (params.amountIn <= BigInt(0)) {
      throw new Error('Amount in must be greater than 0');
    }

    if (params.minAmountOut < BigInt(0)) {
      throw new Error('Minimum amount out cannot be negative');
    }

    if (params.tokenIn.chainId !== params.tokenOut.chainId) {
      throw new Error('Tokens must be on the same chain');
    }

    // Prepare transaction
    const tx = prepareSingleHopSwap(params, approach);

    return tx;
  } catch (error) {
    console.error('Error executing single-hop swap (v3):', error);
    throw error;
  }
}
