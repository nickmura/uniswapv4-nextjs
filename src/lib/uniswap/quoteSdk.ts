import { Token as SDKToken } from '@uniswap/sdk-core';
import { QuoteParams, QuoteResult, Token } from '@/types/swap';
import { createPublicClient, http } from 'viem';
import { getQuoterAddress, QUOTER_ABI } from '../config/contracts';
import { createPoolKey } from './poolUtils';
import { calculateMinAmountOut } from '../utils/slippage';
import { formatTokenAmount, calculatePrice } from '../utils/formatting';
import { mainnet, sepolia, base, arbitrum, optimism } from 'viem/chains';

// Get chain object from chain ID
function getChainFromId(chainId: number) {
  switch (chainId) {
    case 1: return mainnet;
    case 11155111: return sepolia;
    case 8453: return base;
    case 42161: return arbitrum;
    case 10: return optimism;
    default: return mainnet;
  }
}

// Convert our Token type to SDK Token
function toSDKToken(token: Token): SDKToken {
  return new SDKToken(
    token.chainId,
    token.address,
    token.decimals,
    token.symbol,
    token.name
  );
}

/**
 * Get quote using SDK entities + viem for contract calls
 * This is a more SDK-native approach
 */
export async function getSingleHopQuoteWithSDK(params: QuoteParams): Promise<QuoteResult> {
  const { tokenIn, tokenOut, amountIn, slippage = 0.5, chainId } = params;

  try {
    // Validate tokens
    toSDKToken(tokenIn);
    // Create pool key for quoter call
    const poolKey = createPoolKey(tokenIn, tokenOut);

    // Create public client for contract call
    const chain = getChainFromId(chainId);
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get quoter address
    const quoterAddress = getQuoterAddress(chainId);

    // Call quoter contract
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
          zeroForOne: tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase(),
          exactAmount: amountIn,
          hookData: '0x' as `0x${string}`,
        },
      ],
    }) as readonly [bigint, bigint];

    const [amountOut, gasEstimate] = result;

    if (!amountOut || amountOut === 0n) {
      throw new Error('Invalid quote received');
    }

    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amountOut, slippage);

    // Calculate price impact (simplified)
    const priceImpact = 0.1;

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
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Quote error:', error);
    throw new Error(`Failed to get quote: ${err.message || 'Unknown error'}`);
  }
}
