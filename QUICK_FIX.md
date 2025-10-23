# Quick Fix: 2-Minute Solution

## TL;DR - Fastest Way to Test

**Option 1: Use the Selector (Easiest)**

1. Edit `src/hooks/useSwap.ts` line 7:
   ```typescript
   // Change from:
   import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

   // To:
   import { executeSingleHopSwap } from '@/lib/uniswap/swapSelector';
   ```

2. Edit `src/lib/uniswap/swapSelector.ts` line 29:
   ```typescript
   export const CURRENT_APPROACH: SwapApproach = 'approach-1'; // ⭐ START HERE
   ```

3. Save and test! Try your swap.

4. If it doesn't work, change line 29 to:
   ```typescript
   export const CURRENT_APPROACH: SwapApproach = 'approach-3'; // Try next
   ```

**Option 2: Direct Implementation (Manual)**

1. Edit `src/hooks/useSwap.ts` line 7:
   ```typescript
   import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap_v2';
   ```

2. Edit `src/hooks/useSwap.ts` line 162, add `false` parameter:
   ```typescript
   tx = await executeSingleHopSwap({
     tokenIn,
     tokenOut,
     amountIn,
     minAmountOut,
     recipient: account,
     deadline,
     chainId,
   }, false); // <-- Add this
   ```

3. Save and test!

---

## What to Check

✅ **Success signs:**
- Gas estimate: 150k-200k
- No MetaMask warnings
- Transaction succeeds

❌ **Failure signs:**
- Gas estimate: >500k
- "This transaction is likely to fail"
- Transaction reverts

---

## If It Still Fails

Try these in order:

1. **Change to Approach 3:**
   - In `swapSelector.ts`: `CURRENT_APPROACH = 'approach-3'`
   - Or in `useSwap.ts`: Change `false` to `true`

2. **Try different fee tier:**
   - Edit token pool to use 0.3% fee (most common)

3. **Try different network:**
   - Switch to Ethereum Mainnet
   - V4 might not be fully live on all networks

4. **Check console logs:**
   - Look for error messages
   - Verify encoded data

---

## Need More Details?

Read these files in order:
1. `COMPREHENSIVE_SOLUTION.md` - Full explanation
2. `TESTING_GUIDE.md` - Step-by-step testing
3. `SOLUTION_APPROACHES.md` - Technical details

---

## Files You Got

### Documentation
- `COMPREHENSIVE_SOLUTION.md` - Complete guide (read this first!)
- `TESTING_GUIDE.md` - Testing instructions
- `SOLUTION_APPROACHES.md` - Technical explanations
- `QUICK_FIX.md` - This file (2-min fix)

### Implementation
- `singleHopSwap_v2.ts` - Approaches 1 & 3 ⭐
- `singleHopSwap_v3.ts` - Approaches 4 & 5
- `swapSelector.ts` - Easy switcher

### Reference
- `SWAP_ENCODING_FIX.md` - Your original notes (updated)

---

## One-Liner Summary

**The problem:** Wrong parameter encoding for SETTLE_ALL and TAKE_ALL
**The fix:** Use direct ABI encoding instead of RoutePlanner SDK
**Test it:** Change import to `swapSelector` and set `CURRENT_APPROACH = 'approach-1'`
