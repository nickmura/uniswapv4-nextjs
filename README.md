# Uniswap V4 Swap Application

A modern, fully-featured decentralized token swapping interface built with Uniswap V4 SDK, Next.js 15, and RainbowKit.

## Features

- **Single-Hop Swaps**: Direct token swaps through a single liquidity pool
- **Multi-Hop Swaps**: Automatic routing through multiple pools for optimal pricing
- **Real-time Quotes**: Instant quote fetching with price impact calculations
- **Slippage Protection**: Configurable slippage tolerance with smart warnings
- **Multiple Networks**: Support for Ethereum Mainnet, Sepolia, Base, and Arbitrum
- **Modern Wallet Support**: RainbowKit integration with MetaMask, WalletConnect, Coinbase Wallet, and more
- **Responsive UI**: Beautiful, mobile-friendly interface with dark mode support
- **Type-Safe**: Full TypeScript implementation with strict type checking

## Tech Stack

- **Next.js 15** with App Router and React 19
- **Uniswap V4 SDK** for core swap functionality
- **viem & wagmi** for Ethereum interactions
- **RainbowKit** for wallet connections
- **Tailwind CSS 4** for styling
- **TypeScript** for type safety

## ⚠️ Important: Network Status

**Uniswap V4 launched Jan 31, 2025. ONLY MAINNET WORKS:**

- ✅ **Ethereum Mainnet** - Works! Use this network
- ❌ **Base** - NO POOLS - Swap button disabled (will fail)
- ❌ **Sepolia** - NO POOLS - Swap button disabled (will fail)
- ⚠️ **Arbitrum** - Limited pools, low liquidity

**👉 MUST use Ethereum Mainnet. Other networks are disabled or won't work.**

The app **prevents** swaps on Base/Sepolia with a clear warning and disabled button.

See [QUICK_START.md](./QUICK_START.md) for detailed guidance.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- ETH on Ethereum Mainnet for testing
- (Optional) Alchemy API key for better RPC performance
- (Optional) WalletConnect Project ID for WalletConnect support

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Get API Keys

**Alchemy API Key** (Recommended)
- Sign up at [alchemy.com](https://www.alchemy.com/)
- Create a new app for Ethereum Mainnet
- Copy your API key to `.env.local`

**WalletConnect Project ID** (Required for WalletConnect)
- Sign up at [cloud.walletconnect.com](https://cloud.walletconnect.com/)
- Create a new project
- Copy your Project ID to `.env.local`

## Usage

### Performing a Swap

1. **Connect Wallet**: Click "Connect Wallet" in the header
2. **Select Tokens**: Choose input and output tokens from the dropdowns
3. **Enter Amount**: Type the amount you want to swap
4. **Review Quote**: Check the expected output and price impact
5. **Adjust Slippage** (Optional): Click the settings icon
6. **Execute Swap**: Click "Swap" and confirm in your wallet

### Switching Networks

Use the network selector in RainbowKit to switch between:
- Ethereum Mainnet
- Sepolia Testnet (for testing)
- Base
- Arbitrum One

## Project Structure

See [architecture.md](./architecture.md) for detailed technical documentation.

```
src/
├── app/                    # Next.js App Router
├── components/             # React components
│   ├── SwapForm.tsx        # Main swap interface
│   ├── TokenSelector.tsx   # Token selection
│   └── QuoteDisplay.tsx    # Quote display
├── hooks/                  # Custom React hooks
├── lib/                    # Business logic
│   ├── config/             # Configuration
│   ├── uniswap/            # Uniswap logic
│   └── utils/              # Utilities
└── types/                  # TypeScript types
```

## Key Concepts

**Single-Hop vs Multi-Hop**
- Single-hop: Direct swap (ETH → USDC)
- Multi-hop: Routed swap (Token A → WETH → Token B)

**Slippage Tolerance**
- Default: 0.5%
- Higher tolerance = better chance of success
- Lower tolerance = better price protection

**Price Impact**
- Shows how much your trade affects market price
- >5% is considered high impact

## Supported Networks

| Network | Chain ID | Testnet |
|---------|----------|---------|
| Ethereum | 1 | No |
| Sepolia | 11155111 | Yes |
| Base | 8453 | No |
| Arbitrum | 42161 | No |

## Development

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # Run linter
```

## Common Issues

- **Pool not found**: Token pair may not have a V4 pool
- **Insufficient balance**: Need more tokens or ETH for gas
- **Transaction fails**: Try increasing slippage
- **Quotes not loading**: Check RPC connection

## Resources

- [Uniswap V4 Docs](https://docs.uniswap.org/sdk/v4/overview)
- [Architecture Documentation](./architecture.md)
- [wagmi](https://wagmi.sh) | [viem](https://viem.sh) | [RainbowKit](https://www.rainbowkit.com)

## License

MIT License

---

Built with Uniswap V4, Next.js, wagmi, and RainbowKit
