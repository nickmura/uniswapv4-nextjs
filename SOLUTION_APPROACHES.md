# Uniswap V4 Swap Fix - Solution Approaches

## Problem Summary
Transaction failing with "User denied transaction signature" - but the real issue is MetaMask detecting the transaction will fail due to incorrect parameter encoding.

## Confirmed Correct Values
- ✅ Action Constants: `SWAP_EXACT_IN_SINGLE = 0x06`, `SETTLE_ALL = 0x0c`, `TAKE_ALL = 0x0f`
- ✅ Universal Router Command: `V4_SWAP = 0x10`
- ✅ Contract addresses verified on official Uniswap docs

## Root Issues Identified

### Issue 1: SETTLE_ALL Parameter Encoding
**Current (WRONG):**
```typescript
const settleParams = encodeAbiParameters(
  parseAbiParameters('address,uint256'),
  [currencyIn, amountIn]
);
```

**Problem:** SETTLE_ALL should settle the full amount based on the delta, not a specific amount.

**Solution:** SETTLE_ALL parameters should be just the currency address with a special flag for "use contract balance"

### Issue 2: Parameter Array Structure
**Current:**
```typescript
params_array.push(swapParams);
params_array.push(settleParams);
params_array.push(takeParams);
```

**Problem:** Parameters may not align with action expectations

### Issue 3: Native ETH Currency Handling
**Current:** Mixed use of `address(0)` and WETH address
**Solution:** Consistent use of `address(0)` for native ETH throughout

---

## Solution Approach 1: Direct ABI Encoding (Recommended)

### Strategy
Abandon the RoutePlanner SDK and encode everything manually using exact ABI specifications from the official docs.

### Implementation
```typescript
// 1. Encode actions
const actions = `0x060c0f` as `0x${string}`; // SWAP_EXACT_IN_SINGLE + SETTLE_ALL + TAKE_ALL

// 2. Encode parameters
const params: `0x${string}`[] = [];

// Param 0: ExactInputSingleParams struct
params[0] = encodeAbiParameters(
  parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
  [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], zeroForOne, amountIn, minAmountOut, '0x']
);

// Param 1: SETTLE_ALL - currency and amount
params[1] = encodeAbiParameters(
  parseAbiParameters('address,uint256'),
  [currencyIn, amountIn]
);

// Param 2: TAKE_ALL - currency and minimum amount
params[2] = encodeAbiParameters(
  parseAbiParameters('address,uint256'),
  [currencyOut, minAmountOut]
);

// 3. Encode the V4_SWAP input
const v4Input = encodeAbiParameters(
  parseAbiParameters('bytes,bytes[]'),
  [actions, params]
);

// 4. Call Universal Router
const commands = '0x10' as `0x${string}`; // V4_SWAP
const inputs = [v4Input];

const data = encodeFunctionData({
  abi: UNIVERSAL_ROUTER_ABI,
  functionName: 'execute',
  args: [commands, inputs, deadline],
});
```

### Pros
- Full control over encoding
- Matches official Solidity examples exactly
- Easier to debug

### Cons
- More code to maintain
- Loses SDK abstractions

---

## Solution Approach 2: Fix RoutePlanner Usage

### Strategy
Keep using RoutePlanner but fix how we pass parameters

### Implementation
```typescript
import { RoutePlanner, CommandType } from '@uniswap/universal-router-sdk';

// Build actions
const actions = `0x060c0f` as `0x${string}`;

// Build params
const params: `0x${string}`[] = [
  // Swap params as tuple
  encodeAbiParameters(
    parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
    [[poolKeyCurrency0, poolKeyCurrency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], zeroForOne, amountIn, minAmountOut, '0x']
  ),
  // SETTLE_ALL params
  encodeAbiParameters(parseAbiParameters('address,uint256'), [currencyIn, amountIn]),
  // TAKE_ALL params
  encodeAbiParameters(parseAbiParameters('address,uint256'), [currencyOut, minAmountOut]),
];

// Create planner
const planner = new RoutePlanner();

// CRITICAL: Check if RoutePlanner expects a tuple or separate params
// Try option A first, then option B if that fails
// Option A: Pass actions and params as array
planner.addCommand(CommandType.V4_SWAP, [actions, params]);

// Option B: Pre-encode the V4 input
const v4Input = encodeAbiParameters(
  parseAbiParameters('bytes,bytes[]'),
  [actions, params]
);
planner.addCommand(CommandType.V4_SWAP, [v4Input]);
```

### Pros
- Uses SDK abstractions
- Cleaner code

### Cons
- SDK might have bugs
- Less control

---

## Solution Approach 3: Use ActionConstants.CONTRACT_BALANCE

### Strategy
Use the special `CONTRACT_BALANCE` constant for SETTLE_ALL and TAKE_ALL to let the router calculate amounts automatically

### Implementation
```typescript
const CONTRACT_BALANCE = 0x8000000000000000000000000000000000000000000000000000000000000000n;

// Encode parameters with CONTRACT_BALANCE flag
const params: `0x${string}`[] = [];

// Param 0: ExactInputSingleParams
params[0] = encodeAbiParameters(
  parseAbiParameters('(address,address,uint24,int24,address),bool,uint128,uint128,bytes'),
  [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], zeroForOne, amountIn, minAmountOut, '0x']
);

// Param 1: SETTLE_ALL with CONTRACT_BALANCE
params[1] = encodeAbiParameters(
  parseAbiParameters('address,uint256'),
  [currencyIn, CONTRACT_BALANCE]
);

// Param 2: TAKE_ALL with CONTRACT_BALANCE
params[2] = encodeAbiParameters(
  parseAbiParameters('address,uint256'),
  [currencyOut, CONTRACT_BALANCE]
);
```

### Pros
- Most flexible - lets router handle amounts
- Matches internal contract patterns

### Cons
- Less explicit
- Requires understanding of V4 flash accounting

---

## Recommended Implementation Order

1. **Start with Approach 1** - Direct ABI encoding with explicit amounts
2. **If that fails**, try Approach 3 with CONTRACT_BALANCE
3. **If still failing**, check if SETTLE_ALL/TAKE_ALL parameters are different

## Testing Strategy

1. Test on **Arbitrum mainnet** with small amount (0.001-0.002 ETH)
2. Check gas estimate - should be ~150-200k gas
3. If gas is high (~millions), encoding is still wrong
4. Monitor transaction in MetaMask for specific error messages

## Common Pitfalls to Avoid

- ❌ Using WETH address in poolKey when swapping ETH
- ❌ Mixing `address(0)` and WETH address
- ❌ Wrong parameter order in params array
- ❌ Not matching params array length to actions length
- ❌ Using wrong ABI types (e.g., tuple vs individual params)

## Debug Commands

```typescript
// Add extensive logging
console.log('Actions:', actions);
console.log('Params[0] (swap):', params[0]);
console.log('Params[1] (settle):', params[1]);
console.log('Params[2] (take):', params[2]);
console.log('Commands:', commands);
console.log('Inputs[0]:', inputs[0]);
console.log('Final data length:', data.length);
```
