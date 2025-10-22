# Uniswap V4 Integration Architecture

## Project Overview

This Next.js 15 application integrates Uniswap V4 SDK to provide decentralized token swapping functionality with support for both single-hop and multi-hop swaps. The application uses modern Web3 tooling including viem, wagmi, and RainbowKit for blockchain interactions and wallet management.

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety

### Web3 Stack
- **viem** - TypeScript-first Ethereum library
- **wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **@tanstack/react-query** - Async state management

### Uniswap Integration
- **@uniswap/v4-sdk** - Core V4 functionality
- **@uniswap/sdk-core** - Token and chain utilities
- **@uniswap/universal-router-sdk** - Swap routing
- **@uniswap/permit2-sdk** - Token approval management

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js App                            │
├─────────────────────────────────────────────────────────────┤
│  Layout (Web3 Providers)                                     │
│    ├── WagmiProvider                                         │
│    ├── QueryClientProvider                                   │
│    └── RainbowKitProvider                                    │
├─────────────────────────────────────────────────────────────┤
│  Pages                                                        │
│    └── page.tsx (Swap Interface)                            │
├─────────────────────────────────────────────────────────────┤
│  Components                                                   │
│    ├── SwapForm.tsx (Main UI)                               │
│    ├── TokenSelector.tsx (Token Picker)                     │
│    ├── QuoteDisplay.tsx (Quote Results)                     │
│    └── WalletConnect.tsx (Connect Button)                   │
├─────────────────────────────────────────────────────────────┤
│  Custom Hooks                                                 │
│    ├── useSwapQuote.ts (Fetch quotes)                       │
│    ├── useSwap.ts (Execute swaps)                           │
│    └── useTokenBalance.ts (Check balances)                  │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                         │
│    ├── quote.ts (Quote fetching)                            │
│    ├── singleHopSwap.ts (Single-hop execution)              │
│    ├── multiHopSwap.ts (Multi-hop execution)                │
│    └── poolUtils.ts (Pool helpers)                          │
├─────────────────────────────────────────────────────────────┤
│  Configuration                                                │
│    ├── wagmi.ts (Chain & wallet config)                     │
│    ├── tokens.ts (Token addresses)                          │
│    └── contracts.ts (Uniswap addresses)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ethereum Network                           │
│  ├── Uniswap V4 Contracts                                   │
│  │   ├── PoolManager (Singleton)                            │
│  │   ├── Quoter (Quote simulation)                          │
│  │   └── StateView (Pool data)                              │
│  ├── Universal Router                                        │
│  └── Permit2 (Token approvals)                              │
└─────────────────────────────────────────────────────────────┘
```

## SDK Architecture & Design Decisions

### Why Manual Contract Declarations?

**The Uniswap V4 SDK does NOT provide:**
- Direct contract call functions (no built-in `getQuote()`)
- Contract addresses or ABIs
- RPC provider abstractions

**The SDK DOES provide:**
- Type definitions (`SwapExactInSingle`, `PoolKey`, etc.)
- Helper classes (`Pool`, `Route`, `Trade`)
- Encoding utilities (`V4Planner` for swap actions)

**Therefore, we must:**
1. Manually declare contract addresses (verified from Uniswap deployments)
2. Define ABIs for type-safe contract interactions
3. Use viem/wagmi for actual blockchain calls

This is the **official pattern** per Uniswap docs - the SDK is for **structuring** swap logic, while viem/ethers handles **execution**.

### Quote Pattern

**Official Uniswap Approach (ethers):**
```typescript
const quoter = new ethers.Contract(ADDRESS, ABI, provider)
const result = await quoter.callStatic.quoteExactInputSingle(params)
```

**Our Implementation (viem):**
```typescript
const result = await client.readContract({
  address: quoterAddress,
  abi: QUOTER_ABI,
  functionName: 'quoteExactInputSingle',
  args: [params]
})
```

Both are equivalent - viem's `readContract` = ethers' `callStatic`.

## Core Concepts

### Uniswap V4 Key Changes

1. **Singleton PoolManager**: All pools managed by a single contract
2. **Universal Router**: All swaps must route through this contract
3. **Hooks**: Customizable pool behavior (not used in initial implementation)
4. **Permit2**: Improved token approval system
5. **SETTLE/TAKE Pattern**: New way to handle token transfers

### Swap Flow

#### Single-Hop Swap Flow
```
User Input → Quote Fetch → Display Quote → User Confirms →
Check Approval → Approve if needed → Execute Swap → Display Result
```

#### Multi-Hop Swap Flow
```
User Input → Find Route → Quote Each Hop → Display Total Quote →
User Confirms → Check Approvals → Execute Multi-Hop Swap → Display Result
```

## Detailed Component Architecture

### 1. Provider Setup

**Location**: `src/app/layout.tsx`

Wraps the entire application with necessary providers:

```typescript
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider>
      {children}
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### 2. Configuration Layer

#### wagmi.ts
- Configures supported chains (Mainnet, Sepolia, Base, Arbitrum)
- Sets up RPC providers
- Configures wallet connectors (MetaMask, WalletConnect, Coinbase, etc.)

