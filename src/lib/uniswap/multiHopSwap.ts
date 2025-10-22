import { MultiHopSwapParams } from '@/types/swap';
import { Address, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { encodeRoutePath, getPoolTokenAddress, isValidRoute } from './poolUtils';
import { getUniversalRouterAddress, UNIVERSAL_ROUTER_ABI } from '../config/contracts';
import { isNativeToken } from '../config/tokens';

import { RoutePlanner, CommandType } from '@uniswap/universal-router-sdk';

// V4 Periphery Action Constants (from v4-periphery/src/libraries/Actions.sol)
const V4_SWAP_EXACT_IN = 0x07;
const V4_SETTLE_ALL = 0x0c;
const V4_TAKE_ALL = 0x0f;

/**
 * Encode V4 Planner actions for multi-hop swap
 */
function encodeV4MultiHopActions(params: MultiHopSwapParams): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const { route, amountIn, minAmountOut } = params;

  if (!isValidRoute(route)) {
    throw new Error('Invalid route');
  }

  const tokenIn = route[0];
  const tokenOut = route[route.length - 1];

  // Get exact currency (first token in route)
  const exactCurrency = getPoolTokenAddress(tokenIn);

  // Encode the path
  const pathKeys = encodeRoutePath(route);

  // Build V4 actions bytes - concatenate action IDs
  const actionsBytes = `0x${V4_SWAP_EXACT_IN.toString(16).padStart(2, '0')}${V4_SETTLE_ALL.toString(16).padStart(2, '0')}${V4_TAKE_ALL.toString(16).padStart(2, '0')}` as `0x${string}`;

  // Build parameters array for each action
  const params_array: `0x${string}`[] = [];

  // Action 1: SWAP_EXACT_IN (multi-hop) - ExactInputParams struct
  const swapParams = encodeAbiParameters(
    parseAbiParameters('address,(address,uint24,int24,address,bytes)[],uint128,uint128'),
    [
      exactCurrency,
      pathKeys.map(pk => [
        pk.intermediateCurrency,
        pk.fee,
        pk.tickSpacing,
        pk.hooks,
        pk.hookData,
      ] as const),
      amountIn,
      minAmountOut,
    ]
  );
  params_array.push(swapParams);

  // Action 2: SETTLE_ALL - settle input currency
  const tokenInAddress = getPoolTokenAddress(tokenIn);
  const settleParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [tokenInAddress, amountIn]
  );
  params_array.push(settleParams);

  // Action 3: TAKE_ALL - collect output currency
  const tokenOutAddress = getPoolTokenAddress(tokenOut);
  const takeParams = encodeAbiParameters(
    parseAbiParameters('address,uint256'),
    [tokenOutAddress, minAmountOut]
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
 * Prepare transaction data for multi-hop swap
 */
export function prepareMultiHopSwap(params: MultiHopSwapParams): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const { route, amountIn, deadline, chainId } = params;

  if (!isValidRoute(route)) {
    throw new Error('Invalid route');
  }

  // Get Universal Router address
  const universalRouterAddress = getUniversalRouterAddress(chainId);

  // Encode V4 planner actions
  const { commands, inputs } = encodeV4MultiHopActions(params);

  // Encode the execute function call
  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [commands, inputs, deadline],
  });

  // Calculate value (only if swapping native ETH)
  const tokenIn = route[0];
  const value = isNativeToken(tokenIn.address) ? amountIn : 0n;

  return {
    to: universalRouterAddress,
    data,
    value,
  };
}

/**
 * Execute a multi-hop swap
 * Note: This function prepares the transaction data.
 * Actual execution should be done via wagmi's useWriteContract hook
 */
export async function executeMultiHopSwap(params: MultiHopSwapParams): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  try {
    // Validate parameters
    const validation = validateMultiHopSwapParams(params);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Prepare transaction
    const tx = prepareMultiHopSwap(params);

    return tx;
  } catch (error) {
    console.error('Error executing multi-hop swap:', error);
    throw error;
  }
}

/**
 * Estimate gas for multi-hop swap
 */
export async function estimateMultiHopSwapGas(params: MultiHopSwapParams): Promise<bigint> {
  // Multi-hop swaps use more gas
  // Estimate: 150k base + 80k per additional hop
  const hops = params.route.length - 1;
  const estimatedGas = 150000n + BigInt(hops * 80000);
  return estimatedGas;
}

/**
 * Validate multi-hop swap parameters
 */
export function validateMultiHopSwapParams(params: MultiHopSwapParams): {
  valid: boolean;
  error?: string;
} {
  if (params.amountIn <= 0n) {
    return { valid: false, error: 'Amount in must be greater than 0' };
  }

  if (params.minAmountOut < 0n) {
    return { valid: false, error: 'Minimum amount out cannot be negative' };
  }

  if (params.route.length < 3) {
    return { valid: false, error: 'Multi-hop route must have at least 3 tokens' };
  }

  if (!isValidRoute(params.route)) {
    return { valid: false, error: 'Invalid route: tokens must be on same chain and adjacent tokens must be different' };
  }

  if (params.deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    return { valid: false, error: 'Deadline has already passed' };
  }

  return { valid: true };
}

/**
 * Find common intermediate tokens for routing
 * (e.g., WETH, USDC, USDT are common intermediate tokens)
 */
export function getCommonIntermediateTokens(chainId: number): string[] {
  // These are common tokens used as intermediates for routing
  switch (chainId) {
    case 1: // Mainnet
      return [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      ];
    case 11155111: // Sepolia
      return [
        '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC
      ];
    case 8453: // Base
      return [
        '0x4200000000000000000000000000000000000006', // WETH
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      ];
    case 42161: // Arbitrum
      return [
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
      ];
    default:
      return [];
  }
}

/**
 * Suggest a multi-hop route between two tokens
 */
export async function suggestRoute(
  tokenInAddress: Address,
  tokenOutAddress: Address,
  chainId: number
): Promise<Address[]> {
  // If tokens are directly connected, return direct route
  // For now, try common intermediate tokens

  const intermediates = getCommonIntermediateTokens(chainId);

  // Try each intermediate token
  for (const intermediate of intermediates) {
    if (
      intermediate.toLowerCase() !== tokenInAddress.toLowerCase() &&
      intermediate.toLowerCase() !== tokenOutAddress.toLowerCase()
    ) {
      // Return route through this intermediate
      return [tokenInAddress, intermediate as Address, tokenOutAddress];
    }
  }

  // Default: return direct route
  return [tokenInAddress, tokenOutAddress];
}
