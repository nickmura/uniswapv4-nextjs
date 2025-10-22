# Uniswap V4 Deployment Notes

## ✅ Contract Addresses Updated (Jan 31, 2025)

All contract addresses have been updated to the **official Uniswap V4 deployments** from:
https://docs.uniswap.org/contracts/v4/deployments

### Supported Networks

| Network | Status | Pool Availability | Recommendation |
|---------|--------|-------------------|----------------|
| Ethereum Mainnet | ✅ Live | ✅ **Good** - Most pools available | **✅ USE THIS** |
| Base | ✅ Live | ❌ **None** - No pools at all | **❌ DISABLED - Will fail** |
| Arbitrum One | ✅ Live | ⚠️ **Limited** - Low liquidity | Use Mainnet instead |
| Sepolia Testnet | ✅ Live | ❌ **None** - No pools initialized | **❌ DISABLED - Will fail** |

**Important**: As of Feb 5, 2025, **ONLY Ethereum Mainnet works**. Base and Sepolia have swap button disabled.

## 🔍 Important Notes

### Pool Availability
Since Uniswap V4 launched on **January 31, 2025**, liquidity pools are still being created:

- ✅ **Most likely to work**: ETH/USDC, ETH/USDT, WETH/USDC on major chains
- ⚠️ **May not exist yet**: Exotic token pairs, uncommon fee tiers
- 💡 **Recommendation**: Start with major token pairs on Sepolia testnet

### Auto Fee Tier Discovery
The app automatically tries multiple fee tiers to find an existing pool:
1. 0.3% (3000) - Most common
2. 0.05% (500) - Stablecoin pairs
3. 1% (10000) - Exotic pairs
4. 0.01% (100) - Very stable pairs

If no pool exists for any fee tier, you'll see a helpful error message.

### Error Messages

**"Pool does not exist"** = The token pair hasn't had a V4 pool created yet
- Try a different token pair
- Try on Sepolia testnet
- Check back later as more pools are created

**"Contract returned no data"** = Pool doesn't exist for that specific fee tier
- The app will auto-try other fee tiers
- If all fail, the pool pair doesn't exist

## 🧪 Testing Recommendations

### ❌ DO NOT Use Sepolia Testnet

**Sepolia has NO V4 pools!** The V4 contracts are deployed but no one has created test pools yet. You'll get "No pools found" errors.

**For testing, use Ethereum Mainnet with small amounts instead.**

### ✅ Testing on Mainnet (Recommended)

1. **Use Ethereum Mainnet**
   - Connect your wallet to Mainnet
   - Start with small amounts (0.001 ETH)
   - Test real swaps with real liquidity

2. **Common Test Pairs**
   - ETH → WETH
   - ETH → USDC
   - USDC → USDT
   - WETH → DAI

3. **Check Pool Existence**
   - Visit https://app.uniswap.org/
   - See which V4 pools are available
   - Use those pairs in this app

## 📝 Contract Addresses

### Ethereum Mainnet (Chain ID: 1)
```
PoolManager: 0x000000000004444c5dc75cB358380D2e3dE08A90
Quoter:      0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203
StateView:   0x7ffe42c4a5deea5b0fec41c94c136cf115597227
Universal Router: 0x66a9893cc07d91d95644aedd05d03f95e1dba8af
Permit2:     0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Base (Chain ID: 8453)
```
PoolManager: 0x498581ff718922c3f8e6a244956af099b2652b2b
Quoter:      0x0d5e0f971ed27fbff6c2837bf31316121532048d
StateView:   0xa3c0c9b65bad0b08107aa264b0f3db444b867a71
Universal Router: 0x6ff5693b99212da76ad316178a184ab56d299b43
Permit2:     0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Arbitrum One (Chain ID: 42161)
```
PoolManager: 0x360e68faccca8ca495c1b759fd9eee466db9fb32
Quoter:      0x3972c00f7ed4885e145823eb7c655375d275a1c5
StateView:   0x76fd297e2d437cd7f76d50f01afe6160f86e9990
Universal Router: 0xa51afafe0263b40edaef0df8781ea9aa03e381a3
Permit2:     0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Sepolia Testnet (Chain ID: 11155111)
```
PoolManager: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
Quoter:      0x61b3f2011a92d183c7dbadbda940a7555ccf9227
StateView:   0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c
Universal Router: 0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b
Permit2:     0x000000000022D473030F116dDEE9F6B43aC78BA3
```

## 🔧 Troubleshooting

1. **Clear browser cache** - Old contract addresses may be cached
2. **Try Sepolia first** - Better for testing
3. **Use common pairs** - ETH/USDC most likely to work
4. **Check Uniswap app** - Verify pools exist before trying
5. **Wait a few days** - More pools will be created

## 📚 Resources

- [Uniswap V4 Docs](https://docs.uniswap.org/contracts/v4/overview)
- [Official Deployments](https://docs.uniswap.org/contracts/v4/deployments)
- [V4 Launch Blog Post](https://blog.uniswap.org/uniswap-v4-is-here)
