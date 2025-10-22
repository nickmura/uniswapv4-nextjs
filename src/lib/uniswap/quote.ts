import { QuoteParams, QuoteResult, PoolKey, PathKey } from '@/types/swap';
import { createPublicClient, http, Address, formatUnits } from 'viem';
import { getQuoterAddress, QUOTER_ABI } from '../config/contracts';
import { createPoolKey, getZeroForOne, encodeRoutePath, getPoolTokenAddress } from './poolUtils';
import { calculateMinAmountOut } from '../utils/slippage';
import { formatTokenAmount, calculatePrice } from '../utils/formatting';
import { getNetworkStatus } from '../config/networkStatus';
import { mainnet, sepolia, base, arbitrum } from 'viem/chains';

// Get chain object from chain ID
function getChainFromId(chainId: number) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    case 8453:
      return base;
    case 42161:
      return arbitrum;
    default:
      return mainnet;
  }
}

/**
 * Get quote for a single-hop swap
 */
export async function getSingleHopQuote(params: QuoteParams): Promise<QuoteResult> {
  const { tokenIn, tokenOut, amountIn, slippage = 0.5, chainId } = params;

  try {
    // Create pool key
    const poolKey = createPoolKey(tokenIn, tokenOut);

    // Determine swap direction
    const tokenInAddress = getPoolTokenAddress(tokenIn);
    const tokenOutAddress = getPoolTokenAddress(tokenOut);
    const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

    // Create public client
    const chain = getChainFromId(chainId);
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get quoter address
    const quoterAddress = getQuoterAddress(chainId);

    // Call quoter contract using readContract
    // V4 quoter functions can be called as view functions via eth_call
    try {
      // Use readContract for the quoter call
      const result = await client.readContract({
        address: quoterAddress,
        abi: QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            poolKey: {
              currency0: poolKey.currency0,
              currency1: poolKey.currency1,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks,
            },
            zeroForOne,
            exactAmount: amountIn,
            hookData: '0x' as `0x${string}`,
          },
        ],
      }) as readonly [bigint, bigint];

      // Extract amount out and gas estimate
      const [amountOut, gasEstimate] = result;

      // Validate we got a valid quote
      if (!amountOut || amountOut === 0n) {
        throw new Error('Invalid quote received from quoter');
      }

      // Calculate minimum amount out based on slippage
      const minAmountOut = calculateMinAmountOut(amountOut, slippage);

      // Calculate price impact (simplified - would need price oracle for accurate calculation)
      const priceImpact = 0.1; // Placeholder

      // Format amounts
      const amountOutFormatted = formatTokenAmount(amountOut, tokenOut.decimals);
      const minAmountOutFormatted = formatTokenAmount(minAmountOut, tokenOut.decimals);

      // Calculate execution price
      const executionPrice = calculatePrice(amountIn, amountOut, tokenIn, tokenOut);

      return {
        amountOut,
        amountOutFormatted,
        priceImpact,
        minAmountOut,
        minAmountOutFormatted,
        route: [tokenIn, tokenOut],
        executionPrice,
        gasEstimate,
      };
    } catch (error: any) {
      console.error('Quote error details:', error);

      // Provide more specific error messages
      if (error.message?.includes('returned no data') || error.message?.includes('"0x"')) {
        throw new Error(
          `Pool does not exist for ${tokenIn.symbol}/${tokenOut.symbol} with ${poolKey.fee / 10000}% fee. ` +
          `Uniswap V4 is newly deployed - pools may be limited. Try a different token pair or fee tier.`
        );
      }

      if (error.message?.includes('revert') || error.message?.includes('execution reverted')) {
        throw new Error('Pool does not exist for this token pair. Try a different fee tier or token pair.');
      }

      if (error.message?.includes('does not have the function')) {
        throw new Error('Contract error: Quoter contract may not be correctly deployed. Please verify contract addresses.');
      }

      throw new Error(`Failed to get quote: ${error.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error getting single-hop quote:', error);
    throw error;
  }
}

/**
 * Get quote for a multi-hop swap
 */
export async function getMultiHopQuote(params: QuoteParams & { route: typeof params.tokenIn[] }): Promise<QuoteResult> {
  const { route, amountIn, slippage = 0.5, chainId } = params;

  if (route.length < 3) {
    throw new Error('Multi-hop route must have at least 3 tokens');
  }

  try {
    const tokenIn = route[0];
    const tokenOut = route[route.length - 1];

    // Create path keys for the route
    const pathKeys = encodeRoutePath(route);

    // Get the first token address for exactCurrency
    const exactCurrency = getPoolTokenAddress(tokenIn);

    // Create public client
    const chain = getChainFromId(chainId);
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get quoter address
    const quoterAddress = getQuoterAddress(chainId);

    // Call quoter contract for multi-hop
    try {
      const result = await client.simulateContract({
        address: quoterAddress,
        abi: QUOTER_ABI,
        functionName: 'quoteExactInput',
        args: [
          {
            exactCurrency,
            path: pathKeys,
            exactAmount: amountIn,
          },
        ],
      });

      // Extract amount out from result
      const [amountOut, gasEstimate] = result.result as [bigint, bigint];

      // Calculate minimum amount out based on slippage
      const minAmountOut = calculateMinAmountOut(amountOut, slippage);

      // Calculate price impact (simplified)
      const priceImpact = 0.2; // Placeholder - multi-hop usually has higher impact

      // Format amounts
      const amountOutFormatted = formatTokenAmount(amountOut, tokenOut.decimals);
      const minAmountOutFormatted = formatTokenAmount(minAmountOut, tokenOut.decimals);

      // Calculate execution price
      const executionPrice = calculatePrice(amountIn, amountOut, tokenIn, tokenOut);

      return {
        amountOut,
        amountOutFormatted,
        priceImpact,
        minAmountOut,
        minAmountOutFormatted,
        route,
        executionPrice,
        gasEstimate,
      };
    } catch (error: any) {
      console.error('Multi-hop quote error:', error);
      throw new Error('Failed to get multi-hop quote. Route may not exist or have insufficient liquidity.');
    }
  } catch (error) {
    console.error('Error getting multi-hop quote:', error);
    throw error;
  }
}

/**
 * Try to get the best quote by trying different fee tiers
 * Since V4 is newly deployed, not all fee tiers may have pools
 */
export async function getBestQuote(params: QuoteParams): Promise<QuoteResult> {
  const { tokenIn, tokenOut, amountIn, slippage = 0.5, chainId } = params;

  // Try different fee tiers to find the best quote
  // Order by most common to least common
  const feeTiers = [
    { fee: 3000, tickSpacing: 60 },   // 0.3% - most common
    { fee: 500, tickSpacing: 10 },    // 0.05% - stable pairs
    { fee: 10000, tickSpacing: 200 }, // 1% - exotic pairs
    { fee: 100, tickSpacing: 1 },     // 0.01% - very stable
  ];

  const errors: string[] = [];

  for (const { fee, tickSpacing } of feeTiers) {
    try {
      // Create pool key with this fee tier
      const poolKey = createPoolKey(tokenIn, tokenOut, fee);

      // Try to get quote for this pool
      const tokenInAddress = getPoolTokenAddress(tokenIn);
      const tokenOutAddress = getPoolTokenAddress(tokenOut);
      const zeroForOne = getZeroForOne(tokenInAddress, tokenOutAddress);

      const chain = getChainFromId(chainId);
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      const quoterAddress = getQuoterAddress(chainId);

      const result = await client.readContract({
        address: quoterAddress,
        abi: QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            poolKey: {
              currency0: poolKey.currency0,
              currency1: poolKey.currency1,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks,
            },
            zeroForOne,
            exactAmount: amountIn,
            hookData: '0x' as `0x${string}`,
          },
        ],
      }) as readonly [bigint, bigint];

      const [amountOut, gasEstimate] = result;

      if (amountOut && amountOut > 0n) {
        // Found a valid quote!
        const minAmountOut = calculateMinAmountOut(amountOut, slippage);
        const priceImpact = 0.1;
        const amountOutFormatted = formatTokenAmount(amountOut, tokenOut.decimals);
        const minAmountOutFormatted = formatTokenAmount(minAmountOut, tokenOut.decimals);
        const executionPrice = calculatePrice(amountIn, amountOut, tokenIn, tokenOut);

        return {
          amountOut,
          amountOutFormatted,
          priceImpact,
          minAmountOut,
          minAmountOutFormatted,
          route: [tokenIn, tokenOut],
          executionPrice,
          gasEstimate,
        };
      }
    } catch (error: any) {
      errors.push(`${fee / 10000}%: ${error.message}`);
      // Continue to next fee tier
      continue;
    }
  }

  // No pools found for any fee tier
  const networkStatus = getNetworkStatus(chainId);
  let errorMessage = `No pools found for ${tokenIn.symbol}/${tokenOut.symbol}.`;

  if (networkStatus?.poolsAvailable === 'none') {
    errorMessage += ` ${networkStatus.name} has NO V4 pools initialized. Switch to Ethereum Mainnet for swaps.`;
  } else if (networkStatus?.poolsAvailable === 'limited') {
    errorMessage += ` ${networkStatus.name} has limited V4 pools. Try ETH/USDC or switch to Mainnet.`;
  } else {
    errorMessage += ` Uniswap V4 launched recently - liquidity may be limited. Try a different token pair.`;
  }

  throw new Error(errorMessage);
}

/**
 * Check if a direct pool exists for a token pair
 */
export async function hasDirectPool(
  tokenIn: typeof import('@/types/swap').Token,
  tokenOut: typeof import('@/types/swap').Token,
  chainId: number
): Promise<boolean> {
  try {
    const testAmount = BigInt(10 ** tokenIn.decimals); // 1 token
    await getSingleHopQuote({
      tokenIn,
      tokenOut,
      amountIn: testAmount,
      chainId,
    });
    return true;
  } catch {
    return false;
  }
}
