import { SingleHopSwapParams } from '@/types/swap';
import { Address, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { createPoolKey, getZeroForOne, getPoolTokenAddress } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';

// V4 Action Constants (VERIFIED from v4-periphery/src/libraries/Actions.sol)
const V4_SWAP_EXACT_IN_SINGLE = 0x06;
const V4_SETTLE_ALL = 0x0c;
const V4_TAKE_ALL = 0x0f;

// Universal Router Command
const V4_SWAP = 0x10;

// Special constant for using contract balance / open delta 
//@ts-ignore sybau
const CONTRACT_BALANCE = 0x8000000000000000000000000000000000000000000000000000000000000000n;

/**
 * APPROACH 1: Direct ABI Encoding (Most Reliable)
 *
 * This implementation manually encodes all parameters according to the official
 * Uniswap V4 documentation, without relying on the RoutePlanner SDK.
 */
function encodeV4SwapDirect(params: SingleHopSwapParams): {
  commands: `0x${string}`;
  inputs: `0x${string}`[]
} {
  const { tokenIn, tokenOut, amountIn, minAmountOut } = params;

  // Create pool key
  const poolKey = createPoolKey(tokenIn, tokenOut);

  // Get token addresses (convert ETH to WETH for pool key)
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const tokenOutAddress = getPoolTokenAddress(tokenOut);

  // Determine swap direction
  const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

  // Get V4 currencies (use address(0) for native ETH in transactions)
  const getV4Currency = (token: typeof tokenIn | typeof tokenOut): Address => {
    if (isNativeToken(token.address)) {
      return '0x0000000000000000000000000000000000000000';
    }
    return getPoolTokenAddress(token);
  };

  const currencyIn = getV4Currency(tokenIn);
  const currencyOut = getV4Currency(tokenOut);

  // For pool key: if native ETH is involved, use address(0)
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

  console.log('=== V4 Direct Encoding (Approach 1) ===');
  console.log('Token In:', tokenIn.symbol, '→ Currency:', currencyIn);
  console.log('Token Out:', tokenOut.symbol, '→ Currency:', currencyOut);
  console.log('PoolKey currency0:', poolKeyCurrency0);
  console.log('PoolKey currency1:', poolKeyCurrency1);
  console.log('Zero for One:', zeroForOne);
  console.log('Amount In:', amountIn.toString());
  console.log('Min Amount Out:', minAmountOut.toString());

  // Step 1: Encode V4 actions as concatenated bytes
  const actions = `0x${V4_SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')}${V4_SETTLE_ALL.toString(16).padStart(2, '0')}${V4_TAKE_ALL.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Step 2: Encode parameters for each action
  const actionParams: `0x${string}`[] = [];

  // Action 0: SWAP_EXACT_IN_SINGLE
  // Encodes: ExactInputSingleParams struct
  // struct ExactInputSingleParams {
  //   PoolKey poolKey;
  //   bool zeroForOne;
  //   uint128 amountIn;
  //   uint128 amountOutMinimum;
  //   bytes hookData;
  // }
  actionParams[0] = encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [
      [poolKeyCurrency0, poolKeyCurrency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      minAmountOut,
      '0x', // hookData (empty)
    ]
  );

  // Action 1: SETTLE_ALL
  // Encodes: (currency, amount)
  // Amount is the exact amount to settle from the user
  actionParams[1] = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyIn, amountIn]
  );

  // Action 2: TAKE_ALL
  // Encodes: (currency, minAmount)
  // MinAmount is the minimum output we're willing to accept
  actionParams[2] = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyOut, minAmountOut]
  );

  console.log('Actions:', actions);
  console.log('Params count:', actionParams.length);

  // Step 3: Combine actions and params into V4_SWAP input
  // V4_SWAP expects: abi.encode(bytes actions, bytes[] params)
  const v4Input = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actions, actionParams]
  );

  // Step 4: Prepare Universal Router command
  const commands = `0x${V4_SWAP.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs = [v4Input];

  console.log('Commands:', commands);
  console.log('Inputs length:', inputs.length);
  console.log('V4 Input length:', v4Input.length);

  return { commands, inputs };
}

/**
 * APPROACH 3: Using CONTRACT_BALANCE for SETTLE/TAKE
 *
 * Uses the special CONTRACT_BALANCE constant to let the router automatically
 * settle and take the full amounts based on pool deltas.
 */
function encodeV4SwapWithContractBalance(params: SingleHopSwapParams): {
  commands: `0x${string}`;
  inputs: `0x${string}`[]
} {
  const { tokenIn, tokenOut, amountIn, minAmountOut } = params;

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

  console.log('=== V4 CONTRACT_BALANCE Encoding (Approach 3) ===');
  console.log('Using CONTRACT_BALANCE flag for SETTLE_ALL and TAKE_ALL');

  // Encode actions
  const actions = `0x${V4_SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')}${V4_SETTLE_ALL.toString(16).padStart(2, '0')}${V4_TAKE_ALL.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Encode parameters
  const actionParams: `0x${string}`[] = [];

  // Action 0: SWAP_EXACT_IN_SINGLE (same as before)
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

  // Action 1: SETTLE_ALL with CONTRACT_BALANCE
  // This tells the router to settle the full delta
  actionParams[1] = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyIn, CONTRACT_BALANCE]
  );

  // Action 2: TAKE_ALL with CONTRACT_BALANCE
  // This tells the router to take the full output delta
  actionParams[2] = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [currencyOut, CONTRACT_BALANCE]
  );

  // Combine into V4_SWAP input
  const v4Input = encodeAbiParameters(
    parseAbiParameters('bytes,bytes[]'),
    [actions, actionParams]
  );

  const commands = `0x${V4_SWAP.toString(16).padStart(2, '0')}` as `0x${string}`;
  const inputs = [v4Input];

  console.log('Commands:', commands);
  console.log('Using CONTRACT_BALANCE:', CONTRACT_BALANCE.toString(16));

  return { commands, inputs };
}

/**
 * Prepare transaction data for single-hop swap
 *
 * @param useContractBalance - If true, uses Approach 3 (CONTRACT_BALANCE), otherwise uses Approach 1
 */
export function prepareSingleHopSwap(
  params: SingleHopSwapParams,
  useContractBalance: boolean = false
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const { tokenIn, amountIn, deadline, chainId } = params;

  // Get Universal Router address
  const universalRouterAddress = getUniversalRouterAddress(chainId);

  // Choose encoding approach
  const { commands, inputs } = useContractBalance
    ? encodeV4SwapWithContractBalance(params)
    : encodeV4SwapDirect(params);

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
  console.log('Deadline:', deadline.toString());

  return {
    to: universalRouterAddress,
    data,
    value,
  };
}

/**
 * Execute a single-hop swap (V2 implementation)
 */
export async function executeSingleHopSwap(
  params: SingleHopSwapParams,
  useContractBalance: boolean = false
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
    const tx = prepareSingleHopSwap(params, useContractBalance);

    return tx;
  } catch (error) {
    console.error('Error executing single-hop swap (v2):', error);
    throw error;
  }
}

/**
 * Estimate gas for single-hop swap
 */
export async function estimateSingleHopSwapGas(_params: SingleHopSwapParams): Promise<bigint> {
  // V4 swaps typically use 150k-200k gas
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