# Uniswap V4 Swap Testing Guide

## Overview

I've created **5 different implementation approaches** to solve your swap encoding issues. This guide will help you test each one systematically.

## Implementation Files Created

1. **`singleHopSwap.ts`** (Original) - Using RoutePlanner SDK
2. **`singleHopSwap.ts`** - Direct ABI encoding implementation (legacy v2/v3 files removed)

## Quick Reference Table

| Approach | File | Function | Key Difference |
|----------|------|----------|----------------|
| Original | `singleHopSwap.ts` | `executeSingleHopSwap()` | RoutePlanner SDK |
| Approach 1 | `singleHopSwap.ts` | `executeSingleHopSwap(params, false)` | Direct encoding with explicit amounts |
| Approach 3 | `singleHopSwap.ts` | `executeSingleHopSwap(params, true)` | CONTRACT_BALANCE flag |
| Approach 4 | `singleHopSwap.ts (legacy variants removed)` | `executeSingleHopSwap(params, 'settle-take')` | SETTLE + TAKE instead of *_ALL |
| Approach 5 | `singleHopSwap.ts (legacy variants removed)` | `executeSingleHopSwap(params, 'simplified')` | Simplified params |

## Recommended Testing Order

### Phase 1: Test Approach 1 (Most Likely to Work)

**File:** `singleHopSwap.ts`
**Function:** `executeSingleHopSwap(params, false)`

**Why test first:** This exactly matches the official Solidity examples from Uniswap docs.

**How to test:**
```typescript
// In useSwap.ts, change the import
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

// Call with useContractBalance = false
tx = await executeSingleHopSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  recipient: account,
  deadline,
  chainId,
}, false); // <-- Approach 1
```

**Expected result:**
- ✅ Gas estimate: ~150-200k gas
- ✅ MetaMask should NOT show "likely to fail"
- ✅ Transaction should succeed

**If it fails, check:**
- Console logs for encoded data
- MetaMask error message
- Try a different pool (different fee tier)

### Phase 2: Test Approach 3 (If Approach 1 Fails)

**File:** `singleHopSwap.ts`
**Function:** `executeSingleHopSwap(params, true)`

**Why test:** Uses CONTRACT_BALANCE constant which is common in V4 contracts.

**How to test:**
```typescript
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

tx = await executeSingleHopSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  recipient: account,
  deadline,
  chainId,
}, true); // <-- Approach 3 (CONTRACT_BALANCE)
```

### Phase 3: Test Approach 4 (If Previous Failed)

**File:** `singleHopSwap.ts (legacy variants removed)`
**Function:** `executeSingleHopSwap(params, 'settle-take')`

**Why test:** Some contracts prefer SETTLE/TAKE over SETTLE_ALL/TAKE_ALL.

**How to test:**
```typescript
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

tx = await executeSingleHopSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  recipient: account,
  deadline,
  chainId,
}, 'settle-take'); // <-- Approach 4
```

### Phase 4: Test Approach 5 (Last Resort)

**File:** `singleHopSwap.ts (legacy variants removed)`
**Function:** `executeSingleHopSwap(params, 'simplified')`

**Why test:** Tries minimal parameters for SETTLE_ALL/TAKE_ALL.

**How to test:**
```typescript
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

tx = await executeSingleHopSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  recipient: account,
  deadline,
  chainId,
}, 'simplified'); // <-- Approach 5
```

## How to Switch Between Approaches

### Option A: Quick Testing (Manual Switch)

Edit `src/hooks/useSwap.ts` directly:

```typescript
// At the top, change the import
import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';
// OR
// import { executeSingleHopSwap } from '@/lib/uniswap/singleHopSwap';

// In the swap function, around line 162
tx = await executeSingleHopSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  recipient: account,
  deadline,
  chainId,
}, false); // <-- Change the second parameter for different approaches
```

### Option B: Create a Selector Component

