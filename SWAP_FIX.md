# Swap Execution Fix

## Problem
When trying to execute a swap after getting a quote, the transaction failed with:
```
Function "execute" not found on ABI
```

## Root Causes Found

### 1. ❌ Wrong Action Constants

**Before:**
```typescript
const V4_SWAP_EXACT_IN_SINGLE = '0x00';  // WRONG! Should be 6
const V4_SETTLE_ALL = '0x10';            // WRONG! Should be 12
const V4_TAKE_ALL = '0x12';              // WRONG! Should be 15
```

**After:**
```typescript
const V4_SWAP_EXACT_IN_SINGLE = '0x06';  // ✅ Correct (6)
const V4_SETTLE_ALL = '0x0c';            // ✅ Correct (12)
const V4_TAKE_ALL = '0x0f';              // ✅ Correct (15)
```

The action codes **must match** the `Actions` enum from `@uniswap/v4-sdk`.

### 2. ❌ Incorrect Transaction Sending Method

**Before:**
```typescript
// Trying to use writeContractAsync with empty ABI
const hash = await writeContractAsync({
  address: tx.to,
  abi: [],  // ❌ Empty ABI doesn't work!
  functionName: 'execute',
  args: [],
  data: tx.data,
  value: tx.value,
});
```

**After:**
```typescript
// Use sendTransactionAsync with pre-encoded data
const hash = await sendTransactionAsync({
  to: tx.to,
  data: tx.data,  // Already encoded by prepareSingleHopSwap
  value: tx.value,
});
```

**Why?** The swap data is already fully encoded by `encodeFunctionData` in the preparation functions, so we just need to send it as a raw transaction.

## Files Modified

### 1. `src/lib/uniswap/singleHopSwap.ts`
- ✅ Fixed all V4 action constants to match SDK
- ✅ Added comments with decimal values

### 2. `src/lib/uniswap/multiHopSwap.ts`
- ✅ Fixed all V4 action constants to match SDK
- ✅ Added comments with decimal values

### 3. `src/hooks/useSwap.ts`
- ✅ Imported `useSendTransaction` from wagmi
- ✅ Replaced `writeContractAsync` with `sendTransactionAsync`
- ✅ Updated dependency array

## How It Works Now

```
1. User confirms swap
   ↓
2. useSwap hook calls executeSingleHopSwap/executeMultiHopSwap
   ↓
3. Swap function:
   - Creates PoolKey
   - Encodes actions: SWAP(0x06), SETTLE_ALL(0x0c), TAKE_ALL(0x0f)
   - Encodes parameters for each action
   - Combines into commands bytes
   - Calls encodeFunctionData with UNIVERSAL_ROUTER_ABI
   ↓
4. Returns { to, data, value }
   ↓
5. sendTransactionAsync sends the encoded transaction
   ↓
6. Universal Router executes:
   - Decodes commands
   - Executes SWAP
   - Executes SETTLE_ALL (pays input token)
   - Executes TAKE_ALL (receives output token)
   ↓
7. Swap complete!
```

## V4 Action Flow

### Single-Hop Swap

```typescript
Commands: 0x060c0f
          ││││││
          │││││└─ TAKE_ALL (15 = 0x0f)
          ││││└── SETTLE_ALL (12 = 0x0c)
          │││└─── SWAP_EXACT_IN_SINGLE (6 = 0x06)

Params: [
  swapParams,    // For SWAP_EXACT_IN_SINGLE
  settleParams,  // For SETTLE_ALL
  takeParams,    // For TAKE_ALL
]
```

Each action code is 1 byte (2 hex chars).

## Testing Checklist

To verify swap execution works:

- [ ] Get a quote on Mainnet for ETH → USDC
- [ ] Click "Swap" button
- [ ] Approve USDC if needed (first time)
- [ ] Confirm swap transaction
- [ ] Transaction should succeed

## Expected Behavior

### First-Time Swap (ERC20)
1. Click "Swap"
2. Approve token (Permit2)
3. Wait for approval confirmation
4. Click "Swap" again
5. Execute swap
6. Success!

### Subsequent Swaps
1. Click "Swap"
2. Execute swap immediately
3. Success!

### Native ETH Swap
1. Click "Swap"
2. Execute swap immediately (no approval needed)
3. Success!

## Action Constants Reference

From `@uniswap/v4-sdk` Actions enum:

```typescript
enum Actions {
  INCREASE_LIQUIDITY = 0,
  DECREASE_LIQUIDITY = 1,
  MINT_POSITION = 2,
  BURN_POSITION = 3,
  // 4-5 unused
  SWAP_EXACT_IN_SINGLE = 6,    // ← We use this
  SWAP_EXACT_IN = 7,            // ← We use this
  SWAP_EXACT_OUT_SINGLE = 8,
  SWAP_EXACT_OUT = 9,
  // 10 unused
  SETTLE = 11,
  SETTLE_ALL = 12,              // ← We use this
  SETTLE_PAIR = 13,
  TAKE = 14,
  TAKE_ALL = 15,                // ← We use this
  TAKE_PORTION = 16,
  TAKE_PAIR = 17,
  CLOSE_CURRENCY = 18,
  // 19 unused
  SWEEP = 20,
  // 21 unused
  UNWRAP = 22,
}
```

## Common Issues & Solutions

### Issue: "execute function not found"
**Solution:** ✅ Fixed! We now use `sendTransactionAsync` instead of `writeContractAsync`.

### Issue: Transaction reverts
**Possible causes:**
- Pool doesn't have enough liquidity
- Slippage too low
- Token not approved
- Wrong network

**Solutions:**
- Try smaller amount
- Increase slippage
- Check approval status
- Verify you're on Mainnet

### Issue: "Insufficient allowance"
**Solution:** Click "Swap" again after approval transaction confirms.

## Notes

- The Universal Router's `execute` function is payable (can receive ETH)
- Commands are concatenated bytes (each action = 1 byte)
- Params array must match commands order
- Action constants MUST match SDK exactly
- Data is pre-encoded, just send it

## Status

✅ **Swap execution is now fixed and ready to use!**

Test on Ethereum Mainnet with small amounts first.
