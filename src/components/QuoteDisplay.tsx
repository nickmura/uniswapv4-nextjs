'use client';

import { QuoteResult } from '@/types/swap';
import { formatPercentage } from '@/lib/utils/formatting';
import { formatRoute } from '@/lib/uniswap/poolUtils';

interface QuoteDisplayProps {
  quote: QuoteResult | null;
  isLoading: boolean;
  error: Error | null;
}

export function QuoteDisplay({ quote, isLoading, error }: QuoteDisplayProps) {
  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Error fetching quote</span>
        </div>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">Fetching quote...</span>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const isMultiHop = quote.route.length > 2;
  const priceImpactColor = getPriceImpactColor(quote.priceImpact);

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
      {/* Route Display (for multi-hop) */}
      {isMultiHop && (
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Route</div>
          <div className="font-mono text-sm">{formatRoute(quote.route)}</div>
        </div>
      )}

      {/* Expected Output */}
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Expected output</span>
        <span className="font-medium">{quote.amountOutFormatted} {quote.route[quote.route.length - 1].symbol}</span>
      </div>

      {/* Minimum Received */}
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Minimum received</span>
        <span className="font-medium">{quote.minAmountOutFormatted} {quote.route[quote.route.length - 1].symbol}</span>
      </div>

      {/* Price Impact */}
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Price impact</span>
        <span className={`font-medium ${priceImpactColor}`}>
          {formatPercentage(quote.priceImpact)}
        </span>
      </div>

      {/* Exchange Rate */}
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Rate</span>
        <span className="font-medium text-sm">
          1 {quote.route[0].symbol} = {quote.executionPrice} {quote.route[quote.route.length - 1].symbol}
        </span>
      </div>

      {/* Gas Estimate */}
      {quote.gasEstimate && (
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Est. gas</span>
          <span className="font-medium text-sm">{quote.gasEstimate.toString()}</span>
        </div>
      )}

      {/* Warning for high price impact */}
      {quote.priceImpact > 5 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-sm">
              <div className="font-medium">High price impact</div>
              <div className="mt-1">This trade will significantly move the market price.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getPriceImpactColor(priceImpact: number): string {
  if (priceImpact < 1) {
    return 'text-green-600 dark:text-green-400';
  } else if (priceImpact < 3) {
    return 'text-yellow-600 dark:text-yellow-400';
  } else if (priceImpact < 5) {
    return 'text-orange-600 dark:text-orange-400';
  } else {
    return 'text-red-600 dark:text-red-400';
  }
}
