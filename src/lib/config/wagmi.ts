import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, base, arbitrum } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get WalletConnect project ID from environment
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Configure wagmi
export const config = createConfig({
  chains: [mainnet, sepolia, base, arbitrum],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'Uniswap V4 Swap',
      appLogoUrl: 'https://example.com/logo.png', // Replace with your logo
    }),
  ],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo'}`
    ),
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo'}`
    ),
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      'https://mainnet.base.org'
    ),
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
      'https://arb1.arbitrum.io/rpc'
    ),
  },
  ssr: true,
});

// Export chain information for easy access
export const supportedChains = [mainnet, sepolia, base, arbitrum];

// Chain names mapping
export const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [sepolia.id]: 'Sepolia',
  [base.id]: 'Base',
  [arbitrum.id]: 'Arbitrum',
};

// Check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return supportedChains.some((chain) => chain.id === chainId);
}

// Get chain name by ID
export function getChainName(chainId: number): string {
  return chainNames[chainId] || 'Unknown';
}
