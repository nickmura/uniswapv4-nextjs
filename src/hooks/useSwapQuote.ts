'use client';

import { useState, useEffect, useCallback } from 'react';
import { Token, QuoteResult, SwapType } from '@/types/swap';
import { getBestQuote, getMultiHopQuote } from '@/lib/uniswap/quote';
import { useDebounce } from './useDebounce';

interface UseSwapQuoteParams {
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  slippage: number;
  chainId: number;
  swapType: SwapType;
  route?: Token[]; // For multi-hop swaps
}

export function useSwapQuote(params: UseSwapQuoteParams) {
  const { tokenIn, tokenOut, amountIn, slippage, chainId, swapType, route } = params;

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce amount input to avoid too many requests
  const debouncedAmountIn = useDebounce(amountIn, 500);

  const fetchQuote = useCallback(async () => {
    // Reset previous quote and error
    setQuote(null);
    setError(null);

    // Validate inputs
    if (!tokenIn || !tokenOut) {
      return;
    }

    if (!debouncedAmountIn || debouncedAmountIn === '' || debouncedAmountIn === '0') {
      return;
    }

    // Parse amount
    let amountInBigInt: bigint;
    try {
      const amountNum = parseFloat(debouncedAmountIn);
      if (isNaN(amountNum) || amountNum <= 0) {
        return;
      }
      amountInBigInt = BigInt(Math.floor(amountNum * 10 ** tokenIn.decimals));
    } catch {
      return;
    }

    setIsLoading(true);

    try {
      let quoteResult: QuoteResult;

      if (swapType === SwapType.MULTI_HOP && route && route.length >= 3) {
        // Multi-hop quote
        console.log('[useSwapQuote] Fetching multi-hop quote:', {
          route: route.map(t => t.symbol).join(' → '),
          amountIn: debouncedAmountIn,
          chainId,
        });
        quoteResult = await getMultiHopQuote({
          route,
          tokenIn,
          tokenOut,
          amountIn: amountInBigInt,
          slippage,
          chainId,
        });
      } else {
        // Single-hop quote - uses getBestQuote to try multiple fee tiers
        console.log('[useSwapQuote] Fetching single-hop quote:', {
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          amountIn: debouncedAmountIn,
          chainId,
        });
        quoteResult = await getBestQuote({
          tokenIn,
          tokenOut,
          amountIn: amountInBigInt,
          slippage,
          chainId,
        });
      }

      setQuote(quoteResult);
      console.log('[useSwapQuote] Quote fetched successfully');
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch quote'));
    } finally {
      setIsLoading(false);
    }
  }, [tokenIn, tokenOut, debouncedAmountIn, slippage, chainId, swapType, route]);

  // Fetch quote when dependencies change
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuote,
  };
}