#### tokens.ts
- Defines token addresses per chain
- Includes common tokens: ETH, WETH, USDC, USDT, DAI
- Provides token metadata (decimals, symbols, names)

#### contracts.ts
- Uniswap V4 contract addresses per chain
- Includes: PoolManager, Quoter, StateView, Universal Router, Permit2

### 3. Business Logic Layer

#### quote.ts

**Purpose**: Fetch swap quotes from Uniswap

**Key Functions**:
- `getSingleHopQuote(params)`: Get quote for direct swap
- `getMultiHopQuote(params)`: Get quote for multi-hop swap
- Uses Quoter contract's `callStatic` methods

**Process**:
1. Build PoolKey with token addresses, fee tier, tick spacing
2. Call Quoter contract with pool parameters
3. Simulate transaction to get output amount
4. Calculate price impact and display metrics

#### singleHopSwap.ts

**Purpose**: Execute single-hop swaps

**Key Functions**:
- `executeSingleHopSwap(params)`: Execute direct swap through one pool

**Process**:
1. Create `SwapExactInSingle` configuration
2. Use V4Planner to encode actions:
   - `SWAP_EXACT_IN_SINGLE`: Execute swap
   - `SETTLE_ALL`: Handle input token
   - `TAKE_ALL`: Collect output token
3. Call Universal Router's `execute()` method
4. Wait for transaction confirmation

#### multiHopSwap.ts

**Purpose**: Execute multi-hop swaps

**Key Functions**:
- `executeMultiHopSwap(params)`: Execute swap through multiple pools
- `findBestRoute(params)`: Find optimal routing path

**Process**:
1. Determine routing path (e.g., ETH → USDC → DAI)
2. Create PoolKey for each hop
3. Encode path with intermediate currencies
4. Use V4Planner to encode actions:
   - `SWAP_EXACT_IN`: Execute multi-hop swap with path
   - `SETTLE_ALL`: Handle input token
   - `TAKE_ALL`: Collect output token
5. Execute through Universal Router

#### poolUtils.ts

**Purpose**: Helper functions for pool operations

**Key Functions**:
- `createPoolKey()`: Build PoolKey objects
- `sortTokens()`: Sort tokens correctly (currency0 < currency1)
- `encodePoolKey()`: Encode pool parameters
- `getPoolAddress()`: Calculate pool address from parameters

### 4. Custom Hooks Layer

#### useSwapQuote.ts

**Purpose**: React hook for fetching quotes

**Features**:
- Debounced quote fetching
- Automatic updates on input changes
- Loading and error states
- Caching with react-query

**Returns**:
```typescript
{
  quote: QuoteResult | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}
```

#### useSwap.ts

**Purpose**: React hook for executing swaps

**Features**:
- Transaction state management
- Automatic approval checks
- Permit2 integration
- Success/error handling

**Returns**:
```typescript
{
  swap: (params: SwapParams) => Promise<void>
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
}
```

#### useTokenBalance.ts

**Purpose**: React hook for token balances

**Features**:
- Real-time balance fetching
- Support for both ETH and ERC20
- Automatic updates on block changes

**Returns**:
```typescript
{
  balance: bigint | null
  formatted: string
  isLoading: boolean
}
```

### 5. Component Layer

#### SwapForm.tsx

**Main swap interface component**

**Features**:
- Token input/output fields
- Token selector integration
- Quote display
- Slippage settings
- Swap execution button
- Transaction status

**State**:
```typescript
{
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  amountOut: string
  slippage: number
  swapType: 'single-hop' | 'multi-hop'
}
```

#### TokenSelector.tsx

**Token selection dropdown**

**Features**:
- Search/filter tokens
- Display token balances
- Token logos/icons
- Common token quick select

#### QuoteDisplay.tsx

**Quote information display**

**Shows**:
- Expected output amount
- Price impact
- Minimum received (after slippage)
- Exchange rate
- Route path (for multi-hop)
- Gas estimate

#### WalletConnect.tsx

**Wallet connection button wrapper**

**Features**:
- RainbowKit connect button
- Connection status
- Account display
- Network switcher

## Data Flow

### Quote Flow

```
User types amount → SwapForm updates state → useSwapQuote triggered →
Debounce (300ms) → quote.ts fetches quote → Quoter contract called →
Quote result returned → QuoteDisplay updated
```

### Swap Execution Flow

```
User clicks swap → useSwap.swap() called → Check token approval →
If not approved: Execute Permit2 approval → Wait for confirmation →
singleHopSwap.ts or multiHopSwap.ts → V4Planner encodes actions →
Universal Router execute() → Wait for transaction → Display success
```

## Smart Contract Interactions

### Quoter Contract

**Methods Used**:
- `quoteExactInputSingle(params)`: Single-hop quote
- `quoteExactInput(params)`: Multi-hop quote

**Important**: Always use `callStatic` - these are view functions that revert with the result

### Universal Router

**Methods Used**:
- `execute(commands, inputs, deadline)`: Execute swap operations

