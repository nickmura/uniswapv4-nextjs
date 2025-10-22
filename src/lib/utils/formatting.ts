import { Token } from '@/types/swap';
import { formatUnits, parseUnits } from 'viem';

/**
 * Format a token amount from wei to human-readable string
 */
export function formatTokenAmount(amount: bigint, decimals: number, maxDecimals: number = 6): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  // Handle very small numbers
  if (num < 0.000001 && num > 0) {
    return '< 0.000001';
  }

  // Handle large numbers with comma separators
  if (num >= 1000) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Handle normal numbers
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Parse a human-readable token amount to wei
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    // Remove any commas and spaces
    const cleanAmount = amount.replace(/,/g, '').trim();

    if (!cleanAmount || cleanAmount === '.') {
      return 0n;
    }

    return parseUnits(cleanAmount, decimals);
  } catch (error) {
    return 0n;
  }
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format token amount with symbol
 */
export function formatTokenWithSymbol(amount: bigint, token: Token, maxDecimals?: number): string {
  return `${formatTokenAmount(amount, token.decimals, maxDecimals)} ${token.symbol}`;
}

/**
 * Shorten an Ethereum address
 */
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a transaction hash for display
 */
export function shortenTxHash(hash: string): string {
  return shortenAddress(hash, 6);
}

/**
 * Format time duration (in seconds) to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    return `${Math.floor(seconds / 3600)}h`;
  }
}

/**
 * Format gas amount in gwei
 */
export function formatGas(gas: bigint): string {
  const gwei = Number(gas) / 1e9;
  return `${gwei.toFixed(2)} Gwei`;
}

/**
 * Validate if a string is a valid number input
 */
export function isValidNumberInput(input: string): boolean {
  // Allow digits, one decimal point, and empty string
  return /^\d*\.?\d*$/.test(input);
}

/**
 * Clean number input (remove invalid characters)
 */
export function cleanNumberInput(input: string): string {
  // Remove everything except digits and decimal point
  let cleaned = input.replace(/[^\d.]/g, '');

  // Keep only the first decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  return cleaned;
}

/**
 * Calculate price from amounts
 */
export function calculatePrice(
  amountIn: bigint,
  amountOut: bigint,
  tokenIn: Token,
  tokenOut: Token
): string {
  if (amountIn === 0n || amountOut === 0n) {
    return '0';
  }

  const amountInFormatted = parseFloat(formatUnits(amountIn, tokenIn.decimals));
  const amountOutFormatted = parseFloat(formatUnits(amountOut, tokenOut.decimals));

  const price = amountOutFormatted / amountInFormatted;

  return price.toFixed(6);
}

/**
 * Format exchange rate
 */
export function formatExchangeRate(
  amountIn: bigint,
  amountOut: bigint,
  tokenIn: Token,
  tokenOut: Token
): string {
  const price = calculatePrice(amountIn, amountOut, tokenIn, tokenOut);
  return `1 ${tokenIn.symbol} = ${price} ${tokenOut.symbol}`;
}
