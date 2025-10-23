'use client';

import { useState, useEffect } from 'react';
import { Token, SwapType, SlippageSettings } from '@/types/swap';
import { TokenSelector } from './TokenSelector';
import { QuoteDisplay } from './QuoteDisplay';
import { useAccount, useChainId } from 'wagmi';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useSwap } from '@/hooks/useSwap';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { getTokensByChainId } from '@/lib/config/tokens';
import { cleanNumberInput, parseTokenAmount } from '@/lib/utils/formatting';
import { DEFAULT_SLIPPAGE, SLIPPAGE_PRESETS, getSlippageWarning } from '@/lib/utils/slippage';
import { getNetworkWarning, getNetworkStatus } from '@/lib/config/networkStatus';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function SwapForm() {
  const { address: account } = useAccount();
  const chainId = useChainId();

  // Token selection
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);

  // Input amounts
  const [amountIn, setAmountIn] = useState('');

  // Slippage settings
  const [slippage, setSlippage] = useState<SlippageSettings>({
    percentage: DEFAULT_SLIPPAGE,
    auto: false,
  });
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);

  // Swap type
  const [swapType, setSwapType] = useState<SwapType>(SwapType.SINGLE_HOP);

  // Multi-hop route (if applicable)
  const [route, setRoute] = useState<Token[]>([]);

  // Get token balances
  const { balance: balanceIn, formatted: formattedBalanceIn } = useTokenBalance(tokenIn);

  // Get quote
  const { quote, isLoading: isQuoteLoading, error: quoteError } = useSwapQuote({
    tokenIn,
    tokenOut,
    amountIn,
    slippage: slippage.percentage,
    chainId: chainId || 1,
    swapType,
    route: swapType === SwapType.MULTI_HOP ? route : undefined,
  });

  // Swap hook
  const { swap, isLoading: isSwapLoading, isSuccess, error: swapError, txHash } = useSwap();

  // Initialize default tokens and reset when chain changes
  useEffect(() => {
    if (chainId) {
      const tokens = getTokensByChainId(chainId);

      // Reset tokens when chain changes to ensure they're from the same chain
      setTokenIn(tokens.ETH);
      setTokenOut(tokens.USDC);
    }
  }, [chainId]); // Only depend on chainId to trigger reset on network change

  // Update route when tokens change
  useEffect(() => {
    if (tokenIn && tokenOut) {
      setRoute([tokenIn, tokenOut]);
    }
  }, [tokenIn, tokenOut]);

  // Handle amount input
  const handleAmountChange = (value: string) => {
    const cleaned = cleanNumberInput(value);
    setAmountIn(cleaned);
  };

  // Handle swap button click
  const handleSwap = async () => {
    if (!quote || !tokenIn || !tokenOut) return;

    const amountInBigInt = parseTokenAmount(amountIn, tokenIn.decimals);

    await swap({
      tokenIn,
      tokenOut,
      amountIn: amountInBigInt,
      minAmountOut: quote.minAmountOut,
      swapType,
      route: swapType === SwapType.MULTI_HOP ? route : undefined,
      chainId: chainId || 1,
    });
  };

  // Handle token swap (flip tokens)
  const handleFlipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
  };

  // Handle max button
  const handleMax = () => {
    if (balanceIn && tokenIn) {
      // Leave a bit for gas if ETH
      const maxAmount = tokenIn.symbol === 'ETH' ? balanceIn - BigInt(0.001 * 10 ** 18) : balanceIn;
      setAmountIn((Number(maxAmount) / 10 ** tokenIn.decimals).toString());
    }
  };

  // Get network warning
  const networkWarning = chainId ? getNetworkWarning(chainId) : null;
  const networkStatus = chainId ? getNetworkStatus(chainId) : null;

  const explorerBaseUrls: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    11155111: 'https://sepolia.etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    42161: 'https://arbiscan.io/tx/',
  };

  const explorerBaseUrl = explorerBaseUrls[chainId || 1] || explorerBaseUrls[1];

  // Check if swap is disabled
  const isSwapDisabled =
    !account ||
    !tokenIn ||
    !tokenOut ||
    !amountIn ||
    amountIn === '0' ||
    isQuoteLoading ||
    isSwapLoading ||
    !!quoteError ||
    !quote;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
      {/* Network Warning Banner */}
      {networkWarning && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          networkStatus?.poolsAvailable === 'none'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
        }`}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-medium mb-1">{networkStatus?.name} Network</div>
              <div>{networkWarning}</div>
              {networkStatus?.poolsAvailable === 'none' && (
                <div className="mt-2 font-medium">
                  💡 Pools may be unavailable on this network. Double-check quotes before confirming.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Swap</h2>
        <button
          onClick={() => setShowSlippageSettings(!showSlippageSettings)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Slippage settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Slippage Settings */}
      {showSlippageSettings && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-sm font-medium mb-2">Slippage Tolerance</div>
          <div className="flex gap-2 mb-3">
            {SLIPPAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setSlippage({ percentage: preset, auto: false })}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  slippage.percentage === preset && !slippage.auto
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {preset}%
              </button>
            ))}
            <input
              type="number"
              value={slippage.auto ? '' : slippage.percentage}
              onChange={(e) => setSlippage({ percentage: parseFloat(e.target.value) || 0.5, auto: false })}
              placeholder="Custom"
              className="flex-1 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-center"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
          {getSlippageWarning(slippage.percentage) !== 'none' && (
            <div className={`text-xs ${getSlippageWarning(slippage.percentage) === 'danger' ? 'text-red-500' : 'text-yellow-500'}`}>
              {getSlippageWarning(slippage.percentage) === 'danger'
                ? 'High slippage tolerance. Your transaction may be frontrun.'
                : 'Your transaction may fail with low slippage tolerance.'}
            </div>
          )}
        </div>
      )}

      {/* Token In */}
      <div className="mb-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Balance: {formattedBalanceIn}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={amountIn}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-medium outline-none"
          />
          <button
            onClick={handleMax}
            className="px-2 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
          >
            MAX
          </button>
          <TokenSelector
            selectedToken={tokenIn}
            onSelectToken={setTokenIn}
            chainId={chainId || 1}
            excludeToken={tokenOut}
          />
        </div>
      </div>

      {/* Flip Button */}
      <div className="flex justify-center -my-3 relative z-10">
        <button
          onClick={handleFlipTokens}
          className="p-2 bg-white dark:bg-gray-900 border-4 border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Token Out */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">To</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={quote?.amountOutFormatted || '0.0'}
            readOnly
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-medium outline-none"
          />
          <TokenSelector
            selectedToken={tokenOut}
            onSelectToken={setTokenOut}
            chainId={chainId || 1}
            excludeToken={tokenIn}
          />
        </div>
      </div>

      {/* Quote Display */}
      <QuoteDisplay quote={quote} isLoading={isQuoteLoading} error={quoteError} />

      {/* Swap Button */}
      <div className="mt-4">
        {!account ? (
          <ConnectButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button
            onClick={handleSwap}
            disabled={isSwapDisabled}
            className={`w-full py-4 font-medium rounded-xl transition-colors ${
              isSwapDisabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isSwapLoading
              ? 'Swapping...'
              : isQuoteLoading
              ? 'Loading...'
              : 'Swap'}
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {isSuccess && txHash && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-green-800 dark:text-green-200 text-sm">
            Transaction successful!{' '}
            <a
              href={`${explorerBaseUrl}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on explorer
            </a>
          </div>
        </div>
      )}

      {swapError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-red-800 dark:text-red-200 text-sm">{swapError.message}</div>
        </div>
      )}
    </div>
  );
}
