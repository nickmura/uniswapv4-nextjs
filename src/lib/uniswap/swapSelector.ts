/**
 * Swap Implementation Selector
 *
 * This file provides a unified interface to test different swap encoding approaches.
 * Change the CURRENT_APPROACH constant to switch between implementations.
 */

import { SingleHopSwapParams } from '@/types/swap';
import { Address } from 'viem';

// Import all implementations
import * as Original from './singleHopSwap';
import * as V2 from './singleHopSwap_v2';
import * as V3 from './singleHopSwap_v3';

/**
 * Available swap approaches
 */
export type SwapApproach =
  | 'original'           // Original implementation with RoutePlanner
  | 'approach-1'         // Direct ABI encoding (RECOMMENDED)
  | 'approach-3'         // CONTRACT_BALANCE flag
  | 'approach-4'         // SETTLE + TAKE instead of *_ALL
  | 'approach-5';        // Simplified parameters

/**
 * ⚙️ CHANGE THIS TO TEST DIFFERENT APPROACHES ⚙️
 *
 * Options:
 * - 'original'    = Original RoutePlanner implementation
 * - 'approach-1'  = Direct ABI encoding (⭐ START HERE)
 * - 'approach-3'  = CONTRACT_BALANCE flag
 * - 'approach-4'  = SETTLE + TAKE
 * - 'approach-5'  = Simplified parameters
 */
export const CURRENT_APPROACH: SwapApproach = 'approach-1';

/**
 * Execute a single-hop swap using the currently selected approach
 */
export async function executeSingleHopSwap(
  params: SingleHopSwapParams
): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
}> {
  console.log(`🔄 Using Swap Approach: ${CURRENT_APPROACH}`);

  switch (CURRENT_APPROACH) {
    case 'original':
      console.log('📦 Original RoutePlanner implementation');
      return Original.executeSingleHopSwap(params);

    case 'approach-1':
      console.log('⭐ Approach 1: Direct ABI encoding (RECOMMENDED)');
      return V2.executeSingleHopSwap(params, false);

    case 'approach-3':
      console.log('💰 Approach 3: CONTRACT_BALANCE flag');
      return V2.executeSingleHopSwap(params, true);

    case 'approach-4':
      console.log('🔧 Approach 4: SETTLE + TAKE');
      return V3.executeSingleHopSwap(params, 'settle-take');

    case 'approach-5':
      console.log('📝 Approach 5: Simplified parameters');
      return V3.executeSingleHopSwap(params, 'simplified');

    default:
      throw new Error(`Unknown approach: ${CURRENT_APPROACH}`);
  }
}

/**
 * Get information about the current approach
 */
export function getCurrentApproachInfo(): {
  name: string;
  description: string;
  confidence: string;
  file: string;
} {
  const approaches = {
    'original': {
      name: 'Original (RoutePlanner SDK)',
      description: 'Uses @uniswap/universal-router-sdk RoutePlanner',
      confidence: '⭐ 20%',
      file: 'singleHopSwap.ts'
    },
    'approach-1': {
      name: 'Direct ABI Encoding',
      description: 'Manual encoding matching official Solidity examples',
      confidence: '⭐⭐⭐⭐⭐ 95%',
      file: 'singleHopSwap_v2.ts (useContractBalance=false)'
    },
    'approach-3': {
      name: 'CONTRACT_BALANCE Flag',
      description: 'Uses special 0x8000... constant for auto-settlement',
      confidence: '⭐⭐⭐⭐ 80%',
      file: 'singleHopSwap_v2.ts (useContractBalance=true)'
    },
    'approach-4': {
      name: 'SETTLE + TAKE',
      description: 'Uses SETTLE (0x0b) and TAKE (0x0e) instead of *_ALL',
      confidence: '⭐⭐⭐ 60%',
      file: 'singleHopSwap_v3.ts (approach=settle-take)'
    },
    'approach-5': {
      name: 'Simplified Parameters',
      description: 'Minimal parameters for SETTLE_ALL and TAKE_ALL',
      confidence: '⭐⭐ 40%',
      file: 'singleHopSwap_v3.ts (approach=simplified)'
    }
  };

  return approaches[CURRENT_APPROACH];
}

/**
 * Print diagnostic information about current approach
 */
export function printApproachInfo(): void {
  const info = getCurrentApproachInfo();
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 CURRENT SWAP APPROACH');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Name:        ${info.name}`);
  console.log(`Description: ${info.description}`);
  console.log(`Confidence:  ${info.confidence}`);
  console.log(`File:        ${info.file}`);
  console.log('═══════════════════════════════════════════════════════');
}

/**
 * Validate that required files exist for the current approach
 */
export function validateApproach(): void {
  const approach = CURRENT_APPROACH;

  if (approach === 'approach-1' || approach === 'approach-3') {
    // Check if V2 exists
    if (!V2) {
      throw new Error('singleHopSwap_v2.ts not found! Make sure to create this file.');
    }
  }

  if (approach === 'approach-4' || approach === 'approach-5') {
    // Check if V3 exists
    if (!V3) {
      throw new Error('singleHopSwap_v3.ts not found! Make sure to create this file.');
    }
  }

  console.log('✅ Approach validation passed');
}

/**
 * Quick test function to check encoding without executing
 */
export async function testEncoding(params: SingleHopSwapParams): Promise<void> {
  console.log('\n🧪 ENCODING TEST');
  console.log('═══════════════════════════════════════════════════════');

  try {
    validateApproach();
    printApproachInfo();

    const tx = await executeSingleHopSwap(params);

    console.log('\n✅ ENCODING SUCCESS');
    console.log('─────────────────────────────────────────────────────');
    console.log('To:         ', tx.to);
    console.log('Value:      ', tx.value.toString(), 'wei');
    console.log('Data length:', tx.data.length, 'characters');
    console.log('Data:       ', tx.data.substring(0, 66) + '...');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.log('\n❌ ENCODING FAILED');
    console.log('─────────────────────────────────────────────────────');
    console.error(error);
    console.log('═══════════════════════════════════════════════════════\n');
    throw error;
  }
}
