# Uniswap v4 Frontend Architecture

## Scope And Goals
- Surface token-to-token quoting and swaps (single-hop and multi-hop) inside the existing Next.js app.
- Rely on `@uniswap/sdk-core` and `@uniswap/v4-sdk` for client-side math, simulation, and calldata planning.
- Keep the integration lightweight: defer heavy lifting (pool state, tick data, transaction sending) to composable helpers and hooks so the UI stays declarative.

## High-Level User Flow
1. **User selects tokens & chain** → token list is hydrated from a static registry plus remote metadata.
2. **User enters amount** → quote request triggers pool state fetch, trade simulation, and UI updates.
3. **User reviews route & price impact** → single-hop route if available, otherwise multi-hop candidate set.
4. **User submits swap** → we prepare calldata through the v4 planner, prompt wallet for approval if needed, then send the transaction.
5. **Post-transaction handling** → poll settlement, refresh balances, clear optimistic state.

## Core SDK Building Blocks
- `Currency`, `Token`, `NativeCurrency`, `CurrencyAmount`, `Percent` from `@uniswap/sdk-core` to model tokens and amounts.
- `Pool` constructs instantiated with live `sqrtRatioX96`, `liquidity`, `tickCurrent`, and `TickDataProvider` (vanilla hooks-only pools for now).
- `Route` objects to sequence pools for single-hop or multi-hop paths.
- `Trade` helpers (`exactIn`, `exactOut`, `bestTradeExactIn`, `bestTradeExactOut`) to simulate outcomes and compute price impact.
- `V4Planner` to assemble swap actions into calldata for the PoolManager / Universal Router.

## Data & Infra Requirements
- **RPC Provider**: use `viem` (preferred) or `ethers` with batching enabled. Configure per-chain RPC URLs via env (`NEXT_PUBLIC_RPC_URL_<CHAIN>`).
- **Pool State Loader**:
  - Fetch pool keys from a curated list or from Uniswap APIs (when available).
  - Use multicall to read `slot0`, `liquidity`, `tickSpacing`, `hooks`, and any required hook-specific data.
  - For tick data, rely on the v3 `TickLens` contract for vanilla pools; extendable to hook-aware providers.
- **Token Metadata**: start with a static JSON (token symbol, decimals, addresses) under `src/data/tokens.ts`. Optionally enrich via ENS or Uniswap token list APIs.
- **Price & Analytics**: optional integration with Uniswap Data API or external price feeds for slippage warnings.
- **Wallet Connectivity**: integrate `wagmi` + `@wagmi/core` or `useDApp` for account state and transaction execution.

## Proposed Directory Layout
```
src/
  data/
    tokens.ts                # curated cross-chain token registry
    pools.ts                 # initial pool catalog & metadata
  lib/
    uniswap/
      client.ts              # viem PublicClient + WalletClient factory
      currency.ts            # helpers to map token metadata to SDK Currency/Token
      poolRegistry.ts        # fetch & cache Pool instances
      quote.ts               # quote functions (single-hop & multi-hop)
      planner.ts             # wrappers around V4Planner
      swap.ts                # high-level swap execution helpers
    hooks/
      useTokens.ts           # load tokens with search/filter support
      usePools.ts            # hydrate pools for current token pair
      useQuote.ts            # sync quotes with debounced inputs
      useSwap.ts             # orchestrate approvals, calldata, tx lifecycle
  app/
    swap/
      page.tsx               # dedicated swap page (Next.js route segment)
      QuotePanel.tsx
      RouteVisualizer.tsx
      SwapForm.tsx
      SwapSummary.tsx
```

## Quoting Architecture
- **Input Normalization**: convert user amount into `CurrencyAmount` using selected token decimals.
- **Pool Selection**:
  - For single-hop, load the direct pool (`currency0/currency1` with desired fee tier).
  - For multi-hop, gather candidate pools that connect intermediary tokens and filter by liquidity threshold.
  - Cache pool instances keyed by `poolId` and update only when `slot0.tick` or `liquidity` changes beyond a tolerance.