Add a dropdown in your UI to switch between approaches dynamically.

## Debugging Checklist

For each approach you test, check:

1. **Console Logs** - Each implementation logs extensive debug info
   ```
   === V4 Direct Encoding (Approach 1) ===
   Actions: 0x060c0f
   Commands: 0x10
   Params count: 3
   ```

2. **Gas Estimate** - Should be 150-200k, NOT millions
   - If gas is >500k, encoding is likely wrong
   - If MetaMask shows "likely to fail", encoding is definitely wrong

3. **Transaction Data** - Look at the hex data
   - `data.length` should be ~586-700 characters
   - `commands` should be `0x10` (V4_SWAP)
   - `actions` should be `0x060c0f`

4. **Error Messages** - Check console for specific errors
   - "User denied" = Actually means transaction will fail
   - Look for contract revert reasons

## Common Issues and Solutions

### Issue: "User denied transaction signature"
**Actual Problem:** Transaction will fail, MetaMask is protecting you
**Solution:** Check gas estimate and console logs for encoding errors

### Issue: Gas estimate is very high (>1M)
**Problem:** Parameters are incorrectly encoded
**Solution:**
1. Verify token addresses are correct
2. Check poolKey currencies (should be address(0) for ETH)
3. Verify SETTLE_ALL and TAKE_ALL parameters

### Issue: "Insufficient liquidity"
**Problem:** Pool doesn't exist or has no liquidity
**Solution:**
1. Try a different fee tier (0.05%, 0.3%, 1%)
2. Verify pool exists on that network
3. Check if you're on the right network (Arbitrum, Mainnet, etc.)

### Issue: "Deadline has passed"
**Problem:** Deadline calculation is wrong
**Solution:**
```typescript
// Deadline should be current timestamp + buffer
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
```

## Testing Environment

**Recommended:**
- Network: Arbitrum One (Chain ID: 42161)
- Test amount: 0.001-0.002 ETH
- Token pair: ETH → USDC
- Slippage: 0.5%

**Why Arbitrum:**
- Lower gas fees for testing
- Active V4 deployment
- Good liquidity

## Expected Console Output (Success)

```
=== V4 Direct Encoding (Approach 1) ===
Token In: ETH → Currency: 0x0000000000000000000000000000000000000000
Token Out: USDC → Currency: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
PoolKey currency0: 0x0000000000000000000000000000000000000000
PoolKey currency1: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
Zero for One: true
Amount In: 2000000000000000
Min Amount Out: 7650938
Actions: 0x060c0f
Params count: 3
Commands: 0x10
Inputs length: 1
V4 Input length: [some number]
=== Universal Router Transaction ===
To: 0xA51afAFe0263b40EdaEf0Df8781eA9aa03E381a3
Value: 2000000000000000 wei
Data length: 586
Deadline: 1761250723
Swap transaction sent: 0x...
```

## Next Steps After Finding Working Approach

Once you find an approach that works:

1. **Update the main file** - Replace `singleHopSwap.ts` with the working implementation
2. **Update multi-hop** - Apply the same fix to `multiHopSwap.ts`
3. **Document the solution** - Update `SWAP_ENCODING_FIX.md` with the working approach
4. **Test thoroughly** - Try different token pairs and amounts
5. **Clean up** - Remove the extra `_v2` and `_v3` files

## Still Not Working?

If none of these approaches work, the issue might be:

1. **Pool doesn't exist** - Check on Arbiscan/Etherscan if the pool is deployed
2. **Insufficient approval** - Make sure token approval went through
3. **Wrong contract addresses** - Verify Universal Router address for your network
4. **Network-specific issue** - Try a different network (Mainnet, Base, etc.)
5. **SDK version mismatch** - Check your package.json for SDK versions

## Get Help

If you're still stuck, share:
1. Which approach you tested
2. Full console log output
3. MetaMask error message
4. Network and token pair you're testing
5. Transaction hash (if it reverted)
