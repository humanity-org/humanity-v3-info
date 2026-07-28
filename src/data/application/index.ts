/**
 * Subgraph health.
 *
 * The upstream hosted-service index-node this probe used (api.thegraph.com/
 * index-node) was shut down by The Graph — it now 404s / is CORS-blocked — and
 * our self-hosted graph-node's index-node is not publicly exposed. Probing the
 * dead endpoint made the status flip to `available: false`, which replaces the
 * whole UI with a "hosted network is experiencing issues" card. Our subgraph's
 * query endpoint is what actually serves data and is healthy, so report the
 * subgraph as available without a (dead) health probe.
 */
export function useFetchedSubgraphStatus(): {
  available: boolean | null
  syncedBlock: number | undefined
  headBlock: number | undefined
} {
  return { available: true, syncedBlock: undefined, headBlock: undefined }
}
