'use client';

import { Token } from '@/types/swap';
import { useBalance, useReadContract, useAccount } from 'wagmi';
import { Address } from 'viem';
import { ERC20_ABI } from '@/lib/config/contracts';
import { isNativeToken } from '@/lib/config/tokens';
import { formatTokenAmount } from '@/lib/utils/formatting';

export function useTokenBalance(token: Token | null) {
  const { address: account } = useAccount();

  // For native ETH, use useBalance
  const {
    data: ethBalance,
    isLoading: isLoadingEth,
    refetch: refetchEth,
  } = useBalance({
    address: account,
    query: {
      enabled: !!account && !!token && isNativeToken(token.address),
    },
  });

  // For ERC20 tokens, use useReadContract
  const {
    data: erc20Balance,
    isLoading: isLoadingErc20,
    refetch: refetchErc20,
  } = useReadContract({
    address: token?.address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: {
      enabled: !!account && !!token && !isNativeToken(token.address),
    },
  });

  // Determine which balance to use
  const isNative = token ? isNativeToken(token.address) : false;
  const balance = isNative ? ethBalance?.value : erc20Balance;
  const isLoading = isNative ? isLoadingEth : isLoadingErc20;

  // Format balance
  const formatted = balance && token ? formatTokenAmount(balance, token.decimals) : '0';

  return {
    balance: balance ?? 0n,
    formatted,
    isLoading,
    refetch: isNative ? refetchEth : refetchErc20,
  };
}
