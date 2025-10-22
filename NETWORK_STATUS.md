# Uniswap V4 Network Status
**Last Updated: February 5, 2025**

## Current Situation

Uniswap V4 was deployed on **January 31, 2025** across multiple chains. However, **pool creation is permissionless** - anyone can create a pool, but they must deposit liquidity. This means:

- ✅ Contracts are deployed everywhere
- ❌ Pools don't exist automatically
- 📊 Liquidity providers must create pools manually

## Network-by-Network Status

### ✅ Ethereum Mainnet (Chain ID: 1)
**Status: WORKING**

- Pool Availability: **Good**
- Liquidity: **Best**
- Recommended Pairs: ETH/USDC, ETH/USDT, WETH/USDC, USDC/USDT
- Gas Cost: High (~$50-100 per swap)
- **Recommendation: ✅ USE THIS FOR PRODUCTION**

**Why it works:**
- Most liquidity migrated here first
- Major DEX aggregators using V4 on mainnet
- Active market makers providing liquidity

### ❌ Base (Chain ID: 8453)
**Status: NO POOLS**

- Pool Availability: **NONE**
- Liquidity: **Zero**
- Works: Nothing
- Gas Cost: Low (~$0.01-0.10)
- **Recommendation: ❌ DO NOT USE - Transactions will fail**

**Issues:**
- Contracts deployed but NO pools created yet
- Even ETH/USDC fails
- MetaMask will warn "transaction likely to fail"
- **Swap button is disabled on Base**

### ⚠️ Arbitrum One (Chain ID: 42161)
**Status: LIMITED**

- Pool Availability: **Limited**
- Liquidity: **Low**
- May Work: ETH/USDC, WETH/USDC
- Gas Cost: Low (~$0.10-0.50)
- **Recommendation: ⚠️ Limited pools, use Mainnet for reliability**

**Issues:**
- Some pools exist but with very low liquidity
- Swaps may fail due to insufficient liquidity
- Better than Base but still limited

### ❌ Sepolia Testnet (Chain ID: 11155111)
**Status: NO POOLS**

- Pool Availability: **NONE**
- Liquidity: **Zero**
- Works: Nothing
- Gas Cost: Free (testnet)
- **Recommendation: ❌ DO NOT USE - No pools initialized**

**Why it doesn't work:**
- Contracts deployed but NO ONE created test pools
- Would need to manually create and fund pools yourself
- Not useful for testing without pools
- Use Mainnet with small amounts instead

## Why This Happens

### V4 vs V3 Differences

**Uniswap V3:**
- Pools auto-deployed by Uniswap Labs
- Liquidity migrated automatically
- Worked immediately on launch

**Uniswap V4:**
- **Permissionless pool creation**
- Anyone can create pools
- Must manually deposit liquidity
- Takes time for liquidity to migrate

### Timeline Expectations

```
Jan 31, 2025  - V4 Launched
Feb 1-5, 2025 - Early pools created on Mainnet
Feb-Mar 2025  - More pools on Mainnet, some on L2s
Q2 2025       - Expect better L2 coverage
Q3 2025+      - Mature liquidity across chains
```

## What The App Does

### Auto Fee Tier Discovery

The app tries **4 fee tiers automatically**:

1. **0.3% (3000)** - Most common, try first
2. **0.05% (500)** - Stablecoin pairs
3. **1% (10000)** - Exotic pairs
4. **0.01% (100)** - Very stable pairs

If NO pools exist for ANY fee tier → "No pools found" error

### Network Warnings

The app shows warnings based on network:

```typescript
// Sepolia
🔴 "Sepolia has NO V4 pools. Switch to Mainnet"

// Base/Arbitrum
🟡 "Limited V4 pools. Try ETH/USDC or use Mainnet"

// Mainnet
✅ No warning - best experience
```

## Recommendations by Use Case

### 🧪 Testing/Development
**Use: Ethereum Mainnet with small amounts**
- Swap 0.001 - 0.01 ETH
- Real pools, real liquidity
- Costs $1-5 in gas (acceptable for testing)

**Don't Use: Sepolia**
- No pools = no testing possible
- Would need to create pools yourself

### 🚀 Production Use
**Use: Ethereum Mainnet**
- Best liquidity
- Most reliable
- Proven pools

**Maybe Use: Base (for low fees)**
- Only if ETH/USDC pair
- Check liquidity first
- Have fallback to Mainnet

### 💰 Cost-Conscious Users
**Wait a few months**
- L2 pools will improve
- More liquidity will migrate
- Check back Q2 2025

## How to Check Pool Existence

### Method 1: Use This App
1. Select tokens
2. Enter amount
3. Wait for quote
4. Error message tells you if pool exists

### Method 2: Uniswap Interface
1. Visit https://app.uniswap.org
2. Try swapping same pair
3. If it works there, it'll work here

### Method 3: Block Explorer
1. Go to PoolManager contract
2. Query pool state
3. Check if liquidity > 0

## Future Updates

We'll update this document as:
- ✅ More pools are created
- ✅ L2 liquidity improves
- ✅ Testnets get pools
- ✅ New chains are supported

Check `git log NETWORK_STATUS.md` to see update history.

## Quick Reference

| Need | Use This |
|------|----------|
| Production swaps | Ethereum Mainnet |
| Testing | Mainnet (small amounts) |
| Low fees | Wait for L2s to mature |
| Exotic pairs | Mainnet (may not exist yet) |
| Testnet testing | Create own pools on Sepolia |

## Smart Contract Addresses

All addresses are in `/src/lib/config/contracts.ts` and verified from:
https://docs.uniswap.org/contracts/v4/deployments

## Support

For issues:
1. Check if you're on **Ethereum Mainnet**
2. Try **ETH/USDC** pair
3. Read error message carefully
4. See [QUICK_START.md](./QUICK_START.md)
