// Local ChainId augmentation.
//
// This app was forked from a multichain v3-info variant whose code references
// `ChainId` members (HUMANITY plus several inherited L2s) that are NOT present
// in the pinned upstream `@uniswap/sdk-core@5.4.0`, and the custom sdk-core fork
// that defined them was never wired into this repo (no .npmrc / registry; the
// lockfile resolves sdk-core to upstream). Humanity only deploys on chain
// 13600000 — the other chains are inherited dead code that is never exercised at
// runtime here, but the references still have to type-check.
//
// So we re-export the upstream ChainId enum augmented with the extra members.
// HUMANITY = 13600000 is authoritative for this deployment; the remaining values
// are the public chain IDs of the inherited networks (kept accurate to avoid
// surprises, but not used by the humanity single-chain build).
import { ChainId as UpstreamChainId } from '@uniswap/sdk-core'

export const ChainId = {
  ...UpstreamChainId,
  HUMANITY: 13600000,
  ABSTRACT_MAINNET: 2741,
  ABSTRACT_TESTNET: 11124,
  ZERO: 543210,
  BOB: 60808,
  CYBER: 7560,
  SHAPE: 360,
  REDSTONE: 690,
  REDSTONE_GARNET: 17069,
  INK: 57073,
  ANIME: 2606,
  ANIME_TESTNET: 6900,
  MODE: 34443,
}

export type ChainId = number
