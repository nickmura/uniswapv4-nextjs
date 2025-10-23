# Quick Fix: Working Single-Hop Swaps

## TL;DR - What Changed
- The app now uses the **direct ABI encoder** baked into `singleHopSwap.ts`.
- Legacy selector files (`swapSelector.ts`, `singleHopSwap_v2.ts`, `singleHopSwap_v3.ts`) were removed.
- Swap data is encoded once and sent straight to the Universal Router.

## 2-Step Smoke Test
1. Verify `useSwap.ts` imports the helper directly:
   ```typescript
   import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';
   ```
2. Run a tiny swap (e.g. 0.001 ETH → USDC) on your target network.

You should see:
- Gas around 150k–200k
- No MetaMask “likely to fail” banner
- Successful transaction hash

If it reverts:
- Double-check token addresses and fee tier
- Confirm the network has liquidity for that pair

## Network Setup Notes
- **Optimism** is fully configured with the official January 2025 deployments.
- Base, Mainnet, Arbitrum, and Sepolia also ship with baked-in addresses.

## Files that Matter
- `src/lib/uniswap/singleHopSwap.ts` – direct encoding implementation
- `src/hooks/useSwap.ts` – orchestrates approvals + sends the prepared transaction
- `src/components/SwapForm.tsx` – UI + explorer links

## One-Liner Summary
Swaps succeed because we manually encode `SWAP_EXACT_IN_SINGLE → SETTLE_ALL → TAKE_ALL` and call the Universal Router with the right commands for every network.
