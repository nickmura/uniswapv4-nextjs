import { SingleHopSwapParams, Token } from '@/types/swap';
import { Address, encodeFunctionData, isAddress } from 'viem';
import { V4Planner, Actions } from '@uniswap/v4-sdk';
import { createPoolKey, getZeroForOne, getPoolTokenAddress } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';

const V4_SWAP_COMMAND = 0x10;

// Debug mode - set NEXT_PUBLIC_DEBUG_SWAPS=true in .env to enable detailed logs
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_SWAPS === 'true';

/**
 * Get V4 currency address
 * Native ETH is represented as address(0) in V4, not WETH
 */
function getV4Currency(token: Token): Address {
  if (isNativeToken(token.address)) {
    return '0x0000000000000000000000000000000000000000';
  }
  return getPoolTokenAddress(token);
}

/**
 * Encode V4 swap actions using the official V4 SDK Planner
 *
 * V4 Swap Action Sequence:
 * 1. SWAP_EXACT_IN_SINGLE - Execute the swap in the pool (creates a debt/credit delta)
 * 2. SETTLE - Pay the input tokens from user to PoolManager (settles the debt)
 * 3. TAKE - Withdraw output tokens from PoolManager to recipient (claims the credit)
 *
 * @param params - Single hop swap parameters
 * @returns Encoded commands and inputs for Universal Router
 */
function encodeV4SwapActions(
  params: SingleHopSwapParams
): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const { tokenIn, tokenOut, amountIn, minAmountOut, recipient } = params;

  // Validate recipient address format
  if (!isAddress(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses (convert ETH to WETH for pool key)
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  // Get V4 currencies (native ETH = address(0))
  const currencyIn = getV4Currency(tokenIn);
  const currencyOut = getV4Currency(tokenOut);

  // For the poolKey, we need to check if EITHER token is native and matches the pool currency
  // The pool currencies are already sorted, but we need to replace WETH with address(0) if it's native ETH
  const poolKeyCurrency0 =
    (isNativeToken(tokenIn.address) && poolKey.currency0 === getPoolTokenAddress(tokenIn))
      ? '0x0000000000000000000000000000000000000000'
      : (isNativeToken(tokenOut.address) && poolKey.currency0 === getPoolTokenAddress(tokenOut))
      ? '0x0000000000000000000000000000000000000000'
      : poolKey.currency0;

  const poolKeyCurrency1 =
    (isNativeToken(tokenIn.address) && poolKey.currency1 === getPoolTokenAddress(tokenIn))
      ? '0x0000000000000000000000000000000000000000'
      : (isNativeToken(tokenOut.address) && poolKey.currency1 === getPoolTokenAddress(tokenOut))
      ? '0x0000000000000000000000000000000000000000'
      : poolKey.currency1;

  if (DEBUG) {
    console.log('=== V4 Swap Config ===');
    console.log('Token In:', tokenIn.symbol, tokenIn.address, '(isNative:', isNativeToken(tokenIn.address), ')');
    console.log('Token Out:', tokenOut.symbol, tokenOut.address, '(isNative:', isNativeToken(tokenOut.address), ')');
    console.log('PoolKey currency0:', poolKeyCurrency0);
    console.log('PoolKey currency1:', poolKeyCurrency1);
    console.log('Zero for One:', zeroForOne);
    console.log('Currency In (for SETTLE):', currencyIn);
    console.log('Currency Out (for TAKE):', currencyOut);
    console.log('AmountIn:', amountIn.toString());
    console.log('MinAmountOut:', minAmountOut.toString());
    console.log('Recipient:', recipient);
  }

  // Build V4 actions using the official V4Planner SDK
  const planner = new V4Planner();

  // 1. Execute the swap
  planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [
    {
      poolKey: {
        currency0: poolKeyCurrency0,
        currency1: poolKeyCurrency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      },
      zeroForOne,
      amountIn: amountIn.toString(),
      amountOutMinimum: minAmountOut.toString(),
      hookData: '0x',
    },
  ]);

  // 2. Settle the input currency (pay tokens from user)
  planner.addAction(Actions.SETTLE, [currencyIn, amountIn.toString(), true]);

  // 3. Take the output currency (receive tokens to recipient)
  planner.addAction(Actions.TAKE, [currencyOut, recipient, '0']);

  const v4Input = planner.finalize() as `0x${string}`;
  const commands = `0x${V4_SWAP_COMMAND.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs: `0x${string}`[] = [v4Input];

  if (DEBUG) {
    console.log('=== V4 Encoding Complete ===');
    console.log('Action sequence:', 'SWAP_EXACT_IN_SINGLE -> SETTLE -> TAKE');
    console.log('Commands:', commands);
    console.log('Inputs length:', inputs.length);
  }

  return { commands, inputs };
}

/**
 * Prepare transaction data for single-hop swap
 *
 * @param params - Single hop swap parameters
 * @returns Transaction object ready to be sent via sendTransaction
 */
export function prepareSingleHopSwap(params: SingleHopSwapParams): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  // Validate parameters before encoding
  const validation = validateSingleHopSwapParams(params);
  if (!validation.valid) {
    throw new Error(`Invalid swap parameters: ${validation.error}`);
  }

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

  if (DEBUG) {
    console.log('=== Universal Router Transaction ===');
    console.log('To:', universalRouterAddress);
    console.log('Value:', value.toString(), 'wei');
    console.log('Commands:', commands);
    console.log('Inputs length:', inputs.length);
    console.log('Inputs[0] (encodedActions) length:', inputs[0].length);
    console.log('Deadline:', deadline.toString());
    console.log('Data length:', data.length);
  }

  return {
    to: universalRouterAddress,
    data,
    value,
  };
}

/**
 * Execute a single-hop swap
 *
 * Note: This function prepares the transaction data.
 * Actual execution should be done via wagmi's sendTransaction hook.
 *
 * @param params - Single hop swap parameters
 * @returns Transaction object ready to be sent
 * @throws Error if parameters are invalid or encoding fails
 */
export async function executeSingleHopSwap(params: SingleHopSwapParams): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  try {
    // Prepare transaction (validation happens inside)
    const tx = prepareSingleHopSwap(params);
    return tx;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to prepare single-hop swap: ${errorMessage}`);
  }
}

/**
 * Estimate gas for single-hop swap
 *
 * @deprecated Use wagmi's useEstimateGas hook instead for accurate gas estimation
 * @returns Rough estimate of gas units needed (150k-200k typical for V4 single-hop)
 */
export async function estimateSingleHopSwapGas(): Promise<bigint> {
  // This is a rough estimate. Actual gas will vary based on:
  // - Token types (native ETH vs ERC20)
  // - Pool state and liquidity
  // - Hook complexity
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