**Commands**:
- `V4_SWAP`: Execute V4 swap
- Uses encoded V4Planner actions

### Permit2

**Purpose**: Improved token approval system

**Flow**:
1. User approves Permit2 for token (one-time per token)
2. User approves Universal Router on Permit2 (one-time)
3. Future swaps don't require new approvals

## Configuration

### Supported Networks

| Network | Chain ID | RPC | Block Explorer |
|---------|----------|-----|----------------|
| Ethereum Mainnet | 1 | Alchemy/Infura | etherscan.io |
| Sepolia Testnet | 11155111 | Alchemy/Infura | sepolia.etherscan.io |
| Base | 8453 | Base RPC | basescan.org |
| Arbitrum One | 42161 | Arbitrum RPC | arbiscan.io |

### Environment Variables

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Token Configuration

Each supported token includes:
- Address (per chain)
- Decimals
- Symbol
- Name
- Logo URL (optional)

### Pool Configuration

Default pool parameters:
- Fee tiers: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)
- Tick spacing: Varies by fee tier (10, 60, etc.)
- Hooks: Zero address (no custom hooks)

## Error Handling

### Common Errors

1. **Insufficient Balance**: Check balance before swap
2. **Insufficient Allowance**: Prompt Permit2 approval
3. **Slippage Exceeded**: Increase slippage or try again
4. **Pool Not Found**: Token pair has no liquidity
5. **Transaction Failed**: Display error message from chain

### Error Handling Strategy

```typescript
try {
  // Execute swap
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    // Show insufficient balance message
  } else if (error.code === 'USER_REJECTED') {
    // User rejected transaction
  } else {
    // Generic error message
  }
}
```

## Performance Optimizations

1. **Quote Debouncing**: Prevent excessive RPC calls
2. **React Query Caching**: Cache quote results
3. **Memoization**: Memo expensive calculations
4. **Lazy Loading**: Code-split heavy components
5. **Optimistic Updates**: Update UI before transaction confirms

## Security Considerations

1. **Slippage Protection**: Always set minimum output amount
2. **Deadline**: Set transaction deadline (e.g., 20 minutes)
3. **Input Validation**: Validate all user inputs
4. **Approval Limits**: Consider limited approvals instead of infinite
5. **Contract Verification**: Only use verified contract addresses

## Testing Strategy

### Unit Tests
- Token utility functions
- Pool key generation
- Encoding/decoding functions

### Integration Tests
- Quote fetching
- Swap execution
- Approval flow

### E2E Tests
- Full swap flow on testnet
- Multi-hop routing
- Error scenarios

## Deployment Considerations

1. **Environment Variables**: Secure API keys
2. **RPC Providers**: Use reliable providers (Alchemy, Infura)
3. **Error Monitoring**: Set up Sentry or similar
4. **Analytics**: Track swap volume, success rates
5. **Rate Limiting**: Implement request throttling

## Future Enhancements

1. **Liquidity Provision**: Add/remove liquidity UI
2. **Position Management**: View and manage positions
3. **Advanced Routing**: Implement smart order routing
4. **Price Charts**: Integrate price chart library
5. **Transaction History**: Store and display past swaps
6. **Custom Hooks**: Support pools with custom hooks
7. **Gas Optimization**: Batch operations when possible
8. **Cross-Chain**: Add support for more chains

## Resources

- [Uniswap V4 Docs](https://docs.uniswap.org/sdk/v4/overview)
- [Wagmi Docs](https://wagmi.sh)
- [Viem Docs](https://viem.sh)
- [RainbowKit Docs](https://www.rainbowkit.com)
- [Uniswap V4 SDK GitHub](https://github.com/Uniswap/v4-sdk)

## File Structure Summary

```
/home/nick/dev/uniswapv4-nextjs/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── SwapForm.tsx
│   │   ├── TokenSelector.tsx
│   │   ├── QuoteDisplay.tsx
│   │   └── WalletConnect.tsx
│   ├── hooks/
│   │   ├── useSwapQuote.ts
│   │   ├── useSwap.ts
│   │   └── useTokenBalance.ts
│   ├── lib/
│   │   ├── config/
│   │   │   ├── wagmi.ts
│   │   │   ├── tokens.ts
│   │   │   └── contracts.ts
│   │   ├── uniswap/
│   │   │   ├── quote.ts
│   │   │   ├── singleHopSwap.ts
│   │   │   ├── multiHopSwap.ts
│   │   │   └── poolUtils.ts
│   │   └── utils/
│   │       ├── formatting.ts
│   │       └── slippage.ts
│   └── types/
│       └── swap.ts
├── public/
├── architecture.md
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Development Workflow

1. Start with configuration setup
2. Implement business logic layer
3. Create custom hooks
4. Build UI components
5. Test on testnet (Sepolia)
6. Deploy to production

## Notes

- This architecture prioritizes type safety and modularity
- All blockchain interactions are abstracted into hooks
- Components are kept focused and reusable
- Business logic is separated from UI concerns
- Configuration is centralized for easy updates
