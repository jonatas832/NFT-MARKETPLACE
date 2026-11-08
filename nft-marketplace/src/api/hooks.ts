import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './endpoints'
import { cartKey, cartQuery, favoritesQuery } from '@/lib/query'
import { useUser } from '@/auth/session'
import { announce } from '@/lib/announce'
import type { CartItem } from '@/types'

export const useCart = () => { const u = useUser(); return useQuery(cartQuery(u?.id)) }

export function useCartMutations() {
  const qc = useQueryClient(); const uid = useUser()?.id
  const done = (items: CartItem[]) => { qc.setQueryData(cartKey(uid), items); qc.invalidateQueries({ queryKey: ['cart-quote'] }) }
  return {
    add: useMutation({ mutationFn: api.addToCart, onSuccess: (d) => { done(d); announce('Item adicionado ao carrinho.') } }),
    setQty: useMutation({ mutationFn: api.setQty, onSuccess: done }),
    remove: useMutation({ mutationFn: (i: { nftId: string; editionId: string }) => api.removeItem(i.nftId, i.editionId), onSuccess: (d) => { done(d); announce('Item removido.') } }),
  }
}

/** Favoritos com atualização otimista e rollback em falha. */
export function useFavorites() {
  const qc = useQueryClient(); const uid = useUser()?.id
  const key = ['private', uid, 'favorites']
  const list = useQuery({ ...favoritesQuery(uid ?? ''), enabled: !!uid })
  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? api.addFavorite(id) : api.removeFavorite(id)),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<string[]>(key)
      qc.setQueryData<string[]>(key, (o = []) => (on ? [...o, id] : o.filter((x) => x !== id)))
      return { prev }
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); announce('Não foi possível atualizar os favoritos. Alteração desfeita.') },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
  return { ids: list.data ?? [], toggle }
}