- **Simulation Pipeline**:
  - Single hop: build `Route` with one pool and call `Trade.exactIn(route, amountIn)`.
  - Multi-hop: run `Trade.bestTradeExactIn(allPools, amountIn, tokenOut, { maxHops: 3, maxNumResults: 3 })`.
  - Derive price impact, execution price, worst price (with default slippage tolerance, e.g., `Percent.fromBasisPoints(50)`).
- **Caching & Debounce**:
  - Debounce input changes by ~300ms before hitting RPC.
  - Persist last good quote to re-display quickly while new simulation runs.
- **Error Handling**:
  - Distinguish between RPC errors, no-liquidity, and hook incompatibilities.
  - Provide actionable messages (e.g., “Pool has custom hook – this UI supports hookless pools only.”).

## Single-Hop Swap Flow
1. Ensure allowance: if ERC-20 input token, check allowance via `viem` and prompt approval when insufficient.
2. Build trade: `const trade = await Trade.exactIn(route, amountIn);`.
3. Planner: instantiate `V4Planner`, call `addTrade(trade, slippageTolerance)` and optionally `addSettle`.
4. Calldata: `const calldata = planner.finalize();` plus `value` when using native currency.
5. Transaction: send via `walletClient.writeContract` or `walletClient.sendTransaction` targeting the v4 PoolManager / Router address.
6. Track status with `walletClient.waitForTransactionReceipt` and update UI state machine.

## Multi-Hop Swap Flow
- Construct candidate pools graph for the selected chain (token nodes, pool edges).
- Use `Trade.bestTradeExactIn` (or exact-out variant) to obtain up to `maxNumResults`.
- Present top route(s) with share of input across each hop.
- When the user confirms, create a `V4Planner` instance per trade (or aggregated with `addTrade` for each route) so calldata represents all hops.
- Ensure intermediate tokens are “settled” by including `addSettle` / `addTake` actions after planner execution.
- Warn users about increased gas, added slippage risk, and potential hook incompatibilities.

## React Hooks & State
- `useTokens`: exposes search, favorites, balance lookups (balance via `publicClient.getBalance` or ERC-20 `balanceOf` multicall).
- `usePools`: subscribes to pool updates via polling (e.g., every 15s) or websockets when supported (`viem` `watchContractEvent` on PoolManager).
- `useQuote`: accepts `{ tokenIn, tokenOut, amount, direction }`, internally uses `usePools` and returns `{ trade, routes, loading, error }`.
- `useSwap`: orchestrates approval, calldata build, tx submission, and toast notifications.
- Global store (Zustand or Context) to share selected tokens, amounts, slippage, and chain across components.

## UI Components
- `SwapForm`: token selectors, amount inputs, slippage settings, toggle for exact-in vs exact-out.
- `QuotePanel`: displays execution price, price impact, fees, route path, best alternative routes.
- `RouteVisualizer`: linear list of pools/tokens; highlight pools that include hooks or dynamic fees.
- `SwapSummary`: dynamic CTA button state (Connect Wallet, Enter Amount, Insufficient Balance, Review Quote, Confirm Swap).
- `PendingModal`: show in-flight transaction hash, links to explorer, and settlement status.

## Testing Strategy
- Unit-test helpers under `lib/uniswap` with mocked `Pool` data (use `@testing-library/jest-dom` + `vitest` or Jest).
- Integration-test quoting hooks by mocking RPC responses (e.g., via `viem`’s custom transport).
- Component tests for the SwapForm and QuotePanel using Playwright Component or React Testing Library.
- End-to-end smoke test that stubs wallet provider to validate full happy-path flow.

## Deployment Considerations
- Environment gated chains: expose `NEXT_PUBLIC_SUPPORTED_CHAINS="sepolia,base"` etc.
- Feature flags to disable swaps (quotes only) when pool data is incomplete.
- Graceful fallback for networks without Uniswap v4 deployment.
- Monitor RPC latency and error rate; fallback to secondary providers when primary fails.

## Next Steps
1. Add `viem`, `wagmi`, and `@tanstack/react-query` (or similar) dependencies.
2. Scaffold `src/data/tokens.ts` and `src/data/pools.ts` for chosen test network.
3. Implement `lib/uniswap/poolRegistry.ts` with multicall support.
4. Build `useQuote` hook and plug into a minimal `swap/page.tsx`.
5. Iterate on UI/UX, add loading skeletons, analytics, and error boundaries.

