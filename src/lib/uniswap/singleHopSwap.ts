import { SingleHopSwapParams } from '@/types/swap';
import { Address, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { createPoolKey, getZeroForOne, getPoolTokenAddress } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';
import { RoutePlanner, CommandType } from '@uniswap/universal-router-sdk';

// V4 Periphery Action Constants (from v4-periphery/src/libraries/Actions.sol)
const V4_SWAP_EXACT_IN_SINGLE = 0x06;
const V4_SETTLE_ALL = 0x0c;
const V4_TAKE_ALL = 0x0f;

/**
 * Encode V4 Planner actions for single-hop swap
 * Based on: https://docs.uniswap.org/contracts/v4/quickstart/swap
 */
function encodeV4SwapActions(params: SingleHopSwapParams): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const { tokenIn, tokenOut, amountIn, minAmountOut } = params;

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses (convert ETH to WETH if needed)
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  // Build V4 actions bytes - concatenate action IDs (like abi.encodePacked in Solidity)
  const actionsBytes = `0x${V4_SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')}${V4_SETTLE_ALL.toString(16).padStart(2, '0')}${V4_TAKE_ALL.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Build parameters array for each action
  const params_array: `0x${string}`[] = [];

  // Param 1: SWAP_EXACT_IN_SINGLE - ExactInputSingleParams struct
  const swapParams = encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      minAmountOut,
      '0x' as `0x${string}`,
    ]
  );
  params_array.push(swapParams);

  // Param 2: SETTLE_ALL - (currency, maxAmount)
  const currencyToSettle = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const settleParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyToSettle, amountIn]
  );
  params_array.push(settleParams);

  // Param 3: TAKE_ALL - (currency, minAmount)
  const currencyToTake = zeroForOne ? poolKey.currency1 : poolKey.currency0;
  const takeParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyToTake, minAmountOut]
  );
  params_array.push(takeParams);

  // Encode the input for V4_SWAP command: abi.encode(actions, params)
  const v4SwapInput = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actionsBytes, params_array]
  );

  // Create route planner and add V4_SWAP command
  const planner = new RoutePlanner();
  planner.addCommand(CommandType.V4_SWAP, [v4SwapInput]);

  return {
    commands: planner.commands as `0x${string}`,
    inputs: planner.inputs as `0x${string}`[],
  };
}

/**
 * Prepare transaction data for single-hop swap
 */
export function prepareSingleHopSwap(params: SingleHopSwapParams): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const { tokenIn, amountIn, deadline, chainId } = params;

  // Get Universal Router address
  const universalRouterAddress = getUniversalRouterAddress(chainId);

  // Encode V4 planner actions
  const { commands, inputs } = encodeV4SwapActions(params);

  // Encode the execute function call
  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [commands, inputs, deadline],
  });

  // Calculate value (only if swapping native ETH)
  const value = isNativeToken(tokenIn.address) ? amountIn : 0n;

  return {
    to: universalRouterAddress,
    data,
    value,
  };
}

/**
 * Execute a single-hop swap
 * Note: This function prepares the transaction data.
 * Actual execution should be done via wagmi's useWriteContract hook
 */
export async function executeSingleHopSwap(params: SingleHopSwapParams): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  try {
    // Validate parameters
    if (params.amountIn <= 0n) {
      throw new Error('Amount in must be greater than 0');
    }

    if (params.minAmountOut < 0n) {
      throw new Error('Minimum amount out cannot be negative');
    }

    if (params.tokenIn.chainId !== params.tokenOut.chainId) {
      throw new Error('Tokens must be on the same chain');
    }

    // Prepare transaction
    const tx = prepareSingleHopSwap(params);

    return tx;
  } catch (error) {
    console.error('Error executing single-hop swap:', error);
    throw error;
  }
}

/**
 * Estimate gas for single-hop swap
 */
export async function estimateSingleHopSwapGas(params: SingleHopSwapParams): Promise<bigint> {
  // This is a rough estimate. Actual gas will vary.
  // Single-hop V4 swaps typically use 150k-200k gas
  return 180000n;
}

/**
 * Validate single-hop swap parameters
 */
export function validateSingleHopSwapParams(params: SingleHopSwapParams): {
  valid: boolean;
  error?: string;
} {
  if (params.amountIn <= 0n) {
    return { valid: false, error: 'Amount in must be greater than 0' };
  }

  if (params.minAmountOut < 0n) {
    return { valid: false, error: 'Minimum amount out cannot be negative' };
  }

  if (params.tokenIn.chainId !== params.tokenOut.chainId) {
    return { valid: false, error: 'Tokens must be on the same chain' };
  }

  if (params.tokenIn.address.toLowerCase() === params.tokenOut.address.toLowerCase()) {
    return { valid: false, error: 'Cannot swap a token for itself' };
  }

  if (params.deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    return { valid: false, error: 'Deadline has already passed' };
  }

  return { valid: true };
}
