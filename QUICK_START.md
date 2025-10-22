# Quick Start Guide

## ⚡ TL;DR

**Only Ethereum Mainnet works reliably right now.**

- ✅ **Ethereum Mainnet** - Works great, most pools available
- ⚠️ **Base** - Very limited, try ETH/USDC only
- ⚠️ **Arbitrum** - Limited pools, low liquidity
- ❌ **Sepolia** - No pools at all, don't use

## 🚀 How to Use

1. **Connect Wallet**
   - Make sure you're on **Ethereum Mainnet**
   - Click "Connect Wallet" in header

2. **Enter Swap**
   - Select tokens (ETH, USDC, USDT, etc.)
   - Enter amount
   - Wait for quote

3. **Execute**
   - Click "Swap"
   - Approve token if needed (first time)
   - Confirm transaction

## ✅ Best Token Pairs (Mainnet)

These pairs are most likely to have V4 pools:

- ETH → USDC
- ETH → USDT
- WETH → USDC
- USDC → USDT
- ETH → DAI

## ❌ Common Issues

### "No pools found"

**On Sepolia**: Normal - no pools exist. Use Mainnet.

**On Base/Arbitrum**: Limited pools. Try:
- Different token pair
- Switch to Mainnet

**On Mainnet**: Pool may not exist. Try:
- More common pairs (ETH/USDC)
- Different fee tier (automatic)

### "Pool does not exist"

The specific token pair doesn't have a V4 pool yet. Try:
- Different tokens
- Popular pairs like ETH/USDC

### Quotes work but swap fails

- Increase slippage tolerance (try 1%)
- Pool may have low liquidity
- Try smaller amount

## 🎯 Recommended Setup

```
Network:  Ethereum Mainnet
Tokens:   ETH → USDC
Amount:   0.01 ETH (test amount)
Slippage: 0.5%
```

This combination is most likely to work!

## 📊 Network Status

The app will show you warnings for networks with limited pools. If you see:

- 🔴 Red warning → Don't use (no pools)
- 🟡 Yellow warning → Limited (may not work)
- ✅ No warning → Good to use

## 💡 Pro Tips

1. **Start small** - Test with 0.001-0.01 ETH first
2. **Use Mainnet** - Other networks have very few pools
3. **Common pairs** - Stick to ETH/USDC/USDT
4. **Check errors** - Error messages tell you what's wrong
5. **Be patient** - V4 just launched, more pools coming

## 🆘 Still Having Issues?

Check:
1. Are you on Ethereum Mainnet? (most important!)
2. Using common tokens? (ETH, USDC, USDT)
3. Do you have ETH for gas?
4. Is your amount reasonable? (not too large)

## 📝 Notes

- Uniswap V4 launched Jan 31, 2025
- Pools are still being created
- Mainnet has the most liquidity
- Testnets have NO pools
- More networks will improve over time
