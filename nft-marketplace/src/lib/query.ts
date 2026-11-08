import { QueryClient, queryOptions, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { tokenStore, toApiError } from '@/api/client'
import type { Network, NftQuery } from '@/types'

/**
 * Política de cache (ver ARCHITECTURE.md):
 * - staleTime 30 s; gcTime 5 min; retry só para falhas transitórias (rede/5xx), até 2x com backoff.
 * - mutations NÃO sofrem retry automático (evita duplicar operações); pedidos usam Idempotency-Key.
 * - dados privados usam chave ['private', userId, ...] e o cache é limpo em logout/troca de usuário.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, gcTime: 300_000, refetchOnWindowFocus: true,
      retry: (n, e) => { const x = toApiError(e); return n < 2 && (!!x.network || (x.status ?? 0) >= 500) },
      retryDelay: (n) => Math.min(500 * 2 ** n, 4000),
    },
    mutations: { retry: false },
  },
})

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    if (!tokenStore.get()) return null
    try { return await api.session({ signal }) } catch (e) {
      const x = toApiError(e); if (x.status === 401) { tokenStore.clear(); return null }
      throw e
    }
  },
})

export const nftsQuery = (q: NftQuery) => queryOptions({ queryKey: ['nfts', q], queryFn: ({ signal }) => api.nfts(q, { signal }), placeholderData: keepPreviousData })
export const nftQuery = (id: string) => queryOptions({ queryKey: ['nft', id], queryFn: ({ signal }) => api.nft(id, { signal }), retry: (n, e) => toApiError(e).status !== 404 && n < 2 })

export const cartKey = (uid: string | undefined) => ['cart', uid ?? 'guest'] as const
export const cartQuery = (uid?: string) => queryOptions({ queryKey: cartKey(uid), queryFn: ({ signal }) => api.cart({ signal }) })
export const quoteQuery = (uid: string | undefined, network: Network, coupon: string | undefined, items: string) =>
  queryOptions({ queryKey: ['cart-quote', uid ?? 'guest', network, coupon ?? '', items], queryFn: ({ signal }) => api.quote({ network, coupon }, { signal }), placeholderData: keepPreviousData })
export const favoritesQuery = (uid: string) => queryOptions({ queryKey: ['private', uid, 'favorites'], queryFn: ({ signal }) => api.favorites({ signal }) })
export const walletsQuery = (uid: string) => queryOptions({ queryKey: ['private', uid, 'wallets'], queryFn: ({ signal }) => api.wallets({ signal }) })
export const orderQuery = (uid: string, id: string) => queryOptions({ queryKey: ['private', uid, 'order', id], queryFn: ({ signal }) => api.order(id, { signal }) })
