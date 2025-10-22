# Uniswap V4 Swap Encoding Fix

**Date**: February 5, 2025
**Issue**: Transactions failing on Mainnet with high gas estimates (~$107) indicating revert

## Root Cause

The swap transaction encoding was incorrect in three critical ways:

1. **Wrong action constants** - Using incorrect values from wrong enum
2. **Missing V4_SWAP wrapper** - Not wrapping V4 actions in Universal Router command
3. **Incorrect parameter encoding** - Wrong structure for action parameters

## What Was Wrong

### Before (Incorrect):

```typescript
// ❌ WRONG: Action constants from wrong source
const V4_SWAP_EXACT_IN_SINGLE = '0x06'; // 6
const V4_SETTLE_ALL = '0x0c';           // 12
const V4_TAKE_ALL = '0x0f';             // 15

// ❌ WRONG: No V4_SWAP wrapper
const commands = `0x${V4_SWAP_EXACT_IN_SINGLE.slice(2)}...` as `0x${string}`;

// ❌ WRONG: Individual parameters instead of struct
const swapParams = encodeAbiParameters(
  parseAbiParameters('address, address, uint24, int24, address, bool, uint128, uint128, bytes'),
  [currency0, currency1, fee, tickSpacing, hooks, zeroForOne, amountIn, minAmountOut, hookData]
);

// ❌ WRONG: Including recipient in TAKE_ALL
const takeParams = encodeAbiParameters(
  parseAbiParameters('address, address, uint256'),
  [tokenOutAddress, recipient, minAmountOut]
);
```

### After (Correct):

```typescript
// ✅ CORRECT: Action constants from @uniswap/v4-periphery Actions enum
const V4_SWAP = '0x00';                    // Universal Router command
const V4_SWAP_EXACT_IN_SINGLE = '0x00';    // 0
const V4_SETTLE_ALL = '0x09';              // 9
const V4_TAKE_ALL = '0x0b';                // 11

// ✅ CORRECT: Wrap in V4_SWAP command
const commands = `0x${V4_SWAP.slice(2)}` as `0x${string}`;

// ✅ CORRECT: Encode as ExactInputSingleParams struct (tuple)
const swapParams = encodeAbiParameters(
  parseAbiParameters('(address,address,uint24,int24,address,bool,uint128,uint128,bytes)'),
  [[currency0, currency1, fee, tickSpacing, hooks, zeroForOne, amountIn, minAmountOut, hookData]]
);

// ✅ CORRECT: NO recipient in TAKE_ALL params
const takeParams = encodeAbiParameters(
  parseAbiParameters('address, uint256'),
  [tokenOutAddress, minAmountOut]
);

// ✅ CORRECT: Combine actions and params properly
const v4Input = encodeAbiParameters(
  parseAbiParameters('bytes, bytes[]'),
  [actions, params_array]
);
```

## Fixed Files

1. **src/lib/uniswap/singleHopSwap.ts**
   - Updated action constants to 0x00, 0x09, 0x0b
   - Added V4_SWAP wrapper command
   - Changed swap params to tuple encoding
   - Removed recipient from TAKE_ALL
   - Fixed currency selection for SETTLE_ALL and TAKE_ALL

2. **src/lib/uniswap/multiHopSwap.ts**
   - Updated action constants to 0x01, 0x09, 0x0b
   - Added V4_SWAP wrapper command
   - Changed swap params to tuple encoding with path array
   - Removed recipient from TAKE_ALL
   - Fixed currency selection

## The Correct V4 Swap Flow

```
Universal Router.execute(commands, inputs, deadline)
  ├─ commands: 0x00 (V4_SWAP)
  └─ inputs[0]: encodeAbiParameters('bytes, bytes[]', [actions, params])
      ├─ actions: 0x00090b (SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL)
      └─ params[]:
          ├─ params[0]: ExactInputSingleParams struct
          ├─ params[1]: (currency, amount) for SETTLE_ALL
          └─ params[2]: (currency, minAmount) for TAKE_ALL
```

## Action Constants Reference

### Universal Router Commands (from @uniswap/universal-router)
- `V4_SWAP = 0x00` - Top-level command for V4 operations

### V4 Router Actions (from @uniswap/v4-periphery/Actions)
- `V4_SWAP_EXACT_IN_SINGLE = 0x00` (0) - Single-hop exact input
- `V4_SWAP_EXACT_IN = 0x01` (1) - Multi-hop exact input
- `V4_SWAP_EXACT_OUT_SINGLE = 0x02` (2) - Single-hop exact output
- `V4_SWAP_EXACT_OUT = 0x03` (3) - Multi-hop exact output
- `V4_SETTLE_ALL = 0x09` (9) - Settle input currency
- `V4_TAKE_ALL = 0x0b` (11) - Take output currency

## Official Documentation Reference

Based on: https://docs.uniswap.org/contracts/v4/quickstart/swap

The official example shows:
```solidity
bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
bytes[] memory inputs = new bytes[](1);

bytes memory actions = abi.encodePacked(
    uint8(Actions.SWAP_EXACT_IN_SINGLE),
    uint8(Actions.SETTLE_ALL),
    uint8(Actions.TAKE_ALL)
);

bytes[] memory params = new bytes[](3);
params[0] = abi.encode(IV4Router.ExactInputSingleParams({...}));
params[1] = abi.encode(currency0, amountIn);
params[2] = abi.encode(currency1, minAmountOut);

inputs[0] = abi.encode(actions, params);
router.execute(commands, inputs, deadline);
```

## Testing

After this fix:
- ✅ Transaction encoding should be valid
- ✅ Gas estimates should be reasonable (~150-200k gas)
- ✅ MetaMask should not show "likely to fail" warnings
- ✅ Swaps should execute successfully on Mainnet

## Next Steps

1. Test small swap on Mainnet (0.001-0.01 ETH)
2. Verify successful execution
3. If still failing, check:
   - Token approval status
   - Pool liquidity
   - Network connection
   - RPC provider
