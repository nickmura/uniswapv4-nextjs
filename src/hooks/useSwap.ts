'use client';

import { useState, useCallback } from 'react';
import { Token, SwapType } from '@/types/swap';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSendTransaction } from 'wagmi';
import { Address } from 'viem';
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';
import { executeMultiHopSwap } from '@/lib/uniswap/multiHopSwap';
import { calculateDeadline } from '@/lib/utils/slippage';
import { isNativeToken, getWETHAddress } from '@/lib/config/tokens';
import { getPermit2Address, getUniversalRouterAddress, ERC20_ABI, PERMIT2_ABI, UNIVERSAL_ROUTER_ABI } from '@/lib/config/contracts';

interface UseSwapParams {
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: bigint;
  minAmountOut: bigint;
  swapType: SwapType;
  route?: Token[]; // For multi-hop swaps
  chainId: number;
}

export function useSwap() {
  const { address: account, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Wait for transaction receipt
  const { isSuccess: isTxSuccess, isLoading: isTxLoading } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  /**
   * Check if token needs approval
   */
  const checkApproval = useCallback(
    async (token: Token, amount: bigint): Promise<boolean> => {
      if (!account) return false;

      // Native ETH doesn't need approval
      if (isNativeToken(token.address)) {
        return true;
      }

      try {
        // Check current allowance for Permit2
        const permit2Address = getPermit2Address(token.chainId);

        // Use a public client to read the allowance
        // Note: This is a simplified version. In production, you'd use useReadContract
        // For now, we'll assume approval is needed and handle it in the swap flow

        return false; // Always require approval check
      } catch (error) {
        console.error('Error checking approval:', error);
        return false;
      }
    },
    [account]
  );

  /**
   * Approve token spending for Permit2
   */
  const approveToken = useCallback(
    async (token: Token, amount: bigint, chainId: number) => {
      if (!account) {
        throw new Error('Wallet not connected');
      }

      if (isNativeToken(token.address)) {
        return; // No approval needed for native ETH
      }

      try {
        const permit2Address = getPermit2Address(token.chainId);
        const universalRouterAddress = getUniversalRouterAddress(chainId);
        const maxPermitAmount = (1n << 160n) - 1n;
        const expirationSeconds = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365); // ~1 year

        // Approve Permit2 to spend tokens
        const approveTx = await writeContractAsync({
          address: token.address as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [permit2Address, amount],
        });

        console.log('ERC20 approval transaction sent:', approveTx);

        // Approve Universal Router via Permit2
        const permitTx = await writeContractAsync({
          address: permit2Address,
          abi: PERMIT2_ABI,
          functionName: 'approve',
          args: [token.address, universalRouterAddress, maxPermitAmount, expirationSeconds],
        });

        console.log('Permit2 approval transaction sent:', permitTx);
      } catch (error) {
        console.error('Error approving token:', error);
        throw error;
      }
    },
    [account, writeContractAsync]
  );

  /**
   * Execute the swap
   */
  const swap = useCallback(
    async (params: UseSwapParams) => {
      const { tokenIn, tokenOut, amountIn, minAmountOut, swapType, route, chainId } = params;

      // Reset state
      setError(null);
      setTxHash(null);
      setIsLoading(true);

      try {
        // Validate inputs
        if (!account) {
          throw new Error('Please connect your wallet');
        }

        if (!tokenIn || !tokenOut) {
          throw new Error('Please select tokens');
        }

        if (amountIn <= 0n) {
          throw new Error('Please enter an amount');
        }

        if (chain?.id !== chainId) {
          throw new Error('Please switch to the correct network');
        }

        // Calculate deadline (20 minutes from now)
        const deadline = calculateDeadline(20);

        // Check and approve token if needed (skip for native ETH)
        if (!isNativeToken(tokenIn.address)) {
          const hasApproval = await checkApproval(tokenIn, amountIn);
          if (!hasApproval) {
            // Request approval
            await approveToken(tokenIn, amountIn, chainId);
            // Note: In production, you should wait for the approval transaction
            // to be confirmed before proceeding with the swap
          }
        }

        // Prepare transaction based on swap type
        let tx;
        if (swapType === SwapType.MULTI_HOP && route && route.length >= 3) {
          // Multi-hop swap
          console.log('executing multi-hop swap...')

          tx = await executeMultiHopSwap({
            route,
            amountIn,
            minAmountOut,
            recipient: account,
            deadline,
            chainId,
          });
        } else {
          // Single-hop swap
          console.log('executing single-hop swap...')
          tx = await executeSingleHopSwap({
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipient: account,
            deadline,
            chainId,
          });
        }

        // Execute the swap transaction using sendTransaction
        // The data is already encoded by executeSingleHopSwap/executeMultiHopSwap
        const hash = await sendTransactionAsync({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });

        setTxHash(hash);
        console.log('Swap transaction sent:', hash);
      } catch (err) {
        console.error('Error executing swap:', err);
        setError(err instanceof Error ? err : new Error('Failed to execute swap'));
      } finally {
        setIsLoading(false);
      }
    },
    [account, chain, checkApproval, approveToken, sendTransactionAsync]
  );

  return {
    swap,
    isLoading: isLoading || isTxLoading,
    isSuccess: isTxSuccess,
    error,
    txHash,
  };
}
