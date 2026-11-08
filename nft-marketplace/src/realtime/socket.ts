import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type { Nft, NftUpdatedEvent, OrderUpdatedEvent, Order, Page } from '@/types'
import { tokenStore } from '@/api/client'
import { announce } from '@/lib/announce'

const URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://mock.nft.local'
let socket: Socket | null = null
let owner: string | null = null
const seen = new Set<string>()

const patchNft = (n: Nft, e: NftUpdatedEvent): Nft =>
  e.version > n.version
    ? { ...n, price: e.price, version: e.version, editions: n.editions.map((ed) => ({ ...ed, available: e.availability[ed.id] ?? ed.available })) }
    : n

/** Conecta (idempotente) e liga os handlers. Eventos duplicados/antigos são ignorados por eventId e versão. */
export function connectSocket(qc: QueryClient, userId: string | null) {
  if (socket && owner === (userId ?? 'guest')) return
  disconnectSocket()
  owner = userId ?? 'guest'
  const s = (socket = io(URL, { transports: ['websocket'], auth: { token: tokenStore.get() }, reconnectionDelay: 500, reconnectionDelayMax: 3000 }))
  let connectedBefore = false

  s.on('connect', () => {
    if (userId) s.emit('auth', userId)
    if (connectedBefore) { // reconciliação com REST após reconexão
      for (const key of ['nfts', 'nft', 'cart', 'cart-quote', 'private']) qc.invalidateQueries({ queryKey: [key] })
      announce('Conexão restabelecida. Dados atualizados.')
    }
    connectedBefore = true
  })
  s.on('disconnect', () => announce('Conexão em tempo real perdida. Tentando reconectar.'))

  s.on('nft.updated', (e: NftUpdatedEvent) => {
    if (seen.has(e.eventId)) return
    seen.add(e.eventId); if (seen.size > 500) seen.delete(seen.values().next().value as string)
    qc.setQueryData<Nft>(['nft', e.id], (o) => (o ? patchNft(o, e) : o))
    qc.setQueriesData<Page<Nft>>({ queryKey: ['nfts'] }, (o) => o && { ...o, items: o.items.map((n) => (n.id === e.id ? patchNft(n, e) : n)) })
    qc.invalidateQueries({ queryKey: ['cart-quote'] }) // cotação é sempre re-obtida da API
    announce('Preço ou disponibilidade de um NFT foi atualizado.')
  })

  s.on('order.updated', (e: OrderUpdatedEvent) => {
    if (!userId || e.userId !== userId) return // nunca aplica eventos de outra sessão
    if (seen.has(e.eventId)) return
    seen.add(e.eventId)
    qc.setQueryData<Order>(['private', userId, 'order', e.id], (o) => (!o || e.version > o.version ? e.order : o))
    if (e.order.status === 'confirmed') { qc.invalidateQueries({ queryKey: ['cart'] }); qc.invalidateQueries({ queryKey: ['nft'] }) }
    announce(e.order.status === 'confirmed' ? 'Pedido confirmado.' : e.order.status === 'declined' ? 'Pedido recusado.' : 'Pedido atualizado.')
  })
}

export function disconnectSocket() {
  socket?.removeAllListeners(); socket?.disconnect(); socket = null; owner = null; seen.clear()
}
