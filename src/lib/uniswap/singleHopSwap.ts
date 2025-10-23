import { SingleHopSwapParams } from '@/types/swap';
import { Address, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { createPoolKey, getZeroForOne, getPoolTokenAddress } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';

// CORRECT V4 Action Constants from v4-periphery contract
// From: https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
const V4_SWAP_EXACT_IN_SINGLE = 0x06;
const V4_SETTLE_ALL = 0x0c;
const V4_TAKE_ALL = 0x0f;
const V4_SWAP_COMMAND = 0x10;

/**
 * Encode V4 swap actions manually (SDK has wrong action constants)
 */
function encodeV4SwapActions(
  params: SingleHopSwapParams
): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const { tokenIn, tokenOut, amountIn, minAmountOut } = params;

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses (convert ETH to WETH if needed)
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  const wantsNativeOut = isNativeToken(tokenOut.address);

  // Native ETH is represented as address(0) in V4 (not WETH!)
  const getV4Currency = (token: typeof tokenIn | typeof tokenOut): Address => {
    if (isNativeToken(token.address)) {
      return '0x0000000000000000000000000000000000000000';
    }
    return getPoolTokenAddress(token);
  };

  const currencyIn = getV4Currency(tokenIn);
  const currencyOut = getV4Currency(tokenOut);
  const takeCurrency = currencyOut;

  // For the poolKey, we need to use the actual currencies being swapped
  // If swapping ETH, use address(0), NOT WETH address
  const poolKeyCurrency0 = isNativeToken(tokenIn.address) && poolKey.currency0 === getPoolTokenAddress(tokenIn)
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency0 === getPoolTokenAddress(tokenOut)
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency0;

  const poolKeyCurrency1 = isNativeToken(tokenIn.address) && poolKey.currency1 === getPoolTokenAddress(tokenIn)
    ? '0x0000000000000000000000000000000000000000'
    : isNativeToken(tokenOut.address) && poolKey.currency1 === getPoolTokenAddress(tokenOut)
    ? '0x0000000000000000000000000000000000000000'
    : poolKey.currency1;

  console.log('=== V4 Swap Config ===');
  console.log('Token In:', tokenIn.symbol, tokenIn.address, '(isNative:', isNativeToken(tokenIn.address), ')');
  console.log('Token Out:', tokenOut.symbol, tokenOut.address, '(isNative:', isNativeToken(tokenOut.address), ')');
  console.log('PoolKey currency0:', poolKeyCurrency0);
  console.log('PoolKey currency1:', poolKeyCurrency1);
  console.log('Zero for One:', zeroForOne);
  console.log('Currency In (for SETTLE):', currencyIn);
  console.log('Currency Out (for TAKE):', takeCurrency);
  console.log('AmountIn:', amountIn.toString());
  console.log('MinAmountOut:', minAmountOut.toString());
  if (wantsNativeOut) {
    console.log('Native ETH requested as output. TAKE_ALL will deliver native ETH directly.');
  }

  // Build V4 actions bytes - concatenate action IDs
  const actionIds = [
    V4_SWAP_EXACT_IN_SINGLE,
    V4_SETTLE_ALL,
    V4_TAKE_ALL,
  ];
  const actionsBytes = `0x${actionIds.map((id) => id.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

  // Build parameters array for each action
  const paramsArray: `0x${string}`[] = [];

  // Action 1: SWAP_EXACT_IN_SINGLE - ExactInputSingleParams struct
  const swapParams = encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [
      [poolKeyCurrency0, poolKeyCurrency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      minAmountOut,
      '0x',
    ]
  );
  paramsArray.push(swapParams);

  // Action 2: SETTLE_ALL - settle input currency
  const settleParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyIn, amountIn]
  );
  paramsArray.push(settleParams);

  // Action 3: TAKE_ALL - collect output currency
  const takeParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [takeCurrency, minAmountOut]
  );
  paramsArray.push(takeParams);

  // Encode the V4 command input (bytes actions, bytes[] params)
  const v4Input = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actionsBytes, paramsArray]
  );

  const commands = `0x${V4_SWAP_COMMAND.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs = [v4Input] as `0x${string}`[];

  console.log('=== V4 Manual Encoding ===');
  console.log('Actions:', actionsBytes);
  console.log('Action sequence:', actionIds.map((id) => `0x${id.toString(16).padStart(2, '0')}`).join(' -> '));
  console.log('Params array length:', paramsArray.length);
  console.log('Commands:', commands);
  console.log('Expected Commands: 0x10 (V4_SWAP)');

  return { commands, inputs };
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
  const value = isNativeToken(tokenIn.address) ? amountIn : BigInt(0);

  console.log('=== Universal Router Transaction ===');
  console.log('To:', universalRouterAddress);
  console.log('Value:', value.toString(), 'wei');
  console.log('Commands:', commands);
  console.log('Inputs length:', inputs.length);
  console.log('Inputs[0] (encodedActions) length:', inputs[0].length);
  console.log('Deadline:', deadline.toString());
  console.log('Data length:', data.length);

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
export async function estimateSingleHopSwapGas(_params: SingleHopSwapParams): Promise<bigint> {
  // This is a rough estimate. Actual gas will vary.
  // Single-hop V4 swaps typically use 150k-200k gas
  return BigInt(180000);
}

/**
 * Validate single-hop swap parameters
 */
export function validateSingleHopSwapParams(params: SingleHopSwapParams): {
  valid: boolean;
  error?: string;
} {
  if (params.amountIn <= BigInt(0)) {
    return { valid: false, error: 'Amount in must be greater than 0' };
  }

  if (params.minAmountOut < BigInt(0)) {
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
