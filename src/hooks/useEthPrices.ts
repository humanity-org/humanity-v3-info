import { useBlocksFromTimestamps } from 'hooks/useBlocksFromTimestamps'
import { useDeltaTimestamps } from 'utils/queries'
import { useState, useEffect, useMemo } from 'react'
import gql from 'graphql-tag'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { useActiveNetworkVersion, useClients } from 'state/application/hooks'

export interface EthPrices {
  current: number
  oneDay: number
  twoDay: number
  week: number
}

// Current price is fetched on its own so a missing / out-of-range historical
// block can never take it (and therefore the whole Tokens / Overview view) down.
const ETH_PRICE_CURRENT = gql`
  query price {
    current: bundles(first: 1, subgraphError: allow) {
      ethPriceUSD
    }
  }
`

export const ETH_PRICES = gql`
  query prices($block24: Int!, $block48: Int!, $blockWeek: Int!) {
    oneDay: bundles(first: 1, block: { number: $block24 }, subgraphError: allow) {
      ethPriceUSD
    }
    twoDay: bundles(first: 1, block: { number: $block48 }, subgraphError: allow) {
      ethPriceUSD
    }
    oneWeek: bundles(first: 1, block: { number: $blockWeek }, subgraphError: allow) {
      ethPriceUSD
    }
  }
`

interface CurrentResponse {
  current: { ethPriceUSD: string }[]
}

interface HistoricalResponse {
  oneDay: { ethPriceUSD: string }[]
  twoDay: { ethPriceUSD: string }[]
  oneWeek: { ethPriceUSD: string }[]
}

async function fetchEthPrices(
  blocks: [number, number, number] | undefined,
  client: ApolloClient<NormalizedCacheObject>,
): Promise<{ data: EthPrices | undefined; error: boolean }> {
  // Essential value: the current ETH (wH) price. If this fails the subgraph is
  // genuinely unavailable, so surface an error.
  let current: number
  try {
    const { data, error } = await client.query<CurrentResponse>({ query: ETH_PRICE_CURRENT })
    if (error || !data?.current?.[0]?.ethPriceUSD) {
      return { data: undefined, error: true }
    }
    current = parseFloat(data.current[0].ethPriceUSD)
  } catch (e) {
    console.log(e)
    return { data: undefined, error: true }
  }

  // Historical prices at 24h/48h/1w-ago blocks. On a young chain a requested
  // block can be before the subgraph start block or beyond the chain head,
  // which errors the whole block-scoped query. Default each period to the
  // current price (=> 0% historical change) instead of failing the view.
  let oneDay = current
  let twoDay = current
  let week = current
  if (blocks && blocks.every((b) => Number.isFinite(b) && b > 0)) {
    try {
      const { data, error } = await client.query<HistoricalResponse>({
        query: ETH_PRICES,
        variables: { block24: blocks[0], block48: blocks[1], blockWeek: blocks[2] },
      })
      if (!error && data) {
        oneDay = data.oneDay?.[0]?.ethPriceUSD ? parseFloat(data.oneDay[0].ethPriceUSD) : current
        twoDay = data.twoDay?.[0]?.ethPriceUSD ? parseFloat(data.twoDay[0].ethPriceUSD) : current
        week = data.oneWeek?.[0]?.ethPriceUSD ? parseFloat(data.oneWeek[0].ethPriceUSD) : current
      }
    } catch (e) {
      // Historical prices unavailable (young chain / out-of-range block) — keep
      // the current price as the fallback so the views still render.
    }
  }

  return { data: { current, oneDay, twoDay, week }, error: false }
}

/**
 * returns eth prices at current, 24h, 48h, and 1w intervals
 */
export function useEthPrices(): EthPrices | undefined {
  const [prices, setPrices] = useState<{ [network: string]: EthPrices | undefined }>()
  const [error, setError] = useState(false)
  const { dataClient } = useClients()

  const [t24, t48, tWeek] = useDeltaTimestamps()
  const { blocks } = useBlocksFromTimestamps([t24, t48, tWeek])

  // index on active network
  const [activeNetwork] = useActiveNetworkVersion()
  const indexedPrices = prices?.[activeNetwork.id]

  const formattedBlocks = useMemo(() => {
    if (blocks) {
      return blocks.map((b) => parseFloat(b.number)) as [number, number, number]
    }
    return undefined
  }, [blocks])

  useEffect(() => {
    async function fetch() {
      // Fetch even before block timestamps resolve: the current price does not
      // depend on them, and historical prices degrade gracefully.
      const { data, error } = await fetchEthPrices(formattedBlocks, dataClient)
      if (error) {
        setError(true)
      } else if (data) {
        setPrices({
          [activeNetwork.id]: data,
        })
      }
    }
    if (!indexedPrices && !error) {
      fetch()
    }
  }, [error, prices, formattedBlocks, dataClient, indexedPrices, activeNetwork.id])

  return prices?.[activeNetwork.id]
}
