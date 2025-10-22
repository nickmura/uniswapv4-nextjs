'use client';

import { Token } from '@/types/swap';
import { getCommonTokens } from '@/lib/config/tokens';
import { useState } from 'react';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { shortenAddress } from '@/lib/utils/formatting';

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelectToken: (token: Token) => void;
  chainId: number;
  excludeToken?: Token | null; // Exclude this token from the list
}

export function TokenSelector({ selectedToken, onSelectToken, chainId, excludeToken }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get common tokens for this chain
  const tokens = getCommonTokens(chainId);

  // Filter tokens based on search and exclusion
  const filteredTokens = tokens.filter((token) => {
    // Exclude the specified token
    if (excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase()) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {/* Selected Token Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        {selectedToken ? (
          <>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
            <span className="font-medium">{selectedToken.symbol}</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <span className="text-gray-500">Select token</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Token List Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 min-w-[320px]">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search by name, symbol, or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Token List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <TokenRow key={token.address} token={token} onSelect={handleSelectToken} />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No tokens found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface TokenRowProps {
  token: Token;
  onSelect: (token: Token) => void;
}

function TokenRow({ token, onSelect }: TokenRowProps) {
  const { balance, formatted } = useTokenBalance(token);

  return (
    <button
      onClick={() => onSelect(token)}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
        <div className="text-left">
          <div className="font-medium">{token.symbol}</div>
          <div className="text-sm text-gray-500">{token.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">{formatted}</div>
        <div className="text-xs text-gray-500">{shortenAddress(token.address, 4)}</div>
      </div>
    </button>
  );
}
